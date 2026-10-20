import { esc, icon, tint, withCopy } from '../lib.js';
import { CLIENTS } from '../install.js';

export const thumb = (a) => a.thumb || a.src;
export const label = (s) => String(s || '').replace(/-/g, ' ');

export function footer(h) {
  const t = h.corpus.totals;
  return `
  <footer class="footer">
    <div class="container">
      <div class="footer__grid">
        <div>
          <h4>UI Hall</h4>
          <p style="max-width:34ch">${t.assets} real interface designs, read by eye and measured by machine. A reference for people, and a tool for the agents they work with.</p>
        </div>
        <div><h4>Explore</h4><a href="#/library">Library</a><a href="#/patterns">Patterns</a><a href="#/colour">Colour</a><a href="#/motion">Motion</a></div>
        <div><h4>Agents</h4><a href="#/agents">MCP server</a><a href="#/agents?tab=skill">Agent skill</a><a href="#/agents?tab=playground">Playground</a></div>
        <div><h4>Source</h4><a href="https://github.com/NikitHamal/UiHall">GitHub</a><a href="https://github.com/NikitHamal/UiHall/tree/main/mcp">uihall-mcp</a><a href="https://github.com/NikitHamal/UiHall/tree/main/skills/uihall">Skill</a></div>
      </div>
      <div class="footer__big" aria-hidden="true">UI <em>Hall</em></div>
      <p class="mt-m faint" style="font-size:12px">Interfaces belong to the people who designed them; collected from public sources for study. Learn the vocabulary — don’t ship a clone.</p>
    </div>
  </footer>`;
}

/** The install switcher (tabs + panel). Returns markup; call bindInstall(root) after mounting. */
export function installBlock() {
  return `
  <div class="install" data-install>
    <div class="install__tabs" role="tablist" aria-label="Client">
      ${CLIENTS.map((c, i) => `<button class="install__tab" role="tab" type="button" aria-selected="${i === 0}" data-client="${c.id}"><i>${esc(c.short)}</i><span>${esc(c.name)}<small>${esc(c.hint)}</small></span></button>`).join('')}
    </div>
    <div class="install__panel card" role="tabpanel"></div>
  </div>`;
}

export function bindInstall(root) {
  const box = root.querySelector('[data-install]');
  if (!box) return;
  const panel = box.querySelector('.install__panel');
  const show = (id) => {
    const c = CLIENTS.find((x) => x.id === id);
    for (const t of box.querySelectorAll('.install__tab')) t.setAttribute('aria-selected', String(t.dataset.client === id));
    panel.innerHTML = `<p>${esc(c.blurb)}</p>${c.steps.map(([title, code], i) => `<div class="mt-s"><div class="faint mono" style="font-size:11.5px;margin-bottom:8px">${String(i + 1).padStart(2, '0')} · ${esc(title)}</div>${withCopy(`ins-${c.id}-${i}`, tint(code))}</div>`).join('')}
      <p class="faint" style="font-size:13px">Needs Node 18+. The server fetches the corpus from this site on first run and caches it — no clone, no API key.</p>`;
    panel.animate?.([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
  };
  box.addEventListener('click', (e) => { const t = e.target.closest('[data-client]'); if (t) show(t.dataset.client); });
  show(CLIENTS[0].id);
}

export const arrowBtn = (href, text, primary = false) =>
  `<a class="btn ${primary ? 'btn--primary' : ''}" href="${href}">${esc(text)} ${icon.arrow}</a>`;
