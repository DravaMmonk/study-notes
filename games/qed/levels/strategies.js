// Chapter 8 · Tactics: a machine is no longer a script for one shape of goal but a program for many, a tactic. First the
// combinators: or else, the repeat frame on proof states, both together, an or else that does nothing (try), every goal.
// Then backtracking: which goal first can decide a ?-letter (defer); from then on a card gives every result and each
// card after it works on each (the showcase), append keeps two ways, and depth-first search goes on until no goal is
// left. Then the player's own auto, from rule sets: introduction rules, elimination rules, both (it becomes a part), and
// what it cannot do (proof by contradiction, by hand first). The topic asks a family tree by rules (Prolog is rule
// resolution and depth-first search); the challenge is a search that never stops on what cannot be proved.
import { machine } from '../../kit/domains/logic/build.js'
import { script } from './metavars.js'

const T = (zh, en) => ({ zh, en })
const GOAL = [{ name: 'in', label: T('目标', 'Goal') }]
const prove = (level) => ({ kind: 'machine', want: 'proved', inputs: GOAL, ...level })
// From 一串结果 on, a card gives every result; from 按形状拆 on, it can try a set of rules.
const each = (level) => prove({ backtrack: true, ...level })
const sets = (level) => each({ ruleSets: true, ...level })
const ask = (level) => ({ kind: 'machine', want: 'answers', inputs: [{ name: 'in', label: T('问题', 'Question') }], backtrack: true, ...level })
const BRIEF = T('接一台机器，证完每一个目标。', 'Wire a machine that proves every goal.')

// Depth-first search over one step: assumption, else (appended) each of the steps given, the last followed by the cards
// in `region` (all in that step's region); a depth limit when given.
function searchOf(steps, { depth, region = [] } = {}) {
  const nodes = { s: ['search', depth ? { depth: String(depth) } : {}] }
  const wires = ['in>s.in', 's>out']
  let n = 0
  // Fill a region (where), opened by src, its result into dst, with alternatives, each a row of cards.
  const fill = (alts, where, src, dst) => {
    if (alts.length === 1) {
      let from = src
      for (const [type, params] of alts[0]) {
        const id = `c${n++}`
        nodes[id] = [type, params, where]
        wires.push(`${from}>${id}.in`)
        from = id
      }
      wires.push(`${from}>${dst}`)
      return
    }
    const id = `p${n++}`
    nodes[id] = ['append', {}, where]
    wires.push(`${src}>${id}.in`, `${id}>${dst}`)
    fill([alts[0]], `${id}/first`, `${id}#first`, `${id}.first`)
    fill(alts.slice(1), `${id}/second`, `${id}#second`, `${id}.second`)
  }
  const alts = [[['assumption', {}]], ...steps.map(([type, rule], k) => [[type, { rule }], ...(k === steps.length - 1 ? region.map((t) => [t, {}]) : [])])]
  fill(alts, 's', 's#body', 's.body')
  return machine(nodes, wires)
}

const FAMILY = ['Parent(ann, bo)', 'Parent(bo, cy)', 'Parent(bo, dee)', 'Parent(dee, en)', 'Parent(fay, en)']

