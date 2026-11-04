import { useMemo } from 'react'
import { CircuitLevel, StepLog, Text, useLevelBoard, useLevelRun } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { MISSING } from '../../../engine/circuit.js'
import { startBoard, wiring } from '../board.js'
import { FIXED, PARTS } from '../parts.js'
import { runLevel } from '../run.js'
import { CARDS } from './catalog.js'
import { PORT_LABELS, actionText, entryText } from '../words.js'
import { ContextBar, ContextValue, Report, RepoView } from './views.jsx'

// A board level of 《软件工厂》 on the kit's circuit level (../../../shell/CircuitLevel.jsx): the level's fixed cards
// (the issue, the history, the repository, keep, stop) and the parts it holds. The tests are issues: picking one shows,
// on every card, what the board computes in the turn shown. Running plays each test turn by turn (each turn a step):
// the cards, the turn log, the context the model read and the repository follow along, and a test fails when its run
// ends with the tests failing, without stopping, or over the level's budget.

const T = (zh, en) => ({ zh, en })

/** The editor's description of this level's cards (../../../circuit/model.js): the wiring (../board.js), drawn. */
function partsFor(mode) {
  return {
    ...wiring(mode),
    label: (node) => CARDS[node.type]?.name ?? node.type,
    portLabel: (node, port) => PORT_LABELS[node.type]?.[port] ?? '',
    family: (node) => CARDS[node.type]?.family,
    icon: (node) => CARDS[node.type]?.icon,
    cardWidth: (node) => (node.type === 'model' || node.type === 'test' ? 200 : PARTS[node.type]?.source || PARTS[node.type]?.sink ? 170 : 160),
  }
}

// A saved board still fits: the level's fixed cards, and every card one the domain knows.
const fits = (circuit, level) => {
  const fixed = circuit.nodes.filter((n) => FIXED.includes(n.type)).map((n) => n.type).sort().join()
  return fixed === [...level.fixed].sort().join() && circuit.nodes.every((n) => PARTS[n.type])
}

const flagText = (v) => (v === true ? T('通过', 'Pass') : v === false ? T('未通过', 'Fail') : T('未运行', 'Not run'))

/** What a card shows of a value it gives or takes. */
function Value({ value, error }) {
  if (value === undefined) return <span className={`ag-error ${!error || error === MISSING ? 'is-missing' : ''}`}>{!error || error === MISSING ? tr('待接线', 'Not wired') : L(error)}</span>
  if (Array.isArray(value)) return <ContextValue value={value} />
  if (value === null || typeof value === 'boolean') return <span className={`ag-flag is-${value === true ? 'pass' : value === false ? 'fail' : 'none'}`}>{L(flagText(value))}</span>
  return <span className={`ag-action is-${value.type}`}>{L(actionText(value))}</span>
}

/** What the repository and stop show: what landed this turn, and whether the machine stops. */
function SinkValue({ node, value, turn }) {
  if (!turn) return <span className="ag-error is-missing">{tr('待接线', 'Not wired')}</span>
  if (node.type === 'stop') return <span className={`ag-flag is-${turn.stop ? 'pass' : 'none'}`}>{turn.stop ? tr('停下', 'Stops') : tr('继续下一轮', 'Continues')}</span>
  return value?.type === 'write' ? <span className="ag-action is-write">{L(actionText(value))}</span> : <span className="ag-empty">{tr('本轮未写入', 'Nothing written this turn')}</span>
}

