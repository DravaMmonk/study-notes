// Chapter 8 · Tactics: a machine is no longer a script for one shape of goal but a program for many, a tactic. Two
// lines need nothing from each other. Combinators: the repeat frame on proof states, alternatives (the first that does
// not fail), both together, an alternative that does nothing (try), every goal. Backtracking: which goal first can decide
// a ?-letter (defer); from then on a card gives every result and each card after it works on each (the showcase). With
// both, again two lines: alternatives keep every way, and depth-first search goes on until no goal is left; every
// introduction rule as one part, every elimination rule as another (each built from alternatives). Then the player's
// own auto, a search over the two (it becomes a part).
// The topic asks a family tree by rules (Prolog is rule resolution and depth-first search); the challenge is a search
// that never stops on what cannot be proved.
import { flow, script } from './machines.js'

const T = (zh, en) => ({ zh, en })
const GOAL = [{ name: 'in', label: T('目标', 'Goal') }]
const prove = (level) => ({ kind: 'machine', want: 'proved', inputs: GOAL, ...level })
// From 一串结果 on, a card gives every result.
const each = (level) => prove({ backtrack: true, ...level })
const ask = (level) => ({ kind: 'machine', want: 'answers', inputs: [{ name: 'in', label: T('问题', 'Question') }], backtrack: true, ...level })
const BRIEF = T('设计一个证明助手，证完每一个目标。', 'Design a proof assistant that proves every goal.')

// Depth-first search over one step: assumption, or each of the steps given, the last followed by the cards in
// `region`; a depth limit when given.
const searchOf = (steps, { depth, region = [] } = {}) => flow({
  frame: 'search',
  params: depth ? { depth: String(depth) } : {},
  body: [{ ways: [['assumption'], ...steps.map((step, k) => [step, ...(k === steps.length - 1 ? region : [])])] }],
})

const FAMILY = ['Parent(ann, bo)', 'Parent(bo, cy)', 'Parent(bo, dee)', 'Parent(dee, en)', 'Parent(fay, en)']

