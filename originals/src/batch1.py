"""Batch 1 of UI Hall originals: ten phone screens, two desktop screens, two component sheets.
Run: python3 originals/src/batch1.py  → writes originals/screens/*.html"""
from kitgen import *

# 1 onboarding --------------------------------------------------------------
screen('onboarding-welcome', dict(viewport='phone', title='Welcome with orbit illustration', category='mobile-app-ui', type='screen', roles=['onboarding'],
  style=['minimal','rounded'], tags=['welcome-screen','onboarding','illustration','cta-button','progress'],
  desc='A single onboarding welcome screen for a habit app. The top 55% is a tinted panel holding a code-drawn orbit illustration: three concentric rings with small planets around a glowing core. Below sit page dots, the headline "Small steps, every single day.", one line of support, a full-width primary "Get started" button and a quiet "I already have an account" link. Built on {words}. Idea: one promise and one action per step, with the visual carrying the mood.'),
  '''<div class="tint" style="flex:0 0 56%;display:grid;place-items:center;position:relative;overflow:hidden;background:radial-gradient(80% 70% at 50% 40%,color-mix(in oklab,var(--accent) 30%,var(--surface2)),var(--surface2))">
  <div class="orbit" style="--s:260px"></div><div class="orbit" style="--s:190px;animation-delay:-2s"></div><div class="orbit" style="--s:120px"></div>
  <div class="core"></div><i class="pl" style="--x:120px;--y:-30px;--c:var(--accent)"></i><i class="pl" style="--x:-90px;--y:60px;--c:var(--accent2)"></i><i class="pl" style="--x:20px;--y:-95px;--c:var(--text);--z:8px"></i>
  </div>
  <div class="dots" style="margin:22px 0 18px"><i class="on"></i><i></i><i></i></div>
  <h1 class="d1">Small steps, <em>every single day.</em></h1>
  <p class="lede" style="margin-top:12px">Build habits that stick with gentle nudges and a streak you’ll actually want to keep.</p>
  <div class="sp"></div>
  <button class="btn btn-p">Get started</button>
  <p class="small" style="text-align:center;margin-top:14px">I already have an account · <b style="color:var(--text)">Log in</b></p>''',
  '.orbit{position:absolute;width:var(--s);height:var(--s);border-radius:50%;box-shadow:inset 0 0 0 1.5px color-mix(in oklab,var(--text) 18%,transparent)}.core{width:64px;height:64px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,var(--accent) 60%);box-shadow:0 0 60px 10px color-mix(in oklab,var(--accent) 45%,transparent)}.pl{position:absolute;width:var(--z,14px);height:var(--z,14px);border-radius:50%;background:var(--c);transform:translate(var(--x),var(--y))}')

# 2 sign in -----------------------------------------------------------------
screen('auth-sign-in', dict(viewport='phone', title='Sign in with passkey first', category='mobile-app-ui', type='screen', roles=['auth','form'],
  style=['minimal','card-based'], tags=['sign-in','login','input','cta-button','social'],
  desc='A sign-in screen that leads with a passkey. A small brand mark and "Welcome back" headline sit over one line of copy; a primary "Continue with passkey" button comes first, then Apple and Google buttons, an "or" divider and an email field shown in its focused state with a caption. A footer link offers account creation. Built on {words}. Idea: the fastest secure method first, with the form as the fallback, not the hero.'),
  '''<div class="row" style="margin-top:12px"><div class="ico a" style="border-radius:12px">'''+ic('star')+'''</div></div>
  <h1 class="d1" style="margin-top:22px">Welcome back.</h1>
  <p class="lede" style="margin-top:8px">Sign in to pick up where you left off.</p>
  <div class="col g12" style="margin-top:28px">
   <button class="btn btn-p">'''+ic('key')+''' Continue with passkey</button>
   <div class="row g8"><button class="btn btn-o" style="flex:1"> Apple</button><button class="btn btn-o" style="flex:1"><b style="font-family:var(--serif);font-size:19px">G</b> Google</button></div>
   <div class="row g12" style="margin:10px 0"><i style="flex:1;height:1px;background:var(--line)"></i><span class="small">or use email</span><i style="flex:1;height:1px;background:var(--line)"></i></div>
   <label class="small" style="color:var(--text);font-weight:600">Email</label>
   <div class="field focus">'''+ic('mail')+'''<span>maya@northwind.co</span><i style="width:1.5px;height:20px;background:var(--accent);margin-left:-6px"></i></div>
   <span class="small">We’ll send a one-time code — no password needed.</span>
   <button class="btn">Send code</button>
  </div>
  <div class="sp"></div>
  <p class="small" style="text-align:center">New here? <b style="color:var(--text)">Create an account</b></p>''')

