/** @odoo-module **/

/**
 * Client-side cURL parser for instant feedback.
 * Parses a cURL command string into structured request components.
 */
export function parseCurl(curlStr) {
    if (!curlStr || typeof curlStr !== 'string') return null;

    // Normalize multiline (handles backslash followed by spaces and newlines)
    let cmd = curlStr.replace(/\\\s*\r?\n/g, ' ').trim();
    if (!cmd.toLowerCase().startsWith('curl')) return null;
    cmd = cmd.slice(4).trim();

    const result = {
        url: '', method: 'GET', headers: [],
        body: '', bodyType: 'none',
        authType: 'none', authConfig: {},
        bodyParams: [],
    };

    // Simple tokenizer respecting quotes and escaped characters
    const tokens = [];
    let current = '';
    let inSingle = false, inDouble = false;
    for (let i = 0; i < cmd.length; i++) {
        const ch = cmd[i];
        if (ch === '\\') {
            if (i + 1 < cmd.length) {
                const nextCh = cmd[i + 1];
                if ((nextCh === '"' && inDouble) || (nextCh === "'" && inSingle) || nextCh === '\\') {
                    current += nextCh;
                    i++;
                    continue;
                }
            }
        }
        if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
        if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
        if (ch === ' ' && !inSingle && !inDouble) {
            if (current) { tokens.push(current); current = ''; }
            continue;
        }
        current += ch;
    }
    if (current) tokens.push(current);

    let i = 0;
    const dataInputs = [];
    while (i < tokens.length) {
        const t = tokens[i];
        if ((t === '-X' || t === '--request') && tokens[i + 1]) {
            result.method = tokens[++i].toUpperCase();
        } else if ((t === '-H' || t === '--header') && tokens[i + 1]) {
            const h = tokens[++i];
            const colonIdx = h.indexOf(':');
            if (colonIdx > 0) {
                result.headers.push({
                    key: h.slice(0, colonIdx).trim(),
                    value: h.slice(colonIdx + 1).trim(),
                    enabled: true,
                });
            }
        } else if ((t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary') && tokens[i + 1]) {
            dataInputs.push({ type: 'raw', value: tokens[++i] });
            if (result.method === 'GET') result.method = 'POST';
        } else if (t === '--data-urlencode' && tokens[i + 1]) {
            dataInputs.push({ type: 'urlencode', value: tokens[++i] });
            if (result.method === 'GET') result.method = 'POST';
        } else if ((t === '-F' || t === '--form') && tokens[i + 1]) {
            const formVal = tokens[++i];
            const eqIdx = formVal.indexOf('=');
            if (eqIdx > 0) {
                result.bodyParams.push({
                    key: formVal.slice(0, eqIdx).trim(),
                    value: formVal.slice(eqIdx + 1).trim(),
                    enabled: true,
                });
            }
            result.bodyType = 'form_data';
            if (result.method === 'GET') result.method = 'POST';
        } else if ((t === '-u' || t === '--user') && tokens[i + 1]) {
            const parts = tokens[++i].split(':');
            result.authType = 'basic';
            result.authConfig = { username: parts[0], password: parts.slice(1).join(':') };
        } else if (t === '--location') {
            // ignore
        } else if (!t.startsWith('-') && !result.url) {
            result.url = t;
        }
        i++;
    }

    // Process collected data tokens in order
    if (dataInputs.length > 0) {
        if (dataInputs.length === 1 && dataInputs[0].type === 'raw') {
            const val = dataInputs[0].value;
            try {
                JSON.parse(val);
                result.body = val;
                result.bodyType = 'json';
            } catch {
                if (val.includes('=')) {
                    result.bodyType = 'urlencoded';
                    const pairs = val.split('&');
                    for (const p of pairs) {
                        const eqIdx = p.indexOf('=');
                        if (eqIdx > 0) {
                            result.bodyParams.push({
                                key: p.slice(0, eqIdx).trim(),
                                value: decodeURIComponent(p.slice(eqIdx + 1).trim()),
                                enabled: true,
                            });
                        }
                    }
                } else {
                    result.body = val;
                    result.bodyType = 'raw';
                }
            }
        } else {
            result.bodyType = 'urlencoded';
            for (const input of dataInputs) {
                if (input.type === 'urlencode') {
                    const val = input.value;
                    const eqIdx = val.indexOf('=');
                    if (eqIdx > 0) {
                        result.bodyParams.push({
                            key: val.slice(0, eqIdx).trim(),
                            value: val.slice(eqIdx + 1).trim(),
                            enabled: true,
                        });
                    } else {
                        result.bodyParams.push({
                            key: val.trim(),
                            value: '',
                            enabled: true,
                        });
                    }
                } else {
                    const val = input.value;
                    const pairs = val.split('&');
                    for (const p of pairs) {
                        const eqIdx = p.indexOf('=');
                        if (eqIdx > 0) {
                            result.bodyParams.push({
                                key: p.slice(0, eqIdx).trim(),
                                value: decodeURIComponent(p.slice(eqIdx + 1).trim()),
                                enabled: true,
                            });
                        } else {
                            result.bodyParams.push({
                                key: p.trim(),
                                value: '',
                                enabled: true,
                            });
                        }
                    }
                }
            }
        }
    }

    // Build plain text body for urlencoded if it was parsed as params
    if (result.bodyType === 'urlencoded' && result.bodyParams.length) {
        result.body = result.bodyParams.map(p => `${p.key}=${encodeURIComponent(p.value)}`).join('&');
    }

    // Detect auth from headers
    const authIdx = result.headers.findIndex(h => h.key.toLowerCase() === 'authorization');
    if (authIdx >= 0) {
        const val = result.headers[authIdx].value;
        if (val.toLowerCase().startsWith('bearer ')) {
            result.authType = 'bearer';
            result.authConfig = { token: val.slice(7) };
            result.headers.splice(authIdx, 1);
        } else if (val.toLowerCase().startsWith('basic ')) {
            try {
                const decoded = atob(val.slice(6));
                const parts = decoded.split(':');
                result.authType = 'basic';
                result.authConfig = { username: parts[0], password: parts.slice(1).join(':') };
            } catch { /* ignore */ }
            result.headers.splice(authIdx, 1);
        }
    }

    return result;
}

/**
 * Detect if a string looks like a cURL command.
 */
export function isCurlCommand(str) {
    return str && str.trim().toLowerCase().startsWith('curl');
}
