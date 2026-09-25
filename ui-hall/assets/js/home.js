/* UI Hall — home. The showcase landing: what Stormy is, and the three ways
   into it (gallery, MCP, skill). Everything on this page is rendered from
   data/showcase.js, which tools/build_showcase.mjs generates by actually
   calling the MCP tools — so the sample outputs are real, not staged. */

const Home = (() => {
  const S = () => window.SHOWCASE;

  const MCP_CONFIG = `{
  "mcpServers": {
    "stormy": {
      "command": "node",
      "args": ["/path/to/checkout/stormy-mcp/server.js"]
    }
  }
}`;

  const SKILL_USE = `# the skill lives in the checkout
skills/stormy-design/SKILL.md

# without the MCP, the same tools run from the CLI
node skills/stormy-design/scripts/stormy.mjs brief "onboarding for a sleep tracker"
node skills/stormy-design/scripts/stormy.mjs palette "warm and quiet" --surface dark`;

  function stat(value, label) {
    return el('div', { class: 'hstat' },
      el('span', { class: 'hstat__num num', text: String(value) }),
      el('span', { class: 'hstat__lab', text: label }));
  }

  function copyBtn(text, label) {
    const lab = el('span', { text: label });
    return el('button', {
      class: 'btn btn--sm btn--ghost', type: 'button',
      onclick: async () => {
        await copyText(text);
        const old = lab.textContent;
        lab.textContent = 'Copied ✓';
        setTimeout(() => { lab.textContent = old; }, 1200);
      },
    }, lab);
  }

  /* ------------------------------------------------------------- hero --- */

  function hero() {
    const s = S().stats;
    const wrap = el('section', { class: 'home-hero' });
    wrap.append(
      el('div', { class: 'home-hero__orbs', 'aria-hidden': 'true' },
        el('span', { class: 'orb orb--a' }), el('span', { class: 'orb orb--b' }), el('span', { class: 'orb orb--c' })),
      el('p', { class: 'home-hero__eyebrow', text: 'Stormy · a design reference you can point an agent at' }),
      el('h1', { class: 'home-hero__title', text: 'Design from evidence, not taste.' }),
      el('p', { class: 'home-hero__sub', text:
        `A curated corpus of ${s.assets} mobile and web interfaces — every one looked at and written up by hand, ` +
        `every palette measured from the pixels. Served three ways: a browsable gallery, an MCP server with ` +
        `${S().tools.length} design tools, and a skill that teaches an agent to use them honestly.` }),
      el('div', { class: 'home-hero__stats' },
        stat(s.assets, 'assets, all described'),
        stat(s.verified_groups, 'verified app sets'),
        stat(s.clips, 'motion clips'),
        stat(s.tags, 'taxonomy tags'),
        stat(`${s.described_pct}%`, 'hand-written coverage')),
      el('div', { class: 'home-hero__cta' },
        el('button', { class: 'btn btn--primary', type: 'button', onclick: () => App.go('gallery'), text: 'Browse the gallery' }),
        el('a', { class: 'btn btn--ghost', href: '#home-mcp', onclick: (ev) => { ev.preventDefault(); document.getElementById('home-mcp')?.scrollIntoView({ behavior: 'smooth' }); }, text: 'Connect the MCP' }),
        el('a', { class: 'btn btn--ghost', href: '#home-skill', onclick: (ev) => { ev.preventDefault(); document.getElementById('home-skill')?.scrollIntoView({ behavior: 'smooth' }); }, text: 'Read the skill' })),
    );
    return wrap;
  }

  /* -------------------------------------------------------------- mcp --- */

  function toolCard(t) {
    const pre = el('pre', { class: 'toolcard__pre mono', text: t.sample_output || '' });
    const args = el('pre', { class: 'toolcard__pre toolcard__pre--args mono', text: t.sample_args ? JSON.stringify(t.sample_args) : '{}' });
    const params = el('ul', { class: 'toolcard__params' });
    for (const p of t.params) {
      params.append(el('li', {},
        el('code', { class: 'mono', text: p.name }),
        el('span', { class: 'toolcard__ptype', text: p.type + (p.required ? ' · required' : '') }),
        p.description ? el('span', { class: 'toolcard__pdesc', text: ' — ' + p.description }) : null));
    }
    const detail = el('div', { class: 'toolcard__detail', hidden: true },
      el('h4', { class: 'toolcard__h', text: 'Parameters' }), params,
      el('h4', { class: 'toolcard__h', text: 'Example call' }), args,
      el('h4', { class: 'toolcard__h', text: 'Real output, truncated' }), pre);

    const card = el('article', { class: 'toolcard' });
    const head = el('button', {
      class: 'toolcard__head', type: 'button', 'aria-expanded': 'false',
      onclick: () => {
        const open = detail.hidden;
        detail.hidden = !open;
        head.setAttribute('aria-expanded', String(open));
        card.classList.toggle('is-open', open);
      },
    },
      el('span', { class: 'toolcard__name mono', text: t.name }),
      el('span', { class: 'toolcard__chev', 'aria-hidden': 'true', html: '<svg viewBox="0 0 20 20"><path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' }));
    card.append(head,
      el('p', { class: 'toolcard__desc', text: t.description }),
      detail);
    return card;
  }

  function mcpSection() {
    const wrap = el('section', { class: 'home-sec', id: 'home-mcp' });
    wrap.append(
      el('div', { class: 'home-sec__head' },
        el('h2', { class: 'home-sec__title', text: 'The MCP server' }),
        el('p', { class: 'home-sec__sub', text:
          'Zero dependencies, stdio JSON-RPC. Ten tools over the corpus — search, briefs, measured palettes, ' +
          'patterns, before/after pairs and verified app sets. The samples below were produced by calling the ' +
          'real tools at build time.' }),
        copyBtn(MCP_CONFIG, 'Copy MCP config')));

    const grid = el('div', { class: 'toolgrid' });
    for (const t of S().tools) grid.append(toolCard(t));
    wrap.append(grid);
    return wrap;
  }

  /* ----------------------------------------------------------- groups --- */

  function groupsSection() {
    const wrap = el('section', { class: 'home-sec' });
    wrap.append(el('div', { class: 'home-sec__head' },
      el('h2', { class: 'home-sec__title', text: 'Verified app sets' }),
      el('p', { class: 'home-sec__sub', text:
        'Screens confirmed as one product by looking at every member — so a redesign stays consistent across ' +
        'all of an app\u2019s screens, not one lucky example. Click a set to see it in the gallery.' })));

    const strip = el('div', { class: 'groupstrip' });
    for (const g of S().groups) {
      strip.append(el('button', {
        class: 'groupcard', type: 'button',
        onclick: () => { Filters.setRoute('gallery'); Filters.toggle('group', g.id); App.go('gallery'); },
      },
        el('div', { class: 'groupcard__thumbs' },
          ...g.members.slice(0, 4).map((m) => el('img', { src: m.thumb, alt: '', loading: 'lazy' }))),
        el('span', { class: 'groupcard__title', text: g.title }),
        el('span', { class: 'groupcard__count num', text: `${g.members.length} screens` })));
    }
    wrap.append(strip);
    return wrap;
  }

  /* --------------------------------------------------------- patterns --- */

  function patternsSection() {
    const wrap = el('section', { class: 'home-sec' });
    wrap.append(el('div', { class: 'home-sec__head' },
      el('h2', { class: 'home-sec__title', text: 'Named patterns' }),
      el('p', { class: 'home-sec__sub', text:
        'Layout idioms that recur often enough to be worth naming. find_patterns returns these with the assets that demonstrate each.' })));
    const grid = el('div', { class: 'patgrid' });
    for (const p of S().patterns) {
      grid.append(el('article', { class: 'patcard' },
        el('h3', { class: 'patcard__name', text: p.name }),
        el('p', { class: 'patcard__why', text: p.why })));
    }
    wrap.append(grid);
    return wrap;
  }

  /* ----------------------------------------------------------- skill ---- */

  function skillSection() {
    const wrap = el('section', { class: 'home-sec', id: 'home-skill' });
    const rules = [
      ['Look before you design', 'search_designs and design_brief pull real examples; the skill makes you open the image, not just read the record.'],
      ['Steal structure, not skin', 'Copy hierarchy, rhythm and absence — never another product\u2019s gradient.'],
      ['Colours from measurement', 'palette_for returns hexes measured from real interfaces, with WCAG ratios attached.'],
      ['Tokens before markup', 'Commit to named values first; every later decision becomes a choice between options.'],
      ['Honesty rules', 'Never invent a colour and call it measured. Never cite an asset you have not looked at.'],
    ];
    wrap.append(el('div', { class: 'home-sec__head' },
      el('h2', { class: 'home-sec__title', text: 'The skill' }),
      el('p', { class: 'home-sec__sub', text:
        'skills/stormy-design/SKILL.md turns the corpus into a method: establish the screen, find real examples, ' +
        'extract structure, measure colour, commit tokens, then check the result against the corpus again.' }),
      copyBtn(SKILL_USE, 'Copy usage')));

    const grid = el('div', { class: 'skillgrid' });
    for (const [t, d] of rules) {
      grid.append(el('article', { class: 'skillcard' },
        el('h3', { class: 'skillcard__t', text: t }),
        el('p', { class: 'skillcard__d', text: d })));
    }
    wrap.append(grid);
    return wrap;
  }

  /* ------------------------------------------------------------ render -- */

  function render(root) {
    root.innerHTML = '';
    root.append(hero(), mcpSection(), groupsSection(), patternsSection(), skillSection());
  }

  return { render };
})();
