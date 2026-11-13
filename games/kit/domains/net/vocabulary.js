// The net domain's vocabulary (games/DESIGN.md 6.2): every thing a game on it may name, each with what it is and the
// schema of its parameters, and the schemas of game.json and of one level. Content is these items and their
// parameters, and nothing else: whatever a level needs that is not here is a new item, written in this domain.
//
// The items are implemented next to them: parts in parts.js, what a level wants in wants.js, the wires and the formats
// their far ends speak in wire.js.

import { S } from '../../engine/schema.js'
import { defineVocabulary } from '../../engine/vocabulary.js'
import { BUILT_PART, GAME, NAME, PORT, levelSchema } from '../../engine/circuit-domain.js'
import { FORMATS } from './wire.js'
import { T as t } from '../../shell/i18n.js'

const item = (about, params) => ({ about, ...(params ? { params } : {}) })

const nat = S.int({ min: 0 })
const BYTE = S.int({ min: 0, max: 255 })
const BITS = S.str({ pattern: '^[01]+$', view: 'ticks' })
const POLY = S.opt(S.str({ pattern: '^1[01]*1$', about: t('生成式，最高位在前（默认 1011）') }))
const FORMAT = S.oneOf(FORMATS, { about: t('线那头约好的格式（wire.js）：bytes、startstop、parity、check、blocks、flag、flagcheck、flagbyte') })
const WIRE_NAME = S.str({ about: t('这一关的一根进线的名字') })
const INPUT = S.str({ about: t('这一关的一个输入的名字') })

/* ---------- the parts ---------- */

const PARTS = {
  reg: item(t('读寄存卡：同名寄存卡里存的值，存入之前给初值')),
  keep: item(t('存寄存卡：接入的值存进同名寄存卡，下一拍读得出')),
  const: item(t('常数：设定的数')),
  select: item(t('选择：条件为是或 1 给出「是」一路，否则「否」一路')),
  add: item(t('相加：两个数之和')),
  equal: item(t('相等：两个数相同时为是')),
  bit: item(t('取位：8 位数 n 从最高位数起的第 i 位（i 从 0 起）')),
}

/* ---------- what an output or a wire out must be ---------- */

const ON = (extra = {}) => S.obj({ wire: WIRE_NAME, ...extra })
const WANTS = {
  echo: item(t('每一拍：这根进线这一拍到达的位'), ON()),
  opposite: item(t('每一拍：这根进线这一拍到达的位的反面'), ON()),
  differ: item(t('每一拍：两根进线这一拍的位不同时为 1，相同为 0'), S.obj({ a: WIRE_NAME, b: WIRE_NAME })),
  late: item(t('每一拍：这根进线上一拍的位；第一拍给 first'), ON({ first: S.oneOf([0, 1]) })),
  heard: item(t('每一拍：这根进线上到过 1 了没有（这一拍算在内），到过为 1，否则为 0'), ON()),
  count: item(t('每一拍：自从输入 reset 上一次为 1 过了几拍（那一拍为 0；没有过时从第 0 拍数起；输入 hold 为 1 的拍不算）'), S.obj({ reset: INPUT, hold: S.opt(INPUT) })),
  serial: item(t('每一拍：输入 start 第一次为 1 的那一拍起，接连 8 拍说出那一拍输入 byte 的各位（最高位先），其余各拍为 0'), S.obj({ byte: INPUT, start: INPUT })),
  pattern: item(t('每一拍：到这一拍为止最后几位正好是 bits 时为 1，否则为 0'), ON({ bits: BITS })),
  remainder: item(t('每一拍：到这一拍为止收到的位（输入 reset 为 1 的那一拍从头算起，输入 hold 为 1 的拍不算）除以生成式的余数，写成一个数；form 为 check 时是这些位后面补上校验位那么多个 0 再除的余数，也就是该跟在它们后面发出的校验位'), ON({ poly: S.str({ pattern: '^1[01]*1$' }), reset: S.opt(INPUT), hold: S.opt(INPUT), form: S.opt(S.oneOf(['divided', 'check'])) })),
  decoded: item(t('每一拍：按格式收到的字节，在它最后一位到达的那一拍（flag 格式在帧尾的旗标结束的那一拍）；其余各拍「—」'), ON({ format: FORMAT, poly: POLY })),
  intact: item(t('每一拍：按格式收到的每个字节（parity、check）或每一帧（flagcheck）是否完好，在它结束的那一拍；其余各拍「—」'), ON({ format: FORMAT, poly: POLY })),
  given: item(t('每一拍：测试的 expect 里写给这个输出的值（不写的拍不查）')),
  bytes: item(t('不论时机：这个输出给出的不是「—」的值，依次应当是按格式收到的字节（intactOnly：只算完好的帧里的）'), ON({ format: FORMAT, poly: POLY, intactOnly: S.opt(S.bool()) })),
  ends: item(t('不论时机：这个输出给出的不是「—」的值，依次应当是每一帧结束时它是否完好'), ON({ format: FORMAT, poly: POLY })),
  sent: item(t('线那头：按格式解出这根出线上说的话，应当正好是测试的队列（帧的格式每帧后面记一个帧尾；坏的不算）'), S.obj({ format: FORMAT, poly: POLY })),
  answers: item(t('线那头：按格式解出这根出线上说的话，应当是这根进线上到达的每一帧各一个回帧，只装一个字节：完好为 1，坏了为 0'), ON({ format: FORMAT, poly: POLY })),
  relayed: item(t('线那头：按格式解出这根出线上说的话，应当正好是这根进线上到达的完好的帧'), ON({ format: FORMAT, poly: POLY })),
}

