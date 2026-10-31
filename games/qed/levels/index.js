// 《证明完毕》's levels as one course (kit/domains/logic/course.js): the eras, every level, and the lemmas the player
// proves along the way.
import { logicCourse } from '../../kit/domains/logic/course.js'
import { ERAS } from './eras.js'
import { era0 } from './era0.js'
import { circuits, GATES } from './circuits.js'
import { era1 } from './era1.js'
import { era2 } from './era2.js'
import { declarations, generators, moreDeclarations, thingDeclarations, typeDeclarations } from './declare.js'
import { hol } from './hol.js'
import { quantifiers } from './quantifiers.js'
import { rules } from './rules.js'
import { metavars } from './metavars.js'
import { strategies } from './strategies.js'
import { classical } from './classical.js'
import { simplifier } from './simplifier.js'
import { terms } from './terms.js'
import { inductive } from './inductive.js'
import { automation } from './automation.js'
import { structured } from './structured.js'
import { equality } from './equality.js'
import { WORDS } from './words.js'

const T = (zh, en) => ({ zh, en })

// The lemmas the player proves; a part is a pattern, so its description and ports use letters.
export const LEMMAS = {
  axK: { name: T('K', 'K'), desc: T('在元件上选定两句 A、B，输出 A → (B → A)。', 'Choose two sentences A and B on the part; gives A → (B → A).'), statement: 'A → (B → A)', metas: ['A', 'B'], ports: [], params: { A: T('第一句', 'First'), B: T('第二句', 'Second') } },
  axS: { name: T('S', 'S'), desc: T('在元件上选定三句 A、B、C，输出 (A → (B → C)) → ((A → B) → (A → C))。', 'Choose three sentences A, B and C on the part; gives (A → (B → C)) → ((A → B) → (A → C)).'), statement: '(A → (B → C)) → ((A → B) → (A → C))', metas: ['A', 'B', 'C'], ports: [], params: { A: T('第一句', 'First'), B: T('第二句', 'Second'), C: T('第三句', 'Third') } },
  chain: { name: T('串联', 'Chain'), desc: T('由 A → B 和 B → C 得到 A → C。', 'From A → B and B → C, gives A → C.'), statement: 'A → C', premises: ['A → B', 'B → C'], metas: ['A', 'B', 'C'], ports: ['A → B', 'B → C'] },
  swap: { name: T('交换', 'Swap'), desc: T('由 A → (B → C) 得到 B → (A → C)。', 'From A → (B → C), gives B → (A → C).'), statement: 'B → (A → C)', premises: ['A → (B → C)'], metas: ['A', 'B', 'C'], ports: ['A → (B → C)'] },
  merge: { name: T('合并', 'Merge'), desc: T('由 A → (A → B) 得到 A → B。', 'From A → (A → B), gives A → B.'), statement: 'A → B', premises: ['A → (A → B)'], metas: ['A', 'B'], ports: ['A → (A → B)'] },
  // De Morgan's laws, one card: built with its four propositional shapes at once (REVISIONS), the four quantifier
  // shapes added by the level that proves them. Switched on the card.
  dm: {
    name: T('德摩根律', 'De Morgan'),
    desc: T('否定与「或者」「并且」互换，四种形状在元件上切换：¬(A ∨ B) 与 ¬A ∧ ¬B 互推，¬(A ∧ B) 与 ¬A ∨ ¬B 互推。', 'A negation trades “or” for “and” and back, four shapes switched on the part: ¬(A ∨ B) and ¬A ∧ ¬B give each other, and so do ¬(A ∧ B) and ¬A ∨ ¬B.'),
    metas: ['A', 'B', 'P'],
    forms: [
      { key: 'notOr', label: '¬(A ∨ B) → ¬A ∧ ¬B', statement: '¬A ∧ ¬B', premises: ['¬(A ∨ B)'] },
      { key: 'andNot', label: '¬A ∧ ¬B → ¬(A ∨ B)', statement: '¬(A ∨ B)', premises: ['¬A ∧ ¬B'] },
      { key: 'orNot', label: '¬A ∨ ¬B → ¬(A ∧ B)', statement: '¬(A ∧ B)', premises: ['¬A ∨ ¬B'] },
      { key: 'notAnd', label: '¬(A ∧ B) → ¬A ∨ ¬B', statement: '¬A ∨ ¬B', premises: ['¬(A ∧ B)'] },
      { key: 'notEx', label: '¬∃x. P → ∀x. ¬P', statement: '∀x. ¬P', premises: ['¬∃x. P'] },
      { key: 'allNot', label: '∀x. ¬P → ¬∃x. P', statement: '¬∃x. P', premises: ['∀x. ¬P'] },
      { key: 'exNot', label: '∃x. ¬P → ¬∀x. P', statement: '¬∀x. P', premises: ['∃x. ¬P'] },
      { key: 'notAll', label: '¬∀x. P → ∃x. ¬P', statement: '∃x. ¬P', premises: ['¬∀x. P'] },
    ],
    ports: ['¬(A ∨ B)'],
  },
  // The equivalences (chapter 9), which the simplifier (chapter 10) rewrites with: each a card of shapes that are each other's converse, so either way round is a
  // rewrite rule; all its shapes come with the level that proves them (REVISIONS).
  dneg: {
    name: T('双重否定律', 'Double negation'),
    desc: T('两种形状在元件上切换：由 ¬¬A 得到 A；由 A 得到 ¬¬A。', 'Two shapes switched on the part: from ¬¬A, gives A; from A, gives ¬¬A.'),
    metas: ['A'],
    forms: [
      { key: 'elim', label: '¬¬A → A', statement: 'A', premises: ['¬¬A'] },
      { key: 'intro', label: 'A → ¬¬A', statement: '¬¬A', premises: ['A'] },
    ],
    ports: ['¬¬A'],
  },
  arrow: {
    name: T('蕴涵析取互化', 'Arrow away'),
    desc: T('两种形状在元件上切换：由 A → B 得到 ¬A ∨ B；由 ¬A ∨ B 得到 A → B。', 'Two shapes switched on the part: from A → B, gives ¬A ∨ B; from ¬A ∨ B, gives A → B.'),
    metas: ['A', 'B'],
    forms: [
      { key: 'elim', label: 'A → B ⟹ ¬A ∨ B', statement: '¬A ∨ B', premises: ['A → B'] },
      { key: 'intro', label: '¬A ∨ B ⟹ A → B', statement: 'A → B', premises: ['¬A ∨ B'] },
    ],
    ports: ['A → B'],
  },
  dist: {
    name: T('分配律', 'Distribute'),
    desc: T('「或者」对「并且」分配，四种形状在元件上切换：A ∨ (B ∧ C) 与 (A ∨ B) ∧ (A ∨ C) 互推，(A ∧ B) ∨ C 与 (A ∨ C) ∧ (B ∨ C) 互推。', '“Or” distributed over “and”, four shapes switched on the part: A ∨ (B ∧ C) and (A ∨ B) ∧ (A ∨ C) give each other, and so do (A ∧ B) ∨ C and (A ∨ C) ∧ (B ∨ C).'),
    metas: ['A', 'B', 'C'],
    forms: [
      { key: 'orAndR', label: 'A ∨ (B ∧ C) ⟹ (A ∨ B) ∧ (A ∨ C)', statement: '(A ∨ B) ∧ (A ∨ C)', premises: ['A ∨ (B ∧ C)'] },
      { key: 'andOrR', label: '(A ∨ B) ∧ (A ∨ C) ⟹ A ∨ (B ∧ C)', statement: 'A ∨ (B ∧ C)', premises: ['(A ∨ B) ∧ (A ∨ C)'] },
      { key: 'orAndL', label: '(A ∧ B) ∨ C ⟹ (A ∨ C) ∧ (B ∨ C)', statement: '(A ∨ C) ∧ (B ∨ C)', premises: ['(A ∧ B) ∨ C'] },
      { key: 'andOrL', label: '(A ∨ C) ∧ (B ∨ C) ⟹ (A ∧ B) ∨ C', statement: '(A ∧ B) ∨ C', premises: ['(A ∨ C) ∧ (B ∨ C)'] },
    ],
    ports: ['A ∨ (B ∧ C)'],
  },
  // Chapter 11: ↔ to clauses (a rewrite rule both ways), resolution (its card takes the opposite pair wherever it stands
  // in the two clauses), and the liar of the knights topic, which the topic on what no machine can do grows.
  iff: {
    name: T('等价展开', 'Equivalence away'),
    desc: T('两种形状在元件上切换：由 A ↔ B 得到 (¬A ∨ B) ∧ (¬B ∨ A)，反过来也可以。每种形状也是一条改写规则。', 'Two shapes switched on the part: from A ↔ B, gives (¬A ∨ B) ∧ (¬B ∨ A), and the other way round. Each shape is also a rewrite rule.'),
    metas: ['A', 'B'],
    forms: [
      { key: 'elim', label: 'A ↔ B ⟹ (¬A ∨ B) ∧ (¬B ∨ A)', statement: '(¬A ∨ B) ∧ (¬B ∨ A)', premises: ['A ↔ B'] },
      { key: 'intro', label: '(¬A ∨ B) ∧ (¬B ∨ A) ⟹ A ↔ B', statement: 'A ↔ B', premises: ['(¬A ∨ B) ∧ (¬B ∨ A)'] },
    ],
    ports: ['A ↔ B'],
  },
  res: { name: T('归结', 'Resolve'), card: 'res', desc: T('接入两条子句，一条含 A，另一条含 ¬A，位置不限：消去这一对，其余部分用「或者」连起来；什么都不剩时得到矛盾 ⊥。一次只消一对。', 'Wire in two clauses, one holding A and the other ¬A, in any position: that pair is cancelled and what is left is joined with “or”; when nothing is left, gives the contradiction ⊥. One pair at a time.'), statement: 'B ∨ C', premises: ['A ∨ B', '¬A ∨ C'], metas: ['A', 'B', 'C'], ports: ['A ∨ B', '¬A ∨ C'] },
  liar: { name: T('说谎者悖论', 'The liar'), desc: T('由 A ↔ ¬A 得到矛盾 ⊥。', 'From A ↔ ¬A, gives the contradiction ⊥.'), statement: '⊥', premises: ['A ↔ ¬A'], metas: ['A'], ports: ['A ↔ ¬A'] },
  lem: { name: T('排中律', 'Excluded middle'), desc: T('在元件上选定一句 A，输出 A ∨ ¬A。', 'Choose a sentence A on the part; gives A ∨ ¬A.'), statement: 'A ∨ ¬A', metas: ['A'], ports: [] },
}

