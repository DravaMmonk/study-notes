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
  mp: { name: T('套用', 'Apply'), desc: T('由 A → B 和前件 A 推出后件 B。这是分离规则，也称肯定前件式。', 'From A → B and its antecedent A, infer the consequent B. This is modus ponens, also called implication elimination.'), ports: { imp: 'A → B', a: 'A' } },
  impI: { name: T('假设框', 'Assumption box'), desc: T('蕴含引入：在临时假设 A 下证明 B，解除这一假设后得到 A → B；其他前提仍保留。', 'Implication introduction: assume A and prove B inside the box. Discharge A to obtain A → B; other premises remain.'), params: { A: T('假设', 'Assume') }, frames: { body: T('框内', 'Inside') } },
  andI: { name: T('引入 ∧', '∧ intro'), desc: T('由 A 和 B 得到 A ∧ B。这是声明「并且」时写下的引入规则。', 'From A and B, infer A ∧ B. This is the introduction rule written when declaring “and”.'), ports: { a: 'A', b: 'B' } },
  andE: { name: T('消去 ∧', '∧ elim'), desc: T('由 A ∧ B 分别得到 A 和 B，两个输出口各给出一边。这是由「并且」的声明生成的消去规则：「并且」只有一条引入规则，消去时取回这条规则的两个前提。', 'From A ∧ B, infer A and B, one at each output. This is the elimination rule generated from the declaration of “and”: with a single introduction rule, elimination recovers its two premises.'), ports: { ab: 'A ∧ B' }, outs: { left: ['A', 'A'], right: ['B', 'B'] } },
  orI: { name: T('引入 ∨', '∨ intro'), desc: T('由 A 得到 A ∨ B 或 B ∨ A；在元件上选择另一边的 B，以及 A 放在左边还是右边。这是声明「或者」时写下的两条引入规则。', 'From A, infer A ∨ B or B ∨ A; choose B and the side on the part. These are the two introduction rules written when declaring “or”.'), ports: { a: 'A' }, params: { other: T('另一边', 'Other side') } },
  orE: { name: T('消去 ∨', '∨ elim'), desc: T('带两个框的元件。输入口接入 A ∨ B；「情况一」框假设 A，「情况二」框假设 B。两个框都证出同一句 C 并接到各自的「结论」时，元件输出 C：无从得知成立的是哪一边，因此两种情况各证一次。这是声明「或者」时由两条引入规则生成的消去规则。', 'A part with two boxes. Wire A ∨ B into its input; box Case one assumes A and box Case two assumes B. When both prove the same C, each wired to its own “Conclusion”, the part outputs C: since it is unknown which side holds, each case is proved. This is the elimination rule generated from the two introduction rules when “or” is declared.'), ports: { ab: 'A ∨ B' }, frames: { left: T('情况一', 'Case one'), right: T('情况二', 'Case two') } },
  botE: { name: T('矛盾推出一切', 'From contradiction'), desc: T('由矛盾 ⊥ 得到元件上选择的任意一句。这是声明 ⊥ 时生成的消去规则：⊥ 没有引入规则，因此不需要证明任何情况。', 'From contradiction ⊥, infer the proposition selected on the part. This is the elimination rule generated for ⊥, which has no introduction cases.'), ports: { bot: '⊥' }, params: { C: T('得出', 'Conclude') } },
  raa: { name: T('反证法', 'By contradiction'), desc: T('由 ¬¬A 推出 A，称为双重否定消去。本游戏将它作为经典原则加入证明核；与否定引入结合时，可用于反证法。', 'From ¬¬A infer A: this is double-negation elimination. The game adds it to the kernel as a classical principle; together with negation introduction it supports proof by contradiction.'), ports: { nna: '¬¬A' } },
  allI: { name: T('全称概括', 'For any'), desc: T('带一个框的元件：框内任取一样东西，在元件上命名为 a、b 或 c（这个名字不能出现在尚未解除的假设中）。框内证出 P(a)，框外得到 ∀x. P(x)。', 'A box: inside it, an arbitrary thing, named a, b or c on the part (the name must not occur in any open assumption). Prove P(a) inside to obtain ∀x. P(x) outside.'), params: { x: T('名字', 'Name') }, frames: { body: T('框内', 'Inside') } },
  allE: { name: T('全称实例化', 'Take one'), desc: T('接入 ∀x. P(x)，在元件上选择一样东西 t，得到 P(t)。', 'Wire in ∀x. P(x) and choose a thing t on the part to obtain P(t).'), ports: { all: '∀x. P(x)' }, params: { t: T('哪一样', 'Which thing') } },
  exI: { name: T('存在概括', 'Example'), desc: T('接入 P(t)，得到 ∃x. P(x)，t 即为例证，由元件自动识别。关卡中只有一句「存在」句与之匹配时，自动得出这一句；有多句匹配时，在元件上选择要得出的句子（例如由 a喜欢a 既可得出 ∃x. x喜欢x，也可得出 ∃x. a喜欢x）。', 'Wire in P(t) to obtain ∃x. P(x), with t as the witness, identified by the part. When only one “there is” sentence of the level matches, it is concluded automatically; when several match, choose one on the part (from a likes a you can conclude ∃x. x likes x or ∃x. a likes x).'), ports: { a: 'P(t)' }, params: { target: T('要得出', 'Conclude') } },
  exE: { name: T('存在实例化', 'Take the one there is'), desc: T('接入 ∃x. P(x)。框内把那一样东西记作 a（在元件上命名为 a、b 或 c），由假设 P(a) 证出 C 后，框外得到 C。C 中不能出现 a。', 'Wire in ∃x. P(x). Inside the box that thing is called a (named a, b or c on the part); prove C from the assumption P(a) to obtain C outside. C must not mention a.'), ports: { ex: '∃x. P(x)' }, params: { x: T('见证', 'Witness') }, frames: { body: T('框内', 'Inside') } },
  natInd: { name: T('数学归纳法', 'Mathematical induction'), desc: T('带两个框的元件，用于证明元件上选择的 ∀x. P(x)。第一个框证明 P(0)；第二个框内的数记作 a（在元件上命名，不能出现在尚未解除的假设中），假设 P(a)，证明 P(S a)。两个框都证完后，元件输出 ∀x. P(x)。', 'A part with two boxes that proves the ∀x. P(x) chosen on it. The first box proves P(0); in the second, the number is called a (named on the part; it must not occur in any open assumption), P(a) is assumed and P(S a) is proved. Once both boxes are complete, the part outputs ∀x. P(x).'), params: { P: T('要证', 'Prove'), x: T('名字', 'Name') }, frames: { zero: T('0 的情况', 'The case 0'), step: T('从 a 到 S a', 'From a to S a') } },
  refl: { name: T('自反律', 'Reflexivity'), desc: T('在元件上选择一样东西 t，直接得到 t = t。', 'Choose a thing t on the part to obtain t = t directly.'), params: { t: T('哪一样', 'Which thing') } },
  rewrite: { name: T('等量代换', 'Rewrite'), desc: T('接入 s = t 和一句含 s 的话；元件框出这句话中每一处 s，勾选的位置替换为 t。', 'Wire in s = t and a sentence containing s; the part marks each occurrence of s, and the ticked ones are replaced by t.'), ports: { eq: 's = t', p: 'φ(s)' } },
}

