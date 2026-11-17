import { sourceOf } from "../../core/wire-source.js"
import { useState } from 'react'
import CanvasEditor from "./CanvasEditor.jsx"
import DemoBench, { useExampleRun } from "./DemoBench.jsx"
import SlotBoard from "./SlotBoard.jsx"
import { L, T } from 'kernel/view'

import { definedFaces } from "../parts/faces.jsx"
import { Show } from 'kernel/view'


// A fixed example wired around a part, run on the supplied cases. The editor supplies the same setting controls as a task.
export default function SampleCircuit({ example, defined, phone }) {
  const { board: start, parts, tests, run, view, prepare } = example
  const [board, setBoard] = useState(start)
  const { test, select, report, status, complete, invalidate, clear } = useExampleRun()
  const [selected, setSelected] = useState(null)
  const visible = report?.[test] ?? { values: new Map(board.nodes.flatMap((node) => {
    const value = tests[test].inputs[node.params?.name]
    return parts.role(node) === 'source' && value !== undefined ? [[node.id, value]] : []
  })), errors: new Map() }
  const ctx = { view: visible, path: [], board: { circuit: board, parts }, readOnly: false }
  const value = (node, _ctx, key) => {
    const given = visible.values.get(sourceOf(node.id, key))
    const error = visible.errors.get(node.id)
    return given !== undefined ? <Show value={given} scene="card" views={view?.(node, given)} /> : error ? <small>{L(error)}</small> : null
  }
  const edit = (node, params) => {
    setBoard((cur) => prepare({ ...cur, nodes: cur.nodes.map((n) => n.id === node.id ? { ...n, params } : n) }, parts))
    invalidate()
  }
  const faces = definedFaces({ body: value, thumb: value }, { defined: { ...defined, value }, change: edit, phone })
  const item = board.nodes.find((node) => node.id === selected)
  const panel = phone && item && faces.detail(item, ctx)
  const go = () => complete(tests.map((sample) => run(board, sample)))
  const reset = () => { setBoard(start); clear(); setSelected(null) }
  return <DemoBench
    tests={tests.map((sample, k) => ({ label: sample.label ?? T(`测试 ${k + 1}`, `Test ${k + 1}`) }))}
    test={test} onTest={select} onRun={go} onReset={reset}
    state={status} height={phone ? 'auto' : 340} panel={panel}
  >
    {phone
      ? <SlotBoard graph={board} parts={parts} fixed nameOf={(node) => L(parts.label(node))}
        thumb={(node) => faces.thumb(node, ctx)} tileExtra={(node) => faces.tileExtra(node, ctx)}
        sinkBody={(node) => value(node, ctx)} onPort={() => {}} onSlot={() => {}} onNode={(id) => setSelected(id)}
        nodeClass={(node) => node.id === selected ? 'is-selected' : ''} />
      : <CanvasEditor graph={board} parts={parts} refit height={310} body={(node) => faces.body(node, ctx)}
        wireState={(wire) => visible.values.has(wire.from) ? 'live' : 'dead'} />}
    </DemoBench>
}
