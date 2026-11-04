// The vision domain's vocabulary (games/DESIGN.md 6.2, 6.8): every thing a vision game's content may name, each with
// what it is and the schema of its parameters, and the schemas of game.json and of one level. Content is these items
// and their parameters, and nothing else: whatever a level needs that is not here is a new item, written here.
//
// The items are implemented next to them: the parts in parts.js, the grid asks in grid.js, the judges and claims in
// judges.js, the scenes and their colours in scene.js, the bench models in benches/ and their displays in ui/benches/.

import { S } from '../../engine/schema.js'
import { SAVES, defineVocabulary } from '../../engine/vocabulary.js'
import { taskLevel } from '../../engine/tasks.js'
import { LIMIT, benchSchema, displayItems } from '../../engine/bench.js'
import { PRIMITIVES } from './parts.js'
import { ASK_ITEMS } from './grid.js'
import { CLAIMS, JUDGES } from './judges.js'
import { COLOURS } from './scene.js'
import { BENCH_MODELS, DISPLAYS } from './benches/index.js'

const t = (zh, en) => ({ zh, en })
const item = (about, params) => ({ about, ...(params ? { params } : {}) })
const items = (all) => Object.fromEntries(Object.entries(all).map(([k, v]) => [k, item(v.about, v.params)]))

const num = S.num()
const ids = S.list(S.str())
const TEXTS = S.list(S.text())
const INTRO = S.list(S.obj({
  t: S.text(),
  fig: S.opt(S.oneOf(['lab', 'projection', 'samples', 'pixel-units', 'pixel-origin', 'filter-window', 'nearest-sampling', 'sampling-material', 'smoothing', 'separable', 'directional-change', 'inspection', 'inspection-samples', 'weighted-line', 'window-table', 'frequency-wave', 'frequency-probe', 'frequency-table', 'frequency-filter', 'outside-zero', 'outside-clamp', 'outside-wrap', 'outside-reflect', 'outside-valid'])),
}))
const NAME = S.str({ pattern: '^[A-Za-z_][A-Za-z0-9_]*$' })
/** Blueprint text (board.js), one line a string: a reference board, a naive one. */
const BOARD = S.board({ about: t('一块板的蓝图文本，每行一个字符串', 'a board as blueprint text, one string a line') })

/* ---------- what content names ---------- */

