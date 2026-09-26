"""Measure how much each collected video actually moves.

Many of these clips are static ad screenshots animated only by a fake
in-progress screen-recording bar, so "it is a video" does not imply "it shows a
transition". This samples frames and reports mean absolute frame difference so
the catalogue can tell real motion demos apart from stills-with-chrome.
"""
import json
import os
import statistics
import sys
from concurrent.futures import ProcessPoolExecutor

import cv2
import numpy as np

META = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "_work", "meta")
OUT = os.path.join(META, "motion.json")
SAMPLE = 6
SIZE = 160


def motion_of(path):
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        return None
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    fps = cap.get(cv2.CAP_PROP_FPS) or 0
    frames = []
    if n > 0:
        for k in range(SAMPLE):
            cap.set(cv2.CAP_PROP_POS_FRAMES, min(int(n * k / SAMPLE), max(n - 1, 0)))
            ok, f = cap.read()
            if ok and f is not None:
                frames.append(cv2.resize(f, (SIZE, SIZE)))
    cap.release()
    if len(frames) < 2:
        return None
    diffs = [
        float(np.abs(frames[i].astype(np.int16) - frames[i + 1].astype(np.int16)).mean())
        for i in range(len(frames) - 1)
    ]
    return {
        "median": round(statistics.median(diffs), 2),
        "max": round(max(diffs), 2),
        "duration_s": round(n / fps, 1) if fps else None,
        "fps": round(fps, 2),
        "frames": n,
    }


def work(rec):
    try:
        return rec["id"], motion_of(rec["path"])
    except Exception as exc:  # noqa: BLE001
        return rec["id"], {"error": type(exc).__name__}


def main():
    with open(os.path.join(META, "inventory.json"), encoding="utf-8") as fh:
        inv = json.load(fh)
    vids = inv["videos"]
    only = set(sys.argv[1:])
    if only:
        vids = [v for v in vids if v["id"] in only]

    results = {}
    with ProcessPoolExecutor(max_workers=8) as ex:
        for vid, res in ex.map(work, vids, chunksize=2):
            if res:
                results[vid] = res
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(results, fh, indent=1)

    vals = [r["median"] for r in results.values() if "median" in r]
    still = [k for k, r in results.items() if r.get("median") is not None and r["median"] < 1.0]
    real = [k for k, r in results.items() if r.get("median") is not None and r["median"] >= 4.0]
    print("probed:", len(results))
    print("median motion across collection:", round(statistics.median(vals), 2))
    print("near-static (<1.0):", len(still), " moving (>=4.0):", len(real))
    print("wrote", OUT)


if __name__ == "__main__":
    main()
