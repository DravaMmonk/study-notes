// Chapter 11: one skeleton, many questions — swap the merge, then fill the table with 是 / 否 and with wins and losses.

import { gridScene, circuitFig } from '../svg.js';
import { circ, hasKind } from '../circuit/components.js';

const KIT = ['msum', 'mmin', 'mmax', 'add', 'const', 'pass', 'block'];
const YESNO = ['many', 'not', 'pass', 'block', 'const'];
const MAP_A = [[1, 3, 1, 2], [2, 5, 1, 4], [4, 2, 6, 1]];
const MAP_B = [[2, 1, 4, 1], [3, 6, 1, 2], [1, 2, 5, 3], [4, 1, 2, 1]];
const COUNT = circ([['m', 'msum'], ['k', 'const', 1], ['g', 'pass']], ['tap:up>m:0', 'tap:left>m:1', 'tap:start>g:0', 'k>g:1', 'g>m:2', 'm>out:cell']);
const best = (merge, fact) => circ([['m', merge], ['k', 'const', 0], ['g', 'pass'], ['a', 'add']], ['tap:up>m:0', 'tap:left>m:1', 'tap:start>g:0', 'k>g:1', 'g>m:2', 'm>a:0', `tap:${fact}>a:1`, 'a>out:cell']);
const yn = v => ({ value: v ? '是' : '否', cls: v ? 'yes' : 'no' });

