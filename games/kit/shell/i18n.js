// The reading language inside a game (the shared shell and every content pack). The choice itself (stored key, <html lang>, the `langchange`
// event) belongs to games/kit/lang.js, shared with every other page; this module only keeps the current value
// at hand and resolves the game's text with it.
//
// A text is { zh: '…' } with the other languages it has beside it ({ zh, en }: a game's content with its overlay laid
// over, ../engine/i18n.js; what code says, below); a plain string (a symbol, a number, a name like 'Sobel') reads the
// same in every language. L(text) picks the side for the current language, the base where there is no other.
//
// This module has no React, so level data and `npm run check` can use it too; useLang.js is the React hook.
// GameShell keeps the language in React state and re-renders on `langchange`, so anything that calls L or tr
// during render follows the switch. A value stored in state or memoised must store the pair, not its resolved
// string, so it still follows.
import { currentLang } from '../lang.js'
import EN from '../i18n/en.js'

let lang = 'zh'
try {
  lang = currentLang()
} catch {
  // No browser (npm run check): Chinese, the language the levels were written in.
}
if (typeof window !== 'undefined') window.addEventListener('langchange', (event) => { lang = event.detail === 'en' ? 'en' : 'zh' })

export const getLang = () => lang

// The kit's own words are written in the base language alone; how one reads in English is the catalog's
// (../i18n/en.js, kept by npm run words). A sentence put together from values still gives both: T(`第 ${n} 关`,
// `Level ${n}`).

/** A text for what code says: T('清空'), its other languages from the catalog; or T(`…${x}`, `…${x}`) giving both. */
export const T = (zh, en = EN[zh]) => (en === undefined ? { zh } : { zh, en })

/** The string for the current language: tr('清空'), or tr(`…${x}`, `…${x}`) giving both. */
export const tr = (zh, en = EN[zh]) => (lang === 'en' ? en ?? zh : zh)

/** Is this a { zh, en } text pair? (Any object with a Chinese and an English side counts.) */
export const isPair = (v) => v !== null && typeof v === 'object' && typeof v.zh === 'string' && !Array.isArray(v)

// A text object that renders itself (a game's own lazily assembled text) becomes its string.
const selfRendering = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && v.toString !== Object.prototype.toString

/** Resolve a text pair (or pass a plain string, number or nothing through). */
export const L = (v) => (isPair(v) ? (lang === 'en' ? v.en ?? v.zh : v.zh) : selfRendering(v) ? String(v) : v)

/** One language's side of a text (the base where it has none): for a sentence written in each language at once. */
export const sideOf = (v, side) => (isPair(v) ? v[side] ?? v.zh : v)

/** The Chinese side of a pair: the same in both languages, for React keys and comparisons. */
export const keyOf = (v) => (isPair(v) ? v.zh : v)
