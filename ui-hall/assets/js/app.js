/* UI Hall — application controller.
   Owns the sidebar facets, the toolbar, routing and the render loop. */

const App = (() => {
  let corpus = null;
  let sorted = [];
  let pending = false;
  // True once the user clicks a category chip. Used so leaving the before/after
  // route only releases the category the *route* forced, never a user choice.
  let userPickedCategory = false;

  /* ------------------------------------------------------------ facets --- */

  function chip(key, value, label, count, hue) {
    const on = Filters.state[key].includes(value);
    const btn = el('button', {
      type: 'button',
      class: 'chip' + (on ? ' is-on' : ''),
      'aria-pressed': on ? 'true' : 'false',
      onclick: () => {
        if (key === 'category') userPickedCategory = true;
        Filters.toggle(key, value);
      },
      title: `${label} — ${count} assets`,
    });
    if (hue) btn.append(el('span', { class: 'chip__dot', style: `background:${hue}` }));
    btn.append(el('span', { text: label }));
    if (count != null) btn.append(el('span', { class: 'chip__n', text: String(count) }));
    return btn;
  }

  function buildFacets() {
    const assets = DATA.all();
    const cats = corpus.categories || [];

    // category
    const catCounts = Filters.counts(assets, 'category', (a) => [a.category]);
    const catWrap = document.getElementById('fCategory');
    catWrap.innerHTML = '';
    for (const c of cats) {
      const n = catCounts.get(c.id) || 0;
      if (!n) continue;
      catWrap.append(chip('category', c.id, `${c.label}`, n, `var(--cat-${c.id})`));
    }

    // role
    const roleCounts = Filters.counts(assets, 'role', (a) => a.roles || []);
    const roleWrap = document.getElementById('fRole');
    roleWrap.innerHTML = '';
    for (const r of corpus.roles || []) {
      const n = roleCounts.get(r.id) || 0;
      if (!n) continue;
      roleWrap.append(chip('role', r.id, fmt.titleCase(r.id), n));
    }

    // style
    const styleCounts = Filters.counts(assets, 'style', (a) => a.style || []);
    const styleWrap = document.getElementById('fStyle');
    styleWrap.innerHTML = '';
    for (const s of corpus.styles || []) {
      const n = styleCounts.get(s.id) || 0;
      if (!n) continue;
      styleWrap.append(chip('style', s.id, s.id, n));
    }

    // orientation
    const oriCounts = Filters.counts(assets, 'orientation', (a) => (a.orientation ? [a.orientation] : []));
    const oriWrap = document.getElementById('fOrientation');
    oriWrap.innerHTML = '';
    for (const o of ['portrait', 'landscape', 'square']) {
      const n = oriCounts.get(o) || 0;
      if (!n) continue;
      oriWrap.append(chip('orientation', o, o, n));
    }

    // hue — derived from the measured palette
    const hueColors = { red: '#e0574f', orange: '#e08a3c', yellow: '#d6c341', green: '#4ea86a', teal: '#3aa9a0', blue: '#5b8fe0', purple: '#8a6fd8', pink: '#d86fa0' };
    const hueCounts = Filters.counts(assets, 'hue', (a) => a._hues);
    const hueWrap = document.getElementById('fHue');
    hueWrap.innerHTML = '';
    for (const [h, col] of Object.entries(hueColors)) {
      const n = hueCounts.get(h) || 0;
      if (!n) continue;
      hueWrap.append(chip('hue', h, h, n, col));
    }

    // surface
    const surfCounts = Filters.counts(assets, 'surface', (a) => a._surfaces);
    const surfWrap = document.getElementById('fSurface');
    surfWrap.innerHTML = '';
    for (const s of ['dark', 'light', 'mid']) {
      const n = surfCounts.get(s) || 0;
      if (!n) continue;
      surfWrap.append(chip('surface', s, s === 'mid' ? 'mid-tone' : s, n));
    }

    // clip
    const clipWrap = document.getElementById('fClip');
    clipWrap.innerHTML = '';
    const withClip = Filters.counts(assets, 'clip', (a) => (a.clip ? ['clip'] : ['still']));
    for (const c of ['clip', 'still']) {
      const n = clipWithClip(withClip, c);
      clipWrap.append(chip('clip', c, c === 'clip' ? 'Has clip' : 'Still only', n));
    }

    // screen groups — buckets first, then the individual sets
    const groupWrap = document.getElementById('fGroup');
    groupWrap.innerHTML = '';
    const groups = corpus.groups || [];
    const inGroup = assets.filter((a) => a.group && a.group_size > 1).length;
    if (inGroup) {
      groupWrap.append(chip('group', 'grouped', 'in a set', inGroup));
      groupWrap.append(chip('group', 'solo', 'single screen', assets.length - inGroup));
      const label = el('span', { class: 'chips__label', text: 'sets' });
      groupWrap.append(label);
      for (const g of groups) {
        if (g.count < 2) continue;
        groupWrap.append(chip('group', g.id, `${g.title} · ${g.count}`, g.count));
      }
    }

    // tags — top 40 by default
    renderTags(assets, 40);

    // reset buttons appear only when there is something to reset
    for (const btn of document.querySelectorAll('[data-reset]')) {
      btn.hidden = false;
    }
  }

  const clipWithClip = (m, k) => (m.get(k) || 0);

  function renderTags(assets, limit) {
    const tagCounts = Filters.counts(assets, 'tag', (a) => a.tags || []);
    const wrap = document.getElementById('fTag');
    const all = (corpus.tags || []).filter((t) => tagCounts.get(t.id));
    wrap.innerHTML = '';
    const shown = limit ? all.slice(0, limit) : all;
    for (const t of shown) wrap.append(chip('tag', t.id, t.id, tagCounts.get(t.id)));
    const btn = document.getElementById('moreTags');
    if (!limit || all.length <= limit) { btn.hidden = true; return; }
    btn.hidden = false;
    btn.textContent = `Show all ${all.length} tags`;
    btn.onclick = () => { renderTags(assets, 0); };
  }

  function buildActiveBar() {
    const bar = document.getElementById('activeFilters');
    const s = Filters.state;
    bar.innerHTML = '';
    const items = [];
    for (const k of ['category', 'role', 'style', 'tag', 'orientation', 'hue', 'surface', 'clip', 'group']) {
      for (const v of s[k]) {
        const g = (corpus.groups || []).find((x) => x.id === v);
        const label = g ? `${g.title} (${v})` : fmt.titleCase(v);
        items.push({ k, v, label });
      }
    }
    if (s.q) items.push({ k: 'q', v: s.q, label: `“${s.q}”` });
    if (s.kind !== 'all') items.push({ k: 'kind', v: s.kind, label: s.kind === 'image' ? 'Images only' : 'Video only' });
    if (s.seed) items.push({ k: 'seed', v: '', label: 'shuffled' });

    bar.hidden = items.length === 0;
    for (const it of items) {
      const c = el('span', { class: 'activefilters__chip' }, el('span', { text: it.label }));
      c.append(el('button', {
        type: 'button',
        'aria-label': `Remove ${it.label}`,
        html: '<svg viewBox="0 0 20 20"><path d="M6 6l8 8M14 6l-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        onclick: () => {
          if (it.k === 'q') { const q = document.getElementById('q'); q.value = ''; Filters.set('q', ''); }
          else if (it.k === 'kind') Filters.set('kind', 'all');
          else if (it.k === 'seed') Filters.set('seed', 0);
          else {
            if (it.k === 'category') userPickedCategory = false;
            Filters.toggle(it.k, it.v);
          }
        },
      }));
      bar.append(c);
    }
    bar.append(el('button', {
      class: 'btn btn--ghost btn--sm', type: 'button', text: 'Clear all',
      onclick: () => { userPickedCategory = false; Filters.resetAll(); },
    }));
  }

  /* ------------------------------------------------------------ render --- */

  function renderResults() {
    const assets = DATA.all();
    sorted = Filters.apply(assets);
    const results = document.getElementById('results');
    const empty = document.getElementById('emptyState');
    const count = document.getElementById('resultCount');
    const total = assets.length;

    const shown = sorted.length;
    count.innerHTML = selectedScopeLabel() +
      ` <b>${fmt.n(shown)}</b> of ${fmt.n(total)} assets` +
      (shown !== total ? ` <span style="color:var(--text-3)">— ${fmt.n(total - shown)} filtered out</span>` : '');

    empty.hidden = shown > 0;
    if (shown) Render.grid(results, sorted);
    else results.innerHTML = '';

    buildActiveBar();
    buildFacets();

    // keep the lightbox's step order in sync with what is on screen
    document.dispatchEvent(new CustomEvent('uihall:results', { detail: sorted.map((a) => a.id) }));
    Window_scrollTop();
  }

  const Window_scrollTop = () => { /* results render at the top of main; no scroll reset needed */ };

  function selectedScopeLabel() {
    const r = Filters.currentRoute();
    const s = Filters.state;
    if (r === 'motion') return 'Motion clips —';
    if (r === 'before-after') return 'Before / after —';
    if (r === 'palettes') return 'Palettes —';
    if (s.category.length === 1) {
      const c = (corpus.categories || []).find((x) => x.id === s.category[0]);
      if (c) return c.label + ' —';
    }
    return 'Showing';
  }

  /* ------------------------------------------------------------- routes -- */

  const ROUTES = ['home', 'gallery', 'palettes', 'typography', 'patterns', 'before-after', 'motion', 'about'];

  function go(route) {
    Filters.setRoute(route);
    Filters.writeUrl();
    render();
  }

  /** Routes are scopes, not separate pages: entering one applies a baseline
      filter. Crucially the baseline is cleared again on the way out, otherwise
      a stale `kind=video` silently narrows every screen you visit afterwards. */
  function applyRouteScope() {
    const r = Filters.currentRoute();
    const st = Filters.state;
    const scope = routeScope(r);
    if (st.kind !== scope.kind) st.kind = scope.kind;
    if (scope.category && !st.category.includes(scope.category)) {
      st.category = [scope.category];
    }
    // Leaving before-after should release the category it forced on us, but
    // only if the user did not choose it themselves.
    if (!scope.category && st.category.length === 1 && st.category[0] === 'before-after'
        && !userPickedCategory) {
      st.category = [];
    }
  }

  /** The baseline filter a route implies. `null` category means "no opinion". */
  function routeScope(r) {
    if (r === 'motion') return { kind: 'video', category: null };
    if (r === 'before-after') return { kind: 'all', category: 'before-after' };
    return { kind: 'all', category: null };
  }

  function render() {
    const route = Filters.currentRoute();
    applyRouteScope();

    for (const a of document.querySelectorAll('[data-nav]')) {
      a.classList.toggle('is-active', a.dataset.nav === route);
    }
    document.getElementById('pageTitle').textContent = {
      gallery: 'Gallery',
      palettes: 'Palettes',
      typography: 'Typography',
      patterns: 'Patterns',
      'before-after': 'Before / after',
      motion: 'Motion',
      about: 'About',
      home: 'Stormy',
    }[route] || 'Stormy';

    const sub = document.getElementById('pageSub');
    sub.textContent = {
      gallery: 'Every keeper from the collection — screens, mockups, brand work, store panels and clips. Filter by what a screen is for, how it looks, and what colours it is built from.',
      palettes: 'Two-colour schemes with designer-given names, plus the palettes measured from the screens themselves.',
      typography: 'Twelve typefaces rendered from the actual woff2 files in this repo, with a live playground and copy-paste integration notes. All SIL Open Font License 1.1.',
      patterns: 'Layout idioms that recur often enough across the corpus to be worth naming.',
      'before-after': 'Paired evidence. The same brief executed twice, where the delta is the lesson.',
      motion: 'Clips that show a transition rather than a still screen. Static recordings are not included.',
      about: 'What this is, where the material came from, and how to read it.',
      home: 'One corpus, three surfaces: a gallery, an MCP server and a skill.',
    }[route] || '';

    const isGallery = route === 'gallery';
    document.body.classList.toggle('is-home', route === 'home');

    // The toolbar (sort, view, card size) and shuffle are gallery controls.
    // On the reference tabs they do nothing, so they are hidden rather than
    // left there implying they still work.
    const galleryOnly = [
      document.getElementById('sort').closest('.select'),
      document.getElementById('viewSwitch'),
      document.querySelector('.select--size'),
      document.getElementById('shuffle'),
    ];
    const showGalleryTools = route === 'gallery' || route === 'palettes';
    for (const n of galleryOnly) if (n) n.hidden = !showGalleryTools;

    if (route === 'palettes') return renderPalettes();
    if (route === 'typography') {
      document.getElementById('emptyState').hidden = true;
      return Typography.render(document.getElementById('results'));
    }
    if (route === 'patterns') return renderPatterns();
    if (route === 'about') return renderAbout();
    if (route === 'home') {
      document.getElementById('emptyState').hidden = true;
      return Home.render(document.getElementById('results'));
    }

    renderResults();
  }

  /* -------------------------------------------------------- palettes ----- */

  function renderPalettes() {
    const results = document.getElementById('results');
    const assets = DATA.all();
    const cards = assets.filter((a) => a.category === 'color-palette');
    const printed = corpus.printed_palettes || {};

    results.dataset.view = 'grid';
    results.innerHTML = '';
    document.getElementById('resultCount').innerHTML = `Named <b>${cards.length}</b> two-tone cards`;

    const wall = el('div', { class: 'swatchwall', style: 'grid-column:1/-1' });

    for (const a of cards) {
      const pair = printed[a.id] || (a.palette || []).slice(0, 2).map((hex) => ({ hex }));
      if (pair.length < 2) continue;
      const [top, bottom] = pair;
      const card = el('button', {
        class: 'palcard', type: 'button',
        onclick: () => Lightbox.open(a.id),
      });
      const bands = el('div', { class: 'palcard__bands' });
      bands.append(el('div', {
        class: 'palcard__band',
        style: `background:${top.hex};color:${top.name ? top.ink || inkOn(top.hex) : inkOn(top.hex)}`,
        text: top.name || a.title.split('/')[0].trim(),
      }));
      bands.append(el('div', {
        class: 'palcard__band',
        style: `background:${bottom.hex};color:${bottom.name ? bottom.ink || inkOn(bottom.hex) : inkOn(bottom.hex)}`,
        text: bottom.name || (a.title.split('/')[1] || '').trim(),
      }));
      card.append(bands);
      const body = el('div', { class: 'palcard__body' });
      body.append(el('div', { class: 'palcard__t', text: a.title }));
      const hexes = el('div', { class: 'palcard__hexes' });
      hexes.append(el('code', { text: top.hex }));
      hexes.append(el('code', { text: bottom.hex }));
      body.append(hexes);
      if (a.description) body.append(el('p', { class: 'card__desc', style: 'margin-top:8px', text: a.description.split('.')[0] + '.' }));
      card.append(body);
      wall.append(card);
    }
    results.append(wall);

    // measured palettes section: most-used colours across the whole corpus
    const tally = new Map();
    for (const a of assets) {
      for (const p of a.palette_detail || []) {
        const hex = p.hex;
        const cur = tally.get(hex) || { hex, n: 0, w: 0 };
        cur.n += 1; cur.w += p.pct;
        tally.set(hex, cur);
      }
    }
    const topColors = Array.from(tally.values()).sort((x, y) => y.n - x.n).slice(0, 48);

    const section = el('section', { class: 'section', style: 'grid-column:1/-1' },
      el('div', { class: 'section__head' },
        el('div', {},
          el('h2', { class: 'section__title', text: 'What the corpus is actually made of' }),
          el('p', { class: 'section__note', text: 'The most frequently recurring colours across every measured palette. Weight is how many assets contain the colour; this is the honest answer to "what do app interfaces look like" rather than an opinion about it.' }))));

    const grid = el('div', { class: 'swatchwall', style: 'grid-template-columns:repeat(auto-fill,minmax(178px,1fr))' });
    for (const c of topColors) {
      const tile = el('button', {
        class: 'palcard palcard--tally', type: 'button', style: 'border:0;background:none',
        onclick: () => App.searchHex(c.hex),
        title: `Find assets containing ${c.hex}`,
      });
      const band = el('div', {
        class: 'palcard__band',
        style: `background:${c.hex};color:${inkOn(c.hex)};height:96px;border-radius:var(--r-lg);font-size:var(--t-xs)`,
        text: c.hex,
      });
      tile.append(band);
      tile.append(el('div', { class: 'palcard__body', style: 'padding:8px 2px 0' },
        el('p', { style: 'font-size:var(--t-2xs);color:var(--text-3)', text: `in ${c.n} assets` })));
      grid.append(tile);
    }
    section.append(grid);
    results.append(section);
  }

  function searchHex(hex) {
    // no hex filter exists, so surface the assets whose palette contains it
    const hits = DATA.all().filter((a) => (a.palette || []).some((h) => h.toUpperCase() === hex.toUpperCase()));
    Filters.setRoute('gallery');
    Filters.state.category = [];
    Filters.state.tag = [];
    Filters.set('q', '', { replace: false });
    App.showExplicit(hits, `Assets containing ${hex}`);
  }

  /* -------------------------------------------------------- patterns ----- */

  function renderPatterns() {
    const results = document.getElementById('results');
    results.dataset.view = 'grid';
    results.innerHTML = '';
    document.getElementById('resultCount').innerHTML = '';

    const pats = PATTERNS.map((p) => {
      const examples = DATA.all().filter((a) => p.match(a));
      return { ...p, examples };
    }).filter((p) => p.examples.length >= p.min);

    const wrap = el('div', { class: 'patterngrid', style: 'grid-column:1/-1' });
    for (const [i, p] of pats.entries()) {
      const card = el('article', { class: 'pattern' });
      card.append(el('p', { class: 'pattern__n', text: String(i + 1).padStart(2, '0') + ' · ' + p.examples.length + ' examples' }));
      card.append(el('h3', { class: 'pattern__t', text: p.name }));
      card.append(el('p', { class: 'pattern__d', text: p.why }));
      const ex = el('div', { class: 'pattern__ex' });
      for (const a of p.examples.slice(0, 6)) {
        ex.append(el('img', {
          src: a.thumb, alt: a.title, loading: 'lazy', title: a.title,
          onclick: () => Lightbox.open(a.id),
        }));
      }
      card.append(ex);
      wrap.append(card);
    }
    results.append(wrap);
  }

  /* ----------------------------------------------------------- about ----- */

  function renderAbout() {
    const results = document.getElementById('results');
    results.dataset.view = 'grid';
    results.innerHTML = '';
    document.getElementById('resultCount').innerHTML = '';
    const t = corpus.totals;

    const wrap = el('div', { class: 'prose', style: 'grid-column:1/-1' });

    wrap.append(el('div', { class: 'stats' },
      stat(t.assets, 'assets'), stat(t.images, 'images'), stat(t.videos, 'video sources'),
      stat(t.clips, 'motion clips'), stat(t.described, 'visually reviewed')));

    wrap.append(el('h2', { text: 'What this is' }));
    wrap.append(el('p', { html: `UI Hall is a catalogue of interface design collected from real product work — other people's apps and websites, screenshotted and saved over time. Every item was looked at individually and written up: what it is, what it is <em>for</em>, how it is styled, and what its colours actually are. The result is a searchable reference you can point an agent at, rather than a folder of images nobody opens.` }));

    wrap.append(el('h2', { text: 'What is in it' }));
    const cats = el('div', { class: 'catgrid' });
    for (const c of corpus.categories || []) {
      cats.append(el('button', {
        class: 'catcard', type: 'button', style: `--c:var(--cat-${c.id})`,
        onclick: () => { Filters.setRoute('gallery'); Filters.state.category = [c.id]; Filters.writeUrl(); App.render(); },
      },
        el('span', { class: 'catcard__t', text: c.label }),
        el('span', { class: 'catcard__n', text: `${c.count} assets` }),
        el('span', { class: 'catcard__b', text: c.blurb })));
    }
    wrap.append(cats);

    wrap.append(el('h2', { text: 'How the palettes were derived' }));
    wrap.append(el('p', { html: `Every palette on this site is <strong>measured</strong>, not guessed. Each image is downsampled and run through k-means to find its dominant colours by area, which is why the percentages add up to something meaningful. The named two-tone cards are the exception — those print their own hex values, so the card is quoted directly and you will see a separate "printed on the card" block for them.` }));

    wrap.append(el('h2', { text: 'About the videos' }));
    wrap.append(el('p', { html: `The collection is full of clips, but most of them are not motion studies — they are still screenshots pushed through an editing app, where the only thing moving is a fake recording progress bar. So each video was <strong>measured for actual frame-to-frame change</strong>. Clips that genuinely move are shipped as playable video; clips that do not are kept as their poster frame and labelled as still. That distinction is the difference between studying motion and studying a JPEG with a timeline.` }));

    wrap.append(el('h2', { text: 'Reading the numbers' }));
    wrap.append(el('ul', {},
      el('li', { html: `<strong>Motion</strong> is mean absolute pixel difference between sampled frames, 0–255. Under ~1 is effectively static; over ~4 is real movement.` }),
      el('li', { html: `<strong>Contrast</strong> ratios in the palette view are WCAG: 4.5:1 is AA for body text, 3:1 is AA for large text only.` }),
      el('li', { html: `<strong>Hue</strong> is computed from the palette, so a "blue" filter finds screens that actually contain blue at meaningful area — it does not rely on anyone tagging them.` })));

    wrap.append(el('h2', { text: 'Provenance and licensing' }));
    wrap.append(el('p', { html: `This is a personal study collection assembled from public sources. Interfaces belong to their designers and companies; nothing here is licensed for redistribution or reuse in a shipped product. It is a reference for <em>learning the vocabulary</em> — the layout conventions, the rhythm, the colour logic — not a source of assets. Source filenames and paths are recorded on every item so anything can be traced back.` }));

    wrap.append(el('h2', { text: 'Known limits' }));
    wrap.append(el('ul', {},
      el('li', { text: 'Some items are cropped, low-resolution, or partially obscured. Those carry a "salvage note" on the detail view rather than being quietly dropped.' }),
      el('li', { text: 'Descriptions record what is visible in the asset. Where text is too small to read, the description says so instead of inventing plausible copy.' }),
      el('li', { text: 'Platform labels are inferred from visual conventions (iOS vs Android vs web) and can be wrong on generic mockups.' })));

    results.append(wrap);
  }

  function stat(n, label) {
    return el('div', { class: 'stat' },
      el('div', { class: 'stat__n', text: fmt.n(n) }),
      el('div', { class: 'stat__l', text: label }));
  }

  /* -------------------------------------------------------- explicit ----- */

  /** Show an arbitrary set of assets (a hex search, a relation walk). */
  function showExplicit(list, label) {
    sorted = list;
    const results = document.getElementById('results');
    results.dataset.view = Filters.state.view;
    document.getElementById('resultCount').innerHTML = `${label} — <b>${list.length}</b> assets`;
    document.getElementById('emptyState').hidden = list.length > 0;
    Render.grid(results, list);
    document.dispatchEvent(new CustomEvent('uihall:results', { detail: list.map((a) => a.id) }));
  }

  /* ------------------------------------------------------------- wiring -- */

  function wire() {
    // Filter state changes (chip clicks, search, sort, kind, view) update the
    // URL with pushState, which never fires hashchange — so re-render here.
    // Without this subscription the grid only refreshed on back/forward or a
    // full reload. syncControls() only writes DOM values, render() never
    // emits, so this cannot loop.
    Filters.onChange(() => {
      syncControls();
      render();
    });

    // Replace the native select popup with the custom listbox before anything
    // reads it. The underlying <select> keeps carrying the value and firing
    // change events, so the listeners below are unaffected.
    // Note `typeof`, not `window.Listbox`: a top-level `const` in a classic
    // script lives in the global lexical scope, so it is reachable as a bare
    // identifier but is NOT a property of `window`.
    if (typeof Listbox !== 'undefined') Listbox.enhanceAll();

    // search
    const input = document.getElementById('q');
    const clear = document.getElementById('qClear');
    input.value = Filters.state.q;
    const run = debounce(() => Filters.set('q', input.value.trim()), 160);
    input.addEventListener('input', () => {
      clear.hidden = !input.value;
      run();
    });
    clear.addEventListener('click', () => {
      input.value = '';
      clear.hidden = true;
      Filters.set('q', '');
      input.focus();
    });

    // kind
    for (const b of document.querySelectorAll('#fKind .seg__btn')) {
      b.addEventListener('click', () => Filters.set('kind', b.dataset.kind));
    }
    // view
    for (const b of document.querySelectorAll('#viewSwitch .seg__btn')) {
      b.addEventListener('click', () => Filters.set('view', b.dataset.view));
    }
    // sort
    document.getElementById('sort').addEventListener('change', (e) => Filters.set('sort', e.target.value));

    // card size
    const size = document.getElementById('cardSize');
    // The styled track draws its filled portion from a CSS variable, because a
    // gradient cannot know where the thumb is.
    const paintSize = () => {
      const min = +size.min, max = +size.max;
      const pct = ((+size.value - min) / (max - min)) * 100;
      size.style.setProperty('--fill', pct.toFixed(1) + '%');
    };
    size.addEventListener('input', (e) => {
      document.documentElement.style.setProperty('--card-size', e.target.value + 'px');
      paintSize();
    });
    paintSize();

    // shuffle
    document.getElementById('shuffle').addEventListener('click', () => {
      Filters.state.seed = (Math.random() * 0xffffffff) >>> 0;
      Filters.writeUrl();
      renderResults();
    });

    // reset all
    document.getElementById('resetAll').addEventListener('click', () => {
      userPickedCategory = false;
      Filters.resetAll();
    });
    for (const b of document.querySelectorAll('[data-reset]')) {
      b.addEventListener('click', () => {
        if (b.dataset.reset === 'category') userPickedCategory = false;
        Filters.reset(b.dataset.reset);
      });
    }

    // sidebar collapse
    const shell = document.getElementById('shell');
    document.getElementById('filterToggle').addEventListener('click', () => {
      if (window.innerWidth <= 960) {
        shell.classList.toggle('is-mobileopen');
        document.getElementById('filterToggle').setAttribute('aria-expanded', String(shell.classList.contains('is-mobileopen')));
      } else {
        shell.classList.toggle('is-collapsed');
        document.getElementById('filterToggle').setAttribute('aria-expanded', String(!shell.classList.contains('is-collapsed')));
      }
    });

    // theme
    const themeBtn = document.getElementById('themeToggle');
    themeBtn.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('uihall.theme', next); } catch (_) {}
    });

    // lightbox close
    for (const b of document.querySelectorAll('[data-close]')) {
      b.addEventListener('click', () => Lightbox.close());
    }

    // links that only change the route
    for (const a of document.querySelectorAll('[data-link]')) {
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        const route = a.getAttribute('href').replace(/^#\/?/, '') || 'home';
        Filters.setRoute(route);
        Filters.writeUrl();
        App.render();
        if (window.innerWidth <= 960) shell.classList.remove('is-mobileopen');
      });
    }

    window.addEventListener('hashchange', () => {
      Filters.readUrl();
      syncControls();
      App.render();
    });

    document.addEventListener('uihall:results', (ev) => { order = ev.detail; });
  }

  let order = [];

  function syncControls() {
    const s = Filters.state;
    document.getElementById('q').value = s.q;
    document.getElementById('qClear').hidden = !s.q;
    document.getElementById('sort').value = s.sort;
    // The custom listbox renders its own label, so it needs telling when the
    // value changes from anywhere other than a user click on it.
    if (typeof Listbox !== 'undefined') Listbox.sync(document.getElementById('sort'));
    for (const b of document.querySelectorAll('#fKind .seg__btn')) b.classList.toggle('is-on', b.dataset.kind === s.kind);
    for (const b of document.querySelectorAll('#viewSwitch .seg__btn')) b.classList.toggle('is-on', b.dataset.view === s.view);
  }

  /* --------------------------------------------------------------- boot -- */

  /** A first-paint placeholder, so the page is never a bare shell while the
      corpus resolves. The grid is populated synchronously after load, so this
      only ever shows for a frame or two locally - but on a cold disk read it is
      the difference between "loading" and "broken". */
  function showSkeleton(n = 12) {
    const results = document.getElementById('results');
    results.dataset.loading = 'true';
    results.innerHTML = Array.from({ length: n }, () =>
      '<div class="skelcard" aria-hidden="true"><span class="skelcard__media"></span>' +
      '<span class="skelcard__line"></span><span class="skelcard__line skelcard__line--short"></span></div>'
    ).join('');
  }

  function clearSkeleton() {
    const results = document.getElementById('results');
    delete results.dataset.loading;
  }

  async function boot() {
    showSkeleton();
    try {
      corpus = await DATA.load();
    } catch (err) {
      clearSkeleton();
      document.getElementById('results').append(
        el('p', { class: 'empty', style: 'grid-column:1/-1', html:
          `<span class="empty__title">Could not load the corpus</span>
           <span class="empty__hint">${esc(err.message)}</span>` }));
      return;
    }
    clearSkeleton();

    // mark curated score: described assets float, then images with clips
    for (const a of corpus.assets) {
      a._score = 0;
      if (a.description) a._score += 2;
      if (a.quality) a._score += 0.1;
      if (a.category === 'before-after') a._score += 0.6;
      if (a.category === 'color-palette') a._score += 0.5;
      if (a.clip) a._score += 0.4;
      if (a._hues === undefined) Filters.enrich(a);
    }
    for (const a of corpus.assets) {
      const inv = a.origin?.path || '';
      a._mtime = a.origin?.mtime || 0;
    }

    // theme from storage or system
    let theme = null;
    try { theme = localStorage.getItem('uihall.theme'); } catch (_) {}
    if (!theme) theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;

    Filters.readUrl();
    syncControls();
    wire();

    // enrich before facet counts so hue/surface filters have data
    corpus.assets.forEach((a) => Filters.enrich(a));

    window.App = App;
    App.render();
  }

  return {
    boot, render, go, showExplicit, searchHex,
    // Exposed for tests and console debugging; not used by the app itself.
    syncControls, renderResults, buildFacets,
    get order() { return order; },
  };
})();

document.addEventListener('DOMContentLoaded', () => App.boot());
