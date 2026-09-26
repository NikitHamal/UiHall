/* UI Hall — rendering.
   Cards are built as DOM nodes (not innerHTML strings) so video elements are
   created lazily and never autoplay off-screen. */

const Render = (() => {

  /* Hover previews: motion clips play on hover, appllama-style. Gated behind
     a fine pointer and no-preference for reduced motion — on touch or
     reduced-motion the poster frame and its Motion badge are the whole story.
     The video element is created on first hover and torn down on leave, so a
     grid of 200 posters never holds 200 decoders. */
  const hoverPreviewOK = () =>
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function armHoverPreview(media, asset) {
    if (!asset.clip || !hoverPreviewOK()) return;
    let video = null;
    const show = () => {
      if (video || !media.isConnected) return;
      video = el('video', {
        class: 'is-preview',
        src: asset.clip,
        muted: true,
        loop: true,
        playsinline: true,
        preload: 'auto',
        'aria-hidden': 'true',
      });
      video.muted = true;
      media.append(video);
      const play = video.play();
      if (play && play.catch) play.catch(() => {});
    };
    const hide = () => {
      if (!video) return;
      try { video.pause(); } catch (_) {}
      video.remove();
      video = null;
    };
    media.addEventListener('mouseenter', show);
    media.addEventListener('mouseleave', hide);
    media.addEventListener('focusin', show);
    media.addEventListener('focusout', hide);
  };

  /* ------------------------------------------------------------- cards --- */

  function cardStats(a) {
    const pal = (a.palette || []).slice(0, 5);
    const tags = (a.tags || []).slice(0, 3);
    const styles = (a.style || []).slice(0, 2);
    return { pal, tags, styles };
  }

  function card(a, opts = {}) {
    const node = el('article', {
      class: 'card',
      id: 'card-' + a.id,
      dataset: { id: a.id, view: opts.view || 'masonry', kind: a.kind, category: a.category },
    });
    // Stagger index for the entrance cascade. Capped: past the first dozen
    // the delay stops growing, or filtering a large result would feel slow.
    if (opts.index != null) node.style.setProperty('--i', String(Math.min(opts.index, 12)));

    const media = el('button', {
      class: 'card__media',
      type: 'button',
      'aria-label': `Open ${a.title}`,
      onclick: () => Lightbox.open(a.id),
    });

    const img = el('img', {
      src: a.thumb || a.src,
      alt: a.title,
      loading: opts.eager ? 'eager' : 'lazy',
      decoding: 'async',
    });
    if (a.w && a.h) {
      img.width = a.w;
      img.height = a.h;
      // The card crops every media to one ratio, so the source aspect is only
      // needed to stop layout shift before the image decodes — not to size the
      // frame. Setting --card-ar here would fight the fixed ratio in CSS.
    }
    media.append(img);

    if (a.kind === 'video') {
      media.append(el('span', { class: 'card__play', html: `<span>${ICON.play}</span>` }));
    }
    armHoverPreview(media, a);

    const badges = el('div', { class: 'card__badges' });
    const left = el('div', { style: 'display:flex;gap:5px;flex-wrap:wrap' });
    const cat = (DATA.corpus.categories || []).find((c) => c.id === a.category);
    left.append(el('span', {
      class: 'badge badge--cat',
      style: `--badge-hue:var(--cat-${a.category}, #888)`,
      text: cat ? cat.label : fmt.titleCase(a.category),
    }));
    if (a.clip) left.append(el('span', { class: 'badge badge--clip', text: 'Motion' }));
    badges.append(left);
    media.append(badges);

    /* One app, several shots. Saying so on the card is what stops the grid
       reading as unrelated near-duplicates. */
    if (a.group && a.group_size > 1) {
      media.append(el('span', {
        class: 'badge badge--group num',
        title: `${a.group_size} screens from "${a.group_title}" - open to see them together`,
        text: `${a.group_index + 1}/${a.group_size}`,
      }));
    }

    node.append(media);

    const body = el('div', { class: 'card__body' });
    body.append(el('h3', { class: 'card__title', text: a.title }));
    if (a.description && opts.view !== 'grid') {
      body.append(el('p', { class: 'card__desc', text: a.description }));
    }

    const { pal, tags, styles } = cardStats(a);
    if (pal.length) {
      body.append(el('div', { class: 'card__pals', 'aria-hidden': 'true' },
        ...pal.map((c) => el('i', { style: `background:${c}`, title: c }))));
    }
    if (tags.length || styles.length) {
      body.append(el('div', { class: 'card__tags' },
        ...tags.map((t) => el('span', { class: 'card__tag', text: t })),
        ...styles.map((s) => el('span', { class: 'card__tag card__tag--style', text: s }))));
    }
    node.append(body);
    return node;
  }

  /* ----------------------------------------------------------- grid ----- */

  /** Renders in chunks so a 480-item result never blocks the first paint.
      Each call takes a generation token: a render that is superseded (the user
      changed a filter mid-flight) stops rather than appending its stale chunk
      into the new container contents. */
  let renderGeneration = 0;

  function grid(container, items, opts = {}) {
    const CHUNK = 60;
    const view = Filters.state.view;
    const gen = ++renderGeneration;
    container.dataset.view = view;
    container.innerHTML = '';

    if (!items.length) return 0;

    let i = 0;
    const renderChunk = () => {
      if (gen !== renderGeneration) return; // superseded by a newer render
      const frag = document.createDocumentFragment();
      const end = Math.min(i + CHUNK, items.length);
      for (; i < end; i++) {
        frag.append(card(items[i], { view, eager: i < 12, index: i, ...opts }));
      }
      container.append(frag);
      if (i < items.length) {
        requestAnimationFrame(renderChunk);
      }
    };
    renderChunk();
    return items.length;
  }

  /* -------------------------------------------------------- palette ----- */

  function swatchRow(hex, pct, opts = {}) {
    const row = el('div', { class: 'swatchrow' });
    row.append(el('span', { class: 'swatchrow__chip', style: `background:${hex}` }));
    const label = el('span');
    label.append(el('span', { class: 'swatchrow__hex', text: hex }));
    if (opts.contrastWith) {
      const cr = contrast(hex, opts.contrastWith);
      label.append(el('span', {
        class: 'swatchrow__pct',
        style: `margin-left:8px;color:${cr >= 4.5 ? 'var(--good)' : cr >= 3 ? 'var(--warn)' : 'var(--bad)'}`,
        text: `${cr}:1 ${cr >= 4.5 ? 'AA' : cr >= 3 ? 'AA-lg' : 'low'}`,
        title: `Contrast against ${opts.contrastWith}`,
      }));
    }
    row.append(label);

    const right = el('span', { style: 'display:flex;align-items:center;gap:6px' });
    if (pct != null) right.append(el('span', { class: 'swatchrow__pct', text: `${pct}%` }));
    const btn = el('button', {
      class: 'swatchrow__copy', type: 'button', title: `Copy ${hex}`,
      'aria-label': `Copy ${hex}`,
      onclick: async (ev) => {
        ev.stopPropagation();
        await copyText(hex);
        btn.classList.add('is-done');
        btn.innerHTML = ICON.check;
        setTimeout(() => { btn.classList.remove('is-done'); btn.innerHTML = ICON.copy; }, 1100);
      },
    });
    btn.innerHTML = ICON.copy;
    right.append(btn);
    row.append(right);
    return row;
  }

  function paletteBlock(asset) {
    const detail = (asset.palette_detail || []).slice(0, 8);
    if (!detail.length) return null;

    const wrap = el('div', { class: 'palette' });
    // contrast is measured against the dominant surface of the asset
    const dominant = detail.reduce((a, b) => (b.pct > a.pct ? b : a), detail[0]);
    const base = isDarkSurface(dominant.hex) ? '#0a0a0b' : '#ffffff';

    for (const p of detail) {
      wrap.append(swatchRow(p.hex, p.pct));
    }
    const note = el('p', {
      style: 'margin-top:6px;font-size:var(--t-2xs);color:var(--text-3)',
      text: `Sampled with k-means over the actual pixels — percentages are share of image area.`,
    });
    wrap.append(note);
    return wrap;
  }

  return { card, grid, swatchRow, paletteBlock };
})();
