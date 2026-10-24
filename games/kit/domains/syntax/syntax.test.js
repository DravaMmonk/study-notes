// node --test games/kit/domains/syntax — the forms the machine works out, the grammar's refusals, a clause said as a
// sentence, and the meaning check, on a small lexicon of its own (a game's lexicon is only data).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { answersOf, nextSlot, place, refuse, refusals, slotName, slotsOf, timeGap, timeOf } from './engine/grammar.js'
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
    she: { nom: 'she', acc: 'her', number: 'sg', person: 3 },
    i: { nom: 'I', acc: 'me', number: 'sg', person: 1 },
    they: { nom: 'they', acc: 'them', number: 'pl', person: 3 },
  },
  verbs: {
    converge: { forms: { base: 'converge', s: 'converges', past: 'converged', pp: 'converged', ing: 'converging' }, frame: 'intransitive', subject: 'THEME', sense: T('收敛', 'converge') },
    accept: { forms: { base: 'accept', s: 'accepts', past: 'accepted', pp: 'accepted', ing: 'accepting' }, frame: 'transitive', sense: T('接收', 'accept') },
    send: { forms: { base: 'send', s: 'sends', past: 'sent', pp: 'sent', ing: 'sending' }, frame: 'ditransitive', sense: T('发送', 'send') },
    'send-to': { forms: { base: 'send', s: 'sends', past: 'sent', pp: 'sent', ing: 'sending' }, frame: 'dative', lemma: 'send', sense: T('发送', 'send') },
  },
})
const accepted = { meaning: { pred: 'accept', tense: 'present', aspect: 'perfect', roles: { AGENT: { ent: 'model', number: 'sg' }, THEME: { ent: 'paper', number: 'sg' } } } }
const sent = { meaning: { pred: 'send', tense: 'past', aspect: 'simple', roles: { AGENT: { ent: 'model', number: 'sg' }, RECIPIENT: { ent: 'author', number: 'pl' }, THEME: { ent: 'paper', number: 'sg' } } }, target: 7 }

test('the lexicon reads, and a bad entry is reported', () => {
  assert.deepEqual(lex.problems, [])
  assert.equal(defineLexicon({ verbs: { x: { forms: { base: 'x' }, frame: 'nonsense', sense: T('x', 'x') } } }).problems.length, 1)
})

test('slots run in reading order, and the verb opens the places its frame needs', () => {
  assert.deepEqual(slotsOf(lex, {}), ['SUBJ', 'TIME', 'V'])
  assert.deepEqual(slotsOf(lex, toClause({ V: 'send' })), ['SUBJ', 'TIME', 'V', 'IOBJ', 'OBJ'])
  assert.deepEqual(slotsOf(lex, toClause({ V: 'send-to' })), ['SUBJ', 'TIME', 'V', 'OBJ', 'TO'])
  // A new verb keeps only the objects its frame has places for.
  const { clause } = place(lex, toClause({ V: 'send', IOBJ: 'authors', OBJ: 'paper' }), 'V', 'verb:accept')
  assert.deepEqual(clause, toClause({ V: 'accept', OBJ: 'paper' }))
})

test('the machine says the time: auxiliaries and verb forms agree with the subject, pronouns take their case', () => {
  const say = (answer) => check(lex, accepted, toClause(answer)).sentence
  assert.equal(say({ SUBJ: 'model', TIME: 'present.perfect', V: 'accept', OBJ: 'paper' }), 'The model has accepted the paper.')
  assert.equal(say({ SUBJ: 'models', TIME: 'present.perfect', V: 'accept', OBJ: 'paper' }), 'The models have accepted the paper.')
  assert.equal(say({ SUBJ: 'model', TIME: 'present.simple', V: 'accept', OBJ: 'paper' }), 'The model accepts the paper.')
  assert.equal(say({ SUBJ: 'i', TIME: 'present.progressive', V: 'accept', OBJ: 'she' }), 'I am accepting her.')
  assert.equal(say({ SUBJ: 'they', TIME: 'past.progressive', V: 'accept', OBJ: 'i' }), 'They were accepting me.')
  assert.equal(say({ SUBJ: 'she', TIME: 'past.progressive', V: 'accept', OBJ: 'they' }), 'She was accepting them.')
  // Before there is a subject, what depends on it is given both ways.
  assert.deepEqual(surface(lex, toClause({ TIME: 'present.perfect' }), 'TIME'), { text: 'has/have' })
  assert.deepEqual(surface(lex, toClause({ TIME: 'past.simple' }), 'TIME'), { text: '-ed', dim: true })
  assert.deepEqual(surface(lex, toClause({ V: 'accept' }), 'V'), { text: 'accept' })
  const dative = check(lex, sent, toClause({ SUBJ: 'model', TIME: 'past.simple', V: 'send-to', OBJ: 'paper', TO: 'authors' }))
  assert.equal(dative.sentence, 'The model sent the paper to the authors.')
  assert.ok(dative.pass && !dative.star)
  assert.ok(check(lex, sent, toClause({ SUBJ: 'model', TIME: 'past.simple', V: 'send', IOBJ: 'authors', OBJ: 'paper' })).star)
})

