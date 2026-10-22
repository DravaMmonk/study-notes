# COMP30026 Lectures 2–3 - Propositional Logic: Syntax, Semantics and Consequence

来源：`lecture/02.pdf`（L02）、`lecture/03.pdf`（L03）；Apple Notes：CS/25S2/MoC — "Lec01-02 Basic Concepts"、"Lec03 Formula"、"Equivalence Cheatsheet"。

这篇讲的是：**一个由“且、或、非、蕴含”拼成的式子，什么时候算写对了？什么时候为真？怎样判断一个式子能不能从另一个式子推出来？**

学习路线：[语法：公式怎样构成](#topic-1) → [语义：真值与赋值](#topic-2) → [等价与语义推论](#topic-3) → [有效、可满足与矛盾](#topic-4) → [代入与等价律](#topic-5)。

重点：真值表、 $\equiv$ 与 $\models$ 的含义、有效/可满足/不可满足的分类。难点：蕴含 $\to$ 的真值、代入保持哪些性质。易错：把公式里的 $\to$ 与“关于公式的断言” $\models$ 混为一谈。

截图编号是 PDF 页序：`L02 slide N` 指 `02.pdf` 第 N 页，`L03 slide N` 指 `03.pdf` 第 N 页；课件逐步展开，所以页序大于页脚编号。

<a id="topic-1"></a>
## 1. 语法：公式怎样构成

### 开场谜题

命题逻辑（propositional logic）也叫布尔逻辑（Boolean logic）：George Boole 用代数的眼光看逻辑，揭示了逻辑与算术之间的深层联系。

<!-- Sources: L02 p.3 -->

![L02 slide 4 - Intro puzzle](assets/02-propositional-logic/slide-l02-04.png)

Heidi、Dina、Louise 三个从不说谎的孩子各说了一句话：Heidi 说 Dina 和 Louise 同罪，一个有罪另一个也有罪；Dina 说如果 Heidi 有罪，那她也有罪；Louise 说她和 Dina 不都有罪。问题是：凭这三句话能否判断谁有罪？先记住这个问题，[第 2 节](#topic-2)学完真值和赋值后再解。

<!-- Sources: L02 p.4 -->

### 公式由哪些零件搭成

![L02 slide 12 - Definition of propositional formulas](assets/02-propositional-logic/slide-l02-12.png)

上半部分列出命题公式（propositional formula）的零件：原子（atom） $P,Q,R,P_1,\dots$ 是不可再分的命题；底（bottom） $\bot$ 表示恒假，顶（top） $\top$ 表示恒真；再加上否定（negation） $\lnot$ 、合取（conjunction） $\land$ 、析取（disjunction） $\lor$ 、蕴含（implication） $\to$ 四个联结词，右列是它们的读法。

<!-- Sources: L02 p.5-12 -->

底部红色的一行是文法（grammar）：

$$
\phi ::= P \mid \bot \mid \top \mid (\lnot\phi) \mid (\phi\land\phi) \mid (\phi\lor\phi) \mid (\phi\to\phi)
$$

<!-- Sources: L02 p.12 -->

读法：竖线 $\mid$ 分隔几种选择，右边的 $\phi$ 表示“任意一个更小的公式”。所以一个公式要么是原子、 $\bot$ 、 $\top$ ，要么由更小的公式加一个联结词组成，而且每次组合都带一对括号。

### 合式公式的例子

![L02 slide 14 - Some well-formed formulas](assets/02-propositional-logic/slide-l02-14.png)

六个式子都能由文法一步步搭出来，因此都是合式公式（well-formed formula）。注意第 (1) 个 $P$ 没有括号也合法，因为原子本身就是公式；第 (6) 个括号层层嵌套，正好对应三次 $\to$ 组合。

<!-- Sources: L02 p.14 -->

蓝框的小测问：文法里没有“当且仅当” $\leftrightarrow$ ，能不能用已有符号表达？可以： $P\leftrightarrow Q$ 就是 $(P\to Q)\land(Q\to P)$ 。同理，合取也能用别的联结词表示，例如 $X\land Y\equiv\lnot(\lnot X\lor\lnot Y)\equiv\lnot(X\to\lnot Y)$ 。

<!-- Sources: L02 p.14; Apple Notes Lec01-02 -->

### 省略括号的约定

![L02 slide 19 - Notational conventions](assets/02-propositional-logic/slide-l02-19.png)

严格按文法写，括号会很多，所以课程约定四条省略规则：

- 最外层括号可以省略；
- $\lnot$ 比 $\land,\lor$ 结合得更紧；
- $\land,\lor$ 比 $\to$ 结合得更紧；
- $\to$ 右结合： $P\to Q\to R$ 表示 $P\to(Q\to R)$ 。

**易错**：红色警告—— $P\land Q\lor R$ 有歧义。课程没有规定 $\land$ 与 $\lor$ 谁优先，必须加括号。

<!-- Sources: L02 p.19 -->

### 语法树

![L02 slide 26 - Parse trees](assets/02-propositional-logic/slide-l02-26.png)

左边是 $\lnot(\lnot(P\lor(Q\land\lnot P))\to R)$ 的语法树（parse tree），右边绿色的是 $\lnot\lnot(P\lor Q)\land(\lnot P\to R)$ 。树根是**最后**施加的联结词，叶子是原子；每个 $\lnot$ 只有一个孩子，二元联结词有两个孩子。底部两行是另外两个省略了括号的式子，可以拿来练习：先按上面的约定补全括号再画树。注意 $\lnot\lnot P\lor Q\land\lnot P\to R$ 里 $\lor$ 与 $\land$ 并列，按约定是有歧义的；把 $\lnot$ 的作用范围看错，整棵树也会变。

<!-- Sources: L02 p.20-26 -->

<a id="topic-2"></a>
## 2. 语义：真值与赋值

### 联结词的真值表

![L02 slide 29 - Truth table of the connectives](assets/02-propositional-logic/slide-l02-29.png)

真值函数（truth function）把真值映射到真值。真值记作 1/0（也写 t/f 或 $\top/\bot$ ）。读表时每一行是 $A,B$ 的一种取值组合，右边五列给出各联结词在这一行的结果：

- $\lnot A$ 把 $A$ 反过来；
- $A\land B$ 只有两边都是 1 时才是 1；
- $A\lor B$ 只有两边都是 0 时才是 0；
- $A\to B$ 只有第三行（ $A=1,B=0$ ）是 0；
- $A\leftrightarrow B$ 在两边相同时是 1。

<!-- Sources: L02 p.29 -->

### 蕴含为什么“怪”

![L02 slide 40 - Implication is weird](assets/02-propositional-logic/slide-l02-40.png)

**难点**：左边的小表再次强调， $A\to B$ 只在“前件真、后件假”时为假。右边两个句子说明它不要求因果关系：第 2 句“如果墨尔本在昆士兰，那么布里斯班在维多利亚”前件为假，所以整句为真，尽管两件事毫无关联。一个好用的记法是 $P\to Q$ 与 $\lnot P\lor Q$ 真值表相同。

<!-- Sources: L02 p.39-40; Apple Notes Lec01-02 -->

### 真值赋值

![L02 slide 33 - Truth assignment](assets/02-propositional-logic/slide-l02-33.png)

命题字母就是布尔变量（Boolean variable）。真值赋值（truth assignment）是从命题字母到真值的函数，通常写成 $v=\{P\mapsto 1, Q\mapsto 0\}$ 。底部两行说明一个约定：没写出的字母默认取 0，所以这里 $v(Q)=v(R)=\dots=v(Z)=0$ 。

<!-- Sources: L02 p.30-33 -->

### 公式在赋值下的真假

![L02 slide 35 - Truth of a formula](assets/02-propositional-logic/slide-l02-35.png)

底部红字给出记号： $v\models\phi$ 读作“ $\phi$ 在 $v$ 下为真”，也说 $v$ 是 $\phi$ 的一个模型（model）、 $v$ 满足（satisfies） $\phi$ 。不满足时写 $v\not\models\phi$ 。

<!-- Sources: L02 p.33-35; L03 p.4 -->

投票题在 $v=\{P\mapsto 1,Q\mapsto 0\}$ 下逐个计算：1. $P\land Q$ 假；2. $(P\lor Q)\land(P\lor R)$ 真（两个括号都因 $P=1$ 为真， $R$ 默认 0 不影响）；3. $P\to Q$ 假（前件真、后件假）；4. $\lnot P\to\lnot Q$ 真（前件 $\lnot P$ 为假）。

<!-- Sources: L02 p.35 -->

### 公式的真值表

![L02 slide 36 - Truth table for a formula](assets/02-propositional-logic/slide-l02-36.png)

一个公式的真值表就是对所有赋值逐行计算。左边三列列出 $P,Q,R$ 的全部 $2^3=8$ 种取值；右边在每个符号下面写出该处子公式的值，先算内层的 $\land$ ，再算外层的 $\lor$ 。加粗的一列在**最后**施加的联结词（语法树的根）下面，它才是整个公式 $(P\land Q)\lor R$ 的真值。 $n$ 个变量有 $2^n$ 行。

<!-- Sources: L02 p.36 -->

### 解开场谜题

**理解用例（自拟）**：用 $H,D,L$ 表示三人有罪，三句话分别是 $D\leftrightarrow L$ 、 $H\to D$ 、 $\lnot(D\land L)$ 。由第一句， $D$ 与 $L$ 同真同假；由第三句它们不能同真，所以 $D=L=0$ 。再由第二句， $H\to 0$ 为真要求 $H=0$ 。唯一满足三句话的赋值是三人都无罪，所以姑姑的信息足够下结论。

<a id="topic-3"></a>
## 3. 等价与语义推论

### 逻辑等价

![L03 slide 7 - Logical equivalence](assets/02-propositional-logic/slide-l03-07.png)

两个公式在**每一个**真值赋值下真值都相同，就称它们逻辑等价（logically equivalent），记作 $F\equiv G$ 。等价意味着真值表的最后一列完全一样。L02 第 37 页的投票题正是让大家比较三对公式的真值表，它的第 2、3 对在 L03 最后一页揭晓答案（见[第 5 节末](#topic-5)）。

<!-- Sources: L02 p.38; L03 p.7 -->

看幻灯片下半部分：例子 $P\to Q\equiv\lnot P\lor Q$ 、 $\lnot(P\land Q)\equiv\lnot P\lor\lnot Q$ ；反例 $P\land Q\not\equiv P\lor Q$ （取 $P=1,Q=0$ 即可区分），以及 $P\to Q\not\equiv R\to S$ ——用到的字母不同，取 $P=1,Q=0$ 、 $R=S=0$ 时左假右真。

<!-- Sources: L03 p.7 -->

### 语义推论

![L03 slide 9 - Semantic consequence](assets/02-propositional-logic/slide-l03-09.png)

如果 $F$ 的每个模型也都是 $G$ 的模型，就说 $G$ 是 $F$ 的语义推论（semantic consequence），记作 $F\models G$ ，读作“ $F$ （语义上）蕴涵 $G$ ”（entails）。底部红色 Note 说明等价就是双向推论：

$$
F\equiv G \iff (F\models G \text{ 且 } G\models F).
$$

<!-- Sources: L03 p.9 -->

### 推论与蕴含

![L03 slide 11 - Consequence and implication](assets/02-propositional-logic/slide-l03-11.png)

两个蓝框把“推论”和“蕴含联结词”联系起来：

$$
F\models G \iff \models F\to G, \qquad F\equiv G \iff \models F\leftrightarrow G .
$$

这里 $\models H$ （左边为空）表示 $H$ 在所有赋值下都为真，也就是“有效”（[第 4 节](#topic-4)）。幻灯片顶端的 “models used before defined later?” 是讲者留在课件上的备注，不是内容。

<!-- Sources: L03 p.11; Apple Notes Lec03 -->

**易错：** $P\to Q$ 是**一个公式**，它本身有真有假； $P\models Q$ 与 $P\equiv Q$ 是**关于两个公式的断言**，说的是“所有赋值下”的关系。上面的定理正好把二者连起来：“从 $F$ 能推出 $G$ ”与“不需要任何前提， $F\to G$ 恒真”是同一件事。

<!-- Sources: L03 p.11; Apple Notes Lec03 -->

### 投票：哪些公式能推出蕴含

![L03 slide 13 - Which formulas entail P implies Q](assets/02-propositional-logic/slide-l03-13.png)

课上投票题分两问，下面的推导是本笔记补上的。第一问，哪些公式能推出 $P\to Q$ ：要检查的是“公式为真的每一行， $P\to Q$ 是否也为真”。

- 能推出：2. $\lnot P$ 、3. $Q$ 、4. $P\to(Q\land R)$ 、5. $(P\lor R)\to Q$ 、6. $\lnot P\lor Q$ 、7. $\lnot Q\to\lnot P$ （6、7 与 $P\to Q$ 等价）。
- 不能推出：1. $P$ （取 $Q=0$ ）；8. $P\to(Q\lor R)$ （取 $P=1,Q=0,R=1$ ）；9. $(P\to Q)\lor R$ （取 $P=1,Q=0,R=1$ ）。

第二问反过来，哪些是 $P\to Q$ 的推论：6、7 （等价式双向成立），以及 8、9 （它们比 $P\to Q$ 更弱）。其余的都比 $P\to Q$ 更强或无关，例如 $P\to Q$ 推不出 $P\to(Q\land R)$ （取 $P=Q=1,R=0$ ）。

<!-- Sources: L03 p.13 -->

### 可靠的推理规则

![L02 slide 41 - Modus ponens](assets/02-propositional-logic/slide-l02-41.png)

横线上方是前提，下方是结论。一条规则是**可靠的**（sound），指前提的每个模型也是结论的模型。最基本的是肯定前件（modus ponens）：由 $P\to Q$ 和 $P$ 推出 $Q$ 。幻灯片留了一个挑战：证明它可靠。用真值表只需一行——两个前提同时为真，要求 $P=1$ ，而 $P=1$ 时 $P\to Q$ 为真又要求 $Q=1$ ，所以结论 $Q$ 也为真。

<!-- Sources: L02 p.41 -->

学生笔记里整理了一组常用规则，都可以用同样的方法检验其可靠性：

| 名称 | 形式 | 直观含义 |
| --- | --- | --- |
| 肯定前件（modus ponens） | $P\to Q,\ P\models Q$ | 条件成立且前件成立，推出后件 |
| 否定后件（modus tollens） | $P\to Q,\ \lnot Q\models\lnot P$ | 后件为假，推出前件为假 |
| 假言三段论（hypothetical syllogism） | $P\to Q,\ Q\to R\models P\to R$ | 条件可以传递 |
| 选言三段论（disjunctive syllogism） | $P\lor Q,\ \lnot P\models Q$ | 二选一，否定其一 |
| 建构性两难（constructive dilemma） | $(P\to Q)\land(R\to S),\ P\lor R\models Q\lor S$ | 两条路各导出一个结果 |
| 破坏性两难（destructive dilemma） | $(P\to Q)\land(R\to S),\ \lnot Q\lor\lnot S\models\lnot P\lor\lnot R$ | 上一条的逆用 |
| 化简（simplification） | $P\land Q\models P$ | 从合取取出一项 |
| 合取（conjunction） | $P,\ Q\models P\land Q$ | 两个事实合并 |
| 附加（addition） | $P\models P\lor Q$ | 真命题可以随意加析取项 |

<!-- Sources: Apple Notes Lec01-02 -->

<a id="topic-4"></a>
## 4. 有效、可满足与矛盾

### 重言式

![L03 slide 15 - Tautology](assets/02-propositional-logic/slide-l03-15.png)

重言式（tautology）是在所有赋值下都为真的公式。看表中加粗的一列：它在主联结词（中间的 $\to$ ）下面，8 行全是 1，所以 $(\lnot P\land Q)\to(P\to R)$ 是重言式。直观原因：前件要求 $P=0$ ，而 $P=0$ 时后件 $P\to R$ 一定为真。

<!-- Sources: L03 p.14-15; Apple Notes Lec03 -->

### 矛盾式与快速判断

![L03 slide 20 - Contradiction](assets/02-propositional-logic/slide-l03-20.png)

矛盾式（contradiction）是在所有赋值下都为假的公式，例如 $Q\land\lnot Q$ 。判断矛盾式时不必画完整真值表。比如 $P\land Q\land(\lnot Q\leftrightarrow(\lnot P\lor Q))$ ：只要 $P$ 或 $Q$ 为假，外层 $\land$ 就让整体为假；只剩 $P=Q=1$ 一行要算。表中红色的 0 就是这一行的结果：此时 $\lnot Q=0$ 而 $\lnot P\lor Q=1$ ，双蕴含为假。

<!-- Sources: L03 p.20 -->

### 有效、可满足与偶然

![L03 slide 24 - Contradictions are unsatisfiable](assets/02-propositional-logic/slide-l03-24.png)

L03 第 21–26 页用三句日常话引出新名字：“如果程序能运行，那么程序能运行”无论词义如何都真，叫**有效**（valid），记作 $\models F$ ，即重言式；上图“应用好且应用不好”无论词义如何都假，叫**不可满足**（unsatisfiable），即矛盾式；“现在正在下雨”有时真有时假，叫**偶然**（contingent）。至少有一个赋值使其为真，就叫**可满足**（satisfiable）。

| 术语 | 含义 | 例子 |
| --- | --- | --- |
| 有效（valid）/ 重言式（tautology） | 所有赋值下都真，记作 $\models F$ | $(\lnot P\land Q)\to(P\to R)$ |
| 不可满足（unsatisfiable）/ 矛盾式（contradiction） | 所有赋值下都假 | $Q\land\lnot Q$ |
| 可满足（satisfiable） | 至少一个赋值下为真 | $P$ |
| 偶然（contingent） | 有时真、有时假 | “现在正在下雨” |

<!-- Sources: L03 p.22-26; Apple Notes Lec03 -->

关系：可满足 = 有效 + 偶然；非有效（non-valid，有时为假）= 偶然 + 不可满足。多数日常陈述都是偶然的。

### 分类练习

![L03 slide 28 - Classification poll with answers](assets/02-propositional-logic/slide-l03-28.png)

右列是课上公布的答案。后两个“有效”可以这样看出：3. $P\to(\lnot Q\lor P)$ 中，前件 $P$ 为真时后件里的 $P$ 也为真，所以不可能“前真后假”；4. 用德摩根律， $\lnot(P\land\lnot Q)\equiv\lnot P\lor Q$ ，于是整式是 $\lnot Q\lor\lnot P\lor Q$ ，含有 $Q\lor\lnot Q$ ，恒真。2. $P\leftrightarrow\lnot P$ 要求一个值等于自己的否定，所以永远为假。

<!-- Sources: L03 p.27-28 -->

**易错**：否定一个矛盾式得到重言式，反之亦然（L03 slide 20 底部）；所有重言式彼此等价（都等价于 $\top$ ，例如 $A\lor\lnot A$ ），所有矛盾式彼此等价（都等价于 $\bot$ ）。但“不是矛盾式”只说明可满足，**不能**推出“等价于重言式”——偶然式就是反例。

<!-- Sources: L03 p.20, p.48; Apple Notes Lec03 -->

<a id="topic-5"></a>
## 5. 代入与等价律

### 代入

![L03 slide 33 - Substitution](assets/02-propositional-logic/slide-l03-33.png)

代入（substitution）把一个命题变量的**所有**出现都换成同一个公式。绿色例子：在 $P\to P$ 里把 $P$ 换成 $Q\land R$ ，得到 $(Q\land R)\to(Q\land R)$ 。底部红字说代入**保持**（preserve）有效性；它旁边的黑字是讲者留在课件上的备注。“保持”的意思是：原式有这个性质，代入后的式子也一定有。

<!-- Sources: L03 p.33 -->

L03 第 34–39 页用两道投票题逐个检查其他性质，汇总如下：

| 性质 | 代入后是否保持 | 理由 |
| --- | --- | --- |
| 有效 | 保持 | 原式对所有取值都真，换成任何公式的取值仍真 |
| 不可满足 | 保持 | 矛盾式的否定是重言式，转化为上一行 |
| 可满足 | **不保持** | $P$ 可满足，代入 $P:=Q\land\lnot Q$ 后不可满足 |
| 偶然 | **不保持** | 同一个反例 |
| 逻辑等价 | 保持 | 若 $F\equiv G$ ，则 $F[P:=H]\equiv G[P:=H]$ |

<!-- Sources: L03 p.33-41; Apple Notes Lec03 -->

**补充**：可满足和偶然的公式代入后，可能往两个方向变：代入一个矛盾式可能变成不可满足（上表的反例），代入一个重言式也可能变成有效。所以代入只能“搬运”有效与不可满足这两个“所有赋值”性质。

### 代入保持等价

![L03 slide 41 - Substitution preserves equivalence](assets/02-propositional-logic/slide-l03-41.png)

记号 $F[A:=B]$ 表示把 $F$ 中的 $A$ 全部换成 $B$ ，例如 $(P\to P)[P:=Q]$ 是 $Q\to Q$ 。定理说：若 $F\equiv G$ ，则 $F[P:=H]\equiv G[P:=H]$ 。所以等价律里的字母可以换成任意公式，例如由 $P\to Q\equiv\lnot P\lor Q$ 立刻得到 $(R\land S)\to Q\equiv\lnot(R\land S)\lor Q$ 。

### 等价替换

![L03 slide 45 - Interchange of equivalents](assets/02-propositional-logic/slide-l03-45.png)

**等价替换（interchange of equivalents）**：若 $F\equiv G$ ，把 $H$ 中某一处 $F$ 换成 $G$ 得到 $H'$ ，则 $H\equiv H'$ 。结果与原式等价，所有语义性质都保持，因此可以像做代数一样改写公式（红字 “Rewrite formulas algebraically!”）。

<!-- Sources: L03 p.42-45 -->

**易错**：代入与等价替换是两种不同操作。代入换的是**一个变量的全部出现**，换成的公式可以任意；等价替换换的是**某一处子公式**，只能换成与它等价的公式。

### 等价律

![L03 slide 46 - Some equivalences](assets/02-propositional-logic/slide-l03-46.png)

第一页是熟悉的代数规律：交换律、结合律、分配律。注意 $\lor$ 对 $\land$ 也能分配（第二条分配律），这和算术里加法不能对乘法分配不同。**易错**：幻灯片把 $P\land P\equiv P$ 叫 absorption，这类规律通常叫幂等律（idempotence）；吸收律（absorption）在多数教材里指 $P\land(P\lor Q)\equiv P$ 。

![L03 slide 47 - More equivalences](assets/02-propositional-logic/slide-l03-47.png)

第二页是改写时最常用的几条：双重否定、德摩根律、蕴含消去、逆否、双蕴含。逆否的三种形式都可以由“蕴含消去 + 交换律 + 双重否定”推出来，例如 $\lnot P\to\lnot Q\equiv\lnot\lnot P\lor\lnot Q\equiv\lnot Q\lor P\equiv Q\to P$ 。

![L03 slide 48 - Last equivalences](assets/02-propositional-logic/slide-l03-48.png)

第三页处理常量 $\top$ 、 $\bot$ 。顶部两行要记住： $\bot$ 等价于任何不可满足公式， $\top$ 等价于任何有效公式。

<!-- Sources: L03 p.48 -->

下表把三页的名称与学生的 Equivalence Cheatsheet 对齐，方便查中文名（量词相关的规则放在[谓词逻辑篇](04-predicate-logic.md#topic-4)）：

| 幻灯片名称 | 中文 | 记忆要点 |
| --- | --- | --- |
| Absorption | 幂等律 | 同一项重复等于一项 |
| Commutativity / Associativity | 交换律 / 结合律 | $\land$ 、 $\lor$ 的顺序和分组随意 |
| Distributivity | 分配律 | $\land$ 、 $\lor$ 可以互相分配 |
| Double negation | 双重否定 | 两个 $\lnot$ 抵消 |
| De Morgan | 德摩根律 | 否定进括号， $\land$ 与 $\lor$ 互换 |
| Implication | 蕴含消去 | $\to$ 改写成 $\lnot\cdot\lor\cdot$ |
| Contraposition | 逆否 | 前后件交换并都取否定 |
| Biimplication | 双蕴含 | 两边同真或同假 |
| Duality | 对偶 | $\lnot\top$ 与 $\bot$ 互换 |
| Negation from absurdity | 归谬式否定 | 推出矛盾就是否定 |
| Identity / Dominance | 同一律 / 支配律 | 中性元素不改变结果，吸收元素决定结果 |
| Contradiction / Excluded middle | 矛盾律 / 排中律 | $P$ 与 $\lnot P$ 不同真、必有一真 |

<!-- Sources: L03 p.46-48; Apple Notes Equivalence Cheatsheet -->

### 课上判断题

![L03 slide 50 - Which claims hold](assets/02-propositional-logic/slide-l03-50.png)

三个判断的答案都在右边。第 3 条“成立，但不等价”值得细看：左边推得出右边，反过来却不行。取 $P=1,Q=0,R=0$ ：左边 $(P\to R)\land(Q\to R)$ 因 $P\to R$ 为假而为假，右边 $(P\land Q)\to R$ 因前件为假而为真。这一对也是 L02 第 37 页投票题的第 3 对，所以它们的真值表不同。

<!-- Sources: L03 p.49-50 -->

**补充**：左边真正等价的是 $(P\lor Q)\to R$ ——“ $P$ 能推出 $R$ ， $Q$ 也能推出 $R$ ”等于“只要 $P$ 或 $Q$ 成立就有 $R$ ”。可以用蕴含消去和分配律验证： $(\lnot P\lor R)\land(\lnot Q\lor R)\equiv(\lnot P\land\lnot Q)\lor R\equiv\lnot(P\lor Q)\lor R$ 。

## 本讲自测

1. 画出 $P\to Q\to R\lor S$ 按约定加全括号后的语法树。
2. 不画完整真值表，判断 $(P\to Q)\lor(Q\to P)$ 属于哪一类。
3. 举一个可满足公式 $F$ 和一次代入，使代入后变成有效公式。
4. 用等价律把 $\lnot(P\to\lnot Q)$ 化成只含 $\land$ 的形式。
5. 判断 $P\to(Q\to R)$ 与 $(P\land Q)\to R$ 是否等价，并说明用哪些等价律可以互相改写。
