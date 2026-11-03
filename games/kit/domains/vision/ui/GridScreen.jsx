import { useState } from 'react'
import { Brief, Level, RunDock, useKeptVerdict } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { fromRows } from '../image.js'
import { askOf, gridCheck, gridStart, parseNumber as parse } from '../grid.js'
import ImageView from './ImageView.jsx'
import Strips from './Strips.jsx'
import FilterWindow from './FilterWindow.jsx'

// A grid task (../grid.js): the image, as its numbers, its picture or both (`show`), with its axes; under it what the
// ask wants — a grid to fill in (copy, fill, set), a cell to click (pick) or the coordinates of the cell marked
// (locate). The answer is kept as it is typed; Check runs the ask's own check and says what is wrong.

/** A number field that keeps what is typed while it is being typed ("-", "0.", "1/"), and shows a value set from
 *  outside once it differs from what the text reads as. A full keyboard: phones' decimal pads have no minus sign. */
function NumberField({ value, onChange, ...rest }) {
  const [text, setText] = useState(value ?? '')
  const shown = parse(String(text)) === (value ?? null) ? text : value ?? ''
  return <input {...rest} inputMode="text" autoComplete="off" value={shown} onChange={(e) => { setText(e.target.value); onChange(parse(e.target.value)) }} />
}

/** A grid of number fields, a colour cell three of them: rows of numbers or nulls, as the ask's answer. */
function RowsEditor({ rows, onChange }) {
  const set = (y, x, k, n) => onChange(rows.map((r, py) => (py !== y ? r : r.map((v, px) => (px !== x ? v : Array.isArray(v) ? v.map((c, j) => (j === k ? n : c)) : n)))))
  const field = (v, y, x, k = null) => (
    <NumberField key={k ?? 0} value={v} aria-label={`(${x}, ${y})${k === null ? '' : ` ${'RGB'[k]}`}`} onChange={(n) => set(y, x, k, n)} />
  )
  return (
    <table className="vi-rows">
      <thead><tr><th />{rows[0].map((_, x) => <th key={x}>{x}</th>)}</tr></thead>
      <tbody>
        {rows.map((r, y) => (
          <tr key={y}>
            <th>{y}</th>
            {r.map((v, x) => <td key={x}>{Array.isArray(v) ? <span className="vi-rgb">{v.map((c, k) => field(c, y, x, k))}</span> : field(v, y, x)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function GridScreen({ game, level: entry, saved, save, solve, lastRun, keepRun, phone }) {
  const task = entry.source
  const { name, params } = askOf(task)
  const img = task.img
  const show = task.show ?? 'both'
  const [answer, setAnswer] = useState(() => saved ?? gridStart(task))
  const judge = () => {
    const why = gridCheck(task, answer)
    return { pass: !why, why }
  }
  const [verdict, setVerdict] = useKeptVerdict({ lastRun, keepRun }, judge)
  const update = (next) => {
    setAnswer(next)
    save(next)
    setVerdict(null)
  }
  const check = () => {
    const v = judge()
    setVerdict(v)
    if (v.pass) solve(null)
  }

  const picture = (props) => (
    <div className="vi-shown">
      {show !== 'picture' && <ImageView value={img} numbers axes {...props} />}
      {show !== 'numbers' && <ImageView value={img} axes={show === 'picture'} {...(show === 'picture' ? props : { mark: props.mark })} cell={Math.max(8, Math.floor(200 / Math.max(img.w, img.h)))} />}
    </div>
  )
  const coord = (key) => (
    <label className="vi-field is-inline">
      <span>{key}</span>
      <NumberField value={answer?.[key]} onChange={(n) => update({ ...answer, [key]: n })} />
    </label>
  )
  const asked = {
    copy: () => <>{picture({})}<RowsEditor rows={answer} onChange={update} /></>,
    fill: () => <>{picture({})}{task.window && <FilterWindow task={task} />}{params.strip && <Strips {...params.strip} marks={answer[0]} />}{params.label && <p className="vi-label">{L(params.label)}</p>}<RowsEditor rows={answer} onChange={update} /></>,
    set: () => (
      <>
        {picture({ mark: { x: params.x, y: params.y } })}
        <p className="vi-label">{tr('改过之后的图', 'The image once changed')}</p>
        <RowsEditor rows={answer} onChange={update} />
        {fromRows(answer) && <ImageView value={fromRows(answer)} cell={Math.max(8, Math.floor(200 / Math.max(img.w, img.h)))} />}
      </>
    ),
    pick: () => (
      <>
        {picture({ mark: answer, onPick: (x, y) => update({ x, y }) })}
        <p className="vi-label">{answer ? tr(`点的是 (${answer.x}, ${answer.y})`, `Clicked (${answer.x}, ${answer.y})`) : tr('点一格', 'Click a cell')}</p>
      </>
    ),
    locate: () => <>{picture({ mark: { x: params.x, y: params.y } })}<div className="vi-coords">{coord('x')}{coord('y')}</div></>,
  }
  const stage = <div className={`vi-grid is-${name}`}>{asked[name]()}</div>
  // The task's naive answer, given, is told why it is wrong (the misconception the point corrects).
  const naive = verdict && !verdict.pass && task.naive && JSON.stringify(answer) === JSON.stringify(task.naive.answer)
  const results = verdict ? (
    <div className="vi-results">
      <p className={`vi-verdict ${verdict.pass ? 'is-pass' : 'is-fail'}`} role="status">{verdict.pass ? tr('对了。', 'Right.') : L(verdict.why)}</p>
      {naive && <p className="vi-verdict is-fail">{L(task.naive.why)}</p>}
    </div>
  ) : null
  const dock = <RunDock go={{ label: verdict?.pass ? tr('对了', 'Right') : tr('检查', 'Check'), pass: Boolean(verdict?.pass), onClick: check }} />
  const brief = <Brief game={game} level={entry} hint={task.hint} phone={phone} />
  return <Level phone={phone} className="vi-grid-level" brief={brief} stage={stage} results={results} dock={dock} />
}
