// Chapter 7 · Rules and metavariables: a rule is ⟦premises⟧ ⟹ conclusion with ?-letters for any sentence (the way
// Isabelle writes it; Lean's ?m are the same), and using it backwards means unifying its conclusion with the goal.
// First the machine that unifies, one rule of unification per level, then the repeat frame runs them to the end: the
// unifier. From there two lines need nothing from each other. On proof states: a goal is replaced by a rule's
// premises, ?-letters left open are settled later by a hypothesis, lemmas are rules too; an elimination rule is a rule
// and then Assumption, built into one part. On equations: patterns ?P(x), solved as functions. With both, the
// quantifiers: For any and Example backwards; Take one only forwards (as a pattern it only fits that way round), which
// is Have and then a rule on a given, built into Forward; Take the one there is. The challenge is the order of taking
// out and giving an example.
import { machine } from '../../kit/domains/logic/build.js'
import { script } from './machines.js'

const T = (zh, en) => ({ zh, en })
const GOAL = [{ name: 'in', label: T('目标', 'Goal') }]
const EQS = [{ name: 'in', label: T('等式', 'Equations') }]
// A level that builds a part taking rules gives them on the board as an input of its own: the part's port.
const RULED = [...GOAL, { name: 'rules', label: T('规则', 'Rules') }]
const unify = (level) => ({ kind: 'machine', want: 'unify', inputs: EQS, ...level })
const prove = (level) => ({ kind: 'machine', want: 'proved', inputs: GOAL, ...level })

// The rules of unification in the repeat frame, in order, round after round.
const looped = (cards) => machine(
  { r: ['repeat'], ...Object.fromEntries(cards.map((c, k) => [`c${k}`, [c, {}, 'r']])) },
  ['in>r.in', 'r#body>c0.in', ...cards.slice(1).map((_, k) => `c${k}>c${k + 1}.in`), `c${cards.length - 1}>r.body`, 'r>out'],
)
const chained = (cards) => machine(Object.fromEntries(cards.map((c, k) => [`c${k}`, [c]])), ['in>c0.in', ...cards.slice(1).map((_, k) => `c${k}>c${k + 1}.in`), `c${cards.length - 1}>out`])

