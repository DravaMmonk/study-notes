// The top bar's language and theme menus, the same on every page: the notes site, Fieldnotes, the games hub and
// both games. Each is an icon button that opens a small menu of choices, the current one ticked. Plain DOM, so
// pages without a framework use it directly and React pages mount it into an element they leave empty.
//
//   const menus = mountBarMenus(container, { onLang, onTheme })   // fills `container` (usually .kit-actions)
//   menus.update()                                                // repaint after a change made elsewhere
//   menus.destroy()
//
// onLang(id) and onTheme(id) apply a choice; by default lang.js applyLang and theme.js applyTheme. A theme
// change is also announced with a `themechange` event on window, so every part of the page can follow.

import { currentLang, applyLang, tr } from './lang.js';
import { THEMES, currentTheme, applyTheme } from './theme.js';

const ICONS = {
  // lucide "languages" and "palette"
  lang: '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
  theme: '<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
};
const svg = (name, size = 16) => `<svg class="kit-ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

// Each theme shown by its own page colour, ink and accent (tokens.css).
const SWATCH = { paper: ['#f3f1eb', '#282824', '#c98f22'], night: ['#141413', '#e6e4dc', '#e0b45a'], blueprint: ['#15314e', '#eaf3fb', '#f4d27a'] };
const swatch = id => { const [bg, ink, accent] = SWATCH[id] || SWATCH.paper; return `<i class="kit-swatch" style="--sw-bg:${bg};--sw-ink:${ink};--sw-accent:${accent}" aria-hidden="true"></i>`; };

const MENUS = {
  lang: {
    title: () => tr('语言', 'Language'),
    now: () => currentLang(),
    options: () => [
      { id: 'zh', label: '中文', note: 'Chinese', lang: 'zh-CN' },
      { id: 'en', label: 'English', note: '英文', lang: 'en' },
    ],
  },
  theme: {
    title: () => tr('主题', 'Theme'),
    now: () => currentTheme(),
    options: () => THEMES.map(([id, zh, en]) => ({ id, label: tr(zh, en), lead: swatch(id) })),
  },
};

let openMenu = null; // only one menu is open at a time, across the page
const close = (focus = false) => {
  if (!openMenu) return;
  const { button, pop } = openMenu;
  pop.hidden = true;
  button.setAttribute('aria-expanded', 'false');
  if (focus) button.focus();
  openMenu = null;
};
addEventListener('pointerdown', e => { if (openMenu && !openMenu.root.contains(e.target)) close(); }, true);
addEventListener('keydown', e => { if (e.key === 'Escape' && openMenu) { e.stopPropagation(); close(true); } }, true);

function build(kind, pick) {
  const spec = MENUS[kind];
  const root = document.createElement('div');
  root.className = 'kit-menu';
  root.dataset.kitMenu = kind;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'kit-btn kit-icon-btn';
  button.setAttribute('aria-haspopup', 'menu');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = svg(kind, 17);
  const pop = document.createElement('div');
  pop.className = 'kit-pop';
  pop.setAttribute('role', 'menu');
  pop.hidden = true;
  root.append(button, pop);

  const items = () => [...pop.querySelectorAll('[role="menuitemradio"]')];
  const paint = () => {
    const now = spec.now(), current = spec.options().find(o => o.id === now);
    button.title = spec.title();
    button.setAttribute('aria-label', `${spec.title()}${tr('：', ': ')}${current ? current.label : ''}`);
    pop.setAttribute('aria-label', spec.title());
    pop.innerHTML = `<div class="kit-pop-label">${spec.title()}</div>` + spec.options().map(o => `<button type="button" role="menuitemradio" class="kit-pop-item" data-v="${o.id}" aria-checked="${o.id === now}"${o.lang ? ` lang="${o.lang}"` : ''}>${o.lead || ''}<span>${o.label}</span>${o.note ? `<small>${o.note}</small>` : ''}${svg('check', 15)}</button>`).join('');
  };
  const open = keyboard => {
    close();
    paint();
    pop.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    openMenu = { root, button, pop };
    // From the keyboard, focus goes into the menu, on the current choice; a click leaves it on the button.
    if (keyboard) (items().find(b => b.getAttribute('aria-checked') === 'true') || items()[0])?.focus();
  };
  button.addEventListener('click', e => (openMenu?.root === root ? close() : open(e.detail === 0)));
  button.addEventListener('keydown', e => { if (e.key === 'ArrowDown' && openMenu?.root !== root) { e.preventDefault(); open(true); } });
  pop.addEventListener('click', e => {
    const item = e.target.closest('[role="menuitemradio"]');
    if (!item) return;
    close(true);
    if (item.dataset.v !== spec.now()) pick(item.dataset.v);
  });
  pop.addEventListener('keydown', e => {
    const list = items(), at = list.indexOf(document.activeElement);
    const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (step) { e.preventDefault(); list[(at + step + list.length) % list.length]?.focus(); }
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); list[e.key === 'Home' ? 0 : list.length - 1]?.focus(); }
    else if (e.key === 'Tab') close();
  });
  paint();
  return { root, paint };
}

/** Put the language and theme menus into `container`, replacing what is there. */
export function mountBarMenus(container, { onLang = applyLang, onTheme = applyTheme } = {}) {
  const lang = build('lang', id => onLang(id));
  const theme = build('theme', id => { onTheme(id); dispatchEvent(new CustomEvent('themechange', { detail: id })); });
  container.replaceChildren(lang.root, theme.root);
  const update = () => { lang.paint(); theme.paint(); };
  addEventListener('langchange', update);
  addEventListener('themechange', update);
  return {
    update,
    destroy() {
      removeEventListener('langchange', update);
      removeEventListener('themechange', update);
      if (openMenu && container.contains(openMenu.root)) close();
      container.replaceChildren();
    },
  };
}
