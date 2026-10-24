// The grammar every syntax game plays on: the places a clause has, in the order they are said, what each takes, and
// the rules a word must keep to go there (kind, case, agreement). A game brings only its words (a lexicon, see
// lexicon.js); the rules here are the same for every level and every game.
//
// A clause is a row of slots in reading order, grouped the way the sentence is built:
//
//   [ SUBJ ] [ INFL  V  objects… ]
//   subject   predicate: the head that sets the time, the verb, and the places its frame opens
//
// The verb's frame says which object slots follow it and which role each fills. The INFL part decides the
// auxiliaries and the verb's form, and must agree with the subject.

/** The kind of word each slot takes. */
export const SLOT_KIND = { SUBJ: 'np', INFL: 'infl', V: 'verb', OBJ: 'np', IOBJ: 'np', TO: 'np' }

export const SLOT_LABEL = {
  SUBJ: { zh: '主语', en: 'subject' },
  INFL: { zh: '时体', en: 'tense' },
  V: { zh: '动词', en: 'verb' },
  OBJ: { zh: '宾语', en: 'object' },
  IOBJ: { zh: '间接宾语', en: 'indirect object' },
  TO: { zh: 'to 的宾语', en: 'object of to' },
}

export const KIND_NAME = {
  np: { zh: '名词短语', en: 'a noun phrase' },
  verb: { zh: '动词', en: 'a verb' },
  infl: { zh: '时体', en: 'a tense' },
}

/**
 * A verb's frame: the object slots it opens, in the order they are said, each with the role it fills. The subject's
 * role is the verb's own (`subject`, AGENT unless the lexicon says otherwise).
 */
export const FRAMES = {
  intransitive: { ports: [], label: 'V' },
  transitive: { ports: [['OBJ', 'THEME']], label: 'V NP' },
  ditransitive: { ports: [['IOBJ', 'RECIPIENT'], ['OBJ', 'THEME']], label: 'V NP NP' },
  dative: { ports: [['OBJ', 'THEME'], ['TO', 'RECIPIENT']], label: 'V NP to NP' },
}

export const ROLE_NAME = {
  AGENT: { zh: '施事', en: 'agent' },
  THEME: { zh: '客体', en: 'theme' },
  RECIPIENT: { zh: '接收方', en: 'recipient' },
}

/** The verb forms an INFL part can ask for, as an empty verb place names them. */
export const FORM_NAME = {
  base: { zh: '原形', en: 'bare' },
  s: { zh: '-s 形式', en: '-s form' },
  past: { zh: '过去式', en: 'past' },
  pp: { zh: '过去分词', en: 'past participle' },
  ing: { zh: '-ing 形式', en: '-ing form' },
}

export const TENSE_NAME = { present: { zh: '现在', en: 'present' }, past: { zh: '过去', en: 'past' }, future: { zh: '将来', en: 'future' } }
export const ASPECT_NAME = { simple: { zh: '一般', en: 'simple' }, perfect: { zh: '完成', en: 'perfect' }, progressive: { zh: '进行', en: 'progressive' } }

/**
 * Which subjects an INFL part agrees with. English marks agreement only in the present (and in was/were): `3sg`
 * for -s, has, is; `non3sg` for the bare form and have; `1sg` for am; `other` for are and were (not I, not 3sg);
 * `was` for I and 3sg; `any` where nothing is marked (-ed, had, will).
 */
const third = (np) => np.person === 3 && np.number === 'sg'
const first = (np) => np.person === 1 && np.number === 'sg'
export const AGREEMENT = {
  any: { test: () => true, name: { zh: '任意主语', en: 'any subject' } },
  '3sg': { test: third, name: { zh: '第三人称单数主语', en: 'a third-person singular subject' } },
  non3sg: { test: (np) => !third(np), name: { zh: '不是第三人称单数的主语', en: 'a subject that is not third-person singular' } },
  '1sg': { test: first, name: { zh: '主语 I', en: 'the subject I' } },
  other: { test: (np) => !third(np) && !first(np), name: { zh: '既不是 I、也不是第三人称单数的主语', en: 'a subject other than I or third-person singular' } },
  was: { test: (np) => third(np) || first(np), name: { zh: 'I 或第三人称单数主语', en: 'I or a third-person singular subject' } },
}

/** What a noun phrase is, as the grammar sees it: "3rd person singular, nominative". */
export function features(np) {
  const person = { 1: ['第一', 'first'], 2: ['第二', 'second'], 3: ['第三', 'third'] }[np.person]
  const kase = np.case === 'nom' ? ['主格', 'nominative'] : np.case === 'acc' ? ['宾格', 'accusative'] : null
  return {
    zh: `${person[0]}人称${np.number === 'sg' ? '单数' : '复数'}${kase ? ` · ${kase[0]}` : ''}`,
    en: `${person[1]} person ${np.number === 'sg' ? 'singular' : 'plural'}${kase ? ` · ${kase[1]}` : ''}`,
  }
}

