import { createElement, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownToLine, Check, X } from 'lucide-react'
import { NODE_TYPES, inputsOf, settingsOf } from '../../engine/nodes.js'
import { L, tr } from '../../../../shell/i18n.js'
import { Notice, PartActions, SlotBoard, Tray, feeding, useSlotEditing } from '../../../../circuit/index.js'
import { RunDock, TaskCard, TestTabs } from '../../../../shell/index.js'
import { describe, familyOf, iconOf } from '../catalog.js'
import { partsFor } from '../parts.js'
import ImageView from '../ImageView.jsx'
import ValueView from '../views/ValueView.jsx'
import ViewSwitch from '../views/ViewSwitch.jsx'
import { KIND_NAMES, kindOf, nodeView } from '../views/views.js'
import { InlineParam, KernelEditor, NumberEditor } from './Editors.jsx'
import { placeAt, setParam } from './ops.js'
import { AddSheet, ParamChip } from './parts.jsx'
import Sheet from '../../../../shell/Sheet.jsx'
import './phone.css'

const buzz = (pattern = 8) => navigator.vibrate?.(pattern)

// Vision Complete's phone circuit screen: the shared phone board (games/kit/circuit: SlotBoard, useSlotEditing,
// Tray, Notice, the same editing as 状态之图) with this game's tests along the top, its task, its blocks' pictures,
// and its sheets for a block, a slot and a setting. Wiring is done on the board only, as in every game.
// An output and its expected value can only be compared cell by cell when they are the same size.
const fits = (img, expected) => img.w === expected.w && img.h === expected.h

