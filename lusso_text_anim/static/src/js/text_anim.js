/** @odoo-module **/
/**
 * Lusso Text Animation Snippets — text_anim.js
 *
 * Provides two scroll-triggered GSAP text animations:
 *   1. TUMBLE  — each character rotates/falls in from above (Type A)
 *   2. SLIDE   — whole words slide up with slight tilt (Type B)
 *
 * GSAP + ScrollTrigger are loaded via CDN in the manifest.
 * Both snippets react to data-align on each .txa-row and
 * support n rows added dynamically through the Odoo sidebar.
 */

import publicWidget from "@web/legacy/js/public/public_widget";
import { loadJS } from "@web/core/assets";

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Split the text content of a .txa-editable span into
 * individual <span class="txa-char"> elements (char-by-char).
 * Spaces become .txa-char.is-space with a fixed width.
 */
function splitIntoChars(lineEl) {
    const editable = lineEl.querySelector(".txa-editable");
    if (!editable) return [];

    const text = editable.textContent || "";
    editable.innerHTML = "";

    const chars = [];
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const span = document.createElement("span");
        span.className = "txa-char" + (ch === " " ? " is-space" : "");
        span.textContent = ch === " " ? "\u00A0" : ch;
        editable.appendChild(span);
        chars.push(span);
    }
    return chars;
}

/**
 * Split text into characters for the SLIDE animation (Type B).
 * Each char gets an overflow:hidden .txa-char-wrap container so the
 * char is invisible when below y:0 and reveals as it slides up.
 * Spaces are rendered as fixed-width gaps between wraps.
 */
function splitIntoCharsClip(lineEl) {
    const editable = lineEl.querySelector(".txa-editable");
    if (!editable) return [];

    const text = editable.textContent || "";
    editable.innerHTML = "";

    const chars = [];
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (ch === " ") {
            // Space: plain span, no clip needed
            const space = document.createElement("span");
            space.className = "txa-char-space";
            space.textContent = " ";
            editable.appendChild(space);
            continue;
        }

        // Clip wrapper — overflow:hidden set in CSS
        const wrap = document.createElement("span");
        wrap.className = "txa-char-wrap";

        // The actual character that GSAP moves
        const inner = document.createElement("span");
        inner.className = "txa-char-inner";
        inner.textContent = ch;

        wrap.appendChild(inner);
        editable.appendChild(wrap);
        chars.push(inner);
    }
    return chars;
}

/**
 * Split the text content of a .txa-editable span into
 * word-wrapped <span class="txa-word-wrap"> > <span class="txa-word"> blocks.
 */
function splitIntoWords(lineEl) {
    const editable = lineEl.querySelector(".txa-editable");
    if (!editable) return [];

    const text = editable.textContent || "";
    editable.innerHTML = "";

    const words = text.split(" ");
    const wordEls = [];

    words.forEach((word, idx) => {
        if (!word) return;

        // .txa-word-wrap = overflow:hidden clip mask (set in CSS)
        // .txa-word      = the element that actually moves (y: 105% -> 0%)
        const wrap = document.createElement("span");
        wrap.className = "txa-word-wrap";

        const inner = document.createElement("span");
        inner.className = "txa-word";
        inner.textContent = word;

        wrap.appendChild(inner);
        editable.appendChild(wrap);
        wordEls.push(inner);

        // Space BETWEEN words — outside the clip wrap so it doesn't clip
        if (idx < words.length - 1) {
            const space = document.createElement("span");
            space.className = "txa-word-space";
            space.textContent = "\u00A0";
            editable.appendChild(space);
        }
    });

    return wordEls;
}

// ── GSAP Loader ────────────────────────────────────────────────────────────

let gsapReady = null;

async function ensureGSAP() {
    if (gsapReady) return gsapReady;

    gsapReady = (async () => {
        // Load GSAP core
        if (typeof gsap === "undefined") {
            await loadJS("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js");
        }
        // Load ScrollTrigger plugin
        if (typeof ScrollTrigger === "undefined") {
            await loadJS(
                "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"
            );
        }
        if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
            gsap.registerPlugin(ScrollTrigger);
        }
    })();

    return gsapReady;
}

// ── Animation speed / stagger helpers ─────────────────────────────────────

function getSpeed(sectionEl) {
    return parseFloat(sectionEl.dataset.animSpeed || "1.0");
}

function getStagger(sectionEl) {
    return parseFloat(sectionEl.dataset.animStagger || "0.07");
}

// ── TYPE A: Tumble Animation ───────────────────────────────────────────────

