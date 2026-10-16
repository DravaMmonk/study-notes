import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { PHONE, useMedia } from '../../../../../games/kit/shell/useMedia.js'
import { useTween } from './optics-motion.js'
import './optics.css'
import { L, tr } from '../../../../../games/kit/shell/i18n.js'

// 7-3 测距: a robot's stereo rig seen from above (sideways distances drawn 4× wider than depth so the
// baseline is visible; straight lines stay straight, so the triangulation picture is still true).
// Each obstacle shows its ±1 px depth error bar against its required band; the strips show where it
// lands in the left and right images and the 64 px window the matcher searches.

const SX = 240 // svg units per metre sideways
const SZ = 62 // svg units per metre of depth
const STRIP = 400 // svg width of a 640 px image strip

export default function OpticsRange({ level, onSolve }) {
  const m = level.model
  const phone = useMedia(PHONE)
  const fs = phone ? 17 : 11 // scene label size in viewBox units (≥ 11 px on screen)
  const sfs = phone ? 16 : 13 // strip label size
  const [rig, setRig] = useState(m.START)
  const fired = useRef(false)
  const rows = m.TARGETS.map((t) => ({ t, r: m.measure(t, rig) }))
  const done = rows.every(({ r }) => r.ok)

  // The drawing eases between lenses and baselines; pass and fail read the real rig.
  const [tf, tb] = useTween([rig.f, rig.b])
  const shown = { f: tf, b: tb }
  const drawn = rows.map(({ t, r }) => ({ t, r, d: m.measure(t, shown) }))

  useEffect(() => {
    if (done && !fired.current) {
      fired.current = true
      onSolve()
    }
  }, [done, onSolve])

  const camL = (-tb / 2) * SX
  const camR = (tb / 2) * SX
  const px = (x) => (x / m.WIDTH) * STRIP
  const bIndex = m.BASELINES.findIndex((b) => Math.abs(b - rig.b) < 1e-6)
  const fill = `${(bIndex / (m.BASELINES.length - 1)) * 100}%`
  const span = (r) => `${r.near.toFixed(2)}–${Number.isFinite(r.far) ? r.far.toFixed(2) : '∞'} m`

  return (
    <div className="bk optics optics-range">
      <div className="bk-split">
        <figure className="bk-stage optics-figure">
          <svg className="optics-range-scene" viewBox="-270 -460 540 513" style={{ '--fs': `${fs}px` }} role="img" aria-label={tr('俯视图：机器人和三个障碍物', 'Top view: the robot and three obstacles')}>
            {[1, 2, 3, 4, 5, 6, 7].map((z) => (
              <g key={z}>
                <line className="optics-grid" x1={-262} y1={-z * SZ} x2={262} y2={-z * SZ} />
                <text className="optics-tag is-start" x={-262} y={-z * SZ - 4}>{z} m</text>
              </g>
            ))}
            {drawn.map(({ t, r, d }) => {
              const x = t.X * SX
              const y = -t.z * SZ
              const matched = d.inView && d.inRange
              return (
                <g key={t.key} className={`optics-target ${r.ok ? 'is-pass' : 'is-fail'}`}>
                  <line className="optics-ray" x1={camL} y1={0} x2={x} y2={y} />
                  <line className={`optics-ray ${matched ? '' : 'is-lost'}`} x1={camR} y1={0} x2={x} y2={y} />
                  <rect className="optics-band" x={x - 18} y={-(t.z + t.tol) * SZ} width={36} height={2 * t.tol * SZ} rx={3} />
                  {t.key === 'wall' ? (
                    <rect className="optics-object" x={x - 60} y={y - 4} width={120} height={8} rx={1.5} />
                  ) : t.key === 'door' ? (
                    <g className="optics-object"><rect x={x - 26} y={y - 5} width={8} height={10} rx={1.5} /><rect x={x + 18} y={y - 5} width={8} height={10} rx={1.5} /></g>
                  ) : (
                    <rect className="optics-object" x={x - 9} y={y - 9} width={18} height={18} rx={2} />
                  )}
                  {matched && (
                    <g className="optics-errorbar">
                      <line x1={x} y1={-Math.min(d.far, 7.2) * SZ} x2={x} y2={-d.near * SZ} />
                      <line x1={x - 7} y1={-d.near * SZ} x2={x + 7} y2={-d.near * SZ} />
                      {Number.isFinite(d.far) && d.far < 7.2 && <line x1={x - 7} y1={-d.far * SZ} x2={x + 7} y2={-d.far * SZ} />}
                    </g>
                  )}
                  <text className="optics-target-label" x={x + (t.key === 'wall' ? 68 : 32)} y={y + fs * 0.35}>{L(t.label)}{r.why ? ` · ${L(r.why)}` : ''}</text>
                </g>
              )
            })}
            <rect className="optics-robot" x={-70} y={6} width={140} height={22} rx={6} />
            <circle className="optics-camera" cx={camL} cy={0} r={6} />
            <circle className="optics-camera" cx={camR} cy={0} r={6} />
            <text className="optics-tag" x={0} y={28 + fs * 1.4}>b = {rig.b.toFixed(2)} m</text>
          </svg>
          <figcaption className="bk-caption">{tr('俯视；横向放大 4 倍。竖条 = 视差差 1 px 时的深度范围，色块 = 要求', 'Top view; sideways stretched 4×. Bar = depth range for a 1 px disparity error, shaded band = requirement')}</figcaption>
        </figure>

        <div className="bk-stack">
          <section className="bk-panel bk-stack">
            <div>
              <span className="bk-label">{tr('镜头 f', 'Lens f')}</span>
              <div className="bk-seg optics-focals" role="radiogroup" aria-label={tr('镜头焦距', 'Lens focal length')}>
                {m.FOCALS.map((f) => (
                  <button key={f} role="radio" aria-checked={rig.f === f} className={rig.f === f ? 'is-active' : ''} onClick={() => setRig((r) => ({ ...r, f }))}>
                    {f} px
                  </button>
                ))}
              </div>
            </div>
            <label className="bk-field">
              <span>{tr('基线 b', 'Baseline b')}</span>
              <input className="bk-range" type="range" min={0} max={m.BASELINES.length - 1} step={1} value={bIndex} style={{ '--fill': fill }} aria-valuetext={`${rig.b.toFixed(2)} m`} onChange={(event) => setRig((r) => ({ ...r, b: m.BASELINES[Number(event.target.value)] }))} />
              <output>{rig.b.toFixed(2)} m</output>
            </label>
            <p className="bk-caption optics-readout">f·b = {(rig.f * rig.b).toFixed(0)} px·m</p>
          </section>

          <ul className="bk-goals optics-goals" aria-live="polite">
            {rows.map(({ t, r }) => (
              <li key={t.key} className={`bk-goal ${r.ok ? 'is-pass' : ''}`}>
                {r.ok ? <Check size={16} /> : <X size={16} />}
                <span>{L(t.label)} · {t.z} m <small>{tr('视差', 'disparity')} {r.d.toFixed(1)} px{r.inRange ? '' : ` > ${m.D_MAX}`} · {tr('需', 'need')} ± {t.tol} m</small></span>
                <b className={r.ok ? '' : 'is-fail'}>{r.inView && r.inRange ? span(r) : L(r.why)}</b>
              </li>
            ))}
          </ul>

          <figure className="bk-panel optics-strips-panel">
            <svg className="optics-strips" viewBox={`${-STRIP / 2 - sfs * 2.6} ${-sfs * 1.5} ${STRIP + sfs * 2.6 + 6} ${100 + sfs * 1.5}`} style={{ '--fs': `${sfs}px` }} role="img" aria-label={tr('左图和右图里障碍物的位置', 'Where the obstacles land in the left and right images')}>
              <text className="optics-tag is-end" x={-STRIP / 2 - 6} y={12 + sfs * 0.35}>{tr('左图', 'Left')}</text>
              <text className="optics-tag is-end" x={-STRIP / 2 - 6} y={82 + sfs * 0.35}>{tr('右图', 'Right')}</text>
              <rect className="optics-strip" x={-STRIP / 2} y={0} width={STRIP} height={24} rx={3} />
              <rect className="optics-strip" x={-STRIP / 2} y={70} width={STRIP} height={24} rx={3} />
              {drawn.map(({ t, r, d }) => {
                const xl = Math.max(-STRIP / 2, Math.min(STRIP / 2, px(d.xl)))
                const xr = px(d.xr)
                const lo = Math.max(-STRIP / 2, px(d.xl - m.D_MAX))
                return (
                  <g key={t.key} className={`optics-target ${r.ok ? 'is-pass' : 'is-fail'}`}>
                    <rect className={`optics-search ${r.inView && r.inRange ? '' : 'is-miss'}`} x={lo} y={70} width={Math.max(0, xl - lo)} height={24} />
                    {Math.abs(xr) <= STRIP / 2 && <line className="optics-link" x1={xl} y1={24} x2={xr} y2={70} />}
                    <line className="optics-mark" x1={xl} y1={0} x2={xl} y2={24} />
                    {Math.abs(xr) <= STRIP / 2 && <line className="optics-mark" x1={xr} y1={70} x2={xr} y2={94} />}
                    <text className="optics-mark-label" x={xl} y={-6}>{L(t.label)}</text>
                  </g>
                )
              })}
            </svg>
            <figcaption className="bk-caption">{tr(`阴影 = 匹配器在右图里搜索的 ${m.D_MAX} px`, `Shading = the ${m.D_MAX} px the matcher searches in the right image`)}</figcaption>
          </figure>
        </div>
      </div>
    </div>
  )
}
