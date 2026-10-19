// Optics pack: two bench levels about where pixels come from and what one picture cannot say.
//   0-5 暗箱  — the camera obscura: x = −f·X/Z, and a bigger hole is brighter but blurrier.
//   7-3 测距  — stereo range: z = f·b/d, |Δz| ≈ z²/(f·b)·|Δd|, against a limited disparity search.
// Every board's maths lives here as pure functions (attached to the level as `model`), so the
// boards only draw and the validator can prove each goal is reachable and each naive setting fails.

// ---------------- 0-5 · 暗箱 ----------------
// Side view of a table, in millimetres. The arrow stands on the optical axis at the left end
// (X tall); the pinhole plate is Z from it, the screen f behind the plate. Similar triangles give
// the image x = −f·X/Z. A hole of diameter D lets every object point through as a cone, which lands
// on the screen as a disc D·(Z + f)/Z wide; the screen's brightness goes as (D / f)².

const obscura = (() => {
  const ARROW = 100 // mm, object height above the axis
  const SHAFT = 4 // mm, the arrow's shaft width
  const TABLE = 640 // mm, arrow to the far end of the table
  const PLATE = [150, 520] // mm, where the plate may stand (Z)
  const GAP = 20 // mm, the screen stays at least this far behind the plate
  const HOLES = [0.3, 0.6, 1, 1.6, 2.5] // mm, the holes in the plate's slide
  const GOAL = { height: 30, slack: 1, blur: 1.5, light: 1 }
  const START = { Z: 360, s: 430, D: 2.5 }

  const view = ({ Z, s, D }) => {
    const f = s - Z
    const image = (-f * ARROW) / Z
    const blur = (D * (Z + f)) / Z
    const light = ((60 * D) / f) ** 2 // 1 = the brightness the goal asks for (f/60)
    return { Z, f, D, image, blur, light, magnification: f / Z }
  }

  const goals = (v) => [
    { key: 'height', label: { zh: '像高', en: 'Image height' }, value: `${Math.abs(v.image).toFixed(1)} mm`, need: `${GOAL.height} ± ${GOAL.slack} mm`, ok: Math.abs(Math.abs(v.image) - GOAL.height) <= GOAL.slack },
    { key: 'blur', label: { zh: '模糊', en: 'Blur' }, value: `${v.blur.toFixed(2)} mm`, need: `< ${GOAL.blur} mm`, ok: v.blur < GOAL.blur },
    { key: 'light', label: { zh: '亮度', en: 'Brightness' }, value: v.light.toFixed(2), need: `≥ ${GOAL.light.toFixed(2)}`, ok: v.light >= GOAL.light },
  ]
  const solved = (state) => goals(view(state)).every((g) => g.ok)

  // Clamp a state to the table: plate inside its rail, screen behind the plate and on the table.
  const clamp = ({ Z, s, D }) => {
    const z = Math.round(Math.min(PLATE[1], Math.max(PLATE[0], Z)))
    return { Z: z, s: Math.round(Math.min(TABLE, Math.max(z + GAP, s))), D }
  }

  // Every reachable setting on the 1 mm grid, for the validator.
  function* settings() {
    for (const D of HOLES) for (let Z = PLATE[0]; Z <= PLATE[1]; Z++) for (let s = Z + GAP; s <= TABLE; s++) yield { Z, s, D }
  }

  const verify = () => {
    if (solved(START)) return 'the starting setting already passes'
    const good = [...settings()].filter(solved)
    if (!good.length) return 'no setting meets all three goals'
    // The naive moves: pinhole as small as possible, or as big as possible; neither may pass anywhere.
    const holes = new Set(good.map((g) => g.D))
    if (holes.has(HOLES[0])) return 'the smallest hole passes, so brightness teaches nothing'
    if (holes.has(HOLES.at(-1))) return 'the biggest hole passes, so blur teaches nothing'
    // Height must come from the ratio f/Z: a passing f at one Z fails at another.
    const sample = good[0]
    if (solved({ ...sample, Z: sample.Z + 40, s: sample.s + 40 })) return 'height does not depend on f/Z'
    return ''
  }

  return {
    id: '0-8',
    kind: 'board',
    board: 'OpticsObscura',
    chapter: 0,
    title: { zh: '暗箱', en: 'Camera obscura' },
    brief: { zh: '让箭头在屏幕上成 30 mm 高的像：要够清楚，也要够亮。', en: 'Make the arrow form a 30 mm tall image on the screen: sharp enough, and bright enough.' },
    hint: { zh: '拖孔板和屏幕，在孔板上换孔。一次只动一样，看像高、模糊、亮度各跟着什么变。', en: 'Drag the pinhole plate and the screen, and change the hole in the plate. Move one thing at a time and watch what each of image height, blur and brightness follows.' },
    after: { zh: '像高只看比例：x = −f·X/Z，屏幕离孔越远、物体离孔越近，像越大，而且总是倒的。孔越大，同一点的光在屏上铺成越大的斑 D·(Z+f)/Z，像越亮也越糊；屏幕拉近也更亮。', en: 'Image height depends only on a ratio: x = −f·X/Z. The farther the screen is from the hole and the nearer the object, the bigger the image, and it is always upside down. The bigger the hole, the bigger the spot D·(Z+f)/Z that light from one point spreads into on the screen, so the image gets brighter and blurrier; moving the screen closer also makes it brighter.' },
    requires: ['0-1'],
    unlocks: [],
    model: { ARROW, SHAFT, TABLE, PLATE, GAP, HOLES, GOAL, START, view, goals, solved, clamp },
    verify,
  }
})()

// ---------------- 7-3 · 测距 ----------------
// Two rectified pinhole cameras b apart, focal length f in pixels, 640 px wide images. A target at
// lateral X and depth z lands at x = f·(X ± b/2)/z in the two images, so d = f·b/z. The matcher only
// searches 64 px of disparity (numDisparities), and a one-pixel disparity error moves the depth
// between f·b/(d+1) and f·b/(d−1) — about z²/(f·b) either way.

export const nodes = {}
export const levels = [obscura]
