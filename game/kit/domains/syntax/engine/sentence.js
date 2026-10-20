// From a board to a sentence and its meaning, and that meaning against a level's: the syntax domain's run.
//
//   read(lex, graph)          the clause tree the board's wires make, and the ports still open
//   words(lex, tree)          what the tree says, word group by word group (with gaps for what is missing)
//   check(lex, level, graph)  the whole run: the sentence, its meaning, each part of the level's meaning matched or
//                             not (and why), and the score (its words)
//   board(lex, answer, at?)   a board from an answer written as a clause ({ infl, subj, verb, OBJ?, IOBJ?, TO? }), for
//                             a level's preset and for the validator's reference answers

import { feeding } from '../../../circuit/model.js'
import { ASPECT_NAME, PORT_LABEL, ROLE_NAME, TENSE_NAME } from './grammar.js'
import { SINK } from './lexicon.js'

const pair = (zh, en) => ({ zh, en })

/** The clause tree on a board: { infl, subj, verb, args: { port: node } } (any of them null), and what is open. */
export function read(lex, graph) {
  const node = (id) => (id ? graph.nodes.find((n) => n.id === id) ?? null : null)
  const sink = graph.nodes.find((n) => n.type === SINK) ?? null
  const open = []
  const from = (n, port) => {
    const got = node(feeding(graph, n.id, port))
    if (!got) open.push({ node: n.id, port })
    return got
  }
  const infl = sink ? from(sink, 'S') : null
  const subj = infl ? from(infl, 'SUBJ') : null
  const verb = infl ? from(infl, 'VP') : null
  const args = {}
  for (const [port] of verb ? lex.part(verb.type).ports : []) args[port] = from(verb, port)
  return { sink, infl, subj, verb, args, open }
}

/**
 * The tree's words in order, in groups: [{ text, port, node }] for what is there and [{ gap, port }] for what is
 * missing. The INFL part and the verb make one group (the auxiliaries and the verb form the INFL asks for).
 */
export function words(lex, tree) {
  const out = []
  const np = (n, port) => out.push(n ? { text: lex.part(n.type).text, port, node: n.id } : { gap: true, port })
  np(tree.subj, 'SUBJ')
  const infl = tree.infl && lex.part(tree.infl.type)
  const verb = tree.verb && lex.part(tree.verb.type)
  if (infl && verb) out.push({ text: [...infl.aux, verb.forms[infl.verb]].join(' '), port: 'VP', node: tree.verb.id })
  else if (infl) out.push({ text: [...infl.aux, { base: 'V', s: 'V-s', past: 'V-ed', pp: 'V-en', ing: 'V-ing' }[infl.verb]].join(' '), port: 'VP', node: tree.infl.id, partial: true })
  else out.push({ gap: true, port: 'VP' })
  if (verb) {
    for (const [port] of verb.ports) {
      if (port === 'TO') out.push({ text: 'to', port, node: tree.verb.id })
      np(tree.args[port], port)
    }
  }
  return out
}

