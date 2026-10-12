import { NODE_TYPES } from '../engine/nodes.js'
import { chapter0, chapter1 } from './ch0-1.js'
import { chapter2, chapter3, chapter4, chapter6, chapter7 } from './ch2-7.js'

// Extra level packs. Each module exports `levels` (an array) and optionally `nodes` (new node types
// merged into NODE_TYPES). Add one import line and one entry in PACKS per pack.
const PACKS = []
for (const pack of PACKS) Object.assign(NODE_TYPES, pack.nodes ?? {})

export const CHAPTERS = [
  { id: 0, title: '睁眼', lecture: '第 1–2 讲', question: '图像是什么' },
  { id: 1, title: '邻居', lecture: '第 3 讲', question: '怎样用邻居算出新图' },
  { id: 2, title: '频率', lecture: '第 4 讲', question: '缩小时为什么会出错' },
  { id: 3, title: '光与边', lecture: '第 5 讲', question: '边缘怎样不受灯光影响' },
  { id: 4, title: '学会看', lecture: '第 6–8 讲', question: '机器怎样自己学到滤波器' },
  { id: 5, title: '全局视野', lecture: '第 9–10 讲', question: '一步看到全图', planned: true },
  { id: 6, title: '认出同一个点', lecture: '第 11–12 讲', question: '哪些点容易再找到' },
  { id: 7, title: '第三个维度', lecture: '第 13–14 讲', question: '两只眼睛怎样看出远近' },
  { id: 8, title: '画出没见过的图', lecture: '第 15–16 讲', question: '从随机数生成图像', planned: true },
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

export const isOpen = (level, solved) => level.requires.every((id) => solved.has(id))
