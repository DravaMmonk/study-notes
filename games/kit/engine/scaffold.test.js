// Installed mechanism starters remain usable through the game creation entry point.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { GAMES_DIR, readContent, runtimeOf } from './content-node.js'
import { mechanisms, newGame } from './scaffold.js'
import { checkContent } from './vocabulary.js'
import { audit } from '../course.js'

for (const mechanism of mechanisms()) test(`${mechanism}: the installed module starter creates a working game`, async () => {
  const root = mkdtempSync(join(tmpdir(), 'module-starter-'))
  try {
    cpSync(join(GAMES_DIR, 'kit'), join(root, 'games/kit'), { recursive: true })
    writeFileSync(join(root, 'games/games.js'), 'export const GAMES = [\n];\n')
    newGame({ root, id: 'sample', domain: mechanism, title: 'Sample' })
    assert.throws(() => newGame({ root, id: 'sample', domain: mechanism }), /there already/)
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
