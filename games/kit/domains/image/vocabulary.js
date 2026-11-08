// The image domain's vocabulary (games/DESIGN.md 6.2): every thing an image game's content may name, each with what
// it is and the schema of its parameters, and the schemas of game.json and of one level. Content is these items and
// their parameters, and nothing else: whatever a level needs that is not here is a new item, written in this domain.
//
// The items are implemented next to their schemas: parts in engine/nodes.js and engine/parts/, pictures, scenes,
// targets, budgets, bench models and bench displays in items/.
import { S } from '../../engine/schema.js'
import { defineVocabulary } from '../../engine/vocabulary.js'
import { taskLevel } from '../../engine/tasks.js'
import { TRAY, TRAYS } from '../../engine/trays.js'
import { benchSchema, displayItems } from '../../engine/bench.js'
import { NODE_TYPES } from './engine/nodes.js'
import { PICTURES } from './items/pictures.js'
import { SCENES } from './items/scenes/index.js'
import { TARGETS } from './items/targets.js'
import { CONSTRAINTS } from './items/constraints.js'
import { BENCH_MODELS } from './items/benches.js'
import { DISPLAYS } from './items/displays.js'
import { T as t } from '../../shell/i18n.js'

/** A kind's items as the vocabulary prints them: what each is, and its parameters. */
const items = (all) => Object.fromEntries(Object.entries(all).map(([name, it]) => [name, { about: it.about, ...(it.params ? { params: it.params } : {}) }]))

/* ---------- the parts, what levels unlock, how a picture is drawn ---------- */

const PARTS = Object.fromEntries(Object.entries(NODE_TYPES).filter(([, spec]) => !spec.fixed && !spec.kit).map(([type, spec]) => [type, { about: spec.label }]))
// What a level may unlock: a part (its flag), one of a part's settings, or one option of a setting.
const FLAGS = new Map()
for (const spec of Object.values(NODE_TYPES)) {
  if (spec.unlock) FLAGS.set(spec.unlock, spec.label)
  for (const param of spec.params ?? []) {
    if (param.unlock) FLAGS.set(param.unlock, t(`${spec.label.zh ?? spec.label} 的「${param.label.zh ?? param.label}」`, `${spec.label.en ?? spec.label}’s ${param.label.en ?? param.label}`))
    for (const option of param.options ?? []) if (option[2]) FLAGS.set(option[2], t(`${spec.label.zh ?? spec.label} 的「${option[1].zh ?? option[1]}」`, `${spec.label.en ?? spec.label}’s ${option[1].en ?? option[1]}`))
  }
}
const UNLOCKS = Object.fromEntries([...FLAGS].map(([flag, about]) => [flag, { about }]))
// The ways a picture is drawn (ui/views/views.js draws them).
const VIEWS = {
  pixels: { about: t('像素：亮度显示为灰度', 'pixels: brightness as grey level') },
  terrain: { about: t('地形：亮度显示为高度', 'terrain: brightness as height') },
  slope: { about: t('坡度：等高线和指向变亮最快方向的箭头', 'slope: contours, and arrows pointing where it brightens fastest') },
  profile: { about: t('剖面：一行像素的亮度曲线', 'profile: the brightness along one row of pixels') },
  spectrum: { about: t('频谱：各频率分量的强度', 'spectrum: the strength of each frequency') },
}

/* ---------- a level ---------- */

const TEXT = S.text()
const ids = S.list(S.str())
/** Blueprint text (../../circuit/text.js), one line a string: a reference board, a naive one. */
const BOARD = S.board({ about: t('一块电路板的蓝图文本，每行一个字符串', 'a board as blueprint text, one string a line') })
const VIEW = S.ref('view')
const VIEWS_OF = S.obj({ in: S.opt(VIEW), out: S.opt(VIEW), mid: S.opt(VIEW) }, { about: t('输入、输出、中间元件默认的画法', 'how the inputs, the outputs and the parts between are drawn at first') })
const CHECK = S.obj({ tolerance: S.opt(S.num()), mismatches: S.opt(S.int({ min: 0 })) }, { about: t('一格差多少算对（tolerance），最多几格不对（mismatches）', 'how far a cell may be off (tolerance), how many cells may be wrong (mismatches)') })
const SOURCE = S.either(S.oneOf(['test']), S.call('picture'))
const FIGURE = S.either(
  S.obj({ test: S.int({ min: 0 }), task: S.opt(S.int({ min: 0 })), view: S.opt(VIEW), caption: S.opt(TEXT) }),
  S.obj({ part: S.ref('part'), params: S.opt(S.map(S.any())), input: S.opt(SOURCE), inputs: S.opt(S.list(SOURCE)), view: S.opt(VIEW), caption: S.opt(TEXT) }),
  S.obj({ figure: S.str({ pattern: '^[a-z0-9-]+$', about: t('笔记插图的名字（trace-viewer/src/figures 登记的 id，检查时核对）', 'the id of one of the notes’ figures (as trace-viewer/src/figures registers it, checked)') }), caption: S.opt(TEXT) }),
)
const INTRO = S.list(S.obj({ t: TEXT, fig: S.opt(FIGURE) }), { section: 'read', about: t('引言：进关前读的几页，每页一段话和一张可选的图', 'the intro: pages read before playing, each a paragraph and maybe a figure') })

