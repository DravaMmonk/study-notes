// 证明完毕's encyclopedia (the shell's 百科, games/kit/shell): how the game is played, then the ideas it teaches.
// Each entry opens once the level `at` is reached (no `at`: from the start); `see` links related entries.
const T = (zh, en) => ({ zh, en })

export const GLOSSARY_GROUPS = [
  { id: 'play', title: T('玩法', 'How to play') },
  { id: 'logic', title: T('逻辑', 'Logic') },
]

export const GLOSSARY = [
  {
    id: 'map', group: 'play', title: T('关卡地图', 'Level map'),
    body: [
      T('关卡按章排列。第一章纸笔之后，每一章是你装进同一台证明器的一个模块，前面装上的都留着。通过一关，接在它后面的关卡就会打开；岔出去的专题和挑战可以晚些再玩。', 'The levels sit in chapters. After the first, on pen and paper, each chapter is a module you install into the one prover you build, and what is installed stays. Pass a level and the levels after it open; the topics and challenges branching off can wait.'),
      T('不想按顺序玩，可以打开「全部解锁」。', 'If you would rather not go in order, turn on “Unlock all”.'),
    ],
    see: ['board'],
  },
  {
    id: 'board', group: 'play', title: T('证明电路板', 'The proof board'), at: 'copy',
    body: [
      T('左边的卡片是<b>已知</b>，右边的是<b>目标</b>。一根线代表「这件事已经证出来了」：一块元件是一条推理规则，输入是它要的东西，输出是它推出的结论。', 'The cards on the left are what is <b>given</b>, the one on the right the <b>goal</b>. A wire means “this has been proved”: a part is a rule of inference, its inputs what it needs, its output the conclusion it draws.'),
      T('卡片上写着它此刻证出的命题。接错了，卡片会说它要什么、接进来的是什么。证完了点「检查证明」。', 'A card shows what it proves right now. Wire it wrong and the card says what it wanted and what it got. When you are done, press “Check proof”.'),
      T('卡片上要填一句话时，从这一关出现过的句子里选。', 'Where a card needs a sentence, pick it from the sentences in the level.'),
      T('每关有几组<b>测试</b>：最后一组只写字母，是题目的样子本身；其余几组把字母换成日常的句子。同一块电路要在每一组上都证得出。换一组测试，卡片上的句子跟着换名字，电路不用动：证明只看形状，不看讲的是什么，所以字母那一组证得出，换成什么句子都证得出。', 'Each level has a few <b>tests</b>: the last is just letters, the shape of the problem itself; the others put everyday sentences in place of the letters. One circuit must prove them all. Switch tests and the sentences on the cards are renamed while the circuit stays: a proof looks at shape, not at what it is about, so whatever proves the letters proves any sentences put in their place.'),
    ],
    see: ['box', 'lemma'],
  },
  {
    id: 'truth', group: 'logic', title: T('真值表', 'Truth tables'), at: 'table',
    body: [
      T('一句由几件小事和「若…则…」「并且」这些连接词拼成的话，是真是假只取决于每件小事是真是假。把所有情况列成一行一行，就是它的<b>真值表</b>：n 件小事有 2ⁿ 行。', 'A sentence built from a few small facts and connectives like “if … then …” and “and” is true or false depending only on whether each small fact is. Listing every case, one per row, gives its <b>truth table</b>: n facts make 2ⁿ rows.'),
      T('每一行都真的命题叫<b>永真式</b>。要说明一个命题不是永真式，找出一行反例就够了。每一行都假的命题叫<b>矛盾</b>，证明器里写成 ⊥。', 'A proposition true on every row is a <b>tautology</b>. To show a proposition is not one, a single counterexample row is enough. A proposition false on every row is a <b>contradiction</b>, written ⊥ in the prover.'),
    ],
    see: ['proof'],
  },
  {
    id: 'circuit', group: 'play', title: T('真值电路', 'Truth circuits'), at: 'g-not',
    body: [
      T('左边每件小事一张卡片：这一行它发生了就送出真，没发生就送出假。右边是「这句话」：接到它的线送来什么，这一行这句话就是什么。中间放门，用线接起来。', 'Each small fact has a card on the left: on a row where it happens it sends out true, otherwise false. On the right is “the sentence”: whatever reaches it is the sentence’s value on that row. Gates go in between, wired together.'),
      T('下面的真值表里点一行，板上每张卡片就显示它在那一行的值。点「一行一行算」，机器从第一行起逐行算下去，每算一行，板上的卡片就换成那一行的值；算错的那一行它会停下来。「单步」一次只算一行。', 'Click a row of the truth table below and every card shows its value on that row. Press “Run row by row” and the machine works down the table from the first row; with each row, the cards on the board show that row’s values, and it stops on the first row it gets wrong. “Step” works out one row at a time.'),
      T('有的关不给出目标真值那一列，免得表格直接透出答案；有的关连句子也只用话说出来，把它翻译成与、或、非再接成电路，就是这一关的题。', 'Some levels hide the target value column, so the table does not give the answer away; in some the sentence is only said in words, and translating it into and, or and not and wiring it is the puzzle.'),
    ],
    see: ['truth'],
  },
  {
    id: 'proof', group: 'logic', title: T('证明', 'Proof'), at: 'copy',
    body: [
      T('证明是一串步骤，每一步都由规则从前面的步骤得来。它不看真假，只看形状：规则对得上就行。', 'A proof is a chain of steps, each drawn by a rule from the steps before. It does not look at truth, only at shape: the rule has to fit.'),
      T('规则都是<b>可靠</b>的：证得出的东西一定为真。所以一行反例就说明一个命题证不出来。', 'Every rule is <b>sound</b>: whatever can be proved is true. That is why a counterexample row shows a proposition cannot be proved.'),
    ],
    see: ['truth', 'hilbert'],
  },
  {
    id: 'hilbert', group: 'logic', title: T('公理与套用', 'Axioms and Apply'), at: 'k',
    body: [
      T('证明核的两块基础元件是套用和假设框。只有公理的证明器叫<b>希尔伯特系统</b>：一条规则「套用」，加上两条公理 K 和 S。K 说已经成立的事加上任何条件都还成立；S 说在一个条件下也能做套用。', 'The kernel’s two parts are Apply and the assumption box. A prover with only axioms is a <b>Hilbert system</b>: one rule, Apply, and two axioms, K and S. K says what holds still holds under any condition; S says Apply works under a condition too.'),
      T('在这台证明器里，K 和 S 是用框证出来的元件；专题「拆掉框」拿掉框，只用它们和套用证明。它们卡片上的几句话可以选成任何句子。', 'In this prover K and S are parts proved with boxes; the topic Without the box takes the box away and proves with them and Apply alone. The sentences on their cards can be any sentences.'),
    ],
    see: ['deduction'],
  },
  {
    id: 'lemma', group: 'logic', title: T('引理', 'Lemmas'), at: 'chain',
    body: [T('证过一次的事可以当规则一直用下去，这叫<b>引理</b>。它在每一组测试上都成立，所以对任何句子都能用：「两段首尾相接的若…则…」成了元件「串联」，K 和 S 也是这样成为元件的。', 'Something proved once can be used as a rule from then on: a <b>lemma</b>. It held on every test, so it works for any sentences: “two if … then …s joined end to end” became the part Chain, and K and S became parts the same way.')],
    see: ['board'],
  },
  {
    id: 'deduction', group: 'logic', title: T('演绎定理', 'The deduction theorem'), at: 'x-chain',
    body: [T('在一个假设下能推出某件事，就能不带假设证出「若 假设，则 那件事」。证法是逐步改写：假设本身换成用 K、S 拼出的「若它，则它」，和假设无关的步用 K 包一层，套用用 S。', 'If something follows under an assumption, then “if the assumption, then that” can be proved with no assumption. The proof rewrites step by step: the assumption itself becomes “if it, then it”, pieced together from K and S, a step unrelated to it is wrapped in K, and Apply goes through S.')],
    see: ['box', 'hilbert'],
  },
  {
    id: 'box', group: 'play', title: T('假设框', 'Assumption boxes'), at: 'assume',
    body: [
      T('假设框是板上的一个框，框里就能摆元件。在框卡片上填要假设的命题，框左上角的「假设」就给出它；框里证出的东西接到框右上角的「结论」，框外就得到「假设 → 结论」。', 'An assumption box is a frame on the board, and parts sit right inside it. Fill in what to assume on the box card, and “Assume” at the box’s top left gives it; wire what you prove inside to “Conclusion” at its top right, and outside you get “assumption → conclusion”.'),
      T('点一下框里的空白，新放的元件就落在框里；板上的卡片也可以拖进框里，或拖出来。框里看得见外面的一切，框里证出的东西却只能从「结论」带出去。框卡片左上角的箭头把框折叠起来。', 'Click the empty space inside a box and new parts land in it; cards on the board can be dragged into a box, or out of one. From inside a box everything outside is visible, but what is proved inside leaves only through “Conclusion”. The arrow at the top left of the box card folds it away.'),
      T('框一关，它的假设就不再算数：卡片下面列着它还依赖的假设，证到目标时一个都不能剩（前提除外）。', 'Once the box closes, its assumption no longer counts: under each card are the hypotheses it still depends on, and none may be left at the goal (the premises aside).'),
    ],
    see: ['deduction', 'natural'],
  },
  {
    id: 'natural', group: 'logic', title: T('自然演绎', 'Natural deduction'), at: 'and',
    body: [T('到了这一章，证明器的规则成对出现：每个连接词一条<b>引入</b>规则（怎样证出它），一条<b>消去</b>规则（怎样用它）。∧ 是拼起来和拆开，∨ 是二选一和分情况，→ 是假设框和套用，⊥ 是「矛盾推出一切」。', 'By this chapter the prover’s rules come in pairs: for each connective a rule that <b>brings it in</b> (how to prove it) and one that <b>uses it up</b>. ∧ is joining and splitting, ∨ choosing a side and splitting into cases, → the assumption box and Apply, and ⊥ “from contradiction, anything”.')],
    see: ['classical'],
  },
  {
    id: 'classical', group: 'logic', title: T('经典与直觉主义', 'Classical and intuitionistic'), at: 'notnotlem',
    body: [T('没有反证法时，「下雨 ∨ ¬下雨」证不出来，虽然它每一行都真；「¬¬(下雨 ∨ ¬下雨)」却证得出。这样的逻辑叫<b>直觉主义逻辑</b>：每个「或」都要说出是哪一边。加上反证法（由「并非并非 某句」得到那句），就是<b>经典逻辑</b>，真值表上永真的话都证得出。', 'Without proof by contradiction, “it rains ∨ ¬it rains” cannot be proved, though it is true on every row; “¬¬(it rains ∨ ¬it rains)” can. Such logic is <b>intuitionistic</b>: every “or” must say which side. Add proof by contradiction (from “not not a sentence”, the sentence) and it is <b>classical</b> logic, in which every tautology can be proved.')],
    see: ['truth'],
  },
  {
    id: 'fol', group: 'logic', title: T('一阶逻辑', 'First-order logic'), at: 'fo-atoms',
    body: [
      T('命题逻辑的一个字母是一整句话；<b>一阶逻辑</b>把句子拆开：<b>名字</b>指一样东西，<b>谓词</b>说东西的性质或关系，<b>量词</b> ∀（对所有）和 ∃（存在）说「每一样」「有一样」。变量 x、y 代表随便哪一样东西，被量词管着的叫约束变量，没有被管着的叫自由变量。', 'A letter of propositional logic is a whole sentence; <b>first-order logic</b> takes sentences apart: <b>names</b> stand for things, <b>predicates</b> say what things are or how they relate, and the <b>quantifiers</b> ∀ (for all) and ∃ (there exists) say “every” and “some”. Variables x, y stand for any thing; one a quantifier covers is bound, one no quantifier covers is free.'),
      T('「一阶」说的是量词只管东西，不管性质：可以说「每个人都会死」，不能说「每一种性质都……」。管到性质的是高阶逻辑。数学的大部分、数据库的查询语言，都写得成一阶逻辑。', '“First-order” means quantifiers range over things, not over properties: you can say “everyone is mortal”, not “every property …”. Quantifying over properties is higher-order logic. Most of mathematics, and the query languages of databases, can be written in first-order logic.'),
    ],
    see: ['countermodel'],
  },
  {
    id: 'countermodel', group: 'logic', title: T('世界与反模型', 'Worlds and countermodels'), at: 'm-counter',
    body: [
      T('一阶逻辑的一句话是真是假，要看<b>世界</b>（也叫结构或模型）：有哪些东西，名字指哪一样，每个谓词对哪些东西成立。一句话在所有世界里都真，才叫永远成立；世界有无穷多个，挨个检查不完，所以要靠证明。', 'Whether a first-order sentence is true depends on the <b>world</b> (also called a structure or model): what things there are, which thing each name stands for, which things each predicate holds of. A sentence always holds only if it is true in every world; there are infinitely many, too many to check, so it takes a proof.'),
      T('反过来，要说明结论推不出，一个世界就够：前提都真、结论为假，这叫<b>反模型</b>。证明器常带一个在小世界里找反模型的工具，先试试要证的话是不是根本不成立，Isabelle 的 Nitpick 就是这样的工具。这个游戏的反模型面板迁移的是它的思路。', 'The other way, to show a conclusion does not follow, one world is enough: the premises true and the conclusion false, a <b>countermodel</b>. Provers often come with a tool that searches small worlds for one, to check first whether the claim fails outright; Isabelle’s Nitpick is such a tool. This game’s countermodel panel carries over its idea.'),
    ],
    see: ['fol', 'truth'],
  },
  {
    id: 'curry-howard', group: 'logic', title: T('证明即程序', 'Proofs are programs'), at: 't-app',
    body: [
      T('<b>Curry–Howard 对应</b>：一句话就是一个类型，它的证明就是这个类型的一个程序（项）。「A → B」的证明是函数，「A ∧ B」的证明是一对，「A ∨ B」的证明是带标签的值，⊥ 是没有任何值的空类型，「¬A」就是「A → ⊥」，是一个到空类型的函数；「∀x. …」的证明是吃一样东西的函数，「∃x. …」的证明是一样东西和关于它的证明配成的一对。', 'The <b>Curry–Howard correspondence</b>: a sentence is a type, and a proof of it is a program (a term) of that type. A proof of “A → B” is a function, of “A ∧ B” a pair, of “A ∨ B” a tagged value; ⊥ is the empty type with no values, and “¬A”, being “A → ⊥”, is a function into it; a proof of “∀x. …” is a function taking a thing, and a proof of “∃x. …” a thing paired with a proof about it.'),
      T('证明板上的规则也一一对上：套用是函数应用，假设框是 λ，拼起来和拆开是造一对和取分量，分情况是按标签分支。证明里的弯路（刚引入就消去）对应程序里可以算掉的一步，把弯路都拿掉就是程序算到底，叫<b>正规化</b>。', 'The proof board’s rules match one for one: Apply is function application, the assumption box is λ, joining and splitting are making a pair and taking a component, and cases is branching on the tag. A detour in a proof (brought in, then at once used up) is a step a program can compute away, and taking out every detour is running the program to the end: <b>normalization</b>.'),
      T('反证法没有对应的程序：没有哪个程序能从「A 不会不成立」变出 A 的证明。所以直觉主义逻辑正好是程序能做到的那部分，经典逻辑要把反证法或排中律另外当公理加上。', 'Proof by contradiction has no program: none can conjure a proof of A out of “A cannot fail”. So intuitionistic logic is exactly the part programs can do, and classical logic must add proof by contradiction or excluded middle as an axiom.'),
    ],
    see: ['provers', 'classical'],
  },
  {
    id: 'provers', group: 'logic', title: T('证明助手：Lean 与 Isabelle', 'Proof assistants: Lean and Isabelle'), at: 't-app',
    body: [
      T('<b>证明助手</b>是让人和机器一起写证明、由机器逐步检查的程序。它们都有一个很小的<b>核</b>：只有核能认定一条定理成立，其余的自动化无论多聪明，最后都要经过核，所以造不出假定理。这个游戏的证明器从第一块元件起，就按这个思路搭：核只有几条规则，引理都是用规则证出来的。', 'A <b>proof assistant</b> is a program in which a person and the machine write proofs together, every step checked by the machine. Each has a small <b>kernel</b>: only the kernel can declare a theorem proved, and however clever the automation around it, everything goes through the kernel, so it cannot make a false theorem. This game’s prover is built that way from its first part: a kernel of a few rules, and lemmas proved with them.'),
      T('<b>Lean</b> 基于依赖类型论。证明就是项：写下的每个证明最后都变成一个项，核检查这个项的类型是不是要证的那句话。项留着，谁都可以拿去用另一个检查器复查，这叫 <b>de Bruijn 准则</b>。第六章的证明项照 Lean 的写法：fun h => …、⟨a, b⟩、h.1、Or.inl、h.elim、False.elim。Lean 的逻辑本身是直觉主义的，经典推理靠公理 Classical.em、Classical.byContradiction。', '<b>Lean</b> is built on dependent type theory. A proof is a term: every proof written ends up as one, and the kernel checks that its type is the sentence to prove. The terms are kept, so anyone can recheck them with another checker: the <b>de Bruijn criterion</b>. Chapter 6’s proof terms are written as in Lean: fun h => …, ⟨a, b⟩, h.1, Or.inl, h.elim, False.elim. Lean’s logic is intuitionistic at heart; classical reasoning comes from the axioms Classical.em and Classical.byContradiction.'),
      T('<b>Isabelle</b> 走 <b>LCF</b> 的路：定理是一种抽象类型 thm，只有核里的几个函数（每条推理规则一个）能造出 thm，所以凡是 thm 都是证出来的，不必留下证明项。它最常用的逻辑 HOL 是经典的高阶逻辑。规则带着待定的部分（元变量），由合一来填，再由策略和化简器把这些规则组合起来自动地用。', '<b>Isabelle</b> takes the <b>LCF</b> road: a theorem is an abstract type thm, and only a few functions in the kernel (one per rule of inference) can make one, so every thm was proved, with no proof term to keep. Its most used logic, HOL, is classical higher-order logic. Rules carry parts left open (metavariables) that unification fills in, and tactics and the simplifier put such rules together to use them automatically.'),
      T('两条路一样可信：Lean 让证明成为可以复查的数据，Isabelle 让类型系统保证只有核能造定理。这个游戏只借它们搭核、搭元件的思路，自己的元件和写法都按游戏的需要来定。', 'Both roads are equally trustworthy: Lean makes proofs data that can be rechecked, Isabelle has the type system ensure only the kernel makes theorems. This game borrows only their way of building a kernel and its parts; its own parts and notation are fitted to the game.'),
    ],
    see: ['curry-howard', 'lemma'],
  },
]
