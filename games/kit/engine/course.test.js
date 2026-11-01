// node --test games/kit/engine — the course audit's practice and abstraction rules (../course.js), the board matching
// under `bypass` (match.js) and the part dependency graph (deps.js), on small made-up courses.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PRACTICE, againstOpen, audit, defineCourse } from '../course.js'
import { dependencies, dot, mermaid } from './deps.js'
import { rebuilt } from './match.js'

/**
 * A course from a sketch: eras of level ids; per level what it adds, builds and its reference uses (`uses`), its
 * machine abilities (`can`), its boards.
 */
function sketch(eras, spec, extra = {}) {
  const levels = eras.flatMap((e) => [...e.foundation.flatMap((i) => (typeof i === 'string' ? [i] : i.parallel.flatMap((b) => b.levels))), ...(e.topics ?? []).flatMap((t) => t.levels), ...(e.challenges ?? []).map((c) => c.level)])
  const of = (l) => spec[l.id] ?? {}
  return defineCourse({
    levels: levels.map((id) => ({ id, unlocks: spec[id]?.builds ? [spec[id].builds] : [] })),
    eras: eras.map((e, k) => ({ id: k + 1, keeps: k ? 'all' : undefined, ...e })),
    primitives: ['a', 'b', 'c', 'd'],
    adds: (l) => of(l).adds ?? [],
    needs: (p) => (levels.some((id) => spec[id]?.builds === p) ? p : null),
    builds: (l) => (of(l).builds ? [of(l).builds] : []),
    needed: (l) => of(l).uses ?? null,
    uses: (l) => of(l).can ?? [],
    boards: (l) => of(l).boards ?? [],
    ...extra,
  })
}
const thin = (course) => audit(course).filter((f) => f.rule === 'thin-practice').map((f) => `${f.part}@${f.level}`)
const bypass = (course) => audit(course).filter((f) => f.rule === 'bypass').map((f) => `${f.part}@${f.level}`)

test('a new idea wants its practice before the next new idea', () => {
  assert.equal(PRACTICE, 3)
  const spec = {
    1: { adds: ['a'], uses: ['a'] }, 2: { uses: ['a'] }, 3: { uses: ['a'] }, 4: { uses: ['a'] },
    5: { adds: ['b'], uses: ['b'] }, 6: { uses: ['b'] }, 7: { adds: ['c'], uses: ['b', 'c'] },
  }
  assert.deepEqual(thin(sketch([{ foundation: ['1', '2', '3', '4', '5', '6', '7'] }], spec)), ['b@5', 'c@7'])
})

test('a level that only builds a part is practice; one bringing a new idea is not', () => {
  const spec = {
    1: { adds: ['a'], uses: ['a'] }, 2: { builds: 'P', uses: ['a', 'a'] }, 3: { uses: ['P'] },
    4: { adds: ['b'], uses: ['a', 'b'] }, 5: { uses: ['a'] },
  }
  // a: levels 2 and 3 count (3 uses P, not a), 4 brings b and ends the run, 5 comes after it.
  assert.deepEqual(thin(sketch([{ foundation: ['1', '2', '3', '4', '5'] }], spec)), ['a@1', 'b@4'])
})

test('practice runs along prerequisites: across a parallel set and into the next era, not into optional branches', () => {
  const spec = {
    1: { adds: ['a'], uses: ['a'] }, x: { uses: ['a'] }, y: { adds: ['b'], uses: ['b'] }, z: { uses: ['a'] },
    t1: { uses: ['a'] }, t2: { adds: ['c'], uses: ['a', 'c'] }, ch: { uses: ['a'] }, 2: { uses: ['a'] },
  }
  const eras = [
    { foundation: ['1', { parallel: [{ id: 'p', levels: ['x'] }, { id: 'q', levels: ['y', 'z'] }] }], topics: [{ id: 't', levels: ['t1', 't2'], after: '1' }], challenges: [{ level: 'ch', after: '1' }] },
    { foundation: ['2'] },
  ]
  // a: x counts (y, on the other branch, is no level between them); z and 2 come after y's new idea; the topic and
  // the challenge may be skipped. The topic's c is not audited.
  const found = audit(sketch(eras, spec)).filter((f) => f.rule === 'thin-practice')
  assert.deepEqual(found.map((f) => `${f.part}@${f.level}`), ['a@1', 'b@y'])
  assert.match(found[0].text, /^1 level\(s\) use it before the next new idea \(y\)/)
  // Without the new idea on the other branch, z and the next era's level count too.
  assert.deepEqual(thin(sketch(eras, { ...spec, y: { uses: ['a'] } })), [])
})

test('an idea is a concept, and an ability of the machine is an idea too', () => {
  const spec = {
    1: { adds: ['a'], uses: ['a'], can: ['view'] }, 2: { adds: ['b'], uses: ['b'], can: ['view'] }, 3: { uses: ['a'], can: ['view'] }, 4: { uses: ['a'], can: ['view'] }, 5: { uses: ['b'], can: ['far'] },
  }
  // b is a's concept: level 2 brings nothing new. view is new at 1 and used by 2, 3, 4; far at 5 has nothing after.
  const course = sketch([{ foundation: ['1', '2', '3', '4', '5'] }], spec, { concept: (p) => (p === 'b' ? 'a' : p) })
  assert.deepEqual(thin(course), ['far@5'])
})

