import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { newPackage, gameOnPackage } from './scaffold.js'
import { proofsRoot } from './ops/fixture.js'
import { readPackage, readContent } from './resolver.js'

const roots = []
after(() => roots.forEach(root => rmSync(root, { recursive: true, force: true })))

test('packages start empty or copy installed objects without a template catalog', () => {
  const root = mkdtempSync(join(tmpdir(), 'new-package-'))
  roots.push(root)
  newPackage({ root, id: 'sample', empty: true })
  assert.equal(readPackage('sample', root).levels.length, 0)
  newPackage({ root, id: 'copy', from: 'sample' })
  assert.equal(readPackage('copy', root).id, 'copy')
  assert.throws(() => newPackage({ root, id: 'missing' }), /choose --from/)
  assert.throws(() => newPackage({ root, id: 'copy', empty: true }), /there already/)
})

test('games copy installed selections and settings with an empty chapter', () => {
  const { root, id } = proofsRoot()
  roots.push(root)
  gameOnPackage({ root, id: 'sample', from: id, title: 'Sample' })
  const content = readContent('sample', root)
  assert.deepEqual(content.sourceChapters[0].levels, [])
  assert.equal(content.title.en, 'Sample')
  assert.throws(() => gameOnPackage({ root, id: 'sample', from: id }), /there already/)
})
