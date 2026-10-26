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
      T('关卡按证明方式分为三章：纸笔、初号、二号。完成一关后，满足前置条件的关卡就会解锁。地图中的支线专题与挑战均为可选内容。', 'The levels sit in three chapters, one per proof machine: pen and paper, Mark I, Mark II. Pass a level and the levels after it open; the topics and challenges branching off can wait.'),
      T('如需自由选择关卡，可以开启「全部解锁」。', 'If you would rather not go in order, turn on “Unlock all”.'),
    ],
    see: ['board'],
  },
  {
    id: 'board', group: 'play', title: T('证明电路板', 'The proof board'), at: 'copy',
    body: [
      T('左侧的<b>前提</b>卡片给出已知命题，右侧的<b>目标</b>卡片给出待证命题。每个元件代表一条推理规则：输入端接收所需命题，输出端给出结论。连线传递的是在相应前提或假设下已经得到证明的命题。', 'The cards on the left are what is <b>given</b>, the one on the right the <b>goal</b>. A wire means “this has been proved”: a part is a rule of inference, its inputs what it needs, its output the conclusion it draws.'),
      T('卡片显示当前推导的命题。若输入不匹配，会同时显示所需内容与实际输入。完成连接后，点击「检查证明」。', 'A card shows what it proves right now. Wire it wrong and the card says what it wanted and what it got. When you are done, press “Check proof”.'),
      T('需要设置命题时，请从卡片的下拉选项中选择本关提供的命题。', 'Where a card needs a sentence, pick it from the sentences in the level.'),
      T('各组<b>测试</b>使用不同的命题内容检查同一证明结构，同一电路必须通过全部测试。隐藏测试也参与检查，通关后公开。测试帮助发现错误；有限次测试通过，本身并不等于证明了任意命题替换下都成立。', 'Each level has a few <b>tests</b>, each about something different; one circuit must prove them all, and a few hidden tests are shown once you pass. Switch tests and the sentences on the cards are renamed while the circuit stays: a proof looks at shape, not at what it is about.'),
    ],
    see: ['box', 'lemma'],
  },
  {
    id: 'truth', group: 'logic', title: T('真值表', 'Truth tables'), at: 'table',
    body: [
      T('复合命题由基本命题和「如果……那么……」「并且」等连接词构成。在经典命题逻辑中，它的真值由各基本命题的真值决定。<b>真值表</b>逐行列出所有真值组合及计算结果：n 个不同的基本命题共有 2ⁿ 种真值组合。', 'A sentence built from a few small facts and connectives like “if … then …” and “and” is true or false depending only on whether each small fact is. Listing every case, one per row, gives its <b>truth table</b>: n facts make 2ⁿ rows.'),
      T('在所有真值组合下都为真的命题称为<b>永真式</b>，也称<b>重言式</b>。只要找到一组使它为假的真值，就能说明它不是永真式；这组真值就是反例。', 'A proposition true on every row is a <b>tautology</b>. To show a proposition is not one, a single counterexample row is enough.'),
    ],
    see: ['proof'],
  },
  {
    id: 'proof', group: 'logic', title: T('证明', 'Proof'), at: 'copy',
    body: [
      T('<b>证明</b>是由前提、公理以及推理规则构成的有限推导。每一步都必须是允许的出发点，或由此前的步骤按规则得到。检查规则是否适用，依据的是命题的逻辑结构，无须逐一枚举真值。', 'A proof is a chain of steps, each drawn by a rule from the steps before. It does not look at truth, only at shape: the rule has to fit.'),
      T('<b>可靠性</b>是指推理规则保持真：当前提都为真时，结论也必为真。因此，只要找到一组使全部前提为真、目标为假的真值，就能确定目标不能由这些前提通过可靠的规则推出。', 'Every rule is <b>sound</b>: whatever can be proved is true. That is why a counterexample row shows a proposition cannot be proved.'),
    ],
    see: ['truth', 'hilbert'],
  },
  {
    id: 'hilbert', group: 'logic', title: T('公理模式与分离规则', 'Axioms and Detach'), at: 'k',
    body: [
      T('初号采用<b>希尔伯特式系统</b>，由<b>分离规则</b>与公理模式 K、S 构成。分离规则由 A → B 和 A 推出 B；K 表示已成立的命题可以附加任意条件；S 表示在共同条件下组合分离推理。', 'Mark I is a <b>Hilbert system</b>: one rule, Detach (from an “if … then …” and its “if” part, the “then” part), and two axioms, K and S. K says what holds still holds under any condition; S says Detach works under a condition too.'),
      T('<b>公理模式</b>用 A、B、C 等字母表示任意命题。将这些字母一致地替换为具体命题，就得到一个<b>公理实例</b>。本游戏通过卡片上的命题选项完成替换，实例可以直接作为证明的出发点。', 'The sentences on an axiom’s card can be any sentences; each choice is one axiom.'),
    ],
    see: ['deduction'],
  },
  {
    id: 'lemma', group: 'logic', title: T('引理', 'Lemmas'), at: 'chain',
    body: [T('<b>引理</b>是已证明、可供其他证明引用的结论。游戏将常用推理封装为元件，例如「串联」由 A → B 和 B → C 推出 A → C。元件的使用必须满足其前提；可复用性来自所封装的证明，而不是仅来自测试样例。', 'Something proved once can be used as a rule from then on: a <b>lemma</b>. It held on every test, so it works for any sentences: “two if … then …s joined end to end” became the part Chain, and “if it, then it” became Identity.')],
    see: ['board'],
  },
  {
    id: 'deduction', group: 'logic', title: T('演绎定理', 'The deduction theorem'), at: 'dt-mp',
    body: [T('<b>演绎定理</b>：若从一组原有前提和附加假设 A 能推出 B，就能仅从原有前提推出 A → B。它消除的是对 A 的依赖，其他前提仍然保留。初号通过逐步改写实现这一点：假设步骤使用恒等引理，不依赖 A 的步骤使用 K，分离步骤使用 S。', 'If something follows under an assumption, then “if the assumption, then that” can be proved with no assumption. The proof rewrites step by step: the assumption itself becomes Identity, a step unrelated to it is wrapped in K, and Detach goes through S.')],
    see: ['box', 'hilbert'],
  },
  {
    id: 'box', group: 'play', title: T('假设框', 'Assumption boxes'), at: 'box',
    body: [
      T('<b>假设框</b>表示蕴含引入规则。在卡片上选择临时假设 A，框左上角的「假设」端便给出 A。在框内推导 B，将其接至右上角的「结论」端，框外即可得到 A → B。', 'Mark II’s assumption box is a frame on the board, and parts sit right inside it. Fill in what to assume on the box card, and “Assume” at the box’s top left gives it; wire what you prove inside to “Conclusion” at its top right, and outside you get “assumption → conclusion”.'),
      T('点击框内空白处，新放置的元件便进入该框；也可以拖动卡片调整位置。框内可以使用外部前提和外层假设。依赖本框假设的结论，需要通过相应规则解除假设后才能在框外使用。左上角的箭头用于折叠框。', 'Click the empty space inside a box and new parts land in it; cards on the board can be dragged into a box, or out of one. From inside a box everything outside is visible, but what is proved inside leaves only through “Conclusion”. The arrow at the top left of the box card folds it away.'),
      T('输出 A → B 时，临时假设 A 被<b>解除</b>，不再是该输出所依赖的假设。卡片下方列出仍然依赖的命题；最终目标只能依赖关卡给定的前提，不能遗留未解除的临时假设。折叠框仅改变显示，不会解除假设。', 'Once the box closes, its assumption no longer counts: under each card are the hypotheses it still depends on, and none may be left at the goal (the premises aside).'),
    ],
    see: ['deduction', 'natural'],
  },
  {
    id: 'natural', group: 'logic', title: T('自然演绎', 'Natural deduction'), at: 'and',
    body: [T('<b>自然演绎</b>围绕连接词组织推理规则：<b>引入规则</b>说明如何建立带有某个连接词的命题，<b>消去规则</b>说明如何由这样的命题推出结论。合取 ∧ 对应组合与分别取出；析取 ∨ 对应引入一项与分类讨论；蕴含 → 对应假设框与分离规则。⊥ 没有引入规则，矛盾消去可由它推出任意命题。「消去」并不表示消耗输入命题。', 'Mark II’s rules come in pairs: for each connective a rule that <b>brings it in</b> (how to prove it) and one that <b>uses it up</b>. ∧ is joining and splitting, ∨ choosing a side and splitting into cases, → the assumption box and Detach, and ⊥ “from contradiction, anything”.')],
    see: ['classical'],
  },
  {
    id: 'classical', group: 'logic', title: T('直觉主义逻辑与经典逻辑', 'Classical and intuitionistic'), at: 'notnotlem',
    body: [T('本游戏的<b>直觉主义命题逻辑</b>允许由 A 推出 ¬¬A，但不能对任意 A 使用逆向推理。例如，排中律 A ∨ ¬A 的双重否定可以证明，排中律本身却不是其中的定理。加入<b>双重否定消去</b>（由 ¬¬A 推出 A）后，就得到相应的<b>经典命题逻辑</b>。结合否定引入，这条规则可实现反证法。经典命题逻辑的每个永真式都有证明。', 'Without proof by contradiction, “it rains ∨ ¬it rains” cannot be proved, though it is true on every row; “¬¬(it rains ∨ ¬it rains)” can. Such logic is <b>intuitionistic</b>: every “or” must say which side. Add proof by contradiction (from “not not a sentence”, the sentence) and it is <b>classical</b> logic, in which every tautology can be proved.')],
    see: ['truth'],
  },
]
