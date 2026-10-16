// Chapter 13: a cell's sources can be a whole segment — the broom robot's arm sweeps it, a filter picks from it.

import { houseRow } from '../svg.js';
import { circ, usesTap } from '../circuit/components.js';

const KIT = ['msum', 'mmin', 'mmax', 'add', 'const', 'pass', 'block'];
const YESNO = ['many', 'not', 'pass', 'block', 'const'];
const row = (n, val = () => '', cls = () => '') => Array.from({ length: n }, (_, i) => ({ id: `r${i}`, x: i * 60, y: 0, w: 50, h: 50, corner: i, value: val(i), cls: cls(i) }));
const letters = s => [...s].map((ch, k) => ({ id: `c${k}`, x: k * 46, y: 0, w: 38, h: 38, value: ch, cls: 'tile' }));

export const sweep = [
  {
    id: 'prefix', ch: 11, title: '前面所有的', short: '扫描臂一次读一整段', mode: 'circuit', robot: 'broom',
    intro: [
      { t: '新的一章，新的机器人「扫帚」。它多了一条<b>扫描臂</b>，能一次扫过一整段格子，把整段的数一起送进电路板。' },
      { t: '一条街上，每家门口放着一些钱。机器人要在每家下面写：<b>从 1 号到这一家，一共有多少钱</b>。', fig: { cells: houseRow([3, 1, 4, 1, 5]), edges: [] } },
      { t: '扫描臂送来的是<b>一整段</b>：接到电路板上的线会变粗。汇合器能直接吃下一整段，段里的每个数都参与。' },
    ],
    mission: { goal: '在每家下面写上：从 1 号到这一家，一共有多少钱。', how: '这一关有两个阶段，会检查整行。先用扫描臂；通过后，扫描臂会被收起来。' },
    tests: [{ a: [3, 1, 4, 1, 5] }, { a: [2, 7, 1, 8, 2, 8] }],
    testLabel: t => `${t.a.length} 户人家`,
    stages: [
      {
        world: 'prefix', facts: ['money'], palette: KIT, checkAll: true, ask: '用扫描臂把 1 号到这一家的钱一次扫进来，加起来。',
        solution: circ([['m', 'msum']], ['tap:seg>m:0', 'm>out:cell']),
        hints: ['在视野下面的「扫描臂」那里点一下整条格子，把它点亮成输入。', '把这一整段接进「加起来」汇合器，再接到本格。'],
        done: { head: '扫出来了', body: ['可是扫描臂每到一家，都要从 1 号重新扫一遍：第 100 家要读 100 格。', '<b>左边那一格，不是已经存着「到上一家一共多少」了吗？</b>下一阶段，扫描臂收起来了。'] },
      },
      {
        world: 'prefix', facts: ['money'], palette: KIT, checkAll: true, noArm: true, ask: '扫描臂收起来了：只用左边一格和这家的钱。',
        solution: circ([['a', 'add']], ['tap:prev>a:0', 'tap:money>a:1', 'a>out:cell']),
        hints: ['到这一家一共的钱 = 到上一家一共的钱 + 这家的钱。', '点亮左边一格和「这家的钱」，接进加法器。'],
      },
    ],
    unlock: 'sweep',
    debrief: { title: '能用上一格，就别重扫', body: ['两种做法答案一样。可扫描臂在第 n 家要读 n 格，100 户人家一共要读 5,050 格；用左边一格，每家只读 1 格，一共 100 格。', '<b>能用上一格存好的答案，就别从头再扫一遍</b>：这是动态规划的老规矩。', '可有的问题，左边一格<b>不够用</b>：答案要从一整段里挑。下一关就是。'], note: '前缀和：到这一家一共 = 到上一家一共 + 这家。能用上一格，就别重扫。' },
  },
  {
    id: 'rising', ch: 11, title: '越来越高', short: '在一整段里挑', mode: 'circuit', robot: 'broom',
    intro: [
      { t: '一排高矮不一的柱子。从左往右挑出几根，要求<b>一根比一根高</b>，中间可以跳过。最多能挑几根？', fig: { cells: houseRow([3, 1, 4, 1, 5, 9, 2, 6], j => ([1, 2, 4, 5].includes(j) ? 'hot' : '')), edges: [] } },
      { t: '每一格记：<b>以这一根结尾</b>，最多能连几根。整排的答案，就是这一行里最大的那个。' },
      { t: '只看最后一根：它前面接的是哪一根？可以是前面<b>任何一根</b>，只要比它矮。前面有几根，来路就可能有几条。这正是扫描臂的活儿。' },
      { t: '最左边那个「起」格，当它是一根比谁都矮的柱子，存着 0：接在它后面，就表示这一根是第一根。扫描臂有一个<b>筛选开关</b>，就在视野里。' },
    ],
    mission: { goal: '从左往右挑柱子，要一根比一根高（可以跳过）。算出每根柱子作为最后一根时最多能连几根，整排的答案是其中最大的。', how: '这一关会检查整行。扫描臂的筛选开关在视野里的扫描臂下面。' },
    world: 'heights', facts: ['money'], palette: KIT, checkAll: true, solutionFilter: 'lower',
    tests: [{ a: [3, 1, 4, 1, 5, 9, 2, 6] }, { a: [5, 4, 3, 2, 1] }, { a: [2, 6, 3, 4, 1, 7, 5] }],
    solution: circ([['m', 'mmax'], ['k', 'const', 1], ['a', 'add']], ['tap:seg>m:0', 'm>a:0', 'k>a:1', 'a>out:cell']),
    hints: ['这一根前面可以接任何一根，只要比它矮：把扫描臂点亮，再打开筛选「只留比这根矮的」。', '在留下的格子里挑最大的，再算上这一根自己：取较大，然后 + 1。'],
    diagnose: (c, st) => (usesTap(c, 'seg') && st.filter[st.stage] !== 'lower' ? '扫描臂现在把前面每一根都扫进来了。接在一根比它高（或一样高）的柱子后面，就不是一根比一根高了：打开筛选。' : null),
    debrief: { title: '最长上升子序列', body: ['这一格的来路不再是固定的一两格，而是<b>前面所有符合条件的格子</b>，有几条要看数据。', '这个问题叫<b>最长上升子序列</b>：股价最长连涨了几段、一堆版本最多能排出多长的升级路线，用的都是它。'], note: '来路可以是一整段：在所有比我矮的格子里取最大，再 + 1。' },
  },
  {
    id: 'change', ch: 11, title: '凑零钱', short: '每种硬币各退一步', mode: 'circuit', robot: 'broom',
    intro: [
      { t: '用 1 元、2 元、5 元的硬币凑出 7 元，<b>最少要几枚</b>？又有<b>几种付法</b>？', fig: { cells: row(8, i => (i === 0 ? 0 : i === 7 ? '?' : ''), i => (i === 7 ? 'sel' : i === 0 ? 'lit' : '')), edges: [] } },
      { t: '格子 i 记着凑出 i 元的答案。只看<b>最后一枚</b>硬币：它可能是 1 元、2 元或 5 元，付它之前，分别凑到了 i − 1、i − 2、i − 5 元。' },
      { t: '这一关的扫描臂按<b>每种硬币各退一枚</b>来扫：有几种硬币，就送来几格。退到 0 元以下的是「界外」。' },
    ],
    mission: { goal: '用给定的几种硬币凑钱。先算最少要几枚硬币，再算一共有几种付法（先付哪一枚算不同的付法）。凑不出来就是「—」。', how: '这一关有两个阶段，电路板会留到第二阶段。' },
    tests: [{ n: 7, coins: [1, 2, 5] }, { n: 11, coins: [1, 2, 5] }, { n: 7, coins: [3, 5] }],
    testLabel: t => `${t.n} 元 · ${t.coins.join('、')} 元硬币`,
    stages: [
      {
        world: 'coins', facts: ['ground'], palette: KIT, ask: '最少要几枚硬币？',
        solution: circ([['a', 'add'], ['k', 'const', 1], ['m', 'mmin'], ['z', 'const', 0], ['g', 'pass']], ['tap:seg>a:0', 'k>a:1', 'a>m:0', 'tap:ground>g:0', 'z>g:1', 'g>m:1', 'm>out:cell']),
        hints: ['最后一枚可能是任何一种硬币：点亮扫描臂，它送来每种硬币各退一枚之前的格子。', '加法器能给一整段的每个数都 + 1（算上最后这一枚），再接「取较小」。', '0 元不需要硬币：「是 0 元」放行一个 0。'],
        done: { head: '最少几枚算好了', body: ['同一张表，换个问题：一共有几种付法？想想要换哪个元件。'] },
      },
      {
        world: 'coins', facts: ['ground'], palette: KIT, carry: true, ask: '一共有几种付法？先付哪一枚，算不同的付法。',
        solution: circ([['m', 'msum'], ['k', 'const', 1], ['g', 'pass']], ['tap:seg>m:0', 'tap:ground>g:0', 'k>g:1', 'g>m:1', 'm>out:cell']),
        hints: ['最后一枚是哪一种都行，每种都算：把每种硬币退一枚之前的付法数加起来。', '0 元算一种付法（什么也不付）：「是 0 元」放行一个 1。这次不用 + 1 了。'],
      },
    ],
    debrief: { title: '硬币问题', body: ['扫描臂按每种硬币各退一步，因为最后一枚可能是任何一种。求最少几枚，取较小再 + 1；数付法，就加起来。', '看看第二个问题的答案：1 + 2 和 2 + 1 被算成了两种。表只记「凑到了几元」，不记用过哪些硬币，所以<b>先付哪一枚</b>就算不同的付法。只想数组合的话，得一种硬币一种硬币地加进来，就像第 10 章的背包表。'], note: '凑零钱：最后一枚可能是任何一种硬币，来路就是每种硬币各退一步。' },
  },
  {
    id: 'wordbreak', ch: 11, title: '拆单词', short: '挑出刚好是一个词的', mode: 'circuit', robot: 'broom',
    intro: [
      { t: '一串字母没有空格，比如 catsanddog。它能不能切成词典里的词？', fig: { cells: letters('catsanddog'), edges: [] } },
      { t: '格子 i 记：<b>前 i 个字母能不能切开</b>。第 0 格是开头，一个字母都没有，当然能。' },
      { t: '只看最后一个词：它从前面某个位置开始，到这里结束。只要那个位置<b>能切开</b>，而且那一截<b>刚好是一个词</b>，这里就能切开。' },
      { t: '扫描臂会扫过前面每个位置，视野里标出每一截是什么。用筛选只留下刚好是词的那些。' },
    ],
    mission: { goal: '判断每串字母能不能切成词典里的词。', how: '这一关会检查整行。词典写在测试旁边；扫描臂的筛选开关在视野里。' },
    world: 'words', facts: ['ground'], palette: YESNO, checkAll: true, solutionFilter: 'word',
    tests: [{ s: 'catsanddog', dict: ['cat', 'cats', 'and', 'sand', 'dog'] }, { s: 'penpineapple', dict: ['pen', 'pine', 'apple', 'pineapple'] }, { s: 'catsandog', dict: ['cat', 'cats', 'and', 'sand', 'dog'] }],
    testLabel: t => t.s,
    after: t => `<div class="afterbox"><span class="eyebrow">词典</span><div class="diff">${t.dict.map(w => `<span class="dt">${w}</span>`).join('')}</div></div>`,
    solution: circ([['m', 'many']], ['tap:seg>m:0', 'tap:ground>m:1', 'm>out:cell']),
    hints: ['打开扫描臂的筛选「只留刚好是一个词的」：留下的位置，从那里到这里刚好是个词。', '留下的位置里只要有一个能切开，这里就能切开：接「任一是」。开头本身能切开，「是开头」也接进去。'],
    diagnose: (c, st) => (usesTap(c, 'seg') && st.filter[st.stage] !== 'word' ? '扫描臂把前面每个位置都扫进来了，可只有「从那里到这里刚好是一个词」的位置才算数：打开筛选。' : null),
    unlock: 'wordbreak',
    debrief: { title: '切词', body: ['搜索引擎遇到 bestbuy、输入法遇到一串没打空格的拼音，都要先切词。', '这一章的来路越来越自由：一整段、一个筛选条件、数量随数据变化。<b>只要来路都在前面、都已经算好，表就照样能填。</b>'], note: '切词：前面某个位置能切开，那一截又刚好是个词，这里就能切开。' },
  },
];
