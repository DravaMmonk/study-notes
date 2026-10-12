// Optics pack: three bench levels about where pixels come from and what one picture cannot say.
//   0-5 暗箱  — the camera obscura: x = −f·X/Z, and a bigger hole is brighter but blurrier.
//   3-3 朗伯台 — Lambertian shading: one photo leaves albedo and light tangled; a second view settles it.
//   7-3 测距  — stereo range: z = f·b/d, |Δz| ≈ z²/(f·b)·|Δd|, against a limited disparity search.
// Every board's maths lives here as pure functions (attached to the level as `model`), so the
// boards only draw and the validator can prove each goal is reachable and each naive setting fails.
import { fromFn } from '../engine/image.js'

const rad = (deg) => (deg * Math.PI) / 180
const range = (from, to, step) => {
  const out = []
  for (let i = 0; from + i * step <= to + 1e-9; i++) out.push(Math.round((from + i * step) * 1000) / 1000)
  return out
}

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
    { key: 'height', label: '像高', value: `${Math.abs(v.image).toFixed(1)} mm`, need: `${GOAL.height} ± ${GOAL.slack} mm`, ok: Math.abs(Math.abs(v.image) - GOAL.height) <= GOAL.slack },
    { key: 'blur', label: '模糊', value: `${v.blur.toFixed(2)} mm`, need: `< ${GOAL.blur} mm`, ok: v.blur < GOAL.blur },
    { key: 'light', label: '亮度', value: v.light.toFixed(2), need: `≥ ${GOAL.light.toFixed(2)}`, ok: v.light >= GOAL.light },
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
    id: '0-5',
    kind: 'board',
    board: 'OpticsObscura',
    chapter: 0,
    title: '暗箱',
    brief: '让箭头在屏幕上成 30 mm 高的像：要够清楚，也要够亮。',
    hint: '拖孔板和屏幕，在孔板上换孔。像高只看 f 和 Z 的比例；孔大了亮但糊，孔小了清楚但暗。',
    after: '像高只看比例：x = −f·X/Z，屏幕离孔越远、物体离孔越近，像越大，而且总是倒的。孔越大，同一点的光在屏上铺成越大的斑 D·(Z+f)/Z，像越亮也越糊；屏幕拉近也更亮。镜头就是为了打破这个两难：开大孔，同时把光重新聚回一点。',
    requires: ['0-1'],
    unlocks: [],
    model: { ARROW, SHAFT, TABLE, PLATE, GAP, HOLES, GOAL, START, view, goals, solved, clamp },
    verify,
  }
})()

// ---------------- 3-3 · 朗伯台 ----------------
// A corrugated matte sheet seen from above, 16×16 pixels. Its normals all lie in the x–z plane:
// N = (sin a, 0, cos a), with the slope a running across the columns. Under one far lamp
// L = (cos e·cos φ, cos e·sin φ, sin e) each pixel reads I = ρ·max(0, N·L) — which only sees
// ρ·Lx and ρ·Lz, so a brighter sheet lit along the ridges looks exactly like a darker one lit across.
// The second photo is taken after the turntable turns the sheet 90°: now N = (0, sin a, cos a) and
// the photo sees ρ·Ly. Two photos pin down ρ and L together.

