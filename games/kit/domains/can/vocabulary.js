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
  reg: item(t('读寄存卡：同名寄存卡里存的值，存入之前给初值')),
  keep: item(t('存寄存卡：接入的值存进同名寄存卡，下一拍读得出')),
  const: item(t('常数：设定的数')),
  select: item(t('选择：条件为是或 1 给出「是」一路，否则「否」一路')),
  compare: item(t('比较：相等、小于两种形状')),
  arith: item(t('算术：加一、相加两种形状')),
  xor: item(t('异或：两个数逐位异或', 'XOR: bitwise exclusive or of two numbers')),
}

/* ---------- what an output must be ---------- */

const INPUT = S.str({ about: t('关卡的一个输入的名字') })
const BIT = S.oneOf([0, 1])
const WANTS = {
  line: item(t('这一拍总线上的位')),
  previous: item(t('上一拍总线上的位；第一拍给 first'), S.obj({ first: BIT })),
  unchanged: item(t('总线这一拍的位和上一拍一样吗；第一拍和 first 比'), S.obj({ first: BIT })),
  tick: item(t('这是第几拍，从 0 数')),
  since: item(t('从第 tick 拍（从 0 数）起回答是，之前回答否'), S.obj({ tick: nat })),
  streak: item(t('这一拍之前，输入连着是 1 的拍数'), S.obj({ input: INPUT })),
  startOfFrame: item(t('帧起始：总线连着至少 11 拍隐性之后的第一个显性')),
  gathered: item(t('go 为 1 的每一拍把 bit 接到攒下的数末尾（先来的在高位），为 0 时是 0'), S.obj({ bit: INPUT, go: INPUT })),
  destuffedGather: item(t('去除填充位后逐位攒数，填充位的那一拍保留原数'), S.obj({ input: INPUT })),
  destuffValid: item(t('这一拍是不是非填充位'), S.obj({ input: INPUT })),
  destuffed: item(t('去除输入位串中的填充位；填充位的那一拍交出「—」'), S.obj({ input: INPUT })),
  dataLength: item(t('帧的数据长度，在长度字段最后一个原始位到达时交出，其余拍为「—」')),
  dataByte: item(t('帧的每个数据字节在它最后一个原始位到达时交出，其余拍为「—」')),
  bitParity: item(t('三个输入位的异或', 'the exclusive or of three input bits'), S.obj({ a: INPUT, b: INPUT, c: INPUT })),
  remainder: item(t('对有效的位逐位算指定生成式的校验余数，重来时先清零', 'the check remainder of enabled bits under the specified generator; reset before processing the current bit'), S.obj({ bit: INPUT, enable: INPUT, reset: INPUT, width: S.int({ min: 1, max: 15 }), poly: S.int({ min: 1, max: 32767 }) })),
  crcCheck: item(t('结束拍判断校验余数是否为零', 'whether the check remainder is zero on a finish tick'), S.obj({ bit: INPUT, enable: INPUT, reset: INPUT, finish: INPUT, width: S.int({ min: 1, max: 15 }), poly: S.int({ min: 1, max: 32767 }) })),
  identifier: item(t('帧的标识符，在它最后一位到达的那一拍；其余每一拍「—」')),
}

/* ---------- a level ---------- */

const FRAME = S.obj({ id: hex(0x7ff, 3), data: S.opt(S.list(hex(0xff, 2))), gap: S.opt(nat) })
const TEST = S.obj({
  bus: S.obj({ idle: S.opt(nat), frames: S.list(FRAME), tail: S.opt(nat) }, { about: t('总线：先安静 idle 拍，再一帧帧（帧前多空 gap 拍），最后安静 tail 拍') }),
  inputs: S.opt(S.map(S.list(S.int()), { view: 'ticks', about: t('每个输入每一拍的值') })),
  lineInputs: S.opt(S.list(S.str(), { about: t('这些输入每拍取总线上的位') })),
})
// What a level says once; then each task: its puzzle, done in turn (../../engine/circuit-domain.js levelSchema).
const LEVEL = levelSchema({
  test: TEST,
  ports: {
    listens: S.opt(S.bool({ about: t('板上有总线元件') })),
    inputs: S.opt(S.list(PORT)),
  },
  checks: { want: S.map(S.call('want'), { about: t('每个输出每一拍应当是什么') }) },
})

export const vocabulary = defineVocabulary({
  domain: 'can',
  version: 10,
  kinds: { part: PARTS, want: WANTS },
  game: GAME,
  level: LEVEL,
})
