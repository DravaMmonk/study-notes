import { useMemo, useState } from 'react'
import { ArrowRightFromLine, CircuitBoard } from 'lucide-react'
import { CircuitLevel, useLevelBoard, useLevelRun } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { openRef } from '../../../shell/refs.js'
import { MISSING } from '../../../engine/circuit.js'
import { definedItem } from '../../../shell/parts/faces.jsx'
import SettingField, { valueWords } from '../../../shell/parts/SettingField.jsx'
import { fits, startBoard } from '../board.js'
import { FIXED_PARTS } from '../parts.js'
import { OPS } from '../ops.js'
import { runLevel, runTest } from '../run.js'
import { fmt, isImage, show } from '../image.js'
import ImageView, { Picture } from './ImageView.jsx'
import { ProjectionCase } from './benches/CameraScene.jsx'
import TestValues from './TestValues.jsx'
import SampleValues from './SampleValues.jsx'
import ImageViewSwitch from './ImageViewSwitch.jsx'
import PartDetail, { PartValues } from './PartDetail.jsx'
import { taskBoard, taskDefaults } from '../tooling.js'

// A circuit task of a vision game on the kit's circuit level (../../../shell/CircuitLevel.jsx): the task's inputs down
// the left, its outputs down the right, the parts between. A value is a number or an image (../image.js): a card shows
// a number as it is and an image as a small picture; the test under the board shows the images with their numbers
// while they are small enough to read. A run steps through every card the engine computes, test after test, and stops
// on the first test whose outputs are wrong. Hidden tests run with every run but say only how many fail; once the
// level is solved they join the list. A part the player built opens to show the board it runs. The game's own parts
// (parts.json) are the kernel's to draw (`defined`); this screen draws the task's inputs and outputs and the built
// parts, whose settings are parts.json presets drawn by the same kernel controls.

const FIXED_CARDS = {
  in: { name: { zh: '输入', en: 'Input' }, icon: ArrowRightFromLine, family: 'given', desc: { zh: '这一关给的值：一个数或一张图。', en: 'The value the level gives: a number or an image.' } },
  out: { name: { zh: '输出', en: 'Output' }, icon: ArrowRightFromLine, family: 'end', desc: { zh: '接到这里的值，就是电路的输出。', en: 'The value wired here is the circuit’s output.' } },
}

/** The editor's description of this task's own cards and its built parts (../../../circuit/model.js). */
function partsFor(level, game) {
  const builderOf = game.builtBy
  const labelOf = (list, name) => list?.find((x) => x.name === name)?.label ?? name
  return {
    inputs: (node) => (game.BUILT[node.type] ? builderOf(node.type).inputs.map((i) => i.name) : node.type === 'out' ? ['in'] : []),
    role: (node) => (node.type === 'in' ? 'source' : node.type === 'out' ? 'sink' : 'part'),
    label: (node) => {
      if (node.type === 'in') return labelOf([...(level.inputGroups ?? []), ...level.inputs], node.params?.name)
      if (node.type === 'out') return labelOf(level.outputs, node.params?.name)
      return game.BUILT[node.type] ? builderOf(node.type).builds.name : FIXED_CARDS[node.type]?.name ?? node.type
    },
    portLabel: (node, port) => (game.BUILT[node.type] ? labelOf(builderOf(node.type).inputs, port) : ''),
    family: (node) => (game.BUILT[node.type] ? 'built' : FIXED_CARDS[node.type]?.family),
    icon: (node) => (game.BUILT[node.type] ? CircuitBoard : FIXED_CARDS[node.type]?.icon),
    packed: (node) => Boolean(game.BUILT[node.type]),
    outputs: (node) => {
      if (node.type === 'in') return FIXED_PARTS.in.outputs(node)?.map((key) => ({ key, label: labelOf(level.inputs, key) })) ?? null
      const outs = game.BUILT[node.type] && builderOf(node.type).outputs
      return outs && outs.length > 1 ? outs.map((o) => ({ key: o.name, label: o.label })) : null
    },
    cardWidth: (node) => (game.BUILT[node.type] ? 176 : 150),
  }
}

/** A value on a card: a number, a small picture of an image, 「—」, or why there is none. */
function Value({ value, error }) {
  if (value === undefined) return <span className={`vi-error ${!error || error === MISSING ? 'is-missing' : ''}`}>{!error || error === MISSING ? tr('待接线', 'Not wired') : L(error)}</span>
  // A large image (a sample's) is a picture on a card, too many cells to number.
  if (isImage(value) && value.w * value.h > 64) return <span className="vi-thumb"><Picture value={value} scale={Math.max(1, Math.floor(96 / Math.max(value.w, value.h)))} /><small>{value.w} × {value.h}</small></span>
  if (isImage(value)) {
    const cell = value.c === 3 ? 58 : 32
    return <span className="vi-thumb"><span className={`vi-numeric-thumb ${value.w<=4&&value.h<=3?'is-small':''}`}><ImageView value={value} numbers cell={cell}/></span>{(value.w>4||value.h>3)&&<small>{value.w} × {value.h}</small>}</span>
  }
  return <span className="vi-value">{show(value)}</span>
}

