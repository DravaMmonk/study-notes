// Chapter 13: who goes first — the player sets the scan order, on a grid and on the interval table.

import { E, gridScene } from '../svg.js';
import { circ } from '../circuit/components.js';

const KIT = ['msum', 'mmin', 'mmax', 'add', 'const', 'pass', 'block'];

/** An interval table for intro pages: items across the top, the upper triangle below. */
function triFig(items, val = () => '', cls = () => '', edges = []) {
  const sp = 54, sz = 46, n = items.length, cells = [];
  items.forEach((x, k) => cells.push({ id: `t${k}`, x: k * sp, y: -sp + 12, w: sz, h: 30, value: x, cls: 'axis' }));
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) cells.push({ id: `${i},${j}`, x: j * sp, y: i * sp, w: sz, h: sz, value: val(i, j), cls: cls(i, j) });
  return { cells, edges: edges.map(([a, b, c]) => E(a, b, c)) };
}
const PALIN = circ([['a', 'add'], ['k', 'const', 2], ['g', 'pass'], ['m', 'mmax']], ['tap:dl>a:0', 'k>a:1', 'tap:same>g:0', 'a>g:1', 'tap:left>m:0', 'tap:down>m:1', 'g>m:2', 'm>out:cell']);
const MERGE = circ([['a', 'add'], ['m', 'mmin'], ['b', 'add']], ['tap:segL>a:0', 'tap:segR>a:1', 'a>m:0', 'm>b:0', 'tap:weight>b:1', 'b>out:cell']);

