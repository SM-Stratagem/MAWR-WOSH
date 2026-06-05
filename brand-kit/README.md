# WOSH — Brand Kit v1.0

> Direction: **Marine + Brutalist · Hero price-led**
> A premium, plain-spoken aesthetic. Big numerals carry the page. Single signature blue used sparingly.

This folder is the source of truth for the WOSH brand. Drop it into the repo and reference the tokens from any stylesheet. Do not invent new colors, sizes, or radii — extend the tokens instead.

## Files

| File              | What it is                                                         |
| ----------------- | ------------------------------------------------------------------ |
| `tokens.css`      | CSS custom properties + drop-in helper classes. Authoritative.     |
| `tokens.json`     | Same tokens as data, with usage notes. For tools / RN / codegen.   |
| `README.md`       | This file. Conventions + how to wire it up.                        |
| `../WOSH Brand Kit.html` | Visual reference — open in a browser to see everything live. |

## Quick start

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="./brand-kit/tokens.css">
```

```css
body {
  background: var(--wosh-bg);
  color: var(--wosh-ink);
  font-family: var(--wosh-font-ui);
  font-size: var(--wosh-fs-body);
  line-height: var(--wosh-lh-body);
}
```

## React Native

Tokens are framework-agnostic. For RN, generate a theme from `tokens.json`:

```ts
import tokens from "./brand-kit/tokens.json";
export const theme = {
  bg:     tokens.color.surface.bg.value,
  ink:    tokens.color.ink.ink.value,
  accent: tokens.color.accent.accent.value,
  // ...
};
```

## Conventions

### Color
- **One accent.** `--wosh-accent` is the only saturated color in the UI. Use it for the primary CTA, the live indicator, and nothing else by default.
- **Ink for emphasis, not black.** Headings and primary buttons are `--wosh-ink` (`#0e2236`) — never `#000`.
- **No gradients.** Marine reads as a flat, considered palette. Soft tints only via `--wosh-bg-soft` / `--wosh-accent-soft`.
- **Semantic colors are functional.** Don't decorate with `--wosh-good`/`warn`/`hot`; reserve them for status.

### Type
- **Space Grotesk** carries everything in the UI (display, body, controls).
- **IBM Plex Mono** is reserved for labels, codes, indices, and numerals where a metered feel is wanted (`№ 0042`, `EST. 12 MIN`, `FIG. 01`).
- **Hero numerals own the screen.** Prices, ETAs, totals — set them at `--wosh-fs-hero` (120px) with `line-height: 0.9`. Don't decorate them.
- **Mono labels are always UPPERCASE** with `0.14em` tracking. Use the `.wosh-label` helper.

### Layout (hero price-led pattern)
The home screen — and most "decision" screens — follow this structure:

```
┌─────────────────────────────┐
│ 01 / SELECT WASH            │  ← mono section index
│                             │
│ EXTERIOR ESSENTIAL          │  ← display title
│ Hand wash, wheels, dry.     │  ← body description
│                             │
│              AED  45        │  ← hero numeral, right-aligned
│                             │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │  ← dotted divider
│                             │
│ 02 / SCHEDULE               │  ← next section
└─────────────────────────────┘
```

Rules:
1. Every section gets a 2-digit mono index (`01`, `02`, …).
2. The price/number is the largest element on the screen.
3. Use dotted dividers (`.wosh-dotline`) between groups — receipt feel.
4. Primary CTA is pill-shaped, ink-filled, full-width, anchored to the bottom.

### Shape
- **Brutalist radii.** Default radius is `2px`. Cards `4px`. Sheets `12px`. Buttons are pills (`9999px`) — that's the one curve allowance.
- **1px hair-lines.** Borders are thin and real, not faked with shadows.
- **No drop shadows on cards.** Use `--wosh-sh-card` for a single 1px contact line. Soft shadows live only on sheets (`--wosh-sh-sheet`).

### Motion
- **120ms** for taps / state flips.
- **240ms** for sheet rises, screen transitions.
- **420ms** for the rare "look at this" moment (booking-confirmed flourish).
- Easing is `--wosh-ease-out`. No bounce, no spring.

### Voice
Plain-spoken. Confident. Editorial, not salesy. Lead with the number.

| Don't                                       | Do                                |
| ------------------------------------------- | --------------------------------- |
| "🚗 Hey there! Booking your awesome wash!"  | "Your washer is on the way."     |
| "Get your car sparkling clean ASAP!"        | "12 min · Marina Heights, Tw 2."  |
| "Woohoo, all done!! 🎉"                     | "Done. Looking sharp."            |

- No emoji.
- No exclamation marks.
- No "amazing", "game-changing", "seamless".

## Component shorthand

The helper classes in `tokens.css` cover the basics. Compose, don't override.

```html
<!-- A hero price block -->
<div>
  <span class="wosh-label">01 / EXTERIOR ESSENTIAL</span>
  <div class="wosh-hero" style="text-align: right;">AED 45</div>
</div>

<!-- Primary CTA -->
<button class="wosh-btn wosh-btn-primary">Confirm booking</button>

<!-- Accent CTA (live state) -->
<button class="wosh-btn wosh-btn-accent">Track live</button>

<!-- Status pill -->
<span class="wosh-pill" style="color: var(--wosh-accent);">LIVE · 4 MIN</span>

<!-- Receipt divider -->
<hr class="wosh-dotline">
```

## Don'ts (the short list)

- ❌ Don't introduce a second accent color.
- ❌ Don't use Inter, Roboto, or system-stack body fonts.
- ❌ Don't draw decorative SVG illustrations. Use captioned placeholders + real photography.
- ❌ Don't use emoji in product UI.
- ❌ Don't fake brutalism with thick black borders everywhere. The look is *quiet* brutalism.
- ❌ Don't replace hero numerals with icons "to save space". The number IS the design.

## Versioning

This is **v1.0**. Bumping rules:
- **Patch** (1.0.x): typo / clarification, no token values changed.
- **Minor** (1.x.0): new tokens added; nothing removed or renamed.
- **Major** (x.0.0): renames, removals, or palette shifts.

Update `$meta.version` in `tokens.json` whenever you ship a change.