// What the player proves of numbers and lists (chapter 12), each a rule from then on, and an equation a rewrite rule
// too (with its conditions); `rule` writes it as a rule other than the statement (one-to-one, used to take apart).
const fact = (zh, en, statement, desc, rule) => ({ name: T(zh, en), statement, desc, ...(rule ? { rule } : {}) })
export const FACTS = {
  addZero: fact('加零', 'Add zero', '∀x. plus(x, zero) = x', T('x + 0 = x：一条规则，也是化简的一条改写规则（从左往右）。', 'x + 0 = x: a rule, and a left-to-right rewrite rule for Simp.')),
  addSucc: fact('加后继', 'Add successor', '∀x. ∀y. plus(x, s(y)) = s(plus(x, y))', T('x + S y = S (x + y)：一条规则，也是化简的一条改写规则（从左往右）。', 'x + S y = S (x + y): a rule, and a left-to-right rewrite rule for Simp.')),
  addComm: fact('加法交换', 'Addition commutes', '∀x. ∀y. plus(x, y) = plus(y, x)', T('x + y = y + x：一条规则，也是一条改写规则；放进化简会来回改写，停不下来。', 'x + y = y + x: a rule, and a rewrite rule; in Simp it rewrites back and forth without end.')),
  addAssoc: fact('加法结合', 'Addition associates', '∀x. ∀y. ∀z. plus(plus(x, y), z) = plus(x, plus(y, z))', T('(x + y) + z = x + (y + z)：一条规则，也是化简的一条改写规则（从左往右）。', '(x + y) + z = x + (y + z): a rule, and a left-to-right rewrite rule for Simp.')),
  appNil: fact('接空列表', 'Append nil', '∀xs. app(xs, nil) = xs', T('xs ++ [] = xs：一条规则，也是化简的一条改写规则（从左往右）。', 'xs ++ [] = xs: a rule, and a left-to-right rewrite rule for Simp.')),
  appAssoc: fact('拼接结合', 'Append associates', '∀xs. ∀ys. ∀zs. app(app(xs, ys), zs) = app(xs, app(ys, zs))', T('(xs ++ ys) ++ zs = xs ++ (ys ++ zs)：一条规则，也是化简的一条改写规则（从左往右）。', '(xs ++ ys) ++ zs = xs ++ (ys ++ zs): a rule, and a left-to-right rewrite rule for Simp.')),
  revApp: fact('倒过拼接', 'Reverse of an append', '∀xs. ∀ys. rev(app(xs, ys)) = app(rev(ys), rev(xs))', T('rev (xs ++ ys) = rev ys ++ rev xs：一条规则，也是化简的一条改写规则（从左往右）。', 'rev (xs ++ ys) = rev ys ++ rev xs: a rule, and a left-to-right rewrite rule for Simp.')),
  inject: fact('一对一', 'One-to-one', '∀x. ∀y. s(x) = s(y) → x = y', T('S x = S y → x = y，用作拆分规则：已知中有 S ?x = S ?y 时，换成由 ?x = ?y 继续证。', 'S x = S y → x = y, as a rule that takes apart: when S ?x = S ?y is given, the proof goes on from ?x = ?y instead.'), { premises: ['s(?x) = s(?y)', '⟦?x = ?y⟧ ⟹ ?C'], conclusion: '?C' }),
  ifTrue: fact('如果为真', 'If true', '∀u. ∀v. ∀w. u = tt → if(u, v, w) = v', T('u = 真 → (若 u 则 v 否则 w) = v：一条规则，也是一条带条件的改写规则。', 'u = true → (if u then v else w) = v: a rule, and a rewrite rule with a condition.')),
  ifFalse: fact('如果为假', 'If false', '∀u. ∀v. ∀w. u = ff → if(u, v, w) = w', T('u = 假 → (若 u 则 v 否则 w) = w：一条规则，也是一条带条件的改写规则。', 'u = false → (if u then v else w) = w: a rule, and a rewrite rule with a condition.')),
  succNeq: fact('不等于后继', 'Never its successor', '∀x. ¬(x = s(x))', T('x ≠ S x：一条规则。', 'x ≠ S x: a rule.')),
  insLen: fact('插入长一格', 'Insert adds one', '∀xs. ∀x. len(ins(x, xs)) = s(len(xs))', T('len (ins x xs) = S (len xs)：一条规则，也是化简的一条改写规则（从左往右）。', 'len (ins x xs) = S (len xs): a rule, and a left-to-right rewrite rule for Simp.')),
}

