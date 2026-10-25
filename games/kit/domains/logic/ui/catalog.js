// What the logic domain's parts are called and how they look on a board (《证明完毕》): each rule's name, what it does
// and its ports, written with letters for any sentence (a part is a pattern), the settings on its
// card and a box's regions, and the editor's description of a node (../../../circuit/model.js parts, frames.js).
import { ArrowRightFromLine, Box, Flag, GitFork, Puzzle, Split } from 'lucide-react'
import { RULES, rulesOf } from '../proof.js'
import { portsOf } from '../../../engine/circuit.js'
import { formOf, paramsOf } from '../../../engine/forms.js'
import { SETTING_KINDS } from '../choices.js'
import { FORMULA_TEXT } from '../formula.js'

const T = (zh, en) => ({ zh, en })

/** Every rule: name, what it does, port labels, setting labels and the regions of a box (`frames`). */
export const RULE_TEXT = {
  mp: { name: T('套用', 'Apply'), desc: T('由 A → B 和 A 得到 B：接进一句「若…，则…」和它的前一半，得到后一半。', 'From A → B and A, B: wire in an “if …, then …” and its “if” part; out comes the “then” part.'), ports: { imp: 'A → B', a: 'A' } },
  impI: { name: T('假设框', 'Assumption box'), desc: T('框里假设 A、证出 B，框外得到 A → B。', 'Assume A inside the box and prove B; outside you get A → B.'), params: { A: T('假设', 'Assume') }, frames: { body: T('框里', 'Inside') } },
  andI: { name: T('拼成 ∧', 'Join ∧'), desc: T('由 A 和 B 得到 A ∧ B。', 'From A and B, A ∧ B.'), ports: { a: 'A', b: 'B' } },
  andE: { name: T('拆开 ∧', 'Split ∧'), desc: T('由 A ∧ B 得到 A，也得到 B。', 'From A ∧ B, A, and also B.'), ports: { ab: 'A ∧ B' }, outs: { left: ['A', 'A'], right: ['B', 'B'] } },
  orI: { name: T('引入 ∨', 'Bring in ∨'), desc: T('由 A 得到 A ∨ B（或 B ∨ A），另一边 B 和放在哪边在卡片上选。', 'From A, A ∨ B (or B ∨ A); choose B and its side on the card.'), ports: { a: 'A' }, params: { other: T('另一边', 'Other side') } },
  orE: { name: T('分情况', 'Case by case'), desc: T('一块有两个框的元件。输入口接 A ∨ B；「情况一」的框假设 A，「情况二」的框假设 B。两个框都证出同一句 C、接到各自的「结论」，卡片就输出 C：不知道是哪一种，就每一种都证一遍。', 'A part with two boxes. Wire A ∨ B into its input; the box Case one assumes A, the box Case two assumes B. When both prove the same C, wired to their own “Conclusion”, the card gives C: not knowing which case it is, prove it in each.'), ports: { ab: 'A ∨ B' }, frames: { left: T('情况一', 'Case one'), right: T('情况二', 'Case two') } },
  botE: { name: T('矛盾推出一切', 'From contradiction'), desc: T('由矛盾 ⊥ 得到卡片上选的任何一句。', 'From the contradiction ⊥, whatever is chosen on the card.'), ports: { bot: '⊥' }, params: { C: T('得出', 'Conclude') } },
  raa: { name: T('反证法', 'By contradiction'), desc: T('由 ¬¬A 得到 A。', 'From ¬¬A, A.'), ports: { nna: '¬¬A' } },
  allI: { name: T('任取', 'For any'), desc: T('一个框：框里随便取一样东西，卡片上给它起名 a、b 或 c（不能出现在还开着的假设里）。框里证出 P(a)，框外得 ∀x. P(x)。', 'A box: inside it any thing at all, named a, b or c on the card (in no hypothesis still open). Prove P(a) inside; outside you get ∀x. P(x).'), params: { x: T('名字', 'Name') }, frames: { body: T('框里', 'Inside') } },
  allE: { name: T('取一个', 'Take one'), desc: T('接进 ∀x. P(x)，在卡片上选一样东西 t，得到 P(t)。', 'Wire in ∀x. P(x) and choose a thing t on the card; out comes P(t).'), ports: { all: '∀x. P(x)' }, params: { t: T('哪一样', 'Which thing') } },
  exI: { name: T('举例', 'Example'), desc: T('接进 P(t)，得到 ∃x. P(x)：t 就是例子，卡片自己认出来。关卡里只有一句「存在」对得上时自动得出它；有几句时，在卡片上选要得出哪一句（比如 a喜欢a 可以得出 ∃x. x喜欢x，也可以得出 ∃x. a喜欢x）。', 'Wire in P(t); out comes ∃x. P(x), with t the example, read off by the card. When only one “there is” of the level fits, it is concluded at once; when several do, choose on the card which (a likes a gives ∃x. x likes x, and also ∃x. a likes x).'), ports: { a: 'P(t)' }, params: { target: T('要得出', 'Conclude') } },
  exE: { name: T('拿出那一个', 'Take the one there is'), desc: T('接进 ∃x. P(x)：框里那一样东西叫 a（卡片上起名 a、b 或 c），假设 P(a) 证出 C，框外就得 C。C 里不能有 a。', 'Wire in ∃x. P(x): inside the box that thing is a (named a, b or c on the card); assuming P(a) proves C, and outside you get C. C may not mention a.'), ports: { ex: '∃x. P(x)' }, params: { x: T('见证', 'Witness') }, frames: { body: T('框里', 'Inside') } },
  exact: { name: T('证明项', 'Proof term'), desc: T('卡片上选要证的句子，再写出它的证明项；核检查通过，就证出这句。证明项里可以用已知的名字，和外面每层假设框给的 h1、h2……', 'Choose on the card the sentence to prove and write its proof term; when the kernel accepts it, the sentence is proved. The term may use the givens’ names, and h1, h2 … for the boxes around the card.'), params: { A: T('要证', 'Prove'), term: T('证明项', 'Proof term') } },
  normalize: { name: T('化简证明', 'Simplify proof'), desc: T('接进一个证明，送出同一句话的证明，只是把弯路去掉了：先开框又马上套用、先拼成一对又马上拆开、先放进「或」又马上分情况，都直接接上；用到的引理展开成它自己的证明。', 'Wire in a proof; out comes a proof of the same sentence with its detours taken out: a box opened and at once applied, a pair made and at once split, a side of an or taken and at once split again, each wired straight through; a lemma used is unfolded into its own proof.'), ports: { a: 'A' } },
  refl: { name: T('自反', 'Reflexivity'), desc: T('卡片上选一样东西 t，直接给出 t = t。', 'Choose a thing t on the card; it gives t = t at once.'), params: { t: T('哪一样', 'Which thing') } },
  rewrite: { name: T('等量代换', 'Rewrite'), desc: T('接进 s = t 和一句提到 s 的话；卡片上把这句话里的每一个 s 都框出来，点选的那几处换成 t。', 'Wire in s = t and a sentence about s; the card boxes every s in the sentence, and the ones you tick become t.'), ports: { eq: 's = t', p: 'φ(s)' } },
  res: { name: T('归结', 'Resolve'), desc: T('接进两条子句：一条里有 A，另一条里有 ¬A，消掉这一对，剩下的用「或」连起来；什么都不剩就是矛盾 ⊥。一次只消一对。', 'Wire in two clauses, one holding A and the other ¬A: cancel that pair and join what is left with or; nothing left is the contradiction ⊥. One pair at a time.'), ports: { a: 'A ∨ B', b: '¬A ∨ C' } },
}