/** The sentence a complete tree says, capitalised and with its full stop. */
export function sentenceOf(groups) {
  const text = groups.map((g) => g.text).join(' ')
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`
}

export const wordCount = (groups) => groups.reduce((sum, g) => sum + (g.gap ? 0 : g.text.split(' ').length), 0)

/**
 * A run of a level's board. `level.meaning` is { pred, tense, aspect, roles: { ROLE: { ent, number } } };
 * `level.target` (optional) is the most words that earn the star; `level.refer` (optional) says what each pronoun
 * of the level names.
 *
 *   { complete, open, groups, sentence, words, pass, star,
 *     pred: { ok, why? }, time: { ok, why? }, roles: { ROLE: { ok, why?, node? } }, extra: [ROLE] }
 */
export function check(lex, level, graph) {
  const tree = read(lex, graph)
  const groups = words(lex, tree)
  const complete = tree.open.length === 0
  const result = { complete, open: tree.open, groups, sentence: complete ? sentenceOf(groups) : null, words: wordCount(groups), pass: false, star: false, roles: {}, extra: [] }
  if (!complete) return result
  const want = level.meaning
  const verb = lex.part(tree.verb.type)
  const infl = lex.part(tree.infl.type)
  result.pred = verb.lemma === want.pred ? { ok: true } : { ok: false, why: pair(`这里接的是 ${verb.lemma}（${verb.sense.zh}）`, `This says ${verb.lemma} (${verb.sense.en})`) }
  const time = (t, a) => pair(`${TENSE_NAME[t].zh} · ${ASPECT_NAME[a].zh}`, `${TENSE_NAME[t].en} ${ASPECT_NAME[a].en}`)
  const said = time(infl.tense, infl.aspect)
  result.time = infl.tense === want.tense && infl.aspect === want.aspect ? { ok: true } : { ok: false, why: pair(`说成了${said.zh}`, `This says ${said.en}`) }
  // The roles the sentence fills: the subject's (the verb's own), then each object port's.
  const filled = { [verb.subject]: tree.subj }
  for (const [port, role] of verb.ports) filled[role] = tree.args[port]
  for (const [role, thing] of Object.entries(want.roles)) {
    const n = filled[role]
    if (!n) {
      result.roles[role] = { ok: false, why: pair(`这个句子里没有${ROLE_NAME[role].zh}的位置`, `This sentence has no place for the ${ROLE_NAME[role].en}`) }
      continue
    }
    const part = lex.part(n.type)
    // A pronoun names whatever the level's context makes it name (level.refer: { she: 'reviewer' }).
    const ent = level.refer?.[part.key] ?? part.ent
    if (ent !== thing.ent) result.roles[role] = { ok: false, node: n.id, why: pair(`这里是“${part.text}”`, `This is “${part.text}”`) }
    else if (part.number !== thing.number) result.roles[role] = { ok: false, node: n.id, why: pair(`数不对：“${part.text}”是${part.number === 'sg' ? '单数' : '复数'}`, `Wrong number: “${part.text}” is ${part.number === 'sg' ? 'singular' : 'plural'}`) }
    else result.roles[role] = { ok: true, node: n.id }
  }
  result.extra = Object.keys(filled).filter((role) => !want.roles[role])
  result.pass = result.pred.ok && result.time.ok && Object.values(result.roles).every((r) => r.ok) && result.extra.length === 0
  result.star = result.pass && (!level.target || result.words <= level.target)
  return result
}

/** What is still open, in words: "主语、宾语" / "subject, object". */
export const openPorts = (open) => pair(open.map((o) => PORT_LABEL[o.port].zh).join('、'), open.map((o) => PORT_LABEL[o.port].en).join(', '))

/**
 * A board from an answer: { infl, subj, verb, OBJ?, IOBJ?, TO? } with lexicon keys (any may be left out, for a
 * preset). `at(type)` gives each new node its place ({ x, y } on the desktop board); nodes are marked `fixed`
 * when `fixed`.
 */
export function board(lex, answer = {}, { fixed = false, at = () => ({}) } = {}) {
  const nodes = [{ id: 'out', type: SINK, ...at(SINK) }]
  const wires = []
  const add = (kind, key) => {
    if (!key) return null
    const id = `${kind}-${key}`
    nodes.push({ id, type: `${kind}:${key}`, ...(fixed ? { fixed: true } : {}), ...at(`${kind}:${key}`) })
    return id
  }
  const infl = add('infl', answer.infl)
  const subj = add('np', answer.subj)
  const verb = add('verb', answer.verb)
  if (infl) wires.push({ from: infl, to: 'out', port: 'S' })
  if (infl && subj) wires.push({ from: subj, to: infl, port: 'SUBJ' })
  if (infl && verb) wires.push({ from: verb, to: infl, port: 'VP' })
  for (const port of ['OBJ', 'IOBJ', 'TO']) {
    const id = add('np', answer[port])
    if (id && verb) wires.push({ from: id, to: verb, port })
  }
  return { nodes, wires }
}

/** Every part an answer uses, as board types. */
export const answerTypes = (answer) => [
  answer.infl && `infl:${answer.infl}`, answer.subj && `np:${answer.subj}`, answer.verb && `verb:${answer.verb}`,
  ...['OBJ', 'IOBJ', 'TO'].map((p) => answer[p] && `np:${answer[p]}`),
].filter(Boolean)