const NONE = []
const valueOf = (node, key, view) => view.values.get(key ? `${node.id}#${key}` : node.id)

export default function Screen(screen) {
  const { game: shell, level: entry, solved, flags, progress } = screen
  const level = entry.source
  const game = shell.vision
  game.syncOwn(progress.built)
  const parts = useMemo(() => partsFor(level, game), [level, game])
  const { shown: palette, folded } = useMemo(() => game.offerIn(level, flags), [game, level, flags])
  const settingsIn = (type, key) => game.settingsIn(level, type, key)
  const openBoard = (saved) => taskBoard(saved?.nodes && fits(saved,level,game.partOf) ? saved : startBoard(level), new Set([...palette,...folded]), settingsIn, game.partOf)
  const state = useLevelBoard(screen, { open: openBoard, fresh: () => openBoard(null) })
  const board = { ...state, change: (next, options) => state.change(taskBoard(next, new Set([...palette,...folded]), settingsIn, game.partOf), options) }
  const { circuit, change } = board
  const [revealed] = useState(solved)
  const tests = useMemo(() => (revealed ? [...level.tests, ...level.hidden.map((t) => ({ ...t, hidden: true }))] : level.tests), [level, revealed])
  const checked = useMemo(() => runLevel({ ...level, tests }, circuit, game.partOf), [level, tests, circuit, game])
  const hidden = revealed ? NONE : level.hidden
  const hiddenFailed = useMemo(() => (hidden.length ? runLevel({ ...level, tests: hidden }, circuit, game.partOf).runs.filter((r) => r.fail).length : 0), [level, hidden, circuit, game])
  const sample = level.sample
  const run = useLevelRun(screen, board, {
    tests: [...tests.map((t, k) => ({ label: tr(`测试 ${k + 1}`, `Test ${k + 1}`), hidden: t.hidden })), ...(sample ? [{ label: tr('样张', 'Sample'), sample: true }] : [])],
    // A run checks every test at once and shows its result: an image circuit has nothing to step through.
    judge: () => ({ pass: checked.runs.every((r) => !r.fail), results: checked.runs.map((r) => ({ pass: !r.fail, reason: r.fail ? L(r.fail.why) : '' })) }),
    hidden: {
      count: hidden.length,
      fails: () => hiddenFailed,
      words: {
        note: tr(`另有 ${hidden.length} 个隐藏测试，每次运行一并检查，通关后公开。`, `${hidden.length} more hidden ${hidden.length === 1 ? 'test is' : 'tests are'} checked with every run and shown once you pass.`),
        failed: (n) => tr(`可见的测试全部通过，但 ${hidden.length} 个隐藏测试中有 ${n} 个没有通过：这块板可能只是恰好合上了这几个测试。`, `Every test shown passes, but ${n} of ${hidden.length} hidden ${hidden.length === 1 ? 'test fails' : 'tests fail'}: the board may only happen to fit these.`),
      },
    },
  })
  const builderOf = game.builtBy
  const defaults = (type) => taskDefaults(type, game.partOf, settingsIn)

  // What the board shows: what the engine computes for the test picked, or on the sample (the reference's outputs on
  // it beside the board's, never judged).
  const onSample = Boolean(sample) && run.at === tests.length
  const sampleRun = useMemo(() => (onSample ? runTest({ ...level, outputs: [] }, circuit, { ...sample, expect: {} }, game.partOf) : null), [onSample, level, sample, circuit, game])
  const sampleWant = useMemo(() => (onSample ? runTest({ ...level, outputs: [] }, level.solution, { ...sample, expect: {} }, game.partOf).outputs : null), [onSample, level, sample, game])
  const runOf = onSample ? sampleRun : checked.runs[run.at]
  const view = runOf
  const ended = run.over

  // A built part's settings: the parts.json presets its level names, drawn by the kernel's controls.
  const setParams = (node, params) => change({ ...circuit, nodes: circuit.nodes.map((n) => (n.id === node.id ? { ...n, params: { ...n.params, ...params } } : n)) })
  const builtFields = (node) => (game.BUILT[node.type]?.fields ?? []).filter((s) => (settingsIn(node.type, s.key)?.length ?? 2) > 1)
  const settings = (node, ctx, roomy = false) => {
    const fields = builtFields(node)
    if (!fields.length) return null
    const p = { ...defaults(node.type), ...node.params }
    return <div className="pf-settings">{fields.map((s) => <SettingField key={s.key} setting={s} value={p[s.key]} allowed={settingsIn(node.type, s.key)} readOnly={ctx.readOnly} roomy={roomy} phone={screen.phone} onChange={(v) => setParams(node, { [s.key]: v })} />)}</div>
  }
  // An output card shows what reaches it.
  const value = (node, ctx) => {
    const into = node.type === 'out' && ctx.board.circuit.wires.find((w) => w.to === node.id)
    return into ? <Value value={ctx.view.values.get(into.from)} error={ctx.view.errors.get(into.from.split('#')[0])} /> : <Value value={valueOf(node, null, ctx.view)} error={ctx.view.errors.get(node.id)} />
  }
  const body = (node, ctx) => <div className="vi-card">{settings(node, ctx)}{!ctx.board.parts.outputs(node) && value(node, ctx)}</div>
  // A defined part's value on each face: a number or a small picture on the card and the tile, every output inspected in
  // the detail.
  const defined = useMemo(() => ({
    of: (type) => game.defs[type] ?? null,
    defaults,
    ops: OPS,
    allowed: settingsIn,
    value: (node, ctx, output, face) => (face === 'detail' ? <PartValues node={node} ctx={ctx} phone={screen.phone} /> : output ? <Value value={valueOf(node, output, ctx.view)} error={ctx.view.errors.get(node.id)} /> : game.defs[node.type].outputs ? null : value(node, ctx)),
  }), [game, level, screen.phone]) // eslint-disable-line react-hooks/exhaustive-deps
  const builtItem = (type) => {
    const b = builderOf(type).builds
    return { type, label: b.name, desc: b.desc, icon: CircuitBoard, family: 'built', packed: true }
  }
  const itemOf = (type) => (game.BUILT[type] ? builtItem(type) : definedItem(type, game.defs[type], { fresh: entry.fresh?.includes(type) }, settingsIn))

  const test = onSample ? null : tests[run.at]
  const rows = level.outputs.map((o) => [o.label, onSample ? sampleWant[o.name] : test.expect[o.name], runOf.outputs[o.name]])
  const verdict = !onSample && ended && runOf.fail && <span className="vi-verdict is-fail">{L(runOf.fail.why)}</span>
  const strip = (
    <div className="vi-strip">
      {onSample
        ? <SampleValues rows={rows} />
        : <TestValues rows={rows} phone={screen.phone} tolerance={level.tolerance} />}
      {test && level.illustration === 'pinhole' && <ProjectionCase test={test} tests={tests} phone={screen.phone} />}
      {screen.phone && verdict}
    </div>
  )

  const descriptionOf = (n) => (game.BUILT[n.type] ? builderOf(n.type).builds.desc : null)
  return (
    <CircuitLevel
      screen={screen}
      board={board}
      run={run}
      className="vi-level"
      parts={parts}
      defined={defined}
      items={palette.map(itemOf)}
      folded={folded.map(itemOf)}
      view={view}
      card={{
        body,
        tileExtra: (node) => {
          const fields = builtFields(node)
          const p = { ...defaults(node.type), ...node.params }
          return fields.length ? <small>{fields.map((f) => valueWords(f, p[f.key])).join(' · ')}</small> : null
        },
        outNote: (node, key, ctx) => {
          const v = valueOf(node, key, ctx.view)
          return v === undefined ? null : isImage(v) ? `${v.w}×${v.h}` : fmt(v)
        },
        thumb: (n, ctx) => (ctx.board.parts.outputs(n) ? null : value(n, ctx)),
      }}
      canvas={{ width: 150, height: 110 }}
      defaults={defaults}
      brief={{ hint: level.hint }}
      results={strip}
      resultsTitle={!screen.phone && verdict}
      resultsAside={!screen.phone && !onSample && rows.some(([, want]) => isImage(want)) && <ImageViewSwitch />}
      details
      sheet={(node, ctx) => <PartDetail node={node} ctx={ctx} settings={settings(node, ctx, true)} description={descriptionOf(node)} phone={screen.phone} />}
      packed={{
        open: (node) => {
          const inside = game.BUILT[node.type]?.opens?.(node.params)
          return inside && { ...inside, parts: partsFor(inside.level, game) }
        },
        edit: (node) => openRef('level', builderOf(node.type).id),
        trace: () => ({ trace: runOf.trace }),
      }}
    />
  )
}
