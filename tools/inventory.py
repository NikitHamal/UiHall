"""Inventory every image/video in the source dump and assign stable IDs."""
import json
import os
import sys

ROOT = os.path.join(os.path.expanduser("~"), "Downloads")
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "_work", "meta", "inventory.json")

IMG_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".avif", ".heic"}
VID_EXT = {".mp4", ".webm", ".mov", ".mkv", ".avi"}


def main():
    images, videos = [], []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        # skip our own tooling dirs if ever nested
        for f in filenames:
            p = os.path.join(dirpath, f)
            try:
                st = os.stat(p)
            except OSError:
                continue
            ext = os.path.splitext(f)[1].lower()
            rec = {
                "path": p,
                "name": f,
                "rel": os.path.relpath(p, ROOT),
                "ext": ext,
                "size": st.st_size,
                "mtime": st.st_mtime,
            }
            if ext in IMG_EXT:
                images.append(rec)
            elif ext in VID_EXT:
                videos.append(rec)

    images.sort(key=lambda r: (r["mtime"], r["name"]))
    videos.sort(key=lambda r: (r["mtime"], r["name"]))

    for i, r in enumerate(images):
        r["id"] = "IMG-%04d" % (i + 1)
    for i, r in enumerate(videos):
        r["id"] = "VID-%04d" % (i + 1)

    payload = {"images": images, "videos": videos}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=1)

    print("images:", len(images), "videos:", len(videos))
    print("wrote", OUT)


if __name__ == "__main__":
    main()
