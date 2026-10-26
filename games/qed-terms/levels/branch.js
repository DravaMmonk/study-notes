// The proof-term branch of 《证明完毕》's course: Q.E.D.'s own (../../qed/levels), with every proof-state level from
// chapter 7 on building its proof term (`terms`), the copy of the levels where the term grows telling how, and one
// more level at the end of chapter 8: a shortcut the kernel refuses.
import { logicCourse } from '../../kit/domains/logic/course.js'
import { COURSE } from '../../qed/levels/index.js'
import { script } from '../../qed/levels/metavars.js'

const T = (zh, en) => ({ zh, en })

// A level's copy as this branch tells it: its intro paragraphs, or what its pass text adds.
const COPY = {
  'r-rule': {
    intro: [
      { t: T('有了合一器，就能<b>倒着用规则</b>。新元件<part-ref to="part:rule"></part-ref>：元件上选一条规则，它把第一个目标和规则的结论合一，再把目标换成规则的前提，每条前提一个新目标。没有前提的规则对上了，目标就证完了。', 'With the unifier, rules can be <b>used backwards</b>. A new part, <part-ref to="part:rule"></part-ref>: choose a rule on the part; it unifies the first goal with the rule’s conclusion and replaces the goal with the rule’s premises, a new goal for each. A rule with no premises that fits finishes the goal.') },
      { t: T('线上传的东西换了：从这里起，线上是<b>证明状态</b>。上一章里，一个证明就是一个证明项；倒着证，证明项是一点点填出来的。每个还没证完的目标，是证明项里一个还没填的<b>洞</b>，写作 ?m0、?m1。用一条规则，就是往洞里填上这条规则的证明项，规则的每条前提留成一个新洞。元件上能选的，是证明核的规则，还有你证出的每一条引理。', 'What the wires carry has changed: from here on, a <b>proof state</b>. Last chapter a proof was a proof term; proving backwards, the term is filled in bit by bit. Each goal still open is a <b>hole</b> in the term not yet filled, written ?m0, ?m1. Using a rule fills a hole with the rule’s own term, each premise of the rule left as a new hole. The part offers the kernel’s rules and every lemma you have proved.') },
    ],
    after: T('K 是一条证出的引理，填进洞里的就是它的名字 axK。三个目标，证明项都是这一个名字，?A、?B 每次由目标定下来：元件不用再问你填什么。', 'K is a lemma you proved, and what fills the hole is its name, axK. Three goals, one term for all, ?A and ?B settled by the goal each time: the part no longer asks you what to fill in.'),
  },
  'r-subgoals': {
    intro: [{ t: T('拼成 ∧ 的证明项是一对。倒着用它，洞 ?m0 填成 ⟨?m1, ?m2⟩：一对的两半是两个新洞，也就是两个新目标，排成一列。元件总是对第一个目标下手。', 'The term of Join ∧ is a pair. Used backwards, the hole ?m0 is filled with ⟨?m1, ?m2⟩: the pair’s two halves are two new holes, that is, two new goals, in a row. A part always works on the first goal.') }],
    after: T('目标排成一列，一个元件处理排头的那个；证完一个，就填上了一个洞。两个洞都填上，证明项就是 ⟨axK, lem⟩。', 'The goals stand in a row, and a part deals with the first; each goal proved fills a hole. With both filled, the term is ⟨axK, lem⟩.'),
  },
  'r-assumption': {
    intro: [
      { t: T('假设框写成规则是 ⟦⟦?A⟧ ⟹ ?B⟧ ⟹ ?A → ?B，它的证明项是 fun h => ?m。倒着用，目标 A → B 变成「已知 A，证 B」：A 加进这个目标的已知，写在 ⊢ 前面，它的证明项就是 h。从这里起，目标的每条已知前面都写着它的证明项：p、q 是一开始给的已知，h1、h2 是假设框给的。', 'The assumption box as a rule is ⟦⟦?A⟧ ⟹ ?B⟧ ⟹ ?A → ?B, and its term is fun h => ?m. Used backwards, the goal A → B becomes “given A, prove B”: A joins that goal’s givens, written before ⊢, and its term is h. From here on each given of a goal shows its term in front: p and q are the givens of the start, h1 and h2 come from assumption boxes.') },
      { t: T('新元件<part-ref to="part:assumption"></part-ref>：第一个目标和它的一条已知合一，对上了，就拿那条已知的证明项填这个洞。', 'A new part, <part-ref to="part:assumption"></part-ref>: it unifies the first goal with one of its givens, and when one fits, fills the hole with that given’s term.') },
    ],
    after: T('框里的假设，在这里就是目标的已知；拿已知填洞，证明项里就是它的名字。fun h1 h2 => ⟨h1, h2⟩：每个洞都填上了，证明就完了。', 'An assumption in a box is, here, a given of the goal; filling a hole with it puts its name in the term. fun h1 h2 => ⟨h1, h2⟩: every hole filled, and the proof is done.'),
  },
  'r-meta': {
    intro: [{ t: T('套用写成规则是 ⟦?A → ?B; ?A⟧ ⟹ ?B，证明项是应用 ?m1 ?m2。结论 ?B 对上目标「地湿」，可 ?A 从目标里读不出来：它原样留在两个新目标里。等后面一个元件让第一个新目标和一条已知合一，?A 就定下来，第二个目标也跟着变成那一句。两种 ? 别弄混：?A 是句子里还没定下来的地方，?m 是证明项里还没填的地方。', 'Apply as a rule is ⟦?A → ?B; ?A⟧ ⟹ ?B, its term the application ?m1 ?m2. Its conclusion ?B fits the goal “the ground is wet”, but ?A cannot be read off the goal: it stays as it is in the two new goals. When a later part unifies the first new goal with a given, ?A is settled, and the second goal becomes that sentence too. Do not mix the two kinds of ?: ?A is a place in a sentence not settled yet, ?m a place in the term not filled yet.') }],
  },
  'r-lemma': {
    intro: [{ t: T('证出的引理，本来就是「有了这些，就得到那个」：串联是 ⟦?A → ?B; ?B → ?C⟧ ⟹ ?A → ?C。它和证明核的规则一样能倒着用，元件上都能选到；填进洞里的是它的名字，chain ?m1 ?m2。', 'A lemma you proved already says “given these, you get that”: Chain is ⟦?A → ?B; ?B → ?C⟧ ⟹ ?A → ?C. It can be used backwards just like the kernel’s rules, and the part offers it too; what fills the hole is its name, chain ?m1 ?m2.') }],
    after: T('核的规则和证出的引理，在用规则的元件上没有分别：都是带 ? 的规则。证一条引理，就是给证明器添一条规则。核检查证明项时，把引理的名字展开成当初证它的那个证明项，<level-ref to="t-lemma"></level-ref>里化简证明做的就是这件事。', 'On the rule part, the kernel’s rules and the lemmas you proved are no different: all are rules with ?-letters. Proving a lemma adds a rule to the prover. When the kernel checks a term, it unfolds a lemma’s name into the term that proved it, as Normalize did in <level-ref to="t-lemma"></level-ref>.'),
  },
  'r-elim': {
    after: T('拆开 ∧ 这样的规则叫<b>消去规则</b>：第一条前提要对上一条已知，结论什么都行。用规则、紧接着拿已知去对第一条前提，这两步总是连着走，所以接成了一个元件。洞 ?m0 填的是第二个洞 ?m2，拆出的两半写成 ?m1.1 和 ?m1.2：已知里有把 ?m1 填成 p，它们就是 p.1 和 p.2。', 'A rule like Split ∧ is an <b>elimination rule</b>: its first premise must fit a given, and its conclusion fits anything. Use the rule, then fit its first premise with a given at once: these two steps always go together, so they became one part. The hole ?m0 is filled with the second hole ?m2, and the two halves are written ?m1.1 and ?m1.2: once Assumption fills ?m1 with p, they are p.1 and p.2.'),
  },
  'r-cases': {
    after: T('消去规则拆已知，引入规则拆目标：一个从上往下，一个从下往上，在中间碰头。证明项 p.elim (fun h1 => …) (fun h2 => …) 正是上一章写过的分情况。', 'Elimination rules take givens apart, introduction rules take goals apart: one works down from the top, the other up from the bottom, and they meet in the middle. The term p.elim (fun h1 => …) (fun h2 => …) is the case split written last chapter.'),
  },
  'r-allI': {
    after: T('⋀ 是规则自己的「对所有」，它管的是目标，不是句子：「这个目标对随便取的 a 都要成立」。洞填成 fun a => ?m：任取倒过来，就是一个拿到 a 的函数。', '⋀ is the rules’ own “for all”, ruling over goals, not sentences: “this goal must hold for any a taken”. The hole is filled with fun a => ?m: For any backwards is a function given a.'),
  },
  'r-exI': {
    after: T('例子是谁，是第一个对上已知的目标定下的；第二个目标里的 ?t 跟着就变成了同一个人。洞填成 ⟨?t, ?m⟩，?t 定下来以后，证明项是 ⟨bo, ⟨p, q⟩⟩。', 'Who the example is was settled by the first goal to fit a given; the ?t in the second goal became the same one with it. The hole is filled with ⟨?t, ?m⟩, and once ?t is settled the term is ⟨bo, ⟨p, q⟩⟩.'),
  },
  'r-drule': {
    after: T('这就是从已知<b>往前推</b>：规则的第一条前提对上一条已知，结论加进已知，原来那条还在。先证一句在证明项里不留下名字：证出 ?A 的那个洞，直接成了新已知的证明项，取一个对上 p，新已知就是 p ?t。有的规则只能倒着用（任取），有的只好往前推（取一个）：看合一的时候，是哪一边带着约束变量。', 'This is reasoning <b>forward</b> from a given: the rule’s first premise fits a given, its conclusion joins the givens, and the given stays. Have leaves no name in the term: the hole that proves ?A becomes the new given’s term, and with Take one on p the new given is p ?t. Some rules only go backwards (For any), some only forwards (Take one): it depends on which side carries the bound variable when unifying.'),
  },
  'r-exE': {
    after: T('a 是这个目标自己取出来的：它前面写着 ⋀a，只在这个目标里有。证明项 p.elim (fun a h1 => …) 和上一章一样：a 逃不出这个 fun。', 'a was taken out by this goal itself: the ⋀a in front of it says a exists only within this goal. The term p.elim (fun a h1 => …) is last chapter’s: a cannot escape this fun.'),
  },
  's-orelse': {
    after: T('策略只会用规则，每一步都往洞里填规则的证明项。证完以后，第 6 章的核把整个证明项再查一遍：不管策略怎样组合，核认的才算数，所以自动化造不出假定理。', 'A tactic only ever uses rules, each step filling a hole with a rule’s term. Once done, chapter 6’s kernel checks the whole term again: however the tactic is put together, only what the kernel accepts counts, and so automation cannot make a false theorem.'),
  },
  's-auto': {
    after: T('拿出那一个和举例谁先谁后，搜索自己会试，回溯替你找到对的顺序。搜索再复杂，证完的状态都带着一个证明项，核查过才算证完：要信的只有那个很小的核。', 'Whether to take out or give an example first, the search tries for itself, and backtracking finds the order that works. However complex the search, each finished state carries a proof term, and counts only once the kernel has checked it: the small kernel is all that must be trusted.'),
  },
}

