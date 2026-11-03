import { L, tr } from '../../../../shell/i18n.js'
import { Rich } from '../../../../shell/bench/Rich.jsx'
import { startValues } from '../../../../engine/bench.js'
import { pinholeView } from '../../benches/pinhole.js'

const n = (v) => Number(v.toFixed(2))
const shown = (ctx) => ctx.revealed !== false
const Terms = ({ params }) => params.terms?.length ? <div className="vi-instrument-terms">{params.terms.map((t, i) => <Rich key={i} text={t} />)}</div> : null

/** Fixed extents include every knob corner and the reference, never just the current trial. */
function extents(ctx) {
  const ranged = Object.entries(ctx.bench.knobs ?? {}).filter(([name, k]) => name !== 'guess' && !k.fixed && k.min !== undefined)
  const corners = ranged.reduce((all, [name, k]) => all.flatMap((c) => [{ ...c, [name]: k.min }, { ...c, [name]: k.max }]), [{}])
  const setup = ctx.model.setup
  const states = [...corners.map((v) => pinholeView(setup, { ...ctx.values, ...v })), ...(ctx.bench.stages ?? []).map((s) => pinholeView(setup, startValues(ctx.bench, s))), ...(setup.reference ? [pinholeView(setup, setup.reference)] : [])]
  const objects = (q) => setup.objects?.map((o) => [o.Z ?? q.Z, o.X, o.X + o.H]) ?? [[q.Z, setup.object === 'point' ? q.X : 0, setup.object === 'point' ? q.X : q.H]]
  return {
    depth: Math.max(...states.flatMap((q) => [q.f, ...objects(q).map(([z]) => z)])) * 1.14,
    height: Math.max(1, ...states.flatMap((q) => objects(q).flatMap(([z, a, b]) => [Math.abs(a), Math.abs(b), Math.abs(q.f * a / z), Math.abs(q.f * b / z)])), Math.abs((setup.target?.value ?? 0) * (setup.target?.of.endsWith('_px') ? states[0].pitch : 1)), setup.sensor ? (setup.axis === 'horizontal' ? setup.sensor.width : setup.sensor.height) / 2 : 0) * 1.3,
  }
}

