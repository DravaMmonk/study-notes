// 远望's new levels (CURRICULUM.md, 第 2 代): the stair counter behind a gate, a palindrome picked out of a word on the
// interval table, parity counted with yes / no parts alone (a challenge), and the first step of the spelling topic.

import { circ, usesSensor } from '../../kit/domains/table/circuit/components.js';
import { T, tr } from '../../kit/domains/table/i18n.js';


export const farsight = [
  {
    id: 'brokenstairs', ch: 3, title: T('有坏台阶的楼梯', 'Broken stairs'), short: T('路线计数器加一道闸', 'The route counter behind a gate'), mode: 'circuit', robot: 'ranger',
    intro: [
      { t: T('这段楼梯有几级坏了，<b>踩不得</b>，画成石头的样子。每次还是迈 1 级或 2 级。', 'A few steps on this staircase are broken and <b>can’t be stepped on</b>; they are drawn like rocks. Each stride still goes up 1 or 2 steps.') },
    ],
    mission: { goal: T('每次迈 1 级或 2 级，不能踩在坏台阶上。算出爬到最上面一级有几种走法。', 'Each stride goes up 1 or 2 steps, never onto a broken step. Work out how many ways there are to reach the top step.'), how: T('从地面一级一级往上算。', 'Work up from the ground, one step at a time.') },
    world: 'strip', facts: ['ground', 'broken'],
    tests: [{ n: 6, broken: [3] }, { n: 8, broken: [2, 5] }, { n: 10, broken: [4, 7] }],
    solution: circ([['c', 'bp:stamp'], ['b', 'block']], ['tap:m1>c:0', 'tap:m2>c:1', 'tap:ground>c:2', 'tap:broken>b:0', 'c>b:1', 'b>out:cell']),
    hints: [
      T('元件箱里的<part-ref to="counter"></part-ref>也会数走法：前 1 级、前 2 级就是它的两条来路，是地面就是它的起点。', 'The <part-ref to="counter"></part-ref> in your components box counts ways too: 1 step down and 2 steps down are its two ways in, and the ground is its start.'),
      T('坏台阶上要掐断：拦截闸在条件是「是」时输出「—」。', 'Cut off the broken steps: a Block gate outputs “—” when its condition is “yes”.'),
    ],
    diagnose: c => (!usesSensor(c, 'broken') ? tr('有的台阶坏了，踩不得。读一读「是坏台阶」。', 'Some steps are broken and can’t be stepped on. Read “is broken”.') : null),
    debrief: { title: T('和落石一样', 'Just like the rockfall'), body: [T('坏台阶上是「—」。上面的台阶加起来时跳过它，经过它的走法自然就不算了。', 'A broken step holds “—”. The steps above skip it when they add up, so the ways through it simply drop out.'), T('<level-ref to="rocks"></level-ref>在棋盘城市里做过同一件事：零件只认结构，不认是路口还是台阶。', '<level-ref to="rocks"></level-ref> did the same thing in the grid city: parts care about structure, not whether they count crossings or steps.')] },
  },
  {
    id: 'lps', ch: 3, title: T('最长回文子序列', 'The longest palindrome inside'), short: T('跳着挑也算', 'Skipping letters is allowed'), mode: 'circuit', robot: 'ranger',
    intro: [
      { t: T('从一串字母里挑出一些，顺序不变，可以跳着挑，让挑出来的字母<b>正着读、反着读都一样</b>。最多能挑几个？比如 CHARACTER 里能挑出 CARAC，一共 5 个。', 'Pick some letters out of a string, keeping their order but skipping any you like, so that what you picked <b>reads the same forwards and backwards</b>. How many can you pick at most? From CHARACTER, say, you can pick CARAC: 5 letters.') },
      { t: T('表和<level-ref to="palin"></level-ref>一样：第 i 到第 j 个字母这一段占一格，存「这一段里最多能挑几个」。一个字母自己就是回文，对角线已经填好 1。', 'The table is the one from <level-ref to="palin"></level-ref>: the run from letter i to letter j has a cell, holding “the most letters you can pick from this run”. A single letter is a palindrome on its own, so the diagonal is already filled with 1.') },
    ],
    mission: { goal: T('算出整串字母里，最长的回文子序列有几个字母。', 'Work out how many letters the longest palindrome you can pick from the whole string has.'), how: T('按长度从短到长扫。', 'Scan by length, shortest first.') },
    world: 'interval', facts: ['same'], empty0: true, diag: 1,
    tests: [{ s: 'CHARACTER' }, { s: 'AGBDBA' }, { s: 'BBABCBCAB' }],
    solution: circ([['a', 'add'], ['k', 'const', 2], ['g', 'pass'], ['m', 'mmax']], ['tap:dl>a:0', 'k>a:1', 'tap:same>g:0', 'a>g:1', 'tap:down>m:0', 'tap:left>m:1', 'g>m:2', 'm>out:cell']),
    hints: [
      T('两头的字母相同时，两头都能挑上。剩下要挑的是哪一段，在哪一格？', 'If the two end letters match, both can be picked. Which run is left to pick from, and which cell holds it?'),
      T('两头不同：至少有一头用不上。扔掉左头是下面一格，扔掉右头是左边一格，取较大。', 'If they differ, at least one end goes unused. Dropping the left end is the cell below, dropping the right end the cell to the left: take the larger.'),
    ],
    diagnose: c => (!usesSensor(c, 'dl') && usesSensor(c, 'same') ? tr('两头都挑上时，剩下的是去掉两头之后的那一段：左下那一格。', 'When both ends are picked, what is left is the run without both ends: the cell down-left.') : null),
    debrief: { title: T('又是同一副骨架', 'The same skeleton again'), body: [T('这块电路板和<level-ref to="lcs"></level-ref>几乎一样：一个取较大，加上一个「相同时 + 几」的放行闸。', 'This board is nearly the one from <level-ref to="lcs"></level-ref>: a max, plus a Pass gate that adds something when the letters match.'), T('对齐表比的是两个词，这里比的是一个词的两头。表换了形状，骨架没换。', 'The alignment table compares two words; here you compare the two ends of one word. The table changed shape; the skeleton did not.')] },
  },
  {
    id: 'parity', ch: 3, title: T('奇还是偶', 'Odd or even'), short: T('只用「是」和「否」数数', 'Counting with only yes and no'), mode: 'circuit', robot: 'ranger',
    intro: [
      { t: T('回到棋盘城市：只能往右或往下走。这次不问有几条路线，只问<b>路线数是奇数还是偶数</b>。表里只存「是 / 否」：「是」表示奇数。', 'Back to the grid city: only right or down. This time the question is not how many routes there are, but <b>whether the number is odd or even</b>. The table holds only yes / no: “yes” means odd.') },
      { t: T('你手里只有「是 / 否」的元件：任一是、取反、放行闸、拦截闸。', 'You only have the yes / no parts: any-yes, Not, the Pass gate and the Block gate.') },
    ],
    mission: { goal: T('让每个路口存「到这里的路线数是不是奇数」。起点算 1 条，是奇数。', 'Make every crossing hold “is the number of routes to here odd?”. The start counts as 1 route, which is odd.'), how: T('这一关检查每一格。', 'This level checks every cell.') },
    world: 'gridYes', facts: ['start'], checkAll: true,
    tests: [{ R: 4, C: 5 }, { R: 5, C: 6 }, { R: 6, C: 6 }],
    // Odd + odd is even, odd + even is odd: the XOR of up and left. A one-input any-yes turns a 「—」 from outside the
    // city into 「否」 (no route is an even count), and two Pass gates with Not build the XOR from it.
    solution: circ([['a', 'many'], ['b', 'many'], ['na', 'not'], ['nb', 'not'], ['p', 'pass'], ['q', 'pass'], ['m', 'many']], ['tap:up>a:0', 'tap:left>b:0', 'a>na:0', 'b>nb:0', 'a>p:0', 'nb>p:1', 'b>q:0', 'na>q:1', 'p>m:0', 'q>m:1', 'tap:start>m:2', 'm>out:cell']),
    // The naive board answers "can you get here", which is yes everywhere.
    naive: circ([['m', 'many']], ['tap:up>m:0', 'tap:left>m:1', 'tap:start>m:2', 'm>out:cell']),
    hints: [
      T('奇 + 奇 = 偶，奇 + 偶 = 奇：上面和左边怎样搭配时，这里才是奇数？', 'Odd + odd = even, odd + even = odd: which mix of up and left makes a crossing odd?'),
      T('城外送来的是「—」，可在这里它应该算偶数（0 条路线）。只接一个输入的「任一是」，会把「—」变成「否」。', 'Outside the city you get “—”, but here it should count as even (0 routes). An any-yes with a single input turns “—” into “no”.'),
    ],
    debrief: { title: T('你拼出了「异或」', 'You built XOR'), body: [T('「正好一个是」叫异或。你只用任一是、取反和放行闸，就把它拼了出来。', '“Exactly one is yes” is called XOR, and you built it from any-yes, Not and Pass gates alone.'), T('表的一格不必存完整的数，只要存问题需要的那一点。奇偶只要 1 位就够了。', 'A cell need not hold the whole number, only the part the question needs. Odd or even takes a single bit.')] },
  },
  {
    id: 'replace', ch: 3, title: T('改一个字母', 'Change a letter'), short: T('只许替换', 'Replacements only'), mode: 'circuit', robot: 'ranger',
    intro: [
      { t: T('拼写纠错：输错一个词时，看它离正确的词有多远。这一关只许一种改法：<b>把一个字母换成另一个</b>，每换一个算 1 步。两个词一样长。', 'Spelling correction: when a word is mistyped, see how far it is from the right one. In this level only one kind of change is allowed: <b>swap one letter for another</b>, 1 step each. The two words are the same length.') },
      { t: T('表还是对齐表：上面一个词，左边一个词。只换字母时，左边第 i 个字母只会对上上面第 i 个，所以答案沿着对角线走过来。', 'The table is still the alignment table: one word along the top, one down the left. With swaps only, letter i on the left only ever lines up with letter i on top, so the answer comes down the diagonal.') },
    ],
    mission: { goal: T('算出把左边的词改成上面的词，最少要换几个字母。', 'Work out the fewest letters to swap to turn the word on the left into the word on top.'), how: T('左上那一格是「前面的字母都改好了」。', 'The cell up-left means “all the letters before are already fixed”.') },
    world: 'align', border0: false, facts: ['same', 'start'],
    tests: [{ left: 'CAT', top: 'CUT' }, { left: 'GLOVE', top: 'GRAVE' }, { left: 'PAPER', top: 'TAPES' }],
    solution: circ([['k', 'const', 1], ['a', 'add'], ['g', 'pass'], ['z', 'const', 0], ['h', 'pass'], ['m', 'mmin']], ['tap:ul>a:0', 'k>a:1', 'tap:same>g:0', 'tap:ul>g:1', 'tap:start>h:0', 'z>h:1', 'a>m:0', 'g>m:1', 'h>m:2', 'm>out:cell']),
    hints: [
      T('字母相同就不用换：左上原样留下。不同就换一个：左上 + 1。取较小。', 'If the letters match, nothing to swap: keep up-left as it is. If they differ, swap one: up-left + 1. Take the smaller.'),
      T('起点是两个空词，0 步。', 'The start is two empty words: 0 steps.'),
    ],
    diagnose: c => (usesSensor(c, 'up') || usesSensor(c, 'left') ? tr('这一关只许换字母，用不上上面和左边：只看左上。', 'This level only allows swaps, so up and left are no use: look only at up-left.') : null),
    debrief: { title: T('沿着对角线', 'Down the diagonal'), body: [T('只看左上：前面都改好了，这一个字母要么不动，要么换掉。', 'Up-left only: everything before is fixed, and this letter either stays or is swapped.')] },
  },
];
