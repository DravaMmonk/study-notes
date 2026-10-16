// Language: the shared choice in ../../kit/lang.js (same key as the notes site, Fieldnotes and the other games),
// plus bilingual text for data that is built once at import.
//
// - tr('中文', 'English') picks a string now. Use it for text that is rebuilt on every render.
// - T('中文', 'English') is a bilingual string: it turns into the current language's text wherever it is put in a
//   template, joined or set as textContent. Level data, parts and components use it, so switching language only
//   needs a re-render.
// - lazy(() => tr(...)) is text assembled from other localized pieces (a cell name, a part name); it is assembled
//   again each time it is shown. Messages that stay on screen (fail sheets, a mode's message box) use it.
// - Static markup carries its English in data-en (inner HTML) and data-en-label (aria-label); paintStatic swaps them.

import { currentLang, applyLang, otherLang } from '../../kit/lang.js';
import { paintText, paintButtons } from '../../kit/bar.js';

let lang = currentLang();
addEventListener('langchange', e => { lang = e.detail === 'en' ? 'en' : 'zh'; });

export const isEn = () => lang === 'en';
export const tr = (zh, en) => (lang === 'en' ? en : zh);

class Txt {
  constructor(zh, en) { this.zh = zh; this.en = en; }
  toString() { return String(lang === 'en' ? this.en : this.zh); }
  toJSON() { return this.toString(); }
}
class Lazy {
  constructor(fn) { this.fn = fn; }
  toString() { return String(this.fn()); }
  toJSON() { return this.toString(); }
}
export const T = (zh, en) => new Txt(zh, en);
export const lazy = fn => new Lazy(fn);

/** Swap static markup to the current language (the kit's data-en / data-en-label convention, kit/bar.js). */
export function paintStatic(root = document) {
  paintText(root);
  document.title = tr('状态之图', 'State Graph');
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.content = tr('零基础动态规划解谜游戏：27 关从格子和箭头出发，用元件亲手拼出路线计数器、分层状态机、对齐表和背包表的电路。', 'A dynamic programming puzzle game for complete beginners: 27 levels that start from cells and arrows and have you wire up a route counter, a layered state machine, an alignment table and a knapsack table yourself.');
}

/** The language buttons ([data-lang-toggle]): switch, repaint static text, then let the app re-render. */
export function initLang(rerender) {
  document.addEventListener('click', e => { if (e.target.closest('[data-lang-toggle]')) applyLang(otherLang(lang)); });
  addEventListener('langchange', () => { paintButtons(); paintStatic(); rerender(); });
  paintButtons();
  paintStatic();
}
