// node --test games/kit/domains/syntax — the grammar's refusals, a board read as a sentence, and the meaning check,
// on a small lexicon of its own (a game's lexicon is only data).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { refuse } from './engine/grammar.js'
import { defineLexicon } from './engine/lexicon.js'
import { board, check } from './engine/sentence.js'
import { fate } from './validate.js'

const T = (zh, en) => ({ zh, en })
const lex = defineLexicon({
  nouns: {
    board: { text: 'the board', ent: 'board', number: 'sg' },
    boards: { text: 'the boards', ent: 'board', number: 'pl' },
    plan: { text: 'the plan', ent: 'plan', number: 'sg' },
    client: { text: 'the client', ent: 'client', number: 'sg' },
    she: { text: 'she', number: 'sg', person: 3, case: 'nom' },
    her: { text: 'her', number: 'sg', person: 3, case: 'acc' },
    i: { text: 'I', number: 'sg', person: 1, case: 'nom' },
  },
  verbs: {
    approve: { forms: { base: 'approve', s: 'approves', past: 'approved', pp: 'approved', ing: 'approving' }, frame: 'transitive', sense: T('批准', 'approve') },
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
const approvePlan = { meaning: { pred: 'approve', tense: 'present', aspect: 'perfect', roles: { AGENT: { ent: 'board', number: 'sg' }, THEME: { ent: 'plan', number: 'sg' } } } }
const refusedWire = (answer) => {
  const graph = board(lex, answer)
  return graph.wires.map((w) => refuse(lex, graph, w.from, w.to, w.port)).find(Boolean) ?? null
}

test('the lexicon reads, and a bad entry is reported', () => {
  assert.deepEqual(lex.problems, [])
  assert.equal(defineLexicon({ verbs: { x: { forms: { base: 'x' }, frame: 'nonsense', sense: T('x', 'x') } } }).problems.length, 1)
})

test('a clause is said in order, with the forms its head asks for', () => {
  const run = check(lex, approvePlan, board(lex, { infl: 'has', subj: 'board', verb: 'approve', OBJ: 'plan' }))
  assert.equal(run.sentence, 'The board has approved the plan.')
  assert.equal(run.words, 6)
  assert.ok(run.pass)
  const dative = check(lex, { meaning: { pred: 'send', tense: 'past', aspect: 'simple', roles: { AGENT: { ent: 'board', number: 'sg' }, THEME: { ent: 'plan', number: 'sg' }, RECIPIENT: { ent: 'client', number: 'sg' } } }, target: 6 },
    board(lex, { infl: 'ed', subj: 'board', verb: 'send-to', OBJ: 'plan', TO: 'client' }))
  assert.equal(dative.sentence, 'The board sent the plan to the client.')
  assert.ok(dative.pass && !dative.star)
})

test('agreement, case, category and one place per phrase are refused, each with its reason', () => {
  assert.match(refusedWire({ infl: 'have', subj: 'board', verb: 'approve' }).en, /disagree/)
  assert.equal(refusedWire({ infl: 'has', subj: 'boards', verb: 'approve' }) !== null, true)
  assert.equal(refusedWire({ infl: 'am', subj: 'i', verb: 'approve' }), null)
  assert.equal(refusedWire({ infl: 'am', subj: 'she', verb: 'approve' }) !== null, true)
  assert.match(refusedWire({ infl: 'ed', subj: 'her', verb: 'approve' }).en, /case/)
  assert.match(refusedWire({ infl: 'ed', subj: 'board', verb: 'approve', OBJ: 'she' }).en, /case/)
  // A verb into a subject port, and one phrase into two ports.
  const graph = board(lex, { infl: 'ed', subj: 'board', verb: 'approve', OBJ: 'plan' })
  assert.match(refuse(lex, graph, 'verb-approve', 'infl-ed', 'SUBJ').en, /noun phrase/)
  assert.match(refuse(lex, graph, 'np-plan', 'infl-ed', 'SUBJ').en, /one place/)
})

test('the meaning check tells the wrong thing, the wrong number, the wrong time and the wrong verb apart', () => {
  assert.equal(fate(lex, approvePlan, { infl: 'has', subj: 'board', verb: 'approve', OBJ: 'plan' }), 'pass')
  assert.equal(fate(lex, approvePlan, { infl: 'ed', subj: 'board', verb: 'approve', OBJ: 'plan' }), 'time')
  assert.equal(fate(lex, approvePlan, { infl: 'has', subj: 'plan', verb: 'approve', OBJ: 'board' }), 'role')
  assert.equal(fate(lex, approvePlan, { infl: 'have', subj: 'boards', verb: 'approve', OBJ: 'plan' }), 'role')
  assert.equal(fate(lex, approvePlan, { infl: 'has', subj: 'board', verb: 'send-to', OBJ: 'plan', TO: 'client' }), 'pred')
  const run = check(lex, approvePlan, board(lex, { infl: 'have', subj: 'boards', verb: 'approve', OBJ: 'plan' }))
  assert.match(run.roles.AGENT.why.en, /Wrong number/)
})

test('a pronoun names what the level says it names', () => {
  const level = { ...approvePlan, meaning: { ...approvePlan.meaning, tense: 'past', aspect: 'simple' }, refer: { she: 'board' } }
  assert.equal(fate(lex, level, { infl: 'ed', subj: 'she', verb: 'approve', OBJ: 'plan' }), 'pass')
  assert.equal(fate(lex, { ...level, refer: {} }, { infl: 'ed', subj: 'she', verb: 'approve', OBJ: 'plan' }), 'role')
})

test('an unfinished board names its open ports', () => {
  const run = check(lex, approvePlan, board(lex, { infl: 'has', verb: 'approve' }))
  assert.equal(run.complete, false)
  assert.deepEqual(run.open.map((o) => o.port).sort(), ['OBJ', 'SUBJ'])
  assert.deepEqual(run.groups.filter((g) => g.gap).map((g) => g.port), ['SUBJ', 'OBJ'])
})
