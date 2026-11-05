// node --test (npm test) — the scaffold (scaffold.js): in a copy of the kit, every mechanism's template makes a domain
// and a starter game that pass the domain contract (contract.js), the course audit and the domain's own unit test; a
// second game on that domain does too. (Building it and playing it in a browser is the author's step, games/DESIGN.md 7.)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { GAMES_ROOT, mechanisms, newDomain, newGame } from './scaffold.js'

// A domain name and game ids the kit has none of yet.
let k = 1
while (existsSync(join(GAMES_ROOT, 'kit/domains', `scaffold${k}`)) || existsSync(join(GAMES_ROOT, `scaffold${k}`))) k += 1
const name = `scaffold${k}`

for (const mechanism of mechanisms()) {
  test(`${mechanism}: a new domain and its games pass the contract`, async () => {
    const root = mkdtempSync(join(tmpdir(), 'scaffold-'))
    try {
      cpSync(join(GAMES_ROOT, 'kit'), join(root, 'kit'), { recursive: true })
      cpSync(join(GAMES_ROOT, 'games.js'), join(root, 'games.js'))
      newDomain({ root, name, mechanism })
      newGame({ root, id: `${name}-two`, domain: name, title: 'Two' })
      assert.throws(() => newDomain({ root, name, mechanism }), /there already/)
      assert.throws(() => newGame({ root, id: `${name}-two`, domain: name }), /there already/)
      assert.throws(() => newDomain({ root, name: 'other', mechanism: 'nothing' }), /no template/)
      // A game folder holding only its design docs takes the game; one holding a game refuses, and writes no domain.
      mkdirSync(join(root, `${name}-docs`))
      writeFileSync(join(root, `${name}-docs/DESIGN.md`), '# sketch\n')
      newGame({ root, id: `${name}-docs`, domain: name })
      assert.ok(existsSync(join(root, `${name}-docs/game.json`)) && existsSync(join(root, `${name}-docs/DESIGN.md`)))
      assert.throws(() => newDomain({ root, name: 'other', mechanism, game: `${name}-two` }), /there already/)
      assert.ok(!existsSync(join(root, 'kit/domains/other')))
      assert.match(readFileSync(join(root, 'games.js'), 'utf8'), new RegExp(`id: '${name}-two', href: '${name}-two/index.html', title: 'Two'.*hidden: true`, 's'))

      const kit = (file) => import(pathToFileURL(join(root, 'kit', file)).href)
      const { readContent } = await kit('engine/content-node.js')
      const { checkContent } = await kit('engine/vocabulary.js')
      const { audit } = await kit('course.js')
      const contract = await kit('engine/contract.js')
      const domain = (await kit(`domains/${name}/domain.js`)).default
      assert.deepEqual(contract.domainProblems(name, domain), [])
      for (const id of [name, `${name}-two`, `${name}-docs`]) {
        const content = readContent(id, root)
        assert.deepEqual(checkContent(domain, content), [])
        const spec = domain.spec(content)
        assert.deepEqual(audit(spec.course), [])
        assert.deepEqual(contract.specProblems(domain, content, spec), [])
        const { problems, builders, runsOwn } = await contract.validateProblems(domain, content, spec)
        assert.deepEqual(problems, [])
        assert.deepEqual(runsOwn, builders)
        assert.deepEqual((await domain.validate(spec)).filter((l) => l.fail), [])
      }
      // Run as a test run of its own: under this one (NODE_TEST_CONTEXT set) it would report here and always exit 0.
      const { NODE_TEST_CONTEXT: _, ...env } = process.env
      execFileSync(process.execPath, ['--test', join(root, `kit/domains/${name}/${name}.test.js`)], { stdio: 'pipe', env })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
}
