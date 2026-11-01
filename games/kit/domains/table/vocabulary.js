// The table domain's vocabulary (games/DESIGN.md 6.2): every thing a table game's content may name, each with what it
// is and the schema of its parameters, and the schemas of game.json and of one level. Content is these items and
// their parameters, and nothing else: whatever a level needs that is not here is a new item, written in this domain.
//
// The items are implemented next to them: parts in model/parts.js, worlds in model/worlds/, robots in model/robots.js,
// modes in ui/modes/ (one screen each, ui/LevelScreen.jsx), and the items content calls (figures, conditions, traces,
// panels, explains, migrations) in items/.

import { S } from '../../engine/schema.js';
import { defineVocabulary } from '../../engine/vocabulary.js';

const t = (zh, en) => ({ zh, en });
const item = (about, params) => ({ about, ...(params ? { params } : {}) });

const int = (extra) => S.int(extra);
const nat = S.int({ min: 0 });
const pt = S.list(S.int(), { min: 2 });
const matrix = S.list(S.list(S.num()));
const ids = S.list(S.str());
const NONE = S.oneOf([null]);
/** Blueprint text (../../circuit/text.js), one line a string: a reference board, a naive one, a preset. */
const BOARD = S.list(S.str(), { about: t('一块电路板的蓝图文本，每行一个字符串', 'a board as blueprint text, one string a line') });
const scanOf = (...orders) => S.oneOf(orders);

/* ---------- the worlds a board runs in: their parameters and the shape of their tests ---------- */

