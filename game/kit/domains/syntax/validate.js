// The syntax domain's checks for `npm run check` (../../engine/check.js), sentence by sentence:
//
//   · every span and word the answer names is in the sentence, once (or picked out with #n)
//   · the folds never cross, none hangs on a word inside itself, a fold lies inside any fold that holds its word, and
//     they can all be made in some order (each fold's word still standing when it is made)
//   · the answer marks a subject and a verb, each role keeps some words standing, and it uses only the roles and
//     constructions the level has reached
//   · every misreading names a word the fold could really be hung on
//   · the answer passes its own check

import { keyOf, check, order, standing } from './engine/sentence.js'
import { roleKey } from './engine/types.js'
import { keyOf as textKey } from '../../shell/i18n.js'

const crossing = (f, g) => (f.a < g.a && g.a <= f.b && f.b < g.b) || (g.a < f.a && f.a <= g.b && g.b < f.b)

/** What is wrong with one sentence of a level, as text. */
export function sentenceProblems(gold, palette) {
  const problems = [...gold.problems]
  const { tokens, folds, roles } = gold
  const keys = folds.map(keyOf)
  if (new Set(keys).size !== keys.length) problems.push('two folds cover the same words')
  folds.forEach((f, k) => folds.slice(k + 1).forEach((g) => { if (crossing(f, g)) problems.push(`folds ${keyOf(f)} and ${keyOf(g)} cross`) }))
  for (const f of folds) {
    if (f.a <= f.to && f.to <= f.b) problems.push(`fold ${keyOf(f)} hangs on a word inside itself`)
    for (const g of folds) if (g !== f && g.a <= f.to && f.to <= g.b && !(g.a <= f.a && f.b <= g.b)) problems.push(`fold ${keyOf(f)} hangs on a word inside fold ${keyOf(g)} but lies outside it`)
    if (!tokens[f.to]?.word) problems.push(`fold ${keyOf(f)} hangs on punctuation`)
    if (!palette.includes(f.type)) problems.push(`fold ${keyOf(f)} is a ${f.type}, not reached here`)
    for (const [w] of gold.misread.get(keyOf(f)) ?? []) {
      if (w === null) continue
      if (w === f.to) problems.push(`fold ${keyOf(f)}: a misreading on the word it does hang on`)
      if (!tokens[w]?.word || (f.a <= w && w <= f.b)) problems.push(`fold ${keyOf(f)}: a misreading on a word it cannot hang on`)
    }
  }
  if (!problems.length && !order(folds)) problems.push('the folds cannot all be made: some fold hides the word another hangs on')
  if (!roles.subj || !roles.verb) problems.push('the answer marks no subject or no verb')
  for (const [role, span] of Object.entries(roles)) {
    if (!palette.includes(roleKey(role))) problems.push(`the role ${role} is not reached here`)
    if (!standing(tokens, folds, span).length) problems.push(`the ${role} has no word left standing`)
  }
  if (!problems.length) {
    const self = check(gold, { folds, roles })
    if (!self.pass) problems.push(`the answer fails its own check: ${self.findings.map((f) => f.en).join(' ')}`)
  }
  return problems
}

/** spec: { syntax } (engine/course.js syntaxCourse). Returns [{ text, fail? }]. */
export function validate({ syntax }) {
  return syntax.LEVELS.map((level) => {
    const sentences = level.tasks ?? [level]
    const problems = sentences.flatMap((s, k) => sentenceProblems(s.gold, level.palette).map((p) => (level.tasks ? `task ${k + 1}: ${p}` : p)))
    const folds = sentences.reduce((n, s) => n + s.gold.folds.length, 0)
    return { fail: problems.length > 0, text: `${level.id} ${textKey(level.title)}: ${problems.length ? problems.join('; ') : `${sentences.length} sentence${sentences.length === 1 ? '' : 's'}, ${folds} fold${folds === 1 ? '' : 's'} sound`}` }
  })
}
