// The thin lens (games/DESIGN.md 6.8), a bounded teaching model in millimetres: a lens of focal length F and aperture
// diameter A, focused at distance `focus` (the sensor at s = 1 / (1/F − 1/focus) behind it). An object at depth z
// images at si = 1 / (1/F − 1/z); on the sensor it is a blur circle of diameter A·|s − si| / si, and it counts as
// sharp while that is at most cMax. The light the sensor collects goes as A² (light = (A / A0)², the exposure and the
// scene held fixed). The depth range judged sharp runs from `near` to `far` (far may be infinite). Valid for depths
// beyond F; the image inversion of a real lens is drawn, not hidden.
import { S } from '../../../engine/schema.js'
import { lessonHolds } from './lesson.js'

const t = (zh, en) => ({ zh, en })

/** Where a depth images behind the lens (Infinity at the focal plane, negative inside it). */
export const imageAt = (F, z) => 1 / (1 / F - 1 / z)

/** The blur circle's diameter on the sensor of a lens of focal length F, aperture A, focused at `focus`, for depth z. */
export const blurAt = (F, { A, focus }, z) => (A * Math.abs(imageAt(F, focus) - imageAt(F, z))) / imageAt(F, z)

/** What a setting gives: light, the sensor distance, each object's blur and sharpness, the sharp depth range. */
export function lensView({ F, A0, cMax, objects }, { A, focus }) {
  const s = imageAt(F, focus)
  const blur = (z) => blurAt(F, { A, focus }, z)
  const out = { A, focus, s, light: (A / A0) ** 2, near: null, far: null }
  for (const o of objects) {
    out[`blur_${o.id}`] = blur(o.z)
    out[`sharp_${o.id}`] = blur(o.z) <= cMax + 1e-12 ? 1 : 0
  }
  // The limits of the sharp range: where the blur circle reaches cMax on either side of the focus.
  const k = cMax / A
  const zOf = (si) => (si > F ? 1 / (1 / F - 1 / si) : Infinity)
  out.near = k < 1 ? zOf(s / (1 - k)) : F
  out.far = zOf(s / (1 + k))
  out.dof = out.far - out.near
  return out
}

export const lens = {
  about: t('薄透镜（简化教学模型，毫米）：旋钮 A（光圈直径）、focus（对焦距离）；算出进光量 light、每个物体的模糊圈 blur_<id> 和清晰与否 sharp_<id>、清晰的深度范围 near–far（dof）',
    'the thin lens (a simplified teaching model, millimetres): knobs A (aperture diameter) and focus (focus distance); computes the light, each object’s blur circle blur_<id> and sharpness sharp_<id>, the sharp depth range near–far (dof)'),
  setup: S.obj({
    F: S.num({ min: 1, about: t('焦距', 'the focal length') }),
    A0: S.num({ min: 0.001, about: t('进光量为 1 时的光圈直径', 'the aperture whose light counts as 1') }),
    cMax: S.num({ min: 0.0001, about: t('还算清晰的最大模糊圈直径', 'the largest blur circle still judged sharp') }),
    objects: S.list(S.obj({ id: S.str({ pattern: '^[A-Za-z][A-Za-z0-9]*$' }), z: S.num({ about: t('深度，大于 F', 'the depth, beyond F') }), label: S.opt(S.text()) }), { min: 1 }),
  }),
  make(setup) {
    return { setup, view: (v) => lensView(setup, { A: v.A ?? setup.A0, focus: v.focus ?? setup.objects[0].z }) }
  },
  verify(model, bench) {
    const { F, objects } = model.setup
    if (objects.some((o) => o.z <= F)) return 'every object must stand beyond the focal length'
    const focus = bench.knobs?.focus
    if (focus && (focus.min ?? F + 1) <= F) return 'the focus knob must stay beyond the focal length'
    return lessonHolds(bench, model.view)
  },
}
