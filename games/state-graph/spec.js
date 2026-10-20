// 状态之图 State Graph: dynamic programming from scratch as a Turing Complete style game, on the table domain
// (kit/domains/table). Everything here is the course; the game it makes is game.jsx.
import { GLOSSARY, GLOSSARY_GROUPS } from './glossary.js'
import { ERAS } from './levels/eras.js'
import { CHAPTERS, LEVELS, TABLE, course } from './levels/index.js'

export default {
  id: 'state-graph',
  domain: 'table',
  title: { zh: '状态之图', en: 'State Graph' },
  kicker: { zh: '从零开始的动态规划解谜', en: 'Dynamic programming puzzles, from scratch' },
  lede: (count) => ({ zh: `不需要任何编程或算法基础。从手数路线开始，${count} 关里，你会用元件亲手拼出数路线、比文字、装背包的电路板，并且明白它们为什么这么快。`, en: `No programming or algorithms background needed. Starting from counting routes by hand, over ${count} levels you wire up, part by part, the circuit boards that count routes, compare words and pack a backpack, and find out why they are so fast.`  }),
  eras: ERAS,
  table: TABLE,
  levels: LEVELS,
  course,
  // The course audit's own rule for this game: each topic's finale board solves the topic's earlier levels.
  audit: TABLE.topicProblems,
  glossary: { groups: GLOSSARY_GROUPS, entries: GLOSSARY },
  // Saves from before the shared shell.
  legacyKey: 'state-graph-v2',
  // Parts that are an idea rather than a board are tried on the board of the level that puts the idea to work.
  borrow: { back: 'cheapest', memo: 'stairs', topdown: 'stairs', seam: 'seam' },
  texts: { chapters: CHAPTERS, glossary: GLOSSARY },
}
