import { useState } from 'react'
import { Brief, Level, RunDock } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import Show from '../../../views/Show.jsx'
import { fromRows } from '../image.js'
import RowsEditor from './RowsEditor.jsx'
import { probeOf } from '../probe.js'

export default function ProbeScreen({ game, level, saved, save, solve, phone }) {
  const model = probeOf(level.source)
  const blur = model.field === 'rows' && level.source.experiment !== 'shift'
  const spectrum = model.field === 'cycles'
  const { questions } = model
  const [baseline] = useState(() => spectrum ? model.output(model.initial()) : null)
  const [evidence, setEvidence] = useState(() => saved?.evidence ?? [])
  const [at, setAt] = useState(() => Math.min(saved?.evidence?.length ?? 0, questions.length - 1))
  const [input, setInput] = useState(() => evidence[evidence.length - 1]?.[model.field] ?? model.initial())
  const [run, setRun] = useState(null)
  const [answer, setAnswer] = useState('')
  const [why, setWhy] = useState(null)
  const question = questions[at]
  const accepted = blur && evidence.length === questions.length && evidence[0]?.rows
  const contributions = accepted && fromRows(accepted.slice(2, 5).map(row => row.slice(2, 5).map(value => value / 9)))
  const change = next => {
    setInput(next)
    setRun(null)
    setAnswer('')
    setWhy(null)
  }
  const observe = () => {
    const output = model.output(input)
    setRun(output ? { input, output } : null)
    setWhy(output ? null : spectrum ? tr('重复次数应为 1 到 5。', 'Use repetition counts from 1 to 5.') : tr('读数必须在 0 到 1 之间。', 'Readings must be between 0 and 1.'))
  }
  const submit = () => {
    const entry = { [model.field]: run?.input, answer }
    const problem = model.check(question, entry)
    setWhy(problem ? L(problem) : null)
    if (problem) return
    const next = [...evidence.slice(0, at), entry]
    setEvidence(next)
    save({ evidence: next })
    if (at === questions.length - 1) solve(null)
    else {
      setAt(at + 1)
      if (spectrum) change(model.initial())
      else setAnswer('')
    }
  }
  const stage = <div className="vi-grid">
    <h2>{L(question.title)}</h2>
    {spectrum ? <>
      <div className="vi-probe-actions">
        {['x', 'y'].map(axis => <label key={axis}>
          {axis === 'x' ? tr('左右重复次数', 'Repetitions across') : tr('上下重复次数', 'Repetitions down')}
          {' '}<select value={input[axis]} onChange={event => change({ ...input, [axis]: Number(event.target.value) })}>
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>)}
      </div>
    </> : <RowsEditor rows={input} onChange={change} />}
    <div className="vi-probe-actions">
      <button type="button" className="kit-btn" onClick={observe}>{tr('运行实验', 'Run trial')}</button>
      <button type="button" className="kit-btn" onClick={() => change(model.initial())}>{spectrum ? tr('恢复基准', 'Reset to baseline') : tr('清零输入', 'Clear input')}</button>
    </div>
    {spectrum && <div className="vi-probe-comparison">
      <section>
        <Show value={baseline} scene="figure" views={['pixels']} label={tr('基准图（横、纵各重复 2 次）', 'Baseline image (2 across, 2 down)')} />
        <Show value={baseline} scene="figure" views={['spectrum']} label={tr('基准频谱', 'Baseline spectrum')} />
      </section>
      {run && <section>
        <Show value={run.output} scene="figure" views={['pixels']} label={tr('实验图', 'Trial image')} />
        <Show value={run.output} scene="figure" views={['spectrum']} label={tr('实验频谱', 'Trial spectrum')} />
      </section>}
    </div>}
    {contributions && <details>
      <summary>{tr('查看中心像素的贡献', 'Inspect the centre pixel’s contributions')}</summary>
      <p>{tr('以下是第一轮提交的输入中，中心附近的九项读数各乘以 1/9。相加得到输出的中心读数。', 'These are the nine readings around the centre of your first submission, each multiplied by 1/9. Their sum is the output at the centre.')}</p>
      <Show value={contributions} scene="figure" views={['numbers']} />
    </details>}
    {run && <>
      {!spectrum && <div className="vi-probe-actions">
        <Show value={run.output} scene="figure" views={['pixels']} label={tr('实验输出', 'Trial output')} />
        <Show value={run.output} scene="figure" views={['numbers']} label={tr('输出读数', 'Output readings')} />
      </div>}
      <fieldset className="vi-probe-options">
        <legend>{spectrum ? tr('发生移动的那对亮点，相对中心如何变化？', 'How does the affected pair move relative to the centre?') : tr('输出支持哪种解释？', 'Which explanation fits the output?')}</legend>
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
