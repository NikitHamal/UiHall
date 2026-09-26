"""Encode the manual visual triage of every image in the dump.

Every IMG-#### was reviewed on a contact sheet. Anything not listed in SKIP is a keeper.
CATEGORY overrides give a first-pass bucket; the detailed description pass refines it.
"""
import json
import os

META = r"E:\Stormy\_work\meta\inventory.json"
OUT = r"E:\Stormy\_work\meta\image_triage.json"

# Ranges / singles that carry no UI-UX design value.
SKIP = [
    (1, 34),      # game textures, astrology charts, graphy exports, yantra, misc screenshots
    37, 38,       # philosophy quote cards
    43,           # gitcity promo (game)
    (44, 54),     # resume, dreamina AI art, kundali, astrology
    69, 70,       # app-store review blurb, nepali brand reel
    71, 72,       # memes
    (75, 90),     # philosophy quotes, TV/politics, memes, post-apoc furniture
    103, 108,     # quote cards
    111, 112,     # quote card, AI art
    113,          # scanned document
    117,          # nepali ad poster
    (118, 146),   # documents, grade sheets, portraits, citizenship papers
    151, 152,     # portrait photos
    153, 154, 155,  # citizenship documents
    168,          # comic strip
    171, 172, 174,  # event photos
    175,          # facebook profile
    176,          # letter
    177, 178, 179,  # scanned documents
    181,          # code screenshot
    190,          # quote card
    (200, 206),   # Teej greeting cards
    207,          # ML chart screenshot
    (235, 239),   # game UI, game sprites, AI posters
    (241, 243),   # game maps
    255,          # avatar illustration
    (261, 276),   # pixel sprite sheets
    448,          # game promo
]

# First-pass category for the notable clusters.
CATEGORY = {}


def rng(a, b, cat):
    for i in range(a, b + 1):
        CATEGORY["IMG-%04d" % i] = cat


rng(39, 42, "mobile-app-ui")          # Nepali food menu app
rng(55, 64, "color-palette")          # two-tone palette cards  ★
rng(65, 66, "mobile-app-ui")
rng(67, 68, "brand-identity")
rng(73, 74, "brand-identity")
rng(91, 99, "brand-identity")
rng(100, 102, "website")
rng(104, 107, "mobile-app-ui")
rng(109, 110, "design-system")
rng(114, 116, "app-store-screens")
rng(147, 149, "app-store-screens")
rng(150, 150, "website")
rng(156, 156, "illustration")
rng(157, 160, "brand-identity")
rng(161, 161, "mobile-app-ui")
rng(162, 163, "brand-identity")
rng(164, 167, "brand-identity")
rng(169, 169, "mobile-app-ui")
rng(170, 170, "typography")
rng(173, 173, "design-system")
rng(180, 180, "design-system")
rng(182, 182, "before-after")
rng(183, 186, "website")
rng(187, 189, "website")
rng(191, 192, "mobile-app-ui")
rng(193, 196, "mobile-app-ui")
rng(197, 197, "design-system")
rng(198, 199, "mobile-app-ui")
rng(208, 210, "mobile-app-ui")
rng(211, 214, "typography")
rng(215, 228, "mobile-app-ui")
rng(229, 229, "illustration")
rng(230, 234, "mobile-app-ui")
rng(240, 240, "app-store-screens")
rng(244, 254, "mobile-app-ui")
rng(256, 259, "mobile-app-ui")
rng(277, 303, "before-after")
rng(304, 312, "mobile-app-ui")
rng(313, 313, "illustration")
rng(314, 323, "brand-identity")
rng(324, 324, "illustration")
rng(325, 336, "mobile-app-ui")
rng(337, 339, "app-store-screens")
rng(340, 352, "mobile-app-ui")
rng(353, 368, "mobile-app-ui")
rng(369, 384, "mobile-app-ui")
rng(385, 400, "mobile-app-ui")
rng(401, 416, "mobile-app-ui")
rng(417, 432, "mobile-app-ui")
rng(433, 447, "mobile-app-ui")
rng(449, 464, "mobile-app-ui")


def main():
    with open(META, encoding="utf-8") as fh:
        inv = json.load(fh)

    skip_ids = set()
    for item in SKIP:
        if isinstance(item, tuple):
            for i in range(item[0], item[1] + 1):
                skip_ids.add("IMG-%04d" % i)
        else:
            skip_ids.add("IMG-%04d" % item)

    keep, dropped = [], []
    for rec in inv["images"]:
        iid = rec["id"]
        if iid in skip_ids:
            dropped.append(iid)
        else:
            keep.append({"id": iid, "path": rec["path"], "name": rec["name"],
                         "category": CATEGORY.get(iid, "unclassified"),
                         "size": rec["size"], "mtime": rec["mtime"]})

    payload = {"keep": keep, "dropped": sorted(dropped)}
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=1)

    from collections import Counter
    print("images total:", len(inv["images"]))
    print("keep:", len(keep), " dropped:", len(dropped))
    for c, n in Counter(k["category"] for k in keep).most_common():
        print(f"   {c:20s} {n}")

    with open(r"E:\Stormy\_work\meta\keep_images.txt", "w", encoding="utf-8") as fh:
        for k in keep:
            fh.write(k["id"] + "\n")


if __name__ == "__main__":
    main()
