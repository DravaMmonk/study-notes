// The can domain's vocabulary (games/DESIGN.md 6.2): every thing a bus game's content may name, each with what it is
// and the schema of its parameters, and the schemas of game.json and of one level. Content is these items and their
// parameters, and nothing else: whatever a level needs that is not here is a new item, written in this domain.
//
// The items are implemented next to them: parts in parts.js, the signals a level wants in wants.js, the bus a test
// plays on in bus.js.

import { S } from '../../engine/schema.js'
import { defineVocabulary } from '../../engine/vocabulary.js'
import { GAME, NAME, PORT, levelSchema } from '../../engine/circuit-domain.js'
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
  delayedInput: item(t('输入的上一拍值；第一拍给 first', 'the input value on the previous tick; first on the first tick'), S.obj({ input: INPUT, first: BIT })),
  serialBit: item(t('开始时取输入字节，逐拍交出八位，空闲时为「—」', 'load a byte on start and give its eight bits tick by tick, or 「—」 while idle'), S.obj({ value: INPUT, start: INPUT })),
  serialBusy: item(t('这一拍是否正在逐位送字节', 'whether a byte is being sent on this tick'), S.obj({ value: INPUT, start: INPUT })),
  serialDone: item(t('这一拍是否为字节的最后一位', 'whether this tick is the final bit of the byte'), S.obj({ value: INPUT, start: INPUT })),
  serialDrive: item(t('逐位送字节，空闲时说隐性 1', 'send the byte bit by bit and say recessive 1 while idle'), S.obj({ value: INPUT, start: INPUT })),
  pacedBit: item(t('按允许前进的拍逐位送字节', 'send a byte bit by bit, advancing only when permitted'), S.obj({ value: INPUT, start: INPUT, advance: INPUT })),
  pacedBusy: item(t('可暂停的逐位发送器这一拍是否忙', 'whether the pausable serializer is busy this tick'), S.obj({ value: INPUT, start: INPUT, advance: INPUT })),
  pacedDone: item(t('可暂停的逐位发送器是否在这一拍取走最后一位', 'whether the pausable serializer accepts its final bit this tick'), S.obj({ value: INPUT, start: INPUT, advance: INPUT })),
  fieldBit: item(t('逐位交出指定宽度的字段', 'offer the bits of a field of the specified width'), S.obj({ value: INPUT, width: INPUT, start: INPUT, advance: INPUT })),
  fieldBusy: item(t('字段发送器这一拍是否忙', 'whether the field serializer is busy this tick'), S.obj({ value: INPUT, width: INPUT, start: INPUT, advance: INPUT })),
  fieldDone: item(t('字段发送器是否在这一拍取走最后一位', 'whether the field serializer accepts its final bit this tick'), S.obj({ value: INPUT, width: INPUT, start: INPUT, advance: INPUT })),
  fieldDrive: item(t('取走时发送字段位，其余拍说隐性 1', 'send an accepted field bit and say recessive 1 on other ticks'), S.obj({ value: INPUT, width: INPUT, start: INPUT, advance: INPUT })),
  queueSerialDrive: item(t('依次发送队列中字节的位，其余拍说隐性 1', 'send the queued bytes in order and say recessive 1 on other ticks')),
  queueSerialNext: item(t('在每个队列字节的最后一位取走它', 'take each queued byte on its final bit')),
  stuffedSerialDrive: item(t('逐位发送字节并插入填充位，空闲时说 1', 'send a byte bit by bit with stuffing, saying 1 while idle'), S.obj({ value: INPUT, start: INPUT })),
  stuffedSerialDone: item(t('原字节的最后一位是否在这一拍被取走', 'whether the final original bit of the byte is accepted this tick'), S.obj({ value: INPUT, start: INPUT })),
  stuffedSerialCrc: item(t('最后原始位被取走时给该字节的 CRC-15', 'the CRC-15 of the byte when its final original bit is accepted'), S.obj({ value: INPUT, start: INPUT })),
  stuffOut: item(t('逐位插入填充位，空闲时为「—」', 'insert stuff bits into the input stream, giving 「—」 while idle'), S.obj({ bit: INPUT, valid: INPUT, start: INPUT })),
  stuffAccepted: item(t('这一拍是否取走原始位', 'whether the original bit was accepted this tick'), S.obj({ bit: INPUT, valid: INPUT, start: INPUT })),
  stuffInserted: item(t('这一拍是否插入填充位', 'whether a stuff bit was inserted this tick'), S.obj({ bit: INPUT, valid: INPUT, start: INPUT })),
  stuffDrive: item(t('插入填充位后发送，空闲时说隐性 1', 'send the stuffed stream, saying recessive 1 while idle'), S.obj({ bit: INPUT, valid: INPUT, start: INPUT })),
  unchanged: item(t('总线这一拍的位和上一拍一样吗；第一拍和 first 比'), S.obj({ first: BIT })),
  tick: item(t('这是第几拍，从 0 数')),
  since: item(t('从第 tick 拍（从 0 数）起回答是，之前回答否'), S.obj({ tick: nat })),
  streak: item(t('这一拍之前，输入连着是 1 的拍数'), S.obj({ input: INPUT })),
  startOfFrame: item(t('帧起始：总线连着至少 11 拍隐性之后的第一个显性')),
  gathered: item(t('go 为 1 的每一拍把 bit 接到攒下的数末尾（先来的在高位），为 0 时是 0'), S.obj({ bit: INPUT, go: INPUT })),
  destuffedGather: item(t('去除填充位后逐位攒数，填充位的那一拍保留原数'), S.obj({ input: INPUT })),
  destuffValid: item(t('这一拍是不是非填充位'), S.obj({ input: INPUT })),
  destuffed: item(t('去除输入位串中的填充位；填充位的那一拍交出「—」'), S.obj({ input: INPUT })),
  destuffedReset: item(t('从每次重来的位开始去除填充位', 'remove stuff bits starting again on each reset tick'), S.obj({ input: INPUT, reset: INPUT })),
  destuffValidReset: item(t('重来后这一拍是否为原始位', 'whether this tick is an original bit after reset'), S.obj({ input: INPUT, reset: INPUT })),
  dataLength: item(t('帧的数据长度，在长度字段最后一个原始位到达时交出，其余拍为「—」')),
  dataByte: item(t('帧的每个数据字节在它最后一个原始位到达时交出，其余拍为「—」')),
  endOfFrame: item(t('在每帧七位帧结束字段的最后一位回答是，其余拍为「—」', 'yes on the final bit of each seven-bit end-of-frame field, and 「—」 on other ticks')),
  frameIndex: item(t('每个帧起始给出从 1 开始的帧序号，其余拍为「—」', 'the one-based frame index at each start of frame, and 「—」 on other ticks')),
  stuffingError: item(t('启用时检查六个相同位，出错后保持到重来', 'check for six equal bits while enabled and retain the error until reset'), S.obj({ bit: INPUT, enable: INPUT, reset: INPUT })),
  frameStatus: item(t('填充错误时立即给否，否则在 CRC 界定位给校验结果', 'no immediately on a stuffing error, otherwise the CRC result at the CRC delimiter'), S.obj({ bit: INPUT })),
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
  queue: S.opt(S.list(hex(0xff, 2), { about: t('等待板逐个取走的字节', 'bytes waiting for the board to take one at a time') })),
})
// What a level says once; then each task: its puzzle, done in turn (../../engine/circuit-domain.js levelSchema).
const LEVEL = levelSchema({
  test: TEST,
  ports: {
    listens: S.opt(S.bool({ about: t('板上有总线元件') })),
    drives: S.opt(S.bool({ about: t('板上有驱动总线的说话口', 'the board has a port that drives the bus') })),
    inputs: S.opt(S.list(PORT)),
    pulls: S.opt(S.obj({ input: NAME, available: NAME, next: NAME }, { about: t('输入读取队首字节和是否有字节；输出为 1 时取走队首，下一拍出现下一字节', 'inputs give the front byte and whether one is available; output 1 takes it and the next byte appears next tick') })),
  },
  checks: { want: S.map(S.call('want'), { about: t('每个输出每一拍应当是什么') }) },
})

export const vocabulary = defineVocabulary({
  domain: 'can',
  version: 21,
  kinds: { part: PARTS, want: WANTS },
  game: GAME,
  level: LEVEL,
})
