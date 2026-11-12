// node --test (npm test) — the calculus domain: its parts, a board keeping a register to give the term before, a test
// that wants the wrong term failing at that term, boards as blueprint text, and its starter game (starter/, what
// npm run new-game copies) passing its own checks.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PARTS } from './parts.js'
import { board } from './board.js'
import { primitivesOnly } from '../../engine/circuit-domain.js'
import { runLevel } from './run.js'
import { CLAIMS } from './proof.js'
import domain from './domain.js'

const plain = primitivesOnly(board, PARTS)
const { fromText, toText } = board
const { partOf } = plain
const read = (t) => ({ inputs: {}, ...t, ticks: Math.max(...Object.values(t.want).map((w) => w.length)) })

test('a part handed 「—」 gives 「—」', () => {
  assert.equal(PARTS.add.eval({ a: 2, b: -5 }), -3)
  assert.equal(PARTS.mul.eval({ a: null, b: 3 }), null)
  assert.equal(PARTS.const.eval({}, { params: { value: '-1' } }), -1)
})

test('a recurrence counts with a register, and a wrong term fails where it is wrong', () => {
  const level = { outputs: [{ name: 'n', label: 'n' }], tests: [read({ want: { n: [0, 1, 2, 3] } })] }
  const lines = ['r = reg[reg=A, start=0]()', 'c = const[value=1]()', 's = add(r, c)', 'k = keep[reg=A](s)', 'n <- r']
  const made = fromText(lines, level, plain)
  assert.equal(runLevel(level, made, partOf).pass, true)
  const wrong = { ...level, tests: [read({ want: { n: [0, 1, 3, 3] } })] }
  assert.deepEqual(runLevel(wrong, made, partOf).runs[0].fail, { tick: 2, name: 'n', want: 3, got: 2 })
  // Written out and read back, a board writes the same text again.
  const text = toText(made, level, plain)
  assert.deepEqual(toText(fromText(text, level, plain), level, plain), text)
  assert.throws(() => fromText(['x = counter()'], level, plain), (e) => e.line === 1)
})

test('a board without a register in its loop is refused', () => {
  const level = { inputs: [{ name: 'a', label: 'a' }], outputs: [{ name: 's', label: 's' }], tests: [read({ inputs: { a: [1] }, want: { s: [1] } })] }
  assert.throws(() => fromText(['p = add(a, p)', 's <- p'], level, plain))
})

