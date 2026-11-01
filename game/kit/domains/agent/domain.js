// The agent domain for the checks (games/DESIGN.md 6.3): its vocabulary, a game's spec from its content (the course,
// its levels in play order and the texts a player reads), the domain's checks, and its play hook for blind sessions
// (play.js). Nothing here draws: the page's side is game.jsx.

import { vocabulary } from './vocabulary.js'
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

// Its saves name no migration items: the shell's ops as written.
const saves = (steps) => steps

export default { vocabulary, spec, validate, play, saves }
