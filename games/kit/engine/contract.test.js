// node --test (npm test, from trace-viewer) — the domain contract (contract.js) over every domain in kit/domains and
// its starter game, without naming a level: a domain that breaks it fails here. The real games are the studio's to
// keep within the contract (its operations check every change), not this test's. Exceptions are the domain's to
// declare (a spec's builtIn parts), never this file's.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { readContent } from './content-node.js'
import { audit } from '../course.js'
import { checkContent } from './vocabulary.js'
import { domainProblems, gameProblems, specProblems, validateProblems } from './contract.js'
import { closeGames, gameOf } from './games.mjs'

const DOMAINS = resolve(import.meta.dirname, '../domains')
const names = readdirSync(DOMAINS).filter((d) => existsSync(resolve(DOMAINS, d, 'domain.js')))
const load = async (name) => (await import(`../domains/${name}/domain.js`)).default

after(() => closeGames())

test('every domain gives the contract’s entries, and its vocabulary describes itself as data', async () => {
  assert.ok(names.length >= 6)
  for (const name of names) assert.deepEqual(domainProblems(name, await load(name)), [], name)
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

// A domain's starter game (what npm run new-game copies) is a game that passes everything a new game must, and the
// game its domain describes for the shell is the one its content says.
for (const name of names.filter((d) => existsSync(resolve(DOMAINS, d, 'starter')))) {
  test(`${name}: its starter game fits the vocabulary, passes the audit and the contract`, async () => {
    const domain = await load(name)
    const content = readContent('starter', resolve(DOMAINS, name))
    assert.deepEqual(checkContent(domain, content), [])
    const spec = domain.spec(content)
    assert.deepEqual(audit(spec.course), [])
    assert.deepEqual(specProblems(domain, content, spec), [])
    assert.deepEqual((await domain.validate(spec)).filter((l) => l.fail), [])
    assert.deepEqual((await validateProblems(domain, content, spec)).problems, [])
    assert.deepEqual(gameProblems(content, spec, await gameOf(content)), [])
  })
}

