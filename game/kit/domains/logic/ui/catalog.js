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
  mp: { name: T('套用', 'Apply'), desc: T('由 A → B 和 A 得到 B。', 'From A → B and A, gives B.'), ports: { imp: 'A → B', a: 'A' } },
  impI: { name: T('假设框', 'Assumption box'), desc: T('带一个框，A 在元件上设定。框内可以使用假设 A；框内证出 B 并接到「结论」，元件输出 A → B。', 'A box, with A set on the part. Inside, A may be used as an assumption; prove B there and wire it to “Conclusion”, and the part gives A → B.'), params: { A: T('假设', 'Assume') }, frames: { body: T('框内', 'Inside') } },
  andI: { name: T('拼接', 'Join'), desc: T('接入 A 和 B，得到 A ∧ B。', 'Connect A and B to get A ∧ B.'), ports: { a: 'A', b: 'B' } },
  andE: { name: T('拆解', 'Split'), desc: T('接入 A ∧ B，两个输出口分别得到 A 和 B。', 'Connect A ∧ B to get A and B at separate outputs.'), ports: { ab: 'A ∧ B' }, outs: { left: ['A', 'A'], right: ['B', 'B'] } },
  orI: { name: T('补充', 'Add alternative'), desc: T('接入 A，选定另一句 B 和它的位置，得到 A ∨ B 或 B ∨ A；不需要证明 B。', 'Connect A and choose another statement B and its position to get A ∨ B or B ∨ A. B need not be proved.'), ports: { a: 'A' }, params: { other: T('另一边', 'Other side') } },
  orE: { name: T('分类讨论', 'Case analysis'), desc: T('接入 A ∨ B，在两个框中分别假设 A、B。两个框都证出同一句 C 并接到各自的「结论」时，元件输出 C。', 'Connect A ∨ B and assume A and B in separate boxes. When both prove the same C and connect it to their respective “Conclusion” ports, the part outputs C.'), ports: { ab: 'A ∨ B' }, frames: { left: T('情况一', 'Case one'), right: T('情况二', 'Case two') } },
  botE: { name: T('矛盾推出一切', 'From contradiction'), desc: T('由矛盾 ⊥ 得到元件上选定的任意一句。', 'From the contradiction ⊥, gives whatever sentence is chosen on the part.'), ports: { bot: '⊥' }, params: { C: T('得出', 'Conclude') } },
  raa: { name: T('反证法', 'By contradiction'), desc: T('由 ¬¬A 得到 A（双重否定消去）。', 'From ¬¬A, gives A (double-negation elimination).'), ports: { nna: '¬¬A' } },
  allI: { name: T('任取框', 'For-any box'), desc: T('在元件上为任意对象取名 a，在框内证明 P(a) 并接到「结论」，框外得到 ∀x. P(x)。a 不能出现在未解除的假设中。', 'Name an arbitrary object a on the part. Prove P(a) inside the box and connect it to “Conclusion” to obtain ∀x. P(x) outside. a must not occur in any open assumption.'), params: { x: T('名字', 'Name') }, frames: { body: T('框内', 'Inside') } },
  allE: { name: T('选定一例', 'Choose an instance'), desc: T('接入 ∀x. P(x)，选定对象 t，得到 P(t)。', 'Connect ∀x. P(x) and choose an object t to obtain P(t).'), ports: { all: '∀x. P(x)' }, params: { t: T('哪一样', 'Which thing') } },
  exI: { name: T('概括', 'Generalise'), desc: T('接入 P(t)，以 t 为例得到 ∃x. P(x)。只有一个相符的存在命题时自动输出；有多个时，在元件上选择要得出的命题。', 'Connect P(t) to obtain ∃x. P(x), with t as a witness. If exactly one existential statement fits, it is selected automatically; if several fit, choose the conclusion on the part.'), ports: { a: 'P(t)' }, params: { target: T('要得出', 'Conclude') } },
  exE: { name: T('实例框', 'Instance box'), desc: T('接入 ∃x. P(x)，在元件上为存在的对象取名 a。框内可以假设 P(a)；证出 C 并接到「结论」后，框外得到 C。C 中不能出现 a，a 也不能出现在未解除的假设中。', 'Connect ∃x. P(x) and name the existing object a on the part. Inside the box, P(a) may be assumed. Prove C and connect it to “Conclusion” to obtain C outside. a must not appear in C or in any open assumption.'), ports: { ex: '∃x. P(x)' }, params: { x: T('见证', 'Witness') }, frames: { body: T('框内', 'Inside') } },
  natInd: { name: T('数学归纳法', 'Mathematical induction'), desc: T('带两个框，证元件上选定的 ∀x. P(x)。第一个框证 P(0)；第二个框内的数记作 a（在元件上命名，不能出现在未解除的假设中），可以使用假设 P(a)，要证 P(S a)。两个框都证完，元件输出 ∀x. P(x)。', 'Two boxes, proving the ∀x. P(x) chosen on the part. The first proves P(0); in the second the number is called a (named on the part; it must not occur in any open assumption), P(a) may be used as an assumption, and P(S a) is to be proved. Once both are proved, the part gives ∀x. P(x).'), params: { P: T('要证', 'Prove'), x: T('名字', 'Name') }, frames: { zero: T('0 的情况', 'The case 0'), step: T('从 a 到 S a', 'From a to S a') } },
  refl: { name: T('自反律', 'Reflexivity'), desc: T('在元件上选定一样东西 t，得到 t = t。', 'Choose a thing t on the part; gives t = t.'), params: { t: T('哪一样', 'Which thing') } },
  rewrite: { name: T('等量代换', 'Rewrite'), desc: T('接入 s = t 和一句含 s 的话；元件标出这句话里的每一处 s，勾选的几处换成 t。', 'Wire in s = t and a sentence containing s; the part marks each s in it, and the ticked ones become t.'), ports: { eq: 's = t', p: 'φ(s)' } },
}