# 3 home dashboard ------------------------------------------------------------
screen('finance-home', dict(viewport='phone', title='Money home with hero balance', category='mobile-app-ui', type='screen', roles=['home','dashboard'],
  style=['card-based','rounded'], tags=['finance','balance','quick-actions','list-row','bottom-nav','kpi','bar-chart'],
  desc='A personal-finance home screen. A greeting row with avatar and bell sits above "Total balance" and a hero figure "$12,480.32" with greyed cents and a green weekly change. Four round quick actions (Send, Request, Swap, Top up) lead into a seven-bar spending card for the week with today highlighted, then a "Recent" list of two transactions with merchant icons, and a floating four-tab bar. Built on {words}. Idea: one hero number at 3× body size, everything else subordinated.'),
  '''<div class="row" style="margin-top:6px"><div class="av"></div><div class="col"><span class="small">Good morning</span><b>Maya Lin</b></div><div class="sp"></div><div class="ico">'''+ic('bell')+'''</div></div>
  <div style="margin-top:24px"><span class="small">Total balance</span><div class="big num" style="margin-top:6px">$12,480<span class="c">.32</span></div><span class="small up" style="font-weight:600">▲ $320.18 this week</span></div>
  <div class="row" style="justify-content:space-between;margin:22px 4px">'''+''.join(f'<div class="col g8" style="align-items:center"><div class="ico {"a" if i==0 else ""}" style="width:56px;height:56px;border-radius:50%">{ic(k)}</div><span class="small" style="font-weight:600;color:var(--text)">{l}</span></div>' for i,(k,l) in enumerate([('send','Send'),('recv','Request'),('swap','Swap'),('plus','Top up')]))+'''</div>
  <div class="card"><div class="row"><b class="h3">Spending</b><div class="sp"></div><span class="pill">This week</span></div>
   <div class="row" style="align-items:flex-end;gap:10px;height:96px;margin-top:14px">'''+''.join(f'<div class="col g4" style="flex:1;align-items:center"><i style="width:100%;height:{h}px;border-radius:8px;background:{"var(--accent)" if d=="T" and i==3 else "var(--surface2)"}"></i><span class="small" style="font-size:11px">{d}</span></div>' for i,(d,h) in enumerate([('M',38),('T',56),('W',30),('T',78),('F',44),('S',62),('S',24)]))+'''</div></div>
  <div class="row" style="margin:20px 0 4px"><b class="h3">Recent</b><div class="sp"></div><span class="small">See all</span></div>
  <div class="list">'''+''.join(f'<div class="li"><div class="ico">{ic(k)}</div><div class="col"><b style="font-weight:600">{n}</b><span class="small">{s}</span></div><div class="sp"></div><b class="num {c}">{a}</b></div>' for k,n,s,a,c in [('bag','Corner Market','Groceries · 9:12','−$24.60',''),('recv','Ana Ruiz','Dinner split · Yesterday','+$38.00','up')])+'''</div>
  '''+tabbar('home'))

# 4 paywall --------------------------------------------------------------------
screen('paywall-plans', dict(viewport='phone', title='Paywall with anchored yearly plan', category='mobile-app-ui', type='screen', roles=['pricing','checkout'],
  style=['bold-typography','rounded'], tags=['paywall','subscription','plans','cta-button','checklist'],
  desc='A subscription paywall. A close button and "Go Pro" headline sit over a four-line checklist of benefits. Two plan cards follow: "Yearly" is anchored with an accent ring, a "Save 40%" tag, $59.99/year and the computed $5.00/month; "Monthly" at $8.99 is plain. A tinted five-star quote from a long-streak user adds proof. A primary "Start 7-day free trial" button states the consequence, with "Cancel anytime · Restore purchase" beneath. Built on {words}. Idea: anchor one plan and show the saving as a number, not an adjective.'),
  '''<div class="row"><div class="ico" style="width:36px;height:36px;border-radius:50%">✕</div></div>
  <span class="eyebrow" style="margin-top:22px">Pro</span><h1 class="d1" style="margin-top:8px">Go further with <em>Pro.</em></h1>
  <div class="col g12" style="margin:20px 0 22px">'''+''.join(f'<div class="row"><span class="ico a" style="width:24px;height:24px;border-radius:50%">{ic("check")}</span><span>{t}</span></div>' for t in ['Unlimited habits and reminders','Insights that spot your best days','Sync across phone, watch and web','Themes and custom app icons'])+'''</div>
  <div class="col g12">
   <div class="card" style="box-shadow:inset 0 0 0 2px var(--accent)"><div class="row"><span class="ico a" style="width:22px;height:22px;border-radius:50%">'''+ic('check')+'''</span><b class="h3">Yearly</b><span class="tag">Save 40%</span><div class="sp"></div><div class="col" style="align-items:flex-end"><b class="num">$59.99/yr</b><span class="small num">$5.00 / month</span></div></div></div>
   <div class="card"><div class="row"><span style="width:22px;height:22px;border-radius:50%;box-shadow:inset 0 0 0 1.5px var(--line)"></span><b class="h3">Monthly</b><div class="sp"></div><b class="num">$8.99/mo</b></div></div>
  </div>
  <div class="tint" style="margin-top:18px;padding:14px 16px"><span style="color:var(--accent-text,var(--accent));letter-spacing:2px;font-size:13px">★★★★★</span><p style="margin-top:6px;font-size:14.5px;line-height:1.45">“The first habit app that nudges instead of nags. Pro paid for itself in a week.”</p><span class="small" style="display:block;margin-top:6px">Priya · 212-day streak</span></div>
  <div class="sp"></div>
  <button class="btn btn-p">Start 7-day free trial</button>
  <p class="small" style="text-align:center;margin-top:12px">Cancel anytime · Restore purchase</p>''')

