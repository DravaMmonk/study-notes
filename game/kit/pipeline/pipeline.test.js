// node --test (npm test) — the pipeline's checks: the blueprint audit (each rule on a blueprint that breaks it), the
// eras a blueprint lays out, a slot renamed with its level, the copy lint and the pedagogy lint.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { auditBlueprint, conformance, erasOf, renameSlot } from './blueprint.js'
import { lintCopy } from './lint.js'
import { boardShape, lintPedagogy } from './pedagogy.js'

const t = (s) => ({ zh: s, en: s })
const slot = (id, extra = {}) => ({ id, title: t(id), task: t(id), question: t(`why ${id}?`), chain: [t('try'), t('see')], role: 'foundation', uses: [], ...(extra.role === 'practice' ? { facet: t('a new case') } : {}), ...extra })
const series = (id, slots, extra = {}) => ({ id, title: t(id), kind: 'foundation', slots, ...extra })
const point = (id, basis = 'lecture') => ({ id, term: t(`the ${id} term`), about: t('x'), source: 'notes/lecture-1.md §2', wall: t('x'), basis })

// One era: a wire, a register brought and practised, a part built from it and used last.
const base = () => ({
  topic: t('x'), learner: t('x'), endpoint: t('x'), scope: t('x'), sources: ['notes/lecture-1.md'],
  mechanisms: [{ id: 'tick-bus', where: t('x'), why: t('x') }],
  abilities: [{ id: 'wire', about: t('x') }],
  machines: [{ id: 'm1', title: t('m'), can: ['wire'], lacks: t('x') }],
  knowledge: [point('memory'), point('count')],
  primitives: [{ part: 'reg', about: t('x'), why: t('x') }, { part: 'add', about: t('x'), why: t('x') }],
  built: [{ part: 'counter', about: t('x'), from: ['reg', 'add'] }],
  eras: [{
    id: 1, machine: 'm1', title: t('e'), question: t('q'), why: t('w'),
    series: [
      series('mem', [
        slot('1-1', { teaches: 'memory', adds: ['reg'], uses: ['wire', 'reg', 'memory'] }),
        slot('1-2', { role: 'practice', dimension: 'direction', uses: ['reg', 'memory'] }),
        slot('1-3', { role: 'practice', dimension: 'combine', uses: ['reg', 'memory', 'wire'] }),
      ]),
      series('cnt', [
        slot('1-4', { teaches: 'count', adds: ['add'], builds: 'counter', uses: ['reg', 'add', 'count', 'memory'] }),
        slot('1-5', { role: 'practice', dimension: 'false', uses: ['counter', 'count'] }),
      ]),
    ],
  }],
})
const rules = (bp) => auditBlueprint(bp).filter((f) => !f.report).map((f) => `${f.rule} ${f.at}`)

test('a sound blueprint passes the audit', () => {
  assert.deepEqual(rules(base()), [])
})

test('a part built again further down the path is an upgrade, not a second part', () => {
  const bp = base()
  bp.eras[0].series[1].slots.push(slot('1-6', { role: 'practice', dimension: 'combine', builds: 'counter', uses: ['counter', 'reg', 'count'] }))
  assert.deepEqual(rules(bp), [])
})

