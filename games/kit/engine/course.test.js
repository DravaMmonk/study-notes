// node --test games/kit/engine — the course audit's placement and abstraction rules (../course.js), the board matching
// under `bypass` (match.js) and the part dependency graph (deps.js), on small made-up courses.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { againstOpen, audit, defineCourse } from '../course.js'
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
const idle = (course) => audit(course).filter((f) => f.rule === 'idle-idea').map((f) => `${f.part}@${f.level}`)
const bypass = (course) => audit(course).filter((f) => f.rule === 'bypass').map((f) => `${f.part}@${f.level}`)

test('a new idea is put to work before two more new ideas come in; no number of levels is asked for', () => {
  // a: used by 2, right after it. b: 3 brings c before b returns at 4, one idea between, fine. d: e and f come in
  // before d's first use at 7.
  const spec = {
    1: { adds: ['a'], uses: ['a'] }, 2: { adds: ['b'], uses: ['a', 'b'] }, 3: { adds: ['c'], uses: ['c'] }, 4: { uses: ['b', 'c'] },
    5: { adds: ['d'], uses: ['d'] }, 6: { adds: ['e'], uses: ['e'] }, 6.5: { adds: ['f'], uses: ['f', 'e'] }, 7: { uses: ['d', 'f'] },
  }
  const course = sketch([{ foundation: ['1', '2', '3', '4', '5', '6', '6.5', '7'] }], spec)
  assert.deepEqual(idle(course), ['d@5'])
  assert.match(audit(course).find((f) => f.rule === 'idle-idea').text, /first put to work at 7, after 2 other new ideas \(e, f\)/)
})

test('an idea its own level does not use, or that no later level uses, is idle; a declaration uses what it declares', () => {
  const spec = { 1: { adds: ['a', 'b'], uses: ['a'] }, 2: { adds: ['c'], uses: ['a', 'c'] }, 3: { uses: ['a', 'b'] } }
  assert.deepEqual(idle(sketch([{ foundation: ['1', '2', '3'] }], spec)), ['b@1', 'c@2'])
  const declaring = sketch([{ foundation: ['1', '2', '3'] }], spec, { declares: (l) => (l.id === '1' ? ['b'] : []) })
  assert.deepEqual(idle(declaring), ['c@2'])
  // The last level's idea has nothing after it to wait for.
  assert.deepEqual(idle(sketch([{ foundation: ['1'] }], { 1: { adds: ['a'], uses: ['a'] } })), [])
})

test('an idea keeps working inside a built part, and other branches bring nothing in between', () => {
  // a is next used only through P, built from it. On the parallel set, y's new idea is not between 1 and z.
  const spec = {
    1: { adds: ['a'], uses: ['a'] }, 2: { adds: ['b'], builds: 'P', uses: ['a', 'b'] }, x: { adds: ['c'], uses: ['c'] }, y: { adds: ['d'], uses: ['d'] },
    z: { uses: ['P', 'c'] }, w: { uses: ['d'] },
  }
  const eras = [{ foundation: ['1', '2', { parallel: [{ id: 'p', levels: ['x', 'z'] }, { id: 'q', levels: ['y', 'w'] }] }] }]
  assert.deepEqual(idle(sketch(eras, spec)), [])
  // Without P, a waits for z behind b and c.
  assert.deepEqual(idle(sketch(eras, { ...spec, 2: { adds: ['b'], uses: ['b'] }, z: { uses: ['a', 'b', 'c'] } })), ['a@1'])
})

test('an ability of the machine is an idea too, and an idea is a concept', () => {
  const spec = {
    1: { adds: ['a'], uses: ['a'], can: ['view'] }, 2: { adds: ['b'], uses: ['b'], can: ['view', 'far'] }, 3: { adds: ['c'], uses: ['c'], can: ['view'] },
    4: { adds: ['e'], uses: ['e'], can: ['view'] }, 5: { uses: ['a', 'c', 'e'], can: ['far'] },
  }
  // b is a's concept, so 2 brings only far; far waits at 5 behind c and e.
  assert.deepEqual(idle(sketch([{ foundation: ['1', '2', '3', '4', '5'] }], spec, { concept: (p) => (p === 'b' ? 'a' : p) })), ['far@2'])
})

