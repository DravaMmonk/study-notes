// Bulk edits over several levels selected in the studio's tree, as the operations that make them (one per level, so
// the review lists each and the changeset checks each): set a field, remove it, patch several, add or take parts from
// what they bring in (adds), move them together. A level the edit does not fit is skipped with the reason, never
// guessed at. Pure: the levels are content's ({ id, …fields }), the schemas the vocabulary's.
import { shapeAt } from '../engine/schema.js'
import { getAt, parsePath } from '../engine/ops/edit.js'

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const bare = ({ id: _, ...level }) => level

/** The fields every one of `levels` can hold (by its schema): [{ key, schema }] in the first level's schema order. */
export function commonFields(vocabulary, levels) {
  const fieldsOf = (l) => {
    const s = shapeAt(vocabulary.level, bare(l), [], { vocabulary })
    return s?.type === 'obj' ? s.fields : {}
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
    if (same(getAt(level, keys), value)) { skipped.push({ level: level.id, why: 'holds that already' }); continue }
    if (keys.length > 1 && getAt(level, keys.slice(0, -1)) === undefined) { skipped.push({ level: level.id, why: 'has nothing to hold it' }); continue }
    if (s.type === 'text' && value && typeof value === 'object') ops.push({ op: 'text.set', level: level.id, path: keys, zh: value.zh })
    else if (s.type === 'board' && Array.isArray(value)) ops.push({ op: 'level.blueprint', level: level.id, path: keys, text: value.join('\n') })
    else ops.push({ op: 'level.set', level: level.id, path: keys, value })
  }
  return { ops, skipped }
}

/** Remove `path` from each level that has it. */
export function bulkUnset(levels, path) {
  const keys = parsePath(path)
  const ops = []
  const skipped = []
  for (const level of levels) {
    if (getAt(level, keys) === undefined) skipped.push({ level: level.id, why: 'has none' })
    else ops.push({ op: 'level.unset', level: level.id, path: keys })
  }
  return { ops, skipped }
}

/** A JSON merge patch on each level (null removes a field). */
export function bulkPatch(levels, fields) {
  const ops = []
  const skipped = []
  for (const level of levels) {
    const changes = Object.entries(fields).some(([k, v]) => (v === null ? level[k] !== undefined : !same(level[k], v)))
    if (changes) ops.push({ op: 'level.patch', level: level.id, fields })
    else skipped.push({ level: level.id, why: 'holds that already' })
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

/**
 * Move levels together to a place (`to`, ../engine/ops/place.js), in the order given: the first to it, each next
 * right after the one before (on the main path when the place is on it).
 */
export function bulkMove(ids, to) {
  const onPath = to.on === 'path' || (to.path !== undefined && to.at !== undefined)
  return ids.map((id, k) => ({ op: 'level.move', level: id, to: k ? { after: ids[k - 1], ...(onPath && { on: 'path' }) } : to }))
}