function Scene({ ctx, q, reveal, reference = false, bounds }) {
  const { setup } = ctx.model
  const W = ctx.phone ? 340 : 380
  const H = 280
  const x = (z) => 32 + z / bounds.depth * (W - 65)
  const y = (v) => 135 - v / bounds.height * 85
  const dims = (a, b, at, label) => <g className="vp-dimension"><line x1={x(a)} x2={x(b)} y1={at} y2={at} /><text x={(x(a) + x(b)) / 2} y={at - 5}>{label}</text></g>
  const objects = setup.objects?.map((o) => ({ ...o, Z: o.Z ?? q.Z, a: o.X, b: o.X + o.H })) ?? [{ Z: q.Z, a: setup.object === 'point' ? q.X : 0, b: setup.object === 'point' ? q.X : q.H }]
  const sensorHalf = setup.sensor ? (setup.axis === 'horizontal' ? setup.sensor.width : setup.sensor.height) / 2 : null
  const target = setup.target && (setup.target.of.endsWith('_px') ? setup.target.value * q.pitch : setup.target.value)
  return <figure className={`vi-instrument ${reference ? 'is-reference' : ''}`}>
    <figcaption>{reference ? tr('固定参照', 'Reference · fixed') : tr('当前场景', 'Your scene')}<span>{!setup.unit || setup.unit === 'model units' ? tr('模型单位', 'model units') : setup.unit}</span></figcaption>
    <svg className="vi-bench vp-scene" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={reference ? tr('参照光路', 'Reference rays') : tr('当前光路', 'Trial rays')}>
      <line className="vb-axis" x1={x(0)} x2={W - 20} y1={y(0)} y2={y(0)} />
      <text className="vb-note" x={W - 55} y={y(0) + 18}>+Z</text>
      {!setup.objects && <g><line className="vb-axis" x1={x(0)} x2={x(0)} y1={y(0)} y2={58} /><text className="vb-note" x={x(0)} y={48}>{setup.object === 'point' ? '+X' : '+H'}</text></g>}
      <line className="vb-plane" x1={x(q.f)} x2={x(q.f)} y1={30} y2={210} />
      {sensorHalf !== null && <line className="vb-sensor" x1={x(q.f)} x2={x(q.f)} y1={y(sensorHalf)} y2={y(-sensorHalf)} />}
      <text className="vb-note" x={x(q.f)} y={22}>{tr('像平面', 'Image plane')}</text>
      {objects.map((o, i) => {
        const u = q.f * o.a / o.Z
        const h = q.f * o.b / o.Z
        const seen = (o.id ? q[`in_${o.id}`] : q.inView) !== 0
        return <g key={i} className={reveal && !seen ? 'vb-out' : undefined}>
          {reveal && [...new Set([o.a, o.b])].map((v) => <line className="vb-ray" key={v} x1={x(0)} x2={x(Math.max(o.Z, q.f))} y1={y(0)} y2={y(v * Math.max(o.Z, q.f) / o.Z)} />)}
          <line className="vp-dimension" x1={x(o.Z)} x2={x(o.Z)} y1={y(0)} y2={y(o.b)} />
          {o.a === o.b ? <circle className="vb-object" cx={x(o.Z)} cy={y(o.b)} r={5} /> : <line className="vb-object" x1={x(o.Z)} x2={x(o.Z)} y1={y(o.a)} y2={y(o.b)} />}
          {o.a !== o.b && <path className="vb-object" fill="none" d={`M ${x(o.Z) - 4} ${y(o.b) + (o.b > o.a ? 6 : -6)} L ${x(o.Z)} ${y(o.b)} L ${x(o.Z) + 4} ${y(o.b) + (o.b > o.a ? 6 : -6)}`} />}
          <text className="vb-note" x={Math.min(W - 55, x(o.Z))} y={y(o.b) - 12}>{o.label ? L(o.label) : `${setup.object === 'point' ? 'X' : 'H'} = ${n(o.b)}`}</text>
          {reveal && !seen && <text className="vb-note" x={x(o.Z)} y={y(o.a) + 22}>{tr('不在画面里', 'Out of view')}</text>}
          {reveal && <g className="vp-result"><line className="vb-image" x1={x(q.f)} x2={x(q.f)} y1={y(u)} y2={y(h)} /><circle className="vb-image" cx={x(q.f)} cy={y(h)} r={4} />
            <text className="vb-note" style={{ textAnchor: 'end' }} x={x(q.f) - 9} y={y(h) - 9}>{setup.object === 'point' ? 'u' : 'h'} = {n(setup.object === 'point' ? u : h - u)}</text></g>}
        </g>
      })}
      {target !== undefined && <circle className="vb-target" cx={x(q.f)} cy={y(target)} r={8} />}
      <circle className="vb-centre" cx={x(0)} cy={y(0)} r={5} />
      <text className="vb-note is-left" x={x(0)} y={y(0) + 35}>{tr('相机中心 O', 'Centre O')}</text>
      {dims(0, q.f, 226, `f = ${n(q.f)}`)}
      {!setup.objects && dims(0, q.Z, 258, `Z = ${n(q.Z)}`)}
      {!reveal && <text className="vb-note" x={W / 2} y={195}>{tr('先预测，再检查光路', 'Predict, then check the ray')}</text>}
    </svg>
    <p className="vi-instrument-note">{tr('侧视示意，纵横比例不同；数值共用同一长度单位。', 'Side-view schematic; unequal axis scales, one length unit.')}</p>
    <p className="vi-instrument-note">{setup.object === 'point' ? `X = ${n(q.X)}` : `H = ${n(q.H)}`} · Z = {n(q.Z)} · f = {n(q.f)}{reveal && ` · ${setup.object === 'point' ? 'u' : 'h'} = ${n(setup.object === 'point' ? q.u : q.h)}`}</p>
  </figure>
}

