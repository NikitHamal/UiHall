"""Generated originals: 16 domains × (10 phone + 4 desktop) archetypes.
Each screen is composed from domains.py, so its write-up is generated from
exactly the content it renders. Run: python3 originals/src/gen.py"""
from kitgen import *
from domains import D

I.update({
 'flame': '<path d="M10 17a5 5 0 0 0 5-5c0-3-2.5-4.5-3-8-2 1.5-4 4-4 6.5-1-1-1.5-2-1.5-2C5.5 10 5 11 5 12a5 5 0 0 0 5 5Z"/>',
 'plane': '<path d="M2.5 11 17 5.5l-3 9-3.5-2.5L8 15v-4z"/>', 'play': '<path d="M7 4.5v11l9-5.5z"/>',
 'book': '<path d="M4 4h5a2 2 0 0 1 2 2v10a1.5 1.5 0 0 0-1.5-1.5H4zM16 4h-5"/><path d="M16 4v10.5h-5"/>',
 'bolt': '<path d="M11 2 4 11h5l-1 7 7-9h-5z"/>', 'card': '<rect x="2.5" y="5" width="15" height="10" rx="2"/><path d="M2.5 8.5h15"/>',
 'map': '<path d="M3 5.5 7.5 4l5 1.5L17 4v10.5L12.5 16l-5-1.5L3 16z"/><path d="M7.5 4v10.5M12.5 5.5V16"/>',
 'leaf': '<path d="M4 16c0-7 5-11 12-12 0 7-4 12-11 12M4 16l7-7"/>', 'cal': '<rect x="3" y="4.5" width="14" height="12" rx="2"/><path d="M3 8.5h14M7 3v3M13 3v3"/>',
 'edit': '<path d="M4 16h3l8-8-3-3-8 8z"/>', 'clock': '<circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2"/>', 'grid': '<rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="11" y="3" width="6" height="6" rx="1.5"/><rect x="3" y="11" width="6" height="6" rx="1.5"/><rect x="11" y="11" width="6" height="6" rx="1.5"/>',
})

CUR = {'icon': 'star'}

def art(seed, h=200, r=24, extra=''):
    """Domain artwork in five styles, all from the theme tokens; the domain icon anchors rings/orbs/grid styles."""
    st = seed % 5
    bg = f'linear-gradient(160deg,color-mix(in oklab,var(--accent2) 55%,var(--surface2)),color-mix(in oklab,var(--accent) {35 + seed % 30}%,var(--surface2)))'
    glyph = (f'<g transform="translate(150 100)"><circle r="34" fill="var(--bg)" opacity=".92"/><g transform="translate(-16 -16) scale(1.6)" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{I.get(CUR["icon"], I["star"])}</g></g>')
    if st == 0:
        svg = (f'<circle cx="{60 + (seed * 37) % 100 * 1.8:.0f}" cy="{50 + (seed * 13) % 60}" r="{38 + seed % 20}" fill="rgba(255,255,255,.35)"/>'
               f'<path d="M0 {140 + seed % 20} Q 80 {100 + (seed * 7) % 40} 160 135 T 300 {120 + seed % 30} V200 H0Z" fill="rgba(0,0,0,.14)"/><path d="M0 165 Q 100 {145 + seed % 25} 200 170 T 300 160 V200 H0Z" fill="rgba(0,0,0,.2)"/>')
    elif st == 1:
        svg = ''.join(f'<circle cx="150" cy="100" r="{40 + k * 26}" fill="none" stroke="rgba(255,255,255,{.42 - k * .08:.2f})" stroke-width="1.5"/>' for k in range(5)) + f'<circle cx="{150 + 92 * (1 if seed % 2 else -1)}" cy="{70 + seed % 40}" r="7" fill="var(--bg)"/>' + glyph
    elif st == 2:
        svg = ''.join(f'<rect x="{18 + (k % 6) * 46}" y="{14 + (k // 6) * 46}" width="38" height="38" rx="10" fill="rgba(255,255,255,{.5 if k == (seed % 18) else .16})"/>' for k in range(24)) + glyph
    elif st == 3:
        svg = ''.join(f'<path d="M{-100 + k * 60} 220 L{40 + k * 60} -20" stroke="rgba(255,255,255,{.08 + (k % 3) * .06:.2f})" stroke-width="26"/>' for k in range(9)) + f'<circle cx="{90 + seed % 120}" cy="{80 + seed % 40}" r="56" fill="rgba(255,255,255,.28)"/>'
    else:
        svg = (f'<circle cx="110" cy="110" r="70" fill="rgba(255,255,255,.22)"/><circle cx="190" cy="90" r="60" fill="color-mix(in oklab,var(--accent) 60%,transparent)"/>'
               f'<circle cx="160" cy="140" r="40" fill="rgba(0,0,0,.12)"/>' + glyph)
    return (f'<div style="height:{h}px;border-radius:{r}px;position:relative;overflow:hidden;background:{bg};{extra}">'
            f'<svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%">{svg}</svg></div>')

def head(title, right='', back=False):
    return (f'<div class="row">{"<span class=&quot;ico&quot; style=&quot;width:36px;height:36px;border-radius:50%&quot;>" + ic("back") + "</span>" if back else ""}'
            f'<b class="{"h3" if back else "d1"}" style="{"margin:auto" if back else "font-size:30px"}">{title}</b>{"" if back else "<div class=&quot;sp&quot;></div>"}{right}{"<span style=&quot;width:36px&quot;></span>" if back and not right else ""}</div>').replace('&quot;', '"')

def row(t, s, v, k, accent=False):
    return f'<div class="li"><span class="ico {"a" if accent else ""}">{ic(k)}</span><div class="col" style="flex:1;min-width:0"><b style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{t}</b><span class="small" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{s}</span></div><b class="num" style="white-space:nowrap">{v}</b></div>'

# table status vocabulary per domain: (usual, exception)
STATUS = dict(money=('Cleared', 'Pending'), fitness=('Done', 'Planned'), travel=('Booked', 'Saved'), food=('Delivered', 'Saved'), music=('Saved', 'Queued'),
              health=('Taken', 'Due'), learn=('Done', 'Next'), home=('Saved', 'Viewing'), shop=('In stock', 'Low stock'), social=('Following', 'Suggested'),
              tasks=('Open', 'Done'), crypto=('Held', 'Staked'), ride=('Saved', 'Recent'), plants=('Healthy', 'Thirsty'), pets=('Done', 'Upcoming'),
              events=('Going', 'Saved'), news=('Read', 'Saved'), smarthome=('Online', 'Idle'), jobs=('Applied', 'Saved'), invoice=('Paid', 'Overdue'))