/** The machine board's parts (../machine.js): name, what each does, and the regions of a frame. */
export const MACHINE_TEXT = {
  dneg: { name: T('双重否定', 'Double negation'), desc: T('把公式里每一处 ¬¬A 都换成 A，换到一处都不剩。', 'Turns every ¬¬A in the formula into A, until none is left.') },
  impOr: { name: T('箭头化或', 'Arrows to or'), desc: T('把每一处 A → B 换成 ¬A ∨ B，每一处 A ↔ B 换成 (¬A ∨ B) ∧ (¬B ∨ A)。', 'Turns every A → B into ¬A ∨ B, and every A ↔ B into (¬A ∨ B) ∧ (¬B ∨ A).') },
  dmLaw: { name: T('德摩根律', 'De Morgan’s laws'), desc: T('把每一处 ¬(A ∧ B) 换成 ¬A ∨ ¬B，每一处 ¬(A ∨ B) 换成 ¬A ∧ ¬B，换到一处都不剩。', 'Turns every ¬(A ∧ B) into ¬A ∨ ¬B and every ¬(A ∨ B) into ¬A ∧ ¬B, until none is left.') },
  dist: { name: T('分配', 'Distribute'), desc: T('把每一处 A ∨ (B ∧ C) 换成 (A ∨ B) ∧ (A ∨ C)（∧ 在左边也一样），换到一处都不剩。', 'Turns every A ∨ (B ∧ C) into (A ∨ B) ∧ (A ∨ C) (with the ∧ on the left too), until none is left.') },
  nnf: { name: T('化否定范式', 'To NNF'), desc: T('把公式改成和它等价、没有 → 和 ↔、¬ 只在字母上的样子。', 'Rewrites a formula into an equivalent one with no → or ↔ and ¬ only on letters.') },
  cnf: { name: T('化合取范式', 'To CNF'), desc: T('把公式改成和它等价的合取范式：几串「或」，用「与」连起来。', 'Rewrites a formula into an equivalent CNF: ors, joined by ands.') },
  neg: { name: T('否定', 'Negate'), desc: T('在接进来的公式前面加一个 ¬。', 'Puts a ¬ in front of the formula wired in.') },
  conj: { name: T('并起来', 'Join'), desc: T('把接进来的两句用 ∧ 连成一句。', 'Joins the two formulas wired in with ∧.'), ports: { a: 'A', b: 'B' } },
  toClauses: { name: T('拆成子句', 'Into clauses'), desc: T('把一句合取范式拆开：每一串「或」是一条子句。', 'Splits a CNF formula: each or-chain is one clause.') },
  res: { name: T('归结', 'Resolve'), desc: T('子句集里每一对能消的子句都归结一次，新得到的子句加进来；永真的子句不要。', 'Resolves every pair of clauses in the set that cancels, and adds the new clauses; tautologies are dropped.') },
  repeat: { name: T('重复框', 'Repeat frame'), desc: T('框开出它收到的东西，框里接出新的东西送回「结果」；框把结果再送进去，一圈一圈地做，直到不再变化（或推出 ⊥），送出最后一圈的结果。', 'The frame opens with what it receives; what is made inside goes back into “result”; the frame feeds it in again, round after round, until it stops changing (or ⊥ appears), and gives the last round.'), frames: { body: T('每一圈', 'Each round') } },
  saturate: { name: T('饱和器', 'Saturator'), desc: T('一直归结，直到推出 ⊥，或者再也推不出新子句。', 'Keeps resolving until ⊥ appears or no new clause does.') },
  uDelete: { name: T('删掉', 'Delete'), desc: T('找到一个两边一模一样的等式 t = t，删掉它。', 'Finds an equation with both sides the same, t = t, and deletes it.') },
  uDecompose: { name: T('拆开', 'Decompose'), desc: T('找到一个 f(s1, …) = f(t1, …)，两边是同一个函数：拆成 s1 = t1, …。', 'Finds f(s1, …) = f(t1, …), the same function on both sides, and splits it into s1 = t1, ….') },
  uConflict: { name: T('对不上', 'Clash'), desc: T('找到一个两边是不同函数（或不同名字）的等式，宣布失败：怎样代换都对不上。', 'Finds an equation with different functions (or names) on the two sides and declares failure: no substitution makes them meet.') },
  uSwap: { name: T('翻过来', 'Swap'), desc: T('找到一个 t = x，左边不是变量、右边是变量：翻成 x = t。', 'Finds t = x, not a variable on the left but one on the right, and turns it into x = t.') },
  uCheck: { name: T('发生检查', 'Occurs check'), desc: T('找到一个 x = t，t 里面又有 x（t 不就是 x）：宣布失败。', 'Finds x = t where x occurs inside t (t not x itself) and declares failure.') },
  uEliminate: { name: T('代进去', 'Eliminate'), desc: T('找到一个 x = t（t 里没有 x），而 x 还出现在别的等式里：把那些地方的 x 都换成 t。', 'Finds x = t (no x in t) while x still occurs in other equations, and puts t for x there.') },
  unifier: { name: T('合一器', 'Unifier'), desc: T('把一组等式解到底：每个等式左边是一个变量，右边里没有这些变量（最一般合一子）；合一不了就宣布失败。', 'Solves a set of equations to the end: each with a variable on the left and none of those variables on any right (the most general unifier); failure if there is none.') },
  prenex: { name: T('化前束范式', 'To prenex form'), desc: T('把否定范式里所有量词按顺序挪到最前面，被约束的变量先改名，免得撞上。', 'Moves every quantifier of an NNF formula to the front, in order, renaming bound variables first so none clash.') },
  skolem: { name: T('Skolem 化', 'Skolemise'), desc: T('前束范式里每个 ∃x 去掉，x 换成一个新函数，参数是它前面所有 ∀ 的变量。', 'Drops each ∃x of a prenex formula and puts for x a new function of all the ∀ variables before it.') },
  clauseForm: { name: T('化子句形式', 'To clause form'), desc: T('把一句一阶公式化成一组子句：否定范式、前束、Skolem 化、合取范式，再拆开。', 'Turns a first-order formula into a clause set: NNF, prenex, Skolemise, CNF, then split.') },
  fores: { name: T('一阶归结', 'First-order resolution'), desc: T('两条子句先各自改名，再把一对相反的项合一，消掉；只消有一条是单项子句的（单元归结）。', 'Renames two clauses apart, unifies a pair of opposite literals and cancels them; only pairs where one clause has a single literal (unit resolution).') },
  assumption: { name: T('已知里有', 'Assumption'), desc: T('第一个目标就在它的已知里：这个目标证完了。', 'The first goal is among its hypotheses: that goal is done.') },
  intro: { name: T('按形状拆', 'Intro'), desc: T('按第一个目标的样子倒着用引入规则：A → B 变成「已知 A，证 B」；A ∧ B 变成两个目标；∀x 换成一个新变量。', 'Takes the first goal apart by its shape, an introduction rule read backwards: A → B becomes “given A, prove B”; A ∧ B two goals; ∀x a new variable.') },
  elim: { name: T('用掉已知', 'Elim'), desc: T('用掉第一个目标的一条已知：A ∧ B 拆成两条；A ∨ B 分成两种情况；有了 A 和 A → B，加上 B。', 'Uses up one hypothesis of the first goal: A ∧ B splits in two; A ∨ B makes two cases; with A and A → B, adds B.') },
  orElse: { name: T('不行就换', 'Or else'), desc: T('两个框都拿到同一个状态；第一个框的结果没失败就用它，失败了就用第二个框的。', 'Both regions get the same state; the first region’s result is used unless it failed, and then the second’s.'), frames: { first: T('先试', 'Try first'), second: T('不行再试', 'Else try') } },
  auto: { name: T('自己的 auto', 'Own auto'), desc: T('一圈一圈地试：已知里有、按形状拆、用掉已知，哪个行就用哪个，直到没有目标或都不行。', 'Round after round, tries assumption, intro and elim, using whichever works, until no goal is left or none works.') },
  simp: { name: T('化简', 'Simp'), desc: T('用定义（和加进来的引理、第一个目标自己的已知）把第一个目标的两边从左往右改写，改到不能再改；两边一样了，这个目标就证完了。', 'Rewrites both sides of the first goal left to right with the definitions (and the lemmas added, and the goal’s own hypotheses) until nothing more changes; once the two sides are the same, that goal is done.') },
  induct: { name: T('归纳', 'Induction'), desc: T('对第一个目标最前面「对所有」的那个数（或列表）归纳：变成两个目标，0（空列表）的情况，和「对 n 成立，就对 n 的下一个成立」的情况。', 'Inducts on the number (or list) of the first goal’s first “for all”: two goals, the case 0 (the empty list), and the step “if it holds for n, it holds for the next one”.') },
  cases: { name: T('按条件分', 'Split the if'), desc: T('第一个目标里有一个条件还没定的「如果」：分成两个目标，一个已知条件为真，一个已知它为假。', 'The first goal has an “if” whose condition is not settled: two goals, one knowing the condition is true, one knowing it is false.') },
  addZero: { name: T('加零', 'Add zero'), desc: T('引理 n + 0 = n，加进化简用的规则。', 'The lemma n + 0 = n, added to the rules simp uses.') },
  addSucc: { name: T('加后继', 'Add successor'), desc: T('引理 n + S m = S (n + m)，加进化简用的规则。', 'The lemma n + S m = S (n + m), added to the rules simp uses.') },
  addAssoc: { name: T('加法结合', 'Associativity'), desc: T('引理 (n + m) + k = n + (m + k)，加进化简用的规则。', 'The lemma (n + m) + k = n + (m + k), added to the rules simp uses.') },
  addComm: { name: T('加法交换', 'Commutativity'), desc: T('引理 n + m = m + n，加进化简用的规则。', 'The lemma n + m = m + n, added to the rules simp uses.') },
  appNil: { name: T('接空列表', 'Append nil'), desc: T('引理 xs ++ [] = xs，加进化简用的规则。', 'The lemma xs ++ [] = xs, added to the rules simp uses.') },
  appAssoc: { name: T('拼接结合', 'Append associativity'), desc: T('引理 (xs ++ ys) ++ zs = xs ++ (ys ++ zs)，加进化简用的规则。', 'The lemma (xs ++ ys) ++ zs = xs ++ (ys ++ zs), added to the rules simp uses.') },
  revApp: { name: T('倒过拼接', 'Reverse of append'), desc: T('引理 rev (xs ++ ys) = rev ys ++ rev xs，加进化简用的规则。', 'The lemma rev (xs ++ ys) = rev ys ++ rev xs, added to the rules simp uses.') },
  insLen: { name: T('插入长一格', 'Insert adds one'), desc: T('引理 len (ins x ys) = S (len ys)，加进化简用的规则。', 'The lemma len (ins x ys) = S (len ys), added to the rules simp uses.') },
  runApp: { name: T('分两段跑', 'Run in two parts'), desc: T('引理 run q (w ++ u) = run (run q w) u，加进化简用的规则。', 'The lemma run q (w ++ u) = run (run q w) u, added to the rules simp uses.') },
  itsumGen: { name: T('累加器求和', 'Accumulated sum'), desc: T('引理 itsum xs n = n + sum xs，加进化简用的规则。', 'The lemma itsum xs n = n + sum xs, added to the rules simp uses.') },
  factor: { name: T('因子化', 'Factor'), desc: T('一条子句里两项同号、能合一：合一后并成一项。', 'Two literals of the same sign in a clause that unify are merged into one.') },
}

