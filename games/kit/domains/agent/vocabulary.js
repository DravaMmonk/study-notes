// The agent domain's vocabulary (games/DESIGN.md 6.2): every thing an agent game's content may name, each with what it
// is and the schema of its parameters, and the schemas of game.json and of one level. Content is these items and their
// parameters, and nothing else: whatever a level needs that is not here is a new item, written in this domain.
//
// The items are implemented next to them: parts in parts.js (the model's rules in model.js), machines in course.js and
// run.js, plays in ui/, the moves of a hand session in hand.js, the repositories and issues in world.js.

import { S } from '../../engine/schema.js'
import { defineVocabulary } from '../../engine/vocabulary.js'

const t = (zh, en) => ({ zh, en })
const item = (about, params) => ({ about, ...(params ? { params } : {}) })

const nat = S.int({ min: 0 })
const ids = S.list(S.str())
const TEXTS = S.list(S.text())
/** Blueprint text (board.js), one line a string: a reference board, a naive one. */
const BOARD = S.list(S.str(), { about: t('一块板的蓝图文本，每行一个字符串', 'a board as blueprint text, one string a line') })

/* ---------- the machines and parts ---------- */

const WINDOW = S.int({ min: 1, about: t('模型一次能读的 token 数', 'the tokens the model reads at once') })
const MACHINES = {
  hand: item(t('纸笔：还没有机器，玩家自己当循环', 'Pen and paper: no machine yet, the player is the loop'), S.obj({ window: WINDOW })),
  once: item(t('一问一答：板跑一遍，模型只调用一次，不能要东西', 'One call: the board runs once, the model is called once and cannot ask for anything'), S.obj({ window: WINDOW })),
  loop: item(t('循环：每轮跑一遍板，直到停下或轮数用完', 'The loop: the board runs every turn, until it stops or the turns run out'), S.obj({ window: WINDOW, turns: S.int({ min: 1 }) })),
}
const PARTS = {
  model: item(t('模型：读入上下文，给出一个动作', 'Model: reads a context, gives one action')),
  concat: item(t('拼接：至多三段上下文按顺序接成一段', 'Concat: up to three contexts joined in order')),
  read: item(t('读文件：设置里选的文件，或模型要的那个', 'Read: the file its setting names, or the one the model asks for')),
  list: item(t('目录：模型要目录时，列出仓库的文件和函数', 'File list: the repository’s files and functions, when the model asks')),
  test: item(t('运行测试：模型说做完或要求测试时，给出报告和是否通过', 'Run tests: a report and whether they pass, when the model says done or asks')),
}
const PLAYS = {
  hand: item(t('手动：玩家放文件、调用模型、跑测试', 'By hand: the player adds files, calls the model, runs the tests')),
  board: item(t('机器：拼一块板，机器按它的方式跑', 'Machine: a board, run the way its machine runs')),
}
const MOVES = {
  add: item(t('把仓库里的一个文件放进上下文', 'put a file of the repository into the context'), S.str()),
  list: item(t('把仓库的目录放进上下文', 'put the repository’s file list into the context')),
  drop: item(t('把上下文里的第 n 条移出（从 0 数）', 'take entry n out of the context (from 0)'), nat),
  call: item(t('调用模型', 'call the model')),
  test: item(t('运行测试，报告放进上下文', 'run the tests, the report into the context')),
}

/* ---------- the world: repositories and issues ---------- */

