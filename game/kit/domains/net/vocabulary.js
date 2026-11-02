// The net domain's vocabulary (games/DESIGN.md 6.2): every thing a game on it may name, each with what it is and the
// schema of its parameters, and the schemas of game.json and of one level. Content is these items and their
// parameters, and nothing else: whatever a level needs that is not here is a new item, written in this domain.
//
// The items are implemented next to them: parts in parts.js, what a level wants in wants.js, the wires and the formats
// their far ends speak in wire.js.

import { S } from '../../engine/schema.js'
import { SAVES, defineVocabulary } from '../../engine/vocabulary.js'
import { taskLevel } from '../../engine/tasks.js'
import { FORMATS } from './wire.js'

const t = (zh, en) => ({ zh, en })
const item = (about, params) => ({ about, ...(params ? { params } : {}) })

const nat = S.int({ min: 0 })
const BYTE = S.int({ min: 0, max: 255 })
const ids = S.list(S.str())
const TEXTS = S.list(S.text())
const NAME = S.str({ pattern: '^[A-Za-z_][A-Za-z0-9_]*$' })
const BITS = S.str({ pattern: '^[01]+$', view: 'ticks' })
const POLY = S.opt(S.str({ pattern: '^1[01]*1$', about: t('生成式，最高位在前（默认 1011）', 'the generator, its top bit first (1011 by default)') }))
const FORMAT = S.oneOf(FORMATS, { about: t('线那头约好的格式（wire.js）：bytes、startstop、parity、check、blocks、flag、flagcheck、flagbyte', 'the format the far end agreed on (wire.js): bytes, startstop, parity, check, blocks, flag, flagcheck, flagbyte') })
const WIRE_NAME = S.str({ about: t('这一关的一根进线的名字', 'the name of one of the level’s wires in') })
const INPUT = S.str({ about: t('这一关的一个输入的名字', 'the name of one of the level’s inputs') })
/** Blueprint text (board.js), one line a string: a reference board. */
const BOARD = S.board({ about: t('一块板的蓝图文本，每行一个字符串', 'a board as blueprint text, one string a line') })

/* ---------- the parts ---------- */

const PARTS = {
  reg: item(t('读寄存卡：同名寄存卡里存的值，存入之前给初值', 'Register: what the register of the same name holds, its start value before')),
  keep: item(t('存寄存卡：接入的值存进同名寄存卡，下一拍读得出', 'Keep: its input stored in the register of the same name, read from the next tick')),
  const: item(t('常数：设定的数', 'Constant: the number it is set to')),
  select: item(t('选择：条件为是或 1 给出「是」一路，否则「否」一路', 'Select: its Yes input when the condition is yes or 1, else its No input')),
  add: item(t('相加：两个数之和', 'Add: the sum of two numbers')),
  equal: item(t('相等：两个数相同时为是', 'Equal: yes when two numbers are the same')),
  bit: item(t('取位：8 位数 n 从最高位数起的第 i 位（i 从 0 起）', 'Bit of: bit i of the 8-bit number n, counted from the top (from 0)')),
}

/* ---------- what an output or a wire out must be ---------- */

