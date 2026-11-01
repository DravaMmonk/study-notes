// node --test (npm test) — the pipeline's checks: the blueprint audit (each rule on a blueprint that breaks it), the
// eras a blueprint lays out, a slot renamed with its level, and the copy lint.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { auditBlueprint, erasOf, renameSlot } from './blueprint.js'
import { lintCopy } from './lint.js'

const t = (s) => ({ zh: s, en: s })
const slot = (id, extra = {}) => ({ id, title: t(id), task: t(id), role: 'foundation', uses: [], ...extra })
const series = (id, slots, extra = {}) => ({ id, title: t(id), kind: 'foundation', slots, ...extra })

// One era: a wire, a register brought and practised, a part built from it and used last.
const base = () => ({
  topic: t('x'), learner: t('x'), endpoint: t('x'), scope: t('x'), sources: [],
  mechanisms: [{ id: 'tick-bus', where: t('x'), why: t('x') }],
  abilities: [{ id: 'wire', about: t('x') }],
  machines: [{ id: 'm1', title: t('m'), can: ['wire'], lacks: t('x') }],
  ideas: [{ id: 'memory', about: t('x'), wall: t('x') }, { id: 'count', about: t('x'), wall: t('x') }],
  primitives: [{ part: 'reg', about: t('x'), why: t('x') }, { part: 'add', about: t('x'), why: t('x') }],
  built: [{ part: 'counter', about: t('x'), from: ['reg', 'add'] }],
  eras: [{
    id: 1, machine: 'm1', title: t('e'), question: t('q'), why: t('w'),
    series: [
      series('mem', [
        slot('1-1', { idea: 'memory', adds: ['reg'], uses: ['wire', 'reg', 'memory'] }),
        slot('1-2', { role: 'practice', dimension: 'surface', uses: ['reg', 'memory'] }),
        slot('1-3', { role: 'practice', dimension: 'combine', uses: ['reg', 'memory', 'wire'] }),
      ]),
      series('cnt', [
        slot('1-4', { idea: 'count', adds: ['add'], builds: 'counter', uses: ['reg', 'add', 'count', 'memory'] }),
        slot('1-5', { role: 'practice', dimension: 'false', uses: ['counter', 'count'] }),
      ]),
    ],
  }],
})
const rules = (bp) => auditBlueprint(bp).filter((f) => !f.report).map((f) => `${f.rule} ${f.at}`)

test('a sound blueprint passes the audit', () => {
  assert.deepEqual(rules(base()), [])
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
  assert.ok(broken((bp, s) => { s[0].slots[2].dimension = 'surface' }).includes('bp-practice 1-1'))
  assert.ok(broken((bp, s) => { s[0].slots[2].dimension = 'depth' }).includes('bp-practice 1-1'))
  assert.ok(broken((bp, s) => { s[0].slots[0].uses = ['wire', 'reg'] }).includes('bp-first-use 1-1'))
  assert.ok(broken((bp, s) => { delete s[0].slots[0].idea }).includes('bp-adds-idea 1-1'))
  assert.ok(broken((bp) => { bp.machines[0].can = [] }).includes('bp-machine 1-1'))
  assert.ok(broken((bp, s) => { s.push(series('ch', [slot('1-6', { role: 'challenge', uses: ['counter'] })], { kind: 'challenge' })) }).includes('bp-challenge 1-6'))
  // A series that needs nothing from the one before it is a branch, not a line.
  assert.ok(broken((bp, s) => {
    bp.ideas.push({ id: 'other', about: t('x'), wall: t('x') })
    s.splice(1, 0, series('lone', [slot('1-9', { idea: 'other', uses: ['other', 'wire'] }), slot('1-10', { role: 'practice', dimension: 'combine', uses: ['other', 'wire'] })]))
  }).includes('bp-branch lone'))
  // The last series must stand on what the era built.
  assert.ok(broken((bp, s) => { s.push(series('end', [slot('1-7', { role: 'practice', dimension: 'combine', uses: ['reg', 'count'] })])) }).includes('bp-abstraction end'))
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
