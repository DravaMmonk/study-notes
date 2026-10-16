import { useState } from 'react'
import { ArrowRight, Check, X } from 'lucide-react'
import { L, tr } from '../../../../../games/kit/shell/i18n.js'
import { PHONE, useMedia } from '../../../../../games/kit/shell/useMedia.js'
import { Stages } from './WaveKit.jsx'
import './waves.css'
import './train.css'

const LABELS = { s: { zh: '步幅 s（每次挪几格）', en: 'Stride s (cells per move)' }, p: { zh: '补边 p（图外补几圈）', en: 'Padding p (rings around the image)' } }

// 4-5 滑窗: the input with its padding, every place the window stops, and the output those stops
// make. Pick an output pixel to see which window produced it. The last step counts the weights.
export default function SlideWindow({ level, onSolve }) {
  const m = level.window
  const phone = useMedia(PHONE)
  const [g, setG] = useState(m.start)
  const [pick, setPick] = useState([0, 0])
  const [answer, setAnswer] = useState('')
  const [checked, setChecked] = useState(null)
  const [stage, setStage] = useState(0)
  const [passed, setPassed] = useState(() => m.stages.map(() => false))
  const [reached, setReached] = useState(0)
  const st = m.stages[stage]
  const size = m.size(g)

  const mark = () => {
    if (passed[stage]) return
    const now = passed.map((done, i) => done || i === stage)
    setPassed(now)
    if (now.every(Boolean)) onSolve()
  }
  const set = (key, value) => {
    const next = { ...g, [key]: value }
    setG(next)
    setPick([0, 0])
    if (st.target && m.size(next) === st.target) mark()
  }
  const submit = () => {
    const ok = Number(answer) === m.conv
    setChecked(ok)
    if (ok) mark()
  }
  const go = (index) => setStage(index)
  const match = st.target ? size === st.target : checked === true

  return (
    <div className="bk wv sw">
      <div className="bk-split">
        <section className="bk-stage bk-stack">
          {st.target ? (
            <>
              <Slide n={m.n} g={g} pick={pick} onPick={setPick} phone={phone} />
              <p className="sw-formula">{tr('输出边长', 'Output side')} = ⌊({m.n} + 2×{g.p} − {g.k}) / {g.s}⌋ + 1 = <b>{size}</b><small>{tr(`目标 ${st.target}`, `target ${st.target}`)}</small></p>
            </>
          ) : (
            <Params m={m} solved={passed[stage]} />
          )}
        </section>
        <div className="bk-stack">
          <section className="bk-panel bk-stack">
            <div>
              <span className="bk-label">{tr(`第 ${stage + 1} 步`, `Step ${stage + 1}`)} · {L(st.title)}</span>
              <p className="wv-stage-note">{L(st.note)}</p>
            </div>
            {st.target ? (
              <>
                <p className="bk-caption">{tr(`窗口 k = ${g.k}×${g.k}（这两步固定）`, `Window k = ${g.k}×${g.k} (fixed for these two steps)`)}</p>
                {['s', 'p'].map((key) => (
                  <div key={key} className="sw-control">
                    <span className="bk-label">{L(LABELS[key])}</span>
                    <div className="bk-seg" role="radiogroup" aria-label={L(LABELS[key])}>
                      {m.options[key].map((v) => (
                        <button key={v} role="radio" aria-checked={g[key] === v} aria-pressed={g[key] === v} onClick={() => set(key, v)}>{v}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <form className="sw-answer" onSubmit={(event) => { event.preventDefault(); submit() }}>
                <label className="bk-field">
                  <span>{tr('参数个数', 'Parameter count')}</span>
                  <input type="number" inputMode="numeric" value={answer} onChange={(event) => { setAnswer(event.target.value); setChecked(null) }} aria-label={tr('这一层的参数个数', 'Number of parameters in this layer')} />
                  <button className="bk-btn is-primary" type="submit">{tr('核对', 'Check')}</button>
                </label>
                {checked === false && <p className="bk-verdict is-fail"><X size={15} />{tr('不对。每个滤波器要覆盖几个数？别忘了偏置。', 'Not right. How many numbers does each filter cover? Do not forget the bias.')}</p>}
              </form>
            )}
            <div className="wv-next">
              <p className={`bk-verdict ${match ? 'is-pass' : ''}`} aria-live="polite">{match ? <><Check size={15} />{st.target ? tr(`输出正好 ${st.target}×${st.target}。`, `The output is exactly ${st.target}×${st.target}.`) : tr(`对，${m.conv} 个。`, `Right: ${m.conv}.`)}</> : st.target ? tr(`现在输出 ${size}×${size}。`, `The output is now ${size}×${size}.`) : tr('算好后点核对。', 'Work it out, then press Check.')}</p>
              {passed[stage] && stage < m.stages.length - 1 && <button className="bk-btn is-primary" onClick={() => { go(stage + 1); setReached(Math.max(reached, stage + 1)) }}>{tr('下一步', 'Next step')} <ArrowRight size={15} /></button>}
            </div>
          </section>
          <Stages stages={m.stages} current={stage} passed={passed} reached={reached} onPick={go} />
        </div>
      </div>
    </div>
  )
}

// The padded input (padding hatched), a dot at every window stop, the chosen window framed, and the
// output grid beside it; choosing an output cell moves the frame to its window.
function Slide({ n, g, pick, onPick, phone }) {
  const { k, s, p } = g
  const full = n + 2 * p
  const out = Math.floor((n + 2 * p - k) / s) + 1
  const cell = phone ? Math.min(30, 300 / full) : Math.min(34, 330 / full)
  const ocell = phone ? Math.min(30, 150 / Math.max(out, 1)) : Math.min(34, 200 / Math.max(out, 1))
  const [ox, oy] = [Math.min(pick[0], out - 1), Math.min(pick[1], out - 1)]
  const inside = (i) => i >= p && i < p + n
  return (
    <div className="sw-slide">
      <figure>
        <span className="bk-label">{tr(`输入 ${n}×${n}`, `Input ${n}×${n}`)}{p ? tr(`，四周各补 ${p} 圈 0`, `, padded all round with ${p} ${p === 1 ? 'ring' : 'rings'} of 0`) : ''}</span>
        <svg viewBox={`-2 -2 ${full * cell + 4} ${full * cell + 4}`} style={{ width: full * cell + 4 }} role="img" aria-label={tr('输入和窗口', 'Input and window')}>
          {Array.from({ length: full * full }, (_, idx) => {
            const [i, j] = [idx % full, Math.floor(idx / full)]
            const pad = !inside(i) || !inside(j)
            return <rect key={idx} className={`sw-cell ${pad ? 'is-pad' : (i + j) % 2 ? 'is-a' : 'is-b'}`} x={i * cell} y={j * cell} width={cell} height={cell} />
          })}
          {Array.from({ length: out * out }, (_, idx) => {
            const [a, b] = [idx % out, Math.floor(idx / out)]
            return <circle key={idx} className="sw-stop" cx={(a * s + k / 2) * cell} cy={(b * s + k / 2) * cell} r={Math.max(2, cell * 0.12)} />
          })}
          <rect className="sw-window" x={ox * s * cell} y={oy * s * cell} width={k * cell} height={k * cell} rx={3} />
        </svg>
      </figure>
      <figure>
        <span className="bk-label">{tr(`输出 ${out}×${out} · 点一格看它来自哪里`, `Output ${out}×${out} · pick a cell to see where it comes from`)}</span>
        <svg viewBox={`-2 -2 ${out * ocell + 4} ${out * ocell + 4}`} style={{ width: out * ocell + 4 }} role="img" aria-label={tr('输出', 'Output')}>
          {Array.from({ length: out * out }, (_, idx) => {
            const [a, b] = [idx % out, Math.floor(idx / out)]
            const on = a === ox && b === oy
            return <rect key={idx} className={`sw-out ${on ? 'is-on' : ''}`} x={a * ocell} y={b * ocell} width={ocell} height={ocell} onClick={() => onPick([a, b])} onPointerEnter={(event) => event.pointerType === 'mouse' && onPick([a, b])} />
          })}
        </svg>
      </figure>
    </div>
  )
}

// The weight count, laid out as the four filters it is made of.
function Params({ m, solved }) {
  return (
    <div className="sw-params">
      <div className="sw-filters">
        {Array.from({ length: 4 }, (_, f) => (
          <div key={f} className="sw-filter">
            <span className="bk-label">{tr(`滤波器 ${f + 1}`, `Filter ${f + 1}`)}</span>
            <div className="sw-cube">
              {['R', 'G', 'B'].map((c) => (
                <div key={c} className={`sw-slice is-${c}`}>
                  {Array.from({ length: 9 }, (_, i) => <i key={i} />)}
                </div>
              ))}
            </div>
            <span className="sw-bias">{tr('+ 偏置', '+ bias')}</span>
          </div>
        ))}
      </div>
      <p className="bk-caption">{tr('输入：8×8×3（红、绿、蓝三个通道）· 输出：8×8×4（每个滤波器一张图）', 'Input: 8×8×3 (three channels: red, green and blue) · Output: 8×8×4 (one map per filter)')}</p>
      {solved && (
        <div className="bk-stats">
          <div className="bk-stat is-pass"><b>{m.conv}</b><span>{tr('卷积层：4 × (3×3×3) + 4', 'Conv layer: 4 × (3×3×3) + 4')}</span></div>
          <div className="bk-stat"><b>{m.dense.toLocaleString('en-US')}</b><span>{tr('全连接做同样的事：(8×8×3) × (8×8×4) + 256', 'Fully connected, doing the same job: (8×8×3) × (8×8×4) + 256')}</span></div>
        </div>
      )}
    </div>
  )
}
