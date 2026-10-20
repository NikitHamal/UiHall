"""Apply the October 2026 visual audit to corpus.json in place.

The audit re-read every asset from contact sheets and full-size files and
rewrote title/description/facets where the old write-up was wrong (707 of 766).
The same records are saved as descriptions/zz-visual-audit-2026-10.json so a
full rebuild with build_corpus.py lands on the same result (files merge in
name order, so `zz-` wins).
"""
import glob, json, os, sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CORPUS = os.path.join(ROOT, "ui-hall", "data", "corpus.json")
AUDIT_DIR = sys.argv[1] if len(sys.argv) > 1 else None
OUT_DESC = os.path.join(ROOT, "_work", "meta", "descriptions", "zz-visual-audit-2026-10.json")

# Exact duplicates and assets with no design value, found during the audit.
DROP = {
    "IMG-0287": "duplicate of IMG-0221", "IMG-0288": "duplicate of IMG-0222",
    "IMG-0289": "duplicate of IMG-0223", "IMG-0290": "duplicate of IMG-0224",
    "IMG-0502": "watermarked copy of IMG-0503", "VID-0172": "duplicate of VID-0171",
    "IMG-0430": "blank, overexposed screen", "IMG-0427": "every artboard unreadable",
    "IMG-0542": "fragment: tab bar and part of a card", "IMG-0508": "empty placeholder tiles",
    "VID-0312": "placeholder 'Item 1..20' list",
}
CROP_OF = {
    "IMG-0370": "IMG-0369", "IMG-0371": "IMG-0369", "IMG-0380": "IMG-0379", "IMG-0392": "IMG-0393",
    "IMG-0395": "IMG-0396", "IMG-0398": "IMG-0397", "IMG-0399": "IMG-0397", "IMG-0426": "IMG-0425",
    "IMG-0456": "IMG-0458", "IMG-0457": "IMG-0458", "IMG-0470": "IMG-0452", "IMG-0471": "IMG-0452",
    "IMG-0472": "IMG-0452", "IMG-0473": "IMG-0452", "IMG-0580": "IMG-0579", "IMG-0589": "IMG-0588",
    "IMG-0597": "IMG-0595", "IMG-0629": "IMG-0628", "IMG-0650": "IMG-0649", "IMG-0651": "IMG-0649",
}
FIELDS = ("title", "description", "category", "type", "roles", "style", "tags", "quality")


def main():
    c = json.load(open(CORPUS, encoding="utf-8"))
    if AUDIT_DIR:
        recs = {}
        for f in sorted(glob.glob(os.path.join(AUDIT_DIR, "sheet_*.json"))):
            for r in json.load(open(f, encoding="utf-8")):
                recs[r["id"]] = {k: r[k] for k in ("id",) + FIELDS}
        json.dump(sorted(recs.values(), key=lambda r: r["id"]), open(OUT_DESC, "w", encoding="utf-8"),
                  indent=1, ensure_ascii=False)
    recs = {r["id"]: r for r in json.load(open(OUT_DESC, encoding="utf-8"))}

    assets = []
    for a in c["assets"]:
        if a["id"] in DROP:
            continue
        r = recs.get(a["id"])
        if r:
            for k in FIELDS:
                a[k] = r[k]
        a.pop("source_note", None)
        strip = os.path.join(ROOT, "ui-hall", "assets", "strip", a["id"] + ".webp")
        if os.path.exists(strip):
            a["strip"] = {"src": "assets/strip/%s.webp" % a["id"], "frames": 6}
        if a["id"] in CROP_OF:
            a["crop_of"] = CROP_OF[a["id"]]
        assets.append(a)
    c["assets"] = assets

    def recount(key, field, multi):
        n = Counter()
        for a in assets:
            for v in (a.get(field) or []) if multi else [a.get(field)]:
                n[v] += 1
        old = {x["id"]: x for x in c[key]}
        out = [{**old.get(k, {"id": k, "label": k}), "count": v} for k, v in n.most_common() if k]
        c[key] = out

    recount("categories", "category", False)
    recount("types", "type", False)
    recount("roles", "roles", True)
    recount("styles", "style", True)
    recount("tags", "tags", True)
    ids = {a["id"] for a in assets}
    for g in c["groups"]:
        g["members"] = [m for m in g["members"] if m in ids]
        g["count"] = len(g["members"])
    c["groups"] = [g for g in c["groups"] if g["count"] >= 2]
    c["palette_order"] = [i for i in c["palette_order"] if i in ids]
    for pid, sw in c.get("printed_palettes", {}).items():
        for s in sw:
            if pid == "IMG-0060" and s["hex"] == "#F9A8B8":
                s["hex"] = "#F9A8BB"  # printed on the card; the old value was a misread
    c["totals"] = {
        "assets": len(assets),
        "images": sum(a["kind"] == "image" for a in assets),
        "videos": sum(a["kind"] == "video" for a in assets),
        "clips": sum(bool(a.get("clip")) for a in assets),
        "described": sum(bool(a.get("description")) for a in assets),
    }
    c["version"] = "2.0.0"
    c.pop("generated_from", None)
    for a in assets:
        if "origin" in a:
            a["origin"]["path"] = os.path.basename(a["origin"]["path"].replace("\\", "/"))
    json.dump(c, open(CORPUS, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("assets", len(assets), "dropped", len(DROP), "categories", [(x["id"], x["count"]) for x in c["categories"]])


if __name__ == "__main__":
    main()
