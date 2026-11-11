// The table domain's vocabulary (games/DESIGN.md 6.2): every thing a table game's content may name, each with what it
// is and the schema of its parameters, and the schemas of game.json and of one level. Content is these items and
// their parameters, and nothing else: whatever a level needs that is not here is a new item, written in this domain.
//
// The items are implemented next to them: parts in model/parts.js, worlds in model/worlds/, robots in model/robots.js,
// modes in ui/modes/ (one screen each, ui/LevelScreen.jsx), and the items content calls (figures, conditions, traces,
// panels, explains) in items/.

import { S } from '../../engine/schema.js';
import { defineVocabulary } from '../../engine/vocabulary.js';
import { taskLevel } from '../../engine/tasks.js';
import { TRAY, TRAYS } from '../../engine/trays.js';
import { T as t } from '../../shell/i18n.js';

const item = (about, params) => ({ about, ...(params ? { params } : {}) });

const int = (extra) => S.int(extra);
const nat = S.int({ min: 0 });
const pt = S.list(S.int(), { min: 2 });
const matrix = S.list(S.list(S.num()), { view: 'grid' });
const ids = S.list(S.str());
const NONE = S.oneOf([null]);
/** What a board answers on a test: a number, yes or no, or nothing (null: no answer, shown as —). */
const ANSWER = S.either(S.num(), S.bool(), NONE);
/** Blueprint text (../../circuit/text.js), one line a string: a reference board, a naive one, a preset. */
const BOARD = S.board({ about: t('一块电路板的蓝图文本，每行一个字符串') });
const scanOf = (...orders) => S.oneOf(orders);

/* ---------- the worlds a board runs in: their parameters and the shape of their tests ---------- */

