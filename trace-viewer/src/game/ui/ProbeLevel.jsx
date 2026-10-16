import { useState } from 'react'
import { NODE_TYPES } from '../engine/nodes.js'
import { L, keyOf, tr } from '../i18n.js'
import ImageView from './ImageView.jsx'

// A probe level: no building. Feed the unknown part test images, watch what comes out, then answer.
export default function ProbeLevel({ level, onSolve, theme }) {
  const [probe, setProbe] = useState(0)
  // The last wrong choice, kept as the choice itself so its message follows a language switch.
  const [wrong, setWrong] = useState(null)
  const input = level.probes[probe][1]
  const output = NODE_TYPES.mystery.eval({ in: input })

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
          <button key={keyOf(label)} role="radio" aria-checked={probe === index} className={`probe-choice ${probe === index ? 'is-active' : ''}`} onClick={() => setProbe(index)}>
            <ImageView img={img} size={56} theme={theme} />
            <span>{L(label)}</span>
          </button>
        ))}
      </div>
      <div className="probe-machine">
        <figure>
          <ImageView img={input} size={176} theme={theme} grid />
          <figcaption>{tr('喂进去', 'Fed in')}</figcaption>
        </figure>
        <div className="probe-box" aria-hidden="true">？？？</div>
        <figure>
          <ImageView img={output} size={176} theme={theme} grid />
          <figcaption>{tr('出来的', 'Comes out')}</figcaption>
        </figure>
      </div>
      <div className="probe-question">
        <p>{L(level.question)}</p>
        <div className="probe-answers">
          {level.answers.map((choice) => (
            <button key={keyOf(choice)} onClick={() => answer(choice)}>{L(choice)}</button>
          ))}
        </div>
        <p className="probe-feedback" aria-live="polite">{wrong !== null && tr(`不是 ${L(wrong)}。换一张测试图，盯住某个亮点看它去了哪里。`, `Not ${L(wrong)}. Try another test picture and follow one bright spot to see where it goes.`)}</p>
      </div>
    </div>
  )
}
