# Stormy

A design reference you can point an agent at.

Stormy is a curated corpus of mobile and web interface design — screenshots, mockups, brand
work, store panels, motion clips — where **every item was looked at and written up**, and
**every colour was measured from the pixels**. It ships as two things that share one corpus:

- **`ui-hall/`** — a browsable, filterable gallery (vanilla HTML/CSS/JS, no build step)
- **`stormy-mcp/`** — an MCP server that exposes the corpus as design tools to an agent
- **`skills/stormy-design/`** — the skill that tells an agent how to use them well

---

## Why this exists

An agent asked to "design a finance app" produces a blue gradient, a card and a rounded
button, because that is the average of everything it has seen. The fix is not a better
prompt — it is giving the agent specific, real, and *described* examples to reason from.

That is what the corpus is. It is not a scraped image dump. Each asset carries:

| Field | How it was produced |
|---|---|
| `description` | Read from the actual image, by looking at it |
| `category`, `type`, `roles`, `style`, `tags` | Assigned against a shared taxonomy |
| `palette_detail` | k-means over the real pixels, with area percentages |
| `quality` | An honest note when the capture is cropped or low-res |
| `motion` | Measured frame-to-frame change, so "is this a motion study" is answered, not assumed |

---

## Layout

```
Stormy/
├── ui-hall/
│   ├── index.html              the app shell — open this directly, it works
│   ├── assets/css/             tokens.css (design system) + app.css
│   ├── assets/js/              8 modules: data, util, listbox, filters, patterns, render, pages, app
│   ├── assets/fonts/           Inter Variable (SIL OFL 1.1) + its licence
│   ├── assets/img/             306 full-size webp derivatives
│   ├── assets/thumb/           grid thumbnails
│   ├── assets/vid/             posters (.webp) + motion clips (.webm)
│   └── data/corpus.json        ← the single source of truth
│       data/corpus.js          generated twin, so file:// also works
├── stormy-mcp/
│   ├── server.js               stdio JSON-RPC, zero dependencies
│   ├── tools.js                the ten design tools
│   ├── taxonomy.json           the shared vocabulary
│   ├── selftest.js             69 protocol-level assertions
│   └── corpus.json             (symlink or copy — built at release)
├── skills/stormy-design/
│   ├── SKILL.md                the workflow
│   └── scripts/                stormy.mjs, corpus_stats.mjs — work without the MCP
├── tools/                      the build pipeline (Python) + the browser harnesses (Node)
└── _work/                      intermediates: contact sheets, triage, reports, shots
```

---

## The review loop

Describing 483 assets by hand is the slow part, so it is a loop with a check at each step
rather than one long pass. The point of the tooling is that the *source files* stay correct
and the taxonomy stays closed — a tag that exists for exactly one asset is noise in the facet
list, so unknown tags are dropped and reported rather than quietly kept.

```bash
# 1. build contact sheets from the PROCESSED images, so a description written
#    off a sheet matches what the site actually shows
python3 tools/review_sheets.py --category brand-identity      # or no flag for all undescribed
python3 tools/remaining.py                                    # which sheets still have gaps

# 2. write _work/meta/descriptions/<batch>.json, then check it against the vocabulary
python3 tools/normalise_batch.py _work/meta/descriptions/mobile-ui-10.json
#    -> reports tags that belong in style/roles, and genuine vocabulary gaps
python3 tools/taxonomy_add.py --apply        # register concepts nothing existing covers
python3 tools/normalise_batch.py _work/meta/descriptions/mobile-ui-10.json --apply

# 3. rebuild and check coverage
python3 tools/build_corpus.py                # must print 0 warnings
python3 tools/coverage.py                    # per-category description coverage
```

Note that `review_sheets.py` names its output by category. An earlier version wrote a bare
`review_NN.jpg`, so a second run for another category silently overwrote the first run's
sheets *and* its `mapping.json`.

---

## The interface itself

UI Hall is the first thing built with the Stormy skill rather than just the thing that
holds the corpus. It is a design catalogue, so its own chrome is a claim about taste.

**Type.** Inter Variable, self-hosted (`assets/fonts/InterVariable.woff2`, 352 KB, SIL OFL
1.1). One file carries the whole 100–900 weight range and an optical-size axis, replacing
nine static faces. `font-optical-sizing: auto` lets the display sizes take the tighter cut
automatically, and tracking is set per size rather than once for the page — large type needs
negative tracking, small type needs a little positive. The fallback stack includes Noto Sans
and Nirmala UI because the corpus contains some Devanagari, which Inter does not cover.

**Controls.** Every widget is custom, because a native one cannot be styled:

| Control | Why it is custom |
|---|---|
| Sort dropdown | A `<select>` popup is drawn by the OS and is unstylable. Replaced with an ARIA listbox — full keyboard support, type-ahead, `aria-activedescendant`, Escape to close, focus return. See `assets/js/listbox.js`. |
| Size slider | Only the track and thumb are replaced (`::-webkit-slider-*`, `::-moz-range-*`); the native input stays so keyboard and screen readers are untouched. |
| Chips, segmented controls, buttons | Already custom; now with consistent hover, press and focus states. |

The listbox is progressive enhancement: the real `<select>` stays in the DOM as the value
and event source, so `el.value` and `change` listeners keep working. Existing code did not
change.

**Details.** One `:focus-visible` ring from a single token, tabular numerals on every count
so figures stop jittering, a themed scrollbar, a `::selection` colour, and a card-shaped
loading skeleton so the first paint is never a bare grid. All motion respects
`prefers-reduced-motion`.