test('the starter game passes its checks', async () => {
  const { assemble } = await import('../../engine/content.js')
  const { readFileSync, readdirSync } = await import('node:fs')
  const dir = new URL('./starter/', import.meta.url)
  const json = (f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8'))
  const content = assemble({
    id: 'starter',
    game: json('game.json'),
    levels: readdirSync(new URL('levels/', dir)).map((f) => [f.slice(0, -5), json(`levels/${f}`)]),
    glossary: json('glossary.json'),
  })
  const lines = await domain.validate(domain.spec(content))
  assert.deepEqual(lines.filter((l) => l.fail), [])
})

test('a task that withholds a part keeps it from the tray and from its answer', async () => {
  const { assemble } = await import('../../engine/content.js')
  const { calculusCourse } = await import('./course.js')
  const level = (title, task) => ({ title: { zh: title, en: title }, tasks: [{ id: title, brief: { zh: 'b', en: 'b' }, outputs: [{ name: 'n', label: 'n' }], tests: [{ want: { n: [0, 1, 2] } }], ...task }] })
  const counter = ['r = reg[reg=A, start=0]()', 'c = const[value=1]()', 's = add(r, c)', 'k = keep[reg=A](s)', 'n <- r']
  const content = (withhold, solution) => assemble({
    id: 't',
    game: { domain: 'calculus', vocabulary: 1, title: { zh: 't', en: 't' }, kicker: { zh: 't', en: 't' }, lede: { zh: 't', en: 't' }, primitives: ['add', 'const', 'reg', 'keep'], concept: { keep: 'reg' }, eras: [{ id: 0, title: { zh: 't', en: 't' }, question: { zh: 't', en: 't' }, foundation: ['a', 'b'] }] },
    levels: [
      ['a', { ...level('a', { solution: counter }), adds: ['add', 'const', 'reg', 'keep'], builds: { type: 'count', name: { zh: 'n', en: 'n' }, desc: { zh: 'n', en: 'n' } } }],
      ['b', level('b', { withhold: withhold, solution })],
    ],
    glossary: { groups: [], entries: [] },
  })
  const fair = calculusCourse(content(['count'], counter))
  const task = fair.played.get('b')[0]
  const tray = Object.values(fair.offerIn(task, new Set(['count']))).flat()
  assert.ok(!tray.includes('count') && tray.includes('reg'))
  assert.deepEqual(fair.wrong, [])
  const caught = calculusCourse(content(['count'], ['p = count()', 'n <- p']))
  assert.ok(caught.wrong.some((w) => w.includes('uses count, which it withholds')))
})

test('reciprocal and less, and terms compared within a relative error', async () => {
  const { same } = await import('./run.js')
  assert.equal(PARTS.recip.eval({ a: 4 }), 0.25)
  assert.equal(PARTS.recip.eval({ a: 0 }), null)
  assert.equal(PARTS.less.eval({ a: 1, b: 2 }), 1)
  assert.equal(PARTS.less.eval({ a: 2, b: 2 }), 0)
  assert.ok(same(0.1 + 0.2, 0.3))
  assert.ok(!same(0.3, 0.3001))
  assert.ok(!same(null, 0))
})

test('the orbital distance factor follows the inverse square field and excludes the origin', () => {
  assert.equal(PARTS.gravity.eval({ x: 3, y: 4 }), 1 / 125)
  assert.equal(PARTS.gravity.eval({ x: 0, y: 2 }), 1 / 8)
  assert.equal(PARTS.gravity.eval({ x: 0, y: 0 }), null)
  assert.equal(PARTS.gravity.eval({ x: null, y: 1 }), null)
})

test('interval claims accept different valid radii and reject unsafe or negligible ones', () => {
  assert.equal(CLAIMS.lineDelta.judge({ m: -3, e: 0.4 }, { d: 0.1 }), null)
  assert.equal(CLAIMS.lineDelta.judge({ m: -3, e: 0.4 }, { d: 0.08 }), null)
  assert.match(CLAIMS.lineDelta.judge({ m: -3, e: 0.4 }, { d: 0.2 }).en, /exceeds/)
  assert.match(CLAIMS.lineDelta.judge({ m: 0, e: 0.4 }, { d: 1e-20 }).en, /too small/)
  assert.equal(CLAIMS.squareDelta.judge({ a: -2, e: 0.1 }, { d: 0.1 / 6 }), null)
  assert.match(CLAIMS.squareDelta.judge({ a: -2, e: 0.1 }, { d: 0.1 }).en, /exceeds/)
  assert.equal(CLAIMS.stepDelta.judge({ a: -0.5, e: 0.5 }, { d: 0.25 }), null)
  assert.match(CLAIMS.stepDelta.judge({ a: -0.5, e: 0.5 }, { d: 0.75 }).en, /jump/)
})

test('a step witness must lie inside every proposed neighbourhood and show the other value', () => {
  for (const d of [1, 0.1, 1e-8]) assert.equal(CLAIMS.stepWitness.judge({ d, e: 0.5 }, { x: -d / 2, y: 0 }), null)
  assert.match(CLAIMS.stepWitness.judge({ d: 0.1, e: 0.5 }, { x: -0.1, y: 0 }).en, /strictly/)
  assert.match(CLAIMS.stepWitness.judge({ d: 0.1, e: 0.5 }, { x: -0.05, y: 1 }).en, /step function/)
})

test('a semantic test judges the whole interval and reports the first failing tick', () => {
  const level = {
    inputs: [{ name: 'm', label: 'm' }, { name: 'e', label: 'ε' }], outputs: [{ name: 'd', label: 'δ' }],
    tests: [{ inputs: { m: [2, 2], e: [1, 0.1] }, check: 'lineDelta', ticks: 2 }],
  }
  const good = fromText(['c = const[value=0.25]()', 'r = mul(e, c)', 'd <- r'], level, plain)
  assert.equal(runLevel(level, good, partOf).pass, true)
  const bad = fromText(['d <- e'], level, plain)
  const result = runLevel(level, bad, partOf)
  assert.equal(result.pass, false)
  assert.equal(result.runs[0].fail.tick, 0)
  assert.match(result.runs[0].ticks[0].failed.en, /exceeds/)
  const named = { ...level, tests: [{ ...level.tests[0], check: { lineDelta: true } }] }
  assert.equal(runLevel(named, good, partOf).pass, true)
})
