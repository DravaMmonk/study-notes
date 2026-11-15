// The calculus domain's vocabulary (games/DESIGN.md 6.2): every thing a calculus game's content may name, each with
// what it is and the schema of its parameters, and the schemas of game.json and of one level. Content is these items
// and their parameters, and nothing else: whatever a level needs that is not here is a new item, written in this
// domain.
//
// A game's parts are its parts.json over the resources of ops.js. A test is data: each input's terms and each output's wanted terms, tick by
// tick (course.js reads it, run.js checks it).

import { S } from '../../engine/schema.js'
import { defineVocabulary } from '../../engine/vocabulary.js'
import { GAME, PORT, levelSchema } from '../../engine/level-schema.js'
import { T as t } from '../../shell/i18n.js'
import { OP_ITEMS } from './ops.js'

const item = (about, params) => ({ about, ...(params ? { params } : {}) })

/* ---------- the parts ---------- */

// A game's parts are its parts.json, computing with the domain's resources (ops.js) and the kernel's registers,
// coloured by family (ui/calculus.css).
const FAMILIES = {
  value: item(t('算数的元件')),
  memory: item(t('读写寄存器的元件')),
}

/* ---------- a level ---------- */

// Terms are compared within a relative error of 10⁻⁹ (run.js same).
const TERMS = S.list(S.num(), { about: t('一拍一项：第 n 个数是第 n 项') })
const TEST = S.obj({
  inputs: S.opt(S.map(TERMS, { about: t('每个输入数列的各项') })),
  want: S.map(TERMS, { about: t('每个输出数列应当的各项；测试跑这么多拍') }),
})
// What a level says once; then each task: its puzzle, done in turn (../../engine/level-schema.js levelSchema).
const LEVEL = levelSchema({
  test: TEST,
  ports: { inputs: S.opt(S.list(PORT)), outputs: S.opt(S.list(PORT)) },
  more: { carries: S.opt(S.bool({ section: 'course', about: t('从上一个任务的电路板开始') })) },
})

export const vocabulary = defineVocabulary({
  domain: 'calculus',
  version: 11,
  removes: [{ at: 'kinds.part', why: 'a game\'s parts are its parts.json over the domain\'s engine resources (op)' }],
  kinds: { op: OP_ITEMS, family: FAMILIES },
  game: GAME,
  level: LEVEL,
})
