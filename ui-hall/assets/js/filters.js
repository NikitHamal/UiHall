/* UI Hall — filter engine.
   Facet state lives in the URL hash so any view is shareable and the back
   button works. Everything is derived: the facet counts shown in the sidebar
   are computed against the *other* active filters, the way faceted search
   should behave. */

const Filters = (() => {
  const KEYS = ['q', 'kind', 'category', 'role', 'style', 'tag', 'orientation', 'hue', 'surface', 'clip', 'group', 'sort', 'view', 'seed', 'page'];

  const state = {
    q: '',
    kind: 'all',
    category: [],
    role: [],
    style: [],
    tag: [],
    orientation: [],
    hue: [],
    surface: [],
    clip: [],
    group: [],
    sort: 'curated',
    view: 'masonry',
    seed: 0,
    page: '',
  };

  const listeners = new Set();
  const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
  const emit = () => listeners.forEach((fn) => fn(state));

  /* ------------------------------------------------------------ derived --- */

  /** Does this asset carry a dark or light primary surface? Derived from the
      measured palette, not a tag, so it is present even on undescribed items. */
  function surfacesOf(asset) {
    const pal = asset.palette_detail || [];
    if (!pal.length) return [];
    const out = new Set();
    const darkPct = pal.filter((p) => isDarkSurface(p.hex)).reduce((s, p) => s + p.pct, 0);
    const lightPct = pal.filter((p) => isLightSurface(p.hex)).reduce((s, p) => s + p.pct, 0);
    if (darkPct >= 45) out.add('dark');
    if (lightPct >= 45) out.add('light');
    if (!out.size) out.add('mid');
    return Array.from(out);
  }

  /** Hue families present in the palette, weighted so a dominant hue only
      counts when it carries real area. */
  function huesOf(asset) {
    const pal = asset.palette_detail || [];
    const weight = new Map();
    for (const p of pal) {
      const h = hueFamily(p.hex);
      if (!h) continue;
      weight.set(h, (weight.get(h) || 0) + p.pct);
    }
    return Array.from(weight.entries()).filter(([, w]) => w >= 12).map(([h]) => h);
  }

  const enriched = new Map();

  function enrich(asset) {
    let e = enriched.get(asset.id);
    if (e) return e;
    e = Object.assign(Object.create(null), asset, {
      _hues: huesOf(asset),
      _surfaces: surfacesOf(asset),
      _haystack: [
        asset.title, asset.description, asset.id, asset.category, asset.type,
        ...(asset.tags || []), ...(asset.style || []), ...(asset.roles || []),
      ].join(' ').toLowerCase(),
    });
    enriched.set(asset.id, e);
    return e;
  }

  /* ------------------------------------------------------------ matching -- */

  /** `asset` MUST be enriched (it reads _hues/_surfaces/_haystack). Callers go
      through pool() or poolOne() so that invariant holds. */
  function matches(asset, st, skip) {
    if (st.kind !== 'all' && asset.kind !== st.kind) return false;
    if (skip !== 'category' && st.category.length && !st.category.includes(asset.category)) return false;
    if (skip !== 'role' && st.role.length && !st.role.some((r) => asset.roles?.includes(r))) return false;
    if (skip !== 'style' && st.style.length && !st.style.some((s) => asset.style?.includes(s))) return false;
    if (skip !== 'tag' && st.tag.length && !st.tag.some((t) => asset.tags?.includes(t))) return false;
    if (skip !== 'orientation' && st.orientation.length && !st.orientation.includes(asset.orientation)) return false;
    if (skip !== 'hue' && st.hue.length && !st.hue.some((h) => asset._hues.includes(h))) return false;
    if (skip !== 'surface' && st.surface.length && !st.surface.some((s) => asset._surfaces.includes(s))) return false;
    if (skip !== 'clip' && st.clip.length) {
      const has = !!asset.clip;
      if (st.clip.includes('clip') && !has) return false;
      if (st.clip.includes('still') && has) return false;
    }
    // Group filter. Holds either a specific group id (GRP-add-card) or one of
    // the two buckets, so the near-duplicate sets can be compared together
    // instead of scattered through the grid.
    if (skip !== 'group' && st.group.length) {
      const inGroup = !!(asset.group && asset.group_size > 1);
      const ok = st.group.some((v) => {
        if (v === 'grouped') return inGroup;
        if (v === 'solo') return !inGroup;
        return asset.group === v;
      });
      if (!ok) return false;
    }
    if (st.q) {
      const terms = st.q.toLowerCase().split(/\s+/).filter(Boolean);
      if (terms.length && !terms.every((t) => asset._haystack.includes(t))) return false;
    }
    return true;
  }

  /** All assets that pass every filter except the one being counted. */
  function pool(assets, skip) {
    return assets.map(enrich).filter((a) => matches(a, state, skip));
  }

  function apply(assets) {
    const list = pool(assets, null);

    const sorters = {
      curated: (a, b) => (b._score ?? 0) - (a._score ?? 0) || a.id.localeCompare(b.id),
      newest: (a, b) => (b._mtime || 0) - (a._mtime || 0),
      oldest: (a, b) => (a._mtime || 0) - (b._mtime || 0),
      title: (a, b) => a.title.localeCompare(b.title),
      motion: (a, b) => (b.motion ?? -1) - (a.motion ?? -1) || a.id.localeCompare(b.id),
    };
    const sorted = list.slice().sort(sorters[state.sort] || sorters.curated);
    if (state.seed) return seededShuffle(sorted, state.seed);
    return sorted;
  }

  /** Counts for a facet dimension, ignoring that dimension's own selection. */
  function counts(assets, key, valueOf) {
    const p = pool(assets, key);
    const out = new Map();
    for (const a of p) {
      // p is already enriched; valueOf may still reach for a raw field.
      for (const v of valueOf(a) || []) out.set(v, (out.get(v) || 0) + 1);
    }
    return out;
  }

  /* ---------------------------------------------------------------- url --- */

  function toHash() {
    const parts = [];
    for (const k of KEYS) {
      const v = state[k];
      if (Array.isArray(v)) { if (v.length) parts.push(k + '=' + v.map(encodeURIComponent).join(',')); }
      else if (v !== '' && v !== 'all' && v !== 0 && !(k === 'sort' && v === 'curated') && !(k === 'view' && v === 'masonry')) {
        if (k === 'page' || k === 'q') { if (v) parts.push(k + '=' + encodeURIComponent(v)); }
        else if (k !== 'page') parts.push(k + '=' + encodeURIComponent(v));
      }
    }
    const route = currentRoute();
    return '#/' + (route === 'home' ? '' : route) + (parts.length ? '?' + parts.join('&') : '');
  }

  let route = 'home';
  const currentRoute = () => route;
  const setRoute = (r) => { route = r; };

  function writeUrl(replace) {
    const h = toHash();
    if (location.hash === h) return;
    if (replace) history.replaceState(null, '', h);
    else history.pushState(null, '', h);
  }

  function readUrl() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, query = ''] = raw.split('?');
    const seg = path.split('/').filter(Boolean);
    route = seg[0] || 'home';
    state.page = seg.slice(1).join('/');

    // reset the multi-value facets before applying what the URL actually says
    for (const k of ['category', 'role', 'style', 'tag', 'orientation', 'hue', 'surface', 'clip', 'group']) state[k] = [];

    const params = new URLSearchParams(query);
    for (const [k, v] of params.entries()) {
      if (!KEYS.includes(k)) continue;
      if (Array.isArray(state[k])) state[k] = v.split(',').map((s) => s.trim()).filter(Boolean);
      else if (k === 'seed') state[k] = parseInt(v, 10) || 0;
      else state[k] = v;
    }
    if (!['curated', 'newest', 'oldest', 'title', 'motion'].includes(state.sort)) state.sort = 'curated';
    if (!['masonry', 'grid', 'list'].includes(state.view)) state.view = 'masonry';
    if (!['all', 'image', 'video'].includes(state.kind)) state.kind = 'all';
    return route;
  }

  function toggle(key, value) {
    const arr = state[key];
    const i = arr.indexOf(value);
    if (i >= 0) arr.splice(i, 1); else arr.push(value);
    state.seed = 0;
    writeUrl();
    emit();
  }

  function set(key, value, opts = {}) {
    state[key] = value;
    if (key !== 'seed') state.seed = 0;
    writeUrl(opts.replace);
    emit();
  }

  function reset(key) {
    if (Array.isArray(state[key])) state[key] = [];
    else state[key] = key === 'kind' ? 'all' : '';
    state.seed = 0;
    writeUrl();
    emit();
  }

  function resetAll() {
    for (const k of ['category', 'role', 'style', 'tag', 'orientation', 'hue', 'surface', 'clip', 'group']) state[k] = [];
    state.q = '';
    state.kind = 'all';
    state.seed = 0;
    writeUrl();
    emit();
  }

  const activeCount = () => ['category', 'role', 'style', 'tag', 'orientation', 'hue', 'surface', 'clip', 'group']
    .reduce((n, k) => n + state[k].length, 0) + (state.q ? 1 : 0) + (state.kind !== 'all' ? 1 : 0);

  return {
    state, onChange, emit, readUrl, writeUrl, currentRoute, setRoute,
    apply, counts, pool, enrich, toggle, set, reset, resetAll, activeCount,
    surfacesOf, huesOf,
  };
})();
