/** @odoo-module **/
/**
 * Fallback / supplemental: DOM-based toolbar injector.
 * Works alongside the Plugin class. Uses a MutationObserver to detect
 * when the Odoo editor toolbar appears and injects font controls.
 */

import { _t } from "@web/core/l10n/translation";

// ── Google Font loader ──────────────────────────────────────────────────────

const _loaded = new Set();
export function ensureFontLoaded(name) {
    if (_loaded.has(name) || !name) return;
    _loaded.add(name);
    const encoded = encodeURIComponent(name).replace(/%20/g, "+");
    const id = "gf-link-" + encoded;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encoded}:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap`;
    document.head.appendChild(link);
}

// ── Apply helpers ───────────────────────────────────────────────────────────

function wrapSelection(styleKey, styleValue) {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
        alert(_t("Please select some text first."));
        return;
    }
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    span.style[styleKey] = styleValue;
    try {
        range.surroundContents(span);
    } catch (_) {
        const frag = range.extractContents();
        span.appendChild(frag);
        range.insertNode(span);
    }
    // Restore selection
    const nr = document.createRange();
    nr.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(nr);
}

// ── Toolbar builder ─────────────────────────────────────────────────────────

import { rpc } from "@web/core/network/rpc";

let FONT_GROUPS = {};

async function loadFonts() {
    try {
        const result = await rpc("/web/dataset/call_kw/google.font/search_read", {
            model: "google.font",
            method: "search_read",
            args: [[]],
            kwargs: {
                fields: ["name", "font_group"],
                order: "sequence, name",
            },
        });
        
        const grouped = {};
        const formatLabel = (s) => (s || 'other').split(/[-_ ]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        
        result.forEach(f => {
            const groupKey = f.font_group || 'other';
            const label = formatLabel(groupKey);
            if (!grouped[label]) grouped[label] = [];
            grouped[label].push(f.name);
        });
        FONT_GROUPS = grouped;
        tryInject();
    } catch (e) {
        console.error("Failed to load fonts", e);
    }
}
loadFonts();

const WEIGHTS = [
    ["100","Thin"],["200","ExtraLight"],["300","Light"],
    ["400","Regular"],["500","Medium"],["600","SemiBold"],
    ["700","Bold"],["800","ExtraBold"],["900","Black"],
];

function makeFontSelect() {
    const s = document.createElement("select");
    s.className = "gf-font-select";
    s.title = "Google Font Family";
    s.innerHTML = `<option value="">── Font ──</option>`;
    for (const [grp, fonts] of Object.entries(FONT_GROUPS)) {
        const og = document.createElement("optgroup");
        og.label = grp;
        fonts.forEach((f) => {
            const o = document.createElement("option");
            o.value = f; o.textContent = f;
            o.style.fontFamily = `'${f}',sans-serif`;
            og.appendChild(o);
        });
        s.appendChild(og);
    }
    s.addEventListener("change", ({ target }) => {
        if (!target.value) return;
        ensureFontLoaded(target.value);
        wrapSelection("fontFamily", `'${target.value}', sans-serif`);
        target.value = "";
    });
    return s;
}

function makeWeightSelect() {
    const s = document.createElement("select");
    s.className = "gf-weight-select";
    s.title = "Font Weight";
    s.innerHTML = `<option value="">Weight</option>`;
    WEIGHTS.forEach(([v, l]) => {
        const o = document.createElement("option");
        o.value = v; o.textContent = `${l} (${v})`;
        s.appendChild(o);
    });
    s.addEventListener("change", ({ target }) => {
        if (!target.value) return;
        wrapSelection("fontWeight", target.value);
        target.value = "";
    });
    return s;
}

function injectIntoToolbar(toolbar) {
    if (toolbar.dataset.gfInjected) return;
    toolbar.dataset.gfInjected = "1";

    const sep = document.createElement("span");
    sep.className = "gf-separator";

    const wrap = document.createElement("span");
    wrap.className = "gf-font-picker-wrap";
    wrap.appendChild(makeFontSelect());
    wrap.appendChild(makeWeightSelect());

    toolbar.appendChild(sep);
    toolbar.appendChild(wrap);
    console.log("[GoogleFonts] Picker injected into toolbar.");
}

// ── Toolbar selectors (covers Odoo 16, 17, 19) ─────────────────────────────

const TOOLBAR_SELECTORS = [
    ".odoo-editor-toolbar",
    ".oe-toolbar",
    ".web_editor-toolbar",
    "#toolbar",
    "[data-name='toolbar']",
    ".note-toolbar",
].join(", ");

function tryInject() {
    document.querySelectorAll(TOOLBAR_SELECTORS).forEach((tb) => {
        // Only inject into visible toolbars
        if (tb.offsetParent !== null) injectIntoToolbar(tb);
    });
}

// ── MutationObserver ────────────────────────────────────────────────────────

const observer = new MutationObserver(() => tryInject());
observer.observe(document.body, { childList: true, subtree: true });

// Also try immediately and after short delays
tryInject();
setTimeout(tryInject, 800);
setTimeout(tryInject, 2000);
