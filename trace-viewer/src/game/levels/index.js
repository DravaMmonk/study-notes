import { NODE_TYPES } from '../engine/nodes.js'
import { chapter0, chapter1 } from './ch0-1.js'
import { chapter2, chapter3, chapter4, chapter6, chapter7 } from './ch2-7.js'
import * as waves from './pack-waves.js'
import * as freq from './pack-freq.js'
import * as optics from './pack-optics.js'
import * as light from './pack-light.js'
import * as attend from './pack-attend.js'
import * as match from './pack-match.js'
import * as depthgen from './pack-depthgen.js'
import * as learn from './pack-learn.js'
import * as train from './pack-train.js'

// Extra level packs. Each module exports `levels` (an array) and optionally `nodes` (new node types
// merged into NODE_TYPES). Add one import line and one entry in PACKS per pack.
const PACKS = [optics, light, waves, freq, attend, match, depthgen, learn, train]
for (const pack of PACKS) Object.assign(NODE_TYPES, pack.nodes ?? {})

export const CHAPTERS = [
  { id: 0, title: { zh: '睁眼', en: 'Opening Eyes' }, lecture: { zh: '第 1–2 讲', en: 'Lectures 1–2' }, question: { zh: '图像是什么', en: 'What is an image?' } },
  { id: 1, title: { zh: '邻居', en: 'Neighbours' }, lecture: { zh: '第 3 讲', en: 'Lecture 3' }, question: { zh: '怎样用邻居算出新图', en: 'How do neighbours make a new image?' } },
  { id: 2, title: { zh: '频率', en: 'Frequency' }, lecture: { zh: '第 4 讲', en: 'Lecture 4' }, question: { zh: '图像由哪些波组成', en: 'Which waves make up an image?' } },
  { id: 3, title: { zh: '光与边', en: 'Light and Edges' }, lecture: { zh: '第 5 讲', en: 'Lecture 5' }, question: { zh: '照片的明暗从哪来', en: 'Where do light and shade come from?' } },
  { id: 4, title: { zh: '学会看', en: 'Learning to See' }, lecture: { zh: '第 6–8 讲', en: 'Lectures 6–8' }, question: { zh: '机器怎样自己学会', en: 'How does a machine learn by itself?' } },
  { id: 5, title: { zh: '全局视野', en: 'The Whole Picture' }, lecture: { zh: '第 9–10 讲', en: 'Lectures 9–10' }, question: { zh: '一步看到全图', en: 'Seeing the whole image in one step' } },
  { id: 6, title: { zh: '认出同一个点', en: 'The Same Point Again' }, lecture: { zh: '第 11–12 讲', en: 'Lectures 11–12' }, question: { zh: '哪些点容易再找到', en: 'Which points are easy to find again?' } },
  { id: 7, title: { zh: '第三个维度', en: 'The Third Dimension' }, lecture: { zh: '第 13–14 讲', en: 'Lectures 13–14' }, question: { zh: '两只眼睛怎样看出远近', en: 'How do two eyes judge distance?' } },
  { id: 8, title: { zh: '画出没见过的图', en: 'Drawing the Unseen' }, lecture: { zh: '第 15–16 讲', en: 'Lectures 15–16' }, question: { zh: '从随机数生成图像', en: 'Making images from random numbers' } },
]

const ORDER = (level) => level.chapter * 100 + (Number(level.id.split('-')[1]) || 50)
export const LEVELS = [...chapter0, ...chapter1, ...chapter2, ...chapter3, ...chapter4, ...chapter6, ...chapter7, ...PACKS.flatMap((pack) => pack.levels)].sort((a, b) => ORDER(a) - ORDER(b)).map((level) => ({
  kind: 'graph',
  inputs: ['in'],
  outputs: ['out'],
  grants: [],
  check: { tolerance: 0.02 },
  ...level,
}))

export const levelById = Object.fromEntries(LEVELS.map((level) => [level.id, level]))

// A level is open once every level it requires is solved, or always when the player has unlocked everything.
export const isOpen = (level, solved, all = false) => all || level.requires.every((id) => solved.has(id))

// Everything a player playing in order has unlocked by the time they reach `level`: the unlocks of every level
// before it. Used when all levels are open, so a level entered early still has the options it expects.
export function unlocksBefore(level) {
  const at = LEVELS.indexOf(level)
  return LEVELS.slice(0, Math.max(0, at)).flatMap((l) => l.unlocks ?? [])
}
