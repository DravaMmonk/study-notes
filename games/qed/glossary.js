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
      T('左边的卡片是<b>前提</b>，右边的是<b>目标</b>。一根线代表「这个命题已经证出来了」：一块元件是一条推理规则，输入是它要的前提，输出是它推出的结论。', 'The cards on the left are the <b>premises</b>, the one on the right the <b>goal</b>. A wire means “this proposition has been proved”: a part is a rule of inference, its inputs the premises it needs, its output the conclusion it draws.'),
      T('卡片上写着它此刻证出的命题。接错了，卡片会说它要什么、接进来的是什么。证完了点「检查证明」。', 'A card shows what it proves right now. Wire it wrong and the card says what it wanted and what it got. When you are done, press “Check proof”.'),
      T('填公式时可以直接打 ->、&、|、~、<->，会换成 →、∧、∨、¬、↔；也可以点符号键。', 'When typing a formula you can use ->, &, |, ~ and <->, which become →, ∧, ∨, ¬ and ↔; or tap the symbol keys.'),
    ],
    see: ['box', 'lemma'],
  },
  {
    id: 'truth', group: 'logic', title: T('真值表', 'Truth tables'), at: 'table',
    body: [
      T('一个只由字母和连接词组成的命题，是真是假只取决于每个字母是真是假。把所有情况列成一行一行，就是它的<b>真值表</b>：n 个字母有 2ⁿ 行。', 'A proposition made only of letters and connectives is true or false depending only on whether each letter is. Listing every case, one per row, gives its <b>truth table</b>: n letters make 2ⁿ rows.'),
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
      T('初号是一个<b>希尔伯特系统</b>：只有一条规则——分离（由 A → B 和 A 得 B），加上两条公理模式 K：A → (B → A) 和 S：(A → (B → C)) → ((A → B) → (A → C))。', 'Mark I is a <b>Hilbert system</b>: one rule, Detach (from A → B and A, B), and two axiom schemas, K: A → (B → A), and S: (A → (B → C)) → ((A → B) → (A → C)).'),
      T('公理模式里的 A、B、C 可以换成任何命题，每换一次就是一条公理。', 'The A, B and C of a schema can be any propositions; each choice is one axiom.'),
    ],
    see: ['deduction'],
  },
  {
    id: 'lemma', group: 'logic', title: T('引理', 'Lemmas'), at: 'identity',
    body: [T('证过一次的命题可以当规则一直用下去，这叫<b>引理</b>。你证出的 A → A 成了元件「恒等」，A → B、B → C 推出 A → C 成了元件「串联」。', 'A statement proved once can be used as a rule from then on: a <b>lemma</b>. Your A → A became the part Identity, and A → C from A → B and B → C became the part Chain.')],
    see: ['board'],
  },
  {
    id: 'deduction', group: 'logic', title: T('演绎定理', 'The deduction theorem'), at: 'dt-mp',
    body: [T('在假设 A 下能推出 C，就能不带假设证出 A → C。证法是逐步改写：假设本身换成恒等，和 A 无关的步用 K 包一层，分离用 S。', 'If C follows under the hypothesis A, then A → C can be proved with no hypothesis. The proof rewrites step by step: the hypothesis itself becomes Identity, a step unrelated to A is wrapped in K, and Detach goes through S.')],
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
    body: [T('没有反证法时，A ∨ ¬A 证不出来，虽然它每一行都真；¬¬(A ∨ ¬A) 却证得出。这样的逻辑叫<b>直觉主义逻辑</b>：每个「或」都要说出是哪一边。加上反证法（由 ¬¬A 得 A），就是<b>经典逻辑</b>，真值表上永真的命题都证得出。', 'Without proof by contradiction, A ∨ ¬A cannot be proved, though it is true on every row; ¬¬(A ∨ ¬A) can. Such logic is <b>intuitionistic</b>: every “or” must say which side. Add proof by contradiction (from ¬¬A, A) and it is <b>classical</b> logic, in which every tautology can be proved.')],
    see: ['truth'],
  },
]
