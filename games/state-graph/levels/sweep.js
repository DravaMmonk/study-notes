// Chapter 12: a cell's sources can be a whole segment — the broom robot's arm sweeps it, a filter picks from it.

import { houseRow, lettersFig, rowFig } from '../../kit/domains/table/svg.js';
import { circ, usesSensor } from '../../kit/domains/table/circuit/components.js';
import { T, tr } from '../../kit/domains/table/i18n.js';

export const sweep = [
  {
    id: 'prefix', ch: 11, title: T('前面所有的', 'Everything before'), short: T('扫描臂一次读一整段', 'A sweep arm reads a whole run at once'), mode: 'circuit', robot: 'broom',
    intro: [
      { t: T('新的一章，新的机器人「扫帚」。它多了一条<part-ref to="sweep"></part-ref>，能一次扫过一整段格子，把整段的数一起送进电路板。', 'A new chapter and a new robot: Broom. It has a <part-ref to="sweep"></part-ref> that sweeps a whole run of cells in one go and feeds every number in the run into the circuit board.') },
      { t: T('一条街上，每家门口放着一些钱。机器人要在每家下面写：<b>从 1 号到这一家，一共有多少钱</b>。', 'Along a street, each house has some money at its door. Under each house the robot must write: <b>how much money there is in total from house 1 up to this one</b>.'), fig: { cells: houseRow([3, 1, 4, 1, 5]), edges: [] } },
      { t: T('扫描臂送来的是<b>一整段</b>：接到电路板上的线会变粗。汇合器能直接吃下一整段，段里的每个数都参与。', 'What the sweep arm sends is <b>a whole run</b>: its wire on the circuit board is drawn thicker. A Merger can take a whole run directly, and every number in it takes part.') },
    ],
    mission: { goal: T('在每家下面写上：从 1 号到这一家，一共有多少钱。', 'Under each house, write how much money there is in total from house 1 up to this one.'), how: T('这一关有两个阶段，会检查整行。先用扫描臂；通过后，扫描臂会被收起来。', 'This level has two stages and checks the whole row. Use the sweep arm first; once you pass, the arm is folded away.') },
    tests: [{ a: [3, 1, 4, 1, 5] }, { a: [2, 7, 1, 8, 2, 8] }],
    testLabel: t => tr(`${t.a.length} 户人家`, `${t.a.length} houses`),
    stages: [
      {
        world: 'prefix', facts: ['money'], checkAll: true, ask: T('用扫描臂把 1 号到这一家的钱一次扫进来，加起来。', 'Use the sweep arm to bring in the money from house 1 to this one in one go, and add it up.'),
        solution: circ([['m', 'msum']], ['tap:seg>m:0', 'm>out:cell']),
        hints: [T('在视野下面点<part-ref to="sweep"></part-ref>，读它扫过的那一整段。', 'Click the <part-ref to="sweep"></part-ref> under the view to read the whole run it passes over.'), T('把这一整段接进「加起来」汇合器，再接到本格。', 'Wire the whole run into a “sum” Merger, then wire that to this cell.')],
        done: { head: T('扫出来了', 'Swept'), body: [T('可是扫描臂每到一家，都要从 1 号重新扫一遍：第 100 家要读 100 格。', 'But at every house, the sweep arm sweeps again from house 1: house 100 means reading 100 cells.'), T('<b>左边那一格，不是已经存着「到上一家一共多少」了吗？</b>下一阶段，扫描臂收起来了。', '<b>Doesn’t the cell on the left already hold “the total up to the previous house”?</b> In the next stage, the sweep arm is folded away.')] },
      },
      {
        world: 'prefix', facts: ['money'], checkAll: true, noArm: true, ask: T('扫描臂收起来了：只用左边一格和这家的钱。', 'The sweep arm is folded away: use only the cell on the left and this house’s money.'),
        solution: circ([['a', 'add']], ['tap:prev>a:0', 'tap:money>a:1', 'a>out:cell']),
        hints: [T('到这一家一共的钱 = 到上一家一共的钱 + 这家的钱。', 'Total up to this house = total up to the previous house + this house’s money.'), T('读「上一格」和「这家的钱」，接进加法器。', 'Read “previous” and “this house’s money”, and wire them into an Adder.')],
      },
    ],
    unlock: 'sweep',
    debrief: { title: T('能用上一格，就别重扫', 'If the last cell will do, don’t sweep again'), body: [T('两种做法答案一样。可扫描臂在第 n 家要读 n 格，100 户人家一共要读 5050 格；用左边一格，每家只读 1 格，一共 100 格。', 'Both ways give the same answers. But the sweep arm reads n cells at house n, so 100 houses take 5,050 reads in all; using the cell on the left, each house reads just 1 cell, 100 in all.'), T('<b>能用上一格存好的答案，就别从头再扫一遍</b>：这是动态规划的老规矩。', '<b>If the previous cell has already stored the answer, don’t sweep again from the start</b>: that is an old rule of dynamic programming.')], note: T('前缀和：到这一家一共 = 到上一家一共 + 这家。能用上一格，就别重扫。', 'Prefix sums: total up to this house = total up to the previous one + this house. If the last cell will do, don’t sweep again.') },
  },
  {
    id: 'rising', ch: 11, title: T('越来越高', 'Ever taller'), short: T('在一整段里挑', 'Pick from a whole run'), mode: 'circuit', robot: 'broom',
    intro: [
      { t: T('一排高矮不一的柱子。从左往右挑出几根，要求<b>一根比一根高</b>，中间可以跳过。最多能挑几根？', 'A row of posts of different heights. Pick some from left to right so that <b>each is taller than the one before</b>; you may skip posts in between. What is the most you can pick?'), fig: { cells: houseRow([3, 1, 4, 1, 5, 9, 2, 6], j => ([1, 2, 4, 5].includes(j) ? 'hot' : '')), edges: [] } },
      { t: T('每一格记：<b>以这一根结尾</b>，最多能连几根。整排的答案，就是这一行里最大的那个。', 'Each cell records: <b>ending with this post</b>, the longest run you can make. The answer for the whole row is the largest cell in the row.') },
      { t: T('只看最后一根：它前面接的是哪一根？可以是前面<b>任何一根</b>，只要比它矮。前面有几根，来路就可能有几条。这正是扫描臂的活儿：它把前面每一格（每一根柱子下面记着的答案）一起送进来。', 'Look only at the last post: which post comes before it? It can be <b>any earlier post</b>, as long as it is shorter. However many posts come before, that is how many ways in there may be. That is exactly the sweep arm’s job: it brings in every earlier cell (the answer recorded under each post) at once.') },
      { t: T('最左边那个「起」格，当它是一根比谁都矮的柱子，存着 0：接在它后面，就表示这一根是第一根。这台机器的扫描臂带着<b>筛选</b>：只留比这一根矮的柱子，筛掉的格子在视野里是暗的。', 'Treat the “S” cell on the far left as a post shorter than all the others, holding 0: coming after it means this post is the first. This machine’s sweep arm has a <b>filter</b>: it keeps only the posts shorter than this one, and the cells it drops are dimmed in the view.') },
    ],
    mission: { goal: T('从左往右挑柱子，要一根比一根高（可以跳过）。算出每根柱子作为最后一根时最多能连几根，整排的答案是其中最大的。', 'Pick posts from left to right, each taller than the last (skipping is allowed). For each post, work out the longest run that ends with it; the answer for the row is the largest of these.'), how: T('这一关会检查整行。扫描臂只送来比这一根矮的柱子，被筛掉的格子是暗的。', 'This level checks the whole row. The sweep arm only brings in posts shorter than this one; the cells it filters out are dimmed.') },
    world: 'heights', facts: ['money'], checkAll: true, solutionFilter: 'lower',
    tests: [{ a: [3, 1, 4, 1, 5, 9, 2, 6] }, { a: [5, 4, 3, 2, 1] }, { a: [2, 6, 3, 4, 1, 7, 5] }],
    solution: circ([['m', 'mmax'], ['k', 'const', 1], ['a', 'add']], ['tap:seg>m:0', 'm>a:0', 'k>a:1', 'a>out:cell']),
    hints: [T('这一根前面可以接任何一根，只要比它矮：点扫描臂，它只会送来比这一根矮的柱子。', 'This post can follow any post shorter than it: click the sweep arm, and it brings in only the posts shorter than this one.'), T('在留下的格子里挑最大的，再算上这一根自己：取较大，然后 + 1。', 'Pick the largest of the cells that remain, then count this post itself: max, then + 1.')],
    debrief: { title: T('最长上升子序列', 'Longest increasing subsequence'), body: [T('这一格的来路不再是固定的一两格，而是<b>前面所有符合条件的格子</b>，有几条要看数据。', 'This cell’s ways in are no longer one or two fixed cells, but <b>every earlier cell that meets the condition</b>, and how many there are depends on the data.'), T('这个问题叫<wiki-ref to="lis"></wiki-ref>：从一串股价里最多挑出几天、一天比一天高，一堆版本最多能排出多长的升级路线，用的都是它。', 'This problem is called the <wiki-ref to="lis"></wiki-ref>: the most days you can pick from a run of share prices with each day higher than the last, or the longest upgrade path through a pile of versions, both come down to it.')], note: T('来路可以是一整段：在所有比我矮的格子里取最大，再 + 1。', 'The way in can be a whole run: take the max over the cells of every shorter post, then + 1.') },
  },
  {
    id: 'change', ch: 11, title: T('凑零钱', 'Making change'), short: T('每种硬币各退一步', 'Step back by each kind of coin'), mode: 'circuit', robot: 'broom',
    intro: [
      { t: T('用 1 元、2 元、5 元的硬币凑出 7 元，<b>最少要几枚</b>？又有<b>几种付法</b>？', 'With 1, 2 and 5 yuan coins, how do you make 7 yuan with <b>the fewest coins</b>? And <b>how many ways</b> are there to pay it?'), fig: { cells: rowFig(8, i => (i === 0 ? 0 : i === 7 ? '?' : ''), i => (i === 7 ? 'sel' : i === 0 ? 'lit' : '')), edges: [] } },
      { t: T('格子 i 记着凑出 i 元的答案。', 'Cell i holds the answer for making i yuan.') },
      { t: T('这一关的扫描臂按<b>每种硬币各退一枚</b>来扫：有几种硬币，就送来几格。退到 0 元以下的是「界外」。', 'This level’s sweep arm sweeps by <b>stepping back one coin of each kind</b>: as many kinds of coin, as many cells it sends. Stepping back below 0 yuan lands “out”.') },
    ],
    mission: { goal: T('用给定的几种硬币凑钱。先算最少要几枚硬币，再算一共有几种付法（先付哪一枚算不同的付法）。凑不出来就是「—」。', 'Make each amount from the given coins. First work out the fewest coins needed, then how many ways there are to pay (paying the coins in a different order counts as a different way). An amount that can’t be made is “—”.'), how: T('这一关有两个阶段，电路板会留到第二阶段。', 'This level has two stages, and the circuit board carries over to the second.') },
    tests: [{ n: 7, coins: [1, 2, 5] }, { n: 11, coins: [1, 2, 5] }, { n: 7, coins: [3, 5] }],
    testLabel: t => tr(`${t.n} 元 · ${t.coins.join('、')} 元硬币`, `${t.n} yuan · ${t.coins.join(', ')} yuan coins`),
    stages: [
      {
        world: 'coins', facts: ['ground'], ask: T('最少要几枚硬币？', 'What is the fewest coins needed?'),
        solution: circ([['a', 'add'], ['k', 'const', 1], ['m', 'mmin'], ['z', 'const', 0], ['g', 'pass']], ['tap:seg>a:0', 'k>a:1', 'a>m:0', 'tap:ground>g:0', 'z>g:1', 'g>m:1', 'm>out:cell']),
        hints: [T('最后一枚可能是任何一种硬币：点扫描臂，它送来付这一枚之前（每种硬币各退一枚之后）的格子。', 'The last coin can be any kind: click the sweep arm, which sends the cells from before paying it (one coin of each kind stepped back).'), T('加法器能给一整段的每个数都 + 1（算上最后这一枚），再接「取较小」。', 'An Adder can + 1 to every number in a whole run (counting this last coin), then wire it into “min”.'), T('0 元不需要硬币：「是 0 元」放行一个 0。', '0 yuan needs no coins: let a 0 through on “is 0 yuan”.')],
        done: { head: T('最少几枚算好了', 'Fewest coins done'), body: [T('同一张表，换个问题：一共有几种付法？想想要换哪个元件。', 'Same table, a different question: how many ways are there to pay? Think about which component to swap.')] },
      },
      {
        world: 'coins', facts: ['ground'], carry: true, ask: T('一共有几种付法？先付哪一枚，算不同的付法。', 'How many ways are there to pay? Paying the coins in a different order counts as a different way.'),
        solution: circ([['m', 'msum'], ['k', 'const', 1], ['g', 'pass']], ['tap:seg>m:0', 'tap:ground>g:0', 'k>g:1', 'g>m:1', 'm>out:cell']),
        hints: [T('最后一枚是哪一种都行，每种都算。', 'The last coin can be any kind, and each kind counts.'), T('0 元算一种付法（什么也不付）：「是 0 元」放行一个 1。这次不用 + 1 了。', '0 yuan counts as one way to pay (paying nothing): let a 1 through on “is 0 yuan”. No + 1 this time.')],
      },
    ],
    debrief: { title: T('硬币问题', 'The coin problem'), body: [T('扫描臂按每种硬币各退一步，因为最后一枚可能是任何一种。求最少几枚，取较小再 + 1；数付法，就加起来。', 'The sweep arm steps back by each kind of coin, because the last coin can be any kind. For the fewest coins, take the min and + 1; to count the ways to pay, add them up.'), T('看看第二个问题的答案：1 + 2 和 2 + 1 被算成了两种。表只记「凑到了几元」，不记用过哪些硬币，所以<b>先付哪一枚</b>就算不同的付法。只想数组合的话，得一种硬币一种硬币地加进来，就像<level-ref to="knaptable"></level-ref>。', 'Look at the answers to the second question: 1 + 2 and 2 + 1 were counted as two ways. The table records only “how much has been made”, not which coins were used, so <b>the order you pay in</b> makes a different way. To count combinations only, you would have to bring the coins in one kind at a time, like <level-ref to="knaptable"></level-ref>.')], note: T('凑零钱：最后一枚可能是任何一种硬币，来路就是每种硬币各退一步。', 'Making change: the last coin can be any kind, so the ways in are one step back by each kind of coin.') },
  },
  {
    id: 'wordbreak', ch: 11, title: T('最少切几块', 'The fewest pieces'), short: T('每一块都得是词', 'Every piece must be a word'), mode: 'circuit', robot: 'broom',
    intro: [
      { t: T('一串字母没有空格，比如 catsanddog。把它切成词典里的词，<b>最少切成几块</b>？', 'A string of letters with no spaces, such as catsanddog. Cut it into dictionary words: <b>how few pieces will do</b>?'), fig: { cells: lettersFig('catsanddog'), edges: [] } },
      { t: T('格子 i 记：<b>前 i 个字母最少切成几块</b>。第 0 格是开头，一个字母都没有，0 块。', 'Cell i records: <b>the fewest pieces the first i letters can be cut into</b>. Cell 0 is the start, with no letters at all: 0 pieces.') },
      { t: T('只看最后一块：它从前面某个切点开始，到这里结束。扫描臂扫过前面每个切点，一次送来<b>两段</b>：切点那里的格子，和从那里到这里那一块的代价。这一关，那一块是词就算 1，不是词就是「—」。', 'Look only at the last piece: it starts at some earlier cut and ends here. The sweep arm sweeps every earlier cut and brings <b>two runs</b> at once: the cell at each cut, and what the piece from there to here costs. In this level a piece that is a word costs 1, and one that isn’t is “—”.') },
    ],
    mission: { goal: T('算出每串字母最少切成几块词典里的词。', 'Work out the fewest dictionary words each string can be cut into.'), how: T('词典写在测试旁边。', 'The dictionary is shown next to the tests.') },
    world: 'pieces', facts: ['ground'], 
    tests: [{ s: 'catsanddog', dict: ['cat', 'cats', 'and', 'sand', 'dog'] }, { s: 'penpineapple', dict: ['pen', 'pine', 'apple', 'pineapple'] }, { s: 'wordbreaking', dict: ['word', 'break', 'breaking', 'wordbreak', 'king', 'in', 'g'] }],
    testLabel: t => t.s,
    after: t => `<div class="afterbox"><span class="eyebrow">${tr('词典', 'Dictionary')}</span><div class="diff">${(Array.isArray(t.dict) ? t.dict : Object.keys(t.dict)).map(w => `<span class="dt">${w}${Array.isArray(t.dict) ? '' : ` · ${t.dict[w]}`}</span>`).join('')}</div></div>`,
    solution: circ([['a', 'add'], ['m', 'mmin'], ['z', 'const', 0], ['g', 'pass']], ['tap:seg>a:0', 'tap:cost>a:1', 'a>m:0', 'tap:ground>g:0', 'z>g:1', 'g>m:1', 'm>out:cell']),
    hints: [T('每个切点：那里最少几块 + 这一块。加法器会把两段一项一项相加。', 'At every cut: the fewest pieces up to there + this piece. An Adder adds two runs up item by item.'), T('在所有切点里取较小。开头是 0 块：「是开头」放过一个 0。', 'Take the smallest over all the cuts. The start is 0 pieces: let a 0 through with “is start”.')],
    diagnose: c => (!usesSensor(c, 'cost') ? tr('扫描臂的第二段是每一块的代价：不是词的那一块是「—」，加法器会把它跳过。', 'The arm’s second run is each piece’s cost: a piece that isn’t a word is “—”, and the Adder drops it.') : null),
    unlock: 'wordbreak',
    debrief: { title: T('切词', 'Word breaking'), body: [T('搜索引擎遇到 bestbuy、输入法遇到一串没打空格的拼音，都要先切词。', 'A search engine that meets bestbuy, or a Chinese input method given a run of pinyin with no spaces, has to break it into words first.'), T('每个切点都试一遍，取最省的那个：来路的数量随数据变化，表照样能填。', 'Try every cut and keep the cheapest: the number of ways in changes with the data, and the table fills all the same.')] },
  },
];
