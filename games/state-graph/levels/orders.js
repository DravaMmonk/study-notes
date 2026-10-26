// Chapter 13: who goes first — the player sets the scan order, on a grid and on the interval table.

import { gridScene, triFig } from '../../kit/domains/table/svg.js';
import { circ, partFn } from '../../kit/domains/table/circuit/components.js';
import { T } from '../../kit/domains/table/i18n.js';


const PALIN = circ([['a', 'add'], ['k', 'const', 2], ['g', 'pass'], ['m', 'mmax']], ['tap:dl>a:0', 'k>a:1', 'tap:same>g:0', 'a>g:1', 'tap:left>m:0', 'tap:down>m:1', 'g>m:2', 'm>out:cell']);
const MERGE = circ([['a', 'add'], ['m', 'mmin'], ['b', 'add']], ['tap:segL>a:0', 'tap:segR>a:1', 'a>m:0', 'm>b:0', 'tap:weight>b:1', 'b>out:cell']);
const ORDER_HINTS = [T('放一块<part-ref to="interval"></part-ref>，把扫描臂的左段们、右段们和本格信息的这段总重，接到它的三个口上。', 'Put down an <part-ref to="interval"></part-ref>, and wire the sweep arm’s left parts and right parts and This cell’s run weight to its three ports.'), T('每一格读的是同一行左边的格子，和同一列下面的格子：按长度扫，或者逐行从下往上扫，这些格子都已经先算好了。', 'Each cell reads the cells to its left on the same row and the cells below it in the same column: scanning by length, or row by row from the bottom up, those cells have always been computed first.')];

