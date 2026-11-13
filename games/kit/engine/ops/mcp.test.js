// node --test games/kit/engine/ops — the MCP server end to end: spawned as Claude Code would spawn it, spoken to over
// stdio in JSON-RPC, working on a small game written for the test into a temp games folder (GAMES_ROOT, ./fixture.js)
// so its writes land there.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { proofsRoot } from './fixture.js'

const { root, id: GAME } = proofsRoot()
let server
let next = 1
const waiting = new Map()

before(() => {
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
  assert.deepEqual(tools.map((t) => t.name).sort(), ['adopt', 'audit', 'blueprint', 'deps', 'history', 'log', 'modify', 'names', 'preview', 'render', 'replace', 'run_reference', 'run_tests', 'search', 'seed', 'undo', 'vocabulary'])
  assert.deepEqual(tools.find((t) => t.name === 'modify').inputSchema.required, ['game', 'changeset'])
  assert.equal((await call('modify', { game: GAME })).isError, true)
})

test('reading tools: vocabulary, audit, run_reference, blueprint, render, deps', async () => {
  const vocabulary = (await call('vocabulary', { game: GAME })).data
  assert.equal(vocabulary.domain, 'logic')
  assert.ok(vocabulary.vocabulary.kinds.part && vocabulary.operations['task.move'].params.fields.to)

  const audit = (await call('audit', { game: GAME })).data
  assert.equal(audit.ok, true, audit.failures.join('\n'))
  assert.ok(audit.lines.some((l) => l.startsWith('suppose ')))

  const reference = (await call('run_reference', { game: GAME, level: 'apply' })).data
  assert.deepEqual(reference, { ok: true, lines: ['apply 套用: solution PASS [2 steps]'] })

  const { boards } = (await call('blueprint', { game: GAME, level: 'suppose' })).data
  assert.deepEqual(boards.map((b) => b.path), ['tasks[0].solution'])
  assert.match(boards[0].text, /^f = impI\[A=A\]\(body: m2\) \{/)

  assert.match((await call('render', { game: GAME, level: 'suppose' })).data.text, /^suppose · 假设一下\n[\s\S]*tasks\[0\]\.solution:\n {2}f = impI/)
  const svg = (await call('render', { game: GAME, level: 'suppose', format: 'svg' })).data
  assert.deepEqual(svg.boards.map((b) => b.path), ['tasks[0].solution'])
  assert.match(svg.boards[0].svg, /^<svg [^>]*viewBox[\s\S]*impI[\s\S]*<\/svg>$/)
  assert.equal((await call('render', { game: GAME, level: 'suppose', format: 'png' })).data.rendered, false)
  assert.match((await call('deps', { game: GAME })).data.text, /^flowchart LR/)
  assert.match((await call('audit', { game: 'nope' })).content[0].text, /no game nope/)
})

test('changing tools: modify refuses a failing changeset and writes a passing one', async () => {
  const goal = { op: 'level.set', level: 'suppose', path: 'tasks[0].tests[0].goal', value: 'A → (B → C)' }
  // The reference no longer proves the new goal: refused, nothing written.
  const refused = (await call('modify', { game: GAME, changeset: { ops: [goal] } })).data
  assert.equal(refused.ok, false)
  assert.ok(refused.problems.some((p) => p.startsWith('suppose')), refused.problems.join('\n'))
  assert.equal(existsSync(join(root, GAME, 'changes.jsonl')), false)

  const hint = { op: 'text.set', level: 'suppose', path: 'tasks[0].hint[0]', zh: '把框的「假设」设成「今天是周六」，也就是它的前一半。' }
  const preview = (await call('modify', { game: GAME, changeset: { ops: [hint] }, dryRun: true })).data
  assert.equal(preview.ok && !preview.written, true)
  assert.match(preview.diff, new RegExp(`^--- a/${GAME}/levels/suppose.json`))
  const done = (await call('modify', { game: GAME, changeset: { why: 'a clearer hint', ops: [hint] } })).data
  assert.equal(done.written, true, done.problems.join('\n'))
  assert.equal(JSON.parse(readFileSync(join(root, GAME, 'levels', 'suppose.json'), 'utf8')).tasks[0].hint[0].zh, hint.zh)
  assert.equal(JSON.parse(readFileSync(join(root, GAME, 'changes.jsonl'), 'utf8')).why, 'a clearer hint')
})

test('search and replace: hits across the game, a replace as a changeset that modify applies; history outside git says so', async () => {
  const found = (await call('search', { game: GAME, query: { find: '假设', kinds: ['text'] } })).data
  assert.ok(found.count > 0 && found.hits.every((h) => h.kind === 'text' && h.at.length), JSON.stringify(found).slice(0, 300))
  const { changeset, changes } = (await call('replace', { game: GAME, query: { find: '周六', caseSensitive: true }, with: '周日' })).data
  assert.ok(changeset.ops.length >= 1 && changeset.ops.every((op) => op.op === 'text.set' && op.zh))
  assert.ok(changes.every((c) => c.after.includes('周日') && !c.after.includes('周六')))
  const done = (await call('modify', { game: GAME, changeset })).data
  assert.equal(done.written, true, done.problems.join('\n'))
  assert.equal((await call('search', { game: GAME, query: { find: 'Saturday', caseSensitive: true } })).data.count, 0)
  const old = (await call('history', { game: GAME, level: 'suppose' })).data
  assert.equal(old.found, false)
  assert.match(old.why, /git/i)
})
