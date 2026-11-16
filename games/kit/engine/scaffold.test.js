// Installed mechanism starters remain usable through the game creation entry point.
import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { GAMES_DIR, readContent, runtimeOf } from './content-node.js'
import { templates, newGame, newPackage } from './scaffold.js'
import { checkContent } from './vocabulary.js'
import { closeGames } from './games.mjs'
import { checkGame } from './checks.js'
import { readPackage } from './content-node.js'
import { audit } from '../course.js'

after(closeGames)

for (const mechanism of templates()) test(`${mechanism}: the installed module starter creates a working game`, async () => {
  const root = mkdtempSync(join(tmpdir(), 'module-starter-'))
  try {
    cpSync(join(GAMES_DIR, 'kit'), join(root, 'games/kit'), { recursive: true })
    writeFileSync(join(root, 'games/games.js'), 'export const GAMES = [\n];\n')
    newPackage({ root, id: 'library', template: mechanism })
    const library = readPackage('library', root)
    assert.deepEqual((await checkGame(library, { domain: await runtimeOf(library), root })).filter(line => line.fail), [])
    newGame({ root, id: 'sample', template: mechanism, title: 'Sample' })
    assert.throws(() => newGame({ root, id: 'sample', template: mechanism }), /there already/)
    const content = readContent('sample', root)
    const domain = await runtimeOf(content)
    assert.deepEqual(checkContent(domain, content), [])
    const spec = domain.spec(content)
    assert.deepEqual(audit(spec.course), [])
    assert.deepEqual((await domain.validate(spec)).filter((line) => line.fail), [])
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