/** The machine board's parts (../machine.js): name, what each does, and the regions of a frame. */
export const MACHINE_TEXT = {
  // The elimination-rule generator (chapter 12): rules as values, taken apart and put together.
  anyR: { name: T('任意结论', 'Any conclusion'), desc: T('给出 ?R：任意一句话。', 'Gives ?R: any sentence at all.') },
  swapConcl: { name: T('替换结论', 'Swap conclusion'), desc: T('接入规则和句子：保留规则的前提，把结论替换为这个句子。', 'Wire in a rule and a sentence: keeps the rule’s premises and replaces its conclusion with the sentence.'), ports: { rule: T('规则', 'Rule'), to: T('换成', 'Becomes') } },
  consFront: { name: T('添加首项', 'Put first'), desc: T('把「这一样」放到「一串」的最前面；「一串」口接入的不是列表时，把两者组成列表。', 'Puts “This” at the front of “A list”; when the input is not a list, makes a list of the two.'), ports: { first: T('这一样', 'This'), rest: T('一串', 'A list') } },
  mkRule: { name: T('构造规则', 'Make a rule'), desc: T('由前提（列表或单项）和结论构造规则 ⟦前提⟧ ⟹ 结论。句子按原样作为前提；规则则成为带假设的前提。', 'Builds the rule ⟦premises⟧ ⟹ conclusion from premises (a list or a single item) and a conclusion. A sentence becomes a premise as it is; a rule becomes a premise with its own assumptions.'), ports: { premises: T('前提', 'Premises'), conclusion: T('结论', 'Conclusion') } },
  eachOf: { name: T('逐项处理', 'For each'), desc: T('接入列表：框每次收到其中一项，框内的输出接回「结果」；每一项各处理一次，结果按原顺序组成列表。', 'Wire in a list: the frame receives one item at a time, and its inner output goes to “Result”; each item is processed once, and the results form a list in the original order.'), frames: { body: T('每一样', 'Each item') } },
  keepBound: { name: T('保留⋀', 'Keep ⋀'), desc: T('接入一条规则。若规则以约束变量开头（⋀x. …），框内处理其后的规则，输出时在结果前保留原有的约束变量；若不含约束变量，框内直接处理输入。', 'Wire in a rule. If it begins with bound variables (⋀x. …), the frame works on the rule that follows them, and its output keeps the same bound variables in front; if it has none, the frame works on the input itself.'), frames: { body: T('约束变量之后的规则', 'The rule after the bound variables') } },
  elimGen: { name: T('消去规则生成器', 'Elimination rule generator'), desc: T('接入声明（所声明的句子和引入规则列表），输出这份声明的消去规则。', 'Wire in a declaration (the declared sentence and its list of introduction rules); outputs the declaration’s elimination rule.'), ports: { it: T('它', 'It'), ways: T('引入规则', 'Intro rules') } },
  repeat: { name: T('重复框', 'Repeat frame'), desc: T('框收到输入，框内的输出接回「结果」；框再把结果送回框内，逐轮重复，直到结果不再变化（若某一轮失败，则停在失败前的一轮），输出最后一轮的结果。', 'The frame receives the input, and its inner output goes to “Result”; the result is fed back in, round after round, until it stops changing (if a round fails, it stops at the round before), and the last round’s result is output.'), frames: { body: T('每一轮', 'Each round') } },
  uDelete: { name: T('删除', 'Delete'), desc: T('找到两边相同的等式 t ≐ t，并删除它。', 'Finds an equation whose two sides are identical, t ≐ t, and deletes it.') },
  uDecompose: { name: T('分解', 'Decompose'), desc: T('找到两边结构相同的等式（都是「并且」、都是同一个谓词……），把它分解为对应部分之间的等式：?A ∧ ?B ≐ 下雨 ∧ 刮风 分解为 ?A ≐ 下雨 和 ?B ≐ 刮风。¬A 按 A → ⊥ 分解。', 'Finds an equation whose sides have the same structure (both “and”, the same predicate …) and splits it into equations between corresponding parts: ?A ∧ ?B ≐ it rains ∧ it is windy becomes ?A ≐ it rains and ?B ≐ it is windy. ¬A is decomposed as A → ⊥.') },
  uConflict: { name: T('冲突', 'Conflict'), desc: T('找到两边都不是 ?-字母、结构却不同的等式（一边是「并且」、一边是「或者」，或是两个不同的句子……），报告失败：任何代入都无法使两边一致。', 'Finds an equation with no ?-letter on either side and different structures (an “and” against an “or”, two different sentences …) and reports failure: no substitution makes the sides equal.') },
  uSwap: { name: T('定向', 'Orient'), desc: T('找到只有右边是 ?-字母的等式 t ≐ ?A，把它改写为 ?A ≐ t。', 'Finds an equation with a ?-letter on the right only, t ≐ ?A, and turns it into ?A ≐ t.') },
  uCheck: { name: T('出现检查', 'Occurs check'), desc: T('找到等式 ?A ≐ t：t 含有 ?A，而 t 不是 ?A 本身。报告失败。', 'Finds ?A ≐ t where ?A occurs in t and t is not ?A itself, and reports failure.') },
  uEliminate: { name: T('消元', 'Eliminate'), desc: T('找到等式 ?A ≐ t（t 不含 ?A），且 ?A 还出现在其他等式中：把那些等式中的 ?A 全部替换为 t。', 'Finds ?A ≐ t (t free of ?A) where ?A still occurs in other equations, and replaces ?A with t there.') },
  uPattern: { name: T('模式合一', 'Pattern unification'), desc: T('找到等式 ⋀x. ?P(x) ≐ t：?P 的参数是受 ⋀ 约束且互不相同的变量，t 中也没有其他 ⋀ 变量。解出 ?P ≐ fun x => t，即 ?P 是「关于 x 的句子」。?P 的参数不是这样的变量时（?P(安)、?P(?t)），解不唯一，保留原等式不变。', 'Finds ⋀x. ?P(x) ≐ t where ?P is applied to distinct variables bound by the ⋀ and t contains no other ⋀ variable. It solves ?P ≐ fun x => t: ?P is “a sentence about x”. When ?P is applied to anything else (?P(ann), ?P(?t)), the solution is not unique and the equation is left unchanged.') },
  unifier: { name: T('合一器', 'Unifier'), desc: T('把一组等式完全求解：每个等式左边是 ?-字母，右边不含这些 ?-字母（最一般合一子）；无法合一时报告失败。', 'Solves a set of equations completely: each has a ?-letter on the left and none of those letters on any right side (the most general unifier); reports failure if none exists.') },
  rule: { name: T('逆用规则', 'Rule'), desc: T('从「规则」口接入规则，使用第一条适用的规则：把第一个目标与规则的结论合一，替换为规则的前提（每条前提成为一个目标，前提自带的假设加入已知）；规则中尚未确定的 ?-字母留在目标中，由后续元件确定。', 'Takes rules at its “Rules” port and uses the first that applies: the first goal is unified with the rule’s conclusion and replaced by its premises (one goal per premise, each premise’s own assumptions added to the hypotheses); any ?-letter left undetermined stays in the goals until a later part fixes it.') },
  assumption: { name: T('由假设得证', 'Assumption'), desc: T('把第一个目标与它的一条已知合一：合一成功时，这个目标即证完，相应的 ?-字母也随之确定。从上往下查找，使用第一条匹配的已知。', 'Unifies the first goal with one of its hypotheses: on success the goal is closed and its ?-letters are fixed accordingly. It searches from the top and uses the first match.') },
  erule: { name: T('规则作用于假设', 'Rule on a given'), desc: T('接入规则：先逆用规则，再用由假设得证处理留下的第一个目标。规则的结论与第一个目标匹配，第一条前提与一条已知匹配；其余前提各成为一个目标。接入多条规则时，使用第一条适用的规则。', 'Takes rules: Rule, then Assumption on the first goal it leaves. The rule’s conclusion matches the first goal and its first premise matches a hypothesis; each remaining premise becomes a goal. Given several rules, it uses the first that applies.') },
  frule: { name: T('前向推理', 'Forward'), desc: T('接入规则：先证一句，再用规则作用于假设。规则的第一条前提与一条已知匹配，结论加入已知；规则的其余前提各成为一个目标，排在前面。接入多条规则时，使用第一条适用的规则。', 'Takes rules: Have, then Rule on a given. The rule’s first premise matches a hypothesis and its conclusion is added to the hypotheses; each remaining premise becomes a goal, placed first. Given several rules, it uses the first that applies.') },
  defer: { name: T('目标后移', 'Defer'), desc: T('把第一个目标移到最后，原来的第二个目标成为第一个。', 'Moves the first goal to the end; the second becomes the first.') },
  append: { name: T('依次尝试', 'Alternatives'), desc: T('每个框收到相同的状态；输出第一个未失败的框的结果。在元件上选择框的数目。', 'Every region receives the same state; the output is the result of the first region that does not fail. Choose the number of regions on the part.'), params: { ways: T('框', 'Regions') }, frames: { first: T('先试', 'Try first'), second: T('再试', 'Then'), third: T('再试', 'Then'), fourth: T('再试', 'Then'), fifth: T('再试', 'Then'), sixth: T('再试', 'Then') } },
  search: { name: T('回溯搜索', 'Search'), desc: T('深度优先搜索：框内元件对收到的状态执行一步，再对得到的每种结果继续执行；一条路径走到底后再回溯尝试下一条，直到没有目标；输出找到的每个已证完的状态。若某一步回到原状态（目标没有减少，已知也没有增加），不再沿这条路径继续。可以在元件上设置最大搜索深度。', 'Depth-first search: the parts inside take one step on the state received, then continue from each result; each path is followed to its end before backtracking to the next, until no goal remains. It outputs every finished state it finds. A step that returns to where it was (no fewer goals, no more hypotheses) is not followed. A depth limit can be set on the part.'), params: { depth: T('最多', 'At most') }, frames: { body: T('每一步', 'Each step') } },
  each: { name: T('逐个目标', 'Every goal'), desc: T('框内元件对每个目标各执行一次，每次只处理这一个目标；任一目标失败，整个元件即失败。', 'The parts inside run once on each goal, seeing only that goal each time; if any goal fails, the whole part fails.'), frames: { body: T('逐个目标', 'Each goal') } },
  introRules: { name: T('分解目标', 'Goal apart'), desc: T('把每条引入规则逆用于第一个目标：引入 ∧、假设框、引入 ∨ 的左右两条、全称概括、存在概括。每条匹配的规则给出一种结果。', 'Applies every introduction rule backwards to the first goal: ∧ intro, the assumption box, ∨ intro left and right, for any, example. Each rule that matches gives one result.') },
  elimRules: { name: T('分解假设', 'Use a given'), desc: T('把每条消去规则用于已知：消去 ∧、消去 ∨、套用「若…则…」、矛盾推出一切、存在实例化，以及全称实例化后再使用。每种匹配给出一种结果。', 'Applies every elimination rule to the hypotheses: ∧ elim, ∨ elim, applying an “if”, from contradiction, take the one there is, and take one then use it. Each match gives one result.') },
  rw: { name: T('改写', 'Rewrite'), desc: T('接入改写规则：在第一个目标中，按由外向内、从左到右的顺序，找到第一处与规则左边匹配的位置，替换为规则右边，只替换这一处。规则带条件时，每个条件成为新目标，排在这个目标之后。接入多条规则时，使用第一条匹配的规则；没有任何位置匹配时，元件失败。', 'Takes rewrite rules: in the first goal, working outside-in and left to right, it replaces the first match of the rule’s left side with its right side, at that position only. A conditional rule adds each condition as a new goal after it. Given several rules, it uses the first that matches; if nothing matches, it fails.'), params: { at: T('改哪里', 'Where') } },
  simp: { name: T('化简', 'Simp'), desc: T('接入改写规则列表：每一轮用第一条匹配的规则改写一处，逐轮重复，直到没有规则匹配。', 'Takes a list of rewrite rules: each round, the first matching rule rewrites one position; rounds repeat until no rule matches.'), params: { at: T('改哪里', 'Where') } },
  auto: { name: T('自建 auto', 'Own auto'), desc: T('深度优先搜索，直到证完：每一步依次尝试由假设得证、分解目标、分解假设；不沿回到原状态的路径继续。', 'Searches depth first until done: each step tries Assumption, then Goal apart, then Use a given; paths that return to an earlier state are not followed.') },
  // Clauses (chapter 11).
  skolem: { name: T('Skolem 化', 'Skolemise'), desc: T('消去第一个目标的已知中的所有 ∃：外层没有 ∀ 的，按存在实例化的方式取出那一样东西；位于 ∀ 之内的，替换为新函数，参数是外层所有 ∀ 的变量（sk1(x)……）。已知须先化为否定范式。', 'Removes every ∃ from the first goal’s hypotheses: one with no ∀ outside is instantiated as Take the one there is does; one under a ∀ becomes a new function of all the enclosing ∀ variables (sk1(x) …). The hypotheses must first be in negation normal form.') },
  toClauses: { name: T('析出子句', 'Into clauses'), desc: T('第一个目标须为 ⊥：把它的已知拆成子句。每条已知须为合取范式；拆开「并且」，每串「或者」成为一条子句，去掉 ∀，变量按「对所有」理解。', 'The first goal must be ⊥: its hypotheses are split into clauses. Each must be in CNF; conjunctions are split, each disjunction becomes a clause, ∀s are dropped, and variables are read as universally quantified.') },
  resolve: { name: T('一轮归结', 'A round of resolution'), desc: T('对子句集中的每一对子句各尝试一次：一条中的某个文字与另一条中的相反文字能合一时，消去这对文字，把剩余文字合并为新子句加入子句集，并记录它的两条父子句。舍弃永真子句和重复子句。可以在元件上设置只与单项子句归结。', 'Tries every pair of clauses in the set once: when a literal of one unifies with the complement of a literal in the other, the pair is resolved away and the remaining literals form a new clause, added with a record of its two parents. Tautologies and duplicates are discarded. It can be set to resolve only against one-literal clauses.'), params: { unit: T('和谁消', 'Cancel with') } },
  saturate: { name: T('饱和器', 'Saturator'), desc: T('逐轮归结，直到推出 ⊥，或不再产生新子句。', 'Resolves round after round until ⊥ appears or no new clause does.') },
  oracle: { name: T('外部证明器', 'Someone else’s prover'), desc: T('快速证明器：两条子句间的相反文字一次全部消去；逐轮执行，直到推出 ⊥ 或不再产生新子句。它同样记录每条新子句的两条父子句。', 'A fast prover: it cancels all complementary literals between two clauses at once, round after round until ⊥ appears or no new clause does. It also records the two parents of each new clause.') },
  replay: { name: T('重放', 'Replay'), desc: T('子句集中有 ⊥ 时，把推出 ⊥ 的步骤交给核检查：用到的每条输入子句须由某条已知拆出；每一步须由它的两条父子句（变量按合一结果代入）经自建 auto 证出。全部通过时，拆出这些子句的目标即证完；某一步未通过时，指出是哪一步。', 'When the clause set contains ⊥, the steps leading to ⊥ go to the kernel: each input clause used must come from a hypothesis, and each step must be proved from its two parents (with variables instantiated by unification) by your own auto. If all pass, the goal the clauses came from is proved; otherwise it reports the failing step.') },
  clausify: { name: T('完整子句化', 'Into clauses, all the way'), desc: T('依次用反证法和假设框把待证句子的否定加入已知，用化简把已知化为合取范式，用 Skolem 化消去 ∃，最后析出子句。', 'By contradiction and an assumption box add the negated goal to the hypotheses, Simp brings them to CNF, Skolemise removes the ∃s, and they are split into clauses.') },
  metis: { name: T('证明重建器', 'Reconstructor'), desc: T('先完整子句化，再由饱和器寻找证书，最后由核重放：证得出的目标即证完，证书未通过检查时失败。', 'Clausifies fully, has the saturator find a certificate, and has the kernel replay it: a provable goal is closed; if the certificate fails the check, the part fails.') },
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

