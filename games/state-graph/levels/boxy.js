// 小方's practice and challenge (CURRICULUM.md, 第 1 代): the same grid skeleton asked new questions, a table of a new
// shape, two built parts together, and a square lawn that needs a leap.

import { circ, hasKind, usesSensor } from '../../kit/domains/table/circuit/components.js';
import { T, tr } from '../../kit/domains/table/i18n.js';


export const boxy = [
  {
    id: 'maxcoins', ch: 5, title: T('最值钱的路', 'The richest route'), short: T('一路捡金币', 'Gold along the way'), mode: 'circuit', robot: 'scout',
    intro: [
      { t: T('每个路口上放着一些金币，就是格子左上角的数字。只能往右或往下走，经过的路口，金币都归你，起点和终点也算。', 'Every crossing holds some gold coins: the number in each cell’s top-left corner. You may only go right or down, and you keep the coins at every crossing you pass through, start and end included.') },
    ],
    mission: { goal: T('从左上走到右下，最多能捡到多少金币？', 'Going from the top left to the bottom right, how many coins can you collect at most?'), how: T('还是逐行、从左上开始算。', 'Still row by row, from the top left.') },
    world: 'grid', facts: ['start', 'coin'],
    tests: [
      { R: 3, C: 3, coins: [[1, 3, 1], [1, 5, 1], [4, 2, 1]] },
      { R: 3, C: 4, coins: [[2, 0, 0, 5], [0, 9, 0, 0], [3, 0, 1, 2]] },
      { R: 4, C: 4, coins: [[0, 1, 0, 4], [2, 0, 6, 0], [0, 7, 0, 1], [3, 0, 2, 0]] },
    ],
    solution: circ([['m', 'mmax'], ['k', 'const', 0], ['g', 'pass'], ['a', 'add']], ['tap:up>m:0', 'tap:left>m:1', 'tap:start>g:0', 'k>g:1', 'g>m:2', 'm>a:0', 'tap:coin>a:1', 'a>out:cell']),
    hints: [
      T('只能走一条路：到这个路口，两边你会选哪一边？', 'You walk one route only: at this crossing, which side would you pick?'),
      T('起点没有来路，取较大只能得到「—」。在起点往汇合器里送一个 0。', 'The start has no way in, so the max gives “—”. At the start, feed a 0 into the merger.'),
    ],
    diagnose: c => (hasKind(c, 'mmin') && !hasKind(c, 'mmax') ? tr('这次要的是金币最多：用「取较大」。', 'This time you want the most gold: use “max”.') : null),
    debrief: { title: T('同一副骨架', 'The same skeleton'), body: [T('和「最省力」的电路板一模一样，只是汇合器换成了「取较大」，体力换成了金币。', 'It is the very same board as in “Least effort”, with the merger swapped to “max” and energy swapped for gold.')] },
  },
  {
    id: 'pascal', ch: 5, title: T('杨辉三角', 'Pascal’s triangle'), short: T('表换了形状', 'A table of another shape'), mode: 'circuit', robot: 'scout',
    intro: [
      { t: T('砖块一层层摆成三角形：第 1 层 1 块，第 2 层 2 块……从最顶上那块出发，每一步走到正下方或右下方的砖。', 'Bricks are stacked in a triangle: 1 brick in row 1, 2 in row 2, and so on. Starting from the top brick, each step goes to the brick right below or below-right.') },
      { t: T('表的形状也变成了三角形：每一层只有那么几格。', 'The table becomes a triangle too: each row has only so many cells.') },
    ],
    mission: { goal: T('走到最后一层的指定那块砖，一共有几条路？', 'How many ways are there down to the given brick of the last row?'), how: T('一层一层、从左往右算。', 'Row by row, left to right.') },
    world: 'tri', facts: ['start'],
    tests: [{ R: 5, k: 2 }, { R: 7, k: 3 }, { R: 6, k: 1 }],
    solution: circ([['c', 'bp:stamp']], ['tap:up>c:0', 'tap:ul>c:1', 'tap:start>c:2', 'c>out:cell']),
    hints: [
      T('只看最后一步：走到这块砖之前，你在哪一块上？', 'Look only at the last step: before reaching this brick, which brick were you on?'),
      T('三角形左边缘和右边缘的砖，只有一块砖能走过来，另一边是「—」。', 'Bricks on the triangle’s left and right edges can be reached from one brick only; the other side is “—”.'),
    ],
    diagnose: c => (usesSensor(c, 'left') ? tr('往下走只会到正下方或右下方，所以来路在上一层：正上方和左上方。', 'Moving down only reaches the brick below or below-right, so the ways in are on the row above: right above and up-left.') : null),
    debrief: { title: T('杨辉三角', 'Pascal’s triangle'), body: [T('每块砖的数 = 正上方 + 左上方。这就是杨辉三角，也是「从 n 个里选 k 个」的方法数。', 'Each brick’s number = right above + up-left. This is Pascal’s triangle, and also the number of ways to choose k things out of n.'), T('表不一定是方的：只要每格知道自己的来路，什么形状都能填。', 'A table need not be square: any shape can be filled, as long as each cell knows its ways in.')] },
  },
  {
    id: 'pits', ch: 5, title: T('有坑也有价', 'Pits and prices'), short: T('又要体力，又有坑', 'Energy costs and pits'), mode: 'circuit', robot: 'scout',
    intro: [
      { t: T('这座城市的路口既要花体力，有的还塌成了坑，根本过不去。', 'In this city every crossing costs energy, and some have caved in and can’t be passed at all.') },
    ],
    mission: { goal: T('只能往右或往下走，绕开所有的坑。从左上走到右下，最少要花多少体力？', 'Only right or down, avoiding every pit. Going from the top left to the bottom right, what is the least energy you can spend?'), how: T('坑画成石头的样子。', 'Pits are drawn like rocks.') },
    world: 'grid', facts: ['start', 'cost', 'rock'],
    tests: [
      { R: 3, C: 3, costs: [[1, 1, 4], [5, 2, 1], [3, 1, 1]], rocks: [[1, 1]] },
      { R: 3, C: 4, costs: [[2, 1, 1, 3], [1, 6, 2, 1], [4, 1, 2, 1]], rocks: [[0, 2], [2, 1]] },
      { R: 4, C: 4, costs: [[1, 2, 2, 1], [3, 1, 4, 2], [1, 5, 1, 3], [2, 1, 2, 1]], rocks: [[1, 1], [2, 3]] },
    ],
    solution: circ([['c', 'bp:cheapest'], ['b', 'block']], ['tap:up>c:0', 'tap:left>c:1', 'tap:start>c:2', 'tap:cost>c:3', 'tap:rock>b:0', 'c>b:1', 'b>out:cell']),
    hints: [
      T('体力和坑，这两件事你以前分别处理过吗？', 'Energy and pits: have you handled each of them before?'),
      T('坑上要掐断：拦截闸在条件是「是」时输出「—」。', 'Cut off the pits: a Block gate outputs “—” when its condition is “yes”.'),
    ],
    diagnose: c => (!usesSensor(c, 'rock') ? tr('有的路口是坑，过不去。读一读「是石头」。', 'Some crossings are pits and can’t be passed. Read “is rock”.') : null),
    debrief: { title: T('零件叠零件', 'Parts on parts'), body: [T('最省力格管体力，拦截闸管坑。两个都是你前面造出来、学会的东西，这里只是把它们接在一起。', 'The Cheapest cell takes care of energy, the Block gate takes care of pits. Both are things you built or learned earlier; here you only wired them together.'), T('坑上是「—」：取较小会跳过它，所以经过坑的路线自然被排除了。', 'A pit holds “—”, and “min” skips it, so routes through a pit drop out by themselves.')] },
  },
  {
    id: 'lawn', ch: 5, title: T('最大的正方形', 'The biggest square'), short: T('一格存什么？', 'What should a cell hold?'), mode: 'circuit', robot: 'scout',
    intro: [
      { t: T('一块地上长着几棵树。想在空地上铺一块<b>正方形</b>的草坪，四条边和格子对齐，不能压到树。最大能铺多大？', 'A field has a few trees on it. You want to lay a <b>square</b> lawn on the open ground, lined up with the cells, without covering a tree. How big can it be?') },
      { t: T('地的上边和左边围着一圈 0，表示地外。答案是正方形的边长。', 'The field is ringed above and to the left by 0s, meaning outside the field. The answer is the square’s side.') },
    ],
    mission: { goal: T('算出最大的正方形草坪的边长。', 'Work out the side of the biggest square lawn.'), how: T('答案是整张表里最大的数。', 'The answer is the largest number anywhere in the table.') },
    world: 'lawn', facts: ['open'],
    tests: [
      { R: 4, C: 4, trees: [[1, 3], [4, 1]] },
      { R: 4, C: 5, trees: [[2, 2], [1, 5], [4, 4]] },
      { R: 5, C: 5, trees: [[1, 1], [3, 5], [5, 2]] },
    ],
    // A cell holds the side of the biggest square whose bottom-right corner it is: one more than the smallest of the
    // three around it, and 0 under a tree.
    solution: circ([['m', 'mmin'], ['k', 'const', 1], ['a', 'add'], ['g', 'pass'], ['z', 'const', 0], ['s', 'msum']], ['tap:up>m:0', 'tap:left>m:1', 'tap:ul>m:2', 'm>a:0', 'k>a:1', 'tap:open>g:0', 'a>g:1', 'g>s:0', 'z>s:1', 's>out:cell']),
    // A challenge: the naive board grows the square from the larger of up and left, as if one side were enough.
    naive: circ([['m', 'mmax'], ['k', 'const', 1], ['a', 'add'], ['g', 'pass'], ['z', 'const', 0], ['s', 'msum']], ['tap:up>m:0', 'tap:left>m:1', 'm>a:0', 'k>a:1', 'tap:open>g:0', 'a>g:1', 'g>s:0', 'z>s:1', 's>out:cell']),
    hints: [
      T('答案是整张表里最大的数。每一格里的数，该描述一个什么样的正方形？', 'The answer is the largest number in the table. What square should the number in each cell describe?'),
      T('让每一格只回答一个问题：以它为右下角的正方形，最大能有多大？', 'Let each cell answer one question only: how big can a square be whose bottom-right corner it is?'),
    ],
    debrief: { title: T('一格存什么', 'What a cell holds'), body: [T('一格存的是「以我为右下角的最大正方形边长」。它比上面、左边、左上三格里最小的那个多 1：任何一边短了，正方形都撑不大。', 'A cell holds “the side of the biggest square whose bottom-right corner I am”. It is one more than the smallest of the cells above, to the left and up-left: if any of them is short, the square can’t grow.'), T('树下面是 0：「加起来」汇合器把「—」跳过，只剩常数 0。', 'Under a tree it is 0: the “sum” merger skips the “—” and only the Constant 0 is left.'), T('难的不是接线，是想清楚一格该存什么。', 'The hard part was not the wiring but deciding what a cell should hold.')] },
  },
];
