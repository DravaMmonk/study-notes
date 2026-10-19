// 千层's new levels (CURRICULUM.md, 第 5 代): trading a stock with one layer per state (once, then again after a day's
// rest), and a challenge, a ring of houses, where the first and the last are neighbours.

import { circ, usesSensor } from '../circuit/components.js';
import { T, tr } from '../i18n.js';

const KIT = ['msum', 'mmin', 'mmax', 'add', 'const', 'pass', 'block'];
// Every layer: stay as you were, or step over from the layer you come from and book what the step brings in.
const TRADER = circ([['c', 'bp:knaptable']], ['tap:left>c:0', 'tap:leftPrev>c:1', 'tap:gain>c:2', 'c>out:cell']);

export const layercake = [
  {
    id: 'stock1', ch: 13, title: T('买卖一次股票', 'Buy once, sell once'), short: T('每天在哪一层', 'Which layer you are on each day'), mode: 'circuit', robot: 'stack',
    intro: [
      { t: T('你知道一只股票接下来每天的价格。只能<b>买一次、卖一次</b>，先买后卖，最多能赚多少？', 'You know a stock’s price on each of the coming days. You may <b>buy once and sell once</b>, buying first. How much can you make at most?') },
      { t: T('每天结束时，你处在三种状态之一：还没买、手里有股、卖掉了。每种状态一层，一天一列。', 'At the end of each day you are in one of three states: not bought yet, holding, or sold. Each state is a layer, with a column for each day.') },
      { t: T('每一层都跑同一块电路板。左边一格是前一天的同一层；探针读<b>来处那层</b>的前一天。从来处走到这一层的进账写在「本格信息」里：买入要付今天的价，卖出能得今天的价。', 'Every layer runs the same board. The cell to the left is the same layer the day before; the probe reads <b>the layer you come from</b>, the day before. What stepping over from there brings in is in the This cell panel: buying pays today’s price, selling earns it.') },
    ],
    mission: { goal: T('算出最多能赚多少钱。一次也不买也行，那就是 0。', 'Work out the most money you can make. Not trading at all is allowed, which makes 0.'), how: T('答案是最后一天「还没买」和「卖掉了」两层里较大的那个。', 'The answer is the larger of the “not bought yet” and “sold” layers on the last day.') },
    world: 'stock', facts: ['gain'], palette: KIT,
    tests: [{ p: [7, 1, 5, 3, 6, 4] }, { p: [7, 6, 4, 3, 1] }, { p: [3, 2, 6, 5, 0, 3] }],
    solution: TRADER,
    hints: [
      T('维持原样，还是从来处走过来？取较大。', 'Stay as you were, or step over from where you come from? Take the larger.'),
      T('从来处走过来 = 探针读到的 + 这一步的进账。', 'Stepping over = what the probe reads + what the step brings in.'),
    ],
    diagnose: c => (!usesSensor(c, 'leftPrev') ? tr('买和卖都是换一层：探针读来处那层的前一天。', 'Buying and selling both change layer: the probe reads the layer you come from, the day before.') : null),
    debrief: { title: T('状态写成了层', 'The state became layers'), body: [T('每一层存「到今天为止、今天处在这种状态，最多有多少钱」。买卖只是从一层走到另一层。', 'Each layer holds “the most money you can have today, ending today in this state”. Buying and selling just move you from one layer to another.')] },
  },
  {
    id: 'cooldown', ch: 13, title: T('冷冻期', 'A day’s rest'), short: T('卖掉后要歇一天', 'Rest a day after selling'), mode: 'circuit', robot: 'stack',
    intro: [
      { t: T('现在可以买卖很多次，但<b>卖掉的第二天不能买</b>：要歇一天。', 'Now you may trade as often as you like, but <b>not buy on the day after you sell</b>: you have to rest a day.') },
      { t: T('状态还是三种：空手、手里有股、刚卖掉。「刚卖掉」过一天就回到「空手」，这一步的进账是 0。', 'There are still three states: empty-handed, holding, just sold. “Just sold” turns back into “empty-handed” a day later, and that step brings in 0.') },
    ],
    mission: { goal: T('算出最多能赚多少钱。', 'Work out the most money you can make.'), how: T('层和层怎么接，世界已经接好了。你的电路板要改吗？', 'How the layers connect is set by the world. Does your board need to change?') },
    world: 'stock', facts: ['gain'], palette: KIT,
    tests: [{ p: [1, 2, 3, 0, 2], cool: true }, { p: [1, 2, 4, 1, 7, 8, 3], cool: true }, { p: [6, 1, 6, 4, 3, 0, 2], cool: true }],
    solution: TRADER,
    hints: [T('先试试上一关的电路板。', 'Try last level’s board first.')],
    debrief: { title: T('同一块电路板', 'The same board'), body: [T('电路板一点没变，变的只是层和层怎么接：「刚卖掉」走回「空手」，那一步就是歇着的那一天。', 'The board didn’t change at all; only how the layers connect did. Stepping from “just sold” back to “empty-handed” is the day of rest.'), T('上一关是这一关剪掉一根箭头：卖掉了，就回不去了。', 'Last level is this one with an arrow cut: once sold, there is no going back.')] },
  },
  {
    id: 'ring', ch: 13, title: T('环形街道', 'A ring of houses'), short: T('首尾也挨着', 'The ends are neighbours too'), mode: 'circuit', robot: 'stack',
    intro: [
      { t: T('这条街首尾相连，围成一圈：<b>第一家和最后一家也是邻居</b>，不能都偷。', 'This street runs round in a ring: <b>the first and the last house are neighbours too</b>, and can’t both be robbed.') },
      { t: T('表有两层，甲和乙，每层都是「不能连着偷」那样的两行：这家没偷、这家偷了。两层各记什么由你决定；本格信息里有「是第一家」「是最后一家」和「是甲层」。', 'The table has two layers, A and B, each the two rows of “No two in a row”: this house skipped, this house robbed. What each layer records is up to you; the cell’s facts include “is the first house”, “is the last house” and “is layer A”.') },
    ],
    mission: { goal: T('不能偷相邻的两家，第一家和最后一家也算相邻。算出最多能偷多少钱。', 'No two neighbouring houses, and the first and the last count as neighbours. Work out the most money you can steal.'), how: T('答案是两层最后一列里最大的那一格。', 'The answer is the largest cell in the last column of either layer.') },
    world: 'ring', facts: ['money', 'first', 'last', 'sideA'], palette: [...KIT, 'many'],
    tests: [{ a: [2, 3, 2] }, { a: [5, 1, 1, 5] }, { a: [4, 10, 3, 1, 8, 6] }, { a: [6, 2, 3, 7, 1, 5] }],
    // 甲 never robs the first house, 乙 never robs the last: between them they cover every plan, and neither robs both.
    solution: circ([['n', 'mmax'], ['a', 'add'], ['f', 'pass'], ['l', 'block'], ['x', 'many'], ['k', 'block']], [
      'tap:pn>n:0', 'tap:pr>n:1', 'tap:pn>a:0', 'tap:money>a:1',
      'tap:sideA>f:0', 'tap:first>f:1', 'tap:sideA>l:0', 'tap:last>l:1', 'f>x:0', 'l>x:1', 'x>k:0', 'a>k:1',
      'n>out:no', 'k>out:yes',
    ]),
    // The naive board is the straight street's on both layers: nobody kept away from the ends.
    naive: circ([['n', 'mmax'], ['a', 'add']], ['tap:pn>n:0', 'tap:pr>n:1', 'tap:pn>a:0', 'tap:money>a:1', 'n>out:no', 'a>out:yes']),
    hints: [
      T('首尾不能都偷，所以每种偷法至少放过其中一家。那两层可以各管一种情况吗？', 'The ends can’t both be robbed, so every plan leaves at least one of them alone. Could each layer take one of those cases?'),
      T('哪一层、哪一家的「偷了」要拦下？「是甲层」可以当放行闸和拦截闸的条件。', 'On which layer is “robbed” stopped, and at which house? “Is layer A” can be a gate’s condition.'),
    ],
    debrief: { title: T('拆成两种情况', 'Split into two cases'), body: [T('一圈拆不开，就分情况：甲层第一家不偷，剩下的是一条直街；乙层最后一家不偷，也是一条直街。两层取较大。', 'A ring won’t straighten out, so split it into cases: on layer A the first house is left alone and the rest is a straight street; on layer B the last is. Take the better of the two layers.'), T('分情况也是多记一件事：这一件事，就是「我在哪种情况里」。', 'Splitting into cases is remembering one more thing too: which case you are in.')] },
  },
];
