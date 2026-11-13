// The agent domain for the checks (games/DESIGN.md 6.3): its vocabulary, a game's spec from its content (the course,
// its levels in play order and the texts a player reads), the domain's checks, and its play hook for blind sessions
// (play.js). Nothing here draws: the page's side is game.js.

import { vocabulary } from './vocabulary.js'
import { partNames } from '../../engine/trays.js'
import { agentCourse } from './course.js'
import { validate } from './validate.js'
import { play } from './play.js'

/** An agent game's spec, as the checks read one (../../engine/checks.js). */
function spec(content) {
  const agent = agentCourse(content)
  return {
    id: content.id,
    domain: 'agent',
    title: content.title,
    course: agent.course,
    levels: agent.LEVELS,
    agent,
    blueprints: agent.blueprints,
    texts: { chapters: agent.CHAPTERS, glossary: content.glossary.entries, issues: content.issues },
  }
}

export default { vocabulary, names: () => partNames(), spec, validate, play }
