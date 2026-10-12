import { useState } from 'react'
import { NODE_TYPES } from '../engine/nodes.js'
import ImageView from './ImageView.jsx'

// A probe level: no building. Feed the unknown part test images, watch what comes out, then answer.
export default function ProbeLevel({ level, onSolve, theme }) {
  const [probe, setProbe] = useState(0)
  const [wrong, setWrong] = useState('')
  const input = level.probes[probe][1]
  const output = NODE_TYPES.mystery.eval({ in: input })

  const answer = (choice) => {
    if (choice === level.answer) {
      setWrong('')
      onSolve()
    } else {
      setWrong(`不是 ${choice}。换一张测试图，盯住某个亮点看它去了哪里。`)
    }
  }

  return (
    <div className="probe">
      <div className="probe-inputs" role="radiogroup" aria-label="测试图">
        {level.probes.map(([label, img], index) => (
          <button key={label} role="radio" aria-checked={probe === index} className={`probe-choice ${probe === index ? 'is-active' : ''}`} onClick={() => setProbe(index)}>
            <ImageView img={img} size={56} theme={theme} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="probe-machine">
        <figure>
          <ImageView img={input} size={176} theme={theme} />
          <figcaption>喂进去</figcaption>
        </figure>
        <div className="probe-box" aria-hidden="true">？？？</div>
        <figure>
          <ImageView img={output} size={176} theme={theme} />
          <figcaption>出来的</figcaption>
        </figure>
      </div>
      <div className="probe-question">
        <p>{level.question}</p>
        <div className="probe-answers">
          {level.answers.map((choice) => (
            <button key={choice} onClick={() => answer(choice)}>{choice}</button>
          ))}
        </div>
        <p className="probe-feedback" aria-live="polite">{wrong}</p>
      </div>
    </div>
  )
}
