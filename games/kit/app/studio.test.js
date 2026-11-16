// node --test games/kit/app — the studio's HTTP bridge (studio.js) end to end: the tools of ../engine/ops/tools.js
// over HTTP, on a small game written for the test into a temp games folder (GAMES_ROOT, ../engine/ops/fixture.js) so
// its writes land there. A studio session in miniature:
// preview a pending changeset (nothing written; the content, the check's lines by level and the files it would
// change), seed a level’s board, apply, read the log, undo; and the second lane the slow reads take.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { proofsRoot } from '../engine/ops/fixture.js'
import { readContent } from '../engine/content-node.js'

const { root, id: GAME } = proofsRoot()
let server
let base
let closeGames

before(async () => {
  process.env.GAMES_ROOT = root
  const { TOOLS, lacking } = await import('../engine/ops/tools.js')
  ;({ closeGames } = await import('../engine/games.mjs'))
  const { bridge } = await import('./studio.js')
  const middleware = bridge(TOOLS, lacking)
  server = createServer((req, res) => middleware(req, res, () => { res.statusCode = 404; res.end('not the bridge') }))
  await new Promise((done) => server.listen(0, '127.0.0.1', done))
  base = `http://127.0.0.1:${server.address().port}`
})
after(async () => {
  server.close()
  await closeGames()
})

const post = async (tool, args, raw = null) => {
  if (args?.level && ['seed', 'render', 'run_tests', 'blueprint', 'run_reference'].includes(tool) && !args.level.includes('/')) args = { ...args, level: `${GAME}/${args.level}` }
  const res = await fetch(`${base}/studio/api/${tool}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw ?? JSON.stringify(args) })
  return { status: res.status, body: await res.json() }
}
const onDisk = (file) => readFileSync(join(root, 'packages', GAME, file), 'utf8')

test('the bridge lists the tools, and says what is wrong with a call', async () => {
  const list = await (await fetch(`${base}/studio/api/`)).json()
  assert.ok(['preview', 'modify', 'seed', 'undo', 'log', 'vocabulary'].every((t) => list[t]?.about))
  assert.equal((await fetch(`${base}/elsewhere`)).status, 404)
  assert.equal((await post('nothing', {})).status, 404)
  assert.equal((await fetch(`${base}/studio/api/preview`)).status, 405)
  assert.deepEqual(await post('preview', {}), { status: 400, body: { error: 'preview needs game or package' } })
  assert.equal((await post('preview', null, '{not json')).status, 400)
  const unknown = await post('preview', { game: 'nope' })
  assert.equal(unknown.status, 422)
  assert.match(unknown.body.error, /no game nope/)
})

test('a pending changeset previewed: its content, lines by level and files, nothing written', async () => {
  const before = onDisk('levels/suppose.json')
  const ops = [
    { op: 'text.set', level: 'suppose', path: 'tasks[0].brief', lang: 'en', value: 'Prove it with one box.' },
  ]
  const { status, body } = await post('preview', { package: GAME, changeset: { ops } })
  assert.equal(status, 200)
  assert.equal(body.failed, null)
  assert.equal(body.content.levels.find((l) => l.id === `${GAME}/suppose`).tasks[0].brief.en, 'Prove it with one box.')
  assert.ok(body.order.includes(`${GAME}/suppose`) && body.lines.every((l) => Array.isArray(l.levels)))
  assert.ok(body.lines.some((l) => l.levels.includes(`${GAME}/suppose`) && /^proofs\/suppose /.test(l.text)), 'a domain line is about its level')
  const catalog = `packages/${GAME}/i18n/en.json`
  assert.deepEqual(body.changes.map((c) => c.file).sort(), [catalog])
  const brief = JSON.parse(before).tasks[0].brief.slice(1)
  assert.equal(JSON.parse(body.changes.find((c) => c.file === catalog).after)[brief], 'Prove it with one box.')
  assert.equal(onDisk('levels/suppose.json'), before, 'a preview writes nothing')

  const bad = (await post('preview', { package: GAME, changeset: { ops: [ops[0], { op: 'level.set', level: 'nope', path: 'x', value: 1 }] } })).body
  assert.equal(bad.failed, 1)
  assert.equal(bad.content, null)
  assert.match(bad.problems[0], /^op 2 \(level.set\)/)
})

test('a board seeded for the game, drawn as SVG', async () => {
  const seed = (await post('seed', { package: GAME, level: 'suppose', path: 'tasks[0].solution' })).body
  assert.equal(seed.task, 0)
  assert.ok(Array.isArray(seed.data.nodes) && seed.data.nodes.some((n) => n.type === `${GAME}/impI`), JSON.stringify(seed).slice(0, 300))
  const text = [`# blueprint 1 ${GAME} suppose`, 'f = impI[A=A](body: z) {', '  body {', '    m1 = mp(p, f.body)', '    z = mp(q, m1)', '  }', '}', 'goal <- f'].join('\n')
  const changed = (await post('seed', { package: GAME, level: 'suppose', path: 'tasks[0].solution', changeset: { ops: [{ op: 'level.blueprint', level: 'suppose', path: 'tasks[0].solution', text }] } })).body
  assert.ok(changed.data.nodes.some((n) => n.id === 'z'), 'seeded from the content as the changeset leaves it')
  const { boards } = (await post('render', { package: GAME, level: 'suppose', format: 'svg' })).body
  assert.match(boards[0].svg, /^<svg/)
})