export const strategies = [
  // ---------- combinators ----------
  prove({
    id: 's-repeat',
    title: T('做到做不动', 'Until it cannot'),
    tests: [{ goal: 'Rain → (Wind → (Wet → Rain))' }, { goal: 'Rain → Rain' }, { goal: 'Slip → (Rain → Slip)' }],
    brief: BRIEF,
    hint: [T('「若…则…」有几层，事先不知道。', 'How many levels of “if … then …” there are is not known beforehand.')],
    intro: [
      { t: T('到这里，证明助手的元件按固定顺序连接，只对一种结构的目标有效；嵌套层数一变，就得重新连线。本章要做的是<wiki-ref to="tactic"></wiki-ref>：按证明状态选择、组合步骤的程序。Isabelle 的 auto、Lean 的 simp 都是策略。', 'So far a proof assistant’s parts have run in a fixed order, fit for goals of one structure; change the nesting and it must be rewired. This chapter builds <wiki-ref to="tactic"></wiki-ref>s: programs that choose and combine steps by the proof state. Isabelle’s auto and Lean’s simp are tactics.') },
      { t: T('<part-ref to="part:repeat"></part-ref>也能用在证明状态上：它反复运行框里的步骤，直到步骤失败，送出失败前的结果。', 'The <part-ref to="part:repeat"></part-ref> works on proof states too: it runs the steps inside again and again until they fail, and gives the result before the failure.') },
    ],
    solution: flow({ frame: 'repeat', body: [['rule', 'impI']] }, 'assumption'),
  }),
  prove({
    id: 's-orelse',
    title: T('不行就换', 'Or else'),
    adds: ['append'],
    tests: [{ goal: 'Wind ∨ Rain', hyps: ['Wind'] }, { goal: 'Rain → Rain' }, { goal: 'Slip ∨ Wet', hyps: ['Slip'] }],
    brief: BRIEF,
    hint: [T('第一步取决于目标的结构。', 'The first step depends on the goal’s shape.')],
    intro: [{ t: T('目标的结构不止一种：补充对「或者」有效，对「若…则…」失败；假设框正好相反。新元件<part-ref to="part:append"></part-ref>：每个框收到同一个状态，送出第一个没有失败的框的结果。', 'Goals come in more than one shape: Add alternative works on an “or” and fails on an “if … then …”; the assumption box the other way round. A new part, <part-ref to="part:append"></part-ref>: every region gets the same state, and the result is that of the first region that did not fail.') }],
    solution: flow({ ways: [[['rule', 'disjI1']], [['rule', 'impI']]] }, 'assumption'),
    after: T('策略只能调用核的规则，组合得再复杂，也造不出假定理：这是<wiki-ref to="lcf"></wiki-ref>的设计。', 'A tactic can only call the kernel’s rules, so however it is combined it cannot make a false theorem: the design of <wiki-ref to="lcf"></wiki-ref>.'),
  }),
  prove({
    id: 's-mix',
    title: T('重复里套着不行就换', 'Or else, repeated'),
    tests: [{ goal: 'Rain → (Wind → Rain ∧ Wind)' }, { goal: '(Rain → Rain) ∧ (Wind → (Rain → Wind))' }, { goal: 'Rain → (Wind → Wind ∧ (Rain ∧ Wind))' }],
    brief: BRIEF,
    hint: [T('每一圈要应付哪几种目标？', 'What kinds of goal must each round handle?'), T('<part-ref to="part:append"></part-ref>上可以选三个框。', '<part-ref to="part:append"></part-ref> can be set to three regions.')],
    intro: [{ t: T('这一回目标层层嵌套，「若…则…」和「并且」混在一起，次序各不相同。', 'This time goals nest level within level, “if … then …” and “and” mixed, in a different order each time.') }],
    solution: flow({ frame: 'repeat', body: [{ ways: [['assumption'], [['rule', 'impI']], [['rule', 'conjI']]] }] }),
  }),
  prove({
    id: 's-try',
    title: T('可做可不做', 'A step that may not apply'),
    tests: [{ goal: 'Rain ∧ Wind → Rain' }, { goal: 'Rain → Rain' }, { goal: 'Wet ∧ Slip → Wet' }],
    brief: BRIEF,
    hint: [T('有的目标要拆开一条已知，有的不用。', 'Some goals need a given taken apart, some do not.'), T('<part-ref to="part:append"></part-ref>的框可以空着。', 'A region of <part-ref to="part:append"></part-ref> may be left empty.')],
    intro: [{ t: T('有的步骤可做可不做：已知里有「并且」就该拆开，没有就不必。可<part-ref to="lemma:erule"></part-ref>找不到「并且」时会失败，整个证明助手随之停下。', 'Some steps may or may not apply: an “and” among the givens should be taken apart, and without one there is nothing to do. But <part-ref to="lemma:erule"></part-ref> fails when it finds no “and”, and the whole proof assistant stops with it.') }],
    solution: flow(['rule', 'impI'], { ways: [[['erule', 'conjE']], []] }, 'assumption'),
    after: T('可做可不做的一步，在策略语言里叫 TRY。', 'A step that may or may not apply is called TRY in tactic languages.'),
  }),
  prove({
    id: 's-each',
    title: T('每个目标都做一遍', 'Every goal'),
    adds: ['each'],
    budget: 4,
    tests: [{ goal: '(Rain → Rain) ∧ (Wind → Wind)' }, { goal: '(Wet ∧ Rain → Wet ∧ Rain) ∧ (Slip → Slip)' }],
    brief: T('设计一个证明助手，最多用 4 个元件，证完每一个目标。', 'Design a proof assistant of at most 4 parts that proves every goal.'),
    hint: [T('拼成以后的两个目标，要做的是同一件事。', 'The two goals after the join need the same thing done.')],
    intro: [{ t: T('元件只处理第一个目标，几个目标要做同样的事时，同样的元件得接几遍。新元件<part-ref to="part:each"></part-ref>：框里的元件对每个目标各做一遍，每次只看那一个目标。', 'A part only works on the first goal, so when several goals need the same done, the same parts would be wired several times. A new part, <part-ref to="part:each"></part-ref>: the parts inside run once on each goal, seeing only that goal each time.') }],
    solution: flow(['rule', 'conjI'], { frame: 'each', body: [['rule', 'impI'], 'assumption'] }),
  }),

  // ---------- backtracking ----------
  prove({
    id: 's-defer',
    title: T('先证哪一个', 'Which goal first'),
    adds: ['defer'],
    tests: [{ goal: '∃x. Human(x) ∧ Likes(x, ann)', hyps: ['Human(cy)', 'Human(bo)', 'Likes(bo, ann)'] }, { goal: '∃x. Bird(x) ∧ Flies(x)', hyps: ['Bird(ann)', 'Bird(dee)', 'Flies(dee)'] }],
    brief: BRIEF,
    hint: [T('哪个目标对得上的已知少？', 'Which goal fits fewer givens?')],
    intro: [
      { t: T('一个 ? 留在两个目标里时，先证哪一个，就由哪一个来定它。逆用<part-ref to="part:exI"></part-ref>、再拼成以后，两个目标是 ?t是人、?t喜欢安。<part-ref to="part:assumption"></part-ref>取第一条对得上的已知：先证「?t是人」，?t 就成了茜，可茜不喜欢安，第二个目标便证不下去。', 'When a ?-letter sits in two goals, whichever is proved first settles it. After <part-ref to="part:exI"></part-ref> and Join backwards the goals are ?t is human, ?t likes Ann. <part-ref to="part:assumption"></part-ref> takes the first given that fits: prove “?t is human” first, and ?t becomes Cy, who does not like Ann, so the second goal cannot be proved.') },
      { t: T('新元件「目标后移」：把第一个目标移到最后。', 'A new part, “Defer”: it moves the first goal to the end.') },
    ],
    solution: script(['rule', 'exI'], ['rule', 'conjI'], 'defer', 'assumption', 'assumption'),
  }),
  each({
    id: 's-results',
    title: T('一串结果', 'A run of results'),
    showcase: T('一个元件现在给出所有对得上的结果，按顺序排成一串；后面的元件对每一种都做一遍，走不通的那几种自己消失：这就是回溯，光看说明想不到后面的元件会替前面的元件收拾残局', 'a part now gives every result that fits, in order; each later part works on each of them, and those that lead nowhere drop out: this is backtracking, and from the description alone one does not guess that later parts clear up after earlier ones'),
    tests: [{ goal: '∃x. Human(x) ∧ Likes(x, ann)', hyps: ['Human(cy)', 'Human(bo)', 'Likes(bo, ann)'] }, { goal: '∃x. Likes(x, ann) ∧ Likes(x, bo)', hyps: ['Likes(cy, ann)', 'Likes(en, bo)', 'Likes(dee, bo)', 'Likes(dee, ann)'] }],
    brief: BRIEF,
    hint: [T('不必再用目标后移。', 'There is no need to defer.')],
    intro: [
      { t: T('第二组测试里，两个目标都有不止一个人对得上，先证哪一个都会先拿错人，调整次序也无济于事。', 'In the second test more than one person fits each goal; whichever goes first takes the wrong one first, and reordering the goals does not help.') },
      { t: T('从这一关起，元件给出<b>所有</b>对得上的结果，按顺序排成一串：<part-ref to="part:assumption"></part-ref>每对上一条已知，就是一种结果。后面的元件对每一种都做一遍，做不下去的自行消失，留下的第一种就是答案。元件上显示「第 1 种结果，共 n 种」。', 'From this level on a part gives <b>every</b> result that fits, one after another: each given that <part-ref to="part:assumption"></part-ref> fits is a result. Each later part works on every one of them; those that cannot go on drop out, and the first left is the answer. A part shows “result 1 of n”.') },
    ],
    solution: script(['rule', 'exI'], ['rule', 'conjI'], 'assumption', 'assumption'),
    after: T('这叫<wiki-ref to="backtracking"></wiki-ref>。', 'This is <wiki-ref to="backtracking"></wiki-ref>.'),
  }),

  // ---------- search ----------
  each({
    id: 's-append',
    title: T('两条路都要', 'Both ways'),
    tests: [{ goal: 'Rain ∨ Wind', hyps: ['Wind'] }, { goal: 'Rain ∨ Wind', hyps: ['Rain'] }, { goal: 'Wet ∨ Slip', hyps: ['Slip'] }],
    brief: BRIEF,
    hint: [T('补充的哪一边对，现在不必当场决定。', 'Which side of Add alternative is right need not be decided on the spot any more.')],
    intro: [{ t: T('对着「或者」，补充的左右两条规则都不会失败。<level-ref to="s-orelse"></level-ref>里，<part-ref to="part:append"></part-ref>只用第一个没失败的框，选错了也回不去。有了回溯，<part-ref to="part:append"></part-ref>也给出所有结果：先是第一个框的每一种，再是下一个框的每一种。', 'Against an “or”, neither of Add alternative’s two rules fails. In <level-ref to="s-orelse"></level-ref>, <part-ref to="part:append"></part-ref> took only the first region that did not fail, and a wrong choice could not be undone. With backtracking, <part-ref to="part:append"></part-ref> gives every result too: every one of the first region, then every one of the next.') }],
    solution: flow({ ways: [[['rule', 'disjI1']], [['rule', 'disjI2']]] }, 'assumption'),
  }),
  each({
    id: 's-search',
    title: T('回溯搜索', 'Search until done'),
    adds: ['search'],
    tests: [{ goal: 'Rain ∨ (Wind ∨ Wet)', hyps: ['Wet'] }, { goal: 'Rain ∨ (Wind ∨ Wet)', hyps: ['Wind'] }, { goal: '(Rain ∨ Wind) ∨ Wet', hyps: ['Wind'] }],
    brief: BRIEF,
    hint: [T('每一步有哪几种做法？', 'What can each step do?'), T('走几步，交给搜索。', 'How many steps is the search’s business.')],
    intro: [
      { t: T('「或者」层层嵌套，每一层都要选一边，要走几步事先不知道。重复框只顺着第一种结果走，进了死胡同就停下。', '“Or” within “or”: each level needs a side chosen, and how many steps it takes is not known beforehand. The repeat frame follows only the first result, and stops in a dead end.') },
      { t: T('新元件<part-ref to="part:search"></part-ref>：框里的元件做一步，得到的每一种结果再接着做；一条路走到头（证完，或者做不下去），再退回来换下一条。这叫<wiki-ref to="dfs"></wiki-ref>。它送出找到的每一个证完的状态。', 'A new part, <part-ref to="part:search"></part-ref>: the parts inside take a step, and each result is stepped on again; one path is followed to its end (done, or stuck) before going back for the next. This is <wiki-ref to="dfs"></wiki-ref>. It gives every finished state it finds.') },
    ],
    solution: searchOf([['rule', 'disjI1'], ['rule', 'disjI2']]),
  }),

  // ---------- by shape ----------
  each({
    id: 's-intro',
    title: T('按形状分解目标', 'The goal by its shape'),
    want: 'becomes',
    builds: 'introRules',
    tests: [
      { goal: 'Rain ∧ Wind', becomes: [['Rain', 'Wind']] },
      { goal: 'Rain → Wet', becomes: [['Rain ⊢ Wet']] },
      { goal: 'Rain ∨ Wind', becomes: [['Rain'], ['Wind']] },
      { goal: '∀x. Human(x) → Mortal(x)', becomes: [['⋀a. Human(a) → Mortal(a)']] },
      { goal: '∃x. Human(x)', becomes: [['Human(?t)']] },
      { goal: 'Rain', becomes: [] },
    ],
    brief: T('设计一个证明助手：用每一条对得上的引入规则把目标倒着拆一步，每种拆法都留下；一条都对不上时失败。', 'Design a proof assistant that takes the goal one step apart with every introduction rule that fits, keeping every way; when none fits, it fails.'),
    hint: [T('引入规则有六条：拼接、假设框、补充左右两条、任取框、概括。', 'There are six introduction rules: Join, the assumption box, Add alternative left and right, the for-any box, and Generalise.'), T('<part-ref to="part:append"></part-ref>上可以选六个框。', '<part-ref to="part:append"></part-ref> can be set to six regions.')],
    intro: [{ t: T('到这里，每一步用哪条规则，都是你看过目标后选定的。引入规则看的是目标：目标是什么结构，就是哪条引入规则造出来的。设计出的证明助手会成为新元件「分解目标」。', 'Until now, the rule for each step was chosen by you after looking at the goals. Introduction rules look at the goal: a goal’s shape says which introduction rule made it. The proof assistant you design becomes a new part, “Goal apart”.') }],
    solution: flow({ ways: [[['rule', 'conjI']], [['rule', 'impI']], [['rule', 'disjI1']], [['rule', 'disjI2']], [['rule', 'allI']], [['rule', 'exI']]] }),
  }),
  each({
    id: 's-elim',
    title: T('按形状分解假设', 'The givens by their shape'),
    want: 'becomes',
    builds: 'elimRules',
    tests: [
      { goal: 'Wet', hyps: ['Rain ∧ Wind'], becomes: [['Rain ∧ Wind; Rain; Wind ⊢ Wet']] },
      { goal: 'Wet', hyps: ['Rain ∨ Wind'], becomes: [['Rain ∨ Wind; Rain ⊢ Wet', 'Rain ∨ Wind; Wind ⊢ Wet']] },
      { goal: 'Wet', hyps: ['Rain → Wet', 'Rain'], becomes: [['Rain → Wet; Rain ⊢ Rain', 'Rain → Wet; Rain; Wet ⊢ Wet']] },
      { goal: 'Wet', hyps: ['⊥'], becomes: [[]] },
      { goal: 'Wet', hyps: ['∃x. Human(x)'], becomes: [['⋀a. ∃x. Human(x); Human(a) ⊢ Wet']] },
      { goal: 'Wet', hyps: ['∀x. Human(x)'], becomes: [['∀x. Human(x); Human(?t) ⊢ Wet']] },
      { goal: 'Wet', hyps: ['Rain'], becomes: [] },
    ],
    brief: T('设计一个证明助手：每一条消去规则都拿去对已知，每一种对法都留下；一条都对不上的，失败。', 'Design a proof assistant that tries every elimination rule on the givens, keeping every fit; when none fits, it fails.'),
    hint: [T('消去规则有六条：拆解、分类讨论、套用、矛盾推出一切、实例框、选定一例。', 'There are six elimination rules: Split, Case analysis, Apply, from contradiction, take the one there is, take one.'), T('每条一个框，框里是<part-ref to="lemma:erule"></part-ref>。', 'One region each, with <part-ref to="lemma:erule"></part-ref> in it.')],
    intro: [{ t: T('消去规则看的是已知：已知是什么结构，就能怎样用它。设计出的证明助手会成为新元件「分解假设」。', 'Elimination rules look at the givens: a given’s shape says how it can be used. The proof assistant you design becomes a new part, “Use a given”.') }],
    solution: flow({ ways: [[['erule', 'conjE']], [['erule', 'disjE']], [['erule', 'impE']], [['erule', 'botE']], [['erule', 'exE']], [['erule', 'allE']]] }),
  }),

  // ---------- your own auto ----------
  each({
    id: 's-auto',
    adds: ['introRules', 'elimRules'],
    title: T('自建 auto', 'Your own auto'),
    builds: 'auto',
    tests: [{ goal: 'Rain ∧ (Wind ∨ Wet) → (Rain ∧ Wind) ∨ (Rain ∧ Wet)' }, { goal: '(Rain → Wet) → ((Wet → Slip) → (Rain → Slip))' }, { goal: '(∃x. Human(x) ∧ Likes(x, ann)) → ∃x. Likes(x, ann)' }, { goal: '(∀x. Human(x) ∧ Bird(x)) → ∀x. Bird(x)' }],
    brief: T('设计一个证明助手，证完每一个目标。', 'Design a proof assistant that proves every goal.'),
    hint: [T('一步里能做的事有哪几样？', 'What can one step do?'), T('要走几步，事先不知道。', 'How many steps it takes is not known beforehand.')],
    intro: [{ t: T('这四句都在证明板上逐个接过。这一次，要一个证明助手把它们全部证完。设计出的证明助手会成为新元件<part-ref to="lemma:auto"></part-ref>。', 'These four sentences were all wired one by one on the proof board. This time one proof assistant must prove them all. The proof assistant you design becomes a new part, <part-ref to="lemma:auto"></part-ref>.') }],
    solution: searchOf(['introRules', 'elimRules']),
  }),

  // ---------- topic: a family tree by rules ----------
  ask({
    id: 'pl-grand',
    title: T('谁是祖父母', 'Who is a grandparent'),
    rules: { grand: { name: T('祖父母', 'Grandparent'), premises: ['Parent(?x, ?y)', 'Parent(?y, ?z)'], conclusion: 'Grand(?x, ?z)' } },
    tests: [{ goal: 'Grand(?w, cy)', hyps: FAMILY, answers: ['ann'] }, { goal: 'Grand(bo, ?w)', hyps: FAMILY, answers: ['en'] }, { goal: 'Grand(ann, ?w)', hyps: FAMILY, answers: ['cy', 'dee'] }],
    brief: T('设计一个证明助手，找出每个问题的所有答案。', 'Design a proof assistant that finds every answer to each question.'),
    hint: [T('倒着用规则「祖父母」。', 'Use the rule Grandparent backwards.'), T('每一种对法都是一个答案。', 'Every way of fitting is an answer.')],
    intro: [
      { t: T('<level-ref to="q-grand"></level-ref>里，「祖父母」写成了一句查询。这一次它是一条规则：⟦?x是?y的父母; ?y是?z的父母⟧ ⟹ ?x是?z的祖父母。族谱上的事实是目标的已知。', 'In <level-ref to="q-grand"></level-ref>, “grandparent” was written as a query. This time it is a rule: ⟦?x is a parent of ?y; ?y is a parent of ?z⟧ ⟹ ?x is a grandparent of ?z. The family tree’s facts are the goal’s givens.') },
      { t: T('问题本身带着 ?：「?w是茜的祖父母」。每一种证法里 ?w 是谁，就是一个答案。', 'The question itself holds a ?-letter: “?w is a grandparent of Cy”. Who ?w is in each way of proving it is an answer.') },
    ],
    solution: script(['rule', 'grand'], 'assumption', 'assumption'),
    after: T('这就是 Prolog：程序是一组规则，提问是证明一个带 ? 的目标。', 'This is Prolog: a program is a set of rules, and a question is a goal with ?-letters to prove.'),
  }),
  ask({
    id: 'pl-anc',
    title: T('隔多少代都行', 'Any number of generations'),
    rules: {
      anc1: { name: T('祖先·一代', 'Ancestor: one generation'), premises: ['Parent(?x, ?y)'], conclusion: 'Anc(?x, ?y)' },
      anc2: { name: T('祖先·多代', 'Ancestor: more'), premises: ['Parent(?x, ?y)', 'Anc(?y, ?z)'], conclusion: 'Anc(?x, ?z)' },
    },
    tests: [{ goal: 'Anc(ann, ?w)', hyps: FAMILY, answers: ['bo', 'cy', 'dee', 'en'] }, { goal: 'Anc(?w, en)', hyps: FAMILY, answers: ['ann', 'bo', 'dee', 'fay'] }],
    brief: T('设计一个证明助手，找出每个问题的所有答案。', 'Design a proof assistant that finds every answer to each question.'),
    hint: [T('隔几代，证明就有多长。', 'As many generations, so long is the proof.')],
    intro: [{ t: T('祖先是父母，或者父母的祖先：规则用到了它自己。', 'An ancestor is a parent, or a parent’s ancestor: the rule uses itself.') }],
    solution: searchOf([['rule', 'anc1'], ['rule', 'anc2']]),
  }),
  ask({
    id: 'pl-order',
    adds: ['defer'],
    title: T('先问谁', 'Ask which first'),
    rules: {
      anc1: { name: T('祖先·一代', 'Ancestor: one generation'), premises: ['Parent(?x, ?y)'], conclusion: 'Anc(?x, ?y)' },
      anc3: { name: T('祖先·往上数', 'Ancestor: counting up'), premises: ['Anc(?x, ?y)', 'Parent(?y, ?z)'], conclusion: 'Anc(?x, ?z)' },
    },
    tests: [{ goal: 'Anc(ann, ?w)', hyps: FAMILY, answers: ['bo', 'cy', 'dee', 'en'] }, { goal: 'Anc(bo, ?w)', hyps: FAMILY, answers: ['cy', 'dee', 'en'] }],
    brief: T('设计一个证明助手，找出每个问题的所有答案。', 'Design a proof assistant that finds every answer to each question.'),
    hint: [T('倒着用「往上数」以后，第一个目标又是一个「祖先」。', 'After “counting up” backwards, the first goal is an “ancestor” again.'), T('先证哪个子目标，?y 就能先定下来？', 'Which subgoal, proved first, settles ?y?')],
    intro: [{ t: T('这一回，「多代」那条规则倒过来写：先找 ?x 的祖先 ?y，再看 ?y 是不是 ?z 的父母。意思不变。', 'This time the rule for more generations is written the other way round: first an ancestor ?y of ?x, then whether ?y is a parent of ?z. The meaning is the same.') }],
    solution: searchOf([['rule', 'anc1'], ['rule', 'anc3']], { region: ['defer'] }),
    naive: searchOf([['rule', 'anc1'], ['rule', 'anc3']]),
    after: T('这类问题叫左递归。', 'This is known as left recursion.'),
  }),

  // ---------- challenge ----------
  each({
    id: 's-loop',
    title: T('停不下来的搜索', 'A search that never stops'),
    rules: { trans: { name: T('年纪大可以传下去', 'Older passes on'), premises: ['Older(?x, ?y)', 'Older(?y, ?z)'], conclusion: 'Older(?x, ?z)' } },
    tests: [{ goal: 'Older(ann, cy)', hyps: ['Older(ann, bo)', 'Older(bo, cy)'] }, { goal: 'Older(bo, dee)', hyps: ['Older(bo, cy)', 'Older(cy, dee)'] }, { goal: 'Older(cy, ann)', hyps: ['Older(ann, bo)', 'Older(bo, cy)'], want: 'fails' }],
    brief: T('设计一个证明助手：证得出的目标证完，证不出的报告失败。', 'Design a proof assistant that proves the goals that can be proved, and reports failure on the one that cannot.'),
    hint: [T('证不出的那一句，搜索在哪里停不下来？', 'On the sentence that cannot be proved, where does the search fail to stop?'), T('每一步都出现新的 ?，搜索看不出自己在绕圈。', 'Each step brings a new ?-letter, so the search cannot tell it is going round.')],
    intro: [{ t: T('安比博年长，博比茜年长，所以安比茜年长；茜比安年长，却无论如何推不出来。证不出时，证明助手也必须停下，报告失败。', 'Ann is older than Bo and Bo older than Cy, so Ann is older than Cy; that Cy is older than Ann follows from nothing. When there is no proof, the proof assistant must still stop and report failure.') }],
    solution: searchOf([['rule', 'trans']], { depth: 3 }),
    naive: searchOf([['rule', 'trans']]),
  }),
]
