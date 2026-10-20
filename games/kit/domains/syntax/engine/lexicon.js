// A game's words, read the one way the grammar (grammar.js) needs them. The game writes them as plain data:
//
//   nouns        { key: { text, ent, number: 'sg' | 'pl', person?: 1 | 2 | 3, case?: 'nom' | 'acc', sense?: { zh, en } } }
//                a noun phrase as said ("the budget", "she"); `ent` is the thing it names (the same for "the budget"
//                and "the budgets"), so the meaning check can tell a wrong thing from a wrong number
//   verbs        { key: { forms: { base, s, past, pp, ing }, frame, lemma?, subject?, sense: { zh, en } } }
//                `frame` is one of grammar.js FRAMES; `lemma` names the verb in a level's meaning (by default the
//                key, so two frames of one verb share it); `subject` is the subject's role (AGENT by default)
//   inflections  { key: { label, tense, aspect, agree, aux: [word], verb: 'base' | 's' | 'past' | 'pp' | 'ing' } }
//                the head of a clause: the auxiliaries it says, the verb form it asks for, and whom it agrees with
//
// A word's type in a clause is `<kind>:<key>` (np:paper, verb:accept, infl:has).

import { AGREEMENT, ASPECT_NAME, FRAMES, TENSE_NAME } from './grammar.js'

export function defineLexicon({ nouns = {}, verbs = {}, inflections = {} }) {
  const parts = new Map()
  const problems = []
  for (const [key, n] of Object.entries(nouns)) {
    if (!['sg', 'pl'].includes(n.number)) problems.push(`np:${key}: number must be sg or pl`)
    parts.set(`np:${key}`, { kind: 'np', key, text: n.text, ent: n.ent ?? key, number: n.number, person: n.person ?? 3, case: n.case ?? null, sense: n.sense ?? null })
  }
  for (const [key, v] of Object.entries(verbs)) {
    if (!FRAMES[v.frame]) problems.push(`verb:${key}: unknown frame ${v.frame}`)
    const frame = FRAMES[v.frame] ?? FRAMES.intransitive
    parts.set(`verb:${key}`, { kind: 'verb', key, lemma: v.lemma ?? key, text: v.frame === 'dative' ? `${v.forms.base} … to` : v.forms.base, forms: v.forms, frame: v.frame, ports: frame.ports, subject: v.subject ?? 'AGENT', sense: v.sense })
  }
  for (const [key, i] of Object.entries(inflections)) {
    if (!AGREEMENT[i.agree]) problems.push(`infl:${key}: unknown agreement ${i.agree}`)
    if (!TENSE_NAME[i.tense] || !ASPECT_NAME[i.aspect]) problems.push(`infl:${key}: unknown tense or aspect`)
    parts.set(`infl:${key}`, { kind: 'infl', key, text: i.label, tense: i.tense, aspect: i.aspect, agree: i.agree, aux: i.aux ?? [], verb: i.verb })
  }
  return {
    problems,
    /** The word a type stands for, or null. */
    part: (type) => parts.get(type) ?? null,
    /** The type of a lexicon key of one kind: type('np', 'paper') → 'np:paper'. */
    type: (kind, key) => `${kind}:${key}`,
    types: () => [...parts.keys()],
  }
}
