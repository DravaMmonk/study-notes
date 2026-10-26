// The parts a player collects: a part is the idea (or circuit) a level leaves behind.

import { T } from '../../kit/domains/table/i18n.js';

export const PARTS = {
  counter: { name: T('路线计数器', 'Route Counter'), desc: T('把两条来路的数加起来；「起点」口是「是」时，再加 1。「—」不算在内，什么都没收到时输出「—」。', 'Adds up the numbers on its two ways in, plus 1 when its “start” port is “yes”. A “—” is left out; with nothing to add, it outputs “—”.') },
  rock: { name: T('拦截闸', 'Block Gate'), desc: T('条件是「是」时输出「—」；否则把另一个口收到的信号原样放过去。', 'Outputs “—” when its condition is “yes”; otherwise lets whatever reaches its other port through unchanged.') },
  order: { name: T('填表顺序', 'Fill Order'), desc: T('每个格子都要排在它要读的格子之后。顺序反过来，电路读的方向也得跟着反过来。', 'Every cell must come after the cells it reads. Reverse the order, and the directions the circuit reads must reverse too.') },
  min: { name: T('最省格', 'Cheapest Cell'), desc: T('取最多三条来路里最小的（「起点」口是「是」时，0 也算一条来路），再加上本格代价。来路全是「—」时，输出「—」。', 'Takes the smallest of up to three ways in (when its “start” port is “yes”, 0 counts as a way in too), then adds this cell’s cost. When every way in is “—”, it outputs “—”.') },
  back: { name: T('回溯', 'Backtracking'), desc: T('从终点倒推每一步是从哪来的，还原出具体路线。', 'Work back from the end, asking where each step came from, to recover the actual route.') },
  memo: { name: T('记忆', 'Memoisation'), desc: T('算过的答案记在表里，绝不重复计算。', 'Keep every answer you have computed in a table, and never compute it twice.') },
  layer: { name: T('分层', 'Layers'), desc: T('把表复制成几层，让状态多记一件会影响未来的事。', 'Copy the table into several layers, so the state remembers one more thing that affects the future.') },
  align: { name: T('对齐表', 'Alignment Table'), desc: T('一个词放上面，一个词放左边。字相同，左上 + 1；否则取上面和左边中较大的。', 'One word along the top, the other down the left. If the letters match, up-left + 1; otherwise the larger of up and left.') },
  cost: { name: T('编辑距离器', 'Edit Distance Meter'), desc: T('输出这几个数里最小的：上面、左边、左上三者中最小的 + 1；字相同时的左上；起点上的 0。', 'Outputs the smallest of: the smallest of up, left and up-left, plus 1; up-left itself when the letters match; 0 on the start.') },
  pack: { name: T('背包表', 'Knapsack Table'), desc: T('行是物品，列是容量。拿一件物品，就从上一行腾出它的重量。', 'Rows are items, columns are capacities. To take an item, make room for its weight in the row above.') },
  choose: { name: T('择优器', 'Best Choice'), desc: T('输出「不换」和「换来 + 加上」两者中较大的那个。', 'Outputs the larger of “keep” and “swap for” plus “plus”.') },
  roll: { name: T('滚动数组', 'Rolling Array'), desc: T('只留一行原地改写。改写的方向，决定每件物品能用几次。', 'Keep just one row and rewrite it in place. The direction you rewrite in decides how many times each item can be used.') },
  skeleton: { name: T('同一副骨架', 'Same Skeleton'), desc: T('同一张表、同一块电路板，换一个汇合器就换一个问题：加起来数个数，取较大找最多，取较小找最少。', 'The same table and the same circuit board: swap the merger and you swap the question. Sum to count, max to find the most, min to find the fewest.') },
  judge: { name: T('输赢判定器', 'Win/Lose Judge'), desc: T('读三个对手局面：只要有一个是「输」，这一格就是「赢」；否则是「输」。', 'Reads the three positions the opponent could face: if any of them is a loss, this cell is a win; otherwise a loss.') },
  sweep: { name: T('扫描臂', 'Sweep Arm'), desc: T('一次读一整段格子。可每格都从头扫一遍很慢：能用上一格存好的答案，就别重扫。', 'Reads a whole run of cells at once. But sweeping from the start on every cell is slow: if the previous cell has already stored the answer, use it instead of sweeping again.') },
  wordbreak: { name: T('切词', 'Word Breaker'), desc: T('前面某个位置能切开，而且那一截刚好是个词，这里就能切开。', 'If some earlier position can be split and the piece from there to here is exactly a word, this position can be split too.') },
  interval: { name: T('区间合并器', 'Interval Merger'), desc: T('左段和右段是两串数：按切分点一一相加，取最小的，再加上整段代价。', 'Its left and right parts are two runs of numbers: it adds them split point by split point, takes the smallest, then adds the cost of the whole run.') },
  anyorder: { name: T('多种顺序', 'Many Orders'), desc: T('只要每个格子都排在它要读的格子之后，什么顺序都行。', 'Any order works, as long as every cell comes after the cells it reads.') },
  multikey: { name: T('多钥匙计数器', 'Multi-key Counter'), desc: T('一块电路板管所有层。捡到钥匙，路线从少一把钥匙的那层搬上来；门关着，就拦下。', 'One circuit board runs every layer. When a key is picked up, routes move over from the layer with one key fewer; when a door is shut, they are blocked.') },
  state: { name: T('刚好够用的状态', 'Just Enough State'), desc: T('记得太少，答案会错；记得太多，表会爆。只记会影响未来的事。', 'Remember too little and the answer is wrong; remember too much and the table explodes. Remember only what affects the future.') },
  topdown: { name: T('备忘递归', 'Memoised Recursion'), desc: T('从要问的那一格出发，需要谁就问谁；问过的记下来。顺序会自己冒出来。', 'Start from the cell you want, ask whichever cells it needs, and write down every answer. The order emerges by itself.') },
  value: { name: T('打折器', 'Discounter'), desc: T('取最多四条来路里最大的，再乘上元件上的数（比如 0.9）。', 'Takes the largest of up to four ways in, then multiplies it by the number set on its part (0.9, say).') },
  expect: { name: T('期望', 'Expectation'), desc: T('结果不确定时，把每种结果按可能性加权，再比较。', 'When the outcome is uncertain, weight each outcome by how likely it is, then compare.') },
  viterbi: { name: T('维特比', 'Viterbi'), desc: T('每一列每一种标签，记下到这里最省的解释：上一列各行加上转移代价，取较小。', 'For every tag in every column, keep the cheapest explanation up to here: each row of the previous column plus its transition cost, then the min.') },
  local: { name: T('局部对齐', 'Local Alignment'), desc: T('低于 0 就截成 0：重新开始，比背着负分走下去强。答案在表里最大的那一格。', 'Anything below 0 is cut to 0: starting afresh beats carrying a negative score along. The answer is the largest cell in the table.') },
  seam: { name: T('剪缝', 'Seam Carving'), desc: T('每一格 = 本格能量 + 上面三格里最小的。从最底一行最小的格子倒推，剪掉这条缝。', 'Each cell = its own energy + the smallest of the three cells above it. Trace back from the smallest cell in the bottom row, and cut that seam out.') },
};
