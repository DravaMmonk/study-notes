/* global process */
// npm run deps -- <game id> [--dot] [--levels] — a game's part dependency graph, drawn from its course as data
// (games/DESIGN.md 7, step 5): every part with where it comes in (the levels bringing a primitive in, the levels
// building a built part, each in its era and on its branch), what each built part is made of (the parts its building
// level's reference answer uses) and the levels whose reference answers use it. Printed as Mermaid, or as DOT with
// --dot; --levels draws the levels as well, each wired from the parts its reference uses and to the parts it brings.
import { pathToFileURL } from 'node:url'
import { introductions } from '../course.js'
import { readContent } from './content-node.js'

const OPTIONAL = ['intro', 'step', 'finale', 'challenge']

/**
 * The graph of a course (../course.js defineCourse): { eras: [{ id, title }], parts: [{ key, built, at, era, branch,
 * optional, uses }], made: [{ from, to }], levels: [{ id, era, role, branch, uses, brings }] }. A part is every
 * primitive brought in and every built part, but none that stays where it is brought (local) or is a level's own given
 * (concept null); `at` the levels bringing it in or building it, in play order; `made` a built part's pieces.
 */
export function dependencies(course) {
  const placed = course.levels.filter((l) => !course.plan || course.plan.place.has(l.id))
  const place = (id) => course.plan?.place.get(id) ?? {}
  const keep = (p) => !course.local(p) && course.concept(p) !== null
  const intro = introductions(course)
  const keys = [...new Set([...intro.keys(), ...placed.flatMap((l) => course.builds(l))])].filter(keep)
  const used = (l) => [...new Set((course.needed(l) ?? []).filter((p) => keys.includes(p)))]
  const parts = keys.map((key) => {
    const built = Boolean(course.builder(key))
    const at = built ? placed.filter((l) => course.builds(l).includes(key)).map((l) => l.id) : intro.get(key) ?? []
    const first = place(at[0])
    return { key, built, at, era: first.era ?? null, branch: first.topic ?? first.branch ?? null, optional: OPTIONAL.includes(first.role), uses: placed.filter((l) => used(l).includes(key)).map((l) => l.id) }
  })
  const made = parts.filter((p) => p.built).flatMap((p) => [...new Set(p.at.flatMap((id) => used(course.levels[course.index.get(id)])))].filter((q) => q !== p.key).map((from) => ({ from, to: p.key })))
  const levels = placed.map((l) => {
    const at = place(l.id)
    return { id: l.id, era: at.era ?? null, role: at.role ?? null, branch: at.topic ?? at.branch ?? null, uses: used(l), brings: parts.filter((p) => p.at.includes(l.id)).map((p) => p.key) }
  })
  const eras = (course.eras ?? [{ id: null }]).map((e) => ({ id: e.id ?? null, title: textOf(e.title ?? e.chapter?.title) }))
  return { eras, parts, made, levels }
}

const textOf = (t) => (t === undefined || t === null ? '' : typeof t === 'object' ? t.zh ?? t.en ?? '' : String(t))
const safe = (s) => String(s).replace(/[^A-Za-z0-9_]/g, '_')
/** One id per part and per level, in the format's own alphabet. */
function ids(graph) {
  const out = new Map()
  graph.parts.forEach((p, k) => out.set(`part:${p.key}`, `p${k}_${safe(p.key)}`))
  graph.levels.forEach((l, k) => out.set(`level:${l.id}`, `l${k}_${safe(l.id)}`))
  return out
}
const partLabel = (p) => `${p.key} · ${p.at.join(' ') || '—'}${p.branch ? ` (${p.branch})` : ''} · used ${p.uses.length}`
const levelLabel = (l) => `${l.id}${l.role && l.role !== 'foundation' && l.role !== 'practice' ? ` ${l.role}` : ''}${l.branch ? ` (${l.branch})` : ''}`

