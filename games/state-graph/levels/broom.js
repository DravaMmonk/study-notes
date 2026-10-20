// 扫帚's new levels (CURRICULUM.md, 第 4 代): the word-cutting topic grows from "fewest pieces" to pieces with costs and
// then a real sentence, where a letter outside the dictionary may stand alone at a high price; and a challenge, the
// best run of days, where the sweep arm is the wrong tool.

import { circ, usesSensor } from '../../kit/domains/table/circuit/components.js';
import { T, tr } from '../../kit/domains/table/i18n.js';

const KIT = ['msum', 'mmin', 'mmax', 'add', 'const', 'pass', 'block'];
const dictBox = t => `<div class="afterbox"><span class="eyebrow">${tr('词典 · 代价', 'Dictionary · cost')}</span><div class="diff">${Object.entries(t.dict).map(([w, c]) => `<span class="dt">${w} · ${c}</span>`).join('')}${t.letter !== undefined ? `<span class="dt">${tr(`单个字母 · ${t.letter}`, `a single letter · ${t.letter}`)}</span>` : ''}</div></div>`;
// The topic's board: at every cut, the table there + the piece's cost; the cheapest of them, and 0 at the start.
const CUTTER = circ([['a', 'add'], ['m', 'mmin'], ['z', 'const', 0], ['g', 'pass']], ['tap:seg>a:0', 'tap:cost>a:1', 'a>m:0', 'tap:ground>g:0', 'z>g:1', 'g>m:1', 'm>out:cell']);

