// Chapter 17: language and sequences — tagging words (cheapest, then summed probabilities), spelling, counting parse
// trees on the interval table, and the most alike stretch of two strings.

import { circ, usesSensor } from '../circuit/components.js';
import { editTable } from '../algo.js';
import { TAGS, TAG } from '../circuit/worlds/tags.js';
import { T, tr } from '../i18n.js';

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
const START = T('句首', 'start');
/** The words of the example sentences, glossed for English: the tagging data belongs to the position, not the word. */
const HE = T('他', 'he'), STUDY = T('研究', 'studies'), HISTORY = T('历史', 'history');
const IMPORT = T('进口', 'imports'), TV = T('彩电', 'TV'), QUALITY = T('质量', 'quality'), GOOD = T('好', 'fine');

/** The tagging table for intro pages: tags down the side, the start column and the words across, costs in the corners. */
function tagFig(t, val = () => '', cls = () => '') {
  const sp = 64, cells = [], texts = [];
  [START, ...t.words].forEach((w, c) => cells.push({ id: `w${c}`, x: c * sp, y: -sp + 14, w: 56, h: 30, value: w, cls: `axis${c ? '' : ' axis0'}${String(w).length > 3 ? ' word' : ''}` }));
  TAGS.forEach((g, r) => {
    texts.push({ x: -38, y: r * sp + 5, t: TAG[g].n, anchor: 'end', cls: 'hd' });
    for (let c = r ? 1 : 0; c <= t.words.length; c++) { const e = c ? t.emit[c - 1][g] : undefined; cells.push({ id: `${r},${c}`, x: c * sp, y: r * sp, w: 56, h: 56, value: c ? val(r, c) : 0, corner: c ? (e === undefined ? '×' : e) : '', cls: [c ? cls(r, c) : 'lit', c && e === undefined ? 'dimc' : ''].filter(Boolean).join(' ') }); }
  });
  return { cells, edges: [], texts };
}
const S1 = sent([HE, STUDY, HISTORY], [{ N: 0 }, { N: 2, V: 1 }, { N: 0 }], COST);

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
  const L = t.left, Tp = t.top, f = Array.from({ length: L.length + 1 }, () => Array(Tp.length + 1).fill(0)), sc = (i, j) => (L[i - 1] === Tp[j - 1] ? 2 : -1);
  let bi = 0, bj = 0;
  for (let i = 1; i <= L.length; i++) for (let j = 1; j <= Tp.length; j++) {
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
    id: 'tagging', ch: 16, title: T('猜词性', 'Guess the part of speech'), short: T('每个词是名词还是动词', 'Is each word a noun or a verb?'), mode: 'circuit', robot: 'reach',
    intro: [
      { t: T('新的一章，把动态规划用到句子上。「他研究历史」里，「研究」是<b>动词</b>；「这项研究」里，它是<b>名词</b>。电脑怎么判断一句话里每个词的词性？', 'A new chapter, putting dynamic programming to work on sentences. In “he studies history”, “studies” is a <b>verb</b>; in “these studies”, it is a <b>noun</b>. How does a computer decide the part of speech of every word in a sentence?') },
      { t: T('两条线索：一个词<b>当某种词性的代价</b>（「研究」当动词更常见，代价小），和<b>前后两个词性接在一起的代价</b>（名词后面接动词很自然，代价 0；名词后面再接名词，代价 3）。整句的代价，是这些代价加起来。挑总代价最小的那种标法。', 'Two clues: the <b>cost of a word taking a given part of speech</b> (“studies” is more often a verb, so that costs less), and the <b>cost of one part of speech following another</b> (a verb after a noun is natural, cost 0; another noun after a noun costs 3). The cost of the whole sentence is all of these added up. Pick the tagging with the smallest total cost.') },
      { t: T('还是一张表：行是三种词性，列是句子里的词，最左边是「句首」，存着 0。格子 (词性, 第几个词) 记：<b>前面这些词标好、这个词标成这种词性，最少要多少代价</b>。格子角上的小数字，是这个词当这种词性的代价；× 表示不可能。', 'It is a table again: rows are the three parts of speech, columns are the words of the sentence, and on the far left is “start”, holding 0. Cell (part of speech, word k) records: <b>with the words before it tagged, and this word tagged as this part of speech, the least it can cost</b>. The small number in a cell’s corner is the cost of this word taking this part of speech; × means it can’t.'), fig: tagFig(S1, (r, c) => (r === 1 && c === 2 ? '?' : ''), (r, c) => (r === 1 && c === 2 ? 'sel' : '')) },
      { t: T('只看最后一步：上一个词可能是三种词性里的任何一种。每种可能，要用到表里的哪一格、本格信息里的哪一项？三种可能里，你要的是哪一个？机器人用伸缩臂读上一个词的三格；第一个词前面只有句首，伸缩臂只读到句首那一格，「跟在名词后」那一项就是从句首开始的代价。', 'Look only at the last step: the previous word could be any of the three parts of speech. For each possibility, which cell of the table and which fact in the This cell panel do you need? Of the three, which one do you want? The robot reads the previous word’s three cells with its telescopic arm; before the first word there is only “start”, so the arm reads just that cell, and the “after a noun” fact is then the cost of starting the sentence.') },
    ],
    mission: { goal: T('算出给整句话标词性的最小总代价：每个词当这种词性的代价，加上相邻两个词性接在一起的代价。', 'Work out the smallest total cost of tagging the whole sentence: the cost of each word taking its part of speech, plus the cost of each pair of neighbouring parts of speech.'), how: T('本格信息里有「跟在名词 / 动词 / 形容词后」的代价，和「这个词这么标」的代价。通过后，看看表倒推出的标法。', 'The This cell panel has the costs “after a noun / verb / adjective” and “this word, this tag”. Once you pass, see the tagging traced back from the table.') },
    world: 'tags', facts: ['tN', 'tV', 'tA', 'emit'], palette: KIT,
    tests: [
      S1,
      sent([IMPORT, TV, QUALITY, GOOD], [{ N: 1, V: 1 }, { N: 0 }, { N: 0 }, { A: 0, V: 3 }], COST),
      sent([T('研究', 'study'), T('生命', 'life'), T('起源', 'roots')], [{ N: 2, V: 1 }, { N: 0 }, { N: 0, V: 4 }], COST),
    ],
    solution: circ([['a', 'add'], ['b', 'add'], ['c', 'add'], ['m', 'mmin'], ['e', 'add']], ['tap:pN>a:0', 'tap:tN>a:1', 'tap:pV>b:0', 'tap:tV>b:1', 'tap:pA>c:0', 'tap:tA>c:1', 'a>m:0', 'b>m:1', 'c>m:2', 'm>e:0', 'tap:emit>e:1', 'e>out:cell']),
    hints: [T('上一个词是名词的话：到它为止最少的代价在「前词是名词」那一格。从它接到这个词，还要加上哪一项代价？', 'If the previous word is a noun, the least cost up to it is in the “previous word as a noun” cell. Going on from there to this word, which cost do you add?'), T('三种可能取较小，再加上「这个词这么标」的代价。', 'Take the min of the three, then add the “this word, this tag” cost.')],
    trace(t) { const b = bestTags(t); return { path: b.tags.map((g, k) => `${TAGS.indexOf(g)},${k + 1}`) }; },
    after(t, view) {
      if (!passed(view)) return '';
      const b = bestTags(t);
      return `<div class="afterbox"><span class="eyebrow">${tr(`表倒推出的标法 · 代价 ${b.cost}`, `Tagging traced back from the table · cost ${b.cost}`)}</span><div class="diff">${t.words.map((w, k) => `<span class="dt ins">${w}<small>${TAG[b.tags[k]].n}</small></span>`).join('')}</div>${t.words[0] === IMPORT ? `<p class="cap">${tr('「进口」当成了动词：只看这个词，名词和动词一样便宜；是后面的词让动词胜出了。', '“imports” was tagged as a verb: on its own, noun and verb cost the same; it was the words after it that made the verb win.')}</p>` : ''}</div>`;
    },
    unlock: 'viterbi',
    boardOpt: { minScale: 0.62, maxScale: 1.15 },
    debrief: { title: T('维特比算法', 'The Viterbi algorithm'), body: [T('每一列每一种词性，表里都记着「到这里最省的解释」。最后一列里最小的，就是整句最好的标法；沿绿色格子倒推，就能读出每个词的词性。', 'For every part of speech in every column, the table holds “the cheapest explanation up to here”. The smallest cell in the last column is the best tagging of the whole sentence; trace back along the green cells and you can read off each word’s part of speech.'), T('这叫<b>维特比算法</b>。语音识别把声音变成字、手机输入法把拼音变成词，用的都是这张表：一列一个时刻，一行一种可能。', 'This is the <b>Viterbi algorithm</b>. Speech recognition turning sound into words, and phone keyboards turning pinyin into Chinese words, both use this table: one column per moment, one row per possibility.')], note: T('维特比：上一列每一行 + 跟在它后面的代价，取较小，再加这个词这么标的代价。', 'Viterbi: each row of the previous column + the cost of following it, take the min, then add the cost of tagging this word this way.') },
  },
  {
    id: 'forward', ch: 16, title: T('这句话有多可能', 'How likely is this sentence'), short: T('取较小换成加起来，加换成乘', 'Min becomes sum, add becomes multiply'), mode: 'circuit', robot: 'reach', uses: ['viterbi'],
    intro: [
      { t: T('换个问题：不问「最好的标法是哪一种」，而问「把<b>所有</b>标法都算上，这句话出现的可能性有多大」。', 'A different question: not “which tagging is best”, but “counting <b>every</b> tagging, how likely is this sentence to appear”.') },
      { t: T('代价换成<b>可能性</b>（0 到 1 之间的数）：一条标法的可能性，是一路上所有可能性<b>乘起来</b>；整句的可能性，是所有标法<b>加起来</b>。句首存着 1。', 'Costs become <b>probabilities</b> (numbers between 0 and 1): the probability of one tagging is every probability along the way <b>multiplied together</b>; the probability of the sentence is all the taggings <b>added up</b>. “Start” holds 1.') },
      { t: T('和上一关比一比：上一关只要最好的那一条，这一关所有标法都算数；一条标法里的各项，这次要乘起来。电路里哪些元件要换？第 11 章里，数路线就是把所有路线加起来。', 'Compare with the last level: there you wanted only the best tagging; here every tagging counts, and the parts of a tagging are multiplied this time. Which components in the circuit need swapping? Back in chapter 11, counting routes meant adding up every route.') },
      { t: T('格子底下的小条，是这一格在这一列里占多大：条越长，这个词越可能是这种词性。', 'The little bar under a cell shows its share of its column: the longer the bar, the more likely this word is to be this part of speech.') },
    ],
    mission: { goal: T('算出这句话出现的可能性：所有标法的可能性之和。每条标法的可能性，是一路上「跟在谁后面」和「这个词这么标」的可能性乘起来。', 'Work out how likely the sentence is: the sum of the probabilities of every tagging. Each tagging’s probability is the “after …” and “this word, this tag” probabilities along the way, multiplied together.'), how: T('电路的骨架和上一关一样，想想哪些元件要换。', 'The circuit’s skeleton is the same as last level’s: think about which components need swapping.') },
    world: 'tags', facts: ['tN', 'tV', 'tA', 'emit'], palette: [...KIT, 'mul'], prob: true,
    tests: [
      sent([HE, STUDY, HISTORY], [{ N: 0.5 }, { N: 0.2, V: 0.4 }, { N: 0.3 }], PROB),
      sent([IMPORT, TV, QUALITY, GOOD], [{ N: 0.2, V: 0.3 }, { N: 0.4 }, { N: 0.3 }, { A: 0.5, V: 0.1 }], PROB),
    ],
    solution: circ([['a', 'mul'], ['b', 'mul'], ['c', 'mul'], ['s', 'msum'], ['e', 'mul']], ['tap:pN>a:0', 'tap:tN>a:1', 'tap:pV>b:0', 'tap:tV>b:1', 'tap:pA>c:0', 'tap:tA>c:1', 'a>s:0', 'b>s:1', 'c>s:2', 's>e:0', 'tap:emit>e:1', 'e>out:cell']),
    hints: [T('从上一关的电路出发：哪个元件把一条标法上的各项合起来，哪个元件在几种可能里挑？', 'Start from last level’s circuit: which component joins the parts of one tagging, and which one chooses among the possibilities?'), T('三种加起来，再乘上「这个词这么标」的可能性。', 'Add the three together, then multiply by the “this word, this tag” probability.')],
    diagnose: c => (c.nodes.some(n => n.kind === 'mmin' || n.kind === 'mmax') ? tr('这次不挑最好的一条：所有标法都算数，用「加起来」。', 'This time you don’t pick the best one: every tagging counts, so use “sum”.') : null),
    boardOpt: { minScale: 0.62, maxScale: 1.15 },
    debrief: { title: T('前向算法', 'The forward algorithm'), body: [T('同一张表，同一副骨架：维特比是「取较小、加」，这里是「加起来、乘」。前者找最好的一条，后者把所有的都算上。', 'Same table, same skeleton: Viterbi is “min and add”, this is “sum and multiply”. The first finds the best tagging; the second counts them all.'), T('这叫<b>前向算法</b>。语音识别要比较「这段声音更像哪句话」，就是用它算每句话的可能性。', 'This is the <b>forward algorithm</b>. When speech recognition compares “which sentence does this sound most resemble”, this is how it works out the probability of each sentence.')], note: T('前向算法：把维特比的「取较小、加」换成「加起来、乘」。', 'Forward algorithm: Viterbi’s “min and add” becomes “sum and multiply”.') },
  },
  {
    id: 'spell', ch: 16, title: T('你是想打这个词吗', 'Did you mean…?'), short: T('编辑距离，用在纠错上', 'Edit distance, put to work on typos'), mode: 'circuit', robot: 'ranger', uses: ['cost'],
    intro: [
      { t: T('你打出了 ACROS。词典里有几个候选词，哪个离它<b>最近</b>？', 'You typed ACROS. The dictionary has a few candidate words: which one is <b>closest</b> to it?') },
      { t: T('「最近」就是改动最少：第 9 章的<b>编辑距离</b>。你在那一关拼出的电路板，已经变成了元件箱里的「编辑距离器」。', '“Closest” means fewest changes: the <b>edit distance</b> from chapter 9. The circuit board you built in that level is now the “Edit Distance Meter” in your Parts.') },
      { t: T('每个测试是一个候选词。三个测试都通过后，看看哪个候选词的步数最少。', 'Each test is one candidate word. Once all three tests pass, see which candidate needs the fewest steps.') },
    ],
    mission: { goal: T('算出打错的词 ACROS 和每个候选词之间的编辑距离（删、插、换各算 1 步）。', 'Work out the edit distance between the typo ACROS and each candidate word (delete, insert and replace each count as 1 step).'), how: T('「编辑距离器」在托盘里，接好它的五个输入就行。', 'The “Edit Distance Meter” is in the tray: just wire up its five inputs.') },
    world: 'align', border0: false, facts: ['same', 'start'], palette: ['bp:edit', ...KIT],
    tests: [{ left: 'ACROS', top: 'ACROSS' }, { left: 'ACROS', top: 'CROSS' }, { left: 'ACROS', top: 'MACRO' }],
    testLabel: t => `${t.left} → ${t.top}`,
    solution: circ([['e', 'bp:edit']], ['tap:ul>e:0', 'tap:up>e:1', 'tap:left>e:2', 'tap:same>e:3', 'tap:start>e:4', 'e>out:cell']),
    hints: [T('编辑距离器的五个口：左上、上面、左边、两字相同、是起点，照着接。', 'The Edit Distance Meter’s five inputs: up-left, up, left, letters match, is start. Wire them up to match.')],
    after(t, view, st) {
      if (!passed(view) || st.status.some(x => x !== 'pass')) return '';
      const rows = [{ top: 'ACROSS' }, { top: 'CROSS' }, { top: 'MACRO' }].map(x => ({ ...x, d: editTable(t.left, x.top)[t.left.length][x.top.length] })).sort((a, b) => a.d - b.d);
      return `<div class="afterbox"><span class="eyebrow">${tr('候选词 · 按步数排', 'Candidates · by number of steps')}</span><div class="diff">${rows.map((x, k) => `<span class="dt${k ? '' : ' ins'}">${x.top}<small>${tr(`${x.d} 步`, `${x.d} step${x.d === 1 ? '' : 's'}`)}</small></span>`).join('')}</div><p class="cap">${tr(`最近的是 <b>${rows[0].top}</b>：输入法就会问你「是不是想打 ${rows[0].top}」。`, `The closest is <b>${rows[0].top}</b>, so your keyboard would ask “Did you mean ${rows[0].top}?”`)}</p></div>`;
    },
    debrief: { title: T('纠错', 'Spelling correction'), body: [T('输入法和搜索框的「你是不是要找」，就是这样做的：把打出来的词和词典里的候选词一一比较，挑编辑距离最小的。', 'This is how keyboards and search boxes come up with “Did you mean…?”: compare the typed word with each candidate in the dictionary and pick the one with the smallest edit distance.'), T('你没有重新拼电路，只是把第 9 章的零件拿过来，接到新问题上。', 'You didn’t build a new circuit: you just took the part from chapter 9 and wired it into a new problem.')], note: T('纠错：和每个候选词算编辑距离，挑最小的。', 'Spelling correction: work out the edit distance to each candidate and pick the smallest.') },
  },
  {
    id: 'parse', ch: 16, title: T('句子的骨架', 'The skeleton of a sentence'), short: T('一句话有几种读法', 'How many ways can a sentence be read?'), mode: 'circuit', robot: 'broom', uses: ['interval'],
    intro: [
      { t: T('「咬死了猎人的狗」：是狗咬死了猎人，还是猎人的狗被咬死了？同一串词，<b>两两合并成短语</b>的方式不同，意思就不同。合并的过程画出来，就是一棵<b>句法树</b>。', '“Old men and women”: are the women old too, or only the men? The same words, <b>merged into phrases two at a time</b> in different ways, mean different things: (old men) and women, or old (men and women). Draw the merging out and you get a <b>parse tree</b>.') },
      { t: T('假设任何两段相邻的词都能合并。一串词一共有几种不同的合并方式？还是区间表：格子 (i, j) 记「第 i 到第 j 个词有几种合并方式」。单个词只有 1 种，对角线已经填好。', 'Suppose any two neighbouring stretches of words can be merged. How many different ways are there to merge a run of words? An interval table again: cell (i, j) records “how many ways words i to j can be merged”. A single word has just 1, so the diagonal is already filled in.') },
      { t: T('最后一次合并，把左边一段和右边一段合起来。在某个切分点，左边有几种方式、右边有几种方式，两边可以随便搭配：这个切分点一共有几种？不同的切分点之间，又该怎么合起来？', 'The last merge joins a left stretch and a right stretch. At a given split point, the left side has some number of ways and the right side some number, and any left way can go with any right way: how many ways does this split point give? And how should the different split points be combined?') },
      { t: T('第 13 章的合并石子里，每个切分点是「左 + 右」，再挑最省的。这里呢？扫帚的扫描臂照样按切分点送来左段们和右段们，乘法器也能一对一对地乘。', 'In chapter 13’s merging stones, each split point was “left + right”, and you picked the cheapest. What about here? Broom’s sweep arm sends the left parts and right parts by split point as before, and a Multiplier can multiply them pair by pair too.') },
    ],
    mission: { goal: T('一串词两两合并成短语，直到合成一整句。算出一共有几种不同的合并方式（几棵句法树）。', 'A run of words is merged two at a time into phrases until it becomes one whole sentence. Work out how many different ways of merging there are (how many parse trees).'), how: T('扫描臂送来每个切分点的左段和右段。', 'The sweep arm sends the left part and right part for every split point.') },
    world: 'interval', facts: [], palette: [...KIT, 'mul'], diag: 1,
    tests: [{ words: [T('咬死了', 'old'), T('猎人的', 'men and'), T('狗', 'women')] }, { words: [T('我', 'I'), T('看见', 'saw'), T('他', 'him'), T('笑', 'laugh')] }, { words: [T('白', 'big'), T('天', 'white'), T('鹅', 'swans'), T('飞', 'flew'), T('过', 'by')] }],
    solution: circ([['x', 'mul'], ['s', 'msum']], ['tap:segL>x:0', 'tap:segR>x:1', 'x>s:0', 's>out:cell']),
    hints: [T('先只看一个切分点：左边的每一种方式，都能和右边的每一种搭配。这样一共有几种？', 'Look at a single split point first: every way on the left can go with every way on the right. How many is that in all?'), T('所有切分点的结果都算数：接进「加起来」。', 'Every split point’s result counts: wire them into “sum”.')],
    boardOpt: { minScale: 0.6, maxScale: 1.15 },
    debrief: { title: T('句法分析', 'Parsing'), body: [T('3 个词 2 种，4 个词 5 种，5 个词 14 种：这串数叫<b>卡特兰数</b>，词一多就飞快地变大。所以电脑分析句子时，不会把每一棵树都列出来，而是用这张区间表一格一格地算。', '3 words, 2 ways; 4 words, 5; 5 words, 14: these are the <b>Catalan numbers</b>, and they grow very fast as words are added. That is why a computer analysing a sentence doesn’t list every tree, but works through this interval table cell by cell.'), T('真正的句法分析（叫 <b>CKY 算法</b>）还会查语法规则：哪两段能合并、合成什么。表的形状一模一样。', 'Real parsing (the <b>CKY algorithm</b>) also checks grammar rules: which two stretches can merge, and into what. The table has exactly the same shape.')], note: T('句法树：每个切分点「左 × 右」，再加起来。', 'Parse trees: “left × right” at each split point, then add them up.') },
  },
  {
    id: 'localalign', ch: 16, title: T('找最像的一段', 'Find the most alike stretch'), short: T('低于 0 就重新开始', 'Below 0, start again'), mode: 'circuit', robot: 'scout',
    intro: [
      { t: T('两段长长的 DNA，整体并不像，可中间可能藏着一小段<b>非常像</b>的片段。怎么把它找出来？', 'Two long stretches of DNA may not look alike overall, yet hide a short piece in the middle that is <b>very alike</b>. How do you find it?') },
      { t: T('还是对齐表，第 0 行第 0 列都是 0。给每一步打分：字相同的一对 <b>+2</b>，不同的一对 <b>−1</b>，空一个位置（从上面或左边来）<b>−1</b>。「本格信息」里的「本格得分」，就是这一格这一对的 +2 或 −1。', 'An alignment table again, with row 0 and column 0 all 0. Each step scores: a matching pair <b>+2</b>, a mismatched pair <b>−1</b>, and a gap (coming from up or left) <b>−1</b>. The “cell score” in the This cell panel is this cell’s pair: +2 or −1.') },
      { t: T('关键的一步：如果算出来的分数<b>低于 0</b>，就截成 0，意思是「前面的都不要了，从这里重新开始」。背着负分走下去，不如重新开始。', 'The key step: if a score comes out <b>below 0</b>, it is cut to 0, meaning “drop everything before and start again from here”. Starting afresh beats carrying a negative score along.') },
      { t: T('最像的一段不一定在右下角，它可能出现在<b>表里任何地方</b>：答案是整张表里最大的那一格。', 'The most alike stretch isn’t necessarily in the bottom-right corner: it could be <b>anywhere in the table</b>, so the answer is the largest cell in the whole table.') },
    ],
    mission: { goal: T('找出两串字母里最相似的一段：字相同 +2，不同 −1，空位 −1，低于 0 就截成 0。答案是表里最大的分数。', 'Find the most similar stretch of two strings: a match +2, a mismatch −1, a gap −1, and anything below 0 is cut to 0. The answer is the largest score in the table.'), how: T('常数可以设成负数。通过后，看看表倒推出的那一段。', 'Constants can be set to negative numbers. Once you pass, see the stretch traced back from the table.') },
    world: 'local', border0: true, facts: ['score'], palette: KIT, consts: [-2, -1, 0, 1, 2],
    // A challenge: the naive board scores the whole of both strings, never starting again from 0.
    naive: circ([['a', 'add'], ['b', 'add'], ['c', 'add'], ['k', 'const', -1], ['m', 'mmax']], ['tap:ul>a:0', 'tap:score>a:1', 'tap:up>b:0', 'k>b:1', 'tap:left>c:0', 'k>c:1', 'a>m:0', 'b>m:1', 'c>m:2', 'm>out:cell']),
    tests: [{ top: 'AGTACGCA', left: 'TATGC' }, { top: 'GGTTGACTA', left: 'TGTTACGG' }],
    solution: circ([['a', 'add'], ['b', 'add'], ['c', 'add'], ['k', 'const', -1], ['m', 'mmax'], ['z', 'const', 0], ['n', 'mmax']], ['tap:ul>a:0', 'tap:score>a:1', 'tap:up>b:0', 'k>b:1', 'tap:left>c:0', 'k>c:1', 'a>m:0', 'b>m:1', 'c>m:2', 'm>n:0', 'z>n:1', 'n>out:cell']),
    hints: [T('三条来路各要加上哪一步的分数？想找最像的一段，该怎么把它们合起来？', 'Which step’s score does each of the three ways in add? To find the most alike stretch, how should they be combined?'), T('低于 0 就截成 0：再接一个「取较大」，另一个口接常数 0。', 'Below 0 is cut to 0: add another “max”, with a Constant 0 in its other input.')],
    diagnose: c => (!c.nodes.some(n => n.kind === 'const' && n.value === 0) && usesSensor(c, 'score') ? tr('分数会变成负的。负分不如重新开始：再取一次较大，和常数 0 比一比。', 'Scores can go negative, and a negative score is worse than starting again: take the max once more, against a Constant 0.') : null),
    trace: t => localTrace(t),
    after(t, view) {
      if (!passed(view)) return '';
      const { okTop, okLeft } = localTrace(t);
      return `<div class="afterbox"><span class="eyebrow">${tr('最像的一段', 'The most alike stretch')}</span><div class="diff">${[...t.top].map((ch, j) => `<span class="dt${okTop.has(j) ? ' ins' : ''}">${ch}</span>`).join('')}</div><div class="diff">${[...t.left].map((ch, i) => `<span class="dt${okLeft.has(i) ? ' ins' : ''}">${ch}</span>`).join('')}</div><p class="cap">${tr('从最大的那一格倒推，一直退到 0 为止。', 'Traced back from the largest cell until the score drops to 0.')}</p></div>`;
    },
    unlock: 'local',
    boardOpt: { minScale: 0.62, maxScale: 1.15 },
    debrief: { title: T('局部对齐', 'Local alignment'), body: [T('整体对齐（两串从头比到尾，叫 Needleman-Wunsch 算法）和它用同样的打分，只差一个「低于 0 就截成 0」：有了它，表就从「整体有多像」变成了「最像的一段在哪」。这个截断不用新元件：取较大，再和 0 比一比。', 'Global alignment (comparing two strings end to end, the Needleman-Wunsch algorithm) uses the same scoring, differing only in “below 0 is cut to 0”: with that one change, the table goes from “how alike are they overall” to “where is the most alike stretch”. The cut needs no new component: take the max against 0.'), T('这叫 <b>Smith-Waterman 算法</b>。生物学家在基因库里找相似的片段、查一段病毒和已知病毒有多像，用的就是它。', 'This is the <b>Smith-Waterman algorithm</b>. Biologists use it to search gene databases for similar pieces, and to check how closely a virus resembles known ones.')], note: T('局部对齐：低于 0 就截成 0；答案在表里最大的那一格。', 'Local alignment: below 0 is cut to 0; the answer is the largest cell in the table.') },
  },
];