test('each rule catches the blueprint that breaks it', () => {
  const broken = (edit) => {
    const bp = base()
    edit(bp, bp.eras[0].series)
    return rules(bp)
  }
  assert.ok(broken((bp) => { bp.eras[0].series[0].slots[0].uses.push('nothing') }).includes('bp-refs 1-1'))
  assert.ok(broken((bp, s) => { s[0].slots[1].uses.push('counter') }).includes('bp-order 1-2'))
  assert.ok(broken((bp, s) => { s[1].slots[1].uses = ['count'] }).includes('bp-unused counter'))
  assert.ok(broken((bp, s) => { s[0].slots[2].dimension = 'direction' }).includes('bp-practice 1-1'))
  assert.ok(broken((bp, s) => { s[0].slots[2].dimension = 'depth' }).includes('bp-practice 1-1'))
  assert.ok(broken((bp, s) => { s[0].slots[0].uses = ['wire', 'reg'] }).includes('bp-first-use 1-1'))
  assert.ok(broken((bp, s) => { delete s[0].slots[0].teaches }).includes('bp-adds-teaches 1-1'))
  // Knowledge: every slot works on a point, every point is taught and comes from a source, parts are no points.
  assert.ok(broken((bp, s) => { s[0].slots[1].uses = ['reg'] }).includes('bp-knowledge 1-2'))
  assert.ok(broken((bp) => { bp.knowledge.push(point('unused')) }).includes('bp-taught unused'))
  assert.ok(broken((bp) => { bp.knowledge[0].source = 'somewhere else' }).includes('bp-source memory'))
  assert.ok(broken((bp) => { bp.knowledge[0].term = t('reg') }).includes('bp-part-point memory'))
  assert.ok(broken((bp) => { bp.primitives[1].about = t('Adder'); bp.knowledge[1].term = t('adder') }).includes('bp-part-point count'))
  assert.ok(!broken((bp) => { bp.knowledge[1].term = t('counter') }).includes('bp-part-point count'), 'a built part may be a point')
  assert.ok(broken((bp, s) => { delete s[0].slots[1].facet }).includes('bp-facet 1-2'))
  assert.ok(broken((bp, s) => { s[0].slots[0].chain = [t('one step')] }).some((r) => r.startsWith('bp-schema')))
  assert.ok(broken((bp, s) => { delete s[0].slots[0].question }).includes('bp-question 1-1'))
  // The main path teaches the lectures' theory only; a technical point lives in an optional topic.
  const library = (bp, s, slotExtra = {}) => {
    bp.knowledge.push(point('library', 'technical'))
    s.push(series('tools', [slot('T1', { role: 'intro', teaches: 'library', uses: ['library', 'reg'], ...slotExtra })], { kind: 'topic', after: '1-2' }))
  }
  assert.deepEqual(broken((bp, s) => library(bp, s)), [])
  assert.ok(broken((bp, s) => { bp.knowledge[0].basis = 'technical' }).includes('bp-main-tech 1-1'))
  assert.ok(broken((bp, s) => { library(bp, s); s[0].slots[2].uses.push('library') }).includes('bp-main-tech 1-3'))
  assert.ok(broken((bp) => { delete bp.knowledge[0].basis }).includes('bp-point memory'))
  assert.ok(broken((bp) => { delete bp.knowledge[1].source }).includes('bp-point count'))
  assert.ok(broken((bp) => { bp.machines[0].can = [] }).includes('bp-machine 1-1'))
  assert.ok(broken((bp, s) => { s.push(series('ch', [slot('1-6', { role: 'challenge', uses: ['counter'] })], { kind: 'challenge' })) }).includes('bp-challenge 1-6'))
  // A series that needs nothing from the one before it is a branch, not a line.
  assert.ok(broken((bp, s) => {
    bp.knowledge.push(point('other'))
    s.splice(1, 0, series('lone', [slot('1-9', { teaches: 'other', uses: ['other', 'wire'] }), slot('1-10', { role: 'practice', dimension: 'combine', uses: ['other', 'wire'] })]))
  }).includes('bp-branch lone'))
  // The last series must stand on what the era built.
  assert.ok(broken((bp, s) => { s.push(series('end', [slot('1-7', { role: 'practice', dimension: 'combine', uses: ['reg', 'count'] })])) }).includes('bp-abstraction end'))
  // A point spread over many slots is reported for a person to judge.
  const heavy = base()
  heavy.eras[0].series[0].slots.push(...[5, 6, 7].map((k) => slot(`1-${k}x`, { role: 'practice', dimension: ['depth', 'scaffold', 'false'][k - 5], uses: ['reg', 'memory'] })))
  assert.ok(auditBlueprint(heavy).some((f) => f.rule === 'bp-heavy' && f.report))
})

test('the eras a blueprint lays out: parallel series as one set, topics and challenges apart', () => {
  const bp = base()
  bp.eras[0].series[1].parallel = 'p'
  bp.eras[0].series.push(series('other', [slot('1-8', { uses: ['reg'] })], { parallel: 'p' }))
  bp.eras[0].series.push(series('top', [slot('N1', { role: 'intro', uses: ['counter'] })], { kind: 'topic', after: '1-5' }))
  const [era] = erasOf(bp)
  assert.deepEqual(era.foundation, ['1-1', '1-2', '1-3', { parallel: [{ id: 'cnt', title: t('cnt'), levels: ['1-4', '1-5'] }, { id: 'other', title: t('other'), levels: ['1-8'] }] }])
  assert.deepEqual(era.topics, [{ id: 'top', title: t('top'), levels: ['N1'], after: '1-5' }])
})

test('a slot renamed with its level, wherever the blueprint names it', () => {
  const bp = base()
  bp.eras[0].series.push(series('top', [slot('N1', { role: 'intro', uses: ['counter'] })], { kind: 'topic', after: '1-5' }))
  bp.requests = [{ id: 'r', kind: 'domain', about: t('x'), for: ['1-5'], status: 'open' }]
  const renamed = renameSlot(bp, '1-5', '1-6')
  assert.equal(renamed.eras[0].series[1].slots[1].id, '1-6')
  assert.equal(renamed.eras[0].series[2].after, '1-6')
  assert.deepEqual(renamed.requests[0].for, ['1-6'])
  // A level moving onto a slot the blueprint already plans leaves the blueprint as it is.
  assert.equal(renameSlot(bp, '1-5', '1-4'), bp)
})

