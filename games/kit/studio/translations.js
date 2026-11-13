// The translation table's rows (Translations.jsx): every base text of a game once, in play order, with where it first
// stands and how it reads in one language; then the overlay's entries no text reads any more (../engine/i18n.js).
import { mistranslated, textsIn } from '../engine/i18n.js'
import { showPath } from '../engine/ops/edit.js'
import { copyRows } from './copy.js'

/**
 * [{ from, to, where, state: 'missing' | 'wrong' | 'done' | 'unused', why? }] for `lang`. `order`: the levels in
 * play order.
 */
export function translationRows(content, vocabulary, order, lang) {
  const memory = content.i18n?.[lang] ?? {}
  // What is translated is every text the content writes as one (a plain string reads the same in every language), the
  // course blueprint aside: those the copy table lists come first, in its order, with where they stand.
  const texts = new Set(textsIn({ ...content, i18n: undefined, blueprint: undefined }))
  const seen = new Map()
  for (const row of [...copyRows(content, vocabulary, 'all', order), ...copyRows(content, vocabulary, 'glossary', order)]) {
    const from = row.value?.zh
    if (texts.has(from) && !seen.has(from)) seen.set(from, `${row.name} ${showPath(row.path)}`)
  }
  for (const from of texts) if (!seen.has(from)) seen.set(from, '')
  const rows = [...seen].map(([from, where]) => {
    const to = memory[from]
    const why = to === undefined ? null : mistranslated(from, to)
    return { from, to: to ?? '', where, state: to === undefined ? 'missing' : why ? 'wrong' : 'done', ...(why && { why }) }
  })
  return [...rows, ...Object.entries(memory).filter(([from]) => !seen.has(from)).map(([from, to]) => ({ from, to, where: '', state: 'unused' }))]
}

/** The operation a row's translation typed anew makes: written, or dropped when it is emptied (null: nothing to drop). */
export const translationOp = (lang, row, to) => (to.trim() ? { op: 'i18n.set', lang, from: row.from, to } : row.to ? { op: 'i18n.set', lang, from: row.from } : null)
