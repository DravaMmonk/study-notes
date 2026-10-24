import { useEffect, useMemo, useRef, useState } from 'react'
import { FileText, Landmark, Moon, TriangleAlert } from 'lucide-react'
import { Brief, PhonePage, Workbench } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { TIMES, timeWords } from '../engine/grammar.js'
import { framed, phrased } from '../engine/drill.js'
import { enter, newRun, night, play, practised, reason, situations, take } from '../engine/run.js'

// A run level (engine/run.js): one submission, from first reviews to the programme committee. The route shows the
// stops ahead; at reviews the comments come one at a time, each answered with a phrasing the player holds; after
// reviews a new phrasing is offered; a quiet night restores credibility or revisits what went wrong. The run and the
// player's record of misses (which later runs lean on) are kept in the level's save.

const STOP = {
  reviews: { icon: FileText, name: { zh: '审稿意见', en: 'Reviews' } },
  strict: { icon: TriangleAlert, name: { zh: '二号审稿人', en: 'Reviewer 2' } },
  night: { icon: Moon, name: { zh: '改稿夜', en: 'Revision night' } },
  committee: { icon: Landmark, name: { zh: '程序委员会', en: 'Programme committee' } },
}
const PAUSE = 650
// The phrasings held, always in the grammar's order, so each keeps its place (and its number key) as more are won.
const heldOf = (state) => Object.keys(TIMES).filter((p) => p in state.held)

