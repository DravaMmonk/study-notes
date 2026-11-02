// A controlled scene (games/DESIGN.md 6.8): a few objects built of boxes, an optional opaque floor, a camera that
// orbits a point and one directional light. The domain renders it by casting a ray through every pixel of a small
// colour image (with shadows), and reads its facts off the same data: which objects are there, which show in the
// picture, how far each is. Nothing is inferred from pixels; a claim about a scene is checked against its facts.
//
//   scene    { size?: [w, h], camera: { yaw, pitch, distance, f, at? }, light: { azimuth, elevation, intensity?,
//              ambient? }, objects: [{ id, class, colour, boxes: [{ at: [x, y, z], size: [sx, sy, sz] }] }],
//              floor?: colour, background?: colour }
//
// Degrees for angles; y is up; a box is axis-aligned, `at` its centre. The camera sits `distance` from `at` (default
// [0, 0.5, 0]) at its yaw and pitch, looking at it; its image plane is f in front of it and one unit tall.
import { make } from './image.js'

const T = (zh, en) => ({ zh, en })

/** The named colours a scene paints with, and what each is called. */
export const COLOURS = {
  red: { rgb: [0.85, 0.2, 0.2], name: T('红', 'red') },
  green: { rgb: [0.25, 0.7, 0.3], name: T('绿', 'green') },
  blue: { rgb: [0.2, 0.35, 0.85], name: T('蓝', 'blue') },
  yellow: { rgb: [0.92, 0.82, 0.2], name: T('黄', 'yellow') },
  orange: { rgb: [0.95, 0.55, 0.15], name: T('橙', 'orange') },
  purple: { rgb: [0.55, 0.3, 0.72], name: T('紫', 'purple') },
  brown: { rgb: [0.55, 0.36, 0.2], name: T('棕', 'brown') },
  white: { rgb: [0.93, 0.93, 0.93], name: T('白', 'white') },
  grey: { rgb: [0.55, 0.55, 0.55], name: T('灰', 'grey') },
  black: { rgb: [0.12, 0.12, 0.12], name: T('黑', 'black') },
}

const rad = (deg) => (deg * Math.PI) / 180
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const unit = (a) => mul(a, 1 / Math.hypot(...a))

/** The camera's position and frame: { eye, forward, right, up, f }. */
export function cameraOf({ yaw = 0, pitch = 0, distance = 5, f = 1, at = [0, 0.5, 0] }) {
  const dir = [Math.cos(rad(pitch)) * Math.sin(rad(yaw)), Math.sin(rad(pitch)), Math.cos(rad(pitch)) * Math.cos(rad(yaw))]
  const eye = add(at, mul(dir, distance))
  const forward = unit(sub(at, eye))
  const right = unit(cross(forward, [0, 1, 0]))
  return { eye, forward, right, up: cross(right, forward), f }
}

/** Where a ray from `o` along `d` first meets a box: { t, normal } or null (slab method; the normal faces the ray). */
function hitBox(o, d, { at, size }) {
  let near = -Infinity
  let far = Infinity
  let axis = -1
  for (let a = 0; a < 3; a++) {
    const lo = at[a] - size[a] / 2
    const hi = at[a] + size[a] / 2
    if (Math.abs(d[a]) < 1e-12) {
      if (o[a] < lo || o[a] > hi) return null
      continue
    }
    const t1 = Math.min((lo - o[a]) / d[a], (hi - o[a]) / d[a])
    const t2 = Math.max((lo - o[a]) / d[a], (hi - o[a]) / d[a])
    if (t1 > near) { near = t1; axis = a }
    far = Math.min(far, t2)
    if (near > far) return null
  }
  if (near <= 1e-9 || axis < 0) return null
  const normal = [0, 0, 0]
  normal[axis] = d[axis] > 0 ? -1 : 1
  return { t: near, normal }
}

