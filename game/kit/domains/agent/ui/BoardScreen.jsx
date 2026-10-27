import { useMemo, useRef, useState } from 'react'
import { CircuitLayout, RunDock, StepLog, TaskCard, TestStatus, TestTabs, Text, usePlayback, Brief } from '../../../shell/index.js'
import Sheet from '../../../shell/Sheet.jsx'
import { L, tr } from '../../../shell/i18n.js'
import { CanvasEditor, Notice, Palette, PartActions, SlotBoard, Tray, spotIn, srcKey, srcNode, useSlotEditing } from '../../../circuit/index.js'
import { MISSING } from '../../../engine/circuit.js'
import { startBoard } from '../build.js'
import { FIXED, KIND, PARTS, kindOf, wantsOf } from '../parts.js'
import { runLevel } from '../run.js'
import { CARDS, OUT_LABELS, PORT_LABELS } from './catalog.js'
import { ContextBar, ContextValue, Report, RepoView, actionText, entryText } from './views.jsx'

// A board level of 《软件工厂》 on the shared circuit editor: the level's fixed cards (the issue, the history, the
// repository, keep, stop) and the parts it holds. The tests are issues: picking one shows, on every card, what the
// board computes in the turn shown. Running plays each test turn by turn (../../../shell/usePlayback.jsx, each turn a
// step): the cards, the turn log, the context the model read and the repository follow along, and a test fails when its
// run ends with the tests failing, without stopping, or over the level's budget.

const T = (zh, en) => ({ zh, en })
const KIND_NAME = { [KIND.context]: T('上下文', 'a context'), [KIND.action]: T('动作', 'an action'), [KIND.flag]: T('是否通过', 'a pass flag') }

/**
 * The editor's description of this level's cards (../../../circuit/model.js). With one call there is no action to read
 * by, so a read card shows no input there.
 */
function partsFor(mode) {
  return {
    inputs: (node) => (mode === 'once' && node.type === 'read' ? [] : PARTS[node.type]?.inputs ?? []),
    role: (node) => (PARTS[node.type]?.source ? 'source' : PARTS[node.type]?.sink ? 'sink' : 'part'),
    label: (node) => CARDS[node.type]?.name ?? node.type,
    portLabel: (node, port) => PORT_LABELS[node.type]?.[port] ?? '',
    family: (node) => CARDS[node.type]?.family,
    icon: (node) => CARDS[node.type]?.icon,
    outputs: (node) => (PARTS[node.type]?.outputs ? PARTS[node.type].outputs().map((key) => ({ key, label: OUT_LABELS[node.type][key] })) : null),
    cardWidth: (node) => (node.type === 'model' || node.type === 'test' ? 200 : PARTS[node.type]?.source || PARTS[node.type]?.sink ? 170 : 160),
    // A wire carries one kind of value, and a port takes the kinds it reads.
    refuse: (graph, from, to, port) => {
      const source = graph.nodes.find((n) => n.id === srcNode(from))
      const target = graph.nodes.find((n) => n.id === to)
      const kind = kindOf(source, srcKey(from))
      const wants = wantsOf(target, port)
      if (!kind || wants.includes(kind)) return null
      return T(`这里要的是${L(KIND_NAME[wants[0]])}，这根线送来的是${L(KIND_NAME[kind])}。`, `This takes ${L(KIND_NAME[wants[0]])}; the wire brings ${L(KIND_NAME[kind])}.`)
    },
  }
}

// A saved board still fits: the level's fixed cards, and every card one the domain knows.
const fits = (circuit, level) => {
  const fixed = circuit.nodes.filter((n) => FIXED.includes(n.type)).map((n) => n.type).sort().join()
  return fixed === [...level.fixed].sort().join() && circuit.nodes.every((n) => PARTS[n.type])
}

const flagText = (v) => (v === true ? T('通过', 'Pass') : v === false ? T('没过', 'Fail') : T('没跑', 'Not run'))

