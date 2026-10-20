// The syntax domain's parts, described the way the shared circuit editor reads them (games/kit/circuit/model.js):
// which ports a card has, what it is called, its family (its colour) and the grammar's refusals. The same object
// drives the desktop board and the phone board.

import { FRAMES, PORT_LABEL, refuse, shortFeatures, AGREEMENT, ASPECT_NAME, TENSE_NAME } from './grammar.js'
import { SINK } from './lexicon.js'

/** A card's family, which colours it: noun phrases, pronouns (they carry case), verbs, the heads of clauses. */
export const familyOf = (lex, type) => {
  if (type === SINK) return 'sentence'
  const p = lex.part(type)
  return !p ? 'other' : p.kind === 'np' ? (p.case ? 'pronoun' : 'np') : p.kind
}

/** The line under a part's name: what the grammar sees in it. */
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

/** The ports a part opens: a head of a clause its subject and predicate, a verb its frame's objects. */
export function portsOf(lex, type) {
  if (type === SINK) return ['S']
  const p = lex.part(type)
  if (!p) return []
  if (p.kind === 'infl') return ['SUBJ', 'VP']
  if (p.kind === 'verb') return p.ports.map(([port]) => port)
  return []
}

export function partsFor(lex) {
  return {
    inputs: (node) => portsOf(lex, node.type),
    role: (node) => (node.type === SINK ? 'sink' : 'part'),
    label: (node) => (node.type === SINK ? { zh: '句子', en: 'Sentence' } : lex.part(node.type)?.text ?? node.type),
    portLabel: (node, port) => PORT_LABEL[port],
    family: (node) => familyOf(lex, node.type),
    refuse: (graph, from, to, port) => refuse(lex, graph, from, to, port),
    // A preset part belongs to the level: it stays on the board.
    removable: (node) => node.type !== SINK && !node.fixed,
  }
}
