# COMP30026 Lectures 19–20 - Turing Machines and the Church–Turing Thesis

来源：`lecture/Lecture 19 Part 2 - Turing machines prelecture.pdf`（第 19 讲后半，改编自 Sipser 幻灯片）、`lecture/w10l1part1.pdf` 第 1 页、`lecture/w11l1.pdf` 第 2 页、`lecture/Lecture 24.pdf` 第 9 页；Apple Notes：CS/25S2/MoC — "LEC19 Turing Machine"、"LEC20 Church-Turing Thesis"。

这篇讲的是：**有限自动机和下推自动机的记忆都受限制；如果让机器拥有一条可读可写、两头可动的无限纸带，它能计算什么？这是不是“算法”的最终定义？**

学习路线：[从受限模型到图灵机](#topic-1) → [形式定义与三种结局](#topic-2) → [画法与格局](#topic-3) → [识别器与判定器](#topic-4) → [丘奇–图灵论题与希尔伯特第十问题](#topic-5) → [第 20 讲：模拟与编码](#topic-6)。

重点：TM 的三种结局、可识别与可判定的区别。难点：格局记号与“一步”的形式定义。易错：以为“识别”要求机器在所有输入上停机。

**覆盖范围有限**：第 20 讲（Church–Turing Thesis）的幻灯片在 Canvas 上下载超时，本地没有；[第 6 节](#topic-6)关于多带图灵机、非确定图灵机和编码的内容依据学生的 Apple Notes 整理，未能与课件核对。本篇截图全部来自第 19 讲后半的 PDF。

<a id="topic-1"></a>
## 1. 从受限模型到图灵机

### 回顾：两种受限模型

![Slide 3 - Recap: finite automata](assets/11-turing-machines/slide-03.png)

左边是有限自动机的示意图：输入写在一条“纸带”上，读写头只能从左往右读，**有限控制器（finite control）**就是状态图本身。右边是与它等价的生成模型——正则表达式。底部一句是关键：它的“记忆”被有限控制器的大小限制住。

![Slide 4 - Recap: pushdown automata](assets/11-turing-machines/slide-04.png)

下推自动机在有限控制器旁边多挂了一个**栈（stack）**，图中 c、d、d 是栈里的符号。它像 NFA 一样运行，只是每一步还可以压栈或弹栈；对应的生成模型是右边的上下文无关文法。底部说明：记忆不再受控制器大小限制，但仍然受限——只能访问栈顶。

| 机器模型 | 生成模型 | 记忆 |
| --- | --- | --- |
| 有限自动机（DFA/NFA） | 正则表达式 | 受有限控制器大小限制 |
| 下推自动机 | 上下文无关文法 | 栈可以无限长，但只能访问栈顶 |

<!-- Sources: L19-TM p.2-4 -->

前几周学的都是**受限**的计算模型；图灵机（Turing machine, TM）是**不受限**的计算模型。第 19 讲前半先收尾上下文无关语言（见[第 10 篇](10-cfl-pda.md)），后半引入图灵机。

<!-- Sources: L19-TM p.2; W10L1part1 p.1 -->

### 图灵机比有限自动机多了什么

![Slide 5 - TM informal picture](assets/11-turing-machines/slide-05.png)

图上只有一条纸带和一个有限控制器，但纸带现在是“read/write input tape”，右端用锯齿表示无限延伸，输入 `ababb` 之后全是空白符 $\sqcup$ 。五条区别：

1. 读写头**能读也能写**（可以覆盖纸带上的符号）；
2. 读写头**可以左右移动**；
3. 纸带向右**无限长**；
4. 输入后面跟着无穷多个空白符 $\sqcup$ ；
5. 可以在**任何时刻**接受或拒绝，不必等读完输入。

<!-- Sources: L19-TM p.5; Apple Notes LEC19 -->

第 1、2 条合起来，纸带就成了可以反复读写的“草稿纸”；第 5 条意味着机器也可能**永远不停**，这会在[第 2 节](#topic-2)变成第三种结局。

### 一个非正式例子

![Slide 6 - Informal TM example](assets/11-turing-machines/slide-06.png)

左边是识别 $B=\{a^kb^kc^k\mid k\ge0\}$ 的 TM 思路（这个语言 PDA 都识别不了）：

1. 向右扫描到 $\sqcup$ ，同时检查输入是否形如 $a^*b^*c^*$ ，不是就拒绝；
2. 读写头回到左端；
3. 向右扫描，各划掉一个 a、一个 b、一个 c；
4. 若划掉的恰好是最后一个 a、b、c，接受；
5. 若某种符号已划完而其他还有剩余，拒绝；
6. 若三种都还有剩余，回到左端，从第 3 步重复。

右边纸带上的 `aaabbbccc` 已经全部被划掉；纸带下方的一串长箭头表示读写头来回扫描的轨迹：第一趟走到空白处做格式检查，之后每趟划掉一组，最后一趟后输出 accept。黄框回答“划掉”怎样实现：把带斜杠的 $\not a,\not b,\not c$ 也放进纸带字母表 $\Gamma=\{a,b,c,\not a,\not b,\not c,\sqcup\}$ ，划掉就是用带斜杠的符号覆盖原符号——这正是“能写”带来的能力。

<!-- Sources: L19-TM p.6 -->

<a id="topic-2"></a>
## 2. 形式定义与三种结局

### 定义

![Slide 7 - Formal definition](assets/11-turing-machines/slide-07.png)

一台图灵机由以下部分组成：

| 部分 | 说明 |
| --- | --- |
| $Q$ | 状态集 |
| $\Sigma$ | 输入字母表 |
| $\Gamma$ | 纸带字母表， $\Sigma\subseteq\Gamma$ ，含空白符 $\sqcup$ |
| $q_0$ | 初始状态 |
| $q_{acc}$ 、 $q_{rej}$ | 接受状态、拒绝状态（有时写作 $q_a,q_r$ ） |
| $\delta:Q\times\Gamma\to Q\times\Gamma\times\{L,R\}$ | 转移函数 |

<!-- Sources: L19-TM p.7; Apple Notes LEC19 -->

幻灯片下半部分用一个例子读转移函数： $\delta(q,a)=(r,b,R)$ 的意思是，若当前状态为 $q$ 、读写头下的符号是 $a$ ，则①状态改为 $r$ ；②把 $a$ 覆盖成 $b$ ；③读写头右移一格。和 DFA 的 $\delta:Q\times\Sigma\to Q$ 相比，输出多了“写什么”和“往哪走”两项。

<!-- Sources: L19-TM p.7 -->

### 三种结局

![Slide 8 - Three outcomes and deciders](assets/11-turing-machines/slide-08.png)

在输入 $w$ 上，TM $M$ 可能**停机**（进入 $q_{acc}$ 或 $q_{rej}$ ），也可能**永远运行**。所以对每个输入有三种结局：

1. 接受（进入 $q_{acc}$ ）；
2. 停机拒绝（进入 $q_{rej}$ ）；
3. 循环（loop，永远运行）。

**定义**：若 $M$ 在所有输入上都停机，就称 $M$ 是一个**判定器（decider）**。 $M$ 的语言是 $L(M)=\{w\mid M\text{ 接受 }w\}$ 。

<!-- Sources: L19-TM p.8; Apple Notes LEC19 -->

注意 $L(M)$ 只收集“接受”的串；“停机拒绝”和“循环”的串都不在 $L(M)$ 里。两者的区别要到[第 4 节](#topic-4)才显出意义。

<a id="topic-3"></a>
## 3. 画法与格局

### 画图记号

![Slide 10 - Drawing TMs](assets/11-turing-machines/slide-10.png)

上半部分是记号：箭头标签 $a\to b,R$ 表示 $\delta(q,a)=(r,b,R)$ ；若不改写符号，简写为 $a\to R$ 。下半部分的 $M_1$ 识别“含子串 11 的串”：它和识别同一语言的 DFA（前一页 PDF 画的就是那个 DFA）结构几乎一样，只是每条转移都右移；读到空白 $\sqcup$ 时，若在 $q_2$ （已见过 11）就进 $q_{acc}$ ，否则进 $q_{rej}$ 。所以任何 DFA 都能这样改写成一个“只向右走、不改写”的 TM。

<!-- Sources: L19-TM p.9-10 -->

### 格局

![Slide 11 - Configurations](assets/11-turing-machines/slide-11.png)

**格局（configuration）**是执行过程中某一时刻的“快照”，包括：当前状态、纸带当前内容、读写头位置。图中控制器处于 $q$ ，读写头指着第三格的 a；记号 $xqy$ 把状态写在读写头所指符号的**左边**：状态是 $q$ ，纸带内容是 $xy$ ，读写头在 $y$ 的第一个符号上。所以这张图写作 $ab\,q\,abb$ 。

<!-- Sources: L19-TM p.11; Apple Notes LEC19 -->

### 一步计算与接受

![Slide 12 - Computation formally](assets/11-turing-machines/slide-12.png)

若对格局 $C$ 应用一次 $\delta$ 得到 $C'$ ，记作 $C\Rightarrow C'$ 。设 $u,b,c$ 是纸带符号、 $v$ 是串：

$$
\begin{aligned}
u\,q\,bv &\Rightarrow uc\,t\,v && \text{若 }\delta(q,b)=(t,c,R)\\
u\,q\,bv &\Rightarrow t\,ucv && \text{若 }\delta(q,b)=(t,c,L)\\
q\,buv &\Rightarrow t\,cuv && \text{若 }\delta(q,b)=(t,c,L)\text{（读写头已在最左端，不能再左移）}
\end{aligned}
$$

<!-- Sources: L19-TM p.12; Apple Notes LEC19 -->

读法：三行都是先把 $b$ 改写成 $c$ ，再移动。右移时状态记号跳到 $c$ 的右边；左移时跳到左邻 $u$ 的左边；第三行是边界情况——已经在最左格，再左移就原地不动。

$M$ 在输入 $w$ 上的起始格局是 $q_0w$ 。**定义**：$M$ 接受 $w$ ，当且仅当存在格局序列 $C_1,\dots,C_k$ ，使 $C_1=q_0w$ ，每个 $C_i\Rightarrow C_{i+1}$ ，且 $C_k$ 的状态是 $q_{acc}$ 。

<!-- Sources: L19-TM p.12 -->

**理解用例（自拟）**：用上一页的 $M_1$ 跑输入 `011`。每一步都右移，所以状态记号逐格右移：

$$
q_0011\Rightarrow0q_011\Rightarrow01q_11\Rightarrow011q_2\sqcup\Rightarrow011\sqcup q_{acc}.
$$

读到第一个 1 进 $q_1$ ，第二个 1 进 $q_2$ ，读到空白时在 $q_2$ ，于是接受。最后一个格局的状态是 $q_{acc}$ ，满足接受的定义。

<a id="topic-4"></a>
## 4. 识别器与判定器

![Slide 13 - Recognizers and deciders](assets/11-turing-machines/slide-13.png)

左边两组定义并排：上面是“识别”，下面是“判定”，唯一的差别是下面多了“ $M$ 是判定器”这一条。

| 概念 | 定义 |
| --- | --- |
| $M$ 识别 $A$ | $A=L(M)$ |
| 图灵可识别（Turing-recognizable，也叫半可判定 semi-decidable） | 存在某个 TM $M$ 使 $A=L(M)$ |
| $M$ 判定 $A$ | $A=L(M)$ 且 $M$ 是判定器 |
| 图灵可判定（Turing-decidable） | 存在某个判定器 $M$ 使 $A=L(M)$ |

<!-- Sources: L19-TM p.13; Apple Notes LEC19 -->

右侧的同心圆：正则语言 ⊂ 上下文无关语言 ⊂ 图灵可判定 ⊂ 图灵可识别。每一层都严格包含里面一层；最外两层的差别（存在可识别但不可判定的语言）在[第 12 篇](12-decidability-universality.md)证明。

<!-- Sources: L19-TM p.13 -->

**易错**：识别器**不**要求在所有输入上停机。对不在 $A$ 中的输入，识别器可以拒绝，也可以永远运行；只有对 $A$ 中的输入，它必须最终接受。例如一台 TM 对 $A$ 中的串都接受、对其他串都永远运行，它识别 $A$ ，但不是判定器，因而不判定 $A$ 。学生笔记写成“接受所有合法输入的 TM 是识别器”，更准确的说法是：每台 TM 都识别它自己的语言 $L(M)$ ；“可识别”是语言的性质。

<a id="topic-5"></a>
## 5. 丘奇–图灵论题与希尔伯特第十问题

### 论题内容

![Slide 14 - Church–Turing thesis](assets/11-turing-machines/slide-14.png)

中间的等式是整页的核心：左边“Algorithm”标着 Intuitive（直观），右边“Turing machine”标着 Formal（形式）。**丘奇–图灵论题（Church–Turing thesis，约 1936 年）**说：直观的“算法”= 形式的“图灵机”。每一个“合理的”不受限计算模型都与图灵机等价：λ 演算、重写系统、随机存取机、你最喜欢的编程语言……它对数学影响巨大。两边的照片是 Alonzo Church 和 Alan Turing。

<!-- Sources: L19-TM p.14; W11L1 p.2 -->

L24 的回顾给出一个更强的“计算透镜”说法：每个物理上可实现的过程都能由图灵机完成；课上举的例子是经济学中市场收敛到均衡。

<!-- Sources: L24 p.9 -->

学生笔记的补充（来自第 20 讲）：

- 这是一个**经验性假设（empirical hypothesis）**：等式左边的“算法”“合理”是非形式的概念，数学证明只能在形式对象之间进行，所以论题无法被严格证明；但有大量证据支持——迄今提出的每个合理模型都被证明与 TM 等价；
- 因此“算法可计算”=“图灵可计算”；
- 没有哪种合理模型比标准图灵机更强。

<!-- Sources: Apple Notes LEC20 -->

### 希尔伯特第十问题

![Slide 15 - Hilbert's 10th problem](assets/11-turing-machines/slide-15.png)

1900 年希尔伯特提出 23 个问题，第 10 个是：给出一个算法，判定丢番图方程（整数系数多项式方程，要求整数解）是否有解。幻灯片的例子 $3x^2-2xy-y^2z=7$ 有整数解 $x=1,y=2,z=-2$ （代入： $3-4+8=7$ ）。令

$$
D=\{p\mid p(x_1,\dots,x_k)=0\text{ 有整数解}\}.
$$

1970 年 Matiyasevich 证明 $D$ **不可判定**——这正是“算法”有了精确定义之后才能证明的结论：要说“不存在算法”，先得知道算法是什么。

<!-- Sources: L19-TM p.15 -->

幻灯片底部留了练习：证明 $D$ 是图灵可识别的。思路是**枚举加验证**：按某种顺序（例如按各变量绝对值之和从小到大）枚举所有整数元组，逐个代入；一旦某组值使 $p=0$ 就接受。有解时一定会在有限步内碰到它；无解时机器永远运行——这对“识别”是允许的，却正是它不能成为判定器的地方。这种“搜得到就停、搜不到就一直搜”的结构，是可识别但未必可判定问题的典型形状。

<a id="topic-6"></a>
## 6. 第 20 讲：模拟与编码（据学生笔记）

本节没有本地课件，内容全部来自 Apple Notes "LEC20 Church-Turing Thesis"，作为第 20 讲的有限覆盖保留。

### 多带图灵机

**多带图灵机（multi-tape TM）**：有固定的 $k$ 条纸带与 $k$ 个读写头（其中一条是输入带）。一个格局 = 1 个当前状态 + $k$ 条纸带内容 + $k$ 个读写头位置；一步之内同时写所有纸带、移动所有读写头。

用单带 TM $S$ 模拟多带 TM $M$ ：

- 把 $M$ 各纸带的内容依次接在 $S$ 的一条纸带上，中间用一个不在原纸带字母表中的特殊符号隔开；
- 为了记住 $M$ 各读写头的位置，$S$ 在对应符号上做“标记”；
- 模拟 $M$ 的一步时，$S$ 从头扫到尾读出所有带标记的符号，再扫一遍按 $\delta$ 更新。

<!-- Sources: Apple Notes LEC20 -->

### 非确定图灵机

**非确定图灵机（nondeterministic TM, NTM）**：转移函数可以让一个格局同时走向多个格局；只要最终有一个格局进入 $q_{acc}$ 就接受。

用确定 TM $S$ 模拟 NTM $N$ ：

- 把 $N$ 当前所有格局编码后写在 $S$ 的纸带上，用特殊符号隔开；
- 模拟一步时，$S$ 从左到右扫描这串格局，对每个既非接受也非拒绝的格局应用转移函数，把产生的新格局追加到末尾；
- 一旦出现状态为 $q_{acc}$ 的格局就接受。

<!-- Sources: Apple Notes LEC20 -->

**理解**：这种“逐层展开所有格局”的做法相当于对计算树做广度优先搜索，因此即使某些分支永远运行，也不会错过一个有限深度的接受分支。

### 把机器编码成字符串

为了让图灵机能“读”另一台自动机，要把自动机编码成字符串，记作 $\langle\cdot\rangle$ 。一个好的编码应当：

| 要求 | 含义 |
| --- | --- |
| 可表示 | 能覆盖所有对象 |
| 无歧义 | 不同机器的编码不同： $\langle M_1\rangle\ne\langle M_2\rangle$ |
| 有限 | 编码是有限长的串 |
| 可计算 | 编码能被图灵机处理 |

<!-- Sources: Apple Notes LEC20 -->

编码是下一篇[通用图灵机](12-decidability-universality.md)的前提：程序本身也可以作为输入。

## 本讲自测

1. 写出 $M_1$ （含子串 11）在输入 `0101` 上的格局序列，它最后进入哪个状态？
2. 设计一台 TM 的非正式步骤，识别 $\{w\#w\mid w\in\{0,1\}^*\}$ ；它需要用到“划掉”吗？
3. 一台 TM 在某些输入上永远运行。它能不能是某个语言的识别器？能不能是判定器？
4. 为什么“枚举整数元组”的方法只能说明 $D$ 可识别，而不能说明 $D$ 可判定？
