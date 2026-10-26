// Chapter 9: greedy fails, the knapsack table works, and one in-place row works if it scans the right way.

import { E, knapFig } from '../../kit/domains/table/svg.js';
import { circ, usesSensor, partFn } from '../../kit/domains/table/circuit/components.js';
import { port } from '../../kit/domains/table/ports.js';
import { knapTrace } from '../../kit/domains/table/algo.js';
import { PACK_A, PACK_B, PACK_C } from './data.js';
import { T, tr } from '../../kit/domains/table/i18n.js';


export const knapsack = [
  {
    id: 'pack', ch: 9, title: T('装背包', 'Pack the backpack'), short: T('聪明的捷径不总是对的', 'Clever shortcuts aren’t always right'), mode: 'pack',
    intro: [
      { t: T('新的一章：装背包。出门旅行，背包有重量上限。每件东西有重量和价值，<b>每件最多带一个</b>。怎么装，带上的价值最大？', 'A new chapter: packing a backpack. You are off on a trip, and the backpack has a weight limit. Each thing has a weight and a value, and <b>you can take at most one of each</b>. How do you pack to carry the most value?') },
      { t: T('人们常用两种「捷径」：<b>最贵的先放</b>，或者<b>最划算的先放</b>（每千克的价值最高）。按顺序挨个看，装得下就装。这种每一步都挑眼前最好的做法，叫作<wiki-ref to="greedy"></wiki-ref>。', 'People often use one of two “shortcuts”: <b>priciest first</b>, or <b>best value first</b> (the highest value per kilogram). Go through the items in that order and pack each one that fits. Always grabbing what looks best right now is called being <wiki-ref to="greedy"></wiki-ref>.') },
      { t: T('这一关有两道题。规则面板里有两个「自动装包」按钮，分别按这两种捷径装包。先试试它们，再自己动手，装出目标价值。', 'This level has two puzzles. The side panel has two “Auto-pack” buttons, one for each shortcut. Try them first, then pack by hand to reach the target value.') },
    ],
    mission: { goal: T('物品总重量不能超过背包上限，每件最多带一个。两道题里，都装出目标价值。', 'The total weight can’t exceed the backpack’s limit, and you can take at most one of each item. Reach the target value in both puzzles.'), how: T('点物品放进或拿出背包。规则面板里的两个按钮会按捷径自动装包，可以试试它们。', 'Click items to put them in or take them out. The two buttons in the side panel auto-pack using the shortcuts; give them a try.') },
    tests: [PACK_A, PACK_B],
    debrief: { title: T('没有简单的捷径', 'No easy shortcut'), body: [T('第 1 题里，「最贵的先放」差了一点；第 2 题里，「最划算的先放」也差了一点。<b>看起来很聪明的贪心规则，总有例外。</b>', 'In puzzle 1, “priciest first” fell just short; in puzzle 2, “best value first” fell just short too. <b>Greedy rules that look clever always have exceptions.</b>'), T('最保险的办法是把所有装法都试一遍。5 件物品有 32 种装法，还试得过来；30 件物品就有 10 亿多种。', 'The safe way is to try every possible packing. 5 items give 32 packings, which is still manageable; 30 items give over a billion.')], note: T('贪心（每一步挑眼前最好的）不一定得到最好的结果。', 'Greedy (always picking what looks best right now) doesn’t necessarily give the best result.') },
  },
  {
    id: 'knaptable', ch: 9, title: T('背包表', 'Knapsack table'), short: T('会伸缩的来路', 'A reach that stretches'), mode: 'circuit', robot: 'reach',
    intro: [
      { t: T('把装包也做成表。行是物品，列是背包容量 0、1、2……格子 (第 i 行, 容量 w) 记着：<b>只从前 i 件物品里挑、背包容量是 w 时，最多能装多少价值</b>。', 'Turn packing into a table too. Rows are items and columns are backpack capacities 0, 1, 2… Cell (row i, capacity w) records: <b>the most value you can pack choosing only from the first i items, with a backpack of capacity w</b>.'), fig: knapFig() },
      { t: T('第 0 行是「一件都还没考虑」，所以全是 0，机器已经替你填好了。', 'Row 0 means “no items considered yet”, so it is all 0s, and the machine has already filled it in.'), fig: knapFig({ show: i => i === 0, cls: i => (i === 0 ? 'lit' : '') }) },
      { t: T('只看最后一件：第 i 件物品，要么<b>不拿</b>，要么<b>拿</b>。不拿的话，答案和正上方那一格一样。', 'Look only at the last item: item i is either <b>left out</b> or <b>taken</b>. If it is left out, the answer is the same as the cell right above.'), fig: knapFig({ show: (i, w) => i < 2 || w < 3, cls: (i, w) => (i === 2 && w === 3 ? 'sel' : i === 1 && w === 3 ? 'lit' : ''), edges: [['1,3', '2,3', 'hot']] }) },
      { t: T('拿的话呢？背包得先给它腾出空间。想一想：腾出空间<b>之前</b>，背包是表里的哪一格？拿上它以后又多了什么？最后，拿和不拿，你要的是哪一个？', 'And if it is taken? The backpack first has to make room for it. Think: <b>before</b> making room, which cell of the table is the backpack? What do you gain by taking the item? And in the end, between taking and leaving it, which do you want?'), fig: knapFig({ show: (i, w) => i < 2 || w < 3, cls: (i, w) => (i === 2 && w === 3 ? 'sel' : '') }) },
      { t: T('这一关的机器人「长臂」站在 (第 i 行, 容量 w) 上。正上方的格子在视野里就能看到；可往左「重量」格可能很远，视野装不下。又要用到青蛙过河时的<wiki-ref to="arms"></wiki-ref>：这次它伸到往左「这件物品的重量」格，上一行、本行各读一格；点它够到的格子，「视野」元件上就多一个输出口。「本格信息」里是这件物品的「物品价值」。', 'This level’s robot, Longarm, stands on (row i, capacity w). The cell right above is in its view, but the cell as many columns to the left as the item weighs may be far away, out of view. The <wiki-ref to="arms"></wiki-ref> from the frog’s river comes in again: this time it reaches left by “this item’s weight” cells and reads one cell on the row above and one on this row; click a cell it reaches, and the “View” part gains an output for it. The This cell panel holds this item’s “item value”.') },
    ],
    mission: { goal: T('总重量不能超过容量，每件物品最多拿一次。拼出背包表的电路，算出每个背包最多能装多少价值。', 'The total weight can’t exceed the capacity, and each item can be taken at most once. Build the knapsack table’s circuit and work out the most value each backpack can hold.'), how: T('前两个测试，就是你在<level-ref to="pack"></level-ref>里亲手装过的背包。通过后，绿色格子是倒推出的装法。', 'The first two tests are the backpacks you packed by hand in <level-ref to="pack"></level-ref>. Once you pass, the green cells show the packing traced back from the table.') },
    world: 'knap', facts: ['value'],
    tests: [PACK_A, PACK_B, PACK_C],
    solution: circ([['a', 'add'], ['m', 'mmax']], ['tap:upk>a:0', 'tap:value>a:1', 'tap:up>m:0', 'a>m:1', 'm>out:cell']),
    hints: [
      T('每件物品都可以不拿：不拿的话，答案就是「正上方」。', 'Any item can be left out: then the answer is just “right above”.'),
      T('拿这件物品：先在上一行腾出它的重量，再加上它的价值。两种选择接进「取较大」汇合器。', 'Taking this item: make room for its weight on the row above, then add its value. Wire both choices into a “max” Merger.'),
    ],
    diagnose: c => (usesSensor(c, 'rowk') ? tr('同一行的格子已经考虑过这件物品了，从那里再拿，就把它拿了两次。要拿这件，得从上一行腾地方。', 'Cells on the same row have already considered this item, so taking it again from there takes it twice. To take this item, make room on the row above.') : null),
    trace: t => ({ path: knapTrace(t).cells }),
    after(t, view) {
      if (!view || !view.end || !view.pass) return '';
      const chosen = knapTrace(t).picked.map(k => t.items[k]);
      return `<div class="afterbox"><span class="eyebrow">${tr('倒推出的装法', 'The packing, traced back')}</span><div class="diff">${chosen.map(it => `<span class="dt ins">${it.n}<small>${it.w} kg · ${it.v}</small></span>`).join('')}</div><p class="cap">${tr(`一共 ${chosen.reduce((s, it) => s + it.w, 0)} kg，价值 <b>${chosen.reduce((s, it) => s + it.v, 0)}</b>。`, `${chosen.reduce((s, it) => s + it.w, 0)} kg in all, value <b>${chosen.reduce((s, it) => s + it.v, 0)}</b>.`)}</p></div>`;
    },
    boardOpt: { minScale: 0.68, maxScale: 1.15 },
    // Keep, or swap for another plus a gain: the shape of every "take it or not" choice.
    unlock: 'choose', blueprint: { ports: [port(T('不换', 'keep'), 'a', 'num', 'up'), port(T('换来', 'swap for'), 'b', 'num', 'upk'), port(T('加上', 'plus'), '+', 'num', 'value')], f: ([a, b, c]) => partFn('mmax')([a, partFn('add')([b, c])]) },
    debrief: { title: T('0/1 背包', '0/1 knapsack'), body: [T('每件物品只有两种命运：不拿（看正上方），或者拿（去上一行腾出它的重量，再加上它的价值），两者取较大。', 'Each item has only two fates: left out (look right above), or taken (make room for its weight on the row above, then add its value). Take the larger of the two.'), T('来路必须从<b>上一行</b>出发。上一行还没考虑过这件物品，从那里拿，才能保证它只被拿一次。', 'The way in must start from <b>the row above</b>. The row above hasn’t considered this item yet, so taking it from there guarantees it is taken only once.'), T('这个问题叫 <wiki-ref to="knap01"></wiki-ref>。选课、做预算、装货柜、给服务器分配任务，背后都是它。', 'This problem is called the <wiki-ref to="knap01"></wiki-ref>. Choosing courses, budgeting, loading shipping containers and assigning jobs to servers all come down to it.')], note: T('0/1 背包：不拿看正上方；拿就从上一行腾出重量，再加价值。', '0/1 knapsack: leave it out, look right above; take it, make room for its weight on the row above and add its value.') },
  },
  // The knapsack series (长臂's topic): each kind as many times as you like, then a backpack that mixes both kinds. The
  // finale's board solves the earlier level too: an item that is not marked `many` is taken at most once.
  {
    id: 'knapmany', ch: 9, title: T('每件可以拿多次', 'As many as you like'), short: T('同一种还能再拿', 'The same kind, again'), mode: 'circuit', robot: 'reach',
    intro: [
      { t: T('这一回在商店里装包：每种东西都有很多件，<b>同一种可以拿好几件</b>。总重量还是不能超过背包的容量。', 'This time you pack in a shop: there is plenty of every kind of thing, and <b>you can take several of the same kind</b>. The total weight still can’t exceed the backpack’s capacity.') },
      { t: T('表还是那张背包表：格子 (第 i 行, 容量 w) 记着<b>只从前 i 种东西里挑、容量是 w 时，最多能装多少价值</b>。和<level-ref to="knaptable"></level-ref>比，只有一处不同：拿了一件之后，还可以再拿同一种。', 'The table is the same knapsack table: cell (row i, capacity w) records <b>the most value you can pack choosing only from the first i kinds, with capacity w</b>. Only one thing differs from <level-ref to="knaptable"></level-ref>: after taking one, you can take the same kind again.'), fig: knapFig() },
      { t: T('伸缩臂照样伸到往左「这种东西的重量」格，上一行、本行各够到一格。', 'The telescopic arm still reaches as many columns to the left as this kind weighs, one cell on the row above and one on this row.') },
    ],
    mission: { goal: T('每种东西可以拿任意多件，总重量不能超过容量。拼出电路板，算出每个背包最多能装多少价值。', 'Each kind can be taken as many times as you like, and the total weight can’t exceed the capacity. Build the circuit board and work out the most value each backpack can hold.'), how: T('还是逐行、从左往右算。', 'Still row by row, left to right.') },
    world: 'knap', facts: ['value'],
    tests: [
      { W: 7, items: [{ n: T('苹果', 'apples'), w: 2, v: 3, many: true }, { n: T('西瓜', 'melons'), w: 3, v: 5, many: true }] },
      { W: 10, items: [{ n: T('腊肉', 'bacon'), w: 6, v: 13, many: true }, { n: T('面粉', 'flour'), w: 5, v: 10, many: true }, { n: T('盐', 'salt'), w: 1, v: 1, many: true }] },
      { W: 9, items: [{ n: T('面粉', 'flour'), w: 5, v: 9, many: true }, { n: T('大米', 'rice'), w: 3, v: 5, many: true }, { n: T('白糖', 'sugar'), w: 2, v: 3, many: true }] },
    ],
    solution: circ([['c', 'bp:knaptable']], ['tap:up>c:0', 'tap:rowk>c:1', 'tap:value>c:2', 'c>out:cell']),
    hints: [
      T('这一种一件也不拿：答案还是正上方。', 'Taking none of this kind: the answer is still right above.'),
      T('拿了一件，还能再拿：要找的是「已经考虑过这一种」的那一格。上一行还没考虑过它，本行已经考虑过了。', 'After taking one, you may take another: you want the cell that has “already considered this kind”. The row above hasn’t considered it yet; this row has.'),
    ],
    diagnose: c => (usesSensor(c, 'upk') && !usesSensor(c, 'rowk') ? tr('从上一行腾地方，每种东西就只拿了一件。这一关，同一种可以拿好几件。', 'Making room on the row above takes each kind only once. In this level, you can take several of the same kind.') : null),
    boardOpt: { minScale: 0.68, maxScale: 1.15 },
    debrief: { title: T('完全背包', 'Unbounded knapsack'), body: [T('从<b>本行</b>腾地方：本行已经考虑过这一种东西，在那里再拿一件，就是又多拿了一件。', 'Make room on <b>this row</b>: this row has already considered this kind, so taking one more from there is simply one more of it.'), T('和 0/1 背包只差一处：腾地方的那一格，从上一行换成了本行。这个问题叫<b>完全背包</b>（每种物品数量不限）。', 'It differs from the 0/1 knapsack in one place only: the cell that makes room moves from the row above to this row. This problem is called the <b>unbounded knapsack</b> (unlimited copies of each item).')] },
  },
  {
    id: 'knapmix', ch: 9, title: T('混合背包', 'A mixed backpack'), short: T('有的只有一件', 'Some come only once'), mode: 'circuit', robot: 'reach',
    intro: [
      { t: T('出门之前去商店补货。<b>有的东西只有一件</b>，比如帐篷、相机；<b>有的要多少有多少</b>，比如矿泉水、饼干。物品栏里标着 ×n 的，可以拿很多件。', 'Before setting off, you stock up at a shop. <b>Some things come only once</b>, like the tent or the camera; <b>some come in any number</b>, like water or biscuits. Items marked ×n can be taken many times.') },
      { t: T('本格信息里多了一条「这件能拿多次」。', 'The cell facts now include “can take many”.') },
    ],
    mission: { goal: T('每件东西要么最多拿一件，要么可以拿很多件，总重量不能超过容量。算出每个背包最多能装多少价值。', 'Each thing can be taken either at most once or as many times as you like, and the total weight can’t exceed the capacity. Work out the most value each backpack can hold.'), how: T('物品栏里标 ×n 的可以拿很多件。', 'Items marked ×n can be taken many times.') },
    world: 'knap', facts: ['value', 'many'],
    tests: [
      { W: 11, items: [{ n: T('帐篷', 'tent'), w: 5, v: 12 }, { n: T('矿泉水', 'water'), w: 4, v: 9, many: true }, { n: T('相机', 'camera'), w: 3, v: 7 }, { n: T('饼干', 'biscuits'), w: 2, v: 3, many: true }] },
      { W: 8, items: [{ n: T('指南针', 'compass'), w: 3, v: 10 }, { n: T('罐头', 'cans'), w: 4, v: 9, many: true }, { n: T('能量棒', 'energy bars'), w: 1, v: 3, many: true }] },
      { W: 8, items: [{ n: T('木柴', 'firewood'), w: 4, v: 4, many: true }, { n: T('绳子', 'rope'), w: 2, v: 4, many: true }, { n: T('药箱', 'medical kit'), w: 3, v: 13 }] },
    ],
    // Make room on this row for a kind that can be taken many times, on the row above for one taken at most once.
    solution: circ([['p', 'pass'], ['b', 'block'], ['s', 'msum'], ['c', 'bp:knaptable']], ['tap:many>p:0', 'tap:rowk>p:1', 'tap:many>b:0', 'tap:upk>b:1', 'p>s:0', 'b>s:1', 'tap:up>c:0', 's>c:1', 'tap:value>c:2', 'c>out:cell']),
    hints: [
      T('两种东西的拿法只差一处：腾地方的那一格，在上一行，还是在本行。', 'The two kinds of thing differ in one place only: whether the cell that makes room is on the row above or on this row.'),
      T('让「这件能拿多次」来挑那一格：一个闸门放行本行那格，另一个闸门放行上一行那格。', 'Let “can take many” pick that cell: one gate lets this row’s cell through, another lets the row above’s through.'),
    ],
    diagnose: c => (!usesSensor(c, 'many') ? tr('这一关有的东西只能拿一件，有的可以拿很多件。读一读「这件能拿多次」。', 'In this level some things can be taken only once and some many times. Read “can take many”.') : null),
    boardOpt: { minScale: 0.68, maxScale: 1.15 },
    debrief: { title: T('混合背包', 'Mixed knapsack'), body: [T('每一行只看这一种东西：最多拿一件，就从上一行腾地方；能拿很多件，就从本行腾地方。', 'Each row looks at one kind only: if it can be taken at most once, make room on the row above; if many times, make room on this row.'), T('前面两种背包都是它的特例：全都最多拿一件，就是 0/1 背包；全都能拿很多件，就是完全背包。这块电路板，也能直接解<level-ref to="knapmany"></level-ref>。', 'The two earlier backpacks are special cases of it: everything at most once is the 0/1 knapsack, everything many times is the unbounded knapsack. This circuit board solves <level-ref to="knapmany"></level-ref> as it is.')] },
  },
  {
    id: 'roll', ch: 9, title: T('压成一行', 'Squash it into one row'), short: T('改写的方向决定含义', 'The rewrite direction is the meaning'), mode: 'circuit', robot: 'reach', uses: ['pack'],
    intro: [
      { t: T('仔细看背包表：每一行只用到<b>上一行</b>。那何必留着整张表？只留一行，每处理一件物品，就在这一行上原地改写。', 'Look closely at the knapsack table: each row only uses <b>the row above</b>. So why keep the whole table? Keep just one row, and rewrite it in place for each item.'), fig: knapFig({ cls: i => (i === 0 ? 'dimc' : 'lit'), edges: [['1,3', '2,3', 'dim'], ['1,2', '2,3', 'dim']] }) },
      { t: T('原地改写有个风险：改 dp[w] 时要读 dp[w − 重量]。如果那一格<b>这一轮已经改过</b>，读到的就是「已经拿过这件物品」的值。', 'Rewriting in place carries a risk: rewriting dp[w] reads dp[w − weight]. If that cell <b>has already been rewritten this round</b>, what you read is a value where the item “has already been taken”.'), fig: { cells: [0, 1, 2, 3, 4].map(w => ({ id: `d${w}`, x: w * 56, y: 0, w: 46, h: 46, value: [0, 2, 4, '?', ''][w], corner: w, cls: w === 3 ? 'hot' : w === 1 ? 'bad' : w < 3 ? 'lit' : '' })), edges: [E('d1', 'd3', 'bad', -36)] } },
      { t: T('这一关有两种背包：<b>每件最多拿一次</b>的，和<b>每件可以拿很多次</b>的（比如商店里每种东西都有很多件）。电路板不难：新的 dp[w] = 取较大（旧的 dp[w]，dp[w − 重量] + 价值）。视野里的红框 dp[w] 是写入新值的地方，在视野里点它，读到的是改写前的旧值；dp[w − 重量] 由伸缩臂够到。', 'This level has two kinds of backpack: one where <b>each item can be taken at most once</b>, and one where <b>each item can be taken many times</b> (like a shop with plenty of everything). The board isn’t hard: new dp[w] = max(old dp[w], dp[w − weight] + value). The red frame dp[w] in the view is where the new value is written, and clicking it in the view reads the old value before it is rewritten; dp[w − weight] is what the telescopic arm reaches.') },
      { t: T('真正的门道在机器的<wiki-ref to="dirs"></wiki-ref>：每件最多拿一次时，它<b>从右往左</b>改写；每件可以拿很多次时，它<b>从左往右</b>改写。同一块电路板，为什么换个方向，答案就不一样？', 'The real trick is the machine’s <wiki-ref to="dirs"></wiki-ref>: when each item can be taken at most once, it rewrites <b>right to left</b>; when each item can be taken many times, it rewrites <b>left to right</b>. Why does the same circuit board give different answers when only the direction changes?') },
    ],
    mission: { goal: T('一种背包每件最多拿一次，另一种每件可以拿很多次，总重量都不能超过容量。拼好电路，让四个测试都算对。', 'In one kind of backpack each item can be taken at most once; in the other, many times. Either way, the total weight can’t exceed the capacity. Build the circuit so that all four tests come out right.'), how: T('黄色是正在改写的格子；红色表示读到了这一轮刚改过的值。', 'Yellow is the cell being rewritten; red means a value rewritten earlier this round was read.') },
    world: 'roll', facts: ['value'], noTrace: true,
    // A challenge: the naive board only ever takes the item, forgetting that leaving it out may be better.
    naive: circ([['a', 'add']], ['tap:src>a:0', 'tap:value>a:1', 'a>out:cell']),
    dirs: { '01': 'asc', inf: 'desc' }, solutionDirs: { '01': 'desc', inf: 'asc' },
    tests: [
      { kind: '01', W: 6, items: [{ n: T('罐头', 'can'), w: 1, v: 1 }, { n: T('雨衣', 'raincoat'), w: 3, v: 4 }, { n: T('毯子', 'blanket'), w: 4, v: 5 }] },
      { kind: 'inf', W: 7, items: [{ n: T('苹果', 'apple'), w: 2, v: 3 }, { n: T('西瓜', 'melon'), w: 3, v: 5 }] },
      { kind: '01', W: 7, items: PACK_C.items },
      { kind: 'inf', W: 9, items: [{ n: T('面粉', 'flour'), w: 5, v: 9 }, { n: T('大米', 'rice'), w: 3, v: 5 }, { n: T('白糖', 'sugar'), w: 2, v: 3 }] },
    ],
    solution: circ([['a', 'add'], ['m', 'mmax']], ['tap:src>a:0', 'tap:value>a:1', 'tap:old>m:0', 'a>m:1', 'm>out:cell']),
    diagnose(c, st) {
      if (!['old', 'src', 'value'].every(id => usesSensor(c, id))) return tr('电路板：新的 dp[w] = 取较大（旧的 dp[w]，dp[w − 重量] + 价值）。三样都要读进来：旧的 dp[w]、dp[w − 重量] 和物品价值。', 'The circuit board: new dp[w] = max(old dp[w], dp[w − weight] + value). All three need reading in: the old dp[w], dp[w − weight] and the item value.');
      return null;
    },
    explain(t, res, st) {
      let item = -1, touched = new Set();
      const s = res.steps.find(x => {
        if (x.cell.item !== item) { item = x.cell.item; touched = new Set(); }
        const hit = touched.has(x.cell.src) && x.writes[0][1] > x.probe['tap:old'];
        touched.add(x.cell.w);
        return hit;
      });
      if (t.kind === '01' && s) { const it = t.items[s.cell.item]; return tr(`处理「${it.n}」（${it.w} kg）时，改 dp[${s.cell.w}] 要读 dp[${s.cell.src}]，可 dp[${s.cell.src}] 在这一轮已经改过，里面已经放了一个${it.n}。于是${it.n}又被放了一次。`, `While handling the ${it.n} (${it.w} kg), rewriting dp[${s.cell.w}] reads dp[${s.cell.src}], but dp[${s.cell.src}] was already rewritten this round and already holds one ${it.n}. So the ${it.n} got packed a second time.`); }
      if (t.kind === 'inf' && st.dirs.inf === 'desc') return tr('这一题每种东西可以拿很多件。从右往左改写时，dp[w − 重量] 总是旧值，每种东西都只被拿了一次。', 'In this test, each kind of thing can be taken many times. Rewriting from right to left, dp[w − weight] is always an old value, so each thing gets taken only once.');
      return '';
    },
    after(t, view) {
      const on = view && !view.end && view.k ? view.res.steps[view.k - 1].cell.item : -1;
      return `<div class="afterbox"><span class="eyebrow">${tr('物品', 'Items')} · ${t.kind === '01' ? tr('每件最多拿一次', 'each at most once') : tr('每件可以拿很多次', 'each as many times as you like')}</span><div class="diff">${t.items.map((it, k) => `<span class="dt${k === on ? ' on' : ''}">${it.n}<small>${it.w} kg · ${it.v}</small></span>`).join('')}</div></div>`;
    },
    boardOpt: { minScale: 0.66, maxScale: 1.15 },
    unlock: 'roll',
    debrief: { title: T('方向就是含义', 'Direction is meaning'), body: [T('从右往左改写时，dp[w − 重量] 还没被这件物品改过，读到的是旧值，所以<b>每件最多拿一次</b>。', 'Rewriting from right to left, dp[w − weight] hasn’t been touched by this item yet, so it reads an old value: <b>each item at most once</b>.'), T('从左往右改写时，dp[w − 重量] 可能已经拿过这件物品，再拿一次正好，所以<b>每件可以拿很多次</b>。', 'Rewriting from left to right, dp[w − weight] may already include this item, and taking it again is just right: <b>each item as many times as you like</b>.'), T('同一块电路板，只是方向不同，解决的就是两个不同的问题。这种只留一行的写法叫<b>滚动数组</b>，能把几千行的表压成一行。', 'The same circuit board, just a different direction, solves two different problems. Keeping only one row like this is called a <b>rolling array</b>, and it can squash a table thousands of rows tall into a single row.')], note: T('一行原地改写：从右往左，每件一次；从左往右，每件无限次。', 'One row rewritten in place: right to left, once each; left to right, unlimited.') },
  },
];
