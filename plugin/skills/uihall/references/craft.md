# Craft rules

Defaults distilled from the corpus. Break them on purpose, never by accident.

## Hierarchy
- One dominant element per screen, at least **2×** the visual weight of the next.
- One filled primary button per view. Secondary actions are ghost/outline or text.
- If everything is bold, nothing is: use weight *or* size *or* colour to rank, rarely all three.

## Type
- One family for UI; an optional second for display (≥ 28px only). Serif display + sans UI is
  the most reliable "premium" move in the corpus.
- Scale (px): 12 · 13 · 15 · 17 · 20 · 24 · 32 · 44 · 60 · 80. Body 15–17 on mobile, 16–18 on web.
- Tracking: tighten large type (−0.02 to −0.04em), loosen tiny caps (+0.06 to +0.1em).
- Line-height: 1.05–1.15 for display, 1.45–1.6 for body. Max ~70 characters per line.
- Tabular numerals for anything that updates or aligns (prices, stats, tables, timers).

## Spacing & layout
- 4px base, 8px rhythm: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96.
- Mobile gutters 16–20px; touch targets ≥ 44×44pt; primary CTA in the thumb zone.
- Group with space before you group with lines; group with lines before boxes.
- Radius is a system: pick 2–3 values (e.g. 8 / 14 / 24 / pill) and nest inner = outer − padding.

## Colour
- Take literal hex values from a measured reference palette. Roles: background, surface, text,
  muted, accent, on-accent, border.
- One accent carries every interactive element. Status colours (success/warn/error) are separate
  from the brand accent.
- Contrast: body text ≥ 4.5:1, large text and icons ≥ 3:1. Check every pair; fix with lightness,
  not by switching to pure black/white.
- Dark mode: background L≈0.15–0.2 (not #000), text ~#E8E8E8, elevation by lighter surfaces
  rather than shadows; desaturate the accent slightly.

## Motion
- Feedback 120–200ms, small transitions 200–300ms, spatial/page 400–600ms.
- Ease-out to enter (`cubic-bezier(.16,1,.3,1)`), ease-in to exit, springs for direct manipulation.
- Animate transform and opacity only. Stagger lists by 30–60ms, cap at ~8 items.
- Motion must explain something: where a thing came from, what changed, what to do next.
- Always honour `prefers-reduced-motion` with an opacity-only fallback.

## States (a screen isn't done without them)
- Empty: explains what will appear and offers one action.
- Loading: skeletons shaped like the content, not spinners, for anything > 300ms.
- Error: says what happened and how to fix it, next to where it happened.
- Also: disabled, focus-visible, pressed, selected, long text, zero/one/many items, offline.