const ON = (extra = {}) => S.obj({ wire: WIRE_NAME, ...extra })
const WANTS = {
  echo: item(t('每一拍：这根进线这一拍到达的位', 'tick by tick: the bit arriving on the wire this tick'), ON()),
  opposite: item(t('每一拍：这根进线这一拍到达的位的反面', 'tick by tick: the opposite of the bit arriving on the wire this tick'), ON()),
  differ: item(t('每一拍：两根进线这一拍的位不同时为 1，相同为 0', 'tick by tick: 1 when the two wires’ bits differ this tick, 0 when they agree'), S.obj({ a: WIRE_NAME, b: WIRE_NAME })),
  late: item(t('每一拍：这根进线上一拍的位；第一拍给 first', 'tick by tick: the bit the wire had the tick before; first on the first tick'), ON({ first: S.oneOf([0, 1]) })),
  heard: item(t('每一拍：这根进线上到过 1 了没有（这一拍算在内），到过为 1，否则为 0', 'tick by tick: 1 once a 1 has arrived on the wire (this tick included), 0 before'), ON()),
  count: item(t('每一拍：自从输入 reset 上一次为 1 过了几拍（那一拍为 0；没有过时从第 0 拍数起；输入 hold 为 1 的拍不算）', 'tick by tick: how many ticks since the input `reset` was last 1 (0 on that tick; counted from tick 0 before it ever is; ticks the input `hold` is 1 do not count)'), S.obj({ reset: INPUT, hold: S.opt(INPUT) })),
  serial: item(t('每一拍：输入 start 第一次为 1 的那一拍起，接连 8 拍说出那一拍输入 byte 的各位（最高位先），其余各拍为 0', 'tick by tick: from the first tick the input `start` is 1, the bits of the input `byte` at that tick over 8 ticks (top bit first), 0 on every other tick'), S.obj({ byte: INPUT, start: INPUT })),
  pattern: item(t('每一拍：到这一拍为止最后几位正好是 bits 时为 1，否则为 0', 'tick by tick: 1 when the last bits up to this tick are exactly `bits`, else 0'), ON({ bits: BITS })),
  remainder: item(t('每一拍：到这一拍为止收到的位（输入 reset 为 1 的那一拍从头算起，输入 hold 为 1 的拍不算）除以生成式的余数，写成一个数；form 为 check 时是这些位后面补上校验位那么多个 0 再除的余数，也就是该跟在它们后面发出的校验位', 'tick by tick: the remainder of the bits received so far (from the last tick the input `reset` is 1, leaving out the ticks the input `hold` is 1) divided by the generator, as a number; with form check, the remainder of those bits followed by as many 0s as there are check bits, which is the check bits to send after them'), ON({ poly: S.str({ pattern: '^1[01]*1$' }), reset: S.opt(INPUT), hold: S.opt(INPUT), form: S.opt(S.oneOf(['divided', 'check'])) })),
  decoded: item(t('每一拍：按格式收到的字节，在它最后一位到达的那一拍（flag 格式在帧尾的旗标结束的那一拍）；其余各拍「—」', 'tick by tick: the bytes received in the format, each on the tick its last bit arrives (in the flag formats, on the tick the closing flag ends); 「—」 on every other tick'), ON({ format: FORMAT, poly: POLY })),
  intact: item(t('每一拍：按格式收到的每个字节（parity、check）或每一帧（flagcheck）是否完好，在它结束的那一拍；其余各拍「—」', 'tick by tick: whether each byte (parity, check) or frame (flagcheck) received in the format is intact, on the tick it ends; 「—」 on every other tick'), ON({ format: FORMAT, poly: POLY })),
  given: item(t('每一拍：测试的 expect 里写给这个输出的值（不写的拍不查）', 'tick by tick: the values the test’s `expect` gives this output (ticks left out are not checked)')),
  bytes: item(t('不论时机：这个输出给出的不是「—」的值，依次应当是按格式收到的字节（intactOnly：只算完好的帧里的）', 'timing aside: the values this output gives that are not 「—」 must be, in order, the bytes received in the format (intactOnly: only those of intact frames)'), ON({ format: FORMAT, poly: POLY, intactOnly: S.opt(S.bool()) })),
  ends: item(t('不论时机：这个输出给出的不是「—」的值，依次应当是每一帧结束时它是否完好', 'timing aside: the values this output gives that are not 「—」 must be, in order, whether each frame was intact at its end'), ON({ format: FORMAT, poly: POLY })),
  sent: item(t('线那头：按格式解出这根出线上说的话，应当正好是测试的队列（帧的格式每帧后面记一个帧尾；坏的不算）', 'the far end: what it decodes in the format from this wire out must be exactly the test’s queue (in the frame formats an end after each frame; nothing broken counts)'), S.obj({ format: FORMAT, poly: POLY })),
  answers: item(t('线那头：按格式解出这根出线上说的话，应当是这根进线上到达的每一帧各一个回帧，只装一个字节：完好为 1，坏了为 0', 'the far end: what it decodes in the format from this wire out must be one reply a frame that arrived on the wire in, each holding one byte: 1 when that frame was intact, 0 when broken'), ON({ format: FORMAT, poly: POLY })),
  relayed: item(t('线那头：按格式解出这根出线上说的话，应当正好是这根进线上到达的完好的帧', 'the far end: what it decodes in the format from this wire out must be exactly the intact frames that arrived on the wire in'), ON({ format: FORMAT, poly: POLY })),
}

