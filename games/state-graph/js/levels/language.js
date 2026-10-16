// Chapter 17: language and sequences — tagging words (cheapest, then summed probabilities), spelling, counting parse
// trees on the interval table, and the most alike stretch of two strings.

import { circ, usesTap } from '../circuit/components.js';
import { editTable } from '../algo.js';
import { TAGS, TAG } from '../circuit/worlds/tags.js';

const KIT = ['msum', 'mmin', 'mmax', 'add', 'const', 'pass', 'block'];
const COST = {
  start: { N: 0, V: 2, A: 2 },
  trans: { N: { N: 3, V: 0, A: 2 }, V: { N: 0, V: 3, A: 2 }, A: { N: 0, V: 2, A: 3 } },
};
const PROB = {
  start: { N: 0.6, V: 0.3, A: 0.1 },
  trans: { N: { N: 0.2, V: 0.6, A: 0.2 }, V: { N: 0.7, V: 0.1, A: 0.2 }, A: { N: 0.8, V: 0.1, A: 0.1 } },
};
const sent = (words, emit, model) => ({ words, emit, ...model });

/** The tagging table for intro pages: tags down the side, the start column and the words across, costs in the corners. */
function tagFig(t, val = () => '', cls = () => '') {
  const sp = 64, cells = [], texts = [];
  ['句首', ...t.words].forEach((w, c) => cells.push({ id: `w${c}`, x: c * sp, y: -sp + 14, w: 56, h: 30, value: w, cls: `axis${c ? '' : ' axis0'}` }));
  TAGS.forEach((g, r) => {
    texts.push({ x: -38, y: r * sp + 5, t: TAG[g].n, anchor: 'end', cls: 'hd' });
    for (let c = r ? 1 : 0; c <= t.words.length; c++) { const e = c ? t.emit[c - 1][g] : undefined; cells.push({ id: `${r},${c}`, x: c * sp, y: r * sp, w: 56, h: 56, value: c ? val(r, c) : 0, corner: c ? (e === undefined ? '×' : e) : '', cls: [c ? cls(r, c) : 'lit', c && e === undefined ? 'dimc' : ''].filter(Boolean).join(' ') }); }
  });
  return { cells, edges: [], texts };
}
const S1 = sent(['他', '研究', '历史'], [{ N: 0 }, { N: 2, V: 1 }, { N: 0 }], COST);

/** Every way to tag a sentence, with its total cost: the cheapest one is what the table finds. */
function bestTags(t) {
  let best = null;
  (function go(k, prev, acc, cost) {
    if (k === t.words.length) { if (!best || cost < best.cost) best = { tags: acc, cost }; return; }
    TAGS.forEach(g => { const e = t.emit[k][g]; if (e === undefined) return; go(k + 1, g, [...acc, g], cost + e + (k ? t.trans[prev][g] : t.start[g])); });
  })(0, null, [], 0);
  return best;
}
/** The cells a local alignment walks back through, from the best cell to where the score started from 0. */
function localTrace(t) {
  const L = t.left, T = t.top, f = Array.from({ length: L.length + 1 }, () => Array(T.length + 1).fill(0)), sc = (i, j) => (L[i - 1] === T[j - 1] ? 2 : -1);
  let bi = 0, bj = 0;
  for (let i = 1; i <= L.length; i++) for (let j = 1; j <= T.length; j++) {
    f[i][j] = Math.max(f[i - 1][j - 1] + sc(i, j), f[i - 1][j] - 1, f[i][j - 1] - 1, 0);
    if (f[i][j] > f[bi][bj]) { bi = i; bj = j; }
  }
  const cells = [`${bi},${bj}`], okTop = new Set(), okLeft = new Set();
  for (let i = bi, j = bj; f[i][j] > 0;) {
    if (f[i][j] === f[i - 1][j - 1] + sc(i, j)) { if (sc(i, j) > 0) { okTop.add(j - 1); okLeft.add(i - 1); } i--; j--; }
    else if (f[i][j] === f[i - 1][j] - 1) i--;
    else j--;
    cells.push(`${i},${j}`);
  }
  return { path: cells, okTop, okLeft };
}
const passed = view => !!view && view.end && view.pass;

