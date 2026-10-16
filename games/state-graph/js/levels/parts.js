// Chapters and the parts a player collects; a part is the idea (or circuit) a level leaves behind.

import { T } from '../i18n.js';

export const CHAPTERS = [
  { name: T('格子与箭头', 'Cells and arrows'), desc: T('这台机器只有两种零件。', 'This machine has only two kinds of pieces.') },
  { name: T('数路线', 'Counting routes'), desc: T('用小问题的答案，拼出大问题的答案。', 'Build the answer to a big problem out of the answers to small ones.') },
  { name: T('造一台机器', 'Build a machine'), desc: T('机器人在每一格上，运行同一块电路板。', 'On every cell, the robot runs the same circuit board.') },
  { name: T('零件可以复用', 'Parts can be reused'), desc: T('拼好的电路板会变成元件，换个问题照样能用。', 'A finished board becomes a component, and it still works on a different problem.') },
  { name: T('先后顺序', 'Order matters'), desc: T('格子要等它需要的格子先算好。', 'A cell has to wait until the cells it needs are computed.') },
  { name: T('最好的选择', 'The best choice'), desc: T('从数路线，到找最好的那条路。', 'From counting routes to finding the best one.') },
  { name: T('为什么这么快', 'Why it is so fast'), desc: T('记下来，不重复。', 'Write it down, never repeat it.') },
  { name: T('状态不够用', 'When the state falls short'), desc: T('一个数记不住的时候，就多记一件事。', 'When one number can’t remember enough, remember one more thing.') },
  { name: T('两串文字', 'Two strings'), desc: T('一个词放上面，一个词放左边。', 'One word along the top, the other down the left.') },
  { name: T('装背包', 'Packing a backpack'), desc: T('容量有限时，拿还是不拿。', 'With limited room: take it, or leave it?') },
  { name: T('毕业', 'Graduation'), desc: T('认出伪装起来的老朋友。', 'Recognize old friends in disguise.') },
];

export const PARTS = {
  counter: { name: T('路线计数器', 'Route Counter'), desc: T('电路零件：上面 + 左边汇合加起来，起点放行 1。能数出任意大小棋盘城市的路线数，可以直接放上后面的电路板。', 'A circuit part: merge up + left by adding them, and let a 1 through at the start. It counts the routes in a grid city of any size, and goes straight onto later circuit boards.') },
  rock: { name: T('拦截闸', 'Block Gate'), desc: T('条件是「是」时输出「—」。拦在石头格上，经过它的路线就全被掐断。', 'Outputs “—” when its condition is “yes”. Put it on the rock cells and every route through them is cut off.') },
  stairs: { name: T('台阶计数器', 'Stair Counter'), desc: T('电路：前 1 级 + 前 2 级，地面放行 1。它和路线计数器是同一个结构。', 'A circuit: 1 step down + 2 steps down, with a 1 let through at ground level. It has the same structure as the Route Counter.') },
  order: { name: T('填表顺序', 'Fill Order'), desc: T('每个格子都要排在它要读的格子之后。顺序反过来，电路读的方向也得跟着反过来。', 'Every cell must come after the cells it reads. Reverse the order, and the directions the circuit reads must reverse too.') },
  min: { name: T('取较小', 'Take the Min'), desc: T('把「加起来」的汇合器换成「取较小」，数路线的机器就变成找最优路线的机器。', 'Swap the “sum” merger for a “min” one, and the route-counting machine becomes a machine that finds the best route.') },
  back: { name: T('回溯', 'Backtracking'), desc: T('从终点倒推每一步是从哪来的，还原出具体路线。', 'Work back from the end, asking where each step came from, to recover the actual route.') },
  memo: { name: T('记忆', 'Memoization'), desc: T('算过的答案记在表里，绝不重复计算。', 'Keep every answer you have computed in a table, and never compute it twice.') },
  layer: { name: T('分层', 'Layers'), desc: T('把表复制成几层，让状态多记一件会影响未来的事。', 'Copy the table into several layers, so the state remembers one more thing that affects the future.') },
  align: { name: T('对齐表', 'Alignment Table'), desc: T('一个词放上面，一个词放左边。字相同，左上 + 1；否则取上面和左边中较大的。', 'One word along the top, the other down the left. If the letters match, up-left + 1; otherwise the larger of up and left.') },
  cost: { name: T('代价箭头', 'Cost Arrows'), desc: T('每条来路加上自己的代价，取较小，找出最省的改法。', 'Add each incoming path’s own cost, take the min, and you find the cheapest way to edit.') },
  pack: { name: T('背包表', 'Knapsack Table'), desc: T('行是物品，列是容量。拿一件物品，就从上一行腾出它的重量。', 'Rows are items, columns are capacities. To take an item, make room for its weight in the row above.') },
  roll: { name: T('滚动数组', 'Rolling Array'), desc: T('只留一行原地改写。改写的方向，决定每件物品能用几次。', 'Keep just one row and rewrite it in place. The direction you rewrite in decides how many times each item can be used.') },
};