/** The machine board's parts (../machine.js): name, what each does, and the regions of a frame. */
export const MACHINE_TEXT = {
  // The elimination-rule generator (chapter 12): rules as values, taken apart and put together.
  anyR: { name: T('任意结论', 'Any conclusion'), desc: T('输出 ?R：任意一句话。', 'Gives ?R: any sentence at all.') },
  swapConcl: { name: T('替换结论', 'Swap conclusion'), desc: T('接入一条规则和一句话：保留规则的前提，结论换成这句话。', 'Wire in a rule and a sentence: keeps the rule’s premises and makes the sentence its conclusion.'), ports: { rule: T('规则', 'Rule'), to: T('换成', 'Becomes') } },
  consFront: { name: T('添加首项', 'Put first'), desc: T('把「这一样」放在「一串」的最前面；「一串」接入的不是列表时，把两者组成一个列表。', 'Puts “This” at the front of “A list”; when what comes into “A list” is not a list, makes a list of the two.'), ports: { first: T('这一样', 'This'), rest: T('一串', 'A list') } },
  mkRule: { name: T('构造规则', 'Make a rule'), desc: T('由前提（列表或单项）和结论构造规则 ⟦前提⟧ ⟹ 结论。句子直接作为前提；规则成为带自身假设的前提。', 'Builds the rule ⟦premises⟧ ⟹ conclusion from premises (a list or a single item) and a conclusion. A sentence is a premise as it is; a rule becomes a premise with its own assumptions.'), ports: { premises: T('前提', 'Premises'), conclusion: T('结论', 'Conclusion') } },
  eachOf: { name: T('逐项处理', 'For each'), desc: T('接入列表：框每次收到其中一项，框内的输出接到「结果」；每一项处理一次，结果按原顺序组成列表。', 'Wire in a list: the frame receives one item at a time, and its inner output goes to “Result”; each item is processed once, and the results form a list in the original order.'), frames: { body: T('每一样', 'Each item') } },
  keepBound: { name: T('保留⋀', 'Keep ⋀'), desc: T('接入一条规则。规则以约束变量开头（⋀x. …）时，框内处理其后的规则，输出时在结果前保留这些约束变量；没有约束变量时，框内直接处理输入。', 'Wire in a rule. If it begins with bound variables (⋀x. …), the frame works on the rule after them, and the output keeps the same bound variables in front; if it has none, the frame works on the input itself.'), frames: { body: T('约束变量之后的规则', 'The rule after the bound variables') } },
  elimGen: { name: T('消去规则生成器', 'Elimination rule generator'), desc: T('接入一份声明（所声明的句子和它的引入规则列表），输出这份声明的消去规则。', 'Wire in a declaration (the declared sentence and its list of introduction rules); gives the declaration’s elimination rule.'), ports: { it: T('它', 'It'), ways: T('引入规则', 'Intro rules') } },
  repeat: { name: T('重复框', 'Repeat frame'), desc: T('框收到输入，框内的输出接到「结果」后再送回框内，逐轮重复，直到结果不再变化，输出最后一轮的结果；某一轮失败时，停在失败前的一轮。', 'The frame receives the input; its inner output goes to “Result” and back into the frame, round after round, until it stops changing, and the last round’s result is given. If a round fails, it stops at the round before.'), frames: { body: T('每一轮', 'Each round') } },
  uDelete: { name: T('删除', 'Delete'), desc: T('找到两边相同的等式 t ≐ t，删去它。', 'Finds an equation with identical sides, t ≐ t, and deletes it.') },
  uDecompose: { name: T('分解', 'Decompose'), desc: T('找到两边结构相同的等式（都是「并且」、都是同一个谓词……），分解为对应部分之间的等式：?A ∧ ?B ≐ 下雨 ∧ 刮风 分解为 ?A ≐ 下雨 和 ?B ≐ 刮风。¬A 按 A → ⊥ 分解。', 'Finds an equation whose sides have the same structure (both “and”, the same predicate …) and splits it into equations between corresponding parts: ?A ∧ ?B ≐ it rains ∧ it is windy becomes ?A ≐ it rains and ?B ≐ it is windy. ¬A splits as A → ⊥.') },
  uConflict: { name: T('冲突', 'Conflict'), desc: T('找到两边都不是 ?-字母、结构却不同的等式（一边是「并且」一边是「或者」，或是两个不同的句子……），报告失败。', 'Finds an equation with no ?-letter on either side and different structures (an “and” against an “or”, two different sentences …) and reports failure.') },
  uSwap: { name: T('定向', 'Orient'), desc: T('找到只有右边是 ?-字母的等式 t ≐ ?A，改写为 ?A ≐ t。', 'Finds an equation with a ?-letter on the right only, t ≐ ?A, and turns it into ?A ≐ t.') },
  uCheck: { name: T('出现检查', 'Occurs check'), desc: T('找到等式 ?A ≐ t，t 含有 ?A 而不是 ?A 本身时，报告失败。', 'Finds ?A ≐ t where t contains ?A and is not ?A itself, and reports failure.') },
  uEliminate: { name: T('消元', 'Eliminate'), desc: T('找到等式 ?A ≐ t（t 不含 ?A），而 ?A 还出现在其他等式中：把那些等式中的 ?A 全部换成 t。', 'Finds ?A ≐ t (t free of ?A) where ?A still occurs in other equations, and replaces ?A with t there.') },
  uPattern: { name: T('模式合一', 'Pattern unification'), desc: T('找到等式 ⋀x. ?P(x) ≐ t：?P 的参数是受 ⋀ 约束、互不相同的变量，t 中没有其他 ⋀ 变量。解出 ?P ≐ fun x => t。?P 的参数不是这样的变量时（?P(安)、?P(?t)），保留原等式不变。', 'Finds ⋀x. ?P(x) ≐ t where ?P is applied to distinct variables bound by the ⋀ and t contains no other ⋀ variable, and solves ?P ≐ fun x => t. When ?P is applied to anything else (?P(ann), ?P(?t)), the equation is left unchanged.') },
  unifier: { name: T('合一器', 'Unifier'), desc: T('把一组等式解到底：每个等式左边是一个 ?-字母，右边不含这些 ?-字母（最一般合一子）；无法合一时报告失败。', 'Solves a set of equations to the end: each with a ?-letter on the left and none of those letters on any right side (the most general unifier); reports failure if there is none.') },
  rule: { name: T('逆用规则', 'Rule'), desc: T('从「规则」口接入规则，用第一条适用的：第一个目标与规则的结论合一，换成规则的前提（每条前提一个目标，前提自带的假设加入已知）。尚未确定的 ?-字母留在目标中。', 'Takes rules at its “Rules” port and uses the first that applies: the first goal is unified with the rule’s conclusion and replaced by its premises (one goal per premise, each premise’s own assumptions added to the hypotheses). Any ?-letter not yet fixed stays in the goals.') },
  assumption: { name: T('由假设得证', 'Assumption'), desc: T('第一个目标与它的一条已知合一：成功时这个目标证完，相应的 ?-字母随之确定。从上往下查找，用第一条合得上的已知。', 'Unifies the first goal with one of its hypotheses: on success the goal is closed and its ?-letters are fixed. It searches from the top and uses the first that fits.') },
  erule: { name: T('规则作用于假设', 'Rule on a given'), desc: T('接入规则：规则的结论与第一个目标合一，第一条前提与它的一条已知合一，这个目标换成其余的前提，每条一个目标。接入多条时用第一条适用的。', 'Takes rules: the rule’s conclusion is unified with the first goal and its first premise with one of that goal’s hypotheses; the goal is replaced by the remaining premises, one goal each. Given several rules, it uses the first that applies.') },
  frule: { name: T('前向推理', 'Forward'), desc: T('接入规则：规则的第一条前提与第一个目标的一条已知合一，结论加入已知；其余前提各成一个目标，排在前面。接入多条时用第一条适用的。', 'Takes rules: the rule’s first premise is unified with one of the first goal’s hypotheses and its conclusion is added to the hypotheses; each remaining premise becomes a goal, placed first. Given several rules, it uses the first that applies.') },
  defer: { name: T('目标后移', 'Defer'), desc: T('把第一个目标移到最后，原来的第二个目标成为第一个。', 'Moves the first goal to the end; the second becomes the first.') },
  append: { name: T('依次尝试', 'Alternatives'), desc: T('每个框收到相同的状态；输出第一个没有失败的框的结果。在元件上选定框的数目。', 'Every region receives the same state; gives the result of the first region that does not fail. The number of regions is chosen on the part.'), params: { ways: T('框', 'Regions') }, frames: { first: T('先试', 'Try first'), second: T('再试', 'Then'), third: T('再试', 'Then'), fourth: T('再试', 'Then'), fifth: T('再试', 'Then'), sixth: T('再试', 'Then') } },
  search: { name: T('回溯搜索', 'Search'), desc: T('深度优先搜索：框内的元件对收到的状态走一步，再从得到的每种结果继续；一条路走到底再回溯走下一条，直到没有目标。输出找到的每一个证完的状态。回到原状态的一步（目标没有减少，已知也没有增加）不再继续。可以在元件上设定最大深度。', 'Depth-first search: the parts inside take one step on the state received, then go on from each result; each path is followed to its end before backtracking to the next, until no goal remains. Gives every finished state it finds. A step back to where it was (no fewer goals, no more hypotheses) is not followed. A depth limit can be set on the part.'), params: { depth: T('最多', 'At most') }, frames: { body: T('每一步', 'Each step') } },
  each: { name: T('逐个目标', 'Every goal'), desc: T('框内的元件对每个目标各执行一次，每次只看到这一个目标；任一目标失败，整个元件失败。', 'The parts inside run once on each goal, seeing only that goal each time; if any goal fails, the whole part fails.'), frames: { body: T('逐个目标', 'Each goal') } },
  introRules: { name: T('分解目标', 'Goal apart'), desc: T('把每条引入规则逆用于第一个目标：拼接、假设框、补充的左右两条、任取框、概括。每条相合的规则给出一种结果。', 'Applies every introduction rule backwards to the first goal: Join, the assumption box, Add alternative left and right, the for-any box, Generalise. Each rule that fits gives one result.') },
  elimRules: { name: T('分解假设', 'Use a given'), desc: T('把每条消去规则用于已知：拆解、分类讨论、套用「若…则…」、矛盾推出一切、实例框，以及选定一例后再使用。每种相合的用法给出一种结果。', 'Applies every elimination rule to the hypotheses: Split, Case analysis, applying an “if”, from contradiction, the instance box, and choose an instance then use it. Each fit gives one result.') },
  rw: { name: T('改写', 'Rewrite'), desc: T('接入改写规则：在第一个目标中，由外向内、从左到右找到第一处与规则左边相合的位置，换成规则右边，只换这一处。规则带条件时，每个条件成为新目标，排在这个目标之后。接入多条时用第一条相合的；没有一处相合，元件失败。', 'Takes rewrite rules: in the first goal, outside in and left to right, the first place that fits the rule’s left side becomes its right side, that place alone. A rule with conditions adds each as a new goal after this one. Given several, it uses the first that fits; if nothing fits, it fails.'), params: { at: T('改哪里', 'Where') } },
  simp: { name: T('化简', 'Simp'), desc: T('接入改写规则列表：每一轮用第一条相合的规则改写一处，逐轮重复，直到没有规则相合。', 'Takes a list of rewrite rules: each round, the first that fits rewrites one place, round after round, until none fits.'), params: { at: T('改哪里', 'Where') } },
  auto: { name: T('自建 auto', 'Own auto'), desc: T('深度优先搜索，直到证完：每一步依次尝试由假设得证、分解目标、分解假设；回到原状态的路径不再继续。', 'Searches depth first until done: each step tries Assumption, then Goal apart, then Use a given; a path back to an earlier state is not followed.') },
  // Clauses (chapter 11).
  skolem: { name: T('Skolem 化', 'Skolemise'), desc: T('消去第一个目标的已知中所有的 ∃：外层没有 ∀ 的，像实例框一样取出那一样东西；在 ∀ 之内的，换成一个新函数，参数是外层所有 ∀ 的变量（sk1(x)……）。已知须先化为否定范式。', 'Removes every ∃ from the first goal’s hypotheses: one with no ∀ outside is taken out as the instance box does; one under a ∀ becomes a new function of all the enclosing ∀ variables (sk1(x) …). The hypotheses must be in negation normal form first.') },
  toClauses: { name: T('析出子句', 'Into clauses'), desc: T('第一个目标须为 ⊥：把它的已知拆成子句。每条已知须为合取范式；拆开「并且」，每串「或者」成为一条子句，去掉 ∀，变量按「对所有」理解。', 'The first goal must be ⊥: its hypotheses are split into clauses. Each must be in CNF; conjunctions are split, each disjunction becomes a clause, ∀s are dropped and variables read as universally quantified.') },
  resolve: { name: T('一轮归结', 'A round of resolution'), desc: T('子句集中的每一对子句各试一次：一条中的某个文字与另一条中的相反文字能合一时，消去这一对，其余文字合成新子句加入子句集，并记下它的两条父子句。舍弃永真子句和重复子句。可以在元件上设定只与单文字子句归结。', 'Tries every pair of clauses in the set once: when a literal of one unifies with the complement of a literal of the other, that pair is cancelled and the remaining literals form a new clause, added with a record of its two parents. Tautologies and duplicates are dropped. It can be set to resolve only against one-literal clauses.'), params: { unit: T('和谁消', 'Cancel with') } },
  saturate: { name: T('饱和器', 'Saturator'), desc: T('逐轮归结，直到推出 ⊥，或不再产生新子句。', 'Resolves round after round until ⊥ appears or no new clause does.') },
  oracle: { name: T('外部证明器', 'Someone else’s prover'), desc: T('快速证明器：两条子句间的相反文字一次全部消去，逐轮进行，直到推出 ⊥ 或不再产生新子句。每条新子句也记下两条父子句。', 'A fast prover: it cancels all complementary literals between two clauses at once, round after round until ⊥ appears or no new clause does. It too records the two parents of each new clause.') },
  replay: { name: T('重放', 'Replay'), desc: T('子句集中有 ⊥ 时，把推出 ⊥ 的步骤交给核检查：用到的每条输入子句须由某条已知拆出；每一步须由它的两条父子句（变量按合一结果代入）经自建 auto 证出。全部通过，拆出这些子句的目标即证完；某一步不通过，指出是哪一步。', 'When the clause set contains ⊥, the steps to ⊥ go to the kernel: each input clause used must come from a hypothesis, and each step must be proved from its two parents (variables instantiated by unification) by Own auto. If all pass, the goal the clauses came from is proved; otherwise it names the failing step.') },
  clausify: { name: T('完整子句化', 'Into clauses, all the way'), desc: T('把待证句子的否定加入已知，把已知化为合取范式并消去 ∃，再拆成子句。', 'Adds the negated goal to the hypotheses, brings them to CNF, removes the ∃s and splits them into clauses.') },
  metis: { name: T('证明重建器', 'Reconstructor'), desc: T('把目标化为子句，找出推出 ⊥ 的证书，再由核重放检查：通过则目标证完；证书没有通过检查时，元件失败。', 'Turns the goal into clauses, finds a certificate that reaches ⊥ and has the kernel replay it: if it passes, the goal is closed; if the certificate fails the check, the part fails.') },
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
      // A lemma that runs as one of the kit's cards has that card's ports.
      if (l?.card && RULE_TEXT[l.card]?.ports) return RULE_TEXT[l.card].ports[port] ?? ''
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

