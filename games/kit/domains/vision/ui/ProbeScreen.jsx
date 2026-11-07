import { useState } from 'react'
import { Brief, Level, RunDock } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import Show from '../../../views/Show.jsx'
import { fromRows } from '../image.js'
import RowsEditor from './RowsEditor.jsx'
import { blankProbe, checkProbe, probeOutput, probeQuestions } from '../probe.js'

export default function ProbeScreen({ game, level, saved, save, solve, phone }) {
  const [evidence, setEvidence] = useState(() => saved?.evidence ?? [])
  const [at, setAt] = useState(() => Math.min(saved?.evidence?.length ?? 0, probeQuestions.length - 1))
  const [rows, setRows] = useState(() => saved?.evidence?.at(-1)?.rows ?? blankProbe())
  const [run, setRun] = useState(null)
  const [answer, setAnswer] = useState('')
  const [why, setWhy] = useState(null)
  const question = probeQuestions[at]
  const accepted = evidence.length === probeQuestions.length && evidence[0]?.rows
  const contributions = accepted && fromRows(accepted.slice(2, 5).map(row => row.slice(2, 5).map(value => value / 9)))
  const change = next => {
    setRows(next)
    setRun(null)
    setAnswer('')
    setWhy(null)
  }
  const observe = () => {
    const output = probeOutput(rows)
    setRun(output ? { rows, output } : null)
    setWhy(output ? null : tr('读数必须在 0 到 1 之间。', 'Readings must be between 0 and 1.'))
  }
  const submit = () => {
    const entry = { rows: run?.rows, answer }
    const problem = checkProbe(question, entry)
    setWhy(problem ? L(problem) : null)
    if (problem) return
    const next = [...evidence.slice(0, at), entry]
    setEvidence(next)
    save({ evidence: next })
    if (at === probeQuestions.length - 1) solve(null)
    else {
      setAt(at + 1)
      setAnswer('')
    }
  }
  const stage = <div className="vi-grid">
    <h2>{L(question.title)}</h2>
    <RowsEditor rows={rows} onChange={change} />
    <div className="vi-probe-actions">
      <button type="button" className="kit-btn" onClick={observe}>{tr('运行模糊器', 'Run the blur')}</button>
      <button type="button" className="kit-btn" onClick={() => change(blankProbe())}>{tr('清零输入', 'Clear input')}</button>
    </div>
    {contributions && <details>
      <summary>{tr('查看中心像素的贡献', 'Inspect the centre pixel’s contributions')}</summary>
      <p>{tr('以下是第一轮提交的输入中，中心附近的九项读数各乘以 1/9。相加得到输出的中心读数。', 'These are the nine readings around the centre of your first submission, each multiplied by 1/9. Their sum is the output at the centre.')}</p>
      <Show value={contributions} scene="figure" views={['numbers']} />
    </details>}
    {run && <>
      <Show value={run.output} scene="figure" views={['pixels']} label={tr('模糊器输出', 'Blur output')} />
      <Show value={run.output} scene="figure" views={['numbers']} label={tr('输出读数', 'Output readings')} />
      <fieldset className="vi-probe-options">
        <legend>{tr('输出支持哪种解释？', 'Which explanation fits the output?')}</legend>
        {question.options.map(([id, label]) => <label key={id}>
          <input type="radio" name="probe-answer" checked={answer === id} onChange={() => setAnswer(id)} /> {L(label)}
        </label>)}
      </fieldset>
    </>}
  </div>
  return <Level phone={phone} className="vi-grid-level"
    brief={<Brief game={game} level={level} hint={level.source.hint} phone={phone} />}
    stage={stage} results={why && <p className="rv-verdict is-fail" role="status">{why}</p>}
    dock={<RunDock go={{ label: tr('提交证据', 'Submit evidence'), onClick: submit }} />} />
}
