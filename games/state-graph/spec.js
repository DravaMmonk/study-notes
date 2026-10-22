// 状态之图 State Graph: dynamic programming from scratch as a Turing Complete style game, on the table domain
// (kit/domains/table). Everything here is the course; the game it makes is game.jsx.
import { GLOSSARY, GLOSSARY_GROUPS } from './glossary.js'
import { ERAS } from './levels/eras.js'
import { CHAPTERS, LEVELS, TABLE, course } from './levels/index.js'

/**
 * Boards saved before version 2: 认出起点 (origin) is gone, its Start Value part with it, and the Cheapest Cell is built
 * by 走不到的路口 (slantcost) instead of 最省力. A Start Value comes off a board with its wires; whoever solved 最省力
 * has met the adder and built the Cheapest Cell already.
 */
const rebuilt = (board) => {
  const gone = new Set(board.nodes.filter((n) => n.kind === 'bp:origin').map((n) => n.id))
  return {
    ...board,
    nodes: board.nodes.filter((n) => !gone.has(n.id)).map((n) => (n.kind === 'bp:cheapest' ? { ...n, kind: 'bp:slantcost' } : n)),
    wires: board.wires.filter((w) => !gone.has(w.from.split('#')[0]) && !gone.has(w.to.split(':')[0])),
  }
}
const SAVES = [
  { version: 2, ops: [{ rename: { origin: null } }, { solve: ['cheapest', ['slantcost']] }, { data: (value) => (value && value.circs ? { ...value, circs: value.circs.map(rebuilt) } : value) }] },
]

export default {
  id: 'state-graph',
  domain: 'table',
  title: { zh: '状态之图', en: 'State Graph' },
  kicker: { zh: '从零开始的动态规划解谜', en: 'Dynamic programming puzzles, from scratch' },
  lede: { zh: '不需要任何编程或算法基础。从手数路线开始，学会把一个大问题拆成一张表，一格一格地填出来；最后能亲手拼出数路线、比文字、装背包的电路板，并且明白它们为什么这么快。', en: 'No programming or algorithms background needed. Starting from counting routes by hand, you learn to break a big problem into a table and fill it in cell by cell; in the end you wire up the circuit boards that count routes, compare words and pack a backpack, and see why they are so fast.' },
  eras: ERAS,
  table: TABLE,
  levels: LEVELS,
  course,
  // The table's own rules for the course audit: carried boards, and each topic's finale solving its earlier levels.
  audit: TABLE.problems,
  glossary: { groups: GLOSSARY_GROUPS, entries: GLOSSARY },
  texts: { glossary: GLOSSARY },
  // Saves from before the shared shell.
  legacyKey: 'state-graph-v2',
  saves: SAVES,
  // Parts that are an idea rather than a board are tried on the board of the level that puts the idea to work.
  borrow: { back: 'cheapest', memo: 'stairs', topdown: 'stairs', seam: 'seam' },
  texts: { chapters: CHAPTERS, glossary: GLOSSARY },
}
