// 句法之图 Syntax Graph: reading the long sentences of computer science papers by taking them apart, as puzzles on the
// syntax domain (kit/domains/syntax): every modifier folded onto the word it modifies, until the skeleton shows.
// Everything here is the course: the levels (levels/), the encyclopedia (glossary.js); the game it makes is game.js.
// The design is DESIGN.md beside this file.
import { syntaxCourse } from '../kit/domains/syntax/engine/course.js'
import { entries, groups } from './glossary.js'
import { levels as attach } from './levels/attach.js'
import { levels as relative } from './levels/relative.js'
import { levels as skeleton } from './levels/skeleton.js'

const T = (zh, en) => ({ zh, en })

const eras = [
  {
    id: 1,
    machine: 'reader',
    title: T('主干', 'The skeleton'),
    kicker: T('第一章', 'Era 1'),
    question: T('一句话再长，主干也只有几块：它们藏在哪？', 'However long a sentence, its skeleton is a few pieces: where are they hiding?'),
    foundation: ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7'],
  },
  {
    id: 2,
    machine: 'reader',
    keeps: 'all',
    title: T('挂在哪', 'Where it hangs'),
    kicker: T('第二章', 'Era 2'),
    question: T('一个修饰成分说明的是名词，还是动作？', 'Does a modifier tell about a noun, or about the action?'),
    foundation: ['2-1', '2-2', '2-3', '2-4', '2-5', '2-6'],
  },
  {
    id: 3,
    machine: 'reader',
    keeps: 'all',
    title: T('定语从句', 'Relative clauses'),
    kicker: T('第三章', 'Era 3'),
    question: T('名词后面跟着一整句话时，怎么把它折成一块？', 'When a whole clause follows a noun, how is it folded into one piece?'),
    foundation: ['3-1', '3-2', '3-3', '3-4', '3-5', '3-6', '3-7', '3-8'],
  },
]

const SYNTAX = syntaxCourse({ eras, levels: [...skeleton, ...attach, ...relative] })

export default {
  id: 'syntax-graph',
  domain: 'syntax',
  title: T('句法之图', 'Syntax Graph'),
  // Still in development: the demo has eras 1 to 3 of the course in DESIGN.md.
  kicker: T('开发中 · 拆开计算机论文里的长难句', 'In development · Taking apart the long sentences of computer science papers'),
  lede: T(
    '计算机论文里的长句一读就晕，多半是因为找不到主干。把句子里的修饰成分一块块折起来，挂到它修饰的那个词上，主干就露出来了。从三个词的主干起步，一路拆到母语读者也要读两遍的句子。',
    'The long sentences of computer science papers are hard going mostly because their skeleton is hard to find. Fold each modifier into one piece and hang it on the word it modifies, and the skeleton shows. Start from a three-word skeleton and work up to sentences native readers have to read twice.',
  ),
  eras,
  syntax: SYNTAX,
  levels: SYNTAX.LEVELS,
  course: SYNTAX.course,
  glossary: { groups, entries },
  // Version 6 made the game about taking long sentences apart: every level is new, so nothing carries over.
  saves: [{ version: 6, ops: [{ rename: () => null }, { data: () => null }] }],
  texts: { chapters: SYNTAX.CHAPTERS, glossary: entries },
}
