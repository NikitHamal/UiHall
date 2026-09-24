"""Reconcile the taxonomy with the tags actually used by the review passes.

Two job:

1. **Normalise.** The review passes produced singular/plural variants of the same
   tag (`button`/`buttons`, `component`/`components`). Pick one form and rewrite
   the review files, rather than letting both live in the corpus.

2. **Extend.** Every remaining tag that is genuinely descriptive is added to the
   taxonomy. A tag that appears in a hand-written review is evidence that someone
   needed the word; refusing it loses signal and creates build warnings that hide
   real problems.

Run this after adding description batches, then rebuild the corpus.
"""
import json
import os
import re
import sys
from collections import Counter

META = r"E:\Stormy\_work\meta"
DESC = os.path.join(META, "descriptions")
TAXONOMY = r"E:\Stormy\stormy-mcp\taxonomy.json"

# Preferred form when two variants exist. Keys are the form to discard.
NORMALISE = {
    "buttons": "button",
    "components": "component",
    "app-icons": "app-icon",
    "stickers": "sticker",
    "screenshots": "screenshot",
    "profiles": "profile",
    "categories": "category",
    "metrics": "metric",
    "tiles": "tile",
    "photos": "photo",
    "forms": "form",
    "events": "event",
    "tools": "tool",
    "actions": "action",
    "controls": "control",
    "pills": "pill",
    "stories": "story",
    "collections": "collection",
    "toggles": "toggle",
    "checklist": "checklist",
}

# Tags that should be dropped entirely: too vague to filter on, or they duplicate
# an existing notion already covered by category/type/roles.
DROP = {
    "text",           # everything has text
    "minimal",        # that is a style, and it is already there
    "mobile",         # that is the corpus, not a filter
    "content",        # meaningless
    "layout",         # meaningless on its own
    "actions",        # meaningless
    "demo",           # meaningless
    "inspiration",    # meaningless
    "creation",       # vague
    "create",         # vague
    "featured",       # editorial, not design
    "spring",         # a season, not a design property
    "coffee", "water", "shoes", "gardening", "stationery", "sports",
    "gig-economy", "donation", "odds", "pass", "route", "water",
}


def slug(value):
    value = re.sub(r"[^a-z0-9]+", "-", (value or "").lower())
    return re.sub(r"-+", "-", value).strip("-")


def collect_used():
    """Every tag that appears in a review pass, with counts."""
    used = Counter()

    for name in sorted(os.listdir(DESC)):
        if not name.endswith(".json"):
            continue
        with open(os.path.join(DESC, name), encoding="utf-8") as fh:
            payload = json.load(fh)
        items = payload.get("items") if isinstance(payload, dict) else payload
        if isinstance(items, dict):
            items = list(items.values())
        for rec in items or []:
            for t in rec.get("tags", []):
                used[slug(t)] += 1

    for f in ("videos_A.json", "videos_B.json"):
        path = os.path.join(META, f)
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        for rec in data.get("items", []):
            if not rec.get("relevant"):
                continue
            for t in rec.get("tags", []):
                used[slug(t)] += 1

    return used


def main():
    apply = "--apply" in sys.argv

    with open(TAXONOMY, encoding="utf-8") as fh:
        tax = json.load(fh)
    existing = {k for k in tax.get("tags", {}) if not k.startswith("_")}

    used = collect_used()
    print("tags used across review passes:", len(used))
    print("already in taxonomy:", len(existing & set(used)))

    unknown = {t: n for t, n in used.items() if t not in existing}
    print("not in taxonomy:", len(unknown))

    # apply the normalisation map before deciding what to add
    renamed = {t: NORMALISE[t] for t in list(unknown) if t in NORMALISE}
    dropped = {t: n for t, n in unknown.items() if t in DROP}
    to_add = sorted(t for t in unknown if t not in NORMALISE and t not in DROP)

    print("\nwill rename:", len(renamed), "->", ", ".join(f"{k}={v}" for k, v in sorted(renamed.items())[:12]))
    print("will drop:", len(dropped), "->", ", ".join(sorted(dropped)[:12]))
    print("will add:", len(to_add))

    if not apply:
        print("\n(dry run — pass --apply to write)")
        print("\nwould add:")
        for t in to_add:
            print(f"   {used[t]:>3}  {t}")
        return

    # 1. rewrite the review files with normalised tags
    rewritten = 0
    for name in sorted(os.listdir(DESC)):
        if not name.endswith(".json"):
            continue
        path = os.path.join(DESC, name)
        with open(path, encoding="utf-8") as fh:
            payload = json.load(fh)
        items = payload.get("items") if isinstance(payload, dict) else payload
        if isinstance(items, dict):
            items = list(items.values())
        changed = False
        for rec in items or []:
            if "tags" not in rec:
                continue
            out, seen = [], set()
            for t in rec["tags"]:
                s = slug(t)
                s = NORMALISE.get(s, s)
                if s in DROP or s in seen:
                    changed = True
                    continue
                seen.add(s)
                out.append(s)
            rec["tags"] = out
        if changed:
            with open(path, "w", encoding="utf-8") as fh:
                json.dump(payload, fh, indent=2, ensure_ascii=False)
                fh.write("\n")
            rewritten += 1
    print(f"\nrewrote {rewritten} description files")

    for f in ("videos_A.json", "videos_B.json"):
        path = os.path.join(META, f)
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        changed = False
        for rec in data.get("items", []):
            if "tags" not in rec:
                continue
            out, seen = [], set()
            for t in rec["tags"]:
                s = slug(t)
                s = NORMALISE.get(s, s)
                if s in DROP or s in seen:
                    changed = True
                    continue
                seen.add(s)
                out.append(s)
            rec["tags"] = out
        if changed:
            with open(path, "w", encoding="utf-8") as fh:
                json.dump(data, fh, indent=1, ensure_ascii=False)
            print("normalised", f)

    # 2. extend the taxonomy
    tags = tax.setdefault("tags", {})
    for t in to_add:
        tags[t] = None
    for _, target in NORMALISE.items():
        if target in unknown or target not in existing:
            tags.setdefault(target, None)

    ordered = {"_comment": tags.pop("_comment", None)}
    ordered.update({k: v for k, v in sorted(tags.items()) if k != "_comment"})
    tax["tags"] = {k: v for k, v in ordered.items() if k != "_comment"}
    tax["tags"] = {"_comment": "Free-form but normalised. Add here when a new recurring term appears.", **tax["tags"]}

    with open(TAXONOMY, "w", encoding="utf-8") as fh:
        json.dump(tax, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    print(f"taxonomy now has {len(tax['tags']) - 1} tags")


if __name__ == "__main__":
    main()
