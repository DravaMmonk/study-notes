import { useMemo, useState } from 'react'
import { CircuitBoard } from 'lucide-react'
import { CircuitLevel, useLevelBoard, useLevelRun } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { openRef } from '../../../shell/refs.js'
import { MISSING, portsOf } from '../../../engine/circuit.js'
import { fits, startBoard } from '../board.js'
import { FIXED, PARTS } from '../parts.js'
import { runLevel } from '../run.js'
import { fmt, isImage, show } from '../image.js'
import { CARDS, CHANNELS, OUTSIDE, PORT_LABELS } from './catalog.js'
import ImageView from './ImageView.jsx'

// A circuit task of a vision game on the kit's circuit level (../../../shell/CircuitLevel.jsx): the task's inputs down
// the left, its outputs down the right, the parts between. A value is a number or an image (../image.js): a card shows
// a number as it is and an image as a small picture; the test under the board shows the images with their numbers
// while they are small enough to read. A run steps through every card the engine computes, test after test, and stops
// on the first test whose outputs are wrong. Hidden tests run with every run but say only how many fail; once the
// level is solved they join the list. A part the player built opens to show the board it runs.

/** The editor's description of this task's cards (../../../circuit/model.js). */
function partsFor(level, game) {
  const builderOf = game.builtBy
  const labelOf = (list, name) => list?.find((x) => x.name === name)?.label ?? name
  return {
    inputs: (node) => (game.BUILT[node.type] ? builderOf(node.type).inputs.map((i) => i.name) : PARTS[node.type] ? portsOf(PARTS[node.type], node) : []),
    role: (node) => (node.type === 'in' ? 'source' : node.type === 'out' ? 'sink' : 'part'),
    label: (node) => {
      if (node.type === 'in') return labelOf(level.inputs, node.params?.name)
      if (node.type === 'out') return labelOf(level.outputs, node.params?.name)
      return game.BUILT[node.type] ? builderOf(node.type).builds.name : CARDS[node.type]?.name ?? node.type
    },
    portLabel: (node, port) => (game.BUILT[node.type] ? labelOf(builderOf(node.type).inputs, port) : PORT_LABELS[node.type]?.[port] ?? ''),
    family: (node) => (game.BUILT[node.type] ? 'built' : CARDS[node.type]?.family),
    icon: (node) => (game.BUILT[node.type] ? CircuitBoard : CARDS[node.type]?.icon),
    packed: (node) => Boolean(game.BUILT[node.type]),
    outputs: (node) => {
      if (PARTS[node.type]?.outputs) return PARTS[node.type].outputs(node).map((key) => ({ key, label: key }))
      const outs = game.BUILT[node.type] && builderOf(node.type).outputs
      return outs && outs.length > 1 ? outs.map((o) => ({ key: o.name, label: o.label })) : null
    },
    cardWidth: (node) => (game.BUILT[node.type] ? 176 : 150),
  }
}

/** An image small enough to read cell by cell. */
const small = (img) => img.w * img.h <= 36

/** A value on a card: a number, a small picture of an image, 「—」, or why there is none. */
function Value({ value, error }) {
  if (value === undefined) return <span className={`vi-error ${!error || error === MISSING ? 'is-missing' : ''}`}>{!error || error === MISSING ? tr('待接线', 'Not wired') : L(error)}</span>
  if (isImage(value)) return <span className="vi-thumb"><ImageView value={value} cell={Math.max(2, Math.min(16, Math.floor(110 / Math.max(value.w, value.h))))} /><small>{value.w} × {value.h}</small></span>
  return <span className="vi-value">{show(value)}</span>
}

/** A value in the test table: an image with its numbers while it is small, else its picture. */
function Cell({ value }) {
  if (value === undefined) return null
  if (!isImage(value)) return <span className="vi-value">{show(value)}</span>
  return <ImageView value={value} numbers={small(value)} axes={small(value)} cell={small(value) ? undefined : Math.max(3, Math.floor(160 / Math.max(value.w, value.h)))} />
}

const NONE = []
const valueOf = (node, key, view) => view.values.get(key ? `${node.id}#${key}` : node.id)
// A new card's settings are its defaults written in, so the card shows them.
const defaults = (type) => (type === 'const' ? { value: '0' } : type === 'lookup' ? { outside: 'error' } : type === 'channel' ? { c: '0' } : {})

