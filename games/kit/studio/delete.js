import { tr } from '../shell/i18n.js'

export function confirmDelete(name) {
  return window.confirm(name
    ? tr(`确定删除「${name}」吗？`, `Delete “${name}”?`)
    : tr('确定删除所选内容吗？', 'Delete the selected content?'))
}

/** Detect structural deletions made by a source edit or bulk replacement. */
export function removesContent(before, after) {
  if (before === undefined) return false
  if (after === undefined) return true
  if (Array.isArray(before)) {
    if (!Array.isArray(after)) return before.length > 0
    if (before.length > after.length) return true
    const keyed = before.length > 0 && before.every((item) => typeof item?.id === 'string')
    const byId = keyed ? new Map(after.map((item) => [item?.id, item])) : null
    return before.some((item, index) => removesContent(item, byId ? byId.get(item.id) : after[index]))
  }
  if (!before || typeof before !== 'object') return false
  return Object.keys(before).some((key) => !after || !Object.hasOwn(after, key) || removesContent(before[key], after[key]))
}
