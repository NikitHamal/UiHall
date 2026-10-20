---
name: uihall
description: >-
  Design and build UI from real evidence instead of the generic average. Use whenever you
  design, build, restyle or critique any interface — an app screen, a mobile flow, a landing
  page, a dashboard, a component, a design system or a colour palette ("design an onboarding",
  "make this page look better", "what should a crypto wallet home look like", "pick colours
  for a calm health app", "why does this look generic", "build a pricing section"). Gives you
  850+ hand-described UI/UX references (100+ of them MIT-licensed originals built in code) with palettes measured from the pixels, a pattern library
  with build rules, palette-to-token export and contrast checks — through the UI Hall MCP
  server when connected, or a bundled zero-dependency CLI when not.
license: MIT
metadata:
  version: 2.1.0
  homepage: https://nikithamal.github.io/UiHall/
  repository: https://github.com/NikitHamal/UiHall
---

# UI Hall — design from evidence

Asked for "a finance app", an agent produces a blue gradient, a card and a rounded button,
because that is the average of everything it has seen. This skill replaces the average with
specific, real, *described* references — and makes you look at them before you write code.

UI Hall is a corpus of **850+ interfaces** — 750+ collected references and 100+ MIT-licensed originals built in code — (mobile screens, websites, dashboards, motion
clips, design systems, redesigns). Every item was looked at and written up by hand and
re-audited against the pixels; every palette is k-means over the real image with area
percentages; every video's motion was measured.

## Tools: MCP first, CLI as fallback

If the **`uihall` MCP server** is connected, use its tools (names below). If it isn't, run the
bundled CLI — same engine, same output:

```bash
node scripts/uihall.mjs <command> [args]      # path relative to this skill folder; Node 18+
```

| Need | MCP tool | CLI |
|---|---|---|
| Start any screen | `design_brief(screen, platform?, mood?, surface?)` | `brief "<screen>" --platform ios --mood calm` |
| Find references | `search_designs(query, role?, style?, tag?, surface?, hue?, include_images?)` | `search "<query>" --role onboarding --surface dark` |
| Full write-up + colour roles | `get_design(id)` | `get IMG-0468` |
| **See** references | `view_design(ids)` | `image IMG-0468 VID-0221` → open the printed files |
| Branch out | `find_similar(id, by?)` | `similar IMG-0468 --by palette` |
| Structural patterns | `find_patterns(about?)` | `patterns "dashboard"` |
| Palette for a mood | `palette_for(mood, query?, surface?)` | `palette --mood calm --query wellness` |
| Who uses this colour | `search_by_color(hex)` | `color "#C6F432"` |
| Tokens for code | `export_tokens(id \| colors, format)` | `tokens IMG-0365 --format tailwind` |
| Choose between directions | `compare_designs(ids, include_images?)` | `compare IMG-0432 IMG-0433` |
| Whole starter system | `generate_design_system(id \| colors, mood?)` | `system IMG-0365 --mood editorial` |
| Accessibility | `check_contrast(fg, bg)` | `contrast "#888" "#fff"` |
| Redesign evidence | `before_after(topic?)` | `before-after wallet` |
| Vocabulary | `corpus_overview()` | `overview --tags` |

The CLI and server fetch the corpus once from the public site and cache it in
`~/.cache/uihall` (or read a local checkout via `UIHALL_ROOT`). No API key.

## Workflow

### 1. Pin down the screen (10 seconds, no questions needed)

Decide and state in one line: **what the screen is for** (onboarding, home, checkout…),
**who uses it**, **the one primary action**, **platform**, **surface** (dark/light). If the user
didn't say, choose sensibly and say what you chose.

### 2. Get a brief

```
design_brief(screen="onboarding for a sleep tracking app", platform="ios", mood="calm")
```

You get the closest references, motion references, the patterns that apply (with build rules),
three measured palettes split into UI roles with WCAG contrast, role-specific do/avoid
guidance, and a done-checklist.

### 3. Look before you build — this is the step agents skip

Call `view_design` on the **2–3 closest references** (or `image` with the CLI and open the
files). The description tells you what is there; only the image tells you proportion, rhythm,
density and polish. For each one, write one line: *what structure am I taking from it?*

### 4. Steal structure, not skin

Take: the hierarchy (what's dominant, by how much), the layout skeleton, the spacing rhythm,
the number of things on screen, where the primary action lives, how state is shown.
Don't take: their illustration, their brand colour on a different product, their copy.
Cite the reference ids in a comment at the top of the component.

### 5. Colour from measurement

Pick one palette from the brief (or `palette_for`). Use the **literal hex values** — they are
measured, not guessed. Run `export_tokens(id, format)` in the format the codebase uses
(`css`, `tailwind`, `dtcg`, `swiftui`, `compose`) — or, for a new project with no system yet,
`generate_design_system(id)` for colour, type, radius, motion and base components in one CSS file. Run `check_contrast` on every text/background
pair; if a measured accent fails as text, use the nudged value the tool suggests.

### 6. Build, then finish

Build with the craft rules in [references/craft.md](references/craft.md). Before you say
done, walk the brief's checklist honestly — including empty, loading and error states.

## Critiquing an existing UI

1. `search_designs` for the same kind of screen; `view_design` the best three.
2. `before_after(topic)` to see what redesigns typically fix.
3. Report the **three highest-impact changes first** (hierarchy, primary action, density,
   colour/contrast, type), each tied to a reference id, with concrete values (sizes, hex,
   spacing). Then polish notes. Rubric: [references/critique.md](references/critique.md).

## Originals

Assets with ids `ORG-…` are MIT-licensed screens built in code for UI Hall. `get_design` returns their `live_url`:
the actual HTML, interactive, in four themes (`?theme=ember|mint|ink|grape`). Prefer them when you need markup
you can legitimately adapt; filter with `search_designs(source="original")`.

## Rules

- **Never invent a reference id or a palette.** If a tool didn't return it, it doesn't exist.
- **Prefer 3 well-chosen references over 10 skimmed ones.**
- **Measured beats remembered.** When the corpus has a value, use it over your intuition.
- **Ask the corpus, not the user**, for things it can answer (what's conventional, what colours
  work for a mood). Ask the user only for facts you can't know (brand, audience, content).
- References are for learning the vocabulary. Never ship a clone of a specific product.

## Network and privacy

The CLI and the MCP server make exactly two kinds of request, both plain HTTPS GETs to the public
site `https://nikithamal.github.io/UiHall/`: the corpus file (`data/corpus.json`, cached
for 24 h in `~/.cache/uihall`) and, only when you ask to view a reference, that image. Nothing about
your project, prompts or code is sent anywhere. No API key, no telemetry. Set `UIHALL_ROOT` to a
local checkout to make no requests at all.

## More

- [references/patterns.md](references/patterns.md) — the pattern library with build rules and evidence ids
- [references/craft.md](references/craft.md) — type, spacing, colour, motion and state rules
- [references/critique.md](references/critique.md) — critique rubric and output format
- Browse the corpus yourself: https://nikithamal.github.io/UiHall/
