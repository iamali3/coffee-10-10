# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Caffee 10:10 Red
**Generated:** 2026-10-07 16:17:29
**Category:** Digital Signage / Kiosk
**Design Dials:** Variance 7/10 (Balanced / Modern) | Motion 4/10 (Standard) | Density 6/10 (Standard)

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#E51F2A` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#28696A` | `--color-secondary` |
| Accent/CTA | `#C91521` | `--color-accent` |
| Background | `#050505` | `--color-background` |
| Foreground | `#F7F4F2` | `--color-foreground` |
| Muted | `#18181A` | `--color-muted` |
| Border | `rgba(255,255,255,0.10)` | `--color-border` |
| Destructive | `#EF4444` | `--color-destructive` |
| Ring | `#FF6268` | `--color-ring` |

**Color Notes:** Official-logo red on cinematic charcoal. Muted teal is reserved for small identity details inherited from the supplied logo, never as the main CTA.

### Typography

- **Heading Font:** Alexandria 700/800
- **Body Font:** Alexandria 400/500/600
- **Utility / Prices:** Barlow Condensed 700/800
- **Mood:** bold, modern, bilingual, energetic, night lounge
- **Google Fonts:** [Alexandria + Barlow Condensed](https://fonts.googleapis.com/css2?family=Alexandria:wght@400;500;600;700;800&family=Barlow+Condensed:wght@600;700;800&display=swap)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@400;500;600;700;800&family=Barlow+Condensed:wght@600;700;800&display=swap');
```

### Spacing Variables

*Density: 6/10 — Standard*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #CA8A04;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #1E1B4B;
  border: 2px solid #1E1B4B;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #0F0F23;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #1E1B4B;
  outline: none;
  box-shadow: 0 0 0 3px #1E1B4B20;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Cinematic Dark / OLED

**Keywords:** charcoal, red illumination, low-light legibility, crisp surfaces, restrained atmosphere

**Best For:** A late-night hookah lounge menu scanned from tables in low-light conditions

**Key Effects:** subtle red ambient light, charcoal texture, strong contrast, 150–250ms press feedback

### Page Pattern

**Pattern Name:** Mobile-first visual menu

- **Conversion Strategy:** Reach a product and its price in as few taps as possible.
- **CTA Placement:** View Menu primary; WhatsApp secondary.
- **Section Order:** 1. Brand/clock hero, 2. Signatures, 3. Search and category filters, 4. Complete menu, 5. Contact/install.

---

## Motion

**Stagger List** (Standard) — Trigger: load or scroll | Duration: 300-450ms | Easing: `back.out(1.4)`

```js
gsap.from('.grid-item', { opacity: 0, scale: 0.92, y: 16, duration: 0.4, stagger: { each: 0.06, from: 'start', grid: 'auto' }, ease: 'back.out(1.4)' });
```

**Framework notes:** grid: 'auto' lets GSAP infer rows/columns from a CSS grid layout for a natural wave stagger

- ✅ Combine with from: 'center' for a bento-grid layout to draw the eye inward first
- ❌ Don't use back.out on dense data tables; the overshoot reads as sloppy on informational UI
- ⚡ Group DOM writes; avoid interleaving layout reads (getBoundingClientRect) between staggered tweens

---

## Anti-Patterns (Do NOT Use)

- ❌ Flat design without depth
- ❌ Text-heavy pages

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