export const language = [
  {
    id: 'tagging', ch: 16, title: '猜词性', short: '每个词是名词还是动词', mode: 'circuit', robot: 'reach',
    intro: [
      { t: '新的一章，把动态规划用到句子上。「他研究历史」里，「研究」是<b>动词</b>；「这项研究」里，它是<b>名词</b>。电脑怎么判断一句话里每个词的词性？' },
      { t: '两条线索：一个词<b>当某种词性的代价</b>（「研究」当动词更常见，代价小），和<b>前后两个词性接在一起的代价</b>（名词后面接动词很自然，代价 0；名词后面再接名词，代价 3）。整句的代价，是这些代价加起来。挑总代价最小的那种标法。' },
      { t: '还是一张表：行是三种词性，列是句子里的词，最左边是「句首」，存着 0。格子 (词性, 第几个词) 记：<b>前面这些词标好、这个词标成这种词性，最少要多少代价</b>。格子角上的小数字，是这个词当这种词性的代价；× 表示不可能。', fig: tagFig(S1, (r, c) => (r === 1 && c === 2 ? '?' : ''), (r, c) => (r === 1 && c === 2 ? 'sel' : '')) },
      { t: '只看最后一步：上一个词是三种词性中的哪一种？三种可能都算一遍：上一个词那一格的代价 + 「跟在那种词性后」的代价，挑最小的，再加上「这个词这么标」的代价。机器人用伸缩臂读上一个词的三格；第一个词前面只有句首，伸缩臂只读到句首那一格，「跟在名词后」那一项就是从句首开始的代价。' },
    ],
    mission: { goal: '算出给整句话标词性的最小总代价：每个词当这种词性的代价，加上相邻两个词性接在一起的代价。', how: '本格信息里有「跟在名词 / 动词 / 形容词后」的代价，和「这个词这么标」的代价。通过后，看看表倒推出的标法。' },
    world: 'tags', facts: ['tN', 'tV', 'tA', 'emit'], palette: KIT,
    tests: [
      S1,
      sent(['进口', '彩电', '质量', '好'], [{ N: 1, V: 1 }, { N: 0 }, { N: 0 }, { A: 0, V: 2 }], COST),
      sent(['研究', '生命', '起源'], [{ N: 2, V: 1 }, { N: 0 }, { N: 0, V: 1 }], COST),
    ],
    solution: circ([['a', 'add'], ['b', 'add'], ['c', 'add'], ['m', 'mmin'], ['e', 'add']], ['tap:pN>a:0', 'tap:tN>a:1', 'tap:pV>b:0', 'tap:tV>b:1', 'tap:pA>c:0', 'tap:tA>c:1', 'a>m:0', 'b>m:1', 'c>m:2', 'm>e:0', 'tap:emit>e:1', 'e>out:cell']),
    hints: ['上一个词是名词的话：「前词是名词」那一格 + 「跟在名词后」的代价。动词、形容词也各算一遍。', '三种可能取较小，再加上「这个词这么标」的代价。'],
    trace(t) { const b = bestTags(t); return { path: b.tags.map((g, k) => `${TAGS.indexOf(g)},${k + 1}`) }; },
    after(t, view) {
      if (!passed(view)) return '';
      const b = bestTags(t);
      return `<div class="afterbox"><span class="eyebrow">表倒推出的标法 · 代价 ${b.cost}</span><div class="diff">${t.words.map((w, k) => `<span class="dt ins">${w}<small>${TAG[b.tags[k]].n}</small></span>`).join('')}</div><p class="cap">「进口彩电质量好」里，「进口」当成了动词。看第一个词，名词和动词一样便宜；是后面的词让动词胜出了。</p></div>`;
    },
    unlock: 'viterbi',
    boardOpt: { minScale: 0.62, maxScale: 1.15 },
    debrief: { title: '维特比算法', body: ['每一列每一种词性，表里都记着「到这里最省的解释」。最后一列里最小的，就是整句最好的标法；沿绿色格子倒推，就能读出每个词的词性。', '这叫<b>维特比算法</b>。语音识别把声音变成字、手机输入法把拼音变成词，用的都是这张表：一列一个时刻，一行一种可能。'], note: '维特比：上一列每一行 + 跟在它后面的代价，取较小，再加这个词这么标的代价。' },
  },
  {
    id: 'forward', ch: 16, title: '这句话有多可能', short: '取较小换成加起来，加换成乘', mode: 'circuit', robot: 'reach', uses: ['viterbi'],
    intro: [
      { t: '换个问题：不问「最好的标法是哪一种」，而问「把<b>所有</b>标法都算上，这句话出现的可能性有多大」。' },
      { t: '代价换成<b>可能性</b>（0 到 1 之间的数）：一条标法的可能性，是一路上所有可能性<b>乘起来</b>；整句的可能性，是所有标法<b>加起来</b>。句首存着 1。' },
      { t: '和上一关比一比：「加」换成「乘」，「取较小」换成「加起来」。第 11 章里，数路线就是把所有路线加起来；这里是把所有标法加起来。' },
      { t: '格子底下的小条，是这一格在这一列里占多大：条越长，这个词越可能是这种词性。' },
    ],
    mission: { goal: '算出这句话出现的可能性：所有标法的可能性之和。每条标法的可能性，是一路上「跟在谁后面」和「这个词这么标」的可能性乘起来。', how: '和上一关的电路几乎一样：加法器换成乘法器，「取较小」换成「加起来」。' },
    world: 'tags', facts: ['tN', 'tV', 'tA', 'emit'], palette: [...KIT, 'mul'], prob: true,
    tests: [
      sent(['他', '研究', '历史'], [{ N: 0.5 }, { N: 0.2, V: 0.4 }, { N: 0.3 }], PROB),
      sent(['进口', '彩电', '质量', '好'], [{ N: 0.2, V: 0.3 }, { N: 0.4 }, { N: 0.3 }, { A: 0.5, V: 0.1 }], PROB),
    ],
    solution: circ([['a', 'mul'], ['b', 'mul'], ['c', 'mul'], ['s', 'msum'], ['e', 'mul']], ['tap:pN>a:0', 'tap:tN>a:1', 'tap:pV>b:0', 'tap:tV>b:1', 'tap:pA>c:0', 'tap:tA>c:1', 'a>s:0', 'b>s:1', 'c>s:2', 's>e:0', 'tap:emit>e:1', 'e>out:cell']),
    hints: ['上一个词是名词的可能：「前词是名词」 × 「跟在名词后」的可能性。三种都算。', '三种加起来，再乘上「这个词这么标」的可能性。'],
    diagnose: c => (c.nodes.some(n => n.kind === 'mmin' || n.kind === 'mmax') ? '这次不挑最好的一条：所有标法都算数，用「加起来」。' : null),
    boardOpt: { minScale: 0.62, maxScale: 1.15 },
    debrief: { title: '前向算法', body: ['同一张表，同一副骨架：维特比「取较小、加起来」，这里「加起来、乘起来」。前者找最好的一条，后者把所有的都算上。', '这叫<b>前向算法</b>。语音识别要比较「这段声音更像哪句话」，就是用它算每句话的可能性。'], note: '前向算法：把维特比的「取较小、加」换成「加起来、乘」。' },
  },
  {
    id: 'spell', ch: 16, title: '你是想打这个词吗', short: '编辑距离，用在纠错上', mode: 'circuit', robot: 'ranger', uses: ['cost'],
    intro: [
      { t: '你打出了 ACROS。词典里有几个候选词，哪个离它<b>最近</b>？' },
      { t: '「最近」就是改动最少：第 9 章的<b>编辑距离</b>。你在那一关拼出的电路板，已经变成了零件箱里的「编辑距离器」。' },
      { t: '每个测试是一个候选词。三个测试都通过后，看看哪个候选词的步数最少。' },
    ],
    mission: { goal: '算出打错的词 ACROS 和每个候选词之间的编辑距离（删、插、换各算 1 步）。', how: '「编辑距离器」在托盘里，接好它的五个输入就行。' },
    world: 'align', border0: false, facts: ['same', 'start'], palette: ['bp:edit', ...KIT],
    tests: [{ left: 'ACROS', top: 'ACROSS' }, { left: 'ACROS', top: 'CROSS' }, { left: 'ACROS', top: 'MACRO' }],
    testLabel: t => `${t.left} → ${t.top}`,
    solution: circ([['e', 'bp:edit']], ['tap:ul>e:0', 'tap:up>e:1', 'tap:left>e:2', 'tap:same>e:3', 'tap:start>e:4', 'e>out:cell']),
    hints: ['编辑距离器的五个口：左上、上面、左边、两字相同、是起点，照着接。'],
    after(t, view, st) {
      if (!passed(view) || st.status.some(x => x !== 'pass')) return '';
      const rows = [{ top: 'ACROSS' }, { top: 'CROSS' }, { top: 'MACRO' }].map(x => ({ ...x, d: editTable(t.left, x.top)[t.left.length][x.top.length] })).sort((a, b) => a.d - b.d);
      return `<div class="afterbox"><span class="eyebrow">候选词 · 按步数排</span><div class="diff">${rows.map((x, k) => `<span class="dt${k ? '' : ' ins'}">${x.top}<small>${x.d} 步</small></span>`).join('')}</div><p class="cap">最近的是 <b>${rows[0].top}</b>：输入法就会问你「是不是想打 ${rows[0].top}」。</p></div>`;
    },
    debrief: { title: '纠错', body: ['输入法和搜索框的「你是不是要找」，就是这样做的：把打出来的词和词典里的候选词一一比较，挑编辑距离最小的。', '你没有重新拼电路，只是把第 9 章的零件拿过来，接到新问题上。'], note: '纠错：和每个候选词算编辑距离，挑最小的。' },
  },
  {
    id: 'parse', ch: 16, title: '句子的骨架', short: '一句话有几种读法', mode: 'circuit', robot: 'broom', uses: ['interval'],
    intro: [
      { t: '「咬死了猎人的狗」：是狗咬死了猎人，还是猎人的狗被咬死了？同一串词，<b>两两合并成短语</b>的方式不同，意思就不同。合并的过程画出来，就是一棵<b>句法树</b>。' },
      { t: '假设任何两段相邻的词都能合并。一串词一共有几种不同的合并方式？还是区间表：格子 (i, j) 记「第 i 到第 j 个词有几种合并方式」。单个词只有 1 种，对角线已经填好。' },
      { t: '最后一次合并，把左边一段和右边一段合起来。在某个切分点，左边有几种方式、右边有几种方式，<b>两边随便搭配</b>，这个切分点就有「左 × 右」种。所有切分点<b>加起来</b>。' },
      { t: '第 13 章的合并石子用的是「左 + 右，取较小」；这里是「左 × 右，加起来」。扫帚的扫描臂照样按切分点送来左段们和右段们，乘法器也能一对一对地乘。' },
    ],
    mission: { goal: '一串词两两合并成短语，直到合成一整句。算出一共有几种不同的合并方式（几棵句法树）。', how: '扫描臂送来每个切分点的左段和右段。' },
    world: 'interval', facts: [], palette: [...KIT, 'mul'], diag: 1,
    tests: [{ words: ['咬死了', '猎人的', '狗'] }, { words: ['我', '看见', '他', '笑'] }, { words: ['白', '天', '鹅', '飞', '过'] }],
    solution: circ([['x', 'mul'], ['s', 'msum']], ['tap:segL>x:0', 'tap:segR>x:1', 'x>s:0', 's>out:cell']),
    hints: ['每个切分点：左段的方式数 × 右段的方式数。把「左段们」和「右段们」接进同一个乘法器。', '所有切分点的结果都算数：接进「加起来」。'],
    boardOpt: { minScale: 0.6, maxScale: 1.15 },
    debrief: { title: '句法分析', body: ['3 个词 2 种，4 个词 5 种，5 个词 14 种：这串数叫<b>卡特兰数</b>，词一多就飞快地变大。所以电脑分析句子时，不会把每一棵树都列出来，而是用这张区间表一格一格地算。', '真正的句法分析（叫 <b>CKY 算法</b>）还会查语法规则：哪两段能合并、合成什么。表的形状一模一样。'], note: '句法树：每个切分点「左 × 右」，再加起来。' },
  },
  {
    id: 'localalign', ch: 16, title: '找最像的一段', short: '低于 0 就重新开始', mode: 'circuit', robot: 'scout',
    intro: [
      { t: '两段长长的 DNA，整体并不像，可中间可能藏着一小段<b>非常像</b>的片段。怎么把它找出来？' },
      { t: '还是对齐表，第 0 行第 0 列都是 0。给每一步打分：字相同的一对 <b>+2</b>，不同的一对 <b>−1</b>，空一个位置（从上面或左边来）<b>−1</b>。「本格信息」里的「本格得分」，就是这一格这一对的 +2 或 −1。' },
      { t: '关键的一步：如果算出来的分数<b>低于 0</b>，就截成 0，意思是「前面的都不要了，从这里重新开始」。背着负分走下去，不如重新开始。' },
      { t: '最像的一段不一定在右下角，它可能出现在<b>表里任何地方</b>：答案是整张表里最大的那一格。' },
    ],
    mission: { goal: '找出两串字母里最相似的一段：字相同 +2，不同 −1，空位 −1，低于 0 就截成 0。答案是表里最大的分数。', how: '常数可以设成负数。通过后，看看表倒推出的那一段。' },
    world: 'local', border0: true, facts: ['score'], palette: KIT, consts: [-2, -1, 0, 1, 2],
    tests: [{ top: 'AGTACGCA', left: 'TATGC' }, { top: 'GGTTGACTA', left: 'TGTTACGG' }],
    solution: circ([['a', 'add'], ['b', 'add'], ['c', 'add'], ['k', 'const', -1], ['m', 'mmax'], ['z', 'const', 0], ['n', 'mmax']], ['tap:ul>a:0', 'tap:score>a:1', 'tap:up>b:0', 'k>b:1', 'tap:left>c:0', 'k>c:1', 'a>m:0', 'b>m:1', 'c>m:2', 'm>n:0', 'z>n:1', 'n>out:cell']),
    hints: ['三条来路：左上 + 本格得分；上面 − 1；左边 − 1。取较大。', '低于 0 就截成 0：再接一个「取较大」，另一个口接常数 0。'],
    diagnose: c => (!c.nodes.some(n => n.kind === 'const' && n.value === 0) && usesTap(c, 'score') ? '分数会变成负的。负分不如重新开始：再取一次较大，和常数 0 比一比。' : null),
    trace: t => localTrace(t),
    after(t, view) {
      if (!passed(view)) return '';
      const { okTop, okLeft } = localTrace(t);
      return `<div class="afterbox"><span class="eyebrow">最像的一段</span><div class="diff">${[...t.top].map((ch, j) => `<span class="dt${okTop.has(j) ? ' ins' : ''}">${ch}</span>`).join('')}</div><div class="diff">${[...t.left].map((ch, i) => `<span class="dt${okLeft.has(i) ? ' ins' : ''}">${ch}</span>`).join('')}</div><p class="cap">从最大的那一格倒推，一直退到 0 为止。</p></div>`;
    },
    unlock: 'local',
    boardOpt: { minScale: 0.62, maxScale: 1.15 },
    debrief: { title: '局部对齐', body: ['和最长公共子序列比，只多了一个「低于 0 就截成 0」，表就从「整体有多像」变成了「最像的一段在哪」。这个截断不用新元件：取较大，再和 0 比一比。', '这叫 <b>Smith-Waterman 算法</b>。生物学家在基因库里找相似的片段、查一段病毒和已知病毒有多像，用的就是它。'], note: '局部对齐：低于 0 就截成 0；答案在表里最大的那一格。' },
  },
];
