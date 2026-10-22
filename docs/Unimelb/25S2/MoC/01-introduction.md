# COMP30026 Lecture 1 - Introduction: Why Study Models of Computation

来源：`lecture/01.pdf`；Apple Notes：CS/25S2/MoC — "Lec01-02 Basic Concepts"。

这篇讲的是：**计算机科学为什么离不开数学化的“模型”？把一个问题写成逻辑公式，能带来什么好处？**

学习路线：[开场的三个问题](#topic-1) → [课程的两条主线](#topic-2) → [数学语言与基本符号](#topic-3) → [把谜题编码成公式](#topic-4) → [学习方式与考核](#topic-5)。

重点：把问题翻译成命题公式，再问“能不能满足”。难点：从具体谜题抽象出布尔变量和约束。易错：把“公式可满足”理解成“公式恒为真”。

<a id="topic-1"></a>
## 1. 开场：三个可以交给逻辑的问题

### 数独：难题也能交给求解器

![Slide 4 - Sudoku as a hard algorithmic problem](assets/01-introduction/slide-04.png)

左边是一道普通数独。右边两句话是本讲的主线：先把规则写成**逻辑编码**（logical encoding），就能很快得到一个高效的求解器；很多类似的“难”任务也能这样处理。这里先不讲怎样编码，[第 4 节](#topic-4)回到这道题给出完整做法。

### 打印管理器：对所有执行路径提问

![Slide 7 - Printer manager](assets/01-introduction/slide-07.png)

这是一个两用户打印管理器的状态图。每个圆圈是一个**状态**（state），名字由两部分组成： $I_i$ 表示用户 $i$ 空闲， $R_i$ 表示用户 $i$ 发出了打印请求， $P_i$ 表示正在为用户 $i$ 打印。例如 $R_A I_B$ 表示 A 在等打印、B 空闲。顶部没有起点的箭头指向初始状态 $I_A I_B$ ；其他箭头表示系统可以从一个状态走到另一个状态。

右下角提出两个问题：

1. 每个 $P_i$ （正在打印）之前是不是一定先出现过 $R_i$ （发出请求）？——这是“坏事不会发生”型的问题；
2. 每个 $R_i$ 之后是不是**最终**一定会出现 $P_i$ ？——这是“好事终将发生”型的问题。

<!-- Sources: L01 p.5-7 -->

这类问题不能靠运行几次程序回答，因为路径可能无限长；需要把系统写成数学对象，再对**所有**路径推理。两个问题的难度也不同：第一个问题只要找到一条有限路径，让 $P_i$ 出现在任何 $R_i$ 之前，就足以否定；第二个问题的反例是一条“永远等不到打印”的无限执行，看有限片段无法下结论。后面学到的有限自动机正是这种“状态 + 转移”的模型。

### 地图着色

![Slide 8 - Coloring a map](assets/01-introduction/slide-08.png)

美国地图只用四种颜色，就让每两个相邻的州颜色不同。“相邻区域不同色”和数独规则一样，都是一组局部约束；[第 4 节](#topic-4)的编码方法可以直接搬过来：给“区域 $r$ 染颜色 $c$ ”设一个布尔变量，再为每对相邻区域写“不同色”的子句。

<!-- Sources: L01 p.8 -->

<a id="topic-2"></a>
## 2. 课程的两条主线

### 理论在计算机科学里的位置

![Slide 17 - What do we need all this theory for](assets/01-introduction/slide-17.png)

计算机科学最初就是从数学里长出来的，今天很多核心问题仍然要用数学语言来精确表达。看左列蓝字，从上到下依次是：语法（syntax，什么程序“写对格式”）、类型系统（type systems，什么程序类型正确）、语义（semantics，运行会发生什么）、规约（specification，程序本来应该做什么）、验证（verification，证明程序不会崩溃并满足规约）、复杂度（complexity，需要多少时间与内存）；最后一行补充了算法设计、密码学、程序分析、程序合成等方向。底部强调：这些问题在工业界和研究中都在使用。

<!-- Sources: L01 p.9-17 -->

### 自动机理论与形式语言理论

![Slide 18 - Automata theory](assets/01-introduction/slide-18.png)

**自动机理论**（automata theory）研究各种理想化的计算机器：它们怎样工作、能计算什么（可计算性，computability）、以及怎样证明它们的基本性质。

![Slide 19 - Formal language theory](assets/01-introduction/slide-19.png)

**形式语言理论**（formal language theory）研究“字符串的集合”，和自动机理论紧密相连。最后一行的问题——哪一类文法对应哪一类自动机——是课程后半段的主线：正则表达式对应有限自动机，上下文无关文法对应下推自动机。

<!-- Sources: L01 p.18-19 -->

课程前半段先学**逻辑**（命题逻辑、谓词逻辑、自动推理），后半段学**自动机与可计算性**（有限自动机、正则表达式、上下文无关语言、图灵机、不可判定性）。

<a id="topic-3"></a>
## 3. 数学语言与基本符号

### 为什么要用数学词汇

![Slide 24 - Basic mathematical vocabulary](assets/01-introduction/slide-24.png)

自然语言冗长又容易有歧义。数学为了说得**精确**，有自己的一套词汇，核心是**定义**（definition）和**证明**（proof）。学它像学一门新语言：开始会觉得别扭，只有多用才能掌握。

<!-- Sources: L01 p.21-24 -->

学生笔记补充了几个常见词：

| 英文 | 中文 | 含义 |
| --- | --- | --- |
| axiom | 公理 | 不加证明、直接接受的出发点 |
| theorem | 定理 | 经过证明的重要结论 |
| corollary | 推论 | 由某个定理很快得到的结论 |

<!-- Sources: Apple Notes Lec01-02 -->

### 四个基本符号

![Slide 25 - Basic symbols](assets/01-introduction/slide-25.png)

本讲先出现四个符号： $\land$ 读作且（合取）， $\lor$ 读作或（析取）， $\to$ 读作蕴含， $\lnot$ 读作非（否定）。下一讲给出完整定义和真值表，并引入 $\bot$ 、 $\top$ 、 $\leftrightarrow$ 。

<!-- Sources: L01 p.25 -->

常用推理规则（如 modus ponens）放在[第 2 篇的“语义推论”部分](02-propositional-logic.md#topic-3)统一讲。

<a id="topic-4"></a>
## 4. 把谜题编码成公式

### 数独的布尔编码

![Slide 32 - Sudoku encoding](assets/01-introduction/slide-32.png)

左边网格把每个格子编号为 $ij$ （第 $i$ 行第 $j$ 列），右边是待解的数独。编码方法是引入布尔变量（Boolean variable）：

$$
x_{ijd} = \text{true} \iff \text{格子 } (i,j) \text{ 填数字 } d .
$$

<!-- Sources: L01 p.26 -->

蓝框里的公式是逐步写出来的。前几步先写一个具体子句：格子 $11$ 至少有一个数字，就是 $x_{111}\lor x_{112}\lor\dots\lor x_{119}$ ；再对格子 $12$ 、 $13$ ……各写一个，用 $\land$ 连起来。最终一步把同一件事缩写成 $\bigwedge\{\text{at-least-one}(\dots)\mid i,j\in D\}$ ，其中 $D=\{1,\dots,9\}$ 。完整的约束有：

- 每个格子**至少**有一个数字（at-least-one）；
- 每个格子**至多**有一个数字（at-most-one）；
- 每行、每列、每个 $3\times 3$ 宫格中数字不重复（slide 上的 “rows, columns, ...”）；
- 已给出的数字直接写成真变量。

所有约束用 $\land$ 连起来，得到一个大公式。最底一行是关键结论：

$$
\text{公式可满足（能找到一组 } x_{ijd} \text{ 的取值使其为真）} \iff \text{数独有解}.
$$

<!-- Sources: L01 p.27-32 -->

**易错**：可满足（satisfiable）只要求**存在**一组取值使公式为真，而那组取值就是数独的一个解；它不是说公式在所有取值下都为真。

**理解用例（自拟）**：“三个变量 $a,b,c$ 至多一个为真”可以写成两两不同时为真： $(\lnot a\lor\lnot b)\land(\lnot a\lor\lnot c)\land(\lnot b\lor\lnot c)$ 。任意两个同时为真，就会让对应的括号变假。

### 毕达哥拉斯三元组染色

![Slide 34 - Pythagorean triples colouring encoding](assets/01-introduction/slide-34.png)

问题：能否把自然数 $1,\dots,n$ 染成两种颜色，使得每个满足 $x^2+y^2=z^2$ 的三元组 $(x,y,z)$ 都**不是**同色？（例如 $3^2+4^2=5^2$ 、 $5^2+12^2=13^2$ 。）

蓝框是编码：变量 $x_i$ 为真表示数字 $i$ 染红色（只有两种颜色，所以为假就是另一种颜色）。对每个三元组 $a^2+b^2=c^2$ 加两个子句：

$$
(x_a\lor x_b\lor x_c)\land(\lnot x_a\lor\lnot x_b\lor\lnot x_c).
$$

第一个子句禁止“三个都不红”，第二个禁止“三个都红”；两个合起来正好是“不同色”。

<!-- Sources: L01 p.33-34 -->

### 结果：一个 200 TB 的证明

![Slide 38 - Solution of the triples problem](assets/01-introduction/slide-38.png)

红色的 NO：当且仅当 $n\ge 7825$ 时无法染色。这个结论在 2016 年用 800 个处理器的超级计算机算了约 2 天，留下一个约 200 TB 的“不可满足”证明。注意“不能染色”对应的是公式**不可满足**：求解器要说明“所有取值都失败”，而不是找到一个解，所以才需要一个巨大的证明。

<!-- Sources: L01 p.35-38 -->

**重点**：“把问题编码成命题公式 → 问是否可满足（satisfiable）”这条思路会在[命题逻辑](02-propositional-logic.md)和[归结法](03-resolution.md)里反复出现。

<a id="topic-5"></a>
## 5. 学习方式与考核

课件最后三页是课程安排：教学材料每周发布在 LMS 上，问题可以在课上、Ed 讨论区或每周五的答疑时间提出；只看讲座学不会解题，需要刻意练习，tutorial 从第 1 周开始。

<details markdown="1"><summary>补充：考核方式（2025 S2）</summary>

- 期末 3 小时考试，占 70%；
- 两次作业（约第 6 周和第 11 周截止），各占 12%；
- 每周 worksheet 共 12 份，取最好的 9 份；不延期、不补交。

</details>

<!-- Sources: L01 p.39-41 -->

## 本讲自测

1. 用 $x_{ijd}$ 的记号，写出“第 1 行中数字 5 至少出现一次”的子句。
2. 如果三元组问题改成用三种颜色染色，变量应怎样设？“三个数不全同色”需要哪些子句？
3. 两个相邻区域 $u,v$ 只用红、蓝两色，变量 $r_u$ 、 $r_v$ 表示染红。写出“ $u,v$ 不同色”的子句。
4. 数独公式可满足，与数独有唯一解，是不是同一件事？