// Boards in the shared circuit model: in → parts → out.
const board = (nodes, wires) => ({ nodes: [{ id: 'in', type: 'in' }, { id: 'in2', type: 'in' }, { id: 'out', type: 'out' }, ...nodes], wires })
const wire = (text) => text.split(' ').map((s) => { const [from, to] = s.split('>'); const [id, port] = to.split('.'); return { from, to: id, port } })
const isPart = (t) => !['in', 'out'].includes(t)
const TRIPLE = board([{ id: 'x', type: 'a' }, { id: 'y', type: 'b', params: { k: 1 } }, { id: 'z', type: 'c' }], wire('in>x.p x>y.p in>y.q y>z.p z>out.p'))

test('a board is found inside another, wired alike, whatever its inputs read', () => {
  const host = board([{ id: 'u', type: 'd' }, { id: 'x1', type: 'a' }, { id: 'y1', type: 'b', params: { k: 1 } }, { id: 'z1', type: 'c' }],
    wire('in2>u.p u>x1.p x1>y1.p u>y1.q y1>z1.p z1>out.p'))
  assert.deepEqual([...rebuilt(TRIPLE, host, isPart)].sort(), [['x', 'x1'], ['y', 'y1'], ['z', 'z1']])
})

test('other settings, other wiring, inputs read apart, or a value read from inside are no match', () => {
  const nodes = (k = 1) => [{ id: 'x1', type: 'a' }, { id: 'y1', type: 'b', params: { k } }, { id: 'z1', type: 'c' }]
  assert.equal(rebuilt(TRIPLE, board(nodes(2), wire('in>x1.p x1>y1.p in>y1.q y1>z1.p z1>out.p')), isPart), null)
  assert.equal(rebuilt(TRIPLE, board(nodes(), wire('in>x1.p x1>y1.q in>y1.p y1>z1.p z1>out.p')), isPart), null)
  assert.equal(rebuilt(TRIPLE, board(nodes(), wire('in>x1.p x1>y1.p in2>y1.q y1>z1.p z1>out.p')), isPart), null)
  assert.equal(rebuilt(TRIPLE, board([...nodes(), { id: 'w', type: 'd' }], wire('in>x1.p x1>y1.p in>y1.q y1>z1.p z1>out.p y1>w.p w>out.q')), isPart), null)
})

test('bypass: a board of primitives rebuilding a held part of three pieces, not one of two', () => {
  const host = board([{ id: 'x1', type: 'a' }, { id: 'y1', type: 'b', params: { k: 1 } }, { id: 'z1', type: 'c' }, { id: 'v', type: 'd' }],
    wire('in>x1.p x1>y1.p in>y1.q y1>z1.p z1>v.p v>out.p'))
  const pair = board([{ id: 'x', type: 'a' }, { id: 'y', type: 'b', params: { k: 1 } }], wire('in>x.p x>y.p in>y.q y>out.p'))
  const spec = {
    1: { adds: ['a', 'b', 'c', 'd'], builds: 'P', uses: ['a', 'b', 'c'], boards: [TRIPLE] },
    2: { builds: 'Q', uses: ['a', 'b'], boards: [pair] },
    3: { uses: ['a', 'b', 'c', 'd'], boards: [host] },
    4: { uses: ['P', 'd'], boards: [] },
  }
  assert.deepEqual(bypass(sketch([{ foundation: ['1', '2', '3', '4'] }], spec)), ['P@3'])
})

test('the part dependency graph: where each part comes in, what a built part is made of, who uses it', () => {
  const spec = {
    1: { adds: ['a'], uses: ['a'] }, 2: { adds: ['b'], builds: 'P', uses: ['a', 'b', 'a'] },
    t1: { builds: 'Q', uses: ['P', 'b'] }, 3: { uses: ['P'] },
  }
  const graph = dependencies(sketch([{ foundation: ['1', '2'], topics: [{ id: 't', levels: ['t1'] }] }, { title: { zh: '二', en: 'Two' }, foundation: ['3'] }], spec))
  assert.deepEqual(graph.parts.map((p) => [p.key, p.built, p.at, p.era, p.branch, p.optional, p.uses]), [
    ['a', false, ['1'], 1, null, false, ['1', '2']],
    ['b', false, ['2'], 1, null, false, ['2', 't1']],
    ['P', true, ['2'], 1, null, false, ['t1', '3']],
    ['Q', true, ['t1'], 1, 't', true, []],
  ])
  assert.deepEqual(graph.made, [{ from: 'a', to: 'P' }, { from: 'b', to: 'P' }, { from: 'P', to: 'Q' }, { from: 'b', to: 'Q' }])
  const text = mermaid(graph)
  assert.match(text, /^flowchart LR\n {2}subgraph era_1\["1"\]/)
  assert.match(text, /p2_P\[\["P · 2 · used 2"\]\]/)
  assert.match(text, /p2_P -\.-> p3_Q/)
  assert.doesNotMatch(text, /era_2/)
  assert.match(mermaid(graph, { levels: true }), /subgraph era_2\["2 · 二"\]\n {4}l3_3\["3"\]/)
  assert.match(dot(graph, { levels: true }), /l1_2 -> p2_P \[penwidth=2\];/)
})

test('findings a game leaves open are listed, new ones and ones met since are not', () => {
  const found = [{ rule: 'thin-practice', level: '1', part: 'a' }, { rule: 'thin-practice', level: '1', part: 'a' }, { rule: 'thin-practice', level: '5', part: 'b' }, { rule: 'bypass', level: '3', part: 'P' }]
  assert.deepEqual(againstOpen(found, { 'thin-practice': ['a@1', 'c@7'] }), [
    { rule: 'thin-practice', fresh: ['b@5'], left: ['a@1'], gone: ['c@7'] },
    { rule: 'bypass', fresh: ['P@3'], left: [], gone: [] },
  ])
  assert.deepEqual(againstOpen([], { nothing: ['x@1'] }), [{ rule: 'nothing', fresh: [], left: [], gone: ['x@1'] }])
})