export default function Run({ game, level, saved, save, solve, phone }) {
  const { lex } = game.syntax
  const spec = level.source.run
  const all = useMemo(() => situations(spec), [spec])
  const byKey = useMemo(() => new Map(all.map((s) => [s.key, s])), [all])
  const [state, setState] = useState(saved?.run ?? null)
  const [history, setHistory] = useState(saved?.history ?? {})
  const [focus, setFocus] = useState(0)
  const [feedback, setFeedback] = useState(null) // { c, phrasing, right, next }
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const commit = (next, hist = history) => {
    setState(next)
    setHistory(hist)
    save({ run: next, history: hist })
    if (next?.phase === 'won' && state?.phase !== 'won') solve({ misses: next.wrongs, star: next.wrongs === 0 })
  }
  const start = () => {
    setFocus(0)
    commit(newRun(spec, (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0))
  }

  // Answering: the result shows on the comment first; a right answer moves on by itself, a wrong one waits.
  const answer = (phrasing) => {
    if (feedback || !state) return
    const { state: next, right, key } = play(spec, state, focus, phrasing)
    if (right === null) return
    const hist = { ...history, [key]: Math.max(0, (history[key] ?? 0) + (right ? -1 : 1)) }
    if (!hist[key]) delete hist[key]
    setFeedback({ c: focus, phrasing, right, next, hist })
    if (right) timer.current = setTimeout(() => go({ next, hist }), PAUSE)
  }
  const go = (f = feedback) => {
    clearTimeout(timer.current)
    setFeedback(null)
    commit(f.next, f.hist)
    const open = f.next.comments.findIndex((x) => !x.picked)
    setFocus(open < 0 ? 0 : open)
  }

  const brief = <Brief game={game} level={level} hint={level.source.hint} />
  const body = !state ? (
    <section className="sx-run-card">
      <p className="sx-run-lead">{tr('一次投稿：从第一轮审稿意见走到程序委员会。每条意见用你句式本里的说法回应；说错会丢可信度，可信度归零就被拒稿。路线每次都不一样，你以前答错的情境会更常出现。', 'One submission, from the first reviews to the programme committee. Answer each comment with a phrasing from your phrasebook; a wrong one costs credibility, and at none the paper is rejected. The route is new each time, and situations you have got wrong before turn up more often.')}</p>
      <button type="button" className="sx-drill-next" onClick={start}>{tr('开始投稿', 'Submit')}</button>
    </section>
  ) : (
    <>
      <Status state={state} />
      {state.phase === 'route' && <Route state={state} onPick={(k) => { setFocus(0); commit(enter(spec, state, k, history)) }} />}
      {state.phase === 'night' && (
        <section className="sx-run-card">
          <h3 className="sx-run-title"><Moon size={16} />{tr('改稿夜', 'Revision night')}</h3>
          <div className="sx-run-choices">
            <button type="button" className="sx-run-choice" onClick={() => commit(night(spec, state, 'rest', history))}><b>{tr('休息', 'Rest')}</b><small>{tr('可信度恢复 4 点', 'Credibility back by 4')}</small></button>
            <button type="button" className="sx-run-choice" onClick={() => { setFocus(0); commit(night(spec, state, 'revise', history)) }}><b>{tr('改稿', 'Revise')}</b><small>{tr('重做答错过的意见，答对一条恢复 1 点', 'Redo comments you got wrong; each right one restores 1')}</small></button>
          </div>
        </section>
      )}
      {state.phase === 'comments' && (
        <Comments lex={lex} state={state} byKey={byKey} focus={focus} setFocus={setFocus} feedback={feedback} onAnswer={answer} onNext={() => go()} phone={phone} />
      )}
      {state.phase === 'offer' && (
        <section className="sx-run-card">
          <h3 className="sx-run-title">{tr('收进句式本：选一个', 'Into your phrasebook: pick one')}</h3>
          <div className="sx-run-choices">
            {state.offer.map((p) => {
              const example = all.find((s) => s.answer === p)
              return (
                <button key={p} type="button" className="sx-run-choice" onClick={() => commit(take(spec, state, p))}>
                  <b>{TIMES[p]}</b>
                  {example && <small><i>{framed(lex, example.clause, p).sentence}</i></small>}
                </button>
              )
            })}
            <button type="button" className="sx-run-choice is-quiet" onClick={() => commit(take(spec, state, null))}><b>{tr('都不要', 'None')}</b><small>{tr('可信度恢复 2 点', 'Credibility back by 2')}</small></button>
          </div>
        </section>
      )}
      {(state.phase === 'won' || state.phase === 'lost') && (
        <section className={`sx-run-card ${state.phase === 'won' ? 'is-won' : 'is-lost'}`}>
          <h3 className="sx-run-title">{state.phase === 'won' ? tr('录用', 'Accepted') : tr('被拒稿', 'Rejected')}</h3>
          <p className="sx-run-lead">{state.phase === 'won'
            ? tr(`程序委员会录用了这篇论文。一路上说错 ${state.wrongs} 次。`, `The committee accepted the paper. ${state.wrongs} wrong on the way.`)
            : tr(`可信度用完了。走到第 ${state.row + 1} 站，说错 ${state.wrongs} 次；这些情境下次会更常出现。`, `Credibility ran out at stop ${state.row + 1}, after ${state.wrongs} wrong; those situations will turn up more next time.`)}</p>
          <button type="button" className="sx-drill-next" onClick={start}>{tr('再投一次', 'Submit again')}</button>
        </section>
      )}
    </>
  )
  const stage = <div className="sx-stage sx-run">{body}</div>
  if (phone) return <PhonePage brief={brief} className="sx-level">{stage}</PhonePage>
  return <Workbench className="sx-level" brief={brief} stage={stage} scroll />
}

function Status({ state }) {
  return (
    <div className="sx-run-status">
      <div className="sx-run-cred" aria-label={tr('可信度', 'Credibility')}>
        <span>{tr('可信度', 'Credibility')} <b>{state.credibility}</b> / {state.max}</span>
        <i style={{ width: `${(state.credibility / state.max) * 100}%` }} />
      </div>
      <div className="sx-run-book" aria-label={tr('句式本', 'Phrasebook')}>
        {heldOf(state).map((p) => (
          <span key={p} className={`sx-run-phrase ${practised(state.held[p]) ? 'is-practised' : ''}`} title={L(timeWords(p))}>{TIMES[p]}</span>
        ))}
      </div>
    </div>
  )
}

function Route({ state, onPick }) {
  return (
    <ol className="sx-run-route">
      {state.route.map((row, r) => (
        <li key={r} className={`sx-run-row ${r === state.row + 1 ? 'is-next' : r <= state.row ? 'is-past' : ''}`}>
          {row.map((kind, k) => {
            const { icon: Icon, name } = STOP[kind]
            const taken = r <= state.row && state.path[r] === k
            return (
              <button key={k} type="button" className={`sx-run-stop ${taken ? 'is-taken' : ''}`} data-kind={kind} disabled={r !== state.row + 1} onClick={() => onPick(k)}>
                <Icon size={15} />{L(name)}
              </button>
            )
          })}
        </li>
      ))}
    </ol>
  )
}

function Comments({ lex, state, byKey, focus, setFocus, feedback, onAnswer, onNext, phone }) {
  const comment = state.comments[focus]
  const situation = byKey.get(comment.key)
  const view = framed(lex, situation.clause, situation.answer)
  const kind = state.stop === 'night' ? { icon: Moon, name: { zh: '改稿', en: 'Revising' } } : STOP[state.stop]
  const Icon = kind.icon
  useEffect(() => {
    const onKey = (e) => {
      const held = heldOf(state)
      if (!feedback && /^[1-9]$/.test(e.key) && held[Number(e.key) - 1]) onAnswer(held[Number(e.key) - 1])
      else if (feedback && !feedback.right && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onNext() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  const picked = feedback?.c === focus ? feedback.phrasing : comment.picked
  return (
    <section className="sx-run-card">
      <div className="sx-run-head">
        <h3 className="sx-run-title"><Icon size={16} />{L(kind.name)}</h3>
        <div className="sx-run-dots">
          {state.comments.map((x, k) => (
            <button key={k} type="button" className={`sx-run-dot ${k === focus ? 'is-on' : ''} ${x.picked ? 'is-done' : ''}`} disabled={Boolean(x.picked) || Boolean(feedback)} onClick={() => setFocus(k)} aria-label={tr(`第 ${k + 1} 条`, `Comment ${k + 1}`)} />
          ))}
          <span className="sx-run-weight">{comment.weight ? tr(`说错 −${comment.weight}`, `wrong −${comment.weight}`) : tr('说错不扣', 'free to miss')}</span>
        </div>
      </div>
      <p className="sx-drill-context" dangerouslySetInnerHTML={{ __html: L(situation.context) }} />
      <p className="sx-drill-sentence">
        {view.before && <span>{view.before} </span>}
        <span className={`sx-drill-gap ${picked ? (picked === situation.answer ? 'is-right' : 'is-wrong') : ''}`}>{picked ? phrased(lex, situation.clause, situation.answer) : '______'}</span>
        <span>{view.after === '.' ? '.' : ` ${view.after}`}</span>
      </p>
      <div className="sx-drill-options">
        {heldOf(state).map((p, k) => (
          <button key={p} type="button" className={`sx-drill-option ${picked && p === situation.answer ? 'is-right' : ''} ${picked === p && p !== situation.answer ? 'is-wrong' : ''}`} disabled={Boolean(picked)} onClick={() => onAnswer(p)}>
            {!phone && <kbd>{k + 1}</kbd>}{phrased(lex, situation.clause, p)}
          </button>
        ))}
      </div>
      {feedback && !feedback.right && feedback.c === focus && (
        <div className="sx-drill-why" role="status">
          <p dangerouslySetInnerHTML={{ __html: L(reason(situation, feedback.phrasing)) }} />
          <p className="sx-drill-behind">{tr('这里：', 'Here: ')}{L(timeWords(situation.answer))}</p>
          <button type="button" className="sx-drill-next" onClick={onNext}>{tr('继续', 'Go on')}{!phone && <kbd>Enter</kbd>}</button>
        </div>
      )}
    </section>
  )
}
