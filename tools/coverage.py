"""Report description coverage by category, so review passes can be aimed.

Usage:
    python tools/coverage.py
    python tools/coverage.py --missing mobile-app-ui     # list undescribed ids
"""
import json
import os
import sys
from collections import Counter, defaultdict

CORPUS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ui-hall", "data", "corpus.json")


def main():
    with open(CORPUS, encoding="utf-8") as fh:
        corpus = json.load(fh)
    assets = corpus["assets"]

    by_cat = defaultdict(lambda: {"total": 0, "described": 0, "low": 0})
    for a in assets:
        c = by_cat[a["category"]]
        c["total"] += 1
        if a.get("description"):
            c["described"] += 1
            if (a.get("confidence") or 1) < 0.5:
                c["low"] += 1

    print(f"{'category':<20} {'total':>6} {'described':>10} {'low-conf':>9} {'gap':>6}")
    print("-" * 56)
    tot = des = low = 0
    for cat, c in sorted(by_cat.items(), key=lambda kv: -(kv[1]["total"] - kv[1]["described"])):
        gap = c["total"] - c["described"]
        tot += c["total"]; des += c["described"]; low += c["low"]
        print(f"{cat:<20} {c['total']:>6} {c['described']:>10} {c['low']:>9} {gap:>6}")
    print("-" * 56)
    print(f"{'TOTAL':<20} {tot:>6} {des:>10} {low:>9} {tot - des:>6}")
    print(f"coverage: {des / tot * 100:.1f}%   ({des}/{tot})")

    if "--missing" in sys.argv:
        want = sys.argv[sys.argv.index("--missing") + 1] if len(sys.argv) > sys.argv.index("--missing") + 1 else None
        rows = [a for a in assets if not a.get("description") and (not want or a["category"] == want)]
        print(f"\nundescribed: {len(rows)}" + (f" in {want}" if want else ""))
        for a in sorted(rows, key=lambda x: x["id"]):
            print(f"  {a['id']}  {a['kind']:<5} {a['category']:<18} {a['title'][:56]}")


if __name__ == "__main__":
    main()
