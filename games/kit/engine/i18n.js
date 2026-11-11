// Translation, apart from the making of a game (games/DIRECTION.md, decision 20). A game's content is written in one
// language, the base: every text in it is { zh: '…' } (or a plain string, which reads the same in every language).
// Another language is an overlay beside the content, games/<id>/i18n/<lang>.json:
//
//   { "<the base text>": "<its translation>" }
//
// keyed by the base text itself, so a translation follows its text wherever the content moves it, serves every place
// the same words stand, and falls away by itself when the words change: the changed text has no entry and reads in
// the base language until someone translates it again. The page plays `localized` content, each text carrying the
// languages it has; everything that makes or checks a game reads the base alone.
import { markupOf } from './markup.js'
import { REF } from './text.js'

/** The language content is written in. */
export const BASE = 'zh'

/** Whether `v` is a text as content writes it: { zh } alone. */
export const isBaseText = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && typeof v[BASE] === 'string' && Object.keys(v).length === 1

/** Every base text in `value`, in order, repeats included. */
export function textsIn(value, out = []) {
  if (isBaseText(value)) out.push(value[BASE])
  else if (value && typeof value === 'object') for (const inner of Object.values(value)) textsIn(inner, out)
  return out
}

const shape = (text) => [...String(text).matchAll(REF)].map((m) => `${m[1]}:${m[2]}`).sort().join(' ')

/** Why a translation cannot stand for its base text (null when it can): its markup is broken, or its links differ. */
export function mistranslated(from, to) {
  if (typeof to !== 'string' || !to.trim()) return 'is empty'
  const broken = markupOf(to).problems[0]
  if (broken) return broken
  return shape(from) === shape(to) ? null : `links ${shape(to) || 'nothing'}, its text ${shape(from) || 'nothing'}`
}

/**
 * How a game's overlays stand against its content: [{ lang, texts, translated, wrong: [{ from, why }], unused }] —
 * `texts` the distinct base texts, `wrong` the entries that cannot stand for their text, `unused` how many entries no
 * text reads any more.
 */
export function translationState(content) {
  // The course blueprint is a working document the page never reads: it is not translated.
  const texts = new Set(textsIn({ ...content, i18n: undefined, blueprint: undefined }))
  return Object.entries(content.i18n ?? {}).map(([lang, memory]) => {
    const wrong = [...texts].filter((from) => from in memory && mistranslated(from, memory[from])).map((from) => ({ from, why: mistranslated(from, memory[from]) }))
    return { lang, texts: texts.size, translated: [...texts].filter((from) => from in memory).length - wrong.length, wrong, unused: Object.keys(memory).filter((from) => !texts.has(from)).length }
  })
}

/** `content` as the page plays it: each text with every language that has a sound translation of it, the overlays gone. */
export function localized(content) {
  const { i18n = {}, ...rest } = content
  const langs = Object.entries(i18n)
  const walk = (v) => {
    if (isBaseText(v)) return Object.fromEntries([[BASE, v[BASE]], ...langs.filter(([, memory]) => v[BASE] in memory && !mistranslated(v[BASE], memory[v[BASE]])).map(([lang, memory]) => [lang, memory[v[BASE]]])])
    if (Array.isArray(v)) return v.map(walk)
    return v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : v
  }
  return walk(rest)
}