const PART_ABOUT = {
  arithmetic: t('可设置为加、减、乘、除：数与图逐值计算，向量与向量、向量与数逐分量计算', 'Configurable addition, subtraction, multiplication or division: elementwise over numbers and images, componentwise over vectors'),
  abs: t('逐值取绝对值', 'Absolute value, elementwise'),
  cosine: t('以周为单位计算余弦：1 周是 2π 弧度', 'Cosine in turns: one turn is 2π radians'),
  shift: t('按整数位移向量 d 读取邻居：输出 (x, y) 读输入 (x, y) + d；边界规则显式可选', 'Read the neighbour at an integer offset vector d: output (x, y) reads input (x, y) + d, with explicit boundary handling'),
  transpose: t('交换行与列，保留原值', 'Exchange rows and columns without changing values'),
  reverse: t('将表旋转 180 度', 'Rotate a table by 180 degrees'),
  windowTable: t('展开每个邻域的读数和权重，不相乘、不求和', 'Expose each window’s samples and weights without multiplying or summing'),
  reduceRows: t('逐行求和或平均，自动完成数值计算', 'Sum or average each row automatically'),
  restore: t('将每个位置的单个结果还原为给定图像的尺寸', 'Restore one result per position to an image’s dimensions'),
  trim: t('按每轴半径向量 r 去掉四边，仅保留不接触图外的内部区域', 'Remove borders of per-axis radii r, retaining the interior that does not reach outside'),
  positions: t('生成每行的归一化位置 x/N', 'Generate the normalised position x/N along each row'),
  expandRows: t('将每行重复 N 次，给出逐个位置和频率索引；不计算波或投影', 'Repeat each row N times, exposing positions and frequency indices, without computing waves or projections'),
  sample: t('按连续坐标采样，取值规则与边界假设可设置；自动计算距离、权重与取整', 'Sample continuous coordinates with selectable interpolation and boundary assumptions; arithmetic is supplied'),
  stencil: t('沿横向或纵向对三格邻域加权，自动滑动计算', 'A three-sample weighted neighbourhood along either image axis'),
  kernelFilter: t('用给定的二维核计算卷积或互相关', 'Apply a supplied 2D kernel as convolution or correlation'),
  magnitude: t('两个垂直分量的长度，自动计算平方和与平方根', 'Length of two perpendicular components; arithmetic is supplied'),
  colourMix: t('按给定权重组合 RGB 通道，自动处理每个像素', 'Mix RGB channels with supplied weights at every pixel'),
  const: t('常数：设定的数', 'Constant: the number it is set to'),
  add: t('相加，逐个值：数和数、图和数、同样大小的两张图', 'Add, value by value: numbers, an image and a number, two images of one size'),
  sub: t('相减，逐个值', 'Subtract, value by value'),
  mul: t('相乘，逐个值', 'Multiply, value by value'),
  div: t('相除，逐个值；除以 0 报错', 'Divide, value by value; dividing by 0 stops'),
  floor: t('向下取整，逐个值', 'Round down, value by value'),
  sqrt: t('平方根，逐个值；负数报错', 'Square root, value by value; a negative number stops'),
  min: t('取两者中小的，逐个值', 'The smaller of two, value by value'),
  max: t('取两者中大的，逐个值', 'The larger of two, value by value'),
  less: t('a < b 为 1，否则为 0，逐个值', '1 where a < b, else 0, value by value'),
  select: t('条件不为 0 取「是」一路，否则「否」一路，逐个值', 'Where the condition is not 0 its Yes input, else its No input, value by value'),
  size: t('图的宽 w 和高 h', 'An image’s width w and height h'),
  grid: t('给定宽高的两张坐标图：x 图每格是它的 x，y 图每格是它的 y', 'The two coordinate images of a size: in x each cell holds its x, in y its y'),
  lookup: t('按坐标在图上取值：坐标是数取一个值，是坐标图取出同样大小的一张图；坐标须为整数；出界按设置报错、取 0 或取最近的边', 'An image read at coordinates: at numbers one value, at coordinate images an image of their size; whole numbers only; outside it stops, reads 0 or reads the nearest edge, as set'),
  channel: t('彩色像素里第 c 个位置（设置 c：0、1、2）组成的灰度图；哪个位置是哪种颜色看图的通道顺序', 'The grey image of position c (setting c: 0, 1 or 2) of each colour pixel; which colour that is depends on the image’s channel order'),
  compose: t('三张同样大小的灰度图拼成彩色图（R、G、B）', 'Three grey images of one size made one colour image (R, G, B)'),
}
const PARTS = Object.fromEntries(PRIMITIVES.map((k) => [k, item(PART_ABOUT[k])]))

const FIELDS = {
  class: item(t('物体的类别（是什么）', 'the object’s class (what it is)')),
  location: item(t('物体在哪里（一个框）', 'where the object is (a box)')),
  region: item(t('每个像素各自的值（逐像素的图）', 'a value for every pixel (a per-pixel map)')),
  instance: item(t('分得出各个物体（谁是谁）', 'which object is which (instances apart)')),
  depth: item(t('距离（有单位的量）', 'distance (a quantity with units)')),
}
const FACTORS = {
  view: item(t('视角', 'the viewpoint')),
  light: item(t('光照', 'the lighting')),
  occlusion: item(t('遮挡', 'occlusion')),
  background: item(t('背景', 'the background')),
  scale: item(t('大小与距离', 'size and distance')),
}
const COLOUR_ITEMS = Object.fromEntries(Object.entries(COLOURS).map(([k, c]) => [k, item(c.name)]))

/* ---------- values, scenes ---------- */

