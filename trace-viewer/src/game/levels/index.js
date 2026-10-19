import { layout } from '../../../../games/kit/course.js'
import { NODE_TYPES } from '../engine/nodes.js'
import { OWN, ownPart } from '../engine/own.js'
import * as ch0 from './ch0.js'
import * as ch1 from './ch1.js'
import * as ch2 from './ch2.js'
import * as ch3 from './ch3.js'
import * as ch4 from './ch4.js'
import * as ch7 from './ch7.js'
import * as ch6 from './ch6.js'
import * as optics from './pack-optics.js'
import * as ch5 from './ch5.js'
import * as ch8 from './ch8.js'
import * as ch9 from './ch9.js'
import * as ch10 from './ch10.js'
import { ERAS } from './route.js'

// Level modules. Each exports `levels` (an array) and optionally `nodes` (new node types merged into NODE_TYPES).
const PACKS = [ch0, ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8, ch9, ch10, optics]
for (const pack of PACKS) Object.assign(NODE_TYPES, pack.nodes ?? {})

// The course's tree (games/kit/course.js layout): play order, what each level requires, each chapter's track.
const PLAN = layout(ERAS)

export const CHAPTERS = [
  { id: 0, title: { zh: '睁眼', en: 'Opening Eyes' }, lecture: { zh: '第 1–2 讲', en: 'Lectures 1–2' }, question: { zh: '图像是什么', en: 'What is an image?' } },
  { id: 1, title: { zh: '邻居', en: 'Neighbours' }, lecture: { zh: '第 3 讲', en: 'Lecture 3' }, question: { zh: '怎样用邻居算出新图', en: 'How do neighbours make a new image?' } },
  { id: 2, title: { zh: '频率', en: 'Frequency' }, lecture: { zh: '第 4 讲', en: 'Lecture 4' }, question: { zh: '图像由哪些波组成', en: 'Which waves make up an image?' } },
  { id: 3, title: { zh: '光与边', en: 'Light and Edges' }, lecture: { zh: '第 5 讲', en: 'Lecture 5' }, question: { zh: '照片的明暗从哪来', en: 'Where do light and shade come from?' } },
  { id: 4, title: { zh: '学会看', en: 'Learning to See' }, lecture: { zh: '第 6–8 讲', en: 'Lectures 6–8' }, question: { zh: '机器怎样自己学会', en: 'How does a machine learn by itself?' } },
  { id: 5, title: { zh: '全局视野', en: 'The Whole Picture' }, lecture: { zh: '第 9–10 讲', en: 'Lectures 9–10' }, question: { zh: '一步看到全图', en: 'Seeing the whole image in one step' } },
  { id: 6, title: { zh: '认出同一个点', en: 'The Same Point Again' }, lecture: { zh: '第 11–12 讲', en: 'Lectures 11–12' }, question: { zh: '哪些点容易再找到', en: 'Which points are easy to find again?' } },
  { id: 7, title: { zh: '第三个维度', en: 'The Third Dimension' }, lecture: { zh: '第 13–14 讲', en: 'Lectures 13–14' }, question: { zh: '两只眼睛怎样看出远近', en: 'How do two eyes judge distance?' } },
  { id: 8, title: { zh: '画出没见过的图', en: 'Drawing the Unseen' }, lecture: { zh: '第 15–17 讲', en: 'Lectures 15–17' }, question: { zh: '从随机数生成图像', en: 'Making images from random numbers' } },
  { id: 9, title: { zh: '每个像素是什么', en: 'What Every Pixel Is' }, lecture: { zh: '第 19–20 讲', en: 'Lectures 19–20' }, question: { zh: '给每个像素一个答案', en: 'An answer for every pixel' } },
  { id: 10, title: { zh: '框出来', en: 'Boxing Things In' }, lecture: { zh: '第 21–22 讲', en: 'Lectures 21–22' }, question: { zh: '东西在哪、有多大', en: 'Where things are, and how big' } },
].map((chapter) => ({ ...chapter, track: PLAN.tracks.get(chapter.id) }))

