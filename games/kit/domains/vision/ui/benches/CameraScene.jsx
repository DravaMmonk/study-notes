import { useId } from 'react'
import { tr } from '../../../../shell/i18n.js'
import camera from '../../assets/pinhole-camera.webp'
import lighthouse from '../../assets/lighthouse.webp'
import { pinholeView } from '../../benches/pinhole.js'

const n = (v) => Number(v.toFixed(2))

/** A concrete optical setup; every object, ray and ruler uses the same model coordinates. */
export default function CameraScene({ setup, q, bounds, revealed }) {
  const id = useId().replaceAll(':', '')
  const W = 800
  const H = 350
  const ox = 180
  const oy = setup.objects ? 220 - q.aim / bounds.height * 165 : 185
  const floor = setup.objects || setup.object === 'point' ? 310 : 249
  const x = (z) => ox + z / bounds.depth * 550
  const y = (v) => oy - v / bounds.height * 165
  const plane = x(q.f)
  const sensorSpan = setup.sensor ? setup.axis === 'horizontal' ? setup.sensor.width : setup.sensor.height : null
  const sensorHalf = sensorSpan === null ? null : sensorSpan / 2 / bounds.height * 165
  const objects = setup.objects?.map((o) => ({ ...o, Z: o.Z ?? q.Z, a: o.X - q.aim, b: o.X + o.H - q.aim })) ?? [{ Z: q.Z, a: setup.object === 'point' ? q.X : 0, b: setup.object === 'point' ? q.X : q.H }]
  const ruler = (a, b, at, label) => <g className="vp-lab-ruler">
    <path d={`M ${a} ${at - 5} v 10 M ${a} ${at} H ${b} M ${b} ${at - 5} v 10`} />
    <text x={(a + b) / 2} y={at - 9}>{label}</text>
  </g>
  return <figure className="vp-lab">
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={tr('相机、标定物与虚像测量屏组成的拍摄装置', 'A photography setup with a camera, calibration object and virtual image screen')}>
      <defs>
        <linearGradient id={`${id}wall`} x2="0" y2="1"><stop stopColor="#d5e0e2" /><stop offset="1" stopColor="#8dabb4" /></linearGradient>
        <linearGradient id={`${id}table`} x2="0" y2="1"><stop stopColor="#cfb58d" /><stop offset="1" stopColor="#a98156" /></linearGradient>
        <linearGradient id={`${id}brass`}><stop stopColor="#86612e" /><stop offset="0.4" stopColor="#efd6a0" /><stop offset="0.65" stopColor="#bb8f4b" /><stop offset="1" stopColor="#795321" /></linearGradient>
        <linearGradient id={`${id}screen`}><stop stopColor="#edf8f7" stopOpacity="0.8" /><stop offset="1" stopColor="#a1d9d6" stopOpacity="0.45" /></linearGradient>
        <radialGradient id={`${id}light`}><stop stopColor="#fff5ba" /><stop offset="0.3" stopColor="#f8d984" /><stop offset="1" stopColor="#e9b65d" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width={W} height={H} rx="14" fill={`url(#${id}wall)`} />
      <path d={`M 0 ${floor} Q 390 ${floor - 23} 800 ${floor} V 350 H 0 Z`} fill={`url(#${id}table)`} />
      {[12, 35, 66, 92].map((dy) => <path key={dy} d={`M 0 ${floor + dy} Q 400 ${floor + dy - 14} 800 ${floor + dy}`} stroke="#7c5b3c" strokeOpacity="0.16" fill="none" />)}
      <ellipse cx="410" cy={floor + 4} rx="335" ry="13" fill="#163844" opacity="0.16" />
      <path d={`M 64 ${floor - 3} H 750`} stroke="#5d7178" strokeWidth="12" />
      <path d={`M 64 ${floor - 7} H 750`} stroke="#dfe5df" strokeWidth="3" />
      {Array.from({ length: 29 }, (_, k) => <path key={k} d={`M ${76 + k * 23} ${floor - 7} v ${k % 5 ? 4 : 8}`} stroke="#64767b" />)}
      <path d={`M ${ox} ${oy} H 760`} stroke="#3f646e" strokeDasharray="7 7" strokeOpacity="0.45" />
      {revealed && objects.map((o, k) => <g key={k} className="vp-result">
        <path d={`M ${ox} ${oy} L ${x(o.Z)} ${y(o.a)} L ${x(o.Z)} ${y(o.b)} Z`} fill="#fff2ad" opacity="0.2" />
        {[...new Set([o.a, o.b])].map((v) => <path key={v} d={`M ${ox} ${oy} L ${x(o.Z)} ${y(v)}`} stroke="#ecae47" strokeWidth="2" fill="none" />)}
      </g>)}
      <g>
        <rect x={plane - 25} y={floor - 7} width="50" height="8" rx="3" fill="#657b80" />
        <rect x={plane - 3} y={oy - 65} width="6" height={floor - oy + 65} fill={`url(#${id}brass)`} />
        <rect x={plane - 12} y={oy - 65} width="24" height="130" rx="3" fill={`url(#${id}screen)`} stroke="#577c80" strokeWidth="2" />
        {sensorHalf !== null && <rect x={plane - 11} y={oy - sensorHalf} width="22" height={sensorHalf * 2} fill="#a5d8bb" stroke="#366c5b" strokeWidth="2" />}
        {[-50, -25, 0, 25, 50].map((dy) => <path key={dy} d={`M ${plane - 10} ${oy + dy} h 6`} stroke="#618286" />)}
        {revealed && objects.map((o, k) => <g key={k}>
          <line x1={plane} x2={plane} y1={y(q.f * o.a / o.Z)} y2={y(q.f * o.b / o.Z)} stroke="#c94730" strokeWidth="7" />
          <circle cx={plane} cy={y(q.f * o.b / o.Z)} r="5" fill="#ffe89a" stroke="#b27b30" />
        </g>)}
      </g>
      {objects.map((o, k) => {
        const base = y(o.a)
        const top = y(o.b)
        const height = Math.abs(base - top)
        return <g key={k}>
          <ellipse cx={x(o.Z)} cy={floor - 2} rx="29" ry="6" fill="#53656a" opacity="0.6" />
          {o.id === 'lamp' ? <path d={`M ${x(o.Z)} 0 V ${top}`} stroke="#50646c" strokeWidth="2" /> : <rect x={x(o.Z) - 3} y={Math.max(base, top)} width="6" height={Math.max(0, floor - 6 - Math.max(base, top))} fill={`url(#${id}brass)`} />}
          {o.a === o.b || o.id === 'lamp' ? <g>
            <circle cx={x(o.Z)} cy={o.id === 'lamp' ? (top + base) / 2 : top} r={o.id === 'lamp' ? height / 2 : 17} fill={`url(#${id}brass)`} />
            <circle cx={x(o.Z)} cy={o.id === 'lamp' ? (top + base) / 2 : top} r={o.id === 'lamp' ? height * 0.35 : 11} fill="#fff7ce" />
            <circle cx={x(o.Z)} cy={o.id === 'lamp' ? (top + base) / 2 : top} r={o.id === 'lamp' ? height * 2 : 30} fill={`url(#${id}light)`} />
          </g> : <image href={lighthouse} x={x(o.Z) - height / 4} y={Math.min(base, top)} width={height / 2} height={height} />}
          <path d={`M ${x(o.Z) + height / 4 + 16} ${y(0)} V ${top}`} stroke="#385a63" strokeWidth="1.5" strokeDasharray="4 3" />
        </g>
      })}
      {floor > 249 && <rect x="94" y={oy + 60} width="8" height={Math.max(0, floor - oy - 60)} fill={`url(#${id}brass)`} />}
      <image href={camera} x="10" y={oy - 59} width="190" height="127" />
      <circle cx={ox} cy={oy} r="5" fill="#fff5c2" stroke="#a7742b" />
      <text x={ox - 6} y={oy - 17} className="vp-lab-label">O</text>
      {setup.object === 'point' && !setup.objects && <g className="vp-lab-ruler">
        <path d={`M ${x(q.Z) + 30} ${oy} H ${x(q.Z) + 42} M ${x(q.Z) + 36} ${oy} V ${y(q.X)} M ${x(q.Z) + 30} ${y(q.X)} H ${x(q.Z) + 42}`} />
        <text x={x(q.Z) + 62} y={(oy + y(q.X)) / 2 + 7}>X</text>
        <path d={`M ${plane + 19} ${oy} H ${plane + 31} M ${plane + 25} ${oy} V ${y(q.u)} M ${plane + 19} ${y(q.u)} H ${plane + 31}`} />
        <text x={plane + 43} y={(oy + y(q.u)) / 2 + 7}>u</text>
      </g>}
      {ruler(ox, plane, setup.objects ? floor + 22 : 287, `f = ${n(q.f)}`)}
      {!setup.objects && ruler(ox, x(q.Z), 326, `Z = ${n(q.Z)}`)}
    </svg>
    <figcaption className="vp-scene-key">
      <span><i className="vp-camera-dot" />{tr('针孔相机 O', 'Pinhole camera O')}</span>
      <span><i className="vp-plane-dot" />{tr('虚像测量屏', 'Virtual image screen')}</span>
      <span><i className="vp-subject-dot" />{setup.object === 'point' ? tr('发光标记', 'Light marker') : tr('标定灯塔', 'Calibration lighthouse')}</span>
    </figcaption>
    <p className="vi-instrument-note">{tr('正像虚像模型；场景与测量屏按不同方向比例压缩，读数使用同一长度单位。', 'Upright virtual-image model; the schematic uses unequal axis scales, with one length unit for all readings.')}</p>
    {setup.sensor && <p className="vi-instrument-note">{tr(`测量屏内的绿框对应传感器上 ${sensorSpan} mm 的接收范围；框外的像不会进入照片。`, `The green window marks the sensor's ${sensorSpan} mm extent; image points outside it do not enter the photograph.`)}</p>}
  </figure>
}

