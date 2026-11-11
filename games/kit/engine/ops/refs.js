// Where a game's content names a level: every field its domain's schema types as a level (schema.js S.level, the
// eras' items included), every <level-ref> link inside a text, and the audit findings game.json leaves open
// ('part@level').
import { find } from '../schema.js'
import { GLOSSARY } from '../vocabulary.js'
import { setAt } from './edit.js'

// game.json's own fields, outside its domain's schema (vocabulary.js checkContent).
const META = ['domain', 'vocabulary', 'open']
const own = (game) => Object.fromEntries(Object.entries(game).filter(([k]) => !META.includes(k)))
const link = (id) => new RegExp(`(<level-ref to=")${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}("></level-ref>)`, 'g')

/** The files of a workspace with the schema each is read by: [[name, value, schema, set(value)]]. */
const files = (ws, vocabulary) => [
  ['game.json', own(ws.game), vocabulary.game, (v) => { ws.game = { ...ws.game, ...v } }],
  ['glossary.json', ws.glossary, GLOSSARY, (v) => { ws.glossary = v }],
  ...[...ws.levels].map(([id, level]) => [`levels/${id}.json`, level, vocabulary.level, (v) => { ws.levels.set(id, v) }]),
]

const texts = (value) => {
  const out = []
  const walk = (v, path) => {
    if (typeof v === 'string') out.push({ path, value: v })
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, [...path, Array.isArray(v) ? Number(k) : k])
  }
  walk(value, [])
  return out
}

// A link renamed in a text is renamed in the overlays too (../i18n.js), in the text an entry is keyed by and in its
// translation: the entry follows its text.
const renameInOverlays = (ws, pattern, to) => {
  ws.i18n = Object.fromEntries(Object.entries(ws.i18n ?? {}).map(([lang, memory]) => [lang, Object.fromEntries(Object.entries(memory).map(([from, text]) => [from.replace(pattern, `$1${to}$2`), text.replace(pattern, `$1${to}$2`)]))]))
}

/** Every place naming level `id`: [{ file, path, how: 'field' | 'link' | 'open' }]. */
export function levelRefs(ws, vocabulary, id) {
  const out = []
  for (const [file, value, schema] of files(ws, vocabulary)) {
    for (const hit of find(schema, value, 'level', { vocabulary })) if (hit.value === id) out.push({ file, path: hit.path, how: 'field' })
    for (const t of find(schema, value, 'text', { vocabulary })) for (const s of texts(t.value)) if (link(id).test(s.value)) out.push({ file, path: [...t.path, ...s.path], how: 'link' })
  }
  for (const [rule, list] of Object.entries(ws.game.open ?? {})) list.forEach((f, k) => { if (f.endsWith(`@${id}`)) out.push({ file: 'game.json', path: ['open', rule, k], how: 'open' }) })
  return out
}

/** Every place naming level `from` made to name `to`; returns how many. */
export function renameRefs(ws, vocabulary, from, to) {
  let n = 0
  for (const [, value, schema, set] of files(ws, vocabulary)) {
    let v = value
    for (const hit of find(schema, value, 'level', { vocabulary })) if (hit.value === from) { v = setAt(v, hit.path, to); n++ }
    for (const t of find(schema, v, 'text', { vocabulary })) for (const s of texts(t.value)) {
      const renamed = s.value.replace(link(from), `$1${to}$2`)
      if (renamed !== s.value) { v = setAt(v, [...t.path, ...s.path], renamed); n++ }
    }
    if (v !== value) set(v)
  }
  renameInOverlays(ws, link(from), to)
  if (ws.game.open) {
    const open = Object.fromEntries(Object.entries(ws.game.open).map(([rule, list]) => [rule, list.map((f) => (f.endsWith(`@${from}`) ? (n++, `${f.slice(0, -from.length)}${to}`) : f))]))
    ws.game = { ...ws.game, open }
  }
  return n
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const partLink = (type) => new RegExp(`(<part-ref to=")${escape(type)}("></part-ref>)`, 'g')
// A board line placing the part: `x = type(…)` or `x = type[settings](…)`.
const placing = (type) => new RegExp(`(=\\s*)${escape(type)}(?=\\s*[[(])`, 'g')

/**
 * Every place naming part `type` (parts.json, ../parts/): [{ file, path, how: 'field' | 'link' | 'board' | 'open' }] —
 * a field its domain's schema types as a part (S.ref('part')), a <part-ref> link in a text, a board placing it, an
 * audit finding game.json leaves open ('part@level').
 */
export function partRefs(ws, vocabulary, type) {
  const out = []
  for (const [file, value, schema] of files(ws, vocabulary)) {
    for (const hit of find(schema, value, 'ref', { vocabulary })) if (hit.schema.kind === 'part' && hit.value === type) out.push({ file, path: hit.path, how: 'field' })
    for (const t of find(schema, value, 'text', { vocabulary })) for (const s of texts(t.value)) if (partLink(type).test(s.value)) out.push({ file, path: [...t.path, ...s.path], how: 'link' })
    for (const b of find(schema, value, 'board', { vocabulary })) b.value.forEach((line, k) => { if (placing(type).test(line)) out.push({ file, path: [...b.path, k], how: 'board' }) })
  }
  for (const [rule, list] of Object.entries(ws.game.open ?? {})) list.forEach((f, k) => { if (f.startsWith(`${type}@`)) out.push({ file: 'game.json', path: ['open', rule, k], how: 'open' }) })
  return out
}

/** Every place naming part `from` made to name `to` (as partRefs finds them); returns how many. */
export function renamePartRefs(ws, vocabulary, from, to) {
  let n = 0
  for (const [, value, schema, set] of files(ws, vocabulary)) {
    let v = value
    for (const hit of [...find(schema, value, 'ref', { vocabulary }), ...find(schema, value, 'name', { vocabulary })]) if (hit.schema.kind === 'part' && hit.value === from) { v = setAt(v, hit.path, to); n++ }
    for (const t of find(schema, v, 'text', { vocabulary })) for (const s of texts(t.value)) {
      const renamed = s.value.replace(partLink(from), `$1${to}$2`)
      if (renamed !== s.value) { v = setAt(v, [...t.path, ...s.path], renamed); n++ }
    }
    for (const b of find(schema, v, 'board', { vocabulary })) {
      const lines = b.value.map((line) => line.replace(placing(from), `$1${to}`))
      if (lines.some((line, k) => line !== b.value[k])) { v = setAt(v, b.path, lines); n += lines.filter((line, k) => line !== b.value[k]).length }
    }
    if (v !== value) set(v)
  }
  renameInOverlays(ws, partLink(from), to)
  if (ws.game.open) {
    const open = Object.fromEntries(Object.entries(ws.game.open).map(([rule, list]) => [rule, list.map((f) => (f.startsWith(`${from}@`) ? (n++, `${to}${f.slice(from.length)}`) : f))]))
    ws.game = { ...ws.game, open }
  }
  return n
}
