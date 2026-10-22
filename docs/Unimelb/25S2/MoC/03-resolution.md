# COMP30026 Lectures 4–5 - Resolution: Mechanical Proof for Propositional Logic

来源：`lecture/04.pdf`、`lecture/05.pdf` 第 1–54 页（复习）；Apple Notes：CS/25S2/MoC — "★1 Resolution & Refutation"。

这篇讲的是：**真值表有 $2^n$ 行，变量一多就算不动；有没有一种只靠“机械改写”的方法，来判断公式是否可满足、某个结论是否成立？**

学习路线：[“二选一”推理与归结规则](#topic-1) → [反驳：用归结证明](#topic-2) → [合取范式与满足性算法](#topic-3) → [子句形式与两个“空”](#topic-4) → [复习课：编码与三道归结](#topic-5)。

重点：归结一步只消一对互补文字、用反驳证明 $F\models G$ 、化 CNF 的步骤。难点：分配律展开、空子句与空子句集的含义。易错：一次消去两个变量；把“推不出 $\bot$ ”误当成“推导出错”。

<a id="topic-1"></a>
## 1. “二选一”推理与归结规则

### 为什么要换方法

命题逻辑是可判定的：用真值表就能判断有效／偶然／不可满足。但表有 $2^n$ 行（ $n$ 是变量数），虽然有限，却可能大得不可行。

<!-- Sources: L04 p.3 -->

### 从日常推理到归结规则

![L04 slide 8 - Resolution rule](assets/03-resolution/slide-l04-08.png)

这一页之前，课件先讲了一个日常推理：“如果下雨，我带伞；如果不下雨，我吃冰淇淋。”无论下不下雨，结论都是“我要么带伞，要么吃冰淇淋”。写成符号就是由 $P\to F$ 和 $\lnot P\to G$ 推出 $F\lor G$ 。

这一页把 $\to$ 改写成 $\lnot,\lor$ （ $P\to F\equiv\lnot P\lor F$ ， $\lnot P\to G\equiv P\lor G$ ），左边那一列就是**归结规则（resolution）**：横线上方是两个前提，下方是结论。

$$
\frac{\lnot P\lor F \qquad P\lor G}{F\lor G}
$$

<!-- Sources: L04 p.4-8; Apple Notes ★1 -->

两个前提里一个含 $P$ 、一个含 $\lnot P$ （互补文字，complementary literals）。不管 $P$ 取真还是取假，总有一边的“剩余部分”必须为真，所以 $F\lor G$ 成立——这就是课件留的练习“check this is sound”的答案。右边那一列是特例： $F,G$ 都是 $\bot$ 时，由 $\lnot P$ 与 $P$ 推出 $\bot$ ，即矛盾。

<!-- Sources: L04 p.6-8 -->

<a id="topic-2"></a>
## 2. 反驳：用归结证明

### 归结图

![L04 slide 14 - Resolution graph](assets/03-resolution/slide-l04-14.png)

这张图反驳 $(B\lor\lnot A)\land(B\lor A)\land\lnot B$ 。最上面一行是三个原始子句，每对向下汇合的连线表示“这两个子句归结出下面这个”： $B\lor A$ 与 $\lnot B$ 消去 $B$ 得到 $A$ ； $A$ 与 $B\lor\lnot A$ 消去 $A$ 得到 $B$ ； $B$ 与 $\lnot B$ 得到 $\bot$ 。出现 $\bot$ 就说明原公式不可满足。

<!-- Sources: L04 p.9-14 -->

### 反驳的思路

![L04 slide 16 - How to use refutations](assets/03-resolution/slide-l04-16.png)

归结通过**反驳（refutation）**工作：要证明某事成立，就假设它不成立，推出 $\bot$ 。两个定理框分别对应两种用法：

$$
\models F \iff \lnot F\models\bot, \qquad F\models G \iff F\land\lnot G\models\bot .
$$

<!-- Sources: L04 p.16; Apple Notes ★1 -->

也就是说：要证 $F$ 有效，就反驳 $\lnot F$ ；要证 $F\models G$ ，就把 $F$ 与 $\lnot G$ 一起化成子句，反复归结直到得到空子句。

**理解用例（来自学生笔记）**：证明 $(P\to Q)\land P\models Q$ 。加入结论的否定 $\lnot Q$ ，化成子句 $\{\lnot P,Q\},\{P\},\{\lnot Q\}$ ； $\{P\}$ 与 $\{\lnot P,Q\}$ 归结得 $\{Q\}$ ，再与 $\{\lnot Q\}$ 得空子句，所以原推论成立——这就是用反驳证明 modus ponens。

<!-- Sources: Apple Notes ★1 -->

### 两道练习：反驳与直接推导

![L04 slide 20 - Resolution refutation exercise](assets/03-resolution/slide-l04-20.png)

子句是 $P\lor\lnot Q$ 、 $\lnot P$ 、 $Q\lor\lnot R$ 、 $Q\lor R\lor S$ 、 $\lnot S$ 。从左往右看两条支线：左边 $P\lor\lnot Q$ 与 $\lnot P$ 得 $\lnot Q$ ；右边 $Q\lor R\lor S$ 与 $\lnot S$ 得 $Q\lor R$ ，再与 $Q\lor\lnot R$ 得 $Q$ ；两条支线在底部汇合， $\lnot Q$ 与 $Q$ 得 $\bot$ 。

<!-- Sources: L04 p.17-20 -->

![L04 slide 22 - Deriving R by resolution](assets/03-resolution/slide-l04-22.png)

归结也能直接**推导**结论：由 $P\lor Q$ 、 $\lnot P\lor R$ 、 $\lnot Q\lor R$ 、 $S$ ，先由前两条得 $Q\lor R$ ，再与 $\lnot Q\lor R$ 得 $R\lor R$ ，即 $R$ 。注意前提 $S$ 没有连线：与结论无关的前提可以不用。

<!-- Sources: L04 p.21-22 -->

### 一次只能消一对

![L04 slide 25 - Do not cancel multiple variables](assets/03-resolution/slide-l04-25.png)

**易错**：不要一次消去多个变量！ $(P\lor Q)\land(\lnot P\lor\lnot Q)$ 是可满足的（取 $P=1,Q=0$ ）；如果同时消去 $P$ 和 $Q$ ，就会错误地得到 $\bot$ ，这不可靠。正确做法：每次只对**一对**互补文字归结。对这两个子句消去 $P$ 得到 $Q\lor\lnot Q$ ，消去 $Q$ 得到 $P\lor\lnot P$ ，都是重言子句，没有用处；再也推不出别的，正说明它们不矛盾。

<!-- Sources: L04 p.23-25; Apple Notes ★1 -->

### 形式定义与可靠性

![L04 slide 27 - Resolution proof formally](assets/03-resolution/slide-l04-27.png)

从合式公式 $P_1,\dots,P_n$ 出发得到 $C_m$ 的**归结证明**，是一串

$$
P_1,\dots,P_n\vdash C_1,\dots,C_m ,
$$

其中每个 $C_i$ 要么是某个 $P_j$ 的拷贝，要么由串中**更早**的两个公式归结而来。看页面下方三个例子：“ $P\vdash P$ ”只是拷贝；“ $P,\lnot P\vdash\bot$ ”一步归结得矛盾；“ $(P\lor Q),\lnot P\vdash Q$ ”一步归结得结论。

<!-- Sources: L04 p.26-27; Apple Notes ★1 -->

![L04 slide 30 - Soundness](assets/03-resolution/slide-l04-30.png)

记 $\Sigma\vdash_R F$ 表示“从前提集 $\Sigma$ 有 $F$ 的归结证明”。**可靠性（soundness）**：若 $\Sigma\vdash_R F$ ，则 $\Sigma\models F$ ，即归结不会推出假结论。证明框里的思路：取 $\Sigma$ 的任一模型 $v$ ，对证明串从左到右做归纳——拷贝来的 $C_i$ 本来就被 $v$ 满足；归结得到的 $C_i$ 由第 1 节的“二选一”论证保证也被满足。

<!-- Sources: L04 p.28-30; Apple Notes ★1 -->

<a id="topic-3"></a>
## 3. 合取范式与满足性算法

归结只作用于“析取式”，所以先要把任意公式整理成统一形状。

### 文字、子句与 CNF

![L04 slide 33 - Conjunctive normal form](assets/03-resolution/slide-l04-33.png)

- **文字（literal）**：一个原子或它的否定，如 $P$ 、 $\lnot Q$ ；
- **（析取）子句（clause）**：若干文字的析取，如 $B\lor C\lor D$ ；
- **合取范式（conjunctive normal form, CNF）**：若干子句的合取，如例子框中的 $(A\lor\lnot B)\land(B\lor C\lor D)\land A$ 。注意单独的 $A$ 也算一个子句（只有一个文字）。

定理框：每个命题公式都有一个与之**等价**的 CNF。

<!-- Sources: L04 p.31-33; Apple Notes ★1 -->

### 先化 NNF，再分配

![L04 slide 36 - NNF to CNF](assets/03-resolution/slide-l04-36.png)

先化成**否定范式（negation normal form, NNF）**——只用 $\lnot,\land,\lor$ ，且 $\lnot$ 只出现在变量前面。例子框里的公式已经是 NNF，但还不是 CNF（最外层是 $\lor$ ）。页面上的四步：

1. 消去 $\leftrightarrow$ （用 $\to$ 和 $\land$ 改写）；
2. 消去 $\to$ （用 $\lor$ 和 $\lnot$ 改写）；
3. 用德摩根律把 $\lnot$ 往里推；
4. 消去 $\lnot\lnot$ 。

最后一行：再把 $\lor$ 分配到 $\land$ 上，得到 CNF： $A\lor(B\land C)\equiv(A\lor B)\land(A\lor C)$ 。

<!-- Sources: L04 p.34-36; Apple Notes ★1 -->

### 完整例子

![L04 slide 45 - Example conversion to CNF](assets/03-resolution/slide-l04-45.png)

这是动画的最后一帧：灰色的是已经走过的步骤，黑色的是最终 CNF；每行右边括号里的数字对应上一页的步骤编号，(5) 表示分配律。逐步对照：

| 步骤 | 结果 |
| --- | --- |
| 消去 $\leftrightarrow$ | $((\lnot P\land(\lnot Q\to R))\to S)\land(S\to(\lnot P\land(\lnot Q\to R)))$ |
| 消去 $\to$ | $(\lnot(\lnot P\land(\lnot\lnot Q\lor R))\lor S)\land(\lnot S\lor(\lnot P\land(\lnot\lnot Q\lor R)))$ |
| 推入 $\lnot$ | $((\lnot\lnot P\lor(\lnot\lnot\lnot Q\land\lnot R))\lor S)\land(\lnot S\lor(\lnot P\land(\lnot\lnot Q\lor R)))$ |
| 消去 $\lnot\lnot$ | $((P\lor(\lnot Q\land\lnot R))\lor S)\land(\lnot S\lor(\lnot P\land(Q\lor R)))$ |
| 分配 | $(P\lor\lnot Q\lor S)\land(P\lor\lnot R\lor S)\land(\lnot S\lor\lnot P)\land(\lnot S\lor Q\lor R)$ |

<!-- Sources: L04 p.37-45; Apple Notes ★1 -->

**难点**：最后一步用了两次分配律：左半边 $(P\lor(\lnot Q\land\lnot R))\lor S$ 先展开成 $(P\lor\lnot Q)\land(P\lor\lnot R)$ 再并上 $S$ ；右半边 $\lnot S\lor(\lnot P\land(Q\lor R))$ 展开成两个子句。

### 反驳完备性与满足性算法

![L04 slide 46 - Refutation completeness](assets/03-resolution/slide-l04-46.png)

**反驳完备性（refutation completeness）**：每个不可满足的子句集都有归结反驳，即若子句集 $\Sigma\models\bot$ ，则 $\Sigma\vdash_R\bot$ 。把它和上一节的可靠性放在一起看：

| 定理 | 内容 | 直观意思 |
| --- | --- | --- |
| 可靠性（soundness） | 若 $\Sigma\vdash_R F$ ，则 $\Sigma\models F$ | 归结不会推出假结论 |
| 反驳完备性（refutation completeness） | 若子句集 $\Sigma\models\bot$ ，则 $\Sigma\vdash_R\bot$ | 每个不可满足的子句集都有归结反驳 |

<!-- Sources: L04 p.30, p.46; Apple Notes ★1 -->

**易错**：完备性只针对“推出 $\bot$ ”。归结不一定能直接推出每个推论（例如从 $P$ 推不出 $P\lor Q$ ，因为没有互补文字可消），但能反驳每个矛盾——所以要证 $F\models G$ 时总是走反驳 $F\land\lnot G$ 这条路。

<!-- Sources: L04 p.30, p.46 -->

![L04 slide 47 - Satisfiability algorithm](assets/03-resolution/slide-l04-47.png)

可靠性加完备性就给出一个算法：

1. 把公式化成合适的形式（子句形式）；
2. 反复做归结；
3. 推出 $\bot$ → 报告“不可满足”；再也推不出新子句 → 报告“可满足”。

<!-- Sources: L04 p.47; Apple Notes ★1 -->

命题逻辑里子句只可能有有限多种（每个变量要么出现为正、要么为负、要么不出现），所以这个过程一定会停。

### 化简 CNF

![L04 slide 50 - Simplifying CNF](assets/03-resolution/slide-l04-50.png)

页面列出三种常见冗余：

| 冗余 | 例子 | 处理 |
| --- | --- | --- |
| 重复文字 | $P\lor P$ | 合并成 $P$ |
| 重言子句 | $P\lor\lnot P\lor Q$ | 恒真，整条删去 |
| 包含（subsumption） | $(P\lor\lnot Q\lor R)\land(P\lor R)$ | 较短的 $P\lor R$ 成立时较长的必成立，删去较长的 |

<!-- Sources: L04 p.48-50; Apple Notes ★1 -->

页面上的练习：化简 $(P\lor\lnot P\lor Q)\land(P\lor\lnot Q\lor R)\land(P\lor R)\land(P\lor P)$ 。删去重言子句； $P\lor P$ 变成 $P$ ；单文字子句 $P$ 包含其余两条，最终只剩 $P$ 。页面最后一句提醒：CNF **不唯一**，化简前后都是合法的 CNF。

<!-- Sources: L04 p.50 -->

<a id="topic-4"></a>
## 4. 子句形式与两个“空”

### 子句形式

![L04 slide 51 - Clausal form](assets/03-resolution/slide-l04-51.png)

把 CNF 写成“集合的集合”，叫**子句形式（clausal form）**：外层集合的每个元素是一个子句，每个子句是文字的集合。例子框把上一节的 CNF 一一对应地写成四个集合：

$$
(P\lor\lnot Q\lor S)\land(P\lor\lnot R\lor S)\land(\lnot S\lor\lnot P)\land(\lnot S\lor Q\lor R)
\;\leadsto\;
\{\{P,S,\lnot Q\},\{P,S,\lnot R\},\{\lnot P,\lnot S\},\{Q,R,\lnot S\}\}
$$

<!-- Sources: L04 p.51; Apple Notes ★1 -->

页面问“为什么”，答案是“简化推理”：集合没有顺序、没有重复，正好自动处理交换律、结合律和重复文字。

### 空子句与空子句集

![L04 slide 55 - Empty disjunction](assets/03-resolution/slide-l04-55.png)

![L04 slide 58 - Empty conjunction](assets/03-resolution/slide-l04-58.png)

两页一起看，它们问的是同一件事：花括号里一个元素都没有时，代表什么？关键是分清**是哪一层**的空集合：

| 写法 | 代表 | 为什么 |
| --- | --- | --- |
| 空子句 $\{\}$ | $\bot$ | 析取为真要求至少一项为真，没有项就不可能真 |
| 空子句集 $\{\}$ | $\top$ | 合取为真要求每一项为真，没有项就自动满足 |

<!-- Sources: L04 p.52-60; Apple Notes ★1 -->

因此（课件下一页的总结）：空的子句集有效；**含有空子句的子句集不可满足**——这正是归结要追求的目标。 $\{\{\}\}$ （含一个空子句）与 $\{\}$ （空子句集）只差一层括号，意思却正好相反。

<!-- Sources: L04 p.60 -->

### 子句形式下的归结规则

![L04 slide 61 - Resolution for clausal form](assets/03-resolution/slide-l04-61.png)

在子句形式下，归结规则写作：若 $C_1,C_2$ 不含 $P$ 或 $\lnot P$ ，

$$
\frac{C_1\cup\{P\}\qquad C_2\cup\{\lnot P\}}{C_1\cup C_2}
$$

<!-- Sources: L04 p.61 -->

和第 1 节的规则是同一回事，只是用并集代替了 $\lor$ 。当 $C_1,C_2$ 都是空集时，就是 $\{P\}$ 与 $\{\lnot P\}$ 归结出空子句 $\{\}$ ，也就是 $\bot$ 。

<a id="topic-5"></a>
## 5. 复习课：编码与三道归结

第 5 讲前半是对前几讲的复习，用一个电路和三道归结题把整条流程串起来。

### 把电路编码成命题公式

![L05 slide 8 - Encoding a circuit](assets/03-resolution/slide-l05-08.png)

电路输入 $x,y,z$ ，经过非门 $n_i$ 、与门 $a_i$ 、或门 $o_i$ 得到输出 $o$ 。红色公式的编码方法是：为每个门引入一个新变量，并用 $\leftrightarrow$ 说明它等于什么（如 $n_1\leftrightarrow\lnot x$ 、 $a_1\leftrightarrow n_1\land y$ ），最前面单独的 $o$ 要求输出为 1。

$$
o\land(o\leftrightarrow o_1\lor o_2)\land(o_1\leftrightarrow a_1\lor a_2)\land(o_2\leftrightarrow a_3\lor a_4)\land(a_1\leftrightarrow n_1\land y)\land\dots\land(n_1\leftrightarrow\lnot x)\land\dots
$$

<!-- Sources: L05 p.2-8 -->

每个 $\leftrightarrow$ 都只涉及少数变量，所以化 CNF 时不会因分配律而爆炸。整个公式可满足，当且仅当存在使输出为 1 的输入。

### 复习一道 CNF 转换

![L05 slide 15 - CNF recap](assets/03-resolution/slide-l05-15.png)

从上往下每行是一步： $\leftrightarrow$ 先拆成两个 $\to$ ，再改写成 $\lor$ ，然后用德摩根律把最外面的 $\lnot$ 推进去，最后把 $(\lnot P\land\lnot Q)\lor(P\land\lnot R)$ 分配开。分配时左边 2 个合取项乘右边 2 个合取项，正好得到 4 个子句。

**补充**：最后一行的第一个子句 $\lnot P\lor P$ 是重言子句，按[化简规则](#topic-3)可以删去；保留它也不影响等价性。

<!-- Sources: L05 p.9-15 -->

### 不可满足的例子

![L05 slide 23 - Resolution recap 1](assets/03-resolution/slide-l05-23.png)

公式是 $(\lnot p\lor\lnot q\lor r)\land(p\lor r)\land(q\lor r)\land\lnot r$ 。先给四个子句编号 1–4，之后每行写“由哪两条、关于哪个变量归结”：1 与 2 关于 $p$ 归结得 5 $\{\lnot q,r\}$ ；3 与 5 关于 $q$ 得 6 $\{r\}$ ；4 与 6 关于 $r$ 得 $\bot$ 。这种“编号 + 来源”的写法比画图更适合长证明。

<!-- Sources: L05 p.16-23 -->

### 较长的不可满足例子

![L05 slide 43 - Resolution recap 2](assets/03-resolution/slide-l05-43.png)

绿色公式先化成 1–8 共 8 个子句：例如 $p\to((q\lor r)\land\lnot(q\land r))$ 给出 2 $\{\lnot p,q,r\}$ 和 3 $\{\lnot p,\lnot q,\lnot r\}$ （“ $q,r$ 恰好一个为真”）。之后的策略是先用单文字子句 1 $\{p\}$ 把 $\lnot p$ 消掉（9–11），再逐步得到单文字子句 13 $\{s\}$ 、14 $\{\lnot t\}$ 、15 $\{r\}$ 、16 $\{\lnot r\}$ ，最后 15 与 16 得 $\bot$ 。

**理解**：优先使用单文字子句（unit clause）归结，结果子句只会变短，最容易走向空子句。

<!-- Sources: L05 p.24-43 -->

### 可满足的例子

![L05 slide 54 - Resolution recap 3](assets/03-resolution/slide-l05-54.png)

公式 $(p\lor q)\land(\lnot p\lor\lnot r)\land(\lnot q\lor s)\land(p\lor\lnot r)\land(r\lor\lnot s)$ 。三列一共 26 条子句（含原始 5 条），红色标出得到的单文字子句 $\{\lnot r\}$ 、 $\{\lnot s\}$ 、 $\{p\}$ 、 $\{\lnot q\}$ 。把所有可能的归结都做完，没有出现空子句，也推不出新子句（“no further steps”），所以公式可满足。

从这些单文字子句还能读出一个模型： $p=1,q=0,r=0,s=0$ ，代回五个原子句都为真。注意 23 $\{q,\lnot q\}$ 、24 $\{p,\lnot p\}$ 是重言子句，实际做题时可以不写。

<!-- Sources: L05 p.44-54 -->

## 本讲自测

1. 把 $\lnot(P\to(Q\land R))$ 化成子句形式。
2. 用归结证明 $P\to Q,\ Q\to R\models P\to R$ ，写出需要反驳的子句集和每一步。
3. 为什么含空子句的子句集不可满足，而空子句集有效？
4. 子句 $\{P,Q\}$ 和 $\{\lnot P,\lnot Q\}$ 能归结出什么？能说明它们矛盾吗？
5. 对子句集 $\{P,Q\},\{\lnot P,R\},\{\lnot Q,R\},\{\lnot R\}$ 运行满足性算法，报告结果。
