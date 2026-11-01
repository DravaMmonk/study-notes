// node --test games/kit/engine/ops — content files as text: the house style, a file rewritten only where its value
// changed, and the diff that previews it.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { GAMES_DIR } from '../content-node.js'
import { WIDTH, writeJson } from './json.js'
import { lineDiff, unified } from './diff.js'

const files = readdirSync(GAMES_DIR).filter((g) => existsSync(resolve(GAMES_DIR, g, 'game.json'))).flatMap((g) => [
  resolve(GAMES_DIR, g, 'game.json'), resolve(GAMES_DIR, g, 'glossary.json'),
  ...readdirSync(resolve(GAMES_DIR, g, 'levels')).map((f) => resolve(GAMES_DIR, g, 'levels', f)),
])

test('every content file is written back as it is', () => {
  assert.ok(files.length > 100)
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    assert.equal(writeJson(JSON.parse(text), text), text, file)
  }
})

test('new content is in the house style: one line when it fits, open otherwise', () => {
  assert.equal(writeJson({ a: [1, 2], b: { c: 'd' }, e: [], f: {} }), '{ "a": [1, 2], "b": { "c": "d" }, "e": [], "f": {} }\n')
  const long = { title: { zh: '甲'.repeat(40), en: 'a'.repeat(60) }, n: 1 }
  const text = writeJson(long)
  assert.equal(text, `{\n  "title": {\n    "zh": "${'甲'.repeat(40)}",\n    "en": "${'a'.repeat(60)}"\n  },\n  "n": 1\n}\n`)
  assert.ok(text.split('\n').every((line) => [...line].length <= WIDTH))
})

test('a change touches only the lines of what changed', () => {
  const old = '{\n  "a": {"x": 1,   "y": [1,2]},\n  "b": [\n    "keep",\n    "me"\n  ],\n  "c": 3\n}\n'
  const value = JSON.parse(old)
  value.c = 4
  value.b.push('too')
  // "a" keeps its own (odd) spacing; "b" stays open, with one line more; "c" changes in place.
  assert.equal(writeJson(value, old), '{\n  "a": {"x": 1,   "y": [1,2]},\n  "b": [\n    "keep",\n    "me",\n    "too"\n  ],\n  "c": 4\n}\n')
})

test('a diff keeps the common lines and marks the rest', () => {
  assert.deepEqual(lineDiff('a\nb\nc', 'a\nx\nc'), [[' ', 'a'], ['-', 'b'], ['+', 'x'], [' ', 'c']])
  assert.equal(unified('f', 'a\nb\nc\n', 'a\nb\nc\n'), '')
  assert.equal(unified('f', '1\n2\n3\n4\n5\n6\n7\n8\n9\n', '1\n2\n3\n4\nfive\n6\n7\n8\n9\n'), ['--- a/f', '+++ b/f', '@@ -2,7 +2,7 @@', ' 2', ' 3', ' 4', '-5', '+five', ' 6', ' 7', ' 8'].join('\n'))
  assert.match(unified('f', null, 'x\n'), /^--- \/dev\/null\n\+\+\+ b\/f/)
})
