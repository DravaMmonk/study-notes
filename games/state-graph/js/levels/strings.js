// Chapter 8: compare two strings on an alignment table.

import { N, E, linkFig, tableFig } from '../svg.js';
import { circ, partFn } from '../circuit/components.js';
import { lcsTable, lcsTrace, editTable, editTrace } from '../algo.js';
import { T, tr } from '../i18n.js';

const KIT = ['msum', 'mmin', 'mmax', 'add', 'const', 'pass', 'block'];
const passed = view => !!view && view.end && view.pass;

export const strings = [
  {
    id: 'link', ch: 8, title: T('连线不交叉', 'Lines that never cross'), short: T('找出两串字共同的部分', 'Find what two strings share'), mode: 'link',
    intro: [
      { t: T('新的一章：比较两串文字。在两串字里<b>按顺序</b>都出现过的一串字，叫作它们的<b>公共子序列</b>。比如 ABCD 和 ACBD 里，A、B、D 就是一个。', 'A new chapter: comparing two strings. A sequence of letters that appears <b>in order</b> in both strings is called a <b>common subsequence</b>. In ABCD and ACBD, for example, A, B, D is one.'), fig: linkFig('ABCD', 'ACBD', [[0, 0], [1, 2], [3, 3]]) },
      { t: T('找公共子序列可以用连线：上下两个字相同，就连一根线。规则有三条：<b>只能连相同的字；每个字最多连一根线；线不能交叉。</b>', 'You can find a common subsequence by drawing lines: link a top letter to an equal bottom letter. There are three rules: <b>only link equal letters; each letter takes at most one line; lines can’t cross.</b>') },
      { t: T('为什么不能交叉？交叉说明这两个字在上面的顺序，和在下面的顺序是反的，读出来就不是同一串了。', 'Why can’t they cross? Crossing lines mean the two letters come in one order on top and the opposite order below, so reading them off wouldn’t give the same sequence.'), fig: linkFig('ABCD', 'ACBD', [[1, 2], [2, 1]], [[1, 2], [2, 1]]) },
      { t: T('连上的线越多，公共子序列就越长。目标：<b>连出尽可能多的线。</b>', 'The more lines, the longer the common subsequence. Your goal: <b>draw as many lines as you can.</b>') },
    ],
    mission: { goal: T('两道题里，都连出最多的线。只能连相同的字，每个字最多连一根线，线不能交叉。', 'In both puzzles, draw as many lines as possible. Only link equal letters, each letter takes at most one line, and lines can’t cross.'), how: T('先点一个字，再点另一行里相同的字，就连上一根线。点一个已经连线的字，可以拆掉它的线。', 'Click a letter, then the same letter in the other row, to draw a line. Click a letter that already has a line to remove it.') },
    tests: [{ a: 'CABD', b: 'ABCD' }, { a: 'ABCBDAB', b: 'BDCABA' }],
    hints: [T('先别连 C。C 在上面排第一，在下面排第三，连了它，A 和 B 就都连不上了。试试 A、B、D。', 'Leave C alone for now. C is first on top but third below, so linking it blocks both A and B. Try A, B, D.'), T('目标是 4 根。B、C、B、A 是一种连法，B、D、A、B 是另一种。', 'The target is 4 lines. B, C, B, A is one way; B, D, A, B is another.')],
    debrief: { title: T('最长公共子序列', 'Longest common subsequence'), body: [T('你连出的线，从左往右读，就是两串字共有的一串，叫作<b>公共子序列</b>。最多能连几根，就是<b>最长公共子序列</b>的长度。', 'Read from left to right, the lines you drew spell out a sequence both strings share: a <b>common subsequence</b>. The most lines you can draw is the length of the <b>longest common subsequence</b>.'), T('它的用途很多：比较两份文件改了哪里、比对两段 DNA 有多像、判断两份作业是不是抄的。', 'It has many uses: finding what changed between two versions of a file, measuring how alike two stretches of DNA are, telling whether one homework was copied from another.'), T('四五个字还能试出来，可两段 DNA 动辄上万个字母，不可能一根根地试。下一关，把它交给表格。', 'With four or five letters you can find it by trial, but stretches of DNA run to tens of thousands of letters, far too many to try line by line. Next level, we hand it to a table.')], note: T('公共子序列：两串字里，按顺序都出现的一串。连线不能交叉。', 'Common subsequence: letters that appear in order in both strings. The lines can’t cross.') },
  },
  {
    id: 'lcs', ch: 8, title: T('对齐表', 'Alignment table'), short: T('让表格替你连线', 'Let the table draw the lines'), mode: 'circuit', robot: 'ranger',
    intro: [
      { t: T('字一多，连线就很难试全了。我们把它交给一张新的表：<b>对齐表</b>。一个词写在上面，一个词写在左边。', 'With more letters, it gets hard to try every way of drawing the lines. So we hand it to a new kind of table: the <b>alignment table</b>. One word goes along the top, the other down the left.'), fig: tableFig('ABD', 'BD', () => '', { cls: () => '' }) },
      { t: T('格子 (行, 列) 记着：<b>左边词的前「行」个字，和上面词的前「列」个字，最长能连几根线</b>。右下角就是整个答案。', 'Cell (row, column) records: <b>the most lines you can draw between the first “row” letters of the left word and the first “column” letters of the top word</b>. The bottom-right corner is the answer for the whole words.'), fig: tableFig('ABD', 'BD', [[0, 0, 0, 0], [0, 0, 1, 1], [0, 0, 1, 2]], { cls: (i, j) => (i === 2 && j === 3 ? 'sel' : 'lit') }) },
      { t: T('第 0 行和第 0 列表示「一个字都没有」。空的那一边连不出任何线，所以全是 0，机器已经替你填好了。', 'Row 0 and column 0 mean “no letters at all”. An empty side can’t have any lines, so they are all 0, and the machine has already filled them in.'), fig: tableFig('ABD', 'BD', (i, j) => (i && j ? '' : 0), { cls: (i, j) => (i && j ? '' : 'lit') }) },
      { t: T('还是只看最后一步。盯住问号这一格对应的<b>两个最后的字</b>：左边词的第「行」个字，和上面词的第「列」个字。它们只有两种情况：<b>相同</b>，或者<b>不同</b>。', 'Once again, look only at the last step. Focus on the <b>two last letters</b> for the cell with the question mark: letter number “row” of the left word, and letter number “column” of the top word. There are only two cases: they are <b>the same</b>, or they are <b>different</b>.'), fig: tableFig('ABD', 'BD', (i, j) => (i === 2 && j === 3 ? '?' : ''), { cls: (i, j) => (i === 2 && j === 3 ? 'sel eq' : '') }) },
      { t: T('两种情况各想一想：<b>相同</b>时，这两个字能不能连成一根线？连上以后，剩下的字对应表里的哪一格？<b>不同</b>时，这两个字里至少有一个连不上线，把它丢掉，又对应哪一格？答案都藏在问号旁边已经算好的三格里。', 'Think through each case. When they are <b>the same</b>, can those two letters be linked by a line? Once they are, which cell of the table matches the letters that remain? When they are <b>different</b>, at least one of the two can’t get a line; drop it, and which cell matches then? The answers are all in the three cells next to the question mark, which are already computed.'), fig: tableFig('ABD', 'BD', (i, j) => (i === 2 && j === 3 ? '?' : (i === 1 && j >= 2) || (i === 2 && j === 2) ? 1 : ''), { cls: (i, j) => (i === 2 && j === 3 ? 'sel eq' : (i === 1 && j >= 2) || (i === 2 && j === 2) ? 'lit' : '') }) },
      { t: T('机器人在对齐表上一格一格地走，视野里看得见它左上、上面、左边的格子（标着 = 的格子，这一行和这一列的字相同）。「本格信息」里的「两字相同」告诉你，红框这一行和这一列的字是不是一样。想清楚两种情况各该读哪一格，再拼电路板。', 'The robot walks the alignment table cell by cell, and its view shows the cells up-left, up and left of it (a cell marked = is one where the row’s letter and the column’s letter match). In the This cell panel, “letters match” tells you whether the red frame’s row letter and column letter are the same. Work out which cell each case should read, then build the board.') },
    ],
    mission: { goal: T('拼出对齐表的电路，算出两个词最长的公共子序列有几个字（两个词里按顺序都出现的一串字）。', 'Build the alignment table’s circuit and work out the length of the longest common subsequence of two words (letters that appear in order in both).'), how: T('前两个测试，就是你上一关亲手连过的两道题。通过后，看看表格里藏着的连线。', 'The first two tests are the two puzzles you solved by hand last level. Once you pass, look at the lines hidden in the table.') },
    world: 'align', border0: true, facts: ['same'], palette: KIT,
    tests: [{ top: 'CABD', left: 'ABCD' }, { top: 'ABCBDAB', left: 'BDCABA' }, { top: 'GATTACA', left: 'CATTAG' }],
    solution: circ([['k', 'const', 1], ['a', 'add'], ['g', 'pass'], ['m', 'mmax']], ['tap:ul>a:0', 'k>a:1', 'tap:same>g:0', 'a>g:1', 'tap:up>m:0', 'tap:left>m:1', 'g>m:2', 'm>out:cell']),
    hints: [
      T('两个字相同时才能连线：这时从左上来，再 + 1。用放行闸，条件接「两字相同」。', 'Only matching letters can be linked: then you come from the up-left and add 1. Use a Pass gate with “letters match” as its condition.'),
      T('两个字不同时，至少有一个连不上：要么丢掉这一行的字（看上面），要么丢掉这一列的字（看左边）。', 'When the letters differ, at least one of them gets no line: either drop this row’s letter (look up) or drop this column’s letter (look left).'),
      T('要连得最多：把上面、左边和放行闸都接进「取较大」汇合器。', 'To get the most lines: wire up, left and the Pass gate all into a “max” Merger.'),
    ],
    trace(t) {
      const back = lcsTrace(t.top, t.left, lcsTable(t.top, t.left));
      return { path: back.cells.map(p => p.join(',')), okTop: new Set(back.pairs.map(p => p[0])), okLeft: new Set(back.pairs.map(p => p[1])) };
    },
    after(t, view) {
      if (!passed(view)) return '';
      const { pairs } = lcsTrace(t.top, t.left, lcsTable(t.top, t.left)), ma = new Set(pairs.map(p => p[0])), mb = new Set(pairs.map(p => p[1]));
      return `<div class="afterbox"><span class="eyebrow">${tr('表格里藏着的连线', 'The lines hidden in the table')}</span>
        <div class="diff">${[...t.top].map((ch, j) => `<span class="dt${ma.has(j) ? ' ins' : ''}">${ch}</span>`).join('')}</div>
        <div class="diff">${[...t.left].map((ch, i) => `<span class="dt${mb.has(i) ? ' ins' : ''}">${ch}</span>`).join('')}</div>
        <p class="cap">${tr('从右下角沿绿色格子倒推，每走一次对角线，就是一根连线。公共子序列：', 'Walk back from the bottom-right corner along the green cells: every diagonal step is one line. Common subsequence: ')}<b>${pairs.map(p => t.top[p[0]]).join(' ')}</b></p></div>`;
    },
    boardOpt: { minScale: 0.66, maxScale: 1.2 },
    unlock: 'align',
    debrief: { title: T('表格替你连好了线', 'The table drew the lines for you'), body: [T('在对齐表里，<b>每走一次对角线，就是连了一根线</b>。只有字相同才能走对角线，而路线总是从左上走向右下，所以线永远不会交叉。', 'In an alignment table, <b>every diagonal step is one line drawn</b>. You can only step diagonally where the letters match, and the path always runs from the top left to the bottom right, so the lines never cross.'), T('7 个字对 6 个字，亲手试要试很久，表格只填了 56 个格子。两段一万个字母的 DNA，也只要填一亿个格子，电脑一眨眼就能算完。', '7 letters against 6 would take ages to try by hand; the table filled in just 56 cells. Two stretches of DNA ten thousand letters long need only a hundred million cells, which a computer fills in the blink of an eye.')], note: T('对齐表：字相同，左上 + 1；不同，取上面和左边中较大的。', 'Alignment table: if the letters match, up-left + 1; if not, the larger of up and left.') },
  },
  {
    id: 'edit', ch: 8, title: T('改错字', 'Fix the typo'), short: T('每条来路都有代价', 'Every way in has a cost'), mode: 'circuit', robot: 'ranger', uses: ['align'],
    intro: [
      { t: T('输入法会帮你改错字。它要回答一个问题：把一个词改成另一个词，<b>最少要几步</b>？', 'Your keyboard fixes your typos. To do that, it has to answer a question: what is <b>the fewest steps</b> that turn one word into another?') },
      { t: T('每一步只能做一件事：<b>删掉</b>一个字、<b>插入</b>一个字，或者把一个字<b>换成</b>另一个字。比如 CAT → CUT 只要 1 步：把 A 换成 U。', 'Each step does exactly one thing: <b>delete</b> a letter, <b>insert</b> a letter, or <b>replace</b> one letter with another. For example, CAT → CUT takes just 1 step: replace A with U.'), fig: { cells: [...'CAT'].map((ch, i) => ({ id: `a${i}`, x: i * 54, y: 0, w: 44, h: 44, value: ch, cls: i === 1 ? 'tile bad' : 'tile ok' })).concat([...'CUT'].map((ch, i) => ({ id: `b${i}`, x: i * 54, y: 110, w: 44, h: 44, value: ch, cls: i === 1 ? 'tile hot' : 'tile ok' }))), edges: [E('a0', 'b0', 'link'), E('a1', 'b1', 'hot'), E('a2', 'b2', 'link')] } },
      { t: T('还是对齐表：行是原来的词，列是目标词。格子记着「把原词的前几个字，改成目标词的前几个字」最少要几步。三个邻居各有含义：', 'It’s an alignment table again: the rows are the original word, the columns the target word. Each cell records the fewest steps that turn “the first few letters of the original” into “the first few letters of the target”. Each of the three neighbors has a meaning:'), fig: { cells: [N('ul', 0, 0, { w: 96, h: 70, label: T('左上', 'up-left'), sub: T('保留或替换', 'keep / replace') }), N('u', 116, 0, { w: 96, h: 70, label: T('上面', 'up'), sub: T('删掉一个字', 'delete one') }), N('l', 0, 90, { w: 96, h: 70, label: T('左边', 'left'), sub: T('插入一个字', 'insert one') }), N('c', 116, 90, { w: 96, h: 70, label: T('本格', 'this cell'), cls: 'sel' })], edges: [E('ul', 'c', 'hot'), E('u', 'c', 'hot'), E('l', 'c', 'hot')] } },
      { t: T('每条来路都有自己的<b>代价</b>：从这条路来，要多花几步。删、插、换都要多花 1 步；两个字相同时，从左上来可以直接保留，不花步数。', 'Every way in has its own <b>cost</b>: how many extra steps it takes to come that way. Deleting, inserting and replacing each cost 1 step; when the two letters match, coming from the up-left lets you keep the letter for free.') },
      { t: T('这一次，第 0 行和第 0 列<b>没有现成的数</b>，也要由电路来算。想一想：把原词的前 3 个字改成空词，要几步？两边都是空词时呢？', 'This time, row 0 and column 0 <b>have no ready-made numbers</b>; the circuit has to compute them too. Think: how many steps turn the first 3 letters of the original into an empty word? And when both words are empty?') },
    ],
    mission: { goal: T('每一步只能删掉、插入或替换一个字。拼出改错字的电路，算出把一个词改成另一个词的最少步数。', 'Each step deletes, inserts or replaces one letter. Build the typo-fixing circuit and work out the fewest steps that turn one word into another.'), how: T('这块电路板要用到好几个元件。通过后，看看表格倒推出的具体改法。', 'This board needs quite a few components. Once you pass, look at the exact edits the table traces back.') },
    world: 'align', border0: false, facts: ['same', 'start'], palette: KIT,
    tests: [{ left: 'CAT', top: 'CUT' }, { left: 'HORSE', top: 'ROS' }, { left: 'KITTEN', top: 'SITTING' }],
    testLabel: t => `${t.left} → ${t.top}`,
    solution: circ([['k', 'const', 1], ['n', 'mmin'], ['a', 'add'], ['z', 'const', 0], ['g0', 'pass'], ['g1', 'pass'], ['m', 'mmin']], [
      'tap:up>n:0', 'tap:left>n:1', 'tap:ul>n:2', 'n>a:0', 'k>a:1',
      'tap:same>g1:0', 'tap:ul>g1:1', 'tap:start>g0:0', 'z>g0:1', 'a>m:0', 'g1>m:1', 'g0>m:2', 'm>out:cell',
    ]),
    hints: [
      T('删掉一个字（从上面来）、插入一个字（从左边来）、换掉一个字（从左上来），都要多花 1 步：把三个邻居接进「取较小」，再用加法器 + 1。', 'Deleting a letter (from above), inserting one (from the left) and replacing one (from the up-left) each cost 1 more step: wire all three neighbors into a “min” Merger, then add 1 with an Adder.'),
      T('两个字相同时，可以直接保留：从左上来，不花步数。用放行闸，条件接「两字相同」，数接「左上」。', 'When the two letters match you can just keep it: come from the up-left at no cost. Use a Pass gate with “letters match” as its condition and “up-left” as its number.'),
      T('起点（两边都是空词）是 0 步：「是起点」放行一个 0。最后把这三路都接进另一个「取较小」汇合器。', 'The start (both words empty) is 0 steps: let a 0 through on “is start”. Finally, wire all three paths into another “min” Merger.'),
    ],
    trace: t => ({ path: editTrace(t.left, t.top, editTable(t.left, t.top)).cells.map(p => p.join(',')) }),
    after(t, view) {
      if (!passed(view)) return '';
      const { ops } = editTrace(t.left, t.top, editTable(t.left, t.top)), n = ops.filter(o => o.k !== 'keep').length;
      const tile = o => (o.k === 'keep' ? `<span class="dt">${o.a}<small>${tr('保留', 'keep')}</small></span>` : o.k === 'rep' ? `<span class="dt rep">${o.a}→${o.b}<small>${tr('替换', 'replace')}</small></span>` : o.k === 'del' ? `<span class="dt del"><s>${o.a}</s><small>${tr('删除', 'delete')}</small></span>` : `<span class="dt ins">+${o.b}<small>${tr('插入', 'insert')}</small></span>`);
      return `<div class="afterbox"><span class="eyebrow">${tr(`表格倒推出的改法 · ${n} 步`, `The edits traced back from the table · ${n} step${n === 1 ? '' : 's'}`)}</span><div class="diff">${ops.map(tile).join('')}</div><p class="cap">${tr('从右下角倒推：走对角线是保留或替换，往上是删除，往左是插入。', 'Walking back from the bottom-right corner: a diagonal step is a keep or a replace, a step up is a delete, and a step left is an insert.')}</p></div>`;
    },
    boardOpt: { minScale: 0.66, maxScale: 1.2 },
    // As a part: the cheapest of one more edit after any neighbour, the up-left as it is when the letters match, and 0 at the start.
    unlock: 'cost', blueprint: { ports: ['ul', 'up', 'left', 'same', 'start'], f: ([ul, up, left, same, start]) => partFn('mmin')([partFn('add')([partFn('mmin')([up, left, ul]), 1]), same ? ul : null, start ? 0 : null]) },
    debrief: { title: T('编辑距离', 'Edit distance'), body: [T('把一个词改成另一个词的最少步数，叫作<b>编辑距离</b>。输入法纠错、搜索引擎的「你是不是要找」、基因突变分析，用的都是它。', 'The fewest steps that turn one word into another is called the <b>edit distance</b>. Autocorrect, a search engine’s “Did you mean…?” and the analysis of gene mutations all rely on it.'), T('和上一关比，表格的形状一点没变，只是<b>给每条来路标上代价，再取较小</b>。连边上的一行一列，也是同一块电路算出来的。同一张对齐表，换一块电路板，就能回答另一个问题。', 'Compared with the last level, the table’s shape didn’t change at all: you just <b>gave every way in a cost and took the min</b>. Even the row and column along the edges were computed by the same circuit. The same alignment table with a different circuit board answers a different question.')], note: T('编辑距离：删除、插入、替换各 + 1，字相同可以免费保留，取较小。', 'Edit distance: delete, insert and replace each cost 1, a matching letter can be kept for free, and you take the min.') },
  },
];
