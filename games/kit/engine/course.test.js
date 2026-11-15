// node --test games/kit/engine — the course audit's placement and abstraction rules (../course.js), the board matching
// under `bypass` (match.js) and the part dependency graph (deps.js), on small made-up courses.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { eraLevels, layout, levelLabels, againstOpen, audit, defineCourse, holds, itemOf, offer, reach, readItem, usable } from '../course.js'
import { dependencies, dot, mermaid } from './deps.js'
import { rebuilt } from './match.js'

const wires = (...pairs) => pairs.map(([from, to, required]) => ({ from, to, ...(required && { required: true }) }))
const serial = (...levels) => ({ levels: levels.map((id) => ({ id })), links: levels.slice(1).map((to, i) => ({ from: levels[i], to })) })

/**
 * A course from a sketch: eras of level ids; per level what it adds, builds and its reference uses (`uses`), its
 * machine abilities (`can`), its boards.
 */
function sketch(eras, spec, extra = {}) {
  const levels = eras.flatMap(eraLevels)
  const of = (l) => spec[l.id] ?? {}
  return defineCourse({
    levels: levels.map((id) => ({ id, unlocks: spec[id]?.builds ? [spec[id].builds] : [] })),
    eras: eras.map((e, k) => ({ id: k + 1, ...e })),
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
  const course = sketch([serial('1', '2', '3', '4', '5', '6', '6.5', '7')], spec)
  assert.deepEqual(idle(course), ['d@5'])
  assert.match(audit(course).find((f) => f.rule === 'idle-idea').text, /first put to work at 7, after 2 other new ideas \(e, f\)/)
})

test('an idea its own level does not use, or that no later level uses, is idle; a declaration uses what it declares', () => {
  const spec = { 1: { adds: ['a', 'b'], uses: ['a'] }, 2: { adds: ['c'], uses: ['a', 'c'] }, 3: { uses: ['a', 'b'] } }
  assert.deepEqual(idle(sketch([serial('1', '2', '3')], spec)), ['b@1', 'c@2'])
  const declaring = sketch([serial('1', '2', '3')], spec, { declares: (l) => (l.id === '1' ? ['b'] : []) })
  assert.deepEqual(idle(declaring), ['c@2'])
  // The last level's idea has nothing after it to wait for.
  assert.deepEqual(idle(sketch([serial('1')], { 1: { adds: ['a'], uses: ['a'] } })), [])
})

test('an idea keeps working inside a built part, and other branches bring nothing in between', () => {
  // a is next used only through P, built from it. On the parallel set, y's new idea is not between 1 and z.
  const spec = {
    1: { adds: ['a'], uses: ['a'] }, 2: { adds: ['b'], builds: 'P', uses: ['a', 'b'] }, x: { adds: ['c'], uses: ['c'] }, y: { adds: ['d'], uses: ['d'] },
    z: { uses: ['P', 'c'] }, w: { uses: ['d'] },
  }
  const eras = [{ levels: [{ id: '1' }, { id: '2' }, { id: 'x' }, { id: 'z' }, { id: 'y' }, { id: 'w' }], links: wires(['1','2'], ['2','x'], ['x','z'], ['2','y'], ['y','w']) }]
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
  assert.deepEqual(idle(sketch([serial('1', '2', '3', '4', '5')], spec, { concept: (p) => (p === 'b' ? 'a' : p) })), ['far@2'])
})

// Boards in the shared circuit model: in → parts → out.
const board = (nodes, wires) => ({ nodes: [{ id: 'in', type: 'in' }, { id: 'in2', type: 'in' }, { id: 'out', type: 'out' }, ...nodes], wires })
const wire = (text) => text.split(' ').map((s) => { const [from, to] = s.split('>'); const [id, port] = to.split('.'); return { from, to: id, port } })
const isPart = (t) => !['in', 'out'].includes(t)
const TRIPLE = board([{ id: 'x', type: 'a' }, { id: 'y', type: 'b', params: { k: 1 } }, { id: 'z', type: 'c' }], wire('in>x.p x>y.p in>y.q y>z.p z>out.p'))

test('a level starts only from a board it has seen', () => {
  const rules = (course, rule) => audit(course).filter((f) => f.rule === rule).map((f) => `${f.part}@${f.level}`)
  const eras = [{ levels: [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }, { id: 't1', optional: true }, { id: 't2', optional: true }, { id: 't3', optional: true }], links: wires(['a1','a2'], ['a2','a3'], ['a1','t1'], ['t1','t2',true], ['t2','t3',true]) }]
  const carries = (l) => ({ a3: ['a1'], t2: ['a3'] })[l.id] ?? []
  assert.deepEqual(rules(sketch(eras, {}, { carries }), 'carry-unseen'), ['a3@t2'])

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
  assert.deepEqual(bypass(sketch([serial('1', '2', '3', '4')], spec)), ['P@3'])
})

