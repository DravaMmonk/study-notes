import { test } from 'node:test'
import assert from 'node:assert/strict'
import { implementationProblems } from './dependencies.js'

test('standalone piece implementations cannot expand into themselves', () => {
  const piece = (dependency) => ({ inside: [{ reference: { solution: [`x = ${dependency}()`, 'out <- x'] } }] })
  assert.deepEqual(implementationProblems({ parts: { a: piece('b'), b: piece('a') } }), [
    { at: 'pieces.json.parts', says: 'circular piece implementations: a → b → a' },
  ])
  assert.deepEqual(implementationProblems({ parts: { a: piece('b'), b: piece('primitive') } }), [])
})