// What a level says once: its title, its intro, its pass text and its place in the course.
const ONCE = {
  title: TEXT,
  after: S.text({ about: t('通过这一关时说的话（最后一个任务的点题）', 'what passing the level says (its last task’s pass text)') }),
  intro: INTRO,
  unlocks: S.opt(S.list(S.ref('unlock'), { section: 'course' })),
  adds: S.opt(S.list(S.ref('part'), { section: 'course' })),
  tray: TRAY,
  grants: S.opt(S.list(S.ref('unlock'), { section: 'course', about: t('这一关自己就给出的设置选项（它要亲手用它搭出元件）；不能是元件', 'setting options the level gives for its own play (it builds a part with one); never a part') })),
  packs: S.opt(S.obj({ name: TEXT, desc: TEXT }, { section: 'course', about: t('通关的电路成为一个元件：它的名字和说明', 'the passing circuit becomes a part: its name and description') })),
  showcase: S.opt(S.str({ section: 'course', about: t('新元件第一次出现时只放它一个也算一关：它的用法抽象在哪里', 'a new part may have a level that only places it: what is abstract about its use') })),
}
// What every task says: what it asks, how to start, and what passing it says before the next (the last task's is the
// level's); what it opens for the tasks after it, and what it keeps from a player who holds it already.
const TASK = {
  brief: TEXT,
  hint: S.opt(TEXT),
  after: S.opt(S.text({ about: t('这个任务通过时说的话（最后一个任务用这一关的点题）', 'what passing the task says (the last task says the level’s pass text)') })),
  unlocks: S.opt(S.list(S.ref('unlock'), { section: 'course', about: t('这一段搭出的能力：后面的任务马上能用，整关通过时解锁', 'what this task builds: the tasks after it hold it at once, and passing the level unlocks it') })),
  withhold: S.opt(S.list(S.ref('unlock'), { section: 'course', about: t('这一段亲手搭的东西：玩家已有也先收起', 'what this task builds by hand: kept from a player who holds it already') })),
  carries: S.opt(S.bool({ about: t('从上一段的电路开始', 'start from the task before’s board') })),
}
/** What a circuit task says about its board. */
const BOARD_FIELDS = {
  inputs: S.opt(ids),
  inputLabels: S.opt(S.map(TEXT)),
  inputDescriptions: S.opt(S.map(TEXT, { about: t('输入元件的说明，按输入名填写', 'descriptions of input parts, keyed by input name') })),
  outputs: S.opt(ids),
  outputLabels: S.opt(S.map(TEXT)),
  views: S.opt(VIEWS_OF),
  check: S.opt(CHECK),
  constraint: S.opt(S.call('constraint')),
  trainRate: S.opt(S.num({ about: t('训练一步走多远', 'how far one training step goes') })),
  trainRates: S.opt(S.list(S.num(), { about: t('能选的学习率（选了就不再回退步长）', 'the learning rates to choose from (a step is then taken as it is)') })),
  solution: S.opt(BOARD),
  naive: S.opt(BOARD),
  alsoFails: S.opt(S.list(BOARD, { about: t('也必须失败的电路', 'boards that must fail too') })),
}
// A circuit task by its scene: the scene's setup, and its tests in the scene's shape.
const GRAPH = S.by('scene', Object.fromEntries(Object.entries(SCENES).map(([name, scene]) => {
  const test = S.obj({ label: TEXT, train: S.opt(S.bool({ about: t('false：不拿来训练，只用来检查训练（新样本）', 'false: not trained on, only checking the training (a new sample)') })), ...scene.test.fields })
  const setup = scene.setup && (Object.values(scene.setup.fields).every((f) => f.optional) ? S.opt(scene.setup) : scene.setup)
  return [name, S.obj({ kind: S.oneOf(['graph']), ...TASK, ...BOARD_FIELDS, scene: S.oneOf([name]), ...(setup ? { setup } : {}), tests: S.list(test, { min: 1, section: 'tests' }), hidden: S.opt(S.list(test, { section: 'tests' })) })]
})))
const PROBE = S.obj({
  kind: S.oneOf(['probe']),
  ...TASK,
  part: S.ref('part', { about: t('台上的黑箱', 'the black box on the bench') }),
  question: TEXT,
  answers: S.list(S.str()),
  answer: S.str(),
  wrong: TEXT,
  probes: S.list(S.obj({ label: TEXT, picture: S.call('picture') })),
})
const BENCH = S.obj({ kind: S.oneOf(['board']), ...TASK, bench: benchSchema(BENCH_MODELS) })

