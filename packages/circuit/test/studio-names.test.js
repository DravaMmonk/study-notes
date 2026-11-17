import test from 'node:test'
import assert from 'node:assert/strict'
import { partMeaning } from '../core/content-meaning.js'
import { refProblems } from '../../../games/kit/engine/text.js'

test('package authoring names resolve the same component links as the game', () => {
  const content = { partDefs: { parts: { 'sample/join': { name: { en: 'Join' } } } } }
  const { parts } = partMeaning.namesForTool({ content })
  const names = { part: new Map(parts.map(part => [part.key, part.name.en])) }
  assert.deepEqual(refProblems('<part-ref to="part:sample/join"></part-ref>', '', names), [])
  assert.equal(parts[0].part, 'sample/join')
})
