// Numbers that are a multiple of π, as the waves need them: shown as π, 2π, π/2, −3π/4 …, typed the same way (or
// with "pi"), and made with a π key that turns the number already there into that many π.

const DENOMINATORS = [1, 2, 3, 4, 6, 8]

/** "2π", "π/2", "−3π/4" for an exact multiple of π (not 0), else null. */
export function piText(v) {
  if (!Number.isFinite(v) || v === 0) return null
  for (const n of DENOMINATORS) {
    const k = Math.round((v * n) / Math.PI)
    // Within 32-bit float error, since values pass through image data.
    if (k && Math.abs(v - (k * Math.PI) / n) < 1e-6 * Math.max(1, Math.abs(v))) return `${k < 0 ? '−' : ''}${Math.abs(k) === 1 ? '' : Math.abs(k)}π${n === 1 ? '' : `/${n}`}`
  }
  return null
}

/** The number in "π", "2π", "-pi/2", "1.5π" (any minus sign), or null when the text is not a multiple of π. */
export function parsePi(text) {
  const m = text.trim().replace(/[−－–—]/g, '-').replace(/pi/i, 'π').match(/^(-?)(\d*\.?\d*)π(?:\/(\d+(?:\.\d+)?))?$/)
  if (!m) return null
  const k = m[2] === '' ? 1 : Number(m[2])
  const n = m[3] ? Number(m[3]) : 1
  return Number.isFinite(k) && n ? ((m[1] ? -1 : 1) * k * Math.PI) / n : null
}

/** What the π key makes of a value: that many π, or π itself when the value is 0 or already a multiple of π. */
export const timesPi = (v) => (!v || piText(v) ? Math.PI : v * Math.PI)
