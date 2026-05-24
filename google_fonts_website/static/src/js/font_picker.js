/**
 * Google Fonts Picker — Odoo 19 Community v7
 *
 * Key fix: append the floating panel to toolbar.ownerDocument.body
 * NOT to `document.body` — they may be different if the script
 * runs in a different document context than the toolbar's owner document.
 *
 * Also: run a self-diagnostic on load so we can see exactly what's happening.
 */
(function () {
    'use strict';

    // ── Self-diagnostic (open DevTools Console to see) ────────────────────────
    console.log('[GF] Script loaded in document:', document.location.href);
    setTimeout(() => {
        const toolbars = document.querySelectorAll('.o-we-toolbar');
        console.log('[GF] Toolbars found:', toolbars.length);
        toolbars.forEach((t, i) => console.log(`[GF]   toolbar[${i}] namespace=${t.dataset.namespace} gfDone=${t.dataset.gfDone}`));
        const panel = document.querySelector('.gf-panel');
        console.log('[GF] Panel in document:', panel ? 'YES' : 'NO');
    }, 2000);

    // ── Font data (Loaded dynamically) ────────────────────────────────────────
    let FONT_GROUPS = [];
    let GFONTS = new Set();
    const WEIGHT_ITEMS = [
        {v:'100',l:'Thin — 100'},{v:'200',l:'ExtraLight — 200'},{v:'300',l:'Light — 300'},
        {v:'400',l:'Regular — 400'},{v:'500',l:'Medium — 500'},{v:'600',l:'SemiBold — 600'},
        {v:'700',l:'Bold — 700'},{v:'800',l:'ExtraBold — 800'},{v:'900',l:'Black — 900'},
    ];

    async function loadFontsFromServer() {
        try {
            const response = await fetch('/web/dataset/call_kw/google.font/search_read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'call',
                    params: {
                        model: 'google.font',
                        method: 'search_read',
                        args: [[]],
                        kwargs: {
                            fields: ['name', 'font_group'],
                            order: 'sequence, name',
                            context: { active_test: true }
                        }
                    },
                    id: Math.floor(Math.random() * 1000)
                })
            });
            const data = await response.json();
            if (data.result) {
                const grouped = {};
                const formatLabel = (s) => (s || 'other').split(/[-_ ]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                
                data.result.forEach(f => {
                    const groupKey = f.font_group || 'other';
                    if (!grouped[groupKey]) {
                        grouped[groupKey] = { label: formatLabel(groupKey), fonts: [] };
                    }
                    grouped[groupKey].fonts.push(f.name);
                    if (groupKey !== 'system') {
                        GFONTS.add(f.name);
                    }
                });
                
                FONT_GROUPS = Object.values(grouped);
                console.log('[GF] Fonts loaded from server:', data.result.length);
                updateAllFonts();
                
                // Pre-load first 30 fonts as previews for a better "init" experience
                setTimeout(() => {
                    ALL_FONTS.slice(0, 30).forEach(f => loadFont(f, document, true));
                }, 1000);
            }
        } catch (e) {
            console.error('[GF] Failed to load fonts:', e);
            // Fallback to minimal set if server fails
            FONT_GROUPS = [{ label: 'System', fonts: ['Arial', 'Verdana'] }];
        }
    }

    let ALL_FONTS = [];
    function updateAllFonts() {
        ALL_FONTS = FONT_GROUPS.flatMap(g => g.fonts);
    }
    
    loadFontsFromServer();

    // ── Shared panel state ────────────────────────────────────────────────────
    // One panel per ownerDocument (there's only one here, but be safe)
    const _panels = new Map();   // ownerDocument → panel element
    let _activeTrigger = null;
    let _onPick = null;

    // ── Singleton Panel Logic ─────────────────────────────────────────────────
    let _sharedPanel = null;

    function getPanel(ownerDoc) {
        if (_sharedPanel && _sharedPanel.ownerDocument === ownerDoc) return _sharedPanel;
        if (_sharedPanel) _sharedPanel.remove();

        const container = ownerDoc.createElement('div');
        container.className = 'gf-panel';
        container.setAttribute('data-prevent-closing-overlay', 'true');
        Object.assign(container.style, {
            position: 'fixed', display: 'none', zIndex: '2147483647',
            background: '#fff', border: '1px solid #ccc', borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '0', 
            overflow: 'hidden', width: '240px'
        });

        const searchBox = ownerDoc.createElement('div');
        searchBox.className = 'gf-search-box';
        searchBox.innerHTML = '<input type="text" placeholder="Search fonts..." class="gf-search-input" autocomplete="off">';
        
        const list = ownerDoc.createElement('div');
        list.className = 'gf-list';

        container.appendChild(searchBox);
        container.appendChild(list);

        // IntersectionObserver for lazy-loading previews
        const listObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const row = entry.target;
                    const font = row.dataset.font;
                    if (font) {
                        loadFont(font, ownerDoc, true);
                        listObserver.unobserve(row);
                    }
                }
            });
        }, { root: list, rootMargin: '50px' });
        container._previewObserver = listObserver;

        // Insulation: Stop ALL interaction events from reaching Odoo's toolbar
        const stop = (e) => e.stopPropagation();
        ['mousedown','click','mouseup','touchstart','touchend'].forEach(ev => {
            container.addEventListener(ev, stop, false);
        });

        // Robust Close: Catch clicks in the main document AND the editor iframe
        const onOutside = (e) => {
            if (!container.contains(e.target) && !e.target.closest('.gf-trigger')) {
                closePanel();
            }
        };
        ownerDoc.addEventListener('mousedown', onOutside, true);
        
        _sharedPanel = container;
        ownerDoc.body.appendChild(container);
        return container;
    }

    function closePanel() {
        console.log('[GF] Closing panel');
        if (_sharedPanel) _sharedPanel.style.display = 'none';
        if (_activeTrigger) {
            if (_activeTrigger._gfPoller) clearInterval(_activeTrigger._gfPoller);
            _activeTrigger.classList.remove('gf-open');
        }
        _activeTrigger = null;
        _onPick = null;
    }

    let _lastActionTime = 0;
    function openPanel(triggerEl, toolbar, items, onPick, isFont = false) {
        const now = Date.now();
        if (now - _lastActionTime < 250) return;
        _lastActionTime = now;

        if (_activeTrigger === triggerEl) { closePanel(); return; }
        closePanel();

        const ownerDoc = toolbar.ownerDocument;
        const panel = getPanel(ownerDoc);
        const searchInput = panel.querySelector('.gf-search-input');
        const searchBox = panel.querySelector('.gf-search-box');
        const list = panel.querySelector('.gf-list');

        searchBox.style.display = isFont ? 'block' : 'none';
        searchInput.value = '';
        panel.style.display = 'block';

        const render = (filter = '') => {
            list.innerHTML = '';
            const query = filter.toLowerCase();
            let currentGroup = null;
            let groupHasMatch = false;
            let filteredItems = [];

            if (!query) {
                filteredItems = items;
            } else {
                items.forEach(item => {
                    if (item.type === 'group') {
                        currentGroup = item;
                        groupHasMatch = false;
                    } else if (item.label.toLowerCase().includes(query)) {
                        if (currentGroup && !groupHasMatch) {
                            filteredItems.push(currentGroup);
                            groupHasMatch = true;
                        }
                        filteredItems.push(item);
                    }
                });
            }

            filteredItems.forEach(item => {
                if (item.type === 'group') {
                    const g = ownerDoc.createElement('div');
                    g.className = 'gf-group-label';
                    g.textContent = item.label;
                    list.appendChild(g);
                } else {
                    const row = ownerDoc.createElement('div');
                    row.className = 'gf-item';
                    row.textContent = item.label;
                    if (item.font) {
                        row.dataset.font = item.font;
                        row.style.fontFamily = `'${item.font}',sans-serif`;
                        panel._previewObserver.observe(row);
                    }
                    row.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onPick(item.value, item.label);
                        setTimeout(closePanel, 50);
                    });
                    list.appendChild(row);
                }
            });
        };

        searchInput.oninput = (e) => render(e.target.value);
        render();

        const tr = triggerEl.getBoundingClientRect();
        Object.assign(panel.style, {
            top: (tr.bottom + 4) + 'px',
            left: tr.left + 'px',
            minWidth: Math.max(tr.width, 210) + 'px'
        });

        if (isFont) setTimeout(() => searchInput.focus(), 50);

        _activeTrigger = triggerEl;
        triggerEl.classList.add('gf-open');
        _onPick = onPick;

        const poller = setInterval(() => {
            const currentTr = triggerEl.getBoundingClientRect();
            if (currentTr.height === 0 || currentTr.top === 0 || !triggerEl.isConnected || !toolbar.isConnected) {
                closePanel();
                clearInterval(poller);
            }
        }, 100);
        triggerEl._gfPoller = poller;
        saveNow();
    }

    // ── Google Font loader ────────────────────────────────────────────────────
    const _loaded = new Set();
    const _previews = new Set();

    function loadFont(name, targetDoc, isPreview = false) {
        const docKey = (targetDoc === document ? 'parent' : 'iframe');
        const fullKey = `${name}|${docKey}`;
        const prevKey = `${name}|prev|${docKey}`;

        if (_loaded.has(fullKey) || !GFONTS.has(name)) return;
        if (isPreview && (_previews.has(prevKey) || _loaded.has(fullKey))) return;

        if (isPreview) _previews.add(prevKey);
        else _loaded.add(fullKey);

        const encoded = name.replace(/ /g, '+');
        // Preview uses a subset of just the characters in the font name for speed
        const url = isPreview 
            ? `https://fonts.googleapis.com/css2?family=${encoded}&text=${encodeURIComponent(name)}&display=swap`
            : `https://fonts.googleapis.com/css2?family=${encoded}:wght@100;200;300;400;500;600;700;800;900&display=swap`;

        if (!targetDoc.querySelector(`link[href="${url}"]`)) {
            const l = targetDoc.createElement('link');
            l.rel = 'stylesheet'; l.href = url;
            targetDoc.head.appendChild(l);
        }
    }

    // ── Iframe helpers ────────────────────────────────────────────────────────
    function getIframe() {
        return document.querySelector('iframe[src*="/website/force/"]')
            || document.querySelector('.o_website_preview iframe:not([src*="iframefallback"])');
    }

    // ── Selection save/restore (inside iframe) ────────────────────────────────
    let _range = null, _win = null;

    function saveNow() {
        const iframe = getIframe();
        if (!iframe?.contentWindow) return;
        const sel = iframe.contentWindow.getSelection();
        if (sel && sel.rangeCount) {
            if (!sel.isCollapsed) {
                _range = sel.getRangeAt(0).cloneRange();
                _win   = iframe.contentWindow;
                console.log('[GF] Selection saved:', sel.toString().substring(0, 30));
            }
            syncUI();
        }
    }


    function syncUI() {
        const iframe = getIframe();
        if (!iframe?.contentWindow) return;
        const sel = iframe.contentWindow.getSelection();
        if (!sel || sel.rangeCount === 0) return;

        const node = sel.anchorNode;
        if (!node) return;
        const el = node.nodeType === 3 ? node.parentElement : node;
        if (!el) return;

        const win = iframe.contentWindow;
        const style = win.getComputedStyle(el);
        const ff = style.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
        const fw = style.fontWeight.toString();

        // PERSISTENCE FIX: If we detect a Google Font that isn't loaded, load it now
        if (GFONTS.has(ff)) {
            loadFont(ff, iframe.contentDocument);
            loadFont(ff, document);
        }

        document.querySelectorAll('.o-we-toolbar').forEach(toolbar => {
            const fontLbl = toolbar.querySelector('.gf-trigger-font .gf-lbl');
            const weightLbl = toolbar.querySelector('.gf-trigger-weight .gf-lbl');

            if (fontLbl) {
                const match = ALL_FONTS.find(f => f.toLowerCase() === ff.toLowerCase());
                fontLbl.textContent = match || 'Font Family';
            }

            if (weightLbl) {
                const match = WEIGHT_ITEMS.find(w => w.v === fw);
                weightLbl.textContent = match ? (match.l.includes('—') ? match.l.split('—')[0].trim() : match.l) : 'Weight';
            }
        });
    }

    function applyStyle(prop, val) {
        console.log('[GF] applyStyle targeting:', prop, val);
        const iframe = getIframe();
        const win = iframe?.contentWindow || _win;
        if (!win) return false;

        const sel = win.getSelection();
        // Force restoration of the range we saved when the user was interacting with the editor
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
            if (_range) {
                console.log('[GF] Restoring range to editor');
                try {
                    win.focus();
                    const s = win.getSelection();
                    s.removeAllRanges();
                    s.addRange(_range);
                } catch (e) { console.warn('[GF] Restore failed', e); }
            }
        }

        const activeSel = win.getSelection();
        if (!activeSel || activeSel.rangeCount === 0) {
            console.error('[GF] Style application aborted: Selection still empty');
            return false;
        }

        const doc = win.document;
        const range = activeSel.getRangeAt(0);
        console.log('[GF] Applying style to:', range.toString().substring(0, 30));

        const span = doc.createElement('span');
        span.style[prop] = val;
        
        try {
            // Priority: wrap selection
            range.surroundContents(span);
        } catch (e) {
            // Fallback for complex/cross-node selections
            const frag = range.extractContents();
            span.appendChild(frag);
            range.insertNode(span);
        }

        // Keep selection active so Odoo toolbar stays visible
        const nr = doc.createRange();
        nr.selectNodeContents(span);
        activeSel.removeAllRanges();
        activeSel.addRange(nr);
        _range = nr.cloneRange();
        _win = win;

        // Notify Odoo of the change (Forces "Save" button to enable)
        try {
            const editable = doc.querySelector('.odoo-editor-editable') || doc.body;
            editable.dispatchEvent(new Event('input', { bubbles: true }));
            editable.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (e) {
            console.warn('[GF] Failed to notify editor of change', e);
        }

        console.log('[GF ✓] Done.');
        return true;
    }

    function toast(msg) {
        const d = Object.assign(document.createElement('div'), { textContent: msg });
        Object.assign(d.style, {
            position:'fixed', top:'65px', left:'50%', transform:'translateX(-50%)',
            background:'#333', color:'#fff', padding:'7px 16px', borderRadius:'5px',
            fontSize:'12px', zIndex:'2147483647', pointerEvents:'none',
        });
        document.body.appendChild(d);
        setTimeout(() => d.remove(), 2500);
    }

    // ── Build trigger button ──────────────────────────────────────────────────
    function makeTrigger(label, extraClass, ownerDoc, getItems, onPick, isFont = false) {
        const btn = ownerDoc.createElement('button');
        btn.className = `gf-trigger ${extraClass}`;
        btn.innerHTML = `<span class="gf-lbl">${label}</span><span class="gf-caret">▾</span>`;

        const handleAction = (e) => {
            console.log('[GF] Trigger handled on:', label, 'via', e.type);
            e.preventDefault();
            e.stopPropagation();
            
            // Short delay to ensure Odoo's own handlers (if any) finish
            setTimeout(() => {
                const toolbar = btn.closest('.o-we-toolbar');
                console.log('[GF] Opening panel for toolbar:', toolbar);
                openPanel(btn, toolbar, getItems(), (val, lbl) => {
                    console.log('[GF] Picked:', val);
                    onPick(val, lbl, btn);
                }, isFont);
            }, 10);
        };

        // Use bubble phase (false) so internal menu items can catch events first
        btn.addEventListener('mousedown', handleAction, false);
        btn.addEventListener('touchstart', handleAction, false);
        btn.addEventListener('click', handleAction, false);
        
        return btn;
    }

    // ── Inject into a toolbar ─────────────────────────────────────────────────
    function inject(toolbar) {
        if (!toolbar) return;
        
        // ONLY inject if builder is open
        if (!document.body.classList.contains('o_builder_open')) {
            const existing = toolbar.querySelector('.gf-btn-group');
            if (existing) {
                existing.previousElementSibling?.remove(); // separator
                existing.remove();
            }
            return;
        }

        // Check if we already injected into this one
        if (toolbar.querySelector('.gf-btn-group')) return;
        
        // Wait for toolbar to be actually visible before injecting
        if (toolbar.offsetWidth === 0) return;

        toolbar.dataset.gfDone = '1';

        const ownerDoc = toolbar.ownerDocument;
        console.log('[GF] Injecting into toolbar:', toolbar, 'ownerDoc:', ownerDoc.location.href);

        const sep = ownerDoc.createElement('span');
        sep.className = 'o-we-toolbar-vertical-separator';

        const grp = ownerDoc.createElement('div');
        grp.className = 'btn-group gf-btn-group';
        grp.setAttribute('name', 'google_fonts');

        // Font Family trigger
        const fontBtn = makeTrigger('Font Family', 'gf-trigger-font', ownerDoc,
            () => {
                const items = [];
                FONT_GROUPS.forEach(g => {
                    items.push({ type:'group', label: g.label });
                    g.fonts.forEach(f => items.push({ value:f, label:f, font:f }));
                });
                return items;
            },
            (font, lbl, btn) => {
                console.log('[GF] Application targeted:', font);
                try {
                    loadFont(font, ownerDoc);
                    const iframe = getIframe();
                    if (iframe?.contentDocument) {
                        loadFont(font, iframe.contentDocument);
                    }
                    if (applyStyle('fontFamily', `'${font}',sans-serif`)) {
                        btn.querySelector('.gf-lbl').textContent = font;
                    }
                } catch (e) {
                    console.error('[GF] Error in font application:', e);
                }
            },
            true // isFont
        );

        // Weight trigger
        const wtBtn = makeTrigger('Weight', 'gf-trigger-weight', ownerDoc,
            () => WEIGHT_ITEMS.map(w => ({ value:w.v, label:w.l })),
            (weight, lbl, btn) => {
                if (applyStyle('fontWeight', weight)) {
                    btn.querySelector('.gf-lbl').textContent = lbl;
                }
            }
        );

        grp.appendChild(fontBtn);
        grp.appendChild(wtBtn);
        toolbar.appendChild(sep);
        toolbar.appendChild(grp);
        console.log('[GF ✓] Injected successfully.');
    }

    // ── Watch iframe for selection ────────────────────────────────────────────
    function watchIframe() {
        const iframe = getIframe();
        const doc = iframe?.contentDocument;
        if (!doc || doc._gfWatched) return;
        doc._gfWatched = true;
        console.log('[GF] Watching iframe:', iframe.src);
        
        // Ensure ANY click in the iframe kills the dropdown
        doc.addEventListener('mousedown', () => closePanel(), true);
        doc.addEventListener('click', () => closePanel(), true);
        
        ['mouseup','keyup','selectionchange'].forEach(ev =>
            doc.addEventListener(ev, saveNow, true)
        );
    }

    // ── Scan for toolbars ─────────────────────────────────────────────────────
    function scan() {
        const toolbars = document.querySelectorAll('.o-we-toolbar');
        if (toolbars.length > 0) {
            toolbars.forEach(inject);
        }
    }

    new MutationObserver(() => { scan(); watchIframe(); })
        .observe(document.documentElement, { childList:true, subtree:true, attributes: true, attributeFilter: ['class', 'style'] });

    document.addEventListener('mouseup', saveNow, true);

    // Frequent checks initially to catch flickering Odoo toolbars
    [0, 100, 300, 500, 1000, 2000, 5000].forEach(t =>
        setTimeout(() => { scan(); watchIframe(); }, t)
    );

})();
