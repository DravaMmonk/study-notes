// Chapter 15: from the top — ask the question you want answered, and let it ask what it needs; then remember.

import { E, gridScene } from '../svg.js';
import { T } from '../i18n.js';

export const topdown = [
  {
    id: 'askall', ch: 14, title: T('问到底', 'Ask all the way down'), short: T('需要谁，就去问谁', 'Ask whoever you need'), mode: 'ask', ask: { kind: 'grid', R: 3, C: 4 },
    intro: [
      { t: T('到这里为止，你一直在<b>从下往上</b>填表：机器人按顺序扫，每一格只看已经算好的邻居。这一章换个方向：<b>从上往下</b>，从要问的那一格出发，需要谁就去问谁。', 'Up to now you have always filled tables <b>from the bottom up</b>: the robot scans in order, and each cell looks only at neighbours already computed. This chapter turns that round: <b>from the top down</b>, you start from the cell you want answered and ask whichever cells it needs.') },
      { t: T('还是数路线。想知道到终点有几条路线？去问「上面那格有几条」和「左边那格有几条」。它们答不上来，就接着问自己的上面和左边……一直问到起点。起点知道答案：1。', 'Counting routes again. Want to know how many routes reach the end? Ask “how many reach the cell above” and “how many reach the cell to the left”. If they can’t answer, they go on to ask their own up and left… all the way to the start. The start knows its answer: 1.'), fig: { ...gridScene(2, 3, { cell: (r, c) => (r === 1 && c === 2 ? { value: '?', cls: 'sel' } : r === 0 && c === 0 ? { value: 1, cls: 'src' } : { value: '?' }), edge: () => 'dim' }), edges: [E('0,2', '1,2', 'hot'), E('1,1', '1,2', 'hot')] } },
      { t: T('图上每个圆圈是一个问题，角上写着它问的是第几行第几列。点一个带问号的圆圈，它就会变成它需要的小问题。小问题都答完了，答案会自己往上传。', 'Each circle in the picture is a question, with the row and column it asks about in its corner. Click a circle with a question mark and it turns into the smaller questions it needs. Once the small questions are all answered, the answers pass back up by themselves.') },
    ],
    mission: { goal: T('从终点开始提问，一直问到起点，求出到终点有几条路线。数一数，一共问了几次。', 'Start asking at the end and keep asking down to the start, to find how many routes reach the end. Count how many questions you asked in all.'), how: T('点带问号的圆圈提问，或者让机器一口气问完。', 'Click circles with a question mark to ask, or let the machine ask everything in one go.') },
    debrief: { title: T('问到底', 'Asked all the way down'), body: [T('从上往下问，也能得到答案，而且<b>不用事先想好顺序</b>：需要谁就问谁，自然会问到起点。', 'Asking from the top down gets the answer too, and <b>without working out an order first</b>: ask whoever you need, and you naturally end up at the start.'), T('可是看看提问次数：表只有 12 格，却问了 34 次。同一种颜色的圆圈一次又一次出现，每次都从头问到底。', 'But look at how many questions it took: the table has only 12 cells, yet 34 questions were asked. Circles of the same colour turn up again and again, and each time they ask all the way down from scratch.')], note: T('从上往下：需要谁就问谁，不用先排顺序。', 'Top down: ask whoever you need, with no order to plan first.') },
  },
  {
    id: 'memo2', ch: 14, title: T('记下来', 'Write it down'), short: T('问过的不再问', 'Never ask the same thing twice'), mode: 'ask', ask: { kind: 'grid', R: 4, C: 5, memo: true },
    intro: [
      { t: T('换一座 4×5 的城市。先照上一关那样问一遍，看看要问多少次。', 'On to a 4×5 city. First ask your way through it as in the last level, and see how many questions it takes.') },
      { t: T('然后打开规则面板里的「<b>记下来</b>」开关：每个格子问出答案后，就记在表里。下次再被问到，直接从表里拿，不再往下问。', 'Then turn on the “<b>Write it down</b>” switch in the side panel: once a cell’s answer is known, it is written into the table. The next time that cell is asked, the answer comes straight from the table, with no more asking.') },
      { t: T('问完以后，看看这些问题摆成了什么样子。', 'When you have finished asking, look at the shape the questions make.') },
    ],
    mission: { goal: T('打开「记下来」，从终点问到起点，求出路线数。比一比开关前后，一共问了几次。', 'Turn on “Write it down” and ask from the end down to the start to find the number of routes. Compare how many questions it took with the switch off and on.'), how: T('先关着开关问一遍也行。打开开关后，问题摆在它在表里的位置上；被记下的格子再被问到，会画一根蓝色箭头。', 'You can ask once with the switch off first. With it on, each question sits at its own place in the table, and when a cell that has been written down is asked again, a blue arrow is drawn.') },
    unlock: 'topdown',
    debrief: { title: T('树坍缩成了表', 'The tree collapses into a table'), body: [T('不记的话，4×5 的城市要问一百多次；记下来以后，每个格子只问一次，一共 20 次。', 'Without writing anything down, the 4×5 city takes over a hundred questions; with it, each cell is asked only once, 20 in all.'), T('再看看问题摆出来的样子：每个格子指向它上面和左边的格子，<b>正是你前面十几章亲手画过的那张表</b>。从上往下问再加上记忆，叫作<b>备忘递归</b>，它和填表是同一张图的两种走法。', 'Now look at the shape the questions make: each cell points to the cells above it and to its left, <b>exactly the table you have been drawing by hand for a dozen chapters</b>. Asking from the top down plus remembering is called <b>memoised recursion</b>, and it and table filling are two ways of walking the same graph.')], note: T('备忘递归 = 从上往下问 + 记下问过的答案。它和填表是同一张图。', 'Memoised recursion = asking from the top down + writing down every answer. It and table filling are the same graph.') },
  },
  {
    id: 'selforder', ch: 14, title: T('它自己找顺序', 'It finds its own order'), short: T('递归走出来的顺序', 'The order recursion walks'), mode: 'ask', ask: { kind: 'interval', w: [4, 1, 3, 2] },
    intro: [
      { t: T('第 13 章里，你给区间表拨过扫描顺序。如果不拨顺序，<b>直接从右上角那一格开始问</b>，会怎样？', 'In chapter 13 you set scan orders for the interval table. What happens if you set no order at all and <b>just start asking from the top-right cell</b>?') },
      { t: T('这一关不用拼电路：看备忘递归一步一步地问。合并石子的每一格，先问它每个切分点的左段和右段，等它们都答完了，自己才算得出来。问过的格子直接拿答案。', 'No circuit to build this level: watch memoised recursion ask, step by step. Each cell of “merging stones” first asks the left part and right part at each of its split points, and only when they have all answered can it work out its own value. Cells already asked hand over their answer straight away.') },
      { t: T('格子角上的 #数字，是它<b>算完的先后</b>。走完以后，和「按长度」的顺序比一比。', 'The #number in a cell’s corner is <b>the order in which it was finished</b>. When the walk is over, compare it with the “by length” order.') },
    ],
    mission: { goal: T('看完备忘递归在区间表上的每一步，比较它算完格子的顺序，再回答问题。', 'Watch every step memoised recursion takes on the interval table, compare the order it finishes the cells in, then answer the question.'), how: T('点下方的「走一步」或「自动走完」。', 'Click “Step” or “Run to the end” below.') },
    question: { q: T('递归走出来的顺序，和按长度的顺序不一样。哪个是对的？', 'The order recursion walks is not the same as the by-length order. Which one is right?'), opts: [T('都对：两种顺序里，每一格都排在它要读的格子后面', 'Both: in each order, every cell comes after the cells it reads'), T('只有按长度的对：短的段必须全部先算完', 'Only by length: every short run must be finished first'), T('只有递归的对：它是从答案那一格倒推出来的', 'Only recursion: it works back from the answer cell')], a: 0 },
    debrief: { title: T('顺序自己冒出来了', 'The order emerged by itself'), body: [T('递归走出的顺序和按长度的顺序不一样，可它们都对：<b>每一格都在它要读的格子之后算完</b>。递归不用你操心顺序，问到哪里，就先把需要的格子算好。', 'The order recursion walks differs from the by-length order, yet both are right: <b>every cell is finished after the cells it reads</b>. With recursion you don’t have to worry about the order: wherever the asking goes, the cells it needs get worked out first.'), T('代价是一份记账：不记下来的话，石堆一多，同一个格子会被问上成百上千次，这正是第 7 章「为什么这么快」里看到的事。', 'The price is some bookkeeping: without writing answers down, once there are more piles the same cell gets asked hundreds or thousands of times, just as you saw in chapter 7, “Why it is so fast”.')], note: T('备忘递归自己找出一个合法的顺序：先把需要的算好，再算自己。', 'Memoised recursion finds a valid order by itself: work out what you need first, then yourself.') },
  },
];
