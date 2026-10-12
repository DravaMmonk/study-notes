import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import './optics.css'

// 7-3 测距: a robot's stereo rig seen from above (sideways distances drawn 4× wider than depth so the
// baseline is visible; straight lines stay straight, so the triangulation picture is still true).
// Each obstacle shows its ±1 px depth error bar against its required band; the strips show where it
// lands in the left and right images and the 64 px window the matcher searches.

const SX = 240 // svg units per metre sideways
const SZ = 62 // svg units per metre of depth
const STRIP = 560 // svg width of a 640 px image strip

export default function OpticsRange({ level, onSolve }) {
  const m = level.model
  const [rig, setRig] = useState(m.START)
  const fired = useRef(false)
  const rows = m.TARGETS.map((t) => ({ t, r: m.measure(t, rig) }))
  const done = rows.every(({ r }) => r.ok)

  useEffect(() => {
    if (done && !fired.current) {
      fired.current = true
      onSolve()
    }
  }, [done, onSolve])

  const camL = (-rig.b / 2) * SX
  const camR = (rig.b / 2) * SX
  const px = (x) => (x / m.WIDTH) * STRIP
  const bIndex = m.BASELINES.findIndex((b) => Math.abs(b - rig.b) < 1e-6)

  return (
    <div className="optics optics-range">
      <svg className="optics-stage optics-range-scene" viewBox="-270 -455 540 500" role="img" aria-label="俯视图：机器人和三个障碍物">
        {[1, 2, 3, 4, 5, 6, 7].map((z) => (
          <g key={z}>
            <line className="optics-grid" x1={-260} y1={-z * SZ} x2={260} y2={-z * SZ} />
            <text className="optics-tick-label" x={-262} y={-z * SZ - 3}>{z} m</text>
          </g>
        ))}
        {rows.map(({ t, r }) => {
          const x = t.X * SX
          const y = -t.z * SZ
          const matched = r.inView && r.inRange
          return (
            <g key={t.key} className={`optics-target ${r.ok ? 'is-ok' : 'is-bad'}`}>
              <line className="optics-ray" x1={camL} y1={0} x2={x} y2={y} />
              <line className={`optics-ray ${matched ? '' : 'is-lost'}`} x1={camR} y1={0} x2={x} y2={y} />
              <rect className="optics-band" x={x - 16} y={-(t.z + t.tol) * SZ} width={32} height={2 * t.tol * SZ} />
              {t.key === 'wall' ? (
                <rect className="optics-object" x={x - 60} y={y - 4} width={120} height={8} />
              ) : t.key === 'door' ? (
                <g className="optics-object"><rect x={x - 26} y={y - 5} width={8} height={10} /><rect x={x + 18} y={y - 5} width={8} height={10} /></g>
              ) : (
                <rect className="optics-object" x={x - 9} y={y - 9} width={18} height={18} />
              )}
              {matched && (
                <g className="optics-errorbar">
                  <line x1={x} y1={-Math.min(r.far, 7.2) * SZ} x2={x} y2={-r.near * SZ} />
                  <line x1={x - 7} y1={-r.near * SZ} x2={x + 7} y2={-r.near * SZ} />
                  {Number.isFinite(r.far) && r.far < 7.2 && <line x1={x - 7} y1={-r.far * SZ} x2={x + 7} y2={-r.far * SZ} />}
                </g>
              )}
              <text className="optics-target-label" x={x + (t.key === 'wall' ? 68 : 30)} y={y + 4}>{t.label}{r.why ? ` · ${r.why}` : ''}</text>
            </g>
          )
        })}
        <rect className="optics-robot" x={-70} y={4} width={140} height={22} rx={3} />
        <circle className="optics-camera" cx={camL} cy={0} r={6} />
        <circle className="optics-camera" cx={camR} cy={0} r={6} />
        <text className="optics-dim-label" x={0} y={40}>b = {rig.b.toFixed(2)} m</text>
      </svg>

      <div className="optics-side">
        <svg className="optics-strips" viewBox={`${-STRIP / 2 - 40} -22 ${STRIP + 60} 146`} role="img" aria-label="左图和右图里障碍物的位置">
          <text className="optics-strip-label" x={-STRIP / 2 - 36} y={17}>左图</text>
          <text className="optics-strip-label" x={-STRIP / 2 - 36} y={87}>右图</text>
          <rect className="optics-strip" x={-STRIP / 2} y={0} width={STRIP} height={24} />
          <rect className="optics-strip" x={-STRIP / 2} y={70} width={STRIP} height={24} />
          {rows.map(({ t, r }) => {
            const xl = Math.max(-STRIP / 2, Math.min(STRIP / 2, px(r.xl)))
            const xr = px(r.xr)
            const lo = Math.max(-STRIP / 2, px(r.xl - m.D_MAX))
            return (
              <g key={t.key} className={`optics-target ${r.ok ? 'is-ok' : 'is-bad'}`}>
                <rect className={`optics-search ${r.inView && r.inRange ? '' : 'is-miss'}`} x={lo} y={70} width={Math.max(0, xl - lo)} height={24} />
                {Math.abs(xr) <= STRIP / 2 && <line className="optics-link" x1={xl} y1={24} x2={xr} y2={70} />}
                <line className="optics-mark" x1={xl} y1={0} x2={xl} y2={24} />
                {Math.abs(xr) <= STRIP / 2 && <line className="optics-mark" x1={xr} y1={70} x2={xr} y2={94} />}
                <text className="optics-mark-label" x={xl} y={-5}>{t.label}</text>
              </g>
            )
          })}
          <text className="optics-strip-label" x={-STRIP / 2} y={114}>阴影 = 匹配器在右图里搜索的 {m.D_MAX} px</text>
        </svg>

        <div className="optics-controls">
          <div>
            <h3 className="panel-label">镜头 f</h3>
            <div className="optics-holes" role="radiogroup" aria-label="镜头焦距">
              {m.FOCALS.map((f) => (
                <button key={f} role="radio" aria-checked={rig.f === f} className={rig.f === f ? 'is-active' : ''} onClick={() => setRig((r) => ({ ...r, f }))}>
                  <span>{f} px</span>
                </button>
              ))}
            </div>
          </div>
          <label className="optics-slider">
            <span>基线 b</span>
            <input type="range" min={0} max={m.BASELINES.length - 1} step={1} value={bIndex} aria-valuetext={`${rig.b.toFixed(2)} m`} onChange={(event) => setRig((r) => ({ ...r, b: m.BASELINES[Number(event.target.value)] }))} />
            <b>{rig.b.toFixed(2)} m</b>
          </label>
          <p className="optics-readout">f·b = {(rig.f * rig.b).toFixed(0)} px·m</p>
        </div>

        <table className="optics-table-readout">
          <thead>
            <tr><th /><th>距离</th><th>视差 d</th><th>差 1 px 时</th><th>要求</th></tr>
          </thead>
          <tbody>
            {rows.map(({ t, r }) => (
              <tr key={t.key} className={r.ok ? 'is-ok' : 'is-bad'}>
                <th>{r.ok ? <Check size={13} /> : <X size={13} />} {t.label}</th>
                <td>{t.z} m</td>
                <td>{r.d.toFixed(1)} px{r.inRange ? '' : ` > ${m.D_MAX}`}</td>
                <td>{r.inView && r.inRange ? `${r.near.toFixed(2)}–${Number.isFinite(r.far) ? r.far.toFixed(2) : '∞'} m` : r.why}</td>
                <td>± {t.tol} m</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
