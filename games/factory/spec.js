// 软件工厂 Software Factory: building a coding agent from one model call, as a Turing Complete style game on the agent
// domain (kit/domains/agent). Everything here is the course: the repositories and issues (worlds.js), the levels
// (levels.js), the encyclopedia (glossary.js); the game it makes is game.js. The design is DESIGN.md beside this file.
import { agentCourse } from '../kit/domains/agent/course.js'
import { entries, groups } from './glossary.js'
import { levels } from './levels.js'
import { issues, repos } from './worlds.js'

const T = (zh, en) => ({ zh, en })

// What each chapter's levels are played on: by hand, one call, or a loop (kit/domains/agent/run.js).
const machines = {
  hand: { mode: 'loop', window: 3000 },
  once: { mode: 'once', window: 2500 },
  loop: { mode: 'loop', window: 4000, turns: 12 },
}

const eras = [
  {
    id: 0,
    machine: 'hand',
    title: T('纸笔', 'Pen and paper'),
    question: T('模型到底看到了什么？', 'What does the model actually see?'),
    foundation: ['0-1', '0-2', '0-3'],
  },
  {
    id: 1,
    machine: 'once',
    keeps: 'all',
    title: T('一问一答', 'One call'),
    question: T('只能问一次，要给它看什么？', 'One call only: what do you show it?'),
    foundation: ['1-1', '1-2', '1-3'],
    practice: ['1-4', '1-5', '1-6'],
  },
  {
    id: 2,
    machine: 'loop',
    keeps: 'all',
    title: T('循环', 'The loop'),
    question: T('让它自己去拿，什么时候停？', 'Let it fetch for itself: when does it stop?'),
    foundation: ['2-1', '2-2', '2-3'],
    practice: ['2-4', '2-5', '2-6'],
    challenges: [{ level: '2-C', after: '2-3' }],
  },
]

const AGENT = agentCourse({ eras, machines, repos, issues, levels })

export default {
  id: 'factory',
  domain: 'agent',
  title: T('软件工厂', 'Software Factory'),
  // Still in development: chapters 0-2 of the course in DESIGN.md.
  kicker: T('开发中 · 从一次模型调用搭起编码 agent', 'In development · A coding agent from one model call'),
  lede: T(
    '编码 agent 里面是什么？从一次模型调用开始，亲手决定它看到什么、能做什么、什么时候算做完：先替它拿文件，再让它自己读、自己找、改到测试通过。最后搭出的，是一个自己接 issue、自己修好的 agent。',
    'What is inside a coding agent? Starting from one model call, you decide what it sees, what it may do and when it is done: first you fetch its files, then it reads and looks for itself, and goes on until the tests pass. What you end up with is an agent that takes an issue and fixes it on its own.',
  ),
  eras,
  agent: AGENT,
  levels: AGENT.LEVELS,
  course: AGENT.course,
  glossary: { groups, entries },
  saves: [],
  texts: { chapters: AGENT.CHAPTERS, glossary: entries, issues },
}
