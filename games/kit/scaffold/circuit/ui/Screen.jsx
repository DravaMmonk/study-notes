import { useMemo, useState } from 'react'
import { CircuitBoard } from 'lucide-react'
import { CircuitLevel, useLevelBoard, useLevelRun } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { openRef } from '../../../shell/refs.js'
import { MISSING } from '../../../engine/circuit.js'
import { viewAt } from '../../../engine/trace.js'
import { definedItem } from '../../../shell/parts/faces.jsx'
import { FIXED, fits, startBoard } from '../board.js'
import { OPS } from '../ops.js'
import { runLevel, show } from '../run.js'
import { CARDS } from './catalog.js'

// A __name__ level on the kit's circuit level (../../../shell/CircuitLevel.jsx): the level's inputs down the left, its
// outputs down the right, the parts it holds between. A run steps through every card the engine computes, test after
// test, and stops on the first test whose outputs are wrong. Hidden tests run with every run but say only how many
// fail; once the level is solved they join the list. A part the player built opens to show the board it runs. The
// game's own parts (parts.json) are the kernel's to draw (`defined`); this screen draws the level's cards and the built
// parts.

/** The editor's description of this level's own cards and its built parts (../../../circuit/model.js). */
function partsFor(level, game) {
  const builderOf = game.builtBy
  const labelOf = (list, name) => list?.find((x) => x.name === name)?.label ?? name
  return {
    inputs: (node) => (game.BUILT[node.type] ? builderOf(node.type).inputs.map((i) => i.name) : node.type === 'out' ? ['in'] : []),
    role: (node) => (node.type === 'in' ? 'source' : node.type === 'out' ? 'sink' : 'part'),
    label: (node) => {
      if (node.type === 'in') return labelOf(level.inputs, node.params?.name)
      if (node.type === 'out') return labelOf(level.outputs, node.params?.name)
      return game.BUILT[node.type] ? builderOf(node.type).builds.name : CARDS[node.type]?.name ?? node.type
    },
    portLabel: (node, port) => (game.BUILT[node.type] ? labelOf(builderOf(node.type).inputs, port) : ''),
    family: (node) => (game.BUILT[node.type] ? 'built' : CARDS[node.type]?.family),
    icon: (node) => (game.BUILT[node.type] ? CircuitBoard : CARDS[node.type]?.icon),
    packed: (node) => Boolean(game.BUILT[node.type]),
    outputs: (node) => {
      const outs = game.BUILT[node.type] && builderOf(node.type).outputs
      return outs && outs.length > 1 ? outs.map((o) => ({ key: o.name, label: o.label })) : null
    },
    cardWidth: (node) => (game.BUILT[node.type] ? 176 : 140),
  }
}

/** What a card shows of a value: a number, 「—」, or why it has none. */
function Value({ value, error }) {
  if (value === undefined) return <span className={`__name__-error ${!error || error === MISSING ? 'is-missing' : ''}`}>{!error || error === MISSING ? tr('待接线', 'Not wired') : L(error)}</span>
  return <span className="__name__-value">{show(value)}</span>
}

const valueOf = (node, key, view) => view.values.get(key ? `${node.id}#${key}` : node.id)

