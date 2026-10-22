# COMP30026 Lectures 17–19 - Context-Free Languages and Pushdown Automata

来源：`lecture/16.pdf`（文件名为 16，首页实为第 18 讲 Pushdown Automata）、`lecture/w10l1part1.pdf`（第 19 讲前半，收尾上下文无关语言）；Apple Notes：CS/25S2/MoC — "LEC17-18 Context-free Language & Pushdown Automaton"、"★3 Languages"。

这篇讲的是：**$\{a^nb^n\}$ 这种需要“配对”的语言超出了有限自动机；如果给机器加一个栈，或者用“改写规则”来生成字符串，能描述哪些语言？**

学习路线：[机器与语言的对应](#topic-1) → [上下文无关文法](#topic-2) → [语法树与歧义](#topic-3) → [下推自动机](#topic-4) → [文法与自动机等价](#topic-5)。

重点：CFG 的四个组成部分、推导、PDA 转移记号 $a,b\to c$ 。难点：用非确定性猜“中点”（回文例子）；CFG 转 PDA。易错：误读 ${\$}$ 与 $\varepsilon$ 在 PDA 转移中的含义。

**覆盖范围有限**：第 17 讲使用的 Sipser CFG/PDA 幻灯片（PowerPoint）没有下载到本地，所以[第 2 节](#topic-2)文法（CFG）的定义部分主要依据学生笔记与第 18 讲开头的复习页。本篇截图来自 `16.pdf`（简称 L18）与 `w10l1part1.pdf`。

<a id="topic-1"></a>
## 1. 机器与语言的对应

![L18 slide 5 - Machines vs languages](assets/10-cfl-pda/slide-l18-05.png)

第 18 讲先用一张同心圆定位：左边列的是**机器**，右边列的是它们识别的**语言类**，从内到外一一对应——有限自动机 ↔ 正则语言，下推自动机 ↔ 上下文无关语言，线性有界自动机 ↔ 上下文有关语言，总会停机的图灵机 ↔ 可判定语言，图灵机 ↔ 图灵可识别语言。蓝色实心的两层是这几讲的范围：从正则语言往外走一层。

| 生成模型 | 机器模型 | 记忆 | 例子 |
| --- | --- | --- | --- |
| 正则表达式 | 有限自动机 | 有限个状态 | $a^*b^*$ |
| 上下文无关文法 | 下推自动机（NFA + 栈） | 无限但只能后进先出 | $a^nb^n$ |
| 上下文有关语言（context-sensitive） | 线性有界自动机（linear-bounded automaton） | 纸带长度受输入限制 | $a^nb^nc^n$ |
| 可判定语言 | 总会停机的图灵机 | 无限纸带 | 见[第 12 篇](12-decidability-universality.md) |
| 图灵可识别语言 | 图灵机 | 无限纸带 | 见[第 11 篇](11-turing-machines.md) |

<!-- Sources: L18 (16.pdf) p.5; Apple Notes ★3 Languages -->

表中例子一栏来自学生笔记：每一行的例子都恰好超出上一行模型的能力。线性有界自动机和上下文有关语言本课只点名，不展开。

<a id="topic-2"></a>
## 2. 上下文无关文法

### 四个组成部分

本小节没有本地课件（第 17 讲），依据学生笔记。

**上下文无关文法（context-free grammar, CFG）**由以下部分组成：

| 部分 | 说明 |
| --- | --- |
| 终结符（terminals）的有限集 $\Sigma$ | 即字母表，最终字符串里的字符 |
| 变量（variables，也叫非终结符）的有限集 $V$ | 还要继续展开的符号 |
| 产生式规则（production rules）的有限集 $R$ | 形如 $A\to w$ ， $A$ 是变量， $w$ 是终结符与变量组成的串 |
| 起始变量 $S$ | 推导从它开始 |

<!-- Sources: Apple Notes LEC17-18 -->

同一个变量的多条规则可以用 $\mid$ 合写。例如算术表达式：

```text
Expr → 0 | 1 | ... | 9 | Expr Op Expr | (Expr)
Op   → + | - | × | /
```

<!-- Sources: Apple Notes LEC17-18 -->

“上下文无关”指规则左边只有一个变量：无论这个变量周围是什么，都可以用同一条规则替换它。

### 推导与生成的语言

生成一个串：令当前串 $x=S$ ；只要 $x$ 中还有变量，就挑一条规则 $A\to w$ ，把 $x$ 中**某一处** $A$ 替换成 $w$ ；没有变量时得到的就是生成的串。

记号：

- $xAz\Rightarrow xyz$ ：对 $xAz$ 用规则 $A\to y$ 一步得到 $xyz$ ；
- $x\Rightarrow^* z$ ： $x=z$ ，或存在 $y_1,\dots,y_k$ 使 $x\Rightarrow y_1\Rightarrow\cdots\Rightarrow y_k\Rightarrow z$ （星号与克林闭包一样表示“零步或多步”）；
- 文法的语言 $L(G)=\{x\mid S\Rightarrow^* x,\ x\text{ 只含终结符}\}$ 。

<!-- Sources: Apple Notes LEC17-18 -->

**易错**：一步推导只替换变量的**一处**出现，不是把所有同名变量同时替换。

### 推导例子

![L18 slide 12 - Derivation example](assets/10-cfl-pda/slide-l18-12.png)

右上角是文法 $A\to0A0\mid1A1\mid\varepsilon$ ，左下是逐步展开的推导，每行用一条规则替换唯一的那个 $A$ ：

$$
A\Rightarrow0A0\Rightarrow00A00\Rightarrow001A100\Rightarrow0010A0100\Rightarrow00100100 ,
$$

最后一步用 $A\to\varepsilon$ 让变量消失，所以 $G$ 生成 $00100100$ 。每条规则都在两端加上**相同**的字符，因此这个文法生成的恰好是偶数长度的二进制回文串——[第 4 节](#topic-4)的回文 PDA 识别的是同一个语言。

<!-- Sources: L18 (16.pdf) p.7-12 -->

<a id="topic-3"></a>
## 3. 语法树与歧义

### 语法树

**语法树（parse tree）**记录推导的结构：

- 每个节点是一个终结符或变量；根是起始变量；
- 每个非叶节点和它的孩子对应一条产生式 $A\to w$ ；
- 每个叶子是终结符；从左到右把叶子连起来，就是生成的串 $w$ 。

<!-- Sources: Apple Notes LEC17-18 -->

### 歧义

![L18 slide 13 - Ambiguity](assets/10-cfl-pda/slide-l18-13.png)

文法 $E\to E+E\mid E*E\mid(E)\mid0\mid1\mid\dots\mid9$ 不只允许不同的推导顺序，还允许 `3 + 7 * 2` 有两棵**不同的语法树**：左树根部是 `+`，表示 $3+(7*2)$ ；右树根部是 `*`，表示 $(3+7)*2$ 。两棵树代表不同的计算结果，这就是歧义的危害。

<!-- Sources: L18 (16.pdf) p.13 -->

| 概念 | 定义 |
| --- | --- |
| 有歧义的串 | 串 $x$ 在文法 $G$ 下有**不止一棵**语法树 |
| 有歧义的文法 | 存在某个关于它有歧义的串 |
| 固有歧义的语言（inherently ambiguous） | 生成它的**每个** CFG 都有歧义 |

<!-- Sources: Apple Notes LEC17-18 -->

**易错**：只是推导顺序不同（先展开左边的 $E$ 还是右边的 $E$ ）不算歧义；判断标准是语法树是否不同。

消除歧义的常见办法是在文法里固定运算的层次与结合顺序，学生笔记记下的写法是：

```text
Expr   → Expr + Term | Expr - Term | Term
Term   → Term * Factor | Term / Factor | Factor
Factor → (Expr) | number
```

<!-- Sources: Apple Notes LEC17-18 -->

这里乘除只能出现在 `Term` 这一层，比加减“更靠近叶子”，所以 `1 + 2 × 3` 只有一棵树，乘法先算。

<a id="topic-4"></a>
## 4. 下推自动机

### 给 NFA 加一个栈

![L18 slide 15 - PDA = NFA + stack](assets/10-cfl-pda/slide-l18-15.png)

右边的“state control”和下面的输入带就是一台 NFA；左边多出的一列格子是**栈（stack）**，箭头指向栈顶的 y。DFA 和 NFA 的记忆有限。**下推自动机（pushdown automaton, PDA）**就是**带一个无限栈的 NFA**：它可以往栈顶压入（push）、从栈顶弹出（pop）符号，但只能看栈顶。

<!-- Sources: L18 (16.pdf) p.14-15 -->

![L18 slide 18 - Matching a's with b's](assets/10-cfl-pda/slide-l18-18.png)

这是 $a^nb^n$ 动画的中间一帧：输入 `aabb` 的两个 a 已经读完并压进栈里，剩下 `bb` 待读。DFA 识别不了 $\{a^nb^n\mid n\ge0\}$ ，因为没有记忆；PDA 可以：读 a 时把 a 压栈，读 b 时弹出一个 a；输入读完时栈刚好清空，就说明个数相等。

<!-- Sources: L18 (16.pdf) p.16-20 -->

### 例 1：识别 a^n b^n

![L18 slide 21 - PDA example 1](assets/10-cfl-pda/slide-l18-21.png)

图下方给出转移记号：$a,b\to c$ 读作“读输入 $a$ ，栈顶 $b$ 换成 $c$ ”。沿图从左到右逐条解释：

1. $q_0\to q_1$ ：$\varepsilon,\varepsilon\to{\$}$ ，不读输入、不弹栈，压入特殊符号 ${\$}$ 作为**栈底标记**；
2. $q_1$ 自环 $a,\varepsilon\to a$ ：每读一个 a 就压一个 a；
3. $q_1\to q_2$ 与 $q_2$ 自环 $b,a\to\varepsilon$ ：每读一个 b 就弹掉一个 a；
4. $q_2\to q_3$ ：$\varepsilon,{\$}\to\varepsilon$ ，看到栈底标记说明 a 已全部配对，进入接受状态。

$q_0$ 也是接受状态（双圈），用来接受空串（ $n=0$ ）。

<!-- Sources: L18 (16.pdf) p.21, p.26 -->

**易错**：学生笔记把 ${\$}$ 记成“把输入压栈”、把 $\varepsilon$ 记成“弹栈”。正确的读法是：转移 $a,b\to c$ 的三个位置分别是“读的输入”“弹出的栈顶”“压入的新栈顶”，某个位置写 $\varepsilon$ 就表示这一步**不做**那件事；${\$}$ 只是一个普通的栈符号，约定用来标记栈底，好让 PDA 检测“栈已空”。

### PDA 怎样运行

![L18 slide 23 - How PDAs work](assets/10-cfl-pda/slide-l18-23.png)

上面三项是每一步要看的东西：当前状态、输入符号、栈顶。下面是运行过程：

1. 从起始状态开始；
2. 当还有输入，或尚未处于接受状态时：
    1. 非确定地选一个可用转移 $a,b\to c$ （从当前状态到新状态 $q$ ），没有可用转移就拒绝；
    2. 消耗输入 $a$ ；
    3. 把栈顶的 $b$ 换成 $c$ ；
    4. 移动到状态 $q$ ；
3. 接受。

<!-- Sources: L18 (16.pdf) p.23; Apple Notes LEC17-18 -->

“拒绝”只指这一条分支走不下去；和 NFA 一样，只要**存在**一条分支读完输入并停在接受状态，整台 PDA 就接受。

### 形式定义

![L18 slide 24 - PDA formal definition](assets/10-cfl-pda/slide-l18-24.png)

PDA 是六元组 $(Q,\Sigma,\Gamma,\delta,q_0,F)$ ：

| 部分 | 说明 |
| --- | --- |
| $Q$ | 有限状态集 |
| $\Sigma$ | 有限输入字母表 |
| $\Gamma$ | 有限栈字母表 |
| $\delta:Q\times\Sigma_\varepsilon\times\Gamma_\varepsilon\to\mathcal{P}(Q\times\Gamma_\varepsilon)$ | 转移函数， $\Sigma_\varepsilon=\Sigma\cup\{\varepsilon\}$ |
| $q_0\in Q$ | 起始状态 |
| $F\subseteq Q$ | 接受状态 |

<!-- Sources: L18 (16.pdf) p.24; Apple Notes LEC17-18 -->

转移函数的类型说明了三件事：输入位置可以是 $\varepsilon$ （不读），栈顶位置可以是 $\varepsilon$ （不弹），结果是“新状态 + 一个要压入的栈符号或 $\varepsilon$ ”的**集合**（非确定）。

**补充**：按这个定义，一次转移最多压入**一个**栈符号。如果设计时想一次压两个（例如识别 $a^nb^{2n}$ 时每读一个 a 压两个 a），就串一个中间状态：先读 a 压一个 a 进中间状态，再用 $\varepsilon,\varepsilon\to a$ 压第二个 a 回到原状态。

![L18 slide 25 - Example transitions](assets/10-cfl-pda/slide-l18-25.png)

两行例子分别是“确定的一步”和“非确定、不读输入的一步”：

- $\delta(q_5,a,b)=\{(q_7,\varepsilon)\}$ ：在 $q_5$ 、读到 a、栈顶为 b 时，消耗 a、弹出 b、进入 $q_7$ ；
- $\delta(q_5,\varepsilon,b)=\{(q_6,a),(q_7,b)\}$ ：在 $q_5$ 、栈顶为 b 时，要么把 b 换成 a 并进入 $q_6$ ，要么栈不变进入 $q_7$ ；两种情况都**不**消耗输入。

<!-- Sources: L18 (16.pdf) p.25 -->

![L18 slide 26 - Example 1 formally](assets/10-cfl-pda/slide-l18-26.png)

这一页把例 1 的状态图逐项翻译成六元组： $Q=\{q_0,q_1,q_2,q_3\}$ ， $\Sigma=\{a,b\}$ ， $\Gamma=\{a,{\$}\}$ ， $F=\{q_0,q_3\}$ ，转移为 $\delta(q_0,\varepsilon,\varepsilon)=\{(q_1,{\$})\}$ 、 $\delta(q_1,a,\varepsilon)=\{(q_1,a)\}$ 、 $\delta(q_1,b,a)=\{(q_2,\varepsilon)\}$ 、 $\delta(q_2,b,a)=\{(q_2,\varepsilon)\}$ 、 $\delta(q_2,\varepsilon,{\$})=\{(q_3,\varepsilon)\}$ ，其余输入返回 $\emptyset$ 。注意栈字母表里有 ${\$}$ 却没有 b：b 从来不入栈。

<!-- Sources: L18 (16.pdf) p.26 -->

![L18 slide 27 - Empty stack notes](assets/10-cfl-pda/slide-l18-27.png)

**关于空栈**：机器停下时（无论接受与否）**不要求**栈为空；空栈不能再弹出。这就是例 1 要先压 ${\$}$ 的原因：机器本身无法“问”栈是否为空，只能看栈顶是不是 ${\$}$ 。

<!-- Sources: L18 (16.pdf) p.27 -->

### 例 2：偶数长度回文串

![L18 slide 29 - PDA for ww^R](assets/10-cfl-pda/slide-l18-29.png)

$w^R$ 表示把 $w$ 倒过来写。这个 PDA 识别 $\{ww^R\mid w\in\{0,1\}^*\}$ ：在 $q_1$ 把读到的 0、1 原样压栈（前半段）；中间那条 $\varepsilon,\varepsilon\to\varepsilon$ 不读不压，只是**非确定地猜**“前半段在这里结束”；在 $q_2$ 每读一个字符就要求栈顶是同一字符并弹出（后半段与前半段倒序相同）；最后见到 ${\$}$ 进入接受状态。猜错中点的分支会失败，但只要有一个分支猜对就接受。

<!-- Sources: L18 (16.pdf) p.28-29 -->

**难点**：为什么非确定性在这里必不可少？机器读输入时不知道中点在哪里，只能在每个位置都“猜一次”，由猜对的那条分支负责接受。确定的机器没有这种“同时试所有中点”的能力。

<a id="topic-5"></a>
## 5. 文法与自动机等价

### CFG 与 PDA 等价

![L18 slide 30 - CFLs have PDAs as recognisers](assets/10-cfl-pda/slide-l18-30.png)

**定理**：一个语言是上下文无关的，当且仅当某个（非确定）PDA 识别它（证明见 Sipser）。第 19 讲前半的手写页把它写成“CFG = PDA”。

<!-- Sources: L18 (16.pdf) p.30; W10L1part1 p.2; Apple Notes LEC17-18 -->

![W10L1part1 slide 3 - CFG to PDA](assets/10-cfl-pda/slide-w10l1part1-03.png)

“CFG → PDA”方向的证明思路，以平衡括号为例。页面上方红色的括号对示意几个平衡串，红字是文法 $S\to SS\mid(S)\mid\varepsilon$ 。转换算法：

1. 把 $S$ 压栈；
2. 当栈非空时：若栈顶是变量 $A$ ，非确定地选一条规则 $A\to w$ ，用 $w$ 替换栈顶（倒序压入，使 $w$ 的第一个符号在栈顶）；若栈顶是终结符，就要求它等于下一个输入符号，并弹出；
3. 栈空且输入读完时接受。

图右侧的小栈演示了读 `(()())` 时栈的变化：起初是 $S$ ，用 $S\to SS$ 换成两个 $S$ ，再用 $S\to(S)$ 把栈顶换成 `(`、 $S$ 、`)`，终结符逐个与输入匹配后弹掉，最后栈空。栈里保存的其实是“推导中还没匹配的部分”，非确定性负责猜每一步该用哪条规则。

<!-- Sources: W10L1part1 p.3 -->

### 正则文法

![L18 slide 31 - Regular grammars](assets/10-cfl-pda/slide-l18-31.png)

若把 CFG 的规则限制为 $A\to w$ 或 $A\to wB$ （ $w\in\Sigma^*$ ， $A,B\in V$ ），就得到**正则文法（regular grammar）**，它生成的恰好是正则语言。

<!-- Sources: L18 (16.pdf) p.31 -->

直觉：每条规则右边最多一个变量，而且在最右端，于是推导过程中的“当前变量”就像 DFA 的当前状态，每步产生一段字符再换一个状态。

### 封闭性

- 每个正则语言都是上下文无关语言（CFL）；
- CFL 对并、连接、克林闭包封闭（学生笔记还记了反转）；
- CFL 对交**不**封闭，对补也不封闭；但 CFL 与正则语言的交仍是 CFL。

<!-- Sources: Apple Notes LEC17-18; L24 p.16 -->

完整的封闭性对照表见[第 13 篇](13-unrecognisable-reductions.md#topic-5)。

### 层级图

![W10L1part1 slide 4 - Regular inside context-free](assets/10-cfl-pda/slide-w10l1part1-04.png)

手写页把[第 1 节](#topic-1)的同心圆收窄到两层：黑圈是正则语言（有限自动机 = 正则表达式），例子 $0^*1^*$ ；红圈是上下文无关语言（下推自动机 = 上下文无关文法），例子 $0^n1^n$ ；圈外蓝色的 $0^n1^n2^n$ 连 PDA 也识别不了，于是第 19 讲后半转向[图灵机](11-turing-machines.md)。

<!-- Sources: W10L1part1 p.4 -->

## 本讲自测

1. 写一个 CFG 生成 $\{a^nb^n\mid n\ge0\}$ ，并给出 $aabb$ 的推导。
2. 在例 1 的 PDA 上跟踪输入 `aab`：每一步后栈里是什么？为什么最终拒绝？
3. 回文 PDA 读 `0110` 时，猜中点在哪个位置的分支会接受？其他分支在哪里失败？
4. 设计一个 PDA 识别 $\{a^nb^{2n}\mid n\ge0\}$ （描述思路即可）。
5. 用 CFG → PDA 的转换算法处理文法 $S\to aSb\mid\varepsilon$ 与输入 `aabb`，写出栈内容的变化。