/* ---------- game.json ---------- */

const levels = S.list(S.level())
const ITEM = S.either(S.level(), S.obj({ parallel: S.list(S.obj({ id: S.str(), title: TEXT, levels })) }))
const AFTER = S.either(S.level(), levels)
const ERA = S.obj({
  id: S.int({ min: 0 }),
  foundation: S.list(ITEM),
  topics: S.opt(S.list(S.obj({ id: S.str(), levels, after: S.opt(AFTER) }))),
  challenges: S.opt(S.list(S.obj({ level: S.level(), after: S.opt(AFTER) }))),
  chapter: S.obj({ title: TEXT, lecture: TEXT, question: TEXT }),
})
const GAME = S.obj({
  title: TEXT,
  kicker: TEXT,
  lede: S.text({ about: t('这款游戏教什么、学完能亲手做成什么，不写关卡数', 'what the game teaches and what the player ends up building, not how many levels') }),
  power: S.obj({ title: TEXT, lines: S.list(TEXT) }, { about: t('第一次打开时的上电台词', 'the power-on lines on first opening') }),
  primitives: S.list(S.ref('part'), { about: t('没有电路能搭出的元件', 'the parts no circuit builds') }),
  trays: TRAYS,
  concept: S.map(S.str(), { about: t('几个元件合起来是一个新概念', 'parts that are one new idea together') }),
  replaces: S.map(S.list(S.ref('part')), { about: t('一个元件出现后取代的元件', 'the parts a part supersedes once met') }),
  views: S.map(S.level(), { about: t('每种画法在哪一关引入（像素一开始就有）', 'the level each way of drawing a picture comes with (pixels from the start)') }),
  eras: S.list(ERA, { min: 1 }),
  box: S.obj({
    sample: S.level({ about: t('没有测试的关解锁的元件，在这一关的测试图上试', 'the level whose pictures a part from a level without tests is tried on') }),
    inLevel: S.map(S.level(), { about: t('在这一关的参考电路里试的元件', 'parts tried inside a level’s own reference circuit') }),
    boards: S.opt(S.map(BOARD, { about: t('试这个元件用的电路（参考电路里把它拆成了小元件时）', 'the board a part is tried on (where the reference spells it out in smaller parts)') })),
  }, { about: t('元件箱怎么试一个元件', 'how the parts box tries a part') }),
  quotes: S.opt(S.list(S.str(), { about: t('文案里可以照字面引用的名字（说的是别的东西）', 'names a text may quote rather than link (they mean something else there)') })),
})

export const vocabulary = defineVocabulary({
  domain: 'image',
  version: 4,
  kinds: {
    part: PARTS,
    unlock: UNLOCKS,
    view: VIEWS,
    picture: items(PICTURES),
    scene: Object.fromEntries(Object.entries(SCENES).map(([name, s]) => [name, { about: s.about, ...(s.setup ? { params: s.setup } : {}), test: s.test }])),
    target: items(TARGETS),
    constraint: items(CONSTRAINTS),
    benchModel: Object.fromEntries(Object.entries(BENCH_MODELS).map(([name, m]) => [name, { about: m.about, ...(m.setup ? { params: m.setup } : {}), ...(m.stage ? { stage: m.stage } : {}), ...(m.case ? { case: m.case } : {}) }])),
    display: displayItems(DISPLAYS),
  },
  game: GAME,
  // A level is a list of tasks (../../engine/tasks.js), each by its kind, and a circuit task by its scene too.
  level: taskLevel(ONCE, S.by('kind', { graph: GRAPH, probe: PROBE, board: BENCH })),
})
