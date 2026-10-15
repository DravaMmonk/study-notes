// Chapter 8: compare two strings on an alignment table.

import { N, E, linkFig, tableFig } from '../svg.js';
import { circ } from '../circuit/components.js';
import { lcsTable, lcsTrace, editTable, editTrace } from '../algo.js';

const KIT = ['msum', 'mmin', 'mmax', 'add', 'const', 'pass', 'block'];
const passed = view => !!view && view.end && view.pass;

export const strings = [
  {
    id: 'link', ch: 7, title: '连线不交叉', short: '找出两串字共同的部分', mode: 'link',
    intro: [
      { t: '新的一章：比较两串文字。在两串字里<b>按顺序</b>都出现过的一串字，叫作它们的<b>公共子序列</b>。比如 ABCD 和 ACBD 里，A、B、D 就是一个。', fig: linkFig('ABCD', 'ACBD', [[0, 0], [1, 2], [3, 3]]) },
      { t: '找公共子序列可以用连线：上下两个字相同，就连一根线。规则有三条：<b>只能连相同的字；每个字最多连一根线；线不能交叉。</b>' },
      { t: '为什么不能交叉？交叉说明这两个字在上面的顺序，和在下面的顺序是反的，读出来就不是同一串了。', fig: linkFig('ABCD', 'ACBD', [[1, 2], [2, 1]], [[1, 2], [2, 1]]) },
      { t: '连上的线越多，公共子序列就越长。目标：<b>连出尽可能多的线。</b>' },
    ],
    mission: { goal: '两道题里，都连出最多的线。', how: '先点一个字，再点另一行里相同的字，就连上一根线。点一个已经连线的字，可以拆掉它的线。' },
    tests: [{ a: 'CABD', b: 'ABCD' }, { a: 'ABCBDAB', b: 'BDCABA' }],
    hints: ['先别连 C。C 在上面排第一，在下面排第三，连了它，A 和 B 就都连不上了。试试 A、B、D。', '目标是 4 根。B、C、B、A 是一种连法，B、D、A、B 是另一种。'],
    debrief: { title: '最长公共子序列', body: ['你连出的线，从左往右读，就是两串字共有的一串，叫作<b>公共子序列</b>。最多能连几根，就是<b>最长公共子序列</b>的长度。', '它的用途很多：比较两份文件改了哪里、比对两段 DNA 有多像、判断两份作业是不是抄的。', '四五个字还能试出来，可两段 DNA 动辄上万个字母，不可能一根根地试。下一关，把它交给表格。'], note: '公共子序列：两串字里，按顺序都出现的一串。连线不能交叉。' },
  },
  {
    id: 'lcs', ch: 7, title: '对齐表', short: '让表格替你连线', mode: 'circuit',
    intro: [
      { t: '字一多，连线就很难试全了。我们把它交给一张新的表：<b>对齐表</b>。一个词写在上面，一个词写在左边。', fig: tableFig('ABD', 'BD', () => '', { cls: () => '' }) },
      { t: '格子 (行, 列) 记着：<b>左边词的前「行」个字，和上面词的前「列」个字，最长能连几根线</b>。右下角就是整个答案。', fig: tableFig('ABD', 'BD', [[0, 0, 0, 0], [0, 0, 1, 1], [0, 0, 1, 2]], { cls: (i, j) => (i === 2 && j === 3 ? 'sel' : 'lit') }) },
      { t: '第 0 行和第 0 列表示「一个字都没有」。空的那一边连不出任何线，所以全是 0，机器已经替你填好了。', fig: tableFig('ABD', 'BD', (i, j) => (i && j ? '' : 0), { cls: (i, j) => (i && j ? '' : 'lit') }) },
      { t: '还是只看最后一步。如果这一行和这一列的字<b>相同</b>，就能把它们连一根线：答案是<b>左上角的数 + 1</b>。', fig: tableFig('ABD', 'BD', (i, j) => (i === 2 && j === 3 ? '?' : i === 1 && j === 2 ? 1 : ''), { cls: (i, j) => (i === 2 && j === 3 ? 'sel eq' : i === 1 && j === 2 ? 'lit' : ''), edges: [['1,2', '2,3', 'hot']] }) },
      { t: '如果两个字<b>不同</b>，它们至少有一个连不上线：丢掉这一行的字（看上面），或者丢掉这一列的字（看左边），取较好的那个。', fig: tableFig('ABD', 'BD', (i, j) => (i === 2 && j === 2 ? '?' : i === 1 && j === 2 ? 1 : i === 2 && j === 1 ? 0 : ''), { cls: (i, j) => (i === 2 && j === 2 ? 'sel' : (i === 1 && j === 2) || (i === 2 && j === 1) ? 'lit' : ''), edges: [['1,2', '2,2', 'hot'], ['2,1', '2,2', 'hot']] }) },
      { t: '机器人的视野里是它左上、上面、左边三个格子，旁边标着这一行、这一列的字。「本格信息」里的「两字相同」告诉你，红框这一行和这一列的字是不是一样。拼一块电路板吧。' },
    ],
    mission: { goal: '拼出对齐表的电路，算出最长公共子序列有几个字。', how: '前两个测试，就是你上一关亲手连过的两道题。通过后，看看表格里藏着的连线。' },
    world: 'align', border0: true, taps: ['ul', 'up', 'left', 'same'], palette: KIT, slots: 6,
    tests: [{ top: 'CABD', left: 'ABCD' }, { top: 'ABCBDAB', left: 'BDCABA' }, { top: 'GATTACA', left: 'CATTAG' }],
    solution: circ([['k', 'const', 1], ['a', 'add'], ['g', 'pass'], ['m', 'mmax']], ['tap:ul>a:0', 'k>a:1', 'tap:same>g:0', 'a>g:1', 'tap:up>m:0', 'tap:left>m:1', 'g>m:2', 'm>out:cell']),
    hints: [
      '两个字相同时才能连线：这时从左上来，再 + 1。用放行闸，条件接「两字相同」。',
      '两个字不同时，至少有一个连不上：要么丢掉这一行的字（看上面），要么丢掉这一列的字（看左边）。',
      '要连得最多：把上面、左边和放行闸都接进「取较大」汇合器。',
    ],
    trace(t) {
      const tr = lcsTrace(t.top, t.left, lcsTable(t.top, t.left));
      return { path: tr.cells.map(p => p.join(',')), okTop: new Set(tr.pairs.map(p => p[0])), okLeft: new Set(tr.pairs.map(p => p[1])) };
    },
    after(t, view) {
      if (!passed(view)) return '';
      const { pairs } = lcsTrace(t.top, t.left, lcsTable(t.top, t.left)), ma = new Set(pairs.map(p => p[0])), mb = new Set(pairs.map(p => p[1]));
      return `<div class="afterbox"><span class="eyebrow">表格里藏着的连线</span>
        <div class="diff">${[...t.top].map((ch, j) => `<span class="dt${ma.has(j) ? ' ins' : ''}">${ch}</span>`).join('')}</div>
        <div class="diff">${[...t.left].map((ch, i) => `<span class="dt${mb.has(i) ? ' ins' : ''}">${ch}</span>`).join('')}</div>
        <p class="cap">从右下角沿绿色格子倒推，每走一次对角线，就是一根连线。公共子序列：<b>${pairs.map(p => t.top[p[0]]).join(' ')}</b></p></div>`;
    },
    boardOpt: { minScale: 0.66, maxScale: 1.2 },
    unlock: 'align',
    debrief: { title: '表格替你连好了线', body: ['在对齐表里，<b>每走一次对角线，就是连了一根线</b>。只有字相同才能走对角线，而路线总是从左上走向右下，所以线永远不会交叉。', '7 个字对 6 个字，亲手试要试很久，表格只填了 56 个格子。两段一万个字母的 DNA，也只要填一亿个格子，电脑一眨眼就能算完。'], note: '对齐表：字相同，左上 + 1；不同，取上面和左边中较大的。' },
  },
  {
    id: 'edit', ch: 7, title: '改错字', short: '每条来路都有代价', mode: 'circuit', uses: ['align'],
    intro: [
      { t: '输入法会帮你改错字。它要回答一个问题：把一个词改成另一个词，<b>最少要几步</b>？' },
      { t: '每一步只能做一件事：<b>删掉</b>一个字、<b>插入</b>一个字，或者把一个字<b>换成</b>另一个字。比如 CAT → CUT 只要 1 步：把 A 换成 U。', fig: { cells: [...'CAT'].map((ch, i) => ({ id: `a${i}`, x: i * 54, y: 0, w: 44, h: 44, value: ch, cls: i === 1 ? 'tile bad' : 'tile ok' })).concat([...'CUT'].map((ch, i) => ({ id: `b${i}`, x: i * 54, y: 110, w: 44, h: 44, value: ch, cls: i === 1 ? 'tile hot' : 'tile ok' }))), edges: [E('a0', 'b0', 'link'), E('a1', 'b1', 'hot'), E('a2', 'b2', 'link')] } },
      { t: '还是对齐表：行是原来的词，列是目标词。格子记着「把原词的前几个字，改成目标词的前几个字」最少要几步。三个邻居各有含义：', fig: { cells: [N('ul', 0, 0, { w: 96, h: 70, label: '左上', sub: '保留或替换' }), N('u', 116, 0, { w: 96, h: 70, label: '上面', sub: '删掉一个字' }), N('l', 0, 90, { w: 96, h: 70, label: '左边', sub: '插入一个字' }), N('c', 116, 90, { w: 96, h: 70, label: '本格', cls: 'sel' })], edges: [E('ul', 'c', 'hot'), E('u', 'c', 'hot'), E('l', 'c', 'hot')] } },
      { t: '每条来路都有自己的<b>代价</b>：从这条路来，要多花几步。删、插、换都要多花 1 步；两个字相同时，从左上来可以直接保留，不花步数。' },
      { t: '这一次，第 0 行和第 0 列<b>没有现成的数</b>，也要由电路来算。想一想：把原词的前 3 个字改成空词，要几步？两边都是空词时呢？' },
    ],
    mission: { goal: '拼出改错字的电路，算出把一个词改成另一个词的最少步数。', how: '这块电路板要用到好几个元件。通过后，看看表格倒推出的具体改法。' },
    world: 'align', border0: false, taps: ['ul', 'up', 'left', 'same', 'start'], palette: KIT, slots: 8,
    tests: [{ left: 'CAT', top: 'CUT' }, { left: 'HORSE', top: 'ROS' }, { left: 'KITTEN', top: 'SITTING' }],
    testLabel: t => `${t.left} → ${t.top}`,
    solution: circ([['k', 'const', 1], ['n', 'mmin'], ['a', 'add'], ['z', 'const', 0], ['g0', 'pass'], ['g1', 'pass'], ['m', 'mmin']], [
      'tap:up>n:0', 'tap:left>n:1', 'tap:ul>n:2', 'n>a:0', 'k>a:1',
      'tap:same>g1:0', 'tap:ul>g1:1', 'tap:start>g0:0', 'z>g0:1', 'a>m:0', 'g1>m:1', 'g0>m:2', 'm>out:cell',
    ]),
    hints: [
      '删掉一个字（从上面来）、插入一个字（从左边来）、换掉一个字（从左上来），都要多花 1 步：把三个邻居接进「取较小」，再用加法器 + 1。',
      '两个字相同时，可以直接保留：从左上来，不花步数。用放行闸，条件接「两字相同」，数接「左上」。',
      '起点（两边都是空词）是 0 步：「是起点」放行一个 0。最后把这三路都接进另一个「取较小」汇合器。',
    ],
    trace: t => ({ path: editTrace(t.left, t.top, editTable(t.left, t.top)).cells.map(p => p.join(',')) }),
    after(t, view) {
      if (!passed(view)) return '';
      const { ops } = editTrace(t.left, t.top, editTable(t.left, t.top)), n = ops.filter(o => o.k !== 'keep').length;
      const tile = o => (o.k === 'keep' ? `<span class="dt">${o.a}<small>保留</small></span>` : o.k === 'rep' ? `<span class="dt rep">${o.a}→${o.b}<small>替换</small></span>` : o.k === 'del' ? `<span class="dt del"><s>${o.a}</s><small>删除</small></span>` : `<span class="dt ins">+${o.b}<small>插入</small></span>`);
      return `<div class="afterbox"><span class="eyebrow">表格倒推出的改法 · ${n} 步</span><div class="diff">${ops.map(tile).join('')}</div><p class="cap">从右下角倒推：走对角线是保留或替换，往上是删除，往左是插入。</p></div>`;
    },
    boardOpt: { minScale: 0.66, maxScale: 1.2 },
    unlock: 'cost',
    debrief: { title: '编辑距离', body: ['把一个词改成另一个词的最少步数，叫作<b>编辑距离</b>。输入法纠错、搜索引擎的「你是不是要找」、基因突变分析，用的都是它。', '和上一关比，表格的形状一点没变，只是<b>给每条来路标上代价，再取较小</b>。连边上的一行一列，也是同一块电路算出来的。同一张对齐表，换一块电路板，就能回答另一个问题。'], note: '编辑距离：删除、插入、替换各 + 1，字相同可以免费保留，取较小。' },
  },
];