test('the copy lint names the rule each text breaks', () => {
  const level = (fields) => ({ levels: [{ id: '1-1', title: t('a'), brief: t('do it'), ...fields }], glossary: { entries: [] } })
  const found = (fields) => lintCopy(level(fields)).map((f) => f.rule)
  assert.deepEqual(found({}), [])
  assert.deepEqual(found({ brief: { zh: '对输入进行比较。', en: 'Compare the inputs.' } }), ['copy-banned'])
  assert.deepEqual(found({ intro: [{ t: { zh: '新元件「加一」：输入加 1。', en: 'A new part: Add one.' } }] }), ['copy-intro-part'])
  assert.deepEqual(found({ brief: { zh: '放一块卡片。', en: 'Place a card.' } }), ['copy-banned'])
  assert.deepEqual(found({ brief: { zh: '搭一块网卡。', en: 'Build a network card.' } }), [])
  assert.deepEqual(found({ after: { zh: '<part-ref to="part:reg"></part-ref>记住了它。', en: '<part-ref to="part:reg"></part-ref> kept it.' } }), ['copy-after-part'])
  assert.deepEqual(found({ after: { zh: '下一关会用到它。', en: 'The next level uses it.' } }), ['copy-ahead'])
  assert.deepEqual(found({ brief: { zh: '交出和，因为后面要用。', en: 'Give the sum, because it is needed.' } }), ['copy-brief-why'])
})

test('the pedagogy lint: the same board twice whatever its ids, the same prose twice, a bench that slides to green', () => {
  const board = (id, value) => ({
    nodes: [{ id: 'a', type: 'in', params: { name: 'a' } }, { id, type: 'const', params: { value } }, { id: `${id}s`, type: 'add', params: {} }, { id: 'out', type: 'out', params: { name: 'out' } }],
    wires: [{ from: 'a', to: `${id}s`, port: 'a' }, { from: id, to: `${id}s`, port: 'b' }, { from: `${id}s`, to: 'out', port: 'in' }],
  })
  assert.equal(boardShape(board('one', '1')), boardShape(board('k', '1')))
  assert.notEqual(boardShape(board('one', '1')), boardShape(board('one', '2')))
  const text = (s) => ({ zh: s, en: s })
  const level = (id, more) => ({ id, title: text(id), tasks: [{ id, brief: text(`brief of ${id}, long enough`), ...more }], intro: [{ t: text('The pipeline needs new numbers now.') }] })
  const bench = { knobs: { Z: { min: 1, max: 8, step: 1 }, f: { min: 1, max: 4, step: 1, fixed: true } }, layout: { main: ['goals'] } }
  const content = { levels: [level('1'), level('2'), level('3', { bench }), { id: '4', tasks: [{ id: '4', bench: { ...bench, check: 'submit' } }] }] }
  const spec = { blueprints: [{ level: '1', board: board('one', '1') }, { level: '2', board: board('k', '1') }, { level: '3', board: board('k', '1'), naive: true }] }
  const found = lintPedagogy(content, spec).map((f) => `${f.rule} ${f.at}${f.report ? ' (report)' : ''}`)
  assert.deepEqual(found, ['pd-repeat-board 2', 'pd-repeat-text 2 intro[0].t', 'pd-repeat-text 3 intro[0].t', 'pd-slide 3 (report)'])
})

test('conformance: the level that brings a point links its entry, opened there', () => {
  const bp = base()
  const ids = ['1-1', '1-2', '1-3', '1-4', '1-5']
  const level = (id, intro = 'no link') => ({ id, title: t(id), adds: bp.eras[0].series.flatMap((x) => x.slots).find((s) => s.id === id).adds, tasks: [{ id, brief: t(intro) }], ...(id === '1-4' ? { builds: { type: 'counter' } } : {}) })
  const content = (levels, entries) => ({ levels, eras: erasOf(bp), primitives: ['reg', 'add'], glossary: { entries } })
  const spec = { course: { index: new Map(), levels: [] } }
  const terms = (c) => conformance(bp, c, spec).filter((f) => f.rule === 'bp-term' || f.rule === 'bp-entry').map((f) => `${f.rule} ${f.at}`)
  assert.deepEqual(terms(content(ids.map((id) => level(id)), [{ id: 'memory', at: '1-2' }])), ['bp-entry memory', 'bp-term 1-1', 'bp-entry count', 'bp-term 1-4'])
  const linked = ids.map((id) => level(id, id === '1-1' ? 'a <wiki-ref to="memory"></wiki-ref>' : id === '1-4' ? 'a <wiki-ref to="count"></wiki-ref>' : 'none'))
  assert.deepEqual(terms(content(linked, [{ id: 'memory', at: '1-1' }, { id: 'count', at: '1-4' }])), [])
  // A main-path level that links a technical point's entry carries technical content.
  bp.knowledge.push(point('library', 'technical'))
  const leaky = linked.map((l) => (l.id === '1-2' ? { ...l, tasks: [{ id: '1-2', brief: t('see <wiki-ref to="library"></wiki-ref>') }] } : l))
  assert.ok(conformance(bp, content(leaky, []), spec).some((f) => f.rule === 'bp-main-link' && f.at === '1-2'))
})
