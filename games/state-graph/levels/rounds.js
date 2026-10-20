// Chapter 16: scan until nothing changes — routes that loop back, the value of standing on a cell, a policy, slipping.

import { circuitFig } from '../../kit/domains/table/svg.js';
import { circ, hasKind, partFn } from '../../kit/domains/table/circuit/components.js';
import { WAY } from '../../kit/domains/table/ports.js';
import { T, tr } from '../../kit/domains/table/i18n.js';

const TREASURE = T('宝藏', 'treasure');
const KIT = ['msum', 'mmin', 'mmax', 'add', 'const', 'pass', 'block'];
const SNAKE = [[1, 1, 1, 1, 1], [9, 9, 9, 9, 1], [1, 1, 1, 1, 1], [1, 9, 9, 9, 9], [1, 1, 1, 1, 1]];
const SNAKE2 = [[1, 1, 1], [9, 9, 1], [1, 1, 1], [1, 9, 9], [1, 1, 1]];
const row = vals => ({ cells: vals.map((v, i) => ({ id: `v${i}`, x: i * 62, y: 0, w: 54, h: 54, value: v, label: i ? '' : TREASURE, cls: i ? 'lit' : 'gold' })), edges: [] });
/** A map's edge of cliffs: the last row and the last column. */
const rim = (R, C) => [...Array.from({ length: C }, (_, c) => [R - 1, c]), ...Array.from({ length: R - 1 }, (_, r) => [r, C - 1])];

