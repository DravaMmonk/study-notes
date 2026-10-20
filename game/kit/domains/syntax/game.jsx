// A syntax game on the shared shell (../../shell): its spec becomes the shell's game description, with the syntax
// domain's level screen (a sentence on the circuit editor, checked against a meaning graph) and its map art.
//
//   engine/grammar.js   categories, frames, roles, agreement, case: the rules a wire must keep
//   engine/lexicon.js   a game's words, read for the grammar
//   engine/sentence.js  a board read as a clause, said as a sentence, checked against a level's meaning
//   engine/parts.js     the parts as the circuit editor reads them
//   engine/course.js    a spec read into levels, play order and the course the audit checks
//   ui/                 the level screen (desktop and phone), the meaning graph, the sentence, the map's picture
//   art.js              the same picture for the games hub (a plain module, no React)
//   validate.js         every level's reference answer and traps (npm run check)
import { BookOpenText } from 'lucide-react'
import './ui/syntax.css'
import { defineGame } from '../../shell/index.js'
import { tr } from '../../shell/i18n.js'
import Hero from './ui/Hero.jsx'
import Screen from './ui/Screen.jsx'

/** spec: { id, title, kicker, lede, syntax (syntaxCourse's result), glossary } */
export function defineSyntaxGame(spec) {
  const { LEVELS, CHAPTERS, lex } = spec.syntax
  const game = defineGame({
    id: spec.id,
    title: spec.title,
    kicker: spec.kicker,
    lede: spec.lede,
    Hero,
    html: true,
    glossary: spec.glossary,
    chapters: CHAPTERS,
    levels: LEVELS.map((L, index) => ({
      id: L.id,
      index,
      source: L,
      chapter: L.era,
      requires: L.requires,
      title: L.title,
      brief: L.brief,
      kind: 'sentence',
      palette: L.palette,
      afterTitle: L.debrief.title,
      after: L.debrief.body,
      note: L.debrief.note,
    })),
    progress: { version: 1 },
    intro: (level) => level.source.intro,
    kinds: { sentence: { Screen, icon: BookOpenText, label: { zh: '句子', en: 'Sentence' } } },
    // Fewer words is better; a ★ beats no ★.
    better: (score, best) => Boolean(score) && (!best || (score.star && !best.star) || (score.star === best.star && score.words < best.words)),
    bestLabel: (best) => tr(`${best.words} 个词`, `${best.words} words`),
  })
  game.syntax = { lex }
  return game
}