const world = (about, test, params = {}) => ({ about, params: S.obj(Object.fromEntries(Object.entries(params).map(([k, s]) => [k, S.opt(s)]))), test });
const GRID = { R: int({ min: 1 }), C: int({ min: 1 }) };
const STREET = S.obj({ a: S.list(S.num()) });
const KNAP_ITEM = S.obj({ n: S.opt(S.text()), w: nat, v: S.opt(S.num()), many: S.opt(S.bool()) });
const ALIGN = S.obj({ top: S.str(), left: S.str() });
const WORLDS = {
  grid: world(t('棋盘城市：只往右或往下走，每格可以有石头、体力或金币'),
    S.obj({ ...GRID, given: S.opt(S.map(S.num(), { keys: '^\\d+,\\d+$' })), rocks: S.opt(S.list(pt)), costs: S.opt(matrix), coins: S.opt(matrix) }),
    { scan: scanOf('rowTL', 'rowBR', 'colL', 'colR', 'colRB'), answerAt: S.oneOf(['start', 'end']), rounds: S.bool() }),
  gridYes: world(t('棋盘城市，每格存「是 / 否」：能不能走到这里'), S.obj({ ...GRID, rocks: S.opt(S.list(pt)) })),
  piles: world(t('两堆石子：(a, b) 是两堆各剩几颗，存轮到的人能不能赢'), S.obj(GRID)),
  tri: world(t('砖块叠成的三角：从顶上一块往下走'), S.obj({ R: int({ min: 1 }), k: nat })),
  lawn: world(t('铺草坪：一块地上有树，找最大的空正方形'), S.obj({ ...GRID, trees: S.list(pt) })),
  strip: world(t('一段楼梯：一次上一级或两级，坏台阶踩不得'), S.obj({ n: nat, broken: S.opt(S.list(nat)) })),
  pile: world(t('一堆石子：一次拿一颗或两颗，拿走最后一颗的赢'), S.obj({ n: nat })),
  coins: world(t('凑零钱：每格是一个钱数，扫描臂退回每种硬币'), S.obj({ n: nat, coins: S.list(int({ min: 1 })) })),
  pieces: world(t('切词：一串字母切成词典里的词，每块有代价'), S.obj({ s: S.str(), dict: S.either(ids, S.map(S.num())), letter: S.opt(S.num()) })),
  rob1: world(t('一排房子，每家一个格子'), STREET),
  rob2: world(t('一排房子，每家三个格子：没偷、偷了、最多'), STREET),
  ring: world(t('环形的街：第一家和最后一家相邻'), STREET),
  prefix: world(t('一排房子，每格是到这一家为止的总数'), STREET),
  heights: world(t('一排柱子：以这一根结尾，最长连几根越来越高'), STREET, { filter: S.oneOf(['all', 'lower']) }),
  gains: world(t('每天的收支：以这一天结尾的一段最多赚多少'), STREET),
  keys: world(t('有钥匙和门的迷宫，状态记住的每组钥匙是一层'),
    S.obj({ ...GRID, key: S.opt(pt), keys: S.opt(S.map(pt)), doors: S.list(S.either(pt, S.obj({ at: pt, color: S.oneOf(['red', 'blue', 'green']) }))) }),
    { remember: S.list(S.oneOf(['red', 'blue', 'green'])) }),
  river: world(t('过河的青蛙：每块石头写着往回能跳多远'), S.obj({ k: S.list(S.either(nat, NONE)), p: S.opt(S.list(S.num())) })),
  stock: world(t('股价：每天三种状态，空手、持有、刚卖掉'), S.obj({ p: S.list(S.num()), cool: S.opt(S.bool()) })),
  align: world(t('对齐表：一个词在上面，一个词在左边'), ALIGN, { border0: S.bool() }),
  local: world(t('局部对齐：两串字最像的一段'), ALIGN, { border0: S.bool() }),
  knap: world(t('背包表：行是物品，列是容量'), S.obj({ W: nat, items: S.list(KNAP_ITEM), ways: S.opt(S.bool()) })),
  roll: world(t('压成一行的背包：只留一行，原地改写'), S.obj({ kind: S.oneOf(['01', 'inf']), W: nat, items: S.list(KNAP_ITEM) }),
    { dirs: S.obj({ '01': S.oneOf(['asc', 'desc']), inf: S.oneOf(['asc', 'desc']) }) }),
  interval: world(t('区间表：一段 i..j 的答案，切点扫一遍'),
    S.obj({ s: S.opt(S.str()), w: S.opt(S.list(S.num())), words: S.opt(S.list(S.text())) }),
    { diag: S.num(), empty0: S.bool(), scan: scanOf('rowTL', 'rowBR', 'colL', 'colLB', 'len') }),
  vgrid: world(t('格子世界：宝藏、陷阱和墙，扫到不再变'),
    S.obj({ ...GRID, gold: pt, traps: S.opt(S.list(pt)), walls: S.opt(S.list(pt)), cliffs: S.opt(S.list(pt)), ice: S.opt(S.list(S.list(S.num(), { min: 3 }))), rd: S.opt(S.bool()), slip: S.opt(S.num()) }),
    { arrows: S.bool(), rounds: S.bool() }),
  tags: world(t('给句子标词性：每一列一个词，每一行一种词性'),
    S.obj({ words: S.list(S.text()), emit: S.list(S.map(S.num())), start: S.map(S.num()), trans: S.map(S.map(S.num())), note: S.opt(S.text()) }),
    { prob: S.bool() }),
  pic: world(t('一张图：每格的能量，找一条最不起眼的缝'), S.obj({ ...GRID, img: S.opt(matrix), energy: S.opt(matrix) })),
};

/* ---------- what content calls ---------- */

const CELL = S.obj({
  id: S.str(), x: S.num(), y: S.num(), w: S.num(), h: S.num(), rx: S.opt(S.num()), label: S.opt(S.text()), value: S.opt(S.either(S.num(), S.text())),
  corner: S.opt(S.either(S.num(), S.text())), sub: S.opt(S.text()), cls: S.opt(S.str()), fill: S.opt(S.str()),
});
const EDGE = S.obj({ a: S.str(), b: S.str(), cls: S.str(), bend: S.num(), off: S.num() });
const FIGURES = {
  scene: item(t('一张画好的图：格子、箭头和字，坐标照写'),
    S.obj({ cells: S.list(CELL), edges: S.list(EDGE), texts: S.opt(S.list(S.obj({ x: S.num(), y: S.num(), t: S.text(), anchor: S.opt(S.oneOf(['start', 'middle', 'end'])), cls: S.opt(S.str()) }))) })),
  grid: item(t('棋盘：R 行 C 列，箭头往右往下（或按 moves），个别格子另写'),
    S.obj({ R: int({ min: 1 }), C: int({ min: 1 }), arrows: S.opt(S.bool()), moves: S.opt(S.list(pt)), cells: S.opt(S.map(S.obj({ value: S.opt(S.either(S.num(), S.text())), corner: S.opt(S.either(S.num(), S.text())), label: S.opt(S.text()), cls: S.opt(S.str()) }), { keys: '^\\d+,\\d+$' })), edges: S.opt(S.map(S.str(), { keys: '^\\d+,\\d+>\\d+,\\d+$' })), robot: S.opt(S.str()) })),
  circuit: item(t('一小块示意电路：上面是输入，中间是元件，下面是输出'),
    S.obj({
      taps: S.list(S.obj({ id: S.str(), label: S.text(), kind: S.opt(S.oneOf(['bool'])) })),
      parts: S.list(S.obj({ id: S.str(), name: S.text(), tag: S.opt(S.text()), row: S.opt(nat) })),
      outs: S.list(S.obj({ id: S.str(), label: S.text() })),
      wires: S.list(S.obj({ from: S.str(), to: S.str(), kind: S.opt(S.oneOf(['bool', 'off'])) })),
    })),
  window: item(t('机器人 3×3 的视野：每格的值，亮起的是读的格子'), S.obj({ vals: S.map(S.either(S.num(), S.text())), on: ids })),
};