export const broom = [
  {
    id: 'wordcost', ch: 11, title: T('有的词更贵', 'Some words cost more'), short: T('每一块的代价不同', 'Every piece has its own cost'), mode: 'circuit', robot: 'broom',
    intro: [
      { t: T('常见的词便宜，生僻的词贵：词典里每个词标着一个<b>代价</b>。切法的代价是每一块加起来，挑最省的切法。', 'Common words are cheap and rare ones dear: every word in the dictionary has a <b>cost</b>. A way of cutting costs the sum of its pieces; find the cheapest.') },
      { t: T('块数最少的切法，不一定最省。', 'The way with the fewest pieces is not always the cheapest.') },
    ],
    mission: { goal: T('算出每串字母最省的切法要花多少代价。', 'Work out what the cheapest way to cut each string costs.'), how: T('词典和代价写在测试旁边。', 'The dictionary and its costs are shown next to the tests.') },
    world: 'pieces', facts: ['ground'], palette: KIT,
    tests: [
      { s: 'pineapplepen', dict: { pine: 2, apple: 1, pineapple: 4, pen: 1 } },
      { s: 'catsanddog', dict: { cat: 1, cats: 3, and: 1, sand: 2, dog: 1 } },
      { s: 'icecreamcone', dict: { ice: 1, cream: 1, icecream: 3, cone: 1, creamcone: 1 } },
    ],
    testLabel: t => t.s, after: dictBox,
    solution: CUTTER,
    hints: [T('和上一关比，变的只有每一块的代价。', 'Compared with last level, only each piece’s cost has changed.')],
    debrief: { title: T('代价换了，电路没换', 'New costs, the same circuit'), body: [T('上一关每一块都算 1，所以数的是块数。代价一换，同一块电路板就去找最省的切法。', 'Last level every piece cost 1, so it counted pieces. Change the costs, and the same board finds the cheapest cut.')] },
  },
  {
    id: 'segment', ch: 11, title: T('分词', 'Word segmentation'), short: T('不认识的词也得切开', 'Even unknown words get cut'), mode: 'circuit', robot: 'broom',
    intro: [
      { t: T('一句真实的话：词典里不是每个词都有，人名、新词常常查不到。查不到的部分，就<b>一个字母一块</b>地切，只是每个字母都很贵。', 'A real sentence: not every word is in the dictionary, and names and new words often aren’t. Whatever can’t be found is cut <b>one letter to a piece</b>, at a high price per letter.') },
      { t: T('这样每一句都切得开，而认识的词总是更省。', 'That way every sentence can be cut, and known words are always cheaper.') },
    ],
    mission: { goal: T('算出每句话最省的切法要花多少代价。', 'Work out what the cheapest cut of each sentence costs.'), how: T('单个字母的代价写在词典最后。', 'What a single letter costs is shown at the end of the dictionary.') },
    world: 'pieces', facts: ['ground'], palette: KIT,
    tests: [
      { s: 'mycatzedsleeps', dict: { my: 1, cat: 1, cats: 2, sleep: 1, sleeps: 1, eps: 2 }, letter: 5 },
      { s: 'thedogranhome', dict: { the: 1, dog: 1, ran: 1, home: 1, ho: 2, me: 1 }, letter: 4 },
      { s: 'ilovebobsbikes', dict: { i: 1, love: 1, bike: 1, bikes: 1, lo: 2, ve: 2 }, letter: 3 },
    ],
    testLabel: t => t.s, after: dictBox,
    solution: CUTTER,
    hints: [T('单个字母也是一块，代价在词典里写着。', 'A single letter is just another piece, with its cost in the dictionary.')],
    debrief: { title: T('分词', 'Word segmentation'), body: [T('中文没有空格，输入法和搜索引擎都要先分词，用的就是这块电路板：每个切点试一遍，加上这一块的代价，取最省的。', 'Chinese has no spaces, so input methods and search engines segment words first, with this very board: try every cut, add the piece’s cost, keep the cheapest.'), T('「最少几块」「有的词更贵」都是它的特例：代价全是 1，或者没有单字母兜底。', '“The fewest pieces” and “Some words cost more” are its special cases: every cost 1, or no single letters to fall back on.')] },
  },
  {
    id: 'maxsub', ch: 11, title: T('最大的一段', 'The best stretch'), short: T('一格存什么？', 'What should a cell hold?'), mode: 'circuit', robot: 'broom',
    intro: [
      { t: T('一个小摊每天的收支：赚了是正，赔了是负。<b>连续的哪几天</b>加起来最多？', 'A market stall’s daily takings: a profit is positive, a loss negative. Which <b>run of consecutive days</b> adds up to the most?') },
    ],
    mission: { goal: T('算出连续若干天的收支加起来，最多是多少。', 'Work out the largest total of any run of consecutive days.'), how: T('答案是表里最大的那一格。', 'The answer is the largest cell in the table.') },
    world: 'gains', facts: ['money'], palette: KIT,
    tests: [{ a: [-2, 1, -3, 4, -1, 2, 1, -5, 4] }, { a: [3, -4, 5, -1, 2, -6, 3] }, { a: [-1, 2, 3, -7, 4, 1, -2, 5] }],
    // A cell holds the best run that ends today: today alone, or today added to the best run that ended yesterday.
    solution: circ([['c', 'bp:knaptable']], ['tap:money>c:0', 'tap:prev>c:1', 'tap:money>c:2', 'c>out:cell']),
    // The naive board adds up every day so far: the best total that starts on day 1.
    naive: circ([['m', 'msum']], ['tap:seg>m:0', 'm>out:cell']),
    hints: [T('一格不一定要存「到今天为止最好的一段」。它还能存什么？', 'A cell need not hold “the best run up to today”. What else could it hold?'), T('以今天结尾的最好一段，要么只有今天，要么是昨天结尾的最好一段再加上今天。', 'The best run ending today is either today alone, or the best run ending yesterday with today added.')],
    diagnose: c => (usesSensor(c, 'seg') ? tr('扫描臂加起来的，总是从第 1 天开始的那一段。可最好的一段不一定从第 1 天开始。', 'What the sweep arm adds up always starts on day 1, but the best run need not.') : null),
    debrief: { title: T('根本不用扫描臂', 'No sweep arm needed'), body: [T('一格只存「以今天结尾最多」：今天单独，或者接在昨天后面。整段最好的，就是表里最大的那一格。', 'A cell holds only “the best that ends today”: today alone, or joined to yesterday. The best run overall is the largest cell in the table.'), T('选对了一格存什么，就只要看左边一格。', 'Choose the right thing for a cell to hold, and the cell to the left is all you need.')] },
  },
];
