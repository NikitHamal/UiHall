/* UI Hall — Typography tab.
   A real type reference, not a picture of one: every specimen is rendered with
   the actual woff2 that ships in assets/fonts, and the playground writes live
   CSS into the page so what you see is what you would ship. */

const Typography = (() => {
  let data = null;

  /* ---------------------------------------------------------- font faces --- */

  /** Register every downloaded family as a real @font-face. This is the whole
      point: a specimen rendered in the actual file, not a lookalike. */
  function registerFaces(families) {
    const css = [];
    for (const f of families) {
      for (const w of f.weights) {
        css.push(
          `@font-face{font-family:'${f.cssFamily}';` +
          `src:url('assets/fonts/${f.cssFamily}/${w}.woff2') format('woff2');` +
          `font-weight:${w};font-style:normal;font-display:swap;}`
        );
      }
    }
    const tag = document.createElement('style');
    tag.id = 'typeface-faces';
    tag.textContent = css.join('\n');
    document.head.append(tag);
  }

  /* ------------------------------------------------------------ playground --- */

  const DEFAULTS = {
    family: 'Inter',
    size: 48,
    weight: 400,
    lineHeight: 1.15,
    tracking: -1.5,
    align: 'left',
    transform: 'none',
    content: 'The quick brown fox jumps over the lazy dog',
  };

  const SAMPLE_PRESETS = {
    Inter: 'Handgloves 0123 — the quick brown fox',
    Manrope: 'Handgloves 0123 — the quick brown fox',
    'Space Grotesk': 'Handgloves 0123 — the quick brown fox',
    'DM Sans': 'Handgloves 0123 — the quick brown fox',
    Sora: 'Handgloves 0123 — the quick brown fox',
    BricolageGrotesque: 'Handgloves 0123 — the quick brown fox',
    PlayfairDisplay: 'Handgloves 0123 — the quick brown fox',
    Fraunces: 'Handgloves 0123 — the quick brown fox',
    SourceSerif4: 'Handgloves 0123 — the quick brown fox',
    Lora: 'Handgloves 0123 — the quick brown fox',
    JetBrainsMono: 'const total = items.reduce((a, b) => a + b, 0);',
    SpaceMono: 'const total = items.reduce((a, b) => a + b, 0);',
  };

  function playground(families) {
    const p = { ...DEFAULTS };
    let face = document.getElementById('typeface-playground');
    if (!face) return;

    const stage = el('div', { class: 'tp__stage' });
    const editable = el('div', {
      class: 'tp__editable',
      contenteditable: 'true',
      spellcheck: 'false',
      'data-placeholder': 'Type here — this text is editable',
      oninput: (ev) => { p.content = ev.currentTarget.textContent; },
    });
    editable.textContent = p.content;
    stage.append(editable);

    /* the generated CSS, shown next to the live result — this is the part
       people actually need: not "use Inter" but the exact declaration. */
    const code = el('pre', { class: 'tp__code' });
    const buildCode = () => {
      const fam = families.find((f) => f.cssFamily === p.family);
      const decl = [
        `font-family: ${fam ? fam.stack : `'${p.family}', sans-serif`};`,
        `font-size: ${p.size}px;`,
        `font-weight: ${p.weight};`,
        `line-height: ${p.lineHeight};`,
        `letter-spacing: ${p.tracking}px;`,
      ];
      if (p.align !== 'left') decl.push(`text-align: ${p.align};`);
      if (p.transform !== 'none') decl.push(`text-transform: ${p.transform};`);
      code.textContent = `/* ${fam ? fam.name : p.family} — copy into your stylesheet */\n.type {\n  ${decl.join('\n  ')}\n}`;
    };
    const apply = () => {
      const fam = families.find((f) => f.cssFamily === p.family);
      const s = editable.style;
      s.fontFamily = fam ? fam.stack : `'${p.family}', sans-serif`;
      s.fontSize = p.size + 'px';
      s.fontWeight = String(p.weight);
      s.lineHeight = String(p.lineHeight);
      s.letterSpacing = p.tracking + 'px';
      s.textAlign = p.align;
      s.textTransform = p.transform;
      buildCode();
    };

    const ctl = (label, key, opts) => {
      const row = el('label', { class: 'tp__ctl' });
      row.append(el('span', { class: 'tp__ctl-label', text: label }));
      let input;
      if (opts.type === 'range') {
        input = el('input', { type: 'range', min: opts.min, max: opts.max, step: opts.step, value: p[key] });
      } else if (opts.type === 'select') {
        input = el('select', {});
        for (const o of opts.options) input.append(el('option', { value: o, selected: o === p[key] ? true : null, text: o }));
      } else {
        input = el('select', {});
        for (const o of opts.options) input.append(el('option', { value: o.value, selected: o.value === p[key] ? true : null, text: o.label }));
      }
      input.addEventListener('input', (ev) => {
        p[key] = opts.type === 'range' ? Number(ev.target.value) : ev.target.value;
        if (key === 'family') {
          const fam = families.find((f) => f.cssFamily === p.family);
          if (fam) {
            p.weight = fam.weights.includes(p.weight) ? p.weight : fam.weights[0];
            weightSel.value = String(p.weight);
            for (const o of weightSel.options) o.selected = Number(o.value) === p.weight;
            editable.textContent = SAMPLE_PRESETS[fam.cssFamily] || p.content;
            p.content = editable.textContent;
          }
        }
        apply();
        if (key === 'size') out.textContent = p.size + 'px';
        if (key === 'weight') wout.textContent = String(p.weight);
        if (key === 'tracking') tout.textContent = p.tracking + 'px';
        if (key === 'lineHeight') lout.textContent = String(p.lineHeight);
      });
      row.append(input);
      const out = el('output', { class: 'tp__out', text: p[key] + (opts.unit || '') });
      if (opts.type === 'range') row.append(out);
      row._out = out;
      return row;
    };

    const sizeRow = ctl('Size', 'size', { type: 'range', min: 12, max: 120, step: 1, unit: 'px' });
    const weightRow = ctl('Weight', 'weight', { type: 'select', options: [] });
    const weightSel = weightRow.querySelector('select');
    const trackRow = ctl('Tracking', 'tracking', { type: 'range', min: -4, max: 4, step: 0.1, unit: 'px' });
    const lhRow = ctl('Line height', 'lineHeight', { type: 'range', min: 0.9, max: 2, step: 0.05 });
    const alignRow = ctl('Align', 'align', { type: 'select', options: ['left', 'center', 'right', 'justify'] });
    const transformRow = ctl('Transform', 'transform', { type: 'select', options: ['none', 'uppercase', 'lowercase', 'capitalize'] });
    const familyRow = ctl('Typeface', 'family', {
      type: 'select', options: families.map((f) => ({ value: f.cssFamily, label: `${f.name} — ${f.class}` })),
    });

    const fillWeights = () => {
      const fam = families.find((f) => f.cssFamily === p.family);
      const ws = fam ? fam.weights : [400];
      weightSel.innerHTML = '';
      for (const w of ws) weightSel.append(el('option', { value: w, selected: w === p.weight ? true : null, text: String(w) }));
      p.weight = ws.includes(p.weight) ? p.weight : ws[0];
    };
    fillWeights();

    const controls = el('div', { class: 'tp__controls' },
      familyRow, sizeRow, weightRow, trackRow, lhRow, alignRow, transformRow);

    const actions = el('div', { class: 'tp__actions' },
      el('button', {
        class: 'btn btn--sm', type: 'button', text: 'Reset',
        onclick: () => {
          Object.assign(p, DEFAULTS, { family: DEFAULTS.family });
          editable.textContent = p.content;
          for (const [key, node] of [[sizeRow, 'size'], [trackRow, 'tracking'], [lhRow, 'lineHeight']]) {
            const input = node.querySelector('input');
            input.value = p[key];
          }
          for (const [key, node] of [[familyRow, 'family'], [alignRow, 'align'], [transformRow, 'transform']]) {
            const sel = node.querySelector('select');
            sel.value = p[key];
            for (const o of sel.options) o.selected = o.value === p[key];
          }
          fillWeights();
          apply();
        },
      }),
      el('button', {
        class: 'btn btn--sm', type: 'button', text: 'Copy CSS',
        onclick: async (ev) => {
          await copyText(code.textContent);
          const b = ev.currentTarget;
          const old = b.textContent;
          b.textContent = 'Copied';
          setTimeout(() => { b.textContent = old; }, 1200);
        },
      }));

    face.append(el('div', { class: 'tp' },
      el('div', { class: 'tp__head' },
        el('h2', { class: 'section__title', text: 'Playground' }),
        el('p', { class: 'section__note', text: 'Editable, live, and it writes the CSS as you move the controls. Click the text and type your own — nothing here is an image.' }),
        actions),
      el('div', { class: 'tp__panel' }, controls, stage, code)));
  }

  /* ------------------------------------------------------------ specimens --- */

  function specimen(f) {
    const art = el('article', { class: 'spec', style: `--spec-accent: var(--accent)` });
    const head = el('header', { class: 'spec__head' },
      el('div', {},
        el('h3', { class: 'spec__name', text: f.name }),
        el('p', { class: 'spec__class', text: f.class })),
      el('div', { class: 'spec__weights' },
        ...f.weights.map((w) => el('span', { class: 'spec__weight', text: String(w) }))));
    art.append(head);

    /* the alphabet, at real size, in the real file */
    const line = el('p', { class: 'spec__alphabet', style: `font-family:${f.stack}` },
      'ABCDEFGHIJKLM abcdefghijklm 0123456789');
    art.append(line);

    /* a size ladder proves the family at the sizes it will actually be used */
    const ladder = el('div', { class: 'spec__ladder' });
    for (const s of [40, 28, 20, 15, 13]) {
      ladder.append(el('p', {
        class: 'spec__rung',
        style: `font-family:${f.stack};font-size:${s}px;line-height:1.2`,
        text: `${s}px ${f.name}`,
      }));
    }
    art.append(ladder);

    const meta = el('div', { class: 'spec__meta' },
      el('p', { class: 'spec__blurb', text: f.blurb }),
      el('dl', { class: 'spec__facts' },
        el('div', {}, el('dt', { text: 'x-height' }), el('dd', { text: f.metrics.xHeight })),
        el('div', {}, el('dt', { text: 'contrast' }), el('dd', { text: f.metrics.contrast })),
        el('div', {}, el('dt', { text: 'width' }), el('dd', { text: f.metrics.width }))),
      el('p', { class: 'spec__label', text: 'Best for' }),
      el('ul', { class: 'spec__uses' }, ...f.bestFor.map((u) => el('li', { text: u }))),
      el('p', { class: 'spec__label', text: 'Watch out' }),
      el('p', { class: 'spec__watch', text: f.watch }),
      el('details', { class: 'spec__code' },
        el('summary', { text: 'Integration snippet' }),
        el('pre', { text:
          `/* ${f.name} — ${f.class} */\n` +
          `@font-face {\n  font-family: '${f.cssFamily}';\n` +
          `  src: url('assets/fonts/${f.cssFamily}/400.woff2') format('woff2');\n` +
          `  font-weight: 400;\n  font-display: swap;\n}\n\n` +
          `body {\n  font-family: ${f.stack};\n}` })));
    art.append(meta);
    return art;
  }

  /* ---------------------------------------------------------------- guides --- */

  function guides(list) {
    const wrap = el('div', { class: 'guides' });
    for (const g of list) {
      const card = el('article', { class: 'guide' },
        el('h3', { class: 'guide__t', text: g.title }),
        el('p', { class: 'guide__b', text: g.body }));
      const pre = el('pre', { class: 'guide__code', text: g.code });
      const copy = el('button', {
        class: 'btn btn--sm guide__copy', type: 'button', text: 'Copy',
        onclick: async (ev) => {
          await copyText(g.code);
          const b = ev.currentTarget;
          b.textContent = 'Copied';
          setTimeout(() => { b.textContent = 'Copy'; }, 1200);
        },
      });
      const codeWrap = el('div', { class: 'guide__codewrap' }, pre, copy);
      card.append(codeWrap);
      wrap.append(card);
    }
    return wrap;
  }

  /* ------------------------------------------------------------------ init --- */

  async function loadData() {
    if (data) return data;
    if (location.protocol === 'file:') {
      // fetch() is blocked on file://, so use the generated JS twin instead.
      await new Promise((resolve, reject) => {
        if (window.STORMY_TYPEFACES) return resolve();
        const s = document.createElement('script');
        s.src = 'data/typefaces.js';
        s.onload = () => (window.STORMY_TYPEFACES
          ? resolve()
          : reject(new Error('typefaces.js loaded but defined no data')));
        s.onerror = () => reject(new Error(
          'could not load data/typefaces.js - run tools/build_corpus.py'));
        document.head.append(s);
      });
      data = window.STORMY_TYPEFACES;
    } else {
      const res = await fetch('data/typefaces.json');
      if (!res.ok) throw new Error('typefaces.json ' + res.status);
      data = await res.json();
    }
    registerFaces(data.families);
    return data;
  }

  async function render(container) {
    const fams = (await loadData()).families;
    container.dataset.view = 'grid';
    container.innerHTML = '';

    document.getElementById('resultCount').innerHTML =
      `<b>${fams.length}</b> typefaces · <b>${fams.reduce((n, f) => n + f.weights.length, 0)}</b> weights · all OFL 1.1`;

    const intro = el('section', { class: 'section', style: 'grid-column:1/-1' },
      el('div', { class: 'section__head' },
        el('div', {},
          el('h2', { class: 'section__title', text: 'A type reference you can actually use' }),
          el('p', { class: 'section__note', text: 'Every specimen below is rendered with the exact woff2 file in this repo — not a picture of a font. All twelve families are SIL Open Font License 1.1, so you can self-host them in a commercial product without asking anyone. The playground is live: type in it, move the controls, copy the CSS.' }))));
    container.append(intro);

    const groups = [
      { title: 'UI sans', note: 'For product surfaces: dashboards, forms, anything you read often.', ids: ['inter', 'manrope', 'space-grotesk', 'dm-sans', 'sora', 'bricolage-grotesque'] },
      { title: 'Serif', note: 'For long-form reading and brand voice. Note the size floor on Playfair.', ids: ['playfair-display', 'fraunces', 'source-serif-4', 'lora'] },
      { title: 'Monospace', note: 'For code, terminals and anything where character alignment is the point.', ids: ['jetbrains-mono', 'space-mono'] },
    ];
    for (const g of groups) {
      const sec = el('section', { class: 'section', style: 'grid-column:1/-1' },
        el('div', { class: 'section__head' },
          el('div', {},
            el('h2', { class: 'section__title', text: g.title }),
            el('p', { class: 'section__note', text: g.note }))));
      const grid = el('div', { class: 'specgrid' });
      for (const id of g.ids) {
        const f = fams.find((x) => x.id === id);
        if (f) grid.append(specimen(f));
      }
      sec.append(grid);
      container.append(sec);
    }

    const pg = el('section', { class: 'section', style: 'grid-column:1/-1' });
    pg.id = 'typeface-playground';
    container.append(pg);
    playground(fams);

    const guideSec = el('section', { class: 'section', style: 'grid-column:1/-1' },
      el('div', { class: 'section__head' },
        el('div', {},
          el('h2', { class: 'section__title', text: 'Integration notes' }),
          el('p', { class: 'section__note', text: 'The seven things worth getting right before a font reaches production.' }))));
    guideSec.append(guides(data.guides));
    container.append(guideSec);
  }

  return { render };
})();
