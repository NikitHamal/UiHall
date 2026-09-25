"""Build labelled contact sheets so every asset can be reviewed visually.

Usage:
  python make_sheets.py images 4 4      -> 4x4 grids of all images
  python make_sheets.py posters 4 4     -> 4x4 grids of video poster frames
  python make_sheets.py picks <idfile> 6 2  -> 6x2 grids of a chosen ID list
"""
import json
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFont

META = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "_work", "meta", "inventory.json")
SHEET_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "_work", "sheets")
POSTER_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "_work", "vidframes")

CELL_W = 480
IMG_H = 400
LABEL_H = 36
# overridable for high-resolution "detail" sheets
if os.environ.get("SHEET_CELL_W"):
    CELL_W = int(os.environ["SHEET_CELL_W"])
if os.environ.get("SHEET_IMG_H"):
    IMG_H = int(os.environ["SHEET_IMG_H"])
BG = (18, 18, 20)
PAD = 6
FG = (235, 235, 240)
ACCENT = (120, 200, 255)


def font(size):
    for cand in (
        r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\consola.ttf",
    ):
        if os.path.exists(cand):
            try:
                return ImageFont.truetype(cand, size)
            except OSError:
                pass
    return ImageFont.load_default()


def build(items, cols, rows, out_prefix, title):
    """items: list of (id, label, image_path)"""
    f_lab = font(17)
    f_ttl = font(22)
    per = cols * rows
    n_sheets = math.ceil(len(items) / per)
    made = []
    for s in range(n_sheets):
        chunk = items[s * per:(s + 1) * per]
        W = cols * CELL_W
        H = rows * (IMG_H + LABEL_H)
        sheet = Image.new("RGB", (W, H), BG)
        d = ImageDraw.Draw(sheet)
        for i, (aid, label, path) in enumerate(chunk):
            cx = (i % cols) * CELL_W
            cy = (i // cols) * (IMG_H + LABEL_H)
            # image area
            box = (cx + PAD, cy + PAD, cx + CELL_W - PAD, cy + IMG_H - PAD)
            try:
                im = Image.open(path)
                im = im.convert("RGB")
                im.thumbnail((box[2] - box[0], box[3] - box[1]), Image.LANCZOS)
                ox = box[0] + ((box[2] - box[0]) - im.width) // 2
                oy = box[1] + ((box[3] - box[1]) - im.height) // 2
                sheet.paste(im, (ox, oy))
            except Exception as exc:  # noqa: BLE001
                d.rectangle(box, outline=(90, 40, 40), width=2)
                d.text((box[0] + 8, box[1] + 8), "ERR " + type(exc).__name__, font=f_lab, fill=(255, 120, 120))
            # label bar
            ly = cy + IMG_H
            d.rectangle((cx, ly, cx + CELL_W, ly + LABEL_H), fill=(30, 30, 34))
            txt = f"{aid}  {label}"
            d.text((cx + 8, ly + 8), txt[:60], font=f_lab, fill=ACCENT)
            # cell border
            d.rectangle((cx, cy, cx + CELL_W - 1, cy + IMG_H + LABEL_H - 1), outline=(55, 55, 62))
        name = f"{out_prefix}_{s + 1:02d}.jpg"
        path = os.path.join(SHEET_DIR, name)
        sheet.save(path, quality=88)
        made.append((name, [x[0] for x in chunk], title))
    return made


def load_inv():
    with open(META, encoding="utf-8") as fh:
        return json.load(fh)


def main():
    os.makedirs(SHEET_DIR, exist_ok=True)
    mode = sys.argv[1]
    cols = int(sys.argv[2])
    rows = int(sys.argv[3])
    inv = load_inv()

    if mode == "images":
        items = [(r["id"], os.path.basename(r["path"]), r["path"]) for r in inv["images"]]
    elif mode == "posters":
        items = []
        for r in inv["videos"]:
            p = os.path.join(POSTER_DIR, r["id"] + ".jpg")
            if os.path.exists(p):
                items.append((r["id"], os.path.basename(r["path"]), p))
    elif mode in ("picks", "picksimg", "picksvid"):
        with open(sys.argv[4], encoding="utf-8") as fh:
            wanted = [x.strip() for x in fh if x.strip()]
        src = {"picksimg": inv["images"], "picksvid": inv["videos"]}.get(mode)
        if src is None:
            src = inv["images"] + inv["videos"]
        by_id = {r["id"]: r for r in src}
        items = []
        for wid in wanted:
            r = by_id.get(wid)
            if not r:
                continue
            p = r["path"]
            if r["id"].startswith("VID"):
                p = os.path.join(POSTER_DIR, r["id"] + ".jpg")
                if not os.path.exists(p):
                    p = r["path"]
            items.append((r["id"], os.path.basename(r["path"]), p))
        out_prefix = sys.argv[5] if len(sys.argv) > 5 else "picks"
        made = build(items, cols, rows, out_prefix, mode)
        print("sheets:", len(made), "items:", len(items))
        for m in made:
            print(" ", m[0], "->", ",".join(m[1]))
        return
    else:
        raise SystemExit("unknown mode")

    made = build(items, cols, rows, mode, mode)
    print("sheets:", len(made), "items:", len(items))
    index = {name: ids for name, ids, _ in made}
    with open(os.path.join(SHEET_DIR, f"{mode}_index.json"), "w", encoding="utf-8") as fh:
        json.dump(index, fh, indent=1)


if __name__ == "__main__":
    main()