# 5 settings ------------------------------------------------------------------
screen('settings-grouped', dict(viewport='phone', title='Grouped settings with toggles', category='mobile-app-ui', type='screen', roles=['settings','profile'],
  style=['minimal','card-based'], tags=['settings','toggle','list-row','avatar','account'],
  desc='A settings screen in grouped cards. A profile row with avatar, name, email and chevron leads; a "Notifications" group holds three rows with toggles (two on), an "Appearance" group shows Theme and App icon values, a "Privacy" group has Face ID and Export my data rows. A red "Sign out" sits alone at the bottom. Built on {words}. Idea: section headers and grouped rows; toggles apply instantly and destructive actions live last.'),
  '''<div class="row"><div class="ico" style="width:36px;height:36px;border-radius:50%">'''+ic('back')+'''</div><b class="h3" style="margin:auto">Settings</b><span style="width:36px"></span></div>
  <div class="card row" style="margin-top:18px"><div class="av"></div><div class="col"><b>Maya Lin</b><span class="small">maya@northwind.co</span></div><div class="sp"></div>'''+ic('chev')+'''</div>
  '''+''.join(f'<span class="eyebrow" style="margin:20px 6px 8px">{g}</span><div class="card" style="padding:4px 16px"><div class="list">'+''.join(f'<div class="li"><div class="ico" style="width:32px;height:32px;border-radius:9px">{ic(k)}</div><span>{l}</span><div class="sp"></div>{r}</div>' for k,l,r in rows)+'</div></div>' for g,rows in [
   ('Notifications',[('bell','Daily reminder','<i class="toggle on"></i>'),('star','Streak milestones','<i class="toggle on"></i>'),('mail','Weekly summary email','<i class="toggle"></i>')]),
   ('Appearance',[('moon','Theme','<span class="small">System</span>'+ic('chev')),('grid','App icon','<span class="small">Classic</span>'+ic('chev'))]),
   ('Privacy',[('lock','Face ID lock','<i class="toggle on"></i>'),('doc','Export my data','<span class="small">CSV</span>'+ic('chev'))])])+'''
  <div class="sp"></div><button class="btn" style="color:#E5625A">Sign out</button>''')

# 6 chat ----------------------------------------------------------------------
screen('assistant-chat', dict(viewport='phone', title='AI assistant chat with composer', category='mobile-app-ui', type='screen', roles=['chat'],
  style=['minimal','rounded'], tags=['ai','assistant','chat','prompt','chips','input'],
  desc='An AI assistant conversation. A header names the assistant with a model pill. A compact user bubble asks to plan a three-day Lisbon trip under €600; the reply runs full width with a short intro, a three-row itinerary card (Day 1–3 with costs) and a total, followed by a quiet tool-status line. Two suggestion chips sit above an anchored composer with attach, text, mic and an accent send button. Built on {words}. Idea: user messages as bubbles, assistant answers full-width, composer always anchored.'),
  '''<div class="row"><div class="ico" style="width:36px;height:36px;border-radius:50%">'''+ic('back')+'''</div><div class="col" style="margin:auto;align-items:center"><b>Atlas</b><span class="small">GPT-class · travel</span></div><div class="ico" style="width:36px;height:36px;border-radius:50%">'''+ic('more')+'''</div></div>
  <div class="col g16" style="margin-top:18px">
   <div style="align-self:flex-end;max-width:78%;padding:12px 14px;border-radius:18px 18px 6px 18px;background:var(--accent);color:var(--onAccent);font-weight:500">Plan 3 days in Lisbon under €600, I love food and views.</div>
   <div class="col g12"><div class="row g8"><span class="ico a" style="width:26px;height:26px;border-radius:50%">'''+ic('spark')+'''</span><b>Atlas</b></div>
    <p>Here’s a relaxed plan that keeps you near Alfama and saves for one great dinner:</p>
    <div class="card" style="padding:4px 14px"><div class="list">'''+''.join(f'<div class="li"><span class="tag">Day {d}</span><span style="font-size:14px">{t}</span><div class="sp"></div><b class="num" style="font-size:14px">€{c}</b></div>' for d,t,c in [(1,'Tram 28 · Miradouro da Graça',140),(2,'Belém · Pastéis · LX Factory',165),(3,'Sintra day trip',190)])+'''</div></div>
    <div class="row"><span class="small">Total with stays</span><div class="sp"></div><b class="num">€495</b></div>
    <span class="small" style="font-family:var(--mono);font-size:11.5px">✓ checked 14 stays · 3 restaurants</span></div>
  </div>
  <div class="sp"></div>
  <div class="row g8" style="margin-bottom:10px"><span class="pill">Swap Sintra for beaches</span><span class="pill">Book stays</span></div>
  <div class="row g8" style="padding:8px 8px 8px 14px;border-radius:22px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--line)">'''+ic('clip')+'''<span class="small" style="flex:1">Ask Atlas anything…</span>'''+ic('mic')+'''<span class="ico a" style="width:38px;height:38px;border-radius:50%">'''+ic('send')+'''</span></div>''')

