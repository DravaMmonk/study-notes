// node --test (npm test, from trace-viewer) — the domain contract (contract.js) over every domain in kit/domains, its
// starter game, and every data game in the hub's list, game by game without naming a level: a domain or a game that
// breaks it fails here, whatever `npm run check` says of its content. Exceptions are the domain's to declare (a spec's
// builtIn parts), never this file's.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { Worker } from 'node:worker_threads'
import { GAMES } from '../../games.js'
import { isDataGame, readContent } from './content-node.js'
import { audit } from '../course.js'
import { checkContent } from './vocabulary.js'
import { domainProblems, gameProblems, specProblems, validateProblems } from './contract.js'
import { closeGames, gameOf } from './games.mjs'

const DOMAINS = resolve(import.meta.dirname, '../domains')
const names = readdirSync(DOMAINS).filter((d) => existsSync(resolve(DOMAINS, d, 'domain.js')))
const games = GAMES.map((g) => g.id).filter((id) => isDataGame(id))
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
    assert.deepEqual(checkContent(domain, content), [])
    const spec = domain.spec(content)
    assert.deepEqual(audit(spec.course), [])
    assert.deepEqual(specProblems(domain, content, spec), [])
    assert.deepEqual((await domain.validate(spec)).filter((l) => l.fail), [])
    assert.deepEqual((await validateProblems(domain, content, spec)).problems, [])
  })
}

// Each game plays in a worker of its own (contract-game.js), all started at once: the games are heavy and independent.
// A run settles to its problems or its error, so a worker that fails before its test is reached still fails that test.
const runs = new Map(games.map((id) => [id, new Promise((done) => {
  new Worker(new URL('./contract-game.js', import.meta.url), { workerData: id })
    .once('message', done).once('error', (error) => done({ error }))
})]))
for (const id of games) {
  test(`${id}: its domain reads it, checks it and plays it as the contract says`, async () => {
    const { error, domain, spec, validate, game } = await runs.get(id)
    if (error) throw error
    assert.ok(names.includes(domain), `${id} is on ${domain}, which is no domain`)
    assert.deepEqual(spec, [])
    // A builder level whose part does not run the board syncOwn hands it is one whose parts the spec lists as builtIn.
    assert.deepEqual(validate, [])
    assert.deepEqual(game, [])
  })
}
