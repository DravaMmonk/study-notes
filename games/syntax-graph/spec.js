// 句法之图 Syntax Graph: how a native speaker puts an English sentence together, for academic writing in computer
// science, as puzzles on the syntax domain (kit/domains/syntax). The grammar is the machine's; the player makes the
// decisions a native speaker makes before speaking.
// Everything here is the course: the words (lexicon.js), the levels (levels/), the encyclopedia (glossary.js); the
// game it makes is game.js. The design is DESIGN.md beside this file.
import { syntaxCourse } from '../kit/domains/syntax/engine/course.js'
import { shiftIds } from '../kit/shell/saves.js'
import { entries, groups } from './glossary.js'
import { nouns, times, verbs } from './lexicon.js'
import { levels as viewpoint } from './levels/viewpoint.js'

const T = (zh, en) => ({ zh, en })

const eras = [
  {
    id: 1,
    machine: 'clause',
    title: T('时间和视角', 'Time and viewpoint'),
    kicker: T('第一章', 'Era 1'),
    question: T('开口之前，一件事是什么时候的，又从哪里看它？', 'Before you speak, when is the thing, and where do you look at it from?'),
    foundation: ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7', '1-8', '1-9', '1-10', '1-11', '1-12'],
    topics: [{ id: 'review', title: T('投稿', 'Submitting a paper'), levels: ['1-S1', '1-S2', '1-S3'], after: '1-12' }],
  },
]

const SYNTAX = syntaxCourse({ lexicon: { nouns, verbs, times }, eras, levels: viewpoint })

export default {
  id: 'syntax-graph',
  domain: 'syntax',
  title: T('句法之图', 'Syntax Graph'),
  // Still in development: the demo has era 1 of the course in DESIGN.md.
  kicker: T('开发中 · 像母语者那样想一句英语', 'In development · Think a sentence the way a native speaker does'),
  lede: T(
    '母语者开口之前，已经替一句话做好了几个决定：这件事是什么时候的、从哪里看它，谁当主语，读者认不认得出它，什么先说、什么后说。每一关给一段论文或审稿里的情境，你来做这些决定，词形和语法由机器配好；说错了，会告诉你母语者为什么不这么说。最终写出母语作者也会写错的句子。',
    'Before a native speaker says a sentence, they have already decided a few things: when the thing is and where they look at it from, what the subject is, whether the reader can pick it out, what goes first and what last. Each level gives a situation from a paper or its review; you make these decisions, and the machine handles the forms and the grammar. When you get one wrong, you are told why a native speaker would not say it. In the end you write the sentences native authors get wrong.',
  ),
  eras,
  syntax: SYNTAX,
  levels: SYNTAX.LEVELS,
  course: SYNTAX.course,
  glossary: { groups, entries },
  saves: [
    // Version 2 opened with the time: “Time first” and “Then the verb” come before “Subject”, which moved from 1-1 to
    // 1-3 (its old sentence is dropped), and every level from 1-3 on moved up one. Whoever had passed a level has
    // passed the new ones before it.
    { version: 2, ops: [
      { rename: (id) => (id === '1-1' ? '1-3' : shiftIds('1-', 3, 1)(id)) },
      { data: (value, id) => (id === '1-3' ? null : value) },
      { solve: ['1-2', ['1-1']] },
      { solve: ['1-3', ['1-1', '1-2']] },
    ] },
    // Version 3 handed the grammar to the machine and made era 1 about time and viewpoint: every level after the first
    // is a new puzzle, and its old clause (written with tense heads that no longer exist) is dropped with it.
    { version: 3, ops: [{ rename: (id) => (id === '1-1' ? id : null) }, { data: () => null }] },
  ],
  texts: { chapters: SYNTAX.CHAPTERS, glossary: entries, nouns, verbs, times },
}
