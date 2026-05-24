# Odoo Snippets Reference Guide

This reference file contains templates, styles, and logic for premium Odoo website snippets. Use these as a basis for creating high-end, dynamic website components.

---

## 1. Premium Glassmorphism Hero Section

### A. XML Template (`views/snippets.xml`)
This template defines the structure of the hero section.

```xml
<template id="s_glass_hero" name="Glassmorphism Hero">
    <section class="s_glass_hero_section d-flex align-items-center justify-content-center py-5">
        <div class="container py-5">
            <div class="glass-card p-5 text-center">
                <h1 class="display-3 mb-4 fw-bold text-white">Experience Innovation</h1>
                <p class="lead mb-5 text-white-50">Discover the future of digital experiences with our high-end solution tailored for your brand.</p>
                <div class="d-flex justify-content-center gap-3">
                    <a href="#" class="btn btn-primary btn-lg px-5 rounded-pill glass-btn">Get Started</a>
                    <a href="#" class="btn btn-outline-light btn-lg px-5 rounded-pill">Learn More</a>
                </div>
            </div>
        </div>
    </section>
</template>

<!-- Add to Snippet Selector -->
<xpath expr="//snippets[@id='snippet_structure']" position="inside">
    <t t-snippet="lusso_website_snippets.s_glass_hero" t-thumbnail="/lusso_website_snippets/static/src/img/thumbnails/glass_hero.png"/>
</xpath>
```

### B. CSS Styles (`static/src/css/lusso_snippets.css`)
```css
.s_glass_hero_section {
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    min-height: 80vh;
    background-size: 400% 400%;
    animation: gradientBG 15s ease infinite;
}

@keyframes gradientBG {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}

.glass-card {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 30px;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

.glass-btn {
    background: rgba(var(--primary-rgb), 0.8) !important;
    border: none;
    backdrop-filter: blur(5px);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.glass-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}
```

### C. JS Logic (`static/src/js/lusso_snippets.js`)
```javascript
/** @odoo-module **/
import publicWidget from "@web/legacy/js/public/public_widget";

publicWidget.registry.GlassHeroSnippet = publicWidget.Widget.extend({
    selector: '.s_glass_hero_section',
    
    start: function () {
        this._super.apply(this, arguments);
        this._initGSAP();
    },

    _initGSAP: function() {
        if (typeof gsap !== 'undefined') {
            gsap.from(this.$el.find('.glass-card'), {
                duration: 1.5,
                y: 50,
                opacity: 0,
                ease: "power4.out",
                delay: 0.5
            });
            
            gsap.from(this.$el.find('h1, p, .btn'), {
                duration: 1,
                y: 30,
                opacity: 0,
                stagger: 0.2,
                ease: "power3.out",
                delay: 1
            });
        }
    }
});
```

---

## 2. Interactive Feature Grid

### A. XML Template
```xml
<template id="s_feature_grid" name="Premium Feature Grid">
    <section class="s_feature_grid_section py-5">
        <div class="container">
            <div class="row g-4">
                <div class="col-md-4 feature-item">
                    <div class="feature-card p-4 h-100">
                        <div class="icon-box mb-3 mb-4">
                            <i class="fa fa-bolt fa-3x text-primary"></i>
                        </div>
                        <h3>Lightning Fast</h3>
                        <p>Optimized for speed and performance to ensure a smooth user experience.</p>
                    </div>
                </div>
                <!-- Repeat for other columns -->
            </div>
        </div>
    </section>
</template>
```

### B. CSS Styles
```css
.feature-card {
    background: #ffffff;
    border: 1px solid #f0f0f0;
    border-radius: 20px;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.feature-card:hover {
    transform: translateY(-10px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    border-color: var(--primary);
}

.icon-box {
    transition: transform 0.3s ease;
}

.feature-card:hover .icon-box {
    transform: scale(1.1) rotate(5deg);
}
```

---

## 3. High-End Stats Counter

### A. XML Template
```xml
<template id="s_stats_counter" name="Animated Stats">
    <section class="s_stats_counter_section py-5 bg-dark text-white">
        <div class="container">
            <div class="row text-center">
                <div class="col-md-3">
                    <div class="stat-item">
                        <span class="counter h1 fw-bold" data-target="99">0</span><span class="h1 fw-bold">%</span>
                        <p class="text-muted">Customer Satisfaction</p>
                    </div>
                </div>
                <!-- Repeat for more stats -->
            </div>
        </div>
    </section>
</template>
```

### B. JS Logic
```javascript
publicWidget.registry.StatsCounter = publicWidget.Widget.extend({
    selector: '.s_stats_counter_section',
    
    start: function () {
        this._super.apply(this, arguments);
        this._initCounters();
    },

    _initCounters: function() {
        const counters = this.$el.find('.counter');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if(entry.isIntersecting) {
                    this._animateCounter(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        counters.each((i, el) => observer.observe(el));
    },

    _animateCounter: function(el) {
        const target = parseInt(el.getAttribute('data-target'));
        let count = 0;
        const increment = target / 50;
        const update = () => {
            if(count < target) {
                count += increment;
                el.innerText = Math.ceil(count);
                setTimeout(update, 20);
            } else {
                el.innerText = target;
            }
        };
        update();
    }
});
```

---

## 4. Manifest Update (`__manifest__.py`)

Ensure your manifest includes the new assets and views:

```python
{
    'name': 'Lusso Website Snippets',
    'version': '1.0',
    'depends': ['website'],
    'data': [
        'views/snippets.xml',
    ],
    'assets': {
        'web.assets_frontend': [
            'lusso_website_snippets/static/src/css/lusso_snippets.css',
            'lusso_website_snippets/static/src/js/lusso_snippets.js',
            # Add GSAP if needed
            'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js',
        ],
    },
}
```
