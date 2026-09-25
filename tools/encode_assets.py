"""Encode the keeper assets into UI Hall web assets.

Source of truth stays in E:\\Downloads. This only writes derivatives:

  ui-hall/assets/img/<ID>.webp   images, longest edge 1400, quality 82
  ui-hall/assets/vid/<ID>.webm   VP8 clips, capped width, muted, no audio
  ui-hall/assets/vid/<ID>.webp   poster frames
  ui-hall/assets/thumb/<ID>.webp small grid thumbnails, longest edge 520

Video re-encoding uses OpenCV's bundled VP8 encoder -- the Playwright ffmpeg
build ships only mjpeg/vp8, and a python-av wheel is a 40 MB download, so VP8
straight out of OpenCV is the pragmatic path (all modern browsers play it).
"""
import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor

import cv2
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
META = os.path.join(ROOT, "_work", "meta")
OUT = os.path.join(ROOT, "ui-hall", "assets")

IMG_MAX = 1400
THUMB_MAX = 520
IMGC_Q = 82
THUMB_Q = 76

VID_W = 720
VID_Q = 30
VID_FPS = 24
CLIP_MAX_S = 20.0

IMG_EXT = (".jpg", ".jpeg", ".png", ".webp", ".bmp", ".avif")


def die(*a):
    print(*a, file=sys.stderr)
    raise SystemExit(1)


def dominant_colors(bgr, k=6):
    """k-means dominant colours, returned as #RRGGBB hex, on webp-relevant scale.

    Downsamples first: 306 images x full-res k-means is needless work, and the
    palette of a screenshot does not change at 200px.
    """
    small = cv2.resize(bgr, (160, 160), interpolation=cv2.INTER_AREA)
    data = small.reshape(-1, 3).astype(np.float32)
    # drop near-black/near-white UI chrome only if it dominates hugely
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centers = cv2.kmeans(data, k, None, crit, 4, cv2.KMEANS_PP_CENTERS)
    counts = np.bincount(labels.flatten(), minlength=k)
    order = np.argsort(-counts)
    out = []
    total = counts.sum()
    for i in order:
        b, g, r = [int(round(v)) for v in centers[i]]
        out.append({"hex": "#%02X%02X%02X" % (r, g, b), "pct": round(100.0 * counts[i] / total, 1)})
    return out


def encode_image(rec):
    src = rec["path"]
    iid = rec["id"]
    try:
        im = cv2.imread(src, cv2.IMREAD_COLOR)
        if im is None:
            im = cv2.imdecode(np.fromfile(src, dtype=np.uint8), cv2.IMREAD_COLOR)
    except Exception as exc:  # noqa: BLE001
        return {"id": iid, "error": "read:" + type(exc).__name__}
    if im is None:
        return {"id": iid, "error": "unreadable"}

    h, w = im.shape[:2]
    pal = dominant_colors(im)

    def resize_max(img, m):
        hh, ww = img.shape[:2]
        s = m / max(hh, ww)
        if s >= 1.0:
            return img
        return cv2.resize(img, (max(1, int(ww * s)), max(1, int(hh * s))), interpolation=cv2.INTER_AREA)

    big = resize_max(im, IMG_MAX)
    cv2.imwrite(os.path.join(OUT, "img", iid + ".webp"), big,
                [cv2.IMWRITE_WEBP_QUALITY, IMGC_Q])
    small = resize_max(im, THUMB_MAX)
    cv2.imwrite(os.path.join(OUT, "thumb", iid + ".webp"), small,
                [cv2.IMWRITE_WEBP_QUALITY, THUMB_Q])

    return {
        "id": iid,
        "w": w,
        "h": h,
        "orientation": "portrait" if h > w else ("landscape" if w > h else "square"),
        "aspect": round(w / h, 4) if h else None,
        "palette_measured": pal,
        "bytes_src": rec["size"],
    }


