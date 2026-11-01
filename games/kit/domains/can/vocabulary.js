// The can domain's vocabulary (games/DESIGN.md 6.2): every thing a bus game's content may name, each with what it is
// and the schema of its parameters, and the schemas of game.json and of one level. Content is these items and their
// parameters, and nothing else: whatever a level needs that is not here is a new item, written in this domain.
//
// The items are implemented next to them: parts in parts.js, the signals a level wants in wants.js, the bus a test
// plays on in bus.js.

import { S } from '../../engine/schema.js'
import { defineVocabulary } from '../../engine/vocabulary.js'

const t = (zh, en) => ({ zh, en })
const item = (about, params) => ({ about, ...(params ? { params } : {}) })

const nat = S.int({ min: 0 })
const ids = S.list(S.str())
const TEXTS = S.list(S.text())
const NAME = S.str({ pattern: '^[A-Za-z_][A-Za-z0-9_]*$' })
/** Blueprint text (board.js), one line a string: a reference board. */
const BOARD = S.list(S.str(), { about: t('一块板的蓝图文本，每行一个字符串', 'a board as blueprint text, one string a line') })
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

const PORT = S.obj({ name: NAME, label: S.text() })
const FRAME = S.obj({ id: hex(0x7ff, 3), data: S.opt(S.list(hex(0xff, 2))), gap: S.opt(nat) })
const TEST = S.obj({
  bus: S.obj({ idle: S.opt(nat), frames: S.list(FRAME), tail: S.opt(nat) }, { about: t('总线：先安静 idle 拍，再一帧帧（帧前多空 gap 拍），最后安静 tail 拍', 'the bus: idle quiet bits, then each frame (gap more quiet bits before it), then tail quiet bits') }),
  inputs: S.opt(S.map(S.list(S.int()), { about: t('每个输入每一拍的值', 'each input’s value tick by tick') })),
})
const LEVEL = S.obj({
  title: S.text(),
  brief: S.text(),
  intro: S.opt(S.list(S.obj({ t: S.text() }))),
  hint: S.opt(TEXTS),
  after: S.opt(S.text()),
  note: S.opt(S.text()),
  adds: S.opt(S.list(S.ref('part'))),
  listens: S.opt(S.bool({ about: t('板上有总线元件', 'the board has the bus card') })),
  inputs: S.opt(S.list(PORT)),
  outputs: S.list(PORT, { min: 1 }),
  tests: S.list(TEST, { min: 1 }),
  hidden: S.opt(S.list(TEST, { about: t('隐藏测试：每次运行一并检查，通关后公开；只合上可见测试的板过不了它', 'hidden tests: checked with every run and shown once passed; a board that only fits the visible tests fails them') })),
  want: S.map(S.call('want'), { about: t('每个输出每一拍应当是什么', 'what each output must be, tick by tick') }),
  solution: BOARD,
  naive: S.opt(S.list(S.str(), { about: t('直觉上的错解：看起来能做、其实过不了这一关的板，必须失败', 'the naive answer: a board that looks right and is not, which must fail') })),
  builds: S.opt(S.obj({ type: NAME, name: S.text(), desc: S.text() }, { about: t('通过后这块板成为元件 type：它的输入口和结果口就是关卡的输入和输出', 'once passed the board is the part `type`: its ports are the level’s inputs and outputs') })),
  showcase: S.opt(S.text({ about: t('新元件第一次出现时只放它一个也算一关：为什么', 'a new part may have a level that only places it: why') })),
})

/* ---------- game.json ---------- */

const ITEM = S.either(S.str(), S.obj({ parallel: S.list(S.obj({ id: S.str(), title: S.opt(S.text()), levels: ids })) }))
const AFTER = S.either(S.str(), ids)
const ERA = S.obj({
  id: S.int(),
  keeps: S.opt(S.either(S.oneOf(['all']), ids)),
  title: S.text(),
  question: S.text(),
  foundation: S.list(ITEM),
  practice: S.opt(S.list(ITEM)),
  topics: S.opt(S.list(S.obj({ id: S.str(), after: S.opt(AFTER), requires: S.opt(ids), levels: ids, title: S.opt(S.text()) }))),
  challenges: S.opt(S.list(S.obj({ level: S.str(), after: S.opt(AFTER) }))),
})
const SAVE_OP = S.either(
  S.obj({ rename: S.map(S.either(S.str(), S.oneOf([null]))) }),
  S.obj({ fields: S.map(S.str()) }),
  S.obj({ grant: S.list(S.str()) }),
  S.obj({ solve: S.list(S.either(S.str(), ids)) }),
  S.obj({ built: ids }),
  S.obj({ merge: S.list(S.either(S.str(), ids)) }),
  S.obj({ split: S.list(S.either(S.str(), ids)) }),
)
const GAME = S.obj({
  title: S.text(),
  kicker: S.text(),
  lede: S.text({ about: t('这款游戏教什么、学完能亲手做成什么，不写关卡数', 'what the game teaches and what the player ends up building, not how many levels') }),
  primitives: S.list(S.ref('part')),
  concept: S.opt(S.map(S.str(), { about: t('几个元件合起来是一个新概念', 'parts that are one new idea together') })),
  eras: S.list(ERA, { min: 1 }),
  saves: S.list(S.obj({ version: S.int({ min: 2 }), ops: S.list(SAVE_OP) })),
})

export const vocabulary = defineVocabulary({
  domain: 'can',
  version: 2,
  kinds: { part: PARTS, want: WANTS },
  game: GAME,
  level: LEVEL,
})