// A machine level on proof states builds its proof term.
const onStates = (level) => level.kind === 'machine' && level.tests?.[0]?.goal !== undefined
const branched = (level) => (onStates(level) ? { ...level, terms: true, ...COPY[level.id] } : COPY[level.id] ? { ...level, ...COPY[level.id] } : level)

const trust = {
  id: 's-trust',
  kind: 'machine',
  want: 'proved',
  inputs: [{ name: 'in', label: T('目标', 'Goal') }],
  backtrack: true,
  terms: true,
  title: T('核不认的捷径', 'A shortcut the kernel refuses'),
  rules: { conv: { name: T('倒过来也成立', 'Also backwards'), premises: ['?A → ?B'], conclusion: '?B → ?A', unproved: true } },
  tests: [{ goal: 'Wet → Rain', hyps: ['Rain → Wet', 'Wet → Wind', 'Wind → Rain'] }, { goal: 'Slip → Wet', hyps: ['Wet → Slip', 'Slip → Rain', 'Rain → Wet'] }],
  brief: T('接一台机器，证完每一个目标，证明项要让核认。', 'Wire a machine that proves every goal, with a term the kernel accepts.'),
  hint: [T('「倒过来也成立」没有证明：核不认识它。', '“Also backwards” has no proof: the kernel does not know it.')],
  intro: [{ t: T('这一关多给了一条规则「倒过来也成立」：⟦?A → ?B⟧ ⟹ ?B → ?A。用它，目标一步就对上了第一条已知，机器说证完了。可这条规则谁也没证过，它的名字背后没有证明项。', 'This level gives one more rule, “Also backwards”: ⟦?A → ?B⟧ ⟹ ?B → ?A. With it the goal fits the first given in one step, and the machine says it is done. But nobody ever proved this rule: there is no proof term behind its name.') }],
  solution: script('auto'),
  naive: script(['rule', 'conv'], 'assumption'),
  after: T('机器说「证完了」不算数，核认了才算。一条没证过的规则，哪怕这一回用对了地方，核也不放它过去：自动化可以随便写，核只认填得进证明项的东西。这就是 de Bruijn 准则。', '“Done”, says the machine, and it does not count; only what the kernel accepts does. A rule nobody proved does not get past it, even where it happened to be used rightly: automation may be written any way at all, and the kernel takes only what fills a proof term. This is the de Bruijn criterion.'),
}

export const ERAS = COURSE.eras.map((era) => (era.id !== 'tactics' ? era : {
  ...era,
  foundation: era.foundation.map((step) => (step.parallel?.[0]?.id === 'auto' ? { parallel: [{ ...step.parallel[0], levels: [...step.parallel[0].levels, 's-trust'] }] } : step)),
}))

export const LOGIC = logicCourse({ ...COURSE, eras: ERAS, levels: [...COURSE.levels.map(branched), trust] })
