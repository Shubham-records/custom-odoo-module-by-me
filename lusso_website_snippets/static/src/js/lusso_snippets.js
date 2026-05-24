/**
 * lusso_snippets.js
 * GSAP-powered animations for Lusso Website Snippets
 * Loads GSAP + ScrollTrigger from CDN then runs all animations.
 */

(function () {
  "use strict";

  /* ----------------------------------------------------------------
     Load GSAP + ScrollTrigger from CDN
  ---------------------------------------------------------------- */
  function loadScript(src, onload) {
    const s = document.createElement("script");
    s.src = src;
    s.onload = onload;
    document.head.appendChild(s);
  }

  function initLussoAnimations() {
    if (typeof gsap === "undefined") return;

    // Register ScrollTrigger if available
    if (typeof ScrollTrigger !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }

    /* ── Fade-Up ─────────────────────────────────────────────── */
    document.querySelectorAll('[data-gsap="fade-up"]').forEach((el) => {
      const delay = parseFloat(el.getAttribute("data-gsap-delay") || 0);
      gsap.fromTo(
        el,
        { opacity: 0, y: 32 },
        {
          opacity: 1,
          y: 0,
          duration: 0.85,
          delay: delay,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: "play none none none",
          },
        }
      );
    });

    /* ── Fade-Left (from right) ──────────────────────────────── */
    document.querySelectorAll('[data-gsap="fade-left"]').forEach((el) => {
      const delay = parseFloat(el.getAttribute("data-gsap-delay") || 0);
      gsap.fromTo(
        el,
        { opacity: 0, x: 50 },
        {
          opacity: 1,
          x: 0,
          duration: 1,
          delay: delay,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    });

    /* ── Fade-Right (from left) ──────────────────────────────── */
    document.querySelectorAll('[data-gsap="fade-right"]').forEach((el) => {
      const delay = parseFloat(el.getAttribute("data-gsap-delay") || 0);
      gsap.fromTo(
        el,
        { opacity: 0, x: -50 },
        {
          opacity: 1,
          x: 0,
          duration: 1,
          delay: delay,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    });

    /* ── Scale-In ────────────────────────────────────────────── */
    document.querySelectorAll('[data-gsap="scale-in"]').forEach((el) => {
      const delay = parseFloat(el.getAttribute("data-gsap-delay") || 0);
      gsap.fromTo(
        el,
        { opacity: 0, scale: 0.93 },
        {
          opacity: 1,
          scale: 1,
          duration: 1.1,
          delay: delay,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );
    });

    /* ── Pop-In ──────────────────────────────────────────────── */
    document.querySelectorAll('[data-gsap="pop-in"]').forEach((el) => {
      const delay = parseFloat(el.getAttribute("data-gsap-delay") || 0);
      gsap.fromTo(
        el,
        { opacity: 0, scale: 0.75, y: 12 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.7,
          delay: delay,
          ease: "back.out(1.6)",
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );
    });

    /* ── Marquee / infinite scroll ticker ───────────────────── */
    const marqueeInners = document.querySelectorAll("#lusso-marquee-inner");
    marqueeInners.forEach((inner) => {
      const width = inner.scrollWidth / 2; // half because content is doubled
      gsap.fromTo(
        inner,
        { x: 0 },
        {
          x: -width,
          duration: 30,
          ease: "none",
          repeat: -1,
        }
      );
      // Speed up on hover
      inner.parentElement.addEventListener("mouseenter", () => {
        gsap.to(inner, { timeScale: 2, duration: 0.4 });
      });
      inner.parentElement.addEventListener("mouseleave", () => {
        gsap.to(inner, { timeScale: 1, duration: 0.4 });
      });
    });

    /* ── Products horizontal scroll (prev/next btns) ────────── */
    const track = document.getElementById("lusso-products-track");
    if (track) {
      const cardWidth = 300; // card + gap
      let currentOffset = 0;

      document.getElementById("lusso-scroll-next")?.addEventListener("click", () => {
        const maxOffset = -(track.scrollWidth - track.parentElement.clientWidth);
        currentOffset = Math.max(currentOffset - cardWidth, maxOffset);
        gsap.to(track, { x: currentOffset, duration: 0.6, ease: "power3.out" });
      });

      document.getElementById("lusso-scroll-prev")?.addEventListener("click", () => {
        currentOffset = Math.min(currentOffset + cardWidth, 0);
        gsap.to(track, { x: currentOffset, duration: 0.6, ease: "power3.out" });
      });
    }

    /* ── Parallax on hero images ────────────────────────────── */
    document.querySelectorAll(".lusso-hero__image").forEach((img) => {
      gsap.fromTo(
        img,
        { yPercent: -5 },
        {
          yPercent: 5,
          ease: "none",
          scrollTrigger: {
            trigger: img.closest(".lusso-hero"),
            start: "top top",
            end: "bottom top",
            scrub: 1.5,
          },
        }
      );
    });

    /* ── Stagger hero content in on page load ────────────────── */
    document.querySelectorAll(".lusso-hero__content").forEach((content) => {
      const children = content.querySelectorAll("[data-gsap]");
      // Already handled by individual element animations above ✓
    });

    /* ── Number counter for stats ───────────────────────────── */
    document.querySelectorAll(".lusso-stats__num, .lusso-craft__stat-num").forEach((el) => {
      const target = parseInt(el.getAttribute("data-target") || el.textContent, 10);
      const suffix = el.textContent.replace(/[0-9]/g, "").trim(); // e.g. "k+", "%", "+"

      const obj = { val: 0 };
      gsap.fromTo(
        obj,
        { val: 0 },
        {
          val: target,
          duration: 2,
          ease: "power2.out",
          onUpdate: function () {
            const v = Math.round(obj.val);
            el.textContent =
              v >= 1000 ? Math.round(v / 1000) + "k+" : v + suffix;
          },
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    });

    /* ── Subtle hover tilt on collection cards ───────────────── */
    document.querySelectorAll(".lusso-collections__item").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        gsap.to(card, {
          rotateY: x * 6,
          rotateX: -y * 6,
          transformPerspective: 800,
          duration: 0.4,
          ease: "power2.out",
        });
      });
      card.addEventListener("mouseleave", () => {
        gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.6, ease: "power3.out" });
      });
    });

    /* ── Hero tag float animation ───────────────────────────── */
    document.querySelectorAll(".lusso-hero__tag").forEach((tag) => {
      gsap.to(tag, {
        y: -8,
        duration: 2.5,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    });

    /* ── Craft stat cards entrance with stagger ─────────────── */
    document.querySelectorAll(".lusso-craft__stat").forEach((stat, i) => {
      gsap.fromTo(
        stat,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          delay: i * 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: stat,
            start: "top 88%",
            toggleActions: "play none none none",
          },
        }
      );
    });

    /* ── Testimonial cards subtle entrance ──────────────────── */
    document.querySelectorAll(".lusso-testimonials__card").forEach((card, i) => {
      card.addEventListener("mouseenter", () => {
        gsap.to(card, { y: -6, duration: 0.35, ease: "power2.out" });
      });
      card.addEventListener("mouseleave", () => {
        gsap.to(card, { y: 0, duration: 0.5, ease: "power2.out" });
      });
    });

    /* ── Newsletter form input focus glow ───────────────────── */
    document.querySelectorAll(".lusso-newsletter__input").forEach((input) => {
      input.addEventListener("focus", () => {
        gsap.to(input, { boxShadow: "0 0 0 3px rgba(24,71,240,0.15)", duration: 0.3 });
      });
      input.addEventListener("blur", () => {
        gsap.to(input, { boxShadow: "0 0 0 0px rgba(24,71,240,0)", duration: 0.3 });
      });
    });
  }

  /* ----------------------------------------------------------------
     Bootstrap: load GSAP then ScrollTrigger then init
  ---------------------------------------------------------------- */
  function bootstrap() {
    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      initLussoAnimations();
      return;
    }

    loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js",
      function () {
        loadScript(
          "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js",
          function () {
            initLussoAnimations();
          }
        );
      }
    );
  }

  /* Run on DOMContentLoaded or immediately if already loaded */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }

  /* Re-run after Odoo website builder saves / edits a snippet */
  document.addEventListener("website_builder_snippets_loaded", bootstrap);

})();
