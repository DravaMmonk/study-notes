// Logic capability contracts and deterministic core computation.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { moduleProblems, gameProblems } from '../../../games/kit/engine/contract.js'
import { createCapabilityRegistry } from 'kernel'
import logicModule from '../core/module.js'
const modules = [logicModule]
const capabilities = createCapabilityRegistry()
logicModule.register(capabilities)

const DOMAINS = resolve(import.meta.dirname, '..')
const names = ['core']
const load = async () => (await import('../core/runtime.js')).default


test('every registered module gives checkable, printable and playable capabilities', async () => {
  assert.ok(modules.length > 0, 'discover at least one module')
  for (const module of modules) assert.deepEqual(moduleProblems(module, capabilities, await load(module.id)), [], module.id)
})

// A verdict is a pure function of the content, the task and the board (games/DIRECTION.md, decision 13): what a
// domain computes (everything but its interface) reads no clock and no unseeded random source (engine/seed.js).
const IMPURE = /\bMath\.random\b|\bDate\.now\b|\bnew Date\b|\bperformance\.now\b/
const computed = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = resolve(dir, entry.name)
  if (entry.isDirectory()) return ['ui', 'starter', 'versions', 'conformance'].includes(entry.name) ? [] : computed(file)
  return entry.name.endsWith('.js') && !entry.name.endsWith('.test.js') ? [file] : []
})
test('no domain computes from a clock or an unseeded random source', () => {
  for (const name of names) {
    const impure = computed(resolve(DOMAINS, name)).flatMap((file) => readFileSync(file, 'utf8').split('\n').flatMap((line, k) => (IMPURE.test(line.replace(/\/\/.*$/, '')) ? [`${file.slice(DOMAINS.length + 1)}:${k + 1}`] : [])))
    assert.deepEqual(impure, [], name)
  }
})

test('the game contract checks the effective play of each task', () => {
  const text = { en: 'Test' }
  const content = { id: 'sample' }
  const spec = { levels: [{ id: 'first' }] }
  const game = {
    id: content.id,
    title: text, kicker: text, lede: text,
    chapters: [{ id: 0 }],
    levels: [{ id: 'first', chapter: 0, kind: 'board', tasks: [{ key: 'first' }, { key: 'audit', play: 'checks' }] }],
    kinds: { board: { Screen() {} } },
  }
  assert.deepEqual(gameProblems(content, spec, game), ['game.js: first/audit: the play checks has no Screen'])
  game.kinds.checks = { Screen() {} }
  assert.deepEqual(gameProblems(content, spec, game), [])
})
