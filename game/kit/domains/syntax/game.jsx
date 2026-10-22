// A syntax game on the shared shell (../../shell): its spec becomes the shell's game description, with the syntax
// domain's level screen (a sentence built on the kit's strip of slots, checked against a meaning graph) and its map
// art (the composing stick, games/stick).
//
//   engine/grammar.js   slots in reading order, frames, roles, agreement, case: the rules a word must keep
//   engine/lexicon.js   a game's words, read for the grammar
//   engine/sentence.js  a clause said as a sentence and checked against a level's meaning
//   engine/parts.js     how a word looks: its family and features line
//   engine/course.js    a spec read into levels, play order and the course the audit checks
//   ui/                 the level screen (desktop and phone), the meaning graph, the sentence, the map's picture
//   validate.js         every level's reference answer and traps (npm run check)
//   syntax.test.js      the grammar, the sentence and the meaning check (npm test)
import { BookOpenText } from 'lucide-react'
import '../../strip/strip.css'
import './ui/syntax.css'
import { defineGame } from '../../shell/index.js'
import { isCore } from '../../course.js'
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
    core: (level) => isCore(spec.syntax.course, level),
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
