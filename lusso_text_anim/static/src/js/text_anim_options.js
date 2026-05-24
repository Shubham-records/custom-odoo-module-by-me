/** @odoo-module **/
/**
 * Lusso Text Animation — text_anim_options.js (Odoo 19)
 *
 * In Odoo 19, snippet options are registered ONLY in JavaScript.
 * There is NO "website.snippet_options" XML template to inherit from.
 *
 * Correct API:
 *   import options from "@web_editor/js/editor/snippets.options"
 *   options.registry.MyOption = SnippetOption.extend({ ... })
 *
 * The option `selector` property controls which element triggers the option panel.
 * Loaded via `website.assets_wysiwyg` in __manifest__.py.
 */

import { SnippetOption } from "@web_editor/js/editor/snippets.options";
import options from "@web_editor/js/editor/snippets.options";

// ── Helper: build a new row DOM element ────────────────────────────────────

function buildRow(text = "Your text here", align = "left") {
    const row = document.createElement("div");
    row.className = "txa-row";
    row.dataset.align = align;
    row.style.justifyContent = "flex-start";

    const line = document.createElement("div");
    line.className = "txa-text-line";

    const editable = document.createElement("span");
    editable.className = "txa-editable";
    editable.setAttribute("contenteditable", "true");
    editable.textContent = text;

    line.appendChild(editable);
    row.appendChild(line);
    return row;
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION-LEVEL OPTIONS
// Triggered when .s_text_anim_tumble or .s_text_anim_slide is selected
// ══════════════════════════════════════════════════════════════════════════

const LussoTextAnimBase = SnippetOption.extend({

    /**
     * Add a new text row at the bottom of the wrapper.
     */
    addRow(previewMode, widgetValue, params) {
        if (previewMode) return;
        const wrapper = this.$target[0].querySelector(".txa-wrapper");
        if (!wrapper) return;
        wrapper.appendChild(buildRow("New text line", "left"));
        this.trigger_up("snippet_edition_request", { onSuccess: () => {} });
    },

    /**
     * Set GSAP animation speed (stored as data attribute, read by text_anim.js).
     */
    animSpeed(previewMode, widgetValue) {
        this.$target[0].dataset.animSpeed = widgetValue;
    },

    /**
     * Set GSAP stagger (stored as data attribute, read by text_anim.js).
     */
    animStagger(previewMode, widgetValue) {
        this.$target[0].dataset.animStagger = widgetValue;
    },

    _computeWidgetState(methodName, params) {
        switch (methodName) {
            case "animSpeed":
                return this.$target[0].dataset.animSpeed || "1.0";
            case "animStagger":
                return this.$target[0].dataset.animStagger || "0.07";
        }
        return this._super(...arguments);
    },
});

// One registration per section class (Odoo matches by `selector` on the class)
options.registry.LussoTumbleOptions = LussoTextAnimBase.extend({
    selector: ".s_text_anim_tumble",
});

options.registry.LussoSlideOptions = LussoTextAnimBase.extend({
    selector: ".s_text_anim_slide",
});

// ══════════════════════════════════════════════════════════════════════════
// ROW-LEVEL OPTIONS
// Triggered when a .txa-row child element is selected in the editor
// ══════════════════════════════════════════════════════════════════════════

options.registry.LussoTextRowOptions = SnippetOption.extend({

    selector: ".txa-row",

    /**
     * Apply left / center / right alignment to this row.
     */
    rowAlign(previewMode, widgetValue) {
        const row = this.$target[0];
        row.dataset.align = widgetValue;
        const map = { left: "flex-start", center: "center", right: "flex-end" };
        row.style.justifyContent = map[widgetValue] || "flex-start";
    },

    /**
     * Remove this row. At least one row is always kept.
     */
    removeRow(previewMode, widgetValue) {
        if (previewMode) return;
        const row = this.$target[0];
        const wrapper = row.closest(".txa-wrapper");
        if (!wrapper) return;
        if (wrapper.querySelectorAll(".txa-row").length <= 1) return;
        row.remove();
        this.trigger_up("snippet_edition_request", { onSuccess: () => {} });
    },

    _computeWidgetState(methodName, params) {
        if (methodName === "rowAlign") {
            return this.$target[0].dataset.align || "left";
        }
        return this._super(...arguments);
    },
});
