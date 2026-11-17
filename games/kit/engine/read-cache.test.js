import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, renameSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { withReadCache, memoResolution } from './read-cache.js'

test('read requests reuse resolutions, isolate returned data and invalidate changed inputs', async () => {
  const root = mkdtempSync(resolve(tmpdir(), 'author-cache-'))
  try {
    mkdirSync(resolve(root, 'packages'))
    const file = resolve(root, 'packages/input.json')
    writeFileSync(file, 'a')
    let runs = 0
    const fn = () => true
    const read = () => withReadCache(root, async () => {
      await Promise.resolve()
      return memoResolution('test', () => ({ count: ++runs, nested: [1], fn }))
    })
    const first = await read()
    first.nested.push(2)
    assert.deepEqual(await read(), { count: 1, nested: [1], fn })
    writeFileSync(file, 'b')
    assert.equal((await read()).count, 2)
    renameSync(file, `${file}.renamed`)
    assert.equal((await read()).count, 3)
    rmSync(`${file}.renamed`)
    assert.equal((await read()).count, 4)
    assert.equal(memoResolution('test', () => 'outside'), 'outside')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('cached resolution preserves assembly and observes edits, additions and deletions', async () => {
  const { readPackage } = await import('./resolver.js')
  const root = mkdtempSync(resolve(tmpdir(), 'resolved-cache-'))
  const folder = resolve(root, 'packages/library')
  mkdirSync(resolve(folder, 'entries'), { recursive: true })
  writeFileSync(resolve(folder, 'package.json'), JSON.stringify({ version: '1.0.0', kernel: '^0.0.0', uses: {} }))
  const file = resolve(folder, 'entries/one.json')
  const put = title => writeFileSync(file, JSON.stringify({ title: { en: title }, body: [] }))
  const cached = () => withReadCache(root, () => readPackage('library', root))
  try {
    put('First')
    assert.deepEqual(cached(), readPackage('library', root))
    const first = cached()
    first.registries.entry['library/one'].body.push('caller edit')
    assert.deepEqual(cached(), readPackage('library', root))
    put('Other')
    assert.deepEqual(cached(), readPackage('library', root))
    assert.equal(cached().registries.entry['library/one'].title.en, 'Other')
    rmSync(file)
    assert.deepEqual(cached(), readPackage('library', root))
    assert.equal(cached().registries.entry['library/one'], undefined)
    put('Again')
    assert.deepEqual(cached(), readPackage('library', root))
    assert.equal(cached().registries.entry['library/one'].title.en, 'Again')
  } finally { rmSync(root, { recursive: true, force: true }) }
})
