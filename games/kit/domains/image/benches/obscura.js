// The camera obscura bench. Side view of a table, in millimetres. The arrow stands on the optical axis at the left end
// (`arrow` tall); the pinhole plate is Z from it, the screen f behind the plate. Similar triangles give the image
// x = −f·X/Z. A hole of diameter D lets every object point through as a cone, which lands on the screen as a disc
// D·(Z + f)/Z wide; the screen's brightness goes as (D / f)².
import { S } from '../../../engine/schema.js'
import { goalOf, judge, knobValues, openKnobs, startValues } from '../../../engine/bench.js'
import { T as t } from '../../../shell/i18n.js'

const num = S.num()

/**
 * The optics. arrow, shaft: the arrow's height and shaft width; table: arrow to the far end of the table; plate:
 * [min, max] where the plate may stand (Z); gap: how far behind the plate the screen stays at least.
 */
export function obscuraBench({ arrow, shaft, table, plate, gap }) {
  const view = ({ Z, s, D }) => {
    const f = s - Z
    const image = (-f * arrow) / Z
    const blur = (D * (Z + f)) / Z
    const light = ((60 * D) / f) ** 2 // 1 = the brightness of f/60
    return { Z, f, D, image, height: Math.abs(image), blur, light }
  }
  // Clamp a setting to the table: plate inside its rail, screen behind the plate and on the table.
  const clamp = ({ Z, s, D }) => {
    const z = Math.round(Math.min(plate[1], Math.max(plate[0], Z)))
    return { Z: z, s: Math.round(Math.min(table, Math.max(z + gap, s))), D }
  }
  return { ARROW: arrow, SHAFT: shaft, TABLE: table, PLATE: plate, GAP: gap, view, clamp }
}

/** The bench model: knobs Z (the plate), s (the screen) and D (the hole); quantities height, blur and light. */
export const obscura = {
  about: t('暗箱：旋钮 Z（孔板到箭头）、s（屏幕到箭头）、D（孔径）；算出像高 height、模糊 blur、亮度 light', 'the camera obscura: knobs Z (plate from the arrow), s (screen from the arrow), D (the hole); computes the image height, blur and light'),
  setup: S.obj({ arrow: num, shaft: num, table: num, gap: num }),
  make(setup, bench) {
    const optics = obscuraBench({ ...setup, plate: [bench.knobs.Z.min, bench.knobs.Z.max] })
    return { ...optics, view: (v) => optics.view(v) }
  },
  verify(model, bench) {
    // A stepped bench: every step starts unsolved and some setting of the knobs it opens solves it.
    if (bench.stages) {
      for (const [i, stage] of bench.stages.entries()) {
        const goal = goalOf(bench, stage)
        const start = startValues(bench, stage)
        const solves = (v) => judge(goal, model.view(v)).pass
        if (solves(start)) return `step ${i + 1} already passes as it starts`
        const open = openKnobs(bench, stage)
        const range = (knob, lo, hi) => (open.includes(knob) ? Array.from({ length: hi - lo + 1 }, (_, k) => lo + k) : [start[knob]])
        let found = false
        for (const Z of range('Z', model.PLATE[0], model.PLATE[1])) for (const s of range('s', Z + model.GAP, model.TABLE)) if (!found && s >= Z + model.GAP && solves({ ...start, Z, s })) found = true
        if (!found) return `no setting of step ${i + 1}’s knobs passes it`
      }
      return ''
    }
    const solved = (v) => judge(goalOf(bench), model.view(v)).pass
    if (solved(startValues(bench))) return 'the starting setting already passes'
    const holes = knobValues(bench.knobs.D)
    const good = []
    for (const D of holes) for (let Z = model.PLATE[0]; Z <= model.PLATE[1]; Z++) for (let s = Z + model.GAP; s <= model.TABLE; s++) if (solved({ Z, s, D })) good.push({ Z, s, D })
    if (!good.length) return 'no setting meets all three goals'
    // The naive moves: pinhole as small as possible, or as big as possible; neither may pass anywhere.
    const passing = new Set(good.map((g) => g.D))
    if (passing.has(holes[0])) return 'the smallest hole passes, so brightness teaches nothing'
    if (passing.has(holes.at(-1))) return 'the biggest hole passes, so blur teaches nothing'
    // Height must come from the ratio f/Z: a passing f at one Z fails at another.
    const sample = good[0]
    if (solved({ ...sample, Z: sample.Z + 40, s: sample.s + 40 })) return 'height does not depend on f/Z'
    return ''
  },
}
