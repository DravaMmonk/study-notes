// node --test (npm test) — how the kit shows values, as data (views.js): a task's rows, and a value content writes.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readShow, rowProblems, rowsOf, showProblems, usable, valueText, viewsProblems } from './views.js'

const entries = [
  { of: 'a', label: 'a', shape: 'scalar', given: 1, shown: false },
  { of: 'img', label: 'img', shape: 'grid', got: null, want: null },
  { of: 'w', label: 'w', shape: 'bits', given: [0, 1] },
]

test('a task without rows shows what its domain shows by default, each shape in the game’s views or the library’s first', () => {
  assert.deepEqual(rowsOf(undefined, entries, { grid: ['pixels', 'numbers'] }).map((r) => [r.entry.of, r.views]), [['img', ['pixels', 'numbers']], ['w', ['wave']]])
  assert.deepEqual(rowsOf([{ of: 'a', label: 'A' }], entries, null).map((r) => [r.entry.label, r.views]), [['A', ['value']]])
})

test('rows name what a task offers, in views that draw it; a game’s defaults draw their shapes', () => {
  assert.deepEqual(rowProblems([{ of: 'img', views: ['numbers', 'wave'] }, { of: 'nope' }], entries, null), ['results: "img" is grid, which wave does not draw', 'results: no "nope" to show (a, img, w)'])
  assert.deepEqual(viewsProblems({ grid: ['numbers'], bits: ['value'] }), ['views: value does not draw bits'])
})

test('a view draws only the values it fits: a plot a grey grid of one or two rows, a profile and a terrain one of several', () => {
  const row = { w: 8, h: 1, c: 1, data: Array(8).fill(0) }
  const square = { w: 4, h: 4, c: 1, data: Array(16).fill(0) }
  const all = ['numbers', 'plot', 'profile', 'surface']
  assert.deepEqual(usable(all, row), ['numbers', 'plot'])
  assert.deepEqual(usable(all, square), ['numbers', 'profile', 'surface'])
  assert.deepEqual(usable(all, { ...square, c: 3, data: Array(48).fill(0) }), ['numbers'])
  const signal = [{ of: 'out', label: 'out', shape: 'grid', got: null, want: row }]
  assert.deepEqual(rowsOf(undefined, signal, { grid: ['profile', 'plot', 'numbers'] })[0].views, ['plot', 'numbers'])
  assert.deepEqual(rowProblems([{ of: 'out', views: ['surface', 'numbers'] }], signal, null), ['results: "out" lists surface, which cannot draw its value'])
  assert.deepEqual(rowProblems([{ of: 'out', views: ['surface'] }], signal, null), ['results: "out" lists surface, which cannot draw its value', 'results: "out" has no view that draws its value'])
})

test('a value content writes is read for drawing, and checked', () => {
  assert.deepEqual(readShow({ shape: 'grid', value: [[1, 2], [3, 4]] }).value, { w: 2, h: 2, c: 1, data: [1, 2, 3, 4] })
  assert.deepEqual(readShow({ shape: 'grid', value: [[[1, 0, 0]]] }).value, { w: 1, h: 1, c: 3, data: [1, 0, 0] })
  assert.deepEqual(readShow({ shape: 'bits', value: '01.' }).value, [0, 1, null])
  assert.deepEqual(showProblems({ shape: 'grid', value: [[1, 2], [3]], views: ['wave'] }), ['show is grid, which wave does not draw', "show: a grid's rows are all as long, and its cells all numbers or all [R, G, B]"])
  assert.deepEqual(showProblems({ shape: 'bits', value: '012' }), ['show: bits are written in 0, 1 and .'])
})

test('a value in words: none, yes or no, a number without its float noise', () => {
  assert.equal(valueText(null), '—')
  assert.deepEqual(valueText(true), { zh: '是', en: 'yes' })
  assert.equal(valueText(0.1 + 0.2), '0.3')
})