# 7 cart ------------------------------------------------------------------------
screen('cart-sticky-checkout', dict(viewport='phone', title='Cart with sticky pay button', category='mobile-app-ui', type='screen', roles=['checkout','list'],
  style=['card-based','rounded'], tags=['cart','checkout','food','stepper','sticky-cta','price'],
  desc='A food-delivery cart. Three line items with colour-block dish thumbnails, notes and −/+ steppers sit above a delivery-time card ("Arrives 7:40–7:55 PM") and a promo row with an applied code. A summary lists subtotal, delivery, service and a discount in green. A sticky bottom bar shows the total and a primary "Pay $42.10" button. Built on {words}. Idea: the consequence on the button and the total always within thumb reach.'),
  '''<div class="row"><div class="ico" style="width:36px;height:36px;border-radius:50%">'''+ic('back')+'''</div><b class="h3" style="margin:auto">Your cart</b><span class="small" style="width:36px">Edit</span></div>
  <div class="list" style="margin-top:14px">'''+''.join(f'<div class="li"><div style="width:56px;height:56px;border-radius:14px;background:{bg};flex:none;display:grid;place-items:center;font-size:24px">{e}</div><div class="col"><b>{n}</b><span class="small">{s}</span><b class="num" style="margin-top:4px">${p}</b></div><div class="sp"></div><div class="row g8" style="background:var(--surface2);border-radius:999px;padding:4px"><span class="ico" style="width:28px;height:28px;border-radius:50%;background:var(--surface)">−</span><b class="num">{q}</b><span class="ico" style="width:28px;height:28px;border-radius:50%;background:var(--surface)">+</span></div></div>' for n,s,p,q,bg,e in [('Miso ramen','Extra egg · medium spice','14.50',1,'color-mix(in oklab,var(--accent) 35%,var(--surface2))','🍜'),('Gyoza','6 pieces','8.00',2,'color-mix(in oklab,var(--accent2) 45%,var(--surface2))','🥟'),('Yuzu soda','No ice','4.50',1,'var(--surface2)','🥤')])+'''</div>
  <div class="tint row" style="margin-top:12px">'''+ic('send')+'''<div class="col"><b>Arrives 7:40–7:55 PM</b><span class="small">Standard · 2.1 km away</span></div></div>
  <div class="col g8" style="margin-top:16px">'''+''.join(f'<div class="row"><span class="small">{l}</span><div class="sp"></div><span class="num {c}">{v}</span></div>' for l,v,c in [('Subtotal','$39.50',''),('Delivery','$2.99',''),('Service','$2.11',''),('Code WELCOME','−$2.50','up')])+'''</div>
  <div class="sp"></div>
  <div class="row" style="padding:12px 4px 0;border-top:1px solid var(--line)"><div class="col"><span class="small">Total</span><b class="d2 num">$42.10</b></div><div class="sp"></div><button class="btn btn-p" style="padding:0 30px">Pay $42.10</button></div>''')

# 8 empty state -------------------------------------------------------------------
screen('empty-state-teach', dict(viewport='phone', title='Empty inbox that teaches', category='mobile-app-ui', type='screen', roles=['empty-state','list'],
  style=['minimal','illustration-led'], tags=['empty-state','illustration','cta-button','onboarding'],
  desc='An empty "Saved" tab that teaches instead of apologising. A segmented control (Saved / Collections) sits under the title; the centre shows a ghosted preview of two saved cards stacked behind a bookmark badge, the line "Nothing saved yet", a sentence explaining how saving works and a single "Browse ideas" button. A tab bar sits below. Built on {words}. Idea: show the filled state as a ghost and offer exactly one next step.'),
  '''<h1 class="d1" style="margin-top:10px">Saved</h1>
  <div class="row" style="margin-top:14px;padding:4px;border-radius:12px;background:var(--surface2)"><span class="pill on" style="flex:1;justify-content:center;border-radius:9px">Saved</span><span class="pill" style="flex:1;justify-content:center;background:none">Collections</span></div>
  <div class="col" style="flex:1;align-items:center;justify-content:center;text-align:center;padding-bottom:70px">
   <div style="position:relative;width:200px;height:170px;margin-bottom:26px">
    <div class="card" style="position:absolute;inset:20px 10px 30px 30px;transform:rotate(6deg);opacity:.45"></div>
    <div class="card" style="position:absolute;inset:10px 30px 40px 10px;transform:rotate(-5deg);opacity:.7;display:grid;gap:8px;align-content:start"><i style="height:54px;border-radius:10px;background:var(--surface2)"></i><i style="height:8px;width:70%;border-radius:4px;background:var(--surface2)"></i><i style="height:8px;width:45%;border-radius:4px;background:var(--surface2)"></i></div>
    <div class="ico a" style="position:absolute;right:16px;bottom:12px;width:56px;height:56px;border-radius:18px;box-shadow:0 14px 30px -10px var(--accent)">'''+ic('heart')+'''</div></div>
   <h2 class="d2">Nothing saved yet</h2><p class="lede" style="margin:8px 20px 22px">Tap the heart on any idea and it lands here, ready to sort into collections.</p>
   <button class="btn btn-p" style="padding:0 34px">Browse ideas</button></div>
  '''+tabbar('inbox'))

