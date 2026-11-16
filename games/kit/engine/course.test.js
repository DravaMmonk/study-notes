// Technical course checks and dependency graphs on small made-up courses.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { eraLevels, layout, levelLabels, againstOpen, audit, defineCourse, holds, mapRows, fresh, offer, reach, usable } from '../course.js'
import { dependencies, dot, mermaid } from './deps.js'

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
test('a level starts only from a board it has seen', () => {
  const rules = (course, rule) => audit(course).filter((f) => f.rule === rule).map((f) => `${f.part}@${f.level}`)
  const eras = [{ levels: [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }, { id: 't1', optional: true }, { id: 't2', optional: true }, { id: 't3', optional: true }], links: wires(['a1','a2'], ['a2','a3'], ['a1','t1'], ['t1','t2',true], ['t2','t3',true]) }]
  const carries = (l) => ({ a3: ['a1'], t2: ['a3'] })[l.id] ?? []
  assert.deepEqual(rules(sketch(eras, {}, { carries }), 'carry-unseen'), ['a3@t2'])

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
  const found = [{ rule: 'not-built', level: '1', part: 'a' }, { rule: 'not-built', level: '1', part: 'a' }, { rule: 'not-built', level: '5', part: 'b' }, { rule: 'built-later', level: '3', part: 'P' }]
  assert.deepEqual(againstOpen(found, { 'not-built': ['a@1', 'c@7'] }), [
    { rule: 'not-built', fresh: ['b@5'], left: ['a@1'], gone: ['c@7'] },
    { rule: 'built-later', fresh: ['P@3'], left: [], gone: [] },
  ])
  assert.deepEqual(againstOpen([], { nothing: ['x@1'] }), [{ rule: 'nothing', fresh: [], left: [], gone: ['x@1'] }])
})



test('a tray orders available parts, while the reference and featured parts set what first appears', () => {
  const trays = { gates: { items: ['b', 'a'] }, proof: { items: ['c', 'x', 'd'] } }
  const spec = { 1: { adds: ['a'], tray: 'gates' }, 2: { adds: ['b'], tray: 'gates' }, 3: { adds: ['c'], tray: 'proof' }, 4: { builds: 'x', uses: ['c'], tray: 'proof' }, 5: { adds: ['d'], tray: 'proof', uses: ['d'] }, 6: { tray: 'gates', uses: ['a'], featured: ['d'] } }
  const course = sketch([serial('1', '2', '3', '4'), { levels: [{ id: '5' }, { id: '6' }], links: wires(['4', '5'], ['5', '6']) }], spec, { trays, tray: (l) => spec[l.id]?.tray ?? null, featured: (l) => spec[l.id]?.featured ?? [] })
  assert.deepEqual(reach(course, { id: '5' }), ['c', 'x', 'd', 'a', 'b'])
  // The gates come back on the next truth circuit, though proof levels came in between.
  assert.deepEqual(reach(course, { id: '6' }), ['b', 'a', 'c', 'x', 'd'])
  assert.deepEqual(offer(course, { id: '6' }, new Set(['x'])), { shown: ['a', 'd'], folded: ['b', 'c', 'x'], types: ['a', 'd', 'b', 'c', 'x'] })
  assert.deepEqual(audit(course).filter((f) => f.rule.includes('tray')), [])
})

