/** @odoo-module **/

/**
 * Google Fonts Picker Plugin for Odoo 17/19 Website Builder
 *
 * Injects a Font Family + Font Weight selector into the wysiwyg toolbar.
 * Applies styles directly to the current text selection using execCommand
 * (for broad compatibility) with a <span> fallback for font-family.
 */

import { Plugin } from "@web_editor/js/editor/plugin";
import { registry } from "@web/core/registry";
import { _t } from "@web/core/l10n/translation";

import { rpc } from "@web/core/network/rpc";

let DYNAMIC_FONT_GROUPS = {};
let GOOGLE_FONT_FAMILIES = [];

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
        
        const formatLabel = (s) => (s || 'other').split(/[-_ ]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const grouped = {};
        
        result.forEach(f => {
            const groupKey = f.font_group || 'other';
            const label = formatLabel(groupKey);
            if (!grouped[label]) grouped[label] = [];
            grouped[label].push(f.name);
            if (groupKey !== 'system') {
                GOOGLE_FONT_FAMILIES.push(f.name);
            }
        });
        DYNAMIC_FONT_GROUPS = grouped;
    } catch (e) {
        console.error("Failed to load fonts", e);
    }
}
loadFonts();

const FONT_WEIGHTS = [
    { value: "100", label: "Thin (100)" },
    { value: "200", label: "ExtraLight (200)" },
    { value: "300", label: "Light (300)" },
    { value: "400", label: "Regular (400)" },
    { value: "500", label: "Medium (500)" },
    { value: "600", label: "SemiBold (600)" },
    { value: "700", label: "Bold (700)" },
    { value: "800", label: "ExtraBold (800)" },
    { value: "900", label: "Black (900)" },
];

// ─── Google Font dynamic loader ───────────────────────────────────────────────

const _loadedFonts = new Set();

function loadGoogleFont(fontName) {
    if (_loadedFonts.has(fontName)) return;
    // Only load Google Fonts (skip system fonts)
    if (!GOOGLE_FONT_FAMILIES.includes(fontName)) return;
    _loadedFonts.add(fontName);
    const encoded = fontName.replace(/ /g, "+");
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
    document.head.appendChild(link);
}

// ─── Apply font/weight to selection ──────────────────────────────────────────

function applyFontFamily(fontName) {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    loadGoogleFont(fontName);
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    span.style.fontFamily = `'${fontName}', sans-serif`;
    try {
        range.surroundContents(span);
    } catch (e) {
        // Selection crosses multiple nodes — use extractContents approach
        const fragment = range.extractContents();
        span.appendChild(fragment);
        range.insertNode(span);
    }
    // Re-select the newly wrapped span
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(newRange);
}

function applyFontWeight(weight) {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    span.style.fontWeight = weight;
    try {
        range.surroundContents(span);
    } catch (e) {
        const fragment = range.extractContents();
        span.appendChild(fragment);
        range.insertNode(span);
    }
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(newRange);
}

// ─── Detect current selection's font values ───────────────────────────────────

function getSelectionFontFamily() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return "";
    const node = sel.anchorNode;
    const el = node.nodeType === 3 ? node.parentElement : node;
    if (!el) return "";
    const ff = getComputedStyle(el).fontFamily;
    // Extract first font name
    return ff.split(",")[0].replace(/['"]/g, "").trim();
}

function getSelectionFontWeight() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return "";
    const node = sel.anchorNode;
    const el = node.nodeType === 3 ? node.parentElement : node;
    if (!el) return "";
    return getComputedStyle(el).fontWeight;
}

// ─── Build toolbar UI ─────────────────────────────────────────────────────────

function buildFontFamilySelect() {
    const sel = document.createElement("select");
    sel.className = "gf-font-select";
    sel.title = _t("Font Family");

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "── Font ──";
    sel.appendChild(placeholder);

    for (const [groupName, fonts] of Object.entries(DYNAMIC_FONT_GROUPS)) {
        if (fonts.length === 0) continue;
        const og = document.createElement("optgroup");
        og.label = groupName;
        for (const font of fonts) {
            const opt = document.createElement("option");
            opt.value = font;
            opt.textContent = font;
            opt.style.fontFamily = `'${font}', sans-serif`;
            og.appendChild(opt);
        }
        sel.appendChild(og);
    }
    return sel;
}

function buildFontWeightSelect() {
    const sel = document.createElement("select");
    sel.className = "gf-weight-select";
    sel.title = _t("Font Weight");

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Weight";
    sel.appendChild(placeholder);

    for (const { value, label } of FONT_WEIGHTS) {
        const opt = document.createElement("option");
        opt.value = value;
        opt.textContent = label;
        sel.appendChild(opt);
    }
    return sel;
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export class GoogleFontsPlugin extends Plugin {
    static name = "google_fonts";
    static dependencies = ["toolbar"];

    setup() {
        this._fontSelect = null;
        this._weightSelect = null;
        this._toolbar = null;
        this._injectToolbar();
    }

    _injectToolbar() {
        // Wait for toolbar to be present in DOM, then inject our controls
        const tryInject = () => {
            const toolbar = document.querySelector(
                ".odoo-editor-toolbar, .oe-toolbar, .web_editor-toolbar, [data-name='toolbar']"
            );
            if (toolbar) {
                this._toolbar = toolbar;
                this._addControls(toolbar);
            } else {
                setTimeout(tryInject, 300);
            }
        };
        setTimeout(tryInject, 500);
    }

    _addControls(toolbar) {
        if (toolbar.querySelector(".gf-font-picker-wrap")) return; // already added

        // Build elements
        const separator = document.createElement("span");
        separator.className = "gf-separator";

        const wrap = document.createElement("span");
        wrap.className = "gf-font-picker-wrap";

        this._fontSelect = buildFontFamilySelect();
        this._weightSelect = buildFontWeightSelect();

        wrap.appendChild(this._fontSelect);
        wrap.appendChild(this._weightSelect);

        toolbar.appendChild(separator);
        toolbar.appendChild(wrap);

        // Events
        this._fontSelect.addEventListener("change", (e) => {
            const font = e.target.value;
            if (font) {
                applyFontFamily(font);
                e.target.value = "";  // reset so same font can be re-applied
            }
        });

        this._weightSelect.addEventListener("change", (e) => {
            const weight = e.target.value;
            if (weight) {
                applyFontWeight(weight);
                e.target.value = "";
            }
        });

        // Update selects to reflect current selection
        document.addEventListener("selectionchange", () => this._syncSelects());
    }

    _syncSelects() {
        if (!this._fontSelect || !this._weightSelect) return;
        const ff = getSelectionFontFamily();
        const fw = getSelectionFontWeight();

        // Try to match font family
        const fontOpt = [...this._fontSelect.options].find(
            (o) => o.value && ff.toLowerCase().includes(o.value.toLowerCase())
        );
        this._fontSelect.value = fontOpt ? fontOpt.value : "";

        // Match weight (browser returns numeric string like "400")
        const weightOpt = [...this._weightSelect.options].find((o) => o.value === fw);
        this._weightSelect.value = weightOpt ? weightOpt.value : "";
    }
}

// ─── Register plugin ──────────────────────────────────────────────────────────

registry.category("web_editor/plugins").add("google_fonts", GoogleFontsPlugin);
