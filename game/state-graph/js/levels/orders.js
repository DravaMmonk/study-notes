// Chapter 13: who goes first — the player sets the scan order, on a grid and on the interval table.

import { E, gridScene } from '../svg.js';
import { circ } from '../circuit/components.js';
import { T } from '../i18n.js';

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
const ORDER_HINTS = [T('每一格读的是同一行左边的格子，和同一列下面的格子。', 'Each cell reads the cells to its left on the same row and the cells below it in the same column.'), T('能行的顺序有三个：按长度、逐行从下往上、逐列每列从下往上。', 'Three orders work: by length, row by row from the bottom up, and column by column with each column from the bottom up.')];

export const orders = [
  {
    id: 'dial', ch: 12, title: T('拨对方向', 'Set the direction'), short: T('扫描顺序由你来拨', 'You set the scan order'), mode: 'circuit', robot: 'scout',
    intro: [
      { t: T('前面的关卡里，机器人怎么走是关卡定好的。从这一章起，<b>扫描顺序由你来拨</b>。', 'In earlier levels, the level decided how the robot walks. From this chapter on, <b>you set the scan order</b>.') },
      { t: T('这一关的电路板已经拼好了：每个路口 = 右边 + 下面，终点算 1，石头格拦下。它数的是「<b>从这里到终点</b>有几条路线」，答案在起点。', 'This level’s circuit board is already built: each crossing = right + down, the end counts 1, and rock cells are blocked. It counts “how many routes lead <b>from here to the end</b>”, so the answer is at the start.'), fig: gridScene(3, 4, { cell: (r, c) => (r === 0 && c === 0 ? { value: '?', cls: 'sel' } : r === 2 && c === 3 ? { value: 1, cls: 'src' } : {}) }) },
      { t: T('电路板下面多了一个<b>扫描顺序</b>拨盘。每个选项的小图上，数字是机器人走过格子的先后。拨一个，让机器人读到的格子总是已经算好。', 'There is a new <b>Scan order</b> dial under the circuit board. In each option’s little picture, the numbers show the order the robot walks the cells in. Pick one so that every cell the robot reads has already been computed.') },
    ],
    mission: { goal: T('电路板已经拼好：从这里到终点的路线数 = 右边 + 下面。拨对扫描顺序，让机器人在起点算出答案。', 'The circuit board is built: routes from here to the end = right + down. Set the right scan order so the robot works out the answer at the start.'), how: T('在电路板下面的拨盘里选一个顺序，再点「运行测试」。读到空格子时，机器人会停下来，拨盘会闪一下。', 'Pick an order on the dial under the circuit board, then click “Run tests”. If the robot reads an empty cell, it stops and the dial flashes.') },
    world: 'grid', facts: ['end', 'rock'], palette: KIT, answerAt: 'start',
    dial: ['rowTL', 'colL', 'colR', 'rowBR'], solutionScan: 'rowBR',
    preset: circ([['m', 'msum'], ['k', 'const', 1], ['g', 'pass'], ['b', 'block']], ['tap:right>m:0', 'tap:down>m:1', 'tap:end>g:0', 'k>g:1', 'g>m:2', 'tap:rock>b:0', 'm>b:1', 'b>out:cell']),
    tests: [{ R: 4, C: 5, rocks: [[1, 2]] }, { R: 4, C: 4, rocks: [[2, 1], [1, 3]] }],
    solution: circ([['m', 'msum'], ['k', 'const', 1], ['g', 'pass'], ['b', 'block']], ['tap:right>m:0', 'tap:down>m:1', 'tap:end>g:0', 'k>g:1', 'g>m:2', 'tap:rock>b:0', 'm>b:1', 'b>out:cell']),
    hints: [T('这一格要读右边和下面：这两格必须比它先算。', 'This cell reads right and down: those two cells must be computed before it.'), T('看看拨盘的小图：哪个顺序里，每个格子的右边和下面都排在它前面？', 'Look at the dial’s little pictures: in which order does every cell come after the cells to its right and below it?')],
    debrief: { title: T('顺序要跟着箭头走', 'The order follows the arrows'), body: [T('电路板读右边和下面，所以右边和下面的格子必须先算。四个顺序里，只有「逐行，从右下开始」做到了这一点。', 'The board reads right and down, so the cells to the right and below must be computed first. Of the four orders, only “row by row, from the bottom right” manages that.'), T('<b>电路决定了箭头，箭头决定了哪些顺序合法。</b>下一关的表换了个形状，合法的顺序会不止一种。', '<b>The circuit decides the arrows, and the arrows decide which orders are valid.</b> Next level the table changes shape, and more than one order will be valid.')], note: T('拨顺序：被读的格子，必须排在读它的格子前面。', 'Setting the order: a cell that is read must come before the cell that reads it.') },
  },
  {
    id: 'palin', ch: 12, title: T('回文', 'Palindromes'), short: T('一张三角形的表', 'A triangular table'), mode: 'circuit', robot: 'scout',
    intro: [
      { t: T('回文是正着读、倒着读都一样的字串，比如 ABA、RACECAR。从一个词里删掉一些字母（剩下的保持顺序），<b>最长能留下多长的回文</b>？比如 CHARACTER 里能留下 CARAC。', 'A palindrome reads the same forwards and backwards, like ABA or RACECAR. If you delete some letters from a word (the rest keep their order), <b>what is the longest palindrome you can leave</b>? From CHARACTER, for example, you can leave CARAC.') },
      { t: T('新的表：<b>区间表</b>。格子 (i, j) 记着「第 i 个到第 j 个字母这一段」的答案。只用到右上半张，因为一段的开头总在结尾的左边。右上角就是整个词的答案。', 'A new table: the <b>interval table</b>. Cell (i, j) holds the answer for “the stretch from letter i to letter j”. Only the upper-right half is used, because a stretch always starts to the left of where it ends. The top-right corner is the answer for the whole word.'), fig: triFig([...'ABCA'], (i, j) => (i === j ? 1 : ''), (i, j) => (i === 0 && j === 3 ? 'sel' : i === j ? 'lit' : '')) },
      { t: T('对角线上是单个字母，它自己就是长度 1 的回文，已经填好了。对角线下面那一排是「空段」，一个字母都没有，填 0。', 'The diagonal holds single letters, each a palindrome of length 1 on its own, already filled in. The line just under the diagonal is “empty runs” with no letters at all, filled with 0.') },
      { t: T('机器人站在 (i, j) 上：<b>左边</b>一格是去掉右端的那一段，<b>下面</b>一格是去掉左端的那一段，<b>左下</b>是两端都去掉的那一段。「本格信息」里有「两端相同」。只看两端的两个字母，想想相同和不同时各该怎么办。', 'The robot stands on (i, j): the cell to the <b>left</b> is the stretch without its right end, the cell <b>below</b> is the stretch without its left end, and <b>down-left</b> is the stretch without both ends. The This cell panel has “ends match”. Look only at the two letters at the ends, and think what to do when they match and when they don’t.') },
      { t: T('最后拨一个扫描顺序。拨盘小图上的三角形，就是这张表的形状。', 'Finally, set a scan order. The triangles in the dial’s little pictures are the shape of this table.') },
    ],
    mission: { goal: T('算出每个词里最长的回文子序列：删掉一些字母后，正着读和倒着读都一样的最长字串。', 'Find the longest palindromic subsequence in each word: the longest string, left after deleting some letters, that reads the same forwards and backwards.'), how: T('拼好电路，再拨一个扫描顺序。表的形状变了，「逐行，从上往下」还行不行？', 'Build the circuit, then set a scan order. The table has changed shape: does “row by row, top to bottom” still work?') },
    world: 'interval', facts: ['same'], palette: KIT, empty0: true, diag: 1,
    dial: ['rowTL', 'colL', 'rowBR', 'len'], solutionScan: 'len',
    tests: [{ s: 'ABCA' }, { s: 'CHARACTER' }, { s: 'BBABCBCAB' }],
    solution: PALIN,
    hints: [T('两端相同时，两端都能留下：中间那一段（左下）+ 2。用放行闸，条件接「两端相同」。', 'When the ends match, both can stay: the stretch in between (down-left) + 2. Use a Pass gate with “ends match” as its condition.'), T('两端不同时，至少丢掉一端：去掉右端（左边）或去掉左端（下面），取较大。三路都接进「取较大」。', 'When the ends differ, at least one has to go: drop the right end (left) or the left end (down), and take the larger. Wire all three into “max”.'), T('顺序：每格读的左边、下面、左下都是更短的段。按长度从短到长，或者从下往上逐行。', 'The order: left, down and down-left are all shorter stretches. Go by length from shortest to longest, or row by row from the bottom up.')],
    boardOpt: { minScale: 0.6, maxScale: 1.15 },
    debrief: { title: T('区间表', 'The interval table'), body: [T('区间表的每一格，都靠<b>更短的段</b>算出来：去掉一端，或去掉两端。所以只要短的段先算，怎么排都行：按长度从短到长，或者从下往上一行一行。', 'Every cell of an interval table is computed from <b>shorter stretches</b>: with one end dropped, or both. So as long as the short stretches come first, any arrangement works: by length from shortest to longest, or row by row from the bottom up.'), T('CHARACTER 里藏着 CARAC，BBABCBCAB 里藏着 BABCBAB。找 DNA 里的回文结构，用的就是这张表。', 'CHARACTER hides CARAC, and BBABCBCAB hides BABCBAB. Finding palindromic structures in DNA uses exactly this table.')], note: T('区间表：(i, j) 记一段的答案，靠更短的段算出来。', 'Interval table: (i, j) holds the answer for a stretch, computed from shorter stretches.') },
  },
  {
    id: 'stones', ch: 12, title: T('合并石子', 'Merging stones'), short: T('在每个切分点上合并', 'Merge at every split point'), mode: 'circuit', robot: 'broom',
    intro: [
      { t: T('一排石堆，每次只能把<b>相邻的两堆</b>合成一堆，花费是这两堆的重量之和。一直合到只剩一堆，最少要花多少？', 'A row of stone piles. Each move merges <b>two neighbouring piles</b> into one, at a cost equal to their combined weight. Keep going until only one pile is left. What is the least it can cost?') },
      { t: T('比如 3、1、2：先合 3 和 1（花 4），再和 2 合（花 6），一共 10；先合 1 和 2（花 3），再和 3 合（花 6），一共 9。顺序不同，花费也不同。', 'Take 3, 1, 2: merge 3 and 1 first (cost 4), then with 2 (cost 6), 10 in all; or merge 1 and 2 first (cost 3), then with 3 (cost 6), 9 in all. A different order, a different cost.') },
      { t: T('还是区间表：格子 (i, j) 记「把第 i 到第 j 堆合成一堆，最少花多少」。单独一堆不用合，对角线上已经填好了 0。', 'An interval table again: cell (i, j) records “the least it costs to merge piles i to j into one”. A single pile needs no merging, so the diagonal is already filled with 0.'), fig: triFig(['3', '1', '2'], (i, j) => (i === j ? 0 : ''), (i, j) => (i === j ? 'lit' : i === 0 && j === 2 ? 'sel' : '')) },
      { t: T('最后一次合并，一定是把左边一大堆和右边一大堆合起来。左右在哪里分开？可能是任何一个<b>切分点</b>。想一想：最后这一下要花多少？在它之前的花费，又在表里的哪两格？', 'The last merge always joins one big pile on the left with one big pile on the right. Where do left and right divide? It could be any <b>split point</b>. Think: what does this last merge cost? And which two cells of the table hold the cost of everything before it?') },
      { t: T('扫帚的扫描臂这次按切分点工作：每个切分点送来一对格子，排成「左段们」和「右段们」两整段。加法器能把两整段<b>一对一对</b>地相加。', 'This time Broom’s sweep arm works by split point: each split point sends a pair of cells, lined up as two whole runs, “left parts” and “right parts”. An Adder can add two whole runs together <b>pair by pair</b>.') },
    ],
    mission: { goal: T('每次只能合并相邻的两堆，花费是两堆重量之和。算出把一排石堆合成一堆的最少花费。', 'Each move merges two neighbouring piles, costing their combined weight. Work out the least it costs to merge a row of piles into one.'), how: T('扫描臂送来每个切分点的左段和右段。拼好电路，再拨一个扫描顺序。', 'The sweep arm sends the left part and right part for every split point. Build the circuit, then set a scan order.') },
    world: 'interval', facts: ['weight'], palette: KIT, diag: 0,
    dial: ['rowTL', 'rowBR', 'len'], solutionScan: 'len',
    tests: [{ w: [3, 1, 2] }, { w: [4, 1, 1, 4] }, { w: [2, 3, 1, 5, 2] }],
    solution: MERGE,
    hints: [T('每个切分点的花费：左段的花费 + 右段的花费。把「左段们」和「右段们」接进同一个加法器，它会一对一对地加。', 'The cost at each split point: the left part’s cost + the right part’s cost. Wire “left parts” and “right parts” into the same Adder, and it adds them pair by pair.'), T('所有切分点里挑最省的（取较小），再加上这一段的总重。', 'Pick the cheapest of all the split points (min), then add this run’s total weight.')],
    unlock: 'interval', blueprint: ['segL', 'segR', 'weight'],
    boardOpt: { minScale: 0.6, maxScale: 1.15 },
    debrief: { title: T('区间合并', 'Interval merging'), body: [T('每一格的来路是<b>所有切分点</b>：段越长，切分点越多。这种「最后一步把两段合起来」的结构，叫区间动态规划。', 'Each cell’s ways in are <b>all its split points</b>: the longer the run, the more split points. This “the last step joins two parts” structure is called interval dynamic programming.'), T('给一串算式加括号、矩阵连乘的最佳顺序、把一排相邻的文件两两合并，用的都是这种区间表。这块电路板存进了零件箱，叫「区间合并器」。', 'Bracketing a chain of calculations, the best order for multiplying a chain of matrices, merging a row of neighbouring files two at a time: all of these use this kind of interval table. This board has gone into your Parts as the “Interval Merger”.')], note: T('区间合并：最后一步合并左段和右段；在所有切分点里挑最省的，再加整段的代价。', 'Interval merging: the last step joins a left part and a right part; pick the cheapest split point, then add the cost of the whole run.') },
  },
  {
    id: 'twoorders', ch: 12, title: T('顺序不止一种', 'More than one order'), short: T('同一块电路板，换个顺序', 'Same board, another order'), mode: 'circuit', robot: 'broom', uses: ['interval'],
    intro: [
      { t: T('上一关你拨了一个顺序。别的顺序也行吗？', 'Last level you set one order. Would other orders work too?') },
      { t: T('这一关有两个阶段：先用任意一个合法的顺序通过，再换一个<b>不一样的</b>顺序，用同一块电路板再通过一次。', 'This level has two stages: first pass with any valid order, then switch to a <b>different</b> order and pass again with the same circuit board.') },
      { t: T('「区间合并器」已经在零件箱里，可以直接放上电路板。拨盘上多了几个选项。每一格要读它左边一整排、下面一整列，想想哪些顺序能让它们先算好。', 'The “Interval Merger” is already in your Parts, ready to go on the board. The dial has a few more options. Each cell reads the whole row to its left and the whole column below it: think about which orders get those computed first.') },
    ],
    mission: { goal: T('合并石子，花费最少。用两种不同的扫描顺序，各通过一次。', 'Merge the stones as cheaply as possible. Pass once with each of two different scan orders.'), how: T('阶段 1 拨任意一个能通过的顺序；阶段 2 电路板留着，换一个和阶段 1 不一样的顺序。', 'In stage 1, set any order that passes; in stage 2, the board stays and you switch to an order different from stage 1’s.') },
    tests: [{ w: [5, 2, 4, 1, 3] }, { w: [1, 9, 1, 9, 1, 9] }],
    stages: [
      {
        world: 'interval', facts: ['weight'], palette: ['bp:stones', ...KIT], diag: 0, ask: T('拨一个顺序，让测试通过。', 'Set an order that makes the tests pass.'),
        dial: ['rowTL', 'colL', 'colLB', 'rowBR', 'len'], solutionScan: 'len',
        solution: circ([['c', 'bp:stones']], ['tap:segL>c:0', 'tap:segR>c:1', 'tap:weight>c:2', 'c>out:cell']),
        hints: ORDER_HINTS,
        done: { head: T('一种顺序通过了', 'One order passed'), body: [T('电路板会留着。换一个不一样的顺序，再通过一次。', 'The board stays. Switch to a different order and pass again.')] },
      },
      {
        world: 'interval', facts: ['weight'], palette: ['bp:stones', ...KIT], diag: 0, carry: true, differ: 0, ask: T('换一个和阶段 1 不一样的顺序，再通过一次。', 'Switch to an order different from stage 1’s, and pass again.'),
        hints: ORDER_HINTS,
        dial: ['rowTL', 'colL', 'colLB', 'rowBR', 'len'], solutionScan: 'rowBR',
        solution: circ([['c', 'bp:stones']], ['tap:segL>c:0', 'tap:segR>c:1', 'tap:weight>c:2', 'c>out:cell']),
      },
    ],
    unlock: 'anyorder',
    debrief: { title: T('合法的顺序不止一种', 'More than one valid order'), body: [T('按长度、逐行从下往上、逐列每列从下往上，都行。它们只有一个共同点：<b>每一格都排在它要读的格子之后</b>。', 'By length, row by row from the bottom up, column by column from the bottom up: they all work. They have just one thing in common: <b>every cell comes after the cells it reads</b>.'), T('顺序不是答案的一部分，只是「先算谁」的安排。到了「从上往下」那一章，机器会自己找出一个顺序。', 'The order is not part of the answer, just an arrangement of “who goes first”. In the chapter “From the top down”, the machine will find an order by itself.')], note: T('只要被读的格子先算好，什么顺序都行。', 'Any order works, as long as the cells being read are computed first.') },
  },
];
