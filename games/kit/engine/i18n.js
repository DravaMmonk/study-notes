// Resolved content text carries its catalog key through author operations and Studio's preview.
export const LANGUAGE_CODE = '^[a-z]{2,3}(-[A-Za-z0-9]{1,8})*$'
const languageCode = new RegExp(LANGUAGE_CODE)
const languageNames = new Intl.DisplayNames('en', { type: 'language', fallback: 'none' })
const known = new Map()

export function isLanguageCode(lang) {
  if (!languageCode.test(lang)) return false
  if (!known.has(lang)) {
    let valid
    try {
      valid = languageNames.of(lang.split('-')[0]) !== undefined && Intl.getCanonicalLocales(lang).length > 0
    } catch (error) {
      if (!(error instanceof RangeError)) throw error
      valid = false
    }
    known.set(lang, valid)
  }
  return known.get(lang)
}

export const TEXT_KEY = '^[a-zA-Z0-9_-]+(?:\\.[a-zA-Z0-9_-]+)*$'
const keyPattern = new RegExp(TEXT_KEY)
export const isTextKey = (key) => typeof key === 'string' && keyPattern.test(key)
export const textKey = (value) => isTextKey(value?.$key) ? value.$key : undefined
export const textEntries = (value) => Object.entries(value).filter(([lang]) => lang !== '$key')
export const withTextKey = (value, key) => ({ ...Object.fromEntries(textEntries(value)), $key: key })

export function isText(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const entries = textEntries(value)
  return (!Object.hasOwn(value, '$key') || textKey(value) !== undefined) && entries.length > 0
    && entries.every(([lang, text]) => isLanguageCode(lang) && typeof text === 'string')
}

/** The exact language's text, or a language-neutral string. */
export const textIn = (value, lang) => typeof value === 'string' ? value : value && Object.hasOwn(value, lang) ? value[lang] : ''

/** Read a text when an editor hasn't supplied the current language. The field order is independent of the UI language. */
export const firstText = (value) => isText(value) ? textEntries(value).find(([, text]) => text.trim())?.[1] ?? '' : value

/** Languages used by the given editable fields, regardless of the current UI language. */
export function languagesOf(values) {
  return [...new Set(values.flatMap((value) => isText(value) ? textEntries(value).map(([lang]) => lang) : []))].sort()
}