const GREY = S.list(S.list(num, { min: 1 }), { min: 1, view: 'grid', about: t('灰度图：每行一列数', 'a grey image: a row of numbers per row') })
const COLOUR = S.list(S.list(S.list(num, { min: 3 }), { min: 1 }), { min: 1, about: t('彩色图：每行一列 [R, G, B]', 'a colour image: a row of [R, G, B] per row') })
const IMAGE = S.either(GREY, COLOUR)
const POINT = S.obj({ x: num, y: num })
const VALUE = S.either(num, S.oneOf([null]), GREY, COLOUR, POINT)
const VALUES = S.map(VALUE, { about: t('每个输入或输出的值，按名字：数、「—」（null）、图或坐标点 {x,y}', 'a value for each input or output by name: a number, 「—」 (null), an image or a point {x,y}') })

const V3 = S.list(num, { min: 3 })
const SCENE = S.obj({
  label: S.opt(S.text()),
  size: S.opt(S.list(S.int({ min: 4 }), { min: 2, about: t('渲出的图的宽高（默认 48 × 36）', 'the size rendered (48 × 36 by default)') })),
  camera: S.obj({ yaw: num, pitch: num, distance: S.num({ min: 0.1 }), f: S.num({ min: 0.05 }), at: S.opt(V3) }, { about: t('绕 at 转的相机：方位、俯仰（度）、距离、焦距', 'a camera orbiting `at`: yaw, pitch (degrees), distance, focal length') }),
  light: S.obj({ azimuth: num, elevation: num, intensity: S.opt(num), ambient: S.opt(num) }, { about: t('平行光：方位、高度（度），强度，环境光', 'directional light: azimuth, elevation (degrees), intensity, ambient') }),
  objects: S.list(S.obj({ id: S.str(), class: S.str(), colour: S.ref('colour'), boxes: S.list(S.obj({ at: V3, size: V3 }), { min: 1 }) })),
  floor: S.opt(S.ref('colour')),
  background: S.opt(S.ref('colour')),
})

/* ---------- a level ---------- */

const PORT = S.obj({ name: NAME, label: S.text() })
const INPUT = S.obj({ name: NAME, label: S.text(), type: S.opt(S.oneOf(['vector'], { about: t('二维向量 { x, y }：成对的坐标量是一个输入', 'a two-dimensional vector { x, y }: a paired coordinate quantity is one input') })) })
const TEST = S.obj({ inputs: VALUES, expect: VALUES })
const ITEM = S.obj({
  prompt: S.text(),
  answer: S.opt(ids),
  needs: S.opt(S.list(S.ref('field'))),
  claim: S.opt(S.call('claim')),
  is: S.opt(S.str()),
  measures: S.opt(S.str()),
})
const OPTION = S.obj({
  id: S.str(),
  label: S.text(),
  image: S.opt(IMAGE),
  scene: S.opt(SCENE),
  gives: S.opt(S.list(S.ref('field'))),
  is: S.opt(S.str()),
  varies: S.opt(S.list(S.ref('factor'))),
  truth: S.opt(S.str()),
  predicted: S.opt(S.str()),
  measures: S.opt(S.str()),
  H: S.opt(num),
  Z: S.opt(num),
})
const ROUND = S.obj({
  given: S.opt(S.text({ about: t('这一轮除了图以外玩家知道的事，显示在图旁边（一轮的前提不写进某一题的题干）', 'what the player knows in this round besides the picture, shown beside it (a premise of the round, never inside one item’s prompt)') })),
  image: S.opt(IMAGE),
  items: S.list(ITEM, { min: 1 }),
  options: S.opt(S.list(OPTION, { min: 1 })),
  scenes: S.opt(S.list(SCENE, { min: 1, about: t('这一轮的候选场景（claims 在它们上面算）：都得渲出同一张图（npm run check 查）', 'the round’s candidate scenes (claims are judged on them): they must all render one picture (npm run check checks)') })),
  reference: S.opt(SCENE),
  explore: S.opt(S.obj({ scene: SCENE, knobs: S.list(S.oneOf(['yaw', 'pitch', 'azimuth', 'elevation']), { min: 1 }) }, { about: t('玩家能自己转视角、调光的场景', 'a scene the player turns and relights') })),
})

