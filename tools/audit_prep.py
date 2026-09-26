"""Prepare the *visual* audit of the corpus.

Two jobs:

1. Order all assets so visually similar ones sit next to each other. The
   previous grouping pass keyed off title prefixes, which only catches assets a
   human already named alike. Ordering by measured similarity (dominant palette
   + perceptual hash + aspect) puts the real candidates -- three screens of one
   app, a store panel and the shot it came from -- adjacent, so one look
   settles whether they belong in a group.

2. Emit `_work/audit/order.json` for `audit_sheets.py` to tile.

Nothing here decides anything. It proposes an order and a list of candidate
pairs; both are confirmed by looking, never applied automatically.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HALL = os.path.join(ROOT, "ui-hall")
CORPUS = os.path.join(HALL, "data", "corpus.json")
OUT_DIR = os.path.join(ROOT, "_work", "audit")

HASH_W = HASH_H = 16


def asset_path(a, key="thumb"):
    """Corpus `src`/`thumb` are relative to ui-hall/, not to the repo root."""
    rel = a.get(key) or a.get("src")
    p = os.path.join(HALL, rel)
    return p if os.path.exists(p) else os.path.join(HALL, a["src"])


def dhash(path):
    """16x16 gradient hash -- survives the webp re-encode the pipeline did."""
    try:
        im = Image.open(path).convert("L").resize((HASH_W + 1, HASH_H), Image.LANCZOS)
    except Exception:
        return None
    a = np.asarray(im, dtype=np.int16)
    return np.packbits((a[:, 1:] > a[:, :-1]).flatten())


def hexvec(hexes):
    """Palette as a fixed 8-slot sRGB vector, zero-padded."""
    out = []
    for h in (hexes or [])[:8]:
        h = h.lstrip("#")
        out.extend(int(h[i : i + 2], 16) for i in (0, 2, 4))
    v = np.array(out, dtype=np.float32)
    return np.concatenate([v, np.zeros(24 - v.size, dtype=np.float32)])


def chain(members, dist):
    """Greedy nearest-neighbour walk, seeded at the most central member."""
    if len(members) < 3:
        return members
    sub = dist[np.ix_(members, members)]
    start = members[int(sub.min(axis=1).sum(axis=0).argmin())]
    out, left, cur = [start], set(members) - {start}, start
    while left:
        nxt = min(left, key=lambda j: dist[cur][j])
        out.append(nxt)
        left.discard(nxt)
        cur = nxt
    return out


def main():
    corpus = json.load(open(CORPUS, encoding="utf-8"))
    assets = corpus["assets"]

    feats = {}
    for a in assets:
        h = dhash(asset_path(a))
        if h is None:
            print("unreadable:", a["id"], a.get("thumb"), a["src"])
            continue
        feats[a["id"]] = {
            "hash": h,
            "pal": hexvec(a.get("palette")),
            "aspect": float(a.get("aspect") or 1.0),
            "kind": a["kind"],
            "category": a["category"],
        }

    ids = list(feats)
    n = len(ids)
    print("features for", n, "of", len(assets), "assets")
    if n < 2:
        return 1

    bits = np.stack([np.unpackbits(feats[i]["hash"]) for i in ids]).astype(np.float32)
    pal = np.stack([feats[i]["pal"] for i in ids])
    asp = np.array([feats[i]["aspect"] for i in ids])

    ham = bits @ (1 - bits).T + (1 - bits) @ bits.T
    dist = np.zeros((n, n), dtype=np.float32)
    for i in range(n):
        dist[i] = (
            ham[i] / 256.0 * 100
            + np.abs(pal - pal[i]).mean(axis=1) / 255.0 * 70
            + np.abs(asp - asp[i]) * 40.0
        )
    np.fill_diagonal(dist, 1e9)

    # Category blocks keep category assignment reviewable in context; the chain
    # inside a block puts same-app screens adjacent. Cross-category twins are
    # caught by candidate_pairs, not by the ordering. Kind is part of the block
    # key so a sheet never mixes posters with stills -- that fragments batches
    # into one-tile sheets and wastes the pixel budget.
    blocks = {}
    for i in range(n):
        f = feats[ids[i]]
        blocks.setdefault((f["category"], f["kind"]), []).append(i)
    cat_order = [c["id"] for c in corpus["categories"]]
    ordered = []
    keys = sorted(blocks, key=lambda k: (cat_order.index(k[0]) if k[0] in cat_order else 99, k[1]))
    for key in keys:
        ordered.extend(ids[i] for i in chain(blocks.pop(key), dist))

    pairs = [
        {"a": ids[i], "b": ids[j], "score": round(float(dist[i][j]), 2), "ham": int(ham[i][j])}
        for i in range(n)
        for j in range(i + 1, n)
        if dist[i][j] < 14 and feats[ids[i]]["kind"] == feats[ids[j]]["kind"]
    ]
    pairs.sort(key=lambda p: p["score"])

    os.makedirs(OUT_DIR, exist_ok=True)
    json.dump(
        {"order": ordered, "candidate_pairs": pairs},
        open(os.path.join(OUT_DIR, "order.json"), "w", encoding="utf-8"),
        indent=1,
    )
    print("candidate pairs:", len(pairs))
    print("wrote", os.path.join(OUT_DIR, "order.json"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
