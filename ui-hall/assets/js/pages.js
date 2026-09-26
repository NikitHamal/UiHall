/* UI Hall — detail view (lightbox). */

const Lightbox = (() => {
  const root = () => document.getElementById('lightbox');
  const mediaBox = () => document.getElementById('lbMedia');
  const infoBox = () => document.getElementById('lbInfo');
  let currentId = null;
  let order = [];
  let lastFocus = null;

  function open(id, list) {
    const asset = DATA.get(id);
    if (!asset) return;
    lastFocus = document.activeElement;
    currentId = id;
    if (list && list.length) order = list.slice();
    else if (!order.includes(id)) order = DATA.all().map((a) => a.id);

    render(asset);
    const box = root();
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    document.getElementById('lbPrev').onclick = () => step(-1);
    document.getElementById('lbNext').onclick = () => step(1);
    document.querySelector('.lightbox__close')?.focus();
    document.addEventListener('keydown', onKey);
  }

  function close() {
    const box = root();
    if (box.hidden) return;
    box.hidden = true;
    document.body.style.overflow = '';
    mediaBox().innerHTML = '';
    infoBox().innerHTML = '';
    currentId = null;
    document.removeEventListener('keydown', onKey);
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }

  function step(delta) {
    if (!order.length || !currentId) return;
    const i = order.indexOf(currentId);
    if (i < 0) return;
    const next = order[(i + delta + order.length) % order.length];
    open(next);
  }

  function onKey(ev) {
    if (ev.key === 'Escape') { ev.preventDefault(); close(); }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); step(1); }
    else if (ev.key === 'ArrowLeft') { ev.preventDefault(); step(-1); }
  }

  /* ------------------------------------------------------------ media --- */

  function media(asset) {
    const box = mediaBox();
    box.innerHTML = '';
    if (asset.clip) {
      const v = el('video', {
        src: asset.clip,
        poster: asset.src,
        controls: true,
        autoplay: true,
        loop: true,
        muted: true,
        playsinline: true,
      });
      box.append(v);
    } else {
      box.append(el('img', { src: asset.src, alt: asset.title, decoding: 'async' }));
    }
  }

  /* ------------------------------------------------------------- info --- */

  function metaChips(asset) {
    const cat = (DATA.corpus.categories || []).find((c) => c.id === asset.category);
    const wrap = el('div', { class: 'lb-meta' });
    wrap.append(el('span', { class: 'chip is-on', style: `--badge-hue:var(--cat-${asset.category})`, text: cat ? cat.label : asset.category }));
    wrap.append(el('span', { class: 'chip', text: asset.type }));
    if (asset.kind === 'video') wrap.append(el('span', { class: 'chip', text: 'video' }));
    for (const r of asset.roles || []) wrap.append(el('span', { class: 'chip', text: r }));
    return wrap;
  }

  /** The other screens from the same app or exploration. Shown above the
      looser "similar in the corpus" block because a named group is a fact and a
      tag-overlap neighbour is a guess. */
  function groupBlock(asset) {
    if (!asset.group) return null;
    const members = (DATA.corpus.groups || []).find((g) => g.id === asset.group);
    if (!members || members.count < 2) return null;

    const wrap = el('div', { class: 'lb-group' });
    wrap.append(el('div', { class: 'lb-group__head' },
      el('span', { class: 'lb-group__label', text: 'Same app' }),
      el('span', { class: 'lb-group__title', text: members.title }),
      el('span', { class: 'lb-group__count num', text: `${asset.group_index + 1} of ${members.count}` })));

    const strip = el('div', { class: 'lb-group__strip' });
    for (const id of members.members) {
      const a = DATA.get(id);
      if (!a) continue;
      const isCurrent = id === asset.id;
      strip.append(el('button', {
        class: 'lb-group__item' + (isCurrent ? ' is-current' : ''),
        type: 'button',
        'aria-current': isCurrent ? 'true' : null,
        title: a.title,
        onclick: () => { if (!isCurrent) open(id); },
      },
        el('img', { src: a.thumb, alt: '', loading: 'lazy' }),
        el('span', { class: 'lb-group__cap', text: a.title })));
    }
    wrap.append(strip);
    return wrap;
  }

  function pairsBlock(asset) {
    // before/after pairs and same-subject neighbourhood, found by tag overlap
    const others = DATA.all().filter((a) => a.id !== asset.id);
    const related = others
      .map((a) => {
        const shared = (a.tags || []).filter((t) => (asset.tags || []).includes(t)).length;
        return { a, shared };
      })
      .filter((x) => x.shared >= 2)
      .sort((x, y) => y.shared - x.shared)
      .slice(0, 4);
    if (related.length < 2) return null;

    const wrap = el('div', { class: 'lb-pair' });
    for (const { a } of related) {
      wrap.append(el('button', {
        class: 'lb-pair__item', type: 'button',
        onclick: () => open(a.id),
      },
        el('img', { src: a.thumb, alt: '', loading: 'lazy' }),
        el('span', {},
          el('span', { class: 'lb-pair__t', text: a.title }),
          el('span', { class: 'lb-pair__m', text: `${a.id} · ${a.category}` }))));
    }
    return wrap;
  }

  function render(asset) {
    media(asset);
    const idx = order.indexOf(asset.id);
    document.getElementById('lbCount').textContent =
      idx >= 0 ? `${idx + 1} / ${order.length}` : '';
    const box = infoBox();
    box.innerHTML = '';

    box.append(el('p', { class: 'lb-id', text: asset.id }));
    box.append(el('h2', { class: 'lb-title', text: asset.title }));
    box.append(metaChips(asset));

    if (asset.description) {
      box.append(el('p', { class: 'lb-desc', text: asset.description }));
    }

    if (asset.quality) {
      box.append(el('h3', { class: 'lb-h', text: 'Salvage note' }));
      box.append(el('p', { class: 'lb-desc', style: 'margin-top:0', text: asset.quality }));
    }

    const pal = paletteBlockRaw(asset);
    if (pal) { box.append(el('h3', { class: 'lb-h', text: 'Palette (measured)' })); box.append(pal); }

    // for the two-tone name cards the printed values are more authoritative
    if (asset.category === 'color-palette') {
      const printed = printedPalette(asset);
      if (printed) {
        box.append(el('h3', { class: 'lb-h', text: 'Printed on the card' }));
        box.append(printed);
      }
    }

    box.append(el('h3', { class: 'lb-h', text: 'Details' }));
    const dl = el('dl', { class: 'kv' });
    const rows = [
      ['Kind', asset.kind],
      ['Category', asset.category],
      ['Type', asset.type],
      ['Dimensions', fmt.dims(asset.w, asset.h)],
      ['Orientation', asset.orientation],
    ];
    if (asset.kind === 'video') {
      rows.push(['Duration', fmt.secs(asset.duration_s)]);
      rows.push(['Frame rate', asset.fps ? `${asset.fps} fps` : '—']);
      rows.push(['Motion (frame diff)', asset.motion != null ? String(asset.motion) : '—']);
      rows.push(['Clip shipped', asset.clip ? 'yes' : 'no — static, poster only']);
    }
    if (asset.roles?.length) rows.push(['Roles', asset.roles.join(', ')]);
    if (asset.style?.length) rows.push(['Style', asset.style.join(', ')]);
    rows.push(['Source file', asset.origin?.path || '—']);
    rows.push(['Source size', fmt.bytes(asset.origin?.bytes)]);
    for (const [k, v] of rows) {
      dl.append(el('dt', { text: k }));
      dl.append(el('dd', { class: k === 'Source file' ? 'mono' : '', text: String(v ?? '—') }));
    }
    box.append(dl);

    if (asset.tags?.length) {
      box.append(el('h3', { class: 'lb-h', text: 'Tags' }));
      const tl = el('div', { class: 'taglist' });
      for (const t of asset.tags) {
        tl.append(el('button', {
          type: 'button', text: t, title: `Filter by ${t}`,
          onclick: () => { close(); goFacet('tag', t); },
        }));
      }
      box.append(tl);
    }

    if (asset.style?.length) {
      box.append(el('h3', { class: 'lb-h', text: 'Style' }));
      const tl = el('div', { class: 'taglist' });
      for (const t of asset.style) {
        tl.append(el('button', {
          type: 'button', text: t, title: `Filter by ${t}`,
          onclick: () => { close(); goFacet('style', t); },
        }));
      }
      box.append(tl);
    }

    const rel = groupBlock(asset);
    if (rel) { box.append(el('h3', { class: 'lb-h', text: 'Screens from this app' })); box.append(rel); }

    const rel2 = pairsBlock(asset);
    if (rel2) { box.append(el('h3', { class: 'lb-h', text: 'Similar in the corpus' })); box.append(rel2); }

    const actions = el('div', { class: 'lb-actions' });
    const copyLabel = el('span', { text: 'Copy hex list' });
    actions.append(el('button', {
      class: 'btn btn--sm', type: 'button',
      onclick: async () => {
        const hexes = (asset.palette || []).join(', ');
        await copyText(hexes);
        // Swap the label element rather than textContent: the button holds a
        // <span> plus (on the sibling link) an icon, and rewriting textContent
        // would destroy the icon node.
        copyLabel.textContent = 'Copied';
        setTimeout(() => { copyLabel.textContent = 'Copy hex list'; }, 1200);
      },
    }, copyLabel));
    actions.append(el('a', {
      class: 'btn btn--sm btn--ghost', href: asset.src, target: '_blank', rel: 'noopener',
      title: `Open ${asset.src} in a new tab`,
      html: `<span>Open full file</span>${ICON.external}`,
    }));
    box.append(actions);
  }

  function paletteBlockRaw(asset) {
    const detail = (asset.palette_detail || []).slice(0, 8);
    if (!detail.length) return null;
    const wrap = el('div', { class: 'palette' });
    for (const p of detail) wrap.append(Render.swatchRow(p.hex, p.pct));
    return wrap;
  }

  function printedPalette(asset) {
    // the palette cards print their own hexes; surface them as authoritative
    const printed = DATA.corpus.printed_palettes?.[asset.id];
    if (!printed) return null;
    const wrap = el('div', { class: 'palette' });
    for (const p of printed) wrap.append(Render.swatchRow(p.hex, null));
    return wrap;
  }

  function goFacet(key, value) {
    Filters.setRoute('gallery');
    Filters.toggle(key, value);
    App.go('gallery');
  }

  return { open, close, step };
})();
