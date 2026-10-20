"""Turn rendered originals into corpus assets.

  node tools/render_originals.mjs /tmp/orig_png      # screens × themes → PNG
  python3 tools/build_originals.py /tmp/orig_png      # → assets/img|thumb/ORG-*.webp + data/corpus.json

Ids are stable: originals/manifest.json maps "<slug>@<theme>" → ORG-nnnn. Descriptions come
from each screen's own metadata (written alongside its code, so they cannot drift from it);
palettes are measured from the rendered pixels exactly like every collected reference.
"""
import glob, json, os, re, sys
from collections import Counter
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PNG = sys.argv[1] if len(sys.argv) > 1 else '/tmp/orig_png'
CORPUS = os.path.join(ROOT, 'data', 'corpus.json')
MANIFEST = os.path.join(ROOT, 'originals', 'manifest.json')
THEMES = json.load(open(os.path.join(ROOT, 'originals', 'kit', 'themes.json')))


def palette(img, k=6, iters=12):
    im = img.convert('RGB'); im.thumbnail((160, 160))
    px = np.asarray(im, dtype=np.float32).reshape(-1, 3)
    rng = np.random.default_rng(7)
    c = px[rng.choice(len(px), k, replace=False)]
    for _ in range(iters):
        lab = np.argmin(((px[:, None, :] - c[None]) ** 2).sum(-1), 1)
        for j in range(k):
            if (lab == j).any(): c[j] = px[lab == j].mean(0)
    lab = np.argmin(((px[:, None, :] - c[None]) ** 2).sum(-1), 1)
    cnt = np.bincount(lab, minlength=k) / len(lab) * 100
    out = sorted(({'hex': '#%02X%02X%02X' % tuple(int(round(v)) for v in c[j]), 'pct': round(float(cnt[j]), 1)} for j in range(k) if cnt[j] > 0), key=lambda d: -d['pct'])
    merged = []
    for d in out:
        if any(m['hex'] == d['hex'] for m in merged): continue
        merged.append(d)
    return merged


def meta_of(slug):
    html = open(os.path.join(ROOT, 'originals', 'screens', slug + '.html')).read()
    return json.loads(re.search(r'<script type="application/json" id="meta">(.*?)</script>', html, re.S).group(1))