/** The short features line under a noun phrase: "3 单 · 主格" / "3sg · nom". */
export function shortFeatures(np) {
  const kase = np.case === 'nom' ? ['主格', 'nom'] : np.case === 'acc' ? ['宾格', 'acc'] : null
  return { zh: `${np.person}${np.number === 'sg' ? '单' : '复'}${kase ? ` · ${kase[0]}` : ''}`, en: `${np.person}${np.number}${kase ? ` · ${kase[1]}` : ''}` }
}

/** The slots a clause has, in reading order: subject, tense, verb, then the places the verb's frame opens. */
export const slotsOf = (lex, clause) => ['SUBJ', 'INFL', 'V', ...(clause.V ? lex.part(clause.V).ports.map(([slot]) => slot) : [])]

/**
 * The empty slot to settle next, in the order a speaker plans a clause rather than the order it is said: the time
 * first (it is part of what is meant before any word is chosen, and it builds the predicate's frame), then the rest in
 * reading order, the verb dropping into the form the frame already holds for it.
 */
export function nextSlot(lex, clause) {
  const open = slotsOf(lex, clause).filter((s) => !clause[s])
  return open.includes('INFL') ? 'INFL' : open[0] ?? null
}

/** An empty slot's name; the verb's says the form its INFL holds for it ("动词（过去式）"). */
export function slotName(lex, clause, slot) {
  const name = SLOT_LABEL[slot]
  if (slot !== 'V' || !clause.INFL) return name
  const form = FORM_NAME[lex.part(clause.INFL).verb]
  return { zh: `${name.zh}（${form.zh}）`, en: `${name.en} (${form.en})` }
}

const pair = (zh, en) => ({ zh, en })
const quote = (text) => `“${text}”`

/**
 * Why the word `type` cannot go into `slot` of `clause` (the clause as it stands, a slot's old word aside), or null.
 * The reasons name the features that clash, so a refusal teaches the rule it enforces.
 */
export function refuse(lex, clause, slot, type) {
  const part = lex.part(type)
  if (!part) return null
  const takes = SLOT_KIND[slot]
  if (takes !== part.kind) {
    return pair(
      `${SLOT_LABEL[slot].zh}的位置只放${KIND_NAME[takes].zh}，${quote(part.text)}是${KIND_NAME[part.kind].zh}。`,
      `The ${SLOT_LABEL[slot].en} slot takes ${KIND_NAME[takes].en}; ${quote(part.text)} is ${KIND_NAME[part.kind].en}.`,
    )
  }
  if (!slotsOf(lex, clause).includes(slot)) return pair('这个动词后面没有这个位置。', 'This verb opens no such place.')
  if (part.kind === 'np') {
    if (slot === 'SUBJ' && part.case === 'acc') return pair(`格不对：主语要主格，${quote(part.text)}是宾格。`, `Wrong case: a subject is nominative, and ${quote(part.text)} is accusative.`)
    if (slot !== 'SUBJ' && part.case === 'nom') return pair(`格不对：${SLOT_LABEL[slot].zh}要宾格，${quote(part.text)}是主格。`, `Wrong case: an ${SLOT_LABEL[slot].en} is accusative, and ${quote(part.text)} is nominative.`)
    if (slot === 'SUBJ' && clause.INFL) return disagree(lex.part(clause.INFL), part)
  }
  if (part.kind === 'infl' && clause.SUBJ) return disagree(part, lex.part(clause.SUBJ))
  return null
}

function disagree(head, subject) {
  const agree = AGREEMENT[head.agree]
  if (agree.test(subject)) return null
  const f = features(subject)
  return pair(
    `主谓不一致：${quote(head.text)}要${agree.name.zh}，${quote(subject.text)}是${f.zh}。`,
    `Subject and verb disagree: ${quote(head.text)} needs ${agree.name.en}, and ${quote(subject.text)} is ${f.en}.`,
  )
}

/**
 * Put `type` into `slot`: { clause } with it there, or { why } when the grammar refuses. A new verb keeps only the
 * objects its own frame has places for; the rest come out.
 */
export function place(lex, clause, slot, type) {
  const rest = { ...clause, [slot]: undefined }
  const why = refuse(lex, rest, slot, type)
  if (why) return { why }
  const next = { ...rest, [slot]: type }
  if (slot === 'V') {
    const keep = new Set(slotsOf(lex, next))
    for (const s of ['OBJ', 'IOBJ', 'TO']) if (!keep.has(s)) delete next[s]
  }
  return { clause: next }
}

/** Every word of a clause the grammar would refuse where it stands: [{ slot, why }]. */
export function refusals(lex, clause) {
  return slotsOf(lex, clause).filter((s) => clause[s]).map((s) => ({ slot: s, why: refuse(lex, { ...clause, [s]: undefined }, s, clause[s]) })).filter((r) => r.why)
}