test('the part dependency graph: where each part comes in, what a built part is made of, who uses it', () => {
  const spec = {
    1: { adds: ['a'], uses: ['a'] }, 2: { adds: ['b'], builds: 'P', uses: ['a', 'b', 'a'] },
    t1: { builds: 'Q', uses: ['P', 'b'] }, 3: { uses: ['P'] },
  }
  const graph = dependencies(sketch([{ ...serial('1', '2', 't1'), levels: [{ id: '1' }, { id: '2' }, { id: 't1', optional: true }] }, { title: { zh: '二', en: 'Two' }, levels: [{ id: '3' }], links: wires(['2', '3']) }], spec))
  assert.deepEqual(graph.parts.map((p) => [p.key, p.built, p.at, p.era, p.optional, p.uses]), [
    ['a', false, ['1'], 1, false, ['1', '2']],
    ['b', false, ['2'], 1, false, ['2', 't1']],
    ['P', true, ['2'], 1, false, ['t1', '3']],
    ['Q', true, ['t1'], 1, true, []],
  ])
  assert.deepEqual(graph.made, [{ from: 'a', to: 'P' }, { from: 'b', to: 'P' }, { from: 'P', to: 'Q' }, { from: 'b', to: 'Q' }])
  const text = mermaid(graph)
  assert.match(text, /^flowchart LR\n {2}subgraph era_1\["1"\]/)
  assert.match(text, /p2_P\[\["P · 2 · used 2"\]\]/)
  assert.match(text, /p2_P -\.-> p3_Q/)
  assert.doesNotMatch(text, /era_2/)
  assert.match(mermaid(graph, { levels: true }), /subgraph era_2\["2 · Two"\]\n {4}l3_3\["3"\]/)
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
  const c = sketch([serial('first', 'next', 'use')], spec, { abstraction: true, carries: (l) => l.id === 'next' ? ['first'] : [] })
  assert.deepEqual(audit(c).filter((f) => ['unused', 'bypass'].includes(f.rule)), [])
  const end = sketch([serial('first')], { first: spec.first }, { abstraction: true })
  assert.ok(audit(end).some((f) => f.rule === 'unused'))
  const instrument = { ...end, showcase: () => 'A terminal instrument callable from the parts book.' }
  assert.ok(!audit(instrument).some((f) => f.rule === 'unused'))
})


test('only staged tasks exceeding the open-part limit are crowded', () => {
  const course = sketch([serial('base', 'upgrade')], {}, { openParts: (l) => l.id === 'upgrade' ? [{ task: 'within', staged: true, count: 8 }, { task: 'crowded', staged: true, count: 9 }, { task: 'plain', staged: false, count: 20 }] : [] })
  const findings = audit(course).filter((f) => f.rule === 'open-crowded')
  assert.equal(findings.length, 1)
  assert.equal(findings[0].part, 'crowded')
  assert.match(findings[0].text, /9 loose parts/)
})

test('a level holds, of the parts met before it, those its tray lists, in the tray’s order; another tray keeps its own', () => {
  const trays = { gates: ['b', 'a'], proof: ['c', 'x', 'd'] }
  const spec = { 1: { adds: ['a'], tray: 'gates' }, 2: { adds: ['b'], tray: 'gates' }, 3: { adds: ['c'], tray: 'proof' }, 4: { builds: 'x', uses: ['c'], tray: 'proof' }, 5: { adds: ['d'], tray: 'proof', uses: ['d'] }, 6: { tray: 'gates', uses: ['a'] } }
  const course = sketch([serial('1', '2', '3', '4'), { levels: [{ id: '5' }, { id: '6' }], links: wires(['4', '5'], ['5', '6']) }], spec, { trays, tray: (l) => spec[l.id]?.tray ?? null })
  assert.deepEqual(reach(course, { id: '5' }), ['c', 'x', 'd'])
  // The gates come back on the next truth circuit, though proof levels came in between.
  assert.deepEqual(reach(course, { id: '6' }), ['b', 'a'])
  assert.deepEqual(offer(course, { id: '6' }, new Set(['x'])), { shown: ['a'], folded: ['b'], types: ['a', 'b'] })
  assert.deepEqual(audit(course).filter((f) => f.rule.includes('tray')), [])
})

test('a part on no tray, and a tray part nothing brings in, are reported', () => {
  const spec = { 1: { adds: ['a', 'b'] } }
  const course = sketch([serial('1')], spec, { trays: { only: ['a', 'c'] }, tray: () => 'only' })
  assert.deepEqual(audit(course).filter((f) => f.rule.includes('tray')).map((f) => `${f.rule} ${f.part}`), ['off-tray b', 'tray-unmet c'])
})

test('an item is a part, one of its settings, or one value of a setting', () => {
  assert.equal(itemOf('shift'), 'shift')
  assert.equal(itemOf('shift', 'border'), 'shift.border')
  assert.equal(itemOf('shift', 'border', 'wrap'), 'shift.border=wrap')
  assert.deepEqual(readItem('shift'), { part: 'shift' })
  assert.deepEqual(readItem('shift.border'), { part: 'shift', key: 'border' })
  assert.deepEqual(readItem('gain.by=0.5'), { part: 'gain', key: 'by', value: '0.5' })
})