const world = (about, test, params = {}) => ({ about, params: S.obj(Object.fromEntries(Object.entries(params).map(([k, s]) => [k, S.opt(s)]))), test });
const GRID = { R: int({ min: 1 }), C: int({ min: 1 }) };
const STREET = S.obj({ a: S.list(S.num()) });
const KNAP_ITEM = S.obj({ n: S.opt(S.text()), w: nat, v: S.opt(S.num()), many: S.opt(S.bool()) });
const ALIGN = S.obj({ top: S.str(), left: S.str() });
const WORLDS = {
  grid: world(t('棋盘城市：只往右或往下走，每格可以有石头、体力或金币', 'the grid city: right or down only, a cell may hold a rock, energy or coins'),
    S.obj({ ...GRID, given: S.opt(S.map(S.num(), { keys: '^\\d+,\\d+$' })), rocks: S.opt(S.list(pt)), costs: S.opt(matrix), coins: S.opt(matrix) }),
    { scan: scanOf('rowTL', 'rowBR', 'colL', 'colR', 'colRB'), answerAt: S.oneOf(['start', 'end']), rounds: S.bool() }),
  gridYes: world(t('棋盘城市，每格存「是 / 否」：能不能走到这里', 'the grid city holding yes / no: can a route get here'), S.obj({ ...GRID, rocks: S.opt(S.list(pt)) })),
  piles: world(t('两堆石子：(a, b) 是两堆各剩几颗，存轮到的人能不能赢', 'two piles of stones: (a, b) the stones left, holding whether the player to move wins'), S.obj(GRID)),
  tri: world(t('砖块叠成的三角：从顶上一块往下走', 'bricks stacked in a triangle, walked down from the top one'), S.obj({ R: int({ min: 1 }), k: nat })),
  lawn: world(t('铺草坪：一块地上有树，找最大的空正方形', 'a lawn to lay: a field with trees, the biggest open square'), S.obj({ ...GRID, trees: S.list(pt) })),
  strip: world(t('一段楼梯：一次上一级或两级，坏台阶踩不得', 'a flight of stairs: one or two steps at a time, broken steps not to be stood on'), S.obj({ n: nat, broken: S.opt(S.list(nat)) })),
  pile: world(t('一堆石子：一次拿一颗或两颗，拿走最后一颗的赢', 'a pile of stones: take one or two, whoever takes the last wins'), S.obj({ n: nat })),
  coins: world(t('凑零钱：每格是一个钱数，扫描臂退回每种硬币', 'making change: a cell is an amount, the sweep arm steps back by every coin'), S.obj({ n: nat, coins: S.list(int({ min: 1 })) })),
  pieces: world(t('切词：一串字母切成词典里的词，每块有代价', 'cutting a string into dictionary words, each piece at a cost'), S.obj({ s: S.str(), dict: S.either(ids, S.map(S.num())), letter: S.opt(S.num()) })),
  rob1: world(t('一排房子，每家一个格子', 'a row of houses, one cell a house'), STREET),
  rob2: world(t('一排房子，每家三个格子：没偷、偷了、最多', 'a row of houses, three cells a house: skipped, robbed, most so far'), STREET),
  ring: world(t('环形的街：第一家和最后一家相邻', 'a street in a ring: the first house and the last are neighbours'), STREET),
  prefix: world(t('一排房子，每格是到这一家为止的总数', 'a row of houses, each cell the total so far'), STREET),
  heights: world(t('一排柱子：以这一根结尾，最长连几根越来越高', 'a row of posts: the longest rising run ending on this one'), STREET, { filter: S.oneOf(['all', 'lower']) }),
  gains: world(t('每天的收支：以这一天结尾的一段最多赚多少', 'daily gains: the best run of days ending today'), STREET),
  keys: world(t('有钥匙和门的迷宫，状态记住的每组钥匙是一层', 'a maze of keys and doors, one layer for every set of keys the state remembers'),
    S.obj({ ...GRID, key: S.opt(pt), keys: S.opt(S.map(pt)), doors: S.list(S.either(pt, S.obj({ at: pt, color: S.oneOf(['red', 'blue', 'green']) }))) }),
    { remember: S.list(S.oneOf(['red', 'blue', 'green'])) }),
  river: world(t('过河的青蛙：每块石头写着往回能跳多远', 'a frog crossing a river: each stone says how far back a jump reaches'), S.obj({ k: S.list(S.either(nat, NONE)), p: S.opt(S.list(S.num())) })),
  stock: world(t('股价：每天三种状态，空手、持有、刚卖掉', 'share prices: three states a day, flat, holding, just sold'), S.obj({ p: S.list(S.num()), cool: S.opt(S.bool()) })),
  align: world(t('对齐表：一个词在上面，一个词在左边', 'an alignment table: one word along the top, one down the left'), ALIGN, { border0: S.bool() }),
  local: world(t('局部对齐：两串字最像的一段', 'local alignment: the most alike stretch of two strings'), ALIGN, { border0: S.bool() }),
  knap: world(t('背包表：行是物品，列是容量', 'the knapsack table: rows are items, columns capacities'), S.obj({ W: nat, items: S.list(KNAP_ITEM), ways: S.opt(S.bool()) })),
  roll: world(t('压成一行的背包：只留一行，原地改写', 'the knapsack in one row, rewritten in place'), S.obj({ kind: S.oneOf(['01', 'inf']), W: nat, items: S.list(KNAP_ITEM) }),
    { dirs: S.obj({ '01': S.oneOf(['asc', 'desc']), inf: S.oneOf(['asc', 'desc']) }) }),
  interval: world(t('区间表：一段 i..j 的答案，切点扫一遍', 'the interval table: the answer for a run i..j, every split point swept'),
    S.obj({ s: S.opt(S.str()), w: S.opt(S.list(S.num())), words: S.opt(S.list(S.text())) }),
    { diag: S.num(), empty0: S.bool(), scan: scanOf('rowTL', 'rowBR', 'colL', 'colLB', 'len') }),
  vgrid: world(t('格子世界：宝藏、陷阱和墙，扫到不再变', 'the grid world: treasure, traps and walls, scanned until it settles'),
    S.obj({ ...GRID, gold: pt, traps: S.opt(S.list(pt)), walls: S.opt(S.list(pt)), cliffs: S.opt(S.list(pt)), ice: S.opt(S.list(S.list(S.num(), { min: 3 }))), rd: S.opt(S.bool()), slip: S.opt(S.num()) }),
    { arrows: S.bool(), rounds: S.bool() }),
  tags: world(t('给句子标词性：每一列一个词，每一行一种词性', 'tagging a sentence: a word a column, a part of speech a row'),
    S.obj({ words: S.list(S.text()), emit: S.list(S.map(S.num())), start: S.map(S.num()), trans: S.map(S.map(S.num())), note: S.opt(S.text()) }),
    { prob: S.bool() }),
  pic: world(t('一张图：每格的能量，找一条最不起眼的缝', 'a picture: each cell’s energy, the least noticeable seam'), S.obj({ ...GRID, img: S.opt(matrix), energy: S.opt(matrix) })),
};

/* ---------- what content calls ---------- */

