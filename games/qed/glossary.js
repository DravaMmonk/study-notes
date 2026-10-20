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
      T('关卡按证明机排成三章：纸笔、初号、二号。通过一关，接在它后面的关卡就会打开；岔出去的专题和挑战可以晚些再玩。', 'The levels sit in three chapters, one per proof machine: pen and paper, Mark I, Mark II. Pass a level and the levels after it open; the topics and challenges branching off can wait.'),
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
    id: 'proof', group: 'logic', title: T('证明', 'Proof'), at: 'copy',
    body: [
      T('证明是一串步骤，每一步都由规则从前面的步骤得来。它不看真假，只看形状：规则对得上就行。', 'A proof is a chain of steps, each drawn by a rule from the steps before. It does not look at truth, only at shape: the rule has to fit.'),
      T('规则都是<b>可靠</b>的：证得出的东西一定为真。所以一行反例就说明一个命题证不出来。', 'Every rule is <b>sound</b>: whatever can be proved is true. That is why a counterexample row shows a proposition cannot be proved.'),
    ],
    see: ['truth', 'hilbert'],
  },
  {
    id: 'hilbert', group: 'logic', title: T('公理与分离', 'Axioms and Detach'), at: 'k',
    body: [
      T('初号是一个<b>希尔伯特系统</b>：只有一条规则「分离」（由「如果…那么…」和它的前一半得到后一半），加上两条公理 K 和 S。K 说已经成立的事加上任何条件都还成立；S 说在一个条件下也能做分离。', 'Mark I is a <b>Hilbert system</b>: one rule, Detach (from an “if … then …” and its “if” part, the “then” part), and two axioms, K and S. K says what holds still holds under any condition; S says Detach works under a condition too.'),
      T('公理卡片上的几句话可以选成任何句子，每选一次就是一条公理。', 'The sentences on an axiom’s card can be any sentences; each choice is one axiom.'),
    ],
    see: ['deduction'],
  },
  {
    id: 'lemma', group: 'logic', title: T('引理', 'Lemmas'), at: 'chain',
    body: [T('证过一次的事可以当规则一直用下去，这叫<b>引理</b>。它在每一组测试上都成立，所以对任何句子都能用：「两段首尾相接的如果…那么…」成了元件「串联」，「如果它，那么它」成了元件「恒等」。', 'Something proved once can be used as a rule from then on: a <b>lemma</b>. It held on every test, so it works for any sentences: “two if … then …s joined end to end” became the part Chain, and “if it, then it” became Identity.')],
    see: ['board'],
  },
  {
    id: 'deduction', group: 'logic', title: T('演绎定理', 'The deduction theorem'), at: 'dt-mp',
    body: [T('在一个假设下能推出某件事，就能不带假设证出「如果 假设，那么 那件事」。证法是逐步改写：假设本身换成恒等，和假设无关的步用 K 包一层，分离用 S。', 'If something follows under an assumption, then “if the assumption, then that” can be proved with no assumption. The proof rewrites step by step: the assumption itself becomes Identity, a step unrelated to it is wrapped in K, and Detach goes through S.')],
    see: ['box', 'hilbert'],
  },
  {
    id: 'box', group: 'play', title: T('假设框', 'Assumption boxes'), at: 'box',
    body: [
      T('二号的假设框是一块里面还有电路板的元件。在框卡片上填要假设的命题，点「打开」进到框里：那里多一张「假设」卡片，框里证出的东西接到「结论」上，框外就得到「假设 → 结论」。', 'Mark II’s assumption box is a part with a circuit board inside. Fill in what to assume on the box card and press “Open” to go inside: there is an extra “assume” card, whatever you prove goes to “conclusion”, and outside you get “assumption → conclusion”.'),
      T('框里看得见前提和外面各个框的假设；外面证出的别的东西，从框卡片的「带进」口接进去。框上面的路径可以点回外面。', 'Inside a box you can see the premises and the assumptions of the boxes around it; anything else proved outside comes in through the box card’s “bring in” ports. The path above the board takes you back out.'),
      T('框一关，它的假设就不再算数：卡片下面列着它还依赖的假设，证到目标时一个都不能剩（前提除外）。', 'Once the box closes, its assumption no longer counts: under each card are the hypotheses it still depends on, and none may be left at the goal (the premises aside).'),
    ],
    see: ['deduction', 'natural'],
  },
  {
    id: 'natural', group: 'logic', title: T('自然演绎', 'Natural deduction'), at: 'and',
    body: [T('二号的规则成对出现：每个连接词一条<b>引入</b>规则（怎样证出它），一条<b>消去</b>规则（怎样用它）。∧ 是拼起来和拆开，∨ 是二选一和分情况，→ 是假设框和分离，⊥ 是「矛盾推出一切」。', 'Mark II’s rules come in pairs: for each connective a rule that <b>brings it in</b> (how to prove it) and one that <b>uses it up</b>. ∧ is joining and splitting, ∨ choosing a side and splitting into cases, → the assumption box and Detach, and ⊥ “from contradiction, anything”.')],
    see: ['classical'],
  },
  {
    id: 'classical', group: 'logic', title: T('经典与直觉主义', 'Classical and intuitionistic'), at: 'notnotlem',
    body: [T('没有反证法时，「下雨 ∨ ¬下雨」证不出来，虽然它每一行都真；「¬¬(下雨 ∨ ¬下雨)」却证得出。这样的逻辑叫<b>直觉主义逻辑</b>：每个「或」都要说出是哪一边。加上反证法（由「并非并非 某句」得到那句），就是<b>经典逻辑</b>，真值表上永真的话都证得出。', 'Without proof by contradiction, “it rains ∨ ¬it rains” cannot be proved, though it is true on every row; “¬¬(it rains ∨ ¬it rains)” can. Such logic is <b>intuitionistic</b>: every “or” must say which side. Add proof by contradiction (from “not not a sentence”, the sentence) and it is <b>classical</b> logic, in which every tautology can be proved.')],
    see: ['truth'],
  },
]
