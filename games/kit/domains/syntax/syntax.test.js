// node --test games/kit/domains/syntax — the grammar's refusals, a clause said as a sentence, and the meaning check,
// on a small lexicon of its own (a game's lexicon is only data).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextSlot, place, refuse, refusals, slotName, slotsOf } from './engine/grammar.js'
import { defineLexicon } from './engine/lexicon.js'
import { check, surface, toClause } from './engine/sentence.js'
import { fate } from './validate.js'

const T = (zh, en) => ({ zh, en })
const lex = defineLexicon({
  nouns: {
    model: { text: 'the model', ent: 'model', number: 'sg' },
    models: { text: 'the models', ent: 'model', number: 'pl' },
    paper: { text: 'the paper', ent: 'paper', number: 'sg' },
    authors: { text: 'the authors', ent: 'author', number: 'pl' },
    she: { text: 'she', number: 'sg', person: 3, case: 'nom' },
    her: { text: 'her', number: 'sg', person: 3, case: 'acc' },
    i: { text: 'I', number: 'sg', person: 1, case: 'nom' },
  },
  verbs: {
    converge: { forms: { base: 'converge', s: 'converges', past: 'converged', pp: 'converged', ing: 'converging' }, frame: 'intransitive', subject: 'THEME', sense: T('收敛', 'converge') },
    accept: { forms: { base: 'accept', s: 'accepts', past: 'accepted', pp: 'accepted', ing: 'accepting' }, frame: 'transitive', sense: T('接收', 'accept') },
    send: { forms: { base: 'send', s: 'sends', past: 'sent', pp: 'sent', ing: 'sending' }, frame: 'ditransitive', sense: T('发送', 'send') },
    'send-to': { forms: { base: 'send', s: 'sends', past: 'sent', pp: 'sent', ing: 'sending' }, frame: 'dative', lemma: 'send', sense: T('发送', 'send') },
  },
  inflections: {
    s: { label: '-s', tense: 'present', aspect: 'simple', agree: '3sg', aux: [], verb: 's' },
    has: { label: 'has + -en', tense: 'present', aspect: 'perfect', agree: '3sg', aux: ['has'], verb: 'pp' },
    have: { label: 'have + -en', tense: 'present', aspect: 'perfect', agree: 'non3sg', aux: ['have'], verb: 'pp' },
    am: { label: 'am + -ing', tense: 'present', aspect: 'progressive', agree: '1sg', aux: ['am'], verb: 'ing' },
    ed: { label: '-ed', tense: 'past', aspect: 'simple', agree: 'any', aux: [], verb: 'past' },
  },
})
const accepted = { meaning: { pred: 'accept', tense: 'present', aspect: 'perfect', roles: { AGENT: { ent: 'model', number: 'sg' }, THEME: { ent: 'paper', number: 'sg' } } } }
const sent = { meaning: { pred: 'send', tense: 'past', aspect: 'simple', roles: { AGENT: { ent: 'model', number: 'sg' }, RECIPIENT: { ent: 'author', number: 'pl' }, THEME: { ent: 'paper', number: 'sg' } } }, target: 7 }

test('the lexicon reads, and a bad entry is reported', () => {
  assert.deepEqual(lex.problems, [])
  assert.equal(defineLexicon({ verbs: { x: { forms: { base: 'x' }, frame: 'nonsense', sense: T('x', 'x') } } }).problems.length, 1)
})

test('slots run in reading order, and the verb opens the places its frame needs', () => {
  assert.deepEqual(slotsOf(lex, {}), ['SUBJ', 'INFL', 'V'])
  assert.deepEqual(slotsOf(lex, toClause({ V: 'send' })), ['SUBJ', 'INFL', 'V', 'IOBJ', 'OBJ'])
  assert.deepEqual(slotsOf(lex, toClause({ V: 'send-to' })), ['SUBJ', 'INFL', 'V', 'OBJ', 'TO'])
  // A new verb keeps only the objects its frame has places for.
  const { clause } = place(lex, toClause({ V: 'send', IOBJ: 'authors', OBJ: 'paper' }), 'V', 'verb:accept')
  assert.deepEqual(clause, toClause({ V: 'accept', OBJ: 'paper' }))
})