export default function BoardScreen(screen) {
  const { game, level: entry, flags } = screen
  const level = entry.source
  const parts = useMemo(() => partsFor(level.machine.mode), [level])
  const files = useMemo(() => game.agent.filesIn(level), [game, level])
  const board = useLevelBoard(screen, { open: (saved) => (saved?.nodes && fits(saved, level) ? saved : startBoard(level)), fresh: () => startBoard(level) })
  const { circuit, change } = board
  const checked = useMemo(() => runLevel(level, circuit), [level, board.version])
  const run = useLevelRun(screen, board, {
    tests: level.tests.map((t) => ({ label: t.issue.title })),
    steps: { of: (k) => checked.runs[k].turns, check: (k) => checked.runs[k].fail ?? '' },
    score: () => ({ tokens: checked.runs.reduce((n, r) => n + r.tokens, 0) }),
  })
  const { shown: palette, folded } = useMemo(() => game.agent.offerIn(level, flags), [game, level, flags])

  // The turn shown: the one a run is on (or its last, once past it); before a run, the first turn, as a preview.
  const runOf = checked.runs[run.at]
  const shown = run.playback.shown(run.at)
  const at = !run.run ? 0 : shown.list.length ? (shown.at >= 0 ? shown.at : shown.list.length - 1) : -1
  const turn = at >= 0 ? runOf.turns[at] : null
  const ended = Boolean(run.run && (run.run.test > run.at || run.run.over) && shown.list.length && shown.at < 0)

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
              <option value="" disabled>{tr('选择文件', 'Choose a file')}</option>
              {files.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
        )}
        {node.type === 'repo' || node.type === 'stop' ? <SinkValue node={node} value={valueOf(node)} turn={turn} /> : <Value value={valueOf(node)} error={errorOf(node)} />}
        {call && <small className="ag-sees">{tr(`看到 ${call.tokens} tok`, `sees ${call.tokens} tok`)}{call.dropped.length ? tr(` · 丢弃 ${call.dropped.length} 条`, ` · ${call.dropped.length} dropped`) : ''}</small>}
      </div>
    )
  }
  const outNote = (node, key) => {
    const v = valueOf(node, key)
    if (v === undefined) return null
    return key === 'green' ? L(flagText(v)) : v.length ? L(entryText(v[0])) : tr('空', 'empty')
  }
  const itemOf = (type) => ({ type, label: CARDS[type].name, desc: game.textAt(CARDS[type], level.id).desc, icon: CARDS[type].icon, family: CARDS[type].family, fresh: entry.fresh?.includes(type) })

  const totalTokens = checked.runs.reduce((n, r) => n + r.tokens, 0)
  const score = (
    <section className="ag-score">
      <div className="stat-row">
        <div className="stat"><b>{run.run ? runOf.tokens : '–'}</b><span>{tr('token', 'tokens')}</span></div>
        <div className="stat"><b>{run.run ? runOf.turns.length : '–'}</b><span>{level.machine.mode === 'once' ? tr('次调用', 'calls') : tr('轮', 'turns')}</span></div>
        {level.budget?.tokens && <div className="stat"><b>{level.budget.tokens}</b><span>{tr('token 上限', 'token budget')}</span></div>}
        {level.machine.mode === 'loop' && <div className="stat"><b>{level.budget?.turns ?? level.machine.turns}</b><span>{tr('轮数上限', 'turn limit')}</span></div>}
      </div>
      {run.passed && <p className="ag-total">{tr(`全部测试共 ${totalTokens} token`, `${totalTokens} tokens across all tests`)}</p>}
    </section>
  )

  const test = level.tests[run.at]
  const steps = shown.list.map((t) => ({
    label: actionText(t.calls[0]?.action),
    value: t.kept.length ? <ContextValue value={t.kept} /> : null,
  }))
  const verdict = ended ? runOf.fail : null
  const strip = (
    <div className="ag-strip">
      <section className="ag-col">
        <Text game={game} className="ag-issue" text={test.issue.text} />
        <RepoView repo={test.repo} state={turn?.state ?? {}} />
        {ended && <Report report={runOf.report} />}
        {ended && <p className={`ag-verdict ${verdict ? 'is-fail' : 'is-pass'}`}>{verdict ? L(verdict) : tr('通过：所有测试均正确，机器已停止。', 'Passed: all tests are green and the machine has stopped.')}</p>}
      </section>
      <section className="ag-col">
        <h3 className="ag-head">{tr('逐轮记录', 'Turn log')}</h3>
        {steps.length ? <StepLog steps={steps} at={shown.at} /> : <p className="ag-note">{tr('运行后，这里逐轮列出模型的动作和留到下一轮的内容。', 'After a run, each turn’s action and kept context appear here.')}</p>}
      </section>
      <section className="ag-col">
        <h3 className="ag-head">{tr('模型看到的', 'What the model sees')}</h3>
        <ContextBar call={turn?.calls[0]} window={level.machine.window} />
      </section>
    </div>
  )

  return (
    <CircuitLevel
      screen={screen}
      board={board}
      run={run}
      className="ag-level"
      parts={parts}
      items={palette.map(itemOf)}
      folded={folded.map(itemOf)}
      card={{
        body,
        outNote,
        thumb: (n) => <Value value={valueOf(n)} error={errorOf(n)} />,
        cardClass: (node) => `ag-node ${node.type === 'stop' && turn?.stop ? 'is-stopped' : ''}`,
        wireState: (wire) => (turn && turn.values.get(wire.from) !== undefined ? 'live' : 'dead'),
      }}
      canvas={{ width: 160, height: 130 }}
      brief={{ hint: level.hint, children: score }}
      describe={(node) => game.textAt(CARDS[node.type], level.id).desc}
      results={strip}
    />
  )
}
