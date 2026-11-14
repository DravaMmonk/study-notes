// What the machine board's parts are called and what they do (《证明完毕》), as a player reads them: each part's name,
// what it does, its ports, the settings on its card and a frame's regions. The vocabulary's items (vocabulary.js) are
// named by them.
import { T } from '../../shell/i18n.js'


/** The machine board's parts (../machine.js): name, what each does, and the regions of a frame. */
export const MACHINE_TEXT = {
  // The elimination-rule generator (chapter 12): rules as values, taken apart and put together.
  anyR: { name: T('任意结论'), desc: T('输出 ?R：任意一句话。') },
  swapConcl: { name: T('替换结论'), desc: T('接入一条规则和一句话：保留规则的前提，结论换成这句话。'), ports: { rule: T('规则', 'Rule'), to: T('换成') } },
  consFront: { name: T('添加首项'), desc: T('把「这一样」放在「一串」的最前面；「一串」接入的不是列表时，把两者组成一个列表。'), ports: { first: T('这一样'), rest: T('一串') } },
  mkRule: { name: T('构造规则'), desc: T('由前提（列表或单项）和结论构造规则 ⟦前提⟧ ⟹ 结论。句子直接作为前提；规则成为带自身假设的前提。'), ports: { premises: T('前提'), conclusion: T('结论') } },
  eachOf: { name: T('逐项处理'), desc: T('接入列表：框每次收到其中一项，框内的输出接到「结果」；每一项处理一次，结果按原顺序组成列表。'), frames: { body: T('每一样') } },
  keepBound: { name: T('保留⋀'), desc: T('接入一条规则。规则以约束变量开头（⋀x. …）时，框内处理其后的规则，输出时在结果前保留这些约束变量；没有约束变量时，框内直接处理输入。'), frames: { body: T('约束变量之后的规则') } },
  elimGen: { name: T('消去规则生成器'), desc: T('接入一份声明（所声明的句子和它的引入规则列表），输出这份声明的消去规则。'), ports: { it: T('它'), ways: T('引入规则') } },
  repeat: { name: T('重复框'), desc: T('框收到输入，框内的输出接到「结果」后再送回框内，逐轮重复，直到结果不再变化，输出最后一轮的结果；某一轮失败时，停在失败前的一轮。'), frames: { body: T('每一轮') } },
  uDelete: { name: T('删除', 'Delete'), desc: T('找到两边相同的等式 t ≐ t，删去它。') },
  uDecompose: { name: T('分解'), desc: T('找到两边结构相同的等式（都是「并且」、都是同一个谓词……），分解为对应部分之间的等式：?A ∧ ?B ≐ 下雨 ∧ 刮风 分解为 ?A ≐ 下雨 和 ?B ≐ 刮风。¬A 按 A → ⊥ 分解。') },
  uConflict: { name: T('冲突'), desc: T('找到两边都不是 ?-字母、结构却不同的等式（一边是「并且」一边是「或者」，或是两个不同的句子……），报告失败。') },
  uSwap: { name: T('定向'), desc: T('找到只有右边是 ?-字母的等式 t ≐ ?A，改写为 ?A ≐ t。') },
  uCheck: { name: T('出现检查'), desc: T('找到等式 ?A ≐ t，t 含有 ?A 而不是 ?A 本身时，报告失败。') },
  uEliminate: { name: T('消元'), desc: T('找到等式 ?A ≐ t（t 不含 ?A），而 ?A 还出现在其他等式中：把那些等式中的 ?A 全部换成 t。') },
  uPattern: { name: T('模式合一'), desc: T('找到等式 ⋀x. ?P(x) ≐ t：?P 的参数是受 ⋀ 约束、互不相同的变量，t 中没有其他 ⋀ 变量。解出 ?P ≐ fun x => t。?P 的参数不是这样的变量时（?P(安)、?P(?t)），保留原等式不变。') },
  unifier: { name: T('合一器'), desc: T('把一组等式解到底：每个等式左边是一个 ?-字母，右边不含这些 ?-字母（最一般合一子）；无法合一时报告失败。') },
  rule: { name: T('逆用规则'), desc: T('从「规则」口接入规则，用第一条适用的：第一个目标与规则的结论合一，换成规则的前提（每条前提一个目标，前提自带的假设加入已知）。尚未确定的 ?-字母留在目标中。') },
  assumption: { name: T('由假设得证'), desc: T('第一个目标与它的一条已知合一：成功时这个目标证完，相应的 ?-字母随之确定。从上往下查找，用第一条合得上的已知。') },
  erule: { name: T('规则作用于假设'), desc: T('接入规则：规则的结论与第一个目标合一，第一条前提与它的一条已知合一，这个目标换成其余的前提，每条一个目标。接入多条时用第一条适用的。') },
  frule: { name: T('前向推理'), desc: T('接入规则：规则的第一条前提与第一个目标的一条已知合一，结论加入已知；其余前提各成一个目标，排在前面。接入多条时用第一条适用的。') },
  defer: { name: T('目标后移'), desc: T('把第一个目标移到最后，原来的第二个目标成为第一个。') },
  append: { name: T('依次尝试'), desc: T('每个框收到相同的状态；输出第一个没有失败的框的结果。在元件上选定框的数目。'), params: { ways: T('框') }, frames: { first: T('先试'), second: T('再试'), third: T('再试'), fourth: T('再试'), fifth: T('再试'), sixth: T('再试') } },
  search: { name: T('回溯搜索'), desc: T('深度优先搜索：框内的元件对收到的状态走一步，再从得到的每种结果继续；一条路走到底再回溯走下一条，直到没有目标。输出找到的每一个证完的状态。回到原状态的一步（目标没有减少，已知也没有增加）不再继续。可以在元件上设定最大深度。'), params: { depth: T('最多') }, frames: { body: T('每一步') } },
  each: { name: T('逐个目标', 'Every goal'), desc: T('框内的元件对每个目标各执行一次，每次只看到这一个目标；任一目标失败，整个元件失败。'), frames: { body: T('逐个目标', 'Each goal') } },
  introRules: { name: T('分解目标'), desc: T('把每条引入规则逆用于第一个目标：拼接、假设框、补充的左右两条、任取框、概括。每条相合的规则给出一种结果。') },
  elimRules: { name: T('分解假设'), desc: T('把每条消去规则用于已知：拆解、分类讨论、套用「若…则…」、爆炸、实例框，以及选定一例后再使用。每种相合的用法给出一种结果。') },
  rw: { name: T('改写'), desc: T('接入改写规则：在第一个目标中，由外向内、从左到右找到第一处与规则左边相合的位置，换成规则右边，只换这一处。规则带条件时，每个条件成为新目标，排在这个目标之后。接入多条时用第一条相合的；没有一处相合，元件失败。'), params: { at: T('改哪里') } },
  simp: { name: T('化简'), desc: T('接入改写规则列表：每一轮用第一条相合的规则改写一处，逐轮重复，直到没有规则相合。'), params: { at: T('改哪里') } },
  auto: { name: T('自建 auto'), desc: T('深度优先搜索，直到证完：每一步依次尝试由假设得证、分解目标、分解假设；回到原状态的路径不再继续。') },
  // Clauses (chapter 11).
  skolem: { name: T('Skolem 化'), desc: T('消去第一个目标的已知中所有的 ∃：外层没有 ∀ 的，像实例框一样取出那一样东西；在 ∀ 之内的，换成一个新函数，参数是外层所有 ∀ 的变量（sk1(x)……）。已知须先化为否定范式。') },
  toClauses: { name: T('析出子句'), desc: T('第一个目标须为 ⊥：把它的已知拆成子句。每条已知须为合取范式；拆开「并且」，每串「或者」成为一条子句，去掉 ∀，变量按「对所有」理解。') },
  resolve: { name: T('一轮归结'), desc: T('子句集中的每一对子句各试一次：一条中的某个文字与另一条中的相反文字能合一时，消去这一对，其余文字合成新子句加入子句集，并记下它的两条父子句。舍弃永真子句和重复子句。可以在元件上设定只与单文字子句归结。'), params: { unit: T('和谁消') } },
  saturate: { name: T('饱和器'), desc: T('逐轮归结，直到推出 ⊥，或不再产生新子句。') },
  oracle: { name: T('外部证明器'), desc: T('快速证明器：两条子句间的相反文字一次全部消去，逐轮进行，直到推出 ⊥ 或不再产生新子句。每条新子句也记下两条父子句。') },
  replay: { name: T('重放'), desc: T('子句集中有 ⊥ 时，把推出 ⊥ 的步骤交给核检查：用到的每条输入子句须由某条已知拆出；每一步须由它的两条父子句（变量按合一结果代入）经自建 auto 证出。全部通过，拆出这些子句的目标即证完；某一步不通过，指出是哪一步。') },
  clausify: { name: T('完整子句化'), desc: T('把待证句子的否定加入已知，把已知化为合取范式并消去 ∃，再拆成子句。') },
  metis: { name: T('证明重建器'), desc: T('把目标化为子句，找出推出 ⊥ 的证书，再由核重放检查：通过则目标证完；证书没有通过检查时，元件失败。') },
}