export const rounds = [
  {
    id: 'loop', ch: 15, title: T('绕一圈', 'Going round'), short: T('一轮一轮地扫', 'Scan round after round'), mode: 'circuit', robot: 'loop',
    intro: [
      { t: T('前面所有的表都有一个默契：<b>箭头不会绕回来</b>。机器人按顺序扫一遍，读到的格子总是已经算好了。', 'Every table so far has shared one unspoken rule: <b>the arrows never loop back</b>. The robot scans once in order, and every cell it reads is already computed.') },
      { t: T('这座城市不一样：可以往<b>上下左右</b>四个方向走，每进入一个路口都要花它角上的体力。最省力的路线，可能要先往右，再往下，再<b>往左</b>绕回来。', 'This city is different: you can move in all four directions, <b>up, down, left and right</b>, and entering each crossing costs the energy in its corner. The cheapest route may go right, then down, then <b>left</b> to loop back.') },
      { t: T('格子要读四个邻居，可下面和右边的格子，这一轮还没算到。没关系：这一章的机器人会<b>一轮一轮地扫</b>。还没算到的格子先读「—」，或者读上一轮留下的值；扫到整张表一格都不再变，就停下来。', 'Each cell reads four neighbours, but the cells below and to the right haven’t been reached yet this round. No matter: in this chapter the robot <b>scans round after round</b>. A cell not reached yet reads as “—”, or as whatever the last round left there; once a whole round changes nothing, it stops.') },
      { t: T('运行时，黄框是这一轮里变了的格子。看看一共要扫几轮。', 'While it runs, yellow frames mark the cells this round has changed. See how many rounds it takes.') },
    ],
    mission: { goal: T('可以往上下左右走，每进入一个路口都要花它角上的体力（起点也算）。算出从左上到右下最少要花多少体力。', 'You can move up, down, left or right, and entering each crossing costs the energy in its corner (the start counts too). Work out the least energy it takes to get from the top left to the bottom right.'), how: T('机器人会一轮一轮地扫，直到表不再变。这一关会检查整张表。', 'The robot scans round after round until the table stops changing. This level checks the whole table.') },
    world: 'grid', facts: ['start', 'cost'], palette: KIT, rounds: true,
    tests: [{ R: 5, C: 5, costs: SNAKE }, { R: 5, C: 3, costs: SNAKE2 }],
    solution: circ([['a', 'mmin'], ['b', 'mmin'], ['z', 'const', 0], ['g', 'pass'], ['p', 'add']], ['tap:up>a:0', 'tap:down>a:1', 'tap:left>a:2', 'a>b:0', 'tap:right>b:1', 'tap:start>g:0', 'z>g:1', 'g>b:2', 'b>p:0', 'tap:cost>p:1', 'p>out:cell']),
    hints: [T('四个方向都可能是来路：上、下、左、右都接进「取较小」。一个汇合器只有三个口，就用两个串起来。', 'Any of the four directions can be a way in: wire up, down, left and right into “min”. A Merger has only three inputs, so chain two of them.'), T('最后加上本格体力。起点的邻居一开始都是「—」，用放行闸在起点送一个 0 进去。', 'Finally add the cell energy. The start’s neighbours all begin as “—”, so use a Pass gate to let a 0 in at the start.')],
    debrief: { title: T('扫到不再变', 'Scan until it settles'), body: [T('路线会绕回来时，没有哪个顺序能保证「读到的都已经算好」。办法是<b>一遍一遍地扫</b>：每扫一轮，答案离真相就近一步；哪一轮一格都没变，就是真相了。', 'When routes can loop back, no order can promise that “everything read is already computed”. The way out is to <b>scan again and again</b>: every round brings the answers a step closer to the truth, and once a round changes nothing, you have it.'), T('这叫 <b>Bellman-Ford</b> 算法。网络里的路由器彼此交换「到各处有多远」，就是用这种一轮一轮「放松」的办法找最短路。', 'This is the <b>Bellman-Ford</b> algorithm. Routers on a network tell each other “how far it is to everywhere”, and find shortest paths with exactly this round-by-round “relaxing”.')], note: T('有环时扫一遍不够：一轮一轮地扫，直到表不再变。', 'With loops, one scan isn’t enough: scan round after round until the table stops changing.') },
  },
  {
    id: 'value', ch: 15, title: T('格子世界', 'Grid world'), short: T('站在这里有多好', 'How good is it to stand here'), mode: 'circuit', robot: 'loop',
    intro: [
      { t: T('一张地图上有<b>宝藏</b>（价值 10）、<b>陷阱</b>（价值 −10）和墙。机器人想知道：站在每一格上，<b>有多好</b>？', 'A map has <b>treasure</b> (value 10), <b>traps</b> (value −10) and walls. The robot wants to know: on each cell, <b>how good is it to stand there</b>?') },
      { t: T('离宝藏越近越好。规定：每一格的价值 = 四个邻居里最大的那个，<b>打个九折</b>（× 0.9）。宝藏旁边是 9，再远一步是 8.1，再远是 7.29……', 'The closer to the treasure, the better. The rule: each cell’s value = the largest of its four neighbours, <b>discounted by 10%</b> (× 0.9). Next to the treasure it is 9, one step further 8.1, then 7.29…'), fig: row([10, 9, 8.1, 7.29, 6.56]) },
      { t: T('打折要用<b>乘法器</b>（「安全过河」那一关见过）。这一关的常数可以设成 0.9。', 'The discount takes a <b>Multiplier</b> (you met it in “A safe crossing”). In this level a Constant can be set to 0.9.'), fig: circuitFig({ taps: [['m', T('最大的邻居 · 9', 'best neighbour · 9')]], parts: [['k', T('常数', 'Constant'), '= 0.9', 0], ['x', T('乘法器', 'Multiplier'), 'a × b', 1]], outs: [['o', T('本格 · 8.1', 'this cell · 8.1')]], wires: [['m', 'x'], ['k', 'x'], ['x', 'o']] }) },
      { t: T('一开始每一格都是 0。机器人会一轮一轮地扫，直到整张表不再变。', 'Every cell starts at 0. The robot scans round after round until the whole table stops changing.') },
    ],
    mission: { goal: T('每一格的价值 = 四个邻居里最大的价值 × 0.9。宝藏是 10，陷阱是 −10，墙不能走。算出每一格的价值。', 'Each cell’s value = the largest value among its four neighbours × 0.9. Treasure is 10, traps are −10, and walls can’t be entered. Work out the value of every cell.'), how: T('这一关会检查整张表。常数放上电路板后，点它可以改成 0.9。', 'This level checks the whole table. Once a Constant is on the board, click it to change it to 0.9.') },
    world: 'vgrid', facts: [], palette: [...KIT, 'mul'], consts: [0, 0.5, 0.8, 0.9, 1], rounds: true, arrows: true,
    tests: [
      { R: 5, C: 6, gold: [0, 5], traps: [[1, 4], [3, 2]], walls: [[1, 1], [2, 1], [2, 3], [2, 4], [4, 4]] },
      { R: 4, C: 5, gold: [3, 4], traps: [[2, 3]], walls: [[1, 1], [1, 2], [3, 2]] },
    ],
    solution: circ([['a', 'mmax'], ['b', 'mmax'], ['k', 'const', 0.9], ['x', 'mul']], ['tap:up>a:0', 'tap:down>a:1', 'tap:left>a:2', 'a>b:0', 'tap:right>b:1', 'b>x:0', 'k>x:1', 'x>out:cell']),
    hints: [T('四个邻居都接进「取较大」：一个汇合器只有三个口，就用两个串起来。', 'Wire all four neighbours into “max”: a Merger has only three inputs, so chain two of them.'), T('最大的那个再乘 0.9：乘法器一边接最大值，一边接常数 0.9。', 'Then multiply the largest by 0.9: wire the max into one side of a Multiplier and a Constant 0.9 into the other.')],
    diagnose: c => (!hasKind(c, 'mul') ? tr('每远一步要打个九折：用乘法器把最大的邻居乘上 0.9。', 'Each step further away is discounted by 10%: use a Multiplier to multiply the best neighbour by 0.9.') : null),
    // The best of up to four ways in, discounted by the number set on its card.
    unlock: 'value', blueprint: { ports: [WAY(0, 'up'), WAY(1, 'down'), WAY(2, 'left'), WAY(3, 'right')], value: 0.9, common: true, f: (ins, k) => partFn('mul')([partFn('mmax')(ins), k]) },
    boardOpt: { minScale: 0.62, maxScale: 1.15 },
    debrief: { title: T('价值迭代', 'Value iteration'), body: [T('每一格的数，就是从这里走到宝藏有多好：每远一步，打一次九折。陷阱是 −10，没有谁会往那里走，所以它也带不坏邻居。', 'Each cell’s number says how good it is to head for the treasure from there: every step further away knocks off another 10%. Traps are −10, and nobody walks into one, so they can’t drag their neighbours down either.'), T('这是<b>强化学习</b>最早的一块基石，叫<b>价值迭代</b>。下棋的程序、学走路的机器人，都要先学会估计「站在这里有多好」。用的还是老一套：看邻居，取最好，记下来。', 'This is one of the first cornerstones of <b>reinforcement learning</b>, called <b>value iteration</b>. Programs that play board games and robots learning to walk all have to learn to estimate “how good is it to stand here” first. The method is the same old one: look at the neighbours, take the best, write it down.')], note: T('价值迭代：每格 = 邻居里最好的 × 折扣，扫到不再变。', 'Value iteration: each cell = the best neighbour × a discount, scanned until nothing changes.') },
  },
  {
    id: 'arrows', ch: 15, title: T('箭头自己长出来', 'The arrows grow by themselves'), short: T('顺着价值走', 'Follow the values'), mode: 'policy',
    map: { R: 5, C: 6, gold: [4, 5], traps: [[3, 4], [1, 2]], walls: [[0, 3], [1, 3], [2, 3], [3, 1], [4, 1]] },
    starts: [[0, 0], [4, 0], [0, 5]],
    intro: [
      { t: T('价值算好了，接下来怎么走？很简单：<b>每一步都走到四个邻居里价值最大的那一格</b>。', 'The values are worked out. Now, which way to go? Simple: <b>at every step, move to the neighbour with the largest value</b>.') },
      { t: T('这一关有三个起点。每个起点，你都来替机器人一步一步地选。', 'This level has three starting points. From each one, you choose the robot’s moves step by step.') },
      { t: T('三个起点都走完以后，看看整张地图会长出什么。', 'Once all three are done, see what grows across the whole map.') },
    ],
    mission: { goal: T('在价值已经算好的地图上，从三个起点各走到宝藏。每一步都要走到价值最大的邻居。', 'On a map whose values are already worked out, walk from each of the three starting points to the treasure. Every step must go to the neighbour with the largest value.'), how: T('点虚线框里的邻居，机器人就走过去。', 'Click a neighbour in a dashed frame and the robot moves there.') },
    debrief: { title: T('价值表就是导航', 'The value table is a satnav'), body: [T('每一格只看自己的邻居，却拼出了一张完整的导航图：从任何一格出发，顺着箭头走，都会绕开墙和陷阱，走到宝藏。', 'Each cell looks only at its own neighbours, yet together they make a complete navigation map: start anywhere, follow the arrows, and you will skirt the walls and traps and reach the treasure.'), T('在强化学习里，这些箭头叫<b>策略</b>：到了一个状态，该做什么动作。<b>先估价值，再顺着价值走</b>，策略就自己长出来了。', 'In reinforcement learning these arrows are called a <b>policy</b>: in a given state, which action to take. <b>Estimate the values first, then follow them</b>, and the policy grows by itself.')], note: T('策略 = 每一格都走向价值最大的邻居。', 'Policy = from every cell, head for the neighbour with the largest value.') },
  },
  {
    id: 'slip', ch: 15, title: T('会打滑的地板', 'A slippery floor'), short: T('按可能性加权', 'Weight by likelihood'), mode: 'circuit', robot: 'loop',
    intro: [
      { t: T('冰面会打滑。这一关机器人只往<b>右</b>或往<b>下</b>走，可每走一步，都有 <b>20%</b> 的可能滑向另一个方向：想往右，可能滑到下面；想往下，可能滑到右边。', 'Ice is slippery. In this level the robot moves only <b>right</b> or <b>down</b>, but every step has a <b>20%</b> chance of sliding the other way: aiming right, it may slide down; aiming down, it may slide right.') },
      { t: T('地图最下一行和最右一列是<b>悬崖</b>（−10），宝藏就在悬崖边上。', 'The bottom row and right-hand column of the map are <b>cliffs</b> (−10), and the treasure sits right at the cliff edge.') },
      { t: T('结果不确定时，一个动作的价值，是几种结果<b>按可能性加权</b>：往右 = 0.8 × 右边 + 0.2 × 下面。两个动作挑好的那个，再打九折。', 'When the outcome is uncertain, an action’s value is its outcomes <b>weighted by how likely they are</b>: going right = 0.8 × right + 0.2 × down. Pick the better of the two actions, then discount by 10%.') },
      { t: T('电路会比较大。小窍门：一个常数可以同时接给好几个乘法器。', 'The circuit will be fairly big. A tip: one Constant can be wired into several Multipliers at once.') },
    ],
    mission: { goal: T('只往右或往下走，每一步有 20% 的可能滑向另一个方向。每一格的价值 = 0.9 × 两个动作里较好的那个；往右 = 0.8 × 右边 + 0.2 × 下面，往下 = 0.8 × 下面 + 0.2 × 右边。', 'Move only right or down; every step has a 20% chance of sliding the other way. Each cell’s value = 0.9 × the better of the two actions; going right = 0.8 × right + 0.2 × down, going down = 0.8 × down + 0.2 × right.'), how: T('这一关会检查整张表。通过后，每一格会长出最好动作的箭头。', 'This level checks the whole table. Once you pass, each cell grows an arrow for its best action.') },
    world: 'vgrid', facts: ['slip', 'grip'], palette: [...KIT, 'mul'], consts: [0, 0.1, 0.2, 0.5, 0.8, 0.9, 1], rounds: true, arrows: true,
    // A challenge: the naive board is the one from 格子世界, which takes the best move as if nothing slipped.
    naive: circ([['a', 'mmax'], ['b', 'mmax'], ['k', 'const', 0.9], ['x', 'mul']], ['tap:up>a:0', 'tap:down>a:1', 'tap:left>a:2', 'a>b:0', 'tap:right>b:1', 'b>x:0', 'k>x:1', 'x>out:cell']),
    tests: [
      { R: 5, C: 6, gold: [3, 4], cliffs: [...rim(5, 6), [1, 2]], slip: 0.2 },
      { R: 4, C: 5, gold: [2, 3], cliffs: rim(4, 5), slip: 0.2 },
    ],
    solution: circ([['k8', 'const', 0.8], ['k2', 'const', 0.2], ['k9', 'const', 0.9], ['a', 'mul'], ['b', 'mul'], ['c', 'mul'], ['d', 'mul'], ['p', 'add'], ['q', 'add'], ['m', 'mmax'], ['x', 'mul']], [
      'k8>a:0', 'tap:right>a:1', 'k2>b:0', 'tap:down>b:1', 'a>p:0', 'b>p:1',
      'k8>c:0', 'tap:down>c:1', 'k2>d:0', 'tap:right>d:1', 'c>q:0', 'd>q:1',
      'p>m:0', 'q>m:1', 'm>x:0', 'k9>x:1', 'x>out:cell',
    ]),
    hints: [T('往右这个动作：0.8 × 右边 + 0.2 × 下面。两个乘法器，一个加法器。', 'The “go right” action: 0.8 × right + 0.2 × down. Two Multipliers and an Adder.'), T('往下这个动作：0.8 × 下面 + 0.2 × 右边。', 'The “go down” action: 0.8 × down + 0.2 × right.'), T('两个动作取较大，再乘 0.9。', 'Take the larger of the two actions, then multiply by 0.9.')],
    unlock: 'expect',
    boardOpt: { minScale: 0.62, maxScale: 1.15 },
    debrief: { title: T('期望', 'Expectation'), body: [T('会滑倒，悬崖边的格子就都「变差」了：明明离宝藏只差一步，可往右一走，有 20% 的可能掉下悬崖。看看箭头：贴着悬崖时，机器人宁可选那个滑倒也不要紧的方向。', 'Because the robot can slip, every cell along the cliff edge gets “worse”: it may be one step from the treasure, but going right carries a 20% chance of falling off. Look at the arrows: hugging the cliff, the robot prefers the direction where a slip does no harm.'), T('把每种结果按可能性加权，叫作<b>期望</b>。带着不确定性一步步做决定的问题，叫<b>马尔可夫决策过程</b>，它是强化学习的数学骨架。', 'Weighting each outcome by how likely it is gives the <b>expectation</b>. Making decisions step by step under uncertainty is called a <b>Markov decision process</b>, the mathematical skeleton of reinforcement learning.')], note: T('结果不确定时，一个动作的价值 = 每种结果按可能性加权。', 'When the outcome is uncertain, an action’s value = each outcome weighted by how likely it is.') },
  },
];