/** A photograph comparison keeps the reference visible without repeating the whole apparatus. */
export function CameraPhoto({ q, setup, reference = false, revealed = true }) {
  const value = setup.object === 'point' ? q.u : q.h
  const height = Math.abs(value) * 90
  return <figure className={`vp-photograph ${revealed ? '' : 'is-shuttered'}`}>
    <div className="vp-photo-image">
      {revealed ? setup.object === 'point'
        ? <i className="vp-photo-light" style={{ transform: `translateY(${-value * 30}px)` }} />
        : <img className="vp-result" src={lighthouse} alt="" style={{ height, transform: value < 0 ? 'rotate(180deg)' : undefined }} />
        : <span>{tr('检查后曝光', 'Check to expose')}</span>}
    </div>
    <figcaption><b>{reference ? tr('参照照片', 'Reference photo') : tr('你的照片', 'Your photo')}</b><span>{revealed ? `${setup.object === 'point' ? 'u' : 'h'} = ${n(value)}` : tr('尚未测量', 'Not measured')}</span></figcaption>
  </figure>
}

/** A worked test remains observable without turning the illustration into a mandatory bench. */
export function ProjectionCase({ test, tests, phone }) {
  const setup = { object: 'point' }
  const q = pinholeView(setup, test.inputs)
  const states = tests.map((t) => pinholeView(setup, t.inputs))
  const bounds = {
    depth: Math.max(...states.flatMap((v) => [v.Z, v.f])) * 1.14,
    height: Math.max(1, ...states.flatMap((v) => [Math.abs(v.X), Math.abs(v.u)])) * 1.2,
  }
  return <details className="vp-camera-case" open={!phone}>
    <summary>{tr('查看本次拍摄', 'Inspect this camera setup')}</summary>
    <CameraScene setup={setup} q={q} bounds={bounds} revealed />
  </details>
}