const has = S.either(S.ref('part'), S.obj({ part: S.ref('part'), value: S.opt(S.num()) }));
const CONDITIONS = {
  reads: item(t('输入元件上点了这个传感器'), S.str()),
  uses: item(t('这个传感器读了，还接出了线'), S.str()),
  has: item(t('板上有这种元件（可以再说它的数值）'), has),
  feeds: item(t('一种元件直接接进另一种元件'), S.obj({ from: S.ref('part'), to: S.ref('part') })),
  placed: item(t('板上放了元件')),
  wired: item(t('板上接了线')),
  wiredOut: item(t('输出接上了线')),
  all: item(t('每一条都成立'), S.list(S.call('condition'))),
  any: item(t('至少一条成立'), S.list(S.call('condition'))),
  not: item(t('这一条不成立'), S.call('condition')),
};

const TRACES = {
  lcs: item(t('公共子序列表倒推出的路线和连线')),
  edit: item(t('编辑距离表倒推出的路线')),
  local: item(t('局部对齐从最大的一格倒推到 0')),
  knap: item(t('背包表倒推出的装法')),
  seam: item(t('从最底一行最小的格子倒推的缝')),
  tags: item(t('维特比表倒推出的词性')),
};
const PANELS = {
  lcs: item(t('通过后：表格里藏着的连线')),
  edit: item(t('通过后：倒推出的改法')),
  spell: item(t('全部通过后：候选词按步数排'), S.obj({ candidates: ids })),
  local: item(t('通过后：最像的一段')),
  tags: item(t('通过后：倒推出的标法（测试有 note 时加一句）')),
  knap: item(t('通过后：倒推出的装法')),
  roll: item(t('物品一览，正在改写的那件亮起')),
  dictionary: item(t('词典（和每个词的代价）')),
  robConflict: item(t('反例：一家一格时，两段历史落进同一个格子')),
};
const EXPLAINS = {
  roll: item(t('压成一行时，改写方向错了会把一件物品放两次')),
};
const PORTS = {
  reads: item(t('读这一关的一个传感器，名字随它'), S.str()),
  way: item(t('第 n 条来路（a、b、c、d）：一个传感器，或板上一个只属于这一关的输入'), S.obj({ n: int({ min: 1, max: 4 }), sensor: S.opt(S.str()), input: S.opt(S.str()) })),
  start: item(t('「起点」：一个是 / 否传感器'), S.obj({ sensor: S.str() })),
  named: item(t('自己起名字的口'), S.obj({ label: S.text(), short: S.text(), sensor: S.str() })),
};

/* ---------- the machines and parts ---------- */

