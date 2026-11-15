import { getLang, tr } from '../shell/i18n.js'

export const alphabetic = () => ({ value: 'alphabetic', label: tr('字母顺序', 'Alphabetical') })

/** Match what is displayed in the sidebar, including the content ID. */
export const sidebarSearch = (query) => {
  const normalize = (text) => String(text ?? '').normalize('NFKC').toLowerCase()
  const needle = normalize(query).trim()
  return (...labels) => !needle || labels.some((label) => normalize(label).includes(needle))
}

/** Sort by the displayed name in the current UI language, breaking ties by ID. */
export function bySidebarName(ids, nameOf, lang = getLang()) {
  const { compare } = new Intl.Collator(lang, { numeric: true, sensitivity: 'base' })
  return [...ids].sort((a, b) => compare(nameOf(a) || a, nameOf(b) || b) || compare(a, b))
}
