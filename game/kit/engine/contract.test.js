// node --test (npm test, from trace-viewer) — the domain contract (contract.js) over every domain in kit/domains and
// every data game in the hub's list: a domain or a game that breaks it fails here, whatever `npm run check` says of
// its content.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { GAMES } from '../../games.js'
import { isDataGame, readContent } from './content-node.js'
import { audit } from '../course.js'
import { checkContent } from './vocabulary.js'
import { domainProblems, gameProblems, specProblems, validateProblems } from './contract.js'
import { closeGames, gameOf } from './games.mjs'

const DOMAINS = resolve(import.meta.dirname, '../domains')
const names = readdirSync(DOMAINS).filter((d) => existsSync(resolve(DOMAINS, d, 'domain.js')))
const games = GAMES.map((g) => g.id).filter((id) => isDataGame(id))
// The levels whose part does not run the board syncOwn hands it, each for a reason. The list only shrinks: a level
// whose part comes to run its board fails here until it is dropped.
const BUILT_IN = {
  // Built-in implementations, not the player's board (games/DIRECTION.md §2, 4); a level that packs its circuit runs it.
  'vision-complete': ['0-2', '0-4', '0-6', '1-1', '1-3', '1-4', '1-6', '1-7', '1-8', '2-1', '2-2', '2-5', '2-7', '2-11', '3-1', '3-3', '3-7', '4-2', '4-3', '4-5', '4-7', '4-8', '4-11', '4-13', '4-16', '5-1', '5-7', '6-1', '6-6', '6-8', '6-11', '7-1', '8-1', '8-4', '9-1'],
  // A gate runs the board kept for it only when that board passes its level (logic/gates.js), so a broken board is never
  // seen; resolution is the kit's card, the one exception to running the player's proof (games/DESIGN.md 6.3).
  qed: ['g-or', 'g-imp', 'g-iff', 'au-resolve'],
}

const load = async (name) => (await import(`../domains/${name}/domain.js`)).default

after(() => closeGames())

test('every domain gives the contract’s entries, and its vocabulary describes itself as data', async () => {
  assert.ok(names.length >= 6)
  for (const name of names) assert.deepEqual(domainProblems(name, await load(name)), [], name)
})

// A domain's starter game (what npm run new-game copies) is a game that passes everything a new game must.
for (const name of names.filter((d) => existsSync(resolve(DOMAINS, d, 'starter')))) {
  test(`${name}: its starter game fits the vocabulary, passes the audit and the contract`, async () => {
    const domain = await load(name)
    const content = readContent('starter', resolve(DOMAINS, name))
    assert.deepEqual(checkContent(domain.vocabulary, content), [])
    const spec = domain.spec(content)
    assert.deepEqual(audit(spec.course), [])
    assert.deepEqual(specProblems(domain, content, spec), [])
    assert.deepEqual((await domain.validate(spec)).filter((l) => l.fail), [])
    assert.deepEqual((await validateProblems(domain, content, spec)).problems, [])
  })
}

for (const id of games) {
  test(`${id}: its domain reads it, checks it and plays it as the contract says`, async () => {
    const content = readContent(id)
    assert.ok(names.includes(content.domain), `${id} is on ${content.domain}, which is no domain`)
    const domain = await load(content.domain)
    const spec = domain.spec(content)
    assert.deepEqual(specProblems(domain, content, spec), [])
    const { problems, builders, runsOwn } = await validateProblems(domain, content, spec)
    assert.deepEqual(problems, [])
    assert.deepEqual(builders.filter((l) => !runsOwn.includes(l)), BUILT_IN[id] ?? [], 'levels whose part does not run the board syncOwn gives it')
    assert.deepEqual(gameProblems(content, spec, await gameOf(content)), [])
  })
}
