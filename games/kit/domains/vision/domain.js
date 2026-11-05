// The vision domain for the checks (games/DESIGN.md 6.3, 6.8): its vocabulary, a game's spec from its content (the
// circuit base's, ../../engine/circuit-domain.js circuitSpec), the domain's checks, its play hook for blind sessions
// and what makes a kept answer stale. Nothing here draws: the page's side is game.jsx.
import { parse } from '../../circuit/text.js'
import { circuitSpec } from '../../engine/circuit-domain.js'
import { vocabulary } from './vocabulary.js'
import { visionCourse } from './course.js'
import { validate } from './validate.js'
import { arithmeticBlueprint } from './tooling.js'
import { play } from './play.js'

// A board's text as the board it writes: its statements and wires, their lines aside and a grouped input written as
// its group's output either way (`left` or `weights.left`).
const written = (lines, task) => {
  if (!lines) return null
  try {
    const { statements, wires } = parse(arithmeticBlueprint(lines).join('\n'))
    const group = (name) => task.inputGroups?.find((g) => g.inputs.includes(name))
    return { statements: statements.map(({ line: _line, ...s }) => s), wires: wires.map(({ line: _line, ...w }) => ({ ...w, from: group(w.from) ? `${group(w.from).name}#${w.from}` : w.from })) }
  } catch {
    return lines
  }
}

// Changed puzzle contracts or reference programs invalidate kept answers; wording changes preserve them.
const contract = (level) => level.tasks.map((t) => ({
  id: t.id, kind: t.kind,
  ...(t.kind === 'circuit' ? { configurations: t.configurations, inputs: t.inputs.map((p) => [p.name, p.type]), outputs: t.outputs.map((p) => p.name), tests: t.tests, hidden: t.hidden, solution: written(t.solution, t), starter: written(t.starter, t) }
    : t.kind === 'grid' ? { image: t.image, ask: t.ask } : t.kind === 'bench' ? { bench: t.bench } : { rounds: t.rounds }),
}))
const changes = { stale: (before, after) => JSON.stringify(contract(before)) !== JSON.stringify(contract(after)) }

export default { vocabulary, spec: circuitSpec('vision', visionCourse), validate, play, changes }
