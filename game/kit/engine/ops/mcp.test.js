// node --test games/kit/engine/ops — the MCP server end to end: spawned as Claude Code would spawn it, spoken to over
// stdio in JSON-RPC, working on a copy of a game (GAMES_ROOT) so its writes land in a temp folder.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline'

const REPO = resolve(import.meta.dirname, '../../../..')
let server
let next = 1
const waiting = new Map()
let root

before(() => {
  const dir = mkdtempSync(join(tmpdir(), 'ops-mcp-'))
  execFileSync('tar', ['-x', '-C', dir], { input: execFileSync('git', ['-C', REPO, 'archive', 'HEAD', 'games/games.js', 'games/qed-lab'], { maxBuffer: 1 << 28 }) })
  root = join(dir, 'games')
  server = spawn(process.execPath, [resolve(import.meta.dirname, 'mcp.js')], { env: { ...process.env, GAMES_ROOT: root }, stdio: ['pipe', 'pipe', 'inherit'] })
  createInterface({ input: server.stdout }).on('line', (line) => {
    const message = JSON.parse(line)
    waiting.get(message.id)?.(message)
    waiting.delete(message.id)
  })
})
after(() => server.stdin.end())

const ask = (method, params) => new Promise((done) => {
  const id = next++
  waiting.set(id, done)
  server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, ...(params && { params }) })}\n`)
})
const call = async (name, args) => {
  const { result } = await ask('tools/call', { name, arguments: args })
  return { ...result, data: result.structuredContent ?? null }
}

test('the server speaks MCP over stdio', async () => {
  const init = await ask('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0' } })
  assert.equal(init.result.protocolVersion, '2025-06-18')
  assert.deepEqual(init.result.capabilities, { tools: { listChanged: false } })
  server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`)
  assert.deepEqual((await ask('ping')).result, {})
  assert.equal((await ask('nothing/here')).error.code, -32601)

  const { tools } = (await ask('tools/list')).result
  assert.deepEqual(tools.map((t) => t.name).sort(), ['audit', 'blueprint', 'deps', 'history', 'log', 'migrate_diff', 'modify', 'names', 'playtests', 'preview', 'render', 'replace', 'run_reference', 'run_tests', 'search', 'seed', 'undo', 'vocabulary'])
  assert.deepEqual(tools.find((t) => t.name === 'modify').inputSchema.required, ['game', 'changeset'])
  assert.equal((await call('modify', { game: 'qed-lab' })).isError, true)
})

test('reading tools: vocabulary, audit, run_reference, blueprint, render, deps', async () => {
  const vocabulary = (await call('vocabulary', { game: 'qed-lab' })).data
  assert.equal(vocabulary.domain, 'logic')
  assert.ok(vocabulary.vocabulary.kinds.part && vocabulary.operations['task.move'].params.fields.to)

  const audit = (await call('audit', { game: 'qed-lab' })).data
  assert.equal(audit.ok, true, audit.failures.join('\n'))
  assert.ok(audit.lines.some((l) => l.startsWith('box ')))

  const reference = (await call('run_reference', { game: 'qed-lab', level: 'cases' })).data
  assert.deepEqual(reference, { ok: true, lines: ['cases 分情况: solution PASS [5 steps]'] })

  const { boards } = (await call('blueprint', { game: 'qed-lab', level: 'box' })).data
  assert.deepEqual(boards.map((b) => b.path), ['solution'])
  assert.match(boards[0].text, /^f = impI\[A="A & B"\]\(body: m2\) \{/)

  assert.match((await call('render', { game: 'qed-lab', level: 'box' })).data.text, /^box · Suppose\nkind: "proof"[\s\S]*solution:\n {2}f = impI/)
  const svg = (await call('render', { game: 'qed-lab', level: 'box', format: 'svg' })).data
  assert.deepEqual(svg.boards.map((b) => b.path), ['solution'])
  assert.match(svg.boards[0].svg, /^<svg [^>]*viewBox[\s\S]*impI[\s\S]*<\/svg>$/)
  assert.equal((await call('render', { game: 'qed-lab', level: 'box', format: 'png' })).data.rendered, false)
  assert.match((await call('deps', { game: 'qed-lab' })).data.text, /^flowchart LR/)
  assert.match((await call('audit', { game: 'nope' })).content[0].text, /no game nope/)
})

test('changing tools: migrate_diff previews, modify refuses a failing changeset and writes a passing one', async () => {
  const goal = { op: 'level.set', level: 'box', path: 'tests[0].goal', value: 'A → (B → C)' }
  const diff = (await call('migrate_diff', { game: 'qed-lab', changeset: { ops: [goal] } })).data
  assert.deepEqual(diff.migration, { version: 2, ops: [{ drop: ['box'] }] })

  // The reference no longer proves the new goal: refused, nothing written.
  const refused = (await call('modify', { game: 'qed-lab', changeset: { ops: [goal] } })).data
  assert.equal(refused.ok, false)
  assert.ok(refused.problems.some((p) => p.startsWith('box')), refused.problems.join('\n'))
  assert.equal(existsSync(join(root, 'qed-lab', 'changes.jsonl')), false)

  const hint = { op: 'text.set', level: 'box', path: 'hint[0]', en: 'Set the box’s “Assume” to “today is Saturday ∧ it rains”.' }
  const preview = (await call('modify', { game: 'qed-lab', changeset: { ops: [hint] }, dryRun: true })).data
  assert.equal(preview.ok && !preview.written, true)
  assert.match(preview.diff, /^--- a\/qed-lab\/levels\/box.json/)
  const done = (await call('modify', { game: 'qed-lab', changeset: { why: 'a clearer hint', ops: [hint] } })).data
  assert.equal(done.written, true, done.problems.join('\n'))
  assert.equal(done.migration, null)
  assert.equal(JSON.parse(readFileSync(join(root, 'qed-lab', 'levels', 'box.json'), 'utf8')).hint[0].en, hint.en)
  assert.equal(JSON.parse(readFileSync(join(root, 'qed-lab', 'changes.jsonl'), 'utf8')).why, 'a clearer hint')
})

test('search and replace: hits across the game, a replace as a changeset that modify applies; history outside git says so', async () => {
  const found = (await call('search', { game: 'qed-lab', query: { find: 'assume', kinds: ['text'] } })).data
  assert.ok(found.count > 0 && found.hits.every((h) => h.kind === 'text' && h.at.length), JSON.stringify(found).slice(0, 300))
  const { changeset, changes } = (await call('replace', { game: 'qed-lab', query: { find: 'Saturday', caseSensitive: true }, with: 'Sunday' })).data
  assert.ok(changeset.ops.length >= 1 && changeset.ops.every((op) => op.op === 'text.set' && op.en && op.zh === undefined))
  assert.ok(changes.every((c) => c.after.includes('Sunday') && !c.after.includes('Saturday')))
  const done = (await call('modify', { game: 'qed-lab', changeset })).data
  assert.equal(done.written, true, done.problems.join('\n'))
  assert.equal((await call('search', { game: 'qed-lab', query: { find: 'Saturday', caseSensitive: true } })).data.count, 0)
  const old = (await call('history', { game: 'qed-lab', level: 'box' })).data
  assert.equal(old.found, false)
  assert.match(old.why, /git/i)
})
