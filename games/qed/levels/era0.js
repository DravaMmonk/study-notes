// 第 0 代 · 纸笔：还没有证明机。一个命题是一张真值表，「永远成立」就是每一行都是真。
const T = (zh, en) => ({ zh, en })

export const era0 = [
  {
    id: 'table',
    kind: 'truth',
    title: T('真值表', 'Truth table'),
    ask: 'fill',
    formulas: ['A → B'],
    brief: T('A 和 B 各自可真可假，一共四种情况。把 A → B 在每一行是真是假填出来。', 'A and B can each be true or false: four cases in all. Fill in whether A → B is true or false on each row.'),
    hint: [T('「若 A 则 B」只在一种情况下说错了话：A 发生了，B 却没有。', '“If A then B” is wrong in only one case: A happened and B did not.')],
    intro: [
      { t: T('命题是一句非真即假的话。A、B 这样的字母代表随便哪一句。', 'A proposition is a statement that is either true or false. Letters like A and B stand for any such statement.') },
      { t: T('<b>A → B</b> 读作「若 A 则 B」。它是真是假，只取决于 A 和 B 是真是假。', '<b>A → B</b> reads “if A then B”. Whether it is true depends only on whether A and B are.') },
    ],
    after: T('A → B 只在 A 真、B 假的那一行是假。A 假的时候，它不对 B 做任何断言，所以算真。', 'A → B is false only on the row where A is true and B false. When A is false it claims nothing about B, so it counts as true.'),
  },
  {
    id: 'always',
    kind: 'truth',
    title: T('永远成立', 'Always true'),
    ask: 'valid',
    formulas: ['A → A', 'A → B', 'A ∧ B → A', 'A ∨ ¬A', '(A → B) → (B → A)'],
    brief: T('哪些命题不管 A、B 取什么都成立？每一个都标出来。表可以用来算。', 'Which of these hold whatever A and B are? Mark each one. Use the tables to work it out.'),
    hint: [T('一个命题永远成立，就是它的真值表每一行都是真。一行是假就不算。', 'A proposition always holds when every row of its truth table is true. One false row and it does not.')],
    intro: [
      { t: T('有些命题和 A、B 是什么无关，总是真的。它们叫<b>永真式</b>。', 'Some propositions are true whatever A and B are. They are called <b>tautologies</b>.') },
      { t: T('¬A 读作「非 A」，∧ 是「并且」，∨ 是「或者」（两个都真也算）。', '¬A reads “not A”, ∧ is “and”, and ∨ is “or” (both true counts too).') },
    ],
    after: T('A → A、A ∧ B → A、A ∨ ¬A 每一行都真；A → B 和 (A → B) → (B → A) 各有一行是假。要说一个命题不总成立，指出那一行就够了。', 'A → A, A ∧ B → A and A ∨ ¬A are true on every row; A → B and (A → B) → (B → A) each have a false row. To show a proposition does not always hold, pointing at that row is enough.'),
  },
  {
    id: 'onerow',
    kind: 'truth',
    title: T('只要一行', 'Just one row'),
    ask: 'counter',
    formulas: ['(A → B) → A'],
    brief: T('找出一行，让 (A → B) → A 是假的。', 'Find a row that makes (A → B) → A false.'),
    hint: [T('外面那个 → 什么时候是假？它的前一半要真，后一半要假。', 'When is the outer → false? Its first half must be true and its second half false.')],
    intro: [
      { t: T('要说明一个命题<b>不</b>总成立，不用把整张表都填完：一行反例就够了。', 'To show that a proposition does <b>not</b> always hold, you need not fill the whole table: one counterexample row is enough.') },
      { t: T('点一行，看它在那一行是真是假。', 'Click a row and see whether it is true or false there.') },
    ],
    after: T('A 假的时候，A → B 是真，整句就成了「真 → 假」，是假。一行反例说明它证不出来。可变量多了，真值表就有 2ⁿ 行；到了「对所有的数」，表根本列不完。所以要证明。', 'With A false, A → B is true, so the whole is “true → false”: false. One counterexample row shows it cannot be proved. But with more letters a truth table has 2ⁿ rows, and for “every number” no table could ever be finished. That is why we prove.'),
  },
]
