// The __name__ domain's vocabulary (games/DESIGN.md 6.2): every thing a __name__ game's content may name, each with what
// it is and the schema of its parameters, and the schemas of game.json and of one level. Content is these items and
// their parameters, and nothing else: whatever a level needs that is not here is a new item, written in this domain.
//
// The parts are implemented in parts.js, drawn as ui/catalog.js says.

import { S } from '../../engine/schema.js'
import { SAVES, defineVocabulary } from '../../engine/vocabulary.js'
import { taskLevel } from '../../engine/tasks.js'

const t = (zh, en) => ({ zh, en })
const item = (about, params) => ({ about, ...(params ? { params } : {}) })

const ids = S.list(S.str())
const TEXTS = S.list(S.text())
const NAME = S.str({ pattern: '^[A-Za-z_][A-Za-z0-9_]*$' })
/** Blueprint text (board.js), one line a string: a reference board, a naive one. */
const BOARD = S.list(S.str(), { about: t('一块板的蓝图文本，每行一个字符串', 'a board as blueprint text, one string a line') })

/* ---------- the parts ---------- */

const PARTS = {
  add: item(t('相加：两个输入之和', 'Add: the sum of its two inputs')),
  sub: item(t('相减：第一个输入减去第二个', 'Subtract: its first input less its second')),
}

/* ---------- a level ---------- */

const PORT = S.obj({ name: NAME, label: S.text() })
const VALUES = S.map(S.num(), { about: t('每个输入或输出的值，按名字', 'a value for each input or output, by name') })
const TEST = S.obj({ inputs: VALUES, expect: VALUES })
// What a level says once; then each task: its puzzle, done in turn (../../engine/tasks.js).
const ONCE = {
  title: S.text(),
  intro: S.opt(S.list(S.obj({ t: S.text() }))),
  after: S.opt(S.text()),
  note: S.opt(S.text()),
  adds: S.opt(S.list(S.ref('part'), { section: 'course' })),
  builds: S.opt(S.obj({ type: NAME, name: S.text(), desc: S.text() }, { section: 'course', about: t('通过后最后一个任务的板成为元件 type：它的输入口和结果口就是那个任务的输入和输出', 'once passed the last task’s board is the part `type`: its ports are that task’s inputs and outputs') })),
  showcase: S.opt(S.text({ section: 'course', about: t('新元件第一次出现时只放它一个也算一关：为什么', 'a new part may have a level that only places it: why') })),
}
const TASK = {
  brief: S.text(),
  hint: S.opt(TEXTS),
  intro: S.opt(S.list(S.obj({ t: S.text() }), { section: 'read', about: t('这个任务自己的引言：第一次做到它时读', 'the task’s own intro: read the first time it is played') })),
  after: S.opt(S.text({ about: t('这个任务通过时说的话（最后一个任务用这一关的点题）', 'what passing the task says (the last task says the level’s pass text)') })),
  inputs: S.list(PORT),
  outputs: S.list(PORT, { min: 1 }),
  tests: S.list(TEST, { min: 1, section: 'tests' }),
  hidden: S.opt(S.list(TEST, { section: 'tests', about: t('隐藏测试：每次运行一并检查，通关后公开', 'hidden tests: checked with every run and shown once passed') })),
  solution: BOARD,
  naive: S.opt(S.list(S.str(), { about: t('直觉上的错解：看起来能做、其实过不了这个任务的板，必须失败', 'the naive answer: a board that looks right and is not, which must fail') })),
}

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
  domain: '__name__',
  version: 1,
  kinds: { part: PARTS },
  game: GAME,
  level: taskLevel(ONCE, TASK),
})
