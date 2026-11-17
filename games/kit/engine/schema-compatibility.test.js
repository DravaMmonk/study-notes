// Structural compatibility preserves accepted schemas and reports narrowed contracts.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { S } from './schema.js'
import { defineVocabulary, describe } from './vocabulary.js'
import { structureProblems } from './release-data.js'

const v1 = defineVocabulary({ module: 'toy', kinds: { world: { line: { about: 'a line' } } }, game: S.obj({ title: S.text() }), level: S.obj({ mode: S.oneOf(['run', 'read']), n: S.int() }) })
const next = (changes) => describe({ ...v1, ...changes })

test('a version may add items, values and optional fields, and nothing else', () => {
  assert.deepEqual(structureProblems(describe(v1), next({ kinds: { world: { line: { about: 'a line' }, grid: { about: 'a grid' } } }, level: S.obj({ mode: S.oneOf(['run', 'read', 'fly']), n: S.int(), tip: S.opt(S.text()) }) })), [])
  assert.match(structureProblems(describe(v1), next({ kinds: { world: {} } }))[0], /world\.line is gone/)
  assert.match(structureProblems(describe(v1), next({ level: S.obj({ mode: S.oneOf(['run']), n: S.int() }) }))[0], /values\[1\].*is gone/)
  assert.match(structureProblems(describe(v1), next({ level: S.obj({ mode: S.oneOf(['run', 'read']), n: S.int(), tip: S.text() }) }))[0], /fields\.tip is new and not optional/)
  assert.match(structureProblems(describe(v1), next({ level: S.obj({ mode: S.oneOf(['run', 'read']), n: S.int({ min: 1 }) }) }))[0], /\.min is a new bound/)
  assert.match(structureProblems(describe(v1), next({ level: S.obj({ mode: S.oneOf(['run', 'read']), n: S.str() }) }))[0], /"int" became "str"/)
  // Keys made to name items narrow a map as a pattern does.
  assert.match(structureProblems(describe(S.map(S.int())), describe(S.map(S.int(), { key: S.ref('world') })))[0], /\.key is a new bound/)
})

test('adding an alternative preserves the existing schema', () => {
  const before = S.obj({ value: S.int() })
  assert.deepEqual(structureProblems(before, S.either(before, S.obj({ label: S.str() }))), [])
  assert.notDeepEqual(structureProblems(before, S.either(S.obj({ value: S.str() }), S.obj({ label: S.str() }))), [])
})

