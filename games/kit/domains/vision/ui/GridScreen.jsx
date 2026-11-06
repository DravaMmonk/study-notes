import { useState } from 'react'
import { Brief, Level, RunDock, useKeptVerdict } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { WORDS } from '../../../shell/words.js'
import { fromRows } from '../image.js'
import { askOf, gridCheck, gridStart } from '../grid.js'
import GridView from '../../../shell/views/grid/GridView.jsx'
import Strips from './Strips.jsx'
import GridInspector from '../../../shell/views/grid/GridInspector.jsx'
import CalculationAid from './CalculationAid.jsx'
import RowsEditor, { NumberField } from './RowsEditor.jsx'

// A grid task (../grid.js): the image as numeric cells with axes; under it what the
// ask wants — a grid to fill in (copy, fill, set), a cell to click (pick) or the coordinates of the cell marked
// (locate). The answer is kept as it is typed; Check runs the ask's own check and says what is wrong.

export default function GridScreen({ game, level: entry, saved, save, solve, lastRun, keepRun, phone }) {
  const task = entry.source
  const { name, params } = askOf(task)
  const img = task.img
  const [answer, setAnswer] = useState(() => saved ?? gridStart(task))
  const [at, select] = useState({ x: 0, y: 0 })
  const calculation = Boolean(task.window || task.calculation)
  const sourceLabel = task.calculation?.kind === 'magnitude' ? tr('分量表：行 0 为 gx，行 1 为 gy', 'Components: row 0 is gx, row 1 is gy') : task.calculation?.kind === 'product' ? tr('横向权重表', 'Row weights') : tr('原图', 'Source image')
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
    <GridInspector value={img} label={sourceLabel} {...props} />
  )
  const coord = (key) => (
    <label className="vi-field is-inline">
      <span>{key}</span>
      <NumberField value={answer?.[key]} onChange={(n) => update({ ...answer, [key]: n })} />
    </label>
  )
  const asked = {
    copy: () => <>{picture({})}<RowsEditor rows={answer} onChange={update} /></>,
    fill: () => <>{picture({})}{calculation && <CalculationAid task={task} rows={answer} at={at} select={select} apply={(value) => update(answer.map((row, y) => row.map((v, x) => x === at.x && y === at.y ? value : v)))} />}{params.strip && <Strips {...params.strip} marks={answer[0]} />}{params.label && <p className="vi-label">{L(params.label)}</p>}<RowsEditor rows={answer} onChange={update} selected={calculation ? at : undefined} onSelect={calculation ? select : undefined} /></>,
    set: () => (
      <>
        {picture({ mark: { x: params.x, y: params.y } })}
        <p className="vi-label">{tr('改过之后的图', 'The image once changed')}</p>
        <RowsEditor rows={answer} onChange={update} />
        {fromRows(answer) && <GridView value={fromRows(answer)} cell={Math.max(8, Math.floor(200 / Math.max(img.w, img.h)))} />}
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
  const stage = <div className={`vi-grid is-${name} ${calculation ? 'has-calculation' : ''}`}>{asked[name]()}</div>
  // The task's naive answer, given, is told why it is wrong (the misconception the point corrects).
  const naive = verdict && !verdict.pass && task.naive && JSON.stringify(answer) === JSON.stringify(task.naive.answer)
  const results = verdict ? (
    <div className="vi-results">
      <p className={`rv-verdict ${verdict.pass ? 'is-pass' : 'is-fail'}`} role="status">{verdict.pass ? tr('对了。', 'Right.') : L(verdict.why)}</p>
      {naive && <p className="rv-verdict is-fail">{L(task.naive.why)}</p>}
    </div>
  ) : null
  const dock = <RunDock go={{ label: verdict?.pass ? L(WORDS.passed) : L(WORDS.check), pass: Boolean(verdict?.pass), onClick: check }} />
  const brief = <Brief game={game} level={entry} hint={task.hint} phone={phone} />
  return <Level phone={phone} className="vi-grid-level" brief={brief} stage={stage} results={results} dock={dock} />
}