const ROBOTS = {
  scout: item(t('小方：视野 3×3')),
  ranger: item(t('远望：视野 5×5，看得见表头，会换方向扫')),
  reach: item(t('长臂：视野 5×5，伸缩臂够到任意远')),
  broom: item(t('扫帚：扫描臂一次扫过一整段')),
  stack: item(t('千层：同时站在很多层上，探针探到另一层')),
  loop: item(t('回环：一轮一轮扫到不再变')),
};
const PARTS = Object.fromEntries([
  ['msum', t('汇合器 · 加起来')], ['mmin', t('汇合器 · 取较小')], ['mmax', t('汇合器 · 取较大')], ['many', t('汇合器 · 任一是')],
  ['not', t('取反')], ['add', t('加法器')], ['mul', t('乘法器')], ['const', t('常数')], ['pass', t('放行闸')], ['block', t('拦截闸')],
].map(([k, about]) => [k, item(about)]));
const MODES = {
  circuit: item(t('拼电路板：机器人在每一格上跑它')),
  fill: item(t('亲手填表：每个地点的路线数')),
  trace: item(t('一条条找出所有路线')),
  link: item(t('连线不交叉：两串字相同的字母连起来')),
  pack: item(t('亲手装背包')),
  breach: item(t('找反例：画两条路线，落进同一个格子')),
  policy: item(t('顺着价值画出箭头')),
  seam: item(t('一条条剪掉图里的缝')),
};

/* ---------- a level ---------- */

const TEXTS = S.list(S.text());
/** What a level says once: its title, introduction, brief and pass text, and its place in the course (the robot its
 *  circuit tasks are played by, the parts it brings in, its tray and what it unlocks, the level it starts from, the part it builds). */
const ONCE = {
  title: S.text(),
  short: S.text(),
  intro: S.list(S.obj({ t: S.text(), fig: S.opt(S.call('figure')) })),
  mission: S.obj({ goal: S.text(), how: S.text() }),
  robot: S.opt(S.ref('robot', { about: t('玩这一关电路任务的机器人') })),
  showcase: S.opt(S.text({ section: 'course', about: t('新元件第一次出现时只放它一个也算一关：它的用法抽象在哪里') })),
  adds: S.opt(S.list(S.ref('part'), { section: 'course' })),
  tray: TRAY,
  unlock: S.opt(S.name('part', { section: 'course', about: t('通过它解锁的元件或想法（game.json 的 parts）') })),
  carry: S.opt(S.level({ about: t('第一个任务从这一关玩家留下的电路板开始（必须是先修）') })),
  builds: S.opt(S.obj({ ports: S.list(S.call('port')), setting: S.opt(S.num()) }, { section: 'course', about: t('通过后最后一个任务的电路板成为元件 unlock：它的口，和它带的一个数') })),
  debrief: S.obj({ title: S.text(), body: TEXTS, note: S.opt(S.text()) }),
};
/** What every task has: the mode it is played in (the screen), and its hints. */
const TASK = { mode: S.ref('mode'), hints: S.opt(TEXTS) };
const PLACE = S.obj({ id: S.str(), x: S.num(), y: S.num(), label: S.text(), fixed: S.opt(S.num()), goal: S.opt(S.num()) });
const LINKS = S.list(S.list(S.str(), { min: 2 }));
const HAND = {
  fill: S.either(S.obj({ ...TASK, grid: S.obj(GRID) }), S.obj({ ...TASK, cells: S.list(PLACE), edges: LINKS, start: S.str(), end: S.str() })),
  trace: S.obj({ ...TASK, cells: S.list(PLACE), edges: LINKS, start: S.str(), end: S.str() }),
  link: S.obj({ ...TASK, tests: S.list(S.obj({ a: S.str(), b: S.str() }), { section: 'tests' }) }),
  pack: S.obj({ ...TASK, tests: S.list(S.obj({ W: nat, items: S.list(KNAP_ITEM) }), { section: 'tests' }) }),
  breach: S.obj({ ...TASK, maze: S.obj({ ...GRID, key: pt, doors: S.list(pt) }), hintText: S.text() }),
  policy: S.obj({ ...TASK, map: S.obj({ ...GRID, gold: pt, traps: S.opt(S.list(pt)), walls: S.opt(S.list(pt)) }), starts: S.list(pt) }),
  seam: S.obj({ ...TASK, img: matrix, cuts: int({ min: 1 }) }),
};

