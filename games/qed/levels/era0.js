// 第 0 代 · 纸笔：还没有证明机。一句话对不对，一行一行地验：这就是真值表。符号从这里开始，一次一个。
const T = (zh, en) => ({ zh, en })

export const era0 = [
  {
    id: 'table',
    kind: 'truth',
    title: T('一句承诺', 'A promise'),
    ask: 'fill',
    formulas: ['Rain → Wet'],
    brief: T("天气预报说：「若下雨，则地湿。」判断这句话在每一行是真是假，点单元格填写。", "The forecast says, “If it rains, then the ground is wet.” Decide whether it is true or false on each row, and fill in the cells."),
    hint: [
      T("在哪一种情况下，这句预报算是说错了？", "In which case has the forecast got it wrong?"),
      T("没有下雨的两行，预报说错了吗？", "On the two rows where it does not rain, has the forecast got it wrong?"),
    ],
    intro: [
      { t: T("能判断真假的陈述叫<b>命题</b>。", "A statement that is either true or false is a <b>proposition</b>.") },
      { t: T("预报的真假取决于「下雨」和「地湿」的真假。两者各有真、假两种取值，共四种组合；每种组合连同结果列成一行，就是一张<wiki-ref to=\"truth\"></wiki-ref>。", "Whether the forecast is true depends on whether “it rains” and “the ground is wet” are. Each can be true or false, four combinations in all; one row per combination, with its result, makes a <wiki-ref to=\"truth\"></wiki-ref>.") },
      { t: T("「若 X，则 Y」中，X 叫<b>前件</b>，Y 叫<b>后件</b>。", "In “if X, then Y”, X is the <b>antecedent</b> and Y the <b>consequent</b>.") },
    ],
    after: T("逻辑学把这样理解的「若…则…」称为<b>实质蕴涵</b>。", "Logicians call this reading of “if … then …” <b>material implication</b>."),
  },
  {
    id: 'always',
    kind: 'truth',
    title: T('永远成立', 'Always true'),
    ask: 'valid',
    symbols: ['→'],
    formulas: ['Rain → Rain', 'Rain → Wet', 'Rain ∧ Wind → Rain', 'Rain → (Wind → Rain)', 'Rain ∧ Wind → Wet'],
    brief: T("下面五个命题，哪些在每一行都为真？逐一判断。", "Which of these five propositions are true on every row? Mark each one."),
    hint: [
      T("拿不准时，展开真值表逐行检查。", "If you are unsure, expand the truth table and check its rows."),
      T("只要有一行为假，就不是每一行都为真。", "One false row is enough to rule it out."),
      T("「若下雨并且刮风，则地湿」：能不能下雨、刮风，地却不湿？", "“If it rains and it is windy, then the ground is wet”: can it rain and be windy while the ground stays dry?"),
    ],
    intro: [
      { t: T("「若 X，则 Y」写作 <b>X → Y</b>；「X 并且 Y」在 X、Y 都为真时才为真。", "“If X, then Y” is written <b>X → Y</b>; “X and Y” is true only when both X and Y are.") },
      { t: T("在每一行都为真的命题叫<wiki-ref to=\"tautology\"></wiki-ref>。", "A proposition true on every row is a <wiki-ref to=\"tautology\"></wiki-ref>.") },
    ],
    after: T("一个命题是否永真，只取决于它的<b>逻辑形式</b>：把其中的基本命题换成别的，结论不变。", "Whether a proposition is a tautology depends only on its <b>logical form</b>: put other propositions in place of its atoms and the verdict stays the same."),
  },
  {
    id: 'onerow',
    kind: 'truth',
    title: T('地湿了，就下过雨？', 'Wet, so it rained?'),
    ask: 'counter',
    formulas: ['(Rain → Wet) → (Wet → Rain)'],
    brief: T('找出一行，让「(下雨 → 地湿) → (地湿 → 下雨)」为假。', 'Find a row that makes “(it rains → the ground is wet) → (the ground is wet → it rains)” false.'),
    hint: [
      T('地湿了，却没下雨，可能吗？', 'Could the ground be wet without rain?'),
      T("要使最外层的 → 为假，它的前件必须为真，后件必须为假。", "For the outermost → to be false, its antecedent must be true and its consequent false."),
    ],
    intro: [
      { t: T("有人这样推理：「若下雨，则地湿。现在地湿，所以刚才下过雨。」这个推理在所有情况下都成立吗？", "Someone reasons: “If it rains, then the ground is wet. The ground is wet, so it rained.” Does this inference hold in every case?") },
      { t: T("要说明一个命题<b>不是</b>永真式，不必填完整张表，找到一行使它为假就够了。这一行叫<wiki-ref to=\"counterexample\"></wiki-ref>。", "To show that a proposition is <b>not</b> a tautology, you need not fill in the whole table: one row that makes it false is enough. Such a row is a <wiki-ref to=\"counterexample\"></wiki-ref>.") },
      { t: T("点「试一试」，查看一行的结果。", "Select “Try” to evaluate a row.") },
    ],
    after: T("这种推理错误叫<b>肯定后件</b>。", "This mistake is known as <b>affirming the consequent</b>."),
  },
]
