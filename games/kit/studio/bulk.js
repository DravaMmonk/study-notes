// Bulk edits over several levels selected in the studio's tree, as the operations that make them (one per level, so
// the review lists each and the changeset checks each): set a field, remove it, patch several, add or take parts from
// what they bring in (adds), move them together. A level the edit does not fit is skipped with the reason, never
// guessed at. Pure: the levels are content's ({ id, …fields }), the schemas the vocabulary's.
import { sameJson } from '../engine/json-value.js'
import { textEntries } from '../engine/i18n.js'
import { shapeAt } from '../engine/schema.js'
import { getAt, mergePatch, parsePath, setAt, unsetAt } from '../engine/ops/edit.js'
import { changesType, shapeOf } from './form.js'

const bare = ({ id: _, ...level }) => level

/** The fields every one of `levels` can hold (by its schema): [{ key, schema }] in the first level's schema order. */
export function commonFields(vocabulary, levels) {
  const fieldsOf = (l) => {
    const tags = new Set()
    let schema = vocabulary.level
    while (schema?.type === 'by' || schema?.type === 'either') {
      if (schema.type === 'by') {
        tags.add(schema.field)
        schema = schema.cases[l[schema.field]]
      } else {
        schema = shapeOf(schema, bare(l), vocabulary).schema
      }
    }
    return schema?.type === 'obj' ? Object.fromEntries(Object.entries(schema.fields).filter(([key]) => !tags.has(key))) : {}
  }
  if (!levels.length) return []
  const all = levels.map(fieldsOf)
  return Object.entries(all[0]).filter(([key]) => all.every((f) => key in f)).map(([key, schema]) => ({ key, schema }))
}

/** The schema of `path` in a level, or null where the level cannot hold it. */
const schemaAt = (vocabulary, level, path) => shapeAt(vocabulary.level, bare(level), parsePath(path), { vocabulary })

/** Set `path` to `value` on each level: text.set for a text, level.blueprint for a board, level.set otherwise. */
export function bulkSet(vocabulary, levels, path, value) {
  const keys = parsePath(path)
  const ops = []
  const skipped = []
  for (const level of levels) {
    const s = schemaAt(vocabulary, level, keys)
    if (!s) { skipped.push({ level: level.id, why: 'has no such field' }); continue }
    const old = getAt(level, keys)
    if (sameJson(old, value)) { skipped.push({ level: level.id, why: 'holds that already' }); continue }
    if (keys.length > 1 && getAt(level, keys.slice(0, -1)) === undefined) { skipped.push({ level: level.id, why: 'has nothing to hold it' }); continue }
    if (changesType(vocabulary.level, level, setAt(level, keys, value), vocabulary)) {
      skipped.push({ level: level.id, why: 'would change an existing configuration type' })
      continue
    }
    if (s.type === 'text') {
      if (typeof value === 'string' || typeof old === 'string') ops.push({ op: 'text.set', level: level.id, path: keys, value })
      else for (const [lang, text] of textEntries(value)) ops.push({ op: 'text.set', level: level.id, path: keys, lang, value: text })
    }
    else if (s.type === 'board' && Array.isArray(value)) ops.push({ op: 'level.blueprint', level: level.id, path: keys, text: value.join('\n') })
    else ops.push({ op: 'level.set', level: level.id, path: keys, value })
  }
  return { ops, skipped }
}

/** Remove `path` from each level that has it. */
export function bulkUnset(vocabulary, levels, path) {
  const keys = parsePath(path)
  const ops = []
  const skipped = []
  for (const level of levels) {
    if (getAt(level, keys) === undefined) skipped.push({ level: level.id, why: 'has none' })
    else if (changesType(vocabulary.level, level, unsetAt(level, keys), vocabulary)) skipped.push({ level: level.id, why: 'would change an existing configuration type' })
    else ops.push({ op: 'level.unset', level: level.id, path: keys })
  }
  return { ops, skipped }
}

/** A JSON merge patch on each level (null removes a field). */
export function bulkPatch(vocabulary, levels, fields) {
  const ops = []
  const skipped = []
  for (const level of levels) {
    const value = bare(level)
    const next = mergePatch(value, fields)
    if (sameJson(value, next)) skipped.push({ level: level.id, why: 'holds that already' })
    else if (changesType(vocabulary.level, value, next, vocabulary)) skipped.push({ level: level.id, why: 'would change an existing configuration type' })
    else ops.push({ op: 'level.patch', level: level.id, fields })
  }
  return { ops, skipped }
}

/** Parts added to and taken from what each level brings in: only what it lacks, only what it has. */
export function bulkAdds(vocabulary, levels, { add = [], remove = [] }) {
  const ops = []
  const skipped = []
  for (const level of levels) {
    if (!schemaAt(vocabulary, level, ['adds'])) { skipped.push({ level: level.id, why: 'brings in no parts' }); continue }
    const had = level.adds ?? []
    const plus = add.filter((p) => !had.includes(p))
    const minus = remove.filter((p) => had.includes(p))
    if (!plus.length && !minus.length) { skipped.push({ level: level.id, why: 'nothing to change' }); continue }
    ops.push({ op: 'level.adds', level: level.id, ...(plus.length && { add: plus }), ...(minus.length && { remove: minus }) })
  }
  return { ops, skipped }
}

