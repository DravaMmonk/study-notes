// Chapter 7: when one number per cell cannot tell histories apart, the state needs another layer.

import { N, E, W, gridScene, houseRow, layerFig } from '../svg.js';
import { circ } from '../circuit/components.js';
import { STREET, KEY_MAPS } from './data.js';
import { T, tr, lazy } from '../i18n.js';

const KIT = ['msum', 'mmin', 'mmax', 'add', 'const', 'pass', 'block'];

function robConflict(a) {
  const tile = (j, on, ask) => `<span class="hs${on ? ' on' : ''}${ask ? ' ask' : ''}">${a[j]}<small>${tr(`${j + 1}号`, `#${j + 1}`)}</small></span>`;
  return `<div class="cx"><div class="kicker bad">${tr('反例', 'Counterexample')}</div>
    <p class="cx-p">${tr('看第 1 条街的前两家。下面两段历史走到 2 号时，在一行的机器里落进<b>同一个格子</b>：', 'Look at the first two houses on street 1. When the two histories below reach house 2, a one-row machine puts them in <b>the same cell</b>:')}</p>
    <div class="cx-row"><header><b>${tr('历史 A', 'History A')}</b><span>${tr(`偷了 2 号 · 共 ${a[1]}`, `robbed #2 · total ${a[1]}`)}</span></header><div class="houses">${tile(0)}${tile(1, true)}<span class="arrow">→</span>${tile(2, false, true)}</div><span class="verdict no">${tr('不能偷 3 号：它和 2 号相邻', 'Can’t rob #3: it is next to #2')}</span></div>
    <div class="cx-row"><header><b>${tr('历史 B', 'History B')}</b><span>${tr(`偷了 1 号 · 共 ${a[0]}`, `robbed #1 · total ${a[0]}`)}</span></header><div class="houses">${tile(0, true)}${tile(1)}<span class="arrow">→</span>${tile(2, false, true)}</div><span class="verdict yes">${tr(`可以偷 3 号：${a[0]} + ${a[2]} = ${a[0] + a[2]}`, `Can rob #3: ${a[0]} + ${a[2]} = ${a[0] + a[2]}`)}</span></div>
    <p class="cx-p">${tr(`一个格子只能存一个数。它记住了更大的 ${a[1]}（历史 A），就忘掉了历史 B。可走到 3 号时，最好的 ${a[0] + a[2]} 恰恰来自 B。<b>要让机器分清 A 和 B，格子得多记一件事：这家偷没偷。</b>`, `A cell can hold only one number. Once it remembers the larger ${a[1]} (history A), history B is forgotten. Yet at house 3, the best total, ${a[0] + a[2]}, comes precisely from B. <b>For the machine to tell A and B apart, the cell has to remember one more thing: whether this house was robbed.</b>`)}</p></div>`;
}

export const state = [
  {
    id: 'robber', ch: 7, title: T('不能连着偷', 'No two in a row'), short: T('一个数记不住全部', 'One number can’t remember it all'), mode: 'circuit', robot: 'scout',
    intro: [
      { t: T('新的一章，一个新难题。一条街上有一排房子，每家藏着一些钱。小偷<b>不能连着偷相邻的两家</b>，否则会触发警报。最多能偷到多少钱？', 'A new chapter and a new puzzle. A street has a row of houses, each with some money hidden inside. A thief <b>can’t rob two neighboring houses</b>, or the alarm goes off. What is the most money the thief can take?'), fig: { cells: houseRow(STREET), edges: [] } },
      { t: T('比如偷 1 号、3 号、5 号，一共 2 + 9 + 1 = <b>12</b>。偷 2 号和 4 号，只有 7 + 3 = 10。', 'For example, robbing #1, #3 and #5 gives 2 + 9 + 1 = <b>12</b>. Robbing #2 and #4 gives only 7 + 3 = 10.'), fig: { cells: houseRow(STREET, j => (j % 2 ? 'dimc' : 'hot')), edges: [] } },
      { t: T('这一章换回老朋友「小方」：它的视野只有 3×3，每到一家，只看得见<b>上一家的格子</b>，看不见更早的。视野里红框是这一家，左边一格是上一家；「本格信息」里的「这家的钱」是这家藏的钱。', 'This chapter brings back your old friend Boxy: its view is only 3×3, so at each house it sees <b>only the previous house’s cell</b>, nothing earlier. In the view, the red frame is this house and the cell to its left is the previous one; in the This cell panel, “this house’s money” is the money hidden in this house.'), fig: { cells: [0, 1, 2, 3].map(i => ({ id: `f${i}`, x: i * 62, y: 0, w: 52, h: 52, value: '', corner: i, cls: i === 3 ? 'sel' : i === 2 ? 'lit' : 'dimc' })), edges: [E('f0', 'f1', 'dim'), E('f1', 'f2', 'dim'), E('f2', 'f3', 'hot')] } },
      { t: T('要钱最多，合并时应该取较大，元件里新添了「取较大」汇合器。先试试只用一行格子，每格记「看完前 i 家，最多偷到多少」。<b>如果失败了，请仔细读失败的原因</b>，它会告诉你一件很重要的事。', 'To get the most money, merging should take the larger value, so the components now include a “max” Merger. First try with a single row of cells, each recording “the most that can be stolen from the first i houses”. <b>If it fails, read the reason carefully</b>: it will tell you something very important.') },
    ],
    mission: { goal: T('不能偷相邻的两家，否则会触发警报。算出每条街最多能偷多少钱。', 'Robbing two neighboring houses sets off the alarm. Work out the most money that can be stolen on each street.'), how: T('先拼一块电路板试试。这一关的第一次失败在计划之中，请仔细读失败的原因。', 'Build a board and give it a try. The first failure in this level is part of the plan, so read the reason carefully.') },
    tests: [{ a: STREET }, { a: [5, 1, 1, 5] }, { a: [4, 10, 3, 1, 8, 6] }],
    stages: [
      {
        world: 'rob1', facts: ['money'], palette: KIT, fresh: ['mmax'],
        onFail: ({ L, k, res, advance }) => ({
          head: lazy(() => tr('一个数记不住全部', 'One number can’t remember it all')),
          body: lazy(() => tr(`第 ${k + 1} 条街最多能偷 <b>${L.expected[k]}</b>，机器算出了 <b>${res.value ?? '—'}</b>。可这次的问题不在电路：只要每家只有一个格子，怎么拼都会出错。看这个反例：`, `On street ${k + 1} the most that can be stolen is <b>${L.expected[k]}</b>, but the machine computed <b>${res.value ?? '—'}</b>. This time the problem isn’t your circuit: as long as each house has only one cell, any wiring will go wrong. Look at this counterexample:`)),
          extra: lazy(() => robConflict(STREET)),
          cta: { label: lazy(() => tr('给状态加一层', 'Add a layer to the state')), fn: advance },
          hint: null,
        }),
      },
      {
        world: 'rob2', facts: ['money'], palette: KIT,
        unlockToast: T('解锁了「分层」：现在每家有三个格子', 'Unlocked “Layers”: each house now has three cells'),
        tip: T('现在每家有三个格子，机器人站在中间那一格上。视野里一列红框从上到下是「这家没偷」「这家偷了」「最多偷到」；左边一列是上一家的三格。第 0 家还没开始：没偷 = 0，偷了 = —（不可能）。', 'Each house now has three cells, and the robot stands on the middle one. In the view, the column of red frames is, from top to bottom, “skipped”, “robbed” and “most so far”; the column to the left is the previous house’s three cells. House 0 is before anything starts: skipped = 0, robbed = — (impossible).'),
        solution: circ([['n', 'mmax'], ['a', 'add'], ['b', 'mmax']], ['tap:pn>n:0', 'tap:pr>n:1', 'tap:pn>a:0', 'tap:money>a:1', 'n>b:0', 'a>b:1', 'n>out:no', 'a>out:yes', 'b>out:best']),
        hints: [
          T('这家不偷的话，上一家偷没偷都可以：没偷 = 取较大（上家没偷，上家偷了）。', 'If this house is skipped, the previous one may or may not have been robbed: skipped = max(prev skipped, prev robbed).'),
          T('上一家没偷，这家才可以偷：偷了 = 上家没偷 + 这家的钱。', 'This house can only be robbed if the previous one was skipped: robbed = prev skipped + this house’s money.'),
          T('看完这一家，它可能偷了，也可能没偷：最多 = 取较大（没偷，偷了）。', 'After this house, it may or may not have been robbed: most so far = max(skipped, robbed).'),
        ],
      },
    ],
    unlock: 'layer',
    debrief: { title: T('多记一件事，问题就解开了', 'Remember one more thing, and it’s solved'), body: [T('每家只有一个格子时，这个格子要同时代表「这家偷了」和「这家没偷」，可它们的未来不一样：前者不能偷下一家，后者可以。', 'With one cell per house, that cell has to stand for both “this house was robbed” and “this house was skipped”, but their futures differ: the first can’t rob the next house, the second can.'), T('加了一层之后，每种情况<b>各有自己的格子</b>，机器就不会再混淆了。', 'With an extra layer, each case <b>gets a cell of its own</b>, and the machine no longer mixes them up.'), T('<strong>好的状态，要记住所有会影响未来的信息。</strong>这是设计动态规划时最难、也最重要的一步。', '<strong>A good state remembers everything that can affect the future.</strong> This is the hardest, and the most important, step in designing a dynamic program.')], note: T('状态要记住所有会影响未来的信息。不够，就加一层。', 'A state must remember everything that affects the future. If it falls short, add a layer.') },
  },
  {
    id: 'breach', ch: 7, title: T('找出破绽', 'Find the flaw'), short: T('这次你来找反例', 'This time you find the counterexample'), mode: 'breach',
    world: { R: 4, C: 5, key: [1, 0], doors: [[1, 3], [3, 2]] },
    intro: [
      { t: T('一座迷宫，只能往右或往下走。其中一格放着<b>钥匙</b>，有的格子是<b>门</b>：拿过钥匙的人才能穿过门。', 'A maze where you can only go right or down. One cell holds a <b>key</b>, and some cells are <b>doors</b>: only someone who has picked up the key can pass through a door.'), fig: gridScene(3, 4, { cell: (r, c) => (r === 1 && c === 0 ? { label: W.key, cls: 'key' } : r === 1 && c === 2 ? { label: W.door, cls: 'door' } : r === 0 && c === 0 ? { corner: W.start } : r === 2 && c === 3 ? { corner: W.end } : {}) }) },
      { t: T('你的老朋友「路线计数器」被派来数路线。可它的状态只记一件事：<b>现在在哪一格</b>。', 'Your old friend the Route Counter has been sent in to count the routes. But its state remembers only one thing: <b>which cell you are on</b>.') },
      { t: T('两条路线走到同一格，一条拿了钥匙，一条没拿，计数器会把它们存进<b>同一个格子</b>。可它们的未来不一样：前面是门的时候，一条能过，一条过不去。', 'When two routes reach the same cell, one with the key and one without, the counter stores them in <b>the same cell</b>. But their futures differ: when a door lies ahead, one can get through and the other can’t.'), fig: { cells: [N('a', 0, 0, { w: 56, h: 56, value: 'A B', cls: 'rab' }), N('b', 66, 0, { w: 56, h: 56, value: 'B', cls: 'rb' }), N('c', 132, 0, { w: 56, h: 56 }), N('d', 0, 66, { w: 56, h: 56, label: W.key, value: 'A', cls: 'key ra' }), N('e', 66, 66, { w: 56, h: 56, value: '?', cls: 'sel' }), N('f', 132, 66, { w: 56, h: 56, label: W.door, cls: 'door' })], edges: [E('a', 'd', 'ra'), E('d', 'e', 'ra'), E('a', 'b', 'rb'), E('b', 'e', 'rb'), E('e', 'f', 'dim')] } },
      { t: T('「状态相同、未来不同」的两段历史，叫作<b>反例</b>。上一关，机器替你找出了反例。这一关，你来亲手找一个，证明只记位置是不够的。', 'Two histories with “the same state but different futures” are called a <b>counterexample</b>. Last level, the machine found one for you. This level, you find one yourself, proving that remembering only the position isn’t enough.') },
    ],
    mission: { goal: T('画两条只往右或往下走的路线，它们停在同一格，一条拿了钥匙、一条没拿，而前面就是门。以此证明只记位置的计数器会出错。', 'Draw two routes that only go right or down and stop on the same cell, one with the key and one without, with a door just ahead. That proves a counter that remembers only position gets it wrong.'), how: T('在规则面板里选择路线 A 或 B，从起点开始点格子，只能往右或往下。点路线的最后一格可以撤销。画好后点「检验」。', 'Choose route A or B in the side panel and click cells starting from the start, going only right or down. Click a route’s last cell to undo. When you are done, click “Check”.') },
    hintText: T('钥匙在第 2 行最左边。让一条路线先往下拿钥匙，另一条先往右走，再让它们在某扇门的左边或上面汇合。', 'The key is at the left end of row 2. Send one route down first to get the key and the other right first, then have them meet just left of or above a door.'),
    debrief: { title: T('你找到了一个反例', 'You found a counterexample'), body: [T('两条路线停在同一格，只记位置的计数器会把它们存进同一个格子。可一条带着钥匙、一条空着手，下一步一个能过门、一个过不去。', 'The two routes stop on the same cell, so a counter that remembers only position stores them in the same cell. Yet one carries the key and the other is empty-handed: on the next step, one can go through the door and the other can’t.'), T('<b>状态相同、未来不同</b>，这就是状态设计有漏洞的铁证。', '<b>Same state, different futures</b>: that is hard proof the state design has a hole in it.'), T('修好它的办法你已经知道了：让状态多记一件事。下一关，把迷宫叠成两层。', 'You already know how to fix it: make the state remember one more thing. Next level, the maze gets stacked into two layers.')], note: T('反例：两段历史落进同一个状态，未来却不一样。', 'Counterexample: two histories that land in the same state but have different futures.') },
  },
  {
    id: 'keydoor', ch: 7, title: T('钥匙与门', 'Keys and doors'), short: T('把棋盘叠成两层', 'Stack the board in two layers'), mode: 'circuit', robot: 'twin', uses: ['counter', 'layer'],
    intro: [
      { t: T('要修好计数器，就让状态多记一件事：<b>有没有钥匙</b>。办法是把棋盘复制一份，叠成两层。', 'To fix the counter, make the state remember one more thing: <b>whether you have the key</b>. The way to do it is to copy the board and stack the copies in two layers.'), fig: layerFig() },
      { t: T('上层装着「没钥匙」的路线，下层装着「有钥匙」的路线。所有路线都从<b>上层的起点</b>出发。', 'The upper layer holds the routes “without the key”, the lower layer the routes “with the key”. Every route starts from <b>the start on the upper layer</b>.') },
      { t: T('走到钥匙格的那一刻，路线就从上层<b>搬到</b>下层，之后一直待在下层。', 'The moment a route reaches the key cell, it <b>moves</b> from the upper layer to the lower one, and stays on the lower layer from then on.'), fig: layerFig({ xfer: true }) },
      { t: T('机器人同时站在两层的同一格上。视野里上面一块是上层，下面一块是下层，两层各有一个红框，所以电路板有两个输出：「上层」和「下层」。「本格信息」里还有「是起点」「是钥匙格」「是门」。', 'The robot stands on the same cell of both layers at once. In the view, the top block is the upper layer and the bottom block the lower layer, each with its own red frame, so the board has two outputs: “Upper” and “Lower”. The This cell panel also offers “is start”, “is key” and “is door”.') },
      { t: T('你要想清楚三件事：两层的门分别怎么处理？钥匙格上，上层的路线要去哪？下层怎么接住它们？两个路线计数器，加上几道闸门和一个汇合器，就够了。', 'You need to think through three things: how does each layer handle doors? On the key cell, where do the upper layer’s routes go? And how does the lower layer catch them? Two Route Counters, a few gates and one Merger are all it takes.') },
    ],
    mission: { goal: T('只能往右或往下走，穿过门之前必须拿过钥匙。让两层电路算对每张地图上的合法路线数。', 'Only right or down, and you must have picked up the key before passing through a door. Have the two-layer circuit count the valid routes on every map correctly.'), how: T('合法路线只能往右或往下走，穿过门之前必须拿过钥匙。终点的答案 = 上层终点 + 下层终点。', 'A valid route only goes right or down, and must have picked up the key before passing through a door. The answer at the end = the upper layer’s end + the lower layer’s end.') },
    world: 'key', facts: ['start', 'key', 'door'], palette: ['bp:stamp', ...KIT],
    tests: KEY_MAPS,
    solution: circ([['c1', 'bp:stamp'], ['t', 'block'], ['u', 'block'], ['c2', 'bp:stamp'], ['g', 'pass'], ['m', 'msum']], [
      'tap:tu>c1:0', 'tap:tl>c1:1', 'tap:start>c1:2', 'tap:door>t:0', 'c1>t:1', 'tap:key>u:0', 't>u:1', 'u>out:top',
      'tap:bu>c2:0', 'tap:bl>c2:1', 'tap:key>g:0', 't>g:1', 'c2>m:0', 'g>m:1', 'm>out:bot',
    ]),
    hints: [
      T('上层的路线都没有钥匙，走不进门：上层的路线计数器后面接一道拦截闸，条件接「是门」。', 'None of the upper layer’s routes have the key, so they can’t enter a door: put a Block gate after the upper Route Counter, with “is door” as its condition.'),
      T('走到钥匙格，路线就离开了上层：上层在钥匙格要输出「—」。再加一道拦截闸，条件接「是钥匙格」。', 'On reaching the key cell, a route leaves the upper layer: the upper layer must output “—” on the key cell. Add another Block gate with “is key” as its condition.'),
      T('下层要在钥匙格接住上层搬来的路线：用放行闸（条件接「是钥匙格」）把上层这一格的数，和下层自己的路线计数器一起接进汇合器。下层的门照常通过。', 'The lower layer has to catch the routes moving down on the key cell: use a Pass gate (condition “is key”) to send the upper layer’s number for this cell into a Merger, together with the lower layer’s own Route Counter. Doors on the lower layer let routes through as usual.'),
    ],
    boardOpt: { minScale: 0.62, maxScale: 1.15 },
    debrief: { title: T('两层棋盘，各管各的', 'Two layers, each minding its own'), body: [T('上层只装「没钥匙」的路线，所以门要拦下；下层只装「有钥匙」的路线，门可以照常通过。', 'The upper layer holds only routes “without the key”, so doors must stop them; the lower layer holds only routes “with the key”, so doors let them through as usual.'), T('钥匙格是两层之间唯一的通道，路线在这里从上层搬到下层。到了终点，两层的路线都合法，所以相加。', 'The key cell is the only passage between the layers: that is where routes move from the upper layer to the lower. At the end, the routes on both layers are valid, so they are added together.'), T('这是给状态加一维的标准做法：<b>把表复制几份，每份代表一种情况，再规定它们之间怎么转移</b>。程序员把这种结构叫作「状态机」。', 'This is the standard way to add a dimension to the state: <b>make several copies of the table, one for each case, and lay down how to move between them</b>. Programmers call this structure a “state machine”.')], note: T('加一维 = 把表复制几层，每层一种情况，再规定层与层之间怎么转移。', 'Adding a dimension = copying the table into layers, one per case, and setting the rules for moving between layers.') },
  },
];