test('a clause is said in order, with the forms its tense asks for', () => {
  const run = check(lex, accepted, toClause({ SUBJ: 'model', INFL: 'has', V: 'accept', OBJ: 'paper' }))
  assert.equal(run.sentence, 'The model has accepted the paper.')
  assert.equal(run.words, 6)
  assert.ok(run.pass)
  assert.deepEqual(surface(lex, toClause({ INFL: 'ed' }), 'INFL'), { text: '-ed', dim: true })
  assert.deepEqual(surface(lex, toClause({ V: 'accept' }), 'V'), { text: 'accept' })
  const dative = check(lex, sent, toClause({ SUBJ: 'model', INFL: 'ed', V: 'send-to', OBJ: 'paper', TO: 'authors' }))
  assert.equal(dative.sentence, 'The model sent the paper to the authors.')
  assert.ok(dative.pass && !dative.star)
  assert.ok(check(lex, sent, toClause({ SUBJ: 'model', INFL: 'ed', V: 'send', IOBJ: 'authors', OBJ: 'paper' })).star)
})

test('kind, case and agreement are refused, each with its reason', () => {
  assert.match(refuse(lex, toClause({ INFL: 'have' }), 'SUBJ', 'np:model').en, /disagree/)
  assert.match(refuse(lex, toClause({ SUBJ: 'models' }), 'INFL', 'infl:has').en, /disagree/)
  assert.equal(refuse(lex, toClause({ INFL: 'am' }), 'SUBJ', 'np:i'), null)
  assert.ok(refuse(lex, toClause({ INFL: 'am' }), 'SUBJ', 'np:she'))
  assert.match(refuse(lex, {}, 'SUBJ', 'np:her').en, /case/)
  assert.match(refuse(lex, toClause({ V: 'accept' }), 'OBJ', 'np:she').en, /case/)
  assert.match(refuse(lex, {}, 'SUBJ', 'verb:accept').en, /noun phrase/)
  assert.match(refuse(lex, toClause({ V: 'converge' }), 'OBJ', 'np:paper').en, /no such place/)
  assert.equal(refusals(lex, toClause({ SUBJ: 'models', INFL: 'has', V: 'accept' })).length, 2)
})

test('the meaning check tells the wrong thing, the wrong number, the wrong time and the wrong verb apart', () => {
  assert.equal(fate(lex, accepted, { SUBJ: 'model', INFL: 'has', V: 'accept', OBJ: 'paper' }), 'pass')
  assert.equal(fate(lex, accepted, { SUBJ: 'model', INFL: 'ed', V: 'accept', OBJ: 'paper' }), 'time')
  assert.equal(fate(lex, accepted, { SUBJ: 'paper', INFL: 'has', V: 'accept', OBJ: 'model' }), 'role')
  assert.equal(fate(lex, accepted, { SUBJ: 'models', INFL: 'have', V: 'accept', OBJ: 'paper' }), 'role')
  assert.equal(fate(lex, accepted, { SUBJ: 'model', INFL: 'has', V: 'converge' }), 'pred')
  assert.equal(fate(lex, accepted, { SUBJ: 'models', INFL: 'has', V: 'accept', OBJ: 'paper' }), 'grammar')
  const run = check(lex, accepted, toClause({ SUBJ: 'models', INFL: 'have', V: 'accept', OBJ: 'paper' }))
  assert.match(run.roles.AGENT.why.en, /Wrong number/)
  assert.equal(run.roles.AGENT.slot, 'SUBJ')
})

test('a pronoun names what the level says it names', () => {
  const level = { ...accepted, meaning: { ...accepted.meaning, tense: 'past', aspect: 'simple' }, refer: { she: 'model' } }
  assert.equal(fate(lex, level, { SUBJ: 'she', INFL: 'ed', V: 'accept', OBJ: 'paper' }), 'pass')
  assert.equal(fate(lex, { ...level, refer: {} }, { SUBJ: 'she', INFL: 'ed', V: 'accept', OBJ: 'paper' }), 'role')
})

test('an unfinished clause names its empty slots', () => {
  const run = check(lex, accepted, toClause({ INFL: 'has', V: 'accept' }))
  assert.equal(run.complete, false)
  assert.deepEqual(run.open, ['SUBJ', 'OBJ'])
  assert.deepEqual(run.groups.filter((g) => g.gap).map((g) => g.slot), ['SUBJ', 'OBJ'])
})

test('a clause is planned time first: the tense is the next place, and the verb place names the form it holds', () => {
  const clause = toClause({ SUBJ: 'model' })
  assert.equal(nextSlot(lex, clause), 'INFL')
  assert.deepEqual(slotName(lex, clause, 'V'), { zh: '动词', en: 'verb' })
  const framed = toClause({ SUBJ: 'model', INFL: 'ed' })
  assert.equal(nextSlot(lex, framed), 'V')
  assert.deepEqual(slotName(lex, framed, 'V'), { zh: '动词（过去式）', en: 'verb (past)' })
  assert.equal(nextSlot(lex, toClause({ INFL: 'has', V: 'accept' })), 'SUBJ')
  assert.equal(nextSlot(lex, toClause({ SUBJ: 'model', INFL: 'ed', V: 'converge' })), null)
})
