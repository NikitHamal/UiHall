"""Tile the corpus into labelled contact sheets for the visual audit.

A sheet is a review artifact, not a deliverable: every tile carries its asset id
so a written correction ties back to exactly one file.

The geometry is driven by the pixel budget a viewer actually gets. A sheet is
downscaled to roughly 1568px on its long edge, so the resolution each tile ends
up with is ~(1568^2 / N) px no matter how the tiles are arranged. Arranging them
to match the *content* aspect stops that budget going to letterbox plate.

    python3 tools/audit_sheets.py --start 0 --limit 48   # resumable chunks
    python3 tools/audit_sheets.py --ids IMG-0055 --tag spot

Detail-heavy categories get fewer, larger tiles (--detail-batch): 8pt dashboard
labels and printed hex values need the resolution.
"""
import argparse
import json
import math
import os
import statistics
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HALL = os.path.join(ROOT, "ui-hall")
CORPUS = os.path.join(HALL, "data", "corpus.json")
OUT_DIR = os.path.join(ROOT, "_work", "audit", "sheets")
FONT_BOLD = os.path.join(HALL, "assets", "fonts", "Inter", "700.woff2")
FONT_REG = os.path.join(HALL, "assets", "fonts", "Inter", "400.woff2")
FALLBACK = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

DETAIL_CATS = {
    "dashboard",
    "design-system",
    "color-palette",
    "app-store-screens",
    "website",
    "before-after",
}
LABEL_H = 36
PAD = 4


def load_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.truetype(FALLBACK, size)


def sheet_geometry(n, r, budget):
    """Pick cols/rows/tile size so the sheet spends ~budget px, aspect-matched."""
    cols = 3 if n >= 5 else (2 if n >= 3 else 1)
    rows = math.ceil(n / cols)
    A = rows / (cols * r)
    B = rows * LABEL_H
    W = (-B + math.sqrt(B * B + 4 * A * budget)) / (2 * A)
    W = max(400.0, min(W, 2600.0))
    tile_w = int(W / cols)
    tile_h = max(200, int((budget / W) / rows) - LABEL_H)
    return cols, rows, tile_w, tile_h


def fit(im, box_w, box_h):
    w, h = im.size
    s = min(box_w / w, box_h / h)
    nw, nh = max(1, round(w * s)), max(1, round(h * s))
    plate = Image.new("RGB", (box_w, box_h), (48, 48, 52))
    plate.paste(
        im.convert("RGB").resize((nw, nh), Image.LANCZOS),
        ((box_w - nw) // 2, (box_h - nh) // 2),
    )
    return plate, s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch", type=int, default=6, help="tiles per sheet")
    ap.add_argument("--detail-batch", type=int, default=4, help="tiles per sheet, detail cats")
    ap.add_argument("--budget", type=int, default=1568 * 1568)
    ap.add_argument("--ids", nargs="*", help="explicit ids (ignores order.json)")
    ap.add_argument("--tag", default="")
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--out", default=OUT_DIR)
    ap.add_argument("--frames", action="store_true",
                    help="for videos, tile the frame strip instead of the poster")
    args = ap.parse_args()

    corpus = json.load(open(CORPUS, encoding="utf-8"))
    by_id = {a["id"]: a for a in corpus["assets"]}

    if args.ids:
        order, tag = args.ids, (args.tag or "spot")
    else:
        order = json.load(
            open(os.path.join(ROOT, "_work", "audit", "order.json"), encoding="utf-8")
        )["order"]
        tag = args.tag or "audit"
        order = order[args.start :]
        if args.limit:
            order = order[: args.limit]

    os.makedirs(args.out, exist_ok=True)
    f_big, f_small = load_font(FONT_BOLD, 28), load_font(FONT_REG, 20)

    manifest, sheet_no, i = [], args.start, 0
    while i < len(order):
        head = by_id[order[i]]
        n_max = args.detail_batch if head["category"] in DETAIL_CATS else args.batch
        chunk = [order[i]]
        head_detail = head["category"] in DETAIL_CATS
        for j in range(i + 1, len(order)):
            if len(chunk) >= n_max:
                break
            a = by_id[order[j]]
            if a["kind"] != head["kind"]:
                break
            if (a["category"] in DETAIL_CATS) != head_detail:
                break
            chunk.append(order[j])

        sizes = [(by_id[c]["w"], by_id[c]["h"]) for c in chunk]
        r = statistics.median(w / h for w, h in sizes) or 1.0
        cols, rows, tile_w, tile_h = sheet_geometry(len(chunk), r, args.budget)

        sheet = Image.new("RGB", (tile_w * cols, (tile_h + LABEL_H) * rows), (18, 18, 20))
        dr = ImageDraw.Draw(sheet)
        scales = {}
        for k, aid in enumerate(chunk):
            a = by_id[aid]
            if args.frames and a["kind"] == "video":
                strip = os.path.join(ROOT, "_work", "vidstrips", aid + ".jpg")
                src = strip if os.path.exists(strip) else os.path.join(HALL, a["src"])
            else:
                rel = a.get("thumb") or a["src"]
                p = os.path.join(HALL, rel)
                src = p if os.path.exists(p) else os.path.join(HALL, a["src"])
            plate, s = fit(Image.open(src), tile_w - 2 * PAD, tile_h - 2 * PAD)
            x, y = (k % cols) * tile_w, (k // cols) * (tile_h + LABEL_H)
            sheet.paste(plate, (x + PAD, y + PAD))
            dr.rectangle(
                [x + PAD, y + PAD, x + tile_w - PAD - 1, y + tile_h - PAD - 1],
                outline=(120, 120, 128),
            )
            dr.text((x + 10, y + tile_h + 5), aid, font=f_big, fill=(255, 255, 255))
            dr.text(
                (x + 148, y + tile_h + 11),
                f"{a['kind'][0].upper()} {a['category']} {a['type']}",
                font=f_small,
                fill=(168, 168, 178),
            )
            scales[aid] = round(s, 3)

        sheet_no += 1
        name = f"{tag}_{sheet_no:03d}.jpg"
        sheet.save(os.path.join(args.out, name), quality=88)
        manifest.append(
            {
                "sheet": name,
                "ids": chunk,
                "cols": cols,
                "rows": rows,
                "tile_w": tile_w,
                "tile_h": tile_h,
                "px": sheet.size[0] * sheet.size[1],
                "scale": scales,
            }
        )
        i += len(chunk)

    mf = os.path.join(args.out, f"manifest-{tag}.json")
    prev = []
    if os.path.exists(mf):
        new_names = {m["sheet"] for m in manifest}
        prev = [m for m in json.load(open(mf, encoding="utf-8")) if m["sheet"] not in new_names]
    json.dump(prev + manifest, open(mf, "w", encoding="utf-8"), indent=1)
    print(f"wrote {len(manifest)} sheets -> {args.out}  ({len(order)} assets)")
    for m in manifest:
        print(" ", m["sheet"], f"{m['cols']}x{m['rows']}", f"{m['tile_w']}x{m['tile_h']}", m["ids"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
