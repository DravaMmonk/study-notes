import { isLanguageCode, isText, isTextKey, textEntries, textKey, withTextKey } from './i18n.js'

export const textReference = (key) => `@${key}`
export const referenceKey = (value) => typeof value === 'string' && value.startsWith('@') && isTextKey(value.slice(1)) ? value.slice(1) : undefined

function mapTree(value, visit) {
  const mapped = visit(value)
  if (mapped !== value) return mapped
  if (Array.isArray(value)) return value.map((child) => mapTree(child, visit))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, mapTree(child, visit)]))
  return value
}

/** Source projection for configuration values and Studio's JSON inspector. */
export const sourceValue = (value) => mapTree(value, (child) => {
  const key = textKey(child)
  return key && isText(child) ? textReference(key) : child
})

export const resolveReferences = (value, resolveKey) => mapTree(value, (child) => {
  if (child && typeof child === 'object' && Object.hasOwn(child, '$key')) throw new Error('Use an @key catalog reference for configuration text')
  const key = referenceKey(child)
  return key ? resolveKey(key) : child
})

/** Keep every translation when cloning content, with identities assigned to the new fields on save. */
export const copyWithoutTextKeys = (value) => mapTree(value, (child) => textKey(child) && isText(child) ? Object.fromEntries(textEntries(child)) : child)

/** Compile one scope's flat locale files into a reader for its configuration values. */
export function catalogReader(catalogs, scope = 'i18n') {
  const byKey = new Map()
  for (const [lang, entries] of Object.entries(catalogs)) {
    if (!isLanguageCode(lang) || !entries || typeof entries !== 'object' || Array.isArray(entries)) {
      throw new Error(`${scope}/${lang}.json: expected a language file containing an object`)
    }
    for (const [key, text] of Object.entries(entries)) {
      if (!isTextKey(key) || typeof text !== 'string') throw new Error(`${scope}/${lang}.json: invalid text entry ${key}`)
      if (!byKey.has(key)) byKey.set(key, {})
      byKey.get(key)[lang] = text
    }
  }
  return (value, file = scope) => resolveReferences(value, (key) => {
    const text = byKey.get(key)
    if (!text) throw new Error(`${file}: ${textReference(key)} has no entry in ${scope}`)
    return withTextKey(text, key)
  })
}