const FIXED = { premise: 'source', goal: 'sink' }
// What a box's region gives at its left edge, and what goes into the dot at its right.
const OPENS = T('假设', 'Assume')
const CLOSES = T('结论', 'Conclusion')
const GIVES = T('得出', 'Result')

/**
 * The card's settings: [{ key, label, kind }] (orI's side is a switch of its own); a lemma may name its own (`params`).
 * kind: 'formula' (a sentence), 'exists' (a sentence that starts with ∃), 'term', 'name' (a particular thing: a, b,
 * c) or 'form' (which shape a part with several forms is in, engine/forms.js).
 */
export const settingsOf = (parts, node, lemmas = {}) => [...(parts[node.type]?.forms ? [{ key: 'form', kind: 'form' }] : []), ...paramsOf(parts[node.type], node).map((key) => ({ key, label: lemmas[node.type]?.params?.[key] ?? RULE_TEXT[node.type]?.params?.[key] ?? key, kind: SETTING_KINDS[node.type]?.[key] ?? 'formula', blank: SETTING_KINDS[node.type]?.[key] === 'exists' ? T('自动', 'Automatic') : null }))]

/** A part's text with the game's revisions of it along the course (logicCourse `revisions`; defineGame textAt / textFor). */
export const withRevisions = (text, list) => (text && list ? { ...text, revisions: list } : text)

