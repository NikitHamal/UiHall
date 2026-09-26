---
name: stormy-design
description: >-
  Design a mobile app screen or website page using a curated corpus of real
  interface work instead of inventing layouts from scratch. Use whenever the
  user asks to design, build, restyle, or critique an app screen, a mobile flow,
  a landing page, or a design system ("design an onboarding", "make this screen
  better", "what should a crypto wallet look like", "give me a palette for X",
  "critique this UI", "why does this look generic"). Also use when writing
  front-end code for an app or page, so the layout and colour decisions come
  from evidence rather than defaults. This is the entry point for any visual
  design work.
agent_created: true
---

# Stormy design

Design from **evidence, not taste**. There is a corpus of real interface work on this
machine — every item looked at and written up, every palette measured from pixels. Use it
before you open an empty canvas.

The failure this skill exists to prevent: an agent asked for "a finance app" produces a
blue gradient, a card, and a rounded button, because that is the average of everything it
has ever seen. The corpus exists to replace that average with a specific, defensible choice.

---

## The two surfaces

| Surface | What it is | When |
|---|---|---|
| **Stormy MCP** (`stormy-mcp/`) | Tools over the corpus: search, patterns, palettes, briefs | Whenever you can call tools — preferred |
| **UI Hall** (`ui-hall/index.html`) | The same corpus as a browsable gallery | When the user wants to look at things themselves |

If the MCP tools are available, use them. If not, the corpus is a plain JSON file you can
read, and the tooling below works without the server.

**Corpus location** resolves in this order: `$STORMY_CORPUS`, then
`<repo>/ui-hall/data/corpus.json`, then `<stormy-mcp>/corpus.json`.

---

## Workflow

### 1. Establish what you are actually designing

Before searching, be specific about the screen. Not "a fitness app" but:

- **What the screen is for** — onboarding, home, detail, checkout, empty state
- **Who it is for** — a teenager tracking runs and a 60-year-old managing medication
  want different things from the same screen
- **What the one job is** — every screen has a single primary action; name it
- **What the surface is** — dark, light, or undecided

If the user has not said, decide and state your decision in one line rather than asking.
`design_brief` accepts a screen description and returns examples, colours and patterns.

### 2. Look at real examples first

```
design_brief(screen="onboarding for a sleep tracking app", platform="ios", mood="calm")
```

Read the returned examples. If one is close, pull it up properly:

```
get_asset(id="IMG-0XXX", include_markdown=true)
asset_image(id="IMG-0XXX")
```

**Then actually open the image.** The description tells you what is there; only the image
tells you the proportions, the rhythm, and whether it looks good. This is the step agents
skip and it is the step that matters.

### 3. Steal structure, not skin

The most common mistake is copying a screen's *surface* — its gradient, its illustration —
onto a different product. Copy the **structure** instead:

- Which element is dominant, and how much bigger is it than the rest
- How many distinct levels of hierarchy exist (usually two; more is usually a mistake)
- Where the eye lands, second, third
- What is deliberately absent

`find_patterns(about="...")` names the recurring structures and explains why each works.
A pattern is a transferable technique; a screenshot is one instance of it.

### 4. Get colours from measurement

```
palette_for(mood="warm and quiet", surface="dark", category="health")
```

Every returned hex is measured from a real interface. Use them literally. The response
includes WCAG contrast ratios — a pair below 4.5:1 cannot carry body text, and the tool
tells you so rather than letting you find out in review.

If the user has brand colours, keep them and use the corpus for everything else: the
neutral ramp, the surface elevations, the accent-for-destructive, the muted text.

### 5. Build to a token set before writing markup

Commit to named values first. Then every later decision is a choice between existing
options rather than a new invention — which is the difference between a coherent screen and
a collection of reasonable local decisions.

```
--bg / --surface / --surface-2 / --line
--text / --text-2 / --text-3
--accent / --accent-ink
--radius / --space-unit
```

### 6. Check it against the corpus before declaring it done

Two questions that catch most problems:

- **If I put this in the gallery, would it look like it belongs?** Compare against three
  real examples in the same role. If it is thinner, flatter, or more generic, say so.
- **What did I copy that I should not have?** A layout that works for a two-word screen
  will not work for a twenty-word one.

---

## Critique mode

When asked to critique an existing interface, do not open with praise. Work in this order,
because this is the order in which problems actually affect users:

1. **Hierarchy** — is there a clear focal point? Can you name the second and third?
   Most bad screens have one level and call it minimal.
2. **Spacing rhythm** — are the gaps a system or a coincidence? Look for whether vertical
   spacing is drawn from a small set of values or has drifted.
3. **Contrast and colour discipline** — how many colours carry meaning? More than one
   accent plus neutrals is usually too many. Check text contrast properly.
