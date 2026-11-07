// Matte patches under one light (games/DESIGN.md 6.8), a Lambertian teaching model in a side view: each patch faces
// tilt_<id> degrees from straight up and reflects albedo_<id> of the light; the light comes from `light` degrees from
// straight up with strength `intensity`. A patch's brightness is intensity · albedo · max(0, cos(tilt − light)).
//
// Reads each patch's `brightness_<id>` and `albedo_<id>`, the id of the `brighter` and of the `whiter` patch (the one
// whose brightness or albedo is largest; '' on a tie), and `patches`, the brightnesses as a strip for the kernel's
// strips display. A goal can ask for a photograph the same as a reference (brightness near) while a different patch is
// in fact the whiter: one picture, more than one world.
import { S } from '../../../engine/schema.js'
import { T as t } from '../../../shell/i18n.js'

const rad = (deg) => (deg * Math.PI) / 180

/** The id holding the largest value, or '' when two hold it. */
const largest = (ids, value) => {
  const top = Math.max(...ids.map(value))
  const at = ids.filter((id) => Math.abs(value(id) - top) < 1e-9)
  return at.length === 1 ? at[0] : ''
}

export function lambertView(setup, v) {
  const ids = setup.patches.map((p) => p.id)
  const intensity = v.intensity ?? 1
  const light = v.light ?? 0
  const albedo = (id) => v[`albedo_${id}`] ?? 0.5
  const tilt = (id) => v[`tilt_${id}`] ?? 0
  const brightness = (id) => intensity * albedo(id) * Math.max(0, Math.cos(rad(tilt(id) - light)))
  const out = { ...v, intensity, light }
  for (const id of ids) {
    out[`brightness_${id}`] = brightness(id)
    out[`albedo_${id}`] = albedo(id)
    out[`tilt_${id}`] = tilt(id)
  }
  out.brighter = largest(ids, brightness)
  out.whiter = largest(ids, albedo)
  const width = 8
  out.patches = ids.flatMap((id) => Array(width).fill(Math.min(1, brightness(id))))
  return out
}

export const lambert = {
  about: t('灯下的哑光面（朗伯教学模型，侧视）：每块面的旋钮 albedo_<id>（反射率）、tilt_<id>（朝向，度），灯的 light（方向，度）和 intensity；读出 brightness_<id>、brighter、whiter 和画成一条的 patches',
    'matte patches under a light (a Lambertian teaching model, side view): per patch knobs albedo_<id> (reflectance) and tilt_<id> (facing, degrees), the light’s `light` (direction, degrees) and intensity; reads brightness_<id>, brighter, whiter and the strip `patches`'),
  setup: S.obj({
    patches: S.list(S.obj({ id: S.str({ pattern: '^[A-Za-z][A-Za-z0-9]*$' }), label: S.opt(S.text()) }), { min: 2 }),
  }),
  make(setup) {
    return { setup, view: (v) => lambertView(setup, v) }
  },
  verify({ setup }) {
    const ids = setup.patches.map((p) => p.id)
    return new Set(ids).size === ids.length ? '' : 'patch ids must differ'
  },
}
