// What the studio writes for a collection field (games/MODULES.md 5.3.1): a layer's own object gets the new value
// whole; another package's object gets a patch, so what that package adds later still comes through — `set` and
// `edges` by the members (edges) added and taken out, `list` also by where the moved and added members go, each
// anchored on a member that stays. The kernel applies a patch as: take out, add at the end, insert by anchor.
import { collectionKey } from '../engine/collections.js'
import { sameJson } from '../engine/json-value.js'

const keyed = (items = []) => new Map(items.map((item) => [collectionKey(item), item]))

/** The `set` patch from `before` to `after`: { add?, remove? }, or null when they hold the same members. */
export function setPatch(before = [], after = []) {
  const had = keyed(before)
  const want = keyed(after)
  const add = after.filter((item) => !had.has(collectionKey(item)))
  const remove = before.filter((item) => !want.has(collectionKey(item)))
  if (!add.length && !remove.length) return null
  return { ...(add.length && { add }), ...(remove.length && { remove }) }
}

/** The `edges` patch from `before` to `after` (edges { from, to, … }): the same as a set's, keyed by the edge. */
export const edgesPatch = (before, after) => setPatch(before, after)

/** The members of `ids` (in order) that keep their relative order in `order`: a longest increasing run of their places. */
function kept(ids, order) {
  const place = new Map(order.map((id, k) => [id, k]))
  const seq = ids.filter((id) => place.has(id))
  const tails = []
  const prev = new Array(seq.length)
  const at = []
  seq.forEach((id, k) => {
    const p = place.get(id)
    let lo = 0
    let hi = tails.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (place.get(seq[tails[mid]]) < p) lo = mid + 1
      else hi = mid
    }
    prev[k] = lo > 0 ? tails[lo - 1] : -1
    tails[lo] = k
    at[lo] = k
  })
  const out = new Set()
  for (let k = tails.length ? tails[tails.length - 1] : -1; k >= 0; k = prev[k]) out.add(seq[k])
  return out
}

/**
 * The `list` patch from `before` to `after`: { remove?, insert? } — members gone, and every member that is new or has
 * moved inserted after the member before it (or before the first member that stays, at the head). Plain `after` when
 * no member stays where it was (nothing to anchor on); null when the lists are the same.
 */
export function listPatch(before = [], after = []) {
  const b = before.map(collectionKey)
  const a = after.map(collectionKey)
  if (sameJson(b, a) && sameJson(before, after)) return null
  const stay = kept(a, b)
  if (!stay.size) return after
  const items = keyed(after)
  const remove = before.filter((item) => !stay.has(collectionKey(item)))
  const insert = []
  for (let k = 0; k < a.length;) {
    if (stay.has(a[k])) { k += 1; continue }
    let j = k
    while (j < a.length && !stay.has(a[j])) j += 1
    const values = a.slice(k, j).map((key) => items.get(key))
    insert.push(k > 0 ? { after: a[k - 1], values } : { before: a[j], values })
    k = j
  }
  // An item that stays but changed (a menu with a new title or members) goes as an addition of what changed in it: the
  // kernel merges it into the item, a list inside it by its own patch.
  const changed = after.filter((item) => stay.has(collectionKey(item)) && typeof item === 'object')
    .map((item) => itemPatch(before.find((old) => collectionKey(old) === collectionKey(item)), item)).filter(Boolean)
  if (!remove.length && !insert.length && !changed.length) return null
  return { ...(remove.length && { remove: remove.map((item) => (typeof item === 'object' ? collectionKey(item) : item)) }), ...(insert.length && { insert }), ...(changed.length && { add: changed }) }
}

/** What changed in an identified item (a menu): its id and each field that differs, a list field by its own patch. */
function itemPatch(old, item) {
  if (sameJson(old, item)) return null
  const fields = Object.entries(item).filter(([key, value]) => key !== 'id' && !sameJson(old?.[key], value))
    .map(([key, value]) => [key, Array.isArray(value) && Array.isArray(old?.[key]) ? listPatch(old[key], value) : value])
  return { id: item.id, ...Object.fromEntries(fields) }
}

/**
 * The override a layer writes so another package's object, as it stood before the layer (`base`), reads `desired`:
 * each field that differs — a collection field (`fields`: { key: 'set' | 'list' | 'edges' }) by its patch, any other
 * by its new value. Null when nothing differs (the override file goes).
 */
export function objectOverride(base = {}, desired = {}, fields = {}) {
  const data = {}
  for (const [key, value] of Object.entries(desired)) {
    if (key === 'id' || sameJson(base?.[key], value)) continue
    const type = fields[key]
    data[key] = type === 'list' ? listPatch(base?.[key], value) : type === 'set' ? setPatch(base?.[key], value) : type === 'edges' ? edgesPatch(base?.[key], value) : value
    if (data[key] === null) delete data[key]
  }
  return Object.keys(data).length ? data : null
}
