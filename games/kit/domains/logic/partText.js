// What the parts the player builds on the machine board are called and what they do (《证明完毕》, machine.js
// builtMachine): the name and description each shows, as the parts box and the boards show a built part.
import { T } from '../../shell/i18n.js'

/** The machine board's built parts: name, what each does. */
export const BUILT_TEXT = {
  elimGen: { name: T('消去规则生成器', 'Elimination rule generator'), desc: T('接入一份声明（所声明的句子和它的引入规则列表），输出这份声明的消去规则。', 'Wire in a declaration (the declared sentence and its list of introduction rules); gives the declaration’s elimination rule.') },
  unifier: { name: T('合一器', 'Unifier'), desc: T('把一组等式解到底：每个等式左边是一个 ?-字母，右边不含这些 ?-字母（最一般合一子）；无法合一时报告失败。', 'Solves a set of equations to the end: each with a ?-letter on the left and none of those letters on any right side (the most general unifier); reports failure if there is none.') },
  erule: { name: T('规则作用于假设', 'Rule on a given'), desc: T('接入规则：规则的结论与第一个目标合一，第一条前提与它的一条已知合一，这个目标换成其余的前提，每条一个目标。接入多条时用第一条适用的。', 'Takes rules: the rule’s conclusion is unified with the first goal and its first premise with one of that goal’s hypotheses; the goal is replaced by the remaining premises, one goal each. Given several rules, it uses the first that applies.') },
  frule: { name: T('前向推理', 'Forward'), desc: T('接入规则：规则的第一条前提与第一个目标的一条已知合一，结论加入已知；其余前提各成一个目标，排在前面。接入多条时用第一条适用的。', 'Takes rules: the rule’s first premise is unified with one of the first goal’s hypotheses and its conclusion is added to the hypotheses; each remaining premise becomes a goal, placed first. Given several rules, it uses the first that applies.') },
  introRules: { name: T('分解目标', 'Goal apart'), desc: T('把每条引入规则逆用于第一个目标：拼接、假设框、补充的左右两条、任取框、概括。每条相合的规则给出一种结果。', 'Applies every introduction rule backwards to the first goal: Join, the assumption box, Add alternative left and right, the for-any box, Generalise. Each rule that fits gives one result.') },
  elimRules: { name: T('分解假设', 'Use a given'), desc: T('把每条消去规则用于已知：拆解、分类讨论、套用「若…则…」、爆炸、实例框，以及选定一例后再使用。每种相合的用法给出一种结果。', 'Applies every elimination rule to the hypotheses: Split, Case analysis, applying an “if”, Explosion, the instance box, and choose an instance then use it. Each fit gives one result.') },
  auto: { name: T('自建 auto', 'Own auto'), desc: T('深度优先搜索，直到证完：每一步依次尝试由假设得证、分解目标、分解假设；回到原状态的路径不再继续。', 'Searches depth first until done: each step tries Assumption, then Goal apart, then Use a given; a path back to an earlier state is not followed.') },
  simp: { name: T('化简', 'Simp'), desc: T('接入改写规则列表：每一轮用第一条相合的规则改写一处，逐轮重复，直到没有规则相合。', 'Takes a list of rewrite rules: each round, the first that fits rewrites one place, round after round, until none fits.') },
  saturate: { name: T('饱和器', 'Saturator'), desc: T('逐轮归结，直到推出 ⊥，或不再产生新子句。', 'Resolves round after round until ⊥ appears or no new clause does.') },
  clausify: { name: T('完整子句化', 'Into clauses, all the way'), desc: T('把待证句子的否定加入已知，把已知化为合取范式并消去 ∃，再拆成子句。', 'Adds the negated goal to the hypotheses, brings them to CNF, removes the ∃s and splits them into clauses.') },
  metis: { name: T('证明重建器', 'Reconstructor'), desc: T('把目标化为子句，找出推出 ⊥ 的证书，再由核重放检查：通过则目标证完；证书没有通过检查时，元件失败。', 'Turns the goal into clauses, finds a certificate that reaches ⊥ and has the kernel replay it: if it passes, the goal is closed; if the certificate fails the check, the part fails.') },
}
