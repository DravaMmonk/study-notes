import { useState } from 'react'
import { ArrowRight, Check, X } from 'lucide-react'
import { PHONE, useMedia } from '../useMedia.js'
import { Stages } from './WaveKit.jsx'
import './waves.css'
import './train.css'

const LABELS = { s: '步幅 s（每次挪几格）', p: '补边 p（图外补几圈）' }

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
              <p className="sw-formula">输出边长 = ⌊({m.n} + 2×{g.p} − {g.k}) / {g.s}⌋ + 1 = <b>{size}</b><small>目标 {st.target}</small></p>
            </>
          ) : (
            <Params m={m} solved={passed[stage]} />
          )}
        </section>
        <div className="bk-stack">
          <section className="bk-panel bk-stack">
            <div>
              <span className="bk-label">第 {stage + 1} 步 · {st.title}</span>
              <p className="wv-stage-note">{st.note}</p>
            </div>
            {st.target ? (
              <>
                <p className="bk-caption">窗口 k = {g.k}×{g.k}（这两步固定）</p>
                {['s', 'p'].map((key) => (
                  <div key={key} className="sw-control">
                    <span className="bk-label">{LABELS[key]}</span>
                    <div className="bk-seg" role="radiogroup" aria-label={LABELS[key]}>
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
                  <span>参数个数</span>
                  <input type="number" inputMode="numeric" value={answer} onChange={(event) => { setAnswer(event.target.value); setChecked(null) }} aria-label="这一层的参数个数" />
                  <button className="bk-btn is-primary" type="submit">核对</button>
                </label>
                {checked === false && <p className="bk-verdict is-fail"><X size={15} />不对。每个滤波器要覆盖几个数？别忘了偏置。</p>}
              </form>
            )}
            <div className="wv-next">
              <p className={`bk-verdict ${match ? 'is-pass' : ''}`} aria-live="polite">{match ? <><Check size={15} />{st.target ? `输出正好 ${st.target}×${st.target}。` : `对，${m.conv} 个。`}</> : st.target ? `现在输出 ${size}×${size}。` : '算好后点核对。'}</p>
              {passed[stage] && stage < m.stages.length - 1 && <button className="bk-btn is-primary" onClick={() => { go(stage + 1); setReached(Math.max(reached, stage + 1)) }}>下一步 <ArrowRight size={15} /></button>}
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
        <span className="bk-label">输入 {n}×{n}{p ? `，四周各补 ${p} 圈 0` : ''}</span>
        <svg viewBox={`-2 -2 ${full * cell + 4} ${full * cell + 4}`} style={{ width: full * cell + 4 }} role="img" aria-label="输入和窗口">
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
        <span className="bk-label">输出 {out}×{out} · 点一格看它来自哪里</span>
        <svg viewBox={`-2 -2 ${out * ocell + 4} ${out * ocell + 4}`} style={{ width: out * ocell + 4 }} role="img" aria-label="输出">
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
            <span className="bk-label">滤波器 {f + 1}</span>
            <div className="sw-cube">
              {['R', 'G', 'B'].map((c) => (
                <div key={c} className={`sw-slice is-${c}`}>
                  {Array.from({ length: 9 }, (_, i) => <i key={i} />)}
                </div>
              ))}
            </div>
            <span className="sw-bias">+ 偏置</span>
          </div>
        ))}
      </div>
      <p className="bk-caption">输入：8×8×3（红、绿、蓝三个通道）· 输出：8×8×4（每个滤波器一张图）</p>
      {solved && (
        <div className="bk-stats">
          <div className="bk-stat is-pass"><b>{m.conv}</b><span>卷积层：4 × (3×3×3) + 4</span></div>
          <div className="bk-stat"><b>{m.dense.toLocaleString('en-US')}</b><span>全连接做同样的事：(8×8×3) × (8×8×4) + 256</span></div>
        </div>
      )}
    </div>
  )
}