/** The first thing a ray meets: { t, normal, object (index, or -1 for the floor) } or null. */
function cast(scene, o, d) {
  let best = null
  scene.objects.forEach((obj, k) => {
    for (const box of obj.boxes) {
      const hit = hitBox(o, d, box)
      if (hit && (!best || hit.t < best.t)) best = { ...hit, object: k }
    }
  })
  if (scene.floor && d[1] < -1e-12) {
    const t = -o[1] / d[1]
    if (t > 1e-9 && (!best || t < best.t)) best = { t, normal: [0, 1, 0], object: -1 }
  }
  return best
}

const rgbOf = (colour, fallback) => COLOURS[colour]?.rgb ?? fallback

/**
 * The scene drawn: { image (a colour image), at (per pixel, the index of the object seen, -1 for the floor, null for
 * the background) }. Lambert shading under the light, with shadows, plus ambient light.
 */
export function render(scene) {
  const [w, h] = scene.size ?? [48, 36]
  const cam = cameraOf(scene.camera)
  const { azimuth = 30, elevation = 50, intensity = 0.8, ambient = 0.25 } = scene.light ?? {}
  const toLight = [Math.cos(rad(elevation)) * Math.sin(rad(azimuth)), Math.sin(rad(elevation)), Math.cos(rad(elevation)) * Math.cos(rad(azimuth))]
  const background = rgbOf(scene.background, [0.82, 0.86, 0.9])
  const at = new Array(w * h).fill(null)
  const pixelSize = 1 / h
  const image = make(w, h, 3, 0)
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const u = (px + 0.5 - w / 2) * pixelSize
      const v = (h / 2 - py - 0.5) * pixelSize
      const d = unit(add(add(mul(cam.forward, cam.f), mul(cam.right, u)), mul(cam.up, v)))
      const hit = cast(scene, cam.eye, d)
      let rgb = background
      if (hit) {
        at[py * w + px] = hit.object
        const base = hit.object < 0 ? rgbOf(scene.floor, [0.7, 0.7, 0.7]) : rgbOf(scene.objects[hit.object].colour, [0.5, 0.5, 0.5])
        const point = add(cam.eye, mul(d, hit.t))
        const facing = Math.max(0, dot(hit.normal, toLight))
        const lit = facing > 0 && !cast(scene, add(point, mul(hit.normal, 1e-6)), toLight)
        const k = ambient + (lit ? intensity * facing : 0)
        rgb = base.map((c) => c * k)
      }
      for (let ch = 0; ch < 3; ch++) image.data[(py * w + px) * 3 + ch] = rgb[ch]
    }
  }
  return { image, at }
}

/**
 * A scene's facts: each object's { id, class, colour, visible (some pixel shows it), pixels, depth (its centre's
 * distance along the camera's axis), height, centre }.
 */
export function factsOf(scene) {
  const { at } = render(scene)
  const cam = cameraOf(scene.camera)
  return scene.objects.map((obj, k) => {
    const lo = [0, 1, 2].map((a) => Math.min(...obj.boxes.map((b) => b.at[a] - b.size[a] / 2)))
    const hi = [0, 1, 2].map((a) => Math.max(...obj.boxes.map((b) => b.at[a] + b.size[a] / 2)))
    const centre = lo.map((v, a) => (v + hi[a]) / 2)
    const pixels = at.filter((x) => x === k).length
    return { id: obj.id, class: obj.class, colour: obj.colour, visible: pixels > 0, pixels, depth: dot(sub(centre, cam.eye), cam.forward), height: hi[1] - lo[1], centre }
  })
}

/** Whether two scenes give the same picture (within tol on every value). */
export function sameImage(a, b, tol = 1e-6) {
  const [x, y] = [render(a).image, render(b).image]
  return x.w === y.w && x.h === y.h && x.data.every((v, k) => Math.abs(v - y.data[k]) <= tol)
}

/** A scene with every part of it but `vary` the same as another's: the fields that differ between two scenes. */
export function differences(a, b) {
  const keys = ['camera', 'light', 'objects', 'floor', 'background', 'size']
  return keys.filter((k) => JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null))
}

