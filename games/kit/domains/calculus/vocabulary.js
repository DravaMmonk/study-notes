// The calculus domain's vocabulary (games/DESIGN.md 6.2): every thing a calculus game's content may name, each with
// what it is and the schema of its parameters, and the schemas of game.json and of one level. Content is these items
// and their parameters, and nothing else: whatever a level needs that is not here is a new item, written in this
// domain.
//
// The parts are implemented in parts.js. A test is data: each input's terms and each output's wanted terms, tick by
// tick (course.js reads it, run.js checks it).

import { S } from '../../engine/schema.js'
import { defineVocabulary } from '../../engine/vocabulary.js'
import { GAME, PORT, levelSchema } from '../../engine/circuit-domain.js'
import { T as t } from '../../shell/i18n.js'

const item = (about, params) => ({ about, ...(params ? { params } : {}) })

/* ---------- the parts ---------- */

const PARTS = {
  add: item(t('加：a + b', 'Add: a + b')),
  mul: item(t('乘：a × b', 'Multiply: a × b')),
  const: item(t('常数：设定的数', 'Constant: the number it is set to')),
  reg: item(t('读寄存卡：同名寄存卡里存的值，存入之前给初值', 'Register: what the register of the same name holds, its start value before')),
  keep: item(t('存寄存卡：接入的值存进同名寄存卡，下一拍读得出', 'Keep: its input stored in the register of the same name, read from the next tick')),
}

/* ---------- a level ---------- */

const TERMS = S.list(S.num(), { about: t('一拍一项：第 n 个数是第 n 项', 'a term a tick: the n-th number is term n') })
const TEST = S.obj({
  inputs: S.opt(S.map(TERMS, { about: t('每个输入数列的各项', 'each input sequence’s terms') })),
  want: S.map(TERMS, { about: t('每个输出数列应当的各项；测试跑这么多拍', 'each output sequence’s wanted terms; the test runs this many ticks') }),
})
// What a level says once; then each task: its puzzle, done in turn (../../engine/circuit-domain.js levelSchema).
const LEVEL = levelSchema({
  test: TEST,
  ports: { inputs: S.opt(S.list(PORT)), outputs: S.opt(S.list(PORT)) },
})

export const vocabulary = defineVocabulary({
  domain: 'calculus',
  version: 3,
  kinds: { part: PARTS },
  game: GAME,
  level: LEVEL,
})
