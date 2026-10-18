// Chapters 1–2: cells and arrows, then counting routes by hand.

import { N, E, gridScene } from '../svg.js';
import { L5_CELLS, L5_EDGES } from './data.js';
import { T, tr } from '../i18n.js';

const SRC = T('源', 'Source'), TGT = T('目标', 'Target'), MID = T('中转', 'Relay');
const HOME = T('家', 'Home'), BAKERY = T('面包店', 'Bakery'), PARK = T('公园', 'Park'), SCHOOL = T('学校', 'School');
const BOOKS = T('书店', 'Books'), SQUARE = T('广场', 'Square');

export const basics = [
  {
    id: 'light', ch: 0, title: T('点亮', 'Light up'), short: T('用一根箭头把数送过去', 'Send a number along one arrow'), mode: 'wire',
    intro: [
      { t: T('这台机器只有两种零件：<b>格子</b>和<b>箭头</b>。格子里装着一个数；箭头会把起点格子里的数，送进终点格子。', 'This machine has only two kinds of pieces: <b>cells</b> and <b>arrows</b>. A cell holds a number; an arrow carries the number in the cell it starts from into the cell it ends at.'), fig: { cells: [N('a', -100, 0, { label: SRC, value: 1, cls: 'src' }), N('b', 100, 0, { label: TGT, value: 1, cls: 'lit' })], edges: [E('a', 'b', 'hot')] } },
      { t: T('箭头有方向，数只会顺着箭头走。没有箭头指向的格子，什么也收不到，里面就是 <b>0</b>。', 'Arrows have a direction, and numbers only travel the way the arrow points. A cell that no arrow points to receives nothing, so it holds <b>0</b>.'), fig: { cells: [N('a', -100, 0, { label: SRC, value: 1, cls: 'src' }), N('b', 100, 0, { label: TGT, value: 0 })], edges: [] } },
      { t: T('<b>怎么连箭头：</b>先点一个格子（它会亮起蓝框），再点另一个格子，就从第一个连一根箭头到第二个。对同样两个格子再连一次，箭头就会被拆掉。', '<b>Drawing an arrow:</b> click one cell (it gets a blue frame), then click another, and an arrow runs from the first to the second. Connect the same two cells again and the arrow is removed.'), fig: { cells: [N('a', -100, 0, { label: SRC, value: 1, cls: 'src sel' }), N('b', 100, 0, { label: TGT, value: '?' })], edges: [E('a', 'b', 'sel')] } },
    ],
    mission: { goal: T('把源格子里的 1 送进目标格子。箭头会把起点格子里的数送进终点格子。', 'Get the 1 in the source cell into the target cell. An arrow carries the number from the cell it starts at into the cell it ends at.'), how: T('点「源」，再点「目标」，然后点「运行」。', 'Click “Source”, then “Target”, then click “Run”.') },
    cells: [{ id: 'S', x: -100, y: 0, label: SRC, fixed: 1 }, { id: 'T', x: 100, y: 0, label: TGT, goal: 1 }],
    coach: st => st.edges.length ? { text: tr('箭头连好了。点下方的「运行」，看看数会不会流过去。', 'The arrow is in place. Click “Run” below and watch whether the number flows across.'), run: true }
      : st.sel === 'S' ? { text: tr('第 2 步：再点一下右边的「目标」格子，连出一根箭头。', 'Step 2: now click the “Target” cell on the right to draw an arrow.'), cell: 'T' }
      : { text: tr('第 1 步：点一下左边的「源」格子。', 'Step 1: click the “Source” cell on the left.'), cell: 'S' },
    debrief: { title: T('数送到了', 'Delivered'), body: [T('运行时，机器顺着箭头，把源格子里的 1 送进了目标格子。', 'When it ran, the machine followed the arrow and carried the 1 from the source cell into the target cell.'), T('目标格子里是几，<b>完全由指向它的箭头决定</b>。下一关看看，两根箭头同时指向一个格子会发生什么。', 'What the target cell holds is <b>decided entirely by the arrows pointing into it</b>. Next level: what happens when two arrows point into the same cell?')], note: T('箭头把数从起点格子送进终点格子。', 'An arrow carries a number from the cell it starts at into the cell it ends at.') },
  },
  {
    id: 'merge', ch: 0, title: T('汇合', 'Merge'), short: T('好几根箭头指向同一个格子', 'Several arrows into one cell'), mode: 'wire',
    intro: [
      { t: T('如果有好几根箭头指向同一个格子，会怎样？', 'What happens when several arrows point into the same cell?'), fig: { cells: [N('a', -90, 0, { label: SRC, value: 2, cls: 'src' }), N('b', 90, 0, { label: SRC, value: 3, cls: 'src' }), N('t', 0, 140, { label: TGT, value: '?' })], edges: [E('a', 't'), E('b', 't')] } },
      { t: T('格子会把收到的数<b>全部加起来</b>。2 和 3 一起送进来，格子里就是 5。', 'The cell <b>adds up</b> everything it receives. With 2 and 3 coming in together, the cell holds 5.'), fig: { cells: [N('a', -90, 0, { label: SRC, value: 2, cls: 'src' }), N('b', 90, 0, { label: SRC, value: 3, cls: 'src' }), N('t', 0, 140, { label: TGT, value: 5, cls: 'lit' })], edges: [E('a', 't', 'hot'), E('b', 't', 'hot')] } },
      { t: T('这一关有三个源格子：2、3、4。挑对要连的箭头，让目标格子<b>正好等于 5</b>。', 'This level has three source cells: 2, 3 and 4. Pick the right arrows to draw so that the target cell is <b>exactly 5</b>.') },
    ],
    mission: { goal: T('让目标格子正好等于 5。格子里的数 = 所有指向它的箭头送来的数之和。', 'Make the target cell exactly 5. A cell’s number = the sum of the numbers all its incoming arrows bring.'), how: T('从源格子连箭头到目标。连错了，对同样两个格子再连一次就能拆掉。', 'Draw arrows from source cells to the target. If you draw a wrong one, connect the same two cells again to remove it.') },
    cells: [{ id: 'A', x: -110, y: 0, label: SRC, fixed: 2 }, { id: 'B', x: 0, y: 0, label: SRC, fixed: 3 }, { id: 'C', x: 110, y: 0, label: SRC, fixed: 4 }, { id: 'T', x: 0, y: 160, label: TGT, goal: 5 }],
    hint: () => tr('2 + 3 = 5。只连这两个源格子。', '2 + 3 = 5. Connect only those two source cells.'),
    debrief: { title: T('2 + 3 = 5', '2 + 3 = 5'), body: [T('目标格子把 2 和 3 加在了一起。请记住这条规则，<b>后面所有的谜题都建立在它上面</b>：', 'The target cell added 2 and 3 together. Remember this rule, because <b>every puzzle that follows is built on it</b>:'), T('一个格子里的数 = 所有指向它的箭头送来的数之和。', 'A cell’s number = the sum of the numbers all its incoming arrows bring.')], note: T('格子里的数 = 所有指向它的箭头送来的数之和。', 'A cell’s number = the sum of the numbers all its incoming arrows bring.') },
  },
  {
    id: 'relay', ch: 0, title: T('接力', 'Relay'), short: T('格子也能把数传下去', 'Cells can pass numbers on'), mode: 'wire',
    intro: [
      { t: T('格子不只能接收，也能把自己的数<b>继续往后传</b>。', 'A cell doesn’t just receive: it can also <b>pass its own number on</b>.'), fig: { cells: [N('s', -150, 0, { label: SRC, value: 1, cls: 'src' }), N('m', 0, 0, { label: MID, value: 1, cls: 'lit' }), N('t', 150, 0, { label: TGT, value: 1, cls: 'lit' })], edges: [E('s', 'm', 'hot'), E('m', 't', 'hot')] } },
      { t: T('但一个格子必须<b>等所有指向它的箭头都送到</b>，才能算出自己的数。所以机器算数有先后：箭头起点的格子，总是比终点的格子先算。', 'But a cell has to <b>wait until every arrow into it has delivered</b> before it can work out its own number. So the machine computes in an order: the cell an arrow starts at is always computed before the cell it ends at.'), fig: { cells: [N('s', 0, 0, { label: SRC, value: 1, cls: 'src' }), N('m', -90, 115, { label: T('① 先算', '① first'), value: 1, cls: 'lit' }), N('t', 40, 230, { label: T('② 后算', '② next'), value: 2, cls: 'lit' })], edges: [E('s', 'm', 'hot'), E('s', 't', 'hot'), E('m', 't', 'hot')] } },
      { t: T('不要让箭头绕成一个圈：A 在等 B，B 又在等 A，谁也算不出来。', 'Don’t let the arrows go round in a loop: A waits for B, B waits for A, and neither can ever be computed.'), fig: { cells: [N('a', -90, 0, { label: 'A', value: '?', cls: 'bad' }), N('b', 90, 0, { label: 'B', value: '?', cls: 'bad' })], edges: [E('a', 'b', 'bad'), E('b', 'a', 'bad')] } },
      { t: T('这一关只有一个源格子，里面是 1。想办法让目标格子<b>等于 2</b>。', 'This level has just one source cell, holding 1. Find a way to make the target cell <b>equal 2</b>.') },
    ],
    mission: { goal: T('源格子里只有一个 1，让目标格子等于 2。格子也能把自己的数继续传下去，但箭头不能绕成圈。', 'The source cell holds a single 1; make the target cell equal 2. Cells can pass their own number on, but the arrows must not form a loop.'), how: T('中转格子可以先收下 1，再把它传给别的格子。', 'The relay cell can take the 1 first and then pass it on to another cell.') },
    cells: [{ id: 'S', x: 0, y: 0, label: SRC, fixed: 1 }, { id: 'M', x: -95, y: 125, label: MID }, { id: 'T', x: 45, y: 250, label: TGT, goal: 2 }],
    hint: () => tr('目标需要收到两个 1。让源同时连到中转和目标，再把中转连到目标。', 'The target needs to receive two 1s. Connect the source to both the relay and the target, then connect the relay to the target.'),
    debrief: { title: T('一个 1 变成了 2', 'One 1 became 2'), body: [T('源格子的 1 兵分两路：一路直接送到目标，一路先进中转格子，再从中转送到目标。目标收到两个 1，加起来就是 2。', 'The source’s 1 split two ways: one went straight to the target, the other went into the relay first and then on to the target. The target received two 1s, which add up to 2.'), T('运行时，机器<b>先算中转，再算目标</b>，因为目标要等中转把数送来。这个「先后顺序」在第 5 章会变得很重要。', 'When it ran, the machine <b>computed the relay first, then the target</b>, because the target had to wait for the relay’s number. This “order” becomes very important in chapter 5.')], note: T('格子要等所有输入到齐才能算，所以计算有先后顺序。', 'A cell can only be computed once all its inputs have arrived, so the computation has an order.') },
  },
  {
    id: 'trace', ch: 1, title: T('找路线', 'Find the routes'), short: T('在单行道地图上一条条找', 'Trace them one by one on a one-way map'), mode: 'trace',
    intro: [
      { t: T('这是一张小镇地图。<b>每个地点是一个格子，每条单行道是一根箭头</b>，只能顺着箭头走。', 'Here is a map of a small town. <b>Each place is a cell and each one-way street is an arrow</b>, and you can only travel the way the arrows point.'), fig: { cells: [N('H', 0, 0, { label: HOME }), N('A', -85, 120, { label: BAKERY }), N('B', 85, 120, { label: PARK }), N('T', 0, 240, { label: SCHOOL })], edges: [E('H', 'A'), E('H', 'B'), E('A', 'B'), E('A', 'T'), E('B', 'T')] } },
      { t: T('一条<b>路线</b>，就是从家出发、顺着箭头一站站走、最后到达学校的一串地点。比如：家 → 面包店 → 学校。', 'A <b>route</b> is a sequence of places that starts at Home, follows the arrows stop by stop, and ends at School. For example: Home → Bakery → School.'), fig: { cells: [N('H', 0, 0, { label: HOME, cls: 'path' }), N('A', -85, 120, { label: BAKERY, cls: 'path' }), N('B', 85, 120, { label: PARK }), N('T', 0, 240, { label: SCHOOL, cls: 'path' })], edges: [E('H', 'A', 'good'), E('H', 'B', 'dim'), E('A', 'B', 'dim'), E('A', 'T', 'good'), E('B', 'T', 'dim')] } },
      { t: T('请你亲手把<b>所有</b>路线找出来：从「家」开始，顺着箭头一个个点地点，点到「学校」就记下一条。', 'Find <b>every</b> route yourself: start at “Home”, click places one after another along the arrows, and each time you reach “School” a route is recorded.') },
    ],
    mission: { goal: T('找出从家到学校的所有路线。只能顺着箭头走（单行道）。', 'Find all the routes from Home to School. You can only go the way the arrows point (one-way streets).'), how: T('从「家」开始，顺着箭头依次点地点。点错了，再点一下最后那个地点就能退一步。', 'Start at “Home” and click places in order along the arrows. If you click a wrong one, click the last place again to step back.') },
    cells: [{ id: 'H', x: 0, y: 0, label: HOME }, { id: 'A', x: -85, y: 120, label: BAKERY }, { id: 'B', x: 85, y: 120, label: PARK }, { id: 'T', x: 0, y: 240, label: SCHOOL }],
    edges: [['H', 'A'], ['H', 'B'], ['A', 'B'], ['A', 'T'], ['B', 'T']], start: 'H', end: 'T',
    debrief: { title: T('一共 3 条路线', '3 routes in all'), body: [T('现在地图只有 4 个地点，一条条找还不算累。', 'With only 4 places on the map, tracing routes one by one isn’t too tiring.'), T('但地点稍微多一点，路线就会多到找不完，还很容易漏掉或者重复。', 'But add a few more places and there are too many routes to trace, and it is easy to miss one or count one twice.')], note: T('路线 = 从起点顺着箭头走到终点的一串地点。', 'A route = a sequence of places leading from the start to the end along the arrows.') },
  },
  {
    id: 'lastStep', ch: 1, title: T('只看最后一步', 'Just look at the last step'), short: T('不找路线，也能数出路线', 'Count routes without tracing them'), mode: 'fill',
    intro: [
      { t: T('地图变大了。一条条找路线又慢又容易漏，我们换个办法：<b>给每个地点算一个数</b>，表示「从家走到这里，一共有几条路线」。', 'The map has grown. Tracing routes one by one is slow and easy to get wrong, so let’s try something else: <b>give each place a number</b> meaning “how many routes lead here from Home”.'), fig: { cells: L5_CELLS.map(c => N(c.id, c.x, c.y, { label: c.label, w: 78, h: 60 })), edges: L5_EDGES.map(([a, b]) => E(a, b, 'dim')) } },
      { t: T('家本身算 <b>1</b> 条：你已经站在那里了，这是唯一的一种「到达」方式。', 'Home itself counts as <b>1</b> route: you are already standing there, and that is the one and only way of “arriving”.'), fig: { cells: [N('H', 0, 0, { label: HOME, value: 1, cls: 'src' })], edges: [] } },
      { t: T('想知道到「广场」有几条路线，只看<b>最后一步</b>：指向广场的箭头来自书店和公园。所以每条到广场的路线，最后一步不是从书店来，就是从公园来。', 'To find how many routes reach “Square”, look only at the <b>last step</b>: the arrows into Square come from Books and Park. So every route to Square makes its last step either from Books or from Park.'), fig: { cells: [N('A', -75, 0, { label: BOOKS, value: '?' }), N('B', 75, 0, { label: PARK, value: '?' }), N('D', 0, 115, { label: SQUARE, value: '?', cls: 'sel' })], edges: [E('A', 'D', 'hot'), E('B', 'D', 'hot')] } },
      { t: T('「从书店来」的路线，就是到书店的每一条路线再多走一步。所以：<b>到广场的路线数 = 到书店的路线数 + 到公园的路线数</b>。', 'The routes “coming from Books” are exactly the routes to Books, each with one more step. So: <b>routes to Square = routes to Books + routes to Park</b>.'), fig: { cells: [N('A', -75, 0, { label: BOOKS, value: 1, cls: 'lit' }), N('B', 75, 0, { label: PARK, value: 1, cls: 'lit' }), N('D', 0, 115, { label: SQUARE, value: 2, cls: 'lit' })], edges: [E('A', 'D', 'hot'), E('B', 'D', 'hot')] } },
      { t: T('每个地点都是这样：<b>到这里的路线数 = 指向它的所有上一站的路线数之和</b>。从家开始，顺着箭头一个地点一个地点往下填。', 'Every place works the same way: <b>the routes to it = the sum of the routes to every place with an arrow into it</b>. Start at Home and fill the places in, one by one, along the arrows.') },
    ],
    mission: { goal: T('算出从家到每个地点各有几条路线，最后得到学校的数。只能顺着箭头走，家本身算 1 条。', 'Work out how many routes lead from Home to each place, ending with the number for School. You can only go the way the arrows point, and Home itself counts as 1.'), how: T('点一个地点，用下方的数字键盘填数。选中地点的「上一站」会亮起黄色虚框。', 'Click a place and type its number on the keypad below. The selected place’s “previous stops” get a dashed yellow frame.') },
    cells: L5_CELLS, edges: L5_EDGES, start: 'H', end: 'T',
    debrief: { title: T('一共 6 条路线', '6 routes in all'), body: [T('你<b>没有列出任何一条路线</b>，却算出了一共 6 条。', 'You <b>didn’t list a single route</b>, yet you worked out that there are 6.'), T('每个地点的数，都是用它前面地点的数算出来的：先解决小问题（到近处有几条路），再用这些答案拼出大问题的答案（到学校有几条路）。', 'Each place’s number was computed from the numbers of the places before it: first solve the small problems (how many routes reach the nearby places), then build the big answer out of those (how many reach School).'), T('<strong>这就是动态规划最核心的想法。</strong>', '<strong>This is the core idea of dynamic programming.</strong>')], note: T('到某地的路线数 = 到它所有「上一站」的路线数之和。', 'Routes to a place = the sum of the routes to all of its “previous stops”.') },
  },
  {
    id: 'city', ch: 1, title: T('棋盘城市', 'Grid city'), short: T('每个路口都在重复同一件事', 'Every crossing does the same thing'), mode: 'fill',
    intro: [
      { t: T('城市的街道是棋盘格。所有街道都是单行道，<b>只能往右或往下走</b>。', 'This city’s streets form a grid. Every street is one-way: <b>you can only go right or down</b>.'), fig: gridScene(2, 3, { arrows: true, cell: (r, c) => (r === 0 && c === 0 ? { value: 1, cls: 'src' } : {}) }) },
      { t: T('除了最上面一行和最左边一列，每个路口都有两根箭头指过来：<b>一根来自上面，一根来自左边</b>。', 'Apart from the top row and the left column, every crossing has two arrows coming in: <b>one from above and one from the left</b>.'), fig: gridScene(2, 3, { cell: (r, c) => (r === 1 && c === 1 ? { value: '?', cls: 'sel' } : {}), edge: (a, b) => (b === '1,1' ? 'hot' : 'dim') }) },
      { t: T('用上一关的方法，把每个路口的路线数填出来。左上角的起点已经填好了 1。', 'Use the method from the last level to fill in the number of routes to every crossing. The start in the top-left corner already holds 1.') },
    ],
    mission: { goal: T('填出每个路口的路线数。街道只能往右或往下走，左上角的起点算 1 条，右下角就是路线总数。', 'Fill in the number of routes to every crossing. Streets only go right or down; the start in the top-left corner counts as 1, and the bottom-right corner gives the total.'), how: T('点一个路口，用数字键盘填数。', 'Click a crossing and type its number on the keypad.') },
    grid: { R: 3, C: 4 },
    debrief: { title: T('右下角是 10', 'The bottom right is 10'), body: [T('回头看看你做了什么：12 个路口，每个都在做同一件事，<b>上面的数 + 左边的数</b>。', 'Look back at what you did: 12 crossings, and every one did the same thing: <b>the number above + the number to the left</b>.'), T('填的顺序也有讲究：你一定是从左上往右下填的，因为<b>一个路口要等上面和左边都填好了才能算</b>。', 'The order mattered too: you filled from the top left towards the bottom right, because <b>a crossing can only be worked out once the crossings above and to its left are filled</b>.'), T('把同一件事重复 12 次很无聊。城市有 100 个路口时，就更不可能手算了。', 'Doing the same thing 12 times is boring, and with 100 crossings it would be hopeless by hand.')], note: T('棋盘城市里，每个路口 = 上面的路口 + 左边的路口。', 'In a grid city, each crossing = the crossing above + the crossing to the left.') },
  },
];