def main():
    c = json.load(open(CORPUS))
    man = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}
    nxt = max([int(v.split('-')[1]) for v in man.values()] + [0]) + 1
    by_id = {a['id']: a for a in c['assets'] if not a.get('original')}
    # re-expand previously merged originals so unchanged themes survive a partial rebuild
    for a in c['assets']:
        if a.get('original') and a.get('variants'):
            for th, v in a['variants'].items():
                key = a['live'].split('/')[-1][:-5] + '@' + th
                vid = man.get(key)
                if vid: by_id[vid] = {**a, 'id': vid, 'theme': th, 'src': v['src'], 'thumb': v['thumb'], 'palette': v['palette'], 'palette_detail': v['palette_detail'], 'source_html': a['live'] + '?theme=' + th}
        elif a.get('original'):
            by_id[a['id']] = a
    made = 0
    for f in sorted(glob.glob(os.path.join(PNG, '*.png'))):
        key = os.path.basename(f)[:-4]
        slug, theme = key.split('@')
        if key not in man:
            man[key] = 'ORG-%04d' % nxt; nxt += 1
        oid = man[key]
        meta, t = meta_of(slug), THEMES[theme]
        img = Image.open(f).convert('RGB')
        full = img.copy(); full.thumbnail((1600, 1600), Image.LANCZOS)
        full.save(os.path.join(ROOT, 'assets', 'img', oid + '.webp'), quality=86, method=6)
        th = img.copy(); th.thumbnail((560, 560), Image.LANCZOS)
        th.save(os.path.join(ROOT, 'assets', 'thumb', oid + '.webp'), quality=80, method=6)
        pal = palette(img)
        w, h = full.size
        style = list(dict.fromkeys(meta['style'] + ['dark-mode' if t['scheme'] == 'dark' else 'light-mode']))
        a = {
            'id': oid, 'kind': 'image', 'category': meta['category'], 'type': meta['type'],
            'title': f"{meta['title']} · {t['name']}",
            'description': meta['desc'].format(words=t['words']),
            'roles': meta['roles'], 'style': style, 'tags': meta['tags'],
            'palette': [p['hex'] for p in pal], 'palette_detail': pal,
            'w': w, 'h': h, 'orientation': 'portrait' if h > w else 'landscape', 'aspect': round(w / h, 4),
            'synthetic': False, 'original': True, 'license': 'MIT',
            'source_html': f'originals/screens/{slug}.html?theme={theme}', 'theme': theme,
            'quality': 'Rendered from code at 2×; every label legible.',
            'src': f'assets/img/{oid}.webp', 'thumb': f'assets/thumb/{oid}.webp',
        }
        by_id[oid] = a
        made += 1
    # Merge theme renders: one asset per screen, its themes as variants (the first theme's id is canonical).
    refs = [x for x in c['assets'] if not x.get('original')]
    rendered = [x for x in by_id.values() if x.get('original') and x.get('theme')]
    groups = {}
    for x in rendered:
        slug = x['source_html'].split('/')[-1].split('.')[0]
        groups.setdefault(slug, []).append(x)
    order = list(THEMES)
    merged = []
    for slug, xs in groups.items():
        xs.sort(key=lambda x: order.index(x['theme']))
        base = dict(xs[0])
        meta = meta_of(slug)
        base['title'] = meta['title']
        base['description'] = meta['desc'].format(words='the kit tokens — it ships in four themes (' + ', '.join(THEMES[x['theme']]['name'] for x in xs) + ') from one source file')
        base['style'] = [s for s in meta['style']]
        base['tags'], base['roles'] = list(meta['tags']), list(meta['roles'])
        base['category'], base['type'] = meta['category'], meta['type']
        base['live'] = f'originals/screens/{slug}.html'
        base['viewport'] = meta['viewport']
        base['themes'] = [x['theme'] for x in xs]
        base['variants'] = {x['theme']: {'src': x['src'], 'thumb': x['thumb'], 'palette': x['palette'], 'palette_detail': x['palette_detail'], 'scheme': THEMES[x['theme']]['scheme'], 'name': THEMES[x['theme']]['name']} for x in xs}
        base['quality'] = 'Rendered from code at 2×; open it live to interact and switch themes.'
        base.pop('theme', None)
        base['source_html'] = base['live']
        merged.append(base)
    merged.sort(key=lambda x: x['id'])
    # the kit's real tokens per theme — exact colour roles for every original (the palette stays measured from pixels)
    c['themes'] = {k: {'name': t['name'], 'scheme': t['scheme'], 'roles': {'background': t['bg'], 'surface': t['surface'], 'text': t['text'], 'muted': t['muted'],
                   'accent': t['accent'], 'on_accent': t['onAccent'], 'scheme': t['scheme']}} for k, t in THEMES.items()}
    c['assets'] = merged + refs
    assets = c['assets']

    def recount(key, field, multi):
        n = Counter()
        for x in assets:
            for v in (x.get(field) or []) if multi else [x.get(field)]: n[v] += 1
        old = {x['id']: x for x in c[key]}
        c[key] = [{**old.get(k, {'id': k, 'label': k}), 'count': v} for k, v in n.most_common() if k]
    for args in (('categories', 'category', False), ('types', 'type', False), ('roles', 'roles', True), ('styles', 'style', True), ('tags', 'tags', True)):
        recount(*args)
    c['totals'] = {
        'assets': len(assets), 'images': sum(x['kind'] == 'image' for x in assets), 'videos': sum(x['kind'] == 'video' for x in assets),
        'clips': sum(bool(x.get('clip')) for x in assets), 'described': sum(bool(x.get('description')) for x in assets),
        'originals': sum(bool(x.get('original')) for x in assets),
    }
    json.dump(man, open(MANIFEST, 'w'), indent=1, sort_keys=True)
    json.dump(c, open(CORPUS, 'w'), ensure_ascii=False, separators=(',', ':'))
    print('originals built', made, 'totals', c['totals'])


if __name__ == '__main__':
    main()