def encode_video(rec, motion):
    vid = rec["id"]
    src = rec["path"]
    poster = os.path.join(ROOT, "_work", "vidframes", vid + ".jpg")
    out_poster = os.path.join(OUT, "vid", vid + ".webp")
    out_clip = os.path.join(OUT, "vid", vid + ".webm")

    cap = cv2.VideoCapture(src)
    if not cap.isOpened():
        return {"id": vid, "error": "unreadable"}
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    fps = cap.get(cv2.CAP_PROP_FPS) or 0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    dur = (n / fps) if fps else 0

    # --- poster: prefer the existing middle-frame poster, else grab one now
    ok, frame = cap.read()
    if ok and frame is not None:
        ph = frame
        if n > 0:
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(n * 0.5))
            ok2, f2 = cap.read()
            if ok2 and f2 is not None:
                ph = f2
    else:
        cap.release()
        return {"id": vid, "error": "no-frames"}
    ph = ph.copy()

    def resize_max(img, m):
        hh, ww = img.shape[:2]
        s = m / max(hh, ww)
        if s >= 1.0:
            return img
        return cv2.resize(img, (max(1, int(ww * s)), max(1, int(hh * s))), interpolation=cv2.INTER_AREA)

    cv2.imwrite(out_poster, resize_max(ph, IMG_MAX), [cv2.IMWRITE_WEBP_QUALITY, 84])
    cv2.imwrite(os.path.join(OUT, "thumb", vid + ".webp"), resize_max(ph, THUMB_MAX),
                [cv2.IMWRITE_WEBP_QUALITY, THUMB_Q])

    med = (motion or {}).get("median")

    # --- clip: only worth shipping when there is real movement
    clip = None
    if med is None or med >= 2.0:
        out_w = min(w, VID_W)
        out_h = int(round(h * (out_w / w))) if w else h
        out_w -= out_w % 2
        out_h -= out_h % 2
        writer = cv2.VideoWriter(out_clip, cv2.VideoWriter_fourcc(*"VP80"),
                                 VID_FPS, (out_w, out_h))
        if writer.isOpened():
            step = max(1.0, (fps / VID_FPS)) if fps else 1.0
            max_frames = int(CLIP_MAX_S * VID_FPS) if dur > CLIP_MAX_S else 10 ** 9
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            acc, written = 0.0, 0
            while written < max_frames:
                ok, fr = cap.read()
                if not ok or fr is None:
                    break
                acc += 1.0
                if acc < step:
                    continue
                acc -= step
                writer.write(cv2.resize(fr, (out_w, out_h), interpolation=cv2.INTER_AREA))
                written += 1
            writer.release()
            clip = {"w": out_w, "h": out_h, "fps": VID_FPS,
                    "duration_s": round(written / VID_FPS, 1),
                    "bytes": os.path.getsize(out_clip)}
        else:
            writer.release()
    cap.release()

    if clip is None:
        # static clip: drop it, the poster already carries the design
        clip = None

    return {
        "id": vid,
        "w": w,
        "h": h,
        "fps": round(fps, 2),
        "frames": n,
        "duration_s": round(dur, 1),
        "orientation": "portrait" if h > w else ("landscape" if w > h else "square"),
        "aspect": round(w / h, 4) if h else None,
        "palette_measured": dominant_colors(ph),
        "clip": clip,
        "bytes_src": rec["size"],
    }


def encode_video_pair(pair):
    """ProcessPool entry point -- must be a module-level function to be picklable."""
    return encode_video(*pair)


def main():
    for sub in ("img", "vid", "thumb"):
        os.makedirs(os.path.join(OUT, sub), exist_ok=True)

    which = sys.argv[1] if len(sys.argv) > 1 else "all"

    with open(os.path.join(META, "inventory.json"), encoding="utf-8") as fh:
        inv = json.load(fh)
    with open(os.path.join(META, "image_triage.json"), encoding="utf-8") as fh:
        tri = json.load(fh)
    keep_ids = {r["id"] for r in tri["keep"]}
    with open(os.path.join(META, "motion.json"), encoding="utf-8") as fh:
        motion = json.load(fh)
    vmeta = {x["id"]: x for x in (
        json.load(open(os.path.join(META, "videos_A.json"), encoding="utf-8"))["items"] +
        json.load(open(os.path.join(META, "videos_B.json"), encoding="utf-8"))["items"])}

    images = [r for r in inv["images"] if r["id"] in keep_ids]
    videos = [r for r in inv["videos"] if vmeta.get(r["id"], {}).get("relevant")]

    # Merge into any existing report rather than replacing it. Each pass only
    # knows about the media it touched, so writing a partial report would
    # silently drop the other pass's measurements.
    report_path = os.path.join(META, "encode_report.json")
    previous = {"images": [], "videos": []}
    if os.path.exists(report_path):
        try:
            with open(report_path, encoding="utf-8") as fh:
                loaded = json.load(fh)
            for k in ("images", "videos"):
                if isinstance(loaded.get(k), list):
                    previous[k] = loaded[k]
        except (OSError, json.JSONDecodeError):
            pass

    report = {"images": previous["images"], "videos": previous["videos"]}
    if which in ("all", "images"):
        done = {r["id"] for r in report["images"] if "error" not in r}
        todo = [r for r in images if r["id"] not in done]
        fresh = []
        with ProcessPoolExecutor(max_workers=8) as ex:
            for res in ex.map(encode_image, todo, chunksize=3):
                fresh.append(res)
        keep_old = [r for r in report["images"] if r["id"] not in {f["id"] for f in fresh}]
        report["images"] = sorted(keep_old + fresh, key=lambda r: r["id"])
        bad = [r for r in fresh if "error" in r]
        print("images encoded this pass:", len(fresh) - len(bad), "failed:", len(bad),
              "| total in report:", len(report["images"]))
        for b in bad[:10]:
            print("   ", b)
    if which in ("all", "videos"):
        done = {r["id"] for r in report["videos"] if "error" not in r}
        payload = [(r, motion.get(r["id"])) for r in videos if r["id"] not in done]
        fresh = []
        with ProcessPoolExecutor(max_workers=6) as ex:
            for res in ex.map(encode_video_pair, payload, chunksize=2):
                fresh.append(res)
        keep_old = [r for r in report["videos"] if r["id"] not in {f["id"] for f in fresh}]
        report["videos"] = sorted(keep_old + fresh, key=lambda r: r["id"])
        bad = [r for r in fresh if "error" in r]
        clips = [r for r in report["videos"] if r.get("clip")]
        print("videos encoded this pass:", len(fresh) - len(bad), "failed:", len(bad),
              "| with clip:", len(clips), "| total in report:", len(report["videos"]))
        for b in bad[:10]:
            print("   ", b)

    with open(report_path, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=1)
    print("wrote", report_path)


if __name__ == "__main__":
    main()
