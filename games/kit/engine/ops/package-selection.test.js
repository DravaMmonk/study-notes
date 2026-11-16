// Exercise the public CLI against temporary content, never checked-in games.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { proofsRoot } from './fixture.js'

test('CLI lists and applies game package operations through the shared registry', () => {
  const { root, id } = proofsRoot()
  mkdirSync(join(root, 'packages/library'), { recursive: true })
  writeFileSync(join(root, 'packages/library/package.json'), JSON.stringify({ vocabulary: 1 }))
  const cli = (...args) => execFileSync(process.execPath, [join(import.meta.dirname, 'cli.js'), ...args], { env: { ...process.env, GAMES_ROOT: root }, encoding: 'utf8' })
  const operations = cli('list')
  assert.match(operations, /game\.package\.add/)
  assert.match(operations, /game\.package\.remove/)
  const original = readFileSync(join(root, 'games', id, 'game.json'), 'utf8')
  cli(id, 'game.package.add', 'package=library', '--why', 'Select test library')
  assert.deepEqual(JSON.parse(readFileSync(join(root, 'games', id, 'game.json'))).packages, [id, 'library'])
  cli(id, 'game.package.remove', 'package=library', '--why', 'Remove test library')
  assert.equal(readFileSync(join(root, 'games', id, 'game.json'), 'utf8'), original)
})