test('only the clause\'s shape is refused: a word of the wrong kind, a place the verb does not open', () => {
  assert.match(refuse(lex, {}, 'SUBJ', 'verb:accept').en, /noun phrase/)
  assert.match(refuse(lex, {}, 'TIME', 'np:model').en, /time and viewpoint/)
  assert.match(refuse(lex, toClause({ V: 'converge' }), 'OBJ', 'np:paper').en, /no such place/)
  assert.equal(refuse(lex, toClause({ TIME: 'present.perfect' }), 'SUBJ', 'np:models'), null)
  assert.equal(refuse(lex, toClause({ V: 'accept' }), 'OBJ', 'np:she'), null)
  assert.equal(refusals(lex, toClause({ SUBJ: 'models', TIME: 'present.perfect', V: 'accept' })).length, 0)
})

test('the meaning check tells the wrong thing, the wrong number, the wrong time and the wrong verb apart', () => {
  assert.equal(fate(lex, accepted, { SUBJ: 'model', TIME: 'present.perfect', V: 'accept', OBJ: 'paper' }), 'pass')
  assert.equal(fate(lex, accepted, { SUBJ: 'model', TIME: 'past.simple', V: 'accept', OBJ: 'paper' }), 'time')
  assert.equal(fate(lex, accepted, { SUBJ: 'paper', TIME: 'present.perfect', V: 'accept', OBJ: 'model' }), 'role')
  assert.equal(fate(lex, accepted, { SUBJ: 'models', TIME: 'present.perfect', V: 'accept', OBJ: 'paper' }), 'role')
  assert.equal(fate(lex, accepted, { SUBJ: 'model', TIME: 'present.perfect', V: 'converge' }), 'pred')
  const run = check(lex, accepted, toClause({ SUBJ: 'models', TIME: 'present.perfect', V: 'accept', OBJ: 'paper' }))
  assert.match(run.roles.AGENT.why.en, /Wrong number/)
  assert.equal(run.roles.AGENT.slot, 'SUBJ')
})

test('a wrong time gives the level\'s own reason', () => {
  const why = { 'past.simple': T('结果还在', 'The result still stands') }
  const run = check(lex, { ...accepted, why }, toClause({ SUBJ: 'model', TIME: 'past.simple', V: 'accept', OBJ: 'paper' }))
  assert.equal(run.time.why, why['past.simple'])
  assert.equal(run.time.step, 2)
  // Without a reason of the level's, the question that went the other way gives a plain one.
  const general = check(lex, accepted, toClause({ SUBJ: 'model', TIME: 'present.simple', V: 'accept', OBJ: 'paper' })).time
  assert.equal(general.step, 1)
  assert.match(general.why.en, /one event/)
  assert.equal(check(lex, accepted, toClause({ SUBJ: 'model', TIME: 'present.progressive', V: 'accept', OBJ: 'paper' })).time.step, 3)
})

test('a pronoun names what the level says it names', () => {
  const level = { ...accepted, meaning: { ...accepted.meaning, tense: 'past', aspect: 'simple' }, refer: { she: 'model' } }
  assert.equal(fate(lex, level, { SUBJ: 'she', TIME: 'past.simple', V: 'accept', OBJ: 'paper' }), 'pass')
  assert.equal(fate(lex, { ...level, refer: {} }, { SUBJ: 'she', TIME: 'past.simple', V: 'accept', OBJ: 'paper' }), 'role')
})

test('an unfinished clause names its empty slots', () => {
  const run = check(lex, accepted, toClause({ TIME: 'present.perfect', V: 'accept' }))
  assert.equal(run.complete, false)
  assert.deepEqual(run.open, ['SUBJ', 'OBJ'])
  assert.deepEqual(run.groups.filter((g) => g.gap).map((g) => g.slot), ['SUBJ', 'OBJ'])
})

test('a clause is planned time first: the time is the next place, and the verb place names the form it holds', () => {
  const clause = toClause({ SUBJ: 'model' })
  assert.equal(nextSlot(lex, clause), 'TIME')
  assert.deepEqual(slotName(lex, clause, 'V'), { zh: '动词', en: 'verb' })
  const framed = toClause({ SUBJ: 'model', TIME: 'past.simple' })
  assert.equal(nextSlot(lex, framed), 'V')
  assert.deepEqual(slotName(lex, framed, 'V'), { zh: '动词（过去式）', en: 'verb (past)' })
  assert.deepEqual(slotName(lex, toClause({ TIME: 'present.simple' }), 'V'), { zh: '动词（原形或 -s 形式）', en: 'verb (bare or -s form)' })
  assert.equal(nextSlot(lex, toClause({ TIME: 'present.perfect', V: 'accept' })), 'SUBJ')
  assert.equal(nextSlot(lex, toClause({ SUBJ: 'model', TIME: 'past.simple', V: 'converge' })), null)
})

test('the time questions give a time, and a time gives back its answers', () => {
  assert.equal(timeOf({ kind: 'general' }), 'present.simple')
  assert.equal(timeOf({ kind: 'episode', stand: 'present', view: 'perfect' }), 'present.perfect')
  assert.equal(timeOf({ kind: 'episode', stand: 'past', view: 'perfect' }), 'past.perfect')
  assert.equal(timeOf({ kind: 'episode', stand: 'past' }), null)
  // One event seen whole from now is no time English uses here, and says why.
  assert.equal(timeOf({ kind: 'episode', stand: 'present', view: 'simple' }), null)
  assert.ok(timeGap({ kind: 'episode', stand: 'present', view: 'simple' }))
  for (const key of ['present.simple', 'past.simple', 'future.progressive', 'present.perfect']) assert.equal(timeOf(answersOf(key)), key)
})
