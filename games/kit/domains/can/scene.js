// A bus level drawn without a browser (domain.js `scene`, for the MCP's render and the studio): each test's bus, task
// by task, as a waveform, one bit a tick — up for recessive (1), down for dominant (0) — with every frame's start
// marked by its identifier. Colours are the kit's tokens where the SVG sits in a page that has them.

const TICK = 3
const ROW = 34
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
const hex = (n) => `0x${n.toString(16)}`

/** The SVG of level `id` of a bus game's spec, or null when it has no such level. */
export function scene(spec, id) {
  const tasks = spec.circuit.played.get(id)
  if (!tasks || tasks.some((task) => task.kind === 'paper')) return null
  const tests = tasks.flatMap((task) => task.tests)
  const width = Math.max(...tests.map((t) => t.bus.bits.length)) * TICK + 70
  const height = tests.length * ROW + 10
  const rows = tests.map((t, k) => {
    const top = k * ROW + 12
    const y = (bit) => top + (bit ? 0 : 14)
    const path = t.bus.bits.map((bit, i) => `${i ? 'L' : 'M'}${60 + i * TICK} ${y(bit)} L${60 + (i + 1) * TICK} ${y(bit)}`).join(' ')
    const marks = t.bus.frames.map((f) => `<line x1="${60 + f.at * TICK}" y1="${top - 4}" x2="${60 + f.at * TICK}" y2="${top + 18}" class="bus-sof"/><text x="${62 + f.at * TICK}" y="${top - 2}" class="bus-id">${esc(hex(f.id))}</text>`).join('')
    return `<text x="4" y="${top + 11}" class="bus-label">${k + 1}</text><path d="${path}" class="bus-line"/>${marks}`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><style>.bus-line{fill:none;stroke:var(--ink,#282824);stroke-width:1.4}.bus-sof{stroke:var(--accent,#c98f22)}.bus-id,.bus-label{fill:var(--muted,#7a7970);font:10px var(--mono,ui-monospace,monospace)}</style>${rows.join('')}</svg>`
}