const lambert = (() => {
  const N = 16
  const slope = (i) => rad(60 * Math.sin((2 * Math.PI * (i + 0.5)) / 8))
  const ALBEDO = range(0.2, 1, 0.05)
  const ELEVATION = range(10, 90, 5)
  const AZIMUTH = range(-165, 180, 15)
  const TRUTH = { rho: 0.8, el: 40, az: 60 }
  const START = { rho: 0.5, el: 90, az: 0 }
  const TOLERANCE = 0.03

  const lightOf = ({ el, az }) => [Math.cos(rad(el)) * Math.cos(rad(az)), Math.cos(rad(el)) * Math.sin(rad(az)), Math.sin(rad(el))]

  // turned = false: ridges run up–down (photo A); true: after the 90° turn (photo B).
  const render = (setting, turned = false) => {
    const L = lightOf(setting)
    return fromFn(N, N, (x, y) => {
      const a = slope(turned ? y : x)
      const n = turned ? [0, Math.sin(a), Math.cos(a)] : [Math.sin(a), 0, Math.cos(a)]
      return setting.rho * Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2])
    })
  }

  const photoA = render(TRUTH, false)
  const photoB = render(TRUTH, true)
  const worst = (a, b) => {
    let m = 0
    for (let i = 0; i < a.data.length; i++) m = Math.max(m, Math.abs(a.data[i] - b.data[i]))
    return m
  }
  const matches = (setting, turned = false) => worst(render(setting, turned), turned ? photoB : photoA) <= TOLERANCE

  function* settings() {
    for (const rho of ALBEDO) for (const el of ELEVATION) for (const az of el === 90 ? [0] : AZIMUTH) yield { rho, el, az }
  }

  // Another setting that reproduces photo A while differing as much as possible in albedo: the board
  // shows it next to the player's first match, so the ambiguity is on screen, not in a sentence.
  // It never matches photo B, so it cannot give the final answer away.
  let firstMatches = null
  const twinOf = (setting) => {
    firstMatches ??= [...settings()].filter((s) => matches(s) && !matches(s, true))
    let best = null
    let score = -1
    for (const s of firstMatches) {
      const d = Math.abs(s.rho - setting.rho) + Math.abs(s.el - setting.el) / 90
      if (d > score) {
        best = s
        score = d
      }
    }
    return best
  }

  // Snap a raw (az, el) from the dial to the grid.
  const snap = ({ rho, el, az }) => {
    const e = Math.min(90, Math.max(10, Math.round(el / 5) * 5))
    let a = Math.round(az / 15) * 15
    while (a <= -180) a += 360
    while (a > 180) a -= 360
    return { rho: Math.min(1, Math.max(0.2, Math.round(rho * 20) / 20)), el: e, az: e === 90 ? 0 : a }
  }

  const verify = () => {
    if (!matches(TRUTH) || !matches(TRUTH, true)) return 'the true setting does not reproduce its own photos'
    if (matches(START)) return 'the starting setting already matches photo A'
    const first = [...settings()].filter((s) => matches(s))
    const rhos = first.map((s) => s.rho)
    if (Math.max(...rhos) - Math.min(...rhos) < 0.15) return 'photo A alone is not ambiguous in albedo'
    // The naive belief "brightness is just albedo, light from overhead" cannot match photo A.
    if (ALBEDO.some((rho) => matches({ rho, el: 90, az: 0 }))) return 'an overhead lamp matches photo A'
    const both = first.filter((s) => matches(s, true))
    if (!both.length) return 'no setting matches both photos'
    const far = both.find((s) => Math.abs(s.rho - TRUTH.rho) > 0.05 || Math.abs(s.el - TRUTH.el) > 5 || Math.abs(s.az - TRUTH.az) > 15)
    if (far) return `the second photo leaves ambiguity: ${JSON.stringify(far)}`
    // The twin shown after a first match must itself fail the second photo, whichever match was found.
    for (const s of first) {
      const twin = twinOf(s)
      if (!twin || Math.abs(twin.rho - s.rho) < 0.1) return `no clear twin for ${JSON.stringify(s)}`
    }
    return ''
  }

  return {
    id: '3-3',
    kind: 'board',
    board: 'OpticsLambert',
    chapter: 3,
    title: '朗伯台',
    brief: '拖动灯、调反射率，让你的渲染和照片一模一样。',
    hint: '亮度 = ρ·cos θ（θ 是法线和灯的夹角）。先让明暗条纹的位置对上，再调整体亮度。',
    after: '只看一张照片，「材质更亮、灯从斜侧照来」和「材质更暗、灯正对着照」可以一模一样：I = ρ·N·L 只给出 ρ 与夹角的组合。波纹板的法线都在一个平面里，灯沿波纹方向的那一份根本拍不出来。转 90° 再拍一张（等于换一盏已知方向的灯），多了一组方程，答案才唯一。',
    requires: ['3-1'],
    unlocks: [],
    model: { N, ALBEDO, ELEVATION, AZIMUTH, START, TOLERANCE, photoA, photoB, render, worst, matches, twinOf, snap, lightOf },
    verify,
  }
})()

