import { tr } from '../../../../shell/i18n.js'
import { Rich } from '../../../../shell/bench/Rich.jsx'
import { startValues } from '../../../../engine/bench.js'
import { pinholeView } from '../../benches/pinhole.js'
import CameraScene, { CameraPhoto, FramingPhoto } from './CameraScene.jsx'

const n = (v) => Number(v.toFixed(2))
const shown = (ctx) => ctx.revealed !== false
const Terms = ({ params }) => params.terms?.length ? <div className="vi-instrument-terms">{params.terms.map((t, i) => <Rich key={i} text={t} />)}</div> : null

/** Fixed extents include every knob corner and the reference, never just the current trial. */
function extents(ctx) {
  const ranged = Object.entries(ctx.bench.knobs ?? {}).filter(([name, k]) => name !== 'guess' && !k.fixed && k.min !== undefined)
  const corners = ranged.reduce((all, [name, k]) => all.flatMap((c) => [{ ...c, [name]: k.min }, { ...c, [name]: k.max }]), [{}])
  const setup = ctx.model.setup
  const states = [...corners.map((v) => pinholeView(setup, { ...ctx.values, ...v })), ...(ctx.bench.stages ?? []).map((s) => pinholeView(setup, startValues(ctx.bench, s))), ...(setup.reference ? [pinholeView(setup, setup.reference)] : [])]
  const objects = (q) => setup.objects?.map((o) => [o.Z ?? q.Z, o.X - q.aim, o.X + o.H - q.aim]) ?? [[q.Z, setup.object === 'point' ? q.X : 0, setup.object === 'point' ? q.X : q.H]]
  return {
    depth: Math.max(...states.flatMap((q) => [q.f, ...objects(q).map(([z]) => z)])) * 1.14,
    height: Math.max(1, ...states.flatMap((q) => objects(q).flatMap(([z, a, b]) => [Math.abs(a), Math.abs(b), Math.abs(q.f * a / z), Math.abs(q.f * b / z)])), Math.abs((setup.target?.value ?? 0) * (setup.target?.of.endsWith('_px') ? states[0].pitch : 1)), setup.sensor ? (setup.axis === 'horizontal' ? setup.sensor.width : setup.sensor.height) / 2 : 0) * 1.3,
  }
}

export function PinholeRays({ ctx, params = {} }) {
  const { setup } = ctx.model
  const reference = setup.reference && pinholeView(setup, setup.reference)
  const bounds = extents(ctx)
  return <div className="vi-optics">
    <CameraScene setup={setup} q={ctx.q} bounds={bounds} revealed={shown(ctx)} />
    <div className="vp-camera-readings">
      <span>{setup.object === 'point' ? 'X' : 'H'} <b>{n(setup.object === 'point' ? ctx.q.X : ctx.q.H)}</b></span>
      <span>Z <b>{n(ctx.q.Z)}</b></span><span>f <b>{n(ctx.q.f)}</b></span>
    </div>
    {reference && <div className="vp-photo-pair">
      <CameraPhoto q={reference} setup={setup} reference />
      <CameraPhoto q={ctx.q} setup={setup} revealed={shown(ctx)} />
    </div>}
    {reference && <p className="vi-instrument-note">{tr('参照设置', 'Reference settings')}: H = {n(reference.H)} · Z = {n(reference.Z)} · f = {n(reference.f)}</p>}
    <Terms params={params} />
  </div>
}

/** Equal horizontal and vertical scales: the angle construction is independent of the side schematic. */
export function PinholeField({ ctx, params = {} }) {
  const { q, model } = ctx
  const { sensor } = model.setup
  const W = ctx.phone ? 340 : 520
  const H = 280
  const s = Math.min((W - 150) / (ctx.bench.knobs?.f?.max ?? q.f), 90 / (sensor.height / 2))
  const origin = 40
  const cy = 140
  const plane = origin + q.f * s
  const half = sensor.height / 2 * s
  const angle = Math.atan(sensor.height / 2 / q.f)
  const arc = (r, a, b) => `M ${origin + r * Math.cos(a)} ${cy + r * Math.sin(a)} A ${r} ${r} 0 0 1 ${origin + r * Math.cos(b)} ${cy + r * Math.sin(b)}`
  return <div className="vi-optics">
    <CameraScene setup={model.setup} q={q} bounds={extents(ctx)} revealed={shown(ctx)} />
    {model.setup.objects && <FramingPhoto setup={model.setup} q={q} revealed={shown(ctx)} />}
    <details className="vp-geometric-inset"><summary>{tr('查看等比例视场测量', 'Inspect the equal-scale field measurement')}</summary>
    <figure className="vi-instrument">
    <figcaption>{tr('竖直切面 · 等比例', 'Vertical slice · equal scales')}<span>{tr('毫米', 'mm')}</span></figcaption>
    <svg className="vi-bench" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={tr('全视场与半角的等比例构图', 'Equal-scale construction of full and half field of view')}>
      <path className="vp-view" d={`M ${origin} ${cy} L ${plane} ${cy - half} L ${plane} ${cy + half} Z`} />
      <line className="vb-axis" x1={origin} x2={W - 20} y1={cy} y2={cy} />
      <line className="vb-sensor" x1={plane} x2={plane} y1={cy - half} y2={cy + half} />
      <path className="vp-angle" d={arc(30, -angle, angle)} />
      <path className="vp-angle is-half" d={arc(48, -angle, 0)} />
      <circle className="vb-centre" cx={origin} cy={cy} r={4} />
      <text className="vb-note" x={origin} y={cy + 32}>O</text>
      <text className="vb-note is-left" x={plane + 10} y={cy - half - 8}>+{sensor.height / 2} mm</text>
      <text className="vb-note is-left" x={plane + 10} y={cy + half + 18}>−{sensor.height / 2} mm</text>
      <text className="vb-note" x={(origin + plane) / 2} y={H - 22}>f = {n(q.f)} mm</text>
    </svg>
    <p className="vi-instrument-note">{shown(ctx) ? tr(`全角 ${n(q.fov)}° · 半角 ${n(q.fov / 2)}°`, `Full angle ${n(q.fov)}° · half-angle ${n(q.fov / 2)}°`) : tr('弧线分别标出全角和上半角；检查后显示角度。', 'Arcs mark the full angle and upper half-angle; check to reveal degrees.')}</p>
    </figure></details>
    <Terms params={params} />
  </div>
}