4. **States** — what does this look like empty, loading, errored, with a long name in it,
   and on a small screen? A screen with only its happy path designed is half a screen.
5. **Affordance** — does anything interactive look interactive? Does anything
   non-interactive look like a button?

Name the specific fix for each problem. "The hierarchy is weak" is not useful; "the total
is the same size as the label above it — make the total 2.5× larger and drop the label to
70% opacity" is.

Pull a `compare_pair` when the user wants to see the problem rather than read about it.

---

## Honesty rules

These matter more than looking confident:

- **Never invent a colour and present it as measured.** If you chose it, say you chose it.
- **Never describe an asset you have not looked at.** The corpus descriptions are from
  someone actually viewing the file; do not extend them by inference.
- **If the corpus has nothing relevant, say so** and design from first principles. Then
  label it as such. A thin corpus is still usable; a fabricated citation is not.
- **Report low confidence.** Several assets were captured at low resolution or partially
  obscured. They carry a salvage note in `quality` — pass that caveat on rather than
  treating the record as authoritative.
- **Attribution.** Everything in the corpus belongs to the people who designed it. It is a
  study reference. Do not present a copied layout as original, and do not ship an
  interface that is a recognisable clone of a specific product.

---

## Tooling

`scripts/stormy.mjs` drives the corpus directly when the MCP is not connected:

```bash
NODE="C:/Users/Acer/.workbuddy-ai/binaries/node/versions/22.22.2-3/node.exe"

# what can the corpus speak to
"$NODE" scripts/stormy.mjs facets --limit 30

# search
"$NODE" scripts/stormy.mjs search "dark crypto wallet balance" --surface dark --limit 5

# the full write-up for one asset
"$NODE" scripts/stormy.mjs asset IMG-0055 --markdown

# a synthesised brief
"$NODE" scripts/stormy.mjs brief "onboarding for a sleep tracker" --platform ios

# palettes
"$NODE" scripts/stormy.mjs palette "warm and quiet" --surface dark

# comparison evidence
"$NODE" scripts/stormy.mjs compare "wallet"

# where the files are
"$NODE" scripts/stormy.mjs image IMG-0055
```

`scripts/corpus_stats.mjs` prints a summary of what the corpus contains and how much of it
is described, so you can state coverage honestly.

---

## Connecting the MCP

The server speaks stdio and needs no install:

```json
{
  "mcpServers": {
    "stormy": {
      "command": "C:/Users/Acer/.workbuddy-ai/binaries/node/versions/22.22.2-3/node.exe",
      "args": ["E:/Stormy/stormy-mcp/server.js"]
    }
  }
}
```

Verify it before relying on it:

```bash
"C:/Users/Acer/.workbuddy-ai/binaries/node/versions/22.22.2-3/node.exe" E:/Stormy/stormy-mcp/selftest.js
```

---

## Component recipes (hard rules — these bugs shipped in demo v1/v2)

Pills/chips/filters — the "All vs Money out" bug class:
- Fixed `height` (44px standard, 40px dense) + `min-width` (≥84px, ≥64px dense) +
  `display:inline-flex; align-items:center; justify-content:center; white-space:nowrap`.
- Content-sized pills without `min-width` turn short labels ("All") into circles.
- The row itself must handle overflow: `overflow-x:auto` + hidden scrollbar +
  `-webkit-overflow-scrolling:touch`. Never let the 3rd pill clip at the card edge.
- Test at 360px wide with the longest label before calling it done.

Bars/charts:
- Animate `height` once on range change (260–320ms, `cubic-bezier(0.2,0,0,1)`),
  then stay still. No looping, no stagger on every render.
- Day labels are never single letters alone — `Mon`/`Tue`, never `M`/`T`.

Controls must do what they claim:
- A filter that doesn't filter, a metric that drives an unrelated hero number,
  two controllers for one state (Start button + tabs stepping the same index) —
  all fail review. One state, one controller.
- Every number that changes uses tabular numerals (`font-variant-numeric: tabular-nums`).

## Checklist

- [ ] Screen defined: role, audience, the single primary action, surface
- [ ] `design_brief` (or `search`) run — real examples found, not imagined
- [ ] **Opened at least one example image**, not just read its description
- [ ] Structure identified and separated from surface
- [ ] Applicable patterns named, with why each works
- [ ] Palette is measured values or explicitly-authored ones, and labelled which
- [ ] Tokens committed before markup
- [ ] Contrast checked for every text-on-surface pair
- [ ] States designed: empty, loading, error, long content, small screen
- [ ] Compared against three corpus examples in the same role
- [ ] Honest note on what is borrowed, what is new, and what is uncertain