const CELL = S.obj({
  id: S.str(), x: S.num(), y: S.num(), w: S.num(), h: S.num(), rx: S.opt(S.num()), label: S.opt(S.text()), value: S.opt(S.either(S.num(), S.text())),
  corner: S.opt(S.either(S.num(), S.text())), sub: S.opt(S.text()), cls: S.opt(S.str()), fill: S.opt(S.str()),
});
const EDGE = S.obj({ a: S.str(), b: S.str(), cls: S.str(), bend: S.num(), off: S.num() });
const FIGURES = {
  scene: item(t('一张画好的图：格子、箭头和字，坐标照写', 'a picture as drawn: cells, arrows and words, at their coordinates'),
    S.obj({ cells: S.list(CELL), edges: S.list(EDGE), texts: S.opt(S.list(S.obj({ x: S.num(), y: S.num(), t: S.text(), anchor: S.opt(S.oneOf(['start', 'middle', 'end'])), cls: S.opt(S.str()) }))) })),
  grid: item(t('棋盘：R 行 C 列，箭头往右往下（或按 moves），个别格子另写', 'a grid of R × C with arrows right and down (or by moves), some cells written apart'),
    S.obj({ R: int({ min: 1 }), C: int({ min: 1 }), arrows: S.opt(S.bool()), moves: S.opt(S.list(pt)), cells: S.opt(S.map(S.obj({ value: S.opt(S.either(S.num(), S.text())), corner: S.opt(S.either(S.num(), S.text())), label: S.opt(S.text()), cls: S.opt(S.str()) }), { keys: '^\\d+,\\d+$' })), edges: S.opt(S.map(S.str(), { keys: '^\\d+,\\d+>\\d+,\\d+$' })), robot: S.opt(S.str()) })),
  circuit: item(t('一小块示意电路：上面是输入，中间是元件，下面是输出', 'a little circuit: inputs on top, parts in rows, outputs at the bottom'),
    S.obj({
      taps: S.list(S.obj({ id: S.str(), label: S.text(), kind: S.opt(S.oneOf(['bool'])) })),
      parts: S.list(S.obj({ id: S.str(), name: S.text(), tag: S.opt(S.text()), row: S.opt(nat) })),
      outs: S.list(S.obj({ id: S.str(), label: S.text() })),
      wires: S.list(S.obj({ from: S.str(), to: S.str(), kind: S.opt(S.oneOf(['bool', 'off'])) })),
    })),
  window: item(t('机器人 3×3 的视野：每格的值，亮起的是读的格子', 'the robot’s 3×3 view: what each cell holds, the ones read lit'), S.obj({ vals: S.map(S.either(S.num(), S.text())), on: ids })),
};

const has = S.either(S.ref('part'), S.obj({ part: S.ref('part'), value: S.opt(S.num()) }));
const CONDITIONS = {
  reads: item(t('输入元件上点了这个传感器', 'an input card reads this sensor'), S.str()),
  uses: item(t('这个传感器读了，还接出了线', 'this sensor is read and wired on'), S.str()),
  has: item(t('板上有这种元件（可以再说它的数值）', 'the board has a part of this type (and this value)'), has),
  feeds: item(t('一种元件直接接进另一种元件', 'a part of one type wired straight into a part of another'), S.obj({ from: S.ref('part'), to: S.ref('part') })),
  placed: item(t('板上放了元件', 'a part is on the board')),
  wired: item(t('板上接了线', 'a wire is on the board')),
  wiredOut: item(t('输出接上了线', 'an output is wired')),
  stage: item(t('正在玩第几阶段（从 1 数）', 'the stage being played (from 1)'), int({ min: 1 })),
  all: item(t('每一条都成立', 'every one holds'), S.list(S.call('condition'))),
  any: item(t('至少一条成立', 'one of them holds'), S.list(S.call('condition'))),
  not: item(t('这一条不成立', 'this one does not hold'), S.call('condition')),
};

