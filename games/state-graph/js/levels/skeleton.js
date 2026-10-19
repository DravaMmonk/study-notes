// Chapter 11: one skeleton, many questions — swap the merge, then fill the table with 是 / 否 and with wins and losses.

import { gridScene, circuitFig } from '../svg.js';
import { circ, hasKind } from '../circuit/components.js';
import { T, tr } from '../i18n.js';

const KIT = ['msum', 'mmin', 'mmax', 'add', 'const', 'pass', 'block'];
const YESNO = ['many', 'not', 'pass', 'block', 'const'];
const MAP_A = [[1, 3, 1, 2], [2, 5, 1, 4], [4, 2, 6, 1]];
const MAP_B = [[2, 1, 4, 1], [3, 6, 1, 2], [1, 2, 5, 3], [4, 1, 2, 1]];
const COUNT = circ([['m', 'msum'], ['k', 'const', 1], ['g', 'pass']], ['tap:up>m:0', 'tap:left>m:1', 'tap:start>g:0', 'k>g:1', 'g>m:2', 'm>out:cell']);
const best = (merge, fact) => circ([['m', merge], ['k', 'const', 0], ['g', 'pass'], ['a', 'add']], ['tap:up>m:0', 'tap:left>m:1', 'tap:start>g:0', 'k>g:1', 'g>m:2', 'm>a:0', `tap:${fact}>a:1`, 'a>out:cell']);
const YES = T('是', 'yes'), NO = T('否', 'no');
const yn = v => ({ value: v ? YES : NO, cls: v ? 'yes' : 'no' });
const MERGER = T('汇合器', 'Merger'), ANY = T('任一是', 'any yes');

