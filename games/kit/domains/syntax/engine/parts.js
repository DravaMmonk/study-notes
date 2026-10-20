// How the syntax domain's words look to the player: a family (which colours a chip and the slot it fills) and the
// line under a word saying what the grammar sees in it.

import { AGREEMENT, ASPECT_NAME, FRAMES, TENSE_NAME, shortFeatures } from './grammar.js'

/** A word's family: noun phrases, pronouns (they carry case), verbs, tenses. */
export const familyOf = (lex, type) => {
  const p = lex.part(type)
  return !p ? 'other' : p.kind === 'np' ? (p.case ? 'pronoun' : 'np') : p.kind
}

/** The line under a word: its person, number and case; a verb's sense and frame; a tense and whom it agrees with. */
export function featuresOf(lex, type) {
  const p = lex.part(type)
  if (!p) return null
  if (p.kind === 'np') return shortFeatures(p)
  if (p.kind === 'verb') return { zh: `${p.sense.zh} · ${FRAMES[p.frame].label}`, en: `${p.sense.en} · ${FRAMES[p.frame].label}` }
  return {
    zh: `${TENSE_NAME[p.tense].zh}·${ASPECT_NAME[p.aspect].zh} · 要${AGREEMENT[p.agree].name.zh}`,
    en: `${TENSE_NAME[p.tense].en} ${ASPECT_NAME[p.aspect].en} · needs ${AGREEMENT[p.agree].name.en}`,
  }
}
