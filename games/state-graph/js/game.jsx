import { Cable, Grid3x3 } from 'lucide-react'
import { defineGame } from '../../kit/shell/index.js'
import { CHAPTERS, LABELS, LEVELS, PARTS, REQUIRES } from './levels/index.js'
import { GLOSSARY, GLOSSARY_GROUPS } from './glossary.js'
import ModeScreen from './screen.jsx'
import Hero from './hero.jsx'
import { sceneSVG } from './svg.js'
import PartDemo from './circuit/PartDemo.jsx'
import { lookIcon } from './circuit/looks.js'
import { ROBOTS } from './circuit/robots.js'
import { ERAS } from './levels/eras.js'

// 状态之图 as content on the shared game shell (games/kit/shell): its chapters and levels, the pictures in its
// 引入, its parts and encyclopedia, and the screen that plays every level through its mode (js/modes).

const levels = LEVELS.map((L, index) => ({
  id: L.id,
  index,
  source: L,
  chapter: L.ch,
  // Opens once these are solved: the era's foundation in order, then its topics side by side (levels/eras.js).
  requires: REQUIRES.get(L.id) ?? [],
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

// The components box by robot: a robot can use every part earned in its era and the eras before it (parts carry over,
// games/DESIGN.md 2.1). It joins the box once the first level of its era is passed.
const eraOf = new Map(ERAS.flatMap((era, e) => [...era.foundation, ...(era.practice ?? []), ...(era.topics ?? []).flatMap((t) => t.levels), ...(era.challenges ?? []).map((c) => c.level)].map((id) => [id, e])))
const robotFilters = (progress) => ERAS.flatMap((era, e) => {
  if (!era.machine) return []
  const first = era.foundation[0]
  const keys = new Set(LEVELS.filter((L) => L.unlock && eraOf.get(L.id) <= e).map((L) => L.unlock))
  const robot = ROBOTS[era.machine]
  return [{ key: era.machine, name: robot.name, icon: robot.look, keys, lock: progress.all || progress.solved.includes(first) ? null : LABELS.get(first) }]
})

export default defineGame({
  id: 'state-graph',
  glossary: { groups: GLOSSARY_GROUPS, entries: GLOSSARY },
  title: { zh: '状态之图', en: 'State Graph' },
  kicker: { zh: '从零开始的动态规划解谜', en: 'Dynamic programming puzzles, from scratch' },
  lede: { zh: `不需要任何编程或算法基础。从手数路线开始，${LEVELS.length} 关里，你会用元件亲手拼出数路线、比文字、装背包的电路板，并且明白它们为什么这么快。`, en: `No programming or algorithms background needed. Starting from counting routes by hand, over ${LEVELS.length} levels you wire up, part by part, the circuit boards that count routes, compare words and pack a backpack, and find out why they are so fast.` },
  Hero,
  html: true,
  chapters: CHAPTERS.map((chapter, id) => ({ id, kicker: chapter.kicker, title: chapter.name, question: chapter.desc, groups: chapter.groups })),
  levels,
  progress: { version: 1, legacy },
  // Numbered as in CURRICULUM.md: 1-4 on an era's main path, S2 in a topic, C1 for a challenge.
  levelLabel: (level) => LABELS.get(level.id) ?? String(level.index + 1),
  intro: (level) => level.source.intro,
  IntroFigure,
  kinds: {
    circuit: { Screen: ModeScreen, icon: Cable, label: { zh: '电路板', en: 'Circuit board' } },
    board: { Screen: ModeScreen, icon: Grid3x3, label: { zh: '棋盘', en: 'Board' } },
  },
  unlocked: (level) => level.unlocks.map((k) => ({ label: PARTS[k].name })),
  parts: {
    // Only parts a level that is played unlocks (a retired level's card would never be earned).
    all: Object.entries(PARTS).filter(([key]) => LEVELS.some((L) => L.unlock === key)).map(([key, part]) => ({ key, name: part.name, desc: part.desc, icon: lookIcon(key) })),
    earned: (progress) => progress.flags,
    // The part on a bench: its level's board, with inputs, constants and models to change and a Run button.
    demo: (part, { phone }) => <PartDemo key={part.key} partKey={part.key} phone={phone} />,
    filters: robotFilters,
  },
})