// What a level says once; then each task, of one of four kinds, done in turn (../../engine/tasks.js).
const ONCE = {
  title: S.text(),
  intro: S.opt(INTRO),
  after: S.opt(S.text()),
  note: S.opt(S.text()),
  adds: S.opt(S.list(S.ref('part'), { section: 'course' })),
  builds: S.opt(S.obj({ type: NAME, name: S.text(), desc: S.text(), settings: S.opt(S.list(S.oneOf(['outside', 'axis']))), defaults: S.opt(S.obj({ outside: S.oneOf(['zero', 'clamp', 'wrap', 'reflect']), axis: S.opt(S.oneOf(['x', 'y'])) })) }, { section: 'course', about: t('通过后最后一个任务的板成为元件 type（最后一个任务必须是电路）', 'once passed the last task’s board is the part `type` (the last task must be a circuit)') })),
  showcase: S.opt(S.text({ section: 'course', about: t('新元件第一次出现时只放它一个也算一关：为什么', 'a new part may have a level that only places it: why') })),
}
const COMMON = {
  adds: S.opt(S.list(S.ref('part'), { section: 'course' })),
  configurations: S.opt(S.map(S.list(S.str()), { section: 'course', about: t('本任务引入的配置：元件.设置 → 取值列表；*.outside 表示共同的边界假设', 'Introduced enum values by part.setting; *.outside is a shared boundary assumption') })),
  brief: S.text(),
  hint: S.opt(TEXTS),
  intro: S.opt({ ...INTRO, section: 'read', about: t('这个任务自己的引言：第一次做到它时读', 'the task’s own intro: read the first time it is played') }),
  after: S.opt(S.text({ about: t('这个任务通过时说的话（最后一个任务用这一关的点题）', 'what passing the task says (the last task says the level’s pass text)') })),
}
const TASK = S.by('kind', {
  circuit: S.obj({
    kind: S.oneOf(['circuit']), ...COMMON,
    illustration: S.opt(S.oneOf(['pinhole'], { about: t('测试旁可展开的成像场景，不增加通关步骤', 'an inspectable camera scene beside a test, without another assessment step') })),
    inputs: S.list(INPUT),
    inputGroups: S.opt(S.list(S.obj({ name: NAME, label: S.text(), inputs: S.list(NAME, { min: 2 }) }))),
    outputs: S.list(PORT, { min: 1 }),
    tests: S.list(TEST, { min: 1, section: 'tests' }),
    hidden: S.opt(S.list(TEST, { section: 'tests', about: t('隐藏测试：每次运行一并检查，通关后公开', 'hidden tests: checked with every run and shown once passed') })),
    tolerance: S.opt(S.num({ min: 0, about: t('比较值时的容差（默认 1e-5）', 'the tolerance values are compared with (1e-5 by default)') })),
    solution: BOARD,
    starter: S.opt(BOARD),
    naiveWhy: S.opt(S.text()),
    naive: S.opt(S.board({ about: t('直觉上的错解：必须失败', 'the naive answer: it must fail') })),
    carries: S.opt(S.bool({ about: t('从上一个任务的板开始', 'start from the task before’s board') })),
  }),
  grid: S.obj({
    kind: S.oneOf(['grid']), ...COMMON,
    image: IMAGE,
    calculation: S.opt(S.by('kind', {
      sampling: S.obj({ kind: S.oneOf(['sampling']), method: S.oneOf(['nearest', 'bilinear']), xs: GREY, ys: GREY }),
      product: S.obj({ kind: S.oneOf(['product']), column: S.list(num, { min: 1 }) }),
      magnitude: S.obj({ kind: S.oneOf(['magnitude']) }),
    }, { about: t('根据给定位置或权重计算中间量，可填入结果格', 'compute intermediate values from declared positions or weights and transfer them to result cells') })),
    window: S.opt(S.obj({ weights: S.list(num, { min: 3 }), axis: S.oneOf(['row', 'column']), padding: S.oneOf(['zero', 'valid']) })),
    ask: S.call('ask'),
    show: S.opt(S.oneOf(['numbers', 'picture', 'both'], { about: t('图怎么给玩家看：数、画面、两样都看（默认两样）', 'how the image is shown: numbers, picture or both (both by default)') })),
    tolerance: S.opt(S.num({ min: 0 })),
    naive: S.opt(S.obj({ answer: S.any({ about: t('和这个 ask 的答案同形：一行行的数，或 { x, y }', 'shaped as the ask’s answer: rows of numbers, or { x, y }') }), why: S.text() }, { section: 'tests', about: t('知识点要纠正的那个错误答案和它为什么错：npm run check 查它判错；玩家交出它时，屏幕说出为什么错', 'the wrong answer the point corrects and why it is wrong: npm run check checks it fails; when the player gives it, the screen says why') })),
  }),
  choice: S.obj({
    kind: S.oneOf(['choice']), ...COMMON,
    judge: S.call('judge'),
    rounds: S.list(ROUND, { min: 1, section: 'tests', about: t('一轮一轮答：第一轮公开，后面的换了数据，答对一轮才出下一轮', 'answered round by round: the first shown, the later ones with changed data, each after the one before is right') }),
    naive: S.opt(S.obj({ picks: S.list(S.list(S.list(S.str())), { about: t('每一轮、每一题选的选项 id', 'the option ids picked, a list a round, a list an item') }), why: S.text() }, { section: 'tests', about: t('知识点要纠正的那个错误答法和它为什么错：npm run check 查它在某一轮判错；玩家在那一轮交出它时，屏幕说出为什么错', 'the wrong picks the point corrects and why they are wrong: npm run check checks they fail a round; when the player gives them there, the screen says why') })),
  }),
  bench: S.obj({
    kind: S.oneOf(['bench']), ...COMMON,
    bench: benchSchema(BENCH_MODELS),
    naive: S.list(S.obj({ set: S.map(S.any()), step: S.opt(S.int({ min: 1 })), why: S.text() }), { min: 1, section: 'tests', about: t('玩家容易试的错误设置（step：第几步，默认 1），每个都必须达不到目标（npm run check 查）', 'settings a player is likely to try that are wrong (step: which step, 1 by default), each of which must miss the goal (npm run check checks)') }),
    holds: S.opt(S.list(LIMIT, { section: 'tests', about: t('这一课要教的关系：每个达到目标的设置也都得满足它（npm run check 把旋钮的每个取值都试一遍）', 'the relation the bench teaches: every setting that meets the goal must meet these too (npm run check tries every value of the knobs)') })),
  }),
})

