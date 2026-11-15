import assert from 'node:assert/strict'
import { test } from 'node:test'
import { all, atom, bin } from './formula.js'
import { sentenceLanguage } from './sentenceLanguage.js'

test('a formula variable is accepted within its own region or in the surrounding scope', () => {
  const tree = bin('∧', all('x', atom('P', [null])), atom('P', [null]))
  const x = { kind: 'term', group: 'var', text: 'x' }
  const y = { ...x, text: 'y' }
  const language = sentenceLanguage({}, 'formula', ['y'])
  assert.equal(language.refuse(tree, [0, 0, 0], x), null)
  assert.ok(language.refuse(tree, [1, 0], x))
  assert.equal(language.refuse(tree, [1, 0], y), null)
})
