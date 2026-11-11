// The agent domain's vocabulary (games/DESIGN.md 6.2): every thing an agent game's content may name, each with what it
// is and the schema of its parameters, and the schemas of game.json and of one level (a list of tasks). Content is these
// items and their parameters, and nothing else: whatever a level needs that is not here is a new item, written in this
// domain.
//
// The items are implemented next to them: parts in parts.js (the model's rules in model.js), machines in course.js and
// run.js, plays in ui/, the moves of a hand session in hand.js, the repositories and issues in world.js.

import { S } from '../../engine/schema.js'
import { defineVocabulary } from '../../engine/vocabulary.js'
import { taskLevel } from '../../engine/tasks.js'
import { TRAY, TRAYS } from '../../engine/trays.js'
import { T as t } from '../../shell/i18n.js'

const item = (about, params) => ({ about, ...(params ? { params } : {}) })

const nat = S.int({ min: 0 })
const ids = S.list(S.str())
const TEXTS = S.list(S.text())
/** Blueprint text (board.js), one line a string: a reference board, a naive one. */
const BOARD = S.board({ about: t('一块板的蓝图文本，每行一个字符串') })

/* ---------- the machines and parts ---------- */

const WINDOW = S.int({ min: 1, about: t('模型一次能读的 token 数') })
const MACHINES = {
  hand: item(t('纸笔：还没有机器，玩家自己当循环'), S.obj({ window: WINDOW })),
  once: item(t('一问一答：板跑一遍，模型只调用一次，不能要东西'), S.obj({ window: WINDOW })),
  loop: item(t('循环：每轮跑一遍板，直到停下或轮数用完'), S.obj({ window: WINDOW, turns: S.int({ min: 1 }) })),
}
const PARTS = {
  model: item(t('模型：读入上下文，给出一个动作')),
  concat: item(t('拼接：至多三段上下文按顺序接成一段')),
  read: item(t('读文件：设置里选的文件，或模型要的那个')),
  list: item(t('目录：模型要目录时，列出仓库的文件和函数')),
  test: item(t('运行测试：模型说做完或要求测试时，给出报告和是否通过')),
}
const PLAYS = {
  hand: item(t('手动：玩家放文件、调用模型、跑测试')),
  board: item(t('机器：拼一块板，机器按它的方式跑')),
}
const MOVES = {
  add: item(t('把仓库里的一个文件放进上下文'), S.str()),
  list: item(t('把仓库的目录放进上下文')),
  drop: item(t('把上下文里的第 n 条移出（从 0 数）'), nat),
  call: item(t('调用模型', 'call the model')),
  test: item(t('运行测试，报告放进上下文')),
}

/* ---------- the world: repositories and issues ---------- */

const REPO = S.obj({ files: S.map(S.obj({ tokens: nat, segs: ids }), { about: t('文件路径 → 它占的 token 和它的段（函数）') }) })
const EDIT = S.obj({
  at: S.str({ pattern: '^[^#]+#[^#]+$', about: t('文件#段') }),
  seen: S.oneOf(['file', 'seg', 'none'], { about: t('issue 的文字透露了多少：文件和函数、只有函数、只有症状') }),
  trap: S.opt(S.bool({ about: t('模型第一次会写错，看到这一处失败的报告才改对') })),
})
const ISSUE = S.obj({
  repo: S.str(),
  title: S.text(),
  text: S.text(),
  tokens: S.opt(nat),
  pasted: S.opt(S.list(S.str(), { about: t('issue 里贴出全文的文件') })),
  symptom: S.opt(S.bool({ about: t('issue 只描述症状') })),
  edits: S.list(EDIT, { min: 1 }),
})
const TEST = S.obj({ issue: S.str(), code: S.opt(S.str({ about: t('和 issue 一起给的代码（代码元件）') })) })

/* ---------- a level ---------- */

// What a level says once: its title, its introduction, its pass text, its place in the course.
const ONCE = {
  title: S.text(),
  intro: S.opt(S.list(S.obj({ t: S.text() }))),
  after: S.text(),
  note: S.opt(S.text()),
  adds: S.opt(S.list(S.ref('part'), { section: 'course' })),
  tray: TRAY,
  showcase: S.opt(S.text({ section: 'course', about: t('新元件第一次出现时只放它一个也算一关：为什么') })),
}
// A task: a hand session or a board, with its brief, its hints and the window of its machine.
const COMMON = {
  kind: S.ref('play'),
  brief: S.text(),
  hint: S.opt(TEXTS),
  window: S.opt(WINDOW),
}
const TASK = S.by('kind', {
  hand: S.obj({
    ...COMMON,
    mode: S.oneOf(['once', 'loop'], { about: t('模型一次写完所有它知道的（once），还是会回头要东西（loop）') }),
    test: S.obj(TEST.fields, { section: 'tests' }),
    solution: S.list(S.call('move'), { min: 1, about: t('参考解：一串操作，最后一次测试通过') }),
  }),
  board: S.obj({
    ...COMMON,
    turns: S.opt(S.int({ min: 1 })),
    tests: S.list(TEST, { min: 1, section: 'tests' }),
    hidden: S.opt(S.list(TEST, { section: 'tests' })),
    solution: BOARD,
    naive: S.opt(BOARD),
    budget: S.opt(S.obj({ tokens: S.opt(S.int({ min: 1 })), turns: S.opt(S.int({ min: 1 })) })),
  }),
})

/* ---------- game.json ---------- */

const levels = S.list(S.level())
const ITEM = S.either(S.level(), S.obj({ parallel: S.list(S.obj({ id: S.str(), title: S.opt(S.text()), levels })) }))
const AFTER = S.either(S.level(), levels)
const ERA = S.obj({
  id: S.int(),
  machine: S.ref('machine'),
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
  trays: TRAYS,
  machines: S.obj(Object.fromEntries(Object.entries(MACHINES).map(([k, m]) => [k, S.opt(m.params)])), { about: t('每种机器的窗口和轮数') }),
  eras: S.list(ERA, { min: 1 }),
  repos: S.map(REPO),
  issues: S.map(ISSUE),
})

export const vocabulary = defineVocabulary({
  domain: 'agent',
  version: 1,
  kinds: { part: PARTS, machine: MACHINES, play: PLAYS, move: MOVES },
  game: GAME,
  level: taskLevel(ONCE, TASK),
})
