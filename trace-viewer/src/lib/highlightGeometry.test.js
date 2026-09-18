import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeHighlightRects } from './highlightGeometry.js'

const rect = (left, top, right, bottom) => ({ left, top, right, bottom })

test('a tall fraction and its adjacent baseline text share one band', () => {
  assert.deepEqual(mergeHighlightRects([
    rect(10, 20, 45, 40), rect(50, 0, 90, 55), rect(95, 20, 105, 40),
  ]), [rect(10, 0, 105, 55)])
})

test('wrapped prose keeps its partial first and last lines separate', () => {
  assert.deepEqual(mergeHighlightRects([
    rect(100, 0, 200, 20), rect(200, 0, 300, 20),
    rect(0, 32, 300, 52), rect(0, 64, 75, 84),
  ]), [rect(100, 0, 300, 20), rect(0, 32, 300, 52), rect(0, 64, 75, 84)])
})

test('superscripts join their line without filling the gap to the next line', () => {
  assert.deepEqual(mergeHighlightRects([
    rect(15, 10, 22, 25), rect(0, 20, 15, 40), rect(0, 55, 50, 75),
  ]), [rect(0, 10, 22, 40), rect(0, 55, 50, 75)])
})
