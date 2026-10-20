// The grammar every syntax game plays on: what kinds of phrase there are, which port takes which, and the rules a
// wire must keep (category, case, agreement, one place per phrase). A game brings only its words (a lexicon, see
// lexicon.js); the rules here are the same for every level and every game.
//
// A sentence is a small tree, built as a circuit (games/kit/circuit/model.js) whose data flows up toward its root:
//
//   noun phrase ──▶ SUBJ ┐
//                        INFL (tense, aspect, agreement) ──▶ S  句子 (the sink)
//   noun phrases ──▶ verb ──▶ VP ┘
//
// A verb heads the verb phrase: its frame says which object ports it opens and which role each fills. An INFL part
// heads the clause: it takes the subject and the verb phrase, decides the auxiliaries and the verb's form, and must
// agree with its subject.

/** What a phrase is, by the part that makes it: a noun phrase, a verb phrase or a clause. */
export const CATEGORY = { np: 'np', verb: 'vp', infl: 's' }

/** The category each port takes. */
export const PORT_TAKES = { SUBJ: 'np', OBJ: 'np', IOBJ: 'np', TO: 'np', VP: 'vp', S: 's' }

export const PORT_LABEL = {
  SUBJ: { zh: '主语', en: 'subject' },
  VP: { zh: '谓语', en: 'predicate' },
  OBJ: { zh: '宾语', en: 'object' },
  IOBJ: { zh: '间接宾语', en: 'indirect object' },
  TO: { zh: 'to +', en: 'to +' },
  S: { zh: '小句', en: 'clause' },
}

export const CATEGORY_NAME = {
  np: { zh: '名词短语', en: 'a noun phrase' },
  vp: { zh: '动词短语', en: 'a verb phrase' },
  s: { zh: '小句', en: 'a clause' },
}

/**
 * A verb's frame: the object ports it opens, in the order they are said, each with the role it fills. The subject's
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

const pair = (zh, en) => ({ zh, en })
const quote = (text) => `“${text}”`

/**
 * Why a wire from `from` into port `port` of node `to` is not allowed, or null. `lex` is the game's lexicon
 * (lexicon.js); the reasons name the features that clash, so a refused wire teaches the rule it broke.
 */
export function refuse(lex, graph, from, to, port) {
  const source = graph.nodes.find((n) => n.id === from)
  const target = graph.nodes.find((n) => n.id === to)
  if (!source || !target) return null
  const part = lex.part(source.type)
  if (!part) return null
  const takes = PORT_TAKES[port]
  const is = CATEGORY[part.kind]
  if (takes !== is) {
    return pair(
      `${PORT_LABEL[port].zh}口要接${CATEGORY_NAME[takes].zh}，${quote(part.text)}是${CATEGORY_NAME[is].zh}。`,
      `The ${PORT_LABEL[port].en} port takes ${CATEGORY_NAME[takes].en}; ${quote(part.text)} is ${CATEGORY_NAME[is].en}.`,
    )
  }
  // A phrase has one place in the sentence: a tree, not a web.
  const elsewhere = graph.wires.find((w) => w.from === from && !(w.to === to && w.port === port))
  if (elsewhere) {
    return pair(
      `一个短语在句子里只能占一个位置：${quote(part.text)}已经接在别处了。`,
      `A phrase has only one place in a sentence: ${quote(part.text)} is already wired elsewhere.`,
    )
  }
  if (part.kind !== 'np') return null
  if (port === 'SUBJ' && part.case === 'acc') {
    return pair(`格不对：主语要主格，${quote(part.text)}是宾格。`, `Wrong case: a subject is nominative, and ${quote(part.text)} is accusative.`)
  }
  if (port !== 'SUBJ' && part.case === 'nom') {
    return pair(`格不对：${PORT_LABEL[port].zh}要宾格，${quote(part.text)}是主格。`, `Wrong case: an ${PORT_LABEL[port].en} is accusative, and ${quote(part.text)} is nominative.`)
  }
  if (port === 'SUBJ') {
    const head = lex.part(target.type)
    const agree = AGREEMENT[head?.agree]
    if (agree && !agree.test(part)) {
      const f = features(part)
      return pair(
        `主谓不一致：${quote(head.text)}要${agree.name.zh}，${quote(part.text)}是${f.zh}。`,
        `Subject and verb disagree: ${quote(head.text)} needs ${agree.name.en}, and ${quote(part.text)} is ${f.en}.`,
      )
    }
  }
  return null
}
