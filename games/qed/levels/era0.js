// 第 0 代 · 纸笔：还没有证明机。一句话对不对，一行一行地验：这就是真值表。符号从这里开始，一次一个。
const T = (zh, en) => ({ zh, en })

export const era0 = [
  {
    id: 'table',
    kind: 'truth',
    title: T('一句承诺', 'A promise'),
    ask: 'fill',
    formulas: ['Rain → Wet'],
    brief: T('天气预报说：「如果下雨，那么地湿。」四种天气里，这句话各是说对了（真）还是说错了（假）？点格子填出来。', 'The forecast says: “If it rains, then the ground is wet.” In each of the four kinds of weather, did it speak true or false? Click the cells to fill them in.'),
    hint: [
      T('什么时候你能理直气壮地说预报错了？只有一种情况。', 'When could you rightly say the forecast was wrong? In only one case.'),
      T('没下雨的那两行，预报说错了吗？它只说了下雨的时候会怎样。', 'On the two rows where it did not rain, was the forecast wrong? It only said what happens when it rains.'),
    ],
    intro: [
      { t: T('天气预报说：<b>如果下雨，那么地湿。</b>这句话可能说对，也可能说错。', 'The forecast says: <b>if it rains, then the ground is wet.</b> That might turn out true, or false.') },
      { t: T('它到底对不对，要看两件事：下没下雨，地湿没湿。两件事各有「是」和「不是」两种，合起来一共四种天气。把四种天气排成四行，就是一张<b>真值表</b>。', 'Whether it is true depends on two things: did it rain, and is the ground wet. Each can go two ways, so there are four kinds of weather in all. Four rows, one per kind: that is a <b>truth table</b>.') },
      { t: T('这一关，替每一行判断这句话说对了还是说错了。「真」就是说对了，「假」就是说错了。', 'In this level, decide for each row whether the sentence spoke true or false.') },
    ],
    after: T('只有「下了雨，地却没湿」那一行，预报说错了。没下雨的时候，它什么也没承诺，算不上说错，所以是真。从下一关起，「如果 X，那么 Y」简写成 <b>X → Y</b>。', 'Only on the row “it rained and the ground is not wet” was the forecast wrong. When it did not rain it promised nothing, so it was not wrong: true. From the next level on, “if X, then Y” is written <b>X → Y</b>.'),
  },
  {
    id: 'always',
    kind: 'truth',
    title: T('永远成立', 'Always true'),
    ask: 'valid',
    symbols: ['→'],
    formulas: ['Rain → Rain', 'Rain → Wet', 'Rain ∧ Wind → Rain', 'Rain → (Wind → Rain)', 'Rain ∧ Wind → Wet'],
    brief: T('下面五句话，哪些不管天气怎样都成立？逐句标出来。拿不准，就展开它的表一行一行试。', 'Which of these five hold whatever the weather? Mark each one. If unsure, open its table and try it row by row.'),
    hint: [
      T('一句话永远成立，就是它的表每一行都真。只要有一行是假，就不算。', 'A sentence always holds when every row of its table is true. One false row and it does not.'),
      T('「如果下雨并且刮风，那么地湿」：有没有一种天气，又下雨又刮风，地却没湿？这些句子没有一句说过下雨地就湿。', '“It rains and it is windy → the ground is wet”: is there weather where it rains and blows and the ground is not wet? None of these sentences says rain makes the ground wet.'),
    ],
    intro: [
      { t: T('上一关的「下雨 → 地湿」有一行是假的：它对不对，得看天气。（从这一关起，「如果 X，那么 Y」写成 <b>X → Y</b>。）', 'Last level’s “it rains → the ground is wet” had a false row: whether it holds depends on the weather. (From this level on, “if X, then Y” is written <b>X → Y</b>.)') },
      { t: T('有些话却和天气无关。比如「下雨 → 下雨」：下了雨，当然就是下了雨。不管哪一行，它都真。这样的话叫<b>永真式</b>。', 'Some sentences do not depend on the weather at all. “It rains → it rains”: if it rains, then of course it rains. It is true on every row. Such a sentence is a <b>tautology</b>.') },
      { t: T('下面五句里有的永远成立，有的要看天气。「下雨并且刮风」的意思是两件事都发生了。', 'Of the five below, some always hold and some depend on the weather. “It rains and it is windy” means both happen.') },
    ],
    after: T('「下雨 → 下雨」「下雨并且刮风 → 下雨」「下雨 → (刮风 → 下雨)」每一行都真：它们对，不是因为天气，而是因为句子的<b>形状</b>。把「下雨」「刮风」换成别的话，照样成立。留意第四句的形状，它很快会变成一条公理。', '“It rains → it rains”, “it rains and it is windy → it rains” and “it rains → (it is windy → it rains)” are true on every row: not because of the weather but because of their <b>shape</b>. Swap in any other sentences and they still hold. Remember the fourth one’s shape: it will soon become an axiom.'),
  },
  {
    id: 'onerow',
    kind: 'truth',
    title: T('地湿了，就下过雨？', 'Wet, so it rained?'),
    ask: 'counter',
    formulas: ['(Rain → Wet) → (Wet → Rain)'],
    brief: T('找出一行，让「(下雨 → 地湿) → (地湿 → 下雨)」是假的。', 'Find a row that makes “(it rains → the ground is wet) → (the ground is wet → it rains)” false.'),
    hint: [
      T('地湿了，却没下雨，可能吗？', 'Could the ground be wet without rain?'),
      T('最外面那个 → 要是假的，它前一半得是真，后一半得是假。', 'For the outermost → to be false, its first half must be true and its second half false.'),
    ],
    intro: [
      { t: T('有人这样推理：「下雨地就湿。现在地湿了，所以刚才下过雨。」听着挺顺，可它永远成立吗？', 'Someone reasons: “Rain makes the ground wet. The ground is wet, so it rained.” It sounds right. But does it always hold?') },
      { t: T('要说明一句话<b>不是</b>永远成立，不必把整张表填完：找到一行让它为假，就够了。这一行叫<b>反例</b>。', 'To show a sentence does <b>not</b> always hold, you need not fill the whole table: one row that makes it false is enough. That row is a <b>counterexample</b>.') },
      { t: T('点「试一试」，看这句话在那一行是真是假。找出让它为假的那一行。', 'Press “Try” to see whether the sentence is true or false on that row. Find the row that makes it false.') },
    ],
    after: T('没下雨，地却湿了（洒水车刚开过去）：「下雨 → 地湿」还是对的，「地湿 → 下雨」却错了，整句为假。一行反例就推翻了它。可要确信一句话<b>永远</b>成立，就得把每一行都验过：事情一多，表有 2ⁿ 行；说到「所有的数」，表根本列不完。所以要换一种办法：<b>证明</b>。', 'No rain, yet the ground is wet (a street sweeper just went by): “it rains → the ground is wet” still holds, but “the ground is wet → it rains” fails, so the whole is false. One row brought it down. But to be sure a sentence <b>always</b> holds, every row must be checked: with more sentences a table has 2ⁿ rows, and for “every number” no table could ever be finished. So we need another way: <b>proof</b>.'),
  },
]
