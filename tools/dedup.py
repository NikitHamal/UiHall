"""Exact-content dedup over the keeper list (catches the ' (1).jpg' download duplicates)."""
import hashlib
import json
import os

META = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "_work", "meta")


def md5(path, chunk=1 << 20):
    h = hashlib.md5()
    with open(path, "rb") as fh:
        while True:
            b = fh.read(chunk)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def main():
    with open(os.path.join(META, "image_triage.json"), encoding="utf-8") as fh:
        tri = json.load(fh)

    seen = {}
    keep, dupes = [], {}
    for rec in tri["keep"]:
        try:
            digest = md5(rec["path"])
        except OSError:
            continue
        if digest in seen:
            dupes[rec["id"]] = seen[digest]
            continue
        seen[digest] = rec["id"]
        keep.append(rec)

    tri["keep"] = keep
    tri["duplicates"] = dupes
    with open(os.path.join(META, "image_triage.json"), "w", encoding="utf-8") as fh:
        json.dump(tri, fh, indent=1)

    with open(os.path.join(META, "keep_images.txt"), "w", encoding="utf-8") as fh:
        for k in keep:
            fh.write(k["id"] + "\n")

    print("keepers after dedup:", len(keep), " exact duplicates removed:", len(dupes))
    for d, o in sorted(dupes.items()):
        print(f"   {d} == {o}")


if __name__ == "__main__":
    main()
