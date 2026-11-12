import { test } from 'node:test'
import { deepStrictEqual } from 'node:assert'
import { paperAnswers, paperMatches, paperProblems } from './paper.js'

test('paper answers follow wired-AND, byte notation and the idle rule', () => {
  const line = { mode: 'line', cases: [{ a: [1, 0, 1], b: [0, 1, 1] }], solution: ['001'] }
  deepStrictEqual(paperAnswers(line), ['001'])
  deepStrictEqual(paperMatches(line, ['0 0 1']), [true])
  deepStrictEqual(paperProblems(line), [])
  const binary = { mode: 'binary', cases: [{ value: 45 }], solution: ['00101101 2D'] }
  deepStrictEqual(paperAnswers(binary), ['00101101 2D'])
  deepStrictEqual(paperMatches(binary, ['00101101 2d']), [true])
  const start = { mode: 'start', cases: [{ bits: [...Array(11).fill(1), 0, 1, 0] }], solution: ['11'] }
  deepStrictEqual(paperAnswers(start), ['11'])
  deepStrictEqual(paperProblems({ ...start, solution: ['13'] }), ['paper reference answers do not match the cases'])
})
