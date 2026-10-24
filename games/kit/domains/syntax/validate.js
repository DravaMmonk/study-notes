// The syntax domain's checks for `npm run check` (../../engine/check.js), level by level:
//
//   · the lexicon reads (frames, agreement, tense and aspect are ones the grammar knows)
//   · every word a level offers, presets and answers is in the lexicon; the answer only uses what the level offers,
//     and the preset is part of the answer
//   · the meaning names a verb the lexicon has
//   · the answer's every word is one the grammar allows where it stands, and the answer passes the level (with the
//     star, when the level has a word target)
//   · every trap is turned down where the level says it is: by the grammar, or at the predicate, the time, a role,
//     or the star
//   · the level says why each time it offers, other than the one meant, is wrong here (a wrong choice always gets a
//     native speaker's reason, not only a mark)

import { keyOf } from '../../shell/i18n.js'
import { refusals } from './engine/grammar.js'
import { answerTypes, check, toClause } from './engine/sentence.js'

/**
 * How a sentence fares on a level: 'grammar' when the grammar refuses one of its words where it stands, else the first
 * part of the meaning it misses ('pred', 'time', 'role'), 'star' when it passes over the word target, or 'pass'.
 */
export function fate(lex, level, answer) {
  const clause = toClause(answer)
  if (refusals(lex, clause).length) return 'grammar'
  const run = check(lex, level, clause)
  if (!run.complete) return 'open'
  if (!run.pred.ok) return 'pred'
  if (!run.time.ok) return 'time'
  if (!Object.values(run.roles).every((r) => r.ok) || run.extra.length) return 'role'
  return run.star ? 'pass' : 'star'
}

/** spec: { syntax } (engine/course.js syntaxCourse). Returns [{ text, fail? }]. */
export function validate({ syntax }) {
  const { lex, LEVELS } = syntax
  const out = lex.problems.map((p) => ({ fail: true, text: `lexicon: ${p}` }))
  const lemmas = new Set(lex.types().map(lex.part).filter((p) => p.kind === 'verb').map((p) => p.lemma))
  for (const level of LEVELS) {
    const problems = []
    for (const type of [...level.palette, ...answerTypes(level.preset), ...answerTypes(level.answer), ...(level.traps ?? []).flatMap((t) => answerTypes(t.answer))]) {
      if (!lex.part(type)) problems.push(`${type} is not in the lexicon`)
    }
    if (!lemmas.has(level.meaning?.pred)) problems.push(`its meaning names no verb of the lexicon (${level.meaning?.pred})`)
    if (!level.answer) problems.push('no reference answer')
    else {
      const offered = new Set([...level.palette, ...answerTypes(level.preset)])
      for (const type of answerTypes(level.answer)) if (!offered.has(type)) problems.push(`the answer uses ${type}, which the level does not offer`)
      for (const [k, v] of Object.entries(level.preset ?? {})) if (level.answer[k] !== v) problems.push(`the preset ${k}: ${v} is not the answer's`)
      const got = fate(lex, level, level.answer)
      if (got !== 'pass') problems.push(`the answer does not pass (${got})`)
      for (const trap of level.traps ?? []) {
        const fails = fate(lex, level, trap.answer)
        if (fails !== trap.fails) problems.push(`a trap should fail at ${trap.fails} but ${fails === 'pass' ? 'passes' : `fails at ${fails}`}: ${JSON.stringify(trap.answer)}`)
      }
    }
    for (const type of level.palette) {
      const time = lex.part(type)
      if (time?.kind !== 'time' || (time.tense === level.meaning?.tense && time.aspect === level.meaning?.aspect)) continue
      if (!level.why?.[time.key]) problems.push(`no reason given for choosing ${type}`)
    }
    const traps = level.traps?.length ?? 0
    out.push({ fail: problems.length > 0, text: `${level.id} ${keyOf(level.title)}: ${problems.length ? problems.join('; ') : `answer PASS, ${traps} trap${traps === 1 ? '' : 's'} turned down`}` })
  }
  return out
}