/** A circuit task's own fields, whatever its world. */
const CIRCUIT = {
  ...TASK,
  ask: S.opt(S.text({ about: t('这个任务问什么（写在一关的说明下面）') })),
  tip: S.opt(S.text()),
  carries: S.opt(S.bool({ about: t('从上一个任务的电路板开始') })),
  unlockToast: S.opt(S.text({ about: t('第一次打开这个任务时说的一句') })),
  noArm: S.opt(S.bool()),
  naive: S.opt(BOARD),
  guide: S.opt(S.list(S.obj({ until: S.opt(S.call('condition')), say: S.text() }), { about: t('一步步的引导：显示第一条 until 还不成立的') })),
  diagnose: S.opt(S.list(S.obj({ when: S.call('condition'), say: S.text() }), { about: t('失败时：第一条 when 成立的说法') })),
  testLabel: S.opt(S.text({ about: t('测试的名字：{字段}、{字段.length}、{列表|分隔符}') })),
  trace: S.opt(S.call('trace')),
  after: S.opt(S.call('panel')),
  explain: S.opt(S.call('explain')),
  boardOpt: S.opt(S.obj({ minScale: S.num(), maxScale: S.num() })),
  checkAll: S.opt(S.bool({ about: t('逐格判对错，不只看答案') })),
  noTrace: S.opt(S.bool({ about: t('失败时不指出第一处算错的格子') })),
  consts: S.opt(S.list(S.num(), { about: t('常数能选的值') })),
  onFail: S.opt(S.obj({ head: S.text(), body: S.text({ about: t('{test}、{want}、{got} 换成失败的测试') }), show: S.call('panel'), next: S.text() }, { about: t('这个任务的失败是要讲的道理：说完进下一个任务') })),
  done: S.opt(S.obj({ head: S.opt(S.text()), body: S.opt(TEXTS) }, { about: t('通过后、进下一个任务之前说的话') })),
};
/** A circuit task in world `name`: its tests, their answers, its reference board, and the world's parameters. */
const inWorld = (name, w) => S.obj({
  ...CIRCUIT,
  world: S.oneOf([name]),
  facts: S.opt(ids),
  tests: S.list(w.test, { min: 1, section: 'tests' }),
  expected: S.list(ANSWER, { min: 1, section: 'tests', about: t('每个测试的正确答案，按测试的顺序（没有答案写 null）') }),
  solution: S.opt(BOARD),
  ...Object.fromEntries(Object.entries(w.params.fields)),
});
const CIRCUIT_TASK = S.by('world', Object.fromEntries(Object.entries(WORLDS).map(([name, w]) => [name, inWorld(name, w)])));

/* ---------- game.json ---------- */

const levels = S.list(S.level());
const ITEM = S.either(S.level(), S.obj({ parallel: S.list(S.obj({ id: S.str(), title: S.text(), levels })) }));
const AFTER = S.either(S.level(), levels);
const ERA = S.obj({
  id: S.str(),
  machine: S.either(S.ref('robot'), NONE),
  foundation: S.list(ITEM),
  practice: S.opt(S.list(ITEM)),
  topics: S.opt(S.list(S.obj({ id: S.str(), code: S.str({ pattern: '^[A-Z]$' }), after: S.opt(AFTER), requires: S.opt(ids), levels, title: S.text(), desc: S.text() }))),
  challenges: S.opt(S.list(S.obj({ level: S.level(), after: S.opt(AFTER) }))),
  chapter: S.obj({ title: S.text(), desc: S.text() }),
});
const GAME = S.obj({
  title: S.text(),
  kicker: S.text(),
  lede: S.text({ about: t('这款游戏教什么、学完能亲手做成什么，不写关卡数', 'what the game teaches and what the player ends up building, not how many levels') }),
  primitives: S.list(S.ref('part')),
  trays: TRAYS,
  concept: S.opt(S.map(S.str(), { about: t('几个元件合起来是一个新概念') })),
  parts: S.map(S.obj({ name: S.text(), desc: S.text() }), { about: t('关卡解锁的元件和想法：元件箱里的名字和说明') }),
  eras: S.list(ERA, { min: 1 }),
  borrow: S.opt(S.map(S.level(), { about: t('一个想法在元件箱里借用哪一关的电路板') })),
});

export const vocabulary = defineVocabulary({
  domain: 'table',
  version: 1,
  kinds: {
    part: PARTS,
    world: WORLDS,
    robot: ROBOTS,
    mode: MODES,
    figure: FIGURES,
    condition: CONDITIONS,
    trace: TRACES,
    panel: PANELS,
    explain: EXPLAINS,
    port: PORTS,
  },
  game: GAME,
  level: taskLevel(ONCE, S.by('mode', { circuit: CIRCUIT_TASK, ...HAND })),
});