publicWidget.registry.LussoTumbleAnim = publicWidget.Widget.extend({
    selector: ".s_text_anim_tumble",
    disabledInEditableMode: true,  // don't animate while editing

    start: async function () {
        this._super.apply(this, arguments);
        await ensureGSAP();
        this._initTumble();
    },

    destroy: function () {
        // Kill all ScrollTriggers belonging to this section
        if (typeof ScrollTrigger !== "undefined") {
            ScrollTrigger.getAll()
                .filter((st) => st.trigger && this.el.contains(st.trigger))
                .forEach((st) => st.kill());
        }
        this._super.apply(this, arguments);
    },

    _initTumble: function () {
        const section = this.el;
        const rows = section.querySelectorAll(".txa-row");

        rows.forEach((row, rowIdx) => {
            const lineEl = row.querySelector(".txa-text-line");
            if (!lineEl) return;

            const chars = splitIntoChars(lineEl);
            if (!chars.length) return;

            const speed = getSpeed(section);
            const stagger = getStagger(section);

            // Initial state — each char is rotated and above its position
            gsap.set(chars, {
                y: "-110%",
                rotationZ: () => gsap.utils.random(-25, 25),
                rotationX: 90,
                opacity: 0,
                transformOrigin: "center bottom",
            });

            // ScrollTrigger timeline per row
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: row,
                    start: "top 88%",
                    end: "top 30%",
                    toggleActions: "play none none reverse",
                },
            });

            tl.to(chars, {
                y: "0%",
                rotationZ: 0,
                rotationX: 0,
                opacity: 1,
                duration: speed * 0.9,
                stagger: stagger,
                ease: "power3.out",
                delay: rowIdx * 0.08,
            });
        });

        // Refresh ScrollTrigger after DOM changes
        ScrollTrigger.refresh();
    },
});

// ── TYPE B: Slide Animation ────────────────────────────────────────────────
//
// Each word is wrapped in an overflow:hidden mask (.txa-word-wrap).
// The inner .txa-word starts at y:105% (sitting below the clip boundary)
// and slides straight up into view — a pure bottom-to-top reveal.
// Words in the same row stagger left-to-right.
// Row 2 begins only after Row 1's last word has started, creating the
// sequential "one row then the next" effect seen in the reference.

publicWidget.registry.LussoSlideAnim = publicWidget.Widget.extend({
    selector: ".s_text_anim_slide",
    disabledInEditableMode: true,

    start: async function () {
        this._super.apply(this, arguments);
        await ensureGSAP();
        this._initSlide();
    },

    destroy: function () {
        if (typeof ScrollTrigger !== "undefined") {
            ScrollTrigger.getAll()
                .filter((st) => st.trigger && this.el.contains(st.trigger))
                .forEach((st) => st.kill());
        }
        this._super.apply(this, arguments);
    },

    _initSlide: function () {
        const section = this.el;
        const rows = section.querySelectorAll(".txa-row");
        const speed = getSpeed(section);

        // Each CHARACTER slides straight up through its clip wrapper.
        // Duration per character travel
        const charDuration = speed * 0.75;
        // Stagger between consecutive characters
        const charStagger = 0.045;

        // Pre-split all rows so we can build one master timeline
        const rowCharArrays = [];
        rows.forEach((row) => {
            const lineEl = row.querySelector(".txa-text-line");
            if (!lineEl) return;
            // splitIntoChars wraps each letter in .txa-char inside .txa-char-wrap
            const chars = splitIntoCharsClip(lineEl);
            if (!chars.length) return;
            // Initial: each char sits BELOW its clip wrap — pure y, zero rotation
            gsap.set(chars, { y: "110%", rotation: 0, rotationX: 0, rotationZ: 0, opacity: 1 });
            rowCharArrays.push(chars);
        });

        if (!rowCharArrays.length) return;

        // One master timeline — row 2 starts after row 1's last char begins
        const masterTl = gsap.timeline({
            scrollTrigger: {
                trigger: section,
                start: "top 80%",
                toggleActions: "play none none reverse",
            },
        });

        rowCharArrays.forEach((chars, rowIdx) => {
            const position = rowIdx === 0 ? 0 : ">-0.3";
            masterTl.to(chars, {
                y: "0%",
                duration: charDuration,
                stagger: charStagger,
                ease: "power3.out",
                rotation: 0,
                rotationX: 0,
                rotationZ: 0,
            }, position);
        });

        ScrollTrigger.refresh();
    },
});
