// node --test games/kit/app — the studio's HTTP bridge (studio.js) end to end: the tools of ../engine/ops/tools.js
// over HTTP, on a small game written for the test into a temp games folder (GAMES_ROOT, ../engine/ops/fixture.js) so
// its writes land there. A studio session in miniature:
// preview a pending changeset (nothing written; the content, the check's lines by level and the files it would
// change), seed a level’s board, apply, read the log, undo; and the second lane the slow reads take.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { proofsRoot } from '../engine/ops/fixture.js'

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
  const res = await fetch(`${base}/studio/api/${tool}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw ?? JSON.stringify(args) })
  return { status: res.status, body: await res.json() }
}
const onDisk = (file) => readFileSync(join(root, GAME, file), 'utf8')

test('the bridge lists the tools, and says what is wrong with a call', async () => {
  const list = await (await fetch(`${base}/studio/api/`)).json()
  assert.ok(['preview', 'modify', 'seed', 'undo', 'log', 'vocabulary'].every((t) => list[t]?.about))
  assert.equal((await fetch(`${base}/elsewhere`)).status, 404)
  assert.equal((await post('nothing', {})).status, 404)
  assert.equal((await fetch(`${base}/studio/api/preview`)).status, 405)
  assert.deepEqual(await post('preview', {}), { status: 400, body: { error: 'preview needs game' } })
  assert.equal((await post('preview', null, '{not json')).status, 400)
  const unknown = await post('preview', { game: 'nope' })
  assert.equal(unknown.status, 422)
  assert.match(unknown.body.error, /no game nope/)
})

test('a pending changeset previewed: its content, lines by level and files, nothing written', async () => {
  const before = onDisk('levels/suppose.json')
  const ops = [
    { op: 'text.set', level: 'suppose', path: 'tasks[0].brief', zh: '用一个框证出它。' },
    { op: 'level.move', level: 'suppose', to: { before: 'apply', on: 'path' } },
  ]
  const { status, body } = await post('preview', { game: GAME, changeset: { ops } })
  assert.equal(status, 200)
  assert.equal(body.failed, null)
  assert.equal(body.content.levels.find((l) => l.id === 'suppose').tasks[0].brief.zh, '用一个框证出它。')
  assert.ok(body.order.includes('suppose') && body.lines.every((l) => Array.isArray(l.levels)))
  assert.ok(body.lines.some((l) => l.levels.includes('suppose') && /^suppose /.test(l.text)), 'a domain line is about its level')
  assert.deepEqual(body.changes.map((c) => c.file).sort(), [`${GAME}/game.json`, `${GAME}/levels/suppose.json`])
  assert.equal(JSON.parse(body.changes.find((c) => c.file.endsWith('suppose.json')).after).tasks[0].brief.zh, '用一个框证出它。')
  assert.equal(onDisk('levels/suppose.json'), before, 'a preview writes nothing')

  const bad = (await post('preview', { game: GAME, changeset: { ops: [ops[0], { op: 'level.set', level: 'nope', path: 'x', value: 1 }] } })).body
  assert.equal(bad.failed, 1)
  assert.equal(bad.content, null)
  assert.match(bad.problems[0], /^op 2 \(level.set\)/)
})

test('a board seeded for the game, drawn as SVG', async () => {
  const seed = (await post('seed', { game: GAME, level: 'suppose', path: 'tasks[0].solution' })).body
  assert.equal(seed.task, 0)
  assert.ok(Array.isArray(seed.data.nodes) && seed.data.nodes.some((n) => n.type === 'impI'), JSON.stringify(seed).slice(0, 300))
  const text = [`# blueprint 1 ${GAME} suppose`, 'f = impI[A=A](body: z) {', '  body {', '    m1 = mp(p, f.body)', '    z = mp(q, m1)', '  }', '}', 'goal <- f'].join('\n')
  const changed = (await post('seed', { game: GAME, level: 'suppose', path: 'tasks[0].solution', changeset: { ops: [{ op: 'level.blueprint', level: 'suppose', path: 'tasks[0].solution', text }] } })).body
  assert.ok(changed.data.nodes.some((n) => n.id === 'z'), 'seeded from the content as the changeset leaves it')
  const { boards } = (await post('render', { game: GAME, level: 'suppose', format: 'svg' })).body
  assert.match(boards[0].svg, /^<svg/)
})

test('apply, read the log, undo: the content comes back as it was', async () => {
  const before = onDisk('levels/given.json')
  const ops = [{ op: 'text.set', level: 'given', path: 'tasks[0].brief', zh: '已知「今天是周六」，证出它。' }]
  const done = (await post('modify', { game: GAME, changeset: { why: 'a shorter brief', ops } })).body
  assert.equal(done.written, true, done.problems.join('\n'))
  assert.notEqual(onDisk('levels/given.json'), before)
  const { log, undoable } = (await post('log', { game: GAME })).body
  assert.equal(log.at(-1).why, 'a shorter brief')
  assert.equal(undoable, log.at(-1).seq)
  const undone = (await post('undo', { game: GAME })).body
  assert.equal(undone.written, true, undone.problems.join('\n'))
  // The same content; a line the change rewrote keeps the file format (../engine/ops/json.js), as every write does.
  assert.deepEqual(JSON.parse(onDisk('levels/given.json')), JSON.parse(before))
  assert.equal((await post('log', { game: GAME })).body.undoable, null, 'an undo is not itself undone')
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
