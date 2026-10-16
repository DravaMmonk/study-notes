// Chapter 14: design the state — which keys must the table remember? Every remembered key doubles the layers.

import { E, sceneSVG, gridScene } from '../svg.js';
import { circ } from '../circuit/components.js';
import { KEY_COLORS, layerName } from '../circuit/worlds/maze.js';

const KIT = ['msum', 'mmin', 'mmax', 'add', 'const', 'pass', 'block'];
const BOARD = circ([['c', 'bp:stamp'], ['b1', 'block'], ['b2', 'block'], ['p', 'msum'], ['g', 'pass'], ['m', 'msum']], [
  'tap:up>c:0', 'tap:left>c:1', 'tap:start>c:2', 'tap:shut>b1:0', 'c>b1:1', 'tap:lose>b2:0', 'b1>b2:1',
  'tap:upPrev>p:0', 'tap:leftPrev>p:1', 'tap:gain>g:0', 'p>g:1', 'b2>m:0', 'g>m:1', 'm>out:cell',
]);
const at = (t, r, c, what) => (what === 'key' ? Object.keys(t.keys).find(k => t.keys[k].join() === `${r},${c}`) : (t.doors.find(d => d.at.join() === `${r},${c}`) || {}).color);

/** Every right/down route through the maze. */
function routes(t) {
  const out = [];
  (function go(r, c, acc) { acc = [...acc, [r, c]]; if (r === t.R - 1 && c === t.C - 1) { out.push(acc); return; } if (r + 1 < t.R) go(r + 1, c, acc); if (c + 1 < t.C) go(r, c + 1, acc); })(0, 0, []);
  return out;
}
/** Walk a route: is it legal, and would a machine that remembers only `rem` count it? */
function walk(t, path, rem) {
  const held = new Set();
  let legal = true, counted = true, door = null;
  for (const [r, c] of path) {
    const k = at(t, r, c, 'key'), d = at(t, r, c, 'door');
    if (k) held.add(k);
    if (d && !held.has(d)) { legal = false; door = door || d; if (rem.includes(d)) counted = false; }
  }
  return { legal, counted, door };
}
/** A hint when the state forgets a color the level's doors need. */
const forgot = need => (c, st) => { const miss = need.filter(x => !st.mem[st.stage].includes(x)); return miss.length ? `状态没有记住${miss.map(x => KEY_COLORS[x].n).join('、')}钥匙：机器分不清一条路线拿没拿过它，碰到那种颜色的门，只好全都放过去。` : null; };
const mazeFig = (t, path = []) => {
  const on = new Set(path.map(p => p.join())), sc = gridScene(t.R, t.C, {
    arrows: false,
    cell: (r, c) => { const k = at(t, r, c, 'key'), d = at(t, r, c, 'door'); return { label: k ? `${KEY_COLORS[k].n}钥` : d ? `${KEY_COLORS[d].n}门` : '', corner: r + c === 0 ? '起' : r === t.R - 1 && c === t.C - 1 ? '终' : '', cls: [k ? `key ${KEY_COLORS[k].cls}` : d ? `door ${KEY_COLORS[d].cls}` : '', on.has(`${r},${c}`) ? 'path' : ''].join(' ') }; },
  });
  for (let q = 0; q + 1 < path.length; q++) sc.edges.push(E(path[q].join(), path[q + 1].join(), 'good'));
  return sc;
};

/** On a wrong answer: a route the forgetful machine counted although it went through a door without its key. */
function counter(t, res, o) {
  const p = routes(t).find(x => { const w = walk(t, x, o.remember || []); return w.counted && !w.legal; });
  if (!p) return '';
  const d = walk(t, p, o.remember || []).door, n = KEY_COLORS[d].n;
  return `<div class="cx"><div class="kicker bad">它算错的一条路线</div><div class="fig">${sceneSVG(mazeFig(t, p), { pad: 10, maxScale: 1 })}</div>
    <p class="cx-p">这条路线没拿${n}钥匙，就穿过了${n}门。可状态没有记住${n}钥匙：在${layerName(o.remember || [])}这一层里，拿没拿${n}钥匙的路线落进了同一个格子，机器分不清，只好把${n}门当成开着的。</p></div>`;
}

