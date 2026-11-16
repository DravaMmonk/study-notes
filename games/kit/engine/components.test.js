import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = resolve(dir, entry.name)
  return entry.isDirectory() ? files(file) : /\.(jsx?|css)$/.test(entry.name) ? [file] : []
})

test('shared renderers import no module UI or module styles', () => {
  const root = resolve(import.meta.dirname, '..')
  for (const directory of ['shell', 'views', 'circuit']) for (const file of files(resolve(root, directory))) {
    const source = readFileSync(file, 'utf8')
    assert.doesNotMatch(source, /(?:from\s*|import\s*|@import\s*)['"][^'"]*\/modules\//, file)
  }
})
