import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, Timer, X } from 'lucide-react'
import { tr } from '../../../../../games/kit/shell/i18n.js'
import ImageView from '../ImageView.jsx'
import { PHONE, useMedia } from '../../../../../games/kit/shell/useMedia.js'
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
  const phone = useMedia(PHONE)
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
    <div className="bk racer">
      <header className="bk-panel is-quiet racer-head">
        <div className="racer-progress" role="img" aria-label={tr(`第 ${Math.min(index + 1, total)} / ${total} 轮，对 ${right} 轮`, `Round ${Math.min(index + 1, total)} / ${total}, ${right} right`)}>
          {Array.from({ length: total }, (_, i) => (
            <i key={i} className={i < results.length ? (results[i] ? 'is-right' : 'is-wrong') : i === index && phase === 'play' ? 'is-now' : ''} />
          ))}
        </div>
        <span className="bk-chip racer-score">{tr(`对 ${right} / ${total} · 过关 ${pass}`, `Right ${right} / ${total} · pass at ${pass}`)}</span>
        <label className="bk-check racer-toggle">
          <input type="checkbox" checked={!timed} onChange={(e) => setTimed(!e.target.checked)} />
          {tr('不限时', 'No time limit')}
        </label>
      </header>

      {phase === 'play' && round && (
        <div className="bk-split is-even racer-play">
          <section className="bk-stage racer-stage">
            <div className="racer-clock" aria-hidden="true">
              {timed && !feedback && <i key={`${attempt}-${index}`} style={{ animationDuration: `${limit}s` }} />}
            </div>
            <div className="racer-pair">
              <figure>
                <ImageView img={round.input} range={{ lo: 0, hi: 1 }} size={184} theme={theme} />
                <figcaption className="bk-caption">{tr('输入', 'Input')}</figcaption>
              </figure>
              <ArrowRight className="racer-arrow" size={20} strokeWidth={1.5} />
              <figure>
                <ImageView img={round.output} range={range} size={184} theme={theme} />
                <figcaption className="bk-caption">{tr('输出', 'Output')}{range.lo < 0 ? tr('（灰 = 0）', ' (grey = 0)') : ''}</figcaption>
              </figure>
            </div>
            <p className="bk-caption racer-time">{timed ? <><Timer size={13} /> {tr(`第 ${index + 1} 轮 · ${limit.toFixed(1)} 秒`, `Round ${index + 1} · ${limit.toFixed(1)} s`)}</> : tr(`第 ${index + 1} 轮 · 不限时`, `Round ${index + 1} · no time limit`)}</p>
          </section>

          <div className="bk-stack">
            <div className="racer-choices" role="group" aria-label={tr('哪个核', 'Which kernel')}>
              {round.choices.map((k, i) => {
                const state = feedback ? (i === round.answer ? 'is-right' : i === feedback.chosen ? 'is-wrong' : 'is-dim') : ''
                return (
                  <button key={`${index}-${i}`} className={`racer-choice ${state}`} onClick={() => answer(i)} disabled={Boolean(feedback)} aria-label={tr(`选项 ${i + 1}`, `Option ${i + 1}`)}>
                    <span className="racer-key">{i + 1}</span>
                    <KernelCard kernel={level.kernels[k]} />
                    {state === 'is-right' && <Check className="racer-mark" size={16} />}
                    {state === 'is-wrong' && <X className="racer-mark" size={16} />}
                  </button>
                )
              })}
            </div>
            <p className={`bk-verdict racer-note ${feedback ? (feedback.chosen === round.answer ? 'is-pass' : 'is-fail') : ''}`} aria-live="polite">
              {feedback ? (feedback.chosen === null ? tr('时间到。', 'Time is up.') : feedback.chosen === round.answer ? tr('对。', 'Right.') : tr('不对，是标出的那个。', 'Wrong: it is the one marked.')) : phone ? tr('点一个核。', 'Tap a kernel.') : tr('点选，或按数字键 1–4。', 'Click one, or press 1–4.')}
            </p>
          </div>
        </div>
      )}

      {phase !== 'play' && (
        <section className="bk-stage racer-gate">
          {phase === 'done' && (
            <p className={`bk-title racer-result ${right >= pass ? 'is-pass' : ''}`}>
              {right >= pass ? tr(`对了 ${right} / ${total}，过关。`, `${right} / ${total} right. Passed.`) : tr(`对了 ${right} / ${total}，还差 ${pass - right} 轮。`, `${right} / ${total} right, ${pass - right} short.`)}
            </p>
          )}
          <p className="racer-lede">{tr('每一轮给你一张输入、一张输出和四个 3×3 核，选出做这件事的那个。', 'Each round gives you an input, an output and four 3×3 kernels. Pick the one that did it.')}</p>
          <div className="racer-rules">
            <span className="bk-chip">{tr(`${total} 轮`, `${total} rounds`)}</span>
            <span className="bk-chip">{tr(`对 ${pass} 轮过关`, `${pass} right to pass`)}</span>
            <span className="bk-chip">{timed ? tr(`${level.timeFor(0).toFixed(0)} 秒起，越来越短`, `${level.timeFor(0).toFixed(0)} s at first, then shorter`) : tr('不限时', 'No time limit')}</span>
          </div>
          <button className="bk-btn is-primary racer-start" onClick={start} autoFocus>{phase === 'done' ? tr('再来一局', 'Play again') : tr('开始', 'Start')}</button>
        </section>
      )}
    </div>
  )
}
