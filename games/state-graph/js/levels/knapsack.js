// Chapter 9: greedy fails, the knapsack table works, and one in-place row works if it scans the right way.

import { E, knapFig } from '../svg.js';
import { circ, usesTap } from '../circuit/components.js';
import { knapTrace } from '../algo.js';
import { PACK_A, PACK_B, PACK_C } from './data.js';
import { T, tr } from '../i18n.js';

const KIT = ['msum', 'mmin', 'mmax', 'add', 'const', 'pass', 'block'];

export const knapsack = [
  {
    id: 'pack', ch: 9, title: T('装背包', 'Pack the backpack'), short: T('聪明的捷径不总是对的', 'Clever shortcuts aren’t always right'), mode: 'pack',
    intro: [
      { t: T('新的一章：装背包。出门旅行，背包有重量上限。每件东西有重量和价值，<b>每件最多带一个</b>。怎么装，带上的价值最大？', 'A new chapter: packing a backpack. You are off on a trip, and the backpack has a weight limit. Each thing has a weight and a value, and <b>you can take at most one of each</b>. How do you pack to carry the most value?') },
      { t: T('人们常用两种「捷径」：<b>最贵的先放</b>，或者<b>最划算的先放</b>（每千克的价值最高）。按顺序挨个看，装得下就装。这种每一步都挑眼前最好的做法，叫作<b>贪心</b>。', 'People often use one of two “shortcuts”: <b>priciest first</b>, or <b>best value first</b> (the highest value per kilogram). Go through the items in that order and pack each one that fits. Always grabbing what looks best right now is called being <b>greedy</b>.') },
      { t: T('这一关有两道题。规则面板里有两个「自动装包」按钮，分别按这两种捷径装包。先试试它们，再自己动手，装出目标价值。', 'This level has two puzzles. The side panel has two “Auto-pack” buttons, one for each shortcut. Try them first, then pack by hand to reach the target value.') },
    ],
    mission: { goal: T('物品总重量不能超过背包上限，每件最多带一个。两道题里，都装出目标价值。', 'The total weight can’t exceed the backpack’s limit, and you can take at most one of each item. Reach the target value in both puzzles.'), how: T('点物品放进或拿出背包。规则面板里的两个按钮会按捷径自动装包，可以试试它们。', 'Click items to put them in or take them out. The two buttons in the side panel auto-pack using the shortcuts; give them a try.') },
    tests: [PACK_A, PACK_B],
    debrief: { title: T('没有简单的捷径', 'No easy shortcut'), body: [T('第 1 题里，「最贵的先放」差了一点；第 2 题里，「最划算的先放」也差了一点。<b>看起来很聪明的贪心规则，总有例外。</b>', 'In puzzle 1, “priciest first” fell just short; in puzzle 2, “best value first” fell just short too. <b>Greedy rules that look clever always have exceptions.</b>'), T('最保险的办法是把所有装法都试一遍。5 件物品有 32 种装法，还试得过来；30 件物品就有 10 亿多种。', 'The safe way is to try every possible packing. 5 items give 32 packings, which is still manageable; 30 items give over a billion.'), T('下一关换个思路：用表格，只看最后一件物品是拿还是不拿。', 'Next level, a different approach: use a table, and look only at whether the last item is taken or not.')], note: T('贪心（每一步挑眼前最好的）不一定得到最好的结果。', 'Greedy (always picking what looks best right now) doesn’t necessarily give the best result.') },
  },
  {
    id: 'knaptable', ch: 9, title: T('背包表', 'Knapsack table'), short: T('会伸缩的来路', 'A reach that stretches'), mode: 'circuit', robot: 'reach',
    intro: [
      { t: T('把装包也做成表。行是物品，列是背包容量 0、1、2……格子 (第 i 行, 容量 w) 记着：<b>只从前 i 件物品里挑、背包容量是 w 时，最多能装多少价值</b>。', 'Turn packing into a table too. Rows are items and columns are backpack capacities 0, 1, 2… Cell (row i, capacity w) records: <b>the most value you can pack choosing only from the first i items, with a backpack of capacity w</b>.'), fig: knapFig() },
      { t: T('第 0 行是「一件都还没考虑」，所以全是 0，机器已经替你填好了。', 'Row 0 means “no items considered yet”, so it is all 0s, and the machine has already filled it in.'), fig: knapFig({ show: i => i === 0, cls: i => (i === 0 ? 'lit' : '') }) },
      { t: T('只看最后一件：第 i 件物品，要么<b>不拿</b>，要么<b>拿</b>。不拿的话，答案和正上方那一格一样。', 'Look only at the last item: item i is either <b>left out</b> or <b>taken</b>. If it is left out, the answer is the same as the cell right above.'), fig: knapFig({ show: (i, w) => i < 2 || w < 3, cls: (i, w) => (i === 2 && w === 3 ? 'sel' : i === 1 && w === 3 ? 'lit' : ''), edges: [['1,3', '2,3', 'hot']] }) },
      { t: T('拿的话呢？背包得先给它腾出空间。想一想：腾出空间<b>之前</b>，背包是表里的哪一格？拿上它以后又多了什么？最后，拿和不拿，你要的是哪一个？', 'And if it is taken? The backpack first has to make room for it. Think: <b>before</b> making room, which cell of the table is the backpack? What do you gain by taking the item? And in the end, between taking and leaving it, which do you want?'), fig: knapFig({ show: (i, w) => i < 2 || w < 3, cls: (i, w) => (i === 2 && w === 3 ? 'sel' : '') }) },
      { t: T('这一关的机器人「长臂」站在 (第 i 行, 容量 w) 上。正上方的格子在视野里就能看到；可往左「重量」格可能很远，视野装不下。这就要用它的<b>伸缩臂</b>：视野下面的「伸缩臂」会伸到往左「这件物品的重量」格，上一行、本行各读一格，你可以点亮它要读的格子。「本格信息」里是这件物品的「物品价值」。', 'This level’s robot, Longarm, stands on (row i, capacity w). The cell right above is in its view, but the cell as many columns to the left as the item weighs may be far away, out of view. That is what its <b>telescopic arm</b> is for: the “Arm” under the view reaches left by “this item’s weight” cells and reads one cell on the row above and one on this row, and you can light up the cell you want it to read. The This cell panel holds this item’s “item value”.') },
    ],
    mission: { goal: T('总重量不能超过容量，每件物品最多拿一次。拼出背包表的电路，算出每个背包最多能装多少价值。', 'The total weight can’t exceed the capacity, and each item can be taken at most once. Build the knapsack table’s circuit and work out the most value each backpack can hold.'), how: T('前两个测试，就是你上一关亲手装过的背包。通过后，绿色格子是倒推出的装法。', 'The first two tests are the backpacks you packed by hand last level. Once you pass, the green cells show the packing traced back from the table.') },
    world: 'knap', facts: ['value'], palette: KIT,
    tests: [PACK_A, PACK_B, PACK_C],
    solution: circ([['a', 'add'], ['m', 'mmax']], ['tap:upk>a:0', 'tap:value>a:1', 'tap:up>m:0', 'a>m:1', 'm>out:cell']),
    hints: [
      T('每件物品都可以不拿：不拿的话，答案就是「正上方」。', 'Any item can be left out: then the answer is just “right above”.'),
      T('拿这件物品：先在上一行腾出它的重量，再加上它的价值。两种选择接进「取较大」汇合器。', 'Taking this item: make room for its weight on the row above, then add its value. Wire both choices into a “max” Merger.'),
    ],
    diagnose: c => (usesTap(c, 'rowk') ? tr('同一行的格子已经考虑过这件物品了，从那里再拿，就把它拿了两次。要拿这件，得从上一行腾地方。', 'Cells on the same row have already considered this item, so taking it again from there takes it twice. To take this item, make room on the row above.') : null),
    trace: t => ({ path: knapTrace(t).cells }),
    after(t, view) {
      if (!view || !view.end || !view.pass) return '';
      const chosen = knapTrace(t).picked.map(k => t.items[k]);
      return `<div class="afterbox"><span class="eyebrow">${tr('倒推出的装法', 'The packing, traced back')}</span><div class="diff">${chosen.map(it => `<span class="dt ins">${it.n}<small>${it.w} kg · ${it.v}</small></span>`).join('')}</div><p class="cap">${tr(`一共 ${chosen.reduce((s, it) => s + it.w, 0)} kg，价值 <b>${chosen.reduce((s, it) => s + it.v, 0)}</b>。`, `${chosen.reduce((s, it) => s + it.w, 0)} kg in all, value <b>${chosen.reduce((s, it) => s + it.v, 0)}</b>.`)}</p></div>`;
    },
    boardOpt: { minScale: 0.68, maxScale: 1.15 },
    unlock: 'pack',
    debrief: { title: T('0/1 背包', '0/1 knapsack'), body: [T('每件物品只有两种命运：不拿（看正上方），或者拿（去上一行腾出它的重量，再加上它的价值），两者取较大。', 'Each item has only two fates: left out (look right above), or taken (make room for its weight on the row above, then add its value). Take the larger of the two.'), T('来路必须从<b>上一行</b>出发。上一行还没考虑过这件物品，从那里拿，才能保证它只被拿一次。', 'The way in must start from <b>the row above</b>. The row above hasn’t considered this item yet, so taking it from there guarantees it is taken only once.'), T('这个问题叫 <b>0/1 背包</b>。选课、做预算、装货柜、给服务器分配任务，背后都是它。', 'This problem is called the <b>0/1 knapsack</b>. Choosing courses, budgeting, loading shipping containers and assigning jobs to servers all come down to it.')], note: T('0/1 背包：不拿看正上方；拿就从上一行腾出重量，再加价值。', '0/1 knapsack: leave it out, look right above; take it, make room for its weight on the row above and add its value.') },
  },
  {
    id: 'roll', ch: 9, title: T('压成一行', 'Squash it into one row'), short: T('改写的方向决定含义', 'The rewrite direction is the meaning'), mode: 'circuit', robot: 'reach', uses: ['pack'],
    intro: [
      { t: T('仔细看背包表：每一行只用到<b>上一行</b>。那何必留着整张表？只留一行，每处理一件物品，就在这一行上原地改写。', 'Look closely at the knapsack table: each row only uses <b>the row above</b>. So why keep the whole table? Keep just one row, and rewrite it in place for each item.'), fig: knapFig({ cls: i => (i === 0 ? 'dimc' : 'lit'), edges: [['1,3', '2,3', 'dim'], ['1,2', '2,3', 'dim']] }) },
      { t: T('原地改写有个风险：改 dp[w] 时要读 dp[w − 重量]。如果那一格<b>这一轮已经改过</b>，读到的就是「已经拿过这件物品」的值。', 'Rewriting in place carries a risk: rewriting dp[w] reads dp[w − weight]. If that cell <b>has already been rewritten this round</b>, what you read is a value where the item “has already been taken”.'), fig: { cells: [0, 1, 2, 3, 4].map(w => ({ id: `d${w}`, x: w * 56, y: 0, w: 46, h: 46, value: [0, 2, 4, '?', ''][w], corner: w, cls: w === 3 ? 'hot' : w === 1 ? 'bad' : w < 3 ? 'lit' : '' })), edges: [E('d1', 'd3', 'bad', -36)] } },
      { t: T('这一关有两种背包：<b>每件最多拿一次</b>的，和<b>每件可以拿很多次</b>的（比如商店里每种东西都有很多件）。电路板不难：新的 dp[w] = 取较大（旧的 dp[w]，dp[w − 重量] + 价值）。视野里的红框 dp[w] 既是写入新值的地方，也可以点亮它，读出改写前的旧值；dp[w − 重量] 交给伸缩臂去读。', 'This level has two kinds of backpack: one where <b>each item can be taken at most once</b>, and one where <b>each item can be taken many times</b> (like a shop with plenty of everything). The board isn’t hard: new dp[w] = max(old dp[w], dp[w − weight] + value). The red frame dp[w] in the view is where the new value is written, and you can also light it up to read the old value before it is rewritten; dp[w − weight] is read by the arm.') },
      { t: T('真正的难点是机器上的两个<b>方向开关</b>：处理一件物品时，从左往右改写，还是从右往左？给两种背包各拨一个方向。', 'The real puzzle is the machine’s two <b>direction switches</b>: when handling an item, do you rewrite from left to right, or from right to left? Set a direction for each kind of backpack.') },
    ],
    mission: { goal: T('一种背包每件最多拿一次，另一种每件可以拿很多次，总重量都不能超过容量。拼好电路，再为两种背包各拨一个方向，让四个测试都算对。', 'In one kind of backpack each item can be taken at most once; in the other, many times. Either way, the total weight can’t exceed the capacity. Build the circuit, then set a direction for each kind so that all four tests come out right.'), how: T('方向开关在电路板下面。黄色是正在改写的格子；红色表示读到了这一轮刚改过的值。', 'The direction switches are under the circuit board. Yellow is the cell being rewritten; red means a value rewritten earlier this round was read.') },
    world: 'roll', facts: ['value'], palette: KIT, noTrace: true,
    dirs: { '01': 'asc', inf: 'desc' }, solutionDirs: { '01': 'desc', inf: 'asc' },
    tests: [
      { kind: '01', W: 6, items: [{ n: T('罐头', 'can'), w: 1, v: 1 }, { n: T('雨衣', 'raincoat'), w: 3, v: 4 }, { n: T('毯子', 'blanket'), w: 4, v: 5 }] },
      { kind: 'inf', W: 7, items: [{ n: T('苹果', 'apple'), w: 2, v: 3 }, { n: T('西瓜', 'melon'), w: 3, v: 5 }] },
      { kind: '01', W: 7, items: PACK_C.items },
      { kind: 'inf', W: 9, items: [{ n: T('面粉', 'flour'), w: 5, v: 9 }, { n: T('大米', 'rice'), w: 3, v: 5 }, { n: T('白糖', 'sugar'), w: 2, v: 3 }] },
    ],
    solution: circ([['a', 'add'], ['m', 'mmax']], ['tap:src>a:0', 'tap:value>a:1', 'tap:old>m:0', 'a>m:1', 'm>out:cell']),
    diagnose(c, st) {
      if (!['old', 'src', 'value'].every(id => usesTap(c, id))) return tr('电路板：新的 dp[w] = 取较大（旧的 dp[w]，dp[w − 重量] + 价值）。三个输入都要点亮。', 'The circuit board: new dp[w] = max(old dp[w], dp[w − weight] + value). All three inputs need to be lit.');
      if (st.dirs['01'] !== 'desc') return tr('每件最多拿一次：改 dp[w] 时，要让 dp[w − 重量] 读到的还是旧值。dp[w − 重量] 在 dp[w] 的哪一边？', 'At most once each: when rewriting dp[w], dp[w − weight] must still hold its old value. Which side of dp[w] is dp[w − weight] on?');
      if (st.dirs.inf !== 'asc') return tr('每件可以拿很多次：读到「已经拿过这件」的新值，正是我们想要的。', 'Many times each: reading a new value where the item “has already been taken” is exactly what we want.');
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
