// Chapter 9 · The simplifier: goals that only want one place changed for another that says the same (¬¬A for A, a
// negation pushed in) take too long rule by rule, so the laws proved both ways round last chapter become rewrite
// rules, used left to right, one place at a time (the rewrite card, kit/domains/logic/rewrite.js). The card comes
// first, with double negation. Then three lines that need nothing from each other: more rules (arrows to or,
// distribution), De Morgan (negation pushed in, then brought out with the other shapes), and rewriting itself (the
// first place, then again and again). With all three, simp is built: a repeat frame round alternatives, one rewrite
// each. Then normal forms (NNF, CNF, and the order of the rules).
import { flow, script } from './machines.js'

const T = (zh, en) => ({ zh, en })
const GOAL = [{ name: 'in', label: T('目标', 'Goal') }]
// A machine on proof states that every card gives every result on (as from the tactics chapter on).
const machineLevel = (want) => (level) => ({ kind: 'machine', want, inputs: GOAL, backtrack: true, ...level })
const becomes = machineLevel('becomes')
// A task rewriting with a law.
const rewriting = (task) => becomes({ step: T('改写', 'Rewrite'), ...task })
const BRIEF = T('设计一个证明助手，把每个目标变成要的样子。', 'Design a proof assistant that turns each goal into the one wanted.')

// The rewrite rules that bring a sentence to negation normal form, and conjunctive normal form after them.
const NNF = ['arrow.elim', 'dneg.elim', 'dm.notOr', 'dm.notAnd', 'dm.notEx', 'dm.notAll']
const CNF = [...NNF, 'dist.orAndR', 'dist.orAndL']

