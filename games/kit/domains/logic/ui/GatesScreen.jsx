import { useMemo } from 'react'
import { ArrowRightFromLine, CircleDot, CircuitBoard, ToggleLeft } from 'lucide-react'
import { CircuitLevel, useLevelBoard, useLevelRun } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { PackedBoard } from '../../../circuit/Inside.jsx'
import { MISSING } from '../../../engine/circuit.js'
import { parse } from '../formula.js'
import { say } from '../notation.js'
import { openRef } from '../../../shell/refs.js'
import { PRIMITIVE_GATES, checkGates, countGates, gatesOf, rowsFor, runRow, startGates } from '../gates.js'
import { gateShape } from '../blueprint.js'
import { syncOwn } from '../built.js'

// A truth-circuit level (《证明完毕》, gates.js) on the kit's circuit level (../../../shell/CircuitLevel.jsx): a card for
// each letter on the left, the sentence's output on the right, gates as parts. The tests are the rows of the sentence's
// truth table, picked in the table itself (no row tabs, whose labels would spell the row out twice): picking one shows
// on every card what the board computes on that row. Running goes down the table one row at a time, as a machine
// filling it in (each row a test of no steps): each row's card values and result show in turn, and the run stops on the
// first row it gets wrong. A `hideTarget` level does not show the target value column; a `blind` one does not show its
// sentence either: it is a puzzle said in words. A gate the player built opens to show the board it runs (read only,
// each card's value on the row picked), and the components box shows it too (GateInside).

const TF = (v) => (v === undefined ? '—' : v ? tr('真', 'T') : tr('假', 'F'))
const T = (zh, en) => ({ zh, en })
const WRONG_ROW = T('这一行的结果错误', 'This row is wrong')
const SOURCE = T('输入', 'Input')
/** The editor's description of a board of gates (../../circuit/model.js), with a level's words for its letters. */
function gatePartsFor(built, wordOf) {
  const all = gatesOf(built)
  return {
    ...gateShape(built),
    label: (node) => (node.type === 'letter' ? wordOf(node.params.name) ?? SOURCE : node.type === 'out' ? T('这句话', 'The sentence') : all[node.type]?.name ?? node.type),
    portLabel: (node, port) => (all[node.type] && all[node.type].ports.length > 1 ? port : ''),
    family: (node) => (node.type === 'letter' ? 'given' : node.type === 'out' ? 'end' : PRIMITIVE_GATES[node.type] ? 'gate' : 'built'),
    // A gate the player built runs the board that built it: a packed part.
    packed: (node) => Boolean(all[node.type]?.built),
    icon: (node) => (node.type === 'letter' ? ArrowRightFromLine : node.type === 'out' ? CircleDot : PRIMITIVE_GATES[node.type] ? ToggleLeft : CircuitBoard),
    cardWidth: (node) => (node.type === 'letter' || node.type === 'out' ? 170 : 140),
    rules: all,
  }
}
// The board inside a built gate: its letters are the gate's ports, its output the gate's.
const insideParts = (gates) => ({ ...gatePartsFor(gates, (name) => ({ zh: name, en: name })), label: (node) => (node.type === 'letter' ? { zh: node.params.name, en: node.params.name } : node.type === 'out' ? T('输出', 'Out') : gatesOf(gates)[node.type]?.name ?? node.type) })

// What a built gate on a board (of `gates`) runs, and where it is edited.
const packedOf = (gates) => ({
  open: (node, at) => {
    const gate = gatesOf(at.level?.gates ?? gates)[node.type]
    if (!gate?.built) return null
    const { circuit, level } = gate.opens()
    return { circuit, level, parts: insideParts(level.gates) }
  },
  edit: (node, at) => openRef('level', gatesOf(at.level?.gates ?? gates)[node.type].opens().level.id),
})
// What a card shows: its value on the row picked, or why it gives nothing yet.
const card = {
  body: (node, ctx) => <div className="lg-card"><CardValue value={ctx.view.values.get(node.id)} error={ctx.view.errors.get(node.id)} /></div>,
  thumb: (node, ctx) => <CardValue value={ctx.view.values.get(node.id)} error={ctx.view.errors.get(node.id)} />,
  cardClass: () => 'lg-node',
}

// A saved board still fits: its letters are the level's, and every card is a gate it knows.
const fits = (circuit, level, parts) => {
  const letters = circuit.nodes.filter((n) => n.type === 'letter').map((n) => n.params.name).sort().join()
  return letters === [...rowsFor(level).letters].sort().join() && circuit.nodes.every((n) => n.type === 'letter' || n.type === 'out' || parts.rules[n.type])
}