export const orders = [
  {
    id: 'dial', ch: 12, title: T('倒着扫', 'Scanning backwards'), short: T('扫描顺序跟着箭头走', 'The order follows the arrows'), mode: 'circuit', robot: 'scout',
    intro: [
      { t: T('前面的关卡里，机器人都是逐行、从左上开始扫。这一关的机器人<b>逐行，从右下开始</b>：从最后一行的最右边一格起，一行一行往上。', 'In earlier levels, the robot always scanned row by row from the top left. This level’s robot goes <b>row by row, from the bottom right</b>: starting at the right end of the last row, it works its way up one row at a time.') },
      { t: T('这一关数的是「<b>从这里到终点</b>有几条路线」：每个路口 = 右边 + 下面，终点算 1，石头格拦下。答案在起点。', 'This level counts “how many routes lead <b>from here to the end</b>”: each crossing = right + down, the end counts 1, and rock cells are blocked. The answer is at the start.'), fig: gridScene(3, 4, { cell: (r, c) => (r === 0 && c === 0 ? { value: '?', cls: 'sel' } : r === 2 && c === 3 ? { value: 1, cls: 'src' } : {}) }) },
      { t: T('为什么要倒着扫？每一格读它的右边和下面，那两格必须先算好。从右下开始，机器人读到的格子总是已经算完的。', 'Why scan backwards? Each cell reads the cells to its right and below, so those two must be computed first. Starting from the bottom right, every cell the robot reads has already been worked out.') },
    ],
    mission: { goal: T('数出从每一格到终点有几条路线：右边 + 下面，终点算 1，石头格拦下。机器人逐行从右下开始扫，答案在起点。', 'Count how many routes lead from each cell to the end: right + down, the end counts 1, and rock cells are blocked. The robot scans row by row from the bottom right, and the answer is at the start.'), how: T('拼好电路板，点「运行测试」。看机器人怎么走：它读到的右边和下面，是不是总已经算好？', 'Build the circuit board and click “Run tests”. Watch how the robot walks: are the cells to the right and below always computed by the time it reads them?') },
    world: 'grid', facts: ['end', 'rock'], answerAt: 'start',
    dial: ['rowTL', 'colL', 'colR', 'rowBR'], solutionScan: 'rowBR',
    tests: [{ R: 4, C: 5, rocks: [[1, 2]] }, { R: 4, C: 4, rocks: [[2, 1], [1, 3]] }],
    solution: circ([['m', 'msum'], ['k', 'const', 1], ['g', 'pass'], ['b', 'block']], ['tap:right>m:0', 'tap:down>m:1', 'tap:end>g:0', 'k>g:1', 'g>m:2', 'tap:rock>b:0', 'm>b:1', 'b>out:cell']),
    hints: [T('每一格 = 右边 + 下面：在视野里点这两格，接进一个汇合器（加起来）。', 'Each cell = right + down: click those two cells in the view and wire them into a Merger (sum).'), T('终点算 1：用放行闸，条件接「是终点」，放进常数 1，也接进汇合器。', 'The end counts 1: use a Pass gate with “is end” as its condition to let in a Constant 1, and wire that into the Merger too.'), T('石头格要拦下：汇合器的结果接进拦截闸，条件接「是石头」。', 'Rock cells are blocked: wire the Merger’s result into a Block gate with “is rock” as its condition.')],
    debrief: { title: T('顺序要跟着箭头走', 'The order follows the arrows'), body: [T('电路板读右边和下面，所以右边和下面的格子必须先算。「逐行，从右下开始」正好做到了这一点：换成从左上开始，机器人第一步就会读到还没算的格子。', 'The board reads right and down, so the cells to the right and below must be computed first. “Row by row, from the bottom right” does exactly that: start from the top left instead, and the robot’s very first step reads cells that haven’t been worked out yet.'), T('<b>电路决定了箭头，箭头决定了哪些顺序合法。</b>下一关的表换了个形状，合法的顺序会不止一种。', '<b>The circuit decides the arrows, and the arrows decide which orders are valid.</b> Next level the table changes shape, and more than one order will be valid.')], note: T('扫描顺序：被读的格子，必须排在读它的格子前面。', 'Scan order: a cell that is read must come before the cell that reads it.') },
  },
  {
    id: 'palin', ch: 12, title: T('回文', 'Palindromes'), short: T('一张三角形的表', 'A triangular table'), mode: 'circuit', robot: 'ranger',
    intro: [
      { t: T('回文是正着读、倒着读都一样的字串，比如 ABA、RACECAR。从一个词里删掉一些字母（剩下的保持顺序），<b>最长能留下多长的回文</b>？比如 CHARACTER 里能留下 CARAC。', 'A palindrome reads the same forwards and backwards, like ABA or RACECAR. If you delete some letters from a word (the rest keep their order), <b>what is the longest palindrome you can leave</b>? From CHARACTER, for example, you can leave CARAC.') },
      { t: T('新的表：<b>区间表</b>。格子 (i, j) 记着「第 i 个到第 j 个字母这一段」的答案。只用到右上半张，因为一段的开头总在结尾的左边。右上角就是整个词的答案。', 'A new table: the <b>interval table</b>. Cell (i, j) holds the answer for “the stretch from letter i to letter j”. Only the upper-right half is used, because a stretch always starts to the left of where it ends. The top-right corner is the answer for the whole word.'), fig: triFig([...'ABCA'], (i, j) => (i === j ? 1 : ''), (i, j) => (i === 0 && j === 3 ? 'sel' : i === j ? 'lit' : '')) },
      { t: T('对角线上是单个字母，它自己就是长度 1 的回文，已经填好了。对角线下面那一排是「空段」，一个字母都没有，填 0。', 'The diagonal holds single letters, each a palindrome of length 1 on its own, already filled in. The line just under the diagonal is “empty runs” with no letters at all, filled with 0.') },
      { t: T('机器人站在 (i, j) 上：<b>左边</b>一格是去掉右端的那一段，<b>下面</b>一格是去掉左端的那一段，<b>左下</b>是两端都去掉的那一段。「本格信息」里有「两端相同」。只看两端的两个字母，想想相同和不同时各该怎么办。', 'The robot stands on (i, j): the cell to the <b>left</b> is the stretch without its right end, the cell <b>below</b> is the stretch without its left end, and <b>down-left</b> is the stretch without both ends. The This cell panel has “ends match”. Look only at the two letters at the ends, and think what to do when they match and when they don’t.') },
      { t: T('这台机器人<b>按长度</b>扫：先算所有最短的段，再算长一点的，一条斜线一条斜线地往右上角推。', 'This robot scans <b>by length</b>: first every shortest stretch, then the longer ones, one diagonal at a time towards the top-right corner.') },
    ],
    mission: { goal: T('算出每个词里最长的回文子序列：删掉一些字母后，正着读和倒着读都一样的最长字串。', 'Find the longest palindromic subsequence in each word: the longest string, left after deleting some letters, that reads the same forwards and backwards.'), how: T('拼好电路，点「运行测试」。机器人按长度扫：长的段读到的，总是已经算好的短段。', 'Build the circuit and click “Run tests”. The robot scans by length, so a long stretch only ever reads shorter stretches that are already computed.') },
    world: 'interval', facts: ['same'], empty0: true, diag: 1,
    dial: ['rowTL', 'colL', 'rowBR', 'len'], solutionScan: 'len',
    tests: [{ s: 'ABCA' }, { s: 'CHARACTER' }, { s: 'BBABCBCAB' }],
    solution: PALIN,
    hints: [T('两端相同时，两端都能留下。剩下的是哪一段，答案又要加几？用放行闸，条件接「两端相同」。', 'When the ends match, both can stay. Which stretch is left, and how much do you add? Use a Pass gate with “ends match” as its condition.'), T('两端不同时，至少丢掉一端：去掉右端（左边）或去掉左端（下面），取较大。三路都接进「取较大」。', 'When the ends differ, at least one has to go: drop the right end (left) or the left end (down), and take the larger. Wire all three into “max”.'), T('不用担心顺序：每格读的左边、下面、左下都是更短的段，机器人按长度扫，它们一定先算好了。', 'No need to worry about the order: left, down and down-left are all shorter stretches, and since the robot scans by length they are always computed first.')],
    boardOpt: { minScale: 0.6, maxScale: 1.15 },
    debrief: { title: T('区间表', 'The interval table'), body: [T('区间表的每一格，都靠<b>更短的段</b>算出来：去掉一端，或去掉两端。所以短的段要先算：这台机器按长度从短到长。', 'Every cell of an interval table is computed from <b>shorter stretches</b>: with one end dropped, or both. So the short stretches have to come first: this machine goes by length from shortest to longest.'), T('CHARACTER 里藏着 CARAC，BBABCBCAB 里藏着 BABCBAB。找 DNA 里的回文结构，用的就是这张表。', 'CHARACTER hides CARAC, and BBABCBCAB hides BABCBAB. Finding palindromic structures in DNA uses exactly this table.')], note: T('区间表：(i, j) 记一段的答案，靠更短的段算出来。', 'Interval table: (i, j) holds the answer for a stretch, computed from shorter stretches.') },
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
    mission: { goal: T('每次只能合并相邻的两堆，花费是两堆重量之和。算出把一排石堆合成一堆的最少花费。', 'Each move merges two neighbouring piles, costing their combined weight. Work out the least it costs to merge a row of piles into one.'), how: T('扫描臂送来每个切分点的左段和右段。机器人按长度从短到长扫，拼好电路就能运行。', 'The sweep arm sends the left part and right part for every split point. The robot scans by length, shortest first, so once the circuit is built you can run it.') },
    world: 'interval', facts: ['weight'], diag: 0,
    dial: ['rowTL', 'rowBR', 'len'], solutionScan: 'len',
    tests: [{ w: [3, 1, 2] }, { w: [4, 1, 1, 4] }, { w: [2, 3, 1, 5, 2] }],
    solution: MERGE,
    hints: [T('先只看一个切分点：最后一次合并之前，左段和右段各自合成一堆的花费在哪里？它们该怎么合起来？', 'Look at a single split point first: before the last merge, where are the costs of merging the left part and the right part each into one pile? How should they be combined?'), T('所有切分点里挑最省的（取较小），再加上这一段的总重。', 'Pick the cheapest of all the split points (min), then add this run’s total weight.')],
    // As a part: the cheapest split (left part + right part, the smallest) plus this run's weight.
    unlock: 'interval', blueprint: { ports: ['segL', 'segR', 'weight'], f: ([l, r, w]) => partFn('add')([partFn('mmin')([partFn('add')([l, r])]), w]) },
    boardOpt: { minScale: 0.6, maxScale: 1.15 },
    debrief: { title: T('区间合并', 'Interval merging'), body: [T('每一格的来路是<b>所有切分点</b>：段越长，切分点越多。这种「最后一步把两段合起来」的结构，叫区间动态规划。', 'Each cell’s ways in are <b>all its split points</b>: the longer the run, the more split points. This “the last step joins two parts” structure is called interval dynamic programming.'), T('给一串算式加括号、矩阵连乘的最佳顺序、把一排相邻的文件两两合并，用的都是这种区间表。这块电路板存进了元件箱，叫<part-ref to="interval"></part-ref>。', 'Bracketing a chain of calculations, the best order for multiplying a chain of matrices, merging a row of neighbouring files two at a time: all of these use this kind of interval table. This board has gone into your Parts as the <part-ref to="interval"></part-ref>.')], note: T('区间合并：最后一步合并左段和右段；在所有切分点里挑最省的，再加整段的代价。', 'Interval merging: the last step joins a left part and a right part; pick the cheapest split point, then add the cost of the whole run.') },
  },
  {
    id: 'twoorders', ch: 12, title: T('顺序不止一种', 'More than one order'), short: T('同一块电路板，换个顺序', 'Same board, another order'), mode: 'circuit', robot: 'broom', uses: ['interval'],
    intro: [
      { t: T('在<level-ref to="stones"></level-ref>里，机器人按长度扫。换一个顺序，还能算对吗？', 'In <level-ref to="stones"></level-ref> the robot scanned by length. Would another order work too?') },
      { t: T('这一关有两个阶段，用的是同一块电路板：阶段 1 机器人按长度扫；阶段 2 换成<b>逐行，从下往上</b>。两种顺序下都要算对。', 'This level has two stages on the same circuit board: in stage 1 the robot scans by length; in stage 2 it switches to <b>row by row, from the bottom up</b>. Both orders have to come out right.') },
      { t: T('<part-ref to="interval"></part-ref>已经在元件箱里，可以直接放上电路板。每一格要读它左边一整排、下面一整列：两种顺序都能让它们先算好吗？', 'The <part-ref to="interval"></part-ref> is already in your Parts, ready to go on the board. Each cell reads the whole row to its left and the whole column below it: do both orders get those computed first?') },
    ],
    mission: { goal: T('合并石子，花费最少。同一块电路板，在两种扫描顺序下各通过一次。', 'Merge the stones as cheaply as possible. Pass once under each of two scan orders, with the same circuit board.'), how: T('阶段 1 机器人按长度扫；阶段 2 电路板留着，机器人换成逐行从下往上扫。', 'In stage 1 the robot scans by length; in stage 2 the board stays and the robot switches to row by row from the bottom up.') },
    tests: [{ w: [5, 2, 4, 1, 3] }, { w: [1, 9, 1, 9, 1, 9] }],
    stages: [
      {
        world: 'interval', facts: ['weight'], diag: 0, ask: T('拼好电路板，按长度扫，让测试通过。', 'Build the circuit board and pass the tests, scanning by length.'),
        dial: ['rowTL', 'colL', 'colLB', 'rowBR', 'len'], solutionScan: 'len',
        solution: circ([['c', 'bp:stones']], ['tap:segL>c:0', 'tap:segR>c:1', 'tap:weight>c:2', 'c>out:cell']),
        hints: ORDER_HINTS,
        done: { head: T('一种顺序通过了', 'One order passed'), body: [T('电路板会留着。机器人换成逐行从下往上扫，再跑一次。', 'The board stays. The robot switches to row by row from the bottom up; run it again.')] },
      },
      {
        world: 'interval', facts: ['weight'], diag: 0, carry: true, ask: T('电路板不变，机器人换成逐行从下往上扫。再通过一次。', 'Same board; the robot now scans row by row from the bottom up. Pass again.'),
        hints: ORDER_HINTS,
        dial: ['rowTL', 'colL', 'colLB', 'rowBR', 'len'], solutionScan: 'rowBR',
        solution: circ([['c', 'bp:stones']], ['tap:segL>c:0', 'tap:segR>c:1', 'tap:weight>c:2', 'c>out:cell']),
      },
    ],
    unlock: 'anyorder',
    debrief: { title: T('合法的顺序不止一种', 'More than one valid order'), body: [T('按长度、逐行从下往上、逐列每列从下往上，都行。它们只有一个共同点：<b>每一格都排在它要读的格子之后</b>。', 'By length, row by row from the bottom up, column by column from the bottom up: they all work. They have just one thing in common: <b>every cell comes after the cells it reads</b>.'), T('顺序不是答案的一部分，只是「先算谁」的安排。', 'The order is not part of the answer, just an arrangement of “who goes first”.')], note: T('只要被读的格子先算好，什么顺序都行。', 'Any order works, as long as the cells being read are computed first.') },
  },
];