const REPO = S.obj({ files: S.map(S.obj({ tokens: nat, segs: ids }), { about: t('文件路径 → 它占的 token 和它的段（函数）', 'a file’s path → its tokens and its segments (functions)') }) })
const EDIT = S.obj({
  at: S.str({ pattern: '^[^#]+#[^#]+$', about: t('文件#段', 'file#segment') }),
  seen: S.oneOf(['file', 'seg', 'none'], { about: t('issue 的文字透露了多少：文件和函数、只有函数、只有症状', 'what the issue’s text gives away: the file and function, the function only, only the symptom') }),
  trap: S.opt(S.bool({ about: t('模型第一次会写错，看到这一处失败的报告才改对', 'the model gets it wrong first, right once a failing report on it is in view') })),
})
const ISSUE = S.obj({
  repo: S.str(),
  title: S.text(),
  text: S.text(),
  tokens: S.opt(nat),
  pasted: S.opt(S.list(S.str(), { about: t('issue 里贴出全文的文件', 'files whose code the issue quotes in full') })),
  symptom: S.opt(S.bool({ about: t('issue 只描述症状', 'the issue only describes a symptom') })),
  edits: S.list(EDIT, { min: 1 }),
})
const TEST = S.obj({ issue: S.str(), code: S.opt(S.str({ about: t('和 issue 一起给的代码（代码元件）', 'the code that comes with the issue (the code card)') })) })

/* ---------- a level ---------- */

const COMMON = {
  kind: S.ref('play'),
  title: S.text(),
  brief: S.text(),
  intro: S.opt(S.list(S.obj({ t: S.text() }))),
  hint: S.opt(TEXTS),
  after: S.text(),
  note: S.opt(S.text()),
  window: S.opt(WINDOW),
}
const LEVEL = S.by('kind', {
  hand: S.obj({
    ...COMMON,
    mode: S.oneOf(['once', 'loop'], { about: t('模型一次写完所有它知道的（once），还是会回头要东西（loop）', 'whether the model writes all it knows at once (once) or asks back (loop)') }),
    test: TEST,
    solution: S.list(S.call('move'), { min: 1, about: t('参考解：一串操作，最后一次测试通过', 'the reference: moves ending in a green test run') }),
  }),
  board: S.obj({
    ...COMMON,
    turns: S.opt(S.int({ min: 1 })),
    adds: S.opt(S.list(S.ref('part'))),
    tests: S.list(TEST, { min: 1 }),
    hidden: S.opt(S.list(TEST)),
    solution: BOARD,
    naive: S.opt(BOARD),
    budget: S.opt(S.obj({ tokens: S.opt(S.int({ min: 1 })), turns: S.opt(S.int({ min: 1 })) })),
    showcase: S.opt(S.text({ about: t('新元件第一次出现时只放它一个也算一关：为什么', 'a new part may have a level that only places it: why') })),
  }),
})

/* ---------- game.json ---------- */

const ITEM = S.either(S.str(), S.obj({ parallel: S.list(S.obj({ id: S.str(), title: S.opt(S.text()), levels: ids })) }))
const AFTER = S.either(S.str(), ids)
const ERA = S.obj({
  id: S.int(),
  machine: S.ref('machine'),
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
  S.obj({ merge: S.list(S.either(S.str(), ids)) }),
  S.obj({ split: S.list(S.either(S.str(), ids)) }),
)
const GAME = S.obj({
  title: S.text(),
  kicker: S.text(),
  lede: S.text({ about: t('这款游戏教什么、学完能亲手做成什么，不写关卡数', 'what the game teaches and what the player ends up building, not how many levels') }),
  primitives: S.list(S.ref('part')),
  machines: S.obj(Object.fromEntries(Object.entries(MACHINES).map(([k, m]) => [k, S.opt(m.params)])), { about: t('每种机器的窗口和轮数', 'each machine’s window and turns') }),
  eras: S.list(ERA, { min: 1 }),
  repos: S.map(REPO),
  issues: S.map(ISSUE),
  saves: S.list(S.obj({ version: S.int({ min: 2 }), ops: S.list(SAVE_OP) })),
})

export const vocabulary = defineVocabulary({
  domain: 'agent',
  version: 1,
  kinds: { part: PARTS, machine: MACHINES, play: PLAYS, move: MOVES },
  game: GAME,
  level: LEVEL,
})
