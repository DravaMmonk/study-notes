// Chapter 7: when one number per cell cannot tell histories apart, the state needs another layer.

import { N, E, gridScene, houseRow, layerFig } from '../svg.js';
import { circ } from '../circuit/components.js';
import { STREET, KEY_MAPS } from './data.js';

const KIT = ['msum', 'mmin', 'mmax', 'add', 'const', 'pass', 'block'];

function robConflict(a) {
  const tile = (j, on, ask) => `<span class="hs${on ? ' on' : ''}${ask ? ' ask' : ''}">${a[j]}<small>${j + 1}号</small></span>`;
  return `<div class="cx"><div class="kicker bad">反例</div>
    <p class="cx-p">看第 1 条街的前两家。下面两段历史走到 2 号时，在一行的机器里落进<b>同一个格子</b>：</p>
    <div class="cx-row"><header><b>历史 A</b><span>偷了 2 号 · 共 ${a[1]}</span></header><div class="houses">${tile(0)}${tile(1, true)}<span class="arrow">→</span>${tile(2, false, true)}</div><span class="verdict no">不能偷 3 号：它和 2 号相邻</span></div>
    <div class="cx-row"><header><b>历史 B</b><span>偷了 1 号 · 共 ${a[0]}</span></header><div class="houses">${tile(0, true)}${tile(1)}<span class="arrow">→</span>${tile(2, false, true)}</div><span class="verdict yes">可以偷 3 号：${a[0]} + ${a[2]} = ${a[0] + a[2]}</span></div>
    <p class="cx-p">一个格子只能存一个数。它记住了更大的 ${a[1]}（历史 A），就忘掉了历史 B。可走到 3 号时，最好的 ${a[0] + a[2]} 恰恰来自 B。<b>要让机器分清 A 和 B，格子得多记一件事：这家偷没偷。</b></p></div>`;
}

