# COMP30026 Lecture 13 - NFA Determinisation and DFA Minimisation

来源：`lecture/13.pdf`；Apple Notes：CS/25S2/MoC — "LEC13 NFA Determinisation and Minimisation"。

这篇讲的是：**非确定性看起来让机器更强，它真的更强吗？怎样把 NFA 变成等价的 DFA，又怎样把 DFA 变成状态最少的那一个？**

学习路线：[子集构造：NFA 变 DFA](#topic-1) → [用 NFA 证明封闭性](#topic-2) → [最小 DFA 与 Brzozowski 算法](#topic-3)。

重点：子集构造与 $\varepsilon$ 闭包；并、连接、星号的 NFA 构造。难点：Brzozowski 算法中的两次“反转—确定化”。易错：确定化时忘记先取 $\varepsilon$ 闭包；忘记补上对应空集的死状态。

<a id="topic-1"></a>
## 1. 子集构造：NFA 变 DFA

### 等价与定理

![Slide 4 - Equivalence and the NFA-to-DFA theorem](assets/07-nfa-determinisation-minimisation/slide-04.png)

先看上面的定义框：两台机器**等价（equivalent）**，当且仅当它们识别同一个语言，也就是对每个字符串给出相同的接受/拒绝结论。机器内部长得多不一样都没关系，只看“接受哪些串”。

下面的定理说：**每个 NFA 都有一个等价的 DFA**。最后一行给出方法：用 DFA 去**模拟（simulate）** NFA。NFA 在读输入时可能同时“处在”好几个状态（见[第 6 篇的 NFA 部分](06-finite-automata.md#topic-4)）；DFA 只要把“NFA 此刻**可能**处在的所有状态的集合”当成自己的一个状态，就能一步一步跟上。这就是 **子集构造（subset construction）**。

<!-- Sources: L13 p.4; Apple Notes LEC13 -->

### 例子：一步步做子集构造

![Slide 7 - Subset construction table](assets/07-nfa-determinisation-minimisation/slide-07.png)

右上是要转换的 NFA：起点是 1，唯一的接受状态是 2（双圈）；1 读 a 到 2，1 经 $\varepsilon$ 免费到 3，3 读 a 回到 1，2 读 a 或 b 留在 2，2 读 b 到 3。右下的表是逐步填出来的 DFA 转移表，行是 DFA 状态（一个 NFA 状态集合），列是输入字符。

<!-- Sources: L13 p.5 -->

按表从上往下读：

1. 起点 1 不读任何字符就能经 $\varepsilon$ 到 3，所以 DFA 的起始状态是 $A=\{1,3\}$ ；
2. 从 $\{1,3\}$ 读 a：1 到 2，3 到 1，再取 $\varepsilon$ 闭包把 1 能免费到达的 3 补上，得 $B=\{1,2,3\}$ ；读 b：1 和 3 都没有 b 转移，表里记作“–”，即空集；
3. 从 $\{1,2,3\}$ 读 a 回到 $\{1,2,3\}$ ，读 b 得 $C=\{2,3\}$ ；
4. 从 $\{2,3\}$ 读 a 得 $\{1,2,3\}$ ，读 b 得 $\{2,3\}$ ；
5. 左下红字强调“**包含**”：只要集合里含有 NFA 的接受状态 2，它就是 DFA 的接受状态（标 $*$ ）。所以 $B$ 和 $C$ 接受， $A$ 不接受。

<!-- Sources: L13 p.6-7 -->

![Slide 8 - Resulting DFA with dead state](assets/07-nfa-determinisation-minimisation/slide-08.png)

这是画出来的结果。和上一页的表相比，多了一行 $D=\emptyset$ ：上一页中“–”的位置现在指向 $D$ 。 $D$ 是一个**死状态（dead state）**：进入后无论读什么都留在原地（看 $D$ 上的 a, b 自环），而且永不接受。加上它，转移函数在每个状态、每个字符上都有定义，才符合 DFA 的要求。

<!-- Sources: L13 p.8 -->

### 形式化

![Slide 10 - Subset construction formally](assets/07-nfa-determinisation-minimisation/slide-10.png)

上半部分先定义 $\varepsilon$ **闭包（closure）** $E(R)$ ：从集合 $R$ 中某个状态出发，沿 0 条或多条 $\varepsilon$ 转移能到达的所有状态。“0 条”意味着 $R\subseteq E(R)$ ，原来的状态总在里面。

下半部分是 DFA $M$ 的四个组成：

$$
Q'=\mathcal{P}(Q),\quad q_0'=E(\{q_0\}),\quad F'=\{R\in Q'\mid R\text{ 含 }N\text{ 的接受状态}\},\quad \delta'(R,a)=\bigcup_{r\in R}E(\delta(r,a)).
$$

逐项读：DFA 的状态是 NFA 状态集的子集（ $\mathcal{P}(Q)$ 是幂集）；起点是起始状态的 $\varepsilon$ 闭包；接受状态是“含有 NFA 接受状态”的子集；转移是“集合里每个状态各走一步 a，再各自取 $\varepsilon$ 闭包，最后取并”。最下面的定理框说这样得到的 $M$ 与 $N$ 等价。

<!-- Sources: L13 p.10; Apple Notes LEC13 -->

**易错**：起点必须是 $E(\{q_0\})$ 而不是 $\{q_0\}$ 。NFA 在读第一个字符之前就可以沿 $\varepsilon$ 移动；若某个接受状态只能从 $q_0$ 经 $\varepsilon$ 到达，空串本应被接受，用 $\{q_0\}$ 当起点就会错误地拒绝它。

**难点**：DFA 的状态数最多是 $2^{|Q|}$ （ $Q$ 的所有子集），但实际只需构造从起始状态**可达**的那些子集：上例 $2^3=8$ 个子集里只用到 4 个。

<a id="topic-2"></a>
## 2. 用 NFA 证明封闭性

有了“NFA 可以变成 DFA”，证明一个语言正则时只需造出一个 NFA。下面三页分别用 $\varepsilon$ 转移把已知的机器拼起来；[第 6 篇](06-finite-automata.md#topic-3)列出的封闭性结论在这里得到构造性证明。

### 并

![Slide 11 - Closure under union](assets/07-nfa-determinisation-minimisation/slide-11.png)

设 $M_A,M_B$ 分别识别 $A,B$ 。图中新建一个起始状态（左边的圆圈），用两条 $\varepsilon$ 转移连到 $M_A$ 、 $M_B$ 的起始状态。这个 NFA 先“猜”输入属于哪一个语言，再交给对应的机器检查，所以识别 $A\cup B$ 。整个构造只比 $M_A,M_B$ 多一个状态。

<!-- Sources: L13 p.11 -->

### 连接

![Slide 12 - Closure under concatenation](assets/07-nfa-determinisation-minimisation/slide-12.png)

上面两个方框是 $A$ 、 $B$ 的 DFA，下面是拼好的 NFA。看下图的两条 $\varepsilon$ ：它们从 $M_A$ 的每个接受状态连到 $M_B$ 的起始状态；同时 $M_A$ 的接受状态变成普通单圈，只保留 $M_B$ 的接受状态。NFA 在读完属于 $A$ 的前半段时，可以“猜”此处是分界点，跳到 $M_B$ 检查后半段。

<!-- Sources: L13 p.12 -->

![Slide 14 - Concatenation construction formally](assets/07-nfa-determinisation-minimisation/slide-14.png)

这页把上图写成式子。要求 $Q,Q'$ 不相交，是为了把两台机器的状态并在一起时不会撞名。新 NFA 是 $N=(Q\cup Q',\Sigma,\delta'',\{q_0\},F')$ ：起点是 $M_A$ 的起点，接受状态只有 $M_B$ 的 $F'$ 。转移函数分三种情况：

$$
\delta''(q,v)=\begin{cases}\{\delta'(q,v)\} & q\in Q',\ v\in\Sigma\\ \{\delta(q,v)\} & q\in Q,\ v\in\Sigma\\ \{q_0'\} & q\in F,\ v=\varepsilon\end{cases}
$$

前两行说“在各自的机器里照常走”（NFA 的转移返回集合，所以 DFA 的结果外面加花括号）；第三行就是图里那几条 $\varepsilon$ 。**补充**：没列出的情况（例如非接受状态读 $\varepsilon$ ）结果是空集。

<!-- Sources: L13 p.14 -->

### 克林闭包

![Slide 15 - Closure under Kleene star](assets/07-nfa-determinisation-minimisation/slide-15.png)

下图虚线框是原 DFA。框外新加了一个起始状态，它本身是接受状态（双圈），并用 $\varepsilon$ 连到原起始状态；框内从每个原接受状态各有一条 $\varepsilon$ 弯回原起始状态。新起点负责接受空串（ $L^0=\{\varepsilon\}$ ）；回连的 $\varepsilon$ 让机器可以“读完一段属于 $A$ 的串，再从头读下一段”。

<!-- Sources: L13 p.15 -->

<details markdown="1">
<summary>延伸内容（可选）：为什么要新建起始状态</summary>

如果偷懒把原起始状态直接设为接受状态，可能会多接受一些串：原 DFA 中若有箭头回到起始状态，那些“半途回到起点”的串也会被接受，而它们未必属于 $A^*$ 。新建一个只负责接受 $\varepsilon$ 的起点就避免了这个问题。

</details>

### 更多封闭性

![Slide 16 - More closure results](assets/07-nfa-determinisation-minimisation/slide-16.png)

定理框列出：若 $A,B$ 是同一字母表 $\Sigma$ 上的正则语言，则交 $A\cap B$ 、补 $A^c=\Sigma^*\setminus A$ 、差 $A\setminus B$ 、 $A$ 的**反转（reversal）**（每个串倒过来写）也都正则。差不需要单独证明，因为 $A\setminus B=A\cap B^c$ ，由前两条直接得到。下面的推论说：正则语言在**布尔组合（Boolean combination）**下封闭，即用并、交、补任意组合，结果仍正则。

下一页（PDF 第 17 页）只有一句话：这些算法会在 tutorial 里出现，并留了一个思考题——怎样形式化地定义识别 $A\cap B$ 的 DFA。常见答案见下面的延伸内容。反转的构造会在第 3 节的最小化算法中用到。

<!-- Sources: L13 p.16-17; Apple Notes LEC13 -->

<details markdown="1">
<summary>延伸内容（可选）：补与交的常见构造</summary>

- **补**：取一个完整的 DFA（每个状态、每个字符都有转移，必要时加死状态），把接受与非接受状态互换。对 NFA 不能这样做，因为 NFA 的“拒绝”要求所有路径都失败。
- **交（乘积构造）**：新 DFA 的状态是二元组 $(p,q)$ ， $p$ 来自 $A$ 的 DFA、 $q$ 来自 $B$ 的 DFA，两台机器同步走一步： $\delta((p,q),a)=(\delta_A(p,a),\delta_B(q,a))$ ；当 $p,q$ 都是接受状态时接受。

</details>

<a id="topic-3"></a>
## 3. 最小 DFA 与 Brzozowski 算法

### 最小 DFA 与等价判定

![Slide 18 - Equivalence of DFAs](assets/07-nfa-determinisation-minimisation/slide-18.png)

第一段：对每个正则语言，总能找到一个**最小 DFA（minimal DFA）**，即状态数最少的 DFA。第二段：DFA 只有一个起始状态，转移函数是完全且确定的，所以可以通过把两个 DFA 都最小化来检查它们是否等价。

<!-- Sources: L13 p.18; Apple Notes LEC13 -->

**延伸内容**：这一做法背后的事实是，一个正则语言的最小 DFA 在**状态改名**的意义下唯一（Myhill–Nerode 定理的推论）。所以两台 DFA 等价，当且仅当最小化后得到的两台 DFA 只差状态名字。

等价的 DFA 大小可以不同，而且算法（比如子集构造）给出的结果往往不是最小的。课件下一页（PDF 第 20 页）把第 1 节的 NFA 与它的 4 状态 DFA 并排放在一起：回看[第 1 节](#topic-1)的 Slide 8， $B^*$ 和 $C^*$ 都是接受状态，读 a 都去 $B^*$ 、读 b 都去 $C^*$ ，行为完全一样，可以合并。

<!-- Sources: L13 p.20 -->

### Brzozowski 算法

![Slide 22 - Generating a minimal DFA](assets/07-nfa-determinisation-minimisation/slide-22.png)

上半部分是 **Brzozowski 算法**：给定 NFA（也可以是 DFA），做“反转 → 确定化 → 再反转 → 再确定化”四步，就得到等价的最小 DFA。这里的“确定化”就是第 1 节的子集构造。

<!-- Sources: L13 p.22; Apple Notes LEC13 -->

下半部分说明怎样**反转（reverse）**一个初始状态为 $q_0$ 、接受状态集 $F\ne\emptyset$ 的 NFA：

1. 若 $F=\{q\}$ 只有一个状态，就用它；
2. 否则新加状态 $q$ 作为唯一接受状态，从 $F$ 中每个状态向 $q$ 加一条 $\varepsilon$ 转移；
3. 把所有转移反向，令 $q$ 成为初始状态、 $q_0$ 成为（唯一的）接受状态。

前两步的目的，是让反转后的机器只有一个起点。反转后的机器识别原语言中每个串倒过来写的结果，这也正是上一节“反转封闭”的构造。

<!-- Sources: L13 p.22; Apple Notes LEC13 -->

<details markdown="1">
<summary>延伸内容（可选）：为什么两次“反转—确定化”就能最小</summary>

关键事实：若一个 NFA 的每个状态都能从起点到达，那么把它反转再确定化，得到的 DFA 一定是最小的。前两步得到的 DFA 只含可达子集（子集构造只建可达状态），满足这个前提；后两步正好对它套用这个事实。这个算法写起来简单，但中间的子集构造最坏可能产生指数多个状态。

</details>

### 例子：把第 1 节的 NFA 最小化

![Slide 23 - Reverse and determinise](assets/07-nfa-determinisation-minimisation/slide-23.png)

上面左图是第 1 节的 NFA，右图是它的反转。原 NFA 只有一个接受状态 2，所以不必新加状态：反转后 2 是起点、原起点 1 成为接受状态，每条箭头掉头（例如原来 $1\xrightarrow{\varepsilon}3$ 变成 $3\xrightarrow{\varepsilon}1$ ）。

右下是把反转结果确定化后的 DFA，状态改名为 4、5、6，分别代表 $\{2\}$ 、 $\{1,2\}$ 、 $\{1,2,3\}$ 。可以自己核对一步：从 $\{1,2\}$ 读 a，2 到 2、1 到 3，再取 $\varepsilon$ 闭包补上 1，得 $\{1,2,3\}$ ，即 $5\xrightarrow{a}6$ 。含原起点 1 的集合是接受状态，所以 5 和 6 接受。

<!-- Sources: L13 p.23 -->

![Slide 24 - Reverse again and determinise again](assets/07-nfa-determinisation-minimisation/slide-24.png)

上半部分是第三步“再反转”：接受状态有 5、6 两个，所以新加起点 7，用 $\varepsilon$ 连到 5、6，箭头全部反向，原起点 4 成为接受状态。下半部分是第四步“再确定化”：只剩 3 个状态——起始 $\{5,6,7\}$ 读 a 进入接受状态 $\{4,5,6\}$ 并永远留在那里，读 b 进入死状态 $\emptyset$ 。

<!-- Sources: L13 p.24 -->

读出结果：这个语言是“以 a 开头的串”，即 $a(a\cup b)^*$ （正则表达式写法见[第 8 篇](08-regular-expressions.md)）。原来子集构造得到 4 个状态，最小 DFA 只要 3 个：正好对应把 $B^*$ 、 $C^*$ 合并。

## 本讲自测

1. 把第 1 节 NFA 中 $1\xrightarrow{\varepsilon}3$ 这条边删掉，重新做子集构造：起始状态是什么？一共有几个可达的 DFA 状态（含死状态）？
2. 用连接构造为 $A\circ B$ 造 NFA 时，若 $\varepsilon\in A$ （ $M_A$ 的起点本身是接受状态），一个属于 $B$ 的串是怎样被接受的？
3. 用并的构造，识别 $A\cup B$ 的 NFA 比 $M_A,M_B$ 合起来多几个状态？如果改用乘积构造做并，状态数又是多少？
4. 两个人分别画了识别同一语言、但状态数不同的 DFA。对两者分别运行 Brzozowski 算法，输出之间是什么关系？
