// 第 0 代 · 纸笔：还没有证明机。一句话对不对，一行一行地验：这就是真值表。符号从这里开始，一次一个。
const T = (zh, en) => ({ zh, en })

export const era0 = [
  {
    id: 'table',
    kind: 'truth',
    title: T('一句承诺', 'A promise'),
    ask: 'fill',
    formulas: ['Rain → Wet'],
    brief: T('天气预报说：「如果下雨，那么地面湿润。」在下面四种情况下，这个命题分别为真还是为假？点击单元格填写真值。', 'The forecast says: “If it rains, then the ground is wet.” In each of the four kinds of weather, did it speak true or false? Click the cells to fill them in.'),
    hint: [
      T('什么情况下可以判定这条预报不成立？只有一种情况。', 'When could you rightly say the forecast was wrong? In only one case.'),
      T('在没有下雨的两行中，预报是否被违背？它只规定了下雨时的情况。', 'On the two rows where it did not rain, was the forecast wrong? It only said what happens when it rains.'),
    ],
    intro: [
      { t: T('天气预报说：<b>如果下雨，那么地面湿润。</b>这是一个可以判断真假的陈述，称为<b>命题</b>。', 'The forecast says: <b>if it rains, then the ground is wet.</b> That might turn out true, or false.') },
      { t: T('它的真假取决于两个基本命题：「下雨」和「地面湿润」。每个基本命题都有真、假两种取值，共有四种组合。将每种组合及整句的真假列为一行，就得到一张<b>真值表</b>。', 'Whether it is true depends on two things: did it rain, and is the ground wet. Each can go two ways, so there are four kinds of weather in all. Four rows, one per kind: that is a <b>truth table</b>.') },
      { t: T('请判断每一行中整句的真假，并填写「真」或「假」。命题的真假也称为它的<b>真值</b>。', 'In this level, decide for each row whether the sentence spoke true or false.') },
    ],
    after: T('只有「下雨为真、地面湿润为假」时，这个条件命题才为假。没有下雨时，前件为假，条件命题按定义为真；这不表示它说明了地面是否潮湿。「如果 X，那么 Y」记作 <b>X → Y</b>，X 称为<b>前件</b>，Y 称为<b>后件</b>。', 'Only on the row “it rained and the ground is not wet” was the forecast wrong. When it did not rain it promised nothing, so it was not wrong: true. From the next level on, “if X, then Y” is written <b>X → Y</b>.'),
  },
  {
    id: 'always',
    kind: 'truth',
    title: T('永远成立', 'Always true'),
    ask: 'valid',
    symbols: ['→'],
    formulas: ['Rain → Rain', 'Rain → Wet', 'Rain ∧ Wind → Rain', 'Rain → (Wind → Rain)', 'Rain ∧ Wind → Wet'],
    brief: T('下面五个命题，哪些在所有真值组合下都成立？请逐一判断。不确定时，可以展开真值表逐行检查。', 'Which of these five hold whatever the weather? Mark each one. If unsure, open its table and try it row by row.'),
    hint: [
      T('一个命题恒成立，是指真值表中每一行的值都为真。只要有一行为假，它就不是恒成立的。', 'A sentence always holds when every row of its table is true. One false row and it does not.'),
      T('对于「如果下雨并且刮风，那么地面湿润」，能否给出下雨、刮风均为真，而地面湿润为假的情况？不要额外假定下雨必然使地面潮湿。', '“It rains and it is windy → the ground is wet”: is there weather where it rains and blows and the ground is not wet? None of these sentences says rain makes the ground wet.'),
    ],
    intro: [
      { t: T('「下雨 → 地面湿润」的真值表中有一行为假，因此它并非在所有情况下都成立。「如果 X，那么 Y」写作 <b>X → Y</b>。', 'Last level’s “it rains → the ground is wet” had a false row: whether it holds depends on the weather. (From this level on, “if X, then Y” is written <b>X → Y</b>.)') },
      { t: T('有些命题在所有真值组合下都成立，例如「下雨 → 下雨」。这样的命题称为<b>永真式</b>，也称<b>重言式</b>。', 'Some sentences do not depend on the weather at all. “It rains → it rains”: if it rains, then of course it rains. It is true on every row. Such a sentence is a <b>tautology</b>.') },
      { t: T('请判断下面五个命题是否为永真式。其中，「下雨并且刮风」表示两个基本命题均为真。', 'Of the five below, some always hold and some depend on the weather. “It rains and it is windy” means both happen.') },
    ],
    after: T('「下雨 → 下雨」「下雨并且刮风 → 下雨」「下雨 → (刮风 → 下雨)」在每一行中都为真。它们的恒真性来自<b>逻辑结构</b>：将「下雨」「刮风」一致地替换成其他命题，所得命题仍然恒真。', '“It rains → it rains”, “it rains and it is windy → it rains” and “it rains → (it is windy → it rains)” are true on every row: not because of the weather but because of their <b>shape</b>. Swap in any other sentences and they still hold. Remember the fourth one’s shape: it will soon become an axiom.'),
  },
  {
    id: 'onerow',
    kind: 'truth',
    title: T('地面湿润，就下过雨？', 'Wet, so it rained?'),
    ask: 'counter',
    formulas: ['(Rain → Wet) → (Wet → Rain)'],
    brief: T('找出一组真值，使「(下雨 → 地面湿润) → (地面湿润 → 下雨)」为假。', 'Find a row that makes “(it rains → the ground is wet) → (the ground is wet → it rains)” false.'),
    hint: [
      T('地面潮湿，但没有下雨，这种情况是否可能？', 'Could the ground be wet without rain?'),
      T('要使最外层的 → 为假，它的前件必须为真，后件必须为假。', 'For the outermost → to be false, its first half must be true and its second half false.'),
    ],
    intro: [
      { t: T('有人这样推理：「如果下雨，那么地面湿润。现在地面湿润，所以此前下过雨。」这个推理听起来合理，但是否在所有情况下都成立？', 'Someone reasons: “Rain makes the ground wet. The ground is wet, so it rained.” It sounds right. But does it always hold?') },
      { t: T('要说明一个命题<b>不是永真式</b>，不必填完整张表：找到一组使它为假的真值就足够了。这组真值称为一个<b>反例</b>。', 'To show a sentence does <b>not</b> always hold, you need not fill the whole table: one row that makes it false is enough. That row is a <b>counterexample</b>.') },
      { t: T('点击「试一试」，查看命题在该行的真值，并找出使它为假的一行。', 'Press “Try” to see whether the sentence is true or false on that row. Find the row that makes it false.') },
    ],
    after: T('没有下雨，地面也可能因洒水而潮湿。此时「下雨 → 地面湿润」为真，「地面湿润 → 下雨」为假，因此整个命题为假。这个反例说明，不能由条件命题及其后件推出前件。对于 n 个基本命题，完整真值表有 2ⁿ 行；涉及「所有的数」时，也不能这样有限地逐一列举。<b>证明</b>则通过推理规则建立结论。', 'No rain, yet the ground is wet (a street sweeper just went by): “it rains → the ground is wet” still holds, but “the ground is wet → it rains” fails, so the whole is false. One row brought it down. But to be sure a sentence <b>always</b> holds, every row must be checked: with more sentences a table has 2ⁿ rows, and for “every number” no table could ever be finished. So we need another way: <b>proof</b>.'),
  },
]