test('a task gives and withholds parts for itself alone, over what the course has it hold by default', () => {
  const spec = { 1: { adds: ['a'] }, 2: { adds: ['b'], builds: 'P', uses: ['a', 'b'] }, 3: { withholds: ['a'], gives: ['Q', 'c'] }, 4: { builds: 'Q' }, 5: {} }
  const course = sketch([serial('1', '2', '3', '4', '5')], spec, { gives: (l) => spec[l.id]?.gives ?? [], withholds: (l) => spec[l.id]?.withholds ?? [] })
  // By default: what the levels before brought, and a built part once its level is solved.
  assert.deepEqual(usable(course, { id: '3' }, new Set()), ['b', 'Q', 'c'])
  assert.deepEqual(usable(course, { id: '3' }, new Set(['P'])), ['b', 'P', 'Q', 'c'])
  // The level after holds what the course gives it, no more and no less.
  assert.deepEqual(usable(course, { id: '5' }, new Set(['P'])), ['a', 'b', 'P'])
  const has = holds(course, { id: '3' }, new Set())
  assert.deepEqual(['a', 'b', 'P', 'Q', 'c'].map((p) => has(p)), [false, true, false, true, true])
})

test('a setting and a value are held from the start, unless a level opens them or a flag earns them; a task gives and withholds them too', () => {
  const spec = { 1: { adds: ['a'] }, 2: { opens: ['a.mode=fast'] }, 3: { withholds: ['a.mode=slow', 'a.gain'], gives: ['a.edge=wrap'] }, 4: { builds: 'W' }, 5: {} }
  const course = sketch([serial('1', '2', '3', '4', '5')], spec, {
    opens: (l) => spec[l.id]?.opens ?? [],
    gives: (l) => spec[l.id]?.gives ?? [],
    withholds: (l) => spec[l.id]?.withholds ?? [],
    needs: (item) => ({ 'a.edge=wrap': 'W', W: 'W' })[item] ?? null,
  })
  const at = (id, flags = []) => holds(course, { id }, new Set(flags))
  // Nothing names a.mode=slow or a.gain: there from the start. a.mode=fast comes in at level 2.
  assert.deepEqual([at('1')('a', 'mode', 'slow'), at('1')('a', 'gain'), at('1')('a', 'mode', 'fast'), at('2')('a', 'mode', 'fast'), at('5')('a', 'mode', 'fast')], [true, true, false, true, true])
  // A value that needs a flag is the player's once earned.
  assert.deepEqual([at('5')('a', 'edge', 'wrap'), at('5', ['W'])('a', 'edge', 'wrap')], [false, true])
  // Level 3 alone: without a value and a whole setting (and so every value of it), with a value not earned yet.
  assert.deepEqual([at('3')('a', 'mode', 'slow'), at('3')('a', 'gain'), at('3')('a', 'gain', '2'), at('3')('a', 'edge', 'wrap'), at('3')('a', 'mode', 'fast')], [false, false, false, true, true])
  assert.deepEqual([at('4')('a', 'mode', 'slow'), at('4')('a', 'gain', '2'), at('4')('a', 'edge', 'wrap')], [true, true, false])
})

test('a task holds its level’s part once a task before it has built it; the task building it does not, though an earlier level built it', () => {
  const spec = { 1: { adds: ['a'], builds: 'P' }, 2: { builds: 'P' }, 3: {} }
  // Level 2 upgrades P at its second task of three.
  const builds = (l) => (!spec[l.id]?.builds || (l.id === '2' && l.task !== undefined && l.task < 1) ? [] : [spec[l.id].builds])
  const course = sketch([serial('1', '2', '3')], spec, { builds })
  const flags = new Set(['P'])
  assert.deepEqual([0, 1, 2].map((task) => usable(course, { id: '2', task }, flags)), [['a'], ['a'], ['P', 'a']])
  assert.deepEqual(usable(course, { id: '3', task: 0 }, flags), ['a', 'P'])
})

test('parallel routes, optional unlocks, numeric labels are independent', () => {
  const era = {
    id: 0, levels: [{ id: 'start' }, { id: 'a' }, { id: 'c' }, { id: 'b', optional: true }, { id: 'd' }, { id: 'join' }, { id: 'extra', optional: true }, { id: 'last', optional: true }],
    links: wires(['start','a'], ['start','c'], ['a','b'], ['c','d'], ['b','join'], ['d','join'], ['a','extra'], ['c','extra'], ['extra','last',true])
  }
  const { place, requires, required } = layout([era])
  assert.deepEqual(requires.get('join'), ['b', 'd'])
  assert.deepEqual(required.get('join'), ['a', 'd'])
  assert.deepEqual(required.get('extra'), ['a', 'c'])
  assert.deepEqual(required.get('last'), ['extra'])
  assert.equal(place.get('extra').optional, true)
  const labels = levelLabels([era])
  assert.deepEqual([...labels], [['start', '0-1'], ['a', '0-2'], ['c', '0-3'], ['b', '0-4'], ['d', '0-5'], ['join', '0-6'], ['extra', '0-7'], ['last', '0-8']])
})
