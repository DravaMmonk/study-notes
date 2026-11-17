// The table domain's text, in the shared shell's language (../../shell/i18n.js, the same choice as every other page),
// plus bilingual values for data that is built once (a game's content, the parts).
//
// - tr('中文', 'English') picks a string now. Use it for text that is rebuilt on every render.
// - T('中文', 'English') is a bilingual string: it turns into the current language's text wherever it is put in a
//   template, joined or set as textContent (and the shell's L() reads it as a { zh, en } pair). Level data, parts
//   and components use it, so switching language only needs a re-render.
// - lazy(() => tr(...)) is text assembled from other localized parts (a cell name, a part name); it is assembled
//   again each time it is shown. Messages that stay on screen (fail sheets, a mode's message box) use it.
// - hydrate(content) turns resolved display text into a value that renders in the current language.

import { getLang, sideOf, tr } from '../../shell/i18n.js';
import { isText } from '../../engine/i18n.js';

export { tr };
export const isEn = () => getLang() === 'en';

class Txt {
  constructor(text) { Object.assign(this, text); }
  toString() { return isText(this) ? sideOf(this, getLang()) : String(this[getLang()]); }
  toJSON() { return this.toString(); }
}
class Lazy {
  constructor(fn) { this.fn = fn; }
  toString() { return String(this.fn()); }
  toJSON() { return this.toString(); }
}
export const T = (zh, en) => new Txt({ zh, en });
export const lazy = fn => new Lazy(fn);

/** A copy of plain data with display text wrapped for interpolation. */
export const hydrate = v => (isText(v) && (v.$key || typeof v.zh === 'string' && typeof v.en === 'string') ? new Txt(v) : Array.isArray(v) ? v.map(hydrate) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, hydrate(x)])) : v);
