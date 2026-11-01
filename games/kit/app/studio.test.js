// node --test games/kit/app — the studio's HTTP bridge (studio.js) end to end: the tools of ../engine/ops/tools.js
// over HTTP, on a copy of a game (GAMES_ROOT) so its writes land in a temp folder. A studio session in miniature:
// preview a pending changeset (nothing written; the content, the check's lines by level, the migration and the files
// it would change), seed a level’s board, apply, read the log, undo; and the second lane the slow reads take.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const REPO = resolve(import.meta.dirname, '../../..')
let root
let server
let base
let closeGames

before(async () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-bridge-'))
  execFileSync('tar', ['-x', '-C', dir], { input: execFileSync('git', ['-C', REPO, 'archive', 'HEAD', 'games/games.js', 'games/qed-lab'], { maxBuffer: 1 << 28 }) })
  root = join(dir, 'games')
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
const onDisk = (file) => readFileSync(join(root, 'qed-lab', file), 'utf8')

test('the bridge lists the tools, and says what is wrong with a call', async () => {
  const list = await (await fetch(`${base}/studio/api/`)).json()
  assert.ok(['preview', 'modify', 'seed', 'undo', 'log', 'playtests', 'vocabulary'].every((t) => list[t]?.about))
  assert.equal((await fetch(`${base}/elsewhere`)).status, 404)
  assert.equal((await post('nothing', {})).status, 404)
  assert.equal((await fetch(`${base}/studio/api/preview`)).status, 405)
  assert.deepEqual(await post('preview', {}), { status: 400, body: { error: 'preview needs game' } })
  assert.equal((await post('preview', null, '{not json')).status, 400)
  const unknown = await post('preview', { game: 'nope' })
  assert.equal(unknown.status, 422)
  assert.match(unknown.body.error, /no game nope/)
})

test('a pending changeset previewed: its content, lines by level, migration and files, nothing written', async () => {
  const before = onDisk('levels/box.json')
  const ops = [
    { op: 'text.set', level: 'box', path: 'brief', en: 'Prove it with a box.' },
    { op: 'level.move', level: 'chain', to: { before: 'box', on: 'path' } },
  ]
  const { status, body } = await post('preview', { game: 'qed-lab', changeset: { ops } })
  assert.equal(status, 200)
  assert.equal(body.failed, null)
  assert.equal(body.content.levels.find((l) => l.id === 'box').brief.en, 'Prove it with a box.')
  assert.ok(body.order.includes('box') && body.lines.every((l) => Array.isArray(l.levels)))
  assert.ok(body.lines.some((l) => l.levels.includes('box') && /^box /.test(l.text)), 'a domain line is about its level')
  assert.deepEqual(body.changes.map((c) => c.file).sort(), ['qed-lab/game.json', 'qed-lab/levels/box.json'])
  assert.equal(JSON.parse(body.changes.find((c) => c.file.endsWith('box.json')).after).brief.en, 'Prove it with a box.')
  assert.ok(body.migration === null || body.migration.version >= 2)
  assert.equal(onDisk('levels/box.json'), before, 'a preview writes nothing')

  const bad = (await post('preview', { game: 'qed-lab', changeset: { ops: [ops[0], { op: 'level.set', level: 'nope', path: 'x', value: 1 }] } })).body
  assert.equal(bad.failed, 1)
  assert.equal(bad.content, null)
  assert.match(bad.problems[0], /^op 2 \(level.set\)/)
})

test('a board seeded for the game, drawn as SVG', async () => {
  const seed = (await post('seed', { game: 'qed-lab', level: 'box' })).body
  assert.equal(seed.task, null)
  assert.ok(Array.isArray(seed.data.nodes) && seed.data.nodes.some((n) => n.type === 'impI'), JSON.stringify(seed).slice(0, 300))
  const text = ['# blueprint 1 qed-lab box', 'f = impI[A="A & B"](body: z) {', '  body {', '    e = andE(f.body)', '    m1 = mp(p, e.left)', '    z = mp(m1, e.right)', '  }', '}', 'goal <- f'].join('\n')
  const changed = (await post('seed', { game: 'qed-lab', level: 'box', changeset: { ops: [{ op: 'level.blueprint', level: 'box', text }] } })).body
  assert.ok(changed.data.nodes.some((n) => n.id === 'z'), 'seeded from the content as the changeset leaves it')
  const { boards } = (await post('render', { game: 'qed-lab', level: 'box', format: 'svg' })).body
  assert.match(boards[0].svg, /^<svg/)
})

test('apply, read the log, undo: the content comes back as it was', async () => {
  const before = onDisk('levels/copy.json')
  const ops = [{ op: 'text.set', level: 'copy', path: 'brief', en: 'Given that “it rains”, prove “it rains”.' }]
  const done = (await post('modify', { game: 'qed-lab', changeset: { why: 'a shorter brief', ops } })).body
  assert.equal(done.written, true, done.problems.join('\n'))
  assert.notEqual(onDisk('levels/copy.json'), before)
  const { log, undoable } = (await post('log', { game: 'qed-lab' })).body
  assert.equal(log.at(-1).why, 'a shorter brief')
  assert.equal(undoable, log.at(-1).seq)
  const undone = (await post('undo', { game: 'qed-lab' })).body
  assert.equal(undone.written, true, undone.problems.join('\n'))
  // The same content; a line the change rewrote keeps the file format (../engine/ops/json.js), as every write does.
  assert.deepEqual(JSON.parse(onDisk('levels/copy.json')), JSON.parse(before))
  assert.equal((await post('log', { game: 'qed-lab' })).body.undoable, null, 'an undo is not itself undone')
  assert.deepEqual((await post('playtests', { game: 'qed-lab' })).body, { records: [], levels: {} })
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
