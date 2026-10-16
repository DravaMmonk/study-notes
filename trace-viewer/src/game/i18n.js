// The reading language inside Vision Complete. The choice itself (stored key, <html lang>, the `langchange`
// event) belongs to games/kit/lang.js, shared with every other page; this module only keeps the current value
// at hand and resolves the game's text with it.
//
// Text in level data, intros and part specs is a pair { zh: '…', en: '…' }; a plain string (a symbol, a
// number, a name like 'Sobel') reads the same in both languages. L(text) picks the side for the current
// language. UI chrome written in a component uses tr('中文', 'English') in place.
//
// Game.jsx keeps the language in React state and re-renders on `langchange`, so anything that calls L or tr
// during render follows the switch. A value stored in state or memoised must store the pair, not its resolved
// string, so it still follows.
import { useSyncExternalStore } from 'react'
import { currentLang } from '../../../games/kit/lang.js'

let lang = 'zh'
try {
  lang = currentLang()
} catch {
  // No browser (npm run levels): Chinese, the language the levels were written in.
}
if (typeof window !== 'undefined') window.addEventListener('langchange', (event) => { lang = event.detail === 'en' ? 'en' : 'zh' })

export const getLang = () => lang

/** Pick the string for the current language: tr('中文', 'English'). */
export const tr = (zh, en) => (lang === 'en' ? en : zh)

const subscribe = (onChange) => {
  window.addEventListener('langchange', onChange)
  return () => window.removeEventListener('langchange', onChange)
}

/** The current language as React state, for components that must react to a switch themselves (a figure
 * host that has to be rebuilt in the new language). Everything else just re-renders with Game. */
export const useLang = () => useSyncExternalStore(subscribe, getLang, getLang)

/** Is this a { zh, en } text pair? */
export const isPair = (v) => v !== null && typeof v === 'object' && typeof v.zh === 'string' && !Array.isArray(v)

/** Resolve a text pair (or pass a plain string, number or nothing through). */
export const L = (v) => (isPair(v) ? (lang === 'en' ? v.en ?? v.zh : v.zh) : v)

/** The Chinese side of a pair: the same in both languages, for React keys and comparisons. */
export const keyOf = (v) => (isPair(v) ? v.zh : v)