# 9 profile ----------------------------------------------------------------------
screen('profile-stats', dict(viewport='phone', title='Profile with stats and streak grid', category='mobile-app-ui', type='screen', roles=['profile'],
  style=['card-based','rounded'], tags=['avatar','stats','streak','progress','grid'],
  desc='A user profile. A large avatar, name and handle sit centred above "Edit profile" and share buttons; a three-up stat row shows Streak 42, Habits 7 and Done 318. A "Last 12 weeks" card renders a contribution-style grid of squares in four intensities of the accent, and a "Badges" row holds three round achievement medals. Built on {words}. Idea: identity first, stats as a compact row, history as a dense glanceable grid.'),
  '''<div class="row"><div class="sp"></div><div class="ico" style="width:36px;height:36px;border-radius:50%">'''+ic('cog')+'''</div></div>
  <div class="col" style="align-items:center;text-align:center"><div class="av" style="width:88px;height:88px;box-shadow:0 0 0 4px var(--bg),0 0 0 6px var(--accent)"></div><b class="d2" style="margin-top:12px">Maya Lin</b><span class="small">@mayalin · since 2024</span>
  <div class="row g8" style="margin-top:14px"><button class="btn btn-sm btn-p">Edit profile</button><button class="btn btn-sm">Share</button></div></div>
  <div class="row" style="margin-top:20px;gap:8px">'''+''.join(f'<div class="tint col" style="flex:1;align-items:center;padding:14px 8px"><b class="d2 num">{v}</b><span class="small">{l}</span></div>' for v,l in [('42','Day streak'),('7','Habits'),('318','Check-ins')])+'''</div>
  <div class="card" style="margin-top:12px"><div class="row"><b class="h3">Last 12 weeks</b><div class="sp"></div><span class="small">87% on time</span></div>
   <div style="display:grid;grid-template-columns:repeat(12,1fr);grid-template-rows:repeat(7,1fr);grid-auto-flow:column;gap:4px;margin-top:12px">'''+''.join(f'<i style="aspect-ratio:1;border-radius:4px;background:color-mix(in oklab,var(--accent) {[8,30,60,100][(k*7+k//3)%4 if (k*13)%9 else 0]}%,var(--surface2))"></i>' for k in range(84))+'''</div></div>
  <div class="row" style="margin-top:14px"><b class="h3">Badges</b><div class="sp"></div><span class="small">3 of 12</span></div>
  <div class="row g12" style="margin-top:10px">'''+''.join(f'<div class="col g4" style="align-items:center"><div class="ico a" style="width:52px;height:52px;border-radius:50%">{ic(k)}</div><span class="small" style="font-size:11.5px">{l}</span></div>' for k,l in [('star','First week'),('spark','30 days'),('heart','Kind streak')])+'''</div>''')

# 10 search ------------------------------------------------------------------------
screen('search-chips-results', dict(viewport='phone', title='Search with filter chips and results', category='mobile-app-ui', type='screen', roles=['search','list'],
  style=['minimal','card-based'], tags=['search','chips','filters','list-row','rating'],
  desc='A search results screen for places. A focused search field reads "coffee" with a clear button; a horizontally scrolling chip row (Open now, Under $$, Wi-Fi, Outdoor) has the first chip selected and a filter icon at the end. A results count leads into four rows, each with a tinted square thumbnail, name, distance and price, a star rating and an open/closed tag. Built on {words}. Idea: chips never wrap — they scroll — and each row has the same anatomy.'),
  '''<div class="field focus" style="margin-top:8px">'''+ic('search')+'''<span style="color:var(--text)">coffee</span><div class="sp"></div><span class="ico" style="width:24px;height:24px;border-radius:50%;font-size:11px">✕</span></div>
  <div class="row g8" style="margin-top:12px;overflow:hidden;white-space:nowrap"><span class="pill on">Open now</span><span class="pill">Under $$</span><span class="pill">Wi-Fi</span><span class="pill">Outdoor</span><span class="pill">'''+ic('filter')+'''</span></div>
  <div class="row" style="margin:18px 2px 6px"><span class="small">24 places near you</span><div class="sp"></div><span class="small">Sort: Distance</span></div>
  <div class="list">'''+''.join(f'<div class="li"><div style="width:64px;height:64px;border-radius:16px;flex:none;background:linear-gradient(135deg,color-mix(in oklab,var(--accent) {a}%,var(--surface2)),var(--surface2))"></div><div class="col g4" style="min-width:0"><b>{n}</b><span class="small">{d} · {p}</span><span class="small">★ <b style="color:var(--text)">{r}</b> ({c})</span></div><div class="sp"></div><span class="tag" style="{"" if o else "background:var(--surface2);color:var(--muted)"}">{"Open" if o else "Closed"}</span></div>' for n,d,p,r,c,o,a in [('Fábrica Coffee','350 m','$$','4.8',812,1,70),('Hello, Kristof','600 m','$','4.7',540,1,45),('Copenhagen Coffee Lab','900 m','$$','4.6',1203,1,30),('Comoba','1.4 km','$$','4.5',388,0,55)])+'''</div>''')

