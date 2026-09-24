/* UI Hall — a custom listbox that replaces the native <select> popup.
 *
 * Why: a native <select> renders its dropdown with the operating system's own
 * widget. It cannot be styled, it ignores the page's type and colour, and on
 * Windows it looks like a 2005 dialog next to the rest of the interface. The
 * closed control can be styled via `appearance: none`, the open popup cannot.
 *
 * The pattern is progressive enhancement. The real <select> stays in the DOM as
 * the source of truth for value and events, so any code doing
 * `el.value` / `addEventListener('change')` keeps working untouched. On top of
 * it we build an ARIA listbox following the WAI-ARIA authoring practices:
 * combobox trigger + listbox popup, full keyboard support, type-ahead.
 *
 * Usage:  Listbox.enhance(document.getElementById('sort'));
 *         Listbox.sync(select)   // after assigning .value programmatically
 */

const Listbox = (() => {
  const registry = new Map(); // select element -> instance

  const TYPEAHEAD_MS = 700;

  function enhance(select) {
    if (!select || registry.has(select)) return registry.get(select);

    const options = Array.from(select.options).map((o) => ({
      value: o.value,
      label: o.textContent.trim(),
    }));
    if (!options.length) return null;

    // The native select stays for value/events but leaves the a11y tree, since
    // the widget below supplies the semantics.
    select.classList.add('listbox__native');
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;

    const root = document.createElement('div');
    root.className = 'listbox';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'listbox__trigger';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    const valueEl = document.createElement('span');
    valueEl.className = 'listbox__value';

    const chev = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    chev.setAttribute('viewBox', '0 0 12 12');
    chev.setAttribute('aria-hidden', 'true');
    chev.classList.add('listbox__chevron');
    chev.innerHTML = "<path d='M2.5 4.5L6 8l3.5-3.5' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/>";

    trigger.append(valueEl, chev);

    const list = document.createElement('div');
    list.className = 'listbox__list';
    list.setAttribute('role', 'listbox');
    list.tabIndex = -1;

    const idBase = (select.id || 'listbox') + '-opt';
    // Carry the visible "SORT" label across so the trigger announces
    // "Sort: Newest first" rather than just "Newest first".
    const labelledBy = select.getAttribute('aria-labelledby');
    const labelEl = labelledBy ? document.getElementById(labelledBy) : null;
    const baseLabel = (labelEl && labelEl.textContent.trim())
      || (select.getAttribute('aria-label') || '').trim();
    if (baseLabel) trigger.dataset.label = baseLabel;
    const optEls = options.map((o, i) => {
      const el = document.createElement('div');
      el.className = 'listbox__option';
      el.id = idBase + '-' + i;
      el.setAttribute('role', 'option');
      el.setAttribute('aria-selected', 'false');
      el.dataset.value = o.value;

      const check = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      check.setAttribute('viewBox', '0 0 12 12');
      check.setAttribute('aria-hidden', 'true');
      check.classList.add('listbox__check');
      check.innerHTML = "<path d='M2.5 6.4l2.3 2.3L9.5 4' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'/>";

      const text = document.createElement('span');
      text.textContent = o.label;

      el.append(text, check);
      return el;
    });
    list.append(...optEls);

    // The popup is positioned absolutely, so it needs a positioned ancestor.
    root.append(trigger, list);
    select.parentNode.insertBefore(root, select.nextSibling);

    let open = false;
    let active = Math.max(0, options.findIndex((o) => o.value === select.value));
    let typeahead = '';
    let typeaheadAt = 0;

    const labelFor = (v) => (options.find((o) => o.value === v) || options[0]).label;

    function paint() {
      const v = select.value;
      valueEl.textContent = labelFor(v);
      optEls.forEach((el, i) => {
        const on = options[i].value === v;
        el.setAttribute('aria-selected', on ? 'true' : 'false');
        el.classList.toggle('is-selected', on);
      });
      // Keep the trigger's accessible name in step with its visible text.
      trigger.setAttribute('aria-label', trigger.dataset.label
        ? trigger.dataset.label + ': ' + labelFor(v)
        : labelFor(v));
    }

    function setActive(i, scroll = false) {
      active = Math.max(0, Math.min(options.length - 1, i));
      optEls.forEach((el, n) => {
        const on = n === active;
        el.classList.toggle('is-active', on);
        // aria-activedescendant points at the visually active option while focus
        // stays on the listbox, which is the pattern screen readers expect.
        if (on) list.setAttribute('aria-activedescendant', el.id);
      });
      if (scroll) optEls[active].scrollIntoView({ block: 'nearest' });
    }

    function show() {
      if (open) return;
      open = true;
      root.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      setActive(options.findIndex((o) => o.value === select.value), true);
      list.focus({ preventScroll: true });
      position();
    }

    function hide(refocus = true) {
      if (!open) return;
      open = false;
      root.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      list.removeAttribute('aria-activedescendant');
      if (refocus) trigger.focus({ preventScroll: true });
    }

    /** Flip the popup above the trigger when there is no room below. */
    function position() {
      const r = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const needed = list.offsetHeight + 12;
      root.classList.toggle('is-flipped', spaceBelow < needed && r.top > needed);
    }

    function commit(i) {
      const opt = options[i];
      if (!opt) return;
      if (select.value !== opt.value) {
        select.value = opt.value;
        // Mirror the native contract so existing listeners never change.
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      paint();
      hide();
    }

    function move(delta) {
      let i = active;
      for (let n = 0; n < options.length; n++) {
        i = (i + delta + options.length) % options.length;
        if (!optEls[i].classList.contains('is-disabled')) break;
      }
      setActive(i, true);
    }

    function first() { setActive(0, true); }
    function last() { setActive(options.length - 1, true); }

    /** Jump to the next option starting with the typed string. */
    function typeAhead(ch) {
      const now = Date.now();
      typeahead = now - typeaheadAt > TYPEAHEAD_MS ? ch : typeahead + ch;
      typeaheadAt = now;
      const q = typeahead.toLowerCase();
      const from = active;
      for (let n = 1; n <= options.length; n++) {
        const i = (from + n) % options.length;
        if (options[i].label.toLowerCase().startsWith(q)) { setActive(i, true); return; }
      }
    }

    trigger.addEventListener('click', () => (open ? hide() : show()));

    trigger.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowDown': case 'Down': e.preventDefault(); open ? move(1) : show(); break;
        case 'ArrowUp': case 'Up': e.preventDefault(); open ? move(-1) : show(); break;
        case 'Home': if (open) { e.preventDefault(); first(); } break;
        case 'End': if (open) { e.preventDefault(); last(); } break;
        case 'Enter': case ' ': e.preventDefault(); open ? commit(active) : show(); break;
        case 'Escape': if (open) { e.preventDefault(); hide(); } break;
        case 'Tab': hide(false); break;
        default:
          if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
            if (!open) show();
            typeAhead(e.key);
          }
      }
    });

    list.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowDown': case 'Down': e.preventDefault(); move(1); break;
        case 'ArrowUp': case 'Up': e.preventDefault(); move(-1); break;
        case 'Home': e.preventDefault(); first(); break;
        case 'End': e.preventDefault(); last(); break;
        case 'Enter': case ' ': e.preventDefault(); commit(active); break;
        case 'Escape': e.preventDefault(); hide(); break;
        case 'Tab': hide(false); break;
        default:
          if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) typeAhead(e.key);
      }
    });

    optEls.forEach((el, i) => {
      el.addEventListener('mouseenter', () => setActive(i));
      // mousedown, not click: click would land after the blur that closes us.
      el.addEventListener('mousedown', (e) => { e.preventDefault(); commit(i); });
    });

    document.addEventListener('pointerdown', (e) => {
      if (open && !root.contains(e.target)) hide(false);
    });

    window.addEventListener('resize', () => { if (open) position(); });

    // Keep the widget honest if anything else mutates the select.
    select.addEventListener('change', paint);

    const inst = { select, root, trigger, list, paint, hide, show, isOpen: () => open };
    registry.set(select, inst);
    paint();
    return inst;
  }

  /** Call after assigning `.value` programmatically. */
  function sync(select) {
    const inst = registry.get(select);
    if (inst) inst.paint();
  }

  function syncAll() { registry.forEach((i) => i.paint()); }

  function enhanceAll(scope = document) {
    scope.querySelectorAll('select:not(.listbox__native)').forEach(enhance);
  }

  return { enhance, enhanceAll, sync, syncAll, registry };
})();
