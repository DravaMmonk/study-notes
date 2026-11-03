// The vision domain for the checks (games/DESIGN.md 6.3, 6.8): its vocabulary, a game's spec from its content (the
// course, its levels in play order, the texts a player reads, its boards as blueprint text and the boards its built
// parts run), the domain's checks and its play hook for blind sessions. Nothing here draws: the page's side is game.jsx.
import { vocabulary } from './vocabulary.js'
import { visionCourse } from './course.js'
import { validate } from './validate.js'
import { play } from './play.js'

/** A vision game's spec, as npm run check reads one (../../engine/check.js). */
function spec(content) {
  const vision = visionCourse(content)
  return {
    id: content.id,
    domain: 'vision',
    title: content.title,
    course: vision.course,
    levels: vision.LEVELS,
    vision,
    blueprints: vision.blueprints,
    syncOwn: vision.syncOwn,
    texts: { chapters: vision.CHAPTERS, glossary: content.glossary.entries },
  }
}

// Changed puzzle contracts or reference programs invalidate kept answers; wording changes preserve them.
const contract = (level) => (level.tasks ?? []).map((t) => ({
  id: t.id, kind: t.kind,
  ...(t.kind === 'circuit' ? { inputs: t.inputs.map((p) => p.name), outputs: t.outputs.map((p) => p.name), tests: t.tests, hidden: t.hidden, solution: t.solution }
    : t.kind === 'grid' ? { image: t.image, ask: t.ask } : t.kind === 'bench' ? { bench: t.bench } : { rounds: t.rounds }),
}))
const changes = { stale: (before, after) => JSON.stringify(contract(before)) !== JSON.stringify(contract(after)) }

export default { vocabulary, spec, validate, play, changes }
