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
    hint: [T('「若…则…」有几层，假设框就要倒着用几次。', 'The assumption box is needed backwards once for each level of “if … then …”.')],
    intro: [
      { t: T("此前的证明助手按固定顺序连接元件，适用于特定结构的目标；目标的嵌套深度变化时，电路可能需要调整。本章构建可处理多种目标的<wiki-ref to=\"tactic\"></wiki-ref>：它根据证明状态选择并组合步骤。Isabelle 的 auto 和 Lean 的 simp 是更丰富的实际例子。", "The previous proof assistant connected parts in a fixed sequence for goals of a particular structure; changing the nesting depth could require rewiring. This chapter builds a <wiki-ref to=\"tactic\"></wiki-ref> that selects and combines steps based on the proof state. Isabelle’s auto and Lean’s simp are richer real-world examples.") },
      { t: T("合一时已经遇到过未知的嵌套深度，并用<part-ref to=\"part:repeat\"></part-ref>处理。用于证明状态时，它重复运行框内步骤，直到步骤失败，并返回失败前的结果。", "Unification already encountered unknown nesting depth and used <part-ref to=\"part:repeat\"></part-ref> to handle it. On a proof state, the frame repeats its inner steps until they fail, then returns the last successful result.") },
    ],
    solution: flow({ frame: 'repeat', body: [['rule', 'impI']] }, 'assumption'),
    after: T('失败不算错：它告诉重复框该停了。层数不同的目标，证它们的是同一个证明助手。', 'Failing is no fault here: it tells the frame to stop. Goals with different numbers of levels are proved by one proof assistant.'),
  }),
  prove({
    id: 's-orelse',
    title: T('不行就换', 'Or else'),
    adds: ['append'],
    tests: [{ goal: 'Wind ∨ Rain', hyps: ['Wind'] }, { goal: 'Rain → Rain' }, { goal: 'Slip ∨ Wet', hyps: ['Slip'] }],
    brief: BRIEF,
    hint: [T('第一步要看目标是什么样子：是「或者」就引入 ∨，是「若…则…」就倒着用假设框。', 'The first step depends on the goal’s shape: an “or” wants ∨ intro, an “if … then …” the assumption box backwards.')],
    intro: [{ t: T('重复框里只放得下一种做法，可目标的样子不止一种：引入 ∨ 对着「或者」行，对着「若…则…」就失败；假设框正相反。新元件<part-ref to="part:append"></part-ref>：每个框拿到同一个状态，用第一个没失败的框的结果。', 'The repeat frame holds one way of doing things, but goals come in more than one shape: ∨ intro fits an “or” and fails on an “if … then …”; the assumption box the other way round. A new part, <part-ref to="part:append"></part-ref>: every region gets the same state, and the result is the first region’s that did not fail.') }],
    solution: flow({ ways: [[['rule', 'disjI1']], [['rule', 'impI']]] }, 'assumption'),
    after: T('策略只会用规则，所以不管它怎样组合，证出来的都是核认可的定理：自动化造不出假定理。', 'A tactic only ever uses rules, so however it is put together, what it proves is a theorem the kernel accepts: automation cannot make a false theorem.'),
  }),
  prove({
    id: 's-mix',
    title: T('重复里套着不行就换', 'Or else, repeated'),
    tests: [{ goal: 'Rain → (Wind → Rain ∧ Wind)' }, { goal: '(Rain → Rain) ∧ (Wind → (Rain → Wind))' }, { goal: 'Rain → (Wind → Wind ∧ (Rain ∧ Wind))' }],
    brief: BRIEF,
    hint: [T('每一圈三条路：目标在已知里就收掉，不然看它是「若…则…」还是「并且」。几条路的元件上可以选三个框。', 'Three ways each round: if the goal is a given, finish it; otherwise see whether it is an “if … then …” or an “and”. Alternatives can be set to three regions.')],
    intro: [{ t: T('把几条路放进重复框，每一圈先看目标是什么样子，再决定用哪条规则。这一回目标一层套一层，「若…则…」和「并且」混在一起，次序每个目标都不一样。', 'Put Alternatives in the repeat frame, and each round looks at the goal’s shape before choosing a rule. This time goals sit inside goals, “if … then …” and “and” mixed, in a different order every time.') }],
    solution: flow({ frame: 'repeat', body: [{ ways: [['assumption'], [['rule', 'impI']], [['rule', 'conjI']]] }] }),
    after: T('框里套框，就是程序里的循环套着分支。这个证明助手已经能证一大类目标了。', 'Frames inside frames are a loop around a branch, as in any program. This proof assistant already proves a whole class of goals.'),
  }),
  prove({
    id: 's-try',
    title: T('可做可不做', 'A step that may not apply'),
    tests: [{ goal: 'Rain ∧ Wind → Rain' }, { goal: 'Rain → Rain' }, { goal: 'Wet ∧ Slip → Wet' }],
    brief: BRIEF,
    hint: [T('有的目标要拆开一条已知，有的不用。几条路的第二个框里什么都不放，把收到的直接接到结果。', 'Some goals need a given taken apart, some do not. Leave the second region of Alternatives empty, wiring what it receives straight to its result.')],
    intro: [{ t: T('有时某一步可做可不做：已知里有「并且」就该拆开，没有就不必。可规则对已知碰到没有「并且」的已知会失败，整个证明助手跟着停下。', 'Sometimes a step may or may not apply: an “and” among the givens should be taken apart, and without one there is nothing to do. But Rule on a given fails when no given is an “and”, and the whole proof assistant stops with it.') }],
    solution: flow(['rule', 'impI'], { ways: [[['erule', 'conjE']], []] }, 'assumption'),
    after: T('什么都不做也是一个策略，而且永远成功。放在几条路的最后一个框，就是「试一试」。', 'Doing nothing is a tactic too, one that always succeeds. In the last region of Alternatives it makes “try”.'),
  }),
  prove({
    id: 's-each',
    title: T('每个目标都做一遍', 'Every goal'),
    adds: ['each'],
    budget: 4,
    tests: [{ goal: '(Rain → Rain) ∧ (Wind → Wind)' }, { goal: '(Wet ∧ Rain → Wet ∧ Rain) ∧ (Slip → Slip)' }],
    brief: T('设计一个证明助手，最多用 4 个元件，证完每一个目标。', 'Design a proof assistant of at most 4 parts that proves every goal.'),
    hint: [T('拼成以后的两个目标，要做的是同一件事。', 'The two goals after the join need the same thing done.')],
    intro: [{ t: T('引入 ∧ 以后，两个目标要做的事一模一样，可元件只对第一个目标下手，同样的元件要接两遍。新元件<part-ref to="part:each"></part-ref>：框里的元件对每个目标各做一遍，每次只看那一个目标。', 'After ∧ intro the two goals need exactly the same done, yet a part only works on the first goal, so the same parts would be wired twice. A new part, <part-ref to="part:each"></part-ref>: the parts inside run once on each goal, seeing only that one each time.') }],
    solution: flow(['rule', 'conjI'], { frame: 'each', body: [['rule', 'impI'], 'assumption'] }),
    after: T('框里的元件只看见一个目标，却对每个目标都做了一遍：同样的事只接一次。', 'The parts inside see one goal, yet run on every goal: the same thing wired only once.'),
  }),

  // ---------- backtracking ----------
  prove({
    id: 's-defer',
    title: T('先证哪一个', 'Which goal first'),
    adds: ['defer'],
    tests: [{ goal: '∃x. Human(x) ∧ Likes(x, ann)', hyps: ['Human(cy)', 'Human(bo)', 'Likes(bo, ann)'] }, { goal: '∃x. Bird(x) ∧ Flies(x)', hyps: ['Bird(ann)', 'Bird(dee)', 'Flies(dee)'] }],
    brief: BRIEF,
    hint: [T('「是人」的人不止一个，「喜欢安」的只有一个：让知道得多的那个目标先定下 ?t。', 'More than one is human, only one likes Ann: let the goal that knows more settle ?t first.')],
    intro: [
      { t: T('一个元件做一步，后面的元件接着它的结果做。可一个 ? 留在两个目标里时，先证哪一个，就由哪一个来定它：举例倒过来、再拼成以后，两个目标是 ?t是人、?t喜欢安。已知里有拿第一条对上的已知：先证「?t是人」，?t 就成了茜，可茜不喜欢安，第二个目标就证不下去了。', 'A part takes a step, and the next works on what it gives. But when a ?-letter sits in two goals, whichever is proved first settles it: after Example and ∧ intro backwards the goals are ?t is human, ?t likes Ann. Assumption takes the first given that fits: prove “?t is human” first, and ?t becomes Cy, who does not like Ann, so the second goal cannot be proved.') },
      { t: T('新元件「放到最后」：把第一个目标挪到最后，第二个目标先证。', 'A new part, “Defer”: it moves the first goal to the end, so the second is proved first.') },
    ],
    solution: script(['rule', 'exI'], ['rule', 'conjI'], 'defer', 'assumption', 'assumption'),
    after: T('一个 ? 被哪个目标先定下，结果就不一样：让知道得多的目标先说话。', 'Which goal settles a ?-letter first changes the outcome: let the goal that knows more speak first.'),
  }),
  each({
    id: 's-results',
    title: T('一串结果', 'A run of results'),
    showcase: T('一个元件现在给出所有对得上的结果，按顺序排成一串；后面的元件对每一种都做一遍，走不通的那几种自己消失：这就是回溯，光看说明想不到后面的元件会替前面的元件收拾残局', 'a part now gives every result that fits, in order; each later part works on each of them, and those that lead nowhere drop out: this is backtracking, and from the description alone one does not guess that later parts clear up after earlier ones'),
    tests: [{ goal: '∃x. Human(x) ∧ Likes(x, ann)', hyps: ['Human(cy)', 'Human(bo)', 'Likes(bo, ann)'] }, { goal: '∃x. Likes(x, ann) ∧ Likes(x, bo)', hyps: ['Likes(cy, ann)', 'Likes(en, bo)', 'Likes(dee, bo)', 'Likes(dee, ann)'] }],
    brief: BRIEF,
    hint: [T('不用放到最后了：已知里有给出每一个对得上的人，第二个已知里有对每一个都试。', 'No need to defer: Assumption gives everyone who fits, and the second Assumption tries each.')],
    intro: [
      { t: T('第二组测试里，两个目标都有不止一个人对得上，先证哪一个都会先拿错人：挪动次序也救不了。', 'In the second test more than one person fits each goal; whichever goes first takes the wrong one first, and moving goals round does not help.') },
      { t: T('从这一关起，元件给出<b>所有</b>对得上的结果，一种一种排成一串：已知里有每对上一条已知，就是一种结果。后面的元件对每一种都做一遍，做不下去的那几种自己消失，留下来的第一种就是答案。元件上会写「第 1 种结果，共 n 种」。', 'From this level on a part gives <b>every</b> result that fits, one after another: each given that Assumption fits is a result. Each later part works on every one of them; those that cannot go on drop out, and the first left is the answer. A part shows “result 1 of n”.') },
    ],
    solution: script(['rule', 'exI'], ['rule', 'conjI'], 'assumption', 'assumption'),
    after: T('这就是<wiki-ref to="backtracking"></wiki-ref>：走错了路，退回最近一个还有别的选择的地方，换下一种。', 'This is <wiki-ref to="backtracking"></wiki-ref>: down a wrong path, go back to the latest place with another choice and take the next one.'),
  }),

  // ---------- search ----------
  each({
    id: 's-append',
    title: T('两条路都要', 'Both ways'),
    tests: [{ goal: 'Rain ∨ Wind', hyps: ['Wind'] }, { goal: 'Rain ∨ Wind', hyps: ['Rain'] }, { goal: 'Wet ∨ Slip', hyps: ['Slip'] }],
    brief: BRIEF,
    hint: [T('引入 ∨ 的左右两条，各放一个框；哪一边对，交给后面的已知里有去挑。', '∨ intro left and right, one region each; which side is right, leave to the Assumption after.')],
    intro: [{ t: T('引入 ∨ 有左右两条规则，对着「或者」的目标，两条都不会失败。在<level-ref to="s-orelse"></level-ref>里，几条路只用第一个没失败的框，左边错了也回不去。回溯以后，<part-ref to="part:append"></part-ref>也给出所有结果：先是第一个框的每一种，再是下一个框的每一种。', '∨ intro has two rules, left and right, and against an “or” neither fails. In <level-ref to="s-orelse"></level-ref> Alternatives took only the first region that did not fail, and a wrong left side could not be undone. With backtracking <part-ref to="part:append"></part-ref> gives every result too: every one of the first region, then every one of the next.') }],
    solution: flow({ ways: [[['rule', 'disjI1']], [['rule', 'disjI2']]] }, 'assumption'),
    after: T('没有回溯时，几条路是「第一条能走的」；有了回溯，它是「每一条能走的」，留下了回头的余地。', 'Without backtracking, Alternatives means “the first way that goes”; with it, “every way that goes”, leaving room to turn back.'),
  }),
  each({
    id: 's-search',
    title: T('搜到证完为止', 'Search until done'),
    adds: ['search'],
    tests: [{ goal: 'Rain ∨ (Wind ∨ Wet)', hyps: ['Wet'] }, { goal: 'Rain ∨ (Wind ∨ Wet)', hyps: ['Wind'] }, { goal: '(Rain ∨ Wind) ∨ Wet', hyps: ['Wind'] }],
    brief: BRIEF,
    hint: [T('每一步：已知里有，或者引入 ∨ 的左边，或者右边。走几步，交给搜索。', 'Each step: Assumption, or ∨ intro left, or right. How many steps is the search’s business.')],
    intro: [
      { t: T('「或者」一层套一层，每一层都要挑一边，要走几步事先不知道。重复框不行：它只顺着第一种结果往下走，走进死胡同就停了。', '“Or” inside “or”: each level needs a side chosen, and how many steps it takes is not known beforehand. The repeat frame will not do: it follows only the first result, and stops in a dead end.') },
      { t: T('新元件<part-ref to="part:search"></part-ref>：框里的元件做一步，得到的每一种结果再接着做，一条路走到头（证完，或者做不下去）再退回来换下一条，这叫<wiki-ref to="dfs"></wiki-ref>。它送出找到的每一个证完的状态。', 'A new part, <part-ref to="part:search"></part-ref>: the parts inside take a step, and each result is stepped on again; one path is followed to its end (done, or stuck) before going back for the next. This is <wiki-ref to="dfs"></wiki-ref>. It gives every finished state it finds.') },
    ],
    solution: searchOf([['rule', 'disjI1'], ['rule', 'disjI2']]),
    after: T('一步做什么，加上<part-ref to="part:search"></part-ref>，就是一个完整的证明搜索。', 'What to do in a step, plus <part-ref to="part:search"></part-ref>, is a whole proof search.'),
  }),

  // ---------- by shape ----------
  each({
    id: 's-intro',
    title: T('按形状拆目标', 'The goal by its shape'),
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
    brief: T('设计一个证明助手：不管目标是什么样子，都用对得上的引入规则倒着拆一步，每一种拆法都留下；一条都对不上的，失败。', 'Design a proof assistant that takes any goal one step apart with the introduction rules that fit, keeping every way; when none fits, it fails.'),
    hint: [T('六条引入规则，每条一个框：几条路的元件上可以选到六个框。对不上的框自己失败。', 'Six introduction rules, one region each: Alternatives can be set to six. A region whose rule does not fit fails by itself.')],
    intro: [{ t: T('到现在，每一步用哪条规则，都是你看了这一关的目标挑好接进去的。要对付什么样子的目标都行，一步里就得把规则都试一遍。引入规则看的是目标：引入 ∧、假设框、引入 ∨ 左右两条、任取、举例。一个目标是什么样子，就是哪条引入规则造出来的。设计出的证明助手会成为新元件「拆目标」。', 'Until now, which rule each step uses was chosen by you, looking at this level’s goals. To take goals of any shape, a step must try every rule. Introduction rules look at the goal: join, the assumption box, ∨ intro left and right, for any, example. A goal’s shape says which introduction rule made it. The proof assistant you design becomes a new part, “Goal apart”.') }],
    solution: flow({ ways: [[['rule', 'conjI']], [['rule', 'impI']], [['rule', 'disjI1']], [['rule', 'disjI2']], [['rule', 'allI']], [['rule', 'exI']]] }),
    after: T('对不上的规则自己失败，几条路把对得上的都留下：一个元件，就是「按形状拆目标」。', 'A rule that does not fit fails by itself, and Alternatives keeps the ones that fit: one part that takes the goal apart by its shape.'),
  }),
  each({
    id: 's-elim',
    title: T('按形状用已知', 'The givens by their shape'),
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
    hint: [T('六条消去规则，每条一个框，框里是规则对已知。', 'Six elimination rules, one region each, with Rule on a given in it.')],
    intro: [{ t: T('另一半是消去规则，它们看的是已知：消去 ∧、消去 ∨、用上「若…则…」、矛盾推出一切、拿出那一个、取一个再用。已知是什么样子，就能怎样用它。设计出的证明助手会成为新元件「用已知」。', 'The other half are the elimination rules, which look at the givens: ∧ elim, ∨ elim, use an “if”, from contradiction, take the one there is, take one and use it. A given’s shape says how it can be used. The proof assistant you design becomes a new part, “Use a given”.') }],
    solution: flow({ ways: [[['erule', 'conjE']], [['erule', 'disjE']], [['erule', 'impE']], [['erule', 'botE']], [['erule', 'exE']], [['erule', 'allE']]] }),
    after: T('拆目标看目标的形状，用已知看已知的形状：两个元件合起来，就是一步里能做的所有事。', 'Goal apart looks at the goal’s shape, Use a given at the givens’: together the two parts are everything one step can do.'),
  }),

  // ---------- your own auto ----------
  each({
    id: 's-auto',
    adds: ['introRules', 'elimRules'],
    title: T('自己的 auto', 'Your own auto'),
    builds: 'auto',
    tests: [{ goal: 'Rain ∧ (Wind ∨ Wet) → (Rain ∧ Wind) ∨ (Rain ∧ Wet)' }, { goal: '(Rain → Wet) → ((Wet → Slip) → (Rain → Slip))' }, { goal: '(∃x. Human(x) ∧ Likes(x, ann)) → ∃x. Likes(x, ann)' }, { goal: '(∀x. Human(x) ∧ Bird(x)) → ∀x. Bird(x)' }],
    brief: T('设计一个证明助手，证完每一个目标。', 'Design a proof assistant that proves every goal.'),
    hint: [T('每一步：已知里有，或者拆目标，或者用已知。', 'Each step: Assumption, or Goal apart, or Use a given.')],
    intro: [{ t: T('一步里能做的事都齐了：已知里有，拆目标，用已知。放进<part-ref to="part:search"></part-ref>，每一步三样都试，一条路走不通就退回来换下一条。这四个目标，你在连接词和量词两章里都在证明板上一个个接过。设计出的证明助手会成为新元件<part-ref to="lemma:auto"></part-ref>。', 'Everything one step can do is in hand: Assumption, Goal apart, Use a given. Put them in a <part-ref to="part:search"></part-ref>, and each step tries all three, going back to the next way when a path leads nowhere. These four goals you wired one by one on the proof board, in the chapters on connectives and quantifiers. The proof assistant you design becomes a new part, <part-ref to="lemma:auto"></part-ref>.') }],
    solution: searchOf(['introRules', 'elimRules']),
    after: T('拿出那一个和举例谁先谁后，搜索自己会试，回溯替你找到对的顺序。已知不会被拿走，同一条能一用再用；一步走回原地的，搜索不往下走，所以它停得下来。连接词一章的大多数关，这一个元件就证完了。', 'Whether to take out or give an example first, the search tries for itself, and backtracking finds the order that works. Givens are never taken away, so one can be used again and again; a step back where it was the search does not follow, and so it comes to an end. Most levels of the connectives chapter this one part proves.'),
  }),

  // ---------- topic: a family tree by rules ----------
  ask({
    id: 'pl-grand',
    title: T('谁是祖父母', 'Who is a grandparent'),
    rules: { grand: { name: T('祖父母', 'Grandparent'), premises: ['Parent(?x, ?y)', 'Parent(?y, ?z)'], conclusion: 'Grand(?x, ?z)' } },
    tests: [{ goal: 'Grand(?w, cy)', hyps: FAMILY, answers: ['ann'] }, { goal: 'Grand(bo, ?w)', hyps: FAMILY, answers: ['en'] }, { goal: 'Grand(ann, ?w)', hyps: FAMILY, answers: ['cy', 'dee'] }],
    brief: T('设计一个证明助手，找出每个问题的所有答案。', 'Design a proof assistant that finds every answer to each question.'),
    hint: [T('倒着用这一关的规则「祖父母」，两个前提各对上一条已知。每一种对法都是一个答案。', 'Use this level’s rule Grandparent backwards, and fit each premise to a given. Every way of fitting is an answer.')],
    intro: [
      { t: T('<level-ref to="q-grand"></level-ref>里，你把「祖父母」写成了一句查询。这一次它是一条规则：⟦?x是?y的父母; ?y是?z的父母⟧ ⟹ ?x是?z的祖父母。族谱上的事实是目标的已知。', 'In <level-ref to="q-grand"></level-ref> you wrote “grandparent” as a query. This time it is a rule: ⟦?x is a parent of ?y; ?y is a parent of ?z⟧ ⟹ ?x is a grandparent of ?z. The family tree’s facts are the goal’s givens.') },
      { t: T('问题本身带着 ?：「?w是茜的祖父母」。证出它的每一种方法里，?w 是谁，就是一个答案。', 'The question itself holds a ?-letter: “?w is a grandparent of Cy”. In each way of proving it, who ?w is, is an answer.') },
    ],
    solution: script(['rule', 'grand'], 'assumption', 'assumption'),
    after: T('这就是 Prolog：程序是一组规则，提问就是要证一个带 ? 的目标，答案就是证出来时 ? 变成了什么。', 'This is Prolog: a program is a set of rules, a question a goal with ?-letters to prove, and the answers what the letters became in each proof.'),
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
    hint: [T('不知道隔几代，就交给搜索：每一步，已知里有，或者用这两条规则里的一条。', 'Not knowing how many generations, leave it to a search: each step, Assumption, or one of the two rules.')],
    intro: [{ t: T('祖先是父母，或者父母的祖先：一条规则用到了它自己。隔几代，证明就有多长，事先不知道。', 'An ancestor is a parent, or a parent’s ancestor: a rule that uses itself. As many generations apart, so long is the proof, and nobody knows beforehand.') }],
    solution: searchOf([['rule', 'anc1'], ['rule', 'anc2']]),
    after: T('Prolog 跑的就是这个证明助手：按规则写下的顺序，深度优先地试，走不通就回溯。', 'Prolog runs exactly this proof assistant: rules tried in the order written, depth first, backtracking when stuck.'),
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
    hint: [T('倒着用「往上数」以后，第一个目标又是一个「祖先」，搜索会一直往里钻。先问「父母」，?y 就定下来了。', 'After “counting up” backwards, the first goal is an “ancestor” again, and the search drills in for ever. Ask “parent” first, and ?y is settled.')],
    intro: [{ t: T('这一回「多代」那条规则是倒过来写的：先找 ?x 的祖先 ?y，再看 ?y 是不是 ?z 的父母。说的是同一件事。', 'This time the rule for more generations is written the other way round: first an ancestor ?y of ?x, then whether ?y is a parent of ?z. It says the same thing.') }],
    solution: searchOf([['rule', 'anc1'], ['rule', 'anc3']], { region: ['defer'] }),
    naive: searchOf([['rule', 'anc1'], ['rule', 'anc3']]),
    after: T('两条规则意思一样，一条让搜索停得下来，一条不能：规则怎么写、子目标先问哪个，决定了程序会不会停。写 Prolog 的人都知道，这叫左递归。', 'The two rules mean the same, yet one lets the search stop and the other does not: how a rule is written and which subgoal is asked first decide whether the program halts. Prolog programmers call it left recursion.'),
  }),

  // ---------- challenge ----------
  each({
    id: 's-loop',
    title: T('停不下来的搜索', 'A search that never stops'),
    rules: { trans: { name: T('年纪大可以传下去', 'Older passes on'), premises: ['Older(?x, ?y)', 'Older(?y, ?z)'], conclusion: 'Older(?x, ?z)' } },
    tests: [{ goal: 'Older(ann, cy)', hyps: ['Older(ann, bo)', 'Older(bo, cy)'] }, { goal: 'Older(bo, dee)', hyps: ['Older(bo, cy)', 'Older(cy, dee)'] }, { goal: 'Older(cy, ann)', hyps: ['Older(ann, bo)', 'Older(bo, cy)'], want: 'fails' }],
    brief: T('设计一个证明助手：完成需要证明的测试目标，对指定的失败目标报告失败。', 'Design a proof assistant that proves the required test goals and reports failure for the designated failure cases.'),
    hint: [T('倒着用「传下去」，第一个目标里又是一个新的 ?y，还能再倒着用。证不出的那一句，搜索永远有下一步可走，而且每一步都是新目标。', '“Passes on” used backwards leaves a new ?y in the first goal, and can be used backwards again. For the sentence that cannot be proved, the search always has another step, each a new goal.')],
    intro: [{ t: T('安比博年纪大，博比茜年纪大，所以安比茜年纪大；可茜比安年纪大，怎么也推不出来。证得出的要证完，证不出的，证明助手也得停下来，说一声证不出来。', 'Ann is older than Bo and Bo older than Cy, so Ann is older than Cy; but that Cy is older than Ann follows from nothing. What can be proved must be, and of what cannot, the proof assistant must still stop and say it cannot.') }],
    solution: searchOf([['rule', 'trans']], { depth: 3 }),
    naive: searchOf([['rule', 'trans']]),
    after: T('走回原地的路，搜索看得出来；可一条每一步都换上新 ? 的路，它看不出是在绕圈，深度优先搜索就在证不出的地方一直走下去。给搜索设一个深度，它就一定会停；代价是更深的证明它找不到。', 'A path back where it was the search can see; a path that puts a new ?-letter in at every step it cannot tell from progress, and depth-first search goes on for ever where nothing can be proved. With a depth limit the search always stops; the price is that a deeper proof cannot be found.'),
  }),
]
