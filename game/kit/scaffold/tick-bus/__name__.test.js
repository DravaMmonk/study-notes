// node --test (npm test) — the __name__ domain: the line's rule, what a level wants tick by tick, a board that talks
// and keeps a register, boards as blueprint text, and its starter game (starter/, what npm run new-game copies)
// passing its own checks.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bitsOf, lineOf } from './line.js'
import { PARTS } from './parts.js'
import { fromText, toText } from './board.js'
import { runLevel } from './run.js'
import { wantOf } from './wants.js'
import domain from './domain.js'

const partOf = (type) => PARTS[type]

test('the line is 1 when anyone says 1', () => {
  assert.equal(lineOf([0, 1, undefined]), 1)
  assert.equal(lineOf([0, undefined]), 0)
  assert.deepEqual(bitsOf('01.'), [0, 1, undefined])
})

test('a board keeps a register and says it a tick late', () => {
  const inputs = { b: [1, 0, 1] }
  const level = { talks: true, inputs: [{ name: 'b', label: 'b' }], want: wantOf({ say: { delayed: { input: 'b', first: 0 } } }), tests: [{ line: bitsOf('...'), inputs }] }
  const lines = ['r = reg[reg=A, start=0]()', 'k = keep[reg=A](b)', 'say <- r']
  const board = fromText(lines, level, partOf)
  const run = runLevel(level, board, partOf)
  assert.equal(run.pass, true)
  assert.deepEqual(run.runs[0].ticks.map((t) => t.said), [0, 1, 0])
  // Written out and read back, a board writes the same text again.
  const text = toText(board, partOf)
  assert.deepEqual(toText(fromText(text, level, partOf), partOf), text)
  assert.throws(() => fromText(['x = counter(b)'], level, partOf), (e) => e.line === 1)
})

test('a board that says what it hears this very tick has a loop', () => {
  const level = { listens: true, talks: true, want: wantOf({ say: 'line' }), tests: [{ line: bitsOf('01') }] }
  assert.ok(runLevel(level, fromText(['say <- line'], level, partOf), partOf).runs[0].error)
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
