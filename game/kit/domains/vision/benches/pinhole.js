// The pinhole camera (games/DESIGN.md 6.8): an ideal geometric camera, not a lens. The camera centre is the origin,
// the optical axis +Z, and the image is read on the virtual image plane at distance f in front of the centre, upright
// (the physical screen behind a real pinhole is inverted; the two are never mixed in one bench). A point at lateral
// offset X and depth Z > 0 projects to u = f·X / Z; an upright object of height H at depth Z projects to h = f·H / Z.
// Projection says nothing about pixels yet.
import { S } from '../../../engine/schema.js'

const t = (zh, en) => ({ zh, en })

/** u and h for knob values over the setup's fixed ones (a quantity the bench does not use is still computed). */
export function project({ X = 0, H = 1, Z = 1, f = 1 }) {
  return { X, H, Z, f, u: (f * X) / Z, h: (f * H) / Z }
}

export const pinhole = {
  about: t('针孔相机（理想几何模型，虚像平面不倒像）：旋钮 X（横向位置）、H（物高）、Z（距离）、f（像平面距离）；算出投影位置 u = fX/Z、像高 h = fH/Z',
    'the pinhole camera (an ideal geometric model, the upright virtual image plane): knobs X (lateral offset), H (object height), Z (depth), f (plane distance); computes the projection u = fX/Z and the image height h = fH/Z'),
  setup: S.obj({
    X: S.opt(S.num()), H: S.opt(S.num()), Z: S.opt(S.num({ min: 0.001 })), f: S.opt(S.num({ min: 0.001 })),
    object: S.opt(S.oneOf(['point', 'arrow'], { about: t('画成一个点（看 u）还是一支箭（看 h）', 'drawn as a point (u matters) or an arrow (h matters)') })),
    target: S.opt(S.obj({ of: S.oneOf(['u', 'h']), value: S.num() }, { about: t('像平面上画出的目标位置', 'the target drawn on the image plane') })),
  }),
  make(setup) {
    return { setup, view: (v) => project({ ...setup, ...v }) }
  },
  verify(model, bench) {
    if (['Z', 'f'].some((n) => bench.knobs?.[n] && !(bench.knobs[n].min > 0))) return 'the Z and f knobs must stay positive'
    return ''
  },
}
