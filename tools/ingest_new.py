"""Incremental ingest: add new media from a folder without disturbing existing IDs.

inventory.py re-numbers the whole dump tree, so it is only safe when nothing else
has been added since the last run. For follow-up batches this tool appends
instead:

  1. scan the source folder for images/videos not yet in the inventory
  2. skip anything whose content is already in the corpus (md5), so download
     duplicates of existing assets never get double IDs
  3. assign the next free IDs (continuing after the highest existing ones)
  4. register new images in image_triage (keep, first-pass "unclassified") and
     new videos in videos_B (relevant, so encode_assets ships their posters)

After running this, continue with the documented pipeline steps:

  python tools/extract_vid_frames.py <new video ids...>
  python tools/motion_probe.py <new video ids...>      # merge motion.json with the backup
  python tools/dedup.py
  python tools/encode_assets.py all
  # write _work/meta/descriptions/<batch>.json for every new id
  python tools/build_corpus.py

    python tools/ingest_new.py [folder]     (default E:\\Downloads\\UI)
"""
import hashlib
import json
import os
import sys

ROOT = r"E:\Stormy"
META = os.path.join(ROOT, "_work", "meta")
SRC_DEFAULT = r"E:\Downloads\UI"

IMG_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".avif", ".heic"}
VID_EXT = {".mp4", ".webm", ".mov", ".mkv", ".avi"}


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
    src = sys.argv[1] if len(sys.argv) > 1 else SRC_DEFAULT
    if not os.path.isdir(src):
        raise SystemExit(f"no such folder: {src}")

    with open(os.path.join(META, "inventory.json"), encoding="utf-8") as fh:
        inv = json.load(fh)

    known_paths = {r["path"] for r in inv["images"] + inv["videos"]}
    known_md5 = {}
    for r in inv["images"] + inv["videos"]:
        try:
            known_md5[md5(r["path"])] = r["id"]
        except OSError:
            pass

    found = []
    for f in sorted(os.listdir(src)):
        p = os.path.join(src, f)
        if not os.path.isfile(p):
            continue
        ext = os.path.splitext(f)[1].lower()
        if ext in IMG_EXT or ext in VID_EXT:
            found.append((p, f, ext))
    found.sort(key=lambda t: (os.stat(t[0]).st_mtime, t[1]))

    new_imgs, new_vids, skipped = [], [], []
    batch_md5 = {}
    for p, f, ext in found:
        if p in known_paths:
            skipped.append((f, "already inventoried"))
            continue
        digest = md5(p)
        if digest in known_md5:
            skipped.append((f, f"content duplicate of {known_md5[digest]}"))
            continue
        if digest in batch_md5:
            skipped.append((f, f"content duplicate of {batch_md5[digest]}"))
            continue
        batch_md5[digest] = f
        st = os.stat(p)
        rec = {"path": p, "name": f,
               "rel": os.path.relpath(p, r"E:\Downloads"),
               "ext": ext, "size": st.st_size, "mtime": st.st_mtime}
        (new_imgs if ext in IMG_EXT else new_vids).append(rec)

    def next_ids(prefix, count):
        highest = 0
        for r in inv["images"] + inv["videos"]:
            if r["id"].startswith(prefix + "-"):
                highest = max(highest, int(r["id"].split("-")[1]))
        return ["%s-%04d" % (prefix, highest + i + 1) for i in range(count)]

    for rec, iid in zip(new_imgs, next_ids("IMG", len(new_imgs))):
        rec["id"] = iid
        inv["images"].append(rec)
    for rec, vid in zip(new_vids, next_ids("VID", len(new_vids))):
        rec["id"] = vid
        inv["videos"].append(rec)

    if not new_imgs and not new_vids:
        print("nothing new to ingest")
        for f, why in skipped:
            print("  skip", f, "-", why)
        return

    with open(os.path.join(META, "inventory.json"), "w", encoding="utf-8") as fh:
        json.dump(inv, fh, indent=1)

    tri = json.load(open(os.path.join(META, "image_triage.json"), encoding="utf-8"))
    keep_ids = {k["id"] for k in tri["keep"]}
    for rec in new_imgs:
        if rec["id"] not in keep_ids:
            tri["keep"].append({"id": rec["id"], "path": rec["path"], "name": rec["name"],
                                "category": "unclassified",
                                "size": rec["size"], "mtime": rec["mtime"]})
    with open(os.path.join(META, "image_triage.json"), "w", encoding="utf-8") as fh:
        json.dump(tri, fh, indent=1)
    with open(os.path.join(META, "keep_images.txt"), "w", encoding="utf-8") as fh:
        for k in tri["keep"]:
            fh.write(k["id"] + "\n")

    if new_vids:
        vb = json.load(open(os.path.join(META, "videos_B.json"), encoding="utf-8"))
        have = {x["id"] for x in vb["items"]}
        for rec in new_vids:
            if rec["id"] not in have:
                vb["items"].append({"id": rec["id"], "relevant": True,
                                    "reason": "new UI batch %s" % os.path.basename(os.path.normpath(src))})
        with open(os.path.join(META, "videos_B.json"), "w", encoding="utf-8") as fh:
            json.dump(vb, fh, indent=1)

    print("new images:", [r["id"] for r in new_imgs])
    print("new videos:", [r["id"] for r in new_vids])
    for f, why in skipped:
        print("  skip", f, "-", why)


if __name__ == "__main__":
    main()