/* ---------- game.json ---------- */

const ITEM_ERA = S.either(S.level(), S.obj({ parallel: S.list(S.obj({ id: S.str(), title: S.opt(S.text()), levels: S.list(S.level()) })) }))
const AFTER = S.either(S.level(), S.list(S.level()))
const ERA = S.obj({
  id: S.int(),
  keeps: S.opt(S.either(S.oneOf(['all']), ids)),
  title: S.text(),
  question: S.text(),
  foundation: S.list(ITEM_ERA),
  practice: S.opt(S.list(ITEM_ERA)),
  topics: S.opt(S.list(S.obj({ id: S.str(), after: S.opt(AFTER), requires: S.opt(ids), levels: S.list(S.level()), title: S.opt(S.text()) }))),
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
  domain: 'vision',
  version: 1,
  kinds: {
    part: PARTS,
    ask: ASK_ITEMS,
    judge: items(JUDGES),
    claim: items(CLAIMS),
    field: FIELDS,
    factor: FACTORS,
    colour: COLOUR_ITEMS,
    benchModel: Object.fromEntries(Object.entries(BENCH_MODELS).map(([name, m]) => [name, { about: m.about, ...(m.setup ? { params: m.setup } : {}) }])),
    display: displayItems(DISPLAYS),
  },
  game: GAME,
  level: taskLevel(ONCE, TASK),
})
