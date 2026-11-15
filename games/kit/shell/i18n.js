// The reading language inside a game (the shared shell and every content pack). The choice itself (stored key, <html lang>, the `langchange`
// event) belongs to games/kit/lang.js, shared with every other page; this module only keeps the current value
// at hand and resolves the game's text with it.
//
// Content has a text per language. A plain string reads the same in every language.
//
// This module has no React, so level data and `npm run check` can use it too; useLang.js is the React hook.
// GameShell keeps the language in React state and re-renders on `langchange`, so anything that calls L or tr
// during render follows the switch. A value stored in state or memoised must store the pair, not its resolved
// string, so it still follows.
import { currentLang } from '../lang.js'
import EN from '../i18n/en.js'
import { firstText, isText } from '../engine/i18n.js'

let lang = 'en'
try {
  lang = currentLang()
} catch {
  // No browser (npm run check): Use the same language for headless runs throughout.
}
if (typeof window !== 'undefined') window.addEventListener('langchange', (event) => { lang = event.detail })

export const getLang = () => lang

// The kit's own words are written in the base language alone; how one reads in English is the catalog's
// (../i18n/en.js, kept by npm run words). A sentence put together from values still gives both: T(`第 ${n} 关`,
// `Level ${n}`).

/** A text for what code says: T('清空'), its other languages from the catalog; or T(`…${x}`, `…${x}`) giving both. */
export const T = (zh, en = EN[zh]) => (en === undefined ? { zh } : { zh, en })

/** The string for the current language: tr('清空'), or tr(`…${x}`, `…${x}`) giving both. */
export const tr = (zh, en = EN[zh]) => (lang === 'en' ? en ?? zh : zh)

/** Is this an object of language-specific texts? */
export const isPair = isText

// A text object that renders itself (a game's own lazily assembled text) becomes its string.
const selfRendering = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && v.toString !== Object.prototype.toString

/** Resolve a text pair (or pass a plain string, number or nothing through). */
export const L = (v) => (isPair(v) ? sideOf(v, lang) : selfRendering(v) ? String(v) : v)

/** One language's side of a text (another available text when it has none): for a sentence written in each language at once. */
export const sideOf = (v, side) => (!isPair(v) ? v : v[side]?.trim() ? v[side] : firstText(v))

/** A reading-language-independent key for React and comparisons. */
export const keyOf = firstText
