// A syntax game on the shared shell (../../shell): its spec becomes the shell's game description, with the syntax
// domain's level screen (a long sentence taken apart: modifiers folded onto their words, the skeleton marked) and its
// map art (the composing stick, games/stick).
//
//   engine/sentence.js  tokens, folds and roles; an analysis checked against the answer
//   engine/types.js     the roles of the skeleton and the constructions a modifier is folded as
//   engine/course.js    a spec read into levels, play order and the course the audit checks
//   ui/                 the level screen (desktop and phone) and the map's picture
//   validate.js         every sentence's answer is sound and passes (npm run check)
//   syntax.test.js      folding, refusals, the check (npm test)
import { BookOpenText, CornerDownRight, Quote, Rows3, SquareStack } from 'lucide-react'
import '../../strip/strip.css'
import './ui/syntax.css'
import { defineGame } from '../../shell/index.js'
import { introductions, isCore } from '../../course.js'
import { migrations } from '../../shell/saves.js'
import { tr } from '../../shell/i18n.js'
import Analyze from './ui/Analyze.jsx'
import Hero from './ui/Hero.jsx'
import { skeleton } from './engine/sentence.js'
import { ROLES, TYPES } from './engine/types.js'

const ICON = { 'role:subj': Rows3, 'role:verb': Rows3, 'role:obj': Rows3, 'role:comp': Rows3, pp: CornerDownRight, rel: Quote }
const textOf = (key) => (key.startsWith('role:') ? ROLES[key.slice(5)] : TYPES[key])

/** spec: { id, title, kicker, lede, syntax (syntaxCourse's result), glossary, saves: migration steps (../../shell/saves.js) } */
export function defineSyntaxGame(spec) {
  const { LEVELS, CHAPTERS, course } = spec.syntax
  const parts = [...introductions(course)].map(([key, at]) => ({ key, name: textOf(key).name, desc: textOf(key).desc, icon: ICON[key] ?? SquareStack, at }))
  const named = new Map(parts.map((p) => [p.key, p]))
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
      chapter: L.era,
      requires: L.requires,
      title: L.title,
      brief: L.brief,
      kind: 'analyze',
      palette: L.palette,
      afterTitle: L.debrief.title,
      after: L.debrief.body,
      note: L.debrief.note,
      tasks: L.tasks?.map((t) => ({ kind: 'analyze', step: t.step, source: t, brief: t.brief, after: t.after, intro: t.intro })),
    })),
    progress: migrations(spec.saves ?? []),
    intro: (level) => level.source.intro,
    // What a level brings in: the roles and constructions it adds, named once it is passed.
    unlocked: (level) => (level.source.adds ?? []).map((key) => named.get(key)).filter(Boolean).map((p) => ({ label: p.name, icon: p.icon })),
    // The skeleton the sentence leaves once every modifier is folded.
    passed: (level) => {
      const last = level.source.tasks ? level.source.tasks[level.source.tasks.length - 1] : level.source
      return <p className="sx-skeleton"><small>{tr('主干', 'Skeleton')}</small>{skeleton(last.gold)}</p>
    },
    parts: { all: parts },
    kinds: { analyze: { Screen: Analyze, icon: BookOpenText, label: { zh: '拆句', en: 'Take apart' } } },
    // Fewer checks is better; right the first time earns the ★.
    better: (score, best) => Boolean(score) && (!best || score.tries < best.tries),
    bestLabel: (best) => tr(`对照 ${best.tries} 次`, `${best.tries} check${best.tries === 1 ? '' : 's'}`),
  })
  game.syntax = { course }
  return game
}
