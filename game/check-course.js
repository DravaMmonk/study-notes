/* global process */
// node games/check-course.js — both games against the course rules (kit/course.js): every part a palette offers is a
// primitive or was built by a level that must be solved first, every built part is used again, one new part per
// level; and, for a course in eras, every level in an era, played on that era's machine, a topic in one world.
import { audit } from './kit/course.js'
import { course as vision, PRIMITIVES as VISION_START } from '../trace-viewer/src/game/levels/course.js'
import { course as graph, PRIMITIVES as GRAPH_START, topicProblems } from './state-graph/js/levels/course.js'

const RULES = {
  'not-built': 'offered, but no level builds it and it is not a primitive',
  'own-level': 'offered in the very level that builds it',
  'built-later': 'offered before the level that builds it',
  granted: 'handed out by a level (grants)',
  'many-new': 'more than one new part in one level',
  unused: 'built, but never offered again',
  unplaced: 'in no era',
  'no-topic': 'a machine whose era has no topic series yet',
  machine: 'played on a machine of a later era',
  'topic-world': 'a topic that spans several worlds',
  'challenge-new': 'a challenge that brings something new',
  'challenge-required': 'a level that requires a challenge',
  'challenge-naive': 'a challenge without a failing naive answer',
  'topic-finale': 'a topic level its finale’s board does not solve (the topic is not one problem growing)',
}

let total = 0
for (const [name, course, start, more] of [['视觉完备 Vision Complete', vision, VISION_START, () => []], ['状态之图 State Graph', graph, GRAPH_START, topicProblems]]) {
  const found = [...audit(course), ...more()]
  total += found.length
  console.log(`\n${name} — starts from ${start.join(', ')}: ${found.length ? `${found.length} problem${found.length > 1 ? 's' : ''}` : 'ok'}`)
  for (const [rule, text] of Object.entries(RULES)) {
    const hits = found.filter((f) => f.rule === rule)
    if (hits.length) console.log(`  ${text} (${hits.length}):\n    ${hits.map((f) => `${f.part}@${f.level}`).join('  ')}`)
  }
}
process.exit(total ? 1 : 0)
