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
      T('关卡排成四章：纸笔、真值电路、证明核、连接词。后三章是你一章一章装进同一台证明器的模块，前面装上的都留着。通过一关，接在它后面的关卡就会打开；岔出去的专题和挑战可以晚些再玩。', 'The levels sit in four chapters: pen and paper, truth circuits, the kernel, connectives. The last three are modules you install, one chapter at a time, into the one prover you build, and what is installed stays. Pass a level and the levels after it open; the topics and challenges branching off can wait.'),
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
      T('每关有几组<b>测试</b>，每组讲一件不同的事；同一块电路要在每一组上都证得出，还有几组隐藏测试，过关后公开。换一组测试，卡片上的句子跟着换名字，电路不用动：证明只看形状，不看讲的是什么。', 'Each level has a few <b>tests</b>, each about something different; one circuit must prove them all, and a few hidden tests are shown once you pass. Switch tests and the sentences on the cards are renamed while the circuit stays: a proof looks at shape, not at what it is about.'),
    ],
    see: ['box', 'lemma'],
  },
  {
    id: 'truth', group: 'logic', title: T('真值表', 'Truth tables'), at: 'table',
    body: [
      T('一句由几件小事和「如果…那么…」「并且」这些连接词拼成的话，是真是假只取决于每件小事是真是假。把所有情况列成一行一行，就是它的<b>真值表</b>：n 件小事有 2ⁿ 行。', 'A sentence built from a few small facts and connectives like “if … then …” and “and” is true or false depending only on whether each small fact is. Listing every case, one per row, gives its <b>truth table</b>: n facts make 2ⁿ rows.'),
      T('每一行都真的命题叫<b>永真式</b>。要说明一个命题不是永真式，找出一行反例就够了。', 'A proposition true on every row is a <b>tautology</b>. To show a proposition is not one, a single counterexample row is enough.'),
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
    body: [T('证过一次的事可以当规则一直用下去，这叫<b>引理</b>。它在每一组测试上都成立，所以对任何句子都能用：「两段首尾相接的如果…那么…」成了元件「串联」，K 和 S 也是这样成为元件的。', 'Something proved once can be used as a rule from then on: a <b>lemma</b>. It held on every test, so it works for any sentences: “two if … then …s joined end to end” became the part Chain, and K and S became parts the same way.')],
    see: ['board'],
  },
  {
    id: 'deduction', group: 'logic', title: T('演绎定理', 'The deduction theorem'), at: 'x-chain',
    body: [T('在一个假设下能推出某件事，就能不带假设证出「如果 假设，那么 那件事」。证法是逐步改写：假设本身换成用 K、S 拼出的「如果它，那么它」，和假设无关的步用 K 包一层，套用用 S。', 'If something follows under an assumption, then “if the assumption, then that” can be proved with no assumption. The proof rewrites step by step: the assumption itself becomes “if it, then it”, pieced together from K and S, a step unrelated to it is wrapped in K, and Apply goes through S.')],
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
]
