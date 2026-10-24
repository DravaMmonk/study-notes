import { L, tr } from '../../../shell/i18n.js'
import { TIMES, TIME_QUESTIONS, timeGap, timeOf } from '../engine/grammar.js'

// The time slot, filled by answering the questions a native speaker settles before a clause (grammar.js
// TIME_QUESTIONS): one event or not tied to one time; where you stand; what you see from there. The answers make the
// time; nothing names it for the player. A level opens the answers its times use (`allowed`, its palette); the other
// answers are there but off, so the questions are the same in every level.
//
//   allowed   Set of time keys the level weighs ('present.perfect')
//   answers   { kind?, stand?, view? }        onAnswer(question id, answer id)

const usable = (allowed, question, option) => [...allowed].some((key) => {
  if (question === 'kind') return option === 'general' ? key === 'present.simple' : key !== 'present.simple'
  if (key === 'present.simple') return false
  const [tense, aspect] = key.split('.')
  return question === 'stand' ? tense === option : aspect === option
})

export default function TimeQuestions({ allowed, answers, onAnswer }) {
  const time = timeOf(answers)
  const gap = timeGap(answers)
  return (
    <section className="sx-questions" aria-label={tr('时间和视角', 'Time and viewpoint')}>
      <div className="sx-questions-head">
        <b>{tr('时间和视角', 'Time and viewpoint')}</b>
        <span>{time ? TIMES[time] : tr('先回答这里，再放词', 'Answer these before placing words')}</span>
      </div>
      {TIME_QUESTIONS.map((q, k) => {
        const off = k > 0 && answers.kind !== 'episode'
        return (
          <fieldset key={q.id} className={`sx-question ${off ? 'is-off' : ''}`} disabled={off}>
            <legend><i>{k + 1}</i>{L(q.ask)}</legend>
            <div className="sx-options">
              {q.options.map(([id, label]) => (
                <button key={id} type="button" className={`sx-option ${answers[q.id] === id ? 'is-on' : ''}`} aria-pressed={answers[q.id] === id} disabled={!usable(allowed, q.id, id)} onClick={() => onAnswer(q.id, id)}>
                  {L(label)}
                </button>
              ))}
            </div>
          </fieldset>
        )
      })}
      {gap && <p className="sx-gap" role="status">{L(gap)}</p>}
    </section>
  )
}
