// The reading language inside a game (the shared shell and every content pack). The choice itself (stored key, <html lang>, the `langchange`
// event) belongs to games/kit/lang.js, shared with every other page; this module only keeps the current value
// at hand and resolves the game's text with it.
//
// Text in level data, intros and part specs is a pair { zh: '…', en: '…' }; a plain string (a symbol, a
// number, a name like 'Sobel') reads the same in both languages. L(text) picks the side for the current
// language. UI chrome written in a component uses tr('中文', 'English') in place.
//
// This module has no React, so level data and `npm run check` can use it too; useLang.js is the React hook.
// GameShell keeps the language in React state and re-renders on `langchange`, so anything that calls L or tr
// during render follows the switch. A value stored in state or memoised must store the pair, not its resolved
// string, so it still follows.
import { currentLang } from '../lang.js'

let lang = 'zh'
try {
  lang = currentLang()
} catch {
  // No browser (npm run check): Chinese, the language the levels were written in.
}
if (typeof window !== 'undefined') window.addEventListener('langchange', (event) => { lang = event.detail === 'en' ? 'en' : 'zh' })

export const getLang = () => lang

/** Pick the string for the current language: tr('中文', 'English'). */
export const tr = (zh, en) => (lang === 'en' ? en : zh)

/** Is this a { zh, en } text pair? (Any object with a Chinese and an English side counts.) */
export const isPair = (v) => v !== null && typeof v === 'object' && typeof v.zh === 'string' && !Array.isArray(v)

// A text object that renders itself (a game's own lazily assembled text) becomes its string.
const selfRendering = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && v.toString !== Object.prototype.toString

/** Resolve a text pair (or pass a plain string, number or nothing through). */
export const L = (v) => (isPair(v) ? (lang === 'en' ? v.en ?? v.zh : v.zh) : selfRendering(v) ? String(v) : v)

/** The Chinese side of a pair: the same in both languages, for React keys and comparisons. */
export const keyOf = (v) => (isPair(v) ? v.zh : v)