export const states = [
  {
    id: 'twokeys', ch: 13, title: '两把钥匙', short: '表要叠几层，你来定', mode: 'circuit', robot: 'stack',
    intro: [
      { t: '第 8 章的「钥匙与门」只有一把钥匙，表叠成两层：没钥匙、有钥匙。这一关有<b>红、蓝两把钥匙</b>，也有红门和蓝门。', fig: mazeFig({ R: 3, C: 4, keys: { red: [1, 0], blue: [0, 2] }, doors: [{ at: [1, 3], color: 'blue' }, { at: [2, 2], color: 'red' }] }) },
      { t: '表该叠成几层？这次由你决定。电路板上方有一张卡片「状态记住什么」：每记住一把钥匙，表的层数就翻一倍，每一层装着「手里正好有这几把钥匙」的路线。' },
      { t: '机器人「千层」在每一格上，把每一层都算一遍。它看得见这一层的 3×3，也看得见<b>旁边那层</b>：在捡钥匙的格子上，就是少一把这种钥匙的那一层，路线从那里搬上来。' },
      { t: '「本格信息」有四条：<b>是起点</b>；<b>捡到本层的钥匙</b>（这一格有钥匙，本层正该有它）；<b>钥匙会把路线带走</b>（这一格有钥匙，本层却没有它，走到这里的路线都会捡起它，搬去别的层）；<b>门对本层关着</b>。' },
      { t: '电路板管的是「某一层里的一格」，所有的层共用同一块电路板。想想第 8 章那块电路板：门、钥匙格和搬家，分别是怎么处理的？' },
    ],
    mission: { goal: '只能往右或往下走，穿过一扇门之前，必须先捡到同色的钥匙。选好状态要记住哪几把钥匙，再拼一块电路板，算对合法路线的条数。', how: '状态卡片在电路板上方。答案 = 每一层终点的路线数加起来。没通过时，机器会给你看一条它算错的路线。' },
    world: 'keys', facts: ['start', 'gain', 'lose', 'shut'], palette: ['bp:stamp', ...KIT], memory: ['red', 'blue'], solutionMem: ['red', 'blue'], noTrace: true,
    tests: [
      { R: 3, C: 4, keys: { red: [1, 0], blue: [0, 2] }, doors: [{ at: [1, 3], color: 'blue' }, { at: [2, 2], color: 'red' }] },
      { R: 4, C: 4, keys: { red: [0, 1], blue: [2, 0] }, doors: [{ at: [2, 2], color: 'red' }, { at: [1, 3], color: 'blue' }, { at: [3, 1], color: 'blue' }] },
    ],
    solution: BOARD,
    counter,
    hints: [
      '两种颜色的门都要检查：两把钥匙都要记住，表变成 4 层。',
      '路线计数器算本层的路线；门对本层关着，拦下；这一格的钥匙会把路线带走，也拦下。',
      '捡到本层钥匙的格子：路线从旁边那层搬上来。用放行闸（条件接「捡到本层的钥匙」）放进那层的上面 + 左边，再和本层的结果加起来。',
    ],
    diagnose: forgot(['red', 'blue']),
    unlock: 'multikey',
    boardOpt: { minScale: 0.55, maxScale: 1.1 },
    debrief: { title: '状态由你来设计', body: ['两把钥匙，四种可能：都没有、只有红、只有蓝、都有。每种可能一层，表就有了 4 层。', '电路板只写了一份，在每一层上照样运行：哪些门关着、钥匙把路线带去哪一层，都由「本格信息」告诉它。<b>设计状态，就是决定表要分几层，层与层之间怎么搬。</b>'], note: '状态 = 会影响未来的事。记几把钥匙，就有 2 的几次方层。' },
  },
  {
    id: 'threekeys', ch: 13, title: '三把钥匙', short: '每多记一件事，表就翻一倍', mode: 'circuit', robot: 'stack', uses: ['multikey'],
    intro: [
      { t: '再加一把<b>绿钥匙</b>和一扇绿门。三把钥匙，表要叠几层？' },
      { t: '上一关的电路板已经替你接好了。这一关只看状态：打开开关的时候，留意卡片上的格数怎么变。' },
    ],
    mission: { goal: '三把钥匙、三种颜色的门。让状态记住该记的钥匙，算对合法路线的条数。', how: '电路板已经接好。打开状态开关，看看表一共有多少格。' },
    world: 'keys', facts: ['start', 'gain', 'lose', 'shut'], palette: ['bp:stamp', ...KIT], memory: ['red', 'blue', 'green'], solutionMem: ['red', 'blue', 'green'], noTrace: true,
    preset: BOARD,
    tests: [
      { R: 4, C: 5, keys: { red: [1, 0], blue: [0, 2], green: [2, 1] }, doors: [{ at: [1, 3], color: 'red' }, { at: [2, 3], color: 'blue' }, { at: [3, 2], color: 'green' }] },
      { R: 4, C: 5, keys: { red: [0, 1], blue: [2, 0], green: [1, 2] }, doors: [{ at: [3, 1], color: 'red' }, { at: [1, 4], color: 'green' }, { at: [2, 3], color: 'blue' }, { at: [3, 3], color: 'green' }] },
    ],
    solution: BOARD,
    counter,
    hints: ['三种颜色的门都在路上：三把钥匙都得记住。'],
    diagnose: forgot(['red', 'blue', 'green']),
    boardOpt: { minScale: 0.5, maxScale: 1 },
    debrief: { title: '状态爆炸', body: ['三把钥匙，8 层；十把钥匙，1,024 层；二十把，一百多万层。每多记一件事，表就翻一倍。', '这叫<b>状态爆炸</b>：记得越多越保险，可表也越大。下一关看看，是不是每件事都非记不可。'], note: '每多记一件事，表就翻一倍：状态爆炸。' },
  },
  {
    id: 'enough', ch: 13, title: '记得够不够', short: '只记会影响未来的事', mode: 'circuit', robot: 'stack', uses: ['multikey'],
    intro: [
      { t: '还是三把钥匙。可这座迷宫里，<b>有的钥匙根本不影响结果</b>。' },
      { t: '记得太少，答案会错；记得太多，表会很大。这一关要用<b>最少的层</b>算对。' },
      { t: '想一想，一把钥匙什么时候值得记？如果没有那种颜色的门呢？如果走到那扇门之前，一定会先经过那把钥匙呢？' },
    ],
    mission: { goal: '三把钥匙。只记会影响结果的钥匙，用最少的层算对合法路线的条数。', how: '电路板已经接好。开关状态试试：记少了，机器会给你看一条它算错的路线；记多了，会提醒你还能更省。' },
    world: 'keys', facts: ['start', 'gain', 'lose', 'shut'], palette: ['bp:stamp', ...KIT], memory: ['red', 'blue', 'green'], solutionMem: ['red'], minLayers: 2, noTrace: true,
    preset: BOARD,
    tests: [
      { R: 4, C: 5, keys: { red: [2, 0], blue: [0, 1], green: [1, 3] }, doors: [{ at: [2, 2], color: 'red' }, { at: [0, 2], color: 'blue' }] },
      { R: 5, C: 5, keys: { red: [1, 1], blue: [0, 2], green: [3, 0] }, doors: [{ at: [3, 3], color: 'red' }, { at: [0, 3], color: 'blue' }, { at: [2, 4], color: 'red' }] },
    ],
    solution: BOARD,
    counter,
    hints: ['绿钥匙：迷宫里有绿门吗？', '蓝门在第一行。只能往右或往下走，要走到它，一定会先经过蓝钥匙：走到蓝门的路线都有蓝钥匙，记不记都一样。', '只记红钥匙就够了：2 层。'],
    unlock: 'state',
    boardOpt: { minScale: 0.5, maxScale: 1 },
    debrief: { title: '刚好够用', body: ['绿钥匙没有门；蓝门之前一定先捡到蓝钥匙。这两件事<b>不影响未来</b>，不用记。只记红钥匙，2 层就够了，比 8 层小 4 倍。', '好的状态要<b>刚好够用</b>：会影响未来的事一件都不能漏，不影响的一件也不多记。'], note: '只记会影响未来的事：记少了会错，记多了会爆。' },
  },
];