// How parts' descriptions grow as the course goes on: from the level `at` on, the description reads this way.
const REVISIONS = {
  // De Morgan comes with its four propositional shapes at once, and the quantifier level adds the other four.
  dm: [
    { by: 'demorgan', forms: ['andNot', 'orNot', 'notAnd'] },
    { by: 'q-dm', forms: ['notEx', 'allNot', 'exNot', 'notAll'], desc: T('否定与「或者」「并且」「存在」「对所有」互换，八种形状在元件上切换。', 'A negation trades “or” for “and”, “there is” for “for all”, and back: eight shapes switched on the part.') },
  ],
  // 矛盾 brings in ¬A as A → ⊥, so Apply takes ¬A and A to ⊥.
  mp: [{ at: 'bot', desc: T('由 A → B 和 A 得到 B。¬A 即 A → ⊥，所以由 ¬A 和 A 得到矛盾 ⊥。', 'From A → B and A, gives B. ¬A is A → ⊥, so from ¬A and A, gives the contradiction ⊥.') }],
  // The equivalences come with every shape at once.
  // From the simplifier on, each shape is a rewrite rule too.
  dneg: [
    { by: 'c-dneg', forms: ['intro'] },
    { at: 'sp-rw', desc: T('两种形状在元件上切换：由 ¬¬A 得到 A；由 A 得到 ¬¬A。每种形状也是一条改写规则。', 'Two shapes switched on the part: from ¬¬A, gives A; from A, gives ¬¬A. Each shape is also a rewrite rule.') },
  ],
  arrow: [
    { by: 'c-arrow', forms: ['intro'] },
    { at: 'sp-rw', desc: T('两种形状在元件上切换：由 A → B 得到 ¬A ∨ B；由 ¬A ∨ B 得到 A → B。每种形状也是一条改写规则。', 'Two shapes switched on the part: from A → B, gives ¬A ∨ B; from ¬A ∨ B, gives A → B. Each shape is also a rewrite rule.') },
  ],
  dist: [
    { by: 'c-dist', forms: ['andOrR', 'orAndL', 'andOrL'] },
    { at: 'sp-rw', desc: T('「或者」对「并且」分配，四种形状在元件上切换：A ∨ (B ∧ C) 与 (A ∨ B) ∧ (A ∨ C) 互推，(A ∧ B) ∨ C 与 (A ∨ C) ∧ (B ∨ C) 互推。每种形状也是一条改写规则。', '“Or” distributed over “and”, four shapes switched on the part: A ∨ (B ∧ C) and (A ∨ B) ∧ (A ∨ C) give each other, and so do (A ∧ B) ∨ C and (A ∨ C) ∧ (B ∨ C). Each shape is also a rewrite rule.') },
  ],
  iff: [{ by: 'au-iff', forms: ['intro'] }],
  // ↔ comes into proofs on the main path with 两个方向: ∧ elim takes it apart.
  andE: [{ at: 'iffUse', desc: T('接入 A ∧ B，两个输出口分别得到 A 和 B。A ↔ B 表示 (A → B) ∧ (B → A)，也可以这样拆解。', 'Connect A ∧ B to get A and B at separate outputs. A ↔ B means (A → B) ∧ (B → A) and can be split in the same way.') }],

  // The machine parts grow along chapters 7 and 8: quantifiers taken apart and patterns (模式合一), every result once
  // the cards backtrack (一串结果).
  uDecompose: [{ at: 'r-pattern', desc: T('找到两边结构相同的等式，分解为对应部分之间的等式。两边都是「对所有」（或都是「存在」）时，取出两边的主体，用同一个变量 x，并在等式前记上 ⋀x，表示 x 受量词约束。', 'Finds an equation whose sides have the same structure and splits it into equations between corresponding parts. When both sides are “for all” (or both “there is”), it takes out the two bodies with one variable x for both, and marks the equation ⋀x: x is bound by a quantifier.') }],
  uCheck: [{ at: 'r-pattern', desc: T('找到等式 ?A ≐ t，?A 不能取 t 时报告失败：t 含有 ?A 而不是 ?A 本身，或者 t 含有前面 ⋀ 约束的变量。', 'Finds ?A ≐ t where ?A cannot be t and reports failure: t contains ?A and is not ?A itself, or t contains a variable bound by the ⋀ in front.') }],
  unifier: [{ at: 'r-pattern', desc: T('把一组等式解到底：每个等式左边是一个 ?-字母，右边不含这些 ?-字母（最一般合一子）；无法合一时报告失败。?P(x) 这类等式不求解，原样保留。', 'Solves a set of equations to the end: each with a ?-letter on the left and none of those letters on any right side (the most general unifier); reports failure if there is none. An equation like ?P(x) is not solved but left as it is.') }],
  append: [{ at: 's-results', desc: T('每个框收到相同的状态；依次输出第一个框的每一种结果、下一个框的每一种结果……失败的框没有结果。在元件上选定框的数目。', 'Every region receives the same state; gives every result of the first region, then every result of the next, and so on; a region that fails gives none. The number of regions is chosen on the part.') }],
  repeat: [{ at: 's-results', desc: T('框收到输入，框内的输出接到「结果」后再送回框内，逐轮重复，直到结果不再变化，输出最后一轮的结果；某一轮失败时，停在失败前的一轮。有几种结果时，只沿第一种继续。', 'The frame receives the input; its inner output goes to “Result” and back into the frame, round after round, until it stops changing, and the last round’s result is given. If a round fails, it stops at the round before. With several results, it goes on from the first only.') }],
  assumption: [{ at: 's-results', desc: T('第一个目标与它的一条已知合一：成功时这个目标证完。每一条合得上的已知给出一种结果，按从上往下的顺序。', 'Unifies the first goal with one of its hypotheses: on success that goal is closed. Each hypothesis that fits gives one result, in order from the top.') }],
  // Rewriting the hypotheses comes with the clause chapter.
  rw: [{ at: 'au-hyps', desc: T('接入改写规则：在第一个目标中，由外向内、从左到右找到第一处与规则左边相合的位置，换成规则右边，只换这一处。规则带条件时，每个条件成为新目标，排在这个目标之后。接入多条时用第一条相合的；没有一处相合，元件失败。「改哪里」选「已知」时，改写第一个目标中从上往下第一条相合的已知。', 'Takes rewrite rules: in the first goal, outside in and left to right, the first place that fits the rule’s left side becomes its right side, that place alone. A rule with conditions adds each as a new goal after this one. Given several, it uses the first that fits; if nothing fits, it fails. With “Where” set to the hypotheses, it rewrites the first goal’s first hypothesis from the top that fits.') }],
  simp: [{ at: 'au-hyps', desc: T('接入改写规则列表：每一轮用第一条相合的规则改写一处，逐轮重复，直到没有规则相合。「改哪里」选「已知」时，改写第一个目标的已知。', 'Takes a list of rewrite rules: each round, the first that fits rewrites one place, round after round, until none fits. With “Where” set to the hypotheses, it rewrites the first goal’s hypotheses.') }],
  erule: [{ at: 's-results', desc: T('接入规则：规则的结论与第一个目标合一，第一条前提与它的一条已知合一，这个目标换成其余的前提，每条一个目标。每一条规则、每一条合得上的已知都给出一种结果。', 'Takes rules: the rule’s conclusion is unified with the first goal and its first premise with one of that goal’s hypotheses; the goal is replaced by the remaining premises, one goal each. Each rule wired in, and each hypothesis that fits, gives one result.') }],
}