const TRACES = {
  lcs: item(t('公共子序列表倒推出的路线和连线', 'the walk back through a common-subsequence table, and its matched letters')),
  edit: item(t('编辑距离表倒推出的路线', 'the walk back through an edit-distance table')),
  local: item(t('局部对齐从最大的一格倒推到 0', 'local alignment walked back from its best cell to a 0')),
  knap: item(t('背包表倒推出的装法', 'the packing walked back through a knapsack table')),
  seam: item(t('从最底一行最小的格子倒推的缝', 'the seam walked back from the smallest cell of the bottom row')),
  tags: item(t('维特比表倒推出的词性', 'the tags walked back through a Viterbi table')),
};
const PANELS = {
  lcs: item(t('通过后：表格里藏着的连线', 'once passed: the lines hidden in the table')),
  edit: item(t('通过后：倒推出的改法', 'once passed: the edits traced back')),
  spell: item(t('全部通过后：候选词按步数排', 'once every test passes: the candidates by number of steps'), S.obj({ candidates: ids })),
  local: item(t('通过后：最像的一段', 'once passed: the most alike stretch')),
  tags: item(t('通过后：倒推出的标法（测试有 note 时加一句）', 'once passed: the tagging traced back (and the test’s note)')),
  knap: item(t('通过后：倒推出的装法', 'once passed: the packing traced back')),
  roll: item(t('物品一览，正在改写的那件亮起', 'the items, the one being rewritten lit')),
  dictionary: item(t('词典（和每个词的代价）', 'the dictionary (and what each word costs)')),
  robConflict: item(t('反例：一家一格时，两段历史落进同一个格子', 'the counterexample: with one cell a house, two histories land in one cell')),
};
const EXPLAINS = {
  roll: item(t('压成一行时，改写方向错了会把一件物品放两次', 'in one row, rewriting the wrong way packs an item twice')),
};
const MIGRATIONS = {
  oldBoards: item(t('第 3 版以前的电路板：去掉一些元件，给元件改名', 'boards from before version 3: drop some parts, rename others'), S.obj({ drop: S.opt(ids), rename: S.opt(S.map(S.str())) })),
  boards: item(t('电路板换成第 3 版的形状；搭出的元件按它的名字', 'boards into the shape of version 3, built parts by their names'), S.obj({ parts: S.map(S.str()) })),
};
const PORTS = {
  reads: item(t('读这一关的一个传感器，名字随它', 'a sensor of the level, named as it is'), S.str()),
  way: item(t('第 n 条来路（a、b、c、d）：一个传感器，或板上一个只属于这一关的输入', 'way in n (a, b, c, d): a sensor, or an input of the board of its own'), S.obj({ n: int({ min: 1, max: 4 }), sensor: S.opt(S.str()), input: S.opt(S.str()) })),
  start: item(t('「起点」：一个是 / 否传感器', '“start”: a yes / no sensor'), S.obj({ sensor: S.str() })),
  named: item(t('自己起名字的口', 'a port with a name of its own'), S.obj({ label: S.text(), short: S.text(), sensor: S.str() })),
};

/* ---------- the machines and parts ---------- */

const ROBOTS = {
  scout: item(t('小方：视野 3×3', 'Boxy: a 3×3 view')),
  ranger: item(t('远望：视野 5×5，看得见表头，会换方向扫', 'Farsight: a 5×5 view, the table’s headings, other scan orders')),
  reach: item(t('长臂：视野 5×5，伸缩臂够到任意远', 'Longarm: a 5×5 view, a telescopic arm')),
  broom: item(t('扫帚：扫描臂一次扫过一整段', 'Broom: a sweep arm over a whole run')),
  stack: item(t('千层：同时站在很多层上，探针探到另一层', 'Layercake: many layers at once, a probe to another')),
  loop: item(t('回环：一轮一轮扫到不再变', 'Loop: scans in rounds until nothing changes')),
};
const PARTS = Object.fromEntries([
  ['msum', t('汇合器 · 加起来', 'Merger · sum')], ['mmin', t('汇合器 · 取较小', 'Merger · min')], ['mmax', t('汇合器 · 取较大', 'Merger · max')], ['many', t('汇合器 · 任一是', 'Merger · any yes')],
  ['not', t('取反', 'Not')], ['add', t('加法器', 'Adder')], ['mul', t('乘法器', 'Multiplier')], ['const', t('常数', 'Constant')], ['pass', t('放行闸', 'Pass gate')], ['block', t('拦截闸', 'Block gate')],
].map(([k, about]) => [k, item(about)]));
const MODES = {
  circuit: item(t('拼电路板：机器人在每一格上跑它', 'wiring a board the robot runs on every cell')),
  fill: item(t('亲手填表：每个地点的路线数', 'filling the table by hand: the routes to every place')),
  trace: item(t('一条条找出所有路线', 'tracing every route one by one')),
  link: item(t('连线不交叉：两串字相同的字母连起来', 'lines that never cross between equal letters of two strings')),
  pack: item(t('亲手装背包', 'packing a backpack by hand')),
  breach: item(t('找反例：画两条路线，落进同一个格子', 'finding the counterexample: two routes into one cell')),
  policy: item(t('顺着价值画出箭头', 'drawing the arrows along the values')),
  seam: item(t('一条条剪掉图里的缝', 'cutting seams out of a picture one by one')),
};

