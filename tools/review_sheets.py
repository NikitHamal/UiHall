"""Build review sheets from the *processed* UI Hall images.

Unlike make_sheets.py (which reads originals from E:\\Downloads), this reads
ui-hall/assets/img/<ID>.webp - i.e. exactly what the site displays - so a
description written off one of these sheets matches what a visitor will see.

Usage:
    python tools/review_sheets.py                       # all undescribed, 4x3
    python tools/review_sheets.py --category website
    python tools/review_sheets.py --all                 # every asset
    python tools/review_sheets.py --ids IMG-0039,IMG-0040
    python tools/review_sheets.py --cols 4 --rows 3 --cell 360

Writes to _work/review/. Prints the sheet -> id mapping so a review pass can be
tied back to specific assets.
"""
import argparse
import json
import math
import os

from PIL import Image, ImageDraw, ImageFont

CORPUS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ui-hall", "data", "corpus.json")
IMGDIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ui-hall", "assets", "img")
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "_work", "review")

BG = (16, 17, 20)
FG = (238, 238, 242)
ACCENT = (130, 205, 255)
DIM = (150, 156, 168)
WARN = (240, 170, 90)


def font(size):
    for cand in (r"C:\Windows\Fonts\segoeui.ttf", r"C:\Windows\Fonts\arial.ttf"):
        if os.path.exists(cand):
            try:
                return ImageFont.truetype(cand, size)
            except OSError:
                pass
    return ImageFont.load_default()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--category")
    ap.add_argument("--ids")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--cols", type=int, default=4)
    ap.add_argument("--rows", type=int, default=3)
    ap.add_argument("--cell", type=int, default=380)
    args = ap.parse_args()

    with open(CORPUS, encoding="utf-8") as fh:
        corpus = json.load(fh)
    assets = corpus["assets"]

    if args.ids:
        want = {s.strip() for s in args.ids.split(",")}
        sel = [a for a in assets if a["id"] in want]
    elif args.category:
        sel = [a for a in assets if a["category"] == args.category and not a.get("description")]
    elif args.all:
        sel = list(assets)
    else:
        sel = [a for a in assets if not a.get("description")]

    sel = [a for a in sel if a["kind"] == "image"]
    sel.sort(key=lambda a: a["id"])
    if not sel:
        raise SystemExit("nothing to review for that selection")

    os.makedirs(OUT, exist_ok=True)
    f_lab = font(15)
    f_id = font(17)
    f_ttl = font(21)

    per = args.cols * args.rows
    cell_w, cell_h = args.cell, int(args.cell * 0.86)
    lab_h = 52
    n = math.ceil(len(sel) / per)
    print(f"{len(sel)} images -> {n} sheet(s) of {args.cols}x{args.rows}\n")

    mapping = {}
    for s in range(n):
        chunk = sel[s * per:(s + 1) * per]
        W = args.cols * cell_w
        H = args.rows * (cell_h + lab_h) + 42
        sheet = Image.new("RGB", (W, H), BG)
        d = ImageDraw.Draw(sheet)

        head = f"review {s + 1}/{n}   -   {len(sel)} undescribed images" if not args.all else f"review {s + 1}/{n}"
        d.text((10, 10), head, font=f_ttl, fill=ACCENT)
        ids_here = []

        for i, a in enumerate(chunk):
            r, c = divmod(i, args.cols)
            x = c * cell_w
            y = 42 + r * (cell_h + lab_h)
            path = os.path.join(IMGDIR, a["id"] + ".webp")
            if not os.path.exists(path):
                d.rectangle([x + 4, y + 4, x + cell_w - 4, y + cell_h - 4], outline=(80, 40, 40))
                d.text((x + 12, y + 12), "MISSING", font=f_id, fill=(255, 120, 120))
            else:
                im = Image.open(path).convert("RGB")
                im.thumbnail((cell_w - 8, cell_h - 8), Image.LANCZOS)
                ox = x + (cell_w - im.width) // 2
                oy = y + (cell_h - im.height) // 2
                sheet.paste(im, (ox, oy))
                # accent corner so the cell boundary is unambiguous
                d.rectangle([x + 4, y + 4, x + cell_w - 4, y + cell_h - 4], outline=(38, 40, 46))

            d.text((x + 10, y + cell_h + 4), a["id"], font=f_id, fill=ACCENT)
            cat = a["category"]
            conf = "" if (a.get("confidence") or 1) >= 0.5 else "  low-conf"
            d.text((x + 10, y + cell_h + 26), f"{cat}{conf}", font=f_lab, fill=DIM)
            ids_here.append(a["id"])

        # Name sheets by what they contain. Using a bare `review_NN.jpg` meant a
        # second run for another category silently overwrote the first run's
        # sheets *and* its mapping.json, so the ids you had been reading no
        # longer matched the file on disk.
        prefix = "review"
        if args.category:
            prefix = f"review_{args.category}"
        elif args.ids:
            prefix = "review_ids"
        elif args.all:
            prefix = "review_all"
        out = os.path.join(OUT, f"{prefix}_{s + 1:02d}.jpg")
        sheet.save(out, quality=88)
        mapping[os.path.basename(out)] = ids_here
        print(f"  {out}  ({len(ids_here)} images)")
        print("     " + ", ".join(ids_here))

    # Merge into the existing mapping rather than replacing it: sheet sets from
    # different categories must coexist so a review pass can still be traced.
    map_path = os.path.join(OUT, "mapping.json")
    existing = {}
    if os.path.exists(map_path):
        try:
            with open(map_path, encoding="utf-8") as fh:
                existing = json.load(fh)
        except (OSError, ValueError):
            existing = {}
    existing.update(mapping)
    with open(map_path, "w", encoding="utf-8") as fh:
        json.dump(existing, fh, indent=1)
    print(f"\nwrote {n} sheets to {OUT} (mapping.json now has {len(existing)} sheets)")


if __name__ == "__main__":
    main()