// ---------------- 7-3 · 测距 ----------------
// Two rectified pinhole cameras b apart, focal length f in pixels, 640 px wide images. A target at
// lateral X and depth z lands at x = f·(X ± b/2)/z in the two images, so d = f·b/z. The matcher only
// searches 64 px of disparity (numDisparities), and a one-pixel disparity error moves the depth
// between f·b/(d+1) and f·b/(d−1) — about z²/(f·b) either way.

const ranging = (() => {
  const FOCALS = [400, 800, 1200] // px
  const BASELINES = range(0.02, 0.3, 0.01) // m
  const D_MAX = 64 // px, the disparity search range
  const WIDTH = 640 // px
  const TARGETS = [
    { key: 'box', label: '箱子', X: -0.3, z: 1.5, tol: 0.1 },
    { key: 'door', label: '门框', X: 0.45, z: 3, tol: 0.25 },
    { key: 'wall', label: '墙', X: 0, z: 6, tol: 0.5 },
  ]
  const START = { f: 800, b: 0.06 }

  const measure = (target, { f, b }) => {
    const xl = (f * (target.X + b / 2)) / target.z
    const xr = (f * (target.X - b / 2)) / target.z
    const d = xl - xr
    const inView = Math.abs(xl) <= WIDTH / 2 && Math.abs(xr) <= WIDTH / 2
    const inRange = d <= D_MAX
    const near = (f * b) / (d + 1)
    const far = d > 1 ? (f * b) / (d - 1) : Infinity
    const spread = (target.z * target.z) / (f * b)
    const precise = far - target.z <= target.tol && target.z - near <= target.tol
    const why = !inView ? '出画' : !inRange ? '超出搜索' : !precise ? '误差太大' : ''
    return { xl, xr, d, inView, inRange, near, far, spread, precise, ok: inView && inRange && precise, why }
  }
  const solved = (rig) => TARGETS.every((t) => measure(t, rig).ok)

  const verify = () => {
    if (solved(START)) return 'the starting rig already passes'
    const good = FOCALS.flatMap((f) => BASELINES.map((b) => ({ f, b }))).filter(solved)
    if (!good.length) return 'no lens and baseline pass'
    // Wider is not simply better: the widest baseline must fail (the box leaves the search range).
    for (const f of FOCALS) if (solved({ f, b: BASELINES.at(-1) })) return `the widest baseline passes at f=${f}`
    if (measure(TARGETS[0], { f: 800, b: BASELINES.at(-1) }).inRange) return 'the near box stays matchable with the widest baseline'
    // Both ends bind: the far wall alone would take any wide baseline, the near box alone any narrow one.
    if (measure(TARGETS[2], START).ok) return 'the far wall is already precise at the start'
    // Only f·b matters: every lens has a passing baseline.
    for (const f of FOCALS) if (!good.some((g) => g.f === f)) return `no baseline works with f=${f}`
    return ''
  }

  return {
    id: '7-3',
    kind: 'board',
    board: 'OpticsRange',
    chapter: 7,
    title: '测距',
    brief: '给机器人的双目相机选镜头和基线，让三个障碍物都配得上，而且测得够准。',
    hint: 'z = f·b/d。基线越宽，远处越准；可近处的视差也越大，超过 64 px 的搜索范围就配不上了。',
    after: '深度误差 |Δz| ≈ z²/(f·b)·|Δd|：同样差一个像素，远两倍的东西误差大四倍。加宽基线或换长焦能让远处更准，却让近处的视差变大、超出搜索范围（两图外观也差得更多）。要紧的只是 f·b 的乘积，所以要在「近处配得上」和「远处够准」之间取一段。',
    requires: ['7-2'],
    unlocks: [],
    model: { FOCALS, BASELINES, D_MAX, WIDTH, TARGETS, START, measure, solved },
    verify,
  }
})()

export const nodes = {}
export const levels = [obscura, lambert, ranging]
