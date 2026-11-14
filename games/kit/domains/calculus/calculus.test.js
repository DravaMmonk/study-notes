// node --test (npm test) — the calculus domain: its parts, a board keeping a register to give the term before, a test
// that wants the wrong term failing at that term, boards as blueprint text, and its starter game (starter/, what
// npm run new-game copies) passing its own checks.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PARTS } from './parts.js'
import { board } from './board.js'
import { primitivesOnly } from '../../engine/board-cards.js'
import { runLevel } from './run.js'
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
  const { at, want, got } = runLevel(wrong, made, partOf).runs[0].fail
  assert.deepEqual({ at, want, got }, { at: { tick: 2, id: 'n' }, want: 3, got: 2 })
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