/* ---------- a level ---------- */

const TEXTS = S.list(S.text());
const COMMON = {
  mode: S.ref('mode'),
  title: S.text(),
  short: S.text(),
  intro: S.list(S.obj({ t: S.text(), fig: S.opt(S.call('figure')) })),
  mission: S.obj({ goal: S.text(), how: S.text() }),
  debrief: S.obj({ title: S.text(), body: TEXTS, note: S.opt(S.text()) }),
  unlock: S.opt(S.str({ about: t('通过它解锁的元件或想法（game.json 的 parts）', 'the part or idea solving it unlocks (game.json parts)') })),
  hints: S.opt(TEXTS),
};
const PLACE = S.obj({ id: S.str(), x: S.num(), y: S.num(), label: S.text(), fixed: S.opt(S.num()), goal: S.opt(S.num()) });
const LINKS = S.list(S.list(S.str(), { min: 2 }));
const HAND = {
  fill: S.either(S.obj({ ...COMMON, grid: S.obj(GRID) }), S.obj({ ...COMMON, cells: S.list(PLACE), edges: LINKS, start: S.str(), end: S.str() })),
  trace: S.obj({ ...COMMON, cells: S.list(PLACE), edges: LINKS, start: S.str(), end: S.str() }),
  link: S.obj({ ...COMMON, tests: S.list(S.obj({ a: S.str(), b: S.str() })) }),
  pack: S.obj({ ...COMMON, tests: S.list(S.obj({ W: nat, items: S.list(KNAP_ITEM) })) }),
  breach: S.obj({ ...COMMON, maze: S.obj({ ...GRID, key: pt, doors: S.list(pt) }), hintText: S.text() }),
  policy: S.obj({ ...COMMON, map: S.obj({ ...GRID, gold: pt, traps: S.opt(S.list(pt)), walls: S.opt(S.list(pt)) }), starts: S.list(pt) }),
  seam: S.obj({ ...COMMON, img: matrix, cuts: int({ min: 1 }) }),
};

/** A circuit level's own fields, whatever its stages. */
const CIRCUIT = {
  ...COMMON,
  robot: S.ref('robot'),
  adds: S.opt(S.list(S.ref('part'))),
  fold: S.opt(S.list(S.str())),
  carry: S.opt(S.str({ about: t('从这一关玩家留下的电路板开始（必须是先修）', 'start from the board left on this level (a prerequisite)') })),
  builds: S.opt(S.obj({ ports: S.list(S.call('port')), setting: S.opt(S.num()) }, { about: t('通过后电路板成为元件 unlock：它的口，和它带的一个数', 'once solved the board is the part `unlock`: its ports, and a number it carries') })),
  naive: S.opt(BOARD),
  guide: S.opt(S.list(S.obj({ until: S.opt(S.call('condition')), say: S.text() }), { about: t('一步步的引导：显示第一条 until 还不成立的', 'step-by-step guidance: the first whose until does not hold yet') })),
  diagnose: S.opt(S.list(S.obj({ when: S.call('condition'), say: S.text() }), { about: t('失败时：第一条 when 成立的说法', 'on a failure: the first whose when holds') })),
  testLabel: S.opt(S.text({ about: t('测试的名字：{字段}、{字段.length}、{列表|分隔符}', 'a test’s name: {field}, {field.length}, {list|separator}') })),
  trace: S.opt(S.call('trace')),
  after: S.opt(S.call('panel')),
  explain: S.opt(S.call('explain')),
  boardOpt: S.opt(S.obj({ minScale: S.num(), maxScale: S.num() })),
  checkAll: S.opt(S.bool({ about: t('逐格判对错，不只看答案', 'grade every cell, not just the answer') })),
  noTrace: S.opt(S.bool({ about: t('失败时不指出第一处算错的格子', 'on a failure, do not point at the first cell gone wrong') })),
  consts: S.opt(S.list(S.num(), { about: t('常数能选的值', 'the values a constant offers') })),
  showcase: S.opt(S.text({ about: t('新元件第一次出现时只放它一个也算一关：它的用法抽象在哪里', 'a new part may have a level that only places it: what is abstract about its use') })),
};
/** What one stage is (a level of one stage writes it among its own fields): its world and that world's parameters. */
const stageOf = (name, w, shared = false) => ({
  world: S.oneOf([name]),
  facts: S.opt(ids),
  tests: shared ? S.opt(S.list(w.test, { min: 1 })) : S.list(w.test, { min: 1 }),
  solution: S.opt(BOARD),
  ...Object.fromEntries(Object.entries(w.params.fields)),
});
const STAGE_ONLY = {
  hints: S.opt(TEXTS),
  ask: S.opt(S.text()),
  tip: S.opt(S.text()),
  done: S.opt(S.obj({ head: S.opt(S.text()), body: S.opt(TEXTS) })),
  carry: S.opt(S.bool({ about: t('接着用上一阶段的电路板', 'go on with the last stage’s board') })),
  unlockToast: S.opt(S.text()),
  noArm: S.opt(S.bool()),
  checkAll: S.opt(S.bool()),
  adds: S.opt(S.list(S.ref('part'))),
  onFail: S.opt(S.obj({ head: S.text(), body: S.text({ about: t('{test}、{want}、{got} 换成失败的测试', '{test}, {want}, {got} filled in from the failed test') }), show: S.call('panel'), next: S.text() }, { about: t('这一阶段的失败是要讲的道理：说完进下一阶段', 'failing this stage is its lesson: then on to the next') })),
};
// A stage of several may leave its tests to the level's own (tests every stage shares).
const byWorld = (fields, shared) => S.by('world', Object.fromEntries(Object.entries(WORLDS).map(([name, w]) => [name, S.obj({ ...fields, ...stageOf(name, w, shared) })])));
const CIRCUIT_LEVEL = S.either(
  byWorld(CIRCUIT, false),
  S.obj({ ...CIRCUIT, tests: S.opt(S.list(S.any())), stages: S.list(byWorld(STAGE_ONLY, true), { min: 2 }) }),
);

