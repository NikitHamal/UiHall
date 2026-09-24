"""Download a curated set of open-source typefaces (latin subset, woff2) for the
Typography tab. Pulls from the Google Fonts css2 API with a modern UA so the
response hands back woff2, keeps only the 'latin' unicode-range file per weight,
and writes a licence note per family. Everything here is OFL or Apache-2.0, so
self-hosting is permitted and attribution is the only obligation."""
import os
import re
import urllib.request

DEST = r"E:\Stormy\ui-hall\assets\fonts"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")

# family -> (css2 query, weights to keep, licence)
FAMILIES = {
    "Inter":            ("Inter:wght@400;500;600;700",                 [400, 500, 600, 700], "OFL"),
    "SpaceGrotesk":     ("Space+Grotesk:wght@400;500;700",           [400, 500, 700],        "OFL"),
    "Manrope":          ("Manrope:wght@400;500;700;800",             [400, 500, 700, 800],  "OFL"),
    "DMSans":           ("DM+Sans:wght@400;500;700",                 [400, 500, 700],        "OFL"),
    "Sora":             ("Sora:wght@400;600;700",                    [400, 600, 700],        "OFL"),
    "BricolageGrotesque": ("Bricolage+Grotesque:wght@400;600;800",   [400, 600, 800],        "OFL"),
    "PlayfairDisplay":  ("Playfair+Display:wght@400;600;700",        [400, 600, 700],        "OFL"),
    "Fraunces":         ("Fraunces:wght@400;600;700",                 [400, 600, 700],        "OFL"),
    "SourceSerif4":     ("Source+Serif+4:wght@400;600;700",          [400, 600, 700],        "OFL"),
    "Lora":             ("Lora:wght@400;600;700",                    [400, 600, 700],        "OFL"),
    "JetBrainsMono":    ("JetBrains+Mono:wght@400;500;700",           [400, 500, 700],        "OFL"),
    "SpaceMono":        ("Space+Mono:wght@400;700",                  [400, 700],             "OFL"),
}

BLOCK = re.compile(r"@font-face\s*\{(.*?)\}", re.S)
WGT = re.compile(r"font-weight:\s*(\d+)")
URL = re.compile(r"url\((https://[^)]+\.woff2)\)")
UNI = re.compile(r"unicode-range:\s*([^;}]+)")


def get(url, binary=True):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read() if binary else r.read().decode("utf-8", "replace")


def main():
    for fam, (query, weights, lic) in FAMILIES.items():
        outdir = os.path.join(DEST, fam)
        os.makedirs(outdir, exist_ok=True)
        css = get("https://fonts.googleapis.com/css2?family=" + query + "&display=swap", binary=False)
        found = {}
        for body in BLOCK.findall(css):
            w = WGT.search(body)
            u = URL.search(body)
            uni = UNI.search(body)
            if not (w and u):
                continue
            # keep only the plain-latin subset, not latin-ext / cyrillic / etc.
            if uni and "U+0000-00FF" not in uni.group(1):
                continue
            weight = int(w.group(1))
            if weight in weights and weight not in found:
                found[weight] = u.group(1)
        for weight in weights:
            if weight not in found:
                print("  MISS", fam, weight)
                continue
            path = os.path.join(outdir, f"{weight}.woff2")
            data = get(found[weight])
            with open(path, "wb") as fh:
                fh.write(data)
            print(f"  {fam:<20} {weight}  {len(data)//1024}KB")
        with open(os.path.join(outdir, "LICENSE.txt"), "w", encoding="utf-8") as fh:
            fh.write(f"{fam} is licensed under the SIL Open Font License 1.1.\n"
                     f"Licence text: https://openfontlicense.org\n"
                     f"Downloaded from Google Fonts for local self-hosting.\n")
    print("done")


if __name__ == "__main__":
    main()