export const skeleton = [
  {
    id: 'swap', ch: 10, title: T('换一个汇合器', 'Swap the merger'), short: T('同一张地图，三个问题', 'One map, three questions'), mode: 'circuit', robot: 'scout',
    intro: [
      { t: T('新的一章，先做一件你会的事：数路线。不过这一关有<b>三个阶段</b>，三个阶段用的是同一张地图。', 'A new chapter, starting with something you already know how to do: counting routes. But this level has <b>three stages</b>, and all three use the same map.'), fig: gridScene(3, 4, { cell: (r, c) => ({ corner: MAP_A[r][c] }) }) },
      { t: T('数完路线，同一张地图会接着问：每个路口角上的数如果是<b>金币</b>，最多能捡到几枚？如果是<b>体力</b>，最少要花多少？', 'Once the routes are counted, the same map asks more: if the number in the corner of each crossing is <b>coins</b>, how many can you pick up at most? If it is <b>energy</b>, what is the least you must spend?') },
      { t: T('电路板会从一个阶段留到下一个阶段。想一想，三个问题之间到底差在哪？你也许只需要换掉一个元件。<b>点电路板上的汇合器，可以直接换操作，连线不用重接。</b>', 'The circuit board carries over from one stage to the next. Think: what really differs between the three questions? You may only need to swap one component. <b>Click a Merger on the board to change its operation in place, without rewiring.</b>') },
    ],
    mission: { goal: T('只能往右或往下走。同一张地图，回答三个问题：有几条路线；最多能捡到几枚金币；最少要花多少体力。', 'Only right or down. Answer three questions about the same map: how many routes there are; the most coins you can pick up; the least energy you must spend.'), how: T('每通过一个阶段，电路板会留到下一阶段。点汇合器可以换操作（加起来 / 取较大 / 取较小），连线不变。', 'Each time you pass a stage, the board carries over to the next. Click a Merger to change its operation (sum / max / min); the wires stay as they are.') },
    tests: [{ R: 3, C: 4 }, { R: 4, C: 4 }],
    stages: [
      {
        world: 'grid', facts: ['start'], palette: ['msum', 'const', 'pass'], ask: T('先数路线：从起点到终点一共有几条？', 'Count the routes first: how many lead from the start to the end?'), solution: COUNT,
        hints: [T('每个路口 = 上面 + 左边，起点放行 1。', 'Each crossing = up + left, with a 1 let through at the start.')],
        done: { head: T('路线数好了', 'Routes counted'), body: [T('同一张地图，下一个问题：路口角上的数是金币，最多能捡到几枚？', 'Same map, next question: the numbers in the corners are coins. How many can you pick up at most?'), T('电路板会留着。想想要换掉哪个元件，又要多接什么。', 'The board stays. Think about which component to swap, and what else to wire in.')] },
      },
      {
        world: 'grid', facts: ['start', 'coin'], palette: KIT, carry: true, tests: [{ R: 3, C: 4, coins: MAP_A }, { R: 4, C: 4, coins: MAP_B }],
        ask: T('角上的数是金币（起点和终点也算），最多能捡到几枚？', 'The numbers in the corners are coins (the start and end count too). How many can you pick up at most?'), solution: best('mmax', 'coin'),
        hints: [T('只走一条路，两边挑金币多的那边：把汇合器换成「取较大」。', 'You walk only one route, so of the two sides pick the one with more coins: change the Merger to “max”.'), T('经过这个路口，还要捡起它自己的金币：取较大之后，用加法器加上「本格金币」。', 'Passing through this crossing, you also pick up its own coins: after the max, use an Adder to add “cell coins”.'), T('起点的上面和左边都是「—」：放行闸在起点送进去的数要改成 0（点常数可以改）。', 'Up and left of the start are both “—”: the number the Pass gate lets in at the start must become 0 (click the Constant to change it).')],
        done: { head: T('金币也算好了', 'Coins done too'), body: [T('你只换了汇合器，再加上本格的金币。', 'All you did was swap the Merger and add the cell’s own coins.'), T('最后一个问题：角上的数换成体力，最少要花多少？', 'Last question: the numbers in the corners are now energy. What is the least you must spend?')] },
      },
      {
        world: 'grid', facts: ['start', 'cost'], palette: KIT, carry: true, tests: [{ R: 3, C: 4, costs: MAP_A }, { R: 4, C: 4, costs: MAP_B }],
        ask: T('角上的数换成体力（起点和终点也算），最少要花多少？', 'The numbers in the corners are now energy (the start and end count too). What is the least you must spend?'), solution: best('mmin', 'cost'),
        hints: [T('这次挑花费少的那边：汇合器换成「取较小」。', 'This time pick the cheaper side: change the Merger to “min”.'), T('加法器那一路，从「本格金币」换成「本格体力」。', 'On the Adder’s side, switch “cell coins” for “cell energy”.')],
      },
    ],
    diagnose: (c, st) => (st.stage === 1 && hasKind(c, 'msum') ? tr('只能走一条路，两边的金币不能加在一起：点汇合器，换成「取较大」。', 'You can walk only one route, so the coins on the two sides can’t be added together: click the Merger and change it to “max”.') : st.stage === 2 && !hasKind(c, 'mmin') ? tr('要花得最少：汇合器换成「取较小」。', 'You want to spend the least: change the Merger to “min”.') : null),
    unlock: 'skeleton',
    debrief: { title: T('一副骨架，三个问题', 'One skeleton, three questions'), body: [T('三块电路板几乎一模一样：<b>读上面和左边，合并，再加上本格</b>。不同的只有汇合器：加起来是数路线，取较大是找最多，取较小是找最少。', 'The three boards are almost identical: <b>read up and left, merge, then add this cell</b>. Only the Merger differs: sum counts routes, max finds the most, min finds the least.'), T('这就是动态规划的骨架：先定好每一格存什么、从哪几格来，再决定怎么合并。合并方式一换，同一张表就回答另一个问题。', 'This is the skeleton of dynamic programming: first settle what each cell stores and which cells it comes from, then decide how to merge them. Change the way you merge, and the same table answers a different question.')], note: T('同一副骨架换个汇合器：加起来数个数，取较大找最多，取较小找最少。', 'The same skeleton with a different Merger: sum to count, max to find the most, min to find the least.') },
  },
  {
    id: 'reach', ch: 10, title: T('能不能到', 'Can you get there'), short: T('格子里存「是」和「否」', 'Cells hold “yes” and “no”'), mode: 'circuit', robot: 'scout',
    intro: [
      { t: T('有时候不用知道有几条路线，只想知道<b>能不能到</b>。这时格子里不用存数，存「是」或「否」就够了。', 'Sometimes you don’t need to know how many routes there are, only <b>whether you can get there at all</b>. Then the cells don’t need to hold numbers: “yes” or “no” is enough.'), fig: gridScene(3, 3, { cell: (r, c) => (r === 1 && c === 1 ? { cls: 'rock' } : yn(!(r === 1 && c === 1))) }) },
      { t: T('新元件：「<b>任一是</b>」汇合器。接进来的信号里只要有一个「是」，它就输出「是」。到一个路口，上面或左边只要有一边能到，这里就能到。', 'A new component: the “<b>any yes</b>” Merger. If any signal wired into it is “yes”, it outputs “yes”. At a crossing, if either up or left can be reached, so can this one.'), fig: circuitFig({ taps: [['u', T('上面 · 否', 'up · no'), 'bool'], ['l', T('左边 · 是', 'left · yes'), 'bool']], parts: [['m', MERGER, ANY]], outs: [['o', T('本格 · 是', 'this cell · yes')]], wires: [['u', 'm', 'bool'], ['l', 'm', 'bool'], ['m', 'o', 'bool']] }) },
      { t: T('起点本身当然能到。石头格呢？拦截闸现在也能拦「是 / 否」：被拦下的格子写「—」，「任一是」不会把它当成「是」。', 'The start can of course be reached. What about rock cells? The Block gate can now block “yes / no” too: a blocked cell gets “—”, and “any yes” won’t count it as a “yes”.') },
    ],
    mission: { goal: T('只能往右或往下走，不能经过石头。每个格子写上「是」或「否」：从起点能不能走到这里（石头格写「—」）。', 'Only right or down, and never through a rock. Write “yes” or “no” in every cell: can you get here from the start? (Rock cells get “—”.)'), how: T('这一关会检查整张表。读上面、左边和「是起点」，用「任一是」汇合器合起来，别忘了石头。', 'This level checks the whole table. Read up, left and “is start”, merge them with an “any yes” Merger, and don’t forget the rocks.') },
    world: 'gridYes', facts: ['start', 'rock'], palette: YESNO, fresh: ['many'], checkAll: true,
    tests: [{ R: 4, C: 5, rocks: [[0, 3], [1, 1], [2, 3]] }, { R: 4, C: 4, rocks: [[0, 2], [1, 1], [2, 0]] }, { R: 5, C: 5, rocks: [[1, 2], [2, 1], [3, 3], [4, 2]] }],
    testLabel: t => tr(`${t.R}×${t.C} · ${t.rocks.length} 块石头`, `${t.R}×${t.C} · ${t.rocks.length} rocks`),
    solution: circ([['m', 'many'], ['b', 'block']], ['tap:up>m:0', 'tap:left>m:1', 'tap:start>m:2', 'tap:rock>b:0', 'm>b:1', 'b>out:cell']),
    hints: [T('到这一格，只要上面或左边有一边能到就行：把上面、左边都接进「任一是」汇合器。', 'This cell can be reached if either up or left can: wire both up and left into an “any yes” Merger.'), T('起点能到：把「是起点」也接进「任一是」。', 'The start can be reached: wire “is start” into “any yes” too.'), T('石头格谁也到不了：用拦截闸拦住结果，条件接「是石头」。', 'Nobody can reach a rock cell: block the result with a Block gate, its condition wired to “is rock”.')],
    debrief: { title: T('是或否，也能填表', 'Yes or no fills a table too'), body: [T('格子里不一定要存数。<b>存「是 / 否」</b>，表就能回答「能不能」一类的问题。', 'Cells don’t have to hold numbers. <b>Store “yes / no”</b> and the table can answer “can it be done?” questions.'), T('合并方式也跟着换：数路线要加起来，问能不能到，只要有一个「是」就够，所以用「任一是」。第 2 个测试里，一排石头把路彻底堵死了，终点是「否」。', 'The way of merging changes with it: counting routes means adding up, but for “can you get there” a single “yes” is enough, so you use “any yes”. In test 2, a line of rocks blocks the way completely, and the end is “no”.')], note: T('格子可以存「是 / 否」：任一来路能到，这里就能到。', 'Cells can hold “yes / no”: if any way in can be reached, so can this cell.') },
  },
  {
    id: 'nim', ch: 10, title: T('拿石子', 'Take the stones'), short: T('对手的输，就是你的赢', 'Their loss is your win'), mode: 'circuit', robot: 'ranger',
    intro: [
      { t: T('桌上有一堆石子。两个人轮流拿，每次拿 <b>1 颗或 2 颗</b>，拿走最后一颗的人赢。轮到你先拿，你能赢吗？', 'There is a pile of stones on the table. Two players take turns, taking <b>1 or 2 stones</b> each time, and whoever takes the last stone wins. You go first. Can you win?') },
      { t: T('把「还剩几颗」排成一行，每一格记：<b>轮到你、还剩这么多颗时，你能不能赢</b>。一颗不剩时轮到你，说明对手刚拿走了最后一颗：你输了。', 'Lay out “how many are left” in a row, and let each cell record: <b>with this many left and your turn to move, can you win?</b> If it is your turn and none are left, your opponent has just taken the last stone: you have lost.'), fig: { cells: Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, x: i * 60, y: 0, w: 50, h: 50, corner: i, ...(i === 0 ? yn(false) : {}) })), edges: [] } },
      { t: T('只看你这一步：拿 1 颗，对手面对「拿走 1 颗后」那一格；拿 2 颗，对手面对「拿走 2 颗后」那一格。想一想：对手面对的格子是「是」还是「否」的时候，你才能赢？两种拿法里，要几种行得通才够？', 'Look only at your own move: take 1, and your opponent faces the “after taking 1” cell; take 2, and they face the “after taking 2” cell. Think: is the cell your opponent faces “yes” or “no” when you can win? Of the two ways to take, how many have to work?') },
      { t: T('新元件「<b>取反</b>」：「是」变「否」，「否」变「是」。格子里记的是「轮到的人能不能赢」。你拿完以后，轮到的是谁？', 'A new component, “<b>Not</b>”: “yes” becomes “no”, and “no” becomes “yes”. Each cell records “can the player to move win”. After you take your stones, whose move is it?'), fig: circuitFig({ taps: [['a', T('对手 · 否', 'opponent · no'), 'bool']], parts: [['n', T('取反', 'Not'), T('是 ↔ 否', 'yes ↔ no')]], outs: [['o', T('你 · 是', 'you · yes')]], wires: [['a', 'n', 'bool'], ['n', 'o', 'bool']] }) },
    ],
    mission: { goal: T('每次拿 1 颗或 2 颗，拿走最后一颗的人赢。算出石子还剩几颗时，轮到的人能不能赢。', 'Take 1 or 2 stones each time; whoever takes the last stone wins. For each number of stones left, work out whether the player to move can win.'), how: T('这一关会检查整行。在视野里点「拿走 1 颗后」和「拿走 2 颗后」，拼出电路。', 'This level checks the whole row. Click “after taking 1” and “after taking 2” in the view, and build the circuit.') },
    world: 'pile', facts: ['ground'], palette: YESNO, fresh: ['not'], checkAll: true,
    tests: [{ n: 5 }, { n: 9 }, { n: 10 }],
    solution: circ([['a', 'not'], ['b', 'not'], ['m', 'many']], ['tap:m1>a:0', 'tap:m2>b:0', 'a>m:0', 'b>m:1', 'm>out:cell']),
    hints: [T('你拿完之后，轮到谁走？对手那一格是「是」，对你来说意味着什么？', 'After your move, whose turn is it? If the opponent’s cell is “yes”, what does that mean for you?'), T('两种拿法，只要有一种让对手输，你就赢：两个取反都接进「任一是」。', 'Of the two ways to take, if either leaves the opponent losing, you win: wire both Nots into “any yes”.')],
    diagnose: c => (!hasKind(c, 'not') ? tr('你拿完之后，轮到谁走？格子里记的是「轮到的人能不能赢」，对手的「是」对你来说是「否」。用取反翻过来。', 'After your move, whose turn is it? Each cell records “can the player to move win”, so your opponent’s “yes” is a “no” for you. Flip it with Not.') : null),
    debrief: { title: T('输赢也能填表', 'Winning and losing fill a table too'), body: [T('一颗不剩那一格，你什么都不用接：一步也走不了，「任一是」什么也收不到，输出「否」。<b>无路可走的人就输了</b>。', 'For the “none left” cell you don’t need to wire anything: there is no move to make, “any yes” receives nothing, and it outputs “no”. <b>A player with no move left loses</b>.'), T('看看这一行：否、是、是、否、是、是……每逢 3 的倍数就输。你没有算任何除法，规律是表自己长出来的。', 'Look at the row: no, yes, yes, no, yes, yes… every multiple of 3 loses. You never did any division: the pattern grew out of the table by itself.')], note: T('轮流走的游戏：只要有一步能让对手落进「输」，这一格就「赢」。', 'In a game of taking turns: if any move drops the opponent into a “lose”, this cell is a “win”.') },
  },
  {
    id: 'piles', ch: 10, title: T('两堆石子', 'Two piles'), short: T('输赢的花纹', 'A pattern of wins and losses'), mode: 'circuit', robot: 'ranger',
    intro: [
      { t: T('这次有两堆石子：A 堆和 B 堆。每次可以从一堆里拿 1 颗，或者<b>两堆各拿 1 颗</b>。拿走最后一颗的人赢。', 'This time there are two piles of stones: pile A and pile B. On each move you can take 1 stone from one pile, or <b>1 from each pile</b>. Whoever takes the last stone wins.') },
      { t: T('「还剩多少」这回要用两个数来记，表就变成了一张棋盘：第 a 行第 b 列，是「A 堆剩 a 颗、B 堆剩 b 颗」的局面。', 'This time “how many are left” takes two numbers, so the table becomes a board: row a, column b is the position “a left in pile A, b left in pile B”.'), fig: gridScene(3, 3, { arrows: false, cell: (r, c) => (r === 2 && c === 2 ? { value: '?', cls: 'sel' } : r === 0 && c === 0 ? yn(false) : {}) }) },
      { t: T('三种拿法，对手分别落到「A 堆少 1 颗」（上面）、「B 堆少 1 颗」（左边）和「两堆各少 1 颗」（左上）那一格。规则和「拿石子」那一关一样。拼好之后，看看整张棋盘上长出了什么花纹。', 'The three moves land your opponent on the cells “one fewer in A” (up), “one fewer in B” (left) and “one fewer in each” (up-left). The rule is the same as in “Take the stones”. Once it is built, see what pattern grows across the whole board.') },
    ],
    mission: { goal: T('每次从一堆里拿 1 颗，或者两堆各拿 1 颗，拿走最后一颗的人赢。算出每种局面下，轮到的人能不能赢。', 'Each move takes 1 stone from one pile, or 1 from each; whoever takes the last stone wins. For every position, work out whether the player to move can win.'), how: T('这一关会检查整张棋盘。通过后，看看「是」和「否」排成了什么样子。', 'This level checks the whole board. Once you pass, see how the “yes” and “no” cells are arranged.') },
    world: 'piles', facts: [], palette: YESNO, checkAll: true,
    tests: [{ R: 4, C: 5 }, { R: 5, C: 5 }, { R: 6, C: 7 }],
    solution: circ([['a', 'not'], ['b', 'not'], ['c', 'not'], ['m', 'many']], ['tap:up>a:0', 'tap:left>b:0', 'tap:ul>c:0', 'a>m:0', 'b>m:1', 'c>m:2', 'm>out:cell']),
    hints: [T('三种拿法：「A 堆少 1 颗」「B 堆少 1 颗」「两堆各少 1 颗」，三格都要读。', 'Three moves: “one fewer in A”, “one fewer in B” and “one fewer in each”. All three cells need reading.'), T('每种拿法都取反，再一起接进「任一是」。', 'Put a Not on each move, then wire them all into “any yes”.')],
    unlock: 'judge',
    // A challenge: the naive board asks only whether a move exists, not whether it leaves the opponent losing.
    naive: circ([['m', 'many']], ['tap:up>m:0', 'tap:left>m:1', 'tap:ul>m:2', 'm>out:cell']),
    boardOpt: { minScale: 0.62, maxScale: 1.15 },
    debrief: { title: T('棋盘上的花纹', 'A pattern on the board'), body: [T('「否」都落在 A、B 都是偶数的格子上。这样的局面，不管你怎么拿，对手都能把它变回「两堆都是偶数」。', 'Every “no” falls on a cell where A and B are both even. From such a position, whatever you take, your opponent can turn it back into “both piles even”.'), T('这块电路板存进了元件箱，叫「输赢判定器」：读三个对手局面，判断这一格能不能赢。', 'This board has gone into your Parts as the “Win/Lose Judge”: it reads the three positions your opponent could face and decides whether this cell wins.')], note: T('两堆石子：每个局面 = 任一（对手局面取反）。', 'Two piles: each position = any (opponent’s position, negated).') },
  },
];
