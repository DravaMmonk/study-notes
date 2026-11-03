// The pinhole camera (games/DESIGN.md 6.8): an ideal geometric camera, not a lens. The camera centre is the origin,
// the optical axis +Z, and the image is read on the virtual image plane at distance f in front of the centre, upright
// (the physical screen behind a real pinhole is inverted; the two are never mixed in one bench). A point at lateral
// offset X and depth Z > 0 projects to u = f·X / Z; an upright object of height H at depth Z projects to h = f·H / Z.
//
// One object (the setup's X, H, or knobs of those names), or several (`objects`: each an upright arrow from X to X + H
// at its own depth or the knob Z). With a `sensor` (its height and width in millimetres and in pixels, the principal
// point at its centre), the plane has edges: an object whose image runs past them is out of view, and every image
// position and height is read in pixels too; the focal length in pixels uses the chosen axis pitch. The vertical
// and horizontal fields of view remain tied to sensor height and width respectively.
import { S } from '../../../engine/schema.js'

const t = (zh, en) => ({ zh, en })
const ID = S.str({ pattern: '^[A-Za-z][A-Za-z0-9]*$' })

/** u and h for knob values over the setup's fixed ones (a quantity the bench does not use is still computed). */
export function project({ X = 0, H = 1, Z = 1, f = 1 }) {
  return { X, H, Z, f, u: (f * X) / Z, h: (f * H) / Z }
}

const deg = (rad) => (rad * 180) / Math.PI

/**
 * Everything the bench reads at a setting: u and h (one object), or u_<id>, h_<id>, in_<id> (each object; inView, how
 * many are wholly on the sensor; allIn, 1 when all are); with a sensor, the same in pixels (u_px, h_px, u_<id>_px,
 * h_<id>_px), the focal length in pixels fpx, and the vertical and horizontal fields of view fov and fovW in degrees.
 */
export function pinholeView(setup, values) {
  const v = { ...setup, ...values }
  const out = { ...project(v), aim: v.aim ?? 0 }
  const sensor = setup.sensor
  const horizontal = setup.axis === 'horizontal'
  const pixels = sensor && (horizontal ? sensor.pxWidth : sensor.pxHeight)
  const span = sensor && (horizontal ? sensor.width : sensor.height)
  const px = sensor ? pixels / span : null
  const half = sensor ? span / 2 : Infinity
  const within = (a, b) => (Math.abs(a) <= half + 1e-9 && Math.abs(b) <= half + 1e-9 ? 1 : 0)
  if (setup.objects) {
    let seen = 0
    for (const o of setup.objects) {
      const Z = o.Z ?? v.Z
      const [bottom, top] = [(v.f * (o.X - out.aim)) / Z, (v.f * (o.X + o.H - out.aim)) / Z]
      out[`u_${o.id}`] = bottom
      out[`h_${o.id}`] = top - bottom
      out[`in_${o.id}`] = within(bottom, top)
      // Cropping any part is different from keeping an unwanted object wholly outside the frame.
      out[`visible_${o.id}`] = Math.max(bottom, top) >= -half - 1e-9 && Math.min(bottom, top) <= half + 1e-9 ? 1 : 0
      seen += out[`in_${o.id}`]
      if (px) Object.assign(out, { [`u_${o.id}_px`]: bottom * px, [`h_${o.id}_px`]: (top - bottom) * px })
    }
    Object.assign(out, { inView: seen, allIn: seen === setup.objects.length ? 1 : 0 })
  } else if (sensor) {
    out.inView = setup.object === 'point' ? within(out.u, out.u) : within(0, out.h)
  }
  if (px) Object.assign(out, { u_px: out.u * px, h_px: out.h * px, fpx: v.f * px, fov: deg(2 * Math.atan(sensor.height / 2 / v.f)), fovW: deg(2 * Math.atan(sensor.width / 2 / v.f)) })
  if (sensor) Object.assign(out, { pitch: span / pixels, centre: (pixels - 1) / 2, column: out.u * px + (pixels - 1) / 2 })
  return out
}

export const pinhole = {
  about: t('针孔相机（理想几何模型，虚像平面不倒像）：旋钮 X（横向位置）、H（物高）、Z（距离）、f（像平面距离）；算出投影位置 u、像高 h；可以放几个物体，可以加一块传感器（毫米和像素的尺寸），读出像素值、像素焦距 fpx、视场 fov 和哪些物体在画面里',
    'the pinhole camera (an ideal geometric model, the upright virtual image plane): knobs X (lateral offset), H (object height), Z (depth), f (plane distance); computes the projection u and the image height h; may hold several objects and a sensor (its size in millimetres and pixels), reading pixels, the focal length in pixels fpx, the field of view fov and which objects are in view'),
  setup: S.obj({
    axis: S.opt(S.oneOf(['horizontal', 'vertical'])),
    unit: S.opt(S.str()),
    reference: S.opt(S.obj({ X: S.num(), H: S.num(), Z: S.num({ min: 0.001 }), f: S.num({ min: 0.001 }) })),
    X: S.opt(S.num()), H: S.opt(S.num()), Z: S.opt(S.num({ min: 0.001 })), f: S.opt(S.num({ min: 0.001 })),
    object: S.opt(S.oneOf(['point', 'arrow'], { about: t('画成一个点（看 u）还是一支箭（看 h）', 'drawn as a point (u matters) or an arrow (h matters)') })),
    objects: S.opt(S.list(S.obj({ id: ID, X: S.num(), H: S.num(), Z: S.opt(S.num({ min: 0.001 })), label: S.opt(S.text()) }), { min: 1, about: t('几支竖着的箭，各从 X 到 X + H；不写 Z 的用旋钮 Z', 'several upright arrows, each from X to X + H; one without Z stands at the knob Z') })),
    sensor: S.opt(S.obj({ height: S.num({ min: 0.001 }), width: S.num({ min: 0.001 }), pxHeight: S.int({ min: 1 }), pxWidth: S.int({ min: 1 }) }, { about: t('传感器：高和宽（毫米、像素），主点在中心', 'the sensor: its height and width in millimetres and in pixels, the principal point at its centre') })),
    target: S.opt(S.obj({ of: S.oneOf(['u', 'h', 'u_px', 'h_px']), value: S.num() }, { about: t('像平面上画出的目标位置（像素的目标要有传感器）', 'the target drawn on the image plane (a target in pixels needs a sensor)') })),
  }),
  make(setup) {
    return { setup, view: (v) => pinholeView(setup, v) }
  },
  verify(model, bench) {
    const { setup } = model
    if (['Z', 'f'].some((n) => bench.knobs?.[n] && !(bench.knobs[n].min > 0))) return 'the Z and f knobs must stay positive'
    if (setup.target?.of.endsWith('_px') && !setup.sensor) return 'a target in pixels needs a sensor'
    if (setup.objects && new Set(setup.objects.map((o) => o.id)).size !== setup.objects.length) return 'two objects share an id'
    return ''
  },
}