test('blueprint preview, seed, and tests use the requested task', async () => {
  const level = 'given'
  const { id, ...data } = readContent(GAME, root).levels.find((item) => item.id === `${GAME}/${level}`)
  const first = data.tasks[0]
  const second = { ...first, id: `${id}_2`, brief: { en: first.brief.en }, hint: [], tests: [{ premises: { p: 'A', spare: 'A' }, goal: 'A' }] }
  const changeset = { ops: [{ op: 'level.replace', level, data: { ...data, tasks: [first, second] } }] }
  const request = { package: GAME, level, path: 'tasks[1].solution', changeset }

  const seed = (await post('seed', request)).body
  assert.equal(seed.task, 1)
  assert.ok(seed.data.nodes.some((node) => node.id === 'spare'))
  const draw = (await post('render', request)).body
  assert.equal(draw.text, second.solution.join('\n'))
  const gate = { id: second.id, kind: 'logic:gates', target: 'B', brief: second.brief, solution: ['out <- B'] }
  const gateChange = { ops: [{ op: 'level.replace', level, data: { ...data, tasks: [first, gate] } }] }
  const run = (await post('run_tests', { ...request, changeset: gateChange })).body
  assert.equal(run.task, 1, JSON.stringify(run))
  assert.equal(run.pass, true, JSON.stringify(run))
  assert.match(run.tests[0].shows.en, /^B\b/)

  const wrong = { ...request, path: 'tasks[1].hint' }
  assert.match((await post('seed', wrong)).body.note, /has no board/)
  assert.match((await post('run_tests', wrong)).body.why, /has no board/)
})

test('apply, read the log, undo: the content comes back as it was', async () => {
  const before = onDisk('i18n/en.json')
  const source = onDisk('levels/given.json')
  const ops = [{ op: 'text.set', level: 'given', path: 'tasks[0].brief', lang: 'en', value: 'Assume “Today is Saturday” and prove the claim.' }]
  const done = (await post('modify', { package: GAME, changeset: { why: 'a shorter brief', ops } })).body
  assert.equal(done.written, true, done.problems.join('\n'))
  assert.notEqual(onDisk('i18n/en.json'), before)
  assert.equal(onDisk('levels/given.json'), source)
  const { log, undoable } = (await post('log', { package: GAME })).body
  assert.equal(log.at(-1).why, 'a shorter brief')
  assert.equal(undoable, log.at(-1).seq)
  const undone = (await post('undo', { package: GAME })).body
  assert.equal(undone.written, true, undone.problems.join('\n'))
  // The same content; a line the change rewrote keeps the file format (../engine/ops/json.js), as every write does.
  assert.deepEqual(JSON.parse(onDisk('i18n/en.json')), JSON.parse(before))
  assert.equal((await post('log', { package: GAME })).body.undoable, null, 'an undo is not itself undone')
})

test('the slow reads go to the second lane: a quick preview is not held up by a whole check, a write waits for both', async () => {
  const { bridge } = await import('./studio.js')
  const done = []
  const later = (ms, what) => new Promise((ok) => setTimeout(() => { done.push(what); ok({ what }) }, ms))
  const tools = Object.fromEntries(['preview', 'modify', 'names'].map((name) => [name, { about: name, params: {}, run: (args) => later(5, `${name}${args.check === false ? ' quick' : ''}`) }]))
  const aside = { run: (name) => later(120, `${name} aside`) }
  const middleware = bridge(tools, () => [], aside)
  const lane = createServer((req, res) => middleware(req, res, () => {}))
  await new Promise((ok) => lane.listen(0, '127.0.0.1', ok))
  const at = `http://127.0.0.1:${lane.address().port}/studio/api/`
  const send = (tool, args) => fetch(at + tool, { method: 'POST', body: JSON.stringify(args) }).then((r) => r.json())
  const answers = await Promise.all([send('preview', { game: 'g' }), send('preview', { game: 'g', check: false }), send('names', {}), send('modify', {})])
  lane.close()
  assert.deepEqual(answers.map((a) => a.what), ['preview aside', 'preview quick', 'names', 'modify'])
  assert.deepEqual(done, ['preview quick', 'names', 'preview aside', 'modify'], 'the quick calls answer while the check runs; the write waits for it')
})


test('the HTTP tools list, preview and write a package that no game selects', async () => {
  const pkg = join(root, 'packages', 'library')
  mkdirSync(pkg, { recursive: true })
  writeFileSync(join(pkg, 'package.json'), `${JSON.stringify({ domain: 'logic', vocabulary: 1 })}\n`)
  mkdirSync(join(pkg, 'pieces'), { recursive: true })
  writeFileSync(join(pkg, 'pieces/apply.json'), JSON.stringify( { name: 'Apply', desc: 'Apply an implication.', icon: 'GitFork', family: 'logic:family-rule', inputs: [{ name: 'imp', type: 'logic:judgment' }, { name: 'a', type: 'logic:judgment' }], outputType: 'logic:judgment', compute: 'logic:mp(imp, a)' }))
  const packages = (await post('packages', {})).body
  assert.ok(packages.some((entry) => entry.id === 'library'))
  const preview = (await post('preview', { package: 'library' })).body
  assert.equal(preview.ok, true, preview.problems.join('\n'))
  assert.deepEqual(preview.content.levels, [])
  assert.equal(preview.content.packagePreview.id, 'library')
  const modified = (await post('modify', { package: 'library', changeset: { ops: [{ op: 'pieces.set', path: ['parts', 'apply', 'desc'], value: 'A revised description.' }] } })).body
  assert.equal(modified.written, true, modified.problems.join('\n'))
  assert.deepEqual(modified.files, ['packages/library/pieces/apply.json'])
  assert.equal((await post('log', { package: 'library' })).body.head, 1)
  assert.equal((await post('preview', { game: GAME, package: 'library' })).status, 422)
})
