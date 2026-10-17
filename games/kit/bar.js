// The shared top bar (ui.css .kit-bar) for pages without a framework: the games hub. It mounts the language and
// theme menus (menu.js) into every [data-kit-menus] and puts static text in the current language. React pages
// (Fieldnotes, the games) render the same bar themselves and mount the menus with menu.js directly.
//
// Static text: the markup holds the Chinese; data-en holds the English inner HTML and data-en-label the English
// aria-label. Pages that read English hide [data-en] until the swap (html[lang="en"]:not(.i18n) [data-en]).

import { currentTheme, applyTheme } from './theme.js';
import { currentLang } from './lang.js';
import { mountBarMenus } from './menu.js';

/** Put static bilingual markup in the current language. */
export function paintText(root = document) {
  const en = currentLang() === 'en';
  root.querySelectorAll('[data-en]').forEach(el => {
    if (el.dataset.zh === undefined) el.dataset.zh = el.innerHTML;
    el.innerHTML = en ? el.dataset.en : el.dataset.zh;
  });
  root.querySelectorAll('[data-en-label]').forEach(el => {
    if (el.dataset.zhLabel === undefined) el.dataset.zhLabel = el.getAttribute('aria-label') || '';
    el.setAttribute('aria-label', en ? el.dataset.enLabel : el.dataset.zhLabel);
  });
  document.documentElement.lang = en ? 'en' : 'zh-CN';
  document.documentElement.classList.add('i18n');
}

/** Mount the bar's menus. onLang and onTheme run after a switch so the page can redraw its own text. */
export function wireBar({ onLang, onTheme } = {}) {
  document.querySelectorAll('[data-kit-menus]').forEach(el => mountBarMenus(el));
  addEventListener('langchange', () => { paintText(); onLang?.(currentLang()); });
  addEventListener('themechange', () => onTheme?.(currentTheme()));
  applyTheme(currentTheme());
  paintText();
}
