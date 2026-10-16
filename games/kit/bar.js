// The shared top bar (ui.css .kit-bar) for pages without a framework: the games hub and 状态之图. It wires the
// language and theme buttons and puts static text in the current language. React pages (Fieldnotes, Vision
// Complete) render the same markup themselves and use lang.js and theme.js directly.
//
// Static text: the markup holds the Chinese; data-en holds the English inner HTML and data-en-label the English
// aria-label. Pages that read English hide [data-en] until the swap (html[lang="en"]:not(.i18n) [data-en]).

import { currentTheme, nextTheme, themeLabel, applyTheme } from './theme.js';
import { currentLang, otherLang, applyLang, tr } from './lang.js';

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

/** Label every [data-lang-toggle] and [data-theme-toggle] in the page. */
export function paintButtons() {
  const l = currentLang(), t = currentTheme(), next = otherLang(l);
  document.querySelectorAll('[data-lang-toggle]').forEach(b => {
    b.textContent = next === 'en' ? 'EN' : '中';
    b.lang = next === 'en' ? 'en' : 'zh-CN';
    b.title = next === 'en' ? 'Switch to English' : '切换到中文';
    b.setAttribute('aria-label', b.title);
  });
  document.querySelectorAll('[data-theme-toggle]').forEach(b => {
    b.textContent = themeLabel(t);
    b.title = tr(`换成${themeLabel(nextTheme(t))}`, `Switch to ${themeLabel(nextTheme(t))}`);
    b.setAttribute('aria-label', b.title);
  });
}

/** Wire the page's language and theme buttons. onLang runs after a switch so the page can redraw its own text. */
export function wireBar({ onLang, onTheme } = {}) {
  document.addEventListener('click', e => {
    if (e.target.closest('[data-lang-toggle]')) applyLang(otherLang(currentLang()));
    else if (e.target.closest('[data-theme-toggle]')) { applyTheme(nextTheme(currentTheme())); paintButtons(); onTheme?.(currentTheme()); }
  });
  addEventListener('langchange', () => { paintText(); paintButtons(); onLang?.(currentLang()); });
  applyTheme(currentTheme());
  paintText();
  paintButtons();
}
