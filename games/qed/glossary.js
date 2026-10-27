// 证明完毕's encyclopedia (the shell's 百科, games/kit/shell): how the game is played, then one entry per term of the
// subject, grouped by where it comes in. An entry's title is the term itself, written as it reads inside a sentence
// (English in lower case unless a name), since a <wiki-ref> in the levels shows it in place. Each entry opens once the
// level `at` is reached (no `at`: from the start); `see` links related entries.
const T = (zh, en) => ({ zh, en })
const W = (id) => `<wiki-ref to="${id}"></wiki-ref>`
const P = (key) => `<part-ref to="${key}"></part-ref>`

export const GLOSSARY_GROUPS = [
  { id: 'play', title: T('玩法', 'How to play') },
  { id: 'prop', title: T('命题逻辑', 'Propositional logic') },
  { id: 'proof', title: T('证明', 'Proof') },
  { id: 'fol', title: T('一阶逻辑', 'First-order logic') },
  { id: 'rules', title: T('规则与自动化', 'Rules and automation') },
  { id: 'types', title: T('证明即程序', 'Proofs as programs') },
  { id: 'limits', title: T('证明的边界', 'The limits of proof') },
  { id: 'assist', title: T('证明助手', 'Proof assistants') },
]

export const GLOSSARY = [
  // ---------- how to play ----------
  {
    id: 'map', group: 'play', title: T('关卡地图', 'level map'),
    body: [
      T('关卡按章排列。第一章纸笔之后，每一章是你装进同一台证明器的一个模块，前面装上的都留着。通过一关，接在它后面的关卡就会打开；岔出去的专题和挑战可以晚些再玩。', 'The levels sit in chapters. After the first, on pen and paper, each chapter is a module you install into the one prover you build, and what is installed stays. Pass a level and the levels after it open; the topics and challenges branching off can wait.'),
      T('不想按顺序玩，可以打开「全部解锁」。', 'If you would rather not go in order, turn on “Unlock all”.'),
    ],
    see: ['board'],
  },
  {
    id: 'circuit', group: 'play', title: T('真值电路', 'truth circuit'), at: 'g-not',
    body: [
      T('左边每件小事一个元件：这一行它发生了就送出真，没发生就送出假。右边是「这句话」：接到它的线送来什么，这一行这句话就是什么。中间放门，用线接起来。', 'Each small fact has a part on the left: on a row where it happens it sends out true, otherwise false. On the right is “the sentence”: whatever reaches it is the sentence’s value on that row. Gates go in between, wired together.'),
      T('下面的真值表里点一行，板上每个元件就显示它在那一行的值。点「一行一行算」，机器从第一行起逐行算下去，每算一行，板上的元件就换成那一行的值；算错的那一行它会停下来。「单步」一次只算一行。', 'Click a row of the truth table below and every part shows its value on that row. Press “Run row by row” and the machine works down the table from the first row; with each row, the parts on the board show that row’s values, and it stops on the first row it gets wrong. “Step” works out one row at a time.'),
      T('有的关不给出目标真值那一列，免得表格直接透出答案；有的关连句子也只用话说出来，把它翻译成与、或、非再接成电路，就是这一关的题。', 'Some levels hide the target value column, so the table does not give the answer away; in some the sentence is only said in words, and translating it into and, or and not and wiring it is the puzzle.'),
    ],
    see: ['truth', 'connective'],
  },
  {
    id: 'board', group: 'play', title: T('证明电路板', 'proof board'), at: 'copy',
    body: [
      T('左边的元件是<b>已知</b>，右边的是<b>目标</b>。一根线代表「这件事已经证出来了」：一块元件是一条推理规则，输入是它要的东西，输出是它推出的结论。', 'The parts on the left are what is <b>given</b>, the one on the right the <b>goal</b>. A wire means “this has been proved”: a part is a rule of inference, its inputs what it needs, its output the conclusion it draws.'),
      T('元件上写着它此刻证出的命题。接错了，元件会说它要什么、接进来的是什么。证完了点「检查证明」。', 'A part shows what it proves right now. Wire it wrong and the part says what it wanted and what it got. When you are done, press “Check proof”.'),
      T('元件上要填一句话时，从这一关出现过的句子里选。', 'Where a part needs a sentence, pick it from the sentences in the level.'),
      T('每关有几组<b>测试</b>：最后一组只写字母，是题目的样子本身；其余几组把字母换成日常的句子。同一块电路要在每一组上都证得出。换一组测试，元件上的句子跟着换名字，电路不用动：证明只看形状，不看讲的是什么，所以字母那一组证得出，换成什么句子都证得出。', 'Each level has a few <b>tests</b>: the last is just letters, the shape of the problem itself; the others put everyday sentences in place of the letters. One circuit must prove them all. Switch tests and the sentences on the parts are renamed while the circuit stays: a proof looks at shape, not at what it is about, so whatever proves the letters proves any sentences put in their place.'),
    ],
    see: ['rule', 'box'],
  },
  {
    id: 'box', group: 'play', title: T('假设框', 'assumption box'), at: 'assume',
    body: [
      T('假设框是板上的一个框，框里就能摆元件。在框元件上填要假设的命题，框左上角的「假设」就给出它；框里证出的东西接到框右上角的「结论」，框外就得到「假设 → 结论」。', 'An assumption box is a frame on the board, and parts sit right inside it. Fill in what to assume on the box, and “Assume” at the box’s top left gives it; wire what you prove inside to “Conclusion” at its top right, and outside you get “assumption → conclusion”.'),
      T('点一下框里的空白，新放的元件就落在框里；板上的元件也可以拖进框里，或拖出来。框里看得见外面的一切，框里证出的东西却只能从「结论」带出去。框元件左上角的箭头把框折叠起来。', 'Click the empty space inside a box and new parts land in it; parts on the board can be dragged into a box, or out of one. From inside a box everything outside is visible, but what is proved inside leaves only through “Conclusion”. The arrow at the top left of the box folds it away.'),
      T(`框一关，它的${W('assumption')}就不再算数：元件下面列着它还依赖的假设，证到目标时一个都不能剩（前提除外）。`, `Once the box closes, its ${W('assumption')} no longer counts: under each part are the hypotheses it still depends on, and none may be left at the goal (the premises aside).`),
    ],
    see: ['assumption', 'deduction'],
  },

  // ---------- propositional logic ----------
  {
    id: 'truth', group: 'prop', title: T('真值表', 'truth table'), at: 'table',
    body: [
      T('一句由几件小事和「若…则…」「并且」这些连接词拼成的话，是真是假只取决于每件小事是真是假。把所有情况列成一行一行，就是它的<b>真值表</b>：n 件小事有 2ⁿ 行。', 'A sentence built from a few small facts and connectives like “if … then …” and “and” is true or false depending only on whether each small fact is. Listing every case, one per row, gives its <b>truth table</b>: n facts make 2ⁿ rows.'),
      T('「若 X，则 Y」只在 X 真、Y 假的那一行为假：X 没发生时，它什么也没承诺。这叫<b>实质蕴涵</b>，写成 X → Y。', '“If X, then Y” is false only on the row where X is true and Y false: when X does not happen it promised nothing. This is <b>material implication</b>, written X → Y.'),
    ],
    see: ['tautology', 'counterexample', 'contradiction'],
  },
  {
    id: 'tautology', group: 'prop', title: T('永真式', 'tautology'), at: 'always',
    body: [
      T(`${W('truth')}上每一行都真的话叫<b>永真式</b>，比如「下雨 → 下雨」「下雨 ∨ ¬下雨」。它成立不是因为世界是什么样，而是因为句子的形状：把里面的小事换成任何别的话，照样每一行都真。`, `A sentence true on every row of its ${W('truth')} is a <b>tautology</b>, such as “it rains → it rains” or “it rains ∨ ¬it rains”. It holds not because of how the world is but because of its shape: put any other sentences in place of the small facts and it is still true on every row.`),
      T('要确认一句话是永真式，得验完每一行；n 件小事就是 2ⁿ 行，事情一多就验不动。证明给的是另一条路：不验行，只看形状一步步推。', 'To confirm a tautology every row must be checked, and n facts make 2ⁿ rows, which soon becomes too many. Proof is another road: no rows, only shapes, step by step.'),
    ],
    see: ['counterexample', 'proof'],
  },
  {
    id: 'counterexample', group: 'prop', title: T('反例', 'counterexample'), at: 'onerow',
    body: [
      T(`要说明一句话不是${W('tautology')}，不必验完整张表：找到一行让它为假就够了，这一行叫<b>反例</b>。反例比证明便宜得多：证明要对所有情况都成立，反例只要一种情况不成立。`, `To show a sentence is not a ${W('tautology')}, the whole table need not be checked: one row that makes it false is enough, and that row is a <b>counterexample</b>. A counterexample is far cheaper than a proof: a proof must hold in every case, a counterexample needs one case that fails.`),
      T('因为证明器的规则都是可靠的，一句话有反例，它就一定证不出来。动手证一句没把握的话之前，先找反例，常常能省下白费的功夫。', 'Since the prover’s rules are all sound, a sentence with a counterexample can never be proved. Before setting out to prove something uncertain, looking for a counterexample often saves wasted effort.'),
    ],
    see: ['soundness', 'countermodel'],
  },
  {
    id: 'connective', group: 'prop', title: T('连接词', 'connective'), at: 'g-not',
    body: [
      T('把小句子拼成大句子的词叫<b>连接词</b>：¬（非）、∧（与）、∨（或）、→（若…则…）、↔（等价）。命题逻辑里，一句话的真假只由它的连接词和每个小句子的真假决定，所以每个连接词都是一个门，一句话就是一块电路。', 'Words that build bigger sentences from smaller ones are <b>connectives</b>: ¬ (not), ∧ (and), ∨ (or), → (if … then …) and ↔ (equivalent). In propositional logic a sentence’s truth is fixed by its connectives and the truth of its small sentences, so each connective is a gate and each sentence a circuit.'),
      T('连接词之间可以互相表示：只用「与」和「非」就能拼出其余所有的，「或」和「非」也行。证明器里，每个连接词都有自己的规则：怎样证出它，怎样用它。', 'Connectives can stand in for one another: “and” with “not” builds all the rest, and so do “or” with “not”. In the prover each connective has rules of its own: how to prove it and how to use it.'),
    ],
    see: ['truth', 'natural'],
  },
  {
    id: 'contradiction', group: 'prop', title: T('矛盾', 'contradiction'), at: 'g-never',
    body: [
      T('每一行都假的话叫<b>矛盾</b>，比如「下雨 ∧ ¬下雨」：没有哪一种情况能让它成立。证明器把它写成一个符号 ⊥。', 'A sentence false on every row is a <b>contradiction</b>, such as “it rains ∧ ¬it rains”: no case can make it hold. The prover writes it as one symbol, ⊥.'),
      T('证明器里 ¬A 就是 A → ⊥：「A 不成立」说的是「A 一成立就矛盾」。所以证 ¬A，就是假设 A、推出 ⊥。', 'In the prover ¬A is A → ⊥: “A does not hold” says “if A held, that would be a contradiction”. So proving ¬A means assuming A and reaching ⊥.'),
    ],
    see: ['satisfiable', 'explosion'],
  },
  {
    id: 'satisfiable', group: 'prop', title: T('可满足', 'satisfiability'), at: 'g-never',
    body: [
      T(`一句话（或几句话一起）至少在一种情况下为真，叫<b>可满足</b>；一种都没有，就是${W('contradiction')}，也叫不可满足。命题逻辑里，情况是${W('truth')}的一行；一阶逻辑里，情况是一个世界。`, `A sentence (or several together) is <b>satisfiable</b> when it is true in at least one case; when it is true in none it is a ${W('contradiction')}, also called unsatisfiable. In propositional logic a case is a row of the ${W('truth')}; in first-order logic it is a world.`),
      T('A 永真，恰好当 ¬A 不可满足。所以「证 A」和「说明 ¬A 不可满足」是一回事：自动证明器和 SAT 求解器都从这里下手，把要证的那句否定了，看还能不能满足。', 'A is a tautology exactly when ¬A is unsatisfiable. So “prove A” and “show ¬A can never be satisfied” are the same task: automatic provers and SAT solvers start from here, negating what is to be proved and asking whether it can still be satisfied.'),
    ],
    see: ['tautology', 'world', 'automation'],
  },
  {
    id: 'equivalence', group: 'prop', title: T('等价', 'equivalence'), at: 'g-iff',
    body: [
      T('两句话每一行都同真同假，叫<b>等价</b>，写成 A ↔ B。它就是两个方向的「若…则…」合在一起：(A → B) ∧ (B → A)。', 'Two sentences true together and false together on every row are in <b>equivalence</b>, written A ↔ B. It is “if … then …” both ways at once: (A → B) ∧ (B → A).'),
      T('等价的两句可以互相替换：句子里哪一处换成和它等价的话，整句的真假都不变。化简器就是靠这一点，把一句话改成说法不同、意思相同的样子。', 'Equivalent sentences can stand in for each other: replace any part of a sentence with something equivalent and the whole keeps its truth. This is what the simplifier relies on to turn a sentence into another way of saying the same.'),
    ],
    see: ['connective', 'rewrite'],
  },
  {
    id: 'contrapositive', group: 'prop', title: T('逆否', 'contrapositive'), at: 'contra',
    body: [
      T('A → B 的<b>逆否</b>是 ¬B → ¬A：下雨就地湿，那么地不湿就没下雨。两者等价，证明器里只用套用和假设框就能从前者证出后者。', 'The <b>contrapositive</b> of A → B is ¬B → ¬A: if rain makes the ground wet, then a dry ground means no rain. The two are equivalent, and the prover gets the second from the first with Apply and the assumption box alone.'),
      T('它的两个近亲却不成立：B → A（逆）和 ¬A → ¬B（否），都能找到反例。「没下雨所以地不湿」是常见的错误推理。', 'Its two near relatives do not hold: B → A (the converse) and ¬A → ¬B (the inverse) both have counterexamples. “It did not rain, so the ground is dry” is a common mistake.'),
    ],
    see: ['counterexample'],
  },
  {
    id: 'explosion', group: 'prop', title: T('矛盾推出一切', 'from contradiction, anything'), at: 'bot',
    body: [
      T(`有了${W('contradiction')} ⊥，什么都证得出：这条规则常叫<b>爆炸原理</b>（拉丁文 ex falso quodlibet）。证明器里它是元件${P('part:botE')}。`, `From a ${W('contradiction')} ⊥ anything can be proved: the rule is often called the <b>principle of explosion</b> (Latin ex falso quodlibet). In the prover it is the part ${P('part:botE')}.`),
      T('它看着奇怪，其实就是 → 的真值表：前一半为假的「若…则…」总是真。用处在分情况时：不可能的那一种情况，交给它就结了。', 'It looks odd, but it is just the truth table of →: an “if … then …” whose first half is false is always true. It earns its keep in case splits: the impossible case is simply handed to it.'),
    ],
    see: ['dsyll'],
  },
  {
    id: 'dsyll', group: 'prop', title: T('选言三段论', 'disjunctive syllogism'), at: 'dsyll',
    body: [T(`由 A ∨ B 和 ¬A 得出 B，叫<b>选言三段论</b>，就是「排除法」。证明器里它不是一条规则，而是分情况：A 那一边和 ¬A 撞出 ⊥，交给${W('explosion')}；B 那一边直接就是结论。`, `From A ∨ B and ¬A, B: this is the <b>disjunctive syllogism</b>, the process of elimination. In the prover it is no rule of its own but a case split: the A side meets ¬A in ⊥, which goes to ${W('explosion')}; the B side is the conclusion already.`)],
    see: ['explosion'],
  },
  {
    id: 'lem', group: 'prop', title: T('排中律', 'excluded middle'), at: 'raa',
    body: [
      T('A ∨ ¬A：任何一句话，要么成立，要么不成立，没有第三种。它是永真式，却不能只用引入和消去规则证出来，要加上反证法。证出来以后，它是元件<part-ref to="lemma:lem"></part-ref>。', 'A ∨ ¬A: any sentence holds or does not, with no third way. It is a tautology, yet the introduction and elimination rules alone cannot prove it; it takes proof by contradiction. Proved, it is the part <part-ref to="lemma:lem"></part-ref>.'),
      T(`接受它的是${W('classical')}，不接受它的是${W('intuitionistic')}。`, `Logic that accepts it is ${W('classical')}; logic that does not is ${W('intuitionistic')}.`),
    ],
    see: ['classical', 'intuitionistic'],
  },
  {
    id: 'demorgan', group: 'prop', title: T('德摩根律', 'De Morgan’s laws'), at: 'demorgan',
    body: [T('¬(A ∨ B) 等价于 ¬A ∧ ¬B，¬(A ∧ B) 等价于 ¬A ∨ ¬B：否定穿过「或」变成「与」，穿过「与」变成「或」。量词也一样：¬∀x. P(x) 等价于 ∃x. ¬P(x)，¬∃x. P(x) 等价于 ∀x. ¬P(x)。其中 ¬(A ∧ B) → ¬A ∨ ¬B 和 ¬∀ → ∃¬ 两个方向要用反证法。', '¬(A ∨ B) is equivalent to ¬A ∧ ¬B, and ¬(A ∧ B) to ¬A ∨ ¬B: a negation passing through “or” becomes “and”, and through “and” becomes “or”. Quantifiers too: ¬∀x. P(x) is equivalent to ∃x. ¬P(x), and ¬∃x. P(x) to ∀x. ¬P(x). Two of the directions, ¬(A ∧ B) → ¬A ∨ ¬B and ¬∀ → ∃¬, take proof by contradiction.')],
    see: ['nnf'],
  },
  {
    id: 'nnf', group: 'prop', title: T('否定范式', 'negation normal form'), at: 'sp-nnf',
    body: [T(`句子里没有 → 和 ↔，¬ 只贴在最小的句子上，叫<b>否定范式</b>。把 A → B 改成 ¬A ∨ B，去掉双重否定，再用${W('demorgan')}把 ¬ 一路推到底，任何一句都化得成这个样子，意思不变。`, `A sentence with no → or ↔, and every ¬ on a smallest sentence, is in <b>negation normal form</b>. Turn A → B into ¬A ∨ B, drop double negations, and push each ¬ all the way in with ${W('demorgan')}: every sentence comes to this shape, meaning the same.`)],
    see: ['cnf'],
  },
  {
    id: 'cnf', group: 'prop', title: T('合取范式', 'conjunctive normal form'), at: 'sp-cnf',
    body: [T(`先化成${W('nnf')}，再把「或」分配到「与」上，直到所有「或」都在「与」底下：几串「或」用「与」连起来，叫<b>合取范式</b>。每一串「或」是一条子句。分配会让句子变长，最坏时长出指数倍；自动证明器常用另一种化法（给子句起新名字）避开这一点。`, `First ${W('nnf')}, then distribute “or” over “and” until every “or” is under the “and”s: strings of “or” joined by “and”, the <b>conjunctive normal form</b>. Each string of “or” is a clause. Distributing makes a sentence longer, exponentially at worst; automatic provers often use another conversion (naming parts with new letters) to avoid it.`)],
    see: ['clause'],
  },
  {
    id: 'clause', group: 'prop', title: T('子句', 'clause'), at: 'sp-cnf',
    body: [T(`${W('cnf')}里的每一串「或」叫一条<b>子句</b>，里面的每一项（一句话或它的否定）叫一个文字。一组子句要同时成立，每条子句里至少有一个文字为真。空子句一个文字都没有，不可能为真，它就是 ⊥。`, `Each string of “or” in the ${W('cnf')} is a <b>clause</b>, and each item in it (a sentence or its negation) a literal. For a set of clauses to hold together, each clause needs at least one true literal. The empty clause has none and can never be true: it is ⊥.`)],
    see: ['resolution'],
  },

  // ---------- proof ----------
  {
    id: 'proof', group: 'proof', title: T('证明', 'proof'), at: 'copy',
    body: [
      T('证明是一串步骤，每一步都由规则从前面的步骤得来。它不看真假，只看形状：规则对得上就行。', 'A proof is a chain of steps, each drawn by a rule from the steps before. It does not look at truth, only at shape: the rule has to fit.'),
      T('真值表一行一行地验，行数随小事的个数翻倍；说到「所有的数」，表根本列不完。证明只看形状，所以一个证明对无穷多种情况一次说完。', 'A truth table checks row by row, and the rows double with every fact; for “every number” no table could be finished. A proof looks only at shape, so one proof covers infinitely many cases at once.'),
    ],
    see: ['rule', 'soundness', 'kernel'],
  },
  {
    id: 'rule', group: 'proof', title: T('推理规则', 'rule of inference'), at: 'copy',
    body: [T('一条<b>推理规则</b>说：有了这几句（前提），就能得到那一句（结论）。比如套用：有了 A → B 和 A，就得到 B。规则只看句子的形状，A、B 换成什么话都行。板上的每一块元件就是一条规则，输入口是前提，输出口是结论。', 'A <b>rule of inference</b> says: given these sentences (the premises), you get that one (the conclusion). Apply, for one: from A → B and A, get B. A rule looks only at the shape of sentences, and A and B may be anything. Each part on the board is a rule, its inputs the premises and its output the conclusion.')],
    see: ['proof', 'kernel'],
  },
  {
    id: 'kernel', group: 'proof', title: T('证明核', 'kernel'), at: 'copy',
    body: [
      T('<b>证明核</b>是证明器里最小、最要紧的一块：几条基本规则，只有它能认定一句话证出来了。别的一切（引理、策略、化简器、外面的自动证明器）都只是替核找路，最后一步一步都要经过核。', 'The <b>kernel</b> is the smallest and most important piece of a prover: a few basic rules, and the only thing that can declare a sentence proved. Everything else (lemmas, tactics, the simplifier, outside automatic provers) only finds the way for the kernel, and every step in the end goes through it.'),
      T('所以要信一台证明器，只要信它的核。核越小，越容易查清楚有没有错；这台证明器的核从第一章起就只有几条规则。', 'So to trust a prover, one need only trust its kernel. The smaller the kernel, the easier it is to make sure it has no mistake; this prover’s kernel has been a few rules since its first chapter.'),
    ],
    see: ['soundness', 'provers'],
  },
  {
    id: 'soundness', group: 'proof', title: T('可靠性', 'soundness'), at: 'copy',
    body: [
      T('规则<b>可靠</b>，是说证得出的东西一定为真：每条规则的前提都真时，结论也真。所以一个反例就说明一句话证不出来。', 'Rules are <b>sound</b> when whatever they prove is true: whenever a rule’s premises are true, so is its conclusion. That is why one counterexample shows a sentence cannot be proved.'),
      T('反过来，真的东西都证得出，叫<b>完备</b>。命题逻辑和一阶逻辑的证明系统都既可靠又完备（一阶的完备性是哥德尔 1929 年证的）；可完备不等于有程序能判定。', 'The other way round, a system in which everything true can be proved is <b>complete</b>. The proof systems of propositional and first-order logic are both sound and complete (completeness for first-order logic was proved by Gödel in 1929); but complete does not mean a program can decide it.'),
    ],
    see: ['proof', 'counterexample'],
  },
  {
    id: 'assumption', group: 'proof', title: T('假设', 'assumption'), at: 'assume',
    body: [T('<b>假设</b>不是说它真的成立，而是推理时暂时把它当作出发点。在它底下证出的东西都带着它；假设一收回，结论就成了「若 假设，则 那件事」。证 A → B 就是这样：假设 A，证出 B。证明器里，假设放在假设框里，框一关就收回。', 'An <b>assumption</b> does not claim it holds: it is a starting point taken for the moment. What is proved under it carries it along; once it is withdrawn, the conclusion becomes “if the assumption, then that”. That is how A → B is proved: assume A, prove B. In the prover an assumption lives in an assumption box, and closing the box withdraws it.')],
    see: ['box', 'deduction'],
  },
  {
    id: 'lemma', group: 'proof', title: T('引理', 'lemma'), at: 'chain',
    body: [T(`证过一次的事可以当规则一直用下去，这叫<b>引理</b>。它在每一组测试上都成立，所以对任何句子都能用：「两段首尾相接的若…则…」成了元件${P('lemma:chain')}，K 和 S 也是这样成为元件的。引理只是给一段证明起的名字，展开以后，整个证明还是只用${W('kernel')}的规则。`, `Something proved once can be used as a rule from then on: a <b>lemma</b>. It held on every test, so it works for any sentences: “two if … then …s joined end to end” became the part ${P('lemma:chain')}, and K and S became parts the same way. A lemma is only a name given to a piece of proof; unfolded, the whole proof still uses only the rules of the ${W('kernel')}.`)],
    see: ['theorem'],
  },
  {
    id: 'axiom', group: 'proof', title: T('公理', 'axiom'), at: 'k',
    body: [T('<b>公理</b>是不用证、直接拿来当出发点的句子，可以看成没有前提的规则。K：A → (B → A)；S：(A → (B → C)) → ((A → B) → (A → C))。这台证明器里 K 和 S 是用假设框证出来的引理，只有公理的证明器只能把它们直接当公理。', 'An <b>axiom</b> is a sentence taken as a starting point without proof, a rule with no premises. K: A → (B → A); S: (A → (B → C)) → ((A → B) → (A → C)). In this prover K and S are lemmas proved with assumption boxes; a prover with axioms alone can only take them as given.')],
    see: ['hilbert'],
  },
  {
    id: 'hilbert', group: 'proof', title: T('希尔伯特系统', 'Hilbert system'), at: 'k',
    body: [T(`只有一条规则${P('part:mp')}、其余都当成${W('axiom')}的证明器叫<b>希尔伯特系统</b>：命题逻辑的「若…则…」部分，K、S 两条公理就够。它的证明很难写，因为没有假设框，每一步都得拿公理拼；专题「拆掉框」就是在这样的系统里证明。`, `A prover whose one rule is ${P('part:mp')}, all else being taken as an ${W('axiom')}, is a <b>Hilbert system</b>: for the “if … then …” part of propositional logic, the axioms K and S are enough. Its proofs are hard to write, with no assumption box and every step pieced from axioms; the topic Without the box proves in such a system.`)],
    see: ['deduction', 'natural'],
  },
  {
    id: 'deduction', group: 'proof', title: T('演绎定理', 'deduction theorem'), at: 'x-chain',
    body: [T(`在一个${W('assumption')}下能推出某件事，就能不带假设证出「若 假设，则 那件事」。证法是逐步改写：假设本身换成用 K、S 拼出的「若它，则它」，和假设无关的步用 K 包一层，套用用 S。所以假设框不增加能证的东西，只让证明好写得多。`, `If something follows under an ${W('assumption')}, then “if the assumption, then that” can be proved with no assumption. The proof rewrites step by step: the assumption itself becomes “if it, then it”, pieced together from K and S, a step unrelated to it is wrapped in K, and Apply goes through S. So the assumption box adds nothing provable; it only makes proofs far easier to write.`)],
    see: ['hilbert', 'box'],
  },
  {
    id: 'natural', group: 'proof', title: T('自然演绎', 'natural deduction'), at: 'and',
    body: [
      T(`每个${W('connective')}一对规则的证明系统叫<b>自然演绎</b>（Gentzen，1934）：一条引入规则说怎样证出它，一条消去规则说怎样用它。∧ 是拼起来和拆开，∨ 是二选一和分情况，→ 是假设框和套用，⊥ 是${P('part:botE')}。`, `A proof system with a pair of rules for each ${W('connective')} is <b>natural deduction</b> (Gentzen, 1934): an introduction rule saying how to prove it, and an elimination rule saying how to use it. ∧ is joining and splitting, ∨ choosing a side and splitting into cases, → the assumption box and Apply, and ⊥ ${P('part:botE')}.`),
      T('它比只有公理的系统更像人的推理：假设一件事，看能推出什么。证明助手的规则大都照它来写。', 'It reads more like human reasoning than a system of axioms: assume something and see what follows. The rules of proof assistants are mostly written after it.'),
    ],
    see: ['intro-rule', 'elim-rule', 'hilbert'],
  },
  {
    id: 'intro-rule', group: 'proof', title: T('引入规则', 'introduction rule'), at: 'and',
    body: [T(`<b>引入规则</b>的结论里多出一个${W('connective')}：拼起来由 A、B 得 A ∧ B，二选一由 A 得 A ∨ B，假设框得 A → B。要证一句话，看它最外面的连接词，就知道用哪条引入规则。`, `An <b>introduction rule</b> has a new ${W('connective')} in its conclusion: Join gets A ∧ B from A and B, Choose gets A ∨ B from A, the assumption box gets A → B. To prove a sentence, its outermost connective says which introduction rule to use.`)],
    see: ['elim-rule', 'natural'],
  },
  {
    id: 'elim-rule', group: 'proof', title: T('消去规则', 'elimination rule'), at: 'and',
    body: [T(`<b>消去规则</b>用掉一个${W('connective')}：拆开由 A ∧ B 得 A，套用由 A → B 和 A 得 B，分情况用掉 A ∨ B。它的第一条前提是要用的那句，要从已知里来；结论什么都行，看接到哪里。一条句子刚引入就消去，是证明里可以拿掉的弯路。`, `An <b>elimination rule</b> uses a ${W('connective')} up: Split gets A from A ∧ B, Apply gets B from A → B and A, Cases uses up A ∨ B. Its first premise is the sentence used, which must come from what is known; its conclusion can be anything, depending on where it goes. A sentence introduced and at once eliminated is a detour a proof can do without.`)],
    see: ['intro-rule', 'normal-form'],
  },
  {
    id: 'theorem', group: 'proof', title: T('定理', 'theorem'), at: 'andSwap',
    body: [T(`不依赖任何已知、证出来的句子叫<b>定理</b>：有已知的证明，放进假设框，就成了定理。可靠的规则证出的定理都是${W('tautology')}；反过来，命题逻辑里每个永真式都是定理（经典逻辑下）。`, `A sentence proved from nothing given is a <b>theorem</b>: put a proof from givens into an assumption box and it becomes one. Every theorem of sound rules is a ${W('tautology')}; conversely, in propositional logic every tautology is a theorem (in classical logic).`)],
    see: ['lemma', 'classical'],
  },
  {
    id: 'intuitionistic', group: 'proof', title: T('直觉主义逻辑', 'intuitionistic logic'), at: 'raa',
    body: [T(`没有反证法的逻辑叫<b>直觉主义逻辑</b>（Brouwer、Heyting）：证 A ∨ B 就得说出是哪一边，证 ∃x 就得给出是哪一个。所以${W('lem')}在这里证不出来，「¬¬(A ∨ ¬A)」却证得出。它的证明都能当程序来跑。`, `Logic without proof by contradiction is <b>intuitionistic logic</b> (Brouwer, Heyting): proving A ∨ B means saying which side, proving ∃x means saying which one. So ${W('lem')} cannot be proved in it, while “¬¬(A ∨ ¬A)” can. Its proofs can all be run as programs.`)],
    see: ['classical', 'curry-howard'],
  },
  {
    id: 'classical', group: 'proof', title: T('经典逻辑', 'classical logic'), at: 'raa',
    body: [T(`在${W('intuitionistic')}上加上反证法（由 ¬¬A 得 A），就是<b>经典逻辑</b>：${W('lem')}、皮尔士定律 ((A → B) → A) → A 都证得出，真值表上的每个永真式都是定理。数学家日常用的就是它；Isabelle 的 HOL 是经典的，Lean 要用经典推理时加上公理 Classical.em。`, `Add proof by contradiction (from ¬¬A, A) to ${W('intuitionistic')} and you have <b>classical logic</b>: ${W('lem')} and Peirce’s law ((A → B) → A) → A can be proved, and every tautology of the truth tables is a theorem. It is what mathematicians use every day; Isabelle’s HOL is classical, and Lean adds the axiom Classical.em for classical reasoning.`)],
    see: ['intuitionistic', 'truth'],
  },

  // ---------- first-order logic ----------
  {
    id: 'fol', group: 'fol', title: T('一阶逻辑', 'first-order logic'), at: 'fo-atoms',
    body: [
      T('命题逻辑的一个字母是一整句话；<b>一阶逻辑</b>把句子拆开：名字指一样东西，谓词说东西的性质或关系，量词 ∀（对所有）和 ∃（存在）说「每一样」「有一样」。', 'A letter of propositional logic is a whole sentence; <b>first-order logic</b> takes sentences apart: names stand for things, predicates say what things are or how they relate, and the quantifiers ∀ (for all) and ∃ (there exists) say “every” and “some”.'),
      T('「一阶」说的是量词只管东西，不管性质：可以说「每个人都会死」，不能说「每一种性质都……」。管到性质的是高阶逻辑。数学的大部分、数据库的查询语言，都写得成一阶逻辑。', '“First-order” means quantifiers range over things, not over properties: you can say “everyone is mortal”, not “every property …”. Quantifying over properties is higher-order logic. Most of mathematics, and the query languages of databases, can be written in first-order logic.'),
    ],
    see: ['predicate', 'quantifier', 'world'],
  },
  {
    id: 'predicate', group: 'fol', title: T('谓词', 'predicate'), at: 'fo-atoms',
    body: [T('<b>谓词</b>说一样或几样东西的性质或关系：「…是人」Human(x) 管一样，「…是…的父母」Parent(x, y) 管两样。谓词填上东西才成一句话：Human(soc) 是真是假，看世界里苏格拉底是不是人。', 'A <b>predicate</b> says what one or more things are or how they relate: “… is human”, Human(x), takes one; “… is a parent of …”, Parent(x, y), takes two. A predicate filled with things makes a sentence: whether Human(soc) is true depends on whether, in the world, Socrates is human.')],
    see: ['fol', 'world'],
  },
  {
    id: 'quantifier', group: 'fol', title: T('量词', 'quantifier'), at: 'fo-all',
    body: [
      T('<b>量词</b>说一句话对多少东西成立：∀x. P(x) 说每一样 x 都有 P，∃x. P(x) 说至少有一样。x 是一个变量，代表「随便哪一样」，量词管到它后面的整段。', 'A <b>quantifier</b> says for how many things a sentence holds: ∀x. P(x) says every x has P, ∃x. P(x) that at least one does. x is a variable standing for “any one”, and the quantifier reaches over everything after it.'),
      T('两种量词互为对偶：¬∀x. P(x) 等价于 ∃x. ¬P(x)。次序要紧：∀x. ∃y. 喜欢(x, y)（每样东西都喜欢某样东西）推不出 ∃y. ∀x. 喜欢(x, y)（有一样东西被所有东西喜欢）。', 'The two are duals: ¬∀x. P(x) is equivalent to ∃x. ¬P(x). Order matters: ∀x. ∃y. Likes(x, y) (everything likes something) does not give ∃y. ∀x. Likes(x, y) (something is liked by everything).'),
    ],
    see: ['bound', 'demorgan'],
  },
  {
    id: 'bound', group: 'fol', title: T('约束变量', 'bound variable'), at: 'fo-nested',
    body: [T(`被某个${W('quantifier')}管着的变量是<b>约束变量</b>。它只是一个占位的名字：∀x. P(x) 和 ∀y. P(y) 说的是同一件事，换个名字不改意思（叫 α 等价）。`, `A variable covered by some ${W('quantifier')} is a <b>bound variable</b>. It is only a placeholder: ∀x. P(x) and ∀y. P(y) say the same thing, and renaming it changes nothing (α-equivalence).`)],
    see: ['free', 'capture'],
  },
  {
    id: 'free', group: 'fol', title: T('自由变量', 'free variable'), at: 'fo-nested',
    body: [T(`没有量词管着的变量是<b>自由变量</b>：P(x) 说的是哪一样 x，要别处给定。一句话里留着自由变量，就说不清是真是假；把它当成提问，就是一个查询。`, `A variable no quantifier covers is a <b>free variable</b>: which x P(x) speaks of must be given from elsewhere. A sentence with a free variable left in cannot be said to be true or false; read as a question, it is a query.`)],
    see: ['bound', 'query'],
  },
  {
    id: 'world', group: 'fol', title: T('世界', 'world'), at: 'm-world',
    body: [
      T('一阶逻辑的一句话是真是假，要看<b>世界</b>（也叫结构或模型）：有哪些东西，名字指哪一样，每个谓词对哪些东西成立。命题逻辑里的一行，到这里成了一个世界。', 'Whether a first-order sentence is true depends on the <b>world</b> (also called a structure or model): what things there are, which thing each name stands for, which things each predicate holds of. A row of propositional logic becomes a world here.'),
      T('一句话在所有世界里都真，才叫永远成立。世界有无穷多个，挨个检查不完，所以要靠证明。', 'A sentence always holds only if it is true in every world; there are infinitely many, too many to check, so it takes a proof.'),
    ],
    see: ['countermodel', 'satisfiable'],
  },
  {
    id: 'countermodel', group: 'fol', title: T('反模型', 'countermodel'), at: 'm-counter',
    body: [T(`要说明结论推不出，一个${W('world')}就够：前提都真、结论为假，这叫<b>反模型</b>，是一阶逻辑里的${W('counterexample')}。证明器常带一个在小世界里找反模型的工具，先试试要证的话是不是根本不成立；Isabelle 的 Nitpick 就是这样的工具，这个游戏的反模型面板迁移的是它的思路。`, `To show a conclusion does not follow, one ${W('world')} is enough: the premises true and the conclusion false, a <b>countermodel</b>, the ${W('counterexample')} of first-order logic. Provers often come with a tool that searches small worlds for one, to check first whether the claim fails outright; Isabelle’s Nitpick is such a tool, and this game’s countermodel panel carries over its idea.`)],
    see: ['world', 'soundness'],
  },
  {
    id: 'query', group: 'fol', title: T('查询', 'query'), at: 'q-children',
    body: [T(`留着一个${W('free')}的句子是一个<b>查询</b>：世界里哪些东西放进去能让它成立，就是答案。数据库的 SQL、Datalog 的核心就是这样的一阶逻辑：表是谓词，行是让它成立的东西。`, `A sentence with a ${W('free')} left in is a <b>query</b>: the things of the world that make it true when put in are the answer. The core of SQL and Datalog is first-order logic like this: a table is a predicate, its rows the things it holds of.`)],
    see: ['free', 'world'],
  },
  {
    id: 'vacuous', group: 'fol', title: T('空真', 'vacuous truth'), at: 'q-school',
    body: [T('∀x. P(x) → Q(x) 在没有东西满足 P 时也成立，什么都不用查就为真，叫<b>空真</b>。「他的孩子都在上学」对没有孩子的人成立；这在逻辑里没错，在查询里却常常不是想要的，要再加一句「有孩子」。', '∀x. P(x) → Q(x) holds when nothing satisfies P, true without checking anything: a <b>vacuous truth</b>. “All his children are at school” holds for someone with no children; that is right in logic, but in a query it is often not what was meant, and “has children” must be added.')],
    see: ['query'],
  },
  {
    id: 'capture', group: 'fol', title: T('变量捕获', 'variable capture'), at: 'q-capture',
    body: [T(`把一个式子代进变量时，式子里的自由变量要是落进了同名量词的管辖，就被它<b>捕获</b>了，意思全变：∀x. ∃y. 喜欢(x, y) 把 x 换成 y，不能得到 ∃y. 喜欢(y, y)。办法是先给${W('bound')}改名：∃y 改成 ∃z，再代入，得到 ∃z. 喜欢(y, z)。证明器替换时都会自动改名。`, `When an expression is put in for a variable, a free variable in it that lands under a quantifier of the same name is <b>captured</b>, and the meaning changes completely: putting y in for x in ∀x. ∃y. Likes(x, y) must not give ∃y. Likes(y, y). The cure is to rename the ${W('bound')} first: ∃y becomes ∃z, then put y in, giving ∃z. Likes(y, z). Provers rename automatically when they substitute.`)],
    see: ['bound', 'free'],
  },
  {
    id: 'equality', group: 'fol', title: T('相等', 'equality'), at: 'q-eq',
    body: [
      T('a = b 说两个名字指同一样东西。它的规则有两条：每样东西等于自己（自反）；a = b 时，关于 a 成立的话关于 b 也成立（替换）。对称、传递都由这两条证出来。', 'a = b says two names stand for one thing. It has two rules: everything equals itself (reflexivity); and when a = b, what holds of a holds of b (substitution). Symmetry and transitivity are proved from these two.'),
      T('等式也能当改写规则用：化简器拿 a = b 把句子里的 a 换成 b。到了证明项一章，a = b 本身也是一个类型。', 'Equations serve as rewrite rules too: the simplifier uses a = b to replace a with b in a sentence. By the chapter on proof terms, a = b is a type itself.'),
    ],
    see: ['rewrite', 'propeq'],
  },

  // ---------- rules and automation ----------
  {
    id: 'metavariable', group: 'rules', title: T('元变量', 'metavariable'), at: 'r-match',
    body: [T('一条规则写成 ⟦前提⟧ ⟹ 结论，里面待定的部分叫<b>元变量</b>：?A、?B 是任何一句话，?t 是任何一样东西，?P(x) 是任何一句关于 x 的话。用规则时，元变量由合一填上。Isabelle 的规则都这样写（它的元逻辑 Pure 里，⟹ 是「推出」，⋀ 是「对任何」）；Lean 的 apply 留下的空位 ?m 也是元变量。', 'A rule is written ⟦premises⟧ ⟹ conclusion, and the parts left open in it are <b>metavariables</b>: ?A and ?B any sentence, ?t any thing, ?P(x) any sentence about x. When a rule is used, unification fills them in. Isabelle writes every rule this way (in its metalogic Pure, ⟹ is “yields” and ⋀ “for any”); the holes ?m Lean’s apply leaves are metavariables too.')],
    see: ['unification', 'proof-state'],
  },
  {
    id: 'unification', group: 'rules', title: T('合一', 'unification'), at: 'r-match',
    body: [T(`<b>合一</b>是解等式 s ≐ t：给${W('metavariable')}找一组替换，让两边变得一模一样。一阶的合一由几条规则解到底（Martelli 和 Montanari 的写法：拆开、删掉、对不上、翻过来、发生检查、代进去）。合一在 1965 年由 Robinson 为归结证明发明，后来成了 Prolog、类型推导和证明助手的心脏。`, `<b>Unification</b> solves equations s ≐ t: it finds what to put in for each ${W('metavariable')} so that both sides become the same. First-order unification is solved by a few rules (Martelli and Montanari’s form: decompose, delete, clash, swap, occurs check, eliminate). Robinson invented it in 1965 for resolution proofs; it became the heart of Prolog, type inference and proof assistants.`)],
    see: ['mgu', 'pattern'],
  },
  {
    id: 'mgu', group: 'rules', title: T('最一般合一子', 'most general unifier'), at: 'r-unifier',
    body: [T(`${W('unification')}的解叫合一子。<b>最一般合一子</b>只定下非定不可的部分，别的元变量都留着；任何别的合一子都能从它再往下代得到。一阶合一有解，就有最一般的那一个，而且只有一个（不计改名）。`, `A solution of ${W('unification')} is a unifier. The <b>most general unifier</b> settles only what must be settled and leaves every other metavariable open; every other unifier can be had from it by substituting further. When first-order unification has a solution it has a most general one, unique up to renaming.`)],
    see: ['unification'],
  },
  {
    id: 'backward', group: 'rules', title: T('反向推理', 'backward reasoning'), at: 'r-rule',
    body: [T(`从目标出发倒着用规则，叫<b>反向推理</b>：把目标和规则的结论${W('unification')}，目标就换成规则的前提，每条前提一个新目标。没有前提的规则对上了，目标就证完了。证明助手里的 apply、rule 都是这样用规则的。`, `Using rules backwards from the goal is <b>backward reasoning</b>: ${W('unification')} fits the goal to the rule’s conclusion, and the goal is replaced by the rule’s premises, a new goal for each. A rule with no premises that fits finishes the goal. Proof assistants’ apply and rule use rules this way.`)],
    see: ['forward', 'proof-state'],
  },
  {
    id: 'proof-state', group: 'rules', title: T('证明状态', 'proof state'), at: 'r-rule',
    body: [T('还没证完的目标，连同每个目标手里的已知，叫<b>证明状态</b>。证明从「只有一个目标」开始，每用一次规则，状态就变一次，目标都没了就证完了。Isabelle 的证明状态本身就是一条定理 ⟦子目标⟧ ⟹ 目标，证完一个子目标就少一个前提；Lean 的证明状态是一组还没填的元变量。', 'The goals still open, each with what it has to work from, are the <b>proof state</b>. A proof starts with a single goal, every rule used changes the state, and when no goal is left it is done. In Isabelle a proof state is itself a theorem ⟦subgoals⟧ ⟹ goal, one premise fewer for each subgoal proved; in Lean it is a set of metavariables still to fill.')],
    see: ['backward', 'tactic'],
  },
  {
    id: 'pattern', group: 'rules', title: T('高阶模式', 'higher-order pattern'), at: 'r-pattern',
    body: [T(`元变量后面跟着变量（?P(x)）就是高阶${W('unification')}，一般说来解不止一个，甚至判定不了有没有解。Miller 发现：元变量只跟着各不相同的约束变量时（<b>高阶模式</b>），解只有一个，?P 就是把那些变量当参数的函数。Isabelle 和 Lean 在日常使用中靠的正是模式合一；不是模式的，就留着等别处定下来。`, `A metavariable followed by variables (?P(x)) makes ${W('unification')} higher-order, which in general has more than one solution and is not even decidable. Miller found that when a metavariable is followed only by distinct bound variables (a <b>higher-order pattern</b>), there is one solution: ?P is the function with those variables as its parameters. Isabelle and Lean rely on pattern unification day to day; what is not a pattern waits to be settled elsewhere.`)],
    see: ['unification', 'mgu'],
  },
  {
    id: 'forward', group: 'rules', title: T('正向推理', 'forward reasoning'), at: 'r-drule',
    body: [T(`从已知出发往前推，叫<b>正向推理</b>：规则的第一条前提对上一条已知，结论加进已知。和${W('backward')}相反，它不看目标。有的规则只能倒着用（任取），有的只好往前推（取一个）：看合一时是哪一边带着约束变量。`, `Reasoning onwards from what is known is <b>forward reasoning</b>: a rule’s first premise fits a given, and its conclusion joins the givens. Unlike ${W('backward')}, it does not look at the goal. Some rules only go backwards (For any), some only forwards (Take one): it depends on which side carries the bound variable when unifying.`)],
    see: ['backward'],
  },
  {
    id: 'tactic', group: 'rules', title: T('策略', 'tactic'), at: 's-repeat',
    body: [
      T(`<b>策略</b>是把一个${W('proof-state')}变成新证明状态的程序。它只能用规则一步步地变，所以策略组合得再复杂，证出的东西都经过核。Isabelle 的 auto、Lean 的 simp、omega 都是策略。`, `A <b>tactic</b> is a program that turns a ${W('proof-state')} into new ones. It can only change it a rule at a time, so however intricate tactics get, what they prove goes through the kernel. Isabelle’s auto and Lean’s simp and omega are tactics.`),
      T('组合子把策略拼成更大的策略：一个接一个（THEN）、不行就换（ORELSE）、重复（REPEAT）、每个目标都做（ALLGOALS，Lean 的 <;>）、可做可不做（TRY）。', 'Combinators put tactics together into bigger ones: one after another (THEN), or else (ORELSE), repeat (REPEAT), on every goal (ALLGOALS, Lean’s <;>), maybe (TRY).'),
    ],
    see: ['backtracking', 'lcf'],
  },
  {
    id: 'backtracking', group: 'rules', title: T('回溯', 'backtracking'), at: 's-results',
    body: [T(`一步有几种走法时，把每一种都留着，走错了就退回最近一个还有别的选择的地方，换下一种：这叫<b>回溯</b>。Isabelle 的策略给出的是一串结果，后面的策略对每一种都试；Prolog 也是这台机器：规则写的次序、子目标先问哪个，决定了搜索停不停得下来。`, `When a step can go several ways, keep every one, and when stuck go back to the latest place with another choice and take the next: this is <b>backtracking</b>. each tactic in Isabelle gives a run of results that the tactics after it try one by one; Prolog is the same machine, where the order rules are written in and which subgoal is asked first decide whether the search stops.`)],
    see: ['dfs'],
  },
  {
    id: 'dfs', group: 'rules', title: T('深度优先搜索', 'depth-first search'), at: 's-search',
    body: [T(`把一条路走到头（证完，或者做不下去）再退回来换下一条，叫<b>深度优先搜索</b>。它省地方，只记着眼下这一条路；代价是可能顺着一条没有尽头的路一直走下去。所以自动的策略常常限制深度，或者一层层加深再搜。`, `Following one path to its end (done, or stuck) before going back for the next is <b>depth-first search</b>. It saves space, remembering only the current path; the price is that it may follow an endless path forever. So automatic tactics often bound the depth, or deepen it a level at a time.`)],
    see: ['backtracking', 'tactic'],
  },
  {
    id: 'simplifier', group: 'rules', title: T('化简器', 'simplifier'), at: 'sp-dneg',
    body: [T(`<b>化简器</b>拿一组${W('rewrite')}，在句子里哪一处对得上就换哪一处，一直换到哪一条都对不上。每条规则都是证过的等价或等式，所以每一步都由核认可。Isabelle 和 Lean 的 simp 都是这样的程序，是日常用得最多的自动化。`, `A <b>simplifier</b> takes a set of rules, each a ${W('rewrite')}, and replaces wherever one fits in a sentence, until none fits. Each rule is a proved equivalence or equation, so every step is accepted by the kernel. Isabelle’s and Lean’s simp are such programs, the automation used most every day.`)],
    see: ['rewrite', 'ordered'],
  },
  {
    id: 'rewrite', group: 'rules', title: T('改写规则', 'rewrite rule'), at: 'sp-dneg',
    body: [T('l ⟼ r 是一条<b>改写规则</b>：句子里对得上左边 l 的地方，换成右边 r。它靠的是 l 和 r 互相推得出（等价），或者 l = r。规则可以带条件：条件证出来了，这一处才算改对了。一组规则改到底，要靠每次都让句子变得「更简单」，否则会绕圈。', 'l ⟼ r is a <b>rewrite rule</b>: a place in a sentence that fits the left side l is replaced by the right side r. It rests on l and r giving each other (equivalence), or on l = r. A rule may carry a condition, and the rewrite is right only once the condition is proved. A set of rules used to the end must make the sentence “simpler” each time, or it goes round in circles.')],
    see: ['simplifier', 'equivalence'],
  },
  {
    id: 'ordered', group: 'rules', title: T('有序重写', 'ordered rewriting'), at: 'in-circle',
    body: [T(`x + y = y + x 这样两边只差变量位置的规则，${W('simplifier')}照直用就会绕圈。<b>有序重写</b>给式子排一个固定的次序，只在改完变得「更小」时才用它。Isabelle 的 simp 对这类规则自动这样做，所以交换律也能放进化简。`, `A rule like x + y = y + x, whose sides differ only in where the variables go, makes a ${W('simplifier')} go round in circles. <b>Ordered rewriting</b> fixes an order on expressions and uses the rule only when the result is “smaller”. Isabelle’s simp does this for such rules automatically, so commutativity can go into Simp.`)],
    see: ['simplifier'],
  },
  {
    id: 'automation', group: 'rules', title: T('自动证明器', 'automatic prover'), at: 'au-negate',
    body: [
      T(`<b>自动证明器</b>（E、Vampire、Z3 这样的程序）不管引入还是消去，只做一件事：把要证的那句否定了，和已知一起化成${W('cnf')}的子句，再找矛盾。Isabelle 的 sledgehammer 把目标交给它们，拿回它们用到的那几条事实，再由 metis 在核里重新证一遍。`, `An <b>automatic prover</b> (a program such as E, Vampire or Z3) knows nothing of introduction or elimination and does one thing: negate what is to be proved, bring it with the hypotheses into ${W('cnf')}, and look for a contradiction among the clauses. Isabelle’s sledgehammer hands them a goal, takes back the facts they used, and has metis prove it again in the kernel.`),
      T('现代的 SAT 求解器（DPLL、CDCL）也是在子句里找矛盾，只是更会挑：先做单元传播，走不通就记下学到的子句再回头。', 'Modern SAT solvers (DPLL, CDCL) look for a contradiction among clauses too, only far better at choosing: unit propagation first, and when stuck, a learned clause and a step back.'),
    ],
    see: ['resolution', 'certificate'],
  },
  {
    id: 'skolem', group: 'rules', title: T('Skolem 函数', 'Skolem function'), at: 'au-skolem',
    body: [T('子句里只有「对所有」。∀x. ∃y. P(x, y) 里的 y 跟着 x 变，就换成一个新函数 sk(x)：∀x. P(x, sk(x))。这叫 <b>Skolem 化</b>。换出来的句子和原来不等价，却同样可满足或同样不可满足，找矛盾够用了。', 'Clauses hold only “for all”. In ∀x. ∃y. P(x, y), y varies with x, so it is replaced by a new function sk(x): ∀x. P(x, sk(x)). This is <b>Skolemisation</b>. The result is not equivalent to the original, but it is satisfiable exactly when the original is, which is all a search for a contradiction needs.')],
    see: ['clause', 'satisfiable'],
  },
  {
    id: 'resolution', group: 'rules', title: T('归结', 'resolution'), at: 'au-resolve',
    body: [T(`两条${W('clause')}里有一对相反的文字（A 和 ¬A），消掉这一对，剩下的用「或」连起来：这就是<b>归结</b>（Robinson，1965）。一次只能消一对。子句里有变量时，先把那一对${W('unification')}再消。推出空子句，就推出了 ⊥。`, `Take a literal A in one ${W('clause')} and ¬A in another, cancel the pair and join what is left with “or”: that is <b>resolution</b> (Robinson, 1965). Only one pair goes at a time. When the clauses have variables, the pair undergoes ${W('unification')} first. Reaching the empty clause is reaching ⊥.`)],
    see: ['refutation', 'automation'],
  },
  {
    id: 'refutation', group: 'rules', title: T('反驳完备', 'refutation completeness'), at: 'au-saturate',
    body: [T(`一组子句不可满足，${W('resolution')}就一定能从中推出空子句：这叫<b>反驳完备</b>。它不保证能证出每一句话本身，只保证「否定它会矛盾」时找得到矛盾，而这正好够用：要证 C，就证 ¬C 和已知矛盾。推不出 ⊥ 而停下来的，这组子句能同时成立。`, `When a set of clauses is unsatisfiable, ${W('resolution')} is sure to reach the empty clause from it: <b>refutation completeness</b>. It does not promise to prove every sentence directly, only to find the contradiction when denying it is one, which is just enough: to prove C, show ¬C contradicts the hypotheses. When it stops without ⊥, the clauses can all hold at once.`)],
    see: ['resolution', 'undecidable'],
  },
  {
    id: 'unit', group: 'rules', title: T('单元传播', 'unit propagation'), at: 'au-horn',
    body: [T(`只有一个文字的子句（单元子句）说的是一件被迫的事；拿它去和别的子句${W('resolution')}，那条子句就短一个文字。一直这样传下去，叫<b>单元传播</b>。对 Horn 子句（每条至多一个不带 ¬ 的文字）它就够了，而且快；SAT 求解器每一步都先做它。`, `A clause with one literal (a unit clause) states a forced fact; ${W('resolution')} with it makes another clause one literal shorter. Passing such facts along is <b>unit propagation</b>. For Horn clauses (at most one literal without ¬ each) it is enough, and fast; SAT solvers do it first at every step.`)],
    see: ['resolution', 'automation'],
  },
  {
    id: 'certificate', group: 'rules', title: T('证书', 'certificate'), at: 'au-cert',
    body: [T(`外面的证明器不在核里，可能有错。所以只要它交出<b>证书</b>：哪两条子句消出哪一条，顺着 ⊥ 往回找的那几步。核照着证书一步步重放，每一步都用自己的规则证一遍。找证明难，查证明容易：找的可以是任何程序，信的只是${W('kernel')}。Isabelle 的 metis、Lean 和 Coq 里重放外部证书的工具都是这样做的。`, `An outside prover is not in the kernel and may be wrong. So it need only hand over a <b>certificate</b>: which two clauses cancel into which, the steps traced back from ⊥. The kernel replays the certificate step by step, proving each with its own rules. Finding a proof is hard and checking one easy: the finder may be any program, and only the ${W('kernel')} is trusted. Isabelle’s metis, and the tools in Lean and Coq that replay outside certificates, all work this way.`)],
    see: ['automation', 'reflection'],
  },
  {
    id: 'decision', group: 'rules', title: T('判定程序', 'decision procedure'), at: 'rf-eval',
    body: [T('对一类问题里的每一个都能停下来、答对「是」还是「不是」的程序，叫<b>判定程序</b>。命题逻辑的永真式可以判定（把真值表算完）；线性算术、Presburger 算术也有判定程序。一阶逻辑整体没有。', 'A program that, for every problem of a kind, stops and correctly answers yes or no is a <b>decision procedure</b>. Tautologies of propositional logic can be decided (work out the whole truth table); linear arithmetic and Presburger arithmetic have decision procedures too. First-order logic as a whole has none.')],
    see: ['reflection', 'undecidable'],
  },
  {
    id: 'reflection', group: 'rules', title: T('反射', 'reflection'), at: 'rf-decide',
    body: [T(`<b>反射</b>不留证书：把要判定的句子写成数据，写一个${W('decision')}，证明一次它是对的，以后每一题只要核把程序算出来，证明项就是 rfl。Lean 的 decide、Coq 的 ssreflect 走的是这条路。算得快慢看核怎么算，所以也有判定过程（比如 Lean 的 omega）是生成证明交给核去查。`, `<b>Reflection</b> keeps no certificate: write the sentences to decide as data, write a ${W('decision')}, prove once that it is right, and after that every problem needs only the kernel to run the program, the proof term being rfl. Lean’s decide and Coq’s ssreflect take this road. How fast depends on how the kernel computes, so some decision procedures (Lean’s omega, say) produce a proof for the kernel to check instead.`)],
    see: ['certificate', 'defeq'],
  },

  // ---------- proofs as programs ----------
  {
    id: 'curry-howard', group: 'types', title: T('Curry–Howard 对应', 'Curry–Howard correspondence'), at: 't-app',
    body: [
      T('<b>Curry–Howard 对应</b>：一句话就是一个类型，它的证明就是这个类型的一个程序（项）。「A → B」的证明是函数，「A ∧ B」的证明是一对，「A ∨ B」的证明是带标签的值，⊥ 是没有任何值的空类型，「¬A」就是「A → ⊥」；「∀x. …」的证明是吃一样东西的函数，「∃x. …」的证明是一样东西和关于它的证明配成的一对。', 'The <b>Curry–Howard correspondence</b>: a sentence is a type, and a proof of it is a program (a term) of that type. A proof of “A → B” is a function, of “A ∧ B” a pair, of “A ∨ B” a tagged value; ⊥ is the empty type with no values, and “¬A” is “A → ⊥”; a proof of “∀x. …” is a function taking a thing, and a proof of “∃x. …” a thing paired with a proof about it.'),
      T('证明板上的规则也一一对上：套用是函数应用，假设框是 λ，拼起来和拆开是造一对和取分量，分情况是按标签分支。所以检查证明就是检查类型。', 'The proof board’s rules match one for one: Apply is function application, the assumption box is λ, joining and splitting are making a pair and taking a component, and cases is branching on the tag. So checking a proof is checking a type.'),
      T('反证法没有对应的程序：没有哪个程序能从「A 不会不成立」变出 A 的证明。所以直觉主义逻辑正好是程序能做到的那部分，经典逻辑要把反证法或排中律另外当公理加上。', 'Proof by contradiction has no program: none can conjure a proof of A out of “A cannot fail”. So intuitionistic logic is exactly the part programs can do, and classical logic must add proof by contradiction or excluded middle as an axiom.'),
    ],
    see: ['proof-term', 'intuitionistic'],
  },
  {
    id: 'proof-term', group: 'types', title: T('证明项', 'proof term'), at: 't-app',
    body: [T(`把一个证明写成一个式子，就是它的<b>证明项</b>：已知是名字，套用是 p q，假设框是 fun h => …，拼起来是 ⟨a, b⟩。按${W('curry-howard')}，它同时是一个程序，类型就是它证的那句话。证明项留下来，谁都可以拿另一个检查器复查。`, `A proof written as an expression is its <b>proof term</b>: a given is a name, Apply is p q, the assumption box fun h => …, Join ⟨a, b⟩. By the ${W('curry-howard')}, it is a program as well, whose type is the sentence it proves. A proof term kept can be checked again by anyone with another checker.`)],
    see: ['curry-howard', 'lambda'],
  },
  {
    id: 'lambda', group: 'types', title: T('λ 抽象', 'λ-abstraction'), at: 't-lam',
    body: [T('fun h => b（也写成 λ h => b）造一个函数：拿到一个 h，就给出 b。这叫 <b>λ 抽象</b>，是 Church 在 1930 年代的 λ 演算里的写法。假设框就是 λ：框里的假设是参数 h，框里的证明是函数体 b，框外得到 A → B 的证明。', 'fun h => b (also written λ h => b) makes a function: given an h, give b. This is <b>λ-abstraction</b>, as written in Church’s λ-calculus of the 1930s. The assumption box is λ: its assumption is the parameter h, its proof the body b, and outside comes a proof of A → B.')],
    see: ['beta', 'proof-term'],
  },
  {
    id: 'beta', group: 'types', title: T('β 归约', 'β-reduction'), at: 't-beta',
    body: [T(`(fun h => b) a 算成「b 里的 h 换成 a」，这一步叫 <b>β 归约</b>，就是调用一个函数。证明里，一个${W('lambda')}刚造出来就被套用，是一处弯路；β 归约把它拿掉，证的还是同一句。`, `(fun h => b) a works out to “b with h replaced by a”: <b>β-reduction</b>, calling a function. In a proof, a ${W('lambda')} made and at once applied is a detour; β-reduction takes it out, proving the same sentence.`)],
    see: ['normal-form'],
  },
  {
    id: 'normal-form', group: 'types', title: T('正规形式', 'normal form'), at: 't-beta',
    body: [T(`把证明项里的弯路（刚引入就消去）一处处拿掉，直到一处都不剩，得到的是<b>正规形式</b>。直觉主义逻辑的每个证明项都化得成正规形式，而且不管先拿哪一处，结果都一样（强正规化、合流）。正规的证明只用到要证的那句里出现过的东西，这是 Gentzen 和 Prawitz 证明论的出发点。`, `Take the detours (brought in, then at once used up) out of a proof term one by one until none is left, and what remains is the <b>normal form</b>. Every proof term of intuitionistic logic comes to a normal form, the same whichever detour goes first (strong normalisation and confluence). A normal proof uses only what appears in the sentence it proves, the starting point of Gentzen’s and Prawitz’s proof theory.`)],
    see: ['beta', 'elim-rule'],
  },
  {
    id: 'dep-function', group: 'types', title: T('依赖函数', 'dependent function'), at: 't-all',
    body: [T('「∀x. P(x)」的证明是一个函数，参数不是证明，而是一样东西：给它 t，它还你 P(t) 的证明。结果的类型跟着参数变，所以叫<b>依赖函数</b>，它的类型写作 Π x, P x，Lean 里就写 ∀ x, P x。∃ 对应的是依赖的一对（Σ 类型）：一样东西，和它满足那句话的证明。', 'A proof of “∀x. P(x)” is a function whose argument is not a proof but a thing: give it t and it gives back a proof of P(t). The type of the result varies with the argument, so it is a <b>dependent function</b>, its type written Π x, P x, in Lean simply ∀ x, P x. ∃ corresponds to the dependent pair (Σ type): a thing, and a proof that it fits.')],
    see: ['dependent', 'curry-howard'],
  },
  {
    id: 'currying', group: 'types', title: T('柯里化', 'currying'), at: 't-wpair',
    body: [T('吃一对的函数和一个一个吃的函数可以互相改写：A ∧ B → C 和 A → (B → C) 互相推得出。把前者换成后者叫<b>柯里化</b>，得名于 Haskell Curry。证明助手里多参数的函数和多前提的规则，都写成一个一个吃的样子。', 'A function taking a pair and one taking its arguments one at a time can each be rewritten as the other: A ∧ B → C and A → (B → C) give each other. Turning the first into the second is <b>currying</b>, named after Haskell Curry. In proof assistants functions of several arguments and rules of several premises are all written to take them one at a time.')],
    see: ['curry-howard'],
  },
  {
    id: 'inductive', group: 'types', title: T('归纳类型', 'inductive type'), at: 'in-distinct',
    body: [T('一个类型由几个构造子一层层造出来，叫<b>归纳类型</b>：nat = 0 | S nat，list = [] | x # xs。声明只写了这一句，证明器就送上一组规则：不同构造子造的值不相等，同一构造子造的值相等时参数相等，按情况分，归纳，以及按构造子递归定义函数。Isabelle 的 datatype、Lean 的 inductive 都是这样的声明。', 'A type built up layer by layer from a few constructors is an <b>inductive type</b>: nat = 0 | S nat, list = [] | x # xs. The declaration says only that, and the prover supplies a set of rules: values made by different constructors differ, values made by one constructor are equal only if their arguments are, cases, induction, and functions defined by recursion over the constructors. Isabelle’s datatype and Lean’s inductive are such declarations.')],
    see: ['constructor', 'induction'],
  },
  {
    id: 'constructor', group: 'types', title: T('构造子', 'constructor'), at: 'in-distinct',
    body: [T(`造出${W('inductive')}的值的那几个符号叫<b>构造子</b>：数的 0 和 S，列表的 [] 和 #。类型的每个值都由它们造出，而且只有一种造法：所以 0 ≠ S x，S a = S b 推出 a = b。`, `The symbols that make the values of an ${W('inductive')} are its <b>constructors</b>: 0 and S for numbers, [] and # for lists. Every value of the type is made by them, and in only one way: so 0 ≠ S x, and S a = S b gives a = b.`)],
    see: ['injectivity', 'inductive'],
  },
  {
    id: 'injectivity', group: 'types', title: T('一对一', 'injectivity'), at: 'in-inject',
    body: [T(`同一个${W('constructor')}造出的两个值相等，参数也就相等：S a = S b 推出 a = b，x # xs = y # ys 推出 x = y 且 xs = ys。这叫构造子<b>一对一</b>（单射）。它和「不同构造子不相等」一起，说的是每个值只有一种造法。`, `Two values made by the same ${W('constructor')} are equal only if their arguments are: S a = S b gives a = b, and x # xs = y # ys gives x = y and xs = ys. This is the <b>injectivity</b> of constructors. Together with “different constructors differ” it says every value is made in exactly one way.`)],
    see: ['constructor'],
  },
  {
    id: 'induction', group: 'types', title: T('归纳', 'induction'), at: 'in-zero',
    body: [T(`要证对所有的数都成立，证 0 时成立，再证对 x 成立就对 S x 也成立：这是<b>归纳</b>。每个${W('inductive')}都有它自己的归纳规则，有几个构造子就有几条前提，带自己类型参数的构造子，前提里就多一个归纳假设。化简改不动、因为不知道 x 是哪个构造子造的，就是该归纳的时候。`, `To prove something for every number, prove it for 0, then prove that whenever it holds for x it holds for S x: this is <b>induction</b>. Every ${W('inductive')} has an induction rule of its own, a premise per constructor, with an induction hypothesis for each argument of its own type. When Simp is stuck because x is not known to be made by one constructor or another, it is time for induction.`)],
    see: ['inductive', 'simplifier'],
  },
  {
    id: 'motive', group: 'types', title: T('动机', 'motive'), at: 'eq-rec',
    body: [T('在 Lean 里，a = b 也是一个类型。造它只有 rfl（a = a），用它只有 Eq.rec，写作 h ▸ p：h 证 a = b，p 证一句关于 a 的话，就得到把其中几处 a 换成 b 的那句。换哪几处，由一个函数 fun x => … 说清，这个函数叫<b>动机</b>；Lean 多半能从要证的那句里把它读出来。对称、传递都由这两样拼出：h ▸ rfl、k ▸ h。', 'In Lean, a = b is a type too. The only way to make one is rfl (a = a), and the only way to use one is Eq.rec, written h ▸ p: h proves a = b and p a sentence about a, giving that sentence with some of its a’s replaced by b. Which ones is said by a function fun x => …, the <b>motive</b>; Lean can usually read it off the sentence to prove. Symmetry and transitivity are built from these two: h ▸ rfl, k ▸ h.')],
    see: ['equality', 'defeq'],
  },
  {
    id: 'defeq', group: 'types', title: T('定义相等', 'definitional equality'), at: 'eq-defeq',
    body: [T(`核比较两个类型前，会按定义去算（展开定义、代入参数、β 归约），算出来一样的就算一样，这叫<b>定义相等</b>：1 + 1 = 2、0 + x = x 用 rfl 就证完，一个证明的类型也可以按它来换。哪些相等是定义相等，取决于定义是怎么写的。`, `Before comparing two types, the kernel computes (unfolding definitions, putting in arguments, β-reduction), and what comes out alike counts as alike: <b>definitional equality</b>. 1 + 1 = 2 and 0 + x = x are proved by rfl, and a proof’s type can be read through it too. Which equalities are definitional depends on how the definitions are written.`)],
    see: ['propeq', 'motive'],
  },
  {
    id: 'propeq', group: 'types', title: T('命题相等', 'propositional equality'), at: 'eq-propeq',
    body: [T(`x + 0 = x 是对的，但加法按第一个数递归，x 不知道是几，核算不下去：它要用归纳证，这叫<b>命题相等</b>。用它换掉类型里的一处要写 ▸；${W('defeq')}不用写，核自己会算。Isabelle 的 HOL 没有定义相等这一层，所有相等都由规则证出，或者由化简器算出。`, `x + 0 = x is true, but addition recurses on its first number, and with x unknown the kernel gets stuck: it takes induction, a <b>propositional equality</b>. Using it to replace part of a type takes ▸; a ${W('defeq')} needs nothing written, since the kernel computes it. Isabelle’s HOL has no layer of definitional equality: every equality is proved by rules or worked out by the simplifier.`)],
    see: ['defeq', 'transport'],
  },
  {
    id: 'dependent', group: 'types', title: T('依赖类型', 'dependent type'), at: 'dt-vec',
    body: [
      T('<b>依赖类型</b>是依赖一个值的类型：Vec n 是长 n 的向量。「∀x. Vec x → Vec (S x)」这样的函数，结果的类型依赖参数。长度写在类型里，取空向量第一个这样的错在检查类型时就被拒绝。', 'A <b>dependent type</b> is a type that depends on a value: Vec n is vectors n long. In a function such as “∀x. Vec x → Vec (S x)”, the type of the result depends on the argument. With the length in the type, a mistake such as taking the first of an empty vector is refused when types are checked.'),
      T('这个游戏的向量只记长度，所以 Vec n 当作一句话，它的证明就是一个向量。Lean 里两者是分开的：Prop 里的证明只关心有没有，两个证明算同一个（证明无关性）；Type 里的值（数、列表、向量）才是程序算的东西。', 'This game’s vectors keep only the length, so Vec n is treated as a sentence and its proof is a vector. In Lean the two are kept apart: proofs in Prop only matter for whether there is one, any two counting as the same (proof irrelevance); values in Type (numbers, lists, vectors) are what programs compute with.'),
    ],
    see: ['dep-function', 'implicit', 'transport'],
  },
  {
    id: 'implicit', group: 'types', title: T('隐式参数', 'implicit argument'), at: 'dt-vec',
    body: [T(`能从别的参数或要的类型里读出来、所以不用写的参数叫<b>隐式参数</b>：vcons 的长度 x 从向量的类型里就看得出。Lean 里写成 {x : nat}，由${W('unification')}填上；Isabelle 的类型推导做的是同一件事。`, `An argument that can be read off the other arguments or the type wanted, and so is not written, is an <b>implicit argument</b>: the length x of vcons shows in the vector’s type. Lean writes it {x : nat} and ${W('unification')} fills it in; Isabelle’s type inference does the same.`)],
    see: ['dependent'],
  },
  {
    id: 'transport', group: 'types', title: T('搬运', 'transport'), at: 'dt-transport',
    body: [T(`类型里的长度算不出一样时，要用一个等式把值<b>搬运</b>过去：h ▸ v 是同一个向量，换上一个相等的长度。这是${W('propeq')}的代价；Lean 的库里常常为此把定义换一种写法，让需要的相等变成定义相等。`, `When lengths in types do not compute to the same, a value has to be <b>transport</b>ed across an equation: h ▸ v is the same vector under an equal length. This is the price of a ${W('propeq')}; Lean’s libraries often rewrite a definition just so the equality needed becomes definitional.`)],
    see: ['dependent', 'motive'],
  },

  // ---------- the limits of proof ----------
  {
    id: 'liar', group: 'limits', title: T('说谎者悖论', 'liar paradox'), at: 'kk-one',
    body: [T('「这句话是假的」：它真，它就假；它假，它就真。岛上的版本是「我是无赖」，没有人说得出。它不是逻辑的毛病，而是一把工具：让一样东西说到它自己，再说反话，就能证明某样东西不存在。罗素悖论、康托尔定理、停机问题都是它。', '“This sentence is false”: if it is true it is false, and if false, true. The island’s version is “I am a knave”, which nobody can say. It is no flaw of logic but a tool: let something speak of itself and say the opposite, and it proves that a thing cannot exist. Russell’s paradox, Cantor’s theorem and the halting problem are all of it.')],
    see: ['diagonal'],
  },
  {
    id: 'diagonal', group: 'limits', title: T('对角线论证', 'diagonal argument'), at: 'u-barber',
    body: [T(`排一张 x 对 y 的表，只看 x 对 x 的那条斜线，再把斜线上的每一格反过来，造出一行和表里每一行都不同的东西：这是<b>对角线论证</b>（康托尔，1891）。理发师、集合比它的元素多、不接受自己编码的机器，都是${W('liar')}在一张表上的样子。`, `Lay out a table of x against y, look only at the diagonal of x against x, and flip every cell of it: what you get differs from every row of the table. This is the <b>diagonal argument</b> (Cantor, 1891). The barber, a set with more subsets than members, a machine rejecting its own code: each is the ${W('liar')} on a table.`)],
    see: ['liar', 'undecidable'],
  },
  {
    id: 'undecidable', group: 'limits', title: T('不可判定', 'undecidability'), at: 'u-halt',
    body: [T(`没有判定程序能对每个问题都答对，这类问题就<b>不可判定</b>。停机问题是第一个（Turing，1936）。一阶逻辑的定理也不可判定，只是半可判定（Church 和 Turing，1936）：推得出的，按部就班地搜总能找到；推不出的，搜索可能永远停不下。所以自动化只能帮忙，不能全包。`, `When no decision procedure answers every problem of a kind correctly, the kind is <b>undecidable</b>. The halting problem was the first (Turing, 1936). First-order validity is undecidable too, only semi-decidable (Church and Turing, 1936): what follows, a methodical search always finds; on what does not, the search may never stop. So automation can help, but never do it all.`)],
    see: ['reduction', 'refutation'],
  },
  {
    id: 'reduction', group: 'limits', title: T('归约', 'reduction'), at: 'u-halt',
    body: [T(`要是能用 B 的解法解出 A，就说 A <b>归约</b>到 B。A 不可判定，B 也就不可判定：不然 B 的判定程序加上这个归约，就判定了 A。这样一个${W('undecidable')}的问题就能传给一串别的问题。`, `If A can be solved with a solver for B, A <b>reduces</b> to B. If A is undecidable, so is B: otherwise B’s decision procedure, with the reduction, would decide A. This is how ${W('undecidable')} spreads from one problem to a whole chain of others.`)],
    see: ['undecidable'],
  },

  // ---------- proof assistants ----------
  {
    id: 'provers', group: 'assist', title: T('证明助手', 'proof assistant'), at: 'r-match',
    body: [
      T(`<b>证明助手</b>是让人和机器一起写证明、由机器逐步检查的程序。它们都有一个很小的${W('kernel')}：只有核能认定一条定理成立，其余的自动化无论多聪明，最后都要经过核，所以造不出假定理。`, `A <b>proof assistant</b> is a program in which a person and the machine write proofs together, every step checked by the machine. Each has a small ${W('kernel')}: only the kernel can declare a theorem proved, and however clever the automation around it, everything goes through the kernel, so it cannot make a false theorem.`),
      T('这个游戏的证明器从第一块元件起，就按这个思路搭：核只有几条规则，引理都是用规则证出来的。它只借证明助手搭核、搭元件的思路，自己的元件和写法都按游戏的需要来定。', 'This game’s prover is built that way from its first part: a kernel of a few rules, and lemmas proved with them. It borrows only proof assistants’ way of building a kernel and its parts; its own parts and notation are fitted to the game.'),
    ],
    see: ['lean', 'isabelle'],
  },
  {
    id: 'isabelle', group: 'assist', title: T('Isabelle', 'Isabelle'), at: 'r-match',
    body: [T(`<b>Isabelle</b>（Paulson，1986 年起）走 LCF 的路：定理是一种抽象类型 thm，只有核里的几个函数（每条推理规则一个）能造出 thm，不必留下证明项。它最常用的逻辑 HOL 是经典的高阶逻辑。规则写成带${W('metavariable')}的 ⟦前提⟧ ⟹ 结论，由合一来填，再由策略和化简器把规则组合起来自动地用；sledgehammer 请外面的自动证明器帮忙。`, `<b>Isabelle</b> (Paulson, from 1986) takes the LCF road: a theorem is an abstract type thm, and only a few functions in the kernel (one per rule of inference) can make one, with no proof term to keep. Its most used logic, HOL, is classical higher-order logic. Rules are written ⟦premises⟧ ⟹ conclusion, each ${W('metavariable')} in them filled in by unification, and tactics and the simplifier put rules together to use them automatically; sledgehammer calls on outside automatic provers.`)],
    see: ['lcf', 'lean'],
  },
  {
    id: 'lean', group: 'assist', title: T('Lean', 'Lean'), at: 'r-match',
    body: [T('<b>Lean</b>（de Moura，2013 年起）基于依赖类型论。写下的每个证明最后都变成一个证明项，核检查它的类型是不是要证的那句话。项留着，谁都可以拿另一个检查器复查，这叫 de Bruijn 准则。Lean 的逻辑本身是直觉主义的，经典推理靠公理 Classical.em；数学库 mathlib 是用它写成的。', '<b>Lean</b> (de Moura, from 2013) is built on dependent type theory. Every proof written ends up as a proof term, and the kernel checks that its type is the sentence to prove. The terms are kept, so anyone can recheck them with another checker: the de Bruijn criterion. Lean’s logic is intuitionistic at heart, classical reasoning coming from the axiom Classical.em; the mathematics library mathlib is written in it.')],
    see: ['isabelle', 'provers'],
  },
  {
    id: 'lcf', group: 'assist', title: T('LCF', 'LCF'), at: 's-repeat',
    body: [T(`<b>LCF</b>（Milner，1972 年起）定下了一个设计：定理是一种只有核能造的抽象类型，策略是普通的程序，只能调核的规则来造定理。所以${W('tactic')}再复杂、自动化再聪明，都不必可信，只要核可信。为了写策略，Milner 还发明了 ML 语言。Isabelle、HOL4、HOL Light 都是它的后代。`, `<b>LCF</b> (Milner, from 1972) set a design: a theorem is an abstract type only the kernel can make, and tactics are ordinary programs that make theorems only by calling the kernel’s rules. So however intricate a ${W('tactic')} or clever the automation, none of it need be trusted, only the kernel. To write tactics Milner invented the language ML. Isabelle, HOL4 and HOL Light all descend from it.`)],
    see: ['isabelle', 'kernel'],
  },
  {
    id: 'scripts', group: 'assist', title: T('结构化证明', 'structured proof'), at: 'sc-rows',
    body: [
      T('Isabelle 的 Isar（Wenzel，1999 年起）把证明写成给人读的文本，叫<b>结构化证明</b>：have 先证一句，show 证出要证的那句，assume、fix、obtain 开出假设、任取的东西和拿出来的东西，proof … qed 是一块。每一句后面 by 的那个方法只负责一小步，系统检查每一句。Lean 的写法相近：have h : A := by …，show B，intro，obtain ⟨x, h⟩ := …，再加上把一串等式连起来的 calc。', 'Isabelle’s Isar (Wenzel, from 1999) writes proofs as text for people, a <b>structured proof</b>: have proves a sentence on the way, show the one wanted, assume, fix and obtain bring in an assumption, an arbitrary thing and a thing taken out, and proof … qed is a block. The method after each by does one small step, and the system checks every row. Lean writes much the same: have h : A := by …, show B, intro, obtain ⟨x, h⟩ := …, and calc for a chain of equations.'),
      T('脚本和证明项、证明电路是同一个证明：每一行是一个元件，块是框。大型的形式化（四色定理、开普勒猜想、数学库 mathlib 和 AFP）都是这样写成的：人写结构和引理，自动化补中间的小步。', 'A script, a proof term and a proof circuit are one proof: each row a part, each block a box. Large formalisations (the four colour theorem, the Kepler conjecture, the libraries mathlib and the AFP) are written this way: people write the structure and the lemmas, automation fills in the small steps.'),
    ],
    see: ['provers', 'tactic'],
  },
]