export const strategies = [
  // ---------- combinators ----------
  prove({
    id: 's-orelse',
    title: T('不行就换', 'Or else'),
    adds: ['orElse'],
    tests: [{ goal: 'Wind ∨ Rain', hyps: ['Wind'] }, { goal: 'Rain → Rain' }, { goal: 'Slip ∨ Wet', hyps: ['Slip'] }],
    brief: BRIEF,
    hint: [T('第一张卡片要看目标是什么样子：是「或者」就引入 ∨，是「若…则…」就倒着用假设框。', 'The first card depends on the goal’s shape: an “or” wants Bring in ∨, an “if … then …” the assumption box backwards.')],
    intro: [
      { t: T('到上一章为止，一台机器是一份脚本：卡片一张接一张，专证一种样子的目标。从这一章起，一台机器要对付各种样子的目标，它是一个<b>策略</b>：一段会产生证明的程序。Isabelle 的 auto、Lean 的 simp 和 aesop 都是这样的程序。', 'Up to the last chapter a machine was a script: card after card, for goals of one shape. From this chapter on a machine must take goals of many shapes; it is a <b>tactic</b>, a program that makes proofs. Isabelle’s auto and Lean’s simp and aesop are such programs.') },
      { t: T('新元件<b>不行就换</b>：两个框拿到同一个状态，第一个框的结果没失败就用它，失败了就用第二个框的。', 'A new part, <b>Or else</b>: both regions get the same state; the first region’s result is used unless it failed, and then the second’s.') },
    ],
    solution: machine({ o: ['orElse'], a: ['rule', { rule: 'disjI1' }, 'o/first'], b: ['rule', { rule: 'impI' }, 'o/second'], c: ['assumption'] }, ['in>o.in', 'o#first>a.in', 'a>o.first', 'o#second>b.in', 'b>o.second', 'o>c.in', 'c>out']),
    after: T('策略只会用规则，所以不管它怎样组合，证出来的都是核认可的定理：自动化造不出假定理。', 'A tactic only ever uses rules, so however it is put together, what it proves is a theorem the kernel accepts: automation cannot make a false theorem.'),
  }),
  prove({
    id: 's-repeat',
    title: T('做到做不动', 'Until it cannot'),
    tests: [{ goal: 'Rain → (Wind → (Wet → Rain))' }, { goal: 'Rain → Rain' }, { goal: 'Slip → (Rain → Slip)' }],
    brief: BRIEF,
    hint: [T('「若…则…」有几层，假设框就要倒着用几次。', 'The assumption box is needed backwards once for each level of “if … then …”.')],
    intro: [{ t: T('重复框在合一器里一圈一圈地合一；放在证明状态上，它一圈一圈地用框里的策略，直到策略失败，停在失败前的那一圈。', 'The repeat frame went round unifying in the unifier; on a proof state it goes round using the tactic inside, until the tactic fails, stopping at the round before.') }],
    solution: machine({ r: ['repeat'], a: ['rule', { rule: 'impI' }, 'r'], c: ['assumption'] }, ['in>r.in', 'r#body>a.in', 'a>r.body', 'r>c.in', 'c>out']),
    after: T('失败不算错：它告诉重复框该停了。', 'Failing is no fault here: it tells the frame to stop.'),
  }),
  prove({
    id: 's-mix',
    title: T('重复里套着不行就换', 'Or else, repeated'),
    tests: [{ goal: 'Rain → (Wind → Rain ∧ Wind)' }, { goal: '(Rain → Rain) ∧ (Wind → (Rain → Wind))' }, { goal: 'Rain → (Wind → Wind ∧ (Rain ∧ Wind))' }],
    brief: BRIEF,
    hint: [T('每一圈：目标在已知里就收掉，不然看它是「若…则…」还是「并且」。', 'Each round: if the goal is a given, finish it; otherwise see whether it is an “if … then …” or an “and”.')],
    intro: [{ t: T('目标一层套一层，「若…则…」和「并且」混在一起，次序每个目标都不一样。', 'Goal inside goal, “if … then …” and “and” mixed, in a different order every time.') }],
    solution: machine(
      { r: ['repeat'], o1: ['orElse', {}, 'r'], x: ['assumption', {}, 'o1/first'], o2: ['orElse', {}, 'o1/second'], i: ['rule', { rule: 'impI' }, 'o2/first'], j: ['rule', { rule: 'conjI' }, 'o2/second'] },
      ['in>r.in', 'r#body>o1.in', 'o1#first>x.in', 'x>o1.first', 'o1#second>o2.in', 'o2#first>i.in', 'i>o2.first', 'o2#second>j.in', 'j>o2.second', 'o2>o1.second', 'o1>r.body', 'r>out'],
    ),
    after: T('框里套框，就是程序里的循环套着分支。这台机器已经能证一大类目标了。', 'Frames inside frames are a loop around a branch, as in any program. This machine already proves a whole class of goals.'),
  }),
  prove({
    id: 's-try',
    title: T('可做可不做', 'A step that may not apply'),
    tests: [{ goal: 'Rain ∧ Wind → Rain' }, { goal: 'Rain → Rain' }, { goal: 'Wet ∧ Slip → Wet' }],
    brief: BRIEF,
    hint: [T('有的目标要拆开一条已知，有的不用。不行就换的第二个框里什么都不放，把收到的直接接到结果。', 'Some goals need a given taken apart, some do not. Leave the second region of Or else empty, wiring what it receives straight to its result.')],
    intro: [{ t: T('有时某一步可做可不做：能做就做，做不了就当没这一步。', 'Sometimes a step may or may not apply: do it if it can be done, and otherwise go on as if it were not there.') }],
    solution: machine({ i: ['rule', { rule: 'impI' }], o: ['orElse'], e: ['erule', { rule: 'conjE' }, 'o/first'], c: ['assumption'] }, ['in>i.in', 'i>o.in', 'o#first>e.in', 'e>o.first', 'o#second>o.second', 'o>c.in', 'c>out']),
    after: T('什么都不做也是一个策略，而且永远成功。和不行就换合起来，就是「试一试」。', 'Doing nothing is a tactic too, one that always succeeds. With Or else it makes “try”.'),
  }),
  prove({
    id: 's-each',
    title: T('每个目标都做一遍', 'Every goal'),
    adds: ['each'],
    budget: 4,
    tests: [{ goal: '(Rain → Rain) ∧ (Wind → Wind)' }, { goal: '(Wet ∧ Rain → Wet ∧ Rain) ∧ (Slip → Slip)' }],
    brief: T('接一台机器，最多用 4 张卡片，证完每一个目标。', 'Wire a machine of at most 4 cards that proves every goal.'),
    hint: [T('拼成以后的两个目标，要做的是同一件事。', 'The two goals after the join need the same thing done.')],
    intro: [{ t: T('拼成 ∧ 以后，两个目标要做的事一模一样，卡片却要再接一遍。新元件<b>每个目标</b>：框里的卡片对每个目标各做一遍，每次只看那一个目标。', 'After Join ∧, the two goals need exactly the same done, yet the cards would have to be wired twice. A new part, <b>Every goal</b>: the cards inside run once on each goal, seeing only that one each time.') }],
    solution: machine({ c: ['rule', { rule: 'conjI' }], e: ['each'], i: ['rule', { rule: 'impI' }, 'e'], a: ['assumption', {}, 'e'] }, ['in>c.in', 'c>e.in', 'e#body>i.in', 'i>a.in', 'a>e.body', 'e>out']),
    after: T('框里的卡片只看见一个目标，却对每个目标都做了一遍：同样的事只接一次。', 'The cards inside see one goal, yet run on every goal: the same thing wired only once.'),
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
      { t: T('举例倒过来、再拼成以后，有两个目标：?t是人，?t喜欢安。已知里有拿第一个对上的已知：先证「?t是人」，?t 就成了茜，可茜不喜欢安，第二个目标就证不下去了。', 'After Example and Join ∧ backwards there are two goals: ?t is human, ?t likes Ann. Assumption takes the first given that fits: prove “?t is human” first, and ?t becomes Cy, who does not like Ann, so the second goal cannot be proved.') },
      { t: T('新元件<b>放到最后</b>：把第一个目标挪到最后，第二个目标先证。', 'A new part, <b>Defer</b>: it moves the first goal to the end, so the second is proved first.') },
    ],
    solution: script(['rule', 'exI'], ['rule', 'conjI'], 'defer', 'assumption', 'assumption'),
    after: T('一个 ? 被哪个目标先定下，结果就不一样：让知道得多的目标先说话。', 'Which goal settles a ?-letter first changes the outcome: let the goal that knows more speak first.'),
  }),
  each({
    id: 's-results',
    title: T('一串结果', 'A run of results'),
    showcase: T('一张卡片现在给出所有对得上的结果，按顺序排成一串；后面的卡片对每一种都做一遍，走不通的那几种自己消失：这就是回溯，光看说明想不到后面的卡片会替前面的卡片收拾残局', 'a card now gives every result that fits, in order; each later card works on each of them, and those that lead nowhere drop out: this is backtracking, and from the description alone one does not guess that later cards clear up after earlier ones'),
    tests: [{ goal: '∃x. Human(x) ∧ Likes(x, ann)', hyps: ['Human(cy)', 'Human(bo)', 'Likes(bo, ann)'] }, { goal: '∃x. Likes(x, ann) ∧ Likes(x, bo)', hyps: ['Likes(cy, ann)', 'Likes(en, bo)', 'Likes(dee, bo)', 'Likes(dee, ann)'] }],
    brief: BRIEF,
    hint: [T('不用放到最后了：已知里有给出每一个对得上的人，第二张已知里有对每一个都试。', 'No need to defer: Assumption gives everyone who fits, and the second Assumption tries each.')],
    intro: [
      { t: T('第二组测试里，两个目标都有不止一个人对得上，先证哪一个都会先拿错人。', 'In the second test more than one person fits each goal; whichever goes first takes the wrong one first.') },
      { t: T('从这一关起，卡片给出<b>所有</b>对得上的结果，一种一种排成一串：已知里有每对上一条已知，就是一种结果。后面的卡片对每一种都做一遍，做不下去的那几种自己消失，留下来的第一种就是答案。卡片上会写「第 1 种结果，共 n 种」。', 'From this level on a card gives <b>every</b> result that fits, one after another: each given that Assumption fits is a result. Each later card works on every one of them; those that cannot go on drop out, and the first left is the answer. A card shows “result 1 of n”.') },
    ],
    solution: script(['rule', 'exI'], ['rule', 'conjI'], 'assumption', 'assumption'),
    after: T('这就是<b>回溯</b>：走错了路，退回最近一个还有别的选择的地方，换下一种。', 'This is <b>backtracking</b>: down a wrong path, go back to the latest place with another choice and take the next one.'),
  }),
  each({
    id: 's-append',
    title: T('两条路都要', 'Both ways'),
    adds: ['append'],
    tests: [{ goal: 'Rain ∨ Wind', hyps: ['Wind'] }, { goal: 'Rain ∨ Wind', hyps: ['Rain'] }, { goal: 'Wet ∨ Slip', hyps: ['Slip'] }],
    brief: BRIEF,
    hint: [T('不行就换只要第一个没失败的；「或者」的两边，哪一边对是后面才知道的。', 'Or else keeps only the first that does not fail; which side of the “or” is right shows only later.')],
    intro: [{ t: T('引入 ∨ 有左右两条规则，对着「或者」的目标两条都不会失败。不行就换只会拿左边那条，后面发现错了也回不去。新元件<b>两条路都要</b>：先是第一个框的每一种结果，再是第二个框的每一种结果。', 'Bring in ∨ has two rules, left and right, and against an “or” goal neither fails. Or else only takes the left one, and finding out later that it was wrong, cannot go back. A new part, <b>Append</b>: every result of the first region, then every result of the second.') }],
    solution: machine({ p: ['append'], a: ['rule', { rule: 'disjI1' }, 'p/first'], b: ['rule', { rule: 'disjI2' }, 'p/second'], c: ['assumption'] }, ['in>p.in', 'p#first>a.in', 'a>p.first', 'p#second>b.in', 'b>p.second', 'p>c.in', 'c>out']),
    after: T('不行就换是「第一个能走的」，两条路都要是「每一条能走的」：后者留下了回头的余地。', 'Or else means “the first that goes”, Append “every one that goes”: the second leaves room to turn back.'),
  }),
  each({
    id: 's-search',
    title: T('搜到证完为止', 'Search until done'),
    adds: ['search'],
    tests: [{ goal: 'Rain ∨ (Wind ∨ Wet)', hyps: ['Wet'] }, { goal: 'Rain ∨ (Wind ∨ Wet)', hyps: ['Wind'] }, { goal: '(Rain ∨ Wind) ∨ Wet', hyps: ['Wind'] }],
    brief: BRIEF,
    hint: [T('每一步：已知里有，或者引入 ∨ 的左边，或者右边。走几步，交给搜索。', 'Each step: Assumption, or Bring in ∨ left, or right. How many steps is the search’s business.')],
    intro: [
      { t: T('要证到底要几步，事先不知道。重复框只顺着第一种结果往下走，走进死胡同就停了。', 'How many steps it takes is not known beforehand. The repeat frame follows only the first result, and stops in a dead end.') },
      { t: T('新元件<b>搜到证完</b>：框里的卡片做一步，得到的每一种结果再接着做，一条路走到头（证完，或者做不下去）再退回来换下一条，这叫<b>深度优先搜索</b>。它送出找到的每一个证完的状态。', 'A new part, <b>Search</b>: the cards inside take a step, and each result is stepped on again; one path is followed to its end (done, or stuck) before going back for the next. This is <b>depth-first search</b>. It gives every finished state it finds.') },
    ],
    solution: searchOf([['rule', 'disjI1'], ['rule', 'disjI2']]),
    after: T('一步做什么，加上「搜到证完」，就是一个完整的证明搜索。', 'What to do in a step, plus search until done, is a whole proof search.'),
  }),

  // ---------- your own auto ----------
  sets({
    id: 's-intro',
    title: T('按形状拆', 'By shape'),
    tests: [{ goal: 'Rain → (Wind → Rain ∧ Wind)' }, { goal: 'Rain → (Wind → Wind ∨ Wet)' }, { goal: '∀x. Human(x) → Human(x) ∨ Bird(x)' }],
    brief: BRIEF,
    hint: [T('引入规则一组：拼成、假设框、引入 ∨、任取、举例，对上哪条用哪条。', 'The introduction rules as a set: join, assumption box, bring in ∨, for any, example, whichever fits.')],
    intro: [{ t: T('用规则卡片上，现在还能选<b>一组规则</b>：选「引入规则（一组）」，每一条引入规则都试，对上的每一条都是一种结果。目标是什么样子，就用哪条规则拆它。', 'The Rule card can now also take <b>a set of rules</b>: with “Introduction rules (a set)” every introduction rule is tried, and each that fits is a result. Whatever the goal’s shape, the rule for it takes it apart.') }],
    solution: searchOf([['rule', 'intro']]),
    after: T('引入规则看的是目标：一个目标是什么样子，就是哪条引入规则造出来的。', 'Introduction rules look at the goal: its shape says which introduction rule made it.'),
  }),
  sets({
    id: 's-elim',
    title: T('用掉已知', 'Using givens up'),
    tests: [{ goal: 'Wind', hyps: ['Rain ∧ Wind'] }, { goal: 'Wet', hyps: ['(Rain ∧ Wind) ∧ Wet'] }, { goal: 'Wind', hyps: ['Wind ∨ Wind'] }, { goal: 'Rain', hyps: ['⊥'] }],
    brief: BRIEF,
    hint: [T('这一次目标不用拆，要拆的是已知：消去规则一组。', 'This time it is not the goal that comes apart but the givens: the elimination rules as a set.')],
    intro: [{ t: T('另一组是<b>消去规则</b>：拆开 ∧、分情况、用上「若…则…」、矛盾推出一切、拿出那一个、取一个再用。用掉已知的卡片选它，每一条消去规则对每一条已知都试。', 'The other set is the <b>elimination rules</b>: split ∧, case by case, use an “if”, from contradiction, take the one there is, take one and use it. On the Use up card it tries every elimination rule on every given.') }],
    solution: searchOf([['erule', 'elim']]),
    after: T('消去规则看的是已知：已知是什么样子，就能怎样用它。', 'Elimination rules look at the givens: a given’s shape says how it can be used.'),
  }),
  sets({
    id: 's-auto',
    title: T('自己的 auto', 'Your own auto'),
    builds: 'auto',
    tests: [{ goal: 'Rain ∧ (Wind ∨ Wet) → (Rain ∧ Wind) ∨ (Rain ∧ Wet)' }, { goal: '(Rain → Wet) → ((Wet → Slip) → (Rain → Slip))' }, { goal: '(∃x. Human(x) ∧ Likes(x, ann)) → ∃x. Likes(x, ann)' }, { goal: '(∀x. Human(x) ∧ Bird(x)) → ∀x. Bird(x)' }],
    brief: T('接一台机器，证完每一个目标。造出的机器是新元件<b>自己的 auto</b>。', 'Wire a machine that proves every goal. The machine becomes a new part, <b>your own auto</b>.'),
    hint: [T('每一步：已知里有，或者拆目标，或者用掉已知。', 'Each step: Assumption, or take the goal apart, or use a given up.')],
    intro: [{ t: T('把两组规则放进同一个搜索里：目标拆得动就拆目标，已知用得上就用已知，都试。这一台机器，是你自己的 auto。', 'Put both sets in one search: take the goal apart where it comes apart, use a given where one can be used, and try them all. This machine is your own auto.') }],
    solution: searchOf([['rule', 'intro'], ['erule', 'elim']]),
    after: T('拿出那一个和举例谁先谁后，搜索自己会试，回溯替你找到对的顺序。连接词一章的大多数关，这一张卡片就证完了。', 'Whether to take out or give an example first, the search tries for itself, and backtracking finds the order that works. Most levels of the connectives chapter this one card proves.'),
  }),
  sets({
    id: 's-lem',
    title: T('auto 做不到的', 'What auto cannot do'),
    tests: [{ goal: '¬¬Rain → Rain' }, { goal: '(¬Rain → Rain) → Rain' }],
    brief: BRIEF,
    hint: [T('反证法要自己用一次：倒着用它，目标就成了「并非并非」。', 'Use proof by contradiction once yourself: backwards, it makes the goal a “not not”.')],
    intro: [{ t: T('auto 只用引入和消去规则。反证法 ⟦¬¬?A⟧ ⟹ ?A 的结论对上任何目标：放进搜索里，每个目标都会被它换成「并非并非」，再换一次，一直换下去。所以 auto 不用它，要用就自己先用一次。', 'auto uses only introduction and elimination rules. Proof by contradiction, ⟦¬¬?A⟧ ⟹ ?A, concludes any goal: put in the search, it turns every goal into a “not not”, and again, without end. So auto leaves it out; to use it, use it once yourself first.') }],
    solution: script(['rule', 'impI'], ['rule', 'raa'], 'auto'),
    naive: script('auto'),
    after: T('只用引入和消去规则证得出的，正是直觉主义逻辑的定理；排中律、反证法要另外给。', 'What introduction and elimination rules alone prove is exactly intuitionistic logic; excluded middle and proof by contradiction must be given besides.'),
  }),

  // ---------- topic: a family tree by rules ----------
  ask({
    id: 'pl-grand',
    title: T('谁是祖父母', 'Who is a grandparent'),
    rules: { grand: { name: T('祖父母', 'Grandparent'), premises: ['Parent(?x, ?y)', 'Parent(?y, ?z)'], conclusion: 'Grand(?x, ?z)' } },
    tests: [{ goal: 'Grand(?w, cy)', hyps: FAMILY, answers: ['ann'] }, { goal: 'Grand(bo, ?w)', hyps: FAMILY, answers: ['en'] }, { goal: 'Grand(ann, ?w)', hyps: FAMILY, answers: ['cy', 'dee'] }],
    brief: T('接一台机器，找出每个问题的所有答案。', 'Wire a machine that finds every answer to each question.'),
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
    brief: T('接一台机器，找出每个问题的所有答案。', 'Wire a machine that finds every answer to each question.'),
    hint: [T('不知道隔几代，就交给搜索：每一步，已知里有，或者用这两条规则里的一条。', 'Not knowing how many generations, leave it to a search: each step, Assumption, or one of the two rules.')],
    intro: [{ t: T('祖先是父母，或者父母的祖先：一条规则用到了它自己。隔几代，证明就有多长，事先不知道。', 'An ancestor is a parent, or a parent’s ancestor: a rule that uses itself. As many generations apart, so long is the proof, and nobody knows beforehand.') }],
    solution: searchOf([['rule', 'anc1'], ['rule', 'anc2']]),
    after: T('Prolog 跑的就是这台机器：按规则写下的顺序，深度优先地试，走不通就回溯。', 'Prolog runs exactly this machine: rules tried in the order written, depth first, backtracking when stuck.'),
  }),
  ask({
    id: 'pl-order',
    title: T('先问谁', 'Ask which first'),
    rules: {
      anc1: { name: T('祖先·一代', 'Ancestor: one generation'), premises: ['Parent(?x, ?y)'], conclusion: 'Anc(?x, ?y)' },
      anc3: { name: T('祖先·往上数', 'Ancestor: counting up'), premises: ['Anc(?x, ?y)', 'Parent(?y, ?z)'], conclusion: 'Anc(?x, ?z)' },
    },
    tests: [{ goal: 'Anc(ann, ?w)', hyps: FAMILY, answers: ['bo', 'cy', 'dee', 'en'] }, { goal: 'Anc(bo, ?w)', hyps: FAMILY, answers: ['cy', 'dee', 'en'] }],
    brief: T('接一台机器，找出每个问题的所有答案。', 'Wire a machine that finds every answer to each question.'),
    hint: [T('倒着用「往上数」以后，第一个目标又是一个「祖先」，搜索会一直往里钻。先问「父母」，?y 就定下来了。', 'After “counting up” backwards, the first goal is an “ancestor” again, and the search drills in for ever. Ask “parent” first, and ?y is settled.')],
    intro: [{ t: T('这一回「多代」那条规则是倒过来写的：先找 ?x 的祖先 ?y，再看 ?y 是不是 ?z 的父母。说的是同一件事。', 'This time the rule for more generations is written the other way round: first an ancestor ?y of ?x, then whether ?y is a parent of ?z. It says the same thing.') }],
    solution: searchOf([['rule', 'anc1'], ['rule', 'anc3']], { region: ['defer'] }),
    naive: searchOf([['rule', 'anc1'], ['rule', 'anc3']]),
    after: T('两条规则意思一样，一条让搜索停得下来，一条不能：规则怎么写、子目标先问哪个，决定了程序会不会停。写 Prolog 的人都知道，这叫左递归。', 'The two rules mean the same, yet one lets the search stop and the other does not: how a rule is written and which subgoal is asked first decide whether the program halts. Prolog programmers call it left recursion.'),
  }),

  // ---------- challenge ----------
  each({
    id: 's-loop',
    title: T('会绕圈的搜索', 'A search that goes round'),
    rules: { sym: { name: T('认识是相互的', 'Knowing goes both ways'), premises: ['Knows(?x, ?y)'], conclusion: 'Knows(?y, ?x)' } },
    tests: [{ goal: 'Knows(bo, ann)', hyps: ['Knows(ann, bo)'] }, { goal: 'Knows(cy, bo)', hyps: ['Knows(ann, bo)', 'Knows(bo, cy)'] }, { goal: 'Knows(ann, cy)', hyps: ['Knows(ann, bo)', 'Knows(bo, cy)'], want: 'fails' }],
    brief: T('接一台机器：证得出的证完；证不出的，停下来说证不出来。', 'Wire a machine that proves what can be proved, and of what cannot, stops and says so.'),
    hint: [T('认识是相互的，倒过来用，又能再倒过来。证不出的那一句，搜索永远有下一步可走。', 'Knowing goes both ways; used backwards it can be used backwards again. For the sentence that cannot be proved, the search always has another step.')],
    intro: [{ t: T('安认识博，博认识茜，可没说安认识茜。证得出的要证完，证不出的，机器也得停下来，说一声证不出来。', 'Ann knows Bo and Bo knows Cy, but nothing says Ann knows Cy. What can be proved must be, and of what cannot, the machine must still stop and say it cannot.') }],
    solution: searchOf([['rule', 'sym']], { depth: 3 }),
    naive: searchOf([['rule', 'sym']]),
    after: T('一条总能用上的规则，让深度优先搜索在证不出的地方一直转下去。给搜索设一个深度，它就一定会停；代价是太深的证明它找不到。auto 一条路最多走 12 步，也是这个道理。', 'A rule that always applies keeps depth-first search going round where nothing can be proved. With a depth limit the search always stops; the price is that a proof deeper than that cannot be found. auto’s 12 steps at most on a path are the same idea.'),
  }),
]
