// 句法之图 Syntax Graph: how a native speaker puts an English sentence together, for academic writing in computer
// science, as puzzles on the syntax domain (kit/domains/syntax). The grammar is the machine's; the player makes the
// decisions a native speaker makes before speaking.
// Everything here is the course: the words (lexicon.js), the levels (levels/), the encyclopedia (glossary.js); the
// game it makes is game.js. The design is DESIGN.md beside this file.
import { syntaxCourse } from '../kit/domains/syntax/engine/course.js'
import { shiftIds } from '../kit/shell/saves.js'
import { entries, groups } from './glossary.js'
import { nouns, verbs } from './lexicon.js'
import { levels as time } from './levels/time.js'

const T = (zh, en) => ({ zh, en })

// The times of save version 3, by their keys since (version 4).
const TIME_KEYS = { past: 'past.simple', present: 'present.simple', future: 'future.simple', perfect: 'present.perfect', pastPerfect: 'past.perfect', progressive: 'present.progressive', pastProgressive: 'past.progressive' }

const eras = [
  {
    id: 1,
    machine: 'clause',
    title: T('时间和视角', 'Time and viewpoint'),
    kicker: T('第一章', 'Era 1'),
    question: T('开口之前，一件事是什么时候的，又从哪里看它？', 'Before you speak, when is the thing, and where do you look at it from?'),
    foundation: ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7'],
  },
]

const SYNTAX = syntaxCourse({ lexicon: { nouns, verbs }, eras, levels: time })

export default {
  id: 'syntax-graph',
  domain: 'syntax',
  title: T('句法之图', 'Syntax Graph'),
  // Still in development: the demo has era 1 of the course in DESIGN.md.
  kicker: T('开发中 · 像母语者那样说出一句英语', 'In development · Say it the way a native writer would'),
  lede: T(
    '母语者写一句话，不是先想规则再变形：场合一出现，说法就跟着来。回复审稿人说 “We have fixed …”，讲实验经过说 “We trained …”，下结论说 “The method outperforms …”。这里按论文和审稿里的真实场合，一题几秒，把这种“场合 → 说法”的直觉练出来；选错了，就告诉你母语者为什么不这么说。最终写出母语作者也会写错的句子。',
    'A native writer does not think of a rule and then inflect: the situation calls up the words. Answering a reviewer, it is “We have fixed …”; telling the experiments, “We trained …”; stating a finding, “The method outperforms …”. Here you train that link from situation to words in the real situations of a paper and its review, a few seconds an item; pick wrong, and you are told why a native speaker would not say it. In the end you write the sentences native authors get wrong.',
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
    // Version 4 set the time by answering questions: the times are the grammar's, keyed by tense and aspect.
    { version: 4, ops: [{ data: (value) => (value?.clause?.TIME ? { ...value, clause: { ...value.clause, TIME: `time:${TIME_KEYS[value.clause.TIME.slice(5)]}` } } : value) }] },
    // Version 5 made era 1 a run of drills: every level is new, so no progress carries over.
    { version: 5, ops: [{ rename: () => null }, { data: () => null }] },
  ],
  texts: { chapters: SYNTAX.CHAPTERS, glossary: entries, nouns, verbs },
}
