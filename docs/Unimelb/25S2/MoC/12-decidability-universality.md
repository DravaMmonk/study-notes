# COMP30026 Lectures 21–22 - Universal Turing Machines, Diagonalisation and Undecidability

来源：`lecture/w11l1.pdf`（第 21 讲）、`lecture/w11l2.pdf`（第 22 讲），均为手写板书；Apple Notes：CS/25S2/MoC — "LEC21-22 Universality of Turing Machines"、"★3 Languages"。

这篇讲的是：**图灵机已经是最强的计算模型了，是不是什么问题都能算？——不是。怎样证明“存在算不出来的问题”，并找出一个具体的例子？**

学习路线：[不可计算即不可判定](#topic-1) → [通用图灵机：把程序当输入](#topic-2) → [数一数：图灵机比语言少](#topic-3) → [对角线语言与 TM 接受问题](#topic-4) → [自指的证明](#topic-5)。

重点：$A_{TM}$ 可识别但不可判定；对角线论证。难点：自指——把机器自己的编码喂给它。易错：把“通用机 $U$ 能模拟任何 TM”误当成“ $U$ 能判定 $A_{TM}$ ”。

两份 PDF 都是课堂手写板书，同一页常常逐步写满后再翻页；截图选的是写完整的那一页。

<a id="topic-1"></a>
## 1. 不可计算即不可判定

### 计算的极限

![W11L1 slide 2 - Uncomputable equals undecidable](assets/12-decidability-universality/slide-w11l1-02.png)

上半部分把丘奇–图灵论题画成“Input → Algorithm → Output”，并在 Algorithm 下面写“= Turing Machine”（见[第 11 篇](11-turing-machines.md#topic-5)）。由此得到红字那一行：

$$
\text{不可计算（uncomputable）}=\text{不可判定（undecidable）}.
$$

下面三行红字是补充：即使允许量子计算、非确定性，甚至“时间旅行”，这个界限也不会改变——它们都不会让一个不可判定的问题变得可判定。

<!-- Sources: W11L1 p.1-2; W11L2 p.2; Apple Notes LEC21-22 -->

学生笔记的表述：语言 $L$ 可判定，等价于它的**特征函数（characteristic function）**

$$
f(w)=\begin{cases}1 & w\in L\\ 0 & w\notin L\end{cases}
$$

可计算。也就是存在 TM $M$ ，对每个输入 $w$ ： $M$ 停机；若 $w\in L$ 则接受；若 $w\notin L$ 则拒绝。

<!-- Sources: Apple Notes LEC21-22 -->

本讲路线：先证明不可识别的语言**存在**，再证明“TM 接受问题”不可判定。注意“不可识别 ⇒ 不可判定”，因为判定器也是识别器。

<!-- Sources: W11L1 p.1 -->

<a id="topic-2"></a>
## 2. 通用图灵机：把程序当输入

### 例 1：有限自动机接受问题

![W11L1 slide 4 - FA acceptance](assets/12-decidability-universality/slide-w11l1-04.png)

标题“Source code as input”是这一节的主题：图灵机可以把另一台机器的**源代码**当输入。图中把 DFA $B$ 编码成 $\langle B\rangle$ ，与输入 $w$ 一起送进一个 TM 方框，右边写出它的输出要求：

$$
A_{DFA}=\{\langle B,w\rangle\mid B\text{ 是 DFA 且接受 }w\}.
$$

方框下面是做法：TM 在 $w$ 上模拟 $B$ ；DFA 每个字符只读一次，所以 $\text{len}(w)$ 步之后，若 $B$ 处于接受状态就接受，否则拒绝。模拟总会停机，所以 $A_{DFA}$ 是**可判定**的。

<!-- Sources: W11L1 p.3-4; Apple Notes LEC21-22 -->

学生笔记补充：只有图灵机能做这种模拟。 $A$ 能模拟 $B$ 指 $A(\langle B,w\rangle)=B(w)$ ；有限自动机状态和记忆有限，PDA 只能后进先出地访问栈，都模拟不了任意机器。

<!-- Sources: Apple Notes LEC21-22 -->

### 例 2：图灵机接受问题

![W11L1 slide 5 - TM acceptance](assets/12-decidability-universality/slide-w11l1-05.png)

同样的方框，输入换成 TM 的编码 $\langle M\rangle$ 和 $w$ ：

$$
A_{TM}=\{\langle M,w\rangle\mid M\text{ 是 TM 且接受 }w\}.
$$

**通用图灵机（universal Turing machine）** $U$ 在 $w$ 上模拟 $M$ （图中大括号里的三行）：

$$
U(\langle M,w\rangle)=\begin{cases}\text{接受} & M\text{ 接受 }w\\ \text{拒绝} & M\text{ 拒绝 }w\\ \text{永远运行} & M\text{ 在 }w\text{ 上永远运行}\end{cases}
$$

左边红字给出结论：$U$ 是 $A_{TM}$ 的**识别器**，但**不是判定器**—— $M$ 不停， $U$ 也停不下来。所以 $A_{TM}$ 是可识别的。和例 1 的差别正在于：DFA 的模拟有 $\text{len}(w)$ 步的上限，TM 的模拟没有。

<!-- Sources: W11L1 p.5; Apple Notes LEC21-22 -->

### 判定 A_TM 的机器会有多强

![W11L1 slide 6 - A decider for TM acceptance](assets/12-decidability-universality/slide-w11l1-06.png)

假设有一台“独角兽”判定器 $U$ （图中方框里画着独角兽，表示“好得不像真的”）：输入 $\langle M,w\rangle$ ，总会停机，并在 $w\in L(M)$ 时接受、否则拒绝。那么任何识别器 $M$ 都能变成判定器 $D$ ——“在输入 $w$ 上运行 $U$ 于 $\langle M,w\rangle$ ，照抄它的回答”。换言之，凡是可识别的语言都会变成可判定的。这好得令人怀疑，[第 4 节](#topic-4)会证明这样的 $U$ 不存在。

<!-- Sources: W11L1 p.6 -->

<a id="topic-3"></a>
## 3. 数一数：图灵机比语言少

### 定理与思路

![W11L1 slide 7 - More languages than TMs](assets/12-decidability-universality/slide-w11l1-07.png)

**定理**：存在不可识别的语言。

图中两个圈的大小就是证明思路：小圈是所有图灵机，大圈是所有语言。语言比图灵机**多**——图灵机的集合是“可数”的，所有语言的集合却“不可数”，所以总有语言没有机器识别。接下来几页把“多”和“可数”说清楚。

<!-- Sources: W11L1 p.7, p.14 -->

### 集合的大小

![W11L1 slide 8 - Cantor and bijections](assets/12-decidability-universality/slide-w11l1-08.png)

**康托尔（Cantor）**：如果两个集合的元素能一一配对，它们就一样大。图中红点（集合 $A$ ）和蓝点（集合 $B$ ）由箭头 $f$ 一一连起来。形式上，存在双射（bijection） $f:A\to B$ ，即：

- **单射（injective）**： $A$ 中不同元素映到 $B$ 中不同元素；
- **满射（surjective）**： $f(A)=B$ ， $B$ 中每个元素都被配到。

集合 $S$ 是**可数的（countable）**，若它与自然数集 $\mathbb{N}$ 一样大。

<!-- Sources: W11L1 p.8, p.10; Apple Notes LEC21-22 -->

### 可数的例子

![W11L1 slide 9 - Naturals vs Boolean strings](assets/12-decidability-universality/slide-w11l1-09.png)

左列是自然数 1、2、3……，右列是按“字符串序”（先按长度，再按字典序）排列的布尔串 $\varepsilon$ 、0、1、00、01……。每个自然数恰好配一个串，所以 $\{0,1\}^*$ 可数。

![W11L1 slide 10 - Naturals vs TMs](assets/12-decidability-universality/slide-w11l1-10.png)

图灵机也能这样排：每台 TM $M$ 有编码 $\langle M\rangle\in\{0,1\}^*$ ；令 $M_i$ 为编码按字符串序排第 $i$ 的 TM， $f(n)=M_n$ 。下方给出可数集的定义，并写明“TM 的集合、布尔串的集合都可数”。

| 集合 | 与 $\mathbb{N}$ 的配对 |
| --- | --- |
| 布尔串 $\{0,1\}^*$ | $f(n)$ = 按字符串序排列的第 $n$ 个串：1↦ $\varepsilon$ ，2↦0，3↦1，4↦00，5↦01，… |
| 整数 $\mathbb{Z}$ | 0，−1，1，−2，2，−3，3，…（学生笔记给出的交错排列） |
| 图灵机 | $M_i$ = 编码 $\langle M_i\rangle\in\{0,1\}^*$ 按字符串序排第 $i$ 的 TM， $f(n)=M_n$ |

<!-- Sources: W11L1 p.9-11; Apple Notes LEC21-22 -->

板书上“自然数 vs 整数”一页只写了标题，表中整数的排列来自学生笔记。学生笔记还记了有理数 $\mathbb{Q}$ 也可数（ $|\mathbb{N}|=|\mathbb{Z}|=|\mathbb{Q}|$ ）。

<!-- Sources: W11L1 p.10; Apple Notes LEC21-22 -->

### 对角线论证：实数不可数

![W11L1 slide 13 - Diagonalisation](assets/12-decidability-universality/slide-w11l1-13.png)

左上：**定理**——自然数比 $[0,1]$ 中的实数少。证明要说明：每个 $f:\mathbb{N}\to[0,1]$ 都会漏掉某个实数。

把 $f(1),f(2),\dots$ 的小数展开排成表（图中 $f(1)=0.71828\ldots$ 、 $f(2)=0.11159\ldots$ ……）。看粉色圈出的**对角线**数字：第 $n$ 行的第 $n$ 位。构造 $x$ ，让它的第 $n$ 位与 $f(n)$ 的第 $n$ 位**不同**（图中把 7、1、0、2、6 各加 1，得到 $x=0.82137\ldots$ ）。于是对每个 $n$ ， $f(n)\ne x$ （第 $n$ 位不同），所以 $x$ 不在列表里， $f$ 不是满射。

<!-- Sources: W11L1 p.12-13; Apple Notes LEC21-22 -->

关键在“每一行都至少有一位不同”：如果只是照抄对角线数字，构造出的 $x$ 可能恰好等于某个 $f(n)$ ，论证就失效了。

<details markdown="1">
<summary>延伸内容（可选）：“加 1”遇到 9 和双重小数表示</summary>

严格的证明还要避开 $0.0999\ldots=0.1$ 这类同一实数有两种小数展开的情况：若 $x$ 的展开恰好是某个 $f(n)$ 的另一种写法，“第 $n$ 位不同”并不能说明两个实数不同。常见做法是只用 4 和 5 这样的数字构造 $x$ （例如对角线数字不是 5 就取 5，是 5 就取 4），这样 $x$ 不会以全 0 或全 9 结尾，也就只有一种展开。板书的“加 1”在对角线数字是 9 时也需要另选数字。这是对课堂简化的补充。

</details>

右上的两个圈重复了[本节开头](#topic-3)的定理：同样的论证说明所有语言构成的集合不可数（学生笔记写作“与 $\mathbb{R}$ 一样大”），而图灵机只有可数多台，每台只识别一个语言，所以必有语言不可识别。

<!-- Sources: W11L1 p.14; Apple Notes LEC21-22 -->

<a id="topic-4"></a>
## 4. 对角线语言与 TM 接受问题

### 一个具体的不可识别语言

![W11L1 slide 15 - The diagonal language](assets/12-decidability-universality/slide-w11l1-15.png)

左下的表把上一节的对角线论证搬到语言上。把所有 TM 按编码排成 $M_1,M_2,\dots$ ，所有串按字符串序排成 $\varepsilon,0,1,00,\dots$ 。表中第 $i$ 行第 $j$ 列写 in/out，表示第 $j$ 个串是否属于 $L(M_i)$ 。沿对角线取反，定义

$$
L_D=\{x\mid x\notin L(M_x)\},
$$

其中若 $x$ 是第 $k$ 个串，则 $M_x=M_k$ 。图中对角线是 out、in、in、in，所以 $L_D$ 那一行是 in、out、out、out。对每个 $n$ ， $L(M_n)$ 与 $L_D$ 在第 $n$ 个串上不同，所以没有任何 TM 识别 $L_D$ ——**$L_D$ 不可识别**。

<!-- Sources: W11L1 p.15 -->

### 为什么关心这个“人造”语言

![W11L1 slide 17 - L_D and TM acceptance](assets/12-decidability-universality/slide-w11l1-17.png)

板书先问：“ $L_D$ 看起来很刻意，谁会在乎？”答案是它能推出一个真正重要的结论。

**断言**：若 TM 接受问题 $A_{TM}$ 可判定，则 $L_D$ 可判定。设 $U$ 判定 $A_{TM}$ ，构造 $L_D$ 的判定器：在输入 $x$ 上，运行 $U$ 于 $\langle M_x,x\rangle$ ；若 $U$ 拒绝则接受，若 $U$ 接受则拒绝。

<!-- Sources: W11L1 p.16-17 -->

但 $L_D$ 连可识别都不是，更不可能可判定。所以 **$A_{TM}$ 不可判定**，[第 2 节](#topic-2)的“独角兽”不存在。这已经是一个“归约”论证的雏形，[第 13 篇](13-unrecognisable-reductions.md#topic-1)会系统化。

<a id="topic-5"></a>
## 5. 自指的证明

### 回顾：语言的层级

![W11L2 slide 3 - Hierarchy recap](assets/12-decidability-universality/slide-w11l2-03.png)

上一讲的结论：存在不可计算的问题。图中由内到外：正则（Reg）⊂ 上下文无关（CFL，例如 $0^n1^n$ ）⊂ 可判定（例如 $0^n1^n2^n$ ）⊂ 可识别（例如 TM 接受问题）⊂ 所有语言（ $L_D$ 在最外层）。

<!-- Sources: W11L2 p.3 -->

![W11L2 slide 4 - Two methods](assets/12-decidability-universality/slide-w11l2-04.png)

识别“不可能问题”（不可识别、不可判定）的两种方法：①**对角线法 / 自指（self-reference）**——红字解释为“让程序作用在自己的源代码上”；②**归约（reduction）**。本讲用第一种重新讲一遍，第二种是[第 13 篇](13-unrecognisable-reductions.md)的主题。

<!-- Sources: W11L2 p.4 -->

### 说谎者悖论

![W11L2 slide 6 - Liar paradox](assets/12-decidability-universality/slide-w11l2-06.png)

上一讲的证明不是常见的“直接矛盾”证明，学生们觉得困惑，所以换成自指的说法。先看逻辑谜题：有两种人，诚实者（每句话都真，图中戴光环的笑脸）和说谎者（每句话都假，图中的小恶魔）。某人说“我是说谎者”：若他是诚实者，这句话为真，他就是说谎者；若他是说谎者，这句话为假，他就是诚实者。两种情况都矛盾。

<!-- Sources: W11L2 p.5-6 -->

### L_s 不可识别

![W11L2 slide 7 - L_s, first case](assets/12-decidability-universality/slide-w11l2-07.png)

这次表的列是机器的编码 $\langle M_1\rangle,\langle M_2\rangle,\dots$ 。粉色对角线是“ $M_i$ 是否接受自己的编码”；把它取反得到最下面一行 $L_s$ ：

$$
L_s=\{\langle M\rangle\mid M\text{ 不接受 }\langle M\rangle\}.
$$

假设存在 TM $R$ 使 $L(R)=L_s$ 。 $R$ 自己也在表里（图中最后一行 $L(R)$ 与最后一列 $\langle R\rangle$ ，交叉处画了一个空圈），问：$R$ 接受 $\langle R\rangle$ 吗？这一页写第一种情况：

1. $R$ 接受 $\langle R\rangle$ ⇒ $\langle R\rangle\in L_s$ （因为 $L(R)=L_s$ ）⇒ $R$ 不接受 $\langle R\rangle$ （ $L_s$ 的定义）。

![W11L2 slide 8 - L_s, second case](assets/12-decidability-universality/slide-w11l2-08.png)

下一页同一张表，写第二种情况：

2. $R$ 不接受 $\langle R\rangle$ ⇒ $\langle R\rangle\notin L_s$ ⇒ $R$ 接受 $\langle R\rangle$ 。

只有这两种可能，而两种都矛盾，所以“存在 $R$ 使 $L(R)=L_s$ ”的假设为假， $L_s$ 不可识别。这就是说谎者悖论的机器版：空圈那一格填 in 或 out 都不对。

<!-- Sources: W11L2 p.7-9; Apple Notes LEC21-22 -->

**补充**：反过来， $L_s$ 的补集 $\{\langle M\rangle\mid M\text{ 接受 }\langle M\rangle\}$ 是**可识别**的：在输入 $\langle M\rangle$ 上用通用机 $U$ 模拟 $M$ 于 $\langle M\rangle$ ，接受时接受。对角线上取反之后才走出可识别的范围。

### A_TM 不可判定

![W11L2 slide 10 - A_TM is undecidable](assets/12-decidability-universality/slide-w11l2-10.png)

假设 $A_{TM}$ 可判定，即存在 TM $H$ ：在 $\langle M,w\rangle$ 上，若 $M$ 接受 $w$ 则接受，否则拒绝。用 $H$ 构造 $D$ ：

```text
D = 在输入 ⟨M⟩ 上：
    在 ⟨M, ⟨M⟩⟩ 上运行 H
    若 H 拒绝，则接受
    若 H 接受，则拒绝
```

于是对每个 $M$ ：$D$ 接受 $\langle M\rangle$ 当且仅当 $M$ 不接受 $\langle M\rangle$ ，即 $L(D)=L_s$ （图右竖线旁的标注）。取 $M=D$ ：$D$ 接受 $\langle D\rangle$ 当且仅当 $D$ 不接受 $\langle D\rangle$ ——矛盾！所以 $A_{TM}$ 不可判定。

<!-- Sources: W11L2 p.10; Apple Notes LEC21-22 -->

**易错**：$D$ 之所以能保证停机，是因为 $H$ 是判定器（总会停）。若换成通用机 $U$ （识别器），$D$ 就可能永远运行，矛盾也就不成立——这正是 $A_{TM}$ 可识别却不可判定的原因。

学生笔记把“停机函数” $halt(M,w)$ （ $M$ 在 $w$ 上停机为 1，否则为 0）列为不可计算；它的证明用归约，见[第 13 篇](13-unrecognisable-reductions.md#topic-2)。

<!-- Sources: Apple Notes LEC21-22 -->

### 预告：归约

![W11L2 slide 11 - Reductions preview](assets/12-decidability-universality/slide-w11l2-11.png)

第 22 讲最后一页先给出归约的定义 $A\le B$ 和三个例子；红字“ $A$ 不可判定 ⇒ $B$ 不可判定”正是[第 4 节](#topic-4)用 $L_D$ 推出 $A_{TM}$ 不可判定的方式（例子最后一行 $L_D\le$ TM Acceptance）。定义、方向与例子的完整讲解见[第 13 篇第 1 节](13-unrecognisable-reductions.md#topic-1)。

## 本讲自测

1. 为什么模拟 DFA 一定在 $\text{len}(w)$ 步内结束，而模拟 TM 不一定？这对 $A_{DFA}$ 与 $A_{TM}$ 分别意味着什么？
2. 对角线论证里，如果把“第 $n$ 位加 1”改成“第 $n$ 位保持不变”，还能证明 $f$ 漏掉了某个实数吗？
3. $\{\langle M\rangle\mid M\text{ 接受 }\langle M\rangle\}$ 可判定吗？用本讲的结论说明。
4. 在 $A_{TM}$ 不可判定的证明里，如果 $H$ 只是识别器， $D$ 会在哪一步出问题？
