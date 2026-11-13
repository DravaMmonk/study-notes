// The translation table's rows: base texts in play order, expanded where the overlay has field variants.
import { mistranslated, translationContexts, translationEntries } from '../engine/i18n.js'
import { showPath } from '../engine/ops/edit.js'
import { copyRows } from './copy.js'

export function translationRows(content, vocabulary, order, lang) {
  const memory = content.i18n?.[lang] ?? {}
  const contexts = translationContexts(content, vocabulary)
  const seen = new Map()
  for (const row of [...copyRows(content, vocabulary, 'all', order), ...copyRows(content, vocabulary, 'glossary', order)]) {
    const from = row.value?.zh
    if (contexts.has(from) && !seen.has(from)) seen.set(from, `${row.name} ${showPath(row.path)}`)
  }
  for (const from of contexts.keys()) if (!seen.has(from)) seen.set(from, '')
  const rows = []
  for (const [from, where] of seen) {
    const entry = memory[from]
    if (!entry || typeof entry === 'string') rows.push(translationRow(from, where, entry))
    else {
      const kinds = contexts.get(from)
      const readsDefault = [...kinds].some((kind) => kind === undefined || !Object.hasOwn(entry, kind))
      const keys = new Set([...Object.keys(entry), ...(readsDefault ? ['default'] : [])])
      for (const kind of keys) {
        const used = kind === 'default' ? readsDefault : kinds.has(kind)
        rows.push(translationRow(from, where, entry[kind], { kind, entry, used }))
      }
    }
  }
  for (const [from, entry] of Object.entries(memory)) if (!seen.has(from)) {
    if (typeof entry === 'string') rows.push(translationRow(from, '', entry, { used: false }))
    else for (const [kind, to] of Object.entries(entry)) rows.push(translationRow(from, '', to, { kind, entry, used: false }))
  }
  return rows
}

function translationRow(from, where, to, { kind, entry, used = true } = {}) {
  const why = used && to !== undefined ? mistranslated(from, to) : null
  return {
    from, to: to ?? '', where,
    state: !used ? 'unused' : to === undefined ? 'missing' : why ? 'wrong' : 'done',
    ...(kind !== undefined && { kind, entry }),
    ...(why && { why }),
  }
}

/** Editing one field variant keeps the other translations under the same base text. */
export function translationOp(lang, row, to) {
  const op = { op: 'i18n.set', lang, from: row.from }
  if (row.kind === undefined) return to.trim() ? { ...op, to } : row.to ? op : null
  if (!to.trim() && !row.to) return null
  const { [row.kind]: _, ...rest } = translationEntries(row.entry)
  const variants = to.trim() ? { ...rest, [row.kind]: to } : rest
  const keys = Object.keys(variants)
  return keys.length ? { ...op, to: keys.length === 1 && keys[0] === 'default' ? variants.default : variants } : op
}
