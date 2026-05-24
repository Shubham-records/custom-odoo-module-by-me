/** @odoo-module **/

import { Component } from "@odoo/owl";
import { KeyValueEditor } from "./key_value_editor";

export class BodyEditor extends Component {
    static template = "api_request_tester.BodyEditor";
    static components = { KeyValueEditor };
    static props = {
        state: { type: Object },
    };

    get bodyTypes() {
        return [
            { value: 'none', label: 'none' },
            { value: 'raw', label: 'raw' },
            { value: 'json', label: 'JSON' },
            { value: 'form_data', label: 'form-data' },
            { value: 'urlencoded', label: 'x-www-form-urlencoded' },
            { value: 'graphql', label: 'GraphQL' },
        ];
    }

    get formDataItems() {
        if (!this.props.state.bodyFormData || !this.props.state.bodyFormData.length) {
            this.props.state.bodyFormData = [{ key: '', value: '', enabled: true }];
        }
        return this.props.state.bodyFormData;
    }

    get urlencodedItems() {
        if (!this.props.state.bodyUrlEncoded || !this.props.state.bodyUrlEncoded.length) {
            this.props.state.bodyUrlEncoded = [{ key: '', value: '', enabled: true }];
        }
        return this.props.state.bodyUrlEncoded;
    }

    onBodyTypeChange(ev) {
        const oldType = this.props.state.bodyType;
        const newType = ev.target.value;
        this.props.state.bodyType = newType;

        const bodyStr = (this.props.state.body || '').trim();

        if (newType === 'json') {
            // Attempt to translate urlencoded parameters into structured JSON
            if (bodyStr && (bodyStr.includes('=') || !bodyStr.startsWith('{'))) {
                try {
                    const params = {};
                    const pairs = bodyStr.split('&');
                    for (const pair of pairs) {
                        const [k, v] = pair.split('=');
                        if (k) {
                            params[decodeURIComponent(k.replace(/\+/g, ' '))] = decodeURIComponent((v || '').replace(/\+/g, ' '));
                        }
                    }
                    if (Object.keys(params).length > 0) {
                        this.props.state.body = JSON.stringify(params, null, 4);
                    }
                } catch (err) {
                    // Fail silent
                }
            } else if (!bodyStr && this.props.state.bodyUrlEncoded && this.props.state.bodyUrlEncoded.length) {
                const params = {};
                for (const p of this.props.state.bodyUrlEncoded) {
                    if (p.key && p.enabled !== false) {
                        params[p.key] = p.value || '';
                    }
                }
                if (Object.keys(params).length > 0) {
                    this.props.state.body = JSON.stringify(params, null, 4);
                }
            }
        } else if (newType === 'urlencoded') {
            // Attempt to translate structured JSON into urlencoded key-value rows
            if (bodyStr && bodyStr.startsWith('{')) {
                try {
                    const parsed = JSON.parse(bodyStr);
                    if (parsed && typeof parsed === 'object') {
                        const items = Object.entries(parsed).map(([k, v]) => ({
                            key: k,
                            value: typeof v === 'object' ? JSON.stringify(v) : String(v),
                            enabled: true
                        }));
                        if (items.length > 0) {
                            this.props.state.bodyUrlEncoded = items;
                            this.props.state.body = items.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
                        }
                    }
                } catch (err) {
                    // Fail silent
                }
            }
        } else if (newType === 'raw') {
            // If raw is selected, strip JSON formatting or keep as is
            if (bodyStr && bodyStr.startsWith('{')) {
                try {
                    const parsed = JSON.parse(bodyStr);
                    this.props.state.body = JSON.stringify(parsed);
                } catch {
                    // Keep raw string
                }
            }
        }
    }

    formatJson() {
        try {
            const parsed = JSON.parse(this.props.state.body);
            this.props.state.body = JSON.stringify(parsed, null, 4);
        } catch {
            // Not valid JSON, do nothing
        }
    }
}
