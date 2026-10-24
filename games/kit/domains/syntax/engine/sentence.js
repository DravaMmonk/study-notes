// From a clause to a sentence and its meaning, and that meaning against a level's: the syntax domain's run.
//
// A clause is { SUBJ, TIME, V, OBJ?, IOBJ?, TO? }, each slot a part's type (np:paper, time:perfect, verb:accept) or
// empty.
//
//   surface(lex, clause, slot)  what a slot says: the noun phrase in its case, the auxiliaries, the verb in the form
//                               its time asks for
//   words(lex, clause)          the sentence word group by word group, with gaps for the empty slots
//   check(lex, level, clause)   the whole run: the sentence, its meaning, each part of the level's meaning matched or
//                               not (and why: a wrong time says which time question went the other way, with the
//                               level's own reason for it), and the score
//   toClause(answer)            a clause from a level's answer written with lexicon keys ({ SUBJ: 'paper', … })

import { ROLE_NAME, SLOT_LABEL, inflect, said, slotsOf, timeStep } from './grammar.js'

const pair = (zh, en) => ({ zh, en })
const KIND_OF = { SUBJ: 'np', TIME: 'time', V: 'verb', OBJ: 'np', IOBJ: 'np', TO: 'np' }

/** A clause from an answer (or a preset) written with lexicon keys. */
export const toClause = (answer = {}) => Object.fromEntries(Object.entries(answer).filter(([, key]) => key).map(([slot, key]) => [slot, `${KIND_OF[slot]}:${key}`]))
/** Every part an answer uses, as types. */
export const answerTypes = (answer = {}) => Object.values(toClause(answer))

/**
 * What a slot says. A noun phrase is said in the case its place asks for. The time slot says its auxiliaries, worked
 * out with the subject (or nothing, for a bare ending: `dim` then shows its shape, "-ed"); the verb is said in the
 * form its time asks for, its bare form until there is one.
 */
export function surface(lex, clause, slot) {
  const part = clause[slot] && lex.part(clause[slot])
  if (!part) return null
  if (part.kind === 'np') return { text: said(part, slot) }
  const subject = clause.SUBJ && lex.part(clause.SUBJ)
  if (part.kind === 'time') {
    const { aux } = inflect(part, subject)
    return aux.length ? { text: aux.join(' ') } : { text: part.shape, dim: true }
  }
  const time = clause.TIME && lex.part(clause.TIME)
  const form = time ? inflect(time, subject).verb : 'base'
  return { text: part.forms[form === 's|base' ? 'base' : form] }
}

/** The sentence in order, [{ text, slot }] for what is said and [{ gap, slot }] for an empty slot. */
export function words(lex, clause) {
  const out = []
  for (const slot of slotsOf(lex, clause)) {
    if (slot === 'TO') out.push({ text: 'to', slot })
    const s = surface(lex, clause, slot)
    if (!s) out.push({ gap: true, slot })
    else if (!s.dim) out.push({ text: s.text, slot })
  }
  return out
}

export function sentenceOf(groups) {
  const text = groups.map((g) => g.text).join(' ')
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`
}

/** The level's reference sentence said with each other time it weighs (its palette): [{ key, sentence }]. */
export function contrasts(lex, level) {
  const clause = toClause(level.answer)
  return level.palette
    .filter((t) => lex.part(t)?.kind === 'time' && t !== clause.TIME)
    .map((t) => ({ key: lex.part(t).key, sentence: sentenceOf(words(lex, { ...clause, TIME: t })) }))
}

export const wordCount = (groups) => groups.reduce((sum, g) => sum + (g.gap ? 0 : g.text.split(' ').length), 0)

/** The empty slots, in words: "主语、宾语" / "subject, object". */
export const openSlots = (open) => pair(open.map((s) => SLOT_LABEL[s].zh).join('、'), open.map((s) => SLOT_LABEL[s].en).join(', '))

/**
 * A run of a level's clause. `level.meaning` is { pred, tense, aspect, roles: { ROLE: { ent, number } } };
 * `level.target` (optional) is the most words that earn the star; `level.refer` (optional) says what each pronoun
 * of the level names; `level.why` (optional) is { time key: { zh, en } }, why that time is the wrong one here.
 *
 *   { complete, open, groups, sentence, words, pass, star,
 *     pred: { ok, why? }, time: { ok, step?, why? }, roles: { ROLE: { ok, why?, slot? } }, extra: [ROLE] }
 */
export function check(lex, level, clause) {
  const groups = words(lex, clause)
  const open = slotsOf(lex, clause).filter((s) => !clause[s])
  const complete = open.length === 0
  const result = { complete, open, groups, sentence: complete ? sentenceOf(groups) : null, words: wordCount(groups), pass: false, star: false, roles: {}, extra: [] }
  if (!complete) return result
  const want = level.meaning
  const verb = lex.part(clause.V)
  const time = lex.part(clause.TIME)
  result.pred = verb.lemma === want.pred ? { ok: true } : { ok: false, why: pair(`这里说的是 ${verb.lemma}（${verb.sense.zh}）`, `This says ${verb.lemma} (${verb.sense.en})`) }
  const meant = `${want.tense}.${want.aspect}`
  if (time.key === meant) result.time = { ok: true }
  else {
    // Which of the time questions went the other way, and why: the level's own reason, or a plain one.
    const { step, why } = timeStep(time.key, meant)
    result.time = { ok: false, step, why: level.why?.[time.key] ?? why }
  }
  // The roles the sentence fills: the subject's (the verb's own), then each object slot's.
  const filled = { [verb.subject]: 'SUBJ' }
  for (const [slot, role] of verb.ports) filled[role] = slot
  for (const [role, thing] of Object.entries(want.roles)) {
    const slot = filled[role]
    if (!slot) {
      result.roles[role] = { ok: false, why: pair(`这个句子里没有${ROLE_NAME[role].zh}的位置`, `This sentence has no place for the ${ROLE_NAME[role].en}`) }
      continue
    }
    const part = lex.part(clause[slot])
    // A pronoun names whatever the level's context makes it name (level.refer: { she: 'reviewer' }).
    const ent = level.refer?.[part.key] ?? part.ent
    const text = said(part, slot)
    if (ent !== thing.ent) result.roles[role] = { ok: false, slot, why: pair(`这里是“${text}”`, `This is “${text}”`) }
    else if (part.number !== thing.number) result.roles[role] = { ok: false, slot, why: pair(`数不对：“${text}”是${part.number === 'sg' ? '单数' : '复数'}`, `Wrong number: “${text}” is ${part.number === 'sg' ? 'singular' : 'plural'}`) }
    else result.roles[role] = { ok: true, slot }
  }
  result.extra = Object.keys(filled).filter((role) => !want.roles[role])
  result.pass = result.pred.ok && result.time.ok && Object.values(result.roles).every((r) => r.ok) && result.extra.length === 0
  result.star = result.pass && (!level.target || result.words <= level.target)
  return result
}
