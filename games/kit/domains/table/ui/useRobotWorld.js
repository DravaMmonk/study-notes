import { splitSource } from '../../../engine/wire-source.js'
import { useEffect, useState } from 'react'
import { tr, lazy } from '../lang.js'
import { ROBOTS } from '../model/robots.js'
import { picksOf, withPicks } from '../model/board.js'
import { isCard, modelsOf } from '../model/parts.js'
import { signal } from '../model/format.js'
import { WORLDS, windowOf } from '../model/worlds.js'
import { guideAt } from '../items/conditions.js'
import { trace } from '../items/traces.js'
import { panelData } from '../items/panels.js'
import { boardDrawing } from './scene.js'
import { robotDrawing } from './robotDrawing.js'
import { missingRobotOutput, robotHint, tutorialFailure } from '../model/verdict.js'
import { probeValues, wireStateOf } from './circuitRun.js'
import { buzz, typing, useToast, useVerdict } from '../../../shell/useBoardInteraction.jsx'
import { useWorkspaceKeys } from '../../../shell/useOverlay.js'
import { T } from '../../../shell/i18n.js'

const empty = { typed: {}, robot: null, selected: null, input: '', focus: null, bench: false }

function sandbox(model, world, task, test, circuit, state, workshopParts) {
  const cell = state.robot || world.sample(test, task)
  const keys = world.keys(test, cell)
  const shown = new Map(world.base?.(test, task) ?? [])
  for (const [key, value] of Object.entries(state.typed)) shown.set(key, value)
  const reads = new Set(), empty = new Set(), probe = {}
  const get = (key) => {
    reads.add(key)
    if (shown.has(key)) return shown.get(key)
    empty.add(key)
    return null
  }
  try {
    const { out } = model.evaluate(circuit, (id, layer) => world.read(test, cell, id, get, task, layer), world.outs.map(([key]) => key), probe, undefined, workshopParts)
    for (const [id, key] of Object.entries(keys)) shown.set(key, out[id])
  } catch {
    // A partial circuit still shows what it reached on the selected cell.
  }
  return { cell, at: Object.values(keys), shown, reads, empty, probe, typed: new Set(Object.keys(state.typed)), sel: state.selected }
}

function visible(run, at, ended, state) {
  if (!run || at < 0 || state.bench) return null
  const { res, view } = run.report
  return { ...view, k: at + 1, end: ended, focus: state.focus, res }
}

function sensorWindow(world, test, task, view, box, circuit, read, robot) {
  const step = view && view.res.steps[view.focus ?? view.k - 1]
  const cell = step?.cell ?? box.cell
  const reads = step ? new Set(step.reads) : box.reads
  const shown = box?.shown ?? new Map(view.res.base)
  if (view) for (const s of view.res.steps.slice(0, (view.focus ?? view.k - 1) + 1)) {
    for (const [key, value] of s.writes ?? []) shown.set(key, value)
  }
  const isEmpty = (key) => (step ? step.empty === key : box.empty.has(key))
  const paint = (x) => ({
    ...x,
    value: x.v !== undefined ? signal(x.v) : x.key !== null && shown.has(x.key) ? signal(shown.get(x.key)) : '',
    state: isEmpty(x.key) ? 'empty' : reads.has(x.key) ? 'read' : '',
  })
  const win = windowOf(world, test, cell, robot.vision, task)
  win.wins = win.wins.map((w) => ({ ...w, cells: w.cells.map(paint) }))
  if (win.arm && (task.noArm || !robot.arm)) win.arm = null
  if (win.arm?.cells) win.arm.cells = win.arm.cells.map(paint)
  if (win.arm?.sweeps) win.arm.sweeps = win.arm.sweeps.map((s) => ({ ...s, cells: s.cells.map(paint) }))
  if (win.arm) win.arm.filter = task.filter
  win.facts = task.facts.map((id) => ({ id, value: signal(read(id, cell, shown, 'self')) }))
  win.robot = robot
  const avail = [...task.given.offers.view, ...task.given.offers.facts]
  const lit = circuit.nodes.flatMap(picksOf)
  const probe = step?.probe ?? box?.probe ?? {}
  return { win, avail, lit, sensors: world.sensors, cell, shown, probe }
}

