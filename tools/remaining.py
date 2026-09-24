#!/usr/bin/env python3
"""Report which review sheets still contain undescribed assets.

Joins `_work/review/mapping.json` (sheet -> [ids]) against every description
batch in `_work/meta/descriptions/*.json` and prints, per sheet, the ids that
have no description yet. Sheets are the unit of work: you read a sheet, write a
batch, and this tells you which sheet is cheapest to do next.

    python tools/remaining.py             # per-sheet gaps
    python tools/remaining.py s11         # only sheets matching 's11'
"""
import glob
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REVIEW = os.path.join(ROOT, "_work", "review", "mapping.json")
DESC = os.path.join(ROOT, "_work", "meta", "descriptions")


def described_ids():
    ids = set()
    for path in sorted(glob.glob(os.path.join(DESC, "*.json"))):
        payload = json.load(open(path, encoding="utf-8"))
        items = payload.get("items", []) if isinstance(payload, dict) else payload
        # Two shapes are in use: a list of objects, and a dict keyed by id
        # whose values are the objects. Iterating a dict would otherwise yield
        # the keys as plain strings, which is what bit this script first time.
        records = items.values() if isinstance(items, dict) else items
        for it in records:
            if isinstance(it, str):
                ids.add(it)
            elif isinstance(it, dict) and it.get("id"):
                ids.add(it["id"])
    return ids


def main():
    filt = sys.argv[1].lower() if len(sys.argv) > 1 else ""
    have = described_ids()
    mapping = json.load(open(REVIEW, encoding="utf-8"))
    total_gap = 0
    for sheet in sorted(mapping):
        if filt and filt not in sheet.lower():
            continue
        ids = mapping[sheet]
        missing = [i for i in ids if i not in have]
        total_gap += len(missing)
        if missing:
            print(f"{sheet}  {len(missing)}/{len(ids)} left")
            print("   " + " ".join(missing))
        else:
            print(f"{sheet}  complete")
    print(f"\ntotal undescribed in review sheets: {total_gap}")


if __name__ == "__main__":
    main()
