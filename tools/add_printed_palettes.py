"""Add the printed hex values for the named two-tone palette cards to corpus.json.

These ten cards print their own colour names and hex values, so they are quoted
rather than measured. The measured palette is still kept for each card (it is how
the swatch wall gets its band colours); this file adds the authoritative printed
pair on top, plus the ink colour each label is actually set in.

Read directly from the cards during the visual review. Do not guess these.
"""
import json
import os

CORPUS = r"E:\Stormy\ui-hall\data\corpus.json"

# id -> (top band, bottom band)
PRINTED = {
    "IMG-0055": [  # Raspberry Red / Deep Space Blue
        {"name": "Raspberry Red", "hex": "#EE005A", "ink": "#0A1520"},
        {"name": "Deep Space Blue", "hex": "#012641", "ink": "#EE005A"},
    ],
    "IMG-0056": [  # Shadow Grey / Sandy Clay
        {"name": "Shadow Grey", "hex": "#272727", "ink": "#D4AA7D"},
        {"name": "Sandy Clay", "hex": "#D4AA7D", "ink": "#2B2B2B"},
    ],
    "IMG-0057": [  # Electric Rose / Chartreuse
        {"name": "Electric Rose", "hex": "#FE00AE", "ink": "#C1FE1A"},
        {"name": "Chartreuse", "hex": "#C1FE1A", "ink": "#FE00AE"},
    ],
    "IMG-0058": [  # Lime Cream / Vintage Grape
        {"name": "Lime Cream", "hex": "#DDEA78", "ink": "#433455"},
        {"name": "Vintage Grape", "hex": "#433455", "ink": "#DDEA78"},
    ],
    "IMG-0059": [  # Celadon / Chocolate Plum
        {"name": "Celadon", "hex": "#A8D3A8", "ink": "#553832"},
        {"name": "Chocolate Plum", "hex": "#553832", "ink": "#A8D3A8"},
    ],
    "IMG-0060": [  # Cherry Blossom / Deep Twilight
        {"name": "Cherry Blossom", "hex": "#F9A8B8", "ink": "#1A1265"},
        {"name": "Deep Twilight", "hex": "#1A1265", "ink": "#F9A8B8"},
    ],
    "IMG-0061": [  # Coffee Bean / Morning Butter
        {"name": "Coffee Bean", "hex": "#20130D", "ink": "#F3D98F"},
        {"name": "Morning Butter", "hex": "#F3D98F", "ink": "#20130D"},
    ],
    "IMG-0062": [  # Regal Navy / Lemon Chiffon
        {"name": "Regal Navy", "hex": "#0D3B66", "ink": "#FAF0CA"},
        {"name": "Lemon Chiffon", "hex": "#FAF0CA", "ink": "#0D3B66"},
    ],
    "IMG-0063": [  # Espresso / Peony
        {"name": "Espresso", "hex": "#3E2723", "ink": "#F4C9D6"},
        {"name": "Peony", "hex": "#F4C9D6", "ink": "#3E2723"},
    ],
    "IMG-0064": [  # Deep Mocha / Powder Petal
        {"name": "Deep Mocha", "hex": "#3D2E2B", "ink": "#E1D0C9"},
        {"name": "Powder Petal", "hex": "#E1D0C9", "ink": "#3D2E2B"},
    ],
}


def main():
    with open(CORPUS, encoding="utf-8") as fh:
        corpus = json.load(fh)

    ids = {a["id"] for a in corpus["assets"]}
    missing = [k for k in PRINTED if k not in ids]
    if missing:
        raise SystemExit("these ids are not in the corpus: " + ", ".join(missing))

    corpus["printed_palettes"] = PRINTED

    # the palette page orders cards by the quality of the pairing; give it an order key
    corpus["palette_order"] = list(PRINTED.keys())

    with open(CORPUS, "w", encoding="utf-8") as fh:
        json.dump(corpus, fh, indent=1, ensure_ascii=False)

    print("attached printed palettes for", len(PRINTED), "cards")


if __name__ == "__main__":
    main()
