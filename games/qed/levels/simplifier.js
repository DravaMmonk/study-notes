// Chapter 10 · The simplifier: goals that only want one place changed for another that says the same (¬¬A for A, a
// negation pushed in) take too long rule by rule, so the laws proved both ways round last chapter become rewrite
// rules, used left to right, one place at a time (the rewrite card, kit/domains/logic/rewrite.js). The card comes
// first, with double negation. Then three lines that need nothing from each other: more rules (arrows to or,
// distribution), De Morgan (negation pushed in, then brought out with the other shapes), and rewriting itself (the
// first place, then again and again). With all three, simp is built: a repeat frame round alternatives, one rewrite
// each. Then normal forms (NNF, CNF, and the order of the rules).
import { machine } from '../../kit/domains/logic/build.js'
import { flow, script } from './machines.js'

const T = (zh, en) => ({ zh, en })
const GOAL = [{ name: 'in', label: T('目标', 'Goal') }]
// The level that builds simp gives its rewrite rules on the board as an input of its own: the part's port.
const SIMP_RULES = ['dneg.elim', 'dm.notOr', 'dm.notAnd']
const RULED = [...GOAL, { name: 'rules', label: T('规则', 'Rules') }]
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
      { t: T('「刮风 ∧ ¬¬下雨」里的 ¬¬下雨 换成下雨，在证明板上要先拆开外面的「并且」，换掉里面那一句，再拼回去。', 'To turn the ¬¬it rains in “it is windy ∧ ¬¬it rains” into it rains, the proof board must take the outer “and” apart, replace the part inside, and put it back together.') },
      { t: T('两句话等价，句子里出现一句的地方就能直接换成另一句。这样用的等价式叫<wiki-ref to="rewrite"></wiki-ref>，新元件<part-ref to="part:rw"></part-ref>按一条改写规则在目标里换一处。', 'Where two sentences are equivalent, one can be swapped for the other right inside a sentence. An equivalence used this way is a <wiki-ref to="rewrite"></wiki-ref>; the new part <part-ref to="part:rw"></part-ref> uses one to change one place in the goal.') },
    ],
    brief: T('设计一个证明助手，去掉每个目标里的 ¬¬。', 'Design a proof assistant that takes the ¬¬ out of each goal.'),
    hint: [T('<part-ref to="lemma:dneg"></part-ref>的两个形状都可以当改写规则。', 'Both shapes of <part-ref to="lemma:dneg"></part-ref> can serve as rewrite rules.')],
    solution: script(['rw', 'dneg.elim']),
    after: T('这是<wiki-ref to="simplifier"></wiki-ref>的基本动作。', 'This is the basic move of a <wiki-ref to="simplifier"></wiki-ref>.'),
  }),

  // ---------- more rewrite rules ----------
  {
    id: 'sp-laws',
    title: T('更多改写规则', 'More rewrite rules'),
    tasks: [
      rewriting({
        step: T('蕴涵析取互化', 'Arrows away'),
        tests: [
          { goal: '(Rain → Wet) ∧ Wind', becomes: [['(¬Rain ∨ Wet) ∧ Wind']] },
          { goal: '¬(Alarm → Up)', becomes: [['¬(¬Alarm ∨ Up)']] },
          { goal: 'Wind ∨ (Rain → Slip)', becomes: [['Wind ∨ (¬Rain ∨ Slip)']] },
        ],
        brief: T('设计一个证明助手，把每个目标里的「若…则…」换成「或者」。', 'Design a proof assistant that turns the “if … then …” in each goal into an “or”.'),
        hint: [T('看<part-ref to="lemma:arrow"></part-ref>的两个形状。', 'Look at the two shapes of <part-ref to="lemma:arrow"></part-ref>.')],
        solution: script(['rw', 'arrow.elim']),
      }),
      rewriting({
        step: T('分配律', 'Distribute'),
        tests: [
          { goal: 'Rain ∨ (Wind ∧ Wet)', becomes: [['(Rain ∨ Wind) ∧ (Rain ∨ Wet)']] },
          { goal: '(Sat ∧ Rest) ∨ Happy', becomes: [['(Sat ∨ Happy) ∧ (Rest ∨ Happy)']] },
        ],
        brief: T('设计一个证明助手，把每个目标里的「或者」分配到「并且」上。', 'Design a proof assistant that distributes the “or” in each goal over the “and”.'),
        hint: [
          T('两个目标里，「并且」一个在右边，一个在左边。', 'In one goal the “and” is on the right, in the other on the left.'),
          T('一条改写规则只对得上一种样子；两种都要试，见<part-ref to="part:append"></part-ref>。', 'One rewrite rule fits only one shape; to try both, see <part-ref to="part:append"></part-ref>.'),
        ],
        solution: flow({ ways: [[['rw', 'dist.orAndR']], [['rw', 'dist.orAndL']]] }),
      }),
    ],
    intro: [{ t: T('<part-ref to="lemma:arrow"></part-ref>和<part-ref to="lemma:dist"></part-ref>也是两个方向都证过的等价式。', '<part-ref to="lemma:arrow"></part-ref> and <part-ref to="lemma:dist"></part-ref> are equivalences proved both ways too.') }],
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
        hint: [
          T('一个目标里是 ¬(… ∨ …)，另一个里是 ¬(… ∧ …)。', 'One goal holds ¬(… ∨ …), the other ¬(… ∧ …).'),
          T('一条改写规则只对得上一种样子；两种都要试，见<part-ref to="part:append"></part-ref>。', 'One rewrite rule fits only one shape; to try both, see <part-ref to="part:append"></part-ref>.'),
        ],
        solution: flow({ ways: [[['rw', 'dm.notOr']], [['rw', 'dm.notAnd']]] }),
      }),
      rewriting({
        step: T('推过量词', 'Past the quantifier'),
        tests: [{ goal: '¬∀x. Drinks(x)', becomes: [['∃x. ¬Drinks(x)']] }, { goal: 'Wet ∧ ¬∃x. Sings(x)', becomes: [['Wet ∧ (∀x. ¬Sings(x))']] }],
        brief: T('设计一个证明助手，把每个目标里的否定推过量词。', 'Design a proof assistant that pushes the negation in each goal past the quantifier.'),
        hint: [T('一个目标里是 ¬∀，另一个里是 ¬∃。', 'One goal holds ¬∀, the other ¬∃.')],
        solution: flow({ ways: [[['rw', 'dm.notAll']], [['rw', 'dm.notEx']]] }),
      }),
    ],
    intro: [{ t: T('<part-ref to="lemma:dm"></part-ref>有八个形状，每一个都可以当改写规则。', '<part-ref to="lemma:dm"></part-ref> has eight shapes, and each can serve as a rewrite rule.') }],
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
    hint: [T('<part-ref to="lemma:dm"></part-ref>里还有没用过的形状。', '<part-ref to="lemma:dm"></part-ref> still has shapes you have not used.')],
    intro: [{ t: T('改写规则只从左往右换：¬(A ∨ B) ⟼ ¬A ∧ ¬B 能把否定推进去，却提不出来。', 'A rewrite rule works only left to right: ¬(A ∨ B) ⟼ ¬A ∧ ¬B pushes a negation in, but cannot bring it out.') }],
    solution: flow({ ways: [[['rw', 'dm.andNot']], [['rw', 'dm.orNot']]] }),
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
    hint: [T('每个目标里有两处 ¬¬。', 'Each goal has two ¬¬s.')],
    intro: [{ t: T('<part-ref to="part:rw"></part-ref>只换一处。对得上的地方不止一处时，它从外往里、从左往右，换第一处。', '<part-ref to="part:rw"></part-ref> changes one place. When more than one place fits, it changes the first, going outside in and left to right.') }],
    solution: script(['rw', 'dneg.elim'], ['rw', 'dneg.elim']),
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
    hint: [T('改写的次数要随目标而变。', 'The number of rewrites must depend on the goal.')],
    intro: [{ t: T('这一回，各个目标里 ¬¬ 的个数不一样。改写对不上任何地方时，就失败。', 'This time the goals hold different numbers of ¬¬s. A rewrite that fits nowhere fails.') }],
    solution: flow({ frame: 'repeat', body: [['rw', 'dneg.elim']] }),
    naive: script(['rw', 'dneg.elim'], ['rw', 'dneg.elim']),
  }),

  // ---------- simp ----------
  becomes({
    id: 'sp-simp',
    title: T('几条一起', 'Several at once'),
    inputs: RULED,
    builds: 'simp',
    tests: [
      { goal: '¬(Rain ∨ ¬Wind)', rules: SIMP_RULES, becomes: [['¬Rain ∧ Wind']] },
      { goal: '¬¬¬(Rain ∧ Wind)', rules: SIMP_RULES, becomes: [['¬Rain ∨ ¬Wind']] },
      { goal: '¬(¬Rain ∨ ¬¬Wind) ∧ Wet', rules: SIMP_RULES, becomes: [['(Rain ∧ ¬Wind) ∧ Wet']] },
      { goal: 'Rain ∧ Wet', rules: SIMP_RULES, becomes: [['Rain ∧ Wet']] },
    ],
    brief: T('设计一个证明助手，用「规则」输入的改写规则把每个目标一直改下去，直到哪一条都对不上。', 'Design a proof assistant that rewrites each goal with the rules from the input Rules until none of them fits.'),
    hint: [
      T('和<level-ref to="sp-repeat"></level-ref>一样，要改到改不动为止。', 'As in <level-ref to="sp-repeat"></level-ref>, the rewriting goes on until nothing fits.'),
      T('<part-ref to="part:rw"></part-ref>也能接一串规则，用其中第一条对得上的。', '<part-ref to="part:rw"></part-ref> can take a list of rules too, and uses the first that fits.'),
    ],
    intro: [{ t: T('几条改写规则一起用，每次用对得上的那一条，改到哪一条都对不上为止，这叫<b>化简</b>。规则从板上的「规则」输入进来；设计出的证明助手会成为新元件<part-ref to="lemma:simp"></part-ref>，这个输入就是它的「规则」口。', 'Several rewrite rules used together, each time whichever fits, until none fits: this is <b>simplification</b>. The rules come in at the board’s input Rules; the proof assistant you design becomes a new part, <part-ref to="lemma:simp"></part-ref>, and that input becomes its port Rules.') }],
    solution: machine({ c0: ['repeat'], c1: ['rw', {}, 'c0'] }, ['in>c0', 'c0#body>c1', 'rules>c1.rules', 'c1>c0.body', 'c0>out'], { inputs: ['in', 'rules'] }),
    after: T('Isabelle 和 Lean 的 simp 做的也是这件事。', 'This is what simp does in Isabelle and Lean too.'),
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
    hint: [
      T('先去掉 →。', 'Get rid of → first.'),
      T('再看 ¬ 会出现在哪些连接词和量词前面。', 'Then see in front of which connectives and quantifiers a ¬ can stand.'),
    ],
    intro: [{ t: T('<wiki-ref to="nnf"></wiki-ref>：句子里没有 →，¬ 只贴在最小的句子上。', '<wiki-ref to="nnf"></wiki-ref>: no → in the sentence, and every ¬ on a smallest sentence.') }],
    solution: script(['simp', NNF]),
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
    hint: [
      T('从否定范式出发。', 'Start from negation normal form.'),
      T('还差的是让「或者」到「并且」底下去。', 'What is left is to bring every “or” under the “and”s.'),
    ],
    intro: [{ t: T('<wiki-ref to="cnf"></wiki-ref>：否定范式，并且「或者」都在「并且」底下，几串「或者」用「并且」连起来。每一串「或者」叫一个<wiki-ref to="clause"></wiki-ref>。', '<wiki-ref to="cnf"></wiki-ref>: negation normal form, with every “or” under the “and”s, a few strings of “or” joined by “and”. Each string of “or” is a <wiki-ref to="clause"></wiki-ref>.') }],
    solution: script(['simp', CNF]),
    after: T('自动证明器动手之前，通常先把句子化成合取范式。', 'Automatic provers usually bring a sentence to conjunctive normal form before anything else.'),
  }),
  becomes({
    id: 'sp-order',
    title: T('先后', 'Which first'),
    tests: [
      { goal: '¬(Rain ∨ (Wind ∧ Wet))', becomes: [['¬Rain ∧ (¬Wind ∨ ¬Wet)']] },
      { goal: '¬(Rain → (Wind ∧ Wet))', becomes: [['Rain ∧ (¬Wind ∨ ¬Wet)']] },
    ],
    brief: T('设计一个证明助手，把每个目标化成最短的合取范式。', 'Design a proof assistant that brings each goal to its shortest conjunctive normal form.'),
    hint: [T('否定还在外面时就分配，会发生什么？', 'What happens if you distribute while a negation is still outside?')],
    intro: [{ t: T('化简每次用的是排在最前、对得上的那条规则。同一组规则排的先后不同，化出来的句子也可能不同。', 'Each time, Simp uses the first rule in the list that fits. The same rules in a different order can give a different sentence.') }],
    solution: script(['simp', CNF]),
    naive: script(['simp', ['dist.orAndR', 'dist.orAndL', ...NNF]]),
  }),
]