export default function Screen(screen) {
  const { game: shell, level: entry, solved, flags, progress } = screen
  const level = entry.source
  const game = shell.__name__
  game.syncOwn(progress.built)
  const parts = useMemo(() => partsFor(level, game), [level, game])
  const board = useLevelBoard(screen, { open: (saved) => (saved?.nodes && fits(saved, level, game.partOf) ? saved : startBoard(level)), fresh: () => startBoard(level) })
  const { circuit } = board
  const [revealed] = useState(solved)
  const tests = useMemo(() => (revealed ? [...level.tests, ...level.hidden.map((t) => ({ ...t, hidden: true }))] : level.tests), [level, revealed])
  const checked = useMemo(() => runLevel({ ...level, tests }, circuit, game.partOf), [level, tests, board.version, game])
  const hidden = revealed ? [] : level.hidden
  const hiddenFailed = useMemo(() => (hidden.length ? runLevel({ ...level, tests: hidden }, circuit, game.partOf).runs.filter((r) => r.fail).length : 0), [level, hidden, board.version, game])
  const run = useLevelRun(screen, board, {
    tests: tests.map((t, k) => ({ label: tr(`测试 ${k + 1}`, `Test ${k + 1}`), hidden: t.hidden })),
    steps: { of: (k) => checked.runs[k].trace, check: (k) => checked.runs[k].fail?.why ?? '' },
    hidden: {
      count: hidden.length,
      fails: () => hiddenFailed,
      words: {
        note: tr(`另有 ${hidden.length} 个隐藏测试，每次运行一并检查，通关后公开。`, `${hidden.length} more hidden ${hidden.length === 1 ? 'test is' : 'tests are'} checked with every run and shown once you pass.`),
        failed: (n) => tr(`可见的测试全部通过，但 ${hidden.length} 个隐藏测试中有 ${n} 个没有通过。`, `Every test shown passes, but ${n} of ${hidden.length} hidden ${hidden.length === 1 ? 'test fails' : 'tests fail'}.`),
      },
    },
  })
  const { shown: palette, folded } = useMemo(() => game.offerIn(level, flags), [game, level, flags])
  const builderOf = game.builtBy
  const defined = useMemo(() => ({
    of: (type) => game.defs[type] ?? null,
    defaults: game.defaultsOf,
    ops: OPS,
    value: (node, ctx, output) => (output ? <Value value={valueOf(node, output, ctx.view)} error={ctx.view.errors.get(node.id)} /> : value(node, ctx)),
  }), [game]) // eslint-disable-line react-hooks/exhaustive-deps

  // What the board shows: during a run, what the engine had computed by the step shown; before one, the test picked.
  const runOf = checked.runs[run.at]
  const shown = run.playback.shown(run.at)
  const view = run.run ? viewAt(runOf.trace, shown.at >= 0 ? shown.at : shown.list.length - 1) : runOf
  const ended = Boolean(run.run && (run.run.test > run.at || run.run.over))

  // An output card shows what reaches it.
  const value = (node, ctx) => {
    const into = node.type === 'out' && ctx.board.circuit.wires.find((w) => w.to === node.id)
    return into ? <Value value={ctx.view.values.get(into.from)} error={ctx.view.errors.get(into.from.split('#')[0])} /> : <Value value={valueOf(node, null, ctx.view)} error={ctx.view.errors.get(node.id)} />
  }
  const body = (node, ctx) => <div className="__name__-card">{!ctx.board.parts.outputs(node) && value(node, ctx)}</div>
  const builtItem = (type) => {
    const b = builderOf(type).builds
    return { type, label: b.name, desc: b.desc, icon: CircuitBoard, family: 'built', packed: true }
  }
  const itemOf = (type) => (game.BUILT[type] ? builtItem(type) : definedItem(type, game.defs[type], { fresh: entry.fresh?.includes(type) }))

  const test = tests[run.at]
  const rows = [
    ...level.inputs.map((i) => [i.label, show(test.inputs[i.name]), null]),
    ...level.outputs.map((o) => [o.label, show(test.expect[o.name]), ended || !run.run ? show(runOf.outputs[o.name]) : '']),
  ]
  const strip = (
    <div className="__name__-strip">
      <table className="__name__-test">
        <thead><tr><th /><th>{tr('应当', 'Wanted')}</th><th>{tr('这块板', 'This board')}</th></tr></thead>
        <tbody>{rows.map(([label, want, got], k) => <tr key={k}><th>{L(label)}</th><td>{want}</td><td>{got ?? ''}</td></tr>)}</tbody>
      </table>
      {ended && runOf.fail && <p className="__name__-verdict is-fail">{L(runOf.fail.why)}</p>}
      {run.run?.over && run.run.final && <p className="__name__-verdict is-fail">{run.run.final}</p>}
    </div>
  )

  return (
    <CircuitLevel
      screen={screen}
      board={board}
      run={run}
      className="__name__-level"
      parts={parts}
      defined={defined}
      items={palette.map(itemOf)}
      folded={folded.map(itemOf)}
      view={view}
      card={{
        body,
        outNote: (node, key, ctx) => {
          const v = valueOf(node, key, ctx.view)
          return v === undefined ? null : show(v)
        },
        thumb: (n, ctx) => (ctx.board.parts.outputs(n) ? null : value(n, ctx)),
      }}
      canvas={{ width: 140, height: 96 }}
      brief={{ hint: level.hint }}
      describe={(n) => (game.BUILT[n.type] ? builderOf(n.type).builds.desc : FIXED.includes(n.type) ? null : CARDS[n.type]?.desc)}
      results={strip}
      packed={{
        open: (node) => {
          const inside = game.BUILT[node.type]?.opens?.()
          return inside && { ...inside, parts: partsFor(inside.level, game) }
        },
        edit: (node) => openRef('level', builderOf(node.type).id),
        trace: () => ({ trace: runOf.trace, ...(run.run && shown.at >= 0 ? { upTo: shown.at, step: runOf.trace[shown.at] } : {}) }),
      }}
    />
  )
}
