// Pure model for the Lambertian studio: one lamp far enough away to count as a single direction L,
// two matte cards with normals N. Each reads I = I_L · R · max(0, N·L) = I_L · R · cos θ.
// Card A lies flat; card B is a brighter card leaned back 60° toward +x. With the lamp overhead the
// dark card facing the light and the bright card turned half away give the same reading.

export const TILT = 60 // degrees, card B's lean
export const ALBEDO_B = 0.8
export const ALBEDOS = [0.2, 0.4, 0.6] // card A
export const POWERS = [0.5, 1]
export const SWING = [-75, 75] // lamp angle from straight up, + toward card B's side

const rad = (deg) => (deg * Math.PI) / 180

export const lightOf = (angle) => [Math.sin(rad(angle)), 0, Math.cos(rad(angle))]
export const NORMAL_A = [0, 0, 1]
export const NORMAL_B = [Math.sin(rad(TILT)), 0, Math.cos(rad(TILT))]

export function reading(normal, albedo, power, angle) {
  const L = lightOf(angle)
  const cos = normal[0] * L[0] + normal[1] * L[1] + normal[2] * L[2]
  return { theta: (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI, cos, value: power * albedo * Math.max(0, cos) }
}

export function scene({ angle, power, albedo }) {
  return { a: reading(NORMAL_A, albedo, power, angle), b: reading(NORMAL_B, ALBEDO_B, power, angle) }
}
