"""Normalise a description batch against the taxonomy, then report real gaps.

    python tools/normalise_batch.py _work/meta/descriptions/mobile-ui-04.json
    python tools/normalise_batch.py <file> --apply

Two jobs:

1. Style names that leaked into `tags` are moved back to `style`, roles that
   leaked in are moved to `roles`. This is the common authoring slip and it
   should not require a taxonomy change to fix.
2. Whatever is left over is a genuine gap. It is printed, not silently added -
   adding vocabulary is a judgement call, so it goes through taxonomy_add.py.
"""
import json
import sys
import os

TAX = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "stormy-mcp", "taxonomy.json")

STYLE_HINTS = {
    "light-mode", "dark-mode", "minimal", "high-contrast", "card-based", "rounded",
    "flat", "monochrome", "gradient-heavy", "illustration-led", "editorial", "playful",
    "soft", "glassmorphism", "bold-typography", "data-dense", "outlined", "luxury",
    "brutalist", "duotone", "hand-drawn", "neumorphism", "retro", "corporate", "organic",
}
TYPE_HINTS = {
    "screen", "multi-screen", "flow-walkthrough", "mockup", "component",
    "token-sheet", "pattern", "marketing", "reference",
}


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    path = sys.argv[1]
    apply = "--apply" in sys.argv

    tax = json.load(open(TAX, encoding="utf-8"))
    roles = set(tax.get("roles", {}))
    styles = set(tax.get("styles", {}))
    tags = {k for k in tax.get("tags", {}) if not k.startswith("_")}

    payload = json.load(open(path, encoding="utf-8"))
    moved_to_style, moved_to_role, real = [], [], {}

    items = payload.get("items", {})
    if isinstance(items, list):
        items = {it.get("id", f"#{i}"): it for i, it in enumerate(items)}

    for k, it in items.items():
        fixed_tags = []
        for t in it.get("tags", []):
            if t in TYPE_HINTS:
                my_type = it.get("type")
                if t != my_type and t in {"multi-screen", "mockup"}:
                    real.setdefault(k, []).append(t + " (used as tag, wanted as type)")
                continue
            if t in STYLE_HINTS and t not in styles:
                # not a real style either - treat as unknown
                real.setdefault(k, []).append(t)
                continue
            if t in STYLE_HINTS and t in styles:
                if t not in it.setdefault("style", []):
                    it["style"].append(t)
                    moved_to_style.append(f"{k}:{t}")
                continue
            if t in roles:
                if t not in it.setdefault("roles", []):
                    it["roles"].append(t)
                    moved_to_role.append(f"{k}:{t}")
                continue
            if t not in tags:
                real.setdefault(k, []).append(t)
                continue
            if t not in fixed_tags:
                fixed_tags.append(t)
        it["tags"] = fixed_tags

    print(f"moved tags -> style : {len(moved_to_style)}")
    for m in moved_to_style:
        print("   " + m)
    print(f"moved tags -> roles : {len(moved_to_role)}")
    for m in moved_to_role:
        print("   " + m)

    if real:
        print(f"\ngenuine gaps needing vocabulary ({sum(len(v) for v in real.values())}):")
        seen = {}
        for k, vs in sorted(real.items()):
            for v in vs:
                seen.setdefault(v, []).append(k)
        for v, ks in sorted(seen.items()):
            print(f"   {v:<20} used by {len(ks)}: {', '.join(ks[:6])}")
    else:
        print("\nno genuine gaps")

    if apply:
        # drop any tag that is not in the taxonomy after normalisation
        for k, it in items.items():
            it["tags"] = [t for t in it["tags"] if t in tags]
        json.dump(payload, open(path, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
        print("\napplied: unknown tags removed from", os.path.basename(path))
    else:
        print("\n(dry run - pass --apply to write)")


if __name__ == "__main__":
    main()
