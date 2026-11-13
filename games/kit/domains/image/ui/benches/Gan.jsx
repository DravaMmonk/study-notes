import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useMedia } from '../../../../shell/useMedia.js'
import { L, tr } from '../../../../shell/i18n.js'
import './gan.css'

// The GAN duel's chart (bench model `gan`): one x axis (the data value, −4…4) for the histograms of real and generated
// samples, the judge's D(x) under them, and the pens' history under that, newest turn at the top, so a pen's trace
// starts where it stands in the histogram. The drawing eases from one turn to the next.

const BINS = 32
const TRACE = 60
const REDUCED = '(prefers-reduced-motion: reduce)'
const lerp = (from, to, e) => to.map((b, i) => (from[i] ?? b) + (b - (from[i] ?? b)) * e)

// Animate numbers towards their target (ease-out); reduced motion shows the target at once.
function useEased(target, ms) {
  const reduced = useMedia(REDUCED)
  const [shown, setShown] = useState(target)
  const last = useRef(target)
  useEffect(() => {
    if (reduced) {
      last.current = target
      return undefined
    }
    const from = last.current
    const start = performance.now()
    let frame = 0
    const tick = (now) => {
      const k = Math.min(1, (now - start) / ms)
      const value = lerp(from, target, 1 - (1 - k) ** 3)
      last.current = value
      setShown(value)
      if (k < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, reduced, ms])
  return reduced ? target : shown
}

// The rendered width of an element, so the chart's viewBox is drawn 1:1 and its text stays legible.
function useWidth(fallback) {
  const [node, setNode] = useState(null)
  const [width, setWidth] = useState(fallback)
  useLayoutEffect(() => {
    if (!node) return undefined
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))))
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])
  return [setNode, width]
}

export function GanChart({ ctx }) {
  const m = ctx.model
  const { state } = ctx.view
  const { phone } = ctx
  const [frame, width] = useWidth(600)

  // The drawing eases between turns; the readouts always show the true state.
  const target = useMemo(() => [...state.pens, ...state.w], [state])
  const eased = useEased(target, 200)
  const pens = eased.slice(0, 2)
  const w = eased.slice(2)

  const real = useMemo(() => m.histogram(m.REAL, BINS), [m])
  const fake = m.histogram(m.fakes(pens), BINS)

  // Geometry, in screen pixels.
  const X0 = 30
  const X1 = width - 14
  const px = (x) => X0 + ((Math.max(-4, Math.min(4, x)) + 4) / 8) * (X1 - X0)
  const binW = (X1 - X0) / BINS
  const HT = 30 // histogram top
  const HH = phone ? 118 : 190
  const HB = HT + HH // histogram base
  const DT = HB + 36 // D(x) band
  const DH = phone ? 58 : 90
  const TT = DT + DH + 32 // pen trace
  const TH = phone ? 100 : 180
  const H = TT + TH + 8
  const scale = (HH - 6) / 0.3 // a whole collapsed hump still fits
  const bar = (h) => Math.min(h * scale, HH - 2)
  const dY = (p) => DT + DH - p * DH
  const curve = Array.from({ length: 161 }, (_, i) => -4 + i * 0.05).map((x) => `${px(x).toFixed(1)},${dY(m.D(w, x)).toFixed(1)}`)
  const history = state.history.slice(-TRACE).reverse()
  const traceY = (i) => TT + (i / (TRACE - 1)) * TH
  const ticks = phone ? [-4, -2, 0, 2, 4] : [-4, -3, -2, -1, 0, 1, 2, 3, 4]

  return (
    <div className="gan-stage">
      <div className="gan-head">
        <span className="gan-key"><i className="is-real" />{tr('真实数据')}</span>
        <span className="gan-key"><i className="is-fake" />{tr('生成样本')}</span>
        <span className="gan-key"><i className="is-pen0" />{tr('笔 1')}</span>
        <span className="gan-key"><i className="is-pen1" />{tr('笔 2')}</span>
        <span className="bk-chip gan-turn">{L(ctx.view.round)}</span>
      </div>
      <div className="gan-frame" ref={frame}>
        <svg className="gan-chart" viewBox={`0 0 ${width} ${H}`} width={width} height={H} role="img" aria-label={tr('真实数据和生成样本的分布、鉴定员的判断 D(x)，以及两支笔随回合的位置')}>
          {/* histograms */}
          {real.map((h, i) => <rect key={`r${i}`} className="gan-real" x={X0 + i * binW + 1} y={HB - bar(h)} width={Math.max(1, binW - 2)} height={bar(h)} />)}
          {fake.map((h, i) => (h > 0 ? <rect key={`f${i}`} className="gan-fake" x={X0 + i * binW + 2.5} y={HB - bar(h)} width={Math.max(1, binW - 5)} height={bar(h)} /> : null))}
          <line className="gan-axis" x1={X0} x2={X1} y1={HB} y2={HB} />
          {ticks.map((x) => <text key={x} className="gan-tick" x={px(x)} y={HB + 24} textAnchor="middle">{x < 0 ? `−${-x}` : x}</text>)}

          {/* D(x) */}
          <rect className="gan-band" x={X0} y={DT} width={X1 - X0} height={DH} rx="4" />
          <line className="gan-half" x1={X0} x2={X1} y1={dY(0.5)} y2={dY(0.5)} />
          <text className="gan-tick" x={X0 - 6} y={DT + 4} textAnchor="end">1</text>
          <text className="gan-tick" x={X0 - 6} y={dY(0.5) + 4} textAnchor="end">.5</text>
          <text className="gan-tick" x={X0 - 6} y={DT + DH + 2} textAnchor="end">0</text>
          <polyline className="gan-dcurve" points={curve.join(' ')} />

          {/* pen history: newest turn at the top */}
          {[-2, 2].map((x) => <line key={x} className="gan-guide" x1={px(x)} x2={px(x)} y1={TT} y2={TT + TH} />)}
          {[0, 1].map((k) => <polyline key={k} className={`gan-trace is-${k}`} points={history.map((p, i) => `${px(p[k]).toFixed(1)},${traceY(i).toFixed(1)}`).join(' ')} />)}

          {/* the pens: one line through all three panels */}
          {pens.map((p, k) => (
            <g key={k} className={`gan-pen is-${k}`}>
              <line className="gan-pen-line" x1={px(p)} x2={px(p)} y1={HT} y2={TT} />
              <path className="gan-pen-mark" d={`M${px(p)} ${HB + 1} l-5.5 9 h11 Z`} />
              <circle className="gan-pen-dot" cx={px(p)} cy={dY(m.D(w, p))} r="3.5" />
              <circle className="gan-pen-dot" cx={px(p)} cy={TT} r="3" />
            </g>
          ))}

          {/* titles last, on a paper halo, so the pen lines pass behind them */}
          <text className="gan-title is-on-band" x={X0 + 8} y={DT + 16}>{tr('鉴定员 D(x)：判断 x 为真实数据的置信度')}</text>
          <text className="gan-title" x={X0} y={TT - 10}>{tr(`两支笔的历史位置 ↓ 越往下越早（最近 ${TRACE} 回合）`, `Pen positions over time ↓ older further down (last ${TRACE} rounds)`)}</text>
        </svg>
      </div>
    </div>
  )
}