// Boards in the shared circuit model: in → parts → out.
const board = (nodes, wires) => ({ nodes: [{ id: 'in', type: 'in' }, { id: 'in2', type: 'in' }, { id: 'out', type: 'out' }, ...nodes], wires })
const wire = (text) => text.split(' ').map((s) => { const [from, to] = s.split('>'); const [id, port] = to.split('.'); return { from, to: id, port } })
const isPart = (t) => !['in', 'out'].includes(t)
const TRIPLE = board([{ id: 'x', type: 'a' }, { id: 'y', type: 'b', params: { k: 1 } }, { id: 'z', type: 'c' }], wire('in>x.p x>y.p in>y.q y>z.p z>out.p'))

test('a level starts only from a board it has seen; a topic’s finale solves the levels before it', () => {
  const rules = (course, rule) => audit(course).filter((f) => f.rule === rule).map((f) => `${f.part}@${f.level}`)
  const eras = [{ foundation: ['a1', 'a2', 'a3'], topics: [{ id: 't', after: 'a1', levels: ['t1', 't2', 't3'] }] }]
  const carries = (l) => ({ a3: ['a1'], t2: ['a3'] })[l.id] ?? []
  assert.deepEqual(rules(sketch(eras, {}, { carries }), 'carry-unseen'), ['a3@t2'])
  const finale = (topic) => ({ level: topic.levels.at(-1), solves: (id) => (id === 't2' ? 'its board fails test 1' : null) })
  assert.deepEqual(rules(sketch(eras, {}, { finale }), 'topic-finale'), ['t3@t2'])
  assert.deepEqual(rules(sketch(eras, {}), 'topic-finale'), [], 'a course with no finale hook checks no topic')
})

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
  const found = [{ rule: 'idle-idea', level: '1', part: 'a' }, { rule: 'idle-idea', level: '1', part: 'a' }, { rule: 'idle-idea', level: '5', part: 'b' }, { rule: 'bypass', level: '3', part: 'P' }]
  assert.deepEqual(againstOpen(found, { 'idle-idea': ['a@1', 'c@7'] }), [
    { rule: 'idle-idea', fresh: ['b@5'], left: ['a@1'], gone: ['c@7'] },
    { rule: 'bypass', fresh: ['P@3'], left: [], gone: [] },
  ])
  assert.deepEqual(againstOpen([], { nothing: ['x@1'] }), [{ rule: 'nothing', fresh: [], left: [], gone: ['x@1'] }])
})

test('carrying a published board into its next revision is reuse, not an abstraction bypass', () => {
  const spec = { first: { builds: 'P', uses: ['a', 'b', 'c'] }, next: { builds: 'P', uses: ['a', 'b', 'c'] }, use: { uses: ['P'] } }
  const c = sketch([{ foundation: ['first', 'next', 'use'] }], spec, { abstraction: true, carries: (l) => l.id === 'next' ? ['first'] : [] })
  assert.deepEqual(audit(c).filter((f) => ['unused', 'bypass'].includes(f.rule)), [])
  const end = sketch([{ foundation: ['first'] }], { first: spec.first }, { abstraction: true })
  assert.ok(audit(end).some((f) => f.rule === 'unused'))
  const instrument = { ...end, showcase: () => 'A terminal instrument callable from the parts book.' }
  assert.ok(!audit(instrument).some((f) => f.rule === 'unused'))
})


test('only staged tasks exceeding the open-part limit are crowded', () => {
  const course = sketch([{ foundation: ['base', 'upgrade'] }], {}, { openParts: (l) => l.id === 'upgrade' ? [{ task: 'within', staged: true, count: 8 }, { task: 'crowded', staged: true, count: 9 }, { task: 'plain', staged: false, count: 20 }] : [] })
  const findings = audit(course).filter((f) => f.rule === 'open-crowded')
  assert.equal(findings.length, 1)
  assert.equal(findings[0].part, 'crowded')
  assert.match(findings[0].text, /9 loose parts/)
})
