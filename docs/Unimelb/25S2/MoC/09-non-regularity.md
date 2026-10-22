# COMP30026 Lectures 15–16 - Proving Non-Regularity: Fooling Sets and Closure

来源：`lecture/w8l1-slides.pdf`（第 15 讲）、`lecture/w8l2-slides.pdf`（第 16 讲），均为手写板书；Apple Notes：CS/25S2/MoC — "LEC15-16 Proving Non-regularity"。

这篇讲的是：**怎样证明“没有任何 DFA 能识别某个语言”？——不是“我没想出来”，而是“不可能存在”。**

学习路线：[两条路线与无记忆性](#topic-1) → [可区分的串](#topic-2) → [愚弄集引理](#topic-3) → [用封闭性证明不正则](#topic-4)。

重点：无记忆性引理、愚弄集引理及 $\{0^n1^n\}$ 的证明。难点：为任意 $k$ 构造大小为 $k$ 的愚弄集并给出区分后缀。易错：只给出一个有限的愚弄集就断言“不正则”；用封闭性时把推理方向弄反；把“看起来要计数”当成不正则的证明。

板书页都是手写的，图中红、蓝、绿等颜色是讲者用来区分“过去/将来”“前缀/后缀”或标出重点的；下文会逐页说明颜色的含义。

<a id="topic-1"></a>
## 1. 两条路线与无记忆性

### 本讲的两种方法

![W8L1 slide 1 - Two ways to prove non-regularity](assets/09-non-regularity/slide-w8l1-01.png)

第一页给出两条路线：

1. **愚弄集（fooling set）**：把有限自动机的“无记忆性（memorylessness）”（红字）形式化，从而证明某个语言需要的状态数没有上限；
2. **封闭性（closure properties）**：借助“另一个语言已知不正则”这一事实，用正则语言的运算封闭性反推。

紧接着的两页是提醒和标题：这部分内容较难，讲者建议多读几遍、多做练习；标题页写着“Fooling Sets vs Pumping Lemma”。课程用愚弄集代替传统教材中的 **泵引理（pumping lemma）**，两者都能证明不正则；第 24 讲的课程反馈页也提到这次把泵引理换成了愚弄集。

<!-- Sources: W8L1 p.1-3; L24 p.14 -->

### 愚弄集路线图

![W8L1 slide 4 - Fooling sets roadmap](assets/09-non-regularity/slide-w8l1-04.png)

红字给出两步目标：

1. 先证明 **下界（lower bound）**：例如“任何少于 5 个状态的 DFA 都不能识别 $L$ ”；
2. 再推广到所有 $k$ ：若对**每个** $k>0$ ，少于 $k$ 个状态的 DFA 都不能识别 $L$ ，那么没有任何（有限的）DFA 能识别 $L$ ，即 $L$ 不正则。

右边的 4 状态 DFA 是本讲反复使用的演示机器：起点 $q_0$ （也是接受状态）读 0 到 $q_1$ 、读 1 到 $q_2$ ；它只用来演示记号，它识别什么语言并不重要。

<!-- Sources: W8L1 p.1, p.4; Apple Notes LEC15-16 -->

### 回顾：DFA 的五个部分

![W8L1 slide 5 - Finite automaton definition recap](assets/09-non-regularity/slide-w8l1-05.png)

这一页复习 DFA 的定义：字母表 $\Sigma$ 、状态集 $Q$ 、初始状态 $q_0$ 、转移函数 $\delta:Q\times\Sigma\to Q$ 、接受状态集 $F$ 。绿色高亮强调转移函数：输入“当前状态、下一个字符”，输出“下一个状态”。下方左边是填到一半的转移表，右边是对应的状态图；两种表示的详细说明见[第 6 篇](06-finite-automata.md#topic-2)。

### 扩展转移函数

![W8L1 slide 6 - Extended transition function](assets/09-non-regularity/slide-w8l1-06.png)

$\delta$ 一次只读一个字符。**扩展转移函数（extended transition function）** $\delta^*(q,w)$ 表示从状态 $q$ 出发、读完整个串 $w$ 后到达的状态（蓝字：第一个参数是当前状态，第二个是剩下的输入）：

$$
\delta^*(q,w)=\delta(\cdots\delta(\delta(q,w_1),w_2)\cdots,w_n).
$$

板书下半部分引入两个记号：

1. **结果状态（resulting state）**： $q(w)=\delta^*(q_0,w)$ ，即从起点读完 $w$ 停在哪里；
2. **前缀–后缀分解（prefix-suffix decomposition）**：把 $w$ 拆成红色前缀 $x$ 和蓝色后缀 $y$ ， $w=xy$ 。于是 $q_0\xrightarrow{x}q(x)\xrightarrow{y}q(xy)$ ，即 $q(xy)=\delta^*(q(x),y)$ 。

左下的例子把 $01011$ 拆成 $010$ 和 $11$ ：在右边的 DFA 上， $q_0\xrightarrow{0}q_1\xrightarrow{1}q_1\xrightarrow{0}q_2$ ，所以 $q(010)=q_2$ ；再读 $11$ ： $q_2\xrightarrow{1}q_3\xrightarrow{1}q_1$ ，所以 $q(01011)=\delta^*(q_2,11)=q_1$ 。

<!-- Sources: W8L1 p.6; Apple Notes LEC15-16 -->

### 关键结论：将来只看现在

![W8L1 slide 7 - Key takeaway](assets/09-non-regularity/slide-w8l1-07.png)

三个串的红色部分是“过去”（前缀 $010$ 、 $00$ 、 $1$ ），蓝色部分是“将来”（同一个后缀 $110110$ ）。在右边的 DFA 上可以核对：三个红色前缀读完后都停在 $q_2$ （例如 $q_0\xrightarrow{0}q_1\xrightarrow{0}q_2$ ， $q_0\xrightarrow{1}q_2$ ）。之后的转移**只**取决于两样东西：①当前状态；②将来的输入。过去怎样走到这里，DFA 完全不记得，所以三个完整串的结果必然相同。

<!-- Sources: W8L1 p.7 -->

![W8L1 slide 8 - Memorylessness lemma](assets/09-non-regularity/slide-w8l1-08.png)

把上一页写成引理。**无记忆性引理**：对任意串 $x,y$ ，若 $q(x)=q(y)$ ，则对每个串 $z$ 都有 $q(xz)=q(yz)$ 。右侧的推论：于是 $M$ 要么同时接受 $xz$ 与 $yz$ ，要么同时拒绝。左下的例子取 $x=010$ 、 $y=00$ （上一页已知两者都到 $q_2$ ），接上同一个蓝色后缀 $z=101$ ，两个串的命运一定相同。

<!-- Sources: W8L1 p.8; Apple Notes LEC15-16 -->

### 第一个应用：1 状态 DFA

![W8L1 slide 9 - Languages of 1-state DFAs](assets/09-non-regularity/slide-w8l1-09.png)

若 $M$ 只有 1 个状态（右边的 $q_0$ ，所有字符都自环），则所有串的结果状态相同（板书最后一行的证明）。所以 $M$ 要么接受一切、要么拒绝一切，即 $L(M)=\Sigma^*$ 或 $L(M)=\emptyset$ 。这是“状态太少就识别不了”的最小例子，下一节把它推广。

<!-- Sources: W8L1 p.9; Apple Notes LEC15-16 -->

<a id="topic-2"></a>
## 2. 可区分的串

### 定义

![W8L1 slide 10 - Distinguishable pairs and distinguishing suffixes](assets/09-non-regularity/slide-w8l1-10.png)

设 $L$ 是语言， $x,y$ 是任意串（板书特别注明：不必属于 $L$ ）。若存在 $z$ 使得

$$
(xz\in L\text{ 且 }yz\notin L)\quad\text{或}\quad(xz\notin L\text{ 且 }yz\in L),
$$

就称 $x,y$ 关于 $L$ **可区分（distinguishable）**，箭头指向的 $z$ 叫 **区分后缀（distinguishing suffix）**。也就是：加上同一个后缀后，一个进 $L$ 、一个不进。

底部的例子： $L$ 是偶数长度的串。 $\varepsilon$ 与 $0$ 用后缀 $0$ 区分： $\varepsilon0=0$ 长度为奇数，不在 $L$ 中； $00$ 长度为偶数，在 $L$ 中。

<!-- Sources: W8L1 p.10; Apple Notes LEC15-16 -->

![W8L1 slide 11 - Distinguishing example for strings ending in 10](assets/09-non-regularity/slide-w8l1-11.png)

第二个例子： $L$ 是以 10 结尾的串。取 $x=1$ 、 $y=0$ ，后缀 $z=0$ ：得到 $xz=10\in L$ ，而 $yz=00\notin L$ ，所以 $1$ 与 $0$ 可区分。

<!-- Sources: W8L1 p.10-11 -->

### 可区分 ⇒ 状态不同

![W8L2 slide 3 - Distinguishable strings reach different states](assets/09-non-regularity/slide-w8l2-03.png)

第 16 讲从这条引理开始（前两页是引自 Jeff Erickson 讲义的题词页和课程通知）。黑字是原表述，红字是讲者改写的更清楚版本：对每个识别 $L$ 的 DFA $M$ ，若 $x,y$ 关于 $L$ 可区分，则 $q(x)\ne q(y)$ 。

底部推论：只要 $L$ 有至少一对可区分的串，1 状态 DFA 就识别不了它（因为 1 状态 DFA 中所有串的结果状态相同）。

![W8L2 slide 11 - Why distinguishable strings need separate states](assets/09-non-regularity/slide-w8l2-11.png)

这页是 PDF 最后一页的补充板书，解释上面的引理为什么成立，并预告下一节。上半部分是逆否推理：若 $z$ 区分 $x,y$ ，即 $xz\in L$ 、 $yz\notin L$ ，那么 $q(xz)\ne q(yz)$ （一个是接受状态、一个不是）；而若 $q(x)=q(y)$ ，无记忆性引理会给出 $q(xz)=q(yz)$ ，矛盾，所以 $q(x)\ne q(y)$ 。

下半部分把它推广到三个串：若 $w,x,y$ 两两可区分，则 $q(w)$ 、 $q(x)$ 、 $q(y)$ 两两不同，图中三个圈之间都标着 $\ne$ ，所以 DFA 至少要 3 个状态。这正是下一节愚弄集引理的思路。

<!-- Sources: W8L2 p.3, p.11; Apple Notes LEC15-16 -->

<a id="topic-3"></a>
## 3. 愚弄集引理

### 定义与引理

![W8L2 slide 4 - Fooling set definition and lemma](assets/09-non-regularity/slide-w8l2-04.png)

**定义**：串的集合 $F$ 是 $L$ 的 **愚弄集（fooling set）**，当且仅当 $F$ 中每一对**不同的**（红字 $x\ne y$ ）串都关于 $L$ 可区分。

**愚弄集引理**：若 $F$ 是 $L$ 的愚弄集且 $|F|=k$ ，则每个识别 $L$ 的 DFA 至少有 $k$ 个状态。进一步，若对**每个** $k$ 都存在大小至少为 $k$ 的愚弄集 $F_k$ ，则 $L$ 不正则。

**易错**：找到一个大小为 100 的愚弄集，只说明需要至少 100 个状态，并不说明不正则；要证明不正则，必须给出一族愚弄集，对**任意** $k$ 都能造出来。

<!-- Sources: W8L2 p.4-5; Apple Notes LEC15-16 -->

![W8L2 slide 5 - Proof of the fooling set lemma](assets/09-non-regularity/slide-w8l2-05.png)

横线下面是证明：设 $M$ 只有 $k-1$ 个状态。 $F$ 有 $k$ 个串，由 **鸽巢原理（pigeonhole principle, PHP）**，必有两个不同的 $x,y\in F$ 落到同一状态 $q(x)=q(y)$ ；于是对所有 $z$ ， $M$ 对 $xz,yz$ 同时接受或同时拒绝。但 $x,y$ 可区分，矛盾。所以 $M$ 至少要 $k$ 个状态。

<!-- Sources: W8L2 p.5 -->

**补充（来自学生笔记，已更正）**：若找到的愚弄集大小恰好等于某个识别 $L$ 的 DFA 的状态数，那么这个 DFA 就是最小的。学生笔记还写着“并不总能构造出这样刚好够用的愚弄集”，这一句不对。**延伸内容**：对任意正则语言，在它的最小（完整）DFA 中，每个状态各取一个到达它的串，这些串两两可区分（否则两个状态可以合并），所以总有一个大小等于最小 DFA 状态数的愚弄集（Myhill–Nerode 定理）。注意死状态也要算进去：若只数省略死状态的“不完整”DFA，才会出现愚弄集比状态数多一的情况。

<!-- Sources: Apple Notes LEC15-16 -->

### 例：以 10 结尾的串至少要 3 个状态

![W8L2 slide 6 - Fooling set for strings ending in 10](assets/09-non-regularity/slide-w8l2-06.png)

取 $F=\{\varepsilon,1,10\}$ ，板书在每一对右边写出区分后缀：

- $(\varepsilon,1)$ ：后缀 $0$ ，因为 $10\in L$ 而 $0\notin L$ ；
- $(\varepsilon,10)$ ：后缀 $\varepsilon$ ，因为 $10\in L$ 而 $\varepsilon\notin L$ ；
- $(1,10)$ ：后缀 $\varepsilon$ ，同理。

三对都可区分，所以识别 $L$ 至少需要 3 个状态。三个串恰好对应“还没有进展”“刚读到 1”“刚读完 10”三种需要记住的情况。

<!-- Sources: W8L2 p.6 -->

### 例：0^n 1^n 不正则

![W8L2 slide 7 - Fooling set for 0^n 1^n](assets/09-non-regularity/slide-w8l2-07.png)

要对**每个** $k$ 找大小为 $k$ 的愚弄集。图中四个串 $1,01,001,0001$ 两两用红线相连，线上标的是区分后缀：例如 $1$ 与 $01$ 之间标 $\varepsilon$ （ $01\in L$ 、 $1\notin L$ ）， $001$ 与 $0001$ 之间标 $11$ （ $000111\in L$ 、 $00111\notin L$ ）。一般地取

$$
F_k=\{1,\ 01,\ 001,\ \dots,\ 0^{k-1}1\}=\{0^i1\mid 0\le i\le k-1\}.
$$

对任意 $0\le i<j\le k-1$ ，取后缀 $z=1^{j-1}$ （板书底部的红字）：

- $0^j1\cdot1^{j-1}=0^j1^j\in L$ ；
- $0^i1\cdot1^{j-1}=0^i1^j\notin L$ （因为 $i\ne j$ ）。

所以 $F_k$ 是大小为 $k$ 的愚弄集；对每个 $k$ 都成立，于是 $L$ 不正则。

<!-- Sources: W8L2 p.7; Apple Notes LEC15-16 -->

**难点**：愚弄集的选法不唯一。课件的串都已读入一个 1，后缀只需补齐剩下的 $j-1$ 个 1；**理解用例（自拟）**：改用 $\{0^i\mid 0\le i\le k-1\}$ 同样可行，对 $i<j$ 用后缀 $1^j$ 区分 $0^i$ 与 $0^j$ 。

### 构造愚弄集的策略

![W8L2 slide 8 - Strategies for fooling sets](assets/09-non-regularity/slide-w8l2-08.png)

没有万能方法，但板书给出三条经验：

1. 考虑 $L$ 中串的**前缀**（上例的 $0^i1$ 都是 $L$ 中串的前缀）；
2. 关注需要“数到至少 $k$ ”的计数过程（上例要数 0 的个数）；
3. 找一个对所有对都通用的区分后缀形式（上例的 $1^{j-1}$ ）。

<!-- Sources: W8L2 p.8; Apple Notes LEC15-16 -->

<a id="topic-4"></a>
## 4. 用封闭性证明不正则

### 两条反向用的定理

![W8L2 slide 9 - Non-regularity via closure](assets/09-non-regularity/slide-w8l2-09.png)

上半部分把封闭性定理“反过来”用。绿色与粉色高亮的就是这两条反向用法：

| 正向 | 反向（用来证明不正则） |
| --- | --- |
| $A,B$ 正则 ⇒ $A\cap B$ 正则 | 若 $A\cap B$ **不**正则而 $A$ 正则，则 $B$ 不正则 |
| $A$ 正则 ⇒ $A^c$ 正则 | 若 $A^c$ 不正则，则 $A$ 不正则 |

（板书第一行写的是并，但下面高亮的反向用法用的是交；交的封闭性见[第 7 篇](07-nfa-determinisation-minimisation.md#topic-2)。）

<!-- Sources: W8L2 p.9; Apple Notes LEC15-16 -->

下半部分的例子： $B=$ “0 和 1 个数相等的串”（ $\varepsilon,01,10,0011,1010,\dots$ ）。取正则语言 $A=0^*1^*$ ，则 $A\cap B=\{0^n1^n\mid n\ge0\}$ ，上一节已证它不正则，所以 $B$ 不正则。思路是：用一个简单的正则语言 $A$ 把 $B$ “过滤”成已知不正则的语言。

<!-- Sources: W8L2 p.9 -->

![W8L2 slide 10 - Complement example](assets/09-non-regularity/slide-w8l2-10.png)

第二个例子用补：设 $B$ 是“0 和 1 个数**不**相等的串”，则 $B^c$ 就是上一页“个数相等”的语言，已知不正则，所以 $B$ 也不正则。注意这一页的 $B$ 与上一页的 $B$ 恰好互补。

<!-- Sources: W8L2 p.10 -->

### 两种方法的比较

| | 愚弄集 | 封闭性 |
| --- | --- | --- |
| 证明长度 | 往往较长 | 往往短得多 |
| 适用范围 | 不正则的语言总能用它证明 | 不一定总能用上 |
| 难点 | 构造愚弄集与区分后缀 | 需要找到合适的辅助语言（如 $A$ 或 $L^c$ ） |

<!-- Sources: Apple Notes LEC15-16 -->

**易错**：封闭性只能“从正则推出正则”。由“ $A$ 不正则、 $B$ 不正则”推不出 $A\cap B$ 的任何结论；证明时，被用作“已知”的那个语言必须是**正则**的。

### 易错：看起来要计数，不等于不正则

[第 14 讲最后一页](08-regular-expressions.md#topic-4)留下两个练习，正好说明“需要计数”的直觉可能骗人：

- $L_1=\{0^n1^n\mid 0\le n\le 999999999\}$ **正则**：它是有限语言（只有 $10^9$ 个串），任何有限语言都能写成有限个串的并，于是是正则表达式。DFA 可能很大，但状态数有限；愚弄集只能做到有限大小，所以证明不了它不正则。
- $L_2$ = “子串 01 与 10 出现次数相同的二进制串”也**正则**：在二进制串中，01（由 0 变 1）与 10（由 1 变 0）必然交替出现，所以二者次数相等当且仅当串为空或首尾字符相同，例如 $\varepsilon\cup0\cup1\cup0(0\cup1)^*0\cup1(0\cup1)^*1$ 。

所以证明不正则时不能只凭“好像要数数”，必须给出任意大的愚弄集或一个封闭性论证。

<!-- Sources: L14 p.29 -->

## 本讲自测

1. 对 $L=\{w\mid w\text{ 含子串 }11\}$ 找一个大小为 3 的愚弄集，并写出每一对的区分后缀。
2. 用愚弄集证明 $\{0^n1^m\mid n>m\}$ 不正则。
3. 用封闭性证明 $\{0^n1^m\mid n\ne m\}$ 不正则（提示：先想它与哪个正则语言的交或补有关）。
4. 有人说：“ $\{w\mid w\text{ 中 0 的个数是 3 的倍数}\}$ 也要计数，所以不正则。”这个说法对吗？用本讲的工具说明理由。
