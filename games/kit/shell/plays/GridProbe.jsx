import { useMemo, useState } from 'react'
import { pixelText, readCell } from '../../engine/grid.js'
import GridView, { GridPicture } from '../../views/grid/GridView.jsx'
import { useMark } from '../edit.js'
import { L, keyOf, tr } from '../i18n.js'
import './grid-probe.css'

/** Inspect the inputs and outputs of a black box, then identify its operation. */
export default function GridProbe({ resource, onSolve }) {
  const { examples, run, question, answers, judge, wrong, rangeFor } = resource
  const mark = useMark()
  const [active, setActive] = useState(0)
  const [rejected, setRejected] = useState(null)
  const [point, setPoint] = useState(null)
  const { input } = examples[active]
  const output = useMemo(() => run(input), [run, input])
  const inputRead = point && readCell(point, point.source, input)
  const outputRead = point && readCell(point, point.source, output)
  const select = (index) => {
    setActive(index)
    setPoint(null)
  }
  const choose = (choice) => {
    if (!judge(choice)) return setRejected(choice)
    setRejected(null)
    onSolve()
  }
  const figure = (value, label, reading) => {
    const pick = (x, y) => setPoint({ x, y, source: value })
    return (
      <figure>
        <GridView value={value} range={rangeFor(value)} label={label} cell={176 / value.w} grid mark={reading} onPick={pick} onHover={pick} />
        <figcaption>{label}</figcaption>
      </figure>
    )
  }

  return (
    <div className="probe">
      <div className="probe-inputs" role="radiogroup" aria-label={tr('测试图')}>
        {examples.map(({ label, input }, index) => (
          <button key={keyOf(label)} type="button" role="radio" aria-checked={active === index} className={`probe-choice ${active === index ? 'is-active' : ''}`} {...mark(`probes[${index}]`, 'task', () => select(index))} onClick={() => select(index)}>
            <GridPicture value={input} range={rangeFor(input)} scale={56 / input.w} />
            <span>{L(label)}</span>
          </button>
        ))}
      </div>
      <div className="probe-machine">
        {figure(input, tr('输入', 'Input'), inputRead)}
        <div className="probe-box" aria-hidden="true">？？？</div>
        {figure(output, tr('输出', 'Output'), outputRead)}
      </div>
      <p className="pixel-probe" aria-live="polite">
        {point ? <>{tr(`第 ${point.x + 1} 列、第 ${point.y + 1} 行：`, `Column ${point.x + 1}, row ${point.y + 1}: `)}{tr('输入 ')}<b>{pixelText(inputRead.value, 3)}</b>{tr('，输出 ')}<b>{pixelText(outputRead.value, 3)}</b></>
          : tr('点击图中的格子（电脑上也可将鼠标悬停在格子上），读取它的数值。')}
      </p>
      <div className="probe-question">
        <p {...mark('question')}>{L(question)}</p>
        <div className="probe-answers">
          {answers.map((choice, index) => (
            <button key={keyOf(choice)} type="button" {...mark(`answers[${index}]`)} onClick={() => choose(choice)}>{L(choice)}</button>
          ))}
        </div>
        <p className="probe-feedback" aria-live="polite">{rejected !== null && `${tr(`不是 ${L(rejected)}。`, `Not ${L(rejected)}. `)}${L(wrong)}`}</p>
      </div>
    </div>
  )
}