export default function PhoneCircuit({ level, hiddenCount = 0, hiddenMiss, graph, onChange, onClear, run, onTest, testIndex, onTestIndex, flags, sensors, outputLabels, ioKinds, views, theme, scan, onScan, brief, training, footer, testDetails }) {
  const [sheet, setSheet] = useState(null)
  const values = run?.results[testIndex]?.values
  const errors = run?.results[testIndex]?.errors
  const checks = run?.results[testIndex]?.checks
  const tolerance = (level.tests[testIndex]?.check ?? level.check)?.tolerance ?? 0.02
  const all = level.tests.length
  const byId = (id) => graph.nodes.find((n) => n.id === id)
  const parts = useMemo(() => partsFor({ sensors, outputLabels }), [sensors, outputLabels])
  const root = useRef(null)
  const scroller = useRef(null)
  const editing = useSlotEditing({
    root,
    scroller,
    graph,
    onChange,
    parts,
    create: placeAt,
    label: parts.label,
    openNode: (id) => setSheet({ kind: 'part', node: id }),
    openSlot: (at) => level.palette.length && setSheet({ kind: 'add', at }),
  })
  const { nameOf, sources } = editing
  const wasPassing = useRef(run?.pass)
  useEffect(() => {
    if (run?.pass && !wasPassing.current) buzz([12, 60, 18])
    wasPassing.current = run?.pass
  }, [run?.pass])

  const thumb = (n, size = 52) => {
    const value = values?.get(n.id)
    if (errors?.get(n.id)) return <span className="ph-thumb-error" style={{ width: size, height: size }}>!</span>
    return <ValueView img={value} view={nodeView(n, views)} size={kindOf(value) === 'signal' ? size * 1.6 : size} theme={theme} label="—" />
  }
  // A block on the board: "unwired" while an input is open, ! on an error, else its picture.
  const boardThumb = (node, size) => {
    const value = values?.get(node.id)
    const open = node.type !== 'input' && inputsOf(node.type).some((port) => !feeding(graph, node.id, port))
    if (open) return <i className="pb-empty" style={{ width: size, height: size }}>{tr('待接线', 'unwired')}</i>
    if (errors?.get(node.id)) return <i className="pb-error" style={{ width: size, height: size }}>!</i>
    if (!value) return <i className="pb-empty" style={{ width: size, height: size }} />
    return <ValueView img={value} view={nodeView(node, views)} size={kindOf(value) === 'signal' ? size * 1.6 : size} theme={theme} />
  }
  const sinkCheck = (node) => checks?.find((c) => c.name === node.params.name)
  const sinkBody = (node) => {
    const check = sinkCheck(node)
    const want = level.tests[testIndex].expected?.[node.params.name]
    const got = values?.get(node.id)
    const view = nodeView(node, views)
    const big = kindOf(want) === 'signal' ? 96 : 64
    return (
      <>
        <span className="pb-compare">
          <figure>{want && <ValueView img={want} view={view} size={big} theme={theme} />}<figcaption>{tr('期望', 'Expected')}</figcaption></figure>
          {kindOf(want) === 'image' ? (
            <figure>{got && fits(got, want) ? <ImageView img={got} against={want} tolerance={tolerance} size={big} theme={theme} /> : <i className="pb-empty" style={{ width: big, height: 64 }} />}<figcaption>{tr('误差', 'Error')}</figcaption></figure>
          ) : (
            <figure>{got ? <ValueView img={got} view={view} size={big} theme={theme} /> : <i className="pb-empty" style={{ width: big, height: 64 }} />}<figcaption>{tr('你的', 'Yours')}</figcaption></figure>
          )}
        </span>
        {check && check.pass !== null && <span className="pb-verdict">{check.pass ? <Check size={13} /> : <X size={13} />}</span>}
      </>
    )
  }
  const tileExtra = (node) => {
    const param = (NODE_TYPES[node.type].params ?? [])[0]
    return param ? <ParamChip param={param} value={node.params[param.key]} /> : null
  }
  const trayItem = (type) => ({ type, label: NODE_TYPES[type].label, icon: iconOf(type), family: familyOf(type), fresh: level.fresh?.includes(type) })
  const remove = (id) => {
    editing.remove(id)
    setSheet(null)
  }
  const place = (type, at) => {
    editing.place(type, at)
    setSheet(null)
  }
  // Run the tests: a pass opens the level's completion dialog; otherwise say how many passed and show the first
  // test that fails (the game selects it).
  const test = () => {
    editing.unpick()
    const { pass, passed: ok, hiddenFailed, hiddenTotal } = onTest()
    if (pass) return
    buzz(20)
    if (ok === all && hiddenFailed) editing.say({ zh: `这 ${all} 组全部通过，但 ${hiddenTotal} 组隐藏测试中有 ${hiddenFailed} 组未通过：电路可能只是恰好适用于这几张图`, en: `All ${all} pass, but ${hiddenFailed} of ${hiddenTotal} hidden tests fail: the circuit may only happen to work on these pictures` })
    else editing.say(ok ? { zh: `${ok}/${all} 组通过，标红的测试尚未通过`, en: `${ok}/${all} pass; the ones in red still fail` } : { zh: '尚无测试通过，请比较输出与期望的差异', en: 'None pass yet; compare your output with the expected one' })
  }

  return (
    <div className="pb" ref={root}>
      <TestTabs phone tests={level.tests} states={level.tests.map((_, index) => { const ok = run?.results[index]?.pass; return ok === true ? 'pass' : ok === false ? 'fail' : null })} index={testIndex} onSelect={onTestIndex} />

      <div className="pb-scroll" ref={scroller}>
        <TaskCard>{brief}</TaskCard>
        <SlotBoard
          graph={graph}
          parts={parts}
          nameOf={nameOf}
          thumb={boardThumb}
          tileExtra={tileExtra}
          sinkBody={sinkBody}
          sinkClass={(node) => {
            const check = sinkCheck(node)
            return check && check.pass !== null ? (check.pass ? 'is-pass' : 'is-fail') : ''
          }}
          picking={editing.picking}
          moving={editing.moving}
          canLand={editing.canLand}
          onPort={editing.onPort}
          onNode={editing.onNode}
          onSlot={editing.onSlot}
          history={editing.history}
          onClear={onClear}
          onChange={onChange}
          types={level.palette}
        />
        {/* Under the board: what the hidden tests say, training, this test's details, and the score last. */}
        <div className="pb-below">
          {hiddenMiss ? (
            <p className="hidden-note is-fail">{tr(`这些测试全部通过，但 ${hiddenMiss.total} 组隐藏测试中有 ${hiddenMiss.failed} 组未通过：电路可能只是恰好适用于这几张图。`, `These tests all pass, but ${hiddenMiss.failed} of ${hiddenMiss.total} hidden tests fail: the circuit may only happen to work on these pictures.`)}</p>
          ) : hiddenCount > 0 ? (
            <p className="hidden-note">{tr(`另有 ${hiddenCount} 组隐藏测试，运行测试时一并检查，通关后公开。`, `${hiddenCount} more hidden ${hiddenCount === 1 ? 'test is' : 'tests are'} checked with every run and shown once you pass.`)}</p>
          ) : null}
          {training}
          <details className="pb-details">
            <summary>{tr('这组测试的详情', 'Details of this test')}</summary>
            {testDetails}
          </details>
          {footer}
        </div>
      </div>

      <Tray items={level.palette.filter((type) => !level.folded?.includes(type)).map(trayItem)} folded={(level.folded ?? []).map(trayItem)} onPick={editing.placeFirstFree} />

      {/* The kit's run bar (RunDock), as in every level: Run. */}
      <footer className="run-foot">
        <RunDock
          go={{ label: run?.pass && !hiddenMiss ? tr('全部通过', 'All passed') : tr('运行测试', 'Run tests'), pass: Boolean(run?.pass && !hiddenMiss), onClick: test }}
        />
      </footer>

      <Notice editing={editing} />

      {sheet?.kind === 'add' && (
        <AddSheet level={level} graph={graph} previewFrom={sources[0]?.id} test={level.tests[testIndex]} title={tr('放在这一格', 'Place in this slot')} theme={theme} onAdd={(type) => place(type, sheet.at)} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'part' && byId(sheet.node) && (() => {
        const node = byId(sheet.node)
        return (
          <Sheet title={nameOf(node)} onClose={() => setSheet(null)}>
            <PartPanel
              node={node}
              flags={flags}
              ioKinds={ioKinds}
              value={values?.get(node.id)}
              error={errors?.get(node.id)}
              check={node.type === 'output' ? checks?.find((c) => c.name === node.params.name) : null}
              expected={node.type === 'output' ? level.tests[testIndex].expected[node.params.name] : null}
              tolerance={tolerance}
              views={views}
              theme={theme}
              scan={scan}
              onScan={onScan}
              onParam={(key, cell) => setSheet({ kind: 'param', node: node.id, key, cell })}
              onSetParam={(key, v) => onChange(setParam(graph, node.id, key, v))}
              onView={(v) => onChange({ ...graph, nodes: graph.nodes.map((n) => (n.id === node.id ? { ...n, view: v } : n)) }, { keep: true })}
              onRemove={NODE_TYPES[node.type].fixed ? null : () => remove(node.id)}
              onMove={parts.role(node) === 'part' ? () => { editing.startMove(node.id); setSheet(null) } : null}
            />
          </Sheet>
        )
      })()}
      {sheet?.kind === 'param' && (() => {
        const target = byId(sheet.node)
        const param = NODE_TYPES[target.type].params.find((p) => p.key === sheet.key)
        const change = (v) => onChange(setParam(graph, target.id, param.key, v))
        const close = () => setSheet({ kind: 'part', node: target.id })
        return (
          <Sheet title={`${nameOf(target)} · ${L(param.label)}`} onClose={close} footer={<div className="ph-live"><span>{tr('这一步的当前结果', 'Current result of this step')}</span>{thumb(target, 96)}</div>}>
            {param.kind === 'kernel' ? <KernelEditor param={param} value={target.params[param.key]} onChange={change} start={sheet.cell ?? 4} /> : <NumberEditor param={param} value={target.params[param.key]} onChange={change} />}
          </Sheet>
        )
      })()}
    </div>
  )
}

// One block in a sheet: what it is, its settings, and what it makes on this test (its wires are on the board).
function PartPanel({ node, flags, ioKinds, value, error, check, expected, tolerance, views, theme, scan, onScan, onParam, onSetParam, onView, onRemove, onMove }) {
  const params = settingsOf(node.type, flags)
  const shown = nodeView(node, views)
  return (
    <div className="pc-inspect" data-family={familyOf(node.type)}>
      <header className="pc-inspect-head">
        <span className="ph-node">{node.type === 'output' ? <ArrowDownToLine size={15} /> : createElement(iconOf(node.type), { size: 15, strokeWidth: 1.8 })}</span>
        <small>{node.type === 'input' || node.type === 'output' ? L(KIND_NAMES[ioKinds?.[node.params.name]]) : describe(node.type)}</small>
      </header>

      {params.length > 0 && (
        <div className="pc-section">
          <span className="pc-label">{tr('设置', 'Settings')}</span>
          {/* Every setting is set right here; only typing a number opens a sheet of its own (the keypad). */}
          {params.map((param) => (
            <div key={param.key} className="pc-param">
              {params.length > 1 && <span className="pc-param-name">{L(param.label)}</span>}
              <InlineParam param={param} value={node.params[param.key] ?? param.default} onChange={(v) => onSetParam(param.key, v)} onKeypad={(cell) => onParam(param.key, cell)} />
            </div>
          ))}
        </div>
      )}

      <div className="pc-section pc-result">
        <span className="pc-label">{node.type === 'output' ? (check?.pass === null ? tr('尚未测试：点击「运行测试」查看是否通过', 'Not tested yet: run the tests to check') : check?.pass ? tr('这组通过', 'This test passes') : L(check?.reason) || tr('尚未通过', 'Not passing yet')) : tr('计算结果（当前测试）', 'Result (current test)')}</span>
        {error ? (
          <p className="ph-error">{L(error)}</p>
        ) : node.type === 'output' && expected ? (
          <div className="pc-compare">
            <figure><ValueView img={expected} view={shown} size={kindOf(expected) === 'image' ? 140 : 150} theme={theme} /><figcaption>{tr('期望', 'Expected')}</figcaption></figure>
            {kindOf(expected) === 'image' ? (
              <figure><ImageView img={value && fits(value, expected) ? value : null} against={expected} tolerance={tolerance} size={140} theme={theme} label={value ? tr('尺寸不对', 'Wrong size') : tr('未连接', 'Not connected')} /><figcaption>{tr('误差', 'Error')}</figcaption></figure>
            ) : (
              <figure><ValueView img={value} view={shown} size={150} theme={theme} label={tr('未连接', 'Not connected')} /><figcaption>{tr('你的', 'Yours')}</figcaption></figure>
            )}
          </div>
        ) : (
          <ValueView img={value} view={shown} size={kindOf(value) === 'image' ? 200 : 300} theme={theme} label={tr('尚无结果', 'No result yet')} grid scan={scan} onScan={onScan} />
        )}
        {kindOf(value ?? expected) === 'image' && <ViewSwitch value={shown} onChange={onView} shows={views?.shows} fresh={views?.fresh} compact />}
      </div>

      {(onRemove || onMove) && <PartActions onMove={onMove} onRemove={onRemove} />}
    </div>
  )
}