/** What a card shows of a value it gives or takes. */
function Value({ value, error }) {
  if (value === undefined) return <span className={`ag-error ${!error || error === MISSING ? 'is-missing' : ''}`}>{!error || error === MISSING ? tr('等接线', 'Waiting for wires') : L(error)}</span>
  if (Array.isArray(value)) return <ContextValue value={value} />
  if (value === null || typeof value === 'boolean') return <span className={`ag-flag is-${value === true ? 'pass' : value === false ? 'fail' : 'none'}`}>{L(flagText(value))}</span>
  return <span className={`ag-action is-${value.type}`}>{L(actionText(value))}</span>
}

/** What the repository and stop show: what landed this turn, and whether the machine stops. */
function SinkValue({ node, value, turn }) {
  if (!turn) return <span className="ag-error is-missing">{tr('等接线', 'Waiting for wires')}</span>
  if (node.type === 'stop') return <span className={`ag-flag is-${turn.stop ? 'pass' : 'none'}`}>{turn.stop ? tr('停下', 'Stops') : tr('继续下一轮', 'Goes on')}</span>
  return value?.type === 'write' ? <span className="ag-action is-write">{L(actionText(value))}</span> : <span className="ag-empty">{tr('这一轮没有写', 'Nothing written this turn')}</span>
}