def bars(vals, hl=3, hgt=96):
    mx = max(vals) or 1
    return f'<div class="row" style="width:100%;align-items:flex-end;gap:8px;height:{hgt}px">' + ''.join(
        f'<div class="col g4" style="flex:1;align-items:center"><i style="width:100%;height:{max(6, v / mx * (hgt - 20)):.0f}px;border-radius:8px;background:{"var(--accent)" if i == hl else "var(--surface2)"}"></i><span class="small" style="font-size:10.5px">{"MTWTFSS"[i]}</span></div>' for i, v in enumerate(vals)) + '</div>'

def chips(cs, on=0):
    return '<div class="row g8 fade-x" style="overflow:hidden;white-space:nowrap">' + ''.join(f'<span class="pill {"on" if i == on else ""}">{c}</span>' for i, c in enumerate(cs)) + '</div>'

def meta(d, kind, title, roles, style, tags, desc, vp='phone'):
    title = f"{d['area'][0].upper() + d['area'][1:]} {title.split(' ', 1)[1]} · {d['app']}"
    return dict(viewport=vp, title=title, category={'phone': 'mobile-app-ui', 'desktop': 'website'}[vp] if kind not in ('dashboard', 'table') else 'dashboard',
                type='screen', roles=roles, style=style, tags=list(dict.fromkeys(tags + [d['key']] + [w for w in d['area'].replace('&', ' ').replace('-', ' ').split() if len(w) > 2])), desc=desc + ' Built on {words}.')