function noteOf(task, world, view, k) {
  if (!view) return ''
  const step = view.res.steps[view.focus ?? view.k - 1]
  const where = world.where(step.cell)
  if (!view.end) return tr(`${step.round ? `第 ${step.round} 轮 · ` : ''}正在算${where}`, `${step.round ? `Round ${step.round} · ` : ''}Computing ${where}`)
  if (view.focus != null) return tr(`正在看${where}，再点一次取消。`, `Looking at ${where}. Click again to leave.`)
  if (view.halt) return tr(`机器在${where}出了错。`, `The machine went wrong at ${where}.`)
  const { rounds, value } = view.res
  const scans = rounds ? tr(`扫了 ${rounds} 轮，最后一轮一格也没变。`, `Scanned ${rounds} round${rounds === 1 ? '' : 's'}; the last round changed nothing. `) : ''
  return scans + (view.pass
    ? tr(`答案 ${signal(value)}，正确。`, `Answer ${signal(value)}: correct.`)
    : tr(`机器算出 ${signal(value)}，应该是 ${signal(task.expected[k])}。`, `The machine computed ${signal(value)}; it should be ${signal(task.expected[k])}.`))
}

/** The robot's world, drawing and card controls. Editing, tests and playback belong to the circuit screen. */
export function useRobotWorld({ screen, task, test, run, report, at, ended, circuit, change, version, held, workshopParts }) {
  const { game, level, solve, fail, progress } = screen
  const { model } = game.table
  const world = WORLDS[task.world]
  const robot = ROBOTS[task.robot]
  const [state, setState] = useState(empty)
  const [toast, notice] = useToast()
  const verdict = useVerdict({ hints: task.hints, solve, fail })
  const put = (patch) => setState((old) => ({ ...old, ...patch }))
  useEffect(() => setState(empty), [run.at, run.run?.id])
  useEffect(() => put({ focus: null, bench: false }), [version])
  useEffect(() => {
    if (task.unlockToast && !progress.data[task.taskId]) toast(task.unlockToast)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const view = !run.run ? null : visible(report, at, ended, state)
  const live = Boolean(run.run && !run.run.over)
  const box = view ? null : sandbox(model, world, task, test, circuit, state, workshopParts)
  const read = (id, cell, values, layer) => world.read(test, cell, id, (key) => values.get(key) ?? null, task, layer)
  const ui = sensorWindow(world, test, task, view, box, circuit, read, robot)
  const onCell = (id) => {
    if (live) return
    if (!view) {
      put({ selected: state.selected === id ? null : id, input: '' })
      buzz(6)
      return
    }
    if (!view.end) return
    const focus = view.res.steps.slice(0, view.k).findLastIndex((step) => step.at.includes(id))
    if (focus < 0) return
    put({ focus: view.focus === focus ? null : focus })
    buzz(6)
  }
  const key = (k) => {
    const { selected, input, typed } = state
    if (k === 'close') put({ selected: null })
    else if (k === 'del') put({ input: input.slice(0, -1) })
    else if (k === 'bot') {
      put({ robot: world.cellOf(test, selected, task), selected: null, input: '' })
      buzz(8)
    } else if (k === 'ok') {
      const rest = { ...typed }
      delete rest[selected]
      put({ typed: input === '' ? rest : { ...rest, [selected]: +input }, selected: null, input: '' })
      buzz(8)
    } else if (input.length < 3) put({ input: (input === '0' ? '' : input) + k })
  }
  useWorkspaceKeys((event) => {
    if (!state.selected) return
    if (event.key === 'Escape') put({ selected: null, input: '' })
    else typing(event, key)
  })
  const toggle = (sensor) => {
    if (live) return
    const node = circuit.nodes.find((n) => task.given.offers[n.type]?.includes(sensor))
    if (!node) return
    const picks = picksOf(node), order = task.given.offers[node.type]
    const next = picks.includes(sensor) ? picks.filter((p) => p !== sensor) : order.filter((p) => p === sensor || picks.includes(p))
    change({
      ...circuit,
      nodes: circuit.nodes.map((n) => n.id === node.id ? withPicks(n, next) : n),
      wires: circuit.wires.filter(({ from }) => { const [id, pick] = splitSource(from); return id !== node.id || next.includes(pick) }),
    })
    buzz(6)
  }
  const choices = (type) => {
    const family = modelsOf(type) ?? []
    return family.filter((name) => name === type || held.has(name)).map((name) => [name, model.def(name).tag])
  }
  const pad = !live && state.selected ? {
    title: tr(`${world.name(state.selected)}：填一个数（不填 = 清空这一格）`, `${world.name(state.selected)}: type a number (leave blank to clear the cell)`),
    value: state.input,
    onKey: key,
    extra: world.cellOf(test, state.selected, task) && !box?.at.includes(state.selected) ? { key: 'bot', label: tr('让机器人站到这一格', 'Put the robot on this cell') } : null,
  } : null
  const scene = { ...world.scene(test, view, { ...task, ...(view?.end && view.pass && task.trace ? trace(task.trace, test) : {}), bench: box }), look: robot.look }
  const after = task.after ? panelData(task.after, test, view, run.states) : null
  const values = probeValues(ui.probe)
  return {
    notice,
    pad,
    busy: live,
    trace: view ? view.res.traces[view.focus ?? view.k - 1] : null,
    text: [task.mission.goal, task.mission.how],
    hint: task.hints ?? null,
    tip: guideAt(task.guide, circuit) ?? ([task.ask, task.tip].filter(Boolean).join(' ') || null),
    value: { values, errors: new Map() },
    drawing: boardDrawing(scene, { label: tr('棋盘', 'Board'), ...(task.boardOpt || { minScale: 0.7, maxScale: 1.25 }) }, onCell),
    note: noteOf(task, world, view, run.at),
    after,
    returnAction: view?.end && !live ? { label: T('回到棋盘测试', 'Back to the test board'), onClick: () => put({ bench: true, focus: null }) } : null,
    cardDrawing: (node, readOnly) => isCard(node.type) ? robotDrawing(ui, node.type, readOnly ? null : toggle) : null,
    portValue: (node, port) => isCard(node.type) ? signal(read(port, ui.cell, ui.shown, 'self')) : undefined,
    wireState: wireStateOf(values),
    choices: (node) => choices(node.type),
    swap: (node, type) => {
      if (live) return
      change({ ...circuit, nodes: circuit.nodes.map((n) => n.id === node.id ? { ...n, type } : n) })
      buzz(8)
    },
    guard: () => {
      const missing = missingRobotOutput(task, circuit)
      if (!missing) return false
      toast(missing)
      buzz(20)
      return true
    },
    fail: (last, runs) => {
      if (last.final) {
        verdict.fail({ head: T('还不能做成元件', 'Not a part yet'), body: last.final, hint: null })
        return
      }
      const bad = runs[last.test]
      if (task.onFail) {
        verdict.fail({
          ...tutorialFailure(task, last.test, bad.report.res),
          cta: { label: task.onFail.next, fn: () => { solve(null); level.steps.go(task.task + 1) } },
          hint: null,
          panel: panelData(task.onFail.show, task.tests[0]),
        })
        return
      }
      const before = verdict.fails.current
      const hintFor = () => robotHint(task, circuit, before - 1)
      verdict.fail({ ...bad.failure, hint: hintFor() ? lazy(hintFor) : null })
    },
    solve: () => verdict.pass(),
  }
}
