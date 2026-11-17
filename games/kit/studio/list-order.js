// Moving members within a list (games/MODULES.md 5.3.1): a list field's order is the list itself — a tray's or a
// section's `values`, a chapter's `levels` — so a drag or Alt+↑/↓ only rewrites that list (collection-edit.js for
// another package's object). Tags are sets: the studio shows their members, and the tags of a kind, in the kernel's
// order (engine/objects.js: prerequisites, then names) and writes no order for them.
import { orderedTags } from '../engine/objects.js'

export { orderedTags }

/** `list` with `ids` moved before or after `to.before` / `to.after` (to the end without either). */
export function reordered(list, ids, to = {}) {
  const rest = list.filter((id) => !ids.includes(id))
  const anchor = to.before ?? to.after
  const at = anchor === undefined || !rest.includes(anchor) ? rest.length : rest.indexOf(anchor) + (to.after !== undefined ? 1 : 0)
  return [...rest.slice(0, at), ...ids, ...rest.slice(at)]
}

/** `list` with `id` moved `by` places (−1 up, +1 down); the same list at an end. */
export function shifted(list, id, by) {
  const k = list.indexOf(id)
  const j = k + by
  if (k < 0 || j < 0 || j >= list.length) return list
  const next = [...list]
  next.splice(k, 1)
  next.splice(j, 0, id)
  return next
}
