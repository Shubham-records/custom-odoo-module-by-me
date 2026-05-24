# Lusso Website Snippets — Odoo 19 Module

Premium furniture website snippets with GSAP animations, custom Google Fonts, and multiple themes.

---

## Installation

1. Copy the `lusso_website_snippets/` folder into your Odoo addons directory.
2. Restart Odoo: `./odoo-bin -u lusso_website_snippets`
3. Go to **Apps** → search `Lusso Website Snippets` → Install.

---

## Available Snippets

All snippets appear in **Website Builder → Blocks → Sinnepts – Lusso**.

### 🏠 Hero Sections
| Snippet | Theme | Description |
|---|---|---|
| `s_lusso_hero_light` | Light | "Sculpted Comfort for modern living" — white/grey |
| `s_lusso_hero_dark` | Dark | "Where Silence meets design" — charcoal noir |
| `s_lusso_hero_warm` | Warm | "Crafted for Warmth & soul" — cream/terracotta |
| `s_lusso_hero_forest` | Forest | "Born from Nature" — sage green sustainable |

### 🗂️ Collections
| Snippet | Theme |
|---|---|
| `s_lusso_collections_light` | 3-column grid, light |
| `s_lusso_collections_dark` | 4-column grid, dark |

### 🛒 Products
| Snippet | Description |
|---|---|
| `s_lusso_products_scroll` | Horizontal scroll with prev/next buttons |

### 🪚 Craftsmanship / Philosophy
| Snippet | Theme |
|---|---|
| `s_lusso_craft_light` | Split layout, light |
| `s_lusso_craft_dark` | Split layout, reversed, dark |

### 📊 Stats Banners
| Snippet | Theme |
|---|---|
| `s_lusso_stats_light` | 4-column, light |
| `s_lusso_stats_dark` | 4-column, dark |

### 💬 Testimonials
| Snippet | Description |
|---|---|
| `s_lusso_testimonials_light` | 3-column card grid |

### 📧 Newsletter
| Snippet | Theme |
|---|---|
| `s_lusso_newsletter_light` | Centered, light |
| `s_lusso_newsletter_dark` | Centered, dark |
| `s_lusso_newsletter_warm` | Split layout, warm |

### ✨ Effects
| Snippet | Description |
|---|---|
| `s_lusso_marquee` | Infinite scrolling ticker banner |

---

## Animations (GSAP)

All snippets use GSAP 3 + ScrollTrigger loaded from CDN:
- **`data-gsap="fade-up"`** — fade + slide up on scroll into view
- **`data-gsap="fade-left/right"`** — directional fades
- **`data-gsap="scale-in"`** — gentle scale entrance
- **`data-gsap="pop-in"`** — spring pop for tags/badges
- **Number counters** — stats count up when scrolled into view
- **Marquee** — infinite smooth ticker, speeds up on hover
- **Parallax** — subtle parallax on hero images
- **Card tilt** — mouse-follow 3D tilt on collection cards
- **Float** — gentle continuous float on product tags

---

## Fonts

- **Playfair Display** — headings/display text
- **DM Sans** — body text
- **Cormorant Garamond** — testimonial quotes

---

## Adding Your Own Images

Replace placeholders in `static/src/img/`:
```
hero-chair.png      → Hero light chair photo
hero-dark.png       → Hero dark chair photo
hero-warm.png       → Hero warm chair photo
hero-forest.png     → Hero forest chair photo
col-living.jpg      → Living room collection
col-dining.jpg      → Dining collection
col-workspace.jpg   → Workspace collection
col-bedroom.jpg     → Bedroom collection
craft-wood.jpg      → Wood detail photo
craft-hands.jpg     → Artisan hands photo
prod-1 to prod-5    → Product photos
newsletter-bg.jpg   → Newsletter split image
```

All images gracefully fall back to neutral CSS placeholders if missing.

---

## Theme Colors

| Theme | Background | Accent |
|---|---|---|
| Light | `#f4f3f0` | `#1847f0` (blue) |
| Dark | `#0e0e0c` | white |
| Warm | `#f5efe6` | `#c4622d` (terracotta) |
| Forest | `#e8ede6` | `#2d6a35` (green) |
