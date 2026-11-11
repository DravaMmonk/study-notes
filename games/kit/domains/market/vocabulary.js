// The market domain's vocabulary (games/DESIGN.md 6.2): every thing a market game's content may name, each with what
// it is and the schema of its parameters, and the schemas of game.json and of one level. Content is these items and
// their parameters, and nothing else: whatever a level needs that is not here is a new item, written in this domain.
//
// The parts are implemented in parts.js. A test is data: a street of shops (world.js), how many ticks it trades and
// what it has to earn by the last (course.js reads it, run.js runs it).

import { S } from '../../engine/schema.js'
import { defineVocabulary } from '../../engine/vocabulary.js'
import { GAME, PORT, levelSchema } from '../../engine/circuit-domain.js'
import { T as t } from '../../shell/i18n.js'

const item = (about, params) => ({ about, ...(params ? { params } : {}) })

/* ---------- the parts ---------- */

const PARTS = {
  const: item(t('常数：设定的数')),
  add: item(t('加：a + b')),
  sub: item(t('减：a − b')),
  mul: item(t('乘：a × b')),
}

/* ---------- a level ---------- */

const SHOP = S.obj({
  stock: S.int({ min: 1, about: t('每一拍进的货，卖不完的不留到下一拍') }),
  top: S.num({ about: t('价格为 0 时想买的人数') }),
  slope: S.num({ about: t('价格每涨 1，想买的人少多少') }),
  open: S.num({ about: t('开张之前的价格：第一拍读到的「昨天的价格」') }),
  shifts: S.opt(S.list(S.obj({ at: S.int({ min: 0 }), top: S.num() }), { about: t('从第 at 拍起，价格为 0 时想买的人数换成 top') })),
})
const TEST = S.obj({
  shops: S.list(SHOP, { min: 1, about: t('这条街上的店，一家一组牌') }),
  ticks: S.int({ min: 1, about: t('开张多少拍') }),
  earn: S.num({ about: t('到最后一拍为止，整条街要挣到多少') }),
})
// What a level says once; then each task: its puzzle, done in turn (../../engine/circuit-domain.js levelSchema).
const LEVEL = levelSchema({
  test: TEST,
  ports: { inputs: S.opt(S.list(PORT)), outputs: S.opt(S.list(PORT)) },
})

export const vocabulary = defineVocabulary({
  domain: 'market',
  version: 1,
  kinds: { part: PARTS },
  game: GAME,
  level: LEVEL,
})
