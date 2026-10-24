// A game's words, read the one way the grammar (grammar.js) needs them. The game writes them as plain data:
//
//   nouns   { key: { text, ent, number: 'sg' | 'pl', person?: 1 | 2 | 3, sense?: { zh, en } } }
//           a noun phrase as said ("the budget"); `ent` is the thing it names (the same for "the budget" and "the
//           budgets"), so the meaning check can tell a wrong thing from a wrong number
//         | { key: { nom, acc, number, person } }
//           a pronoun: it names whatever a level's context makes it name, and the grammar says it in the case its
//           place asks for (we as the subject, us elsewhere)
//   verbs   { key: { forms: { base, s, past, pp, ing }, frame, lemma?, subject?, sense: { zh, en } } }
//           `frame` is one of grammar.js FRAMES; `lemma` names the verb in a level's meaning (by default the key, so
//           two frames of one verb share it); `subject` is the subject's role (AGENT by default)
//   times   { key: { label: { zh, en }, shape, tense, aspect } }
//           a time and viewpoint as the player chooses it ("up to now · the result stands"); `shape` is how English
//           marks it ("have + -en"); the grammar works out the words from the tense, the aspect and the subject
//
// A word's type in a clause is `<kind>:<key>` (np:paper, verb:accept, time:perfect).

import { ASPECT_NAME, FRAMES, TENSE_NAME } from './grammar.js'

export function defineLexicon({ nouns = {}, verbs = {}, times = {} }) {
  const parts = new Map()
  const problems = []
  for (const [key, n] of Object.entries(nouns)) {
    if (!['sg', 'pl'].includes(n.number)) problems.push(`np:${key}: number must be sg or pl`)
    const forms = n.nom ? { nom: n.nom, acc: n.acc ?? n.nom } : null
    const text = forms ? (forms.nom === forms.acc ? forms.nom : `${forms.nom} / ${forms.acc}`) : n.text
    parts.set(`np:${key}`, { kind: 'np', key, text, forms, pronoun: Boolean(forms), ent: n.ent ?? key, number: n.number, person: n.person ?? 3, sense: n.sense ?? null })
  }
  for (const [key, v] of Object.entries(verbs)) {
    if (!FRAMES[v.frame]) problems.push(`verb:${key}: unknown frame ${v.frame}`)
    const frame = FRAMES[v.frame] ?? FRAMES.intransitive
    parts.set(`verb:${key}`, { kind: 'verb', key, lemma: v.lemma ?? key, text: v.frame === 'dative' ? `${v.forms.base} … to` : v.forms.base, forms: v.forms, frame: v.frame, ports: frame.ports, subject: v.subject ?? 'AGENT', sense: v.sense })
  }
  for (const [key, t] of Object.entries(times)) {
    if (!TENSE_NAME[t.tense] || !ASPECT_NAME[t.aspect]) problems.push(`time:${key}: unknown tense or aspect`)
    parts.set(`time:${key}`, { kind: 'time', key, text: t.label, shape: t.shape, tense: t.tense, aspect: t.aspect })
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
