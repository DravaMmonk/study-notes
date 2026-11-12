// The calculus domain's vocabulary (games/DESIGN.md 6.2): every thing a calculus game's content may name, each with
// what it is and the schema of its parameters, and the schemas of game.json and of one level. Content is these items
// and their parameters, and nothing else: whatever a level needs that is not here is a new item, written in this
// domain.
//
// The parts are implemented in parts.js. A test either gives wanted terms or names an interval claim implemented in
// proof.js. Both forms supply each input's terms tick by tick (course.js reads them, run.js checks them).

import { S } from '../../engine/schema.js'
import { defineVocabulary } from '../../engine/vocabulary.js'
import { GAME, PORT, levelSchema } from '../../engine/circuit-domain.js'
import { T as t } from '../../shell/i18n.js'

const item = (about, params) => ({ about, ...(params ? { params } : {}) })

/* ---------- the parts ---------- */

const PARTS = {
  add: item(t('加：a + b')),
  mul: item(t('乘：a × b')),
  recip: item(t('倒数：1/a，a 为 0 时给「—」')),
  less: item(t('比较：a < b 时给 1，否则给 0')),
  const: item(t('常数：设定的数')),
  reg: item(t('读寄存卡：同名寄存卡里存的值，存入之前给初值')),
  keep: item(t('存寄存卡：接入的值存进同名寄存卡，下一拍读得出')),
}

const CLAIMS = {
  lineDelta: item(t('直线的 ε-δ 应答：检查整个区间的 |m|δ ≤ ε 和半径下界')),
  squareDelta: item(t('平方函数的 ε-δ 应答：检查整个区间的 δ(2|a|+δ) ≤ ε 和半径下界')),
  stepDelta: item(t('台阶函数在非零点的 ε-δ 应答：半径不跨过跳点')),
  stepWitness: item(t('台阶函数在零点不连续：为任意 δ 找区间内的反例')),
}

/* ---------- a level ---------- */

// Terms are compared within a relative error of 10⁻⁹ (run.js same).
const TERMS = S.list(S.num(), { about: t('一拍一项：第 n 个数是第 n 项') })
const TEST = S.obj({
  inputs: S.opt(S.map(TERMS, { about: t('每个输入数列的各项') })),
  want: S.opt(S.map(TERMS, { about: t('每个输出数列应当的各项；测试跑这么多拍') })),
  check: S.opt(S.call('claim', { about: t('逐拍检查输出所满足的区间断言，不规定唯一答案') })),
})
// What a level says once; then each task: its puzzle, done in turn (../../engine/circuit-domain.js levelSchema).
const LEVEL = levelSchema({
  test: TEST,
  ports: { inputs: S.opt(S.list(PORT)), outputs: S.opt(S.list(PORT)) },
})

export const vocabulary = defineVocabulary({
  domain: 'calculus',
  version: 5,
  kinds: { part: PARTS, claim: CLAIMS },
  game: GAME,
  level: LEVEL,
})
