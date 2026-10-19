import { useState } from 'react'
import { NODE_TYPES } from '../engine/nodes.js'
import { L, keyOf, tr } from '../../../../games/kit/shell/i18n.js'
import ImageView from './ImageView.jsx'

// A probe level: no building. Feed the unknown part test images, watch what comes out, then answer.
export default function ProbeLevel({ level, onSolve, theme }) {
  const [probe, setProbe] = useState(0)
  // The last wrong choice, kept as the choice itself so its message follows a language switch.
  const [wrong, setWrong] = useState(null)
  // The cell last tapped or pointed at: it stays read out after the finger lifts.
  const [cell, setCell] = useState(null)
  const input = level.probes[probe][1]
  const output = NODE_TYPES[level.part].eval({ in: input })
  const read = (point) => point && setCell({ x: point.x, y: point.y })
  const at = (img) => img.data[cell.y * img.w + cell.x].toFixed(3).replace(/\.?0+$/, '')

  const answer = (choice) => {
    if (keyOf(choice) === level.answer) {
      setWrong(null)
      onSolve()
    } else {
      setWrong(choice)
    }
  }

  return (
    <div className="probe">
      <div className="probe-inputs" role="radiogroup" aria-label={tr('测试图', 'Test pictures')}>
        {level.probes.map(([label, img], index) => (
          <button key={keyOf(label)} role="radio" aria-checked={probe === index} className={`probe-choice ${probe === index ? 'is-active' : ''}`} onClick={() => { setProbe(index); setCell(null) }}>
            <ImageView img={img} size={56} theme={theme} />
            <span>{L(label)}</span>
          </button>
        ))}
      </div>
      <div className="probe-machine">
        <figure>
          <ImageView img={input} size={176} theme={theme} grid onHover={read} />
          <figcaption>{tr('喂进去', 'Fed in')}</figcaption>
        </figure>
        <div className="probe-box" aria-hidden="true">？？？</div>
        <figure>
          <ImageView img={output} size={176} theme={theme} grid onHover={read} />
          <figcaption>{tr('出来的', 'Comes out')}</figcaption>
        </figure>
      </div>
      <p className="pixel-probe" aria-live="polite">
        {cell ? <>{tr(`第 ${cell.x + 1} 列、第 ${cell.y + 1} 行：`, `Column ${cell.x + 1}, row ${cell.y + 1}: `)}{tr('喂进去 ', 'fed in ')}<b>{at(input)}</b>{tr('，出来 ', ', comes out ')}<b>{at(output)}</b></> : tr('点一下图里的格子（电脑上把鼠标停在上面），读出它的数。', 'Tap a cell in a picture (or point at it on a computer) to read its number.')}
      </p>
      <div className="probe-question">
        <p>{L(level.question)}</p>
        <div className="probe-answers">
          {level.answers.map((choice) => (
            <button key={keyOf(choice)} onClick={() => answer(choice)}>{L(choice)}</button>
          ))}
        </div>
        <p className="probe-feedback" aria-live="polite">{wrong !== null && `${tr(`不是 ${L(wrong)}。`, `Not ${L(wrong)}. `)}${L(level.wrong)}`}</p>
      </div>
    </div>
  )
}
