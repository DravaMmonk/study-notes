// The can domain's vocabulary (games/DESIGN.md 6.2): every thing a bus game's content may name, each with what it is
// and the schema of its parameters, and the schemas of game.json and of one level. Content is these items and their
// parameters, and nothing else: whatever a level needs that is not here is a new item, written in this domain.
//
// The items are implemented next to them: parts in parts.js, the signals a level wants in wants.js, the bus a test
// plays on in bus.js.

import { S } from '../../engine/schema.js'
import { defineVocabulary } from '../../engine/vocabulary.js'
import { GAME, PORT, levelSchema } from '../../engine/circuit-domain.js'
import { T as t } from '../../shell/i18n.js'

const item = (about, params) => ({ about, ...(params ? { params } : {}) })

const nat = S.int({ min: 0 })
/** A number written as a number or in hexadecimal ('0x123'), as CAN identifiers and bytes are. */
const hex = (max, digits) => S.either(S.int({ min: 0, max }), S.str({ pattern: `^0x[0-9a-fA-F]{1,${digits}}$` }))

/* ---------- the parts ---------- */

const PARTS = {
  reg: item(t('读寄存卡：同名寄存卡里存的值，存入之前给初值', 'Register: what the register of the same name holds, its start value before')),
  keep: item(t('存寄存卡：接入的值存进同名寄存卡，下一拍读得出', 'Keep: its input stored in the register of the same name, read from the next tick')),
  const: item(t('常数：设定的数', 'Constant: the number it is set to')),
  select: item(t('选择：条件为是或 1 给出「是」一路，否则「否」一路', 'Select: its Yes input when the condition is yes or 1, else its No input')),
  compare: item(t('比较：相等、小于两种形状', 'Compare: its forms Equal and Less than')),
  arith: item(t('算术：加一、相加两种形状', 'Arithmetic: its forms Add one and Add')),
}

/* ---------- what an output must be ---------- */

const INPUT = S.str({ about: t('关卡的一个输入的名字', 'the name of one of the level’s inputs') })
const BIT = S.oneOf([0, 1])
const WANTS = {
  line: item(t('这一拍总线上的位', 'the bit on the bus this tick')),
  previous: item(t('上一拍总线上的位；第一拍给 first', 'the bit the bus had the tick before; first on the first tick'), S.obj({ first: BIT })),
  unchanged: item(t('总线这一拍的位和上一拍一样吗；第一拍和 first 比', 'whether the bus bit is the same as the tick before; compared with first on the first tick'), S.obj({ first: BIT })),
  tick: item(t('这是第几拍，从 0 数', 'which tick this is, from 0')),
  since: item(t('从第 tick 拍（从 0 数）起回答是，之前回答否', 'yes from tick `tick` on (from 0), no before it'), S.obj({ tick: nat })),
  streak: item(t('这一拍之前，输入连着是 1 的拍数', 'how many ticks in a row the input was 1 before this one'), S.obj({ input: INPUT })),
  startOfFrame: item(t('帧起始：总线连着至少 11 拍隐性之后的第一个显性', 'start of frame: the first dominant bit after at least 11 recessive ones in a row')),
  gathered: item(t('go 为 1 的每一拍把 bit 接到攒下的数末尾（先来的在高位），为 0 时是 0', 'on every tick go is 1, bit put on the end of the number so far (the first bit highest); 0 when it is 0'), S.obj({ bit: INPUT, go: INPUT })),
  identifier: item(t('帧的标识符，在它最后一位到达的那一拍；其余每一拍「—」', 'a frame’s identifier, on the tick its last bit arrives; 「—」 on every other tick')),
}

/* ---------- a level ---------- */

const FRAME = S.obj({ id: hex(0x7ff, 3), data: S.opt(S.list(hex(0xff, 2))), gap: S.opt(nat) })
const TEST = S.obj({
  bus: S.obj({ idle: S.opt(nat), frames: S.list(FRAME), tail: S.opt(nat) }, { about: t('总线：先安静 idle 拍，再一帧帧（帧前多空 gap 拍），最后安静 tail 拍', 'the bus: idle quiet bits, then each frame (gap more quiet bits before it), then tail quiet bits') }),
  inputs: S.opt(S.map(S.list(S.int()), { view: 'ticks', about: t('每个输入每一拍的值', 'each input’s value tick by tick') })),
})
// What a level says once; then each task: its puzzle, done in turn (../../engine/circuit-domain.js levelSchema).
const LEVEL = levelSchema({
  test: TEST,
  ports: {
    listens: S.opt(S.bool({ about: t('板上有总线元件', 'the board has the bus card') })),
    inputs: S.opt(S.list(PORT)),
  },
  checks: { want: S.map(S.call('want'), { about: t('每个输出每一拍应当是什么', 'what each output must be, tick by tick') }) },
})

export const vocabulary = defineVocabulary({
  domain: 'can',
  version: 4,
  kinds: { part: PARTS, want: WANTS },
  game: GAME,
  level: LEVEL,
})
