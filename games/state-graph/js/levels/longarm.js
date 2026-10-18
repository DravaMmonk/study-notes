// 长臂's new levels (CURRICULUM.md, 第 3 代): a frog crossing a river teaches the telescopic arm (how many jumps, how
// many ways, the steadiest way, which brings the Multiplier), and a challenge that counts coin combinations on the
// knapsack table.

import { circ, usesSensor, hasKind } from '../circuit/components.js';
import { T, tr } from '../i18n.js';

const KIT = ['msum', 'mmin', 'mmax', 'add', 'const', 'pass', 'block'];

export const longarm = [
  {
    id: 'frog', ch: 7, title: T('青蛙过河', 'The frog crosses'), short: T('伸缩臂', 'The telescopic arm'), mode: 'circuit', robot: 'reach',
    intro: [
      { t: T('一只青蛙要过河。河里一排石头，岸边算第 0 块。每块石头上写着「↶ k」：<b>青蛙只能从往回数第 k 块石头跳到这里</b>。', 'A frog wants to cross a river. There is a row of stones, and the bank counts as stone 0. Each stone says “↶ k”: <b>the frog can only jump onto it from the stone k back</b>.') },
      { t: T('往回数的那块可能很远，5×5 的视野装不下。这一代的机器人「长臂」有一条<b>伸缩臂</b>：站在每块石头上，它会伸到往回数第 k 块。伸缩臂够到的那一格在视野下面，点它，视野卡片上就多一个输出口。', 'The stone k back can be far away, out of a 5×5 view. This era’s robot, Longarm, has a <b>telescopic arm</b>: on each stone it reaches the stone k back. What the arm reaches sits under the view; click it and the View card gets an output for it.') },
    ],
    mission: { goal: T('算出青蛙跳到最后一块石头，<b>一共要跳几次</b>。', 'Work out <b>how many jumps</b> the frog needs to reach the last stone.'), how: T('从岸边往前，一块一块算。岸边还没跳，是 0 次。', 'Work forward from the bank, stone by stone. On the bank the frog hasn’t jumped yet: 0 jumps.') },
    world: 'river', facts: ['bank'], palette: KIT,
    tests: [{ k: [0, 1, 2, 1, 3, 2, 4] }, { k: [0, 1, 1, 2, 2, 3, 1, 4] }, { k: [0, 1, 2, 3, 1, 4, 2, 3, 5] }],
    solution: circ([['a', 'add'], ['k', 'const', 1], ['z', 'const', 0], ['g', 'pass'], ['m', 'msum']], ['tap:back>a:0', 'k>a:1', 'tap:bank>g:0', 'z>g:1', 'a>m:0', 'g>m:1', 'm>out:cell']),
    hints: [
      T('跳到这块之前，青蛙在伸缩臂够到的那块上：那里的次数 + 1。', 'Before this jump the frog was on the stone the arm reaches: its count + 1.'),
      T('岸边还没跳：放行闸放过一个 0。', 'On the bank there are no jumps yet: let a 0 through a Pass gate.'),
    ],
    diagnose: c => (!usesSensor(c, 'back') ? tr('青蛙是从往回数第 k 块跳来的，那块要用伸缩臂去读。', 'The frog jumps from the stone k back, and that stone is read with the arm.') : null),
    debrief: { title: T('够得到任意远', 'Reaching however far'), body: [T('视野只看身边。伸缩臂让一格读到任意远的一格，远到多少，由这一格自己写的数决定。', 'The view only sees what is nearby. The arm lets a cell read a cell however far away, and how far is decided by the number written on the cell itself.')] },
  },
  {
    id: 'frogfar', ch: 7, title: T('跳得更远', 'A longer leap'), short: T('视野和伸缩臂一起用', 'The view and the arm together'), mode: 'circuit', robot: 'reach',
    intro: [
      { t: T('这条河里的青蛙更灵活：<b>可以从前一块石头跳过来，也可以从「↶ k」那块跳过来</b>。没写 ↶ 的石头，只能从前一块来。', 'The frog in this river is more agile: <b>it can jump on from the stone before, or from the stone marked “↶ k”</b>. A stone with no ↶ can only be reached from the one before.') },
    ],
    mission: { goal: T('算出青蛙从岸边跳到最后一块石头，一共有几种跳法。', 'Work out how many different ways the frog can get from the bank to the last stone.'), how: T('岸边算 1 种：已经站在那里了。', 'The bank counts as 1 way: the frog is already there.') },
    world: 'river', facts: ['bank'], palette: KIT,
    tests: [{ k: [0, null, 2, 3, 2, 4, 3] }, { k: [0, null, 2, 2, 3, null, 4, 2] }, { k: [0, null, 2, 3, 4, 2, 5, 3, 2] }],
    solution: circ([['c', 'bp:stamp']], ['tap:m1>c:0', 'tap:back>c:1', 'tap:bank>c:2', 'c>out:cell']),
    hints: [
      T('最后一跳从哪来？前一块，或者伸缩臂够到的那块。两种都算上：加起来。', 'Where does the last jump come from? The stone before, or the one the arm reaches. Count both: add them up.'),
      T('岸边算 1 种：放行闸放过一个 1。', 'The bank counts as 1 way: let a 1 through a Pass gate.'),
    ],
    diagnose: c => (!usesSensor(c, 'm1') ? tr('青蛙也能从前一块跳来：前一块在视野里。', 'The frog can also come from the stone before, which is in the view.') : !usesSensor(c, 'back') ? tr('长跳的来处要用伸缩臂去读。', 'Where the long jump comes from is read with the arm.') : null),
    debrief: { title: T('又是爬楼梯', 'Climbing stairs again'), body: [T('和爬楼梯一样，只是「前 2 级」换成了伸缩臂读到的那一块。来路离得多远都行，结构不变。', 'It is climbing stairs, with “2 steps down” swapped for the stone the arm reads. A way in can be any distance away; the structure stays the same.')] },
  },
  {
    id: 'safefrog', ch: 7, title: T('安全过河', 'A safe crossing'), short: T('可能性要连乘', 'Chances multiply'), mode: 'circuit', robot: 'reach',
    intro: [
      { t: T('石头有的稳、有的滑。每块石头下面写着青蛙在上面站稳的可能，0.9 就是十次里有九次站得稳。一条路线要每一块都站稳，<b>可能性要连乘</b>：0.9 × 0.5 = 0.45。', 'Some stones are steady and some are slippery. Under each stone is the chance the frog keeps its footing, 0.9 meaning nine times out of ten. A route needs every stone to hold, so <b>the chances multiply</b>: 0.9 × 0.5 = 0.45.') },
      { t: T('新元件<b>乘法器</b>：输出 a × b。', 'A new part, the <b>Multiplier</b>: it outputs a × b.') },
    ],
    mission: { goal: T('找出最稳的跳法：青蛙安全跳到最后一块石头的可能，最大是多少？', 'Find the steadiest way across: what is the best chance the frog has of reaching the last stone safely?'), how: T('跳法和上一关一样：从前一块，或从 ↶ 那块。岸边稳稳的，可能是 1。', 'Jumps work as last level: from the stone before, or from the ↶ stone. The bank is solid: its chance is 1.') },
    world: 'river', facts: ['bank', 'hold'], palette: [...KIT, 'mul'], fresh: ['mul'],
    tests: [
      { k: [0, null, 2, 3, 2, 4, 3], p: [1, 0.9, 0.5, 0.8, 0.9, 0.6, 0.9] },
      { k: [0, null, 2, 2, 3, null, 4, 2], p: [1, 0.8, 0.9, 0.5, 0.9, 0.7, 0.9, 0.8] },
      { k: [0, null, 2, 3, 4, 2, 5, 3, 2], p: [1, 0.6, 0.9, 0.8, 0.5, 0.9, 0.9, 0.7, 0.9] },
    ],
    solution: circ([['m', 'mmax'], ['k', 'const', 1], ['g', 'pass'], ['x', 'mul']], ['tap:m1>m:0', 'tap:back>m:1', 'tap:bank>g:0', 'k>g:1', 'g>m:2', 'm>x:0', 'tap:hold>x:1', 'x>out:cell']),
    hints: [
      T('到这块最稳的路线 = 来处最稳的路线 × 这块站稳的可能。', 'The steadiest route to this stone = the steadiest route to where it came from × this stone’s chance of holding.'),
      T('两个来处，挑更稳的：取较大。', 'Of the two places it can come from, pick the steadier: take the max.'),
    ],
    diagnose: c => (!hasKind(c, 'mul') ? tr('可能性要乘起来：用乘法器。', 'Chances multiply: use the Multiplier.') : null),
    debrief: { title: T('乘起来，取较大', 'Multiply, then take the max'), body: [T('「最省力」是加起来再取较小，这里是乘起来再取较大。换了运算，骨架还是那一副。', '“Least effort” added and took the min; here you multiply and take the max. The operations changed; the skeleton did not.')] },
  },
  {
    id: 'coinways', ch: 7, title: T('凑零钱有几种', 'How many ways to pay'), short: T('数组合，不数排列', 'Count combinations, not orders'), mode: 'circuit', robot: 'reach',
    intro: [
      { t: T('用 1 元、2 元、5 元的硬币凑出 5 元，有几种凑法？每种硬币要多少有多少，<b>只看用了哪些硬币，不看先后</b>：1 + 2 + 2 和 2 + 1 + 2 算同一种。', 'How many ways are there to make 5 yuan from 1-, 2- and 5-yuan coins? There are as many of each coin as you like, and <b>only which coins you use counts, not their order</b>: 1 + 2 + 2 and 2 + 1 + 2 are the same way.') },
      { t: T('表是背包表的样子：行是硬币，列是金额。第 0 行「不用硬币」只凑得出 0 元，算 1 种，已经填好了。', 'The table looks like the knapsack table: rows are coins, columns are amounts. Row 0, “no coins”, only makes 0 yuan, which counts as 1 way; it is filled in already.') },
    ],
    mission: { goal: T('算出凑出这个金额，一共有几种凑法。', 'Work out how many ways there are to make the amount.'), how: T('逐行，从左往右。', 'Row by row, left to right.') },
    world: 'knap', facts: [], palette: KIT,
    tests: [
      { W: 5, ways: true, items: [{ w: 1 }, { w: 2 }, { w: 5 }] },
      { W: 10, ways: true, items: [{ w: 2 }, { w: 3 }, { w: 5 }] },
      { W: 8, ways: true, items: [{ w: 1 }, { w: 2 }, { w: 3 }] },
    ],
    // A row of coins: either no coin of this kind at all (right above), or at least one: take one off and stay on this row.
    solution: circ([['m', 'msum']], ['tap:up>m:0', 'tap:rowk>m:1', 'm>out:cell']),
    // The naive board makes room on the row above, as for a 0/1 knapsack: every coin used at most once.
    naive: circ([['m', 'msum']], ['tap:up>m:0', 'tap:upk>m:1', 'm>out:cell']),
    hints: [
      T('这一行的凑法分成两种：一枚这种硬币都不用，或者至少用一枚。', 'This row’s ways split in two: no coin of this kind at all, or at least one.'),
      T('至少用一枚的：拿掉一枚，剩下的金额还能用这种硬币，所以还在这一行。', 'With at least one: take one off, and what is left may still use this coin, so it stays on this row.'),
    ],
    debrief: { title: T('一行一种硬币', 'One coin to a row'), body: [T('按硬币一行一行算，每种凑法只数一次：它用到哪几种硬币，就在哪几行里长出来，先后不同也不会多数。', 'Going one coin to a row, every way is counted once: it grows on the rows of the coins it uses, so a different order is never counted again.')] },
  },
];
