"""Shared helpers for the originals generators: icons, frames, and screen() which writes a screen file with its metadata."""
import json, os
OUT = os.path.join(os.path.dirname(__file__), '..', 'screens')
I = {
 'home':'<path d="M3.5 9 10 3.5 16.5 9v7.5h-13z"/>','grid':'<rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="11" y="3" width="6" height="6" rx="1.5"/><rect x="3" y="11" width="6" height="6" rx="1.5"/><rect x="11" y="11" width="6" height="6" rx="1.5"/>',
 'chart':'<path d="M3 16 8 10l3 3 6-8"/>','user':'<circle cx="10" cy="7" r="3.5"/><path d="M3.5 17a6.5 6.5 0 0 1 13 0"/>','bell':'<path d="M5 14V9a5 5 0 0 1 10 0v5l1.5 1.5h-13zM8.5 17.5h3"/>',
 'search':'<circle cx="9" cy="9" r="5.5"/><path d="m13.2 13.2 3.8 3.8"/>','plus':'<path d="M10 4v12M4 10h12"/>','send':'<path d="M5 15 15 5M8 5h7v7"/>','recv':'<path d="M15 5 5 15M12 15H5V8"/>',
 'swap':'<path d="M4 7h11l-3-3M16 13H5l3 3"/>','back':'<path d="m12 4-6 6 6 6"/>','more':'<circle cx="5" cy="10" r="1.2"/><circle cx="10" cy="10" r="1.2"/><circle cx="15" cy="10" r="1.2"/>',
 'chev':'<path d="m8 5 5 5-5 5"/>','check':'<path d="m5 10.5 3 3 7-7"/>','moon':'<path d="M15.5 12.3A6.5 6.5 0 0 1 7.7 4.5a6.5 6.5 0 1 0 7.8 7.8Z"/>','lock':'<rect x="4.5" y="9" width="11" height="8" rx="2"/><path d="M7 9V6.5a3 3 0 0 1 6 0V9"/>',
 'mail':'<rect x="3" y="5" width="14" height="10" rx="2"/><path d="m3.5 6 6.5 5 6.5-5"/>','key':'<circle cx="7" cy="10" r="3.5"/><path d="M10.5 10H17M14.5 10v3"/>','globe':'<circle cx="10" cy="10" r="7"/><path d="M3 10h14M10 3c2.2 2.4 2.2 11.6 0 14M10 3c-2.2 2.4-2.2 11.6 0 14"/>',
 'mic':'<rect x="7.5" y="3" width="5" height="9" rx="2.5"/><path d="M5 10a5 5 0 0 0 10 0M10 15v2"/>','clip':'<path d="m14 9-5 5a2.5 2.5 0 0 1-3.5-3.5l6-6a1.7 1.7 0 0 1 2.4 2.4l-6 6"/>','spark':'<path d="M10 3v4M10 13v4M3 10h4M13 10h4M5.5 5.5l2 2M12.5 12.5l2 2M5.5 14.5l2-2M12.5 7.5l2-2"/>',
 'bag':'<path d="M4.5 7h11l-1 10h-9zM7.5 7V6a2.5 2.5 0 0 1 5 0v1"/>','heart':'<path d="M10 16s-6-3.6-6-8a3.5 3.5 0 0 1 6-2.4A3.5 3.5 0 0 1 16 8c0 4.4-6 8-6 8Z"/>','trash':'<path d="M4 6h12M8 6V4h4v2M5.5 6l1 10h7l1-10"/>',
 'filter':'<path d="M3 5h14M6 10h8M8.5 15h3"/>','star':'<path d="m10 2.8 2.1 4.3 4.7.7-3.4 3.3.8 4.7L10 13.6l-4.2 2.2.8-4.7-3.4-3.3 4.7-.7z"/>','cog':'<circle cx="10" cy="10" r="2.5"/><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4"/>',
 'doc':'<path d="M5 3h7l3 3v11H5z"/><path d="M12 3v3h3M8 10h5M8 13h5"/>','inbox':'<path d="M3 11h4l1.5 2h3L13 11h4M3 11l2-6h10l2 6v5H3z"/>',
}
def ic(n, cls='i'): return f'<svg class="{cls}" viewBox="0 0 20 20" aria-hidden="true">{I[n]}</svg>'
def tabbar(on): return '<nav class="tabbar">'+''.join(f'<span class="t {"on" if k==on else ""}">{ic(k)}{l}</span>' for k,l in [('home','Home'),('chart','Insights'),('inbox','Inbox'),('user','Profile')])+'</nav>'
HEAD = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} · UI Hall original</title><link rel="stylesheet" href="../kit/kit.css"><style>{css}</style></head>'
def phone(body, extra_class=''):
    return f'<body class="present"><div class="device {extra_class}"><div class="island"></div><div class="status" data-status></div><div class="scr">{body}</div><div class="home-ind"></div></div><script src="../kit/theme.js"></script></body></html>'
def desk(body): return f'<body class="present"><div class="desk">{body}</div><script src="../kit/theme.js"></script></body></html>'
def canvas(body): return f'<body class="present"><div class="sheet-canvas">{body}</div><script src="../kit/theme.js"></script></body></html>'
SCREENS = []
def screen(slug, meta, html, css=''):
    meta['slug'] = slug
    # tag what the markup actually contains, so patterns find their evidence
    if 'class="tabbar' in html and 'bottom-nav' not in meta.get('tags', []): meta['tags'] = meta.get('tags', []) + ['bottom-nav']
    SCREENS.append(meta)
    doc = HEAD.format(title=meta['title'], css=css) + {'phone': phone, 'desktop': desk, 'canvas': canvas}[meta['viewport']](html.replace('&quot;', '"'))
    doc = doc.replace('<head>', '<head><script type="application/json" id="meta">' + json.dumps(meta) + '</script>', 1)
    open(os.path.join(OUT, slug + '.html'), 'w').write(doc)

