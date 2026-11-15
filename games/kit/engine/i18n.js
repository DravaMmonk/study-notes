// Content stores independent language texts on each field. A plain string is shared.
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

export function isText(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length > 0
    && Object.entries(value).every(([lang, text]) => isLanguageCode(lang) && typeof text === 'string')
}

/** The exact language's text, or a language-neutral string. */
export const textIn = (value, lang) => typeof value === 'string' ? value : value?.[lang] ?? ''

/** Read a text when an editor hasn't supplied the current language. The field order is independent of the UI language. */
export const firstText = (value) => isText(value) ? Object.values(value).find((text) => text.trim()) ?? '' : value

/** Languages used by the given editable fields, regardless of the current UI language. */
export function languagesOf(values) {
  return [...new Set(values.flatMap((value) => isText(value) ? Object.keys(value) : []))].sort()
}