/** The graph as a Mermaid flowchart, an era a subgraph; a built part drawn as a subroutine, one built on an optional level dashed. */
export function mermaid(graph, { levels = false } = {}) {
  const id = ids(graph)
  const q = (s) => `"${String(s).replace(/"/g, '#quot;')}"`
  const out = ['flowchart LR']
  for (const era of graph.eras) {
    const inside = [
      ...graph.parts.filter((p) => p.era === era.id).map((p) => `    ${id.get(`part:${p.key}`)}${p.built ? `[[${q(partLabel(p))}]]` : `(${q(partLabel(p))})`}`),
      ...(levels ? graph.levels.filter((l) => l.era === era.id).map((l) => `    ${id.get(`level:${l.id}`)}${l.role === 'challenge' ? `{{${q(levelLabel(l))}}}` : `[${q(levelLabel(l))}]`}`) : []),
    ]
    if (!inside.length) continue
    out.push(`  subgraph era_${safe(era.id)}[${q([era.id, era.title].filter((x) => x !== null && x !== '').join(' · '))}]`, ...inside, '  end')
  }
  const part = new Map(graph.parts.map((p) => [p.key, p]))
  for (const m of graph.made) out.push(`  ${id.get(`part:${m.from}`)} ${part.get(m.to).optional ? '-.->' : '-->'} ${id.get(`part:${m.to}`)}`)
  if (levels) for (const l of graph.levels) {
    for (const p of l.uses) out.push(`  ${id.get(`part:${p}`)} -.- ${id.get(`level:${l.id}`)}`)
    for (const p of l.brings) out.push(`  ${id.get(`level:${l.id}`)} ==> ${id.get(`part:${p}`)}`)
  }
  return out.join('\n')
}

/** The graph in DOT, an era a cluster; a built part boxed, one built on an optional level dashed. */
export function dot(graph, { levels = false } = {}) {
  const id = ids(graph)
  const q = (s) => JSON.stringify(String(s))
  const out = ['digraph parts {', '  rankdir=LR;', '  node [fontname="sans-serif"];']
  for (const era of graph.eras) {
    const inside = [
      ...graph.parts.filter((p) => p.era === era.id).map((p) => `    ${id.get(`part:${p.key}`)} [label=${q(partLabel(p))}, shape=${p.built ? 'box' : 'ellipse'}${p.optional ? ', style=dashed' : ''}];`),
      ...(levels ? graph.levels.filter((l) => l.era === era.id).map((l) => `    ${id.get(`level:${l.id}`)} [label=${q(levelLabel(l))}, shape=${l.role === 'challenge' ? 'hexagon' : 'note'}];`) : []),
    ]
    if (!inside.length) continue
    out.push(`  subgraph cluster_${safe(era.id)} {`, `    label=${q([era.id, era.title].filter((x) => x !== null && x !== '').join(' · '))};`, ...inside, '  }')
  }
  for (const m of graph.made) out.push(`  ${id.get(`part:${m.from}`)} -> ${id.get(`part:${m.to}`)};`)
  if (levels) for (const l of graph.levels) {
    for (const p of l.uses) out.push(`  ${id.get(`part:${p}`)} -> ${id.get(`level:${l.id}`)} [style=dotted, arrowhead=none];`)
    for (const p of l.brings) out.push(`  ${id.get(`level:${l.id}`)} -> ${id.get(`part:${p}`)} [penwidth=2];`)
  }
  out.push('}')
  return out.join('\n')
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  const game = args.find((a) => !a.startsWith('--'))
  if (!game) {
    console.error('usage: npm run deps -- <game id> [--dot] [--levels]')
    process.exit(1)
  }
  const content = readContent(game)
  const domain = (await import(`../domains/${content.domain}/domain.js`)).default
  const graph = dependencies(domain.spec(content).course)
  const levels = args.includes('--levels')
  console.log(args.includes('--dot') ? dot(graph, { levels }) : mermaid(graph, { levels }))
}