/** A rule's or lemma's name and what it does. */
export const nameOf = (lemmas, type) => lemmas[type]?.name ?? RULE_TEXT[type]?.name ?? type
export const textOf = (lemmas, type, revisions = {}) => withRevisions(lemmas[type] ?? RULE_TEXT[type], revisions[type])
export const familyOf = (lemmas, type) => (lemmas[type] ? 'lemma' : RULES[type]?.frames ? 'box' : 'rule')
const ICONS = { lemma: Puzzle, box: Box, rule: GitFork }
export const iconOf = (lemmas, type) => ICONS[familyOf(lemmas, type)] ?? Split

/** The editor's description of a proof's nodes (model.js), for a level's lemmas and premise names (in order). */
export function partsFor(lemmas = {}, premises = []) {
  const parts = rulesOf(lemmas)
  return {
    inputs: (node) => (FIXED[node.type] ? (FIXED[node.type] === 'sink' ? ['in'] : []) : parts[node.type] ? portsOf(parts[node.type], node) : []),
    role: (node) => (FIXED[node.type] ? FIXED[node.type] : 'part'),
    label: (node) => {
      if (node.type === 'goal') return T('目标', 'Goal')
      if (node.type === 'premise') return premises.length > 1 ? T(`已知 ${premises.indexOf(node.params.name) + 1}`, `Given ${premises.indexOf(node.params.name) + 1}`) : T('已知', 'Given')
      return nameOf(lemmas, node.type)
    },
    portLabel: (node, port) => {
      if (RULE_TEXT[node.type]?.frames?.[port]) return CLOSES
      const l = lemmas[node.type]
      if (l?.forms) return (l.forms.find((f) => f.key === formOf(parts[node.type], node)).premises ?? [])[Number(port.slice(1))]
      if (l) return l.ports[Number(port.slice(1))]
      return RULE_TEXT[node.type]?.ports?.[port] ?? ''
    },
    family: (node) => (node.type === 'goal' ? 'end' : node.type === 'premise' ? 'given' : familyOf(lemmas, node.type)),
    icon: (node) => (node.type === 'goal' ? Flag : node.type === 'premise' ? ArrowRightFromLine : iconOf(lemmas, node.type)),
    // A box gives its conclusion, and inside each region the assumption it makes.
    outputs: (node) => {
      const outs = RULE_TEXT[node.type]?.outs
      if (outs) return Object.entries(outs).map(([key, [label, short]]) => ({ key, label, short }))
      const opens = (parts[node.type]?.frames?.(node) ?? []).filter((r) => r.opens)
      return opens.length ? [{ key: null, label: GIVES, short: GIVES }, ...opens.map((r) => ({ key: r.name, label: OPENS, short: OPENS }))] : null
    },
    cardWidth: (node) => (parts[node.type]?.frames ? 240 : FIXED[node.type] ? 170 : 160),
    frames: (node) => (parts[node.type]?.frames?.(node) ?? []).map((r) => ({ ...r, label: RULE_TEXT[node.type]?.frames?.[r.name] ?? r.name })),
    text: FORMULA_TEXT,
    rules: parts,
  }
}