# 11 landing desktop -----------------------------------------------------------------
screen('landing-hero-desktop', dict(viewport='desktop', title='Product landing hero with app preview', category='website', type='screen', roles=['landing-section','hero'],
  style=['bold-typography','minimal'], tags=['landing-page','hero','headline','cta-button','social-proof','desktop'],
  desc='A desktop landing page hero for a habit app. A slim nav carries the wordmark, four links and "Sign in" / "Get the app". The left column has an eyebrow pill ("New · Streak insights"), a two-line headline "Build habits that actually stick.", a sentence of support, primary and ghost CTAs and a row of five avatars with "Loved by 40k people". The right column shows a code-built phone preview with a streak card, progress ring and checklist on a tinted panel. Built on {words}. Idea: outcome headline, one primary action and a real product visual above the fold.'),
  '''<div style="height:100%;display:flex;flex-direction:column;padding:0 64px">
  <div class="row" style="height:84px"><b class="h3 row g8"><span class="ico a" style="width:28px;height:28px;border-radius:8px">'''+ic('star','i')+'''</span>Streakly</b><div class="row g24" style="margin-left:48px;color:var(--muted);font-size:14.5px"><span>Product</span><span>Stories</span><span>Pricing</span><span>Journal</span></div><div class="sp"></div><button class="btn btn-sm" style="background:none">Sign in</button><button class="btn btn-sm btn-p" style="margin-left:6px">Get the app</button></div>
  <div class="row" style="flex:1;gap:64px">
   <div class="col" style="flex:1.1">
    <span class="pill" style="align-self:flex-start"><span class="tag" style="height:20px">New</span>Streak insights</span>
    <h1 class="d1" style="font-size:76px;line-height:.98;margin-top:22px">Build habits that <em>actually stick.</em></h1>
    <p class="lede" style="font-size:19px;max-width:30em;margin-top:20px">Gentle reminders, honest insights and a streak you’ll want to protect. Free for your first three habits.</p>
    <div class="row g12" style="margin-top:30px"><button class="btn btn-p" style="padding:0 28px">Start free</button><button class="btn btn-o" style="padding:0 24px">See how it works</button></div>
    <div class="row g12" style="margin-top:34px"><div class="row" style="gap:0">'''+''.join(f'<span class="av s" style="width:34px;height:34px;margin-left:{0 if i==0 else -10}px;box-shadow:0 0 0 3px var(--bg);filter:hue-rotate({i*40}deg)"></span>' for i in range(5))+'''</div><span class="small"><b style="color:var(--text)">★ 4.9</b> · Loved by 40k people</span></div>
   </div>
   <div style="flex:.9;height:640px;border-radius:32px;background:radial-gradient(70% 60% at 50% 40%,color-mix(in oklab,var(--accent) 28%,var(--surface2)),var(--surface2));display:grid;place-items:center;position:relative;overflow:hidden">
    <div style="width:290px;height:590px;border-radius:44px;background:var(--bg);box-shadow:0 0 0 7px #0B0B0C,0 40px 80px -30px rgba(0,0,0,.5);padding:46px 16px 16px;display:flex;flex-direction:column;gap:12px;transform:translateY(60px)">
     <b class="h3">Today</b>
     <div class="card row"><div style="width:64px;height:64px;border-radius:50%;background:conic-gradient(var(--accent) 0 72%,var(--surface2) 0);display:grid;place-items:center"><i style="width:48px;height:48px;border-radius:50%;background:var(--surface);display:grid;place-items:center;font:600 14px var(--sans);font-style:normal">72%</i></div><div class="col"><b>5 of 7 done</b><span class="small">Keep the 42-day streak</span></div></div>
     '''+''.join(f'<div class="card row" style="padding:12px"><span class="ico {"a" if d else ""}" style="width:26px;height:26px;border-radius:50%">{ic("check") if d else ""}</span><span style="font-size:14px">{t}</span></div>' for t,d in [('Morning walk',1),('Read 20 pages',1),('No phone after 10',0),('Stretch',0)])+'''
    </div></div>
  </div></div>''')

