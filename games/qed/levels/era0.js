// 第 0 代 · 纸笔：还没有证明机。一句话对不对，一行一行地验：这就是真值表。符号从这里开始，一次一个。
const T = (zh, en) => ({ zh, en })

export const era0 = [
  {
    id: 'table',
    kind: 'truth',
    title: T('一句承诺', 'A promise'),
    ask: 'fill',
    formulas: ['Rain → Wet'],
    brief: T("天气预报说：「若下雨，则地湿。」请判断这个命题在四种真值组合下分别为真还是为假，点击单元格填写。", "The forecast says, “If it rains, then the ground is wet.” Determine whether the proposition is true or false for each of the four truth assignments, and fill in the cells."),
    hint: [
      T("在哪一种情况下，这个条件命题为假？", "In which case is this conditional proposition false?"),
      T("前件「下雨」为假的两行，条件命题的真值是什么？", "What is the value of the conditional on the two rows where its antecedent, “it rains”, is false?"),
    ],
    intro: [
      { t: T("天气预报说：<b>若下雨，则地湿。</b>这是一句可以判断真假的陈述，称为<b>命题</b>。", "The forecast says: <b>if it rains, then the ground is wet.</b> A statement that can be true or false is a <b>proposition</b>.") },
      { t: T("这个命题的真值取决于「下雨」和「地湿」各自的真值。两个基本命题各有真、假两种取值，共有四种组合。将每种组合及其结果列成一行，就得到一张<wiki-ref to=\"truth\"></wiki-ref>。", "Its truth value depends on the truth values of “it rains” and “the ground is wet”. Each has two possible values, giving four combinations. Listing each combination and its result gives a <wiki-ref to=\"truth\"></wiki-ref>.") },
      { t: T("请判断每一行中整个命题的真假，并填写「真」或「假」。", "For each row, determine the truth value of the whole proposition and enter true or false.") },
    ],
    after: T("只有「下雨」为真而「地湿」为假时，条件命题才为假。前件为假时，整个条件命题按定义为真；这并不说明地面是否潮湿。「若 X，则 Y」记作 <b>X → Y</b>，X 称为<b>前件</b>，Y 称为<b>后件</b>。", "The conditional is false only when “it rains” is true and “the ground is wet” is false. When the antecedent is false, the conditional is true by definition; this says nothing about whether the ground is wet. Write “if X, then Y” as <b>X → Y</b>; X is the <b>antecedent</b> and Y the <b>consequent</b>."),
  },
  {
    id: 'always',
    kind: 'truth',
    title: T('永远成立', 'Always true'),
    ask: 'valid',
    symbols: ['→'],
    formulas: ['Rain → Rain', 'Rain → Wet', 'Rain ∧ Wind → Rain', 'Rain → (Wind → Rain)', 'Rain ∧ Wind → Wet'],
    brief: T("下面五个命题，哪些在所有真值组合下都成立？请逐一判断。", "Which of these five propositions hold for every truth assignment? Mark each one."),
    hint: [
      T("不确定时，可以展开真值表逐行检查。", "If you are unsure, expand the truth table and check its rows."),
      T("一个命题恒成立，是指真值表中的每一行都为真；只要有一行为假，就不是恒成立的。", "A proposition is always true when its truth table has no false row. One false row is enough to rule this out."),
      T("对于「若下雨并且刮风，则地湿」，能否找到下雨、刮风均为真，而地湿为假的情况？", "For “if it rains and it is windy, then the ground is wet”, can rain and wind both be true while the ground is not wet?"),
    ],
    intro: [
      { t: T("<level-ref to=\"table\"></level-ref>中的「下雨 → 地湿」有一行为假，因此并非恒成立。「若 X，则 Y」写作 <b>X → Y</b>。", "In <level-ref to=\"table\"></level-ref>, “it rains → the ground is wet” was false on one row and therefore was not always true. Write “if X, then Y” as <b>X → Y</b>.") },
      { t: T("有些命题在所有真值组合下都为真。例如「下雨 → 下雨」不论是否下雨都为真。这样的命题称为<wiki-ref to=\"tautology\"></wiki-ref>。", "Some propositions are true under every truth assignment. For example, “it rains → it rains” is true whether or not it rains. Such a proposition is a <wiki-ref to=\"tautology\"></wiki-ref>.") },
      { t: T("请判断下面五个命题是否恒成立。其中「下雨并且刮风」表示两个基本命题都为真。", "Decide whether each of the five propositions is always true. “It rains and it is windy” requires both constituent propositions to be true.") },
    ],
    after: T("「下雨 → 下雨」「下雨并且刮风 → 下雨」「下雨 → (刮风 → 下雨)」在每一行都为真。它们的恒真性来自<b>逻辑结构</b>：一致地替换其中的基本命题，得到的命题仍然恒真。", "“It rains → it rains”, “it rains and it is windy → it rains”, and “it rains → (it is windy → it rains)” are true on every row. Their validity follows from their <b>logical structure</b>: consistently substituting other propositions for the atoms preserves validity."),
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
      T("要使最外层的 → 为假，它的前件必须为真，后件必须为假。", "For the outermost → to be false, its antecedent must be true and its consequent false."),
    ],
    intro: [
      { t: T("有人这样推理：「若下雨，则地湿。现在地湿，所以刚才下过雨。」这个推理是否在所有情况下都成立？", "Someone reasons: “If it rains, then the ground is wet. The ground is wet, so it rained.” Does this inference hold in every case?") },
      { t: T("要说明一个命题<b>不是永真式</b>，不必填完整张表：找到一组使它为假的真值就足够了。这组真值称为一个<wiki-ref to=\"counterexample\"></wiki-ref>。", "To show that a proposition is <b>not a tautology</b>, one assignment that makes it false is enough. Such an assignment is a <wiki-ref to=\"counterexample\"></wiki-ref>.") },
      { t: T("点击「试一试」，查看该行的真值，并找出使目标为假的一行。", "Select “Try” to evaluate a row, and find one that makes the target false.") },
    ],
    after: T("没有下雨时，地面也可能因洒水而潮湿。此时「下雨 → 地湿」为真，「地湿 → 下雨」为假，整个命题为假。这说明不能由条件命题及其后件推出前件。n 个基本命题有 2ⁿ 种真值组合；涉及所有自然数时，也无法用这种方式有限地逐一列举。", "The ground can be wet without rain, for example after watering. Then “it rains → the ground is wet” is true, while its converse is false, making the whole proposition false. A conditional and its consequent do not establish its antecedent. With n atoms there are 2ⁿ assignments; statements about all natural numbers cannot be checked by finite enumeration this way."),
  },
]
