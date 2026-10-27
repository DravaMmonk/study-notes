// An agent game on the shared shell (../../shell): its spec becomes the shell's game description, with the agent
// domain's screens (a hand session for chapter 0, a board run turn by turn after it), its parts box and its map art.
//
//   world.js    the repository, the issues and what files, listings and test reports put in a context
//   model.js    the stand-in model: the rules it follows
//   parts.js    the cards of a board and what each computes
//   run.js      the machine: the board once a turn, until it stops
//   hand.js     chapter 0's sessions, where the player is the loop
//   course.js   a spec read into levels, play order and the course the audit checks
//   build.js    boards written compactly in a spec
//   ui/         the screens, the views of a context and a repository, the card catalog
//   validate.js every level's reference and naive answers (npm run check); agent.test.js the rules (npm test)
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

/** spec: { id, title, kicker, lede, agent (agentCourse's result), glossary, saves: migration steps (../../shell/saves.js) } */
export function defineAgentGame(spec) {
  const { LEVELS, CHAPTERS, course } = spec.agent
  const primitives = [...introductions(course)].map(([type, at]) => ({ key: `part:${type}`, name: CARDS[type].name, desc: CARDS[type].desc, revisions: CARDS[type].revisions, icon: CARDS[type].icon, at }))
  const game = defineGame({
    id: spec.id,
    title: spec.title,
    kicker: spec.kicker,
    lede: spec.lede,
    Hero,
    html: true,
    glossary: spec.glossary,
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
    progress: migrations(spec.saves ?? []),
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
  game.agent = spec.agent
  return game
}
