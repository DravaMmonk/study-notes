import { test } from 'node:test'
import assert from 'node:assert/strict'
import { implementationProblems } from './dependencies.js'

test('standalone part implementations cannot expand into themselves', () => {
  const part = (dependency) => ({ inside: [{ reference: { solution: [`x = ${dependency}()`, 'out <- x'] } }] })
  assert.deepEqual(implementationProblems({ parts: { a: part('b'), b: part('a') } }), [
    { at: 'parts', says: 'circular part implementations: a → b → a' },
  ])
  assert.deepEqual(implementationProblems({ parts: { a: part('b'), b: part('primitive') } }), [])
})
