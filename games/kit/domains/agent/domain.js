// The agent domain for the checks (games/DESIGN.md 6.3): its vocabulary, a game's spec from its content (the course,
// its levels in play order and the texts a player reads) and the domain's checks. Nothing here draws: the page's side
// is game.jsx.

import { vocabulary } from './vocabulary.js'
import { agentCourse } from './course.js'
import { validate } from './validate.js'

/** An agent game's spec, as npm run check reads one (../../engine/check.js). */
function spec(content) {
  const agent = agentCourse(content)
  return {
    id: content.id,
    domain: 'agent',
    title: content.title,
    course: agent.course,
    levels: agent.LEVELS,
    agent,
    texts: { chapters: agent.CHAPTERS, glossary: content.glossary.entries, issues: content.issues },
  }
}

export default { vocabulary, spec, validate }