export default function Screen(screen) {
  const { game: shell, level: entry, solved, flags, progress } = screen
  const level = entry.source
  const game = shell.vision
  game.syncOwn(progress.built)
  const parts = useMemo(() => partsFor(level, game), [level, game])
  const board = useLevelBoard(screen, { open: (saved) => (saved?.nodes && fits(saved, level, game.partOf) ? saved : startBoard(level)), fresh: () => startBoard(level) })
  const { circuit, change } = board
  const [revealed] = useState(solved)
  const tests = useMemo(() => (revealed ? [...level.tests, ...level.hidden.map((t) => ({ ...t, hidden: true }))] : level.tests), [level, revealed])
  const checked = useMemo(() => runLevel({ ...level, tests }, circuit, game.partOf), [level, tests, circuit, game])
  const hidden = revealed ? NONE : level.hidden
  const hiddenFailed = useMemo(() => (hidden.length ? runLevel({ ...level, tests: hidden }, circuit, game.partOf).runs.filter((r) => r.fail).length : 0), [level, hidden, circuit, game])
  const run = useLevelRun(screen, board, {
    tests: tests.map((t, k) => ({ label: tr(`测试 ${k + 1}`, `Test ${k + 1}`), hidden: t.hidden })),
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
  const { shown: palette, folded } = useMemo(() => game.offerIn(level, flags), [game, level, flags])
  const builderOf = game.builtBy

  // What the board shows: what the engine computes for the test picked.
  const runOf = checked.runs[run.at]
  const view = runOf
  const ended = run.over

  const setParam = (node, key, value) => change({ ...circuit, nodes: circuit.nodes.map((n) => (n.id === node.id ? { ...n, params: { ...n.params, [key]: value } } : n)) })
  const settings = (node, ctx) => {
    const p = { ...defaults(node.type), ...node.params }
    const stop = (e) => e.stopPropagation()
    if (node.type === 'const') {
      return (
        <label className="vi-field">
          <span>{tr('数值', 'Value')}</span>
          <input type="number" step="any" value={p.value} readOnly={ctx.readOnly} onPointerDown={stop} onChange={(e) => setParam(node, 'value', e.target.value)} />
        </label>
      )
    }
    if (node.type === 'lookup') {
      return (
        <label className="vi-field">
          <span>{tr('出界', 'Outside')}</span>
          <select value={p.outside} disabled={ctx.readOnly} onPointerDown={stop} onChange={(e) => setParam(node, 'outside', e.target.value)}>
            {OUTSIDE.map(([v, text]) => <option key={v} value={v}>{L(text)}</option>)}
          </select>
        </label>
      )
    }
    if (node.type === 'channel') {
      return (
        <label className="vi-field">
          <span>{tr('位置', 'Position')}</span>
          <select value={p.c} disabled={ctx.readOnly} onPointerDown={stop} onChange={(e) => setParam(node, 'c', e.target.value)}>
            {CHANNELS.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
          </select>
        </label>
      )
    }
    return null
  }
  // An output card shows what reaches it.
  const value = (node, ctx) => {
    const into = node.type === 'out' && ctx.board.circuit.wires.find((w) => w.to === node.id)
    return into ? <Value value={ctx.view.values.get(into.from)} error={ctx.view.errors.get(into.from.split('#')[0])} /> : <Value value={valueOf(node, null, ctx.view)} error={ctx.view.errors.get(node.id)} />
  }
  const body = (node, ctx) => <div className="vi-card">{settings(node, ctx)}{!ctx.board.parts.outputs(node) && value(node, ctx)}</div>
  const builtItem = (type) => {
    const b = builderOf(type).builds
    return { type, label: b.name, desc: b.desc, icon: CircuitBoard, family: 'built', packed: true }
  }
  const itemOf = (type) => (game.BUILT[type] ? builtItem(type) : { type, label: CARDS[type].name, desc: CARDS[type].desc, icon: CARDS[type].icon, family: CARDS[type].family, fresh: entry.fresh?.includes(type) })

  const test = tests[run.at]
  const rows = [
    ...level.inputs.map((i) => [i.label, test.inputs[i.name], undefined]),
    ...level.outputs.map((o) => [o.label, test.expect[o.name], runOf.outputs[o.name]]),
  ]
  const strip = (
    <div className="vi-strip">
      <table className="vi-test">
        <thead><tr><th /><th>{tr('应当', 'Wanted')}</th><th>{tr('这块板', 'This board')}</th></tr></thead>
        <tbody>{rows.map(([label, want, got], k) => <tr key={k}><th>{L(label)}</th><td><Cell value={want} /></td><td><Cell value={got} /></td></tr>)}</tbody>
      </table>
      {ended && runOf.fail && <p className="vi-verdict is-fail">{L(runOf.fail.why)}</p>}
    </div>
  )

  return (
    <CircuitLevel
      screen={screen}
      board={board}
      run={run}
      className="vi-level"
      parts={parts}
      items={palette.map(itemOf)}
      folded={folded.map(itemOf)}
      view={view}
      card={{
        body,
        outNote: (node, key, ctx) => {
          const v = valueOf(node, key, ctx.view)
          return v === undefined ? null : isImage(v) ? `${v.w}×${v.h}` : fmt(v)
        },
        thumb: (n, ctx) => (ctx.board.parts.outputs(n) ? null : value(n, ctx)),
      }}
      canvas={{ width: 150, height: 110 }}
      defaults={defaults}
      brief={{ hint: level.hint }}
      describe={(n) => (game.BUILT[n.type] ? builderOf(n.type).builds.desc : FIXED.includes(n.type) ? null : CARDS[n.type]?.desc)}
      results={strip}
      resultsTitle={tr(`测试 ${run.at + 1}`, `Test ${run.at + 1}`)}
      packed={{
        open: (node) => {
          const inside = game.BUILT[node.type]?.opens?.()
          return inside && { ...inside, parts: partsFor(inside.level, game) }
        },
        edit: (node) => openRef('level', builderOf(node.type).id),
        trace: () => ({ trace: runOf.trace }),
      }}
    />
  )
}