/* ---------- a level ---------- */

const WIRE = S.obj({ name: NAME, label: S.text(), delay: S.opt(nat) })
const SEGMENT = S.either(
  S.obj({ idle: nat }),
  S.obj({ bits: BITS }),
  S.obj({ bytes: S.list(BYTE), format: FORMAT, poly: POLY }),
  S.obj({ frames: S.list(S.list(BYTE)), format: FORMAT, poly: POLY }),
)
const TEST = S.obj({
  wires: S.opt(S.map(S.obj({
    send: S.list(SEGMENT, { about: t('线那头依次说的：安静几拍、几位、按格式的字节或帧') }),
    flips: S.opt(S.list(nat, { about: t('这些拍到达的位被线翻转（从 0 数）') })),
  }), { about: t('每根进线上，线那头说什么') })),
  inputs: S.opt(S.map(S.list(S.either(S.int(), S.oneOf([null]))), { view: 'ticks', about: t('每个输入每一拍的值') })),
  queue: S.opt(S.list(S.list(BYTE), { about: t('板取用的队列：一列帧，每帧一列字节') })),
  expect: S.opt(S.map(S.list(S.any()), { view: 'ticks', about: t('given 要的值：每个输出每一拍的值，null 是「—」') })),
  ticks: S.opt(S.int({ min: 1, about: t('跑多少拍（默认：给的东西都到达以后再过两拍）') })),
})
// What a level says once; then each task: its puzzle, done in turn (../../engine/circuit-domain.js levelSchema).
const LEVEL = levelSchema({
  builds: S.opt(S.obj({ ...BUILT_PART, replaces: S.opt(S.list(NAME, { about: t('它取代的搭出的元件：从这一关往后，托盘里给它，不再给那些') })) }, { section: 'course', about: t('通过后最后一个任务的板成为元件 type：它的口就是那个任务的进线、输入、出线和输出') })),
  test: TEST,
  ports: {
    wires: S.opt(S.obj({ in: S.opt(S.list(WIRE)), out: S.opt(S.list(WIRE)) }, { about: t('板听的进线、板说的出线；它们和输入输出一样是板的口') })),
    inputs: S.opt(S.list(PORT)),
    outputs: S.opt(S.list(PORT)),
    pulls: S.opt(S.obj({ input: NAME, next: NAME, last: S.opt(NAME) }, { about: t('板从测试的队列里取字节：input 给出队首的字节（取完了是「—」），last 在它是一帧的最后一个字节时为是，输出 next 为 1 或是的那一拍取走它，下一拍出现下一个') })),
  },
  checks: { want: S.map(S.call('want'), { about: t('每个输出和出线应当是什么') }) },
  more: {
    carry: S.opt(S.level({ about: t('从玩家在这一关通过时的板开始（没通过就用它的参考解），换上这个任务的进线、输入、出线和输出；必须是先修') })),
    carries: S.opt(S.bool({ about: t('从上一个任务的板开始，换上这个任务的口') })),
  },
})

export const vocabulary = defineVocabulary({
  domain: 'net',
  version: 9,
  kinds: { part: PARTS, want: WANTS },
  game: GAME,
  level: LEVEL,
})
