import { getLang, tr } from '../shell/i18n.js'

// Keep the stored value for ascending name order.
export const NAME_ASC = 'alphabetic'

export const sidebarSortOptions = () => [
  { value: 'id-asc', label: tr('按 ID a–z', 'By ID a–z') },
  { value: 'id-desc', label: tr('按 ID z–a', 'By ID z–a') },
  { value: NAME_ASC, label: tr('按名称 a–z', 'By name a–z') },
  { value: 'name-desc', label: tr('按名称 z–a', 'By name z–a') },
]

/** Match what is displayed in the sidebar, including the content ID. */
export const sidebarSearch = (query) => {
  const normalize = (text) => String(text ?? '').normalize('NFKC').toLowerCase()
  const needle = normalize(query).trim()
  return (...labels) => !needle || labels.some((label) => normalize(label).includes(needle))
}

/** Compare IDs consistently across languages and names in the current UI language. */
export function sortSidebarIds(ids, sort, nameOf) {
  const byId = sort.startsWith('id-')
  const { compare } = new Intl.Collator(byId ? 'en' : getLang(), { numeric: true, sensitivity: 'base' })
  const key = byId ? (id) => id : (id) => nameOf(id) || id
  const direction = sort.endsWith('-desc') ? -1 : 1
  return [...ids].sort((a, b) => direction * (compare(key(a), key(b)) || compare(a, b)))
}
