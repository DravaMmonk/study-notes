// An agent game on the shared shell (../../shell), from its content (games/DESIGN.md 6.3): the course (course.js)
// becomes the shell's game description, with the agent domain's screens (a hand session for chapter 0, a board run
// turn by turn after it), its parts box and its map art.
//
//   vocabulary.js what content may name; domain.js the checks' side of the domain (npm run check)
//   world.js    the repository, the issues and what files, listings and test reports put in a context
//   model.js    the stand-in model: the rules it follows
//   parts.js    the cards of a board and what each computes
//   board.js    a board, and a board read from blueprint text
//   run.js      the machine: the board once a turn, until it stops
//   hand.js     chapter 0's sessions, where the player is the loop
//   course.js   content read into levels, play order and the course the audit checks
//   ui/         the screens, the views of a context and a repository, the card catalog
//   validate.js every level's reference and naive answers (npm run check); agent.test.js the rules and boards as
//               text (npm test)
import { Cog, Hand } from 'lucide-react'
import './ui/agent.css'
import { defineGame } from '../../shell/index.js'
import { introductions, isCore } from '../../course.js'
import { tr } from '../../shell/i18n.js'
import { migrations } from '../../shell/saves.js'
import BoardScreen from './ui/BoardScreen.jsx'
import HandScreen from './ui/HandScreen.jsx'
import Hero from './ui/Hero.jsx'
import { CARDS } from './ui/catalog.js'
import { agentCourse } from './course.js'

/** content (../../engine/content.js): { id, title, kicker, lede, primitives, machines, eras, repos, issues, saves:
 *  migration steps (../../shell/saves.js), levels, glossary }. */
export default function agentGame(content) {
  const agent = agentCourse(content)
  const { LEVELS, CHAPTERS, course } = agent
  const primitives = [...introductions(course)].map(([type, at]) => ({ key: `part:${type}`, name: CARDS[type].name, desc: CARDS[type].desc, revisions: CARDS[type].revisions, icon: CARDS[type].icon, at }))
  const game = defineGame({
    id: content.id,
    title: content.title,
    kicker: content.kicker,
    lede: content.lede,
    Hero,
    glossary: content.glossary,
    chapters: CHAPTERS,
    core: (level) => isCore(course, level),
    levels: LEVELS.map((L, index) => ({
      id: L.id,
      index,
      source: L,
      fresh: L.adds,
      chapter: L.era,
      requires: L.requires,
      title: L.title,
      kind: L.kind,
      unlocks: [],
      brief: L.brief,
      after: L.after,
      note: L.note,
    })),
    progress: migrations(content.saves),
    intro: (level) => level.source.intro,
    kinds: {
      hand: { Screen: HandScreen, icon: Hand, label: { zh: '手动', en: 'By hand' } },
      board: { Screen: BoardScreen, icon: Cog, label: { zh: '机器', en: 'Machine' } },
    },
    parts: { all: primitives },
    // Fewer tokens is better.
    better: (score, best) => Boolean(score) && (!best || score.tokens < best.tokens),
    bestLabel: (best) => tr(`${best.tokens} token`, `${best.tokens} tokens`),
  })
  game.agent = agent
  return game
}