/* ---------- a level ---------- */

const PORT = S.obj({ name: NAME, label: S.text() })
const WIRE = S.obj({ name: NAME, label: S.text(), delay: S.opt(nat) })
const SEGMENT = S.either(
  S.obj({ idle: nat }),
  S.obj({ bits: BITS }),
  S.obj({ bytes: S.list(BYTE), format: FORMAT, poly: POLY }),
  S.obj({ frames: S.list(S.list(BYTE)), format: FORMAT, poly: POLY }),
)
const TEST = S.obj({
  wires: S.opt(S.map(S.obj({
    send: S.list(SEGMENT, { about: t('线那头依次说的：安静几拍、几位、按格式的字节或帧', 'what the far end says, in turn: quiet ticks, bits, bytes or frames in a format') }),
    flips: S.opt(S.list(nat, { about: t('这些拍到达的位被线翻转（从 0 数）', 'the ticks whose arriving bit the wire flips (from 0)') })),
  }), { about: t('每根进线上，线那头说什么', 'on each wire in, what its far end says') })),
  inputs: S.opt(S.map(S.list(S.either(S.int(), S.oneOf([null]))), { view: 'ticks', about: t('每个输入每一拍的值', 'each input’s value tick by tick') })),
  queue: S.opt(S.list(S.list(BYTE), { about: t('板取用的队列：一列帧，每帧一列字节', 'the queue the board pulls from: frames, each a list of bytes') })),
  expect: S.opt(S.map(S.list(S.any()), { view: 'ticks', about: t('given 要的值：每个输出每一拍的值，null 是「—」', 'what `given` wants: each output’s value tick by tick, null for 「—」') })),
  ticks: S.opt(S.int({ min: 1, about: t('跑多少拍（默认：给的东西都到达以后再过两拍）', 'how many ticks it runs (by default two after everything it gives has arrived)') })),
})
// What a level says once; then each task: its puzzle, done in turn (../../engine/tasks.js).
const ONCE = {
  title: S.text(),
  intro: S.opt(S.list(S.obj({ t: S.text() }))),
  after: S.opt(S.text()),
  note: S.opt(S.text()),
  adds: S.opt(S.list(S.ref('part'), { section: 'course' })),
  builds: S.opt(S.obj({ type: NAME, name: S.text(), desc: S.text(), replaces: S.opt(S.list(NAME, { about: t('它取代的搭出的元件：从这一关往后，托盘里给它，不再给那些', 'the built parts it supersedes: from this level on the tray offers it instead of them') })) }, { section: 'course', about: t('通过后最后一个任务的板成为元件 type：它的口就是那个任务的进线、输入、出线和输出', 'once passed the last task’s board is the part `type`: its ports are that task’s wires in, inputs, wires out and outputs') })),
  showcase: S.opt(S.text({ section: 'course', about: t('新元件第一次出现时只放它一个也算一关：为什么', 'a new part may have a level that only places it: why') })),
}
const TASK = {
  brief: S.text(),
  hint: S.opt(TEXTS),
  intro: S.opt(S.list(S.obj({ t: S.text() }), { section: 'read', about: t('这个任务自己的引言：第一次做到它时读（第一个任务的接在这一关的后面）', 'the task’s own intro: read the first time it is played (the first task’s after the level’s)') })),
  after: S.opt(S.text({ about: t('这个任务通过时说的话（最后一个任务用这一关的点题）', 'what passing the task says (the last task says the level’s pass text)') })),
  wires: S.opt(S.obj({ in: S.opt(S.list(WIRE)), out: S.opt(S.list(WIRE)) }, { about: t('板听的进线、板说的出线；它们和输入输出一样是板的口', 'the wires the board hears and the wires it says on; like inputs and outputs, they are the board’s ports') })),
  inputs: S.opt(S.list(PORT)),
  outputs: S.opt(S.list(PORT)),
  pulls: S.opt(S.obj({ input: NAME, next: NAME, last: S.opt(NAME) }, { about: t('板从测试的队列里取字节：input 给出队首的字节（取完了是「—」），last 在它是一帧的最后一个字节时为是，输出 next 为 1 或是的那一拍取走它，下一拍出现下一个', 'the board pulls bytes from the test’s queue: `input` shows the byte at its head (「—」 once used up), `last` is yes when it is a frame’s last byte, and the tick the output `next` is 1 or yes takes it, the next showing the tick after') })),
  tests: S.list(TEST, { min: 1, section: 'tests' }),
  hidden: S.opt(S.list(TEST, { section: 'tests', about: t('隐藏测试：每次运行一并检查，通关后公开；只合上可见测试的板过不了它', 'hidden tests: checked with every run and shown once passed; a board that only fits the visible tests fails them') })),
  want: S.map(S.call('want'), { about: t('每个输出和出线应当是什么', 'what each output and wire out must be') }),
  solution: BOARD,
  naive: S.opt(S.list(S.str(), { about: t('直觉上的错解：看起来能做、其实过不了这个任务的板，必须失败', 'the naive answer: a board that looks right and is not, which must fail') })),
  carry: S.opt(S.level({ about: t('从玩家在这一关通过时的板开始（没通过就用它的参考解），换上这个任务的进线、输入、出线和输出；必须是先修', 'start from the board the player passed this level with (its reference when not passed), its wires, inputs and outputs swapped for this task’s; it must be a prerequisite') })),
  carries: S.opt(S.bool({ about: t('从上一个任务的板开始，换上这个任务的口', 'start from the task before’s board, its ports swapped for this task’s') })),
}

