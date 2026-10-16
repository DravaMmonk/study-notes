import { Cable, Grid3x3 } from 'lucide-react'
import { defineGame } from '../../kit/shell/index.js'
import { CHAPTERS, LEVELS, PARTS } from './levels/index.js'
import ModeScreen from './screen.jsx'
import Hero from './hero.jsx'
import { sceneSVG } from './svg.js'

// 状态之图 as content on the shared game shell (games/kit/shell): its chapters and levels, the pictures in its
// 引入, its parts and notebook, and the screen that plays every level through its mode (js/modes).

const levels = LEVELS.map((L, index) => ({
  id: L.id,
  index,
  source: L,
  chapter: L.ch,
  title: L.title,
  kind: L.mode === 'circuit' ? 'circuit' : 'board',
  unlocks: L.unlock ? [L.unlock] : [],
  afterTitle: L.debrief.title,
  after: L.debrief.body,
  note: L.debrief.note,
}))

// Saves from before the shell lived under `state-graph-v2` as { done, seen, data, all }.
function legacy() {
  try {
    const old = JSON.parse(window.localStorage.getItem('state-graph-v2'))
    if (!old) return null
    const done = LEVELS.filter((L) => old.done?.[L.id])
    return { version: 1, solved: done.map((L) => L.id), flags: done.filter((L) => L.unlock).map((L) => L.unlock), data: old.data ?? {}, introSeen: old.seen ?? {}, all: Boolean(old.all), seenPower: true }
  } catch {
    return null
  }
}

function IntroFigure({ fig }) {
  return <div className="fig" dangerouslySetInnerHTML={{ __html: sceneSVG(fig, { pad: 12, maxScale: 1.3 }) }} />
}

export default defineGame({
  id: 'state-graph',
  title: { zh: '状态之图', en: 'State Graph' },
  kicker: { zh: '从零开始的动态规划解谜', en: 'Dynamic programming puzzles, from scratch' },
  lede: { zh: '不需要任何编程或算法基础。你只会拿到两种零件：格子和箭头。56 关里，你会用元件亲手拼出数路线、比文字、装背包的电路板，并且明白它们为什么这么快。', en: 'No programming or algorithms background needed. You get just two kinds of pieces: cells and arrows. Over 56 levels you wire up, part by part, the circuit boards that count routes, compare words and pack a backpack, and find out why they are so fast.' },
  Hero,
  html: true,
  chapters: CHAPTERS.map((chapter, id) => ({ id, number: id + 1, title: chapter.name, question: chapter.desc })),
  levels,
  progress: { version: 1, legacy },
  levelLabel: (level) => String(level.index + 1),
  intro: (level) => level.source.intro,
  IntroFigure,
  kinds: {
    circuit: { Screen: ModeScreen, icon: Cable, label: { zh: '电路板', en: 'Circuit board' } },
    board: { Screen: ModeScreen, icon: Grid3x3, label: { zh: '棋盘', en: 'Board' } },
  },
  unlocked: (level) => level.unlocks.map((k) => ({ label: PARTS[k].name })),
  parts: { all: Object.entries(PARTS).map(([key, part]) => ({ key, name: part.name, desc: part.desc })), earned: (progress) => progress.flags },
})
