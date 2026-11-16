import { test } from 'node:test'
import assert from 'node:assert/strict'
import { imageKit } from './engine/kit.js'
import { NODE_TYPES } from './engine/nodes.js'

const kit = imageKit(NODE_TYPES)
const settingsOf = (board) => Object.fromEntries(board.nodes.flatMap(({ id, type, params }) => (
  type === 'input' || type === 'output' ? [] : [[id, params]]
)))

test('blueprints preserve typed numbers and kernel weights at full precision', () => {
  const weights = [1 / 9, 2 / 7, -1e-7, 0, 0, 0, 0, 0, 0]
  const board = kit.fromText(['a = image:const()', 'k = image:kernel3(a)', 'out <- k'])
  board.nodes.find(({ id }) => id === 'a').params.c = 1 / 3
  board.nodes.find(({ id }) => id === 'k').params.w = weights
  assert.deepEqual(settingsOf(kit.fromText(kit.toText(board))), settingsOf(board))
})

test('blueprints use pi notation only when it restores the same number', () => {
  const board = kit.fromText(['exact = image:const[c="-3pi/4"]()', 'near = image:const()', 'out <- near'])
  const near = Math.PI + 1e-7
  board.nodes.find(({ id }) => id === 'near').params.c = near
  const lines = kit.toText(board)
  assert.match(lines.join('\n'), /exact = image:const\[c="-3pi\/4"\]/)
  assert.deepEqual(settingsOf(kit.fromText(lines)), { exact: { c: -3 * Math.PI / 4 }, near: { c: near } })
})