test('a tray part nothing brings in is reported', () => {
  const spec = { 1: { adds: ['a', 'b'] } }
  const course = sketch([serial('1')], spec, { trays: { only: { items: ['a', 'c'] } }, tray: () => 'only' })
  assert.deepEqual(audit(course).filter((f) => f.rule.includes('tray')).map((f) => `${f.rule} ${f.part}`), ['tray-unmet c'])
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

test('stages upgrade one piece, carry along prerequisites and can be given or capped locally', () => {
  const pieces = { a: { settings: { mode: { control: 'select', options: [{ value: 'slow' }] }, gain: { control: 'number', fixed: true, default: 1 } }, stages: [
    { id: 'a-fast', settings: { mode: { options: [{ value: 'slow' }, { value: 'fast' }] } } },
    { id: 'a-gain', settings: { gain: { fixed: false } } },
  ] } }
  const spec = { 1: { adds: ['a'] }, 2: { opens: ['a-fast'] }, 3: { gives: ['a-gain'], withholds: ['a-fast'] }, 4: {} }
  const course = sketch([serial('1', '2', '3', '4')], spec, { pieces,
    opens: l => spec[l.id].opens ?? [], gives: l => spec[l.id].gives ?? [], withholds: l => spec[l.id].withholds ?? [] })
  const at = id => holds(course, { id }, new Set())
  assert.equal(at('1')('a', 'mode', 'fast'), false)
  assert.equal(at('2')('a', 'mode', 'fast'), true)
  assert.equal(at('3')('a', 'mode', 'fast'), false)
  assert.equal(at('3')('a', 'gain'), false)
  assert.equal(at('4')('a', 'gain'), false)
  assert.equal(at('4')('a', 'mode', 'fast'), true)
  assert.deepEqual(usable(course, { id: '3' }, new Set()), ['a'])
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

test('parallel routes distinguish skippable levels, optional levels, and strict prerequisites', () => {
  const era = {
    id: 0, levels: [{ id: 'start' }, { id: 'a' }, { id: 'c' }, { id: 'b', skippable: true }, { id: 'd' }, { id: 'join' }, { id: 'extra', optional: true }, { id: 'last', optional: true }],
    links: wires(['start','a'], ['start','c'], ['a','b'], ['c','d'], ['b','join'], ['b','extra',true], ['d','join'], ['a','extra'], ['c','extra'], ['extra','last'])
  }
  const { place, requires, required } = layout([era])
  assert.deepEqual(requires.get('join'), ['b', 'd'])
  assert.deepEqual(required.get('join'), ['a', 'd'])
  assert.deepEqual(required.get('extra'), ['b', 'a', 'c'])
  assert.deepEqual(required.get('last'), ['extra'])
  assert.equal(place.get('extra').optional, true)
  assert.equal(place.get('extra').skippable, false)
  assert.equal(place.get('b').optional, false)
  const labels = levelLabels([era])
  assert.deepEqual([...labels], [['start', '0-1'], ['a', '0-2'], ['c', '0-3'], ['b', '0-4'], ['d', '0-5'], ['join', '0-6'], ['extra', '0-7'], ['last', '0-8']])
})

test('the map lays a chapter out a layer at a time, three to a row, around the rows the course saves', () => {
  const requires = new Map(Object.entries({ a: [], b: [], c: [], d: [], e: ['a'], f: ['e'], g: ['b'] }))
  const ids = [...requires.keys()]
  const rows = (saved) => mapRows(ids, requires, { rows: saved }).rows
  assert.deepEqual(rows(), [['a', 'b', 'c'], ['d'], ['e', 'g'], ['f']])
  assert.deepEqual(mapRows(ids, requires).at.get('g'), { row: 2, col: 0.5 })
  // A saved row stays as written, empty places too; the rest goes around it, each layer after the one before, and a
  // level a saved one needs goes in above it, pushing it down.
  assert.deepEqual(rows([[null, 'e']]), [['a', 'b', 'c'], ['d'], ['g'], [null, 'e'], ['f']])
  assert.deepEqual(rows([[null, 'e'], ['b']]), [['a', 'c', 'd'], [null, 'e'], ['b'], ['g'], ['f']])
  assert.deepEqual(mapRows(ids, requires, { rows: [[null, 'e']] }).at.get('e'), { row: 3, col: 0.5 })
  // Levels no longer on the chapter drop out of its saved rows.
  assert.deepEqual(mapRows(['a'], new Map([['a', []]]), { rows: [['gone', 'a'], ['gone']] }).rows, [['a']])
})


test('a stage introduced by adds upgrades its stable piece identity', () => {
  const spec = { 1: { adds: ['a'] }, 2: { adds: ['a-fast'] }, 3: {} }
  const pieces = { a: { settings: { mode: { control: 'select', options: [{ value: 'slow' }] } }, stages: [{ id: 'a-fast', settings: { mode: { options: [{ value: 'slow' }, { value: 'fast' }] } } }] } }
  const course = sketch([serial('1', '2', '3')], spec, { pieces })
  assert.deepEqual(course.adds({ id: '2' }), [])
  assert.deepEqual(course.opens({ id: '2' }), ['a-fast'])
  assert.equal(holds(course, { id: '1' }, new Set())('a', 'mode', 'fast'), false)
  assert.equal(holds(course, { id: '3' }, new Set())('a', 'mode', 'fast'), true)
})

test('new markers distinguish pieces and stages, including earlier tasks and prerequisite branches', () => {
  const stages = { tool: { stages: [{ id: 'tool-wide' }, { id: 'tool-all' }] }, other: {} }
  const course = defineCourse({
    pieces: stages, levels: [{ id: 'start' }, { id: 'next' }, { id: 'branch' }],
    eras: [{ id: 'chapter', levels: [{ id: 'start' }, { id: 'next' }, { id: 'branch' }], links: [{ from: 'start', to: 'next' }, { from: 'start', to: 'branch' }] }],
    primitives: ['tool', 'other'], adds: () => ['tool', 'other'], needs: () => null, builds: () => [],
    opens: at => at.id === 'next' ? at.task === 0 ? ['tool-wide'] : ['tool-wide', 'tool-all'] : [],
  })
  assert.deepEqual([...fresh(course, { id: 'start' })], ['tool', 'other'])
  assert.deepEqual([...fresh(course, { id: 'next', task: 0 })], ['tool-wide'])
  assert.deepEqual([...fresh(course, { id: 'next', task: 1 })], ['tool-all'])
  assert.deepEqual([...fresh(course, { id: 'branch' })], [])
  assert.equal(Object.hasOwn(course, 'concept'), false)
  assert.deepEqual(audit(course), [])
})