/* ---------- game.json ---------- */

const ITEM = S.either(S.str(), S.obj({ parallel: S.list(S.obj({ id: S.str(), title: S.text(), levels: ids })) }));
const AFTER = S.either(S.str(), ids);
const ERA = S.obj({
  id: S.str(),
  machine: S.either(S.ref('robot'), NONE),
  keeps: S.opt(S.either(S.oneOf(['all']), ids)),
  foundation: S.list(ITEM),
  practice: S.opt(S.list(ITEM)),
  topics: S.opt(S.list(S.obj({ id: S.str(), code: S.str({ pattern: '^[A-Z]$' }), after: S.opt(AFTER), requires: S.opt(ids), levels: ids, title: S.text(), desc: S.text() }))),
  challenges: S.opt(S.list(S.obj({ level: S.str(), after: S.opt(AFTER) }))),
  chapter: S.obj({ title: S.text(), desc: S.text() }),
});
const SAVE_OP = S.either(
  S.obj({ rename: S.map(S.either(S.str(), NONE)) }),
  S.obj({ fields: S.map(S.str()) }),
  S.obj({ grant: S.list(S.str()) }),
  S.obj({ solve: S.list(S.either(S.str(), ids)) }),
  S.obj({ built: ids }),
  S.obj({ merge: S.list(S.either(S.str(), ids)) }),
  S.obj({ split: S.list(S.either(S.str(), ids)) }),
  S.obj({ data: S.call('migration') }),
);
const GAME = S.obj({
  title: S.text(),
  kicker: S.text(),
  lede: S.text({ about: t('这款游戏教什么、学完能亲手做成什么，不写关卡数', 'what the game teaches and what the player ends up building, not how many levels') }),
  primitives: S.list(S.ref('part')),
  parts: S.map(S.obj({ name: S.text(), desc: S.text() }), { about: t('关卡解锁的元件和想法：元件箱里的名字和说明', 'what levels unlock: their names and descriptions in the components box') }),
  eras: S.list(ERA, { min: 1 }),
  saves: S.list(S.obj({ version: int({ min: 2 }), ops: S.list(SAVE_OP) })),
  legacyKey: S.opt(S.str()),
  borrow: S.opt(S.map(S.str(), { about: t('一个想法在元件箱里借用哪一关的电路板', 'the level whose board an idea borrows in the components box') })),
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
    migration: MIGRATIONS,
    port: PORTS,
  },
  game: GAME,
  level: S.by('mode', { circuit: CIRCUIT_LEVEL, ...HAND }),
});
