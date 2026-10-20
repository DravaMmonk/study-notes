// 句法之图 Syntax Graph: an English grammar course as circuit puzzles, on the syntax domain (kit/domains/syntax).
// Everything here is the course: the words (lexicon.js), the levels (levels/), the encyclopedia (glossary.js); the
// game it makes is game.js. The design is DESIGN.md beside this file.
import { syntaxCourse } from '../kit/domains/syntax/engine/course.js'
import { entries, groups } from './glossary.js'
import { inflections, nouns, verbs } from './lexicon.js'
import { levels as clause } from './levels/clause.js'

const T = (zh, en) => ({ zh, en })

const eras = [
  {
    id: 1,
    machine: 'clause',
    title: T('小句', 'The clause'),
    kicker: T('第一章', 'Era 1'),
    question: T('一句话最少要有什么，各部分又怎样咬合在一起？', 'What does a sentence need at the least, and how do its parts lock together?'),
    foundation: ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7', '1-8'],
    practice: ['1-9', '1-10'],
    topics: [{ id: 'chase', title: T('催款', 'Chasing a payment'), levels: ['1-S1', '1-S2', '1-S3'], after: '1-8' }],
  },
]

const SYNTAX = syntaxCourse({ lexicon: { nouns, verbs, inflections }, eras, levels: clause })

export default {
  id: 'syntax-graph',
  domain: 'syntax',
  title: T('句法之图', 'Syntax Graph'),
  // Still in development: the demo has era 1 of the course in DESIGN.md.
  kicker: T('开发中 · 把英语句子当电路来搭', 'In development · English sentences, wired like circuits'),
  lede: T(
    '读一张语义图，用名词短语、动词和时态的元件接出一句英语。接错的线会被语法拒绝，说错的意思会在语义图上标红。从一句最短的话开始，最终写出母语者也会写错的句子。',
    'Read a meaning graph and wire noun phrases, verbs and tense parts into an English sentence. A wrong wire is refused by the grammar; a wrong meaning is marked red on the graph. Start from the shortest sentence and end up writing the ones native speakers get wrong.',
  ),
  eras,
  syntax: SYNTAX,
  levels: SYNTAX.LEVELS,
  course: SYNTAX.course,
  glossary: { groups, entries },
  texts: { chapters: SYNTAX.CHAPTERS, glossary: entries, nouns, verbs },
}
