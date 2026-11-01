// The __name__ domain's vocabulary (games/DESIGN.md 6.2): every thing a __name__ game's content may name, each with what
// it is and the schema of its parameters, and the schemas of game.json and of one level. Content is these items and
// their parameters, and nothing else: whatever a level needs that is not here is a new item, written in this domain.
//
// The items are implemented next to them: parts in parts.js, the signals a level wants in wants.js, the line a test
// plays on in line.js.

import { S } from '../../engine/schema.js'
import { defineVocabulary } from '../../engine/vocabulary.js'

const t = (zh, en) => ({ zh, en })
const item = (about, params) => ({ about, ...(params ? { params } : {}) })

const ids = S.list(S.str())
const TEXTS = S.list(S.text())
const NAME = S.str({ pattern: '^[A-Za-z_][A-Za-z0-9_]*$' })
const BITS = S.str({ pattern: '^[01.]*$', about: t('一拍一个字符：0、1，或 . 表示什么也不说', 'one character a tick: 0, 1, or . for nothing said') })
/** Blueprint text (board.js), one line a string: a reference board. */
const BOARD = S.board({ about: t('一块板的蓝图文本，每行一个字符串', 'a board as blueprint text, one string a line') })

/* ---------- the parts ---------- */

const PARTS = {
  reg: item(t('读寄存卡：同名寄存卡里存的值，存入之前给初值', 'Register: what the register of the same name holds, its start value before')),
  keep: item(t('存寄存卡：接入的值存进同名寄存卡，下一拍读得出', 'Keep: its input stored in the register of the same name, read from the next tick')),
  const: item(t('常数：设定的数', 'Constant: the number it is set to')),
}

/* ---------- what an output must be ---------- */

const WANTS = {
  line: item(t('这一拍线上的位', 'the bit on the line this tick')),
  delayed: item(t('输入 input 上一拍的值；第一拍给 first', 'what the input `input` was the tick before; first on the first tick'), S.obj({ input: S.str(), first: S.int() })),
}

/* ---------- a level ---------- */

const PORT = S.obj({ name: NAME, label: S.text() })
const TEST = S.obj({
  line: BITS,
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
  listens: S.opt(S.bool({ about: t('板上有线元件', 'the board has the line card') })),
  talks: S.opt(S.bool({ about: t('板上有「说」元件：接到它的位每一拍说到线上', 'the board has the say card: the bit wired to it goes on the line every tick') })),
  inputs: S.opt(S.list(PORT)),
  outputs: S.opt(S.list(PORT)),
  tests: S.list(TEST, { min: 1 }),
  hidden: S.opt(S.list(TEST, { about: t('隐藏测试：每次运行一并检查，通关后公开', 'hidden tests: checked with every run and shown once passed') })),
  want: S.map(S.call('want'), { about: t('每个输出（和 say）每一拍应当是什么', 'what each output (and say) must be, tick by tick') }),
  solution: BOARD,
  naive: S.opt(S.list(S.str(), { about: t('直觉上的错解：看起来能做、其实过不了这一关的板，必须失败', 'the naive answer: a board that looks right and is not, which must fail') })),
  builds: S.opt(S.obj({ type: NAME, name: S.text(), desc: S.text() }, { about: t('通过后这块板成为元件 type：它的输入口和结果口就是关卡的输入和输出', 'once passed the board is the part `type`: its ports are the level’s inputs and outputs') })),
  showcase: S.opt(S.text({ about: t('新元件第一次出现时只放它一个也算一关：为什么', 'a new part may have a level that only places it: why') })),
})

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
const SAVE_OP = S.either(
  S.obj({ rename: S.map(S.either(S.str(), S.oneOf([null]))) }),
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
  domain: '__name__',
  version: 1,
  kinds: { part: PARTS, want: WANTS },
  game: GAME,
  level: LEVEL,
})