export const simplifier = [
  // ---------- rewriting, with the laws proved last chapter ----------
  becomes({
    id: 'sp-rw',
    title: T('改写', 'Rewrite'),
    adds: ['rw'],
    tests: [
      { goal: 'Wind ∧ ¬¬Rain', becomes: [['Wind ∧ Rain']] },
      { goal: '¬¬Wet → Slip', becomes: [['Wet → Slip']] },
      { goal: '(Rain ∨ ¬¬Wind) ∧ Wet', becomes: [['(Rain ∨ Wind) ∧ Wet']] },
    ],
    intro: [
      { t: T('上一章的证明器，真值表上每一行都真的话都证得出了。可有一类目标，要做的只是把句子里的一处换成说法不同、意思相同的样子：¬¬下雨 换成 下雨，¬(下雨 ∨ 刮风) 换成 ¬下雨 ∧ ¬刮风。在证明板上，要换句子里面的一处，得把整句拆开、换掉、再一层层拼回去；句子套得越深，拼得越久。', 'Last chapter’s prover proves whatever is true on every row. But some goals only want one place in a sentence swapped for another way of saying the same: ¬¬it rains for it rains, ¬(it rains ∨ it is windy) for ¬it rains ∧ ¬it is windy. On the proof board, changing one place inside a sentence means taking the whole sentence apart, swapping it, and putting it back together level by level; the deeper the sentence, the longer it takes.') },
      { t: T('这一章给证明器装上<wiki-ref to="simplifier"></wiki-ref>：上一章证出的那几对互相推得出的句子，拿来当规则，直接在句子里换。Isabelle 和 Lean 的 simp 都是这样的程序。新元件<part-ref to="part:rw"></part-ref>：接进一条改写规则（两个方向都证过的定律，它的元件就是改写规则），它在第一个目标里找到第一处对得上规则左边的地方，换成右边。', 'This chapter fits the prover with a <wiki-ref to="simplifier"></wiki-ref>: the pairs of sentences that give each other, proved last chapter, become rules that swap one for the other right inside a sentence. Isabelle’s and Lean’s simp are such programs. A new part, <part-ref to="part:rw"></part-ref>: wire a rewrite rule into it (a law proved both ways is a rule part for rewriting), and in the first goal it finds the first place that fits the rule’s left side and puts the right side there.') },
    ],
    brief: T('设计一个证明助手，去掉每个目标里的 ¬¬。', 'Design a proof assistant that takes the ¬¬ out of each goal.'),
    hint: [T('改写接上双重否定的 ¬¬A ⟼ A。', 'Wire double negation’s ¬¬A ⟼ A into Rewrite.')],
    solution: script(['rw', 'dneg.elim']),
    after: T('¬¬A ⟼ A 是一条<wiki-ref to="rewrite"></wiki-ref>：左边换成右边，靠的是两边互相推得出。两个方向都证过，<part-ref to="lemma:dneg"></part-ref>的两个形状就都是改写规则；只证过一个方向的规则，比如反证法，不能拿来改写。改写只换一处：第一处对得上左边的地方。', '¬¬A ⟼ A is a <wiki-ref to="rewrite"></wiki-ref>: its left side becomes its right side, because the two give each other. Both directions are proved, so both shapes of <part-ref to="lemma:dneg"></part-ref> are rewrite rules; a rule proved one way only, like proof by contradiction, does not rewrite. A rewrite changes one place: the first that fits the left side.'),
  }),

  // ---------- more rewrite rules ----------
  {
    id: 'sp-laws',
    title: T('更多改写规则', 'More rewrite rules'),
    tasks: [
      rewriting({
        step: T('去掉箭头', 'Arrows away'),
        tests: [
          { goal: '(Rain → Wet) ∧ Wind', becomes: [['(¬Rain ∨ Wet) ∧ Wind']] },
          { goal: '¬(Alarm → Up)', becomes: [['¬(¬Alarm ∨ Up)']] },
          { goal: 'Wind ∨ (Rain → Slip)', becomes: [['Wind ∨ (¬Rain ∨ Slip)']] },
        ],
        brief: T('设计一个证明助手，把每个目标里的「若…则…」换成「或者」。', 'Design a proof assistant that turns the “if … then …” in each goal into an “or”.'),
        hint: [T('改写接上去掉箭头的 A → B ⟼ ¬A ∨ B。', 'Wire Arrows away’s A → B ⟼ ¬A ∨ B into Rewrite.')],
        solution: script(['rw', 'arrow.elim']),
      }),
      rewriting({
        step: T('分配', 'Distribute'),
        tests: [
          { goal: 'Rain ∨ (Wind ∧ Wet)', becomes: [['(Rain ∨ Wind) ∧ (Rain ∨ Wet)']] },
          { goal: '(Sat ∧ Rest) ∨ Happy', becomes: [['(Sat ∨ Happy) ∧ (Rest ∨ Happy)']] },
        ],
        brief: T('设计一个证明助手，把每个目标里的「或者」分配到「并且」上。', 'Design a proof assistant that distributes the “or” in each goal over the “and”.'),
        hint: [T('两种样子，两条改写规则：几条路的元件，每个框放一张改写。', 'Two shapes, two rewrite rules: Alternatives, with a rewrite in each region.')],
        solution: flow({ ways: [[['rw', 'dist.orAndR']], [['rw', 'dist.orAndL']]] }),
      }),
    ],
    intro: [{ t: T('<part-ref to="lemma:arrow"></part-ref>和<part-ref to="lemma:dist"></part-ref>也是两个方向都证过的：它们的每个形状，都是一条改写规则。', '<part-ref to="lemma:arrow"></part-ref> and <part-ref to="lemma:dist"></part-ref> are proved both ways too: each of their shapes is a rewrite rule.') }],
    after: T('一个形状一条改写规则；一个目标里有两种样子，就用几条路各放一张改写。', 'One shape, one rewrite rule; a goal that comes in two shapes takes Alternatives, a rewrite in each region.'),
  },

  // ---------- De Morgan ----------
  {
    id: 'sp-dm',
    title: T('推进否定', 'Negation pushed in'),
    tasks: [
      rewriting({
        step: T('推进括号', 'Inside the brackets'),
        tests: [{ goal: '¬(Rain ∨ Wind) → Wet', becomes: [['¬Rain ∧ ¬Wind → Wet']] }, { goal: 'Wet ∧ ¬(Sat ∧ Sun)', becomes: [['Wet ∧ (¬Sat ∨ ¬Sun)']] }],
        brief: T('设计一个证明助手，把每个目标里的否定推进括号里。', 'Design a proof assistant that pushes the negation in each goal inside the brackets.'),
        hint: [T('两种样子，两条改写规则，各放进几条路的一个框。', 'Two shapes, two rewrite rules, one in each region of Alternatives.')],
        solution: flow({ ways: [[['rw', 'dm.notOr']], [['rw', 'dm.notAnd']]] }),
      }),
      rewriting({
        step: T('推过量词', 'Past the quantifier'),
        tests: [{ goal: '¬∀x. Drinks(x)', becomes: [['∃x. ¬Drinks(x)']] }, { goal: 'Wet ∧ ¬∃x. Sings(x)', becomes: [['Wet ∧ (∀x. ¬Sings(x))']] }],
        brief: T('设计一个证明助手，把每个目标里的否定推过量词。', 'Design a proof assistant that pushes the negation in each goal past the quantifier.'),
        hint: [T('¬∀ 和 ¬∃ 各一条改写规则，各放进几条路的一个框。', 'One rewrite rule for ¬∀ and one for ¬∃, each in a region of Alternatives.')],
        solution: flow({ ways: [[['rw', 'dm.notAll']], [['rw', 'dm.notEx']]] }),
      }),
    ],
    intro: [{ t: T('<part-ref to="lemma:dm"></part-ref>的八个形状，每一个也是一条改写规则：否定穿过「或者」「并且」，穿过「存在」「对所有」，都能在句子里面直接换。', 'Each of the eight shapes of <part-ref to="lemma:dm"></part-ref> is a rewrite rule too: a negation passing through “or” and “and”, or through “there is” and “for all”, can be swapped right inside a sentence.') }],
    after: T('否定能一层层往里推了：推进括号，推过量词。', 'Negations can be pushed in level by level now: inside brackets, past quantifiers.'),
  },

  becomes({
    id: 'sp-back',
    title: T('只从左往右', 'Left to right only'),
    tests: [
      { goal: '¬Rain ∧ ¬Wind → Wet', becomes: [['¬(Rain ∨ Wind) → Wet']] },
      { goal: '¬Wet ∨ ¬Slip', becomes: [['¬(Wet ∧ Slip)']] },
      { goal: 'Happy ∧ (¬Sat ∧ ¬Sun)', becomes: [['Happy ∧ ¬(Sat ∨ Sun)']] },
    ],
    brief: T('设计一个证明助手，把每个目标里的两个否定合成一个，提到括号外面。', 'Design a proof assistant that makes the two negations in each goal one, outside the brackets.'),
    hint: [T('德摩根的另外两个形状。两种样子，两条改写规则，各放进几条路的一个框。', 'The other two shapes of De Morgan. Two shapes, two rewrite rules, one in each region of Alternatives.')],
    intro: [{ t: T('改写规则只从左往右换：¬(A ∨ B) ⟼ ¬A ∧ ¬B 能把否定推进去，却提不出来。要往外提，得用反过来的那个形状：<part-ref to="lemma:dm"></part-ref>的形状两两相反，每一个都是一条改写规则。', 'A rewrite rule only works left to right: ¬(A ∨ B) ⟼ ¬A ∧ ¬B pushes a negation in, but cannot bring it out. To bring it out takes the opposite shape: the shapes of <part-ref to="lemma:dm"></part-ref> come in opposite pairs, and each is a rewrite rule.') }],
    solution: flow({ ways: [[['rw', 'dm.andNot']], [['rw', 'dm.orNot']]] }),
    after: T('一对互相推得出的句子，两个方向是两条改写规则：往哪边改，就选哪一条。', 'Two sentences that give each other make two rewrite rules, one each way: to change one way, choose that one.'),
  }),

  // ---------- rewriting itself ----------
  becomes({
    id: 'sp-where',
    title: T('第一处', 'The first place'),
    tests: [
      { goal: '¬¬Rain ∧ ¬¬Wind', becomes: [['Rain ∧ Wind']] },
      { goal: '¬¬(¬¬Rain → Wet)', becomes: [['Rain → Wet']] },
      { goal: '¬¬¬¬Wind', becomes: [['Wind']] },
    ],
    brief: BRIEF,
    hint: [T('一张改写换一处，两处就接两张。', 'One rewrite changes one place: two places, two rewrites.')],
    intro: [{ t: T('一张<part-ref to="part:rw"></part-ref>只换一处。一个句子里对得上的地方不止一处时，它换哪一处？从外往里、从左往右，第一处对得上的。这一关的每个目标里都有两处 ¬¬。', 'One <part-ref to="part:rw"></part-ref> changes one place. When a sentence has more than one place that fits, which does it change? Outside in, left to right: the first place that fits. Each goal here has two ¬¬s.') }],
    solution: script(['rw', 'dneg.elim'], ['rw', 'dneg.elim']),
    after: T('「¬¬¬¬刮风」里，第一张改写换的是最外面的两个 ¬：外面先，里面后；同一层，左边先。', 'In “¬¬¬¬it is windy”, the first rewrite takes the outermost two ¬s: outside before inside, and on one level, left before right.'),
  }),
  becomes({
    id: 'sp-repeat',
    title: T('改到改不动', 'Until nothing fits'),
    tests: [
      { goal: '¬¬Rain', becomes: [['Rain']] },
      { goal: '¬¬Rain ∧ ¬¬Wind', becomes: [['Rain ∧ Wind']] },
      { goal: '¬¬(¬¬Rain ∨ ¬¬¬¬Wind)', becomes: [['Rain ∨ Wind']] },
    ],
    brief: BRIEF,
    hint: [T('<part-ref to="part:repeat"></part-ref>把框里的元件一圈一圈地做下去；改写对不上了，就停在前一圈。', 'A <part-ref to="part:repeat"></part-ref> runs what it holds round after round; when the rewrite no longer fits, it stops at the round before.')],
    intro: [{ t: T('这一回，每个目标里 ¬¬ 的个数都不一样：一处、两处、四处。接几张改写都不对：少了换不完，多了的那张对不上，就失败。', 'This time each goal has a different number of ¬¬s: one, two, four. No number of rewrites will do: too few leave some, and one too many fits nothing and fails.') }],
    solution: flow({ frame: 'repeat', body: [['rw', 'dneg.elim']] }),
    naive: script(['rw', 'dneg.elim'], ['rw', 'dneg.elim']),
    after: T('重复框里一张改写，就是「换到一处都不剩」。改写对不上不算错：它告诉重复框该停了。', 'One rewrite in a repeat frame means “until none is left”. A rewrite that fits nothing is no fault: it tells the frame to stop.'),
  }),

  // ---------- simp ----------
  becomes({
    id: 'sp-simp',
    title: T('几条一起', 'Several at once'),
    builds: 'simp',
    builtWith: { rewrites: 'dneg.elim,dm.notOr,dm.notAnd' },
    tests: [
      { goal: '¬(Rain ∨ ¬Wind)', becomes: [['¬Rain ∧ Wind']] },
      { goal: '¬¬¬(Rain ∧ Wind)', becomes: [['¬Rain ∨ ¬Wind']] },
      { goal: '¬(¬Rain ∨ ¬¬Wind) ∧ Wet', becomes: [['(Rain ∧ ¬Wind) ∧ Wet']] },
      { goal: 'Rain ∧ Wet', becomes: [['Rain ∧ Wet']] },
    ],
    brief: T('设计一个证明助手：去掉双重否定，把否定推进「或者」「并且」，一直改到哪一处都改不动，把每个目标变成要的样子。', 'Design a proof assistant that takes double negations off and pushes negations into “or” and “and” until nothing more changes, turning each goal into the one wanted.'),
    hint: [T('重复框里放几条路，每个框一张改写。', 'Alternatives in a repeat frame, one rewrite in each region.')],
    intro: [{ t: T('一条规则改到底，是重复框里一张改写。这一关要几条规则一起改：每一圈，哪一条对得上，就用哪一条。这就是<b>化简</b>：一组改写规则，改到哪一条都对不上为止。设计出的证明助手会成为新元件<part-ref to="lemma:simp"></part-ref>，改写规则由接进它的规则元件给出，排在一串里。', 'One rule to the end is one rewrite in a repeat frame. Here several rules work together: each round, whichever fits is used. That is <b>simplification</b>: a set of rewrite rules, used until none fits. The proof assistant you design becomes a new part, <part-ref to="lemma:simp"></part-ref>, its rewrite rules given by the rule parts wired into it, as a list.') }],
    solution: flow({ frame: 'repeat', body: [{ ways: [[['rw', 'dneg.elim']], [['rw', 'dm.notOr']], [['rw', 'dm.notAnd']]] }] }),
    after: T('重复框套着几条路，每条路一张改写：每一圈用第一条对得上的规则改一处，改到哪一条都对不上。这个证明助手成了元件<part-ref to="lemma:simp"></part-ref>：接进一串改写规则，它就照这个证明助手那样改下去。', 'A repeat frame round Alternatives, a rewrite on each way: each round the first rule that fits changes one place, until none fits. This proof assistant is now the part <part-ref to="lemma:simp"></part-ref>: wire a list of rewrite rules into it, and it rewrites just as the proof assistant did.'),
  }),

  // ---------- normal forms ----------
  becomes({
    id: 'sp-nnf',
    title: T('否定范式', 'Negation normal form'),
    tests: [
      { goal: '¬(Rain → Wet)', becomes: [['Rain ∧ ¬Wet']] },
      { goal: '¬(Rain ∧ (Wind → Wet))', becomes: [['¬Rain ∨ (Wind ∧ ¬Wet)']] },
      { goal: '¬∀x. Human(x) → Mortal(x)', becomes: [['∃x. Human(x) ∧ ¬Mortal(x)']] },
      { goal: '¬∃x. Bird(x) ∧ ¬Flies(x)', becomes: [['∀x. ¬Bird(x) ∨ Flies(x)']] },
    ],
    brief: BRIEF,
    hint: [T('去掉箭头、去掉双重否定，再把否定推过「或者」「并且」「存在」「对所有」：这些规则都接进化简。', 'Arrows away, double negation off, and negations pushed past “or”, “and”, “there is” and “for all”: wire all of these into Simp.')],
    intro: [{ t: T('<wiki-ref to="nnf"></wiki-ref>：句子里没有 →，¬ 只贴在最小的那一句上。自动证明器动手之前，先把句子化成这个样子。手里的等价律够不够？', '<wiki-ref to="nnf"></wiki-ref>: no → in the sentence, and every ¬ on a smallest sentence. Automatic provers bring a sentence to this shape before anything else. Do the laws in hand reach it?') }],
    solution: script(['simp', NNF]),
    after: T('化简接进六条规则，任何一句都化得成否定范式。每条规则都是证出的等价律，所以化出来的句子和原来的一定等价。', 'Six rules wired into Simp bring any sentence to negation normal form. Each rule is a law proved both ways, so what comes out is sure to be equivalent to what went in.'),
  }),
  becomes({
    id: 'sp-cnf',
    title: T('合取范式', 'Conjunctive normal form'),
    tests: [
      { goal: 'Rain ∨ (Wind ∧ Wet)', becomes: [['(Rain ∨ Wind) ∧ (Rain ∨ Wet)']] },
      { goal: '¬(Rain ∧ Wind) ∨ (Wet ∧ Slip)', becomes: [['(¬Rain ∨ ¬Wind ∨ Wet) ∧ (¬Rain ∨ ¬Wind ∨ Slip)']] },
      { goal: '(Rain → Wet) ∧ (Wind ∨ (Rain ∧ Slip))', becomes: [['(¬Rain ∨ Wet) ∧ ((Wind ∨ Rain) ∧ (Wind ∨ Slip))']] },
    ],
    brief: BRIEF,
    hint: [T('否定范式的规则后面，再加上分配。', 'After the rules for negation normal form, add distribution.')],
    intro: [{ t: T('<wiki-ref to="cnf"></wiki-ref>：先是否定范式，再让「或者」都在「并且」底下，几串「或者」用「并且」连起来。下一步的自动证明，要的就是这个样子。', '<wiki-ref to="cnf"></wiki-ref>: negation normal form first, then every “or” under the “and”s, a few strings of “or” joined by “and”. Automatic proof wants sentences in just this shape.') }],
    solution: script(['simp', CNF]),
    after: T('化出来的每一串「或者」叫一个<wiki-ref to="clause"></wiki-ref>。分配会让句子变长：一句分到两边，就抄了两遍。', 'Each string of “or” that comes out is called a <wiki-ref to="clause"></wiki-ref>. Distribution makes a sentence longer: one sentence distributed over two sides is written out twice.'),
  }),
  becomes({
    id: 'sp-order',
    title: T('先后', 'Which first'),
    tests: [
      { goal: '¬(Rain ∨ (Wind ∧ Wet))', becomes: [['¬Rain ∧ (¬Wind ∨ ¬Wet)']] },
      { goal: '¬(Rain → (Wind ∧ Wet))', becomes: [['Rain ∧ (¬Wind ∨ ¬Wet)']] },
    ],
    brief: T('设计一个证明助手，把每个目标化成最短的合取范式。', 'Design a proof assistant that brings each goal to its shortest conjunctive normal form.'),
    hint: [T('否定还在外面的时候先分配，「或者」就分进了否定里面。', 'Distribute while a negation is still outside, and the “or” is distributed inside the negation.')],
    intro: [{ t: T('同一组规则，排的先后不一样，化出来的样子也可能不一样：化简每一圈用的是排在最前、对得上的那一条。这一关要的是最短的合取范式。', 'The same rules in a different order may give a different result: each round, Simp uses the first rule in the line that fits. Here the shortest conjunctive normal form is wanted.') }],
    solution: script(['simp', CNF]),
    naive: script(['simp', ['dist.orAndR', 'dist.orAndL', ...NNF]]),
    after: T('先把否定推到底，再分配，分配就不会在否定里面白做一遍。规则的先后，也是化简的一部分。', 'Push negations all the way in, then distribute, and distribution is not wasted inside a negation. The order of the rules is part of the simplifier too.'),
  }),
]