# 12 analytics desktop ------------------------------------------------------------------
screen('analytics-desktop', dict(viewport='desktop', title='Analytics overview with sidebar', category='dashboard', type='screen', roles=['dashboard'],
  style=['data-dense','card-based'], tags=['analytics','sidebar','kpi','metric-tile','line-chart','data-table','desktop'],
  desc='A desktop analytics overview. A sidebar groups navigation under Main and Workspace with the active item tinted. The canvas has a title row with a date-range control, four KPI tiles (Revenue $184.2k, Active users 12,480, Conversion 3.8%, Churn 1.2%) each with a delta, a large area chart of revenue over twelve months with a highlighted point, a "Top channels" list with inline bars, and a compact table of recent deals with status pills. Built on {words}. Idea: KPI strip, one dominant chart, tables recede.'),
  '''<div class="row" style="height:100%;align-items:stretch;gap:0">
  <aside style="width:236px;background:var(--surface);border-right:1px solid var(--line);padding:20px 14px;display:flex;flex-direction:column;gap:2px">
   <b class="h3 row g8" style="padding:0 8px 18px"><span class="ico a" style="width:28px;height:28px;border-radius:8px">'''+ic('chart')+'''</span>Meridian</b>
   <span class="eyebrow" style="padding:10px 10px 6px">Main</span>'''+''.join(f'<span class="row g12" style="height:38px;padding:0 10px;border-radius:10px;{"background:var(--surface2);color:var(--text)" if i==0 else "color:var(--muted)"}">{ic(k)}<span style="font-size:14px">{l}</span></span>' for i,(k,l) in enumerate([('grid','Overview'),('chart','Reports'),('doc','Deals'),('user','Customers')]))+'''
   <span class="eyebrow" style="padding:18px 10px 6px">Workspace</span>'''+''.join(f'<span class="row g12" style="height:38px;padding:0 10px;color:var(--muted)">{ic(k)}<span style="font-size:14px">{l}</span></span>' for k,l in [('inbox','Inbox'),('cog','Settings')])+'''
  </aside>
  <div style="flex:1;padding:26px 32px;display:flex;flex-direction:column;gap:18px;min-width:0">
   <div class="row"><div class="col"><h1 class="d2" style="font-size:26px">Overview</h1><span class="small">Updated 2 minutes ago</span></div><div class="sp"></div><span class="pill">Last 12 months</span><button class="btn btn-sm btn-p" style="margin-left:8px">Export</button></div>
   <div class="row g12">'''+''.join(f'<div class="card col g4" style="flex:1"><span class="small">{l}</span><b class="d2 num" style="font-size:28px">{v}</b><span class="small {c}" style="font-weight:600">{d}</span></div>' for l,v,d,c in [('Revenue','$184.2k','▲ 12.4%','up'),('Active users','12,480','▲ 4.1%','up'),('Conversion','3.8%','▲ 0.3 pts','up'),('Churn','1.2%','▼ 0.2 pts','down')])+'''</div>
   <div class="row g12" style="flex:1;align-items:stretch;min-height:0">
    <div class="card" style="flex:1.7;display:flex;flex-direction:column"><div class="row"><b class="h3">Revenue</b><div class="sp"></div><span class="small">Monthly · USD</span></div>
     <svg viewBox="0 0 600 220" preserveAspectRatio="none" style="width:100%;flex:1;margin-top:12px"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".35"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>'''+''.join(f'<line x1="0" x2="600" y1="{y}" y2="{y}" stroke="var(--line)"/>' for y in (40,95,150,205))+'''<path d="M0 170 C50 160 70 150 100 140 S160 150 200 120 S260 95 300 105 S360 80 400 70 S470 85 500 60 S560 40 600 30 L600 220 L0 220Z" fill="url(#g)"/><path d="M0 170 C50 160 70 150 100 140 S160 150 200 120 S260 95 300 105 S360 80 400 70 S470 85 500 60 S560 40 600 30" fill="none" stroke="var(--accent)" stroke-width="3"/><circle cx="400" cy="70" r="6" fill="var(--accent)" stroke="var(--surface)" stroke-width="3"/></svg>
     <div class="row" style="justify-content:space-between;margin-top:6px">'''+''.join(f'<span class="small" style="font-size:11px">{m}</span>' for m in 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split())+'''</div></div>
    <div class="card" style="flex:1"><b class="h3">Top channels</b><div class="col g16" style="margin-top:16px">'''+''.join(f'<div class="col g8"><div class="row"><span style="font-size:14px">{n}</span><div class="sp"></div><b class="num" style="font-size:14px">{v}</b></div><div class="bar-track"><i style="width:{p}%"></i></div></div>' for n,v,p in [('Organic search','$64.1k',88),('Referrals','$41.7k',62),('Paid social','$33.0k',48),('Email','$26.9k',38),('Partners','$18.5k',26)])+'''</div></div>
   </div>
   <div class="card" style="padding:6px 18px"><div class="list">'''+''.join(f'<div class="li" style="padding:10px 0"><span class="av s"></span><b style="width:180px;font-size:14px">{n}</b><span class="small" style="width:150px">{p}</span><span class="tag" style="{"" if s=="Won" else "background:var(--surface2);color:var(--muted)"}">{s}</span><div class="sp"></div><b class="num" style="font-size:14px">{v}</b></div>' for n,p,s,v in [('Northwind Labs','Team · annual','Won','$41,400'),('Parallax Studio','Pro · monthly','Trial','$2,320'),('Orbit AI','Team · annual','Won','$89,200')])+'''</div></div>
  </div></div>''')