for n, d in enumerate(D):
    k, app, v = d['key'], d['app'], n % 3
    CUR['icon'] = d['icon']
    H = d['hero']; items = d['items']

    # 1 home ----------------------------------------------------------------
    if v == 0:
        body = (f'<div class="row" style="margin-top:4px"><div class="av"></div><div class="col"><span class="small">Good morning</span><b>{d["profile"][0]}</b></div><div class="sp"></div><div class="ico">{ic("bell")}</div></div>'
                f'<div style="margin-top:22px"><span class="small">{H[0]}</span><div class="big num" style="margin-top:6px">{H[1]}<span class="c">{H[2]}</span></div><span class="small up" style="font-weight:600">{H[3]}</span></div>'
                f'<div class="card" style="margin-top:18px"><div class="row"><b class="h3">{d["chart_label"]}</b><div class="sp"></div><span class="pill">Week</span></div><div style="margin-top:12px">{bars(d["chart"])}</div></div>'
                f'<div class="row" style="margin:18px 0 2px"><b class="h3">Recent</b><div class="sp"></div><span class="small">See all</span></div><div class="list">{"".join(row(*it) for it in items[:3])}</div>' + tabbar('home'))
        desc = f'The home screen of {app}, a {d["area"]} app. A greeting row sits above "{H[0]}" with a hero figure "{H[1]}{H[2]}" and a supporting line "{H[3]}". A card charts "{d["chart_label"].lower()}" as seven bars with Thursday highlighted, then a "Recent" list shows {items[0][0]}, {items[1][0]} and {items[2][0]}, above a floating tab bar. Idea: one hero number, everything else subordinate.'
        tags = ['kpi', 'bar-chart', 'list-row', 'bottom-nav']
    elif v == 1:
        body = (head(app, f'<span class="av s"></span>') + f'<div class="tint" style="margin-top:16px;padding:18px"><span class="small">{H[0]}</span><b class="d1 num" style="display:block;margin-top:4px">{H[1]}{H[2]}</b><span class="small">{H[3]}</span></div>'
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">' + ''.join(f'<div class="card col g4"><span class="small">{a}</span><b class="d2 num" style="font-size:20px">{b}</b><span class="small" style="font-weight:600">{c}</span></div>' for a, b, c in d['kpis']) + '</div>'
                f'<div class="row" style="margin:18px 0 6px"><b class="h3">Up next</b></div><div class="list">{"".join(row(*it) for it in items[:3])}</div>' + tabbar('home'))
        desc = f'A metric-grid home for {app} ({d["area"]}). A tinted hero card shows "{H[0]}: {H[1]}{H[2]}" with "{H[3]}", followed by a 2×2 grid of tiles — {", ".join(f"{a} {b}" for a, b, _ in d["kpis"])} — and an "Up next" list of three rows above the tab bar. Idea: small multiples of equal weight read in one glance.'
        tags = ['metric-tile', 'kpi', 'grid', 'bottom-nav']
    else:
        body = (head(app, f'<div class="ico">{ic("search")}</div>') + f'<div style="margin-top:14px">{chips(d["cats"])}</div>' + art(n, 190, 22, 'margin-top:14px')
                + f'<div class="row" style="margin-top:14px"><div class="col"><span class="small">{H[0]}</span><b class="d2">{H[1]}{H[2]}</b></div><div class="sp"></div><button class="btn btn-sm btn-p">Open</button></div><span class="small">{H[3]}</span>'
                + f'<div class="list" style="margin-top:10px">{"".join(row(*it) for it in items[:3])}</div>' + tabbar('home'))
        desc = f'A visual home for {app} ({d["area"]}). A scrolling chip row ({", ".join(d["cats"][:4])}) leads to a large illustrated feature card, then "{H[0]}: {H[1]}{H[2]}" with an Open button and "{H[3]}", and three list rows above the tab bar. Idea: one featured item carries the mood, the list carries the work.'
        tags = ['chips', 'card', 'illustration', 'bottom-nav']
    screen(f'gen-{k}-home', meta(d, 'home', f'{app} home', ['home', 'dashboard'], ['card-based', 'rounded'], tags, desc), body)

    # 2 list ----------------------------------------------------------------
    if n % 2 == 0:
        body = (head(d['noun'].capitalize() + 's', f'<span class="ico a" style="width:38px;height:38px;border-radius:50%">{ic("plus")}</span>') + f'<div class="field" style="margin-top:14px;height:46px">{ic("search")}<span>Search {d["noun"]}s</span></div><div style="margin-top:12px">{chips(d["cats"])}</div>'
                f'<div class="list" style="margin-top:8px">{"".join(row(*it) for it in items)}</div>')
        desc = f'A list screen of {d["noun"]}s in {app}. A title with an add button sits over a search field and a chip row ({", ".join(d["cats"])}); six rows follow with a leading icon, title, supporting line and trailing value: {"; ".join(f"{a} ({c})" for a, _, c, _ in items[:4])}. Idea: identical row anatomy keeps a long list scannable.'
        tags = ['list-row', 'search', 'chips', 'filters']
    else:
        body = (head(d['noun'].capitalize() + 's', f'<div class="ico">{ic("filter" if "filter" in I else "grid")}</div>') + f'<div style="margin-top:12px">{chips(d["cats"], 1)}</div>'
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px">' + ''.join(f'<div class="col g8">{art(n * 7 + i, 130, 18)}<b style="font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{a}</b><span class="small" style="margin-top:-6px">{c}</span></div>' for i, (a, _, c, _) in enumerate(items[:6])) + '</div>')
        desc = f'A two-column card grid of {d["noun"]}s in {app}. A chip row with "{d["cats"][1]}" selected sits above six cards, each an illustrated tile with a title and value: {", ".join(a for a, *_ in items[:6])}. Idea: a grid trades density for browsability when the visual matters.'
        tags = ['grid', 'card', 'chips', 'illustration']
    screen(f'gen-{k}-list', meta(d, 'list', f'{app} {d["noun"]} list', ['list', 'search'], ['minimal', 'card-based'], tags, desc), body)

    # 3 detail --------------------------------------------------------------
    dt = d['detail']
    body = (f'<div style="margin:-60px -20px 0">{art(n * 3 + 1, 300, 0)}</div><div class="row" style="position:absolute;top:60px;left:20px;right:20px"><span class="ico" style="width:40px;height:40px;border-radius:50%;background:var(--bg)">{ic("back")}</span><div class="sp"></div><span class="ico" style="width:40px;height:40px;border-radius:50%;background:var(--bg);color:var(--accent)">{ic("heart")}</span></div>'
            f'<div class="row" style="margin-top:18px;align-items:flex-end"><div class="col" style="min-width:0"><b class="d2">{dt["title"]}</b><span class="small">{dt["sub"]}</span></div><div class="sp"></div><b class="d2 num" style="white-space:nowrap">{dt["value"]}</b></div>'
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">' + ''.join(f'<div class="tint col" style="padding:12px"><span class="small">{a}</span><b style="font-size:14.5px">{b}</b></div>' for a, b in dt['facts']) + '</div>'
            f'<p class="lede" style="margin-top:14px;font-size:14.5px">{dt["body"]}</p>'
            f'<span class="eyebrow" style="margin:18px 0 4px">Related</span><div class="list">{"".join(row(*it) for it in items[1:3])}</div><div class="sp"></div><div class="row g8"><button class="btn" style="width:52px">{ic("send" if "send" in I else "plus")}</button><button class="btn btn-p" style="flex:1">{d["checkout"][3]}</button></div>')
    desc = f'A detail screen in {app} for "{dt["title"]}" ({dt["sub"]}). An illustrated header carries back and save buttons; below sit the title, the value "{dt["value"]}", a 2×2 fact grid ({"; ".join(f"{a}: {b}" for a, b in dt["facts"])}), a short paragraph, two "Related" rows and a sticky action "{d["checkout"][3]}". Idea: media first, facts scannable, one primary action pinned.'
    screen(f'gen-{k}-detail', meta(d, 'detail', f'{app} {d["noun"]} detail', ['detail'], ['card-based', 'rounded'], ['sticky-cta', 'card', 'illustration'], desc), body)

    # 4 onboarding ----------------------------------------------------------
    o = d['onboard']
    body = (f'<div class="row"><div class="dots" style="flex:1"><i class="on"></i><i></i><i></i></div><span class="small">Skip</span></div>' + art(n * 5 + 2, 380, 28, 'margin-top:16px')
            + f'<h1 class="d1" style="margin-top:22px">{o[0]} <em>{o[1]}</em></h1><p class="lede" style="margin-top:10px">{o[2]}</p><div class="sp"></div><button class="btn btn-p">{o[3]}</button><p class="small" style="text-align:center;margin-top:12px">Already using {app}? <b style="color:var(--text)">Log in</b></p>')
    desc = f'The first onboarding step of {app}. Progress dots and Skip sit over a large illustrated panel; the headline reads "{o[0]} {o[1]}", followed by "{o[2]}" and a full-width primary button "{o[3]}" with a log-in link. Idea: one promise, one visual, one action per step.'
    screen(f'gen-{k}-onboarding', meta(d, 'onboarding', f'{app} welcome', ['onboarding'], ['minimal', 'illustration-led'], ['welcome-screen', 'onboarding', 'cta-button'], desc), body)

    # 5 empty ---------------------------------------------------------------
    e = d['empty']
    body = (head(d['noun'].capitalize() + 's') + f'<div class="col" style="flex:1;align-items:center;justify-content:center;text-align:center;padding-bottom:80px"><div style="position:relative;width:190px;height:150px;margin-bottom:24px"><div class="card" style="position:absolute;inset:16px 6px 26px 28px;transform:rotate(6deg);opacity:.45"></div><div class="card" style="position:absolute;inset:6px 28px 36px 6px;transform:rotate(-5deg);opacity:.75"></div>'
            f'<div class="ico a" style="position:absolute;right:14px;bottom:10px;width:54px;height:54px;border-radius:18px">{ic(d["icon"])}</div></div><h2 class="d2">{e[0]}</h2><p class="lede" style="margin:8px 22px 22px">{e[1]}</p><button class="btn btn-p" style="padding:0 30px">{e[2]}</button></div>' + tabbar('inbox'))
    desc = f'An empty state in {app}: a ghosted stack of cards with an accent badge, the line "{e[0]}", the explanation "{e[1]}" and a single button "{e[2]}". Idea: explain what will appear and offer exactly one next step.'
    screen(f'gen-{k}-empty', meta(d, 'empty', f'{app} empty state', ['empty-state'], ['minimal', 'illustration-led'], ['empty-state', 'cta-button'], desc), body)

    # 6 notifications -------------------------------------------------------
    nt = d['notif']
    body = (head('Activity', '<span class="small" style="color:var(--accent);font-weight:600">Mark all read</span>') + '<span class="eyebrow" style="margin:18px 0 6px">Today</span>'
            + ''.join(f'<div class="tint row" style="padding:12px;margin-bottom:8px"><span class="ico a">{ic(i)}</span><div class="col" style="flex:1"><b>{a}</b><span class="small">{b}</span></div><i style="width:8px;height:8px;border-radius:50%;background:var(--accent)"></i></div>' for a, b, i in nt[:2])
            + '<span class="eyebrow" style="margin:14px 0 6px">Earlier</span><div class="list">' + ''.join(row(a, b, '', i) for a, b, i in nt[2:]) + '</div>'
            f'<div class="col" style="align-items:center;text-align:center;gap:6px;margin-top:26px"><span class="ico a" style="width:44px;height:44px;border-radius:50%">{ic("check")}</span><b style="font-size:15px">You’re all caught up</b><span class="small">Choose what reaches you in <span style="color:var(--accent);font-weight:600">notification settings</span>.</span></div>' + tabbar('inbox'))
    desc = f'An activity feed in {app} grouped under Today and Earlier. Unread items sit on tinted cards with an accent dot — "{nt[0][0]}" ({nt[0][1]}) and "{nt[1][0]}" — and read items are plain rows: "{nt[2][0]}", "{nt[3][0]}". A "Mark all read" link sits in the header, and an "all caught up" note with a link to notification settings closes the feed above the tab bar. Idea: read state carried by surface and one dot.'
    screen(f'gen-{k}-activity', meta(d, 'activity', f'{app} activity feed', ['notification', 'list'], ['minimal', 'card-based'], ['notifications', 'list-row', 'unread'], desc), body)

    # 7 profile -------------------------------------------------------------
    p = d['profile']
    body = (f'<div class="row"><div class="sp"></div><div class="ico">{ic("cog")}</div></div><div class="col" style="align-items:center;text-align:center"><div class="av" style="width:88px;height:88px;box-shadow:0 0 0 4px var(--bg),0 0 0 6px var(--accent)"></div><b class="d2" style="margin-top:12px">{p[0]}</b><span class="small">{p[1]}</span>'
            '<div class="row g8" style="margin-top:14px"><button class="btn btn-sm btn-p">Edit profile</button><button class="btn btn-sm">Share</button></div></div>'
            '<div class="row" style="margin-top:20px;gap:8px">' + ''.join(f'<div class="tint col" style="flex:1;align-items:center;padding:14px 8px"><b class="d2 num">{a}</b><span class="small">{b}</span></div>' for a, b in p[2])
            + f'</div><div class="card" style="margin-top:14px;padding:4px 16px"><div class="list">{"".join(row(a, b, "", i) for a, b, _, i in items[:3])}</div></div>' + tabbar('user' if False else 'home'))
    desc = f'A profile screen in {app} for {p[0]} ({p[1]}). A ringed avatar, name and Edit/Share buttons sit centred over a three-up stat row — {", ".join(f"{a} {b}" for a, b in p[2])} — and a card of recent items. Idea: identity first, stats as a compact row.'
    screen(f'gen-{k}-profile', meta(d, 'profile', f'{app} profile', ['profile'], ['card-based', 'rounded'], ['avatar', 'stats'], desc), body)

    # 8 checkout ------------------------------------------------------------
    c = d['checkout']
    body = (head(c[0], back=True) + '<div class="card" style="margin-top:18px;padding:4px 16px"><div class="list">' + ''.join(f'<div class="li"><span class="small" style="flex:1">{a}</span><b class="num">{b}</b></div>' for a, b in c[1]) + '</div></div>'
            f'<div class="tint row" style="margin-top:12px">{ic("card")}<div class="col"><b>Visa •• 4417</b><span class="small">Expires 09/29</span></div><div class="sp"></div><span class="small">Change</span></div>'
            f'<div class="field" style="margin-top:12px">{ic("key")}<span>Add a promo code</span><div class="sp"></div><span class="small" style="color:var(--accent);font-weight:600">Apply</span></div>'
            f'<div class="row g8 small" style="margin-top:16px;align-items:flex-start">{ic("lock")}<span>Payments are encrypted, and you’ll get a receipt by email the moment this goes through.</span></div>'
            f'<div class="sp"></div><div class="row" style="padding-top:12px;border-top:1px solid var(--line)"><div class="col"><span class="small">Total</span><b class="d2 num">{c[2]}</b></div><div class="sp"></div><button class="btn btn-p" style="padding:0 26px">{c[3]}</button></div>')
    desc = f'A confirmation screen in {app} titled "{c[0]}". A summary card lists {"; ".join(f"{a} {b}" for a, b in c[1])}, a payment row shows Visa •• 4417, a promo-code field and a short reassurance line follow, and a sticky footer shows the total {c[2]} beside the primary button "{c[3]}". Idea: the consequence on the button and the total always visible.'
    screen(f'gen-{k}-confirm', meta(d, 'confirm', f'{app} {c[0].lower()}', ['checkout'], ['card-based', 'minimal'], ['checkout', 'sticky-cta', 'price'], desc), body)

    # 9 settings ------------------------------------------------------------
    st = d['settings']
    body = (head('Settings', back=True) + f'<div class="card row" style="margin-top:16px"><div class="av"></div><div class="col"><b>{p[0]}</b><span class="small">{p[1]}</span></div><div class="sp"></div>{ic("chev")}</div>'
            + ''.join(f'<span class="eyebrow" style="margin:18px 6px 8px">{g}</span><div class="card" style="padding:4px 16px"><div class="list">' + ''.join(f'<div class="li"><span>{lab}</span><div class="sp"></div><i class="toggle {"on" if on else ""}"></i></div>' for lab, on in rows) + '</div></div>' for g, rows in st)
            + '<div class="sp"></div><button class="btn danger">Sign out</button>')
    desc = f'Settings for {app}. An account row leads; grouped cards follow — ' + '; '.join(f'{g}: ' + ', '.join(f'{lab} ({"on" if on else "off"})' for lab, on in rows) for g, rows in st) + '. A red Sign out sits last. Idea: grouped toggles apply instantly; destructive actions live at the bottom.'
    screen(f'gen-{k}-settings', meta(d, 'settings', f'{app} settings', ['settings'], ['minimal', 'card-based'], ['settings', 'toggle', 'list-row'], desc), body)

    # 10 search -------------------------------------------------------------
    body = (f'<div class="field focus" style="margin-top:6px">{ic("search")}<span style="color:var(--text)">{items[0][0].split()[0].lower()}</span><div class="sp"></div><span class="ico" style="width:24px;height:24px;border-radius:50%;font-size:11px">✕</span></div><div style="margin-top:12px">{chips(d["cats"])}</div>'
            '<span class="eyebrow" style="margin:18px 0 6px">Recent</span><div class="row g8" style="flex-wrap:wrap">' + ''.join(f'<span class="pill">{ic("clock")} {a.split()[0]}</span>' for a, *_ in items[2:5]) + '</div>'
            f'<span class="eyebrow" style="margin:18px 0 6px">Top results</span><div class="list">{"".join(row(*it) for it in items[:4])}</div>'
            f'<span class="eyebrow" style="margin:18px 0 6px">Also matching</span><div class="list">{"".join(row(*it) for it in items[4:6])}</div>')
    desc = f'A search screen in {app}: a focused field with a clear button, a chip row ({", ".join(d["cats"][:4])}), recent searches as pills, "Top results" — {", ".join(a for a, *_ in items[:4])} — and two more under "Also matching". Idea: the empty state of search is useful before you type.'
    screen(f'gen-{k}-search', meta(d, 'search', f'{app} search', ['search', 'list'], ['minimal'], ['search', 'chips', 'list-row'], desc), body)

    # 11 insights ----------------------------------------------------------
    ch = d['chart']; mx = max(ch) or 1
    pts = ' '.join(f'{i * 50},{110 - v / mx * 90:.0f}' for i, v in enumerate(ch))
    pct = int(sum(1 for v in ch if v > mx * .5) / len(ch) * 100)
    body = (head('Insights', '<span class="pill">Week ▾</span>') + f'<div class="card" style="margin-top:16px"><span class="small">{d["chart_label"]}</span><div class="col" style="gap:2px"><b class="d2 num">{H[1]}{H[2]}</b><span class="small up" style="font-weight:600">{H[3]}</span></div>'
            f'<svg viewBox="0 0 300 120" style="width:100%;height:130px;margin-top:8px"><defs><linearGradient id="ig" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".35"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs><polygon points="0,120 {pts} 300,120" fill="url(#ig)"/><polyline points="{pts}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>' + ''.join(f'<circle cx="{i * 50}" cy="{110 - v / mx * 90:.0f}" r="{5 if i == 5 else 0}" fill="var(--accent)" stroke="var(--surface)" stroke-width="3"/>' for i, v in enumerate(ch)) + '</svg>'
            '<div class="row small" style="justify-content:space-between;font-size:11px">' + ''.join(f'<span>{x}</span>' for x in 'Mon Tue Wed Thu Fri Sat Sun'.split()) + '</div></div>'
            f'<div class="row g12" style="margin-top:12px"><div class="card row g12" style="flex:1"><div style="width:58px;height:58px;border-radius:50%;flex:none;background:conic-gradient(var(--accent) 0 {pct}%,var(--surface2) 0);display:grid;place-items:center"><i style="width:44px;height:44px;border-radius:50%;background:var(--surface);display:grid;place-items:center;font:600 13px var(--sans);font-style:normal">{pct}%</i></div><span class="small">of days above your usual</span></div></div>'
            '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px">' + ''.join(f'<div class="tint col g4" style="padding:12px"><span class="small" style="font-size:12px">{a}</span><b class="num" style="font-size:14.5px">{b}</b><span class="small" style="font-size:12px">{c}</span></div>' for a, b, c in d['kpis'][1:]) + '</div>' + tabbar('chart'))
    desc = f'An insights screen in {app}. A Week selector sits beside the title; a card plots {d["chart_label"].lower()} as an area line with Saturday highlighted under the figure {H[1]}{H[2]} ({H[3]}); a progress ring shows {pct}% of days above usual; three tiles follow — ' + ', '.join(f'{a} {b}' for a, b, _ in d['kpis'][1:]) + '. Idea: one trend, one ratio, then supporting numbers.'
    screen(f'gen-{k}-insights', meta(d, 'insights', f'{app} insights', ['dashboard'], ['data-dense', 'card-based'], ['line-chart', 'progress-ring', 'stats', 'kpi'], desc), body)

    # 12 support chat ------------------------------------------------------
    it = items[0]
    body = (f'<div class="row"><span class="ico" style="width:36px;height:36px;border-radius:50%">{ic("back")}</span><span class="ico a" style="margin-left:6px;border-radius:50%">{ic(d["icon"])}</span><div class="col"><b>{app} support</b><span class="small" style="color:#3DBF7F">Typically replies in 2 min</span></div></div>'
            f'<div class="col" style="align-items:center;text-align:center;margin-top:22px;gap:6px"><span class="ico a" style="width:56px;height:56px;border-radius:50%">{ic(d["icon"])}</span><b style="margin-top:4px">Hi, how can we help?</b><span class="small">Real people, 7 days a week.</span></div>'
            '<div class="card" style="margin-top:14px;padding:2px 14px"><div class="list">' + ''.join(f'<div class="li" style="font-size:14px"><span class="ico" style="width:28px;height:28px;border-radius:8px">{ic(i_)}</span><span>{t_}</span><div class="sp"></div>{ic("chev")}</div>' for i_, t_ in [('doc', f'Changing a {d["noun"]}'), ('key', 'Payments and refunds')]) + '</div></div>'
            '<div class="col g8" style="margin-top:16px;flex:1;justify-content:flex-end"><span class="small" style="text-align:center">Today</span>'
            f'<div style="align-self:flex-end;max-width:78%;padding:10px 14px;border-radius:18px 18px 6px 18px;background:var(--accent);color:var(--onAccent)">Hi! I have a question about {it[0]}.</div>'
            f'<div style="align-self:flex-start;max-width:80%;padding:10px 14px;border-radius:18px 18px 18px 6px;background:var(--surface2)">Of course — I can see it here. What would you like to change?</div>'
            f'<div class="card row" style="align-self:flex-start;width:82%;padding:12px"><span class="ico">{ic(it[3])}</span><div class="col" style="min-width:0"><b style="font-size:14px">{it[0]}</b><span class="small">{it[1]}</span></div><div class="sp"></div><b class="num" style="font-size:14px">{it[2]}</b></div>'
            '<div style="align-self:flex-end;max-width:78%;padding:10px 14px;border-radius:18px 18px 6px 18px;background:var(--accent);color:var(--onAccent)">Something looks off — could you check it?</div>'
            '<div class="row g8" style="align-self:flex-start;padding:10px 14px;border-radius:18px;background:var(--surface2)">' + ''.join(f'<i style="width:7px;height:7px;border-radius:50%;background:var(--muted);opacity:{o}"></i>' for o in (.4, .7, 1)) + '</div></div>'
            '<div class="row g8" style="margin-bottom:10px;overflow:hidden;white-space:nowrap"><span class="pill">Yes, please</span><span class="pill">Talk to a person</span></div>'
            f'<div class="row g8" style="padding:8px;border-radius:22px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--line)"><span class="ico" style="width:36px;height:36px;border-radius:50%">{ic("plus")}</span><span class="small" style="flex:1">Message {app}…</span><span class="ico a" style="width:38px;height:38px;border-radius:50%">{ic("send")}</span></div>')
    desc = f'A support conversation inside {app}. The header shows the support avatar and "Typically replies in 2 min"; a short help intro with two article rows sits above the thread, which is anchored to the composer. The user asks about {it[0]}, the agent replies, a context card shows {it[0]} ({it[1]}, {it[2]}), a follow-up asks support to check it, a typing indicator and two quick-reply chips sit above an anchored composer. Idea: show the object being discussed inside the thread.'
    screen(f'gen-{k}-support', meta(d, 'support', f'{app} support chat', ['chat'], ['minimal', 'rounded'], ['chat', 'messaging', 'chips', 'input'], desc), body)

    # 13 schedule -----------------------------------------------------------
    times = ['08:00', '09:30', '12:00', '14:30', '17:00', '19:30']
    body = (head('Schedule', f'<span class="ico a" style="width:38px;height:38px;border-radius:50%">{ic("plus")}</span>') + '<div class="row" style="justify-content:space-between;margin-top:14px">'
            + ''.join(f'<div class="col g4" style="align-items:center;width:42px;padding:8px 0;border-radius:14px;{"background:var(--accent);color:var(--onAccent)" if i == 3 else ""}"><span style="font-size:11.5px;opacity:.7">{dd}</span><b class="num">{11 + i}</b></div>' for i, dd in enumerate('MTWTFSS')) + '</div>'
            '<div class="col" style="margin-top:16px;gap:10px">' + ''.join(f'<div class="row g12" style="align-items:stretch"><span class="small num" style="width:44px;padding-top:12px">{t}</span><div class="{"card" if i != 1 else ""}" style="flex:1;padding:12px 14px;border-radius:var(--r);{"background:var(--accent);color:var(--onAccent)" if i == 1 else ""};box-shadow:inset 3px 0 0 var(--accent2)"><b style="font-size:14.5px">{a}</b><span style="display:block;font-size:12.5px;opacity:.75">{b}</span></div></div>' for i, (t, (a, b, _, _)) in enumerate(zip(times, items))) + '</div>')
    desc = f'A day schedule in {app}. A week strip with Thursday selected sits under the title; a timeline lists six entries from 08:00 to 19:30 — ' + ', '.join(f'{t} {a}' for t, (a, *_) in zip(times, items)) + ' — the second highlighted in the accent. Idea: time on the left rail, one emphasised "now" block.'
    screen(f'gen-{k}-schedule', meta(d, 'schedule', f'{app} schedule', ['list'], ['card-based', 'minimal'], ['calendar', 'schedule', 'timeline', 'week-strip'], desc), body)

    # 14 success ------------------------------------------------------------
    body = ('<div class="col" style="flex:1;align-items:center;justify-content:center;text-align:center;padding-bottom:30px">'
            f'<div style="position:relative;width:120px;height:120px;margin-bottom:22px"><i style="position:absolute;inset:-18px;border-radius:50%;background:color-mix(in oklab,var(--accent) 18%,transparent)"></i><i style="position:absolute;inset:-36px;border-radius:50%;background:color-mix(in oklab,var(--accent) 8%,transparent)"></i><span class="ico a" style="position:relative;width:120px;height:120px;border-radius:50%">{ic("check").replace("class=\"i\"", "class=\"i\" style=\"width:52px;height:52px\"")}</span></div>'
            f'<h1 class="d1" style="font-size:32px">All set!</h1><p class="lede" style="margin:8px 26px 22px">{c[0]} confirmed — we’ve sent the details to your email.</p>'
            '<div class="card" style="width:100%;padding:4px 16px;text-align:left"><div class="list">' + ''.join(f'<div class="li"><span class="small" style="flex:1">{a}</span><b class="num">{b}</b></div>' for a, b in c[1][:3]) + f'<div class="li"><b style="flex:1">Total</b><b class="num">{c[2]}</b></div></div></div>'
            f'<div class="row g12 tint" style="width:100%;margin-top:10px;padding:12px 14px;text-align:left"><span class="ico a" style="width:32px;height:32px;border-radius:10px">{ic("cal")}</span><div class="col" style="flex:1;min-width:0"><b style="font-size:14px">Add to calendar</b><span class="small">We’ll remind you the day before</span></div>{ic("chev")}</div></div>'
            f'<button class="btn btn-p">Done</button><button class="btn" style="margin-top:8px;background:none">{ic("send")} Share receipt</button>')
    desc = f'A success screen in {app} after "{c[0]}". A large accent check with two soft halos sits over "All set!" and a confirmation line; a receipt card lists {"; ".join(f"{a} {b}" for a, b in c[1][:3])} and the total {c[2]}; an "Add to calendar" reminder row follows; Done and Share receipt close the screen. Idea: celebrate briefly, then show exactly what happened.'
    screen(f'gen-{k}-success', meta(d, 'success', f'{app} confirmation', ['checkout'], ['minimal', 'rounded'], ['success', 'receipt', 'cta-button'], desc), body)

    # desktop: dashboard ------------------------------------------------------
    body = (f'<div class="row" style="height:100%;align-items:stretch;gap:0"><aside style="width:230px;background:var(--surface);border-right:1px solid var(--line);padding:20px 14px;display:flex;flex-direction:column;gap:2px"><b class="h3 row g8" style="padding:0 8px 18px"><span class="ico a" style="width:28px;height:28px;border-radius:8px">{ic(d["icon"])}</span>{app}</b>'
            + ''.join(f'<span class="row g12" style="height:38px;padding:0 10px;border-radius:10px;{"background:var(--surface2);color:var(--text)" if i == 0 else "color:var(--muted)"}">{ic(ik)}<span style="font-size:14px">{lab}</span></span>' for i, (ik, lab) in enumerate([('grid', 'Overview'), ('chart', 'Reports'), (d['icon'], d['noun'].capitalize() + 's'), ('user', 'People'), ('cog', 'Settings')]))
            + f'</aside><div style="flex:1;padding:26px 32px;display:flex;flex-direction:column;gap:18px;min-width:0"><div class="row"><div class="col"><h1 class="d2" style="font-size:26px">Overview</h1><span class="small">{H[3]}</span></div><div class="sp"></div><span class="pill">Last 30 days</span><button class="btn btn-sm btn-p" style="margin-left:8px">Export</button></div>'
            '<div class="row g12">' + ''.join(f'<div class="card col g4" style="flex:1"><span class="small">{a}</span><b class="d2 num" style="font-size:26px">{b}</b><span class="small" style="font-weight:600">{cc}</span></div>' for a, b, cc in d['kpis'])
            + f'</div><div class="row g12" style="flex:1;align-items:stretch;min-height:0"><div class="card" style="flex:1.6;display:flex;flex-direction:column"><b class="h3">{d["chart_label"]}</b><div style="flex:1;display:flex;align-items:flex-end;margin-top:12px">{bars(d["chart"], 4, 300)}</div></div>'
            f'<div class="card" style="flex:1"><b class="h3">Recent</b><div class="list" style="margin-top:8px">{"".join(row(*it) for it in items[:5])}</div></div></div></div></div>')
    desc = f'A desktop dashboard for {app} ({d["area"]}). A sidebar lists Overview, Reports, {d["noun"].capitalize()}s, People and Settings; the canvas has a title row with a date range and Export, four KPI cards ({", ".join(f"{a} {b}" for a, b, _ in d["kpis"])}), a bar chart of {d["chart_label"].lower()} and a recent list. Idea: KPI strip, one dominant chart, quiet chrome.'
    screen(f'gen-{k}-dashboard', meta(d, 'dashboard', f'{app} desktop dashboard', ['dashboard'], ['data-dense', 'card-based'], ['sidebar', 'kpi', 'bar-chart', 'desktop', 'analytics'], desc, 'desktop'), body)

    # desktop: landing ---------------------------------------------------------
    body = (f'<div style="height:100%;display:flex;flex-direction:column;padding:0 64px"><div class="row" style="height:84px"><b class="h3 row g8"><span class="ico a" style="width:28px;height:28px;border-radius:8px">{ic(d["icon"])}</span>{app}</b><div class="row g24" style="margin-left:48px;color:var(--muted);font-size:14.5px"><span>Product</span><span>Stories</span><span>Pricing</span></div><div class="sp"></div><button class="btn btn-sm" style="background:none">Sign in</button><button class="btn btn-sm btn-p" style="margin-left:6px">Get {app}</button></div>'
            f'<div class="row" style="flex:1;gap:56px"><div class="col" style="flex:1.05"><span class="pill" style="align-self:flex-start"><span class="tag" style="height:20px">New</span>{d["notif"][0][0]}</span><h1 class="d1" style="font-size:74px;line-height:.98;margin-top:22px">{o[0]} <em>{o[1]}</em></h1><p class="lede" style="font-size:19px;max-width:30em;margin-top:20px">{o[2]}</p>'
            f'<div class="row g12" style="margin-top:30px"><button class="btn btn-p" style="padding:0 28px">{o[3]}</button><button class="btn btn-o" style="padding:0 24px">See how it works</button></div><div class="row g12" style="margin-top:30px"><span class="small"><b style="color:var(--text)">★ 4.9</b> · loved by 40k people</span></div></div>'
            f'<div style="flex:.95;height:620px;border-radius:32px;position:relative;overflow:hidden;background:radial-gradient(70% 60% at 50% 40%,color-mix(in oklab,var(--accent) 26%,var(--surface2)),var(--surface2));display:grid;place-items:center">'
            f'<div style="width:280px;height:570px;border-radius:42px;background:var(--bg);box-shadow:0 0 0 7px #0B0B0C,0 40px 80px -30px rgba(0,0,0,.5);padding:44px 16px 16px;display:flex;flex-direction:column;gap:10px;transform:translateY(50px)"><span class="small">{H[0]}</span><b class="d2 num">{H[1]}{H[2]}</b><span class="small">{H[3]}</span>'
            + ''.join(f'<div class="card row" style="padding:10px"><span class="ico" style="width:30px;height:30px;border-radius:9px">{ic(it[3])}</span><div class="col" style="min-width:0"><b style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{it[0]}</b><span class="small" style="font-size:11.5px">{it[2]}</span></div></div>' for it in items[:4]) + f'<div class="card" style="padding:12px"><span class="small" style="font-size:11px">{d["chart_label"]}</span><div style="margin-top:8px">{bars(d["chart"], 5, 70)}</div></div></div></div></div></div>')
    desc = f'A desktop landing hero for {app}. A slim nav with "Get {app}" sits over a two-column hero: an eyebrow pill ("{d["notif"][0][0]}"), the headline "{o[0]} {o[1]}", "{o[2]}", primary "{o[3]}" and ghost CTAs and a rating line; the right column shows the app in a phone on a tinted panel. Idea: outcome headline, one primary action, the real product above the fold.'
    screen(f'gen-{k}-landing', meta(d, 'landing', f'{app} landing hero', ['landing-section', 'hero'], ['bold-typography', 'minimal'], ['landing-page', 'hero', 'cta-button', 'desktop'], desc, 'desktop'), body)

    # desktop: pricing -----------------------------------------------------------
    pl = d['plans']
    body = (f'<div style="height:100%;display:flex;flex-direction:column;align-items:center;padding:60px 140px"><span class="eyebrow">{app} pricing</span><h1 class="d1" style="font-size:56px;margin-top:14px;text-align:center">Pick the plan that <em>fits.</em></h1>'
            '<div class="row g12" style="margin-top:22px"><div class="row" style="padding:4px;border-radius:12px;background:var(--surface2)"><span class="pill" style="background:none">Monthly</span><span class="pill on" style="border-radius:9px">Yearly</span></div><span class="tag">2 months free</span></div>'
            '<div class="row g16" style="margin-top:40px;align-items:stretch;width:100%">' + ''.join(
                f'<div class="card col g16" style="flex:1;padding:28px;{"background:var(--accent);color:var(--onAccent);transform:translateY(-12px);box-shadow:0 30px 60px -30px var(--accent)" if i == 1 else ""}"><div class="row"><b class="h3">{nm}</b><div class="sp"></div>{"<span class=&quot;pill&quot; style=&quot;background:color-mix(in oklab,var(--onAccent) 14%,transparent);color:var(--onAccent)&quot;>Most popular</span>".replace("&quot;", chr(34)) if i == 1 else ""}</div><div class="row" style="align-items:baseline;gap:6px"><b class="big num" style="font-size:48px">{pr}</b><span style="opacity:.7;font-size:14px">/ month</span></div><button class="btn {"" if i == 1 else "btn-o"}" style="{"background:var(--onAccent);color:var(--accent)" if i == 1 else ""}">{"Start free trial" if i == 1 else "Choose " + nm}</button><div class="col g12">' + ''.join(f'<div class="row g8" style="font-size:14.5px">{ic("check")}{f}</div>' for f in fs) + '</div></div>' for i, (nm, pr, fs) in enumerate(pl)) + '</div>'
            '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:28px;width:100%;margin-top:48px;padding-top:28px;border-top:1px solid var(--line)">' + ''.join(f'<div class="col g8"><b style="font-size:15px">{q}</b><span class="small" style="font-size:14px;line-height:1.55">{a_}</span></div>' for q, a_ in [
                ('Can I switch plans later?', 'Any time. Upgrades apply straight away; downgrades take effect on your next bill.'),
                ('Is there a free trial?', f'{pl[1][0]} comes with 14 days free — no card needed to start.'),
                ('What if I cancel?', 'You keep access until the period ends, and your data stays exportable for 90 days.')]) + '</div></div>')
    desc = f'A desktop pricing section for {app} with a Monthly/Yearly toggle and "2 months free". Three plans — ' + '; '.join(f'{nm} {pr} ({", ".join(fs)})' for nm, pr, fs in pl) + f' — with {pl[1][0]} anchored: accent-filled, raised and tagged "Most popular"; a three-column FAQ (switching plans, the free trial, cancelling) closes the section. Idea: anchor one plan with fill and keep one filled button.'
    screen(f'gen-{k}-pricing', meta(d, 'pricing', f'{app} pricing', ['pricing', 'landing-section'], ['bold-typography', 'card-based'], ['pricing', 'plans', 'toggle', 'desktop'], desc, 'desktop'), body)

    # desktop: table ---------------------------------------------------------------
    st_on, st_off = STATUS.get(k, ('Active', 'Paused'))
    # the exception sits on the row that says so, else on the fourth
    st_x = next((j for j, (a_, b_, c_, _) in enumerate(items) if st_off.lower() in f'{b_} {c_}'.lower()), 3)
    body = (f'<div style="height:100%;padding:28px 36px;display:flex;flex-direction:column;gap:16px"><div class="row"><div class="col"><h1 class="d2" style="font-size:28px">{d["noun"].capitalize()}s</h1><span class="small">{len(items) * 41} total · {app}</span></div><div class="sp"></div><button class="btn btn-sm">Export</button><button class="btn btn-sm btn-p" style="margin-left:8px">{ic("plus")} New {d["noun"]}</button></div>'
            '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">' + ''.join(f'<div class="card col g4" style="padding:14px 16px"><span class="small">{x}</span><b class="num" style="font-size:22px">{y}</b><span class="small {"up" if z.startswith("▲") else "down" if z.startswith("▼") else ""}">{z}</span></div>' for x, y, z in d['kpis'][:4]) + '</div>'
            f'<div class="row g8"><div class="field" style="height:38px;width:300px">{ic("search")}<span>Search {d["noun"]}s</span></div>' + ''.join(f'<span class="pill" style="height:38px;border-radius:10px">{x} ▾</span>' for x in d['cats'][1:4]) + '</div>'
            '<div class="card" style="padding:0;overflow:hidden"><div class="row" style="padding:12px 18px;border-bottom:1px solid var(--line);font:600 11px var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)"><span style="width:320px">Name</span><span style="width:300px">Details</span><span style="width:140px">Status</span><span style="margin-left:auto">Value</span></div>'
            + ''.join(f'<div class="row li" style="padding:14px 18px"><span class="row g12" style="width:320px"><span class="ico" style="width:32px;height:32px;border-radius:9px">{ic(ik)}</span><b style="font-size:14px">{a}</b></span><span class="small" style="width:300px">{b}</span><span style="width:140px"><span class="tag" style="{"background:var(--surface2);color:var(--muted)" if j == st_x else ""}">{st_off if j == st_x else st_on}</span></span><b class="num" style="margin-left:auto;font-size:14px">{c}</b></div>' for j, (a, b, c, ik) in enumerate(items))
            + f'</div><div class="row"><span class="small">Showing 1–{len(items)} of {len(items) * 41}</span><div class="sp"></div><button class="btn btn-sm">Previous</button><button class="btn btn-sm" style="margin-left:6px">Next</button></div></div>')
    desc = f'A desktop table of {d["noun"]}s in {app}. A title row with Export and "New {d["noun"]}", a strip of four KPI tiles, a search field and filter dropdowns ({", ".join(d["cats"][1:4])}) sit above a table with name, details, status ({st_on} / {st_off}) and value columns — ' + ', '.join(a for a, *_ in items) + '. Pagination closes the card. Idea: tables carry the data; chrome recedes.'
    screen(f'gen-{k}-table', meta(d, 'table', f'{app} {d["noun"]} table', ['list', 'dashboard'], ['data-dense', 'minimal'], ['data-table', 'filters', 'desktop'], desc, 'desktop'), body)

print(len(SCREENS), 'generated screens')
