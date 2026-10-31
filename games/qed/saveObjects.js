// Rename concrete objects in saved formulas, term trees and world assignments without changing proof structure.
const NAMES = { soc: 'h', ann: 'i', bo: 'j', cy: 'k', dee: 'l', en: 'm', fay: 'n', phos: 'i', hesp: 'j', venus: 'k' }
const IDENTIFIER = /\b(soc|ann|bo|cy|dee|en|fay|phos|hesp|venus)\b/g

export function renameSavedObjects(value, level) {
  const names = level === 'q-eq' ? { ...NAMES, phos: 'a', hesp: 'b' } : NAMES
  const rename = (text) => text.replace(IDENTIFIER, (name) => names[name])
  const visit = (item, parent) => {
    if (typeof item === 'string') return rename(item)
    if (Array.isArray(item)) return item.map((v) => visit(v, parent))
    if (!item || typeof item !== 'object') return item
    return Object.fromEntries(Object.entries(item).map(([key, v]) => [parent === 'consts' ? rename(key) : key, visit(v, key)]))
  }
  return visit(value, '')
}
