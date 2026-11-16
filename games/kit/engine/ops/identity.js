// Authoring edits preserve object identities, including edits of their containing lists.
import * as edit from './edit.js'

const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const immutable = (path) => {
  throw new Error(`${edit.showPath(path) || 'id'}: id cannot change; create a new object, then delete the old one (id 不能改，新建一个再删掉旧的)`)
}

/** Compare lists by identity so reordering, insertion and deletion keep existing objects editable. */
export function assertStableIds(before, after, path = []) {
  if (before === after || before === undefined || after === undefined) return
  if (Array.isArray(before) && Array.isArray(after)) {
    const identified = (values) => values.every((value) => object(value) && value.id !== undefined)
    if (identified(before) && identified(after)) {
      const old = new Map(before.map((value) => [value.id, value]))
      const next = new Map(after.map((value) => [value.id, value]))
      if (before.some(({ id }) => !next.has(id)) && after.some(({ id }) => !old.has(id))) immutable(path)
      for (const value of after) if (old.has(value.id)) assertStableIds(old.get(value.id), value, [...path, value.id])
    } else {
      before.forEach((value, index) => assertStableIds(value, after[index], [...path, index]))
    }
  } else if (object(before) && object(after)) {
    if (before.id !== after.id) immutable([...path, 'id'])
    for (const key of Object.keys(before)) assertStableIds(before[key], after[key], [...path, key])
  } else if (object(before) && Object.hasOwn(before, 'id')) immutable([...path, 'id'])
}

/** Field edits cannot hide an identity change inside a replacement value. */
export function setAt(value, path, next, orderAt) {
  const keys = edit.parsePath(path)
  const before = edit.getAt(value, keys)
  if (keys.at(-1) === 'id' && before !== next) immutable(keys)
  assertStableIds(before, next, keys)
  return edit.setAt(value, keys, next, orderAt)
}

export function unsetAt(value, path) {
  const keys = edit.parsePath(path)
  if (keys.at(-1) === 'id') immutable(keys)
  return edit.unsetAt(value, keys)
}

export function mergePatch(value, patch, orderAt) {
  const next = edit.mergePatch(value, patch, orderAt)
  assertStableIds(value, next)
  return next
}
