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
  div: item(t('除：a ÷ b')),
  min: item(t('取小：a 和 b 里小的那个')),
}

/* ---------- a level ---------- */

const SHOP = S.obj({
  stock: S.int({ min: 1, about: t('每一拍进的货，卖不完的不留到下一拍') }),
  top: S.num({ about: t('价格为 0 时想买的人数') }),
  slope: S.num({ about: t('价格每涨 1，想买的人少多少') }),
  open: S.num({ about: t('开张之前的价格：第一拍读到的「昨天的价格」') }),
  shifts: S.opt(S.list(S.obj({ at: S.int({ min: 0 }), top: S.num() }), { about: t('从第 at 拍起，价格为 0 时想买的人数换成 top') })),
})
const ROW = S.obj({
  in: S.map(S.num(), { about: t('这一行给板的数，一张输入牌一个') }),
  out: S.map(S.num(), { about: t('板该给出的数，一张输出牌一个') }),
})
const STREET = S.obj({
  shops: S.list(SHOP, { min: 1, about: t('这条街上的店，一家一组牌') }),
  ticks: S.int({ min: 1, about: t('开张多少拍；最后一拍每家店剩下的和没买到的都要不到 1') }),
})
const LEVEL = levelSchema({
  test: S.either(ROW, STREET),
  ports: { inputs: S.opt(S.list(PORT)), outputs: S.opt(S.list(PORT)) },
  more: { most: S.opt(S.int({ min: 1, about: t('板上最多放几块元件：修一块板时，只许在它上面添多少') })) },
})

export const vocabulary = defineVocabulary({
  domain: 'market',
  version: 3,
  kinds: { part: PARTS },
  game: GAME,
  level: LEVEL,
})
