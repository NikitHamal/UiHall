# UI Hall originals

Screens and components designed and built in code for UI Hall. Every one is MIT licensed — study it, remix it, ship it.

- `kit/kit.css` — the shared design kit (tokens → semantic classes)
- `kit/themes.json` — colour/type themes; each screen renders in every theme
- `screens/*.html` — one file per screen, with its write-up in a `<script id="meta">` block so the description lives next to the code
- `src/batch*.py` — the generators that write the screens
- `manifest.json` — stable `<slug>@<theme>` → `ORG-nnnn` ids

Open any screen in a browser with `?theme=ember|mint|ink|grape`.

Build into the corpus (needs `npm i playwright` and a local server on :8099 serving the repo root):

```bash
node tools/serve.mjs 8099 &
node tools/render_originals.mjs /tmp/orig_png      # PNG at 2×
python3 tools/build_originals.py /tmp/orig_png      # webp + thumb + measured palette → data/corpus.json
```
