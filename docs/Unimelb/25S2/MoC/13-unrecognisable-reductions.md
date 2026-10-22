# COMP30026 Lectures 23–24 - Reductions, Closure and Unrecognisable Problems

来源：`lecture/w12l1.pdf`（第 23 讲，手写板书）、`lecture/Lecture 24.pdf`（第 24 讲：收尾图灵机与全课复习）；Apple Notes：CS/25S2/MoC — "LEC23-24 Identify Unrecognisable Problems"、"★3 Languages"、"★ Review"。

这篇讲的是：**已经知道 $A_{TM}$ 不可判定后，怎样不用每次重新做对角线，就能证明停机、空性、等价这些“程序分析”问题也不可判定？哪些语言连识别都做不到？**

学习路线：[归约](#topic-1) → [停机、空性与等价](#topic-2) → [可判定与可识别语言的封闭性](#topic-3) → [Rice 定理与难解性](#topic-4) → [全课总表](#topic-5)。

重点：归约的方向；三个经典归约。难点：构造辅助机器 $M_w$ 。易错：把归约方向写反；以为可识别语言对补封闭。

`w12l1.pdf` 与 `Lecture 24.pdf` 第 2–11 页是手写板书，截图选写完整的那一页；`Lecture 24.pdf` 第 16–17 页是 2023 年复习课的两张总表。

<a id="topic-1"></a>
## 1. 归约

### 定义

识别“不可能问题”的工具有：对角线法（自指）、**归约（reduction）**、**封闭性**。前一种见[第 12 篇](12-decidability-universality.md#topic-5)，本篇讲后两种。

<!-- Sources: W12L1 p.1; Apple Notes LEC23-24 -->

**定义**：问题 $A$ **归约到**问题 $B$ ，记作 $A\le B$ ，当且仅当给定 $B$ 的判定器，就能构造出 $A$ 的判定器。

![W12L1 slide 3 - A reduction as nested programs](assets/13-unrecognisable-reductions/slide-w12l1-03.png)

图左：$A$ 的判定器里面装着一个 $B$ 的判定器；图右用程序表达同一件事——函数 `A()` 内部调用函数 `B()`，下面的省略号表示 `A()` 还可以在调用前后做别的计算。 $A\le B$ 直观上读作“ $A$ 不比 $B$ 难”。

<!-- Sources: W12L1 p.2-3 -->

### 两个方向的用法

![W12L1 slide 4 - Algorithms vs hardness](assets/13-unrecognisable-reductions/slide-w12l1-04.png)

蓝字是“算法”方向，红字是“难度”方向，由定义立刻得到：

| 用途 | 结论 |
| --- | --- |
| 算法（algorithms） | $B$ 可判定 ⇒ $A$ 可判定 |
| 难度（hardness） | $A$ 不可判定 ⇒ $B$ 不可判定 |

<!-- Sources: W12L1 p.4; W11L2 p.11; Apple Notes LEC23-24 -->

**易错**：要证明新问题 $B$ 不可判定，必须把一个**已知**不可判定的问题 $A$ 归约**到** $B$ （ $A\le B$ ），也就是“假设有 $B$ 的判定器，造出 $A$ 的判定器”。反过来把 $B$ 归约到 $A$ 只说明 $B$ 不比 $A$ 难，什么也证明不了。

### 例子

页面下方的三个例子，前两个蓝色（算法用法），最后一个红色（难度用法）：

| 归约 | 用法 | 思路 |
| --- | --- | --- |
| NFA 接受 ≤ DFA 接受 | 算法 | 先用子集构造把 NFA 变成 DFA，再调用 DFA 接受问题的判定器 |
| DFA 等价 ≤ DFA 空性 | 算法 | 见下 |
| $L_D$ ≤ TM 接受 | 难度 | 见[第 12 篇](12-decidability-universality.md#topic-4) |

<!-- Sources: W12L1 p.4; W11L2 p.11; Apple Notes LEC23-24 -->

**DFA 等价 ≤ DFA 空性**（据学生笔记）。设

$$
EQ_{DFA}=\{\langle A,B\rangle\mid L(A)=L(B)\},\qquad EMPTY_{DFA}=\{\langle A\rangle\mid L(A)=\emptyset\}.
$$

设 $H$ 判定 $EMPTY_{DFA}$ 。在输入 $\langle A,B\rangle$ 上：构造 DFA $C$ 识别对称差 $L(A)\,\triangle\,L(B)=(L(A)\setminus L(B))\cup(L(B)\setminus L(A))$ （正则语言对布尔组合封闭，所以能构造）；因为 $L(A)=L(B)\iff L(C)=\emptyset$ ，所以运行 $H$ 于 $\langle C\rangle$ ，接受就接受，否则拒绝。

<!-- Sources: Apple Notes LEC23-24; L13 p.16 -->

<a id="topic-2"></a>
## 2. 停机、空性与等价

### 本讲的三个归约

![W12L1 slide 5 - Today's reductions](assets/13-unrecognisable-reductions/slide-w12l1-05.png)

板书把本节的路线写成一个分叉：从 TM 接受出发，一支归约到停机问题，另一支先到空性、再到等价：

$$
A_{TM}\le HALT_{TM},\qquad A_{TM}\le EMPTY_{TM}\le EQ_{TM}.
$$

<!-- Sources: W12L1 p.5 -->

### 动机：静态代码分析

![W12L1 slide 9 - Static code analysis](assets/13-unrecognisable-reductions/slide-w12l1-09.png)

静态代码分析（static code analysis）= 不执行程序就分析它。我们想知道程序有没有：运行时错误、安全漏洞、违反规约。这些在国防、医疗等关键应用里非常重要；红框里的问题是：随着 LLM 生成的代码越来越多，我们能相信 LLM 不会植入后门吗？

<!-- Sources: W12L1 p.6-9; L24 p.4 -->

“运行时错误”对应停机问题，“违反规约”对应 TM 等价——下面证明它们都不可判定（第 24 讲把这一对应画在[第 4 节](#topic-4)的板书上）。

<!-- Sources: L24 p.5 -->

### 停机问题

![W12L1 slide 10 - A_TM reduces to HALT](assets/13-unrecognisable-reductions/slide-w12l1-10.png)

$$
HALT_{TM}=\{\langle M,w\rangle\mid M\text{ 在输入 }w\text{ 上停机}\}.
$$

**定理**：若 $HALT_{TM}$ 可判定，则“ $L$ 可识别 ⇒ $L$ 可判定”——也就是能把识别器变成判定器。

**证明**（ $A_{TM}\le HALT_{TM}$ ）：设 $H$ 判定 $HALT_{TM}$ ，构造 $A_{TM}$ 的判定器 $S$ ：在输入 $\langle M,w\rangle$ 上，①运行 $H$ 于 $\langle M,w\rangle$ ；②若 $H$ 拒绝（ $M$ 在 $w$ 上不停机），拒绝；③否则在 $w$ 上模拟 $M$ ——此时模拟一定会停，照抄结果。由于 $A_{TM}$ 不可判定， $HALT_{TM}$ 也不可判定。

<!-- Sources: W12L1 p.10; Apple Notes LEC23-24 -->

左边的大括号把“定理”和“证明”连起来：先问 $H$ 一句“会不会停”，就避开了通用机 $U$ 唯一的缺点（可能不停）。

### 空性问题

![W12L1 slide 11 - A_TM reduces to EMPTY](assets/13-unrecognisable-reductions/slide-w12l1-11.png)

$$
EMPTY_{TM}=\{\langle M\rangle\mid L(M)=\emptyset\}.
$$

**证明**（ $A_{TM}\le EMPTY_{TM}$ ）：设 $H$ 判定 $EMPTY_{TM}$ ，构造 $S$ ：在输入 $\langle M,w\rangle$ 上，

1. 构造 TM $M_w$ =“在输入 $x$ 上：忽略 $x$ ，在 $w$ 上运行 $M$ ； $M$ 接受则接受， $M$ 拒绝则拒绝， $M$ 永远运行则跟着永远运行”（图中蓝字）。于是（图中红框）

    $$
    L(M_w)=\begin{cases}\Sigma^* & M\text{ 接受 }w\\ \emptyset & \text{否则}\end{cases}
    $$

2. 运行 $H$ 于 $\langle M_w\rangle$ ：若 $H$ 接受（ $L(M_w)=\emptyset$ ，即 $M$ 不接受 $w$ ），拒绝；若 $H$ 拒绝，接受。

<!-- Sources: W12L1 p.11; Apple Notes LEC23-24 -->

**难点**： $S$ 只是**构造** $M_w$ 的代码并交给 $H$ ，自己**从不运行** $M_w$ ，所以 $S$ 不会被卡住。 $M_w$ 的作用是把“ $M$ 是否接受 $w$ ”这个问题，翻译成“某台机器的语言是否为空”。例如 $M$ 在 $w$ 上永远运行时， $M_w$ 对任何 $x$ 都不接受， $L(M_w)=\emptyset$ ， $H$ 接受，于是 $S$ 拒绝——正好是正确答案，因为 $M$ 不接受 $w$ 。

### 等价问题

![W12L1 slide 12 - EMPTY reduces to EQ](assets/13-unrecognisable-reductions/slide-w12l1-12.png)

$$
EQ_{TM}=\{\langle M_1,M_2\rangle\mid L(M_1)=L(M_2)\}.
$$

**证明**（ $EMPTY_{TM}\le EQ_{TM}$ ）：设 $H$ 判定 $EQ_{TM}$ 。在输入 $\langle M\rangle$ 上：构造 TM $E$ =“在输入 $x$ 上直接拒绝”，则 $L(E)=\emptyset$ ；运行 $H$ 于 $\langle M,E\rangle$ ， $H$ 接受就接受（ $L(M)=\emptyset$ ）， $H$ 拒绝就拒绝。

<!-- Sources: W12L1 p.12; Apple Notes LEC23-24 -->

这次辅助机器 $E$ 是一个固定的“标准答案”：问“ $M$ 是否为空”等于问“ $M$ 是否与一台空机器等价”。

<a id="topic-3"></a>
## 3. 可判定与可识别语言的封闭性

### 可判定语言

![W12L1 slide 13 - Closure of decidable languages](assets/13-unrecognisable-reductions/slide-w12l1-13.png)

| 运算 | 构造 |
| --- | --- |
| 补 | 判定器的接受与拒绝状态互换 |
| 并 | 依次运行 $L_1$ 、 $L_2$ 的判定器（都会停），有一个接受就接受 |
| 交 | 依次运行两个判定器，都接受才接受 |
| 连接、克林闭包 | 课上留作问题，见下方学生笔记的思路与修正 |

<!-- Sources: W12L1 p.13; Apple Notes LEC23-24 -->

板书上蓝字给出构造，“依次运行”之所以可行，是因为判定器一定会停，第一台不会把第二台堵住。最下面的“Concatenation? Kleene closure?”是留给学生的问题。

**连接**（学生笔记）：设 $M,N$ 判定 $A,B$ 。在输入 $w$ 上，枚举所有拆分 $w=xy$ ，对每一种运行 $M$ 于 $x$ 、 $N$ 于 $y$ ；若某种拆分两者都接受就接受，全部试完都不行就拒绝。**易错**：长度为 $n$ 的串有 $n+1$ 种拆分（ $x$ 或 $y$ 可以为空），不是 $n-1$ 种。

**克林闭包**：学生笔记的算法把 $w$ 分成**等长**的 $k$ 段——这是**错误**的，因为 $L^*$ 中的各段长度可以不同。修正：若 $w=\varepsilon$ 就接受；否则枚举把 $w$ 切成若干个非空连续段的**所有**方式（长度为 $n$ 时共 $2^{n-1}$ 种），对每种方式用 $M$ 检查每一段，若某种方式全部接受就接受，否则拒绝。因为方式有限、 $M$ 总会停，这是判定器。

<!-- Sources: Apple Notes LEC23-24 -->

### 可识别语言

![W12L1 slide 14 - Closure of recognisable languages](assets/13-unrecognisable-reductions/slide-w12l1-14.png)

**定理**：若 $L$ 与 $L^c$ 都可识别，则 $L$ 可判定。

证明：设 $M_1$ 识别 $L$ 、 $M_2$ 识别 $L^c$ 。在输入 $w$ 上**并行**（交替一步一步地）运行二者——图右两列向下的小箭头就是两台机器轮流各走一步。每个 $w$ 要么在 $L$ 、要么在 $L^c$ ，所以总有一台最终接受：$M_1$ 接受就接受，$M_2$ 接受就拒绝。

<!-- Sources: W12L1 p.14; Apple Notes LEC23-24 -->

图中两条框说明为什么不能简单“互换状态”：上框是识别器 $R$ 的三种结局“接受 | 循环 | 拒绝”，下框是把 $R$ 的接受与拒绝状态互换后的 $R^c$ ，结局变成“拒绝 | 循环 | 接受”——中间的“循环”原封不动。

**推论**：$A_{TM}$ 可识别但不可判定，所以 $(A_{TM})^c$ **不可识别**（板书写作 $(ACCEPT_{TM})^c$ ）。一般地，若 $L$ 可识别但不可判定，则 $L^c$ 不可识别。

<!-- Sources: W12L1 p.14; Apple Notes LEC23-24 -->

**易错**：可识别语言对补**不**封闭。只交换识别器的接受与拒绝状态不行：原来“循环”的输入仍然循环，补集里的这些串永远得不到接受。

<a id="topic-4"></a>
## 4. Rice 定理与难解性

### Rice 定理

![L24 slide 6 - Static analysis and Rice's theorem](assets/13-unrecognisable-reductions/slide-l24-06.png)

第 24 讲回到静态代码分析：红色箭头把“运行时错误”连到停机问题、把“违反规约”连到 TM 等价，两者都不可判定（ [第 2 节](#topic-2)）。最下面红字是更一般的结论。

**Rice 定理**：关于程序**行为**的每一个非平凡性质（non-trivial property）都不可判定。“非平凡”指既非所有程序都有、也非所有程序都没有。所以不存在一个程序，能区分“具有某种行为的程序”与“不具有它的程序”。

<!-- Sources: L24 p.6; Apple Notes LEC23-24 -->

**易错**：Rice 定理只管**行为**，即机器识别的语言。关于源码文本的性质（例如“源码是否超过 100 行”“是否有超过 10 个状态”）不是行为性质，Rice 定理不适用，它们通常显然可判定。

### 可计算与高效

![L24 slide 7 - Computable vs efficient](assets/13-unrecognisable-reductions/slide-l24-07.png)

- 可计算 = 在有限时间内算完；
- 高效 = 在输入长度的多项式时间内算完。

CNF 可满足性、整数分解、AI 规划都是可计算的，但是否有高效算法与 P vs NP 问题有关（图中红字）。

<!-- Sources: L24 p.7; Apple Notes LEC23-24 -->

### 应对难解性：放宽要求

![L24 slide 8 - Dealing with intractability](assets/13-unrecognisable-reductions/slide-l24-08.png)

正确性原本要求（黑字）：对每个输入 $x\in\Sigma^*$ ， $M$ 接受 $x$ 当且仅当 $x\in L$ 。蓝字是三种放宽：

- 只处理一类“有结构的”输入；
- 参数化算法（课件写有 $2^{f(x)}$ ：指数部分只依赖输入的某个参数，而不是整个输入长度）；
- 近似最优解（例如 3-CNF 的 $\tfrac34$ 近似）。

<!-- Sources: L24 p.8; Apple Notes LEC23-24 -->

### 计算无处不在

![L24 slide 9 - Computational lens](assets/13-unrecognisable-reductions/slide-l24-09.png)

“计算透镜”把丘奇–图灵论题推得更远：每个物理上可实现的过程都能由图灵机完成；例子是经济学中市场收敛到均衡。论题本身的讲解见[第 11 篇](11-turing-machines.md#topic-5)。

<a id="topic-5"></a>
## 5. 全课总表

### 复习地图

![L24 slide 10 - Review part 1](assets/13-unrecognisable-reductions/slide-l24-10.png)

![L24 slide 11 - Review part 2](assets/13-unrecognisable-reductions/slide-l24-11.png)

这两页手写复习一起读：第 24 讲把全课归结为五条线，蓝字是每条线的应用或例子（有限自动机做“边读边算”；PDA 做语法高亮、识别 $\{0^n1^m\mid n>m\}$ ，它与“选举中多数胜出”的判断相当；图灵机让我们能对更简单的模型做推理）。可按下面的笔记回看：

| 主题 | 笔记 |
| --- | --- |
| 正则语言：有限自动机、正则表达式（极高效的“边读边算”） | [06](06-finite-automata.md)、[07](07-nfa-determinisation-minimisation.md)、[08](08-regular-expressions.md) |
| 上下文无关语言：PDA、CFG（例如语法高亮；识别 $\{0^n1^m\mid n>m\}$ ） | [10](10-cfl-pda.md) |
| 图灵机：丘奇–图灵论题；存在不可判定、不可识别语言；能对更简单的模型做推理 | [11](11-turing-machines.md)、[12](12-decidability-universality.md) |
| 语言上的运算：并、交、连接 | [06](06-finite-automata.md#topic-3)、[本篇第 3 节](#topic-3) |
| 证明不可能性：正则语言用愚弄集；图灵机用归约、对角线 | [09](09-non-regularity.md)、[12](12-decidability-universality.md)、本篇 |

<!-- Sources: L24 p.10-11; Apple Notes ★ Review -->

逻辑部分（[02](02-propositional-logic.md)–[05](05-unification-automated-reasoning.md)）不在这张手写复习图上，但属于本课程前半段的内容。

### 封闭性

![L24 slide 16 - Closure properties table](assets/13-unrecognisable-reductions/slide-l24-16.png)

下表中 $\circ$ 是连接， $*$ 是克林闭包，“R∩”指与一个正则语言求交；DCFL 是确定性 PDA（DPDA）能识别的语言。

| 语言类 | ∪ | ∘ | * | R∩ | ∩ | 补 |
| --- | --- | --- | --- | --- | --- | --- |
| 正则 | Y | Y | Y | Y | Y | Y |
| DCFL | N | N | N | Y | N | Y |
| CFL | Y | Y | Y | Y | N | N |
| 可判定 | Y | Y | Y | Y | Y | Y |
| 可识别 | Y | Y | Y | Y | Y | N |

<!-- Sources: L24 p.16; Apple Notes ★3 Languages -->

读表时按列比较最有用：例如“补”一列只有 CFL 和可识别是 N，它们分别在[第 10 篇](10-cfl-pda.md#topic-5)和[本篇第 3 节](#topic-3)出现过。

### 语言性质的可判定性

![L24 slide 17 - Decidability of language properties](assets/13-unrecognisable-reductions/slide-l24-17.png)

D = 可判定，U = 不可判定。每一列是“给定该类中的语言（以机器或文法给出）”时问题是否可判定。

| 问题 | 正则 | DCFL | CFL | 可判定 | 可识别 |
| --- | --- | --- | --- | --- | --- |
| $w\in L$ | D | D | D | D | U |
| $L=\emptyset$ | D | D | D | U | U |
| $L=\Sigma^*$ | D | D | U | U | U |
| $L_1=L_2$ | D | D | U | U | U |
| $L$ 等于给定的正则语言 $R$ | D | D | U | U | U |
| $L$ 正则 | D | D | U | U | U |
| $L_1\subseteq L_2$ | D | U | U | U | U |

<!-- Sources: L24 p.17; Apple Notes ★3 Languages -->

例如“可识别”列第一行的 U 就是 $A_{TM}$ 不可判定；“可判定”列第二行的 U 呼应了本篇 $EMPTY_{TM}$ 的证明思路。这两张表的页脚写着 2023 年第 2 学期的复习课，是被收进本学期第 24 讲的旧页。

## 本讲自测

1. 要证明 $B$ 不可判定，应构造 $A_{TM}\le B$ 还是 $B\le A_{TM}$ ？各说明一句。
2. 仿照 $A_{TM}\le EMPTY_{TM}$ ，说明怎样证明 $\{\langle M\rangle\mid M\text{ 接受 }\varepsilon\}$ 不可判定：辅助机器该怎样构造？
3. 为什么可判定语言对补封闭，而可识别语言不是？用这一点说明 $(HALT_{TM})^c$ 可不可识别。
4. 用 Rice 定理判断：“ $L(M)$ 是否有限”可判定吗？“ $M$ 是否有超过 10 个状态”呢？
