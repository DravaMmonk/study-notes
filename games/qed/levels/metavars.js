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

const T = (zh, en) => ({ zh, en })
const GOAL = [{ name: 'in', label: T('目标', 'Goal') }]
const EQS = [{ name: 'in', label: T('等式', 'Equations') }]
const unify = (level) => ({ kind: 'machine', want: 'unify', inputs: EQS, ...level })
const prove = (level) => ({ kind: 'machine', want: 'proved', inputs: GOAL, ...level })

// A script: the cards one after another from the goal to the result. A step is a card's type, or [type, rule] for a
// card that uses a rule.
export function script(...steps) {
  const nodes = Object.fromEntries(steps.map((s, k) => {
    const [type, rule] = [s].flat()
    return [`c${k}`, [type, rule ? { rule } : {}]]
  }))
  const ids = Object.keys(nodes)
  return machine(nodes, [...ids, 'out'].map((to, k) => `${k ? ids[k - 1] : 'in'}>${to}${to === 'out' ? '' : '.in'}`))
}
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
    brief: T('接一台机器：把规则的结论和目标对上，拆到每个等式左边都只剩一个 ?-字母。', 'Wire a machine that fits a rule’s conclusion to a goal, splitting until each equation has a single ?-letter on its left.'),
    hint: [T('一张<part-ref to="part:uDecompose"></part-ref>一次只拆一处。第三组要拆两层。', 'One <part-ref to="part:uDecompose"></part-ref> splits one place at a time. The third test needs two levels split.')],
    intro: [
      { t: T('前面每一个元件，句子都要你在元件上选：假设框选假设，引入 ∨ 选另一边，举例选要得出哪一句。可是要证的目标就写在那里，元件本可以自己从目标里读出来。', 'On every part so far you chose the sentences yourself: the assumption box its assumption, Bring in ∨ its other side, Example what it concludes. Yet the goal is written right there, and a part could read them off it.') },
      { t: T('办法是把规则写成带空位的样子。拼成 ∧ 写作 ⟦?A; ?B⟧ ⟹ ?A ∧ ?B，读作「有了 ?A 和 ?B，就得到 ?A ∧ ?B」：⟦ ⟧ 里是前提，⟹ 后面是结论。?A、?B 叫<b>元变量</b>，可以是任何一句话。这一章迁移的是 Isabelle 写规则、用规则的思路，Lean 里也有同样的空位，写作 ?m。', 'The way is to write a rule with gaps in it. Join ∧ is ⟦?A; ?B⟧ ⟹ ?A ∧ ?B, read “given ?A and ?B, you get ?A ∧ ?B”: the premises in ⟦ ⟧, the conclusion after ⟹. ?A and ?B are <b>metavariables</b>, standing for any sentence at all. This chapter carries over how Isabelle writes and uses rules; Lean has the same gaps, written ?m.') },
      { t: T('要用一条规则证一个目标，先让规则的结论对上目标：解等式 ?A ∧ ?B ≐ 下雨 ∧ 刮风，找出 ?A 和 ?B 各是什么。这叫<b>合一</b>。新元件<part-ref to="part:uDecompose"></part-ref>：两边样子相同（都是「并且」），就拆成左边对左边、右边对右边。', 'To prove a goal with a rule, first make the rule’s conclusion fit the goal: solve the equation ?A ∧ ?B ≐ it rains ∧ it is windy, finding what ?A and ?B are. This is <b>unification</b>. A new part, <part-ref to="part:uDecompose"></part-ref>: when both sides have the same shape (both “and”), it splits them, left with left and right with right.') },
    ],
    solution: chained(['uDecompose', 'uDecompose']),
    after: T('合一就是解等式。解出的 ?A ≐ 下雨，正是倒着用这条规则时 ?A 要填的句子。', 'Unification is solving equations. The ?A ≐ it rains it finds is exactly the sentence ?A stands for when the rule is used backwards.'),
  }),
  unify({
    id: 'r-deep',
    title: T('拆到底', 'All the way down'),
    adds: ['repeat'],
    showcase: T('重复框把框里接出的东西再送回框里，一圈一圈地做，直到不再变化或者失败：框开出的是上一圈的结果，不是一开始的输入；光看说明，容易以为它只做一遍', 'the repeat frame feeds what is made inside back in, round after round, until nothing changes or it fails: what the frame opens with is the last round’s result, not the first input; from its description alone it is easy to think it runs once'),
    tests: [{ eqs: ['?A ∧ ?B ≐ Rain ∧ Wind'] }, { eqs: ['((?A ∨ ?B) → ?C) ∧ ?D ≐ ((Rain ∨ Wind) → Wet) ∧ Slip'] }, { eqs: ['(?A → ?B) ∧ ((?C ∨ ?D) ∧ ?E) ≐ (Rain → Wet) ∧ ((Wind ∨ Slip) ∧ Moon)'] }],
    brief: T('接一台机器：不管要拆几层，都拆到每个等式左边只剩一个 ?-字母。', 'Wire a machine that splits until each equation has a single ?-letter on its left, however many levels it takes.'),
    hint: [T('框里一张拆开就够，框会一圈一圈地拆下去。', 'One Decompose in the frame is enough; the frame splits round after round.')],
    intro: [
      { t: T('<level-ref to="r-match"></level-ref>里拆两层，接了两张拆开。拆三层就要接三张，拆四层接四张……可要拆几层，要看规则和目标，事先不知道：元件接得再多，总有更深的。', 'In <level-ref to="r-match"></level-ref> two levels took two Decompose parts. Three levels take three, four take four … but how many levels depends on the rule and the goal, and is not known beforehand: however many parts are wired, a deeper one comes along.') },
      { t: T('新元件<part-ref to="part:repeat"></part-ref>：框左边开出它收到的东西，框里的元件对它做一圈，接回框右边的「结果」；下一圈，框开出的是这一圈的结果。一圈一圈地做，直到不再变化（或者失败了），送出最后一圈。', 'A new part, the <part-ref to="part:repeat"></part-ref>: at its left the frame opens with what it receives; the parts inside do one round on it and wire back to “result” at its right; next round, the frame opens with this round’s result. Round after round, until nothing changes (or it fails), and it gives the last round.') },
    ],
    solution: looped(['uDecompose']),
    naive: chained(['uDecompose', 'uDecompose', 'uDecompose']),
    after: T('一个元件加一个重复框，拆一层和拆十层是同一台机器。从这里起，每种新元件都放进框里，和前面的元件一起转。', 'One part in a repeat frame: splitting one level or ten is the same machine. From here on each new kind of part goes in the frame, going round with the ones before.'),
  }),
  unify({
    id: 'r-delete',
    title: T('两边一样就删掉', 'Same on both sides'),
    adds: ['uDelete'],
    tests: [{ eqs: ['?A ∧ Wind ≐ Rain ∧ Wind'] }, { eqs: ['Rain → ?B ≐ Rain → Wet'] }, { eqs: ['¬?A ≐ ¬Rain'] }, { eqs: ['(?A ∧ Wind) → ?B ≐ (Rain ∧ Wind) → Wet'] }],
    brief: T('接一台机器：把每组等式解到底，只留下 ?-字母的等式。', 'Wire a machine that solves each set of equations to the end, leaving only equations for ?-letters.'),
    hint: [T('拆开以后，两边一模一样的等式说的是废话。', 'After splitting, an equation with the same on both sides says nothing.')],
    intro: [
      { t: T('规则的结论里不全是 ?：有的地方是确定的句子，目标在那里必须一模一样。拆开以后，这样的地方变成「刮风 ≐ 刮风」，什么也没说：新元件<part-ref to="part:uDelete"></part-ref>把它去掉。', 'A rule’s conclusion is not all ?-letters: in places it is a fixed sentence, and the goal must be just the same there. Split, such a place becomes “it is windy ≐ it is windy”, which says nothing: a new part, <part-ref to="part:uDelete"></part-ref>, removes it.') },
      { t: T('¬A 在证明器里就是 A → ⊥，拆的时候也这样拆。', '¬A in the prover is A → ⊥, and it splits that way too.') },
    ],
    solution: looped(['uDecompose', 'uDelete']),
    after: T('¬?A 对 ¬下雨，拆出来是 ?A ≐ 下雨 和 ⊥ ≐ ⊥：后一个删掉。', '¬?A against ¬it rains splits into ?A ≐ it rains and ⊥ ≐ ⊥: the second is deleted.'),
  }),
  unify({
    id: 'r-clash',
    title: T('对不上', 'They do not fit'),
    adds: ['uConflict'],
    tests: [{ eqs: ['?A ∧ ?B ≐ Rain ∨ Wind'] }, { eqs: ['?A → ⊥ ≐ Rain → Wet'] }, { eqs: ['?A ∨ ?B ≐ Rain ∨ (Wind ∧ Wet)'] }, { eqs: ['(?A ∧ ?B) → ?C ≐ (Rain ∨ Wind) → Wet'] }],
    brief: T('接一台机器：能对上的解到底；对不上的，说「失败」。', 'Wire a machine that solves what can be fitted to the end, and says “failed” of what cannot.'),
    hint: [T('先拆开，再看有没有两边样子不同的等式。', 'Split first, then look for an equation whose sides differ in shape.')],
    intro: [{ t: T('不是每条规则都对得上每个目标。拼成 ∧ 的结论是「并且」，目标是「或者」，?A、?B 怎样填都对不上。新元件<part-ref to="part:uConflict"></part-ref>：找到两边都不是 ?、样子却不同的等式，宣布失败。用规则的时候，失败就说明该换一条规则。', 'Not every rule fits every goal. Join ∧ concludes an “and”; against an “or”, nothing put in for ?A and ?B makes them fit. A new part, <part-ref to="part:uConflict"></part-ref>: it finds an equation with no ?-letter on either side and different shapes, and declares failure. When using rules, failure means trying another rule.') }],
    solution: looped(['uDecompose', 'uConflict']),
    after: T('?A → ⊥ 对「下雨 → 地湿」：拆开后 ⊥ ≐ 地湿 对不上。「并非 ?A」这条规则，用不到一句「若…则…」上。', '?A → ⊥ against “it rains → the ground is wet”: split, ⊥ ≐ the ground is wet does not fit. A rule about “not ?A” does not apply to an “if … then …”.'),
  }),
  unify({
    id: 'r-twice',
    title: T('同一个 ?A 出现两次', 'The same ?A twice'),
    adds: ['uEliminate'],
    tests: [{ eqs: ['?A → ?A ≐ Rain → Rain'] }, { eqs: ['?A ∧ ?A ≐ Rain ∧ Wind'] }, { eqs: ['?A → (?B → ?A) ≐ Rain → (Wind → Rain)'] }, { eqs: ['(?A → ?B) → (?A → ?B) ≐ (Rain → Wet) → (Rain → Slip)'] }],
    brief: T('接一台机器：把每组等式解到底；对不上的，说「失败」。', 'Wire a machine that solves each set of equations to the end, or says “failed” when they do not fit.'),
    hint: [T('?A 已经知道是什么了，就把别处的 ?A 也换成它，再看剩下的对不对得上。', 'Once ?A is known, put it in for ?A everywhere else, and see whether what is left fits.')],
    intro: [{ t: T('K 的结论是 ?A → (?B → ?A)：?A 出现了两次，两处必须是同一句。拆开以后就有两个关于 ?A 的等式。新元件<part-ref to="part:uEliminate"></part-ref>：找到 ?A ≐ t，把别的等式里的 ?A 都换成 t，两处是不是同一句就看出来了。', 'K concludes ?A → (?B → ?A): ?A occurs twice, and both places must be the same sentence. Split, there are two equations about ?A. A new part, <part-ref to="part:uEliminate"></part-ref>: it finds ?A ≐ t and puts t for ?A in the other equations, so whether the two places agree shows.') }],
    solution: looped(['uDecompose', 'uEliminate', 'uDelete', 'uConflict']),
    after: T('代进去以后，原来对得上的等式可能就对不上了：每一圈都要再查一遍，框会替你查。', 'After putting in, an equation that fitted may no longer fit: each round must check again, and the frame does it for you.'),
  }),
  unify({
    id: 'r-both',
    title: T('两边都有 ?', '? on both sides'),
    adds: ['uSwap'],
    tests: [{ eqs: ['?A ∧ Wind ≐ Rain ∧ ?B'] }, { eqs: ['Rain → ?B ≐ ?A'] }, { eqs: ['?A → ?A ≐ ?B → Rain'] }, { eqs: ['Rain ∧ ?B ≐ ?A ∨ Wind'] }],
    brief: T('接一台机器：把每组等式解到底；对不上的，说「失败」。', 'Wire a machine that solves each set of equations to the end, or says “failed” when they do not fit.'),
    hint: [T('?-字母跑到右边的等式，先翻过来。', 'Turn round any equation with its ?-letter on the right.')],
    intro: [{ t: T('到这里，? 都在等式左边，右边是写定了的句子。可要对上的两句都可以带着 ?：一句还没定下来的话，和规则的结论对。这时会出现「下雨 ≐ ?B」这样 ? 在右边的等式，前面几种元件都只认左边的 ?。新元件<part-ref to="part:uSwap"></part-ref>：把它翻成 ?B ≐ 下雨。', 'So far the ?-letters were all on the left, with fixed sentences on the right. But both sentences being fitted may hold ?-letters: a sentence not settled yet, against a rule’s conclusion. Then an equation like “it rains ≐ ?B” turns up, its ?-letter on the right, and the parts so far only look for one on the left. A new part, <part-ref to="part:uSwap"></part-ref>: it turns it into ?B ≐ it rains.') }],
    solution: looped(['uDecompose', 'uSwap', 'uEliminate', 'uConflict']),
    after: T('?A ≐ 下雨 → ?B 也算解完：?B 还没定，?A 就跟着它。两边的 ? 在合一器眼里一视同仁。', '?A ≐ it rains → ?B counts as solved: ?B is still open, and ?A goes along with it. To the unifier the letters on both sides are alike.'),
  }),
  unify({
    id: 'r-occurs',
    title: T('代不完', 'It never ends'),
    adds: ['uCheck'],
    tests: [{ eqs: ['?A ≐ ?A → Wet'] }, { eqs: ['?A → ?A ≐ ?B → (?B ∧ Rain)'] }, { eqs: ['?A ∧ ?B ≐ ?B ∧ Rain'] }],
    brief: T('接一台机器：把每组等式解到底；没有解的，说「失败」。', 'Wire a machine that solves each set of equations to the end, or says “failed” when there is no solution.'),
    hint: [T('?A ≐ ?A → 地湿：右边比左边还长，怎样都相等不了。', '?A ≐ ?A → the ground is wet: the right side is longer than the left, and they can never be equal.')],
    intro: [{ t: T('?A ≐ ?A → 地湿：?A 要等于一句比它自己还长的话。代进去，右边又多出一个 ?A，永远代不完，这组等式没有解。前面的元件对它都无能为力，重复框转一圈什么都没变，就停在那里。新元件<part-ref to="part:uCheck"></part-ref>：找到 ?A ≐ t、t 里又有 ?A 的等式，宣布失败。', '?A ≐ ?A → the ground is wet: ?A must equal a sentence longer than itself. Put in, the right side gains another ?A, and it never ends: there is no solution. None of the parts so far can do anything with it; the repeat frame goes round once, nothing changes, and there it stops. A new part, <part-ref to="part:uCheck"></part-ref>: it finds ?A ≐ t with ?A inside t, and declares failure.') }],
    solution: looped(['uDecompose', 'uEliminate', 'uCheck']),
    after: T('不做发生检查，机器会以为 ?A 有了答案，用规则时就可能「证」出假话。很多合一程序为了快省掉它，Prolog 默认就不做。', 'Without the occurs check a machine would think ?A had an answer, and using rules could “prove” something false. Many unifiers leave it out for speed; Prolog does not do it by default.'),
  }),
  unify({
    id: 'r-unifier',
    title: T('六个元件一个框', 'Six parts, one frame'),
    builds: 'unifier',
    tests: [{ eqs: ['(?A → ?B) ∧ (?B → ?C) ≐ (Rain → Wet) ∧ (?D → Slip)'] }, { eqs: ['?A ∧ (?B ∨ ?A) ≐ Rain ∧ (Wind ∨ Wet)'] }, { eqs: ['?A → ?B ≐ ?B → ¬?A'] }, { eqs: ['¬¬?A ≐ ¬?B'] }],
    brief: T('接一台机器：不管要拆几层、代几次，都把等式解到底；对不上或者没有解的，说「失败」。造出的机器是新元件<part-ref to="lemma:unifier"></part-ref>。', 'Wire a machine that solves any set of equations to the end, however many levels and substitutions it takes, or says “failed” when they do not fit or have no solution. The machine becomes a new part, the <part-ref to="lemma:unifier"></part-ref>.'),
    hint: [T('每种元件各放一张进重复框，接成一串。', 'Put one part of each kind in the repeat frame, in a row.')],
    intro: [{ t: T('六种元件都有了：拆开、删掉、对不上、代进去、翻过来、发生检查，每一种都是某组等式卡住时补上的。这一回的等式，每一种都可能用上，用几次、什么时候用，都看等式自己。六种一起装进重复框，就是一台完整的合一机器。', 'All six kinds of part are in hand: Decompose, Delete, Clash, Eliminate, Swap, Occurs check, each added when some set of equations got stuck. This time every one may be needed, how often and when depending on the equations themselves. All six in one repeat frame make a whole unifying machine.') }],
    solution: looped(['uDecompose', 'uDelete', 'uSwap', 'uEliminate', 'uCheck', 'uConflict']),
    after: T('这台机器就是<part-ref to="lemma:unifier"></part-ref>：它解出的是<b>最一般的</b>合一子，只定下非定不可的部分，别的 ? 都留着。', 'This machine is the <part-ref to="lemma:unifier"></part-ref>: it finds the <b>most general</b> unifier, settling only what must be settled and leaving every other ?-letter open.'),
  }),

  // ---------- rules backwards ----------
  prove({
    id: 'r-rule',
    title: T('倒着用规则', 'A rule backwards'),
    adds: ['rule'],
    showcase: T('用规则元件不是从已知往下推，而是对着目标往回推：目标和规则的结论合一，换成规则的前提；没有前提的规则对上了，目标就证完了', 'the rule part does not reason down from what is known but back from the goal: the goal is unified with the rule’s conclusion and replaced by its premises; a rule with no premises that fits finishes the goal'),
    tests: [{ goal: 'Rain → (Wind → Rain)' }, { goal: 'Rain ∧ Wet → (Slip → Rain ∧ Wet)' }, { goal: '¬Rain → (Rain → ¬Rain)' }],
    brief: T('接一台机器，证完每一个目标。', 'Wire a machine that proves every goal.'),
    hint: [T('三个目标是同一个样子。你证出过一条结论正是这个样子的引理。', 'The three goals have the same shape. You proved a lemma whose conclusion has exactly that shape.')],
    intro: [
      { t: T('有了合一器，就能<b>倒着用规则</b>。新元件<part-ref to="part:rule"></part-ref>：元件上选一条规则，它把第一个目标和规则的结论合一，再把目标换成规则的前提，每条前提一个新目标。没有前提的规则对上了，目标就证完了。', 'With the unifier, rules can be <b>used backwards</b>. A new part, <part-ref to="part:rule"></part-ref>: choose a rule on the part; it unifies the first goal with the rule’s conclusion and replaces the goal with the rule’s premises, a new goal for each. A rule with no premises that fits finishes the goal.') },
      { t: T('元件上能选的，是证明核的规则，还有你证出的每一条引理：它们都写成 ⟦前提⟧ ⟹ 结论。线上传的东西换了：从这里起，线上是<b>证明状态</b>，还没证完的目标。', 'The part offers the kernel’s rules and every lemma you have proved, each written ⟦premises⟧ ⟹ conclusion. What the wires carry has changed: from here on, a wire carries a <b>proof state</b>, the goals still open.') },
    ],
    solution: script(['rule', 'axK']),
    after: T('同一条 K，套在三句不同的话上，?A、?B 每次都由目标定下来：元件不用再问你填什么。', 'The same K on three different sentences, ?A and ?B settled by the goal each time: the part no longer asks you what to fill in.'),
  }),
  prove({
    id: 'r-subgoals',
    title: T('一个目标变几个', 'One goal becomes several'),
    tests: [{ goal: '(Rain → (Wind → Rain)) ∧ (Wet ∨ ¬Wet)' }, { goal: '(Slip → (Rain → Slip)) ∧ (Rain ∨ ¬Rain)' }, { goal: '(¬Wet → (Wind → ¬Wet)) ∧ (Rain ∧ Wind ∨ ¬(Rain ∧ Wind))' }],
    brief: T('接一台机器，证完每一个目标。', 'Wire a machine that proves every goal.'),
    hint: [T('拼成 ∧ 有两条前提：用了它，就有两个目标，先证左边那个。', 'Join ∧ has two premises: used, it leaves two goals, the left one first.')],
    intro: [{ t: T('<part-ref to="part:rule"></part-ref>把目标换成规则的前提。K 没有前提，一对上就证完了；拼成 ∧ 有两条前提，倒着用它，一个目标就变成两个，排成一列。元件总是对第一个目标下手。', '<part-ref to="part:rule"></part-ref> replaces a goal with the rule’s premises. K has none, and fitting it finishes the goal; Join ∧ has two, and used backwards it turns one goal into two, in a row. A part always works on the first goal.') }],
    solution: script(['rule', 'conjI'], ['rule', 'axK'], ['rule', 'lem']),
    after: T('目标排成一列，一个元件处理排头的那个。证完一个，下一个顶上来。', 'The goals stand in a row, and a part deals with the first. When one is proved, the next moves up.'),
  }),
  prove({
    id: 'r-assumption',
    title: T('已知里有', 'Among the givens'),
    adds: ['assumption'],
    tests: [{ goal: 'Rain → (Wind → Rain ∧ Wind)' }, { goal: 'Wet → (Slip → Wet ∧ Slip)' }, { goal: '¬Rain → (Wind → ¬Rain ∧ Wind)' }],
    brief: T('接一台机器，证完每一个目标。', 'Wire a machine that proves every goal.'),
    hint: [T('假设框倒过来，把「若」的那一半放进已知；拼成以后，两个目标都在已知里。', 'The assumption box backwards puts the “if” half among the givens; after the join, both goals are among them.')],
    intro: [
      { t: T('假设框写成规则是 ⟦⟦?A⟧ ⟹ ?B⟧ ⟹ ?A → ?B：前提本身带着一个假设。倒着用，目标 A → B 变成「已知 A，证 B」：A 加进这个目标的已知里，写在 ⊢ 前面。', 'The assumption box as a rule is ⟦⟦?A⟧ ⟹ ?B⟧ ⟹ ?A → ?B: its premise carries an assumption of its own. Used backwards, the goal A → B becomes “given A, prove B”: A joins that goal’s givens, written before ⊢.') },
      { t: T('新元件<part-ref to="part:assumption"></part-ref>：第一个目标和它的一条已知合一，对上了，这个目标就证完了。', 'A new part, <part-ref to="part:assumption"></part-ref>: it unifies the first goal with one of its givens; when one fits, that goal is done.') },
    ],
    solution: script(['rule', 'impI'], ['rule', 'impI'], ['rule', 'conjI'], 'assumption', 'assumption'),
    after: T('框里的假设，在这里就是目标的已知。往回推到已知里有的东西，证明就完了。', 'An assumption in a box is, here, a given of the goal. Reasoning back until you reach what is given finishes the proof.'),
  }),
  prove({
    id: 'r-meta',
    title: T('还没定下来的 ?A', 'An ?A not settled yet'),
    tests: [{ goal: 'Wet', hyps: ['Rain → Wet', 'Rain'] }, { goal: 'Slip', hyps: ['Wind', 'Wet → Slip', 'Wet'] }, { goal: 'Wind ∧ Wet', hyps: ['Rain → Wind ∧ Wet', 'Rain'] }],
    brief: T('接一台机器，证完每一个目标。', 'Wire a machine that proves every goal.'),
    hint: [T('倒着套用：结论 ?B 对上目标，?A 留在两个新目标里。第一个新目标对上一条已知时，?A 就定下来了。', 'Apply backwards: its conclusion ?B fits the goal, and ?A is left in the two new goals. When the first new goal fits a given, ?A is settled.')],
    intro: [{ t: T('套用写成规则是 ⟦?A → ?B; ?A⟧ ⟹ ?B。结论 ?B 对上目标「地湿」，可 ?A 从目标里读不出来：它原样留在两个新目标里。等后面一个元件让第一个新目标和一条已知合一，?A 就定下来，第二个目标也跟着变成那一句。', 'Apply as a rule is ⟦?A → ?B; ?A⟧ ⟹ ?B. Its conclusion ?B fits the goal “the ground is wet”, but ?A cannot be read off the goal: it stays as it is in the two new goals. When a later part unifies the first new goal with a given, ?A is settled, and the second goal becomes that sentence too.') }],
    solution: script(['rule', 'mp'], 'assumption', 'assumption'),
    after: T('一个 ? 可以留着，等证明走到能定下它的地方再定：所有目标共用同一个 ?A，它是一个等着填的洞。', 'A ?-letter can wait until the proof reaches a place that settles it: every goal shares the same ?A, a hole waiting to be filled.'),
  }),
  {
    id: 'r-lemma',
    title: T('证出的引理也是规则', 'Lemmas are rules too'),
    tasks: [
      prove({
        step: T('串联', 'Chain'),
        tests: [{ goal: 'Rain → Slip', hyps: ['Rain → Wet', 'Wet → Slip'] }, { goal: 'Alarm → Awake', hyps: ['Alarm → Coffee', 'Coffee → Awake'] }],
        brief: T('接一台机器，用你证出的串联证完每一个目标。', 'Wire a machine that proves every goal with the Chain you proved.'),
        hint: [T('串联的中间那一句，目标里没有：它是个 ?，等已知来定。', 'Chain’s middle sentence is not in the goal: it is a ?-letter for a given to settle.')],
        solution: script(['rule', 'chain'], 'assumption', 'assumption'),
      }),
      prove({
        step: T('交换', 'Swap'),
        tests: [{ goal: 'Wind → (Rain → Wet)', hyps: ['Rain → (Wind → Wet)'] }, { goal: 'Coffee → (Alarm → Awake)', hyps: ['Alarm → (Coffee → Awake)'] }],
        brief: T('再用交换证完每一个目标。', 'Now prove every goal with Swap.'),
        hint: [T('交换的前提只有一条，正是已知那一句。', 'Swap has one premise, and it is just the given.')],
        solution: script(['rule', 'swap'], 'assumption'),
      }),
      prove({
        step: T('德摩根', 'De Morgan'),
        tests: [{ goal: '¬Rain ∧ ¬Wind', hyps: ['¬(Rain ∨ Wind)'] }, { goal: '¬Wet ∧ ¬Slip', hyps: ['¬(Wet ∨ Slip)'] }],
        brief: T('再用德摩根证完每一个目标。', 'Now prove every goal with De Morgan.'),
        hint: [T('德摩根的每一种形状都是一条规则，选结论对得上的那一种。', 'Each shape of De Morgan is a rule of its own: choose the one whose conclusion fits.')],
        solution: script(['rule', 'dm.notOr'], 'assumption'),
      }),
    ],
    intro: [{ t: T('证出的引理，本来就是「有了这些，就得到那个」：串联是 ⟦?A → ?B; ?B → ?C⟧ ⟹ ?A → ?C。它和证明核的规则一样能倒着用，元件上都能选到。', 'A lemma you proved already says “given these, you get that”: Chain is ⟦?A → ?B; ?B → ?C⟧ ⟹ ?A → ?C. It can be used backwards just like the kernel’s rules, and the part offers it too.') }],
    after: T('核的规则和证出的引理，在用规则的元件上没有分别：都是带 ? 的规则。证一条引理，就是给证明器添一条规则。', 'On the rule part, the kernel’s rules and the lemmas you proved are no different: all are rules with ?-letters. Proving a lemma adds a rule to the prover.'),
  },

  // ---------- using hypotheses up ----------
  prove({
    id: 'r-elim',
    title: T('先用规则，再对上已知', 'A rule, then a given'),
    want: 'becomes',
    builds: 'erule',
    builtWith: { rule: 'conjE' },
    tests: [
      { goal: 'Wind ∧ Rain', hyps: ['Rain ∧ Wind'], becomes: [['Rain ∧ Wind; Rain; Wind ⊢ Wind ∧ Rain']] },
      { goal: 'Slip', hyps: ['Wet ∧ Slip'], becomes: [['Wet ∧ Slip; Wet; Slip ⊢ Slip']] },
      { goal: 'Wind ∧ Wet', hyps: ['Rain', 'Wet ∧ Wind'], becomes: [['Rain; Wet ∧ Wind; Wet; Wind ⊢ Wind ∧ Wet']] },
    ],
    brief: T('接一台机器：拆开「并且」那条已知，把每个目标变成要的样子。造出的机器是新元件<part-ref to="lemma:erule"></part-ref>，规则留到元件上去选。', 'Wire a machine that takes the “and” given apart, turning each goal into the one wanted. The machine becomes a new part, <part-ref to="lemma:erule"></part-ref>, the rule left to choose on the part.'),
    hint: [T('倒着用拆开 ∧，第一个新目标全是 ?：拿已知里有去定它。', 'Split ∧ used backwards leaves a first goal made of ?-letters: let Assumption settle it.')],
    intro: [
      { t: T('到这里用过的规则，都是看目标的：结论对上目标，前提成了新目标。拆开 ∧ 写成规则是 ⟦?A ∧ ?B; ⟦?A; ?B⟧ ⟹ ?C⟧ ⟹ ?C：结论 ?C 对得上任何目标，第一条前提 ?A ∧ ?B 却从目标里读不出来，成了一个全是 ? 的目标。', 'The rules used so far all look at the goal: the conclusion fits it, the premises become new goals. Split ∧ as a rule is ⟦?A ∧ ?B; ⟦?A; ?B⟧ ⟹ ?C⟧ ⟹ ?C: its conclusion ?C fits any goal, but its first premise ?A ∧ ?B cannot be read off the goal, and becomes a goal made of ?-letters.') },
      { t: T('这个目标里的 ?，只有已知能定：一条「并且」的已知对上它，?A、?B 就是那两半，下一个目标的已知里多了这两句。', 'Only a given can settle the ?-letters of that goal: an “and” among the givens fits it, ?A and ?B are its two halves, and the next goal gains those two among its givens.') },
    ],
    solution: script(['rule', 'conjE'], 'assumption'),
    after: T('拆开 ∧ 这样的规则叫<b>消去规则</b>：第一条前提要对上一条已知，结论什么都行。用规则、紧接着拿已知去对第一条前提，这两步总是连着走，所以接成了一个元件。原来那条「并且」还留在已知里。', 'A rule like Split ∧ is an <b>elimination rule</b>: its first premise must fit a given, and its conclusion fits anything. Use the rule, then fit its first premise with a given at once: these two steps always go together, so they became one part. The “and” itself stays among the givens.'),
  }),
  prove({
    id: 'r-cases',
    title: T('分情况', 'Case by case'),
    tests: [{ goal: 'Wind ∨ Rain', hyps: ['Rain ∨ Wind'] }, { goal: 'Slip ∨ Wet', hyps: ['Wet ∨ Slip'] }, { goal: 'Bike ∨ Bus', hyps: ['Bus ∨ Bike'] }],
    brief: T('接一台机器，证完每一个目标。', 'Wire a machine that proves every goal.'),
    hint: [T('分情况对上「或者」那条已知，就有两个目标，各有一边在已知里。引入 ∨ 有左右两条规则。', 'Case by case on the “or” given leaves two goals, each with one side among its givens. Bring in ∨ has two rules, left and right.')],
    intro: [{ t: T('<part-ref to="lemma:erule"></part-ref>不只拆「并且」：元件上能选任何一条消去规则。分情况写成规则是 ⟦?A ∨ ?B; ⟦?A⟧ ⟹ ?C; ⟦?B⟧ ⟹ ?C⟧ ⟹ ?C：第一条前提对上「或者」那条已知，剩下两条前提成了两个目标，各多了「或者」的一边。', '<part-ref to="lemma:erule"></part-ref> takes apart more than “and”: any elimination rule can be chosen on it. Case by case as a rule is ⟦?A ∨ ?B; ⟦?A⟧ ⟹ ?C; ⟦?B⟧ ⟹ ?C⟧ ⟹ ?C: its first premise fits the “or” given, and the other two become two goals, each with one side of the “or” added.') }],
    solution: script(['erule', 'disjE'], ['rule', 'disjI2'], 'assumption', ['rule', 'disjI1'], 'assumption'),
    after: T('消去规则拆已知，引入规则拆目标：一个从上往下，一个从下往上，在中间碰头。', 'Elimination rules take givens apart, introduction rules take goals apart: one works down from the top, the other up from the bottom, and they meet in the middle.'),
  }),
  prove({
    id: 'r-false',
    title: T('自相矛盾的已知', 'Givens that contradict'),
    tests: [{ goal: 'Pigs', hyps: ['Rain', '¬Rain'] }, { goal: 'Moon', hyps: ['¬Wet', 'Wet'] }],
    brief: T('接一台机器，证完每一个目标。', 'Wire a machine that proves every goal.'),
    hint: [T('先把目标换成 ⊥。¬下雨 就是 下雨 → ⊥：套用也能对上它。', 'First turn the goal into ⊥. ¬it rains is it rains → ⊥: Apply fits it too.')],
    intro: [{ t: T('目标是一句和已知毫不相干的话，已知里却有一对自相矛盾的句子。证明板上，这时先接出 ⊥，再由矛盾推出一切；倒着走，次序反过来。', 'The goal has nothing to do with the givens, yet among the givens is a pair that contradict each other. On the proof board you would wire out ⊥ first, then from contradiction get anything; going backwards, the order turns round.') }],
    solution: script(['rule', 'botE'], ['erule', 'mp'], 'assumption'),
    after: T('套用当消去规则用：第一条前提 ?A → ?B 对上已知 ¬下雨，因为 ¬下雨 就是 下雨 → ⊥。合一器看的是句子的形状，不是它写成什么样子。', 'Apply as an elimination rule: its first premise ?A → ?B fits the given ¬it rains, since ¬it rains is it rains → ⊥. The unifier looks at a sentence’s shape, not at how it is written.'),
  }),
  prove({
    id: 'r-dist',
    title: T('分配', 'Distribution'),
    tests: [{ goal: 'Rain ∧ (Wind ∨ Wet) → (Rain ∧ Wind) ∨ (Rain ∧ Wet)' }, { goal: 'Sat ∧ (Bus ∨ Bike) → (Sat ∧ Bus) ∨ (Sat ∧ Bike)' }],
    brief: T('接一台机器，证完每一个目标。', 'Wire a machine that proves every goal.'),
    hint: [T('先把能拆的已知都拆开，再分两种情况，每种情况各选「或者」的一边拼出来。', 'First take apart every given that comes apart, then split into two cases, and in each build the side of the “or” it needs.')],
    intro: [{ t: T('<level-ref to="dist"></level-ref>里，这句话在证明板上用了好几个框。这一次，从目标往回推。', 'In <level-ref to="dist"></level-ref> this sentence took several boxes on the proof board. This time, reason back from the goal.') }],
    solution: script(['rule', 'impI'], ['erule', 'conjE'], ['erule', 'disjE'], ['rule', 'disjI1'], ['rule', 'conjI'], 'assumption', 'assumption', ['rule', 'disjI2'], ['rule', 'conjI'], 'assumption', 'assumption'),
    after: T('接出来的这一串元件，就是一段证明脚本：每个元件一行。框没有了，假设成了目标的已知。', 'This row of parts is a proof script: one part, one line. The boxes are gone; assumptions became goals’ givens.'),
  }),

  // ---------- quantifiers and patterns ----------
  unify({
    id: 'r-pattern',
    title: T('做成函数', 'Making a function'),
    adds: ['uPattern'],
    tests: [{ eqs: ['∀x. ?P(x) ≐ ∀x. Human(x) → Mortal(x)'] }, { eqs: ['∃y. ?P(y) ∧ ?A ≐ ∃x. Likes(x, ann) ∧ Rain'] }, { eqs: ['∀x. ?A ≐ ∀x. Human(x)'] }, { eqs: ['∀x. ?P(x) ∧ ?P(ann) ≐ ∀x. Likes(x, x) ∧ Likes(ann, bo)'] }],
    brief: T('接一台机器：把每组等式解到底；对不上或者没有解的，说「失败」。', 'Wire a machine that solves each set of equations to the end, or says “failed” when they do not fit or have no solution.'),
    hint: [T('合一器先做它会做的；剩下 ?P(x) 那样的等式，交给新元件，解出来以后可能还要再合一一遍。', 'Let the unifier do what it can; an equation like ?P(x) that is left goes to the new part, and once it is solved there may be more unifying to do.')],
    intro: [
      { t: T('量词的规则里，元变量后面跟着变量：任取是 ⟦⋀x. ?P(x)⟧ ⟹ ∀x. ?P(x)。?P 不是一句话，是「一句关于 x 的话」。∀x. ?P(x) ≐ ∀x. x是人 → x会死，要解出 ?P ≐ fun x => x是人 → x会死：把 x 当参数，?P 是一个函数。', 'In the quantifier rules a metavariable is followed by variables: For any is ⟦⋀x. ?P(x)⟧ ⟹ ∀x. ?P(x). ?P is not a sentence but “a sentence about x”. ∀x. ?P(x) ≐ ∀x. x is human → x is mortal must give ?P ≐ fun x => x is human → x is mortal: with x as its parameter, ?P is a function.') },
      { t: T('两个「对所有」拆开时，两边的身体用同一个变量，等式前面记上 ⋀x：x 是量词管着的。?A 不能带走 x，所以 ∀x. ?A ≐ ∀x. x是人 没有解（发生检查也查这个）；?P(x) 可以，它本来就是关于 x 的。新元件<part-ref to="part:uPattern"></part-ref>：?P 后面跟着各不相同的 ⋀ 变量时，解出 ?P。', 'When two “for all” are split, both bodies get the same variable, and the equation is marked ⋀x: x is bound by a quantifier. ?A may not take x out with it, so ∀x. ?A ≐ ∀x. x is human has no solution (the occurs check checks this too); ?P(x) may, being about x in the first place. A new part, <part-ref to="part:uPattern"></part-ref>: when ?P is followed by distinct ⋀ variables, it solves ?P.') },
    ],
    solution: looped(['unifier', 'uPattern']),
    after: T('元变量只跟着各不相同的约束变量时，解只有一个，这叫<b>高阶模式</b>（Miller 模式）。?P(安) ≐ 安喜欢安 就不是模式：?P 可以是「x喜欢x」「安喜欢x」「x喜欢安」……解不止一个，机器不猜。', 'When a metavariable is followed only by distinct bound variables there is one solution: a <b>higher-order pattern</b> (Miller’s patterns). ?P(Ann) ≐ Ann likes Ann is no pattern: ?P could be “x likes x”, “Ann likes x”, “x likes Ann” …; there is more than one solution, and the machine does not guess.'),
  }),
  unify({
    id: 'r-patterns',
    title: T('几个变量', 'Several variables'),
    tests: [{ eqs: ['∀x. ∀y. ?P(x, y) ≐ ∀x. ∀y. Likes(x, y) ∨ Likes(y, x)'] }, { eqs: ['∀x. ?P(x) ∧ ?Q(x) ≐ ∀y. Human(y) ∧ Likes(y, ann)'] }, { eqs: ['∀x. ∀y. ?P(y, x) ≐ ∀x. ∀y. Likes(x, y)'] }, { eqs: ['∀x. ?P(x) ∧ ?A ≐ ∀y. Likes(y, ann) ∧ Likes(y, bo)'] }],
    brief: T('接一台机器：把每组等式解到底；对不上或者没有解的，说「失败」。', 'Wire a machine that solves each set of equations to the end, or says “failed” when they do not fit or have no solution.'),
    hint: [T('?P 后面跟着几个变量，解出的函数就有几个参数，次序照 ?P 后面的次序。', 'However many variables follow ?P, the function found has that many parameters, in the order they follow ?P.')],
    intro: [{ t: T('一句话可以同时说两样东西：?P(x, y) 是一句关于 x 和 y 的话。两个「对所有」一层层拆开，等式前面记上 ⋀x y；?P 后面跟着两个不同的约束变量，还是模式。', 'A sentence may speak of two things at once: ?P(x, y) is a sentence about x and y. Two “for all” split one after the other mark the equation ⋀x y; ?P followed by two distinct bound variables is still a pattern.') }],
    solution: looped(['unifier', 'uPattern']),
    after: T('模式只看 ?P 后面是不是各不相同的约束变量，几个都行，次序也随意。后面不跟变量的 ?A，还是不能把约束变量带走。', 'A pattern only asks that ?P be followed by distinct bound variables, however many, in any order. An ?A followed by none still may not take a bound variable out.'),
  }),
  prove({
    id: 'r-allI',
    title: T('任取倒过来', 'For any, backwards'),
    tests: [{ goal: '∀x. Student(x) ∧ Human(x) → Human(x) ∧ Student(x)' }, { goal: '∀y. Bird(y) ∧ Flies(y) → Flies(y) ∧ Bird(y)' }],
    brief: T('接一台机器，证完每一个目标。', 'Wire a machine that proves every goal.'),
    hint: [T('任取倒过来用，目标前面多了 ⋀a：a 是随便取的一样东西。剩下的和「拼成、拆开」的老办法一样。', 'For any backwards puts ⋀a in front of the goal: a is any thing at all. The rest is the old business of splitting and joining.')],
    intro: [{ t: T('倒着用任取 ⟦⋀x. ?P(x)⟧ ⟹ ∀x. ?P(x)：合一器解出 ?P 是一句关于 x 的话，新目标是 ⋀a. ?P(a)，前面的 ⋀a 说 a 是随便取的一样东西，目标要对它成立。', 'For any used backwards, ⟦⋀x. ?P(x)⟧ ⟹ ∀x. ?P(x): the unifier finds ?P, a sentence about x, and the new goal is ⋀a. ?P(a), the ⋀a saying a is any thing at all, and the goal must hold of it.') }],
    solution: script(['rule', 'allI'], ['rule', 'impI'], ['erule', 'conjE'], ['rule', 'conjI'], 'assumption', 'assumption'),
    after: T('⋀ 是规则自己的「对所有」，它管的是目标，不是句子：「这个目标对随便取的 a 都要成立」。', '⋀ is the rules’ own “for all”, ruling over goals, not sentences: “this goal must hold for any a taken”.'),
  }),
  prove({
    id: 'r-exI',
    title: T('举例倒过来', 'Example, backwards'),
    tests: [{ goal: '∃x. Human(x) ∧ Likes(x, ann)', hyps: ['Human(bo)', 'Likes(bo, ann)'] }, { goal: '∃x. Bird(x) ∧ Flies(x)', hyps: ['Flies(cy)', 'Bird(cy)'] }, { goal: '∃y. Student(y) ∧ School(y)', hyps: ['Student(dee)', 'School(dee)'] }],
    brief: T('接一台机器，证完每一个目标。', 'Wire a machine that proves every goal.'),
    hint: [T('举例倒过来，例子是一个 ?t。让已知去定它。', 'Example backwards leaves the example as ?t. Let a given settle it.')],
    intro: [{ t: T('举例写成规则是 ⟦?P(?t)⟧ ⟹ ∃x. ?P(x)。?t 是一样东西的元变量：倒着用，例子从目标里读不出来，就留着 ?t，等哪条已知对上了再定。<level-ref to="q-exI"></level-ref>里，有几句「存在」时要你在元件上选「要得出」哪一句；倒着用规则，目标自己就说了。', 'Example as a rule is ⟦?P(?t)⟧ ⟹ ∃x. ?P(x). ?t is a metavariable for a thing: used backwards, the example cannot be read off the goal, so ?t is left until some given fits. In <level-ref to="q-exI"></level-ref>, with several “there is” sentences, you chose on the part which to conclude; with a rule used backwards, the goal says so itself.') }],
    solution: script(['rule', 'exI'], ['rule', 'conjI'], 'assumption', 'assumption'),
    after: T('例子是谁，是第一个对上已知的目标定下的；第二个目标里的 ?t 跟着就变成了同一个人。', 'Who the example is was settled by the first goal to fit a given; the ?t in the second goal became the same one with it.'),
  }),
  prove({
    id: 'r-drule',
    title: T('往前推一步', 'One step forward'),
    want: 'becomes',
    builds: 'frule',
    builtWith: { rule: 'spec' },
    tests: [
      { goal: 'Mortal(soc)', hyps: ['∀x. Human(x) → Mortal(x)', 'Human(soc)'], becomes: [['∀x. Human(x) → Mortal(x); Human(soc); Human(?t) → Mortal(?t) ⊢ Mortal(soc)']] },
      { goal: 'Flies(cy)', hyps: ['∀x. Bird(x) → Flies(x)', 'Bird(cy)'], becomes: [['∀x. Bird(x) → Flies(x); Bird(cy); Bird(?t) → Flies(?t) ⊢ Flies(cy)']] },
      { goal: 'Likes(ann, bo)', hyps: ['Human(bo)', '∀y. Human(y) → Likes(ann, y)'], becomes: [['Human(bo); ∀y. Human(y) → Likes(ann, y); Human(?t) → Likes(ann, ?t) ⊢ Likes(ann, bo)']] },
    ],
    brief: T('接一台机器：从「对所有」那条已知取一个，加进已知，把每个目标变成要的样子。造出的机器是新元件<part-ref to="lemma:frule"></part-ref>，规则留到元件上去选。', 'Wire a machine that takes one from the “for all” given and adds it to the givens, turning each goal into the one wanted. The machine becomes a new part, <part-ref to="lemma:frule"></part-ref>, the rule left to choose on the part.'),
    hint: [T('先证一句倒着用，第一个目标是一个光秃秃的 ?A；规则对已知选取一个，?A 就从「对所有」那条已知里定下来。', 'Have used backwards leaves a bare ?A as the first goal; Rule on a given with Take one settles ?A from the “for all” given.')],
    intro: [
      { t: T('取一个写成规则是 ⟦∀x. ?P(x)⟧ ⟹ ?P(?t)。倒着用，结论 ?P(?t) 要对上「苏格拉底会死」：?P 后面跟的是 ?t，不是约束变量。?P 是「x会死」、?t 是苏格拉底？还是 ?P 就是「苏格拉底会死」、?t 随便？解不止一个，合一器不猜，元件对不上。', 'Take one as a rule is ⟦∀x. ?P(x)⟧ ⟹ ?P(?t). Backwards, its conclusion ?P(?t) must fit “Socrates is mortal”: ?P is followed by ?t, not by a bound variable. Is ?P “x is mortal” with ?t Socrates, or is ?P just “Socrates is mortal” with ?t anything? There is more than one solution, the unifier does not guess, and the part does not fit.') },
      { t: T('证明板上不用倒着来：取一个接在「对所有」那条已知后面，得出的一句再接给别的元件。中间得出一句、再拿来用，写成规则是<b>先证一句</b> ⟦?A; ⟦?A⟧ ⟹ ?C⟧ ⟹ ?C。倒着用它，多出一个目标 ?A，证出来的 ?A 进了下一个目标的已知。', 'On the proof board there was no need to go backwards: Take one wired after the “for all” given, and what it gave wired on. Getting a sentence on the way and then using it is, as a rule, <b>Have</b>: ⟦?A; ⟦?A⟧ ⟹ ?C⟧ ⟹ ?C. Used backwards it adds a goal ?A, and the ?A proved joins the next goal’s givens.') },
    ],
    solution: script(['rule', 'cut'], ['erule', 'spec']),
    after: T('这就是从已知<b>往前推</b>：规则的第一条前提对上一条已知，结论加进已知，原来那条还在。有的规则只能倒着用（任取），有的只好往前推（取一个）：看合一的时候，是哪一边带着约束变量。', 'This is reasoning <b>forward</b> from a given: the rule’s first premise fits a given, its conclusion joins the givens, and the given stays. Some rules only go backwards (For any), some only forwards (Take one): it depends on which side carries the bound variable when unifying.'),
  }),
  prove({
    id: 'r-frule',
    title: T('同一条用两次', 'The same given twice'),
    tests: [{ goal: 'Even(s(s(s(s(zero)))))', hyps: ['∀x. Even(x) → Even(s(s(x)))', 'Even(zero)'] }, { goal: 'Odd(s(s(s(s(s(zero))))))', hyps: ['∀x. Odd(x) → Odd(s(s(x)))', 'Odd(s(zero))'] }],
    brief: T('接一台机器，证完每一个目标。', 'Wire a machine that proves every goal.'),
    hint: [T('「对所有」那一句要往前推两次，每次留下一个自己的 ?t。', 'The “for all” given is taken forward twice, each time leaving a ?t of its own.')],
    intro: [{ t: T('往前推不拿走原来那条已知：「对所有」那一句推过一次还在，还能再推一次，取另一样东西。', 'Going forward does not take the given away: the “for all” sentence is still there after one step, and can go forward again, for another thing.') }],
    solution: script(['frule', 'spec'], ['frule', 'spec'], ['erule', 'mp'], ['erule', 'mp'], 'assumption'),
    after: T('两次往前推各留下一个 ?t，名字各不相同：一个定成 0+1+1，一个定成 0。', 'Going forward twice left two ?t letters with names of their own: one became 0+1+1, the other 0.'),
  }),
  prove({
    id: 'r-exE',
    title: T('拿出那一个倒过来', 'Taking out, backwards'),
    tests: [{ goal: 'Pigs', hyps: ['∃x. Human(x) ∧ ¬Human(x)'] }, { goal: 'Moon', hyps: ['∃y. ¬Bird(y) ∧ Bird(y)'] }],
    brief: T('接一台机器，证完每一个目标。', 'Wire a machine that proves every goal.'),
    hint: [T('规则对已知选拿出那一个，对上「存在」那条已知：那一样东西叫 a，目标前面多了 ⋀a。', 'Rule on a given with Take the one there is, on the “there is” given: that thing is called a, and ⋀a comes in front of the goal.')],
    intro: [{ t: T('拿出那一个写成规则是 ⟦∃x. ?P(x); ⋀x. ⟦?P(x)⟧ ⟹ ?C⟧ ⟹ ?C。它也是消去规则：第一条前提对上一条「存在」，第二条前提前面的 ⋀x，让新目标里多出一样叫 a 的东西和关于它的已知。', 'Take the one there is as a rule is ⟦∃x. ?P(x); ⋀x. ⟦?P(x)⟧ ⟹ ?C⟧ ⟹ ?C. It is an elimination rule too: its first premise fits a “there is”, and the ⋀x in front of the second gives the new goal a thing called a and a given about it.') }],
    solution: script(['rule', 'botE'], ['erule', 'exE'], ['erule', 'conjE'], ['erule', 'mp'], 'assumption'),
    after: T('a 是这个目标自己取出来的：它前面写着 ⋀a，只在这个目标里有。', 'a was taken out by this goal itself: the ⋀a in front of it says a exists only within this goal.'),
  }),

  // ---------- challenge ----------
  prove({
    id: 'r-order',
    title: T('先拿出来', 'Take it out first'),
    tests: [{ goal: '∃x. Likes(x, ann) ∧ Human(x)', hyps: ['∃x. Human(x) ∧ Likes(x, ann)'] }, { goal: '∃y. Flies(y) ∧ Bird(y)', hyps: ['∃x. Bird(x) ∧ Flies(x)'] }],
    brief: T('接一台机器，证完每一个目标。', 'Wire a machine that proves every goal.'),
    hint: [T('?t 能变成什么，看它是什么时候留下的。', 'What ?t may become depends on when it was left.')],
    intro: [{ t: T('有一个又是人、又喜欢安的人，所以有一个喜欢安、又是人的人。目标和已知里都有「存在」：一个要举例，一个要拿出来。', 'Someone is human and likes Ann, so someone likes Ann and is human. Both the goal and the given say “there is”: one needs an example, the other a taking out.') }],
    solution: script(['erule', 'exE'], ['erule', 'conjE'], ['rule', 'exI'], ['rule', 'conjI'], 'assumption', 'assumption'),
    naive: script(['rule', 'exI'], ['erule', 'exE'], ['erule', 'conjE'], ['rule', 'conjI'], 'assumption', 'assumption'),
    after: T('先举例，?t 就在 a 被拿出来之前留下了，它不能变成后来才有的 a：这和<level-ref to="q-witness"></level-ref>里拿出来的名字不能带出框，是同一条规矩。先拿出来，再举例。', 'Give the example first, and ?t was left before a was taken out; it cannot become an a that came later: the same rule as in <level-ref to="q-witness"></level-ref>, where a name taken out could not leave its box. Take it out first, then give the example.'),
  }),
]