# 13 components: buttons & inputs ---------------------------------------------------------
screen('components-controls', dict(viewport='canvas', title='Buttons, inputs and controls sheet', category='design-system', type='component', roles=['form'],
  style=['flat','minimal'], tags=['components','buttons','input','toggle','chips','segmented-control','slider'],
  desc='A component sheet documenting a control set. Rows show buttons in primary, secondary, outline and ghost variants at two sizes plus a disabled state; text fields in default, focused (with accent ring) and error states with helper text; a segmented control, chips with one selected, toggles on and off, a checkbox, radio and a slider with value. Labels in mono caps name each group. Built on {words}. Idea: every state on one page, so the system is reviewed as a whole.'),
  '''<div class="row" style="align-items:flex-end"><div class="col g8"><span class="eyebrow">Components · v1.0</span><h1 class="d1">Controls</h1></div><div class="sp"></div><span class="kbd">tokens: radius, accent, surface</span></div>
  <div class="col g24" style="margin-top:34px">
   <div class="col g12"><span class="eyebrow">Buttons</span><div class="row g12"><button class="btn btn-p" style="padding:0 24px">Primary</button><button class="btn" style="padding:0 24px">Secondary</button><button class="btn btn-o" style="padding:0 24px">Outline</button><button class="btn" style="padding:0 24px;background:none">Ghost</button><button class="btn btn-sm btn-p">Small</button><button class="btn btn-sm">Small</button><button class="btn btn-p" style="padding:0 24px;opacity:.35">Disabled</button></div></div>
   <div class="col g12"><span class="eyebrow">Text fields</span><div class="row g16" style="align-items:flex-start">'''+''.join(f'<div class="col g8" style="flex:1"><b style="font-size:13.5px">{l}</b><div class="field {c}" style="{s}">{ic(k)}<span style="{t}">{v}</span></div><span class="small" style="{h}">{hint}</span></div>' for l,c,k,v,hint,s,t,h in [('Email','', 'mail','you@company.com','We never share it.','','',''),('Name','focus','user','Maya Lin','Looks good.','','color:var(--text)',''),('Password','','lock','••••••','At least 8 characters.','box-shadow:inset 0 0 0 1.5px #E5625A','color:var(--text)','color:#E5625A')])+'''</div></div>
   <div class="row g24" style="align-items:flex-start">
    <div class="col g12"><span class="eyebrow">Segmented</span><div class="row" style="padding:4px;border-radius:12px;background:var(--surface2)"><span class="pill on" style="border-radius:9px">Day</span><span class="pill" style="background:none">Week</span><span class="pill" style="background:none">Month</span></div></div>
    <div class="col g12"><span class="eyebrow">Chips</span><div class="row g8"><span class="pill on">All</span><span class="pill">Design</span><span class="pill">Code</span><span class="pill">Research</span></div></div>
    <div class="col g12"><span class="eyebrow">Toggles</span><div class="row g12"><i class="toggle on"></i><i class="toggle"></i></div></div>
    <div class="col g12"><span class="eyebrow">Choice</span><div class="row g12"><span class="ico a" style="width:22px;height:22px;border-radius:6px">'''+ic('check')+'''</span><span style="width:22px;height:22px;border-radius:50%;box-shadow:inset 0 0 0 6px var(--accent)"></span></div></div>
   </div>
   <div class="col g12"><span class="eyebrow">Slider</span><div class="row g16"><div style="flex:1;height:6px;border-radius:6px;background:var(--surface2);position:relative"><i style="position:absolute;inset:0 38% 0 0;border-radius:6px;background:var(--accent)"></i><i style="position:absolute;left:62%;top:50%;width:22px;height:22px;border-radius:50%;background:#fff;translate:-50% -50%;box-shadow:0 2px 6px rgba(0,0,0,.3)"></i></div><b class="num">62%</b></div></div>
  </div>''')

# 14 components: cards ------------------------------------------------------------------
screen('components-cards', dict(viewport='canvas', title='Card patterns sheet', category='design-system', type='component', roles=['detail'],
  style=['card-based','rounded'], tags=['components','card','kpi','list-row','avatar','progress'],
  desc='A component sheet of six card patterns on one grid: a metric card with hero number and sparkline, a person card with avatar and follow button, a progress card with a ring and steps, a notification card with an action, a media card with a tinted image block and tags, and a list card with three rows. Built on {words}. Idea: one radius, one padding and one shadow rule shared by every card.'),
  '''<div class="row" style="align-items:flex-end"><div class="col g8"><span class="eyebrow">Components · v1.0</span><h1 class="d1">Cards</h1></div><div class="sp"></div><span class="kbd">radius var(--r) · padding 16</span></div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:30px">
   <div class="card col g8"><span class="small">Monthly revenue</span><b class="big num" style="font-size:40px">$48.2k</b><span class="small up" style="font-weight:600">▲ 9.1% vs last month</span><svg viewBox="0 0 200 40" style="width:100%;height:40px"><path d="M0 34 L25 28 L50 30 L75 20 L100 22 L125 14 L150 16 L175 8 L200 6" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/></svg></div>
   <div class="card col g12" style="align-items:center;text-align:center"><div class="av" style="width:64px;height:64px"></div><div class="col"><b class="h3">Ana Ruiz</b><span class="small">Product designer · Lisbon</span></div><div class="row g8"><button class="btn btn-sm btn-p">Follow</button><button class="btn btn-sm">Message</button></div></div>
   <div class="card row g16"><div style="width:84px;height:84px;border-radius:50%;flex:none;background:conic-gradient(var(--accent) 0 64%,var(--surface2) 0);display:grid;place-items:center"><i style="width:64px;height:64px;border-radius:50%;background:var(--surface);display:grid;place-items:center;font:600 16px var(--sans);font-style:normal">64%</i></div><div class="col g8"><b class="h3">Profile setup</b><span class="small">✓ Photo · ✓ Bio · ✓ Links</span><span class="small">○ Verify email</span></div></div>
   <div class="card col g12"><div class="row"><span class="ico a">'''+ic('bell')+'''</span><div class="col"><b>Payout sent</b><span class="small">$2,140.00 to •••• 4417</span></div></div><div class="row g8"><button class="btn btn-sm">View receipt</button><span class="small">2 min ago</span></div></div>
   <div class="card col g12" style="padding:10px"><div style="height:120px;border-radius:calc(var(--r) * .7);background:linear-gradient(135deg,var(--accent),var(--accent2))"></div><div class="col g8" style="padding:4px 6px 6px"><b class="h3">Designing calm interfaces</b><div class="row g8"><span class="tag">Guide</span><span class="small">8 min read</span></div></div></div>
   <div class="card" style="padding:4px 16px"><div class="list">'''+''.join(f'<div class="li"><span class="ico" style="width:32px;height:32px;border-radius:9px">{ic(k)}</span><span>{l}</span><div class="sp"></div><span class="small">{r}</span></div>' for k,l,r in [('doc','Brand guidelines','PDF · 4 MB'),('grid','Icon set','SVG · 240'),('star','Release notes','Today')])+'''</div></div>
  </div>''')

print(len(SCREENS), 'screens')
