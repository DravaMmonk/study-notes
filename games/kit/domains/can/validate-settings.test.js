import { test } from 'node:test'
import { deepStrictEqual } from 'node:assert'
import { inaccessibleSettings } from './validate.js'

test('reference settings must be reachable in the editor', () => {
  const board = { nodes: [
    { type: 'reg', params: { reg: 'H', start: '-1' } },
    { type: 'keep', params: { reg: 'A' } },
    { type: 'const', params: { value: '32768' } },
  ] }
  deepStrictEqual(inaccessibleSettings(board), [])
  board.nodes.push({ type: 'reg', params: { reg: 'Z' } }, { type: 'const', params: { value: 'Infinity' } })
  deepStrictEqual(inaccessibleSettings(board), ['register Z is not available in the editor', 'constant is not a finite number'])
})
