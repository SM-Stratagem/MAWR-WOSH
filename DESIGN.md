# Design System Document: The Midnight Velocity Identity

## 1. Overview & Creative North Star
**The Creative North Star: "Obsidian Fluidity"**

To design for a premium car wash booking experience, we must move beyond the "utility app" aesthetic. We are not just building a scheduling tool; we are creating a digital concierge that mirrors the gloss, depth, and precision of a high-end automotive finish. 

This design system rejects the "boxed-in" layout of standard SaaS templates. Instead, it embraces **Obsidian Fluidity**: a philosophy where deep, ink-like backgrounds (`surface`) meet vibrant, liquid-light accents (`primary`). We break the grid through intentional asymmetry—letting high-end typography breathe in vast negative space—and using overlapping elements to create a sense of forward motion.

## 2. Colors & Tonal Depth

### The "No-Line" Rule
Standard UI relies on borders to separate content. In this system, **1px solid borders are strictly prohibited for sectioning.** We define boundaries through "Tonal Carving." 
*   **Implementation:** Separate a booking summary from the main feed by shifting the background from `surface` (#0e0e0e) to `surface-container-low` (#131313). This creates a sophisticated, architectural feel rather than a cluttered, "boxed" appearance.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of premium materials.
*   **Base:** `surface` (#0e0e0e) for global backgrounds.
*   **Secondary Layers:** `surface-container` (#1a1919) for large content blocks.
*   **Elevated Components:** `surface-container-highest` (#262626) for active cards or interactive modules.
*   **Nesting Logic:** Always move "up" in luminance as you nest. An input field sitting inside a `surface-container` card should use `surface-container-highest` to create a "recessed" or "cut-out" effect.

### The "Glass & Gradient" Rule
To capture the "vibrant purple" requirement with professional polish:
*   **Signature Textures:** For Hero CTAs and high-impact moments, use a linear gradient transitioning from `primary` (#cc97ff) to `primary-dim` (#9c48ea) at a 135-degree angle.
*   **Glassmorphism:** Floating navigation bars or modal overlays must use a semi-transparent `surface-container` with a `20px` backdrop-blur. This allows the neon purple accents to "glow" through the frosted glass as the user scrolls.

## 3. Typography: The Editorial Edge

The system utilizes two distinct families to balance technical precision with luxury editorial flair.

*   **Display & Headlines (Manrope):** This geometric sans-serif serves as our "brand voice." Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) for service titles. The wide apertures of Manrope feel modern and high-velocity.
*   **Body & Labels (Inter):** The workhorse. Inter provides maximum legibility for booking details, prices, and timestamps. Use `body-md` (0.875rem) for most secondary information to maintain a "clean" and airy feel.

**Typography Hierarchy Note:** Use `on-surface-variant` (#adaaaa) for sub-headers and "label-sm" to create a high-contrast hierarchy against the `primary` purple titles. This ensures the eye is drawn to the most important "action" words immediately.

## 4. Elevation & Depth

### The Layering Principle
Forget shadows; use light. Depth is achieved by "stacking" surface tiers.
*   **Static Depth:** Use the shift from `surface-container-lowest` to `surface-container-high`.
*   **Interaction Lift:** When a user interacts with a "Wash Package" card, do not just add a shadow; transition the background color to `surface-bright` (#2c2c2c) to simulate light hitting a polished surface.

### Ambient Shadows
If a floating effect is required (e.g., a "Book Now" floating button):
*   **Specification:** `0px 20px 40px rgba(132, 44, 211, 0.12)`. 
*   **Color Note:** Shadows are never black. They are a deeply desaturated version of the `primary` or `primary-dim` token to mimic the way purple neon light reflects off a black car's paint.

### The "Ghost Border" Fallback
In rare cases where contrast is required for accessibility:
*   **Rule:** Use `outline-variant` (#494847) at **15% opacity**. It should be felt, not seen.

## 5. Components

### Buttons: High-Gloss Actions
*   **Primary:** A solid `primary` (#cc97ff) fill with `on-primary` (#47007c) text. Use the `full` (9999px) roundedness for a "pill" shape that feels aerodynamic.
*   **Secondary:** No fill. A "Ghost Border" (15% `outline-variant`) with `primary` colored text.
*   **States:** On hover, apply a `primary-container` (#c284ff) inner glow.

### Cards: The "Package" Display
*   **Structure:** No dividers. Use `xl` (1.5rem) corner radius.
*   **Layout:** Use asymmetrical padding (e.g., 24px top, 32px bottom) to create a custom, editorial rhythm.
*   **Content:** Place the price in `headline-sm` (Manrope) in the top right, utilizing the `primary` token to make it pop against the `surface-container` background.

### Input Fields: Recessed Luxury
*   **Styling:** Fill with `surface-container-highest` (#262626). No border.
*   **Active State:** Instead of a border, use a 2px bottom-stroke of `primary` (#cc97ff) and a subtle inner shadow to make the field feel "carved" into the interface.

### Specialized Component: The "Gloss Slider"
For selecting car size or wash intensity:
*   Use a thick track (`surface-container-high`) with a `primary` thumb that has a 4px `on-primary` stroke. When sliding, the track behind the thumb should "glow" with a `primary` gradient.

## 6. Do's and Don'ts

### Do:
*   **DO** use whitespace as a separator. If you feel the need for a line, add 16px of extra padding instead.
*   **DO** use `tertiary` (#ff97b2) sparingly for "Hot Deals" or "Limited Availability" to provide a sophisticated "warm" counter-point to the purple.
*   **DO** ensure all icons use a "Duotone" style—one part `primary`, one part `on-surface-variant`.

### Don't:
*   **DON'T** use pure white (#ffffff) for large blocks of text. Use `on-surface-variant` (#adaaaa) for long-form reading to prevent "eye-bleed" on deep black backgrounds.
*   **DON'T** use sharp corners. The minimum radius is `md` (0.75rem) to maintain the "sleek/liquid" feel.
*   **DON'T** use standard "Material Design" shadows. They are too muddy for this high-end aesthetic. Stick to Tonal Layering.