export const orders = [
  {
    id: 'dial', ch: 12, title: '拨对方向', short: '扫描顺序由你来拨', mode: 'circuit', robot: 'scout',
    intro: [
      { t: '前面的关卡里，机器人怎么走是关卡定好的。从这一章起，<b>扫描顺序由你来拨</b>。' },
      { t: '这一关的电路板已经拼好了：每个路口 = 右边 + 下面，终点算 1，石头格拦下。它数的是「<b>从这里到终点</b>有几条路线」，答案在起点。', fig: gridScene(3, 4, { cell: (r, c) => (r === 0 && c === 0 ? { value: '?', cls: 'sel' } : r === 2 && c === 3 ? { value: 1, cls: 'src' } : {}) }) },
      { t: '电路板下面多了一个<b>扫描顺序</b>拨盘。每个选项的小图上，数字是机器人走过格子的先后。拨一个，让机器人读到的格子总是已经算好。' },
    ],
    mission: { goal: '电路板已经拼好：从这里到终点的路线数 = 右边 + 下面。拨对扫描顺序，让机器人在起点算出答案。', how: '在电路板下面的拨盘里选一个顺序，再点「运行测试」。读到空格子时，机器人会停下来，拨盘会闪一下。' },
    world: 'grid', facts: ['end', 'rock'], palette: KIT, answerAt: 'start',
    dial: ['rowTL', 'colL', 'colR', 'rowBR'], solutionScan: 'rowBR',
    preset: circ([['m', 'msum'], ['k', 'const', 1], ['g', 'pass'], ['b', 'block']], ['tap:right>m:0', 'tap:down>m:1', 'tap:end>g:0', 'k>g:1', 'g>m:2', 'tap:rock>b:0', 'm>b:1', 'b>out:cell']),
    tests: [{ R: 4, C: 5, rocks: [[1, 2]] }, { R: 4, C: 4, rocks: [[2, 1], [1, 3]] }],
    solution: circ([['m', 'msum'], ['k', 'const', 1], ['g', 'pass'], ['b', 'block']], ['tap:right>m:0', 'tap:down>m:1', 'tap:end>g:0', 'k>g:1', 'g>m:2', 'tap:rock>b:0', 'm>b:1', 'b>out:cell']),
    hints: ['这一格要读右边和下面：这两格必须比它先算。', '看看拨盘的小图：哪个顺序里，每个格子的右边和下面都排在它前面？'],
    debrief: { title: '顺序要跟着箭头走', body: ['电路板读右边和下面，所以右边和下面的格子必须先算。四个顺序里，只有「逐行，从右下开始」做到了这一点。', '<b>电路决定了箭头，箭头决定了哪些顺序合法。</b>下一关的表换了个形状，合法的顺序会不止一种。'], note: '拨顺序：被读的格子，必须排在读它的格子前面。' },
  },
  {
    id: 'palin', ch: 12, title: '回文', short: '一张三角形的表', mode: 'circuit', robot: 'scout',
    intro: [
      { t: '回文是正着读、倒着读都一样的字串，比如 ABA、RACECAR。从一个词里删掉一些字母（剩下的保持顺序），<b>最长能留下多长的回文</b>？比如 CHARACTER 里能留下 CARAC。' },
      { t: '新的表：<b>区间表</b>。格子 (i, j) 记着「第 i 个到第 j 个字母这一段」的答案。只用到右上半张，因为一段的开头总在结尾的左边。右上角就是整个词的答案。', fig: triFig([...'ABCA'], (i, j) => (i === j ? 1 : ''), (i, j) => (i === 0 && j === 3 ? 'sel' : i === j ? 'lit' : '')) },
      { t: '对角线上是单个字母，它自己就是长度 1 的回文，已经填好了。对角线下面那一排是「空段」，一个字母都没有，填 0。' },
      { t: '机器人站在 (i, j) 上：<b>左边</b>一格是去掉右端的那一段，<b>下面</b>一格是去掉左端的那一段，<b>左下</b>是两端都去掉的那一段。「本格信息」里有「两端相同」。只看两端的两个字母，想想相同和不同时各该怎么办。' },
      { t: '最后拨一个扫描顺序。拨盘小图上的三角形，就是这张表的形状。' },
    ],
    mission: { goal: '算出每个词里最长的回文子序列：删掉一些字母后，正着读和倒着读都一样的最长字串。', how: '拼好电路，再拨一个扫描顺序。表的形状变了，「逐行，从上往下」还行不行？' },
    world: 'interval', facts: ['same'], palette: KIT, empty0: true, diag: 1,
    dial: ['rowTL', 'colL', 'rowBR', 'len'], solutionScan: 'len',
    tests: [{ s: 'ABCA' }, { s: 'CHARACTER' }, { s: 'BBABCBCAB' }],
    solution: PALIN,
    hints: ['两端相同时，两端都能留下：中间那一段（左下）+ 2。用放行闸，条件接「两端相同」。', '两端不同时，至少丢掉一端：去掉右端（左边）或去掉左端（下面），取较大。三路都接进「取较大」。', '顺序：每格读的左边、下面、左下都是更短的段。按长度从短到长，或者从下往上逐行。'],
    boardOpt: { minScale: 0.6, maxScale: 1.15 },
    debrief: { title: '区间表', body: ['区间表的每一格，都靠<b>更短的段</b>算出来：去掉一端，或去掉两端。所以只要短的段先算，怎么排都行：按长度从短到长，或者从下往上一行一行。', 'CHARACTER 里藏着 CARAC，BBABCBCAB 里藏着 BABCBAB。找 DNA 里的回文结构，用的就是这张表。'], note: '区间表：(i, j) 记一段的答案，靠更短的段算出来。' },
  },
  {
    id: 'stones', ch: 12, title: '合并石子', short: '在每个切分点上合并', mode: 'circuit', robot: 'broom',
    intro: [
      { t: '一排石堆，每次只能把<b>相邻的两堆</b>合成一堆，花费是这两堆的重量之和。一直合到只剩一堆，最少要花多少？' },
      { t: '比如 3、1、2：先合 3 和 1（花 4），再和 2 合（花 6），一共 10；先合 1 和 2（花 3），再和 3 合（花 6），一共 9。顺序不同，花费也不同。' },
      { t: '还是区间表：格子 (i, j) 记「把第 i 到第 j 堆合成一堆，最少花多少」。单独一堆不用合，对角线上已经填好了 0。', fig: triFig(['3', '1', '2'], (i, j) => (i === j ? 0 : ''), (i, j) => (i === j ? 'lit' : i === 0 && j === 2 ? 'sel' : '')) },
      { t: '最后一次合并，一定是把左边一大堆和右边一大堆合起来。左右在哪里分开？可能是任何一个<b>切分点</b>。想一想：最后这一下要花多少？在它之前的花费，又在表里的哪两格？' },
      { t: '扫帚的扫描臂这次按切分点工作：每个切分点送来一对格子，排成「左段们」和「右段们」两整段。加法器能把两整段<b>一对一对</b>地相加。' },
    ],
    mission: { goal: '每次只能合并相邻的两堆，花费是两堆重量之和。算出把一排石堆合成一堆的最少花费。', how: '扫描臂送来每个切分点的左段和右段。拼好电路，再拨一个扫描顺序。' },
    world: 'interval', facts: ['weight'], palette: KIT, diag: 0,
    dial: ['rowTL', 'rowBR', 'len'], solutionScan: 'len',
    tests: [{ w: [3, 1, 2] }, { w: [4, 1, 1, 4] }, { w: [2, 3, 1, 5, 2] }],
    solution: MERGE,
    hints: ['每个切分点的花费：左段的花费 + 右段的花费。把「左段们」和「右段们」接进同一个加法器，它会一对一对地加。', '所有切分点里挑最省的（取较小），再加上这一段的总重。'],
    unlock: 'interval', blueprint: ['segL', 'segR', 'weight'],
    boardOpt: { minScale: 0.6, maxScale: 1.15 },
    debrief: { title: '区间合并', body: ['每一格的来路是<b>所有切分点</b>：段越长，切分点越多。这种「最后一步把两段合起来」的结构，叫区间动态规划。', '给一串算式加括号、矩阵连乘的最佳顺序、把一排相邻的文件两两合并，用的都是这种区间表。这块电路板存进了零件箱，叫「区间合并器」。'], note: '区间合并：最后一步合并左段和右段；在所有切分点里挑最省的，再加整段的代价。' },
  },
  {
    id: 'twoorders', ch: 12, title: '顺序不止一种', short: '同一块电路板，换个顺序', mode: 'circuit', robot: 'broom', uses: ['interval'],
    intro: [
      { t: '上一关你拨了一个顺序。别的顺序也行吗？' },
      { t: '这一关有两个阶段：先用任意一个合法的顺序通过，再换一个<b>不一样的</b>顺序，用同一块电路板再通过一次。' },
      { t: '「区间合并器」已经在零件箱里，可以直接放上电路板。拨盘上多了几个选项。每一格要读它左边一整排、下面一整列，想想哪些顺序能让它们先算好。' },
    ],
    mission: { goal: '合并石子，花费最少。用两种不同的扫描顺序，各通过一次。', how: '阶段 1 拨任意一个能通过的顺序；阶段 2 电路板留着，换一个和阶段 1 不一样的顺序。' },
    tests: [{ w: [5, 2, 4, 1, 3] }, { w: [1, 9, 1, 9, 1, 9] }],
    stages: [
      {
        world: 'interval', facts: ['weight'], palette: ['bp:stones', ...KIT], diag: 0, ask: '拨一个顺序，让测试通过。',
        dial: ['rowTL', 'colL', 'colLB', 'rowBR', 'len'], solutionScan: 'len',
        solution: circ([['c', 'bp:stones']], ['tap:segL>c:0', 'tap:segR>c:1', 'tap:weight>c:2', 'c>out:cell']),
        hints: ['每一格读的是同一行左边的格子，和同一列下面的格子。', '能行的顺序有三个：按长度、逐行从下往上、逐列每列从下往上。'],
        done: { head: '一种顺序通过了', body: ['电路板会留着。换一个不一样的顺序，再通过一次。'] },
      },
      {
        world: 'interval', facts: ['weight'], palette: ['bp:stones', ...KIT], diag: 0, carry: true, differ: 0, ask: '换一个和阶段 1 不一样的顺序，再通过一次。',
        hints: ['每一格读的是同一行左边的格子，和同一列下面的格子。', '能行的顺序有三个：按长度、逐行从下往上、逐列每列从下往上。'],
        dial: ['rowTL', 'colL', 'colLB', 'rowBR', 'len'], solutionScan: 'rowBR',
        solution: circ([['c', 'bp:stones']], ['tap:segL>c:0', 'tap:segR>c:1', 'tap:weight>c:2', 'c>out:cell']),
      },
    ],
    unlock: 'anyorder',
    debrief: { title: '合法的顺序不止一种', body: ['按长度、逐行从下往上、逐列每列从下往上，都行。它们只有一个共同点：<b>每一格都排在它要读的格子之后</b>。', '顺序不是答案的一部分，只是「先算谁」的安排。到了「从上往下」那一章，机器会自己找出一个顺序。'], note: '只要被读的格子先算好，什么顺序都行。' },
  },
];
