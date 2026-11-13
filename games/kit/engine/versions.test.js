// node --test games/kit/engine — a vocabulary's versions: each kept as printed, each only adding to the one before.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { S } from './schema.js'
import { additionProblems, defineVocabulary, describe } from './vocabulary.js'
import { versionProblems, vocabularyDirs } from './versions.js'

const v1 = defineVocabulary({ domain: 'toy', version: 1, kinds: { world: { line: { about: 'a line' } } }, game: S.obj({ title: S.text() }), level: S.obj({ mode: S.oneOf(['run', 'read']), n: S.int() }) })
const next = (changes) => describe({ ...v1, version: 2, ...changes })

test('a version may add items, values and optional fields, and nothing else', () => {
  assert.deepEqual(additionProblems(describe(v1), next({ kinds: { world: { line: { about: 'a line' }, grid: { about: 'a grid' } } }, level: S.obj({ mode: S.oneOf(['run', 'read', 'fly']), n: S.int(), tip: S.opt(S.text()) }) })), [])
  assert.match(additionProblems(describe(v1), next({ kinds: { world: {} } }))[0], /world\.line is gone/)
  assert.match(additionProblems(describe(v1), next({ level: S.obj({ mode: S.oneOf(['run']), n: S.int() }) }))[0], /values\[1\].*is gone/)
  assert.match(additionProblems(describe(v1), next({ level: S.obj({ mode: S.oneOf(['run', 'read']), n: S.int(), tip: S.text() }) }))[0], /fields\.tip is new and not optional/)
  assert.match(additionProblems(describe(v1), next({ level: S.obj({ mode: S.oneOf(['run', 'read']), n: S.int({ min: 1 }) }) }))[0], /\.min is a new bound/)
  assert.match(additionProblems(describe(v1), next({ level: S.obj({ mode: S.oneOf(['run', 'read']), n: S.str() }) }))[0], /"int" became "str"/)
})

test('every vocabulary is the version it says, kept, and every version only adds to the one before', async () => {
  for (const dir of vocabularyDirs()) {
    const { vocabulary } = await import(resolve(dir, 'vocabulary.js'))
    assert.deepEqual(versionProblems(dir, vocabulary), [], dir)
  }
})

test('adding an alternative preserves the existing schema', () => {
  const before = S.obj({ value: S.int() })
  assert.deepEqual(additionProblems(before, S.either(before, S.obj({ label: S.str() }))), [])
  assert.notDeepEqual(additionProblems(before, S.either(S.obj({ value: S.str() }), S.obj({ label: S.str() }))), [])
})
