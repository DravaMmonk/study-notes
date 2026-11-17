import { createElement, use, useEffect, useMemo, useRef, useState } from 'react'
import { callOf } from 'kernel/view'
import { benchRun, openKnobs, startValues } from './../../core/bench.js'
import { PHONE, useMedia } from 'kernel/view'
import { PickMark } from 'kernel/view'
import './bench.css'

// The parameter bench (games/DESIGN.md 6.4, the data in ../../core/bench.js): one screen for every bench. It keeps
// the knob values (one set per stage, one value per case for a per-case knob), the model's process and a running
// repeat, judges the goal on what the model computes, steps through the stages, and lays out the display items the
// bench's layout names, loaded through the module display registry.
//
// A display component gets { params, ctx: the bench's state below, children: its `with` items }. On a bench judged on
// submit, `ctx.revealed` says whether the setting on the knobs has been checked: a display draws its result only then.

const BLOCK_KEYS = ['panel', 'stack', 'row']
const isBlock = (b) => b && typeof b === 'object' && BLOCK_KEYS.some((k) => k in b)

export default function Bench({ resource: { bench, model, displays }, onSolve, theme }) {
  const items = displays ? use(displays) : {}
  const phone = useMedia(PHONE)
  const stages = bench.stages ?? null
  const cases = bench.cases ?? null
  const [stageIndex, setStageIndex] = useState(0)
  const [reached, setReached] = useState(0)
  const [passed, setPassed] = useState(() => (stages ?? []).map(() => false))
  const [starts] = useState(() => (stages ?? [null]).map((s) => startValues(bench, s)))
  const [values, setValues] = useState(starts)
  const [process, setProcess] = useState(() => model.start?.() ?? null)
  const [running, setRunning] = useState(null) // { action, left } while an action repeats
  const [caseIndex, setCaseIndex] = useState(0)
  const [ui, setUiState] = useState({})
  // A bench judged on submit keeps, per stage, the setting last checked: the result shows while the knobs stay there.
  const submit = bench.check === 'submit'
  const [checkedAt, setCheckedAt] = useState(() => (stages ?? [null]).map(() => null))
  const solved = useRef(false)

  const stage = stages?.[stageIndex] ?? null
  const at = stages ? stageIndex : 0
  const v = values[at]
  const open = openKnobs(bench, stage)
  const left = running?.left ?? 0
  const run = useMemo(() => benchRun(bench, model, v, { stageIndex, process, running: left }), [bench, model, v, stageIndex, process, left])
  const { views, verdicts } = run
  const revealed = !submit || checkedAt[at] === v
  const pass = revealed && run.pass
  const check = () => setCheckedAt((all) => all.map((x, i) => (i === at ? v : x)))

  // A stage is passed the first time its goal holds; the bench is solved once every stage is, or its goal holds.
  useEffect(() => {
    if (!pass) return
    const now = stages ? passed.map((done, i) => done || i === stageIndex) : null
    if (stages && !passed[stageIndex]) setPassed(now)
    if ((stages ? now.every(Boolean) : true) && !solved.current) {
      solved.current = true
      onSolve()
    }
  }, [pass, stages, passed, stageIndex, onSolve])

  // A repeating action runs its act every `every` ms; the model may also ask for an act after a while (a clock).
  const latest = useRef(v)
  latest.current = v
  useEffect(() => {
    if (!running) return undefined
    const timer = setTimeout(() => {
      setProcess((p) => model.act(p, running.action.act, latest.current, running.action.arg))
      setRunning((r) => (r.left > 1 ? { ...r, left: r.left - 1 } : null))
    }, running.action.every ?? 100)
    return () => clearTimeout(timer)
  }, [running, model])
  useEffect(() => {
    const next = model.after?.(process, v)
    if (!next) return undefined
    const timer = setTimeout(() => setProcess((p) => model.act(p, next.act, latest.current, next.arg)), next.ms)
    return () => clearTimeout(timer)
  }, [model, process, v])

  const set = (name, value) => {
    const change = typeof name === 'object' ? name : { [name]: value }
    setValues((all) => {
      if (Object.entries(change).every(([key, next]) => Object.is(all[at][key], next))) return all
      return all.map((old, i) => (i === at ? { ...old, ...change } : old))
    })
  }
  const start = starts[at]
  const act = (action, arg = action.arg) => {
    if (action.reset) return set(Object.fromEntries(action.reset.map((k) => [k, start[k]])))
    if (action.repeat) return setRunning({ action, left: action.repeat })
    setProcess((p) => model.act(p, action.act, v, arg))
  }
  const next = () => {
    setStageIndex(stageIndex + 1)
    setReached(Math.max(reached, stageIndex + 1))
  }

  const view = views[caseIndex] ?? views[0]
  const c = {
    bench, model, phone, theme, stages, stage, stageIndex, setStageIndex, reached, passed, next, cases, caseIndex, setCase: setCaseIndex,
    values: v, start, set, open, process, view, q: { ...v, ...view }, views, verdicts, pass, act, busy: Boolean(running), ui, revealed, check,
    setUi: (change) => setUiState((old) => ({ ...old, ...change })),
  }
  const shown = (b) => {
    if (isBlock(b)) return (b.panel ?? b.stack ?? b.row).some(shown)
    const [, params] = callOf(b)
    return (!params.when || Boolean(c.q[params.when])) && (!params.unless || !c.q[params.unless])
  }
  const render = (list = []) => list.filter(shown).map((b, i) => <Block key={i} b={b} c={c} displays={items} render={render} />)

  const { head, main, side, foot, split } = bench.layout
  const hasSide = (side ?? []).some(shown)
  const card = <section className="bk-stage bk-stack bench-main">{render(main)}</section>
  return (
    <>
      {bench.setup && <PickMark at="bench.setup" label={{ zh: '实验设置', en: 'Experiment setup' }} />}
      <PickMark at="bench.layout" label={{ zh: '实验布局', en: 'Experiment layout' }} />
      <div className="bk bench">
        {head?.some(shown) && <div className="bench-head">{render(head)}</div>}
        {hasSide ? (
          <div className={`bk-split ${split ? `is-${split}` : ''}`}>
            {card}
            <div className="bk-stack">{render(side)}</div>
          </div>
        ) : card}
        {foot?.some(shown) && <div className="bk-stack">{render(foot)}</div>}
      </div>
    </>
  )
}

// A layout block: a display item, or a card, a column or a row of blocks.
function Block({ b, c, displays, render }) {
  if (b.panel) {
    const panel = <section className={`bk-panel bk-stack bench-panel ${b.quiet ? 'is-quiet' : ''}`}>{render(b.panel)}</section>
    return b.dock && c.phone ? <div className="bench-dock">{panel}</div> : panel
  }
  if (b.stack) return <div className={`bk-stack ${b.center ? 'bench-center' : ''}`}>{render(b.stack)}</div>
  if (b.row) return <div className={`bench-row ${b.narrow ? 'is-narrow' : ''} ${b.tight ? 'is-tight' : ''}`}>{render(b.row)}</div>
  const [name, params] = callOf(b)
  const Item = displays[name]
  return createElement(Item, { params, ctx: c }, params.with ? render(params.with) : undefined)
}