---

## Building the corpus from scratch

The pipeline is inspectable at every step, and re-runnable. It starts from a folder of
collected files and ends at `corpus.json`.

```bash
# # 1. inventory every image and video, assign stable IDs
python3 tools/inventory.py

# 2. build labelled contact sheets so everything can be reviewed visually
python3 tools/make_sheets.py images 4 4
python3 tools/make_sheets.py posters 4 4

# 3. triage: record which items carry design value, and drop exact duplicates
python3 tools/triage.py
python3 tools/dedup.py

# 4. extract a poster frame + strip from every video
python3 tools/extract_vid_frames.py

# 5. measure how much each video actually moves
python3 tools/motion_probe.py

# 6. encode web derivatives: webp images, webm clips, thumbnails
python3 tools/encode_assets.py all

# 7. merge measured data + hand-written reviews into the corpus
#    Printed palettes are folded in by this step itself, from
#    _work/meta/printed_palettes.json — running a separate script here would be
#    lost the next time this file runs.
python3 tools/build_corpus.py

# 8. refresh the home page's live MCP samples (real tool outputs, embedded)
node tools/build_showcase.mjs
```

## Verifying it

Both harnesses drive the real site in headless Chrome over raw CDP WebSocket, with no npm
install and no test framework. They start their own static server and tear it down again,
so they work from a cold shell.

```bash
# node tools/verify_ui.mjs          # 62 assertions: data, type, controls, filters, routes, lightbox
node tools/verify_file_url.mjs    # 10 assertions: the file:// path, incl. video decode
node tools/shoot.mjs              # 10 screenshots into _work/shots/
cd stormy-mcp && node selftest.js # assertions against the real MCP server (stdio, live frames)
```

`shoot.mjs` refuses to write a screenshot if the page did not render. Without that guard a
dead server produces nine identical PNGs of Chrome's error page, and the only symptom is
that every file has the same byte size.

The hand-written reviews live in `_work/meta/descriptions/*.json`. Those are the only
non-derived inputs; everything else is computed.

### Why the video pipeline is the way it is

The Playwright ffmpeg build ships only `mjpeg` and `libvpx` — no H.264 encoder, and no
`hstack`/`tile` filters. OpenCV both decodes the sources and *writes* VP8 through
`VideoWriter`, so re-encoding runs entirely in-process with no external binary and no
40 MB `av` wheel. Motion is measured with a mean-absolute-frame-difference probe, and only
clips that actually move are shipped as video.

---

## Running UI Hall

**Double-click `ui-hall/index.html`.** That works, and it is the normal way to use the hall.

A browser blocks `fetch()` on `file://` URLs — the origin is `null`, so every request counts
as cross-origin. So the data layer has two load paths: on `http(s)` it fetches
`data/corpus.json`, and on `file://` it loads the generated `data/corpus.js` through a
classic `<script>` tag, which is not blocked. `corpus.js` is a build artifact of
`tools/build_corpus.py`; `corpus.json` stays the single source of truth because the MCP
reads it from disk.

To serve it over http instead — useful for a shareable URL, or a browser strict about local
media playback — double-click **`start.cmd`**, or:

```bash
node tools/serve.mjs 8099     # then open http://127.0.0.1:8099/
```

`serve.mjs` is dependency-free and supports HTTP Range requests, which `<video>` needs to
seek. It also contains every request inside the served root.

### Verifying both load paths

```bash
node tools/verify_ui.mjs        # 43 assertions over http
node tools/verify_file_url.mjs  # 10 assertions over file://, incl. video decode
```

Both start and stop their own server, so they work from a cold shell.

---

## Connecting the MCP

Add to `~/.workbuddy-ai/mcp.json`:

```json
{
  "mcpServers": {
    "stormy": {
      "command": "node",
      "args": ["/path/to/checkout/stormy-mcp/server.js"]
    }
  }
}
```

Then **trust the server** in the connector management page — a newly written config does
not activate on its own.

Verify before trusting it:

```bash
node stormy-mcp/selftest.js
```

### The ten tools

| Tool | Question it answers |
|---|---|
| `search_designs` | "show me screens like this" |
| `get_asset` | "tell me everything about this one" |
| `list_facets` | "what can this corpus even speak to" |
| `find_patterns` | "how should I lay this out" |
| `design_brief` | "give me everything for this screen at once" |
| `palette_for` | "what colours should this be" |
| `compare_pair` | "show me this done badly and well" |
| `asset_image` | "where is the file so I can look at it" |
| `corpus_stats` | "how much evidence is there" |
| `list_groups` | "show me every screen of this app together" |

---

## Honesty contract

The corpus distinguishes three kinds of claim, and the tooling never blurs them:

1. **Measured** — dimensions, palettes, motion, contrast ratios. Computed, reproducible.
2. **Observed** — descriptions. Written by looking at the image; where text was too small
   to read, the description says so instead of inventing copy.
3. **Inferred** — platform labels. Flagged as inference.

`corpus_stats.mjs` reports coverage gaps alongside totals, so any claim built on the corpus
can state its own confidence. Assets that are cropped, low-resolution or partially obscured
carry a salvage note rather than being quietly dropped.

---

## Provenance

The material was collected from public sources for personal study. Interfaces belong to the
people who designed them. Nothing here is licensed for redistribution, and it should not be
used to ship a clone of a specific product. It is a reference for learning the *vocabulary*
of interface design — the layout conventions, the spacing rhythm, the colour logic.

Every asset records its original source path so anything can be traced back.
