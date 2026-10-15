// Chapter 9: greedy fails, the knapsack table works, and one in-place row works if it scans the right way.

import { E, knapFig } from '../svg.js';
import { circ, usesTap } from '../circuit/components.js';
import { knapTrace } from '../algo.js';
import { PACK_A, PACK_B, PACK_C } from './data.js';

const KIT = ['msum', 'mmin', 'mmax', 'add', 'const', 'pass', 'block'];

export const knapsack = [
  {
    id: 'pack', ch: 8, title: '装背包', short: '聪明的捷径不总是对的', mode: 'pack',
    intro: [
      { t: '新的一章：装背包。出门旅行，背包有重量上限。每件东西有重量和价值，<b>每件最多带一个</b>。怎么装，带上的价值最大？' },
      { t: '人们常用两种「捷径」：<b>最贵的先放</b>，或者<b>最划算的先放</b>（每千克的价值最高）。按顺序挨个看，装得下就装。这种每一步都挑眼前最好的做法，叫作<b>贪心</b>。' },
      { t: '这一关有两道题。规则面板里有两个「自动装包」按钮，分别按这两种捷径装包。先试试它们，再自己动手，装出目标价值。' },
    ],
    mission: { goal: '两道题里，都装出目标价值。', how: '点物品放进或拿出背包。规则面板里的两个按钮会按捷径自动装包，可以试试它们。' },
    tests: [PACK_A, PACK_B],
    debrief: { title: '没有简单的捷径', body: ['第 1 题里，「最贵的先放」差了一点；第 2 题里，「最划算的先放」也差了一点。<b>看起来很聪明的贪心规则，总有例外。</b>', '最保险的办法是把所有装法都试一遍。5 件物品有 32 种装法，还试得过来；30 件物品就有 10 亿多种。', '下一关换个思路：用表格，只看最后一件物品是拿还是不拿。'], note: '贪心（每一步挑眼前最好的）不一定得到最好的结果。' },
  },
  {
    id: 'knaptable', ch: 8, title: '背包表', short: '会伸缩的来路', mode: 'circuit',
    intro: [
      { t: '把装包也做成表。行是物品，列是背包容量 0、1、2……格子 (第 i 行, 容量 w) 记着：<b>只从前 i 件物品里挑、背包容量是 w 时，最多能装多少价值</b>。', fig: knapFig() },
      { t: '第 0 行是「一件都还没考虑」，所以全是 0，机器已经替你填好了。', fig: knapFig({ show: i => i === 0, cls: i => (i === 0 ? 'lit' : '') }) },
      { t: '只看最后一件：第 i 件物品，要么<b>不拿</b>，要么<b>拿</b>。不拿的话，答案和正上方那一格一样。', fig: knapFig({ show: (i, w) => i < 2 || w < 3, cls: (i, w) => (i === 2 && w === 3 ? 'sel' : i === 1 && w === 3 ? 'lit' : ''), edges: [['1,3', '2,3', 'hot']] }) },
      { t: '拿的话，背包要先给它腾出空间：去<b>上一行、往左「它的重量」格</b>的位置，再加上它的价值。这是一条会伸缩的来路，物品越重，伸得越远。两种选择取较大。', fig: knapFig({ show: (i, w) => i < 2 || w < 3, cls: (i, w) => (i === 2 && w === 3 ? 'sel' : i === 1 && w === 2 ? 'lit' : ''), edges: [['1,2', '2,3', 'hot']] }) },
      { t: '机器人的视野：右边一列是容量 w，左边一列是容量 w − 重量（往左够不着时是「界外」），上面一行是上一件物品，下面一行是这一件。「本格信息」里是这件物品的「物品价值」。' },
    ],
    mission: { goal: '拼出背包表的电路，算出每个背包最多能装多少价值。', how: '前两个测试，就是你上一关亲手装过的背包。通过后，绿色格子是倒推出的装法。' },
    world: 'knap', taps: ['up', 'upk', 'rowk', 'value'], palette: KIT, slots: 6,
    tests: [PACK_A, PACK_B, PACK_C],
    solution: circ([['a', 'add'], ['m', 'mmax']], ['tap:upk>a:0', 'tap:value>a:1', 'tap:up>m:0', 'a>m:1', 'm>out:cell']),
    hints: [
      '每件物品都可以不拿：不拿的话，答案就是「正上方」。',
      '拿这件物品：先在上一行腾出它的重量，再加上它的价值。两种选择接进「取较大」汇合器。',
    ],
    diagnose: c => (usesTap(c, 'rowk') ? '同一行的格子已经考虑过这件物品了，从那里再拿，就把它拿了两次。要拿这件，得从上一行腾地方。' : null),
    trace: t => ({ path: knapTrace(t).cells }),
    after(t, view) {
      if (!view || !view.end || !view.pass) return '';
      const chosen = knapTrace(t).picked.map(k => t.items[k]);
      return `<div class="afterbox"><span class="eyebrow">倒推出的装法</span><div class="diff">${chosen.map(it => `<span class="dt ins">${it.n}<small>${it.w} kg · ${it.v}</small></span>`).join('')}</div><p class="cap">一共 ${chosen.reduce((s, it) => s + it.w, 0)} kg，价值 <b>${chosen.reduce((s, it) => s + it.v, 0)}</b>。</p></div>`;
    },
    boardOpt: { minScale: 0.68, maxScale: 1.15 },
    unlock: 'pack',
    debrief: { title: '0/1 背包', body: ['每件物品只有两种命运：不拿（看正上方），或者拿（去上一行腾出它的重量，再加上它的价值），两者取较大。', '来路必须从<b>上一行</b>出发。上一行还没考虑过这件物品，从那里拿，才能保证它只被拿一次。', '这个问题叫 <b>0/1 背包</b>。选课、做预算、装货柜、给服务器分配任务，背后都是它。'], note: '0/1 背包：不拿看正上方；拿就从上一行腾出重量，再加价值。' },
  },
  {
    id: 'roll', ch: 8, title: '压成一行', short: '改写的方向决定含义', mode: 'circuit', uses: ['pack'],
    intro: [
      { t: '仔细看背包表：每一行只用到<b>上一行</b>。那何必留着整张表？只留一行，每处理一件物品，就在这一行上原地改写。', fig: knapFig({ cls: i => (i === 0 ? 'dimc' : 'lit'), edges: [['1,3', '2,3', 'dim'], ['1,2', '2,3', 'dim']] }) },
      { t: '原地改写有个风险：改 dp[w] 时要读 dp[w − 重量]。如果那一格<b>这一轮已经改过</b>，读到的就是「已经拿过这件物品」的值。', fig: { cells: [0, 1, 2, 3, 4].map(w => ({ id: `d${w}`, x: w * 56, y: 0, w: 46, h: 46, value: [0, 2, 4, '?', ''][w], corner: w, cls: w === 3 ? 'hot' : w === 1 ? 'bad' : w < 3 ? 'lit' : '' })), edges: [E('d1', 'd3', 'bad', -36)] } },
      { t: '这一关有两种背包：<b>每件最多拿一次</b>的，和<b>每件可以拿很多次</b>的（比如商店里每种东西都有很多件）。电路板不难：新的 dp[w] = 取较大（旧的 dp[w]，dp[w − 重量] + 价值）。视野里的红框 dp[w] 既是写入新值的地方，也可以点亮它，读出改写前的旧值。' },
      { t: '真正的难点是机器上的两个<b>方向开关</b>：处理一件物品时，从左往右改写，还是从右往左？给两种背包各拨一个方向。' },
    ],
    mission: { goal: '拼好电路，再为两种背包各拨一个方向，让四个测试都算对。', how: '方向开关在电路板下面。黄色是正在改写的格子；红色表示读到了这一轮刚改过的值。' },
    world: 'roll', taps: ['old', 'src', 'value'], palette: KIT, slots: 6, noTrace: true,
    dirs: { '01': 'asc', inf: 'desc' }, solutionDirs: { '01': 'desc', inf: 'asc' },
    tests: [
      { kind: '01', W: 6, items: [{ n: '罐头', w: 1, v: 1 }, { n: '雨衣', w: 3, v: 4 }, { n: '毯子', w: 4, v: 5 }] },
      { kind: 'inf', W: 7, items: [{ n: '苹果', w: 2, v: 3 }, { n: '西瓜', w: 3, v: 5 }] },
      { kind: '01', W: 7, items: PACK_C.items },
      { kind: 'inf', W: 9, items: [{ n: '面粉', w: 5, v: 9 }, { n: '大米', w: 3, v: 5 }, { n: '白糖', w: 2, v: 3 }] },
    ],
    solution: circ([['a', 'add'], ['m', 'mmax']], ['tap:src>a:0', 'tap:value>a:1', 'tap:old>m:0', 'a>m:1', 'm>out:cell']),
    diagnose(c, st) {
      if (!['old', 'src', 'value'].every(id => usesTap(c, id))) return '电路板：新的 dp[w] = 取较大（旧的 dp[w]，dp[w − 重量] + 价值）。三个输入都要点亮。';
      if (st.dirs['01'] !== 'desc') return '每件最多拿一次：改 dp[w] 时，要让 dp[w − 重量] 读到的还是旧值。dp[w − 重量] 在 dp[w] 的哪一边？';
      if (st.dirs.inf !== 'asc') return '每件可以拿很多次：读到「已经拿过这件」的新值，正是我们想要的。';
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
      if (t.kind === '01' && s) { const it = t.items[s.cell.item]; return `处理「${it.n}」（${it.w} kg）时，改 dp[${s.cell.w}] 要读 dp[${s.cell.src}]，可 dp[${s.cell.src}] 在这一轮已经改过，里面已经放了一个${it.n}。于是${it.n}又被放了一次。`; }
      if (t.kind === 'inf' && st.dirs.inf === 'desc') return '这一题每种东西可以拿很多件。从右往左改写时，dp[w − 重量] 总是旧值，每种东西都只被拿了一次。';
      return '';
    },
    after(t, view) {
      const on = view && !view.end && view.k ? view.res.steps[view.k - 1].cell.item : -1;
      return `<div class="afterbox"><span class="eyebrow">物品 · ${t.kind === '01' ? '每件最多拿一次' : '每件可以拿很多次'}</span><div class="diff">${t.items.map((it, k) => `<span class="dt${k === on ? ' on' : ''}">${it.n}<small>${it.w} kg · ${it.v}</small></span>`).join('')}</div></div>`;
    },
    boardOpt: { minScale: 0.66, maxScale: 1.15 },
    unlock: 'roll',
    debrief: { title: '方向就是含义', body: ['从右往左改写时，dp[w − 重量] 还没被这件物品改过，读到的是旧值，所以<b>每件最多拿一次</b>。', '从左往右改写时，dp[w − 重量] 可能已经拿过这件物品，再拿一次正好，所以<b>每件可以拿很多次</b>。', '同一块电路板，只是方向不同，解决的就是两个不同的问题。这种只留一行的写法叫<b>滚动数组</b>，能把几千行的表压成一行。'], note: '一行原地改写：从右往左，每件一次；从左往右，每件无限次。' },
  },
];
