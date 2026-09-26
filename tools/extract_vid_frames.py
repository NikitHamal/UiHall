"""Extract a representative poster frame (+ strip) from every video.

Uses OpenCV's bundled decoder, so no system ffmpeg is required.
Writes to _work/vidframes/<ID>.jpg  (poster) and _work/vidstrips/<ID>.jpg (6-up strip)
"""
import json
import os
import sys
import traceback
from concurrent.futures import ProcessPoolExecutor

import cv2
import numpy as np

META = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "_work", "meta", "inventory.json")
POSTER_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "_work", "vidframes")
STRIP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "_work", "vidstrips")
POSTER_W = 720


def sample_frames(path, n):
    """Return up to n evenly spaced BGR frames."""
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        return []
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    frames = []
    if total > 0:
        idxs = [int(total * (k + 0.5) / n) for k in range(n)]
        for i in idxs:
            cap.set(cv2.CAP_PROP_POS_FRAMES, min(i, max(total - 1, 0)))
            ok, fr = cap.read()
            if ok and fr is not None:
                frames.append(fr)
    if not frames:
        # fall back to sequential reads
        for _ in range(60):
            ok, fr = cap.read()
            if not ok:
                break
            frames.append(fr)
        if frames:
            step = max(1, len(frames) // n)
            frames = frames[::step][:n]
    cap.release()
    return frames


def fit(img, box_w, box_h):
    h, w = img.shape[:2]
    if h == 0 or w == 0:
        return img
    scale = min(box_w / w, box_h / h)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    return cv2.resize(img, (nw, nh), interpolation=cv2.INTER_AREA)


def work(rec):
    vid = rec["id"]
    out_poster = os.path.join(POSTER_DIR, vid + ".jpg")
    out_strip = os.path.join(STRIP_DIR, vid + ".jpg")
    if os.path.exists(out_poster) and os.path.exists(out_strip):
        return vid, "cached"
    try:
        frames = sample_frames(rec["path"], 6)
        if not frames:
            return vid, "no-frames"
        h, w = frames[0].shape[:2]
        meta = {
            "id": vid,
            "w": w,
            "h": h,
            "orientation": "portrait" if h > w else ("landscape" if w > h else "square"),
            "frames": len(frames),
        }
        # poster = middle frame
        poster = fit(frames[len(frames) // 2], POSTER_W, POSTER_W * 3)
        cv2.imwrite(out_poster, poster, [cv2.IMWRITE_JPEG_QUALITY, 88])

        # strip = 6 frames side by side, each 300 wide
        cell_w = 300
        cells = [fit(f, cell_w, cell_w * 3) for f in frames]
        strip_h = max(c.shape[0] for c in cells)
        strip = np.full((strip_h, cell_w * len(cells), 3), 24, np.uint8)
        for i, c in enumerate(cells):
            strip[0:c.shape[0], i * cell_w:i * cell_w + c.shape[1]] = c
        cv2.imwrite(out_strip, strip, [cv2.IMWRITE_JPEG_QUALITY, 85])
        return vid, meta
    except Exception:
        return vid, "error: " + traceback.format_exc(limit=1)


def main():
    os.makedirs(POSTER_DIR, exist_ok=True)
    os.makedirs(STRIP_DIR, exist_ok=True)
    with open(META, encoding="utf-8") as fh:
        inv = json.load(fh)
    vids = inv["videos"]
    only = sys.argv[1:] if len(sys.argv) > 1 else None
    if only:
        vids = [v for v in vids if v["id"] in only]
    ok = 0
    bad = []
    results = {}
    with ProcessPoolExecutor(max_workers=8) as ex:
        for vid, res in ex.map(work, vids, chunksize=4):
            if isinstance(res, dict):
                ok += 1
                results[vid] = res
            else:
                bad.append((vid, res))
    with open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "_work", "meta", "video_meta.json"), "w", encoding="utf-8") as fh:
        json.dump(results, fh, indent=1)
    print("ok:", ok, "problem:", len(bad))
    for b in bad[:20]:
        print("  ", b)


if __name__ == "__main__":
    main()
