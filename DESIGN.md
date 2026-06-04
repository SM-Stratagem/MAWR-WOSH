# Design System: WOSH Identity

## 1. Direction & North Star

**Marine + Brutalist · Hero price-led**

Premium car wash, at your door — without the theatre.

The design language is direct, restrained, and typographically bold. Numbers carry the page. Photography is single-subject and daylight. Copy is short, plain-spoken, and wry. The UI feels like a well-made paper docket — clean, functional, no decoration.

## 2. Colors — Marine Palette

### Surface Hierarchy
| Token | Value | Use |
|-------|-------|-----|
| `bg` | `#dfe9e3` | Page background. Cool pale celadon. |
| `bg-soft` | `#d4e0d8` | Card / chip background. |
| `bg-deep` | `#c1d2c7` | Pressed / hovered surface. |
| `paper` | `#f3f7f4` | Sheets, modals, elevated layer. |

### Ink (Text & Fill)
| Token | Value | Use |
|-------|-------|-----|
| `ink` | `#0e2236` | Primary text. Also primary fill for buttons & emphasis. |
| `ink-soft` | `#4a5e6f` | Secondary text. |
| `ink-dim` | `#7d8d99` | Tertiary text, placeholders. |
| `line` | `#b2c3b8` | Default 1px border / divider. |
| `line-soft` | `#c8d4cc` | Subtle divider, dotted rules. |

### Accent — Signature Blue
| Token | Value | Use |
|-------|-------|-----|
| `accent` | `#1976ff` | Primary action. Live state. Single signature color — use sparingly. |
| `accent-deep` | `#0c52c2` | Pressed / dark variant. |
| `accent-soft` | `#cfe0ff` | Tinted backgrounds for highlights. |

### Semantic
| Token | Value | Use |
|-------|-------|-----|
| `good` | `#1a8459` | Success, completed, savings. |
| `warn` | `#c8841a` | Warning, awaiting action. |
| `hot` | `#d94545` | Danger, canceled, rejection. |

### On-Color (text/icons on fills)
| Token | Value |
|-------|-------|
| `on-ink` | `#f3f7f4` |
| `on-accent` | `#ffffff` |

## 3. Typography

### Font Families
- **Display & UI:** Space Grotesk (400, 500, 700) — tight, blocky, brutalist feel.
- **Mono Labels:** IBM Plex Mono (400, 500) — codes, labels, indexed numerals.

### Type Scale (fixed, mobile-first)
| Level | Size | Line | Weight | Tracking | Use |
|-------|------|------|--------|----------|-----|
| `hero` | 120px | 0.9 | 700 | -0.03em | Home-screen price numeral, splash totals. |
| `display` | 42px | 1.05 | 700 | -0.01em | Screen titles. |
| `h1` | 28px | 1.1 | 700 | — | Secondary heads. |
| `h2` | 22px | 1.15 | 500 | — | Card titles. |
| `body` | 15px | 1.45 | 400 | — | Body text. |
| `sm` | 13px | 1.4 | 400 | — | Secondary body. |
| `label` | 10px | 1.2 | 500 | 0.14em | Mono labels — always UPPERCASE. |

## 4. Space, Shape & Motion

### Spacing (4pt grid)
`4px · 8px · 12px · 16px · 20px · 24px · 32px · 48px · 64px`

### Radii — Brutalist
| Token | Value | Use |
|-------|-------|-----|
| `sq` | 2px | Default — chips, badges, cards. |
| `card` | 4px | Cards, inputs. |
| `sheet` | 12px | Sheets, modals. |
| `pill` | 9999px | Buttons, pills. |

### Borders
| Token | Value |
|-------|-------|
| `hair` | 1px |
| `rule` | 1.5px (default control border) |
| `bold` | 2px (emphasized) |

### Shadows — Minimal, No Soft Glows
| Token | Value |
|-------|-------|
| `card` | `0 1px 0 rgba(14,34,54,0.04)` |
| `sheet` | `0 -2px 0 rgba(14,34,54,0.04), 0 24px 40px -20px rgba(14,34,54,0.25)` |
| `focus` | `0 0 0 3px rgba(25,118,255,0.25)` |

### Motion
| Token | Value |
|-------|-------|
| `ease-out` | `cubic-bezier(0.2, 0.7, 0.2, 1)` |
| `fast` | 120ms |
| `base` | 240ms |
| `slow` | 420ms |

## 5. Components

### Buttons
- **Primary:** `ink` bg, `on-ink` text. Pill radius. For Confirm, Continue.
- **Accent:** `accent` bg, `on-accent` text. For live-tracking, subscription opt-in.
- **Ghost:** Transparent bg, `ink` text, `1.5px line` border. For secondary actions, dismiss.
- Padding: 14px 20px. Disabled state uses `line` bg + `ink-dim` text.

### Cards
- `bg-soft` background, `1px line` border, `4px` radius, `20px` padding.

### Status Pills
- Mono font, 9px, UPPERCASE, 0.14em tracking. `1px currentColor` border, `2px` radius. Uses `currentColor` — set color on the element.

### Inputs
- `paper` background, `1.5px line` border, `4px` radius, `12px 14px` padding.
- Focus: `accent` border + `focus` shadow.

### Dotted Dividers
- Use dotted lines between groups in summaries and receipts to evoke a paper docket.

## 6. Patterns & Voice

### UI Patterns
- **Labels:** Mono labels are always UPPERCASE with 0.14em tracking. Pair every section heading with a 2-digit index (01, 02, ...) and an optional right-aligned hint.
- **Numerals:** Hero, total, ETA, count → always set in display weight at the largest scale that fits. Numbers carry the page.
- **Receipt:** Use dotted dividers between groups in summaries and receipts.
- **Imagery:** Photography is direct, single-subject, daylight or magic-hour. Caption every figure: FIG. 01 — VELAR, NIGHT WASH. Never decorative SVG illustrations.
- **Icons:** Avoid icon-led UI. Prefer mono single-letter glyphs in tabs (B, O, G, M). Use line-only icons where unavoidable; never duotone.

### Voice
- **Tone:** Plain-spoken, confident, minimal, wry.
- **Do:** Use short verbs (Wash · Book · Track). Lead with the number (price, ETA, count). Set context with mono labels.
- **Don't:** No emoji. No exclamation. No adjectives. No "ASAP", "amazing", "game-changing".
- **Good:** "Your washer is on the way." · "12 min · Marina Heights, Tower 2." · "Done. Looking sharp."
- **Avoid:** "Hey there! Your awesome washer is zooming over!"

## 7. Do's and Don'ts

### Do
- Use whitespace as a separator. Prefer extra padding over borders.
- Use mono labels with section indices for structured information.
- Let numbers dominate — hero pricing should be the largest element on screen.
- Use the single accent blue sparingly for actions and live states.

### Don't
- Don't use icon-led UI. Prefer single-letter glyphs and text.
- Don't use decorative SVG illustrations. Use direct photography.
- Don't exclaim, use emoji, or pad copy with adjectives.
- Don't use purple — the accent is blue (`#1976ff`). The brand is marine, not electric.
