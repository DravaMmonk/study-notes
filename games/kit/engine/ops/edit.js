// Paths into content and edits along them. A path is a list of keys and indices, or the same written as text:
// 'tests[0].goal', 'hint[1].en'. An edit returns a new value and leaves the old one as it was; a field it adds goes
// where the schema lists it among the object's fields (`order`), so a file reads in the order its schema is written.

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/** 'tests[0].goal' → ['tests', 0, 'goal']; a list is taken as it is. */
export function parsePath(path) {
  if (Array.isArray(path)) return path
  if (path === '' || path === undefined) return []
  const out = []
  for (const m of String(path).matchAll(/([^.[\]]+)|\[(\d+)\]/g)) out.push(m[2] !== undefined ? Number(m[2]) : m[1])
  return out
}
export const showPath = (path) => parsePath(path).map((k, i) => (typeof k === 'number' ? `[${k}]` : i ? `.${k}` : k)).join('')

/** The value at `path`, or undefined. */
export const getAt = (value, path) => parsePath(path).reduce((v, k) => (v === undefined || v === null ? undefined : v[k]), value)

/** `object` with `key` set to `value`: in place when it is there, else before the first later field of `order`. */
export function withField(object, key, value, order = null) {
  if (key in object || !order?.includes(key)) return { ...object, [key]: value }
  const rank = (k) => order.indexOf(k)
  const entries = Object.entries(object)
  const at = entries.findIndex(([k]) => rank(k) > rank(key))
  entries.splice(at < 0 ? entries.length : at, 0, [key, value])
  return Object.fromEntries(entries)
}

/** `value` with `x` at `path` (the containers on the way must be there). `orderAt(path)`: field order of the object at a path. */
export function setAt(value, path, x, orderAt = () => null) {
  const keys = parsePath(path)
  const walk = (v, k) => {
    if (k === keys.length) return x
    const key = keys[k]
    if (Array.isArray(v)) {
      if (typeof key !== 'number' || key > v.length) throw new Error(`${showPath(keys.slice(0, k + 1))}: no such item`)
      const out = [...v]
      out[key] = walk(v[key], k + 1)
      return out
    }
    if (!isObj(v)) throw new Error(`${showPath(keys.slice(0, k)) || 'the file'} is not an object`)
    if (k < keys.length - 1 && v[key] === undefined) throw new Error(`${showPath(keys.slice(0, k + 1))}: no such field`)
    return withField(v, key, walk(v[key], k + 1), orderAt(keys.slice(0, k)))
  }
  return walk(value, 0)
}

/** `value` without what is at `path` (a field removed, or an item taken out of its list). */
export function unsetAt(value, path) {
  const keys = parsePath(path)
  if (!keys.length) throw new Error('cannot remove the whole file')
  const parent = getAt(value, keys.slice(0, -1))
  const last = keys.at(-1)
  if (parent === undefined || parent[last] === undefined) throw new Error(`${showPath(keys)}: nothing there`)
  const without = Array.isArray(parent) ? parent.filter((_, k) => k !== last) : Object.fromEntries(Object.entries(parent).filter(([k]) => k !== last))
  return keys.length === 1 ? without : setAt(value, keys.slice(0, -1), without)
}

/** A JSON merge patch (RFC 7396): every field of `patch` set, a null one removed, objects merged field by field. */
export function mergePatch(target, patch, orderAt = () => null, path = []) {
  if (!isObj(patch)) return patch
  let out = isObj(target) ? { ...target } : {}
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete out[k]
    else out = withField(out, k, isObj(v) ? mergePatch(out[k], v, orderAt, [...path, k]) : v, orderAt(path))
  }
  return out
}