export default function GatesScreen(screen) {
  const { game, level: entry, flags, progress } = screen
  const level = entry.source
  // The gates the player built run the boards that last passed their levels.
  syncOwn(progress.built)
  const word = (letter) => say(parse(letter), level.notation)
  const parts = useMemo(() => gatePartsFor(level.gates, word), [level])
  const board = useLevelBoard(screen, { open: (saved) => (saved?.nodes && fits(saved, level, parts) ? saved : startGates(level)), fresh: () => startGates(level) })
  const { circuit } = board
  const { letters, rows } = useMemo(() => rowsFor(level), [level])
  // A run down the table: every row checked at once, shown one at a time; over budget fails it once every row is right.
  const checked = useMemo(() => checkGates(level, circuit), [level, board.version])
  const run = useLevelRun(screen, board, {
    tests: rows.map((_, k) => ({ label: String(k + 1) })),
    steps: {
      of: () => [],
      check: (k) => (checked.results[k].pass ? '' : WRONG_ROW),
      final: () => (checked.overBudget ? tr(`每一行都正确，但用了 ${checked.gates} 个门，这一关最多允许 ${level.budget} 个。`, `Every row is correct, but it uses ${checked.gates} gates; this level allows ${level.budget}.`) : ''),
    },
    score: () => ({ steps: checked.gates }),
  })
  const row = rows[run.at]
  // The row picked, traced: what every card gives on it, the cards inside the gates the player built too.
  const view = useMemo(() => {
    const trace = []
    return { ...runRow(level, circuit, row.row, trace), trace }
  }, [level, circuit, row])
  const { shown: palette, folded } = useMemo(() => game.logic.offerIn(level, flags), [game, level, flags])
  const sentence = L(say(parse(level.target), level.notation))
  const hideTarget = level.blind || level.hideTarget
  const states = run.states
  const over = run.run?.over
  const verdictText = !over ? null
    : run.passed ? tr('每一行都正确：这块电路算出了这句话的完整真值表。', 'Every row is correct: this circuit computes the sentence’s full truth table.')
    : run.run.final || tr('这一行的结果错误，运行停在这里。板上每个元件显示它在这一行算出的值。', 'This row is wrong; the run stopped here. Each part on the board shows its value on this row.')

  const itemOf = (type) => ({ type, label: parts.rules[type].name, desc: parts.rules[type].desc, icon: parts.icon({ type }), family: parts.family({ type }), packed: Boolean(parts.rules[type].built), fresh: entry.fresh?.includes(type) })
  const score = (
    <section className="lg-score">
      <div className="stat-row">
        <div className="stat"><b>{countGates(level, circuit)}</b><span>{tr('门', 'Gates')}</span></div>
        {level.budget !== undefined && <div className="stat"><b>{level.budget}</b><span>{tr('最多', 'At most')}</span></div>}
      </div>
    </section>
  )
  const table = (
    <div className="lg-strip">
      {!level.blind && <p className="lg-sequent">{tr('这句话', 'The sentence')} <b>{sentence}</b></p>}
      <table className="lg-rows">
        <thead>
          <tr>{letters.map((l) => <th key={l}>{L(word(l))}</th>)}{!hideTarget && <th>{tr('目标真值', 'Target value')}</th>}<th>{tr('电路输出', 'Circuit output')}</th></tr>
        </thead>
        <tbody>
          {rows.map((r, k) => (
            <tr key={k} className={`${k === run.at ? 'is-on' : ''} ${states[k] ? `is-${states[k]}` : ''}`} onClick={() => run.select(k)}>
              {letters.map((l) => <td key={l}>{L(TF(r.row[l]))}</td>)}
              {!hideTarget && <td>{L(TF(r.want))}</td>}
              <td>{run.run && k < run.run.results.length ? L(TF(checked.results[k].got)) : !run.run && k === run.at ? L(TF(view.value)) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {verdictText && <p className={`lg-verdict ${run.passed ? 'is-pass' : 'is-fail'}`}>{verdictText}</p>}
    </div>
  )

  return (
    <CircuitLevel
      screen={screen}
      board={board}
      run={run}
      className="lg-level"
      parts={parts}
      items={palette.filter((t) => parts.rules[t]).map(itemOf)}
      folded={folded.filter((t) => parts.rules[t]).map(itemOf)}
      view={view}
      card={{
        ...card,
        sinkBody: card.body,
        // The sentence's card says whether the run got the table right.
        cardClass: (node) => `lg-node ${node.type === 'out' && over ? (run.passed ? 'is-pass' : 'is-fail') : ''}`,
      }}
      canvas={{ width: 140, height: 110, emptyNote: T('从上方元件栏选择门放到板上，再把元件右侧的圆点连到另一元件左侧的圆点。', 'Place a gate from the bar above, then connect a dot on the right of one part to a dot on the left of another.') }}
      brief={{ hint: level.hint, children: score }}
      describe={(node) => (parts.role(node) === 'part' ? parts.rules[node.type].desc : null)}
      results={table}
      tabs={false}
      words={{ go: tr('逐行运行', 'Run row by row'), done: tr('真值表全部正确', 'Truth table correct') }}
      packed={{ ...packedOf(level.gates), trace: () => ({ trace: view.trace }) }}
    />
  )
}

/** What a card gives on the row picked: true or false, or why it gives nothing yet. */
function CardValue({ value, error }) {
  if (value !== undefined) return <span className={`lg-tv ${value ? 'is-true' : 'is-false'}`}>{L(TF(value))}</span>
  return <span className={`lg-error ${error === MISSING || !error ? 'is-missing' : ''}`}>{!error || error === MISSING ? tr('等待接线', 'Not wired yet') : L(error)}</span>
}

/**
 * The board a gate the player built runs (gates.js builtGates opens), read only, in the components box, on the slot
 * board on every screen; it shows how the board is wired.
 */
export function GateInside({ type, gates }) {
  const { circuit, level } = gates[type].opens()
  const top = { circuit, level, parts: insideParts(level.gates) }
  return <PackedBoard top={top} {...packedOf(level.gates)} card={card} describe={(node) => (top.parts.role(node) === 'part' ? gatesOf(level.gates)[node.type]?.desc : null)} sheet={card.body} />
}
