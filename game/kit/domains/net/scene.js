// A level of 《从一根线开始》 drawn without a browser (domain.js `scene`, for the MCP's render and the studio): each test
// as the waveform draws it — a lane per wire in (what arrives) and per wire out or output wanted tick by tick — one
// bit a tick, up for 1. Colours are the kit's tokens where the SVG sits in a page that has them.
import { checked } from './run.js'

const TICK = 6
const LANE = 20
const GAP = 12
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
const name = (x) => esc(x.label?.en ?? x.name)

/** The SVG of level `id` of a game's spec on the net domain, or null when it has no such level. */
export function scene(spec, id) {
  const level = spec.levels.find((l) => l.id === id)
  if (!level) return null
  const blocks = level.tests.map((test) => {
    const want = level.want(test)
    return [
      ...(level.wires?.in ?? []).map((w) => ({ label: name(w), ticks: test.wires[w.name] })),
      ...checked(level).filter((o) => want[o.name]?.ticks).map((o) => ({ label: `${name(o)} ✓`, ticks: want[o.name].ticks, wanted: true })),
    ]
  })
  const longest = Math.max(1, ...level.tests.map((t) => t.ticks))
  const width = 90 + longest * TICK + 10
  let y = 6
  const rows = []
  for (const lanes of blocks) {
    for (const lane of lanes) {
      const top = y + 3
      const path = lane.ticks.map((v, i) => (v === 0 || v === 1 ? `M${90 + i * TICK} ${top + (v ? 0 : 12)} h${TICK}` : '')).join(' ')
      const values = lane.ticks.map((v, i) => (v !== 0 && v !== 1 && v !== null && v !== undefined ? `<text x="${90 + i * TICK}" y="${top + 10}" class="net-v">${esc(v === true ? 'y' : v === false ? 'n' : v)}</text>` : '')).join('')
      rows.push(`<text x="4" y="${top + 11}" class="net-l">${lane.label}</text><path d="${path}" class="${lane.wanted ? 'net-w' : 'net-r'}"/>${values}`)
      y += LANE
    }
    y += GAP
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${y}" width="${width}" height="${y}"><style>.net-r{fill:none;stroke:var(--ink,#282824);stroke-width:1.4}.net-w{fill:none;stroke:var(--accent,#c98f22);stroke-width:1.4}.net-l,.net-v{fill:var(--muted,#7a7970);font:10px var(--mono,ui-monospace,monospace)}</style>${rows.join('')}</svg>`
}