const ALL = PACKS.flatMap((pack) => pack.levels)
const byIdAll = Object.fromEntries(ALL.map((level) => [level.id, level]))
const { requires } = PLAN

// A palette lists the parts new to the player first (first offered in this level, marked 新), then the constant and the
// four kinds of arithmetic, then the rest as the level gives them.
const ARITHMETIC = ['const', 'add', 'sub', 'mul', 'arith', 'merge']
const offered = new Set()
const ordered = (palette = []) => {
  const fresh = palette.filter((type) => !offered.has(type))
  const rest = palette.filter((type) => offered.has(type))
  palette.forEach((type) => offered.add(type))
  const arithmeticFirst = (list) => [...ARITHMETIC.filter((type) => list.includes(type)), ...list.filter((type) => !ARITHMETIC.includes(type))]
  return { palette: [...arithmeticFirst(fresh), ...arithmeticFirst(rest)], fresh }
}

// A series level after the first starts from the player's own circuit for the level before it (screens.jsx), when
// that level is a circuit too: a topic, or a branch on the main path.
const SERIES = ERAS.flatMap((era) => [...(era.topics ?? []).map((t) => t.levels), ...[...era.foundation, ...(era.practice ?? [])].filter((item) => typeof item !== 'string').flatMap((item) => item.parallel.map((b) => b.levels))])
const carry = new Map(SERIES.flatMap((ids) => ids.slice(1).map((id, i) => [id, ids[i]])).filter(([, from]) => byIdAll[from]?.kind !== 'board'))

// Pictures start out drawn as pixels; every other way of drawing them (ui/views/views.js) comes in with a level, as
// parts do, and stays from then on.
const VIEW_INTRO = { profile: '1-1', terrain: '1-4', spectrum: '2-6', slope: '3-7' }
const ROUTE = PLAN.order
const viewsAt = (id) => ({
  shows: ['pixels', ...Object.keys(VIEW_INTRO).filter((view) => ROUTE.indexOf(VIEW_INTRO[view]) <= ROUTE.indexOf(id))],
  freshViews: Object.keys(VIEW_INTRO).filter((view) => VIEW_INTRO[view] === id),
})

// Play order and what each level requires come from the route, not from the level files.
export const LEVELS = ROUTE.map((id) => {
  const level = byIdAll[id]
  if (!level) throw new Error(`route names a level that does not exist: ${id}`)
  return { kind: 'graph', inputs: ['in'], outputs: ['out'], grants: [], check: { tolerance: 0.02 }, ...level, ...ordered(level.palette), ...viewsAt(id), unlocks: [...(level.unlocks ?? []), ...(level.packs ? [`own-${id}`] : [])], requires: requires.get(id) ?? [], carry: carry.get(id) }
})
for (const level of ALL) if (!LEVELS.some((l) => l.id === level.id)) throw new Error(`level ${level.id} is not on the route`)

export const levelById = Object.fromEntries(LEVELS.map((level) => [level.id, level]))

// A level that packs its circuit (engine/own.js) offers it as a part once solved: the player's own passing circuit.
for (const level of LEVELS) if (level.packs) NODE_TYPES[`own-${level.id}`] = ownPart(level)
export function syncOwn(progress) {
  for (const level of LEVELS) {
    if (!level.packs) continue
    const data = progress.solved.includes(level.id) ? progress.data[level.id] : null
    const circuit = data?.passed ?? data
    if (circuit?.nodes) OWN.set(level.id, circuit)
    else OWN.delete(level.id)
  }
}

// A level is open once every level it requires is solved, or always when the player has unlocked everything.
export const isOpen = (level, solved, all = false) => all || level.requires.every((id) => solved.has(id))

// Everything a player playing in order has unlocked by the time they reach `level`: the unlocks of every level
// before it. Used when all levels are open, so a level entered early still has the options it expects.
export function unlocksBefore(level) {
  const at = LEVELS.indexOf(level)
  return LEVELS.slice(0, Math.max(0, at)).flatMap((l) => l.unlocks ?? [])
}
