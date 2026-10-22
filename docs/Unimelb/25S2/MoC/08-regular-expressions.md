# COMP30026 Lecture 14 - Regular Expressions

来源：`lecture/14.pdf`；Apple Notes：CS/25S2/MoC — "LEC14 Regular Expressions"。

这篇讲的是：**能不能不画机器，用一行紧凑的式子描述一个正则语言？这种式子与有限自动机能力相同吗？**

学习路线：[语法与语义](#topic-1) → [从正则表达式到 NFA](#topic-2) → [从 NFA 到正则表达式](#topic-3) → [代数定律与有限自动机的局限](#topic-4)。

重点：正则表达式 ⟺ 正则语言；状态消去的绕行标签 $R_1R_2^*R_3$ 。难点：一般情形的“配方” $(R_1\cup R_2R_3^*R_4)^*R_2R_3^*$ 。易错：混淆 $\varepsilon$ 与 $\emptyset$ ；运算优先级；以为连接可以交换。

<a id="topic-1"></a>
## 1. 语法与语义

### 为什么需要正则表达式

![Slide 3 - Pattern matching](assets/08-regular-expressions/slide-03.png)

上面的框列出 **模式匹配（pattern matching）** 的用途：搜索引擎（代码搜索）、程序的 **词法分析（lexical analysis）**、脚本语言与工具（Perl、grep、awk、sed）、DNA 分析。下面的框问：用有限自动机怎样识别单词 “bug”？

**理解用例（自拟）**：在一段文本里找 “bug”，可以用 4 个状态的 DFA 记录“已经匹配到哪一步”：0（还没匹配）、1（刚读到 b）、2（读到 bu）、3（读到 bug，接受并一直留在这里）。读到不匹配的字符就退回：在 1 或 2 读到 b 回到 1，其他字符回到 0。画机器能解决问题，但每换一个模式就要重画一次；下一页的正则表达式让我们直接写出模式，例如 $\Sigma^*\,bug\,\Sigma^*$ 。

![Slide 4 - Regular expressions as compact notation](assets/08-regular-expressions/slide-04.png)

**正则表达式（regular expression）** 是描述正则语言的紧凑写法。“Restricted patterns”提醒：它只用几种运算，比编程语言里的 regex 功能少。看底部的例子： $(0\cup1)(0\cup1)((0\cup1)(0\cup1))^*$ 先要求两个字符，再接任意多组“两个字符”，所以描述的是“长度为正偶数的二进制串”；在 Python 中写成 `r"(0|1)(0|1)((0|1)(0|1))*"`，其中 `|` 对应 $\cup$ 。

<!-- Sources: L14 p.3-4 -->

### 形式语法与含义

![Slide 5 - Formal syntax and semantics](assets/08-regular-expressions/slide-05.png)

上半部分是 **文法（grammar）**：一个正则表达式要么是单个字符 $a_i$ 、 $\varepsilon$ 、 $\emptyset$ ，要么由更小的正则表达式用并 $\cup$ 、连接 $\circ$ 、星号 $^*$ 拼成。下半部分是 **语义（semantics）**：每个表达式 $R$ 表示一个语言 $L(R)$ ，三种运算分别对应[第 6 篇](06-finite-automata.md#topic-3)的语言并、语言连接和克林闭包。

<!-- Sources: L14 p.5; Apple Notes LEC14 -->

**易错**：注意 $L(\varepsilon)=\{\varepsilon\}$ 与 $L(\emptyset)=\emptyset$ 的区别。前者是“只含空串”的语言，大小为 1；后者是空语言，大小为 0。连接时差别更明显： $\varepsilon R$ 还是 $R$ ，而 $\emptyset R$ 是 $\emptyset$ （第 4 节的定律）。

<!-- Sources: L14 p.5; Apple Notes LEC14 -->

### 省略记号

![Slide 7 - Notational conveniences](assets/08-regular-expressions/slide-07.png)

可以省略 $\circ$ 和部分括号。优先级（binding precedence）从高到低是：星号 > 连接 > 并。看三个例子：星号只作用于紧挨在它前面的那一个符号，所以 $ab^*$ 是 $a\circ(b^*)$ ，不是 $(ab)^*$ ； $a\cup bc^*$ 是 $a\cup(b\circ(c^*))$ ，并最后才算。

<!-- Sources: L14 p.7; Apple Notes LEC14 -->

### 例子

![Slide 9 - Regular expression examples](assets/08-regular-expressions/slide-09.png)

左边是表达式，右边是它表示的语言。几行值得多看一眼：

- $(0\cup\varepsilon)(\varepsilon\cup1)$ ：每个括号“选一个”，共 $2\times2$ 种选法，得 $\{\varepsilon,0,1,01\}$ ；
- $\varepsilon\cup1\cup(\varepsilon\cup1)^*(\varepsilon\cup1)$ 与 $1^*$ 表示同一个语言：同一个语言可以有很多种写法，所以第 4 节的化简定律有用；
- $(1^*0^*)^*=\Sigma^*$ ：单个字符 0 或 1 都属于 $1^*0^*$ ，把若干片拼起来就能得到任何二进制串。

<!-- Sources: L14 p.8-9 -->

<a id="topic-2"></a>
## 2. 从正则表达式到 NFA

### 定理与基本情形

![Slide 10 - Regular expressions to NFAs](assets/08-regular-expressions/slide-10.png)

定理框：**一个语言是正则的，当且仅当它能被某个正则表达式描述。** 本节证明“⇐”方向：对 $R$ 自底向上（形式上用对 $R$ 的结构归纳）构造 NFA。

- **基本情形**（红字）：看中间三张小图。 $R=a$ ：两个状态，一条标 $a$ 的箭头到接受状态； $R=\varepsilon$ ：一个既是起点又是接受状态的状态，什么都不读就接受； $R=\emptyset$ ：一个不接受的起始状态，什么都不接受。
- **归纳步**（底部红字）： $R=R_1\cup R_2$ 、 $R_1\circ R_2$ 、 $R_1^*$ ，直接套用[第 7 篇的封闭性构造](07-nfa-determinisation-minimisation.md#topic-2)。

<!-- Sources: L14 p.10; Apple Notes LEC14 -->

### 例子：一步步拼出 NFA

![Slide 11 - NFA for a union b](assets/08-regular-expressions/slide-11.png)

要把 $(a\cup b)^*bc$ 变成 NFA，从最里层开始：先为 $a$ 、 $b$ 各造一个两状态 NFA（上方两张小图），再用并的构造新建起点，用两条 $\varepsilon$ 分别连过去，得到 $a\cup b$ 的 NFA（下图）。

<!-- Sources: L14 p.11 -->

![Slide 12 - NFA for the whole expression](assets/08-regular-expressions/slide-12.png)

上半部分用星号构造得到 $(a\cup b)^*$ ：最左边新加的起点是接受状态，用 $\varepsilon$ 连到原起点；两条 $\varepsilon$ 从原接受状态指回中间的原起点，允许“再来一段”。下半部分用连接构造依次接上 $b$ 和 $c$ ：上一步所有接受状态（新起点和两个原接受状态）各用一条 $\varepsilon$ 连到 $b$ 的起点，中间再靠 $\varepsilon$ 接上 $c$ 。这样得到的 NFA 状态多、 $\varepsilon$ 多，但构造完全机械；需要更小的机器时，可以再确定化并最小化（见第 7 篇）。

<!-- Sources: L14 p.12 -->

<a id="topic-3"></a>
## 3. 从 NFA 到正则表达式

### 先只留一个接受状态

![Slide 14 - Making a single accept state](assets/08-regular-expressions/slide-14.png)

“⇒”方向：给定 NFA $N=(Q,\Sigma,\delta,I,F)$ ，先把它改成最多只有一个接受状态。若 $|F|\le1$ 不用动；否则新加状态 $q_f$ ，从 $F$ 中每个状态用 $\varepsilon$ 连到 $q_f$ ，让 $q_f$ 成为唯一接受状态：

$$
\delta'(q,v)=\begin{cases}\delta(q,v)\cup\{q_f\} & q\in F,\ v=\varepsilon\\ \delta(q,v) & \text{否则}\end{cases}
$$

看底部的例子： $N$ 有三个接受状态，其中起点本身也是接受状态（双圈）。所以 $N'$ 里除了两条从右侧原接受状态出发的 $\varepsilon$ ，还有一条从起点直接到 $q_f$ 的 $\varepsilon$ ；原来的接受状态都变成单圈。

<!-- Sources: L14 p.13-14; Apple Notes LEC14 -->

### 消到最后剩什么

![Slide 17 - General recipe](assets/08-regular-expressions/slide-17.png)

方法是反复删去既不是起点也不是接受状态的状态；过程中箭头上的标签不再是单个字符，而是正则表达式。消到最后只剩图中两种形状：

- 起点与接受状态不同：起点自环 $R_1$ 、起点到终点 $R_2$ 、终点自环 $R_3$ 、终点回起点 $R_4$ ，结果是 $(R_1\cup R_2R_3^*R_4)^*R_2R_3^*$ ；
- 起点就是接受状态、只有自环 $R$ ：结果是 $R^*$ 。

某些 $R$ 可以是 $\varepsilon$ 或 $\emptyset$ （没有那条箭头就记作 $\emptyset$ ）。

<!-- Sources: L14 p.17 -->

**难点**：读第一个公式时，可以想成“在起点处反复绕圈（要么走自环 $R_1$ ，要么去终点转一圈再回来 $R_2R_3^*R_4$ ），最后一次走到终点并在那里绕圈 $R_2R_3^*$ ”。

### 状态消去

![Slide 20 - The state elimination process](assets/08-regular-expressions/slide-20.png)

顶部的小图是一个将被删去的中间状态：进来的箭头 $R_1$ 、自环 $R_2$ 、出去的箭头 $R_3$ 。删去它时，对每一对“入箭头、出箭头”加一条 **绕行（bypass）** 的新箭头，标签是

$$
R_1R_2^*R_3 .
$$

意思是：先走进来，在这个状态上绕任意多圈，再走出去。若该状态有 $m$ 条入箭头、 $n$ 条出箭头，删去后要加 $m\times n$ 条绕行箭头。**补充**：没有自环时 $R_2=\emptyset$ ，而 $\emptyset^*=\varepsilon$ ，所以标签简化为 $R_1R_3$ 。如果两个状态之间已经有箭头，新旧标签用 $\cup$ 合并成一条。

底部是接下来要用的例子：起点 $A$ 有自环 $0,1$ ，然后 $A\xrightarrow{1}B\xrightarrow{0,1}C\xrightarrow{0,1}D$ ，接受状态为 $C$ 和 $D$ 。

<!-- Sources: L14 p.20; Apple Notes LEC14 -->

### 例子

![Slide 24 - State elimination example](assets/08-regular-expressions/slide-24.png)

从上往下读四行：

1. 新建唯一接受状态 $E$ ，从 $C$ 、 $D$ 用 $\varepsilon$ 连过去；
2. 消去 $D$ ：入 $C\xrightarrow{0\cup1}D$ 、出 $D\xrightarrow{\varepsilon}E$ ，绕行标签是 $(0\cup1)\varepsilon=0\cup1$ ，再与原有的 $C\xrightarrow{\varepsilon}E$ 合并成 $C\xrightarrow{\varepsilon\cup0\cup1}E$ ；同时所有箭头改用正则表达式写（ $0,1$ 写成 $0\cup1$ ）；
3. 消去 $B$ ：得 $A\xrightarrow{1(0\cup1)}C$ ；
4. 消去 $C$ ：得 $A\xrightarrow{1(0\cup1)(\varepsilon\cup0\cup1)}E$ 。

<!-- Sources: L14 p.20-24; Apple Notes LEC14 -->

![Slide 26 - Applying the general recipe](assets/08-regular-expressions/slide-26.png)

最后剩下的图正是第一种形状，所以套用一般配方： $R_1=0\cup1$ ， $R_2=1(0\cup1)(\varepsilon\cup0\cup1)$ ，终点没有自环也没有回到起点的箭头，所以 $R_3=R_4=\emptyset$ 。因为 $\emptyset^*=\varepsilon$ 且 $R_2\emptyset=\emptyset$ ，结果化简为

$$
(0\cup1)^*1(0\cup1)(\varepsilon\cup0\cup1).
$$

意思是：倒数第二位或倒数第三位是 1 的二进制串。学生笔记给出的 Python 写法是 `r"(0|1)*1(0|1)(|0|1)"`，其中 `(|0|1)` 的空分支就对应 $\varepsilon$ 。

<!-- Sources: L14 p.26; Apple Notes LEC14 -->

页底提示：更多细节见 Sipser 教材（Canvas 的 Modules/Resources）。

<!-- Sources: L14 p.26 -->

<a id="topic-4"></a>
## 4. 代数定律与有限自动机的局限

### 代数定律

![Slide 27 - Useful laws for regular expressions](assets/08-regular-expressions/slide-27.png)

![Slide 28 - More useful laws](assets/08-regular-expressions/slide-28.png)

这两页列出化简正则表达式时常用的定律（第一页是并与连接的基本性质，第二页是分配律和星号的性质）。下表逐条解释它们的含义：

| 定律 | 说明 |
| --- | --- |
| $A\cup A=A$ ， $A\cup B=B\cup A$ | 并的幂等与交换 |
| $(A\cup B)\cup C=A\cup(B\cup C)$ | 并的结合，可写成 $A\cup B\cup C$ |
| $(A\circ B)\circ C=A\circ(B\circ C)$ | 连接的结合 |
| $\emptyset\cup A=A\cup\emptyset=A$ | $\emptyset$ 是并的单位元 |
| $\varepsilon\circ A=A\circ\varepsilon=A$ | $\varepsilon$ 是连接的单位元 |
| $\emptyset\circ A=A\circ\emptyset=\emptyset$ | $\emptyset$ 是连接的“零”：没有串可以拿来拼 |
| $(A\cup B)\circ C=(A\circ C)\cup(B\circ C)$ | 右分配 |
| $A\circ(B\cup C)=(A\circ B)\cup(A\circ C)$ | 左分配 |
| $(A^*)^*=A^*$ | 星号幂等 |
| $\emptyset^*=\varepsilon^*=\varepsilon$ | 零个串拼起来是空串 |
| $(\varepsilon\cup A)^*=A^*$ | 多一个空串不改变闭包 |
| $(A\cup B)^*=(A^*B^*)^*$ | 可解释第 1 节的 $(1^*0^*)^*=\Sigma^*$ |

<!-- Sources: L14 p.27-28; Apple Notes LEC14 -->

**易错**：连接**没有**交换律， $AB\ne BA$ ；而 $\emptyset^*=\varepsilon$ 而不是 $\emptyset$ 。另外星号不能分配到并上： $(A\cup B)^*\ne A^*\cup B^*$ 。例如 $ab$ 属于 $(a\cup b)^*$ ，却不属于 $a^*\cup b^*$ ，因为后者的串要么全是 a，要么全是 b。

### 有限自动机能做到哪里

![Slide 29 - Limitations of finite automata](assets/08-regular-expressions/slide-29.png)

最后一页预告下一讲：有限自动机不能向前看（cannot look ahead），只有固定数量的比特记忆。要识别 $\{0^n1^n\mid n\ge0\}=\{\varepsilon,01,0011,000111,\dots\}$ ，需要记住读过几个 0，而 $n$ 没有上界，固定的比特数看起来不够。

页面留下两个练习： $L_1=\{0^n1^n\mid 0\le n\le 999999999\}$ 是否正则？ $L_2=\{w\mid w\text{ 中子串 }01\text{ 与 }10\text{ 出现次数相同}\}$ 呢？两者看起来都要“计数”，但答案可能出人意料。[第 9 篇](09-non-regularity.md#topic-4)先介绍证明不正则的方法，再在最后一节回头分析这两个练习。

<!-- Sources: L14 p.29 -->

## 本讲自测

1. 写出“至少含一个 1”的二进制串的正则表达式，并说出按第 2 节的方法，它的 NFA 由哪些小 NFA、用哪些构造拼成。
2. $a^*\cup b$ 与 $(a\cup b)^*$ 是否相同？各举一个属于其中一个而不属于另一个的串（如果存在）。
3. 一个中间状态有 2 条入箭头 $R_1,R_1'$ 、3 条出箭头 $S_1,S_2,S_3$ ，自环为 $0$ 。消去它后要加几条箭头？写出其中一条的标签。
4. 用定律化简 $(\varepsilon\cup0)^*\emptyset\cup1$ 。