export const skeleton = [
  {
    id: 'swap', ch: 10, title: '换一个汇合器', short: '同一张地图，三个问题', mode: 'circuit', robot: 'scout',
    intro: [
      { t: '新的一章，先做一件你会的事：数路线。不过这一关有<b>三个阶段</b>，三个阶段用的是同一张地图。', fig: gridScene(3, 4, { cell: (r, c) => ({ corner: MAP_A[r][c] }) }) },
      { t: '数完路线，同一张地图会接着问：每个路口角上的数如果是<b>金币</b>，最多能捡到几枚？如果是<b>体力</b>，最少要花多少？' },
      { t: '电路板会从一个阶段留到下一个阶段。想一想，三个问题之间到底差在哪？你也许只需要换掉一个元件。<b>点电路板上的汇合器，可以直接换型号，连线不用重接。</b>' },
    ],
    mission: { goal: '只能往右或往下走。同一张地图，回答三个问题：有几条路线；最多能捡到几枚金币；最少要花多少体力。', how: '每通过一个阶段，电路板会留到下一阶段。点汇合器可以换型号（加起来 / 取较大 / 取较小），连线不变。' },
    tests: [{ R: 3, C: 4 }, { R: 4, C: 4 }],
    stages: [
      {
        world: 'grid', facts: ['start'], palette: ['msum', 'const', 'pass'], ask: '先数路线：从起点到终点一共有几条？', solution: COUNT,
        hints: ['每个路口 = 上面 + 左边，起点放行 1。'],
        done: { head: '路线数好了', body: ['同一张地图，下一个问题：路口角上的数是金币，最多能捡到几枚？', '电路板会留着。想想要换掉哪个元件，又要多接什么。'] },
      },
      {
        world: 'grid', facts: ['start', 'coin'], palette: KIT, carry: true, tests: [{ R: 3, C: 4, coins: MAP_A }, { R: 4, C: 4, coins: MAP_B }],
        ask: '角上的数是金币（起点和终点也算），最多能捡到几枚？', solution: best('mmax', 'coin'),
        hints: ['只走一条路，两边挑金币多的那边：把汇合器换成「取较大」。', '经过这个路口，还要捡起它自己的金币：取较大之后，用加法器加上「本格金币」。', '起点的上面和左边都是「—」：放行闸在起点送进去的数要改成 0（点常数可以改）。'],
        done: { head: '金币也算好了', body: ['你只换了汇合器，再加上本格的金币。', '最后一个问题：角上的数换成体力，最少要花多少？'] },
      },
      {
        world: 'grid', facts: ['start', 'cost'], palette: KIT, carry: true, tests: [{ R: 3, C: 4, costs: MAP_A }, { R: 4, C: 4, costs: MAP_B }],
        ask: '角上的数换成体力（起点和终点也算），最少要花多少？', solution: best('mmin', 'cost'),
        hints: ['这次挑花费少的那边：汇合器换成「取较小」。', '加法器那一路，从「本格金币」换成「本格体力」。'],
      },
    ],
    diagnose: (c, st) => (st.stage === 1 && hasKind(c, 'msum') ? '只能走一条路，两边的金币不能加在一起：点汇合器，换成「取较大」。' : st.stage === 2 && !hasKind(c, 'mmin') ? '要花得最少：汇合器换成「取较小」。' : null),
    unlock: 'skeleton',
    debrief: { title: '一副骨架，三个问题', body: ['三块电路板几乎一模一样：<b>读上面和左边，合并，再加上本格</b>。不同的只有汇合器：加起来是数路线，取较大是找最多，取较小是找最少。', '这就是动态规划的骨架：先定好每一格存什么、从哪几格来，再决定怎么合并。合并方式一换，同一张表就回答另一个问题。'], note: '同一副骨架换个汇合器：加起来数个数，取较大找最多，取较小找最少。' },
  },
  {
    id: 'reach', ch: 10, title: '能不能到', short: '格子里存「是」和「否」', mode: 'circuit', robot: 'scout',
    intro: [
      { t: '有时候不用知道有几条路线，只想知道<b>能不能到</b>。这时格子里不用存数，存「是」或「否」就够了。', fig: gridScene(3, 3, { cell: (r, c) => (r === 1 && c === 1 ? { cls: 'rock' } : yn(!(r === 1 && c === 1))) }) },
      { t: '新元件：「<b>任一是</b>」汇合器。接进来的信号里只要有一个「是」，它就输出「是」。到一个路口，上面或左边只要有一边能到，这里就能到。', fig: circuitFig({ taps: [['u', '上面 · 否', 'bool'], ['l', '左边 · 是', 'bool']], parts: [['m', '汇合器', '任一是']], outs: [['o', '本格 · 是']], wires: [['u', 'm', 'bool'], ['l', 'm', 'bool'], ['m', 'o', 'bool']] }) },
      { t: '起点本身当然能到。石头格呢？拦截闸现在也能拦「是 / 否」：被拦下的格子写「—」，「任一是」不会把它当成「是」。' },
    ],
    mission: { goal: '只能往右或往下走，不能经过石头。每个格子写上「是」或「否」：从起点能不能走到这里（石头格写「—」）。', how: '这一关会检查整张表。点亮上面、左边和「是起点」，用「任一是」汇合器合起来，别忘了石头。' },
    world: 'gridYes', facts: ['start', 'rock'], palette: YESNO, fresh: ['many'], checkAll: true,
    tests: [{ R: 4, C: 5, rocks: [[0, 3], [1, 1], [2, 3]] }, { R: 4, C: 4, rocks: [[0, 2], [1, 1], [2, 0]] }, { R: 5, C: 5, rocks: [[1, 2], [2, 1], [3, 3], [4, 2]] }],
    testLabel: t => `${t.R}×${t.C} · ${t.rocks.length} 块石头`,
    solution: circ([['m', 'many'], ['b', 'block']], ['tap:up>m:0', 'tap:left>m:1', 'tap:start>m:2', 'tap:rock>b:0', 'm>b:1', 'b>out:cell']),
    hints: ['到这一格，只要上面或左边有一边能到就行：把上面、左边都接进「任一是」汇合器。', '起点能到：把「是起点」也接进「任一是」。', '石头格谁也到不了：用拦截闸拦住结果，条件接「是石头」。'],
    debrief: { title: '是或否，也能填表', body: ['格子里不一定要存数。<b>存「是 / 否」</b>，表就能回答「能不能」一类的问题。', '合并方式也跟着换：数路线要加起来，问能不能到，只要有一个「是」就够，所以用「任一是」。第 2 个测试里，一排石头把路彻底堵死了，终点是「否」。'], note: '格子可以存「是 / 否」：任一来路能到，这里就能到。' },
  },
  {
    id: 'nim', ch: 10, title: '拿石子', short: '对手的输，就是你的赢', mode: 'circuit', robot: 'ranger',
    intro: [
      { t: '桌上有一堆石子。两个人轮流拿，每次拿 <b>1 颗或 2 颗</b>，拿走最后一颗的人赢。轮到你先拿，你能赢吗？' },
      { t: '把「还剩几颗」排成一行，每一格记：<b>轮到你、还剩这么多颗时，你能不能赢</b>。一颗不剩时轮到你，说明对手刚拿走了最后一颗：你输了。', fig: { cells: Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, x: i * 60, y: 0, w: 50, h: 50, corner: i, ...(i === 0 ? yn(false) : {}) })), edges: [] } },
      { t: '只看你这一步：拿 1 颗，对手面对「拿走 1 颗后」那一格；拿 2 颗，对手面对「拿走 2 颗后」那一格。想一想：对手面对的格子是「是」还是「否」的时候，你才能赢？两种拿法里，要几种行得通才够？' },
      { t: '新元件「<b>取反</b>」：「是」变「否」，「否」变「是」。格子里记的是「轮到的人能不能赢」。你拿完以后，轮到的是谁？', fig: circuitFig({ taps: [['a', '对手 · 否', 'bool']], parts: [['n', '取反', '是 ↔ 否']], outs: [['o', '你 · 是']], wires: [['a', 'n', 'bool'], ['n', 'o', 'bool']] }) },
    ],
    mission: { goal: '每次拿 1 颗或 2 颗，拿走最后一颗的人赢。算出石子还剩几颗时，轮到的人能不能赢。', how: '这一关会检查整行。视野里点亮「拿走 1 颗后」和「拿走 2 颗后」，用取反和「任一是」拼出电路。' },
    world: 'pile', facts: ['ground'], palette: YESNO, fresh: ['not'], checkAll: true,
    tests: [{ n: 5 }, { n: 9 }, { n: 10 }],
    solution: circ([['a', 'not'], ['b', 'not'], ['m', 'many']], ['tap:m1>a:0', 'tap:m2>b:0', 'a>m:0', 'b>m:1', 'm>out:cell']),
    hints: ['你拿完之后，轮到谁走？对手那一格是「是」，说明对手能赢，你就输了：用取反把它翻过来。', '两种拿法，只要有一种让对手输，你就赢：两个取反都接进「任一是」。'],
    diagnose: c => (!hasKind(c, 'not') ? '你拿完之后，轮到谁走？格子里记的是「轮到的人能不能赢」，对手的「是」对你来说是「否」。用取反翻过来。' : null),
    debrief: { title: '输赢也能填表', body: ['一颗不剩那一格，你什么都不用接：一步也走不了，「任一是」什么也收不到，输出「否」。<b>无路可走的人就输了</b>。', '看看这一行：否、是、是、否、是、是……每逢 3 的倍数就输。你没有算任何除法，规律是表自己长出来的。', '如果每次能拿 1 到 3 颗，输的格子会落在哪里？留给你想。'], note: '轮流走的游戏：只要有一步能让对手落进「输」，这一格就「赢」。' },
  },
  {
    id: 'piles', ch: 10, title: '两堆石子', short: '输赢的花纹', mode: 'circuit', robot: 'scout',
    intro: [
      { t: '这次有两堆石子：A 堆和 B 堆。每次可以从一堆里拿 1 颗，或者<b>两堆各拿 1 颗</b>。拿走最后一颗的人赢。' },
      { t: '「还剩多少」这回要用两个数来记，表就变成了一张棋盘：第 a 行第 b 列，是「A 堆剩 a 颗、B 堆剩 b 颗」的局面。', fig: gridScene(3, 3, { arrows: false, cell: (r, c) => (r === 2 && c === 2 ? { value: '?', cls: 'sel' } : r === 0 && c === 0 ? yn(false) : {}) }) },
      { t: '三种拿法，对手分别落到「A 堆少 1 颗」（上面）、「B 堆少 1 颗」（左边）和「两堆各少 1 颗」（左上）那一格。规则和上一关一样。拼好之后，看看整张棋盘上长出了什么花纹。' },
    ],
    mission: { goal: '每次从一堆里拿 1 颗，或者两堆各拿 1 颗，拿走最后一颗的人赢。算出每种局面下，轮到的人能不能赢。', how: '这一关会检查整张棋盘。通过后，看看「是」和「否」排成了什么样子。' },
    world: 'piles', facts: [], palette: YESNO, checkAll: true,
    tests: [{ R: 4, C: 5 }, { R: 5, C: 5 }, { R: 6, C: 7 }],
    solution: circ([['a', 'not'], ['b', 'not'], ['c', 'not'], ['m', 'many']], ['tap:up>a:0', 'tap:left>b:0', 'tap:ul>c:0', 'a>m:0', 'b>m:1', 'c>m:2', 'm>out:cell']),
    hints: ['三种拿法：「A 堆少 1 颗」「B 堆少 1 颗」「两堆各少 1 颗」，三格都要点亮。', '每种拿法都取反，再一起接进「任一是」。'],
    unlock: 'judge', blueprint: ['up', 'left', 'ul'],
    boardOpt: { minScale: 0.62, maxScale: 1.15 },
    debrief: { title: '棋盘上的花纹', body: ['「否」都落在 A、B 都是偶数的格子上。这样的局面，不管你怎么拿，对手都能把它变回「两堆都是偶数」。', '这块电路板存进了零件箱，叫「输赢判定器」：读三个对手局面，判断这一格能不能赢。', '这一章里，同一副骨架换个汇合器，就能数个数、找最多、找最少、问能不能到、判输赢。'], note: '两堆石子：每个局面 = 任一（对手局面取反）。' },
  },
];
