// node --test games/kit/domains/unix — the teletype's line machine, the simulated kernel, and the conformance cases
// the kernel shares with real Linux (conformance/real.py checks the same cases there).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Kernel, sys } from './kernel.js'
import { BUILTINS, pipeline, runLines } from './lines.js'
import { builtin, cat, lineCommand, readAll, writeAll } from './programs.js'
import { SIM } from './conformance/sim.js'

// A board from a compact description: nodes { id: [type, params] }, wires 'from>to.port' (sinks take 'in').
const board = (nodes, wires) => ({
  nodes: Object.entries(nodes).map(([id, [type, params = {}]]) => ({ id, type, params })),
  wires: wires.map((s) => { const [from, to] = s.split('>'); const [id, port = 'in'] = to.split('.'); return { from, to: id, port } }),
})
const grep = (text) => ({ each: board({ l: ['line'], c: ['contains', { text }], g: ['pass'], p: ['print'] }, ['l>c', 'c>g.if', 'l>g.v', 'g>p']) })
const wcl = { registers: { n: 0 }, each: board({ r: ['reg', { name: 'n' }], k: ['const', { value: 1 }], a: ['add'], s: ['set', { name: 'n' }] }, ['r>a.a', 'k>a.b', 'a>s']), end: board({ r: ['reg', { name: 'n' }], p: ['print'] }, ['r>p']) }
// uniq: print a line unless it equals the line before.
const uniq = {
  registers: { last: null },
  each: board({ l: ['line'], r: ['reg', { name: 'last' }], e: ['equal'], n: ['not'], x: ['either'], g: ['pass'], p: ['print'], s: ['set', { name: 'last' }], f: ['const', { value: false }] },
    ['l>e.a', 'r>e.b', 'e>x.a', 'f>x.b', 'x>n', 'n>g.if', 'l>g.v', 'g>p', 'l>s']),
}

const LOG = 'a 200\nb 404\na 404\nc 200\nb 404\n'

test('grep, wc -l and uniq as line boards', () => {
  assert.equal(runLines(grep('404'), LOG).output, 'b 404\na 404\nb 404\n')
  assert.equal(runLines(wcl, LOG).output, '5\n')
  assert.equal(runLines(uniq, 'x\nx\ny\nx\n').output, 'x\ny\nx\n')
})

test('uniq only drops neighbours: sort | uniq drops them all', () => {
  assert.equal(pipeline([grep('404'), uniq], LOG), 'b 404\na 404\nb 404\n')
  assert.equal(pipeline([grep('404'), BUILTINS.sort, uniq], LOG), 'a 404\nb 404\n')
})

test('a line board as a command under the kernel prints what it prints on the whole text', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const k = new Kernel({ seed, programs: { cat, grep: lineCommand(grep('404')), sort: builtin('sort') } })
    k.seed({ '/log': LOG })
    const term = k.terminal()
    // The shell has a terminal on 0, 1 and 2, so the pipes it makes get fds above them.
    const stdin = k.terminal('')
    let status
    k.spawn(function* () {
      // cat /log | grep 404 | sort, wired by hand the way a shell does it.
      const [r1, w1] = yield sys.pipe()
      const [r2, w2] = yield sys.pipe()
      const run = (prog, inFd, outFd, closeAll) => function* () {
        yield sys.dup2(inFd, 0)
        yield sys.dup2(outFd, 1)
        for (const fd of closeAll) yield sys.close(fd)
        yield sys.exec(prog)
      }
      const file = yield sys.open('/log', 'r')
      yield sys.fork(run('cat', file, w1, [file, r1, w1, r2, w2]))
      yield sys.fork(run('grep', r1, w2, [file, r1, w1, r2, w2]))
      yield sys.fork(run('sort', r2, 1, [file, r1, w1, r2, w2]))
      for (const fd of [file, r1, w1, r2, w2]) yield sys.close(fd)
      for (let i = 0; i < 3; i++) [, status] = yield sys.wait()
    }, { fds: new Map([[0, stdin], [1, term], [2, term]]), name: 'sh' })
    stdin.refs = 1
    term.refs = 2
    const result = k.run()
    assert.equal(result.stuck, false, `seed ${seed}: ${JSON.stringify(result.waiting)}`)
    assert.equal(term.out, BUILTINS.sort(runLines(grep('404'), LOG).output))
    assert.equal(status, 0)
  }
})

test('a forgotten write end: the run is stuck, and the report names who holds it', () => {
  const k = new Kernel({ seed: 3 })
  k.spawn(function* () {
    const [r, w] = yield sys.pipe()
    yield sys.fork(function* () { yield sys.close(w); yield* readAll(r) }, 'reader')
    yield* writeAll(w, 'x')
    yield sys.wait()
  }, { name: 'sh' })
  const { stuck, waiting } = k.run()
  assert.equal(stuck, true)
  const reader = waiting.find((p) => p.name === 'reader')
  assert.deepEqual(reader.on.holders, [1])
})

const CASES = JSON.parse(readFileSync(new URL('./conformance/cases.json', import.meta.url), 'utf8'))
for (const [name, c] of Object.entries(CASES)) {
  test(`conformance: ${name}`, () => assert.deepEqual(SIM[name](), c.expect))
}