export const metavars = [
  // ---------- unification ----------
  unify({
    id: 'r-match',
    title: T('对上一条规则', 'Fitting a rule'),
    adds: ['uDecompose'],
    tests: [{ eqs: ['?A ∧ ?B ≐ Rain ∧ Wind'] }, { eqs: ['?A → ?B ≐ Rain → Wet ∧ Slip'] }, { eqs: ['(?A → ?B) ∧ ?C ≐ (Rain → Wet) ∧ Wind'] }],
    brief: T('设计一个证明助手：把规则的结论和目标对上，拆到每个等式左边都只剩一个 ?-字母。', 'Design a proof assistant that fits a rule’s conclusion to a goal, splitting until each equation has a single ?-letter on its left.'),
    hint: [T('一个「分解」只拆一层。第三组测试有两层。', 'One Decompose splits one level. The third test has two.')],
    intro: [
      { t: T('到这里，元件上的句子都由你来选：假设框假设什么，引入 ∨ 补上哪一句。很多时候，目标已经说明了该填什么。', 'So far you have chosen the sentences on parts yourself: what a box assumes, which side ∨ intro adds. Often the goal already says what goes there.') },
      { t: T('规则可以写成带空位的形式：引入 ∧ 是 ⟦?A; ?B⟧ ⟹ ?A ∧ ?B，方括号里是前提，⟹ 后面是结论。?A、?B 是<wiki-ref to="metavariable"></wiki-ref>。这套写法取自<wiki-ref to="isabelle"></wiki-ref>；<wiki-ref to="lean"></wiki-ref>也有元变量。', 'A rule can be written with blanks: ∧ intro is ⟦?A; ?B⟧ ⟹ ?A ∧ ?B, the premises in brackets, the conclusion after ⟹. ?A and ?B are <wiki-ref to="metavariable"></wiki-ref>s. The notation is <wiki-ref to="isabelle"></wiki-ref>’s; <wiki-ref to="lean"></wiki-ref> has metavariables too.') },
      { t: T('要把规则用到目标上，先得让它的结论和目标对上：解 ?A ∧ ?B ≐ 下雨 ∧ 刮风，求出 ?A 和 ?B。这叫<wiki-ref to="unification"></wiki-ref>。新元件「分解」：把两边结构相同的等式拆成对应部分之间的几个等式。', 'To use a rule on a goal, its conclusion must first fit the goal: solve ?A ∧ ?B ≐ it rains ∧ it is windy for ?A and ?B. This is <wiki-ref to="unification"></wiki-ref>. A new part, “Decompose”, splits an equation whose sides share a shape into equations between corresponding parts.') },
    ],
    solution: chained(['uDecompose', 'uDecompose']),
  }),
  unify({
    id: 'r-deep',
    title: T('拆到底', 'All the way down'),
    adds: ['repeat', 'uDecompose'],
    showcase: T('重复框把框里接出的东西再送回框里，一圈一圈地做，直到不再变化或者失败：框开出的是上一圈的结果，不是一开始的输入；光看说明，容易以为它只做一遍', 'the repeat frame feeds what is made inside back in, round after round, until nothing changes or it fails: what the frame opens with is the last round’s result, not the first input; from its description alone it is easy to think it runs once'),
    tests: [{ eqs: ['?A ∧ ?B ≐ Rain ∧ Wind'] }, { eqs: ['((?A ∨ ?B) → ?C) ∧ ?D ≐ ((Rain ∨ Wind) → Wet) ∧ Slip'] }, { eqs: ['(?A → ?B) ∧ ((?C ∨ ?D) ∧ ?E) ≐ (Rain → Wet) ∧ ((Wind ∨ Slip) ∧ Moon)'] }],
    brief: T('设计一个证明助手：不管要拆几层，都拆到每个等式左边只剩一个 ?-字母。', 'Design a proof assistant that splits until each equation has a single ?-letter on its left, however many levels it takes.'),
    hint: [T('框里放一个「分解」，其余交给框。', 'One Decompose in the frame; the frame does the rest.')],
    intro: [
      { t: T('要拆几层，取决于规则和目标，事先不知道：接多少个「分解」，总会遇到更深的等式。', 'How many levels must be split depends on the rule and the goal, and is not known beforehand: however many Decompose parts are wired, a deeper equation will come.') },
      { t: T('新元件<part-ref to="part:repeat"></part-ref>：框左边开出它收到的东西，框里的元件做一圈，接回框右边的「结果」；下一圈，框开出的是这一圈的结果。如此反复，直到不再变化或者失败，送出最后一圈的结果。', 'A new part, the <part-ref to="part:repeat"></part-ref>: on its left the frame opens with what it receives; the parts inside do one round and wire back to “result” on its right; next round, it opens with this round’s result. So it goes on until nothing changes or it fails, and it gives the last round.') },
    ],
    solution: looped(['uDecompose']),
    naive: chained(['uDecompose', 'uDecompose', 'uDecompose']),
  }),
  unify({
    id: 'r-delete',
    title: T('两边一样就删掉', 'Same on both sides'),
    adds: ['uDelete', 'uDecompose'],
    tests: [{ eqs: ['?A ∧ Wind ≐ Rain ∧ Wind'] }, { eqs: ['Rain → ?B ≐ Rain → Wet'] }, { eqs: ['¬?A ≐ ¬Rain'] }, { eqs: ['(?A ∧ Wind) → ?B ≐ (Rain ∧ Wind) → Wet'] }],
    brief: T('设计一个证明助手：把每组等式解到底，只留下 ?-字母的等式。', 'Design a proof assistant that solves each set of equations to the end, leaving only equations for ?-letters.'),
    hint: [T('先拆开，再看剩下的等式。', 'Split first, then look at what is left.')],
    intro: [
      { t: T('规则的结论不全是 ?：有些地方是确定的句子，目标在那里必须完全相同。拆开后，这样的地方成了「刮风 ≐ 刮风」，不含任何信息。新元件「删除」去掉这样的等式。', 'A rule’s conclusion is not all ?-letters: some places hold fixed sentences, and there the goal must be exactly the same. Split, such a place becomes “it is windy ≐ it is windy”, which says nothing. A new part, “Delete”, removes such equations.') },
      { t: T('¬A 在证明器里是 A → ⊥，也按这个结构拆。', '¬A in the prover is A → ⊥, and splits as such.') },
    ],
    solution: looped(['uDecompose', 'uDelete']),
  }),
  unify({
    id: 'r-clash',
    title: T('对不上', 'They do not fit'),
    adds: ['uConflict', 'uDecompose'],
    tests: [{ eqs: ['?A ∧ ?B ≐ Rain ∨ Wind'] }, { eqs: ['?A → ⊥ ≐ Rain → Wet'] }, { eqs: ['?A ∨ ?B ≐ Rain ∨ (Wind ∧ Wet)'] }, { eqs: ['(?A ∧ ?B) → ?C ≐ (Rain ∨ Wind) → Wet'] }],
    brief: T('设计一个证明助手：能对上的解到底；对不上的，说「失败」。', 'Design a proof assistant that solves what can be fitted to the end, and says “failed” of what cannot.'),
    hint: [T('先拆开，再找两边结构不同的等式。', 'Split first, then look for an equation whose sides differ in shape.')],
    intro: [{ t: T('规则不一定对得上目标。引入 ∧ 的结论是「并且」，目标是「或者」时，?A、?B 怎样填都对不上。新元件「冲突」：找到两边都不是 ?-字母、结构却不同的等式，宣布失败。用规则时，失败说明该换一条规则。', 'A rule need not fit a goal. ∧ intro concludes an “and”; against an “or”, nothing put in for ?A and ?B makes them fit. A new part, “Conflict”, finds an equation with no ?-letter on either side and sides of different shapes, and declares failure. When using rules, failure means trying another rule.') }],
    solution: looped(['uDecompose', 'uConflict']),
  }),
  unify({
    id: 'r-twice',
    title: T('同一个 ?A 出现两次', 'The same ?A twice'),
    adds: ['uEliminate', 'uDecompose', 'uDelete', 'uConflict'],
    tests: [{ eqs: ['?A → ?A ≐ Rain → Rain'] }, { eqs: ['?A ∧ ?A ≐ Rain ∧ Wind'] }, { eqs: ['?A → (?B → ?A) ≐ Rain → (Wind → Rain)'] }, { eqs: ['(?A → ?B) → (?A → ?B) ≐ (Rain → Wet) → (Rain → Slip)'] }],
    brief: T('设计一个证明助手：把每组等式解到底；对不上的，说「失败」。', 'Design a proof assistant that solves each set of equations to the end, or says “failed” when they do not fit.'),
    hint: [T('?A 确定以后，把别处的 ?A 也换掉，再看剩下的是否对得上。', 'Once ?A is known, replace it everywhere else, and see whether the rest fits.')],
    intro: [{ t: T('<part-ref to="lemma:merge"></part-ref>的前提是 ?A → (?A → ?B)：?A 出现两次，两处必须是同一句。拆开后有两个关于 ?A 的等式。新元件「消元」：找到 ?A ≐ t，把其余等式里的 ?A 都换成 t。', '<part-ref to="lemma:merge"></part-ref>’s premise is ?A → (?A → ?B): ?A occurs twice, and both places must be the same sentence. Split, it gives two equations about ?A. A new part, “Eliminate”, finds ?A ≐ t and puts t for ?A in the other equations.') }],
    solution: looped(['uDecompose', 'uEliminate', 'uDelete', 'uConflict']),
  }),
  unify({
    id: 'r-both',
    title: T('两边都有 ?', '? on both sides'),
    adds: ['uSwap', 'uDecompose', 'uConflict', 'uEliminate'],
    tests: [{ eqs: ['?A ∧ Wind ≐ Rain ∧ ?B'] }, { eqs: ['Rain → ?B ≐ ?A'] }, { eqs: ['?A → ?A ≐ ?B → Rain'] }, { eqs: ['Rain ∧ ?B ≐ ?A ∨ Wind'] }],
    brief: T('设计一个证明助手：把每组等式解到底；对不上的，说「失败」。', 'Design a proof assistant that solves each set of equations to the end, or says “failed” when they do not fit.'),
    hint: [T('?-字母在右边的等式，先翻过来。', 'Turn round any equation with its ?-letter on the right.')],
    intro: [{ t: T('到这里，?-字母都在等式左边。可要对上的两句都可能带着 ?，这时会出现「下雨 ≐ ?B」这样 ? 在右边的等式，而现有的元件只认左边的 ?。新元件「定向」把它翻成 ?B ≐ 下雨。', 'So far the ?-letters have all been on the left. But both sentences being fitted may hold them, and then an equation like “it rains ≐ ?B” appears, its ?-letter on the right, where the parts so far do not look. A new part, “Orient”, turns it into ?B ≐ it rains.') }],
    solution: looped(['uDecompose', 'uSwap', 'uEliminate', 'uConflict']),
  }),
  unify({
    id: 'r-occurs',
    title: T('代不完', 'It never ends'),
    adds: ['uCheck', 'uDecompose', 'uEliminate'],
    tests: [{ eqs: ['?A ≐ ?A → Wet'] }, { eqs: ['?A → ?A ≐ ?B → (?B ∧ Rain)'] }, { eqs: ['?A ∧ ?B ≐ ?B ∧ Rain'] }],
    brief: T('设计一个证明助手：把每组等式解到底；没有解的，说「失败」。', 'Design a proof assistant that solves each set of equations to the end, or says “failed” when there is no solution.'),
    hint: [T('重复框停下时，剩下的等式真的解完了吗？', 'When the frame stops, are the equations left really solved?')],
    intro: [{ t: T('?A ≐ ?A → 地湿：?A 要等于一句比它自身还长的话。代入一次，右边又多出一个 ?A，永远代不完，这组等式无解。现有的元件对它都无能为力：重复框转一圈毫无变化，就此停下。新元件「出现检查」：找到 ?A ≐ t 而 t 中含有 ?A 的等式，宣布失败。', '?A ≐ ?A → the ground is wet: ?A must equal a sentence longer than itself. Put in once, the right side gains another ?A, and it never ends: there is no solution. None of the parts so far can do anything with it; the repeat frame goes round once, nothing changes, and it stops. A new part, “Occurs check”, finds ?A ≐ t with ?A inside t, and declares failure.') }],
    solution: looped(['uDecompose', 'uEliminate', 'uCheck']),
    after: T('许多合一程序为了速度省掉出现检查，Prolog 默认也不做；代价是可能「证」出假话。', 'Many unifiers leave the occurs check out for speed, Prolog among them by default; the price is that something false may be “proved”.'),
  }),
  unify({
    id: 'r-unifier',
    adds: ['uDecompose', 'uDelete', 'uConflict', 'uEliminate', 'uSwap', 'uCheck'],
    title: T('六个元件一个框', 'Six parts, one frame'),
    builds: 'unifier',
    tests: [{ eqs: ['(?A → ?B) ∧ (?B → ?C) ≐ (Rain → Wet) ∧ (?D → Slip)'] }, { eqs: ['?A ∧ (?B ∨ ?A) ≐ Rain ∧ (Wind ∨ Wet)'] }, { eqs: ['?A → ?B ≐ ?B → ¬?A'] }, { eqs: ['¬¬?A ≐ ¬?B'] }],
    brief: T('设计一个证明助手：不管要拆几层、代几次，都把等式解到底；对不上或者没有解的，说「失败」。', 'Design a proof assistant that solves any set of equations to the end, however many levels and substitutions it takes, or says “failed” when they do not fit or have no solution.'),
    hint: [T('每种元件都要进重复框。', 'Every kind of part belongs in the repeat frame.')],
    intro: [{ t: T('六种元件都有了：分解、删除、冲突、消元、定向、出现检查。这一回每一种都可能用到，用几次、何时用，由等式决定。设计出的证明助手会成为新元件「合一器」。', 'All six kinds of part are in hand: Decompose, Delete, Conflict, Eliminate, Orient, Occurs check. This time any of them may be needed, how often and when depending on the equations. The proof assistant you design becomes a new part, “Unifier”.') }],
    solution: looped(['uDecompose', 'uDelete', 'uSwap', 'uEliminate', 'uCheck', 'uConflict']),
    after: T('合一器求出的是<wiki-ref to="mgu"></wiki-ref>：只确定非确定不可的部分。', 'What the unifier finds is the <wiki-ref to="mgu"></wiki-ref>: it settles only what must be settled.'),
  }),

  // ---------- rules backwards ----------
  prove({
    id: 'r-rule',
    title: T('逆用规则', 'A rule backwards'),
    adds: ['rule'],
    want: 'becomes',
    showcase: T('逆用规则不是从已知往下推，而是对着目标往回推：目标和规则的结论合一，换成规则的前提', 'the rule part does not reason down from what is known but back from the goal: the goal is unified with the rule’s conclusion and replaced by its premises'),
    tests: [{ goal: 'Rain → (Wind → Rain)', becomes: [['Rain ⊢ Wind → Rain']] }, { goal: 'Wet → Slip', becomes: [['Wet ⊢ Slip']] }, { goal: 'Rain ∧ Wet → Slip', becomes: [['Rain ∧ Wet ⊢ Slip']] }],
    brief: T('设计一个证明助手，把每一个目标变成要的样子。', 'Design a proof assistant that turns each goal into the one wanted.'),
    hint: [T('三个目标都是「若…则…」。证明核里，哪条规则造出「若…则…」？', 'The three goals are all “if … then …”. Which of the kernel’s rules makes an “if … then …”?')],
    intro: [
      { t: T('有了合一器，规则就能倒着用，这叫<wiki-ref to="backward"></wiki-ref>。新元件<part-ref to="part:rule"></part-ref>：从「规则」口接入一条规则，它把第一个目标和规则的结论合一，再把这个目标换成规则的前提，每条前提一个新目标。证明板上的每个元件，在这块板上都是给出它那条规则的元件；几个规则元件可以串起来接入。', 'With the unifier, rules can be used backwards: <wiki-ref to="backward"></wiki-ref>. A new part, <part-ref to="part:rule"></part-ref>: wire a rule into its port “Rules”; it unifies the first goal with the rule’s conclusion and replaces that goal with the rule’s premises, one new goal for each. Every proof-board part is, on this board, a part that gives its rule, and several rule parts can be chained into one list.') },
      { t: T('证明核的规则都写成 ⟦前提⟧ ⟹ 结论。从这里起，线上传的是<wiki-ref to="proof-state"></wiki-ref>：尚未证完的目标。', 'The kernel’s rules are all written ⟦premises⟧ ⟹ conclusion. From here on a wire carries a <wiki-ref to="proof-state"></wiki-ref>: the goals still open.') },
    ],
    solution: script(['rule', 'impI']),
  }),
  prove({
    id: 'r-assumption',
    title: T('由假设得证', 'Among the givens'),
    adds: ['assumption'],
    tests: [{ goal: 'Rain → (Wind → Rain)' }, { goal: 'Wet → (Slip → Wet)' }, { goal: '¬Rain → (Rain → ¬Rain)' }],
    brief: T('设计一个证明助手，证完每一个目标。', 'Design a proof assistant that proves every goal.'),
    hint: [T('剥掉所有的「若」之后，剩下的目标在哪里？', 'With every “if” peeled off, where is the goal that is left?')],
    intro: [
      { t: T('倒着用假设框，目标少一层「若」，却没有证完：<part-ref to="part:rule"></part-ref>只会把目标换成前提。', 'The box used backwards takes one “if” off a goal, but does not finish it: <part-ref to="part:rule"></part-ref> only replaces a goal with premises.') },
      { t: T('新元件<part-ref to="part:assumption"></part-ref>：把第一个目标和它的一条已知合一，对上了，这个目标就证完了。', 'A new part, <part-ref to="part:assumption"></part-ref>: it unifies the first goal with one of its givens; when one fits, that goal is done.') },
    ],
    solution: script(['rule', 'impI'], ['rule', 'impI'], 'assumption'),
  }),
  prove({
    id: 'r-subgoals',
    title: T('一个目标变几个', 'One goal becomes several'),
    tests: [{ goal: 'Rain → (Wind → Rain ∧ Wind)' }, { goal: 'Wet → (Slip → Wet ∧ Slip)' }, { goal: '¬Rain → (Wind → ¬Rain ∧ Wind)' }],
    brief: T('设计一个证明助手，证完每一个目标。', 'Design a proof assistant that proves every goal.'),
    hint: [T('「并且」的两半，各自在已知里吗？', 'Are the two halves of the “and” each among the givens?')],
    intro: [{ t: T('引入 ∧ 有两条前提，倒着用它，一个目标变成两个，排成一列。元件总是处理第一个目标；证完一个，下一个顶上来。', '∧ intro has two premises: used backwards, it turns one goal into two, in a row. A part always works on the first goal; when it is proved, the next moves up.') }],
    solution: script(['rule', 'impI'], ['rule', 'impI'], ['rule', 'conjI'], 'assumption', 'assumption'),
  }),
  prove({
    id: 'r-meta',
    title: T('还没定下来的 ?A', 'An ?A not settled yet'),
    tests: [{ goal: 'Wet', hyps: ['Rain → Wet', 'Rain'] }, { goal: 'Slip', hyps: ['Wind', 'Wet → Slip', 'Wet'] }, { goal: 'Wind ∧ Wet', hyps: ['Rain → Wind ∧ Wet', 'Rain'] }],
    brief: T('设计一个证明助手，证完每一个目标。', 'Design a proof assistant that proves every goal.'),
    hint: [T('倒着用套用。?A 先留着，交给已知去定。', 'Use Apply backwards. Leave ?A open for a given to settle.')],
    intro: [{ t: T('套用写成规则是 ⟦?A → ?B; ?A⟧ ⟹ ?B。结论 ?B 对上目标「地湿」，?A 却无法从目标读出，原样留在两个新目标里。之后什么确定了 ?A，两个目标里的 ?A 就一起确定。', 'Apply as a rule is ⟦?A → ?B; ?A⟧ ⟹ ?B. Its conclusion ?B fits the goal “the ground is wet”, but ?A cannot be read off the goal, and stays as it is in both new goals. Whatever settles ?A later settles it in both.') }],
    solution: script(['rule', 'mp'], 'assumption', 'assumption'),
  }),
  {
    id: 'r-lemma',
    title: T('证出的引理也是规则', 'Lemmas are rules too'),
    tasks: [
      prove({
        step: T('串联', 'Chain'),
        tests: [{ goal: 'Rain → Slip', hyps: ['Rain → Wet', 'Wet → Slip'] }, { goal: 'Alarm → Awake', hyps: ['Alarm → Coffee', 'Coffee → Awake'] }],
        brief: T('设计一个证明助手，用<part-ref to="lemma:chain"></part-ref>证完每一个目标。', 'Design a proof assistant that proves every goal with <part-ref to="lemma:chain"></part-ref>.'),
        hint: [T('目标里读不出<part-ref to="lemma:chain"></part-ref>的中间那一句。', 'The middle sentence of <part-ref to="lemma:chain"></part-ref> cannot be read off the goal.')],
        solution: script(['rule', 'chain'], 'assumption', 'assumption'),
      }),
      prove({
        step: T('交换', 'Swap'),
        tests: [{ goal: 'Wind → (Rain → Wet)', hyps: ['Rain → (Wind → Wet)'] }, { goal: 'Coffee → (Alarm → Awake)', hyps: ['Alarm → (Coffee → Awake)'] }],
        brief: T('再用<part-ref to="lemma:swap"></part-ref>证完每一个目标。', 'Now prove every goal with <part-ref to="lemma:swap"></part-ref>.'),
        hint: [T('<part-ref to="lemma:swap"></part-ref>只有一条前提。', '<part-ref to="lemma:swap"></part-ref> has one premise.')],
        solution: script(['rule', 'swap'], 'assumption'),
      }),
      prove({
        step: T('合并', 'Merge'),
        tests: [{ goal: 'Rain → Wet', hyps: ['Rain → (Rain → Wet)'] }, { goal: 'Hungry → Eat', hyps: ['Hungry → (Hungry → Eat)'] }],
        brief: T('再用<part-ref to="lemma:merge"></part-ref>证完每一个目标。', 'Now prove every goal with <part-ref to="lemma:merge"></part-ref>.'),
        hint: [T('<part-ref to="lemma:merge"></part-ref>的结论对上目标以后，还剩什么要证？', 'Once <part-ref to="lemma:merge"></part-ref>’s conclusion fits the goal, what is left to prove?')],
        solution: script(['rule', 'merge'], 'assumption'),
      }),
    ],
    intro: [{ t: T('证出的引理本身就是一条规则：<part-ref to="lemma:chain"></part-ref>是 ⟦?A → ?B; ?B → ?C⟧ ⟹ ?A → ?C。它和证明核的规则一样能倒着用，元件上都能选到。', 'A lemma you proved is itself a rule: <part-ref to="lemma:chain"></part-ref> is ⟦?A → ?B; ?B → ?C⟧ ⟹ ?A → ?C. It can be used backwards just like the kernel’s rules, and the part offers it too.') }],
  },

  // ---------- using hypotheses up ----------
  prove({
    id: 'r-elim',
    title: T('规则作用于假设', 'A rule, then a given'),
    want: 'becomes',
    inputs: RULED,
    builds: 'erule',
    tests: [
      { goal: 'Wind ∧ Rain', hyps: ['Rain ∧ Wind'], rules: ['conjE'], becomes: [['Rain ∧ Wind; Rain; Wind ⊢ Wind ∧ Rain']] },
      { goal: 'Slip', hyps: ['Wet ∧ Slip'], rules: ['conjE'], becomes: [['Wet ∧ Slip; Wet; Slip ⊢ Slip']] },
      { goal: 'Wind ∧ Wet', hyps: ['Rain', 'Wet ∧ Wind'], rules: ['conjE'], becomes: [['Rain; Wet ∧ Wind; Wet; Wind ⊢ Wind ∧ Wet']] },
    ],
    brief: T('设计一个证明助手：拆开「并且」那条已知，把每个目标变成要的样子。', 'Design a proof assistant that takes the “and” given apart, turning each goal into the one wanted.'),
    hint: [T('全是 ? 的目标，什么能确定它？', 'What can settle a goal made of ?-letters?'), T('倒着用规则之后，紧接着用<part-ref to="part:assumption"></part-ref>。', 'Right after the rule used backwards, <part-ref to="part:assumption"></part-ref>.')],
    intro: [
      { t: T('到这里用过的规则都看目标：结论对上目标，前提成为新目标。消去 ∧ 写成规则是 ⟦?A ∧ ?B; ⟦?A; ?B⟧ ⟹ ?C⟧ ⟹ ?C：结论 ?C 对得上任何目标，第一条前提 ?A ∧ ?B 却无法从目标读出，成了一个全是 ? 的目标。', 'The rules used so far all look at the goal: the conclusion fits it, the premises become new goals. ∧ elim as a rule is ⟦?A ∧ ?B; ⟦?A; ?B⟧ ⟹ ?C⟧ ⟹ ?C: its conclusion ?C fits any goal, but its first premise ?A ∧ ?B cannot be read off the goal, and becomes a goal made of ?-letters.') },
      { t: T('规则从板上的「规则」输入接入；设计出的证明助手会成为新元件<part-ref to="lemma:erule"></part-ref>，这个输入就是它的「规则」口。', 'The rules come in at the board’s input Rules; the proof assistant you design becomes a new part, <part-ref to="lemma:erule"></part-ref>, and that input is its port Rules.') },
    ],
    solution: machine({ c0: ['rule'], c1: ['assumption'] }, ['in>c0', 'rules>c0.rules', 'c0>c1', 'c1>out'], { inputs: ['in', 'rules'] }),
  }),
  prove({
    id: 'r-cases',
    title: T('分情况', 'Case by case'),
    tests: [{ goal: 'Wind ∨ Rain', hyps: ['Rain ∨ Wind'] }, { goal: 'Slip ∨ Wet', hyps: ['Wet ∨ Slip'] }, { goal: 'Bike ∨ Bus', hyps: ['Bus ∨ Bike'] }],
    brief: T('设计一个证明助手，证完每一个目标。', 'Design a proof assistant that proves every goal.'),
    hint: [T('先拆「或者」那条已知。', 'Take the “or” given apart first.'), T('每种情况里，目标的哪一边在已知里？', 'In each case, which side of the goal is among the givens?')],
    intro: [{ t: T('<part-ref to="lemma:erule"></part-ref>不只拆「并且」，元件上能选任何一条消去规则。消去 ∨ 写成规则是 ⟦?A ∨ ?B; ⟦?A⟧ ⟹ ?C; ⟦?B⟧ ⟹ ?C⟧ ⟹ ?C。', '<part-ref to="lemma:erule"></part-ref> takes apart more than “and”: any elimination rule can be chosen on it. ∨ elim as a rule is ⟦?A ∨ ?B; ⟦?A⟧ ⟹ ?C; ⟦?B⟧ ⟹ ?C⟧ ⟹ ?C.') }],
    solution: script(['erule', 'disjE'], ['rule', 'disjI2'], 'assumption', ['rule', 'disjI1'], 'assumption'),
  }),
  prove({
    id: 'r-false',
    title: T('自相矛盾的已知', 'Givens that contradict'),
    tests: [{ goal: 'Pigs', hyps: ['Rain', '¬Rain'] }, { goal: 'Moon', hyps: ['¬Wet', 'Wet'] }],
    brief: T('设计一个证明助手，证完每一个目标。', 'Design a proof assistant that proves every goal.'),
    hint: [T('倒着走，第一步该把目标换成什么？', 'Going backwards, what should the goal become first?'), T('套用当消去规则用，对得上哪一条已知？', 'Apply as an elimination rule: which given does it fit?')],
    intro: [{ t: T('目标和已知毫不相干，已知里却有一对互相矛盾的句子。', 'The goal has nothing to do with the givens, yet among the givens is a pair that contradict each other.') }],
    solution: script(['rule', 'botE'], ['erule', 'mp'], 'assumption'),
  }),
  prove({
    id: 'r-dist',
    title: T('分配律', 'Distribution'),
    tests: [{ goal: 'Rain ∧ (Wind ∨ Wet) → (Rain ∧ Wind) ∨ (Rain ∧ Wet)' }, { goal: 'Sat ∧ (Bus ∨ Bike) → (Sat ∧ Bus) ∨ (Sat ∧ Bike)' }],
    brief: T('设计一个证明助手，证完每一个目标。', 'Design a proof assistant that proves every goal.'),
    hint: [T('先拆开能拆的已知。', 'First take apart every given that comes apart.'), T('再分两种情况，每种情况各选「或者」的一边。', 'Then split into two cases, and in each choose a side of the “or”.')],
    intro: [{ t: T('<level-ref to="dist"></level-ref>里，这句话在证明板上用了好几个框。这一次，从目标往回推。', 'In <level-ref to="dist"></level-ref> this sentence took several boxes on the proof board. This time, reason back from the goal.') }],
    solution: script(['rule', 'impI'], ['erule', 'conjE'], ['erule', 'disjE'], ['rule', 'disjI1'], ['rule', 'conjI'], 'assumption', 'assumption', ['rule', 'disjI2'], ['rule', 'conjI'], 'assumption', 'assumption'),
    after: T('这样一串元件就是一段证明脚本，每个元件一行。', 'A row of parts like this is a proof script, one part to a line.'),
  }),

  // ---------- quantifiers and patterns ----------
  unify({
    id: 'r-pattern',
    title: T('模式合一', 'Pattern unification'),
    adds: ['uPattern', 'unifier'],
    tests: [{ eqs: ['∀x. ?P(x) ≐ ∀x. Human(x) → Mortal(x)'] }, { eqs: ['∃y. ?P(y) ∧ ?A ≐ ∃x. Likes(x, ann) ∧ Rain'] }, { eqs: ['∀x. ?A ≐ ∀x. Human(x)'] }, { eqs: ['∀x. ?P(x) ∧ ?P(ann) ≐ ∀x. Likes(x, x) ∧ Likes(ann, bo)'] }],
    brief: T('设计一个证明助手：把每组等式解到底；对不上或者没有解的，说「失败」。', 'Design a proof assistant that solves each set of equations to the end, or says “failed” when they do not fit or have no solution.'),
    hint: [T('合一器先做它能做的，剩下 ?P(x) 这样的等式交给新元件。', 'Let the unifier do what it can, and pass an equation like ?P(x) that is left to the new part.'), T('解出 ?P 以后，可能还要再合一一遍。', 'Once ?P is solved, there may be more unifying to do.')],
    intro: [
      { t: T('量词的规则里，元变量后面跟着变量：<part-ref to="part:allI"></part-ref>是 ⟦⋀x. ?P(x)⟧ ⟹ ∀x. ?P(x)。?P 不是一句话，而是「一句关于 x 的话」。解 ∀x. ?P(x) ≐ ∀x. x是人 → x会死，要得到 ?P ≐ fun x => x是人 → x会死：?P 是以 x 为参数的函数。', 'In the quantifier rules a metavariable is followed by variables: <part-ref to="part:allI"></part-ref> is ⟦⋀x. ?P(x)⟧ ⟹ ∀x. ?P(x). ?P is not a sentence but “a sentence about x”. Solving ∀x. ?P(x) ≐ ∀x. x is human → x is mortal must give ?P ≐ fun x => x is human → x is mortal: ?P is a function with x as its parameter.') },
      { t: T('两个「对所有」拆开时，两边的主体用同一个变量，等式前记上 ⋀x，表示 x 受量词约束。?A 不能把 x 带出去，所以 ∀x. ?A ≐ ∀x. x是人 无解（出现检查也查这一点）；?P(x) 可以，它本来就关于 x。新元件「模式合一」：?P 后面跟着互不相同的 ⋀ 变量时，解出 ?P。', 'When two “for all” are split, both bodies get the same variable, and the equation is marked ⋀x: x is bound by a quantifier. ?A may not take x out with it, so ∀x. ?A ≐ ∀x. x is human has no solution (the occurs check checks this too); ?P(x) may, being about x in the first place. A new part, “Pattern unification”: when ?P is followed by distinct ⋀ variables, it solves ?P.') },
    ],
    solution: looped(['unifier', 'uPattern']),
    after: T('元变量只跟着互不相同的约束变量时，解是唯一的，这叫<wiki-ref to="pattern"></wiki-ref>（Miller 模式）。', 'When a metavariable is followed only by distinct bound variables, the solution is unique: a <wiki-ref to="pattern"></wiki-ref> (Miller’s patterns).'),
  }),
  unify({
    id: 'r-patterns',
    adds: ['uPattern', 'unifier'],
    title: T('几个变量', 'Several variables'),
    tests: [{ eqs: ['∀x. ∀y. ?P(x, y) ≐ ∀x. ∀y. Likes(x, y) ∨ Likes(y, x)'] }, { eqs: ['∀x. ?P(x) ∧ ?Q(x) ≐ ∀y. Human(y) ∧ Likes(y, ann)'] }, { eqs: ['∀x. ∀y. ?P(y, x) ≐ ∀x. ∀y. Likes(x, y)'] }, { eqs: ['∀x. ?P(x) ∧ ?A ≐ ∀y. Likes(y, ann) ∧ Likes(y, bo)'] }],
    brief: T('设计一个证明助手：把每组等式解到底；对不上或者没有解的，说「失败」。', 'Design a proof assistant that solves each set of equations to the end, or says “failed” when they do not fit or have no solution.'),
    hint: [T('?P 后面跟着几个变量，解出的函数就有几个参数，次序同 ?P 后面的次序。', 'However many variables follow ?P, the function found has that many parameters, in the order they follow ?P.')],
    intro: [{ t: T('?P(x, y) 是一句关于 x 和 y 的话。两个「对所有」逐层拆开，等式前记上 ⋀x y；?P 后面跟着两个不同的约束变量，仍是模式。', '?P(x, y) is a sentence about x and y. Two “for all” split one after the other mark the equation ⋀x y; ?P followed by two distinct bound variables is still a pattern.') }],
    solution: looped(['unifier', 'uPattern']),
  }),
  prove({
    id: 'r-allI',
    title: T('逆用全称概括', 'For any, backwards'),
    tests: [{ goal: '∀x. Student(x) ∧ Human(x) → Human(x) ∧ Student(x)' }, { goal: '∀y. Bird(y) ∧ Flies(y) → Flies(y) ∧ Bird(y)' }],
    brief: T('设计一个证明助手，证完每一个目标。', 'Design a proof assistant that proves every goal.'),
    hint: [T('去掉 ∀ 以后，剩下的是熟悉的拆开与拼成。', 'With the ∀ gone, what remains is the familiar splitting and joining.')],
    intro: [{ t: T('逆用<part-ref to="part:allI"></part-ref> ⟦⋀x. ?P(x)⟧ ⟹ ∀x. ?P(x)：合一器解出 ?P，新目标是 ⋀a. ?P(a)。⋀ 是规则自己的「对所有」，管的是目标而不是句子：a 是任取的一样东西，目标要对它成立。', '<part-ref to="part:allI"></part-ref> used backwards, ⟦⋀x. ?P(x)⟧ ⟹ ∀x. ?P(x): the unifier finds ?P, and the new goal is ⋀a. ?P(a). ⋀ is the rules’ own “for all”, ruling over goals rather than sentences: a is any thing at all, and the goal must hold of it.') }],
    solution: script(['rule', 'allI'], ['rule', 'impI'], ['erule', 'conjE'], ['rule', 'conjI'], 'assumption', 'assumption'),
  }),
  prove({
    id: 'r-exI',
    title: T('逆用存在概括', 'Example, backwards'),
    tests: [{ goal: '∃x. Human(x) ∧ Likes(x, ann)', hyps: ['Human(bo)', 'Likes(bo, ann)'] }, { goal: '∃x. Bird(x) ∧ Flies(x)', hyps: ['Flies(cy)', 'Bird(cy)'] }, { goal: '∃y. Student(y) ∧ School(y)', hyps: ['Student(dee)', 'School(dee)'] }],
    brief: T('设计一个证明助手，证完每一个目标。', 'Design a proof assistant that proves every goal.'),
    hint: [T('例子是谁，交给已知去定。', 'Who the example is, leave to a given.')],
    intro: [{ t: T('<part-ref to="part:exI"></part-ref>写成规则是 ⟦?P(?t)⟧ ⟹ ∃x. ?P(x)。?t 是代表一样东西的元变量：倒着用时，例子无法从目标读出，?t 就留着。<level-ref to="q-exI"></level-ref>里，有几句「存在」时要在元件上选得出哪一句；倒着用规则，目标自己就说明了。', '<part-ref to="part:exI"></part-ref> as a rule is ⟦?P(?t)⟧ ⟹ ∃x. ?P(x). ?t is a metavariable for a thing: used backwards, the example cannot be read off the goal, so ?t is left open. In <level-ref to="q-exI"></level-ref>, with several “there is” sentences, you chose on the part which to conclude; with a rule used backwards, the goal says so itself.') }],
    solution: script(['rule', 'exI'], ['rule', 'conjI'], 'assumption', 'assumption'),
  }),
  prove({
    id: 'r-drule',
    title: T('前向推理', 'One step forward'),
    want: 'becomes',
    inputs: RULED,
    builds: 'frule',
    tests: [
      { goal: 'Mortal(soc)', hyps: ['∀x. Human(x) → Mortal(x)', 'Human(soc)'], rules: ['spec'], becomes: [['∀x. Human(x) → Mortal(x); Human(soc); Human(?t) → Mortal(?t) ⊢ Mortal(soc)']] },
      { goal: 'Flies(cy)', hyps: ['∀x. Bird(x) → Flies(x)', 'Bird(cy)'], rules: ['spec'], becomes: [['∀x. Bird(x) → Flies(x); Bird(cy); Bird(?t) → Flies(?t) ⊢ Flies(cy)']] },
      { goal: 'Likes(ann, bo)', hyps: ['Human(bo)', '∀y. Human(y) → Likes(ann, y)'], rules: ['spec'], becomes: [['Human(bo); ∀y. Human(y) → Likes(ann, y); Human(?t) → Likes(ann, ?t) ⊢ Likes(ann, bo)']] },
    ],
    brief: T('设计一个证明助手：从「对所有」那条已知取一个，加进已知，把每个目标变成要的样子。', 'Design a proof assistant that takes one from the “for all” given and adds it to the givens, turning each goal into the one wanted.'),
    hint: [T('先证一句倒着用，第一个目标是一个光秃秃的 ?A。', 'Have used backwards leaves a bare ?A as the first goal.'), T('?A 由「对所有」那条已知来定：<part-ref to="lemma:erule"></part-ref>接上<part-ref to="part:allE"></part-ref>。', '?A is settled from the “for all” given: <part-ref to="lemma:erule"></part-ref> with <part-ref to="part:allE"></part-ref>.')],
    intro: [
      { t: T('<part-ref to="part:allE"></part-ref>写成规则是 ⟦∀x. ?P(x)⟧ ⟹ ?P(?t)。倒着用，结论 ?P(?t) 要对上「苏格拉底会死」，而 ?P 后面跟的是 ?t，不是约束变量。?P 是「x会死」、?t 是苏格拉底？还是 ?P 就是「苏格拉底会死」、?t 任意？解不止一个，合一器不猜，元件对不上。', '<part-ref to="part:allE"></part-ref> as a rule is ⟦∀x. ?P(x)⟧ ⟹ ?P(?t). Backwards, its conclusion ?P(?t) must fit “Socrates is mortal”, but ?P is followed by ?t, not by a bound variable. Is ?P “x is mortal” with ?t Socrates, or is ?P just “Socrates is mortal” with ?t anything? There is more than one solution, the unifier does not guess, and the part does not fit.') },
      { t: T('证明板上不必倒着走：<part-ref to="part:allE"></part-ref>接在「对所有」那条已知后面，得出的一句再接给别的元件。中途得出一句、再拿来用，写成规则是<b>先证一句</b> ⟦?A; ⟦?A⟧ ⟹ ?C⟧ ⟹ ?C：倒着用它，多出一个目标 ?A，证出的 ?A 进入下一个目标的已知。<part-ref to="part:allE"></part-ref>从板上的「规则」输入接入；设计出的证明助手会成为新元件「前向推理」，这个输入就是它的「规则」口。', 'On the proof board there was no going backwards: <part-ref to="part:allE"></part-ref> was wired after the “for all” given, and what it gave wired on. Getting a sentence on the way and then using it is, as a rule, <b>Have</b>: ⟦?A; ⟦?A⟧ ⟹ ?C⟧ ⟹ ?C. Used backwards it adds a goal ?A, and the ?A proved joins the next goal’s givens. <part-ref to="part:allE"></part-ref> comes in at the board’s input Rules; the proof assistant you design becomes a new part, “Forward”, and that input is its port Rules.') },
    ],
    solution: machine({ c0: ['rule', { rule: 'cut' }], c1: ['erule'] }, ['in>c0', 'c0>c1', 'rules>c1.rules', 'c1>out'], { inputs: ['in', 'rules'] }),
    after: T('像这样从已知往前推，叫<wiki-ref to="forward"></wiki-ref>。', 'Reasoning on from a given like this is <wiki-ref to="forward"></wiki-ref>.'),
  }),
  prove({
    id: 'r-frule',
    adds: ['frule'],
    title: T('同一条用两次', 'The same given twice'),
    tests: [{ goal: 'Even(s(s(s(s(zero)))))', hyps: ['∀x. Even(x) → Even(s(s(x)))', 'Even(zero)'] }, { goal: 'Odd(s(s(s(s(s(zero))))))', hyps: ['∀x. Odd(x) → Odd(s(s(x)))', 'Odd(s(zero))'] }],
    brief: T('设计一个证明助手，证完每一个目标。', 'Design a proof assistant that proves every goal.'),
    hint: [T('「对所有」那一句，用一次够吗？', 'Is one use of the “for all” given enough?')],
    intro: [{ t: T('往前推不会拿走原来的已知：「对所有」那一句用过一次还在，可以再用，取另一样东西。', 'Going forward does not take the given away: the “for all” sentence is still there after one use, and can be used again, for another thing.') }],
    solution: script(['frule', 'spec'], ['frule', 'spec'], ['erule', 'mp'], ['erule', 'mp'], 'assumption'),
  }),
  prove({
    id: 'r-exE',
    title: T('逆用存在实例化', 'Taking out, backwards'),
    tests: [{ goal: 'Pigs', hyps: ['∃x. Human(x) ∧ ¬Human(x)'] }, { goal: 'Moon', hyps: ['∃y. ¬Bird(y) ∧ Bird(y)'] }],
    brief: T('设计一个证明助手，证完每一个目标。', 'Design a proof assistant that proves every goal.'),
    hint: [T('已知自相矛盾，矛盾在它说存在的那样东西身上。', 'The given contradicts itself, about the thing it says there is.'), T('<part-ref to="lemma:erule"></part-ref>接上<part-ref to="part:exE"></part-ref>，对上「存在」那条已知。', '<part-ref to="lemma:erule"></part-ref> with <part-ref to="part:exE"></part-ref>, on the “there is” given.')],
    intro: [{ t: T('<part-ref to="part:exE"></part-ref>写成规则是 ⟦∃x. ?P(x); ⋀x. ⟦?P(x)⟧ ⟹ ?C⟧ ⟹ ?C。它也是消去规则：第一条前提对上一条「存在」，第二条前提前面的 ⋀x 让新目标多出一样东西 a，以及关于它的已知。', '<part-ref to="part:exE"></part-ref> as a rule is ⟦∃x. ?P(x); ⋀x. ⟦?P(x)⟧ ⟹ ?C⟧ ⟹ ?C. It is an elimination rule too: its first premise fits a “there is”, and the ⋀x in front of the second gives the new goal a thing a, with a given about it.') }],
    solution: script(['rule', 'botE'], ['erule', 'exE'], ['erule', 'conjE'], ['erule', 'mp'], 'assumption'),
  }),

  // ---------- challenge ----------
  prove({
    id: 'r-order',
    title: T('先拿出来', 'Take it out first'),
    tests: [{ goal: '∃x. Likes(x, ann) ∧ Human(x)', hyps: ['∃x. Human(x) ∧ Likes(x, ann)'] }, { goal: '∃y. Flies(y) ∧ Bird(y)', hyps: ['∃x. Bird(x) ∧ Flies(x)'] }],
    brief: T('设计一个证明助手，证完每一个目标。', 'Design a proof assistant that proves every goal.'),
    hint: [T('?t 能变成什么，取决于它是什么时候留下的。', 'What ?t may become depends on when it was left.')],
    intro: [{ t: T('有一个又是人、又喜欢安的人，所以有一个喜欢安、又是人的人。', 'Someone is human and likes Ann, so someone likes Ann and is human.') }],
    solution: script(['erule', 'exE'], ['erule', 'conjE'], ['rule', 'exI'], ['rule', 'conjI'], 'assumption', 'assumption'),
    naive: script(['rule', 'exI'], ['erule', 'exE'], ['erule', 'conjE'], ['rule', 'conjI'], 'assumption', 'assumption'),
  }),
]
