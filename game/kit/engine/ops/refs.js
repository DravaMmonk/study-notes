// Where a game's content names a level: every field its domain's schema types as a level (schema.js S.level, the
// eras' items included), every <level-ref> link inside a text, and the audit findings game.json leaves open
// ('part@level'). The save migrations already written (game.json saves) name the ids of older versions and are never
// rewritten.
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
  if (ws.game.open) {
    const open = Object.fromEntries(Object.entries(ws.game.open).map(([rule, list]) => [rule, list.map((f) => (f.endsWith(`@${from}`) ? (n++, `${f.slice(0, -from.length)}${to}`) : f))]))
    ws.game = { ...ws.game, open }
  }
  return n
}