/* ---------- game.json ---------- */

const levels = S.list(S.level())
const ITEM = S.either(S.level(), S.obj({ parallel: S.list(S.obj({ id: S.str(), title: S.opt(S.text()), levels })) }))
const AFTER = S.either(S.level(), levels)
const ERA = S.obj({
  id: S.int(),
  keeps: S.opt(S.either(S.oneOf(['all']), ids)),
  title: S.text(),
  question: S.text(),
  foundation: S.list(ITEM),
  practice: S.opt(S.list(ITEM)),
  topics: S.opt(S.list(S.obj({ id: S.str(), after: S.opt(AFTER), requires: S.opt(ids), levels, title: S.opt(S.text()) }))),
  challenges: S.opt(S.list(S.obj({ level: S.level(), after: S.opt(AFTER) }))),
})
const GAME = S.obj({
  title: S.text(),
  kicker: S.text(),
  lede: S.text({ about: t('这款游戏教什么、学完能亲手做成什么，不写关卡数', 'what the game teaches and what the player ends up building, not how many levels') }),
  primitives: S.list(S.ref('part')),
  concept: S.opt(S.map(S.str(), { about: t('几个元件合起来是一个新概念', 'parts that are one new idea together') })),
  eras: S.list(ERA, { min: 1 }),
  saves: SAVES,
})

export const vocabulary = defineVocabulary({
  domain: 'net',
  version: 3,
  kinds: { part: PARTS, want: WANTS },
  game: GAME,
  level: taskLevel(ONCE, TASK),
})