export function PinholeRays({ ctx, params = {} }) {
  const reference = ctx.model.setup.reference
  const bounds = extents(ctx)
  return <div className="vi-optics">
    <div className={`vi-optics-pair ${reference ? 'has-reference' : ''}`}>
      {reference && <Scene ctx={ctx} q={pinholeView(ctx.model.setup, reference)} reveal reference bounds={bounds} />}
      <Scene ctx={ctx} q={ctx.q} reveal={shown(ctx)} bounds={bounds} />
    </div>
    {shown(ctx) && ctx.model.setup.predict && <p className="vi-instrument-note" role="status">{tr(
      `你的预测 ${n(ctx.q.guess)} · 实测 ${n(ctx.q[ctx.model.setup.predict])}。对照固定参照，检查改变的是物点位置、深度还是像平面距离。`,
      `Your prediction ${n(ctx.q.guess)} · measured ${n(ctx.q[ctx.model.setup.predict])}. Compare with the fixed reference: did scene position, depth or plane distance change?`,
    )}</p>}
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
  return <figure className="vi-instrument">
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
    <Terms params={params} />
  </figure>
}

export function SensorCoordinates({ ctx, params = {} }) {
  const { q, model } = ctx
  const { sensor, predict } = model.setup
  const coordinate = predict === 'column'
  const W = ctx.phone ? 340 : 540
  const left = 36
  const right = W - 36
  const at = (col) => left + (col + 0.5) / sensor.pxWidth * (right - left)
  const trial = at(q.column)
  const centre = at(q.centre)
  return <figure className="vi-instrument">
    <figcaption>{tr('从传感器正面看 · 横向', 'Sensor front view · horizontal')}<span>{sensor.width} mm / {sensor.pxWidth} px</span></figcaption>
    <svg className="vi-bench" viewBox={`0 0 ${W} 180`} role="img" aria-label={tr('从带符号偏移到像素列坐标', 'From signed offset to pixel column')}>
      <rect className="vp-strip" x={left} y={58} width={right - left} height={36} rx={3} />
      {Array.from({ length: 9 }, (_, i) => <line key={i} className="vb-plane" x1={left + i / 8 * (right - left)} x2={left + i / 8 * (right - left)} y1={59} y2={93} />)}
      <line className="vp-angle" x1={centre} x2={centre} y1={38} y2={110} />
      <text className="vb-note" x={centre} y={26}>{coordinate ? `cₓ = ${q.centre}` : tr('光轴交点 · 0 mm', 'Axis intersection · 0 mm')}</text>
      <text className="vb-note" x={left} y={120}>{coordinate ? '−0.5' : `−${sensor.width / 2} mm`}</text><text className="vb-note" x={right} y={120}>{coordinate ? sensor.pxWidth - 0.5 : `+${sensor.width / 2} mm`}</text>
      <text className="vb-note" x={W / 2} y={163}>{coordinate ? tr('向右为正 · 像素中心从 0 编号', 'Positive right · pixel centres indexed from 0') : tr('向右为正 · 先保留相对光轴的偏移', 'Positive right · keep the axis-relative offset')}</text>
      {shown(ctx) && <g className="vp-result"><line className="vb-image" x1={trial} x2={trial} y1={48} y2={104} /><circle className="vb-image" cx={trial} cy={76} r={5} /><text className="vb-note" x={Math.max(65, Math.min(W - 65, trial))} y={142}>{coordinate ? `x = ${n(q.column)}` : `${n(q.u_px)} px`}</text></g>}
    </svg>
    <p className="vi-instrument-note">{shown(ctx) ? coordinate ? tr(`偏移 ${n(q.u_px)} px → 列坐标 ${n(q.column)}`, `Offset ${n(q.u_px)} px → column ${n(q.column)}`) : tr(`偏移 ${n(q.u)} mm → ${n(q.u_px)} px`, `Offset ${n(q.u)} mm → ${n(q.u_px)} px`) : tr('检查后显示像点；刻度条表示整块传感器，并非逐格画出全部像素。', 'Check to reveal the image point; the strip spans the sensor, not individual pixels.')}</p>
    <Terms params={params} />
  </figure>
}
