import { L, tr } from '../../../../shell/i18n.js'
import { blurAt, imageAt } from '../../benches/lens.js'

// The vision benches' pictures (../../benches/index.js DISPLAYS), each a display item of the kernel's bench
// (../../../../shell/bench/Bench.jsx) drawing what its model computes: { params, ctx } with ctx.q the knob values and
// the model's quantities together, ctx.model.setup the bench's fixed data. On a bench judged on submit, what the model
// works out (images, rays to them, blur, readings) is drawn only once the setting is checked (ctx.revealed); the
// scene the player sets up is always drawn.

const W = 640

export { PinholeRays, PinholeField } from './Pinhole.jsx'

/** The thin lens from the side: the objects at their depths on the left (squeezed), the lens, and behind it, drawn
 *  larger, where each object images and the cone it spreads into on the sensor. */
export function LensRays({ ctx }) {
  const { q, model } = ctx
  const { F, objects } = model.setup
  const H = 240
  const lensX = 300
  const zMax = Math.max(...objects.map((o) => o.z), q.focus) * 1.1
  const left = (z) => lensX - 20 - (Math.log(z / F) / Math.log(zMax / F)) * (lensX - 50)
  const behind = [q.s, ...objects.map((o) => imageAt(F, o.z))]
  const [b0, b1] = [F * 0.98, Math.max(...behind) * 1.02]
  const right = (d) => lensX + 30 + ((d - b0) / (b1 - b0)) * (W - lensX - 60)
  const half = (H / 2 - 24) * Math.min(1, q.A / (model.setup.A0 * 2))
  const cy = H / 2
  const shown = ctx.revealed !== false
  return (
    <svg className="vi-bench" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={tr('薄透镜侧视图', 'The thin lens from the side')}>
      <line className="vb-axis" x1={10} x2={W - 10} y1={cy} y2={cy} />
      <ellipse className="vb-lens" cx={lensX} cy={cy} rx={6} ry={half} />
      <line className="vb-plane" x1={right(q.s)} x2={right(q.s)} y1={14} y2={H - 14} />
      <text className="vb-note" x={right(q.s)} y={11}>{tr('传感器', 'Sensor')}</text>
      {objects.map((o, k) => {
        const si = imageAt(F, o.z)
        const spread = (half * Math.abs(q.s - si)) / si
        const sharp = q[`sharp_${o.id}`] === 1
        return (
          <g key={o.id} className={`vb-cone is-${k % 4} ${sharp ? 'is-sharp' : ''}`}>
            <line x1={left(o.z)} y1={cy} x2={lensX} y2={cy - half} />
            <line x1={left(o.z)} y1={cy} x2={lensX} y2={cy + half} />
            {shown && <polyline points={`${lensX},${cy - half} ${right(si)},${cy} ${lensX},${cy + half}`} />}
            {shown && <line className="vb-spot" x1={right(q.s)} x2={right(q.s)} y1={cy - spread} y2={cy + spread} />}
            <circle cx={left(o.z)} cy={cy} r={5} />
            <text className="vb-note" x={left(o.z)} y={cy + 22 + (k % 2) * 14}>{o.label ? L(o.label) : o.id}</text>
          </g>
        )
      })}
      <text className="vb-note is-left" x={14} y={H - 6}>{tr('左边按对数缩短，右边放大', 'Depths squeezed on a log scale at the left; behind the lens enlarged')}</text>
    </svg>
  )
}

/** The blur circle against depth (log scale): the sharpness threshold, the range judged sharp and every object. */
export function BlurCurve({ ctx }) {
  const { q, model } = ctx
  const { F, cMax, objects } = model.setup
  const H = 200
  const zs = objects.map((o) => o.z)
  const [z0, z1] = [Math.max(F * 1.2, Math.min(...zs, q.focus) / 3), Math.max(...zs, q.focus) * 3]
  const x = (z) => 40 + (Math.log(z / z0) / Math.log(z1 / z0)) * (W - 60)
  const samples = Array.from({ length: 121 }, (_, k) => z0 * (z1 / z0) ** (k / 120))
  const blurs = samples.map((z) => blurAt(F, q, z))
  const top = Math.max(cMax * 4, ...objects.map((o) => q[`blur_${o.id}`]))
  const y = (b) => H - 24 - (Math.min(b, top) / top) * (H - 40)
  const near = Math.max(q.near, z0)
  const far = Number.isFinite(q.far) ? Math.min(q.far, z1) : z1
  const shown = ctx.revealed !== false
  return (
    <svg className="vi-bench" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={tr('模糊圈随深度变化', 'The blur circle against depth')}>
      {shown && <rect className="vb-range" x={x(near)} y={12} width={Math.max(0, x(far) - x(near))} height={H - 36} />}
      <line className="vb-axis" x1={40} x2={W - 20} y1={H - 24} y2={H - 24} />
      <line className="vb-limit" x1={40} x2={W - 20} y1={y(cMax)} y2={y(cMax)} />
      <text className="vb-note is-left" x={44} y={y(cMax) - 6}>{tr('清晰门槛', 'Sharp enough')}</text>
      {shown && <polyline className="vb-curve" points={samples.map((z, k) => `${x(z).toFixed(1)},${y(blurs[k]).toFixed(1)}`).join(' ')} />}
      {!shown && <text className="vb-note" x={W / 2} y={H / 2}>{tr('检查这个设置后画出', 'Drawn once this setting is checked')}</text>}
      {objects.map((o, k) => (
        <g key={o.id} className={`vb-dot is-${k % 4}`}>
          {shown && <circle cx={x(o.z)} cy={y(q[`blur_${o.id}`])} r={5} />}
          <text className="vb-note" x={x(o.z)} y={H - 8}>{o.label ? L(o.label) : o.id}</text>
        </g>
      ))}
    </svg>
  )
}
