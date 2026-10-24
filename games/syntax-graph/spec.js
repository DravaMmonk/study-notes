// 句法之图 Syntax Graph: English grammar for academic writing in computer science, as puzzles, on the syntax domain
// (kit/domains/syntax).
// Everything here is the course: the words (lexicon.js), the levels (levels/), the encyclopedia (glossary.js); the
// game it makes is game.js. The design is DESIGN.md beside this file.
import { syntaxCourse } from '../kit/domains/syntax/engine/course.js'
import { shiftIds } from '../kit/shell/saves.js'
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
    foundation: ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7', '1-8', '1-9'],
    practice: ['1-10', '1-11'],
    topics: [{ id: 'review', title: T('投稿', 'Submitting a paper'), levels: ['1-S1', '1-S2', '1-S3'], after: '1-9' }],
  },
]

const SYNTAX = syntaxCourse({ lexicon: { nouns, verbs, inflections }, eras, levels: clause })

export default {
  id: 'syntax-graph',
  domain: 'syntax',
  title: T('句法之图', 'Syntax Graph'),
  // Still in development: the demo has era 1 of the course in DESIGN.md.
  kicker: T('开发中 · 一格一格搭出论文里的英语句子', 'In development · The sentences of a paper, built place by place'),
  lede: T(
    '读一张语义图，像以英语为母语的人那样组织一句话：先定时间和视角，搭好句子的框架，再把名词短语和动词放进去，词尾跟着框架自己接上。放错位置会被语法拒绝，说错意思会在语义图上标红。从论文里最短的一句开始，最终写出母语作者也会写错的句子。',
    'Read a meaning graph and put an English sentence together the way a native speaker does: settle the time and the angle first, build the sentence’s frame, then drop in the noun phrases and the verb, whose endings follow from the frame. A word in the wrong place is refused by the grammar; a wrong meaning is marked red on the graph. Start from the shortest sentence in a paper and end up writing the ones native authors get wrong.',
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
  ],
  texts: { chapters: SYNTAX.CHAPTERS, glossary: entries, nouns, verbs },
}
