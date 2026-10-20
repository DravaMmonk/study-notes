// The camera obscura bench (OpticsObscura.jsx). Side view of a table, in millimetres. The arrow stands on the optical
// axis at the left end (`arrow` tall); the pinhole plate is Z from it, the screen f behind the plate. Similar
// triangles give the image x = −f·X/Z. A hole of diameter D lets every object point through as a cone, which lands
// on the screen as a disc D·(Z + f)/Z wide; the screen's brightness goes as (D / f)².

/**
 * The bench's model. arrow, shaft: the arrow's height and shaft width; table: arrow to the far end of the table;
 * plate: [min, max] where the plate may stand (Z); gap: how far behind the plate the screen stays at least; holes:
 * the hole diameters in the plate's slide; goal: { height, slack, blur, light }; start: { Z, s, D } (s = Z + f).
 */
export function obscuraBench({ arrow, shaft, table, plate, gap, holes, goal, start }) {
  const view = ({ Z, s, D }) => {
    const f = s - Z
    const image = (-f * arrow) / Z
    const blur = (D * (Z + f)) / Z
    const light = ((60 * D) / f) ** 2 // 1 = the brightness the goal asks for (f/60)
    return { Z, f, D, image, blur, light, magnification: f / Z }
  }

  const goals = (v) => [
    { key: 'height', label: { zh: '像高', en: 'Image height' }, value: `${Math.abs(v.image).toFixed(1)} mm`, need: `${goal.height} ± ${goal.slack} mm`, ok: Math.abs(Math.abs(v.image) - goal.height) <= goal.slack },
    { key: 'blur', label: { zh: '模糊', en: 'Blur' }, value: `${v.blur.toFixed(2)} mm`, need: `< ${goal.blur} mm`, ok: v.blur < goal.blur },
    { key: 'light', label: { zh: '亮度', en: 'Brightness' }, value: v.light.toFixed(2), need: `≥ ${goal.light.toFixed(2)}`, ok: v.light >= goal.light },
  ]
  const solved = (state) => goals(view(state)).every((g) => g.ok)

  // Clamp a state to the table: plate inside its rail, screen behind the plate and on the table.
  const clamp = ({ Z, s, D }) => {
    const z = Math.round(Math.min(plate[1], Math.max(plate[0], Z)))
    return { Z: z, s: Math.round(Math.min(table, Math.max(z + gap, s))), D }
  }

  // Every reachable setting on the 1 mm grid.
  function* settings() {
    for (const D of holes) for (let Z = plate[0]; Z <= plate[1]; Z++) for (let s = Z + gap; s <= table; s++) yield { Z, s, D }
  }

  return { ARROW: arrow, SHAFT: shaft, TABLE: table, PLATE: plate, GAP: gap, HOLES: holes, GOAL: goal, START: start, view, goals, solved, clamp, settings }
}
