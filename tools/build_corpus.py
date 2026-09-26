"""Assemble corpus.json -- the single data file behind both UI Hall and the MCP.

Three sources merge here:

1. `encode_report.json`   measured truth: dimensions, aspect, k-means palette.
2. `image_triage.json`    which images survived, and their first-pass category.
3. `descriptions/*.json`  the visual read-through: title, description, role, tags.

The descriptions are written by hand (by an agent actually looking at the assets)
because that is the part that cannot be computed. Everything computable is
computed, so the hand-written layer only carries judgement, never measurements.
"""
import json
import os
import re
import sys
from collections import Counter

ROOT = r"E:\Stormy"
META = os.path.join(ROOT, "_work", "meta")
DESC = os.path.join(META, "descriptions")
OUT = os.path.join(ROOT, "ui-hall", "data", "corpus.json")
TAXONOMY = os.path.join(ROOT, "stormy-mcp", "taxonomy.json")


def load(path, default=None):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def load_printed_palettes():
    """Quoted hex values read off the ten named two-tone cards."""
    payload = load(os.path.join(META, "printed_palettes.json"), {})
    items = payload.get("items") if isinstance(payload, dict) else payload
    return items or {}


def load_descriptions():
    """Merge every descriptions/*.json into one id -> record map."""
    merged = {}
    if not os.path.isdir(DESC):
        return merged
    for name in sorted(os.listdir(DESC)):
        if not name.endswith(".json"):
            continue
        payload = load(os.path.join(DESC, name), {})
        items = payload.get("items") if isinstance(payload, dict) else payload
        if isinstance(items, dict):
            for k, v in items.items():
                merged[k] = v
        elif isinstance(items, list):
            for v in items:
                if "id" in v:
                    merged[v["id"]] = v
    return merged


def slugify(value):
    value = re.sub(r"[^a-z0-9]+", "-", (value or "").lower())
    return re.sub(r"-+", "-", value).strip("-")


