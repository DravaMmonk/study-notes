// A syntax game on the shared shell (../../shell), from its content (games/DESIGN.md 6.3): the course (course.js)
// becomes the shell's game description, with the syntax domain's level screen (a long sentence taken apart: modifiers
// folded onto their words, the skeleton marked), its components box (the roles and constructions), its map art (the
// composing stick, games/stick) and its save migrations.
//
//   vocabulary.js       what a syntax game's content may name
//   course.js           content read into levels, play order and the course the audit checks
//   model/sentence.js   tokens, folds and roles; an analysis checked against the answer
//   model/parts.js      the roles of the skeleton and the constructions a modifier is folded as
//   items/              the vocabulary items content calls (save migrations)
//   ui/                 the level screen (desktop and phone) and the map's picture
//   domain.js           the vocabulary, spec and checks for npm run check (validate.js)
//   syntax.test.js      folding, refusals, the check, the content contract (npm test)
import { BookOpenText, CornerDownRight, Quote, Rows3, SquareStack } from 'lucide-react'
import '../../strip/strip.css'
import './ui/syntax.css'
import { defineGame } from '../../shell/index.js'
import { introductions, isCore } from '../../course.js'
import { migrations } from '../../shell/saves.js'
import { tr } from '../../shell/i18n.js'
import Analyze from './ui/Analyze.jsx'
import Hero from './ui/Hero.jsx'
import { skeleton } from './model/sentence.js'
import { ROLES, TYPES } from './model/parts.js'
import { syntaxCourse } from './course.js'

const ICON = { 'role:subj': Rows3, 'role:verb': Rows3, 'role:obj': Rows3, 'role:comp': Rows3, pp: CornerDownRight, rel: Quote }
/** The fields of an object that hold something. */
const defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))
const textOf = (key) => (key.startsWith('role:') ? ROLES[key.slice(5)] : TYPES[key])

/** content (../../engine/content.js): { id, title, kicker, lede, eras, saves: migration steps
 *  (../../shell/saves.js), levels, glossary }. */
export default function syntaxGame(content) {
  const { LEVELS, CHAPTERS, course } = syntaxCourse(content)
  const parts = [...introductions(course)].map(([key, at]) => ({ key, name: textOf(key).name, desc: textOf(key).desc, icon: ICON[key] ?? SquareStack, at }))
  const named = new Map(parts.map((p) => [p.key, p]))
  return defineGame({
    id: content.id,
    title: content.title,
    kicker: content.kicker,
    lede: content.lede,
    Hero,
    glossary: content.glossary,
    chapters: CHAPTERS,
    core: (level) => isCore(course, level),
    // A level is its tasks (../../engine/tasks.js): the shell plays each as the level with the task's fields over it,
    // the screen reading the task as the course read it (`source`).
    levels: LEVELS.map((L, index) => ({
      id: L.id,
      index,
      source: L,
      chapter: L.era,
      requires: L.requires,
      title: L.title,
      kind: 'analyze',
      palette: L.palette,
      afterTitle: L.debrief.title,
      after: L.debrief.body,
      note: L.debrief.note,
      tasks: L.tasks.map((t) => ({ key: t.id, ...defined({ step: t.step, brief: t.brief, hint: t.hint, intro: t.intro, after: t.after }), source: t })),
    })),
    progress: migrations(content.saves),
    intro: (level) => level.source.intro,
    // What a level brings in: the roles and constructions it adds, named once it is passed.
    unlocked: (level) => (level.source.adds ?? []).map((key) => named.get(key)).filter(Boolean).map((p) => ({ label: p.name, icon: p.icon })),
    // The skeleton the sentence leaves once every modifier is folded.
    passed: (level) => <p className="sx-skeleton"><small>{tr('主干', 'Skeleton')}</small>{skeleton(level.source.tasks.at(-1).gold)}</p>,
    parts: { all: parts },
    kinds: { analyze: { Screen: Analyze, icon: BookOpenText, label: { zh: '拆句', en: 'Take apart' } } },
    // Fewer checks is better; right the first time earns the ★.
    better: (score, best) => Boolean(score) && (!best || score.tries < best.tries),
    bestLabel: (best) => tr(`对照 ${best.tries} 次`, `${best.tries} check${best.tries === 1 ? '' : 's'}`),
  })
}