/** Sensor clipping uses projected endpoints, including partially visible unwanted objects. */
export function FramingPhoto({ setup, q, revealed }) {
  const id = useId().replaceAll(':', '')
  const scale = 220 / setup.sensor.height
  const y = (v) => 110 - v * scale
  return <figure className="vp-framing-photo">
    <figcaption>{tr('取景照片 · 竖直范围', 'Framing photo · vertical extent')}</figcaption>
    <svg viewBox="0 0 330 220" role="img" aria-label={revealed ? tr('检查后的取景照片，画框会裁去范围外的物体', 'Checked photograph; objects outside the sensor are clipped') : tr('检查后显示取景照片', 'Check to reveal the framing photograph')}>
      <defs><clipPath id={`${id}frame`}><rect width="330" height="220" /></clipPath></defs>
      <rect width="330" height="220" fill="#294b5a" />
      {revealed ? <g className="vp-result" clipPath={`url(#${id}frame)`}>
        {setup.objects.map((o, k) => {
          const a = q[`u_${o.id}`]
          const b = a + q[`h_${o.id}`]
          const height = Math.abs(y(a) - y(b))
          return o.id === 'lamp'
            ? <g key={o.id}><path d={`M 250 ${y(b)} V -220`} stroke="#b79d67" strokeWidth="2" /><circle cx="250" cy={(y(a) + y(b)) / 2} r={height / 2} fill="#ffdf8b" /></g>
            : <image key={o.id} href={lighthouse} x={85 + k * 40 - height / 4} y={Math.min(y(a), y(b))} width={height / 2} height={height} />
        })}
        <path d="M 0 110 H 330" stroke="#d7e6de" strokeDasharray="6 8" opacity="0.3" />
      </g> : <text x="165" y="115" textAnchor="middle" fill="#e0e8e5" fontSize="17">{tr('检查后曝光', 'Check to expose')}</text>}
    </svg>
  </figure>
}