def main():
    tax = load(TAXONOMY, {})
    valid_cats = set(tax.get("categories", {}))
    valid_types = set(tax.get("types", {}))
    valid_roles = set(tax.get("roles", {}))
    valid_styles = set(tax.get("styles", {}))
    valid_tags = {k for k in tax.get("tags", {}) if not k.startswith("_")}

    enc = load(os.path.join(META, "encode_report.json"), {"images": [], "videos": []})
    tri = load(os.path.join(META, "image_triage.json"), {"keep": []})
    motion = load(os.path.join(META, "motion.json"), {})
    printed = load_printed_palettes()

    vmeta = {}
    for f in ("videos_A.json", "videos_B.json"):
        for item in (load(os.path.join(META, f), {}) or {}).get("items", []):
            vmeta[item["id"]] = item

    desc = load_descriptions()
    print("hand-written descriptions found:", len(desc))

    # Editorial exclusions. A reference library is only useful if every entry
    # earns its place, so assets can be pulled without destroying the measured
    # encode report: the id and the reason live here, the files stay on disk,
    # and removing a line puts the asset straight back.
    dropped = load(os.path.join(META, "dropped.json"), {"items": {}}) or {}
    drop_items = dropped.get("items", {})
    if drop_items:
        print("editorially dropped:", len(drop_items))

    keep_by_id = {r["id"]: r for r in tri.get("keep", [])}
    inv = load(os.path.join(META, "inventory.json"), {"images": [], "videos": []})
    path_by_id = {r["id"]: r["path"] for r in inv["images"] + inv["videos"]}

    assets = []
    warnings = []

    def base(rec, kind):
        iid = rec["id"]
        d = desc.get(iid, {})
        vm = vmeta.get(iid) or {}

        # Category and type can come from three places. Precedence:
        #   1. an explicit hand-written review (descriptions/*.json)
        #   2. the existing video triage pass (videos_A/B.json)
        #   3. the image triage first-pass bucket
        # `kind_override` in a hand-written record exists because videos carry a
        # video-housekeeping `kind` in the triage files; category must not be
        # read from that field.
        cat = (
            d.get("category")
            or (vm.get("kind") if kind == "video" else None)
            or keep_by_id.get(iid, {}).get("category")
            or "other"
        )
        if cat not in valid_cats:
            warnings.append(f"{iid}: unknown category {cat!r}")
            cat = "other"

        if kind == "image":
            typ = d.get("type") or "screen"
        else:
            typ = d.get("type") or ("flow-walkthrough" if vm.get("kind") != "before-after" else "comparison")
        if typ not in valid_types:
            # a few reviews use "comparison", which is a role not a type
            if typ == "comparison":
                typ = "pattern"
            else:
                warnings.append(f"{iid}: unknown type {typ!r}")
                typ = "pattern"

        roles, styles, tags = [], [], []
        for r in d.get("roles", []):
            (roles if r in valid_roles else tags).append(r)
        for s in d.get("style", []):
            (styles if s in valid_styles else tags).append(s)
        for t in d.get("tags", []):
            tags.append(slugify(t))
        if kind == "video" and vmeta.get(iid):
            for t in vmeta[iid].get("tags", []):
                tags.append(t)
            for s in vmeta[iid].get("style", []):
                if s in valid_styles:
                    styles.append(s)

        tags = sorted(set(t for t in tags if t))
        # The taxonomy is the gate, not a suggestion. Anything that is not in
        # it is dropped rather than warned about and kept, because a tag that
        # exists for exactly one asset is noise in the facet list, and because
        # `multi-screen` was arriving here as a *type* leaked into tags, which
        # made it look like a filterable concept when it is already its own
        # facet. Keep the warning so the drift is still visible.
        unknown = [t for t in tags if t not in valid_tags]
        if unknown:
            warnings.append(f"{iid}: dropped unknown tags: {','.join(unknown[:6])}")
            tags = [t for t in tags if t in valid_tags]

        rec_out = {
            "id": iid,
            "kind": kind,
            "category": cat,
            "type": typ,
            "title": d.get("title") or (vmeta.get(iid, {}) or {}).get("title") or iid,
            "description": d.get("description") or (vmeta.get(iid, {}) or {}).get("description") or "",
            "roles": sorted(set(roles)),
            "style": sorted(set(styles)),
            "tags": tags,
            "palette": [p["hex"] if isinstance(p, dict) else p for p in rec.get("palette_measured", [])],
            "palette_detail": rec.get("palette_measured", []),
            "w": rec.get("w"),
            "h": rec.get("h"),
            "orientation": rec.get("orientation"),
            "aspect": rec.get("aspect"),
            "synthetic": bool(d.get("synthetic")),
            "origin": {"path": path_by_id.get(iid, ""), "bytes": rec.get("bytes_src")},
        }
        if d.get("quality"):
            rec_out["quality"] = d["quality"]
        if d.get("pair_with"):
            rec_out["pair_with"] = d["pair_with"]
        if d.get("source_note"):
            rec_out["source_note"] = d["source_note"]
        if d.get("crop_of"):
            rec_out["crop_of"] = d["crop_of"]
        if d.get("crop_box"):
            rec_out["crop_box"] = d["crop_box"]
        return rec_out

    for rec in enc.get("images", []):
        if rec["id"] in drop_items:
            continue
        if "error" in rec:
            warnings.append(f"{rec['id']}: encode failed {rec['error']}")
            continue
        a = base(rec, "image")
        a["src"] = f"assets/img/{a['id']}.webp"
        a["thumb"] = f"assets/thumb/{a['id']}.webp"
        assets.append(a)

    for rec in enc.get("videos", []):
        if rec["id"] in drop_items:
            continue
        if "error" in rec:
            warnings.append(f"{rec['id']}: encode failed {rec['error']}")
            continue
        a = base(rec, "video")
        a["src"] = f"assets/vid/{a['id']}.webp"
        a["thumb"] = f"assets/thumb/{a['id']}.webp"
        mo = motion.get(a["id"], {})
        a["motion"] = mo.get("median")
        a["duration_s"] = rec.get("duration_s")
        a["fps"] = rec.get("fps")
        if rec.get("clip"):
            a["clip"] = f"assets/vid/{a['id']}.webm"
            a["clip_meta"] = rec["clip"]
        assets.append(a)

    # ---- screen groups
    # Several shots of one app or one exploration, linked so the gallery stops
    # showing them as unrelated cards. Applied here rather than as a separate
    # step, for the same reason printed_palettes is folded in: a group that only
    # exists until the next rebuild is not a group.
    groups_payload = load(os.path.join(META, "groups.json"), {"groups": []}) or {"groups": []}
    live_ids = {a["id"] for a in assets}
    groups = []
    for g in groups_payload.get("groups", []):
        members = [m for m in g.get("members", []) if m in live_ids]
        # A group of one is not a group: either the siblings were dropped, or
        # the title prefix was a coincidence.
        if len(members) < 2:
            dropped_from = [m for m in g.get("members", []) if m not in live_ids]
            if dropped_from:
                warnings.append(
                    f"{g.get('id')}: {len(members)} of {len(g['members'])} members "
                    f"survive; dropped {','.join(dropped_from)}")
            continue
        gid = g["id"]
        title = g.get("title") or gid
        groups.append({"id": gid, "title": title, "count": len(members), "members": members})
        for i, mid in enumerate(members):
            for a in assets:
                if a["id"] == mid:
                    a["group"] = gid
                    a["group_title"] = title
                    a["group_size"] = len(members)
                    a["group_index"] = i
    groups.sort(key=lambda g: (-g["count"], g["id"]))

    # ---- categories present, with counts, for the nav
    cat_counts = Counter(a["category"] for a in assets)
    type_counts = Counter(a["type"] for a in assets)
    role_counts = Counter(r for a in assets for r in a["roles"])
    style_counts = Counter(s for a in assets for s in a["style"])
    tag_counts = Counter(t for a in assets for t in a["tags"])

    catalog = {
        "version": "1.0.0",
        "generated_from": "E:\\Downloads",
        "totals": {
            "assets": len(assets),
            "images": sum(1 for a in assets if a["kind"] == "image"),
            "videos": sum(1 for a in assets if a["kind"] == "video"),
            "clips": sum(1 for a in assets if a.get("clip")),
            "described": sum(1 for a in assets if a["description"]),
        },
        "categories": [
            {"id": c, **tax["categories"][c], "count": cat_counts.get(c, 0)}
            for c in tax.get("categories", {}) if cat_counts.get(c)
        ],
        "types": [{"id": t, "label": t, "count": type_counts[t]} for t in sorted(type_counts)],
        "roles": [{"id": r, "count": role_counts[r]} for r in sorted(role_counts, key=lambda k: -role_counts[k])],
        "styles": [{"id": s, "count": style_counts[s]} for s in sorted(style_counts, key=lambda k: -style_counts[k])],
        "tags": [{"id": t, "count": tag_counts[t]} for t in sorted(tag_counts, key=lambda k: -tag_counts[k])],
        "groups": groups,
        "assets": assets,
    }

    # Fold in the quoted printed palettes here rather than as a post-build step:
    # a separate script's output is silently lost the next time this file runs.
    if printed:
        known = {a["id"] for a in assets}
        unknown = [k for k in printed if k not in known]
        if unknown:
            warnings.append("printed palettes reference unknown ids: " + ", ".join(unknown))
        catalog["printed_palettes"] = {k: v for k, v in printed.items() if k in known}
        catalog["palette_order"] = [k for k in printed if k in known]

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(catalog, fh, indent=1, ensure_ascii=False)

    # Emit a JS twin of the corpus. Opening index.html straight off disk is a
    # normal thing to do, and a browser blocks `fetch()` on file:// URLs, so the
    # site would come up completely empty. Classic <script> tags are not blocked,
    # so the data layer falls back to this file when it cannot fetch.
    #
    # This is a GENERATED artifact - never hand-edit it. corpus.json stays the
    # single source of truth, because the MCP reads it from disk.
    js_out = os.path.join(os.path.dirname(OUT), "corpus.js")
    body = json.dumps(catalog, ensure_ascii=False, separators=(",", ":"))
    # U+2028/U+2029 are legal in JSON strings but were illegal in JS source
    # before ES2019; escaping them costs nothing and removes the question.
    body = body.replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    with open(js_out, "w", encoding="utf-8") as fh:
        fh.write("/* GENERATED by tools/build_corpus.py - do not edit.\n"
                 "   A JS twin of corpus.json so the site also works from file://,\n"
                 "   where fetch() is blocked by the browser. */\n")
        fh.write("window.STORMY_CORPUS = " + body + ";\n")

    # Same treatment for the typeface reference, which the Typography tab loads.
    # Without the twin, opening index.html off disk would leave that tab empty
    # while every other route worked - a confusing half-broken page.
    tf_src = os.path.join(ROOT, "ui-hall", "data", "typefaces.json")
    tf_js = os.path.join(ROOT, "ui-hall", "data", "typefaces.js")
    if os.path.exists(tf_src):
        with open(tf_src, encoding="utf-8") as fh:
            tf_body = json.dumps(json.load(fh), ensure_ascii=False, separators=(",", ":"))
        tf_body = tf_body.replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
        with open(tf_js, "w", encoding="utf-8") as fh:
            fh.write("/* GENERATED by tools/build_corpus.py - do not edit.\n"
                     "   JS twin of typefaces.json for the file:// load path. */\n")
            fh.write("window.STORMY_TYPEFACES = " + tf_body + ";\n")
        print("wrote", tf_js)

    print("assets:", len(assets), "| described:", catalog["totals"]["described"])
    print("categories:", dict(cat_counts))
    print("wrote", OUT)
    print("wrote", js_out)
    if warnings:
        print(f"\n{len(warnings)} warnings:")
        for w in warnings[:40]:
            print("   ", w)


if __name__ == "__main__":
    main()
