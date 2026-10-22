# COMP30026 Lectures 5–8 - Predicate Logic: Syntax, Semantics and Clausal Form

来源：`lecture/05.pdf` 第 56–69 页、`lecture/06.pdf`、`lecture/07.pdf`、`lecture/08.pdf`；Apple Notes：CS/25S2/MoC — "LEC05-06 Predicate Logic"、"LEC07 Languages"、"★2 Resolution for Predicate Logic"、"Equivalence Cheatsheet"。

这篇讲的是：**“每个程序员都喜欢某个调试工具”这样的句子，命题逻辑写不出来；加上“对象、性质、量词”之后，公式怎样写、怎样判断真假、又怎样整理成归结能用的形式？**

学习路线：[为什么需要谓词逻辑](#topic-1) → [语法与翻译：项、公式与约束变量](#topic-2) → [语义：论域、解释与赋值](#topic-3) → [量词的顺序与移动规则](#topic-4) → [满足、推论与有效性](#topic-5) → [化成子句形式](#topic-6)。

重点：英语到公式的翻译、模型与赋值下的真值定义、Skolem 化。难点：量词顺序、自由变量与约束变量。易错：“所有 S 都是 P”用 $\to$ ，“有 S 是 P”用 $\land$ ；Skolem 化后公式只“同可满足”而不再等价。

第 6 讲第 21 页起的语义部分在第 7 讲开头重讲了一遍；下面的语义截图取自第 7 讲。

<a id="topic-1"></a>
## 1. 为什么需要谓词逻辑

### 命题逻辑表达力不够

![L05 slide 56 - Propositional logic is not very expressive](assets/04-predicate-logic/slide-l05-56.png)

上半页列出的句子在命题逻辑里都无法恰当表达。命题逻辑只能给整句话一个变量，看不见句子内部“谁、对谁、全部还是某些”。下半页点出三处困难：无限的集合（例如程序的所有输入，无法逐个列出）、及物动词（如“loves”，涉及两个对象）、关系代词（如“whose”，把两个对象连起来）。

<!-- Sources: L05 p.55-56 -->

### 先看几句翻译

![L05 slide 60 - Some translations](assets/04-predicate-logic/slide-l05-60.png)

四句话对应四种基本形状。 $P(x,c)$ 读作“ $x$ 在推那辆车 $c$ ”， $H(d)$ 读作“那头驴 $d$ 很高兴”。

**易错： $\forall$ 配 $\to$ ， $\exists$ 配 $\land$ 。** “没有鸸鹋会飞”若写成 $\forall x(Emu(x)\land\lnot Flies(x))$ ，意思就变成“所有东西都是鸸鹋且不会飞”。反过来 $\exists x(Black(x)\to Swan(x))$ 只要有一个非黑的东西就为真，太弱了。

后两句的区别在量词：“所有人都推车”是 $\forall x$ ；“车被推了”只需要有人推，是 $\exists x$ 。两句里量词都只管括号内的前件，驴高兴 $H(d)$ 在量词作用域之外。

<!-- Sources: L05 p.57-60 -->

第 5 讲最后一页还有几句更长的翻译：

| 英语 | 公式 |
| --- | --- |
| Tina found a dog and gave it to Anne | $\exists x(Dog(x)\land Found(tina,x)\land Gave(tina,x,anne))$ |
| Lea inhabits the house that Jackie built | $\exists x(House(x)\land Inhabits(lea,x)\land BuilderOf(jackie,x))$ |
| Mothers' mothers are grandmothers | $\forall x\forall y\forall z((Mother(x,y)\land Mother(y,z))\to Grandmother(x,z))$ |

代词“it”和关系词“that”都靠**同一个变量** $x$ 把几个原子公式连起来；这正是命题逻辑做不到的。

<!-- Sources: L05 p.66-69 -->

### 五类新符号

![L05 slide 65 - Building blocks](assets/04-predicate-logic/slide-l05-65.png)

谓词逻辑在命题逻辑之上新加五类符号：

1. **常量（constant）**：指一个具体对象，如 $c$ “那辆车”、 $d$ “那头驴”、 $tina$ ；习惯用字母表开头的 $a,b,c,\dots$ 。
2. **谓词（predicate）**：描述性质或关系，如 $P(x,y)$ “ $x$ 在推 $y$ ”、 $H(x)$ “ $x$ 很高兴”；等号 $=$ 是特殊的谓词。
3. **量词（quantifier）**： $\forall$ “对所有”， $\exists$ “存在”。
4. **变量（variable）**： $x,y,z$ ，习惯用字母表末尾。
5. **函数（function）**：从对象得到对象，如 $f,g,+$ 。

<!-- Sources: L05 p.61-65; L06 p.3-7; Apple Notes LEC05-06 -->

### 量词是推广的析取与合取

![L06 slide 9 - Existential quantification](assets/04-predicate-logic/slide-l06-09.png)

$\exists$ 是推广的 $\lor$ ：“Tina 找到一些钱并捐给了红十字会”写成 $\exists x(Money(x)\land Found(tina,x)\land Gave(tina,x,redcross))$ ，意思是对 1 号钱、2 号钱……逐个写出的长析取，只要其中一项为真即可。（页面展开时省略了 $Money(\dots)$ 一项，因为逐个列出的本来就是钱。）

同理， $\forall$ 是推广的 $\land$ ：“每个整数的平方非负”写成 $\forall x(x\in\mathbb{Z}\to x\cdot x\ge 0)$ ，相当于 $0\times0\ge0\land1\times1\ge0\land\dots$ ，每一项都要为真。论域无限时，这样的“长合取／长析取”写不完，所以需要量词。

<!-- Sources: L06 p.8-11 -->

### 课上测验：每个程序都输出一个合法数

![L06 slide 13 - Quiz translation](assets/04-predicate-logic/slide-l06-13.png)

用表中的三个谓词翻译“Every program outputs a valid number”。页面给出两种等价写法：

$$
\forall x(P(x)\to\exists y(V(y)\land O(x,y))) \;\equiv\; \forall x\exists y(P(x)\to(V(y)\land O(x,y))).
$$

<!-- Sources: L06 p.12-13; Apple Notes LEC05-06 -->

第二种写法是把 $\exists y$ 移到外面得到的；这种移动为什么合法，见[量词的移动规则](#topic-4)（ $P(x)$ 中没有 $y$ ）。

学生笔记记下了一个错误写法 $\forall x\exists y((P(x)\land V(y))\to O(x,y))$ ：它只要求“存在某个 $y$ ，使得若 $y$ 合法则 $x$ 输出它”——取一个**不合法**的 $y$ 就让蕴含自动为真，等于什么也没说。

<!-- Sources: Apple Notes LEC05-06 -->

<a id="topic-2"></a>
## 2. 语法与翻译：项、公式与约束变量

### 项与原子公式

- **项（term）**表示一个对象： $redcross$ 、 $1$ 、 $x$ 、 $f(x+y)$ 。项**不是**公式，没有真假；
- **原子公式（atomic formula）**表示关于对象的陈述： $Flies(x)$ 、 $P(x,c)$ 、 $Gave(tina,x,redcross)$ 、 $2+2=5$ ，它们有真假（ $2+2=5$ 是合法的公式，只是在通常解释下为假）。

<!-- Sources: L06 p.14-15; Apple Notes LEC05-06 -->

![L06 slide 16 - Notational convention](assets/04-predicate-logic/slide-l06-16.png)

**约定**：只有谓词首字母大写。 $parent(rhonda)$ 是一个**项**，大概指“Rhonda 的父母”这个对象； $Parent(rhonda)$ 是一个**公式**，表示命题“Rhonda 是父母”。看到一个符号，先看大小写，就知道它产生对象还是真假。

<!-- Sources: L06 p.16; Apple Notes LEC05-06 -->

### 文法与约定

![L06 slide 21 - Syntax](assets/04-predicate-logic/slide-l06-21.png)

页面上两条文法分别定义项 $t$ 与公式 $\varphi$ ：

$$
t ::= x \mid c \mid f(t,\dots,t)
$$

$$
\phi ::= P \mid P(t,\dots,t) \mid \bot \mid \top \mid (\lnot\phi) \mid (\phi\land\phi) \mid (\phi\lor\phi) \mid (\phi\to\phi) \mid (\forall x\,\phi) \mid (\exists x\,\phi)
$$

<!-- Sources: L06 p.17-21 -->

注意谓词的参数位置写的是 $t$ ，量词后面跟的是 $\phi$ ：项只能放进谓词或函数里，不能直接用联结词连接。下方的约定：结合优先级 $\lnot,\forall,\exists$ 高于 $\land,\lor$ ，再高于 $\to$ ；省略最外层括号； $\to,\land,\lor$ 右结合（例如 $A\to B\to C\equiv A\to(B\to C)$ ）。

<!-- Sources: L06 p.21; Apple Notes LEC05-06 -->

### 语法树

![L06 slide 23 - Predicate parse tree](assets/04-predicate-logic/slide-l06-23.png)

这棵语法树对应上方绿色公式。和命题逻辑的区别是：量词 $\exists x$ 、 $\exists y$ 也是节点，它只有一个孩子（它的作用范围）；谓词 $A,B$ 的孩子是项（ $x,y,m$ 等）而不是公式。看图可以发现两个 $\exists y$ 各管一棵子树，所以两处的 $y$ 互不相干。

<!-- Sources: L06 p.22-23 -->

### 谓词与函数的类型

| | 输入 | 输出 |
| --- | --- | --- |
| 联结词 $\land,\to,\dots$ | 命题 | 一个命题 |
| 谓词 $P(\dots),=,\dots$ | 对象 | 一个命题 |
| 函数 $f,+,\dots$ | 对象 | 一个对象 |

<!-- Sources: L06 p.24 -->

这张表可以用来检查公式是否合法：例如 $P(Q(x))$ 不合法，因为谓词 $P$ 的输入要求对象，而 $Q(x)$ 是命题；$P(f(x))$ 合法。

### 作用域、约束与自由

![L06 slide 27 - Quantifier scope](assets/04-predicate-logic/slide-l06-27.png)

量词所附着的子公式叫它的**作用域（scope）**，页面用下括号标出 $\forall x$ 的作用域 $(P(x)\lor Q(c))$ 。量词 $\forall x$ 或 $\exists x$ **约束（binds）**作用域内的 $x$ ；不被任何量词约束的出现是**自由的（free）**。

<!-- Sources: L06 p.25-27; Apple Notes LEC05-06 -->

课上紧接着的投票题，答案如下：

| 公式 | 约束 / 自由 |
| --- | --- |
| $\forall x(P(x)\to Q(y))$ | $x$ 约束， $y$ 自由 |
| $\forall z(P(x,y,z)\land\forall y(P(f(x),z,y)))$ | $z$ 约束； $x$ 自由；第一个 $y$ 自由，第二处的 $y$ 被内层 $\forall y$ 约束 |
| $\forall x\exists y(x<y\land\exists z(y<z))$ | $x,y,z$ 全部约束 |

<!-- Sources: L06 p.28; Apple Notes LEC05-06 -->

**易错**：“自由”还是“约束”说的是变量的**某一次出现**，不是整个变量名。第二行里同一个 $y$ 既有自由出现、也有约束出现。

### 改名规则

约束变量可以改名，只要不发生冲突： $\exists x\forall y(x<y)$ 与 $\exists x\forall z(x<z)$ 意思相同；但 $\exists x\forall y(x\le y)$ 改成 $\exists x\forall x(x\le x)$ 意思就全变了（新名字被内层量词“抓住”）。改自由变量的名字会改变含义： $P(x)$ 与 $P(y)$ 不同。

<!-- Sources: L06 p.29-31; Apple Notes LEC05-06 -->

### 从英语到公式

课件给出的翻译步骤：

1. 找出名词、动词、代词、形容词、关系从句；
2. 单个具体对象 → 常量；动词、“是 + 形容词” → 谓词；“……的父母”这类从句 → 函数；“某人”这类不定代词 → 变量；
3. 照搬句子的逻辑结构。

<!-- Sources: L06 p.32; Apple Notes LEC05-06 -->

![L06 slide 34 - Example translations](assets/04-predicate-logic/slide-l06-34.png)

左列是公式，右列是英语。值得逐行对比的三处：

- “Everyone loves Eva”包括 Eva 自己；要排除她，就像第三行那样加前件 $\lnot(x=eva)$ ；
- “Someone other than Alex”同样用 $\lnot(x=alex)$ ，但因为是 $\exists$ ，用 $\land$ 连接；
- 最后三行字母相同、量词顺序或位置不同，意思完全不同，详见[量词顺序](#topic-4)。

<!-- Sources: L06 p.33-34 -->

**词序要小心**：“有某个东西不是 P”是 $\exists y\lnot P(y)$ ，“没有东西是 P”是 $\lnot\exists y\,P(y)$ ；“所有 S 都不是 P”是 $\forall x(S(x)\to\lnot P(x))$ ，“并非所有 S 都是 P”是 $\lnot\forall x(S(x)\to P(x))$ 。

<!-- Sources: L06 p.35 -->

![L06 slide 38 - Implicit quantifiers](assets/04-predicate-logic/slide-l06-38.png)

**隐含量词**：英语里不带限定词的复数名词常表示“所有”。页面三例都译成全称量词：“Humans are mortal”指所有人；“A horse is stronger than a dog”里的两个“a”其实都是“任意一个”，所以是两个 $\forall$ ；“If a child owns a dog, the child spoils it”也一样，“a”在条件句里表示全称，而不是 $\exists$ 。

<!-- Sources: L06 p.38 -->

<a id="topic-3"></a>
## 3. 语义：论域、解释与赋值

### 真假取决于解释

![L06 slide 44 - Meaning of a formula](assets/04-predicate-logic/slide-l06-44.png)

同一个公式 $\forall x\forall z(x<z\to\exists y(x<y\land y<z))$ （“任意两个数之间还有一个数”），换一种解释，真假就变：

1. 在 $\mathbb{Z}$ 上、 $<$ 是“小于”：假（1 与 2 之间没有整数）；
2. 在 $\mathbb{Z}$ 上、 $<$ 是“小于等于”：真（取 $y=x$ ）；
3. 在 $\mathbb{R}$ 上、 $<$ 是“小于”：真（取中点）；
4. 论域只有 $\{0\}$ ：前件 $x<z$ 永远假，公式平凡为真。

第 7 讲开头换了一个例子： $\forall x(Tree(x)\to\exists y(Leaf(y)\land InTree(y,x)))$ 在“树非空”的解释下为真，允许空树时为假。

<!-- Sources: L06 p.44; L07 p.5 -->

### 论域、解释与模型

![L07 slide 11 - Models](assets/04-predicate-logic/slide-l07-11.png)

一个模型由两部分组成：

- **论域（universe）$U$**：我们讨论的对象集合，量词在它上面取值；论域必须**非空**；
- **解释函数（interpretation function）$I$**：把每个非逻辑符号映到它的含义——常量 ↦ $U$ 中的对象；谓词 ↦ $U$ 上的关系；函数 ↦ 从 $U$ 到 $U$ 的函数；
- **模型（model）** $\mathcal{M}=(U,I)$ ：论域**加上**解释函数。

<!-- Sources: L07 p.9-11; Apple Notes LEC07 -->

页面的例子：带通常加法的 $\mathbb{Z}$ 是 $\forall x\exists y(x+y=1)$ 的模型（取 $y=1-x$ ）；带通常加法的 $\mathbb{N}$ 不是（ $x=2$ 时找不到自然数 $y$ ）。符号 $+$ 相同，换了论域，结论就不同。

<!-- Sources: L07 p.11 -->

### 变量赋值

![L07 slide 13 - Free variables and assignments](assets/04-predicate-logic/slide-l07-13.png)

$P(x)$ 的真假取决于 $x$ 指谁。**变量赋值（variable assignment）**是函数 $v:\text{vars}\to U$ 。例子框： $U=\{red,blue\}$ ， $I(P)=\{red\}$ ；若 $v(x)=red$ 则 $P(x)$ 真，若 $v(x)=blue$ 则假。模型固定了符号的意思，赋值再固定自由变量的值。

<!-- Sources: L07 p.12-13 -->

### 赋值推广到项

![L07 slide 16 - Terms and variable assignments](assets/04-predicate-logic/slide-l07-16.png)

给定解释后，赋值自然推广到所有项：常量直接查 $I$ ，函数项先算参数再套用 $I$ 给出的函数：

$$
v(a)=I(a), \qquad v(g(t_1,\dots,t_n)) = I(g)\big(v(t_1),\dots,v(t_n)\big).
$$

<!-- Sources: L07 p.14-15 -->

例子框里从内往外算：项 $t=f(y,g(x,a))$ ，解释 $a=1$ 、 $f$ 为乘法、 $g$ 为加法，赋值 $v(x)=2,v(y)=1$ ，先算 $g(x,a)=2+1=3$ ，再算 $f(y,3)=1\times3=3$ ，所以 $v(t)=3$ 。

<!-- Sources: L07 p.16 -->

### 真值的递归定义

**闭公式**（没有自由变量）的真值只取决于模型；之所以还要引入赋值，是为了能**逐层**（compositionally）定义真值——在递归到量词内部时，子公式里会出现暂时自由的变量。记号 $v_{x\mapsto d}$ 表示“把 $v$ 中 $x$ 的值改成 $d$ ，其余不变”。

<!-- Sources: L07 p.17; Apple Notes LEC07 -->

![L07 slide 18 - Defining truth](assets/04-predicate-logic/slide-l07-18.png)

在模型 $\mathcal{M}$ 与赋值 $v$ 下，页面的三条规则（加上等号与联结词）整理成表：

| 公式 | 何时为真 |
| --- | --- |
| $P(t_1,\dots,t_n)$ | $(v(t_1),\dots,v(t_n))\in I(P)$ |
| $t=s$ | $v(t)=v(s)$ |
| $\lnot\phi$ 、 $\phi\land\psi$ 等 | 与命题逻辑相同 |
| $\exists x\,F$ | 存在至少一个 $d\in U$ ，使 $F$ 在 $v_{x\mapsto d}$ 下为真 |
| $\forall x\,F$ | $\lnot\exists x\lnot F$ 为真，即对所有 $d\in U$ ， $F$ 在 $v_{x\mapsto d}$ 下为真 |

<!-- Sources: L07 p.18; Apple Notes LEC07 -->

**理解**：判断 $\exists x\,F$ 时，就是把 $x$ 依次换成论域里的每个对象 $d$ ，看有没有一个让 $F$ 成立——这正是第 1 节“推广的析取”的精确说法。

<a id="topic-4"></a>
## 4. 量词的顺序与移动规则

### 顺序与“双人游戏”

$\forall x\exists y\,L(x,y)$ 说“人人都有所爱”， $\exists y\forall x\,L(x,y)$ 说“有一个人被所有人爱”。不同种量词的顺序不能随便换；同种量词可以： $\forall x\forall y\equiv\forall y\forall x$ ， $\exists x\exists y\equiv\exists y\exists x$ 。

<!-- Sources: L06 p.37; L07 p.19; Apple Notes LEC05-06 -->

![L07 slide 23 - Two-person game](assets/04-predicate-logic/slide-l07-23.png)

把量化公式想成游戏：我宣称一个公式，你来反驳，你负责给 $\forall$ 变量选值，我负责给 $\exists$ 变量选值。页面四条按顺序是：

- 我宣称 $\forall x\exists y\,P(x,y)$ ：你先选 $x$ ，我**知道**你的 $x$ 之后再找 $y$ ；
- 我宣称 $\exists y\forall x\,P(x,y)$ ：我必须先交出 $y$ ，你知道 $y$ 后再找反例 $x$ ——对我更难；
- 同种量词连在一起时，由同一个人选，顺序无所谓。

<!-- Sources: L07 p.20-23 -->

红字强调的就是“谁先出、谁后看”：后选的一方能根据前面的选择调整，这就是 $\exists y\forall x$ 比 $\forall x\exists y$ 强的原因（前者推出后者，反之不行，见[第 5 节的例子](#topic-5)）。

### 移动规则（rules of passage）

![L07 slide 25 - Rules of passage](assets/04-predicate-logic/slide-l07-25.png)

页面先提醒：不能总是把子公式移出量词，例如 $\exists x(P(x)\land Q(x))$ 不能拆成 $\exists x\,P(x)\land\exists x\,Q(x)$ 后再等价回来（两个 $x$ 可能是不同对象）。下面的等价对任意 $F,G$ 成立：

| 规则 | 等价式 |
| --- | --- |
| 量词否定 | $\lnot\forall x\,F\equiv\exists x\lnot F$ ， $\lnot\exists x\,F\equiv\forall x\lnot F$ |
| $\exists$ 分配到 $\lor$ | $\exists x(F\lor G)\equiv(\exists x\,F)\lor(\exists x\,G)$ |
| $\forall$ 分配到 $\land$ | $\forall x(F\land G)\equiv(\forall x\,F)\land(\forall x\,G)$ |
| 由上推出 | $\exists x(F\to G)\equiv(\forall x\,F)\to(\exists x\,G)$ |

<!-- Sources: L07 p.24-25; Apple Notes Equivalence Cheatsheet -->

记忆方法：“推广的 $\lor$ ”可以分配到 $\lor$ 上，“推广的 $\land$ ”可以分配到 $\land$ 上；反过来（ $\exists$ 对 $\land$ 、 $\forall$ 对 $\lor$ ）不行。

![L07 slide 26 - More rules of passage](assets/04-predicate-logic/slide-l07-26.png)

若 $G$ 中**没有自由出现的** $x$ （ $F$ 可以有），还有：

| 等价式 | |
| --- | --- |
| $\exists x\,G\equiv G$ | $\forall x\,G\equiv G$ |
| $\exists x(F\land G)\equiv(\exists x\,F)\land G$ | $\forall x(F\lor G)\equiv(\forall x\,F)\lor G$ |
| $\forall x(F\to G)\equiv(\exists x\,F)\to G$ | $\forall x(G\to F)\equiv G\to(\forall x\,F)$ |

<!-- Sources: L07 p.26; Apple Notes Equivalence Cheatsheet -->

**难点**： $\forall x(F\to G)\equiv(\exists x\,F)\to G$ 里量词从 $\forall$ 变成了 $\exists$ ，因为 $x$ 出现在蕴含的**前件**里，相当于藏在一个否定之下（ $F\to G\equiv\lnot F\lor G$ ）。

**理解用例（来自学生的等价速查笔记）**：化简 $\forall x(\lnot P(x)\lor\lnot H(x))\to\exists x(P(x)\land\lnot H(x))$ ：

| 步骤 | 结果 | 依据 |
| --- | --- | --- |
| 1 | $\lnot\forall x(\lnot P(x)\lor\lnot H(x))\lor\exists x(P(x)\land\lnot H(x))$ | 消去蕴含 |
| 2 | $\exists x(P(x)\land H(x))\lor\exists x(P(x)\land\lnot H(x))$ | 推入否定 |
| 3 | $\exists x((P(x)\land H(x))\lor(P(x)\land\lnot H(x)))$ | $\exists$ 分配到 $\lor$ |
| 4 | $\exists x(P(x)\land(H(x)\lor\lnot H(x)))$ | 提出 $P(x)$ |
| 5 | $\exists x\,P(x)$ | 去掉恒真的合取项 |

<!-- Sources: Apple Notes Equivalence Cheatsheet -->

<a id="topic-5"></a>
## 5. 满足、推论与有效性

### 满足与推论

记 $\mathcal{M},v\models F$ 为“ $F$ 在 $\mathcal{M}$ 中、赋值 $v$ 下为真”。 $F$ 在 $\mathcal{M}$ 中为真（ $\mathcal{M}\models F$ ）指对**所有**赋值都成立。 $F\models G$ 指 $F$ 的每个模型都是 $G$ 的模型； $F\equiv G$ 指互相推出。

<!-- Sources: L07 p.27-30 -->

### 可满足、有效与偶然

![L07 slide 31 - Satisfiability and validity](assets/04-predicate-logic/slide-l07-31.png)

对闭公式 $F$ ，页面上的五个分类与命题逻辑一一对应，只是“赋值”换成了“模型”：

| 分类 | 定义 |
| --- | --- |
| 可满足 | 存在 $\mathcal{M}$ ，使 $\mathcal{M}\models F$ |
| 有效 | 对所有 $\mathcal{M}$ ， $\mathcal{M}\models F$ |
| 不可满足 | 对所有 $\mathcal{M}$ ， $\mathcal{M}\not\models F$ |
| 非有效 | 存在 $\mathcal{M}$ ，使 $\mathcal{M}\not\models F$ |
| 偶然 | 可满足但不有效 |

<!-- Sources: L07 p.31; Apple Notes LEC07 -->

和命题逻辑一样： $F$ 有效 ⟺ $\lnot F$ 不可满足； $F$ 非有效 ⟺ $\lnot F$ 可满足。例： $\forall x\,P(x)\lor\exists y\lnot P(y)$ 有效（要么全是 $P$ ，要么有一个不是）； $\forall x\,P(x)\land\lnot P(a)$ 不可满足； $\forall x\,P(x)$ 偶然。

<!-- Sources: L06 p.47; L07 p.8, p.31 -->

**易错**：命题逻辑只需检查有限多行真值表；谓词逻辑的“所有模型”包括各种大小（甚至无限）的论域，不能逐个枚举，所以证明有效要靠论证（或后面的归结），证明非有效则只需**一个**反模型。

### 非有效的例子

![L07 slide 33 - Example of non-validity](assets/04-predicate-logic/slide-l07-33.png)

$(\forall y\exists x\,P(x,y))\to(\exists x\forall y\,P(x,y))$ 非有效，页面给了两个反模型：

- $U=\mathbb{Z}$ 、 $P$ 为“小于”：每个 $y$ 都有更小的 $x$ ，但没有一个 $x$ 小于所有 $y$ ；
- $U=\{0,1\}$ 、 $P$ 为“等于”：每个 $y$ 都等于自己，但没有一个 $x$ 同时等于 0 和 1。

它仍可满足，例如 $U=\{0,1\}$ 、 $P$ 为“小于等于”（取 $x=0$ ，后件为真）。

<!-- Sources: L07 p.32-33 -->

### 有效的例子

![L07 slide 35 - Example of validity](assets/04-predicate-logic/slide-l07-35.png)

$(\exists y\forall x\,P(x,y))\to(\forall x\exists y\,P(x,y))$ 有效，这正是上一节“双人游戏”里 $\exists y\forall x$ 更强的说法。否定后为 $(\exists y\forall x\,P(x,y))\land(\exists x\forall y\lnot P(x,y))$ ：右半边要求某个 $a$ 与所有 $b$ 都不满足 $P$ ，左半边却给出一个 $b$ 使所有 $x$ （包括 $a$ ）都满足 $P(x,b)$ ，矛盾。否定不可满足，所以原式有效。

同理 $(\forall x\,P(x))\to P(t)$ 对任何项 $t$ 都有效：否定 $(\forall x\,P(x))\land\lnot P(t)$ 不可满足，因为 $t$ 总指论域中的某个对象。

<!-- Sources: L07 p.34-37 -->

<a id="topic-6"></a>
## 6. 化成子句形式

### 为什么要放弃“等价”

谓词逻辑的 CNF 是：文字的析取再合取，且所有变量都被（隐含地）全称量化。因为有 $\exists$ ，并非每个公式都有等价的 CNF。解决办法是**放弃等价，只保留可满足性**：转换后的公式与原式**同可满足（equisatisfiable）**——一个可满足当且仅当另一个可满足。这对归结足够了，因为归结只关心“能不能推出 $\bot$ ”。

<!-- Sources: L08 p.2-3; Apple Notes ★2 -->

### 预告：谓词逻辑的归结长什么样

课件先举了一个直观例子：“每只吸蜜鹦鹉都很漂亮”与“Coco 不漂亮”推出“Coco 不是吸蜜鹦鹉”，即 $\lnot L(x)\lor G(x)$ 与 $\lnot G(c)$ 得到 $\lnot L(c)$ 。归结不再只对单个命题变量，而是对含变量、常量、函数的原子公式：先让 $x$ 取 $c$ ，两边才出现互补文字。

<!-- Sources: L08 p.4-6 -->

![L08 slide 8 - Resolution by example](assets/04-predicate-logic/slide-l08-08.png)

先看最后一列花括号：每一步都附带一个代换（substitution）。第 5 行用 $\{z\mapsto a\}$ 让 $P(f(a))$ 与 $P(f(z))$ 相同后再消去；第 6 行与 $\lnot R(b)$ 消去 $R(b)$ ；第 7 行用 $\{w\mapsto a,u\mapsto f(v)\}$ 让 $Q(a,u)$ 与 $Q(w,f(v))$ 相同，得到 $\bot$ 。怎样系统地找这些代换（合一，unification）是[下一篇](05-unification-automated-reasoning.md)的内容；这一讲先解决“怎样得到子句”。

<!-- Sources: L08 p.7-8 -->

### Skolem 化：消去存在量词

![L08 slide 9 - Eliminating existential quantifiers](assets/04-predicate-logic/slide-l08-09.png)

**Skolem 常量**： $F=\exists x\forall y\,P(x,y)$ 与 $G=\forall y\,P(a,y)$ （ $a$ 是新常量）同可满足。证明框两句话分别是两个方向： $G$ 的模型就是 $F$ 的模型（拿 $I(a)$ 作 $x$ 的见证）；反过来， $F$ 的模型可以扩展：令 $I(a)$ 就是那个见证 $x$ 的对象。

<!-- Sources: L08 p.9 -->

![L08 slide 13 - Skolem constants and functions](assets/04-predicate-logic/slide-l08-13.png)

**Skolem 函数**： $F=\forall y\exists x\,P(x,y)$ 中，对不同的 $y$ ，见证 $x$ 可能不同；用一个**新函数符号** $f$ 表示“从 $y$ 取出 $x$ ”，得到与之同可满足的 $\forall y\,P(f(y),y)$ 。

<!-- Sources: L08 p.10-13; Apple Notes ★2 -->

规则：存在量词变量替换成一个新函数，参数是**外层所有全称变量**。学生笔记的嵌套例子：

$$
\forall z\exists y\forall x\exists w\,P(x,y,z,w)\;\leadsto\;\forall z\forall x\,P(x,f(z),z,g(z,x)).
$$

$y$ 只在 $\forall z$ 之内，所以是 $f(z)$ ； $w$ 在 $\forall z$ 和 $\forall x$ 之内，所以是 $g(z,x)$ 。

<!-- Sources: Apple Notes ★2 -->

**易错**：Skolem 化后的公式与原式只是同可满足，**不再等价**。页面最后一行注明：考核范围只包括对 top-level（顶层）存在量词做 Skolem 化。

<!-- Sources: L08 p.13; Apple Notes ★2 -->

### 六个步骤

![L08 slide 14 - Formula to clausal form](assets/04-predicate-logic/slide-l08-14.png)

步骤与命题逻辑相似，多出来的是第 3–5 步：

1. 消去 $\leftrightarrow$ 和 $\to$ ；
2. 把否定推入（化成 NNF）；
3. 给被遮蔽（shadowed）的变量改名——若变量处在约束同名变量的量词作用域内（如 $\forall x\exists x$ 中第二个 $x$ ），就改名，使不同量词用不同变量名；
4. Skolem 化，消去存在量词；
5. 去掉全称量词（它们仍然隐含存在）；
6. 用分配律化成 CNF。

<!-- Sources: L08 p.14; Apple Notes ★2 -->

**为什么第 2 步必须在第 4 步之前**：一个 $\exists$ 若藏在否定下（如 $\lnot\exists y$ ），实际是全称的；先推入否定，才能看清哪些量词真的是存在量词。

### 贯穿例子

$\forall x(P(x)\leftrightarrow\exists y(R(x,y)\land\forall z\,R(z,y)))$ 的前三步：

| 步骤 | 结果 |
| --- | --- |
| 1. 去 $\leftrightarrow,\to$ | $\forall x\big((\lnot P(x)\lor\exists y(R(x,y)\land\forall z\,R(z,y)))\land(\lnot\exists y(R(x,y)\land\forall z\,R(z,y))\lor P(x))\big)$ |
| 2. 推入否定 | $\forall x\big((\lnot P(x)\lor\exists y(R(x,y)\land\forall z\,R(z,y)))\land(\forall y(\lnot R(x,y)\lor\exists z\lnot R(z,y))\lor P(x))\big)$ |
| 3. 改名 | 第二个合取项里的 $y,z$ 改为 $u,v$ ： $\dots\land(\forall u(\lnot R(x,u)\lor\exists v\lnot R(v,u))\lor P(x))$ |

<!-- Sources: L08 p.15-17 -->

第 2 步正是上面说的情形：第二个合取项里的 $\lnot\exists y$ 变成了 $\forall y$ ， $\forall z$ 变成了 $\exists z$ 。第 3 步的课件标题是“Rename Apart”：这个例子里其实没有变量被遮蔽，但两个合取项都用了 $y,z$ ，课件仍把它们分开改名，让每个量词都有自己的变量名，这是更稳妥的做法。

![L08 slide 19 - Step 4 Skolemize](assets/04-predicate-logic/slide-l08-19.png)

第 4 步先用红色标出两个存在量词变量，再按“外层有哪些 $\forall$ ”决定 Skolem 函数的参数： $y$ 只在 $\forall x$ 内 → $f(x)$ ； $v$ 在 $\forall x,\forall u$ 内 → $g(u,x)$ 。第 5 步直接删去 $\forall x,\forall z,\forall u$ ，得到 $(\lnot P(x)\lor(R(x,f(x))\land R(z,f(x))))\land(\lnot R(x,u)\lor\lnot R(g(u,x),u)\lor P(x))$ ；这些变量仍隐含地被全称量化。

<!-- Sources: L08 p.18-20 -->

![L08 slide 21 - Step 6 Convert to CNF](assets/04-predicate-logic/slide-l08-21.png)

第 6 步只有第一个合取项需要分配： $\lnot P(x)\lor(R(x,f(x))\land R(z,f(x)))$ 拆成两个子句。最后写成子句形式，共三个子句：

$$
\{\lnot P(x),R(x,f(x))\},\quad \{\lnot P(x),R(z,f(x))\},\quad \{\lnot R(x,u),\lnot R(g(u,x),u),P(x)\}.
$$

<!-- Sources: L08 p.21 -->

得到子句后，就可以用带合一的归结来推理，见[下一篇](05-unification-automated-reasoning.md)。

## 本讲自测

1. 翻译：“每个学生都至少上过一节课”（用 $S(x)$ 、 $Lec(y)$ 、 $A(x,y)$ ）。
2. 给出一个模型，使 $\forall x\exists y\,P(x,y)$ 真而 $\exists y\forall x\,P(x,y)$ 假。
3. 在 $\exists x(P(x)\land\forall x\,Q(x,y))$ 中，哪些变量出现是自由的？化子句形式前要先做哪一步？
4. 在 $U=\{1,2,3\}$ 、 $I(f)$ 为“加 1 后对 3 取模再加 1”、 $I(P)=\{(1,2),(2,3)\}$ 的模型中，判断 $\forall x\,P(x,f(x))$ 的真假。
5. 对 $\exists x\forall y\exists z\,R(x,y,z)$ 做 Skolem 化，并说明结果与原式是什么关系。
