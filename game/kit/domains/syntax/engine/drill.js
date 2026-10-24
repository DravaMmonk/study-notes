// Drills: the syntax domain's quick practice. A drill level is a run of short items, each one situation and one
// sentence whose verb group is left to choose from a few times. A native speaker does not reason a time out clause by
// clause: a situation calls up its way of saying things. So a drill trades depth for count: a pick takes seconds, a
// wrong pick is answered with the reason at once, and what was missed comes round again.
//
// An item, as a game writes it:
//
//   { context: { zh, en }, words: { SUBJ, V, OBJ?, IOBJ?, TO? }, answer: time key, why: { time key: { zh, en } } }
//
// `words` is the clause without its time (lexicon keys); `answer` is the time meant ('present.perfect'); `why` has one
// reason for each other time offered, and those times are the item's other options. The machine says every option:
// the verb group under each time, with the subject's agreement.

import { TIMES, refusals } from './grammar.js'
import { sentenceOf, toClause, words } from './sentence.js'

const GROUP = new Set(['TIME', 'V'])
const ORDER = Object.keys(TIMES)
const join = (groups) => groups.map((g) => g.text).join(' ')

/** The times an item offers, in a fixed order that says nothing about which one is meant. */
export const optionsOf = (item) => [item.answer, ...Object.keys(item.why ?? {})].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))

/**
 * An item as the player sees it: { before, after, options: [{ key, text }], sentence }. `before` and `after` are the
 * sentence around the verb group (capitalised, with its full stop); `sentence` is the whole of it with the time meant.
 */
export function drillItem(lex, item) {
  const say = (key) => words(lex, toClause({ ...item.words, TIME: key }))
  const meant = say(item.answer)
  const first = meant.findIndex((g) => GROUP.has(g.slot))
  let last = first
  meant.forEach((g, k) => { if (GROUP.has(g.slot)) last = k })
  const before = join(meant.slice(0, first))
  return {
    before: before && `${before.charAt(0).toUpperCase()}${before.slice(1)}`,
    after: `${join(meant.slice(last + 1))}.`,
    options: optionsOf(item).map((key) => ({ key, text: join(say(key).filter((g) => GROUP.has(g.slot))) })),
    sentence: sentenceOf(meant),
  }
}

/** What is wrong with an item, as text (empty when it is sound). */
export function itemProblems(lex, item) {
  const problems = []
  if (!TIMES[item.answer]) return [`unknown time ${item.answer}`]
  for (const key of Object.keys(item.why ?? {})) if (!TIMES[key]) problems.push(`unknown time ${key}`)
  if (!Object.keys(item.why ?? {}).length) problems.push('offers no other time')
  const clause = toClause({ ...item.words, TIME: item.answer })
  for (const type of Object.values(clause)) if (!lex.part(type)) return [...problems, `${type} is not in the lexicon`]
  if (refusals(lex, clause).length) problems.push('the grammar refuses its words')
  const said = words(lex, clause)
  if (said.some((g) => g.gap)) problems.push('its clause is not complete')
  if (problems.length) return problems
  const texts = drillItem(lex, item).options.map((o) => o.text)
  if (new Set(texts).size !== texts.length) problems.push(`two options read the same: ${texts.join(' / ')}`)
  return problems
}
