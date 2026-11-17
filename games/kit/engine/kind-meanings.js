// Package kind registrations interpret data without teaching the kernel their semantics.
export const meaningsOf = vocabulary => vocabulary?.meanings ?? []
export const interpret = (vocabulary, method, context) => meaningsOf(vocabulary).flatMap(meaning => meaning[method]?.(context) ?? [])
export const projectVocabulary = vocabulary => meaningsOf(vocabulary).reduce((value, meaning) => meaning.vocabulary?.(value) ?? value, vocabulary)
export const kindMatches = (vocabulary, expected, actual) => expected === 'any' || expected === actual || meaningsOf(vocabulary).some(meaning => meaning.matches?.(expected, actual))
export const derivedFields = vocabulary => meaningsOf(vocabulary).flatMap(meaning => meaning.derived ?? [])

const configurationFields = new Map()
export const configurationFile = field => configurationFields.get(field)

/** Register file ownership declared by a kind provider before reading configurations. */
export function registerMeaning(meaning) {
  for (const [field, file] of Object.entries(meaning.configuration ?? {})) {
    if (configurationFields.has(field) && configurationFields.get(field) !== file) throw new Error(`conflicting configuration field ${field}`)
    configurationFields.set(field, file)
  }
}
