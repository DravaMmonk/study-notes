// Small authored packages exercise mixed modules without reading installed games.
import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { cpSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { proofsRoot, installImageFixture } from './ops/fixture.js'
import { openGame } from './ops/workspace.js'
import { runChangeset } from './ops/changeset.js'
import { readContent, readPackage, runtimeOf } from './resolver.js'
import { loadPlugins } from './plugin-node.js'
import { evaluatePlay } from './plugin-runtime.js'
import { checkGame } from './checks.js'
import { packageLevel } from './package-play.js'
import { closeGames } from './games.mjs'
import { loadPlay } from './play/node.mjs'
import { createPlay } from './play/play.js'
import { newSession } from './play/session.js'
import { fresh } from '../shell/progress.js'

const roots = []
after(async () => { await closeGames(); roots.forEach(root => rmSync(root, { recursive: true, force: true })) })

test('three packages compose across logic, image and rows, retain layered text and play each standalone level', async () => {
  const { root, id } = proofsRoot()
  roots.push(root)
  installImageFixture(root)
  const put = (file, value) => {
    const path = join(root, file)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(value))
  }
  put('packages/z-pictures/package.json', { version: '1.0.0', kernel: '^0.0.0', uses: { image: '^0.0.0' } })
  put('packages/z-pictures/i18n/en.json', { title: 'Same picture', brief: 'Pass the image through.', caption: 'The original image.' })
  put('packages/z-pictures/levels/same.json', {
    title: '@title', after: 'The output equals the input.', intro: [{ t: 'Compare the image.', fig: { part: 'image:mystery', input: 'image:picture-square', caption: '@caption' } }],
    tasks: [{ id: 'same', play: 'image:graph', brief: '@brief', scene: 'image:scene-filter', setup: { target: 'image:target-same' },
      tests: [{ label: 'Square', in: 'image:picture-square' }], hidden: [{ label: 'Disk', in: 'image:picture-disk' }], solution: ['out <- in'] }],
  })
  for (const side of ['core', 'view', 'kinds']) cpSync(new URL(`../../../packages/rows/${side}`, import.meta.url), join(root, 'packages/rows', side), { recursive: true })
  put('packages/rows/package.json', { version: '0.0.0', kernel: '^0.0.0', uses: { circuit: '^0.0.0' } })
  put('packages/sums/package.json', { version: '1.0.0', kernel: '^0.0.0', uses: { 'z-pictures': '^1.0.0', rows: '^0.0.0' } })
  put('packages/sums/i18n/en.json', { title: 'A sum', brief: 'Complete the sum.' })
  put('packages/sums/overrides/z-pictures/i18n/en.json', { brief: 'Keep every pixel.' })
  put('packages/sums/levels/add.json', { title: '@title', tasks: [{ id: 'add', play: 'rows:equation', brief: '@brief', rows: [{ total: 5, chips: [0, 2, 3], reference: '2 + 3', naive: '0 + 3' }] }] })
  // Select packages through the public operation boundary; no image-only game fields are needed.
  const selected = await runChangeset(openGame(id, root), { ops: [
    { op: 'game.package.add', package: 'image', range: '^0.0.0' }, { op: 'game.package.add', package: 'rows', range: '^0.0.0' }, { op: 'game.package.add', package: 'z-pictures', range: '^1.0.0' }, { op: 'game.package.add', package: 'sums', range: '^1.0.0' },
    { op: 'chapter.set', chapter: 'ground', path: 'levels', value: [`${id}/given`, `${id}/apply`, `${id}/suppose`, 'z-pictures/same', 'sums/add'] },
  ] }, { write: true })
  assert.equal(selected.ok, true, selected.problems.join('\n'))
  const content = readContent(id, root)
  assert.equal(content.views, undefined)
  assert.equal(content.registries.level['z-pictures/same'].tasks[0].brief.en, 'Keep every pixel.')
  assert.equal(content.registries.level[`${id}/apply`].tasks[0].brief.en.length > 0, true)
  const kernel = await loadPlugins(content, root)
  const imageTask = content.registries.level['z-pictures/same'].tasks[0]
  assert.equal(evaluatePlay(kernel, imageTask, ['out <- in'], { content, task: imageTask }).verdict.pass, true)
  const runtime = await runtimeOf(content)
  const spec = runtime.spec(content)
  assert.deepEqual(spec.levels.map(level => level.id), content.sourceChapters[0].levels)
  assert.deepEqual((await checkGame(content, { domain: runtime, root })).filter(line => line.fail), [])
  // The same package closure opens each task without a chapter or unlock state.
  const support = readPackage('sums', root)
  for (const [level, text] of [['z-pictures/same', 'out <- in'], ['sums/add', '2 + 3']]) {
    const shell = packageLevel(support, level)
    const { shell: game, hook, course } = await loadPlay(shell)
    const play = createPlay({ game, hook, course, record: newSession({ game: shell.id, session: 'mixed', progress: fresh() }) })
    assert.equal(play.attempt(text).pass, true, level)
  }
  const { shell: game, hook, course } = await loadPlay(content)
  const play = createPlay({ game, hook, course, record: newSession({ game: id, session: 'mixed-game', progress: fresh() }) })
  assert.equal(play.attempt('goal <- p').pass, true)
  play.giveUp()
  play.giveUp()
  assert.equal(play.attempt('out <- in').pass, true)
  assert.equal(play.attempt('2 + 3').pass, true)
})