export const state = [
  {
    id: 'robber', ch: 6, title: '不能连着偷', short: '一个数记不住全部', mode: 'circuit',
    intro: [
      { t: '新的一章，一个新难题。一条街上有一排房子，每家藏着一些钱。小偷<b>不能连着偷相邻的两家</b>，否则会触发警报。最多能偷到多少钱？', fig: { cells: houseRow(STREET), edges: [] } },
      { t: '比如偷 1 号、3 号、5 号，一共 2 + 9 + 1 = <b>12</b>。偷 2 号和 4 号，只有 7 + 3 = 10。', fig: { cells: houseRow(STREET, j => (j % 2 ? 'dimc' : 'hot')), edges: [] } },
      { t: '这一章的机器很省内存：<b>每家只能看见上一家的格子</b>。电路板上，「上一格」是上一家那一格的数，「这家的钱」是这家藏的钱。', fig: { cells: [0, 1, 2, 3].map(i => ({ id: `f${i}`, x: i * 62, y: 0, w: 52, h: 52, value: '', corner: i, cls: i === 3 ? 'sel' : i === 2 ? 'lit' : 'dimc' })), edges: [E('f0', 'f1', 'dim'), E('f1', 'f2', 'dim'), E('f2', 'f3', 'hot')] } },
      { t: '要钱最多，合并时应该取较大，元件里新添了「取较大」汇合器。先试试只用一行格子，每格记「看完前 i 家，最多偷到多少」。<b>如果失败了，请仔细读失败的原因</b>，它会告诉你一件很重要的事。' },
    ],
    mission: { goal: '算出每条街最多能偷多少钱。', how: '先拼一块电路板试试。这一关的第一次失败在计划之中，请仔细读失败的原因。' },
    tests: [{ a: STREET }, { a: [5, 1, 1, 5] }, { a: [4, 10, 3, 1, 8, 6] }],
    stages: [
      {
        world: 'rob1', taps: ['prev', 'money'], palette: KIT, fresh: ['mmax'], slots: 6,
        onFail: ({ L, k, res, advance }) => ({
          head: '一个数记不住全部',
          body: `第 ${k + 1} 条街最多能偷 <b>${L.expected[k]}</b>，机器算出了 <b>${res.value ?? '—'}</b>。可这次的问题不在电路：只要每家只有一个格子，怎么拼都会出错。看这个反例：`,
          extra: robConflict(STREET),
          cta: { label: '给状态加一层', fn: advance },
          hint: null,
        }),
      },
      {
        world: 'rob2', taps: ['pn', 'pr', 'money'], palette: KIT, slots: 6,
        unlockToast: '解锁了「分层」：现在每家有三个格子',
        tip: '现在每家有三个格子：「这家没偷」「这家偷了」「最多偷到」。输入口「上家没偷」「上家偷了」是上一家前两个格子的数。第 0 家还没开始：没偷 = 0，偷了 = —（不可能）。',
        solution: circ([['n', 'mmax'], ['a', 'add'], ['b', 'mmax']], ['tap:pn>n:0', 'tap:pr>n:1', 'tap:pn>a:0', 'tap:money>a:1', 'n>b:0', 'a>b:1', 'n>out:no', 'a>out:yes', 'b>out:best']),
        hints: [
          '这家不偷的话，上一家偷没偷都可以：没偷 = 取较大（上家没偷，上家偷了）。',
          '上一家没偷，这家才可以偷：偷了 = 上家没偷 + 这家的钱。',
          '看完这一家，它可能偷了，也可能没偷：最多 = 取较大（没偷，偷了）。',
        ],
      },
    ],
    unlock: 'layer',
    debrief: { title: '多记一件事，问题就解开了', body: ['每家只有一个格子时，这个格子要同时代表「这家偷了」和「这家没偷」，可它们的未来不一样：前者不能偷下一家，后者可以。', '加了一层之后，每种情况<b>各有自己的格子</b>，机器就不会再混淆了。', '<strong>好的状态，要记住所有会影响未来的信息。</strong>这是设计动态规划时最难、也最重要的一步。'], note: '状态要记住所有会影响未来的信息。不够，就加一层。' },
  },
  {
    id: 'breach', ch: 6, title: '找出破绽', short: '这次你来找反例', mode: 'breach',
    world: { R: 4, C: 5, key: [1, 0], doors: [[1, 3], [3, 2]] },
    intro: [
      { t: '一座迷宫，只能往右或往下走。其中一格放着<b>钥匙</b>，有的格子是<b>门</b>：拿过钥匙的人才能穿过门。', fig: gridScene(3, 4, { cell: (r, c) => (r === 1 && c === 0 ? { label: '钥匙', cls: 'key' } : r === 1 && c === 2 ? { label: '门', cls: 'door' } : r === 0 && c === 0 ? { corner: '起' } : r === 2 && c === 3 ? { corner: '终' } : {}) }) },
      { t: '你的老朋友「路线计数器」被派来数路线。可它的状态只记一件事：<b>现在在哪一格</b>。' },
      { t: '两条路线走到同一格，一条拿了钥匙，一条没拿，计数器会把它们存进<b>同一个格子</b>。可它们的未来不一样：前面是门的时候，一条能过，一条过不去。', fig: { cells: [N('a', 0, 0, { w: 56, h: 56, value: 'A B', cls: 'rab' }), N('b', 66, 0, { w: 56, h: 56, value: 'B', cls: 'rb' }), N('c', 132, 0, { w: 56, h: 56 }), N('d', 0, 66, { w: 56, h: 56, label: '钥匙', value: 'A', cls: 'key ra' }), N('e', 66, 66, { w: 56, h: 56, value: '?', cls: 'sel' }), N('f', 132, 66, { w: 56, h: 56, label: '门', cls: 'door' })], edges: [E('a', 'd', 'ra'), E('d', 'e', 'ra'), E('a', 'b', 'rb'), E('b', 'e', 'rb'), E('e', 'f', 'dim')] } },
      { t: '「状态相同、未来不同」的两段历史，叫作<b>反例</b>。上一关，机器替你找出了反例。这一关，你来亲手找一个，证明只记位置是不够的。' },
    ],
    mission: { goal: '画两条路线，证明只记位置的计数器会出错。', how: '在规则面板里选择路线 A 或 B，从起点开始点格子，只能往右或往下。点路线的最后一格可以撤销。画好后点「检验」。' },
    hintText: '钥匙在第 2 行最左边。让一条路线先往下拿钥匙，另一条先往右走，再让它们在某扇门的左边或上面汇合。',
    debrief: { title: '你找到了一个反例', body: ['两条路线停在同一格，只记位置的计数器会把它们存进同一个格子。可一条带着钥匙、一条空着手，下一步一个能过门、一个过不去。', '<b>状态相同、未来不同</b>，这就是状态设计有漏洞的铁证。', '修好它的办法你已经知道了：让状态多记一件事。下一关，把迷宫叠成两层。'], note: '反例：两段历史落进同一个状态，未来却不一样。' },
  },
  {
    id: 'keydoor', ch: 6, title: '钥匙与门', short: '把棋盘叠成两层', mode: 'circuit', uses: ['counter', 'layer'],
    intro: [
      { t: '要修好计数器，就让状态多记一件事：<b>有没有钥匙</b>。办法是把棋盘复制一份，叠成两层。', fig: layerFig() },
      { t: '上层装着「没钥匙」的路线，下层装着「有钥匙」的路线。所有路线都从<b>上层的起点</b>出发。' },
      { t: '走到钥匙格的那一刻，路线就从上层<b>搬到</b>下层，之后一直待在下层。', fig: layerFig({ xfer: true }) },
      { t: '这块电路板有两个输出口：「上层」和「下层」，分别是这一格在两层里的数。输入口也有两套：「上层·上面」是上层里上面那一格的数，以此类推。另外还有「是起点」「是钥匙格」「是门」三个信号。' },
      { t: '你要想清楚三件事：两层的门分别怎么处理？钥匙格上，上层的路线要去哪？下层怎么接住它们？两个路线计数器，加上几道闸门和一个汇合器，就够了。' },
    ],
    mission: { goal: '让两层电路算对每张地图上的合法路线数。', how: '合法路线只能往右或往下走，穿过门之前必须拿过钥匙。终点的答案 = 上层终点 + 下层终点。' },
    world: 'key', taps: ['tu', 'tl', 'bu', 'bl', 'start', 'key', 'door'], palette: ['bp:stamp', ...KIT], slots: 8,
    tests: KEY_MAPS,
    solution: circ([['c1', 'bp:stamp'], ['t', 'block'], ['u', 'block'], ['c2', 'bp:stamp'], ['g', 'pass'], ['m', 'msum']], [
      'tap:tu>c1:0', 'tap:tl>c1:1', 'tap:start>c1:2', 'tap:door>t:0', 'c1>t:1', 'tap:key>u:0', 't>u:1', 'u>out:top',
      'tap:bu>c2:0', 'tap:bl>c2:1', 'tap:key>g:0', 't>g:1', 'c2>m:0', 'g>m:1', 'm>out:bot',
    ]),
    hints: [
      '上层的路线都没有钥匙，走不进门：上层的路线计数器后面接一道拦截闸，条件接「是门」。',
      '走到钥匙格，路线就离开了上层：上层在钥匙格要输出「—」。再加一道拦截闸，条件接「是钥匙格」。',
      '下层要在钥匙格接住上层搬来的路线：用放行闸（条件接「是钥匙格」）把上层这一格的数，和下层自己的路线计数器一起接进汇合器。下层的门照常通过。',
    ],
    boardOpt: { minScale: 0.62, maxScale: 1.15 },
    debrief: { title: '两层棋盘，各管各的', body: ['上层只装「没钥匙」的路线，所以门要拦下；下层只装「有钥匙」的路线，门可以照常通过。', '钥匙格是两层之间唯一的通道，路线在这里从上层搬到下层。到了终点，两层的路线都合法，所以相加。', '这是给状态加一维的标准做法：<b>把表复制几份，每份代表一种情况，再规定它们之间怎么转移</b>。程序员把这种结构叫作「状态机」。'], note: '加一维 = 把表复制几层，每层一种情况，再规定层与层之间怎么转移。' },
  },
];
