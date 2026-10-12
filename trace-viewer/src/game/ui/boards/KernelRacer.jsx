import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, Timer, X } from 'lucide-react'
import ImageView from '../ImageView.jsx'
import { rangeOf } from '../display.js'
import './KernelRacer.css'

const fraction = (div) => (div === 1 ? '' : `÷ ${div}`)

// One kernel card: the 3×3 numbers as the 3×3 kernel part reads them, tinted by sign.
function KernelCard({ kernel }) {
  const peak = Math.max(...kernel.cells.map(Math.abs))
  return (
    <span className="racer-kernel">
      <span className="racer-grid">
        {kernel.cells.map((c, i) => {
          const share = Math.round((Math.abs(c) / peak) * 34)
          const tint = c > 0 ? `color-mix(in srgb, var(--accent) ${share}%, var(--paper))` : c < 0 ? `color-mix(in srgb, var(--ink) ${Math.round(share * 0.7)}%, var(--paper))` : 'var(--paper)'
          return <i key={i} style={{ background: tint }} className={c ? '' : 'is-zero'}>{c}</i>
        })}
      </span>
      <small>{fraction(kernel.div)}</small>
    </span>
  )
}

// 1-R 核速判: ten rounds, an input and an output, four kernel cards; pick the one that did it.
// Rounds come from a seed (one per attempt) and get shorter; a switch turns the clock off.
export default function KernelRacer({ level, onSolve, theme }) {
  const [phase, setPhase] = useState('ready') // ready → play → done
  const [attempt, setAttempt] = useState(1)
  const [timed, setTimed] = useState(true)
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState([])
  const [feedback, setFeedback] = useState(null) // { chosen } while the answer is shown
  const solved = useRef(false)
  const rounds = useMemo(() => level.rounds(attempt), [level, attempt])
  const round = rounds[index]
  const { rounds: total, pass } = level.racer
  const limit = level.timeFor(index)

  const answer = useCallback(
    (chosen) => {
      if (phase !== 'play' || feedback) return
      setFeedback({ chosen })
      setResults((r) => [...r, chosen === round.answer])
    },
    [phase, feedback, round],
  )

  // The clock: running out counts as a wrong answer.
  useEffect(() => {
    if (phase !== 'play' || !timed || feedback) return
    const clock = setTimeout(() => answer(null), limit * 1000)
    return () => clearTimeout(clock)
  }, [phase, timed, feedback, limit, answer])

  // Show the right card briefly, then move on.
  useEffect(() => {
    if (!feedback) return
    const pause = setTimeout(() => {
      setFeedback(null)
      if (index + 1 < rounds.length) {
        setIndex(index + 1)
        return
      }
      setPhase('done')
      if (results.filter(Boolean).length >= pass && !solved.current) {
        solved.current = true
        onSolve()
      }
    }, feedback.chosen === round.answer ? 450 : 1100)
    return () => clearTimeout(pause)
  }, [feedback, index, rounds.length, results, pass, onSolve, round])

  const start = useCallback(() => {
    if (phase === 'done') setAttempt((a) => a + 1)
    setIndex(0)
    setResults([])
    setFeedback(null)
    setPhase('play')
  }, [phase])

  useEffect(() => {
    const onKey = (event) => {
      if (/input|select|textarea/i.test(document.activeElement?.tagName)) return
      if (phase === 'play' && /^[1-4]$/.test(event.key)) {
        event.preventDefault()
        answer(Number(event.key) - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, answer])

  const right = results.filter(Boolean).length
  const range = round ? rangeOf(round.output) : null

  return (
    <div className="racer">
      <header className="racer-head">
        <div className="racer-progress" aria-label={`第 ${Math.min(index + 1, total)} / ${total} 轮`}>
          {Array.from({ length: total }, (_, i) => (
            <i key={i} className={i < results.length ? (results[i] ? 'is-right' : 'is-wrong') : i === index && phase === 'play' ? 'is-now' : ''} />
          ))}
        </div>
        <span className="racer-score">对 {right} / {total} · 过关 {pass}</span>
        <label className="racer-toggle">
          <input type="checkbox" checked={!timed} onChange={(e) => setTimed(!e.target.checked)} />
          不限时
        </label>
      </header>

      {phase === 'play' && round && (
        <>
          <div className="racer-clock" aria-hidden="true">
            {timed && !feedback && <i key={`${attempt}-${index}`} style={{ animationDuration: `${limit}s` }} />}
          </div>
          <div className="racer-stage">
            <figure>
              <ImageView img={round.input} range={{ lo: 0, hi: 1 }} size={184} theme={theme} />
              <figcaption>输入</figcaption>
            </figure>
            <ArrowRight className="racer-arrow" size={22} strokeWidth={1.4} />
            <figure>
              <ImageView img={round.output} range={range} size={184} theme={theme} />
              <figcaption>输出{range.lo < 0 ? '（灰 = 0）' : ''}</figcaption>
            </figure>
            <p className="racer-time">{timed ? <><Timer size={13} /> 本轮 {limit.toFixed(1)} 秒</> : '不限时'}</p>
          </div>
          <div className="racer-choices" role="group" aria-label="哪个核">
            {round.choices.map((k, i) => {
              const state = feedback ? (i === round.answer ? 'is-right' : i === feedback.chosen ? 'is-wrong' : 'is-dim') : ''
              return (
                <button key={`${index}-${i}`} className={`racer-choice ${state}`} onClick={() => answer(i)} disabled={Boolean(feedback)} aria-label={`选项 ${i + 1}`}>
                  <span className="racer-key">{i + 1}</span>
                  <KernelCard kernel={level.kernels[k]} />
                  {state === 'is-right' && <Check className="racer-mark" size={16} />}
                  {state === 'is-wrong' && <X className="racer-mark" size={16} />}
                </button>
              )
            })}
          </div>
          <p className="racer-note" aria-live="polite">{feedback ? (feedback.chosen === null ? '时间到。' : feedback.chosen === round.answer ? '对。' : '不对，是标出的那个。') : '点选或按数字键 1–4。'}</p>
        </>
      )}

      {phase !== 'play' && (
        <div className="racer-gate">
          {phase === 'done' && <p className="racer-result">{right >= pass ? `对了 ${right} / ${total}，过关。` : `对了 ${right} / ${total}，还差 ${pass - right} 轮。`}</p>}
          <p className="racer-lede">每一轮给你一张输入、一张输出和四个 3×3 核。{timed ? '时间越来越短。' : '现在不限时。'}</p>
          <button className="racer-start" onClick={start} autoFocus>{phase === 'done' ? '再来一局' : '开始'}</button>
        </div>
      )}
    </div>
  )
}
