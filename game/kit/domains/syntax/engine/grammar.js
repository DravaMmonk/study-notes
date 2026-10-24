// The grammar every syntax game plays on: the places a clause has, in the order they are said, what each takes, and
// the forms the machine works out for the player. A game brings only its words (a lexicon, see lexicon.js); the rules
// here are the same for every level and every game.
//
// A clause is a row of slots in reading order, grouped the way the sentence is built:
//
//   [ SUBJ ] [ TIME  V  objects… ]
//   subject   predicate: the time and viewpoint, the verb, and the places its frame opens
//
// The player decides what a native speaker decides before speaking (the time and the viewpoint, which words fill
// which places); the grammar says it: auxiliaries, verb forms, agreement with the subject and a pronoun's case are
// worked out here and never refused.

/** The kind of word each slot takes. */
export const SLOT_KIND = { SUBJ: 'np', TIME: 'time', V: 'verb', OBJ: 'np', IOBJ: 'np', TO: 'np' }

export const SLOT_LABEL = {
  SUBJ: { zh: '主语', en: 'subject' },
  TIME: { zh: '时间', en: 'time' },
  V: { zh: '动词', en: 'verb' },
  OBJ: { zh: '宾语', en: 'object' },
  IOBJ: { zh: '间接宾语', en: 'indirect object' },
  TO: { zh: 'to 的宾语', en: 'object of to' },
}

export const KIND_NAME = {
  np: { zh: '名词短语', en: 'a noun phrase' },
  verb: { zh: '动词', en: 'a verb' },
  time: { zh: '时间和视角', en: 'a time and viewpoint' },
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

/** The verb forms a time can ask for, as an empty verb place names them. */
export const FORM_NAME = {
  base: { zh: '原形', en: 'bare' },
  s: { zh: '-s 形式', en: '-s form' },
  's|base': { zh: '原形或 -s 形式', en: 'bare or -s form' },
  past: { zh: '过去式', en: 'past' },
  pp: { zh: '过去分词', en: 'past participle' },
  ing: { zh: '-ing 形式', en: '-ing form' },
}

export const TENSE_NAME = { present: { zh: '现在', en: 'present' }, past: { zh: '过去', en: 'past' }, future: { zh: '将来', en: 'future' } }
export const ASPECT_NAME = { simple: { zh: '一般', en: 'simple' }, perfect: { zh: '完成', en: 'perfect' }, progressive: { zh: '进行', en: 'progressive' } }

const third = (np) => np.person === 3 && np.number === 'sg'
const first = (np) => np.person === 1 && np.number === 'sg'

/**
 * How a time is said with a subject: { aux: [word], verb: form }. English marks agreement only in the present (and in
 * was/were); before there is a subject, a form that depends on it is given both ways ('has/have', 's|base').
 */
export function inflect(time, subject) {
  const pick = (known, unknown) => (subject ? known() : unknown)
  const { tense, aspect } = time
  if (aspect === 'simple') {
    if (tense === 'present') return { aux: [], verb: pick(() => (third(subject) ? 's' : 'base'), 's|base') }
    return tense === 'past' ? { aux: [], verb: 'past' } : { aux: ['will'], verb: 'base' }
  }
  if (aspect === 'perfect') {
    const have = tense === 'present' ? [pick(() => (third(subject) ? 'has' : 'have'), 'has/have')] : tense === 'past' ? ['had'] : ['will', 'have']
    return { aux: have, verb: 'pp' }
  }
  const be = tense === 'present'
    ? [pick(() => (first(subject) ? 'am' : third(subject) ? 'is' : 'are'), 'is/are')]
    : tense === 'past' ? [pick(() => (first(subject) || third(subject) ? 'was' : 'were'), 'was/were')] : ['will', 'be']
  return { aux: be, verb: 'ing' }
}

/** A noun phrase as said in a slot: a pronoun takes its nominative as the subject and its accusative elsewhere. */
export const said = (np, slot) => (np.forms ? np.forms[slot === 'SUBJ' ? 'nom' : 'acc'] : np.text)

/** What a noun phrase is, as the grammar sees it: "第三人称单数" / "third person singular". */
export function features(np) {
  const person = { 1: ['第一', 'first'], 2: ['第二', 'second'], 3: ['第三', 'third'] }[np.person]
  return { zh: `${person[0]}人称${np.number === 'sg' ? '单数' : '复数'}`, en: `${person[1]} person ${np.number === 'sg' ? 'singular' : 'plural'}` }
}

/** The slots a clause has, in reading order: subject, time, verb, then the places the verb's frame opens. */
export const slotsOf = (lex, clause) => ['SUBJ', 'TIME', 'V', ...(clause.V ? lex.part(clause.V).ports.map(([slot]) => slot) : [])]

/**
 * The empty slot to settle next, in the order a speaker plans a clause rather than the order it is said: the time
 * first (it is part of what is meant before any word is chosen, and it builds the predicate's frame), then the rest in
 * reading order, the verb dropping into the form the frame already holds for it.
 */
export function nextSlot(lex, clause) {
  const open = slotsOf(lex, clause).filter((s) => !clause[s])
  return open.includes('TIME') ? 'TIME' : open[0] ?? null
}

/** The verb form a clause's time asks for, given its subject so far, or null with no time yet. */
export const verbForm = (lex, clause) => (clause.TIME ? inflect(lex.part(clause.TIME), clause.SUBJ && lex.part(clause.SUBJ)).verb : null)

/** An empty slot's name; the verb's says the form its time holds for it ("动词（过去式）"). */
export function slotName(lex, clause, slot) {
  const name = SLOT_LABEL[slot]
  const form = slot === 'V' && verbForm(lex, clause)
  if (!form) return name
  return { zh: `${name.zh}（${FORM_NAME[form].zh}）`, en: `${name.en} (${FORM_NAME[form].en})` }
}

const pair = (zh, en) => ({ zh, en })
const quote = (text) => `“${text}”`

/**
 * Why the word `type` cannot go into `slot` of `clause`, or null. Only the clause's shape is refused (a word of the
 * wrong kind, a place the verb does not open): forms, agreement and case are the machine's to work out.
 */
export function refuse(lex, clause, slot, type) {
  const part = lex.part(type)
  if (!part) return null
  const takes = SLOT_KIND[slot]
  if (takes !== part.kind) {
    const name = typeof part.text === 'string' ? part.text : part.text.en
    return pair(
      `${SLOT_LABEL[slot].zh}的位置只放${KIND_NAME[takes].zh}，${quote(name)}是${KIND_NAME[part.kind].zh}。`,
      `The ${SLOT_LABEL[slot].en} slot takes ${KIND_NAME[takes].en}; ${quote(name)} is ${KIND_NAME[part.kind].en}.`,
    )
  }
  if (!slotsOf(lex, clause).includes(slot)) return pair('这个动词后面没有这个位置。', 'This verb opens no such place.')
  return null
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
