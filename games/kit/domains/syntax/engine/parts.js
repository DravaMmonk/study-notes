// How the syntax domain's words look to the player: a family (which colours a chip and the slot it fills) and the
// line under a word saying what it is.

import { ASPECT_NAME, FRAMES, TENSE_NAME, features } from './grammar.js'

/** A word's family: noun phrases, pronouns, verbs, times. */
export const familyOf = (lex, type) => {
  const p = lex.part(type)
  return !p ? 'other' : p.kind === 'np' ? (p.pronoun ? 'pronoun' : 'np') : p.kind
}

/** The line under a word: a noun phrase's number; a verb's sense and frame; a time's shape in English. */
export function featuresOf(lex, type) {
  const p = lex.part(type)
  if (!p) return null
  if (p.kind === 'np') return p.pronoun ? features(p) : p.number === 'sg' ? { zh: '单数', en: 'singular' } : { zh: '复数', en: 'plural' }
  if (p.kind === 'verb') return { zh: `${p.sense.zh} · ${FRAMES[p.frame].label}`, en: `${p.sense.en} · ${FRAMES[p.frame].label}` }
  return { zh: `${TENSE_NAME[p.tense].zh}·${ASPECT_NAME[p.aspect].zh} · ${p.shape}`, en: `${TENSE_NAME[p.tense].en} ${ASPECT_NAME[p.aspect].en} · ${p.shape}` }
}