export default function BoardScreen({ game, level: entry, saved, save, solve, flags, phone }) {
  const level = entry.source
  const parts = useMemo(() => partsFor(level.machine.mode), [level])
  const files = useMemo(() => game.agent.filesIn(level), [game, level])
  const [circuit, setCircuit] = useState(() => (saved?.nodes && fits(saved, level) ? saved : startBoard(level)))
  const [testIndex, setTestIndex] = useState(0)
  const checked = useMemo(() => runLevel(level, circuit), [level, circuit])
  const { shown: palette, folded } = useMemo(() => game.agent.offerIn(level, flags), [game, level, flags])

  const change = (next) => {
    setCircuit(next)
    save(next)
  }
  const onClear = circuit.nodes.some((n) => parts.role(n) === 'part') ? () => change(startBoard(level)) : null
  const playback = usePlayback({
    count: level.tests.length,
    stepsOf: (k) => checked.runs[k].turns,
    check: (k) => checked.runs[k].fail ?? '',
    onSolve: () => solve({ tokens: checked.runs.reduce((n, r) => n + r.tokens, 0) }),
    onTest: setTestIndex,
    board: circuit,
  })
  const { run, states } = playback

  // The turn shown: the one a run is on (or its last, once past it); before a run, the first turn, as a preview.
  const runOf = checked.runs[testIndex]
  const shown = playback.shown(testIndex)
  const at = !run ? 0 : shown.list.length ? (shown.at >= 0 ? shown.at : shown.list.length - 1) : -1
  const turn = at >= 0 ? runOf.turns[at] : null
  const ended = Boolean(run && (run.test > testIndex || run.over) && shown.list.length && shown.at < 0)

  const valueOf = (node, key = null) => (turn ? turn.values.get(key ? `${node.id}#${key}` : node.id) : undefined)
  const errorOf = (node) => turn?.errors.get(node.id)
  const setParam = (node, key, value) => change({ ...circuit, nodes: circuit.nodes.map((n) => (n.id === node.id ? { ...n, params: { ...n.params, [key]: value } } : n)) })
  const wired = (node, port) => circuit.wires.some((w) => w.to === node.id && w.port === port)

  const body = (node) => {
    if (node.type === 'test') return null
    const call = turn?.calls.find((c) => c.id === node.id)
    return (
      <div className="ag-card">
        {node.type === 'read' && !wired(node, 'ask') && (
          <label className="ag-field">
            <span>{tr('文件', 'File')}</span>
            <select value={node.params?.file ?? ''} onChange={(e) => setParam(node, 'file', e.target.value)} onPointerDown={(e) => e.stopPropagation()}>
              <option value="" disabled>{tr('选一个文件', 'Pick a file')}</option>
              {files.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
        )}
        {node.type === 'repo' || node.type === 'stop' ? <SinkValue node={node} value={valueOf(node)} turn={turn} /> : <Value value={valueOf(node)} error={errorOf(node)} />}
        {call && <small className="ag-sees">{tr(`看到 ${call.tokens} tok`, `sees ${call.tokens} tok`)}{call.dropped.length ? tr(` · 丢掉 ${call.dropped.length} 条`, ` · ${call.dropped.length} dropped`) : ''}</small>}
      </div>
    )
  }
  const outNote = (node, key) => {
    const v = valueOf(node, key)
    if (v === undefined) return null
    return key === 'green' ? L(flagText(v)) : v.length ? L(entryText(v[0])) : tr('空', 'empty')
  }

  const itemOf = (type) => ({ type, label: CARDS[type].name, desc: game.textAt(CARDS[type], level.id).desc, icon: CARDS[type].icon, family: CARDS[type].family, fresh: entry.fresh?.includes(type) })
  const items = palette.map(itemOf)
  const foldedItems = folded.map(itemOf)
  const types = [...palette, ...folded]
  const addNode = (type, extra = {}) => {
    const taken = new Set(circuit.nodes.map((n) => n.id))
    let k = 1
    while (taken.has(`${type}${k}`)) k += 1
    const id = `${type}${k}`
    return { id, graph: { ...circuit, nodes: [...circuit.nodes, { id, type, params: {}, ...extra }] } }
  }
  const add = (type) => {
    const [x, y] = spotIn(circuit, null)
    change(addNode(type, { x, y }).graph)
  }

  const totalTokens = checked.runs.reduce((n, r) => n + r.tokens, 0)
  const passedAll = playback.passed
  const brief = (
    <Brief game={game} level={entry} hint={level.hint} phone={phone}>
      <section className="ag-score">
        <div className="stat-row">
          <div className="stat"><b>{run ? runOf.tokens : '–'}</b><span>{tr('token', 'tokens')}</span></div>
          <div className="stat"><b>{run ? runOf.turns.length : '–'}</b><span>{level.machine.mode === 'once' ? tr('次调用', 'calls') : tr('轮', 'turns')}</span></div>
          {level.budget?.tokens && <div className="stat"><b>{level.budget.tokens}</b><span>{tr('token 上限', 'token budget')}</span></div>}
          {level.machine.mode === 'loop' && <div className="stat"><b>{level.budget?.turns ?? level.machine.turns}</b><span>{tr('最多轮数', 'turn limit')}</span></div>}
        </div>
        {passedAll && <p className="ag-total">{tr(`全部测试共 ${totalTokens} token`, `${totalTokens} tokens over every test`)}</p>}
      </section>
    </Brief>
  )

  const test = level.tests[testIndex]
  const steps = (shown.list.length ? shown.list : []).map((t, k) => ({
    label: actionText(t.calls[0]?.action),
    value: t.kept.length ? <span className="ag-kept">{t.kept.map((e, j) => <small key={j} data-kind={e.kind}>{L(entryText(e))}</small>)}</span> : null,
  }))
  const verdict = ended ? runOf.fail : null
  const strip = (
    <div className="ag-strip">
      <section className="ag-col">
        <Text game={game} className="ag-issue" text={test.issue.text} />
        <RepoView repo={test.repo} state={turn?.state ?? {}} />
        {ended && <Report report={runOf.report} />}
        {ended && <p className={`ag-verdict ${verdict ? 'is-fail' : 'is-pass'}`}>{verdict ? L(verdict) : tr('通过：测试全绿，机器停下了。', 'Passed: the tests are green and the machine stopped.')}</p>}
      </section>
      <section className="ag-col">
        <h3 className="ag-head">{tr('每一轮', 'Turn by turn')}</h3>
        {steps.length ? <StepLog steps={steps} at={shown.at} /> : <p className="ag-note">{tr('运行后在这里逐轮显示模型做了什么、留下了什么。', 'Run it to see here, turn by turn, what the model did and what was kept.')}</p>}
      </section>
      <section className="ag-col">
        <h3 className="ag-head">{tr('模型看到的', 'What the model sees')}</h3>
        <ContextBar call={turn?.calls[0]} window={level.machine.window} />
      </section>
    </div>
  )
  const tests = <TestTabs tests={level.tests.map((t) => ({ label: t.issue.title }))} states={states} index={testIndex} onSelect={(k) => { setTestIndex(k) }} phone={phone} />
  const dock = <RunDock {...playback.dock({ go: tr('运行', 'Run'), done: tr('全部通过', 'All passed') })} />

  if (phone) return <PhoneBoard {...{ circuit, parts, items, foldedItems, brief, dock, change, addNode, onClear, strip, tests, body, valueOf, errorOf, types, game, level }} scope={level.id} />

  return (
    <CircuitLayout
      className="ag-level"
      brief={brief}
      parts={items.length + foldedItems.length > 0 && <Palette compact items={items} folded={foldedItems} onAdd={add} />}
      canvas={
        <div className="ag-stage">
          <div className="ag-board">
            <CanvasEditor
              onClear={onClear}
              types={types}
              key={level.id}
              scope={level.id}
              graph={circuit}
              onChange={change}
              parts={parts}
              width={160}
              height={130}
              body={body}
              outNote={outNote}
              cardClass={(node) => `ag-node ${node.type === 'stop' && turn?.stop ? 'is-stopped' : ''}`}
              wireState={(wire) => (turn && turn.values.get(wire.from) !== undefined ? 'live' : 'dead')}
              emptyNote={T('从上面一排元件里选一个放上来，再从一个元件右侧的圆点连到另一个元件左侧的圆点。', 'Pick a part from the row above, then wire a dot on the right of a part to a dot on the left of another.')}
            />
          </div>
        </div>
      }
      tests={tests}
      status={<TestStatus states={states} />}
      outputsTitle={L(test.issue.title)}
      outputs={strip}
      actions={<footer className="run-foot">{dock}</footer>}
    />
  )
}

// The board on a phone: the shared slot board, the tests and the turn log under it, and the run bar.
function PhoneBoard({ circuit, parts, items, foldedItems, brief, dock, change, addNode, onClear, strip, tests, body, valueOf, errorOf, types, scope, game, level }) {
  const [sheet, setSheet] = useState(null) // { node } or { slot }
  const root = useRef(null)
  const scroller = useRef(null)
  const editing = useSlotEditing({
    graph: circuit,
    onChange: change,
    parts,
    create: (_, type, at) => {
      const [x, y] = spotIn(circuit, null)
      return addNode(type, { slot: at, x, y })
    },
    label: parts.label,
    openNode: (id) => setSheet({ node: id }),
    openSlot: (at) => items.length + foldedItems.length > 0 && setSheet({ slot: at }),
    root,
    scroller,
    scope,
  })
  const node = sheet?.node && circuit.nodes.find((n) => n.id === sheet.node)
  return (
    <div className="level-phone is-split ag-phone" ref={root}>
      {tests}
      <div className="ag-scroll" ref={scroller}>
        <TaskCard>{brief}</TaskCard>
        <SlotBoard dense graph={circuit} parts={parts} nameOf={editing.nameOf} thumb={(n) => <Value value={valueOf(n)} error={errorOf(n)} />} sinkBody={(n) => body(n)} picking={editing.picking} moving={editing.moving} canLand={editing.canLand} onPort={editing.onPort} onNode={editing.onNode} onSlot={editing.onSlot} history={editing.history} onClear={onClear} onChange={change} types={types} />
        {strip}
      </div>
      <Tray items={items} folded={foldedItems} onPick={editing.placeFirstFree} />
      <footer className="run-foot">{dock}</footer>
      <Notice editing={editing} />
      {node && (
        <Sheet title={editing.nameOf(node)} onClose={() => setSheet(null)}>
          <div className="ag-sheet">
            <p className="ag-desc">{L(game.textAt(CARDS[node.type], level.id).desc)}</p>
            {body(node)}
            {parts.role(node) === 'part' && <PartActions onMove={() => { editing.startMove(node.id); setSheet(null) }} onRemove={() => { editing.remove(node.id); setSheet(null) }} />}
          </div>
        </Sheet>
      )}
      {sheet?.slot !== undefined && (
        <Sheet title={tr('放在这一格', 'Place in this slot')} onClose={() => setSheet(null)}>
          <div className="ag-add">
            {[...items, ...foldedItems].map((item) => (
              <button key={item.type} type="button" data-family={item.family} onClick={() => { editing.place(item.type, sheet.slot); setSheet(null) }}>
                <b>{L(item.label)}</b>
                <small>{L(item.desc)}</small>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  )
}
