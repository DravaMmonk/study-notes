// The vision domain's bench models and their displays (games/DESIGN.md 6.4, 6.8): the simulations behind the parameter
// benches (../../../engine/bench.js), each in this folder, and the pictures the kernel's display items cannot draw
// (../ui/benches/). A model item is
//   { about, setup?   its parameters
//     make(setup, bench) → model      { view(values) → the quantities a goal limits }
//     verify(model, bench) → ''       the model's data fit it (what is wrong, else ''), for npm run check }
// The lesson itself (the start fails, some setting passes, the naive settings fail, what passes holds) is the task's
// (lesson.js).
import { S } from '../../../engine/schema.js'
import { pinhole } from './pinhole.js'
import { lens } from './lens.js'
import { T as t } from '../../../shell/i18n.js'


export const BENCH_MODELS = { pinhole, lens }

const terms = S.obj({ terms: S.opt(S.list(S.text())) })
export const DISPLAYS = {
  pinholeField: { about: t('等比例的竖直视场构图，标出上下边界和半角', 'an equal-scale vertical field-of-view construction, with both sensor edges and half-angle'), params: terms },
  pinholeRays: { params: terms, about: t('针孔相机的侧视图：物体、相机中心、虚像平面和穿过中心的光线，目标位置画在像平面上', 'the pinhole camera from the side: the object, the camera centre, the virtual image plane and the rays through the centre, the target drawn on the plane') },
  lensRays: { about: t('薄透镜的侧视图：物体、透镜、传感器和每个物体落在传感器上的光锥', 'the thin lens from the side: the objects, the lens, the sensor and each object’s cone of light on the sensor') },
  blurCurve: { about: t('模糊圈对深度的曲线：清晰门槛、清晰的深度范围和每个物体的位置', 'the blur circle against depth: the sharpness threshold, the sharp range and each object') },
}

/** A bench task's bench with its model made, and its check (verify: '' when the model's data fit it). */
export function benchOf(bench) {
  const item = BENCH_MODELS[bench.model]
  const model = item.make(bench.setup ?? {}, bench)
  return { bench, model, verify: () => item.verify(model, bench) }
}
