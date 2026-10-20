// Chapter 7: when one number per cell cannot tell histories apart, the state needs another layer.

import { N, E, W, gridScene, houseRow, layerFig } from '../../kit/domains/table/svg.js';
import { circ } from '../../kit/domains/table/circuit/components.js';
import { STREET, KEY_MAPS } from './data.js';
import { KEY_BOARD } from './states.js';
import { T, tr, lazy } from '../../kit/domains/table/i18n.js';


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
    id: 'robber', ch: 7, title: T('不能连着偷', 'No two in a row'), short: T('一个数记不住全部', 'One number can’t remember it all'), mode: 'circuit', robot: 'stack',
    intro: [
      { t: T('新的一章，一个新难题。一条街上有一排房子，每家藏着一些钱。小偷<b>不能连着偷相邻的两家</b>，否则会触发警报。最多能偷到多少钱？', 'A new chapter and a new puzzle. A street has a row of houses, each with some money hidden inside. A thief <b>can’t rob two neighboring houses</b>, or the alarm goes off. What is the most money the thief can take?'), fig: { cells: houseRow(STREET), edges: [] } },
      { t: T('比如偷 1 号、3 号、5 号，一共 2 + 9 + 1 = <b>12</b>。偷 2 号和 4 号，只有 7 + 3 = 10。', 'For example, robbing #1, #3 and #5 gives 2 + 9 + 1 = <b>12</b>. Robbing #2 and #4 gives only 7 + 3 = 10.'), fig: { cells: houseRow(STREET, j => (j % 2 ? 'dimc' : 'hot')), edges: [] } },
      { t: T('这一章的机器人是「千层」：它的视野只有 3×3，每到一家，只看得见<b>上一家的格子</b>，看不见更早的。视野里红框是这一家，左边一格是上一家；「本格信息」里的「这家的钱」是这家藏的钱。', 'This chapter’s robot is Layercake: its view is only 3×3, so at each house it sees <b>only the previous house’s cell</b>, nothing earlier. In the view, the red frame is this house and the cell to its left is the previous one; in the This cell panel, “this house’s money” is the money hidden in this house.'), fig: { cells: [0, 1, 2, 3].map(i => ({ id: `f${i}`, x: i * 62, y: 0, w: 52, h: 52, value: '', corner: i, cls: i === 3 ? 'sel' : i === 2 ? 'lit' : 'dimc' })), edges: [E('f0', 'f1', 'dim'), E('f1', 'f2', 'dim'), E('f2', 'f3', 'hot')] } },
      { t: T('要钱最多，合并时应该取较大，元件里新添了「取较大」汇合器。先试试只用一行格子，每格记「看完前 i 家，最多偷到多少」。<b>如果失败了，请仔细读失败的原因</b>，它会告诉你一件很重要的事。', 'To get the most money, merging should take the larger value, so the components now include a “max” Merger. First try with a single row of cells, each recording “the most that can be stolen from the first i houses”. <b>If it fails, read the reason carefully</b>: it will tell you something very important.') },
    ],
    mission: { goal: T('不能偷相邻的两家，否则会触发警报。算出每条街最多能偷多少钱。', 'Robbing two neighboring houses sets off the alarm. Work out the most money that can be stolen on each street.'), how: T('先拼一块电路板试试。这一关的第一次失败在计划之中，请仔细读失败的原因。', 'Build a board and give it a try. The first failure in this level is part of the plan, so read the reason carefully.') },
    tests: [{ a: STREET }, { a: [5, 1, 1, 5] }, { a: [4, 10, 3, 1, 8, 6] }],
    stages: [
      {
        world: 'rob1', facts: ['money'], fresh: ['mmax'],
        onFail: ({ L, k, res, advance }) => ({
          head: lazy(() => tr('一个数记不住全部', 'One number can’t remember it all')),
          body: lazy(() => tr(`第 ${k + 1} 条街最多能偷 <b>${L.expected[k]}</b>，机器算出了 <b>${res.value ?? '—'}</b>。可这次的问题不在电路：只要每家只有一个格子，怎么拼都会出错。看这个反例：`, `On street ${k + 1} the most that can be stolen is <b>${L.expected[k]}</b>, but the machine computed <b>${res.value ?? '—'}</b>. This time the problem isn’t your circuit: as long as each house has only one cell, any wiring will go wrong. Look at this counterexample:`)),
          extra: lazy(() => robConflict(STREET)),
          cta: { label: lazy(() => tr('给状态加一层', 'Add a layer to the state')), fn: advance },
          hint: null,
        }),
      },
      {
        world: 'rob2', facts: ['money'], 
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
    debrief: { title: T('你找到了一个反例', 'You found a counterexample'), body: [T('两条路线停在同一格，只记位置的计数器会把它们存进同一个格子。可一条带着钥匙、一条空着手，下一步一个能过门、一个过不去。', 'The two routes stop on the same cell, so a counter that remembers only position stores them in the same cell. Yet one carries the key and the other is empty-handed: on the next step, one can go through the door and the other can’t.'), T('<b>状态相同、未来不同</b>，这就是状态设计有漏洞的铁证。', '<b>Same state, different futures</b>: that is hard proof the state design has a hole in it.'), T('修好它的办法你已经知道了：让状态多记一件事。', 'You already know how to fix it: make the state remember one more thing.')], note: T('反例：两段历史落进同一个状态，未来却不一样。', 'Counterexample: two histories that land in the same state but have different futures.') },
  },
  {
    id: 'keydoor', ch: 7, title: T('钥匙与门', 'Keys and doors'), short: T('把表叠成两层', 'Stack the table in two layers'), mode: 'circuit', robot: 'stack', uses: ['counter'],
    intro: [
      { t: T('要修好计数器，状态得多记一件事：<b>有没有钥匙</b>。一张表里每格只能存一个数，装不下两种路线。', 'To fix the counter, the state has to remember one more thing: <b>whether you have the key</b>. Each cell of one table can hold only one number, which can’t keep two kinds of route apart.') },
      { t: T('这一关的机器人「千层」把表<b>叠成两层</b>：「无钥匙」一层装还没拿钥匙的路线，「红」一层装拿过钥匙的路线。它在每一格上，把两层各算一次。', 'This level’s robot, Layercake, stacks the table <b>in two layers</b>: the “no keys” layer holds the routes that haven’t got the key yet, the “red” layer those that have. On every cell it works out both layers.') },
      { t: T('本格信息告诉电路：这一层在这一格上会发生什么。<b>门关着</b>：这里是门，这一层却没有钥匙。<b>路线被带走</b>：这里有钥匙，走到这里的路线会捡起它，搬去另一层。<b>捡到钥匙</b>：这里有钥匙，这一层正接住捡起它的路线。', 'The cell facts tell the circuit what happens on this layer at this cell. <b>Door shut</b>: there is a door here, but this layer has no key. <b>Routes move on</b>: there is a key here, and routes reaching it pick it up and move to the other layer. <b>Picks up key</b>: there is a key here, and this layer takes in the routes that pick it up.') },
      { t: T('在捡钥匙的格子上，千层的<b>探针</b>能探到另一层的上面和左边：那些路线就是从那里搬来的。', 'On the cell with the key, Layercake’s <b>probe</b> reaches up and left on the other layer: that is where those routes come from.') },
    ],
    mission: { goal: T('只能往右或往下走，穿过门之前必须拿过钥匙。算出每张地图上的合法路线数：两层终点的数加起来。', 'Only right or down, and you must have picked up the key before going through a door. Work out the number of valid routes on each map: the end cells of both layers, added up.'), how: T('每一格把两层都算一遍。', 'Every cell works out both layers.') },
    world: 'keys', facts: ['start', 'gain', 'lose', 'shut'], solutionMem: ['red'], noTrace: true,
    tests: KEY_MAPS,
    solution: KEY_BOARD,
    hints: [
      T('先用路线计数器数路线，再把不该留在这一层的路线拦下：门关着，或者路线被带走。', 'Count the routes with the Route Counter first, then block the ones that can’t stay on this layer: the door is shut, or the routes move on.'),
      T('捡到钥匙的格子上，还要接住从另一层搬来的路线：探针探到的上面和左边，加起来。', 'On the cell where the key is picked up, also take in the routes moving over from the other layer: up and left as the probe reaches them, added up.'),
    ],
    boardOpt: { minScale: 0.62, maxScale: 1.15 },
    debrief: { title: T('两层，各管各的', 'Two layers, each minding its own'), body: [T('「无钥匙」一层的路线碰到门就停；走到钥匙格，就整批搬去「红」那一层。「红」那一层在钥匙格上把它们接住，从此门都开着。', 'Routes on the “no keys” layer stop at a door; reaching the key cell, they move as a batch to the “red” layer. The “red” layer takes them in at the key cell, and from then on every door is open.'), T('状态从「在哪一格」变成了「在哪一格、有没有钥匙」：多记一件事，表就多一层。', 'The state went from “which cell” to “which cell, and whether you have the key”: one more thing to remember, one more layer.')] },
  },

];