const COURSE = {
  eras: ERAS,
  levels: [...era0, ...circuits, ...era1, ...declarations, ...moreDeclarations, ...generators, ...thingDeclarations, ...typeDeclarations, ...era2, ...hol, ...quantifiers, ...rules, ...metavars, ...strategies, ...classical, ...simplifier, ...automation, ...inductive, ...terms, ...equality, ...structured],
  words: WORDS,
  lemmas: LEMMAS,
  facts: FACTS,
  gates: GATES,
  revisions: REVISIONS,
  // The machine-board parts the player builds: the elimination rule generator, the unifier, the tactics made of Rule and Assumption, auto, simp made
  // of rewrites, and the clause machines (into clauses, the saturator, the reconstructor).
  machines: ['elimGen', 'unifier', 'erule', 'frule', 'introRules', 'elimRules', 'auto', 'simp', 'clausify', 'saturate', 'metis'],
  primitives: ['gNot', 'gAnd', 'mp', 'impI', 'anyR', 'swapConcl', 'consFront', 'mkRule', 'eachOf', 'keepBound', 'andI', 'andE', 'orI', 'orE', 'botE', 'raa', 'allE', 'allI', 'exI', 'exE', 'rewrite', 'refl', 'natInd',
    'uDecompose', 'uDelete', 'uConflict', 'uEliminate', 'uSwap', 'uCheck', 'repeat', 'uPattern', 'rule', 'assumption',
    'append', 'each', 'defer', 'search', 'rw', 'hyp', 'skolem', 'toClauses', 'resolve', 'replay', 'oracle'],
  // The parts that take rules apart and put them together are one idea (rules as data); joining ∧ and its elimination
  // rule are one, as are rewrite and reflexivity.
  concept: { anyR: 'rulecraft', swapConcl: 'rulecraft', consFront: 'rulecraft', mkRule: 'rulecraft', andI: 'and', andE: 'and', orI: 'or', orE: 'or', exI: 'ex', exE: 'ex', rewrite: 'eq', refl: 'eq' },
  // Parts that stay where a level brings them, so the components box keeps only what goes on being used: the steps of
  // a part built from them soon after (the generator's parts, the unifier's moves, Skolemise and Into clauses, one round of resolution, Replay,
  // the intro and elim rule sets inside auto, the saturator and Into clauses all the way inside the reconstructor), the
  // lemmas a chapter proves for its own next few levels (the frule and resolution
  // lemmas; not ⟷ unfolded, which the built-in clausifier reads from the rule book), a part one stretch of levels needs (the unifier, Defer, the
  // proof board's induction box) and someone else's prover, on the board of the one level that catches it out. A level
  // that needs one brings it again.
  local: ['anyR', 'swapConcl', 'consFront', 'mkRule', 'eachOf', 'keepBound', 'uDecompose', 'uDelete', 'uConflict', 'uEliminate', 'uSwap', 'uCheck', 'uPattern', 'unifier', 'defer', 'introRules', 'elimRules', 'frule',
    'natInd',
    'skolem', 'toClauses', 'res', 'resolve', 'saturate', 'clausify', 'replay', 'oracle'],
}
export const LOGIC = logicCourse(COURSE)
