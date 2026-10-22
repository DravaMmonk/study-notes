# COMP30026 Lectures 9–10 - Unification, Predicate Resolution and Automated Reasoning

来源：`lecture/09.pdf`（第 9 讲，44 页）、`lecture/10.pdf`（第 10 讲，31 页）、`lecture/08.pdf` 第 5–8 页；Apple Notes：CS/25S2/MoC — "LEC09 Unification"、"LEC10 Automated Reasoning"、"★2 Resolution for Predicate Logic"。

这篇讲的是：**谓词逻辑的子句里有变量， $P(x)$ 和 $\lnot P(a)$ 看起来不是同一个文字；怎样让它们“对上号”再归结？这种机械推理能走多远？**

学习路线：[代换与合一](#topic-1) → [合一算法](#topic-2) → [谓词逻辑的归结](#topic-3) → [归结方法的能力与边界](#topic-4) → [Horn 子句与自动推理](#topic-5)。

重点：求最一般合一子（mgu）、带合一的归结、因子化。难点：发生检查（occurs check）、搜索的公平性。易错：把常量当变量替换；归结前忘记给两个子句的变量改名。

截图编号是 PDF 页序；两份课件都是逐步展开的动画页，本篇只选每张幻灯片的最终版本。

<a id="topic-1"></a>
## 1. 代换与合一

### 常量与变量的约定

字母表开头的 $a,b,c,\dots$ 是**常量**（constant），末尾的 $u,v,x,y,\dots$ 是**变量**（variable）。这个区分在本讲非常重要：只有变量能被替换，常量是固定的对象名字。

<!-- Sources: L09 p.2 -->

子句里的变量都隐含全称量化，例如 $P(x,a)$ 就是 $\forall x\,P(x,a)$ ， $x$ 是一个“哑变量”（dummy variable），可以代表任何对象。

<!-- Sources: Apple Notes LEC09 -->

### 代换

![L09 slide 5 - Substitution definition and example](assets/05-unification-automated-reasoning/slide-l09-05.png)

**代换（substitution）**是从变量到项的函数，记作 $\theta=\{x_1\mapsto t_1,\dots,x_n\mapsto t_n\}$ 。 $E[\theta]$ 表示把 $E$ 里每个 $x_i$ **同时**（simultaneously）替换成 $t_i$ 。

看幻灯片下方的例子： $E=P(f(x),g(y,y,b))$ ， $\theta=\{x\mapsto h(u),y\mapsto a,z\mapsto c\}$ 。 $x$ 的一处出现换成 $h(u)$ ， $y$ 的两处出现都换成 $a$ ，常量 $b$ 不动；结果是 $P(f(h(u)),g(a,a,b))$ 。 $E$ 中没有 $z$ ，所以 $z\mapsto c$ 不起作用。（幻灯片结果末尾的 `}` 是排版笔误，应为右括号。）

“同时”的意思是：替换进去的 $h(u)$ 不会再被 $\theta$ 处理第二次。即使 $\theta$ 里还有 $u\mapsto\dots$ ，也不会继续替换。

<!-- Sources: L09 p.5; Apple Notes LEC09 -->

### 合一子

![L09 slide 9 - Unifier definition](assets/05-unification-automated-reasoning/slide-l09-09.png)

两个表达式 $s,t$ 的**合一子（unifier）**是使 $s[\theta]=t[\theta]$ 的代换；存在合一子就称 $s,t$ **可合一（unifiable）**。

例框中 $L(x)$ 与 $L(c)$ 用 $\{x\mapsto c\}$ 合一：两边都变成 $L(c)$ 。底部的问题 “$L(a)$ 与 $L(c)$ 可合一吗？” 答案是**不能**：两边都没有变量，而 $a$ 与 $c$ 是两个不同常量，任何代换都改不了它们。

<!-- Sources: L09 p.9 -->

### 最一般合一子

![L09 slide 11 - Most general unifier](assets/05-unification-automated-reasoning/slide-l09-11.png)

顶部的问题 “$L(x)$ 与 $L(y)$ 可合一吗？” 答案是能： $\{x\mapsto y\}$ 、 $\{y\mapsto x\}$ 、 $\{x\mapsto a,y\mapsto a\}$ 都是合一子。前两个没有多做任何承诺，后一个却把两边都定死成 $a$ 。

**最一般合一子（most general unifier, mgu）** $\theta$ 满足两条：

1. 它是 $s,t$ 的合一子；
2. 任何其他合一子 $\sigma$ 都能写成 $\tau\circ\theta$ ，即先做 $\theta$ ，再做某个代换 $\tau$ 。

**易错**：复合 $\tau\circ\theta$ 的读法是**先右后左**：先用 $\theta$ ，再用 $\tau$ 。幻灯片最后的断言是：若 $s,t$ 可合一，则一定有 mgu。

<!-- Sources: L09 p.11; Apple Notes LEC09 -->

#### 五组例子

![L09 slide 13 - Unifier examples](assets/05-unification-automated-reasoning/slide-l09-13.png)

幻灯片给出结论，下表补上每一组的原因：

| 表达式对 | 结果 | 原因 |
| --- | --- | --- |
| $P(x,a)$ 与 $P(b,c)$ | 不可合一 | 第二个参数是常量 $a\ne c$ ，常量不能替换 |
| $P(f(x),y)$ 与 $P(a,w)$ | 不可合一 | 函数项 $f(x)$ 不能变成常量 $a$ |
| $P(x,c)$ 与 $P(a,y)$ | $\{x\mapsto a,y\mapsto c\}$ | 每个变量只对着一个常量 |
| $P(f(x),c)$ 与 $P(f(a),y)$ | $\{x\mapsto a,y\mapsto c\}$ | 先对齐外层的 $f$ ，再对齐里面的参数 |
| $P(x)$ 与 $P(f(x))$ | 不可合一 | 需要 $x\mapsto f(f(f(\dots)))$ ，但项必须有限 |

<!-- Sources: L09 p.12-13; Apple Notes LEC09 -->

最后一组是下一节“发生检查”的来源：一个变量不能等于一个**真包含它自己**的项。

#### 为什么要“最一般”

![L09 slide 15 - Choosing among unifiers](assets/05-unification-automated-reasoning/slide-l09-15.png)

$P(f(x),g(y,a))$ 与 $P(f(a),g(z,a))$ 的合一子有很多。逐个读幻灯片的四个候选：

- $A=\{x\mapsto a,y\mapsto z\}$ 、 $D=\{x\mapsto a,z\mapsto y\}$ 是 mgu：只做了“必须做”的事（ $x$ 必须是 $a$ ， $y,z$ 必须相等），没有多余承诺；
- $B=\{x\mapsto a,y\mapsto a,z\mapsto a\}$ 没必要地把 $y,z$ 都定成 $a$ 。幻灯片指出 $B=\{y\mapsto a\}\circ D$ ：先用 $D$ 得到 $P(f(a),g(y,a))$ ，再把 $y$ 换成 $a$ ；
- $C=\{x\mapsto a,y\mapsto g(b,f(u)),z\mapsto g(b,f(u))\}$ 也是合一子，同样过于具体： $C=\{y\mapsto g(b,f(u))\}\circ D$ 。

**重点**：归结时要用 mgu。若用了 $B$ 这种过于具体的合一子，得到的结论只谈论 $a$ ，失去了对其他对象也成立的一般性。

<!-- Sources: L09 p.15 -->

<a id="topic-2"></a>
## 2. 合一算法

### 算法框架

![L09 slide 16 - Syntactic unification algorithm](assets/05-unification-automated-reasoning/slide-l09-16.png)

合一算法把“找代换”变成“解方程”：输入两个表达式 $s,t$ ，从只含一个方程的集合 $\{s=t\}$ 出发；只要集合里某个方程符合下一张幻灯片六种形式之一，就执行相应动作；无事可做时返回结果。输出是 mgu，或“失败”（failure）。

### 六条规则

![L09 slide 22 - Six rules for term equations](assets/05-unification-automated-reasoning/slide-l09-22.png)

幻灯片中 $x$ 是变量， $F,G$ 是函数或谓词符号。常量可以看成**零个参数的函数符号**，所以两个不同常量 $a=b$ 也落在规则 2。下表给每条规则一个直觉：

| 编号 | 方程形式 | 动作 | 直觉 |
| --- | --- | --- | --- |
| 1 | $F(s_1,\dots,s_n)=F(t_1,\dots,t_n)$ | 拆成 $s_1=t_1,\dots,s_n=t_n$ | 外层符号相同，就逐个参数对齐 |
| 2 | $F(\dots)=G(\dots)$ ，且 $F\ne G$ 或参数个数不同 | 失败 | 外层符号不同，代换改不了它 |
| 3 | $x=x$ | 删除 | 已经相等，没有信息 |
| 4 | $t=x$ ， $t$ 不是变量 | 改写成 $x=t$ | 把变量放到左边，便于读成代换 |
| 5 | $x=t$ ， $t\ne x$ 但 $x$ 出现在 $t$ 中 | 失败（发生检查） | 无限项不允许，见上一节最后一例 |
| 6 | $x=t$ ， $t$ 中不含 $x$ | 保留，并在**其他**方程里把 $x$ 换成 $t$ | 已解出 $x$ ，把答案传播出去 |

<!-- Sources: L09 p.16-22; Apple Notes LEC09 -->

### 三个例子

![L09 slide 27 - Unification example 1](assets/05-unification-automated-reasoning/slide-l09-27.png)

箭头上方的数字是这一步用到的规则编号。例 1 从 $f(h(y),g(y,a),z)=f(x,g(v,v),b)$ 出发：

1. $(1,4)$ ：外层都是 $f$ ，拆成三个方程；第一个 $h(y)=x$ 调转成 $x=h(y)$ ，第三个 $z=b$ 已是变量在左；
2. $(1,4)$ ：再拆 $g(y,a)=g(v,v)$ ，得 $y=v$ 和 $a=v$ ，后者调转成 $v=a$ ；
3. $(6,6)$ ：把 $v=a$ 代入 $y=v$ 得 $y=a$ ，再把 $y=a$ 代入 $x=h(y)$ 得 $x=h(a)$ 。

最后一组每个左边是不同变量、右边不再含左边变量，于是读出 mgu $\{x\mapsto h(a),y\mapsto a,v\mapsto a,z\mapsto b\}$ 。可以代回去检查：两边都变成 $f(h(a),g(a,a),b)$ 。

<!-- Sources: L09 p.24-27 -->

![L09 slide 28 - Unification example 2 fails by clash](assets/05-unification-automated-reasoning/slide-l09-28.png)

例 2： $f(x,a,x)=f(h(z,b),y,h(z,y))$ 。看上排：拆开后 $x$ 出现了两次，分别等于 $h(z,b)$ 和 $h(z,y)$ ；规则 6 用前者代入后者，得 $h(z,b)=h(z,y)$ ，再拆成 $z=z$ 与 $y=b$ 。看下排：删除 $z=z$ 后，用 $y=a$ 代入 $y=b$ ，得到 $a=b$ ，两个不同常量，规则 2 失败。直觉是： $y$ 被要求同时等于 $a$ 和 $b$ 。

<!-- Sources: L09 p.28 -->

![L09 slide 29 - Unification example 3 fails by occurs check](assets/05-unification-automated-reasoning/slide-l09-29.png)

例 3： $f(x,g(v,v),x)=f(h(y),g(y,z),z)$ 。拆开得 $x=h(y)$ 、 $g(v,v)=g(y,z)$ 、 $x=z$ ；用 $x=h(y)$ 代入 $x=z$ 再调转，得 $z=h(y)$ 。下排拆开 $g$ 得 $v=y$ 、 $v=z$ ，接着两次规则 6 让 $y,v,z$ 都连成同一个东西，最终出现 $y=h(y)$ ： $y$ 出现在右边，规则 5 失败。这叫“发生检查失败”（failure by occurs check）。

**易错**：下排中间出现了 $z=y$ 和 $z=h(y)$ 两个以 $z$ 为左边的方程，这不是错误：算法每一步可以挑任意一个可用的方程，挑的顺序不同，过程不同，但成功与否和得到的 mgu（至多相差变量改名）不会变。

<!-- Sources: L09 p.29; Apple Notes LEC09 -->

**理解用例（来自学生笔记）**： $f(x,f(y,z))=f(f(a,b),x)$ 。拆开得 $x=f(a,b)$ 和 $f(y,z)=x$ ；代入 $x$ 得 $f(y,z)=f(a,b)$ ，再拆得 $y=a,z=b$ 。mgu 为 $\{x\mapsto f(a,b),y\mapsto a,z\mapsto b\}$ 。

<!-- Sources: Apple Notes LEC09 -->

### 正规形式就是答案

![L09 slide 30 - Normal form gives the mgu](assets/05-unification-automated-reasoning/slide-l09-30.png)

这张幻灯片说明算法的三个保证：

- 它总会停止；
- 返回“失败”时，确实不存在合一子；
- 否则方程组处于**正规形式**（normal form）：每个左边是不同的变量，且没有左边变量出现在任何右边。此时把 $\{x_1=t_1,\dots,x_n=t_n\}$ 读成 $\{x_1\mapsto t_1,\dots,x_n\mapsto t_n\}$ ，就是输入两项的 mgu。

正规形式的两个条件保证了“同时替换”一次就完成：左边各不相同，所以代换是函数；右边不含左边变量，所以替换后不会留下还要继续替换的变量。

<!-- Sources: L09 p.30; Apple Notes LEC09 -->

<a id="topic-3"></a>
## 3. 谓词逻辑的归结

### 归结规则

![L09 slide 31 - Resolution rule for predicate logic](assets/05-unification-automated-reasoning/slide-l09-31.png)

横线上方是两个前提子句，下方是结论。设 $P_1$ 与 $P_2$ 是**没有公共变量**、可合一的原子公式， $\theta$ 是它们的（最一般）合一子， $C_1,C_2$ 是子句：

$$
\frac{C_1\cup\{P_1\}\qquad C_2\cup\{\lnot P_2\}}{(C_1\cup C_2)[\theta]}
$$

和命题归结相比，只多了一步：先用 $\theta$ 让 $P_1$ 与 $P_2$ 变成同一个原子，再消去这一对互补文字，并把 $\theta$ 应用到剩下的所有文字上。

<!-- Sources: L09 p.31; L10 p.5; Apple Notes ★2 -->

直观例子：“每只彩虹鹦鹉都很漂亮” $\lnot L(x)\lor G(x)$ 与“Coco 不漂亮” $\lnot G(c)$ ，用 $\{x\mapsto c\}$ 合一后归结，得到“Coco 不是彩虹鹦鹉” $\lnot L(c)$ 。

<!-- Sources: L08 p.5 -->

**易错：先改名！** 第 10 讲开头复习这条规则时特别提醒 “Rename variables!”。每个子句的变量各自独立地被全称量化，同名只是巧合。归结前要把两个子句的变量改成不同名字，否则本该成功的合一可能失败：例如 $P(x)$ 与 $\lnot P(f(x))$ 直接合一会触发发生检查；把后者改名为 $\lnot P(f(y))$ 后，就能用 $\{x\mapsto f(y)\}$ 合一。

<!-- Sources: L10 p.5, p.14 -->

### 一个小例子

子句（变量都全称量化）：

1. $\{\lnot P(f(a)),R(b)\}$
2. $\{P(f(z)),Q(z,u)\}$
3. $\{\lnot R(b)\}$
4. $\{\lnot Q(w,f(v))\}$

由 1、2 用 $\{z\mapsto a\}$ 得 5 $\{Q(a,u),R(b)\}$ ；5 与 3 得 6 $\{Q(a,u)\}$ ；6 与 4 用 $\{w\mapsto a,u\mapsto f(v)\}$ 得 $\bot$ 。

<!-- Sources: L08 p.8 -->

### 蝌蚪例子：完整的自动推理

![L09 slide 32 - Tadpole argument in predicate logic](assets/05-unification-automated-reasoning/slide-l09-32.png)

这张幻灯片把五句英语写成公式：每条鲨鱼都吃一只蝌蚪；大白鱼都是鲨鱼；Camilla 是住在深水的大白鱼；被深水鱼吃掉的蝌蚪都很惨；所以有蝌蚪很惨。我们要证明的是最后一句（ $\therefore$ 后面）由前四句推出。

<!-- Sources: L09 p.32-33 -->

![L09 slide 33 - Tadpole clauses](assets/05-unification-automated-reasoning/slide-l09-33.png)

把每句化成子句形式（方法见[第 4 篇](04-predicate-logic.md)）后得到七个子句。三处值得对照上一张幻灯片看：

- 第一句里 $\exists y$ 在 $\forall x$ 之内，Skolem 化成 $f(x)$ ——“鲨鱼 $x$ 吃的那只蝌蚪”；合取拆成两个子句 $\{\lnot S(x),T(f(x))\}$ 、 $\{\lnot S(x),E(x,f(x))\}$ 。
- 第四句里 $\exists y$ 在蕴含的**前件**中。 $(\dots\land\exists y\,\dots)\to M(z)$ 等价于 $\forall y\,((\dots)\to M(z))$ ，所以 $y$ 变成全称变量，不需要 Skolem 函数。
- 最后一句是**结论的否定**： $\lnot\exists z(T(z)\land M(z))$ 化成 $\{\lnot T(z),\lnot M(z)\}$ 。归结要推出的是矛盾 $\bot$ 。

<!-- Sources: L09 p.32-33 -->

![L09 slide 42 - Tadpole refutation](assets/05-unification-automated-reasoning/slide-l09-42.png)

图中把 $W(u)$ 简写为 $Wu$ 、 $camilla$ 简写为 $c$ ，顶层是七个子句（变量已改名，互不相同），每条连线表示“这两个子句归结出下面的子句”。按连线读：

1. $Wc$ 与 $\lnot Wu,Su$ 用 $\{u\mapsto c\}$ 得 $Sc$ ；
2. 右边：“很惨”子句与 $\lnot Tw,\lnot Mw$ 用 $\{w\mapsto z\}$ 消去 $M$ ，得 $\lnot Tz,\lnot Dy,\lnot E(y,z)$ （两个 $\lnot T$ 文字合一后相同，子句是集合，只留一个）；再与 $Dc$ 用 $\{y\mapsto c\}$ 得 $\lnot Tz,\lnot E(c,z)$ ；
3. 左边： $Sc$ 与 $\lnot Sx,E(x,fx)$ 用 $\{x\mapsto c\}$ 得 $E(c,fc)$ ；
4. 中间： $\lnot Tz,\lnot E(c,z)$ 与 $\lnot Sv,T(fv)$ 用 $\{z\mapsto fv\}$ 得 $\lnot Sv,\lnot E(c,fv)$ ，再与 $E(c,fc)$ 用 $\{v\mapsto c\}$ 得 $\lnot Sc$ ；
5. $\lnot Sc$ 与 $Sc$ 得 $\bot$ ，所以“有蝌蚪很惨”成立。

幻灯片也说明：这只是许多可能的归结证明之一。

<!-- Sources: L09 p.34-42 -->

### 课上练习

![L09 slide 44 - Greeks and philosophers exercise](assets/05-unification-automated-reasoning/slide-l09-44.png)

“哲学家都有智慧；有些希腊人是哲学家；所以有些希腊人有智慧。”化成子句： $\{\lnot P(x),W(x)\}$ 、 $\{P(a)\}$ 、 $\{G(a)\}$ （ $\exists x$ 被 Skolem 化为常量 $a$ ，合取拆成两个子句），以及结论否定 $\{\lnot G(x),\lnot W(x)\}$ 。图中左边两条用 $\{x\mapsto a\}$ 得 $\{W(a)\}$ ，右边两条得 $\{\lnot W(a)\}$ ，二者再得 $\bot$ 。

<!-- Sources: L09 p.44 -->

<a id="topic-4"></a>
## 4. 归结方法的能力与边界

### 因子化

![L10 slide 8 - Factoring example](assets/05-unification-automated-reasoning/slide-l10-08.png)

若子句 $C$ 中两个文字可合一，取 mgu $\theta$ ，把 $C[\theta]$ 加入子句集，这叫**因子化（factoring）**。例框里一共两步，每条竖线是一次因子化：

1. 合一 $D(f(y),y)$ 与 $D(x,y)$ ，mgu 是 $\{x\mapsto f(y)\}$ ；两个 $D$ 文字变得相同，合并成一个，同时 $\lnot P(x)$ 变成 $\lnot P(f(y))$ ；
2. 合一 $\lnot P(f(y))$ 与 $\lnot P(z)$ ，mgu 是 $\{z\mapsto f(y)\}$ ；两个 $\lnot P$ 文字合并。

$$
\{D(f(y),y),\lnot P(x),D(x,y),\lnot P(z)\}\;\xrightarrow{x\mapsto f(y)}\;\{D(f(y),y),\lnot P(f(y)),\lnot P(z)\}\;\xrightarrow{z\mapsto f(y)}\;\{D(f(y),y),\lnot P(f(y))\}.
$$

<!-- Sources: L10 p.8; Apple Notes LEC10 -->

### 为什么必须有因子化

![L10 slide 10 - Factoring is sometimes crucial](assets/05-unification-automated-reasoning/slide-l10-10.png)

$\{P(x),P(y)\}$ 与 $\{\lnot P(u),\lnot P(v)\}$ 一起不可满足（第一个说“任何东西都满足 $P$ ”，第二个说“任何东西都不满足 $P$ ”）。但每次归结只消去一对互补文字：例如用 $\{x\mapsto u\}$ 归结，得到 $\{P(y),\lnot P(v)\}$ ，仍有两个文字；继续归结，结果也总是两个文字，永远得不到空子句。图中两条竖线先各自因子化成 $\{P(x)\}$ 与 $\{\lnot P(u)\}$ ，再一步归结得 $\bot$ 。

<!-- Sources: L10 p.10 -->

### 归结方法

![L10 slide 11 - The resolution method](assets/05-unification-automated-reasoning/slide-l10-11.png)

```text
从子句集 Σ 开始
当 ⊥ ∉ Σ 时：
    向 Σ 加入 某个 C ∈ Σ 的因子
           或 某两个 C1, C2 ∈ Σ 的归结式
```

幻灯片留下的问题是：这个过程一定会停吗？要分开问不可满足的输入和可满足的输入。下面两张幻灯片分别回答。

<!-- Sources: L10 p.11; Apple Notes LEC10 -->

### 公平性

![L10 slide 14 - The need for fairness](assets/05-unification-automated-reasoning/slide-l10-14.png)

对不可满足的输入，只有搜索策略**公平（fair）**时才能保证停下。图中的子句集是 $\{Q\}$ 、 $\{\lnot Q\}$ 、 $\{\lnot P(x),P(f(x))\}$ 。连线显示：第三条与它自己改名后的副本（ $\{\lnot P(y),P(f(y))\}$ ）归结，得 $\{\lnot P(x),P(f(f(x)))\}$ ；再和原子句归结，得 $\{\lnot P(x),P(f(f(f(x))))\}$ ……可以无穷地进行。星号注释强调：不改名，自己与自己的合一会因发生检查失败。

公平的策略保证每一对可以归结的子句迟早都会被尝试，因此迟早会选中 $\{Q\}$ 与 $\{\lnot Q\}$ ，立刻得到 $\bot$ 。

<!-- Sources: L10 p.14; Apple Notes LEC10 -->

### 归结的能力

![L10 slide 15 - The power of resolution](assets/05-unification-automated-reasoning/slide-l10-15.png)

**定理**： $\Sigma$ 不可满足，当且仅当归结方法能在**有限**步内加入 $\bot$ 。也就是说，归结**可靠**（sound：推出 $\bot$ 时 $\Sigma$ 真的不可满足）且**反驳完备**（refutation-complete：只要不可满足，就一定能推出 $\bot$ ）。

但它**不是判定过程**（decision procedure）：对可满足的输入可能永远不停，例如上图去掉 $\{\lnot Q\}$ 之后，搜索可以一直产生新子句。幻灯片进一步说明，谓词逻辑不存在这样的判定过程——有效性与不可满足性只是**半可判定的（semi-decidable）**：答案为“是”时能在有限时间确认，答案为“否”时可能永远等不到。

<!-- Sources: L10 p.15; Apple Notes LEC10 -->

**补充**：学生笔记把这一节标成“Halting Problem”。二者确有联系——“这个过程会不会停”正是停机问题式的提问，[第 12 篇](12-decidability-universality.md)会证明一般的停机问题不可判定。

<a id="topic-5"></a>
## 5. Horn 子句与自动推理

### Horn 子句与 Prolog

![L10 slide 16 - Horn clauses and Prolog](assets/05-unification-automated-reasoning/slide-l10-16.png)

**Horn 子句**是**至多含一个正文字**的子句。蝌蚪例子的七条子句都是 Horn 子句。把负文字移到蕴含左边，就得到“若干条件推出一个结论”的读法：

- $\{\lnot T(z),\lnot D(y),\lnot E(y,z),M(z)\}$ 读成 $(T(z)\land D(y)\land E(y,z))\to M(z)$ （规则）；
- 只有一个正文字的 $\{W(camilla)\}$ 读成 $\top\to W(camilla)$ （事实）；
- 没有正文字的 $\{\lnot T(z),\lnot M(z)\}$ 读成 $T(z)\land M(z)\to\bot$ （目标的否定）。

幻灯片下方是同一条规则在逻辑程序语言 Prolog 中的写法： `:-` 读作“如果”，逗号读作“并且”，大写开头的 `Z`、`Y` 是变量。

```prolog
miserable(Z) :- tadpole(Z),
                deepwaterfish(Y),
                eats(Y,Z).
```

<!-- Sources: L10 p.16; Apple Notes LEC10 -->

第 10 讲下一页补充：对命题 Horn 子句，可满足性能在**线性时间**内判定；对逻辑程序，限制为 Horn 子句简化了搜索，但没有消除搜索。

<!-- Sources: L10 p.17 -->

### Horn 公式的可满足性算法

![L10 slide 23 - Horn satisfiability marking algorithm](assets/05-unification-automated-reasoning/slide-l10-23.png)

算法只做“标记”：

1. 列出公式 $\phi$ 中出现的所有原子，以及 $\bot$ 、 $\top$ ；
2. 若 $\top$ 在列表中，标记 $\top$ ；
3. 只要存在 Horn 子句 $P_1\land\dots\land P_n\Rightarrow Q$ ，前件都已标记而 $Q$ 未标记，就标记 $Q$ ；
4. 若 $\bot$ 被标记，返回“不可满足”；否则返回“可满足”。

可满足时，幻灯片右下角给出满足赋值：被标记的原子为真（T），未标记的为假（F）。直观上，这个算法只标记“被迫为真”的原子，所以如果连它都推出 $\bot$ ，就真的无法满足；反之，把其余原子都设为假不会违反任何子句。

<!-- Sources: L10 p.22-23; Apple Notes LEC10 -->

**理解用例（自拟）**： $\phi=(\top\to P)\land(P\to Q)\land(Q\land R\to\bot)$ 。标记 $\top$ ，再标记 $P$ ，再标记 $Q$ ；第三条需要 $R$ 已标记，但 $R$ 没有被任何规则推出，所以 $\bot$ 不会被标记。结论：可满足，赋值 $P=Q=\mathrm{T}$ 、 $R=\mathrm{F}$ 。

### 等式

![L10 slide 26 - Axiomatising equality](assets/05-unification-automated-reasoning/slide-l10-26.png)

要在自动推理中处理等号，可引入新谓词 $eq(X,Y)$ 并给出公理（幻灯片中为了易读仍写成 $=$ ）：

- 自反 $x=x$ ；对称 $x=y\Leftrightarrow y=x$ ；传递 $x=y\land y=z\Rightarrow x=z$ ；
- 对每个函数符号 $f$ 和谓词符号 $P$ 的同余公理 $x=y\Rightarrow f(x)=f(y)$ 、 $x=y\land P(x)\Rightarrow P(y)$ 。

幻灯片留下的问题是：这样做效率高吗？不高：同余公理要为每个符号各写一份，而对称、传递公理可以与几乎任何等式子句归结，搜索空间会大幅膨胀。

<!-- Sources: L10 p.26 -->

### 自动推理这个领域

自动推理（automated reasoning）从 20 世纪 50 年代起就是一个研究领域：用计算机在某种逻辑中推理，传统上属于人工智能（但不是机器学习）。本课只看其中的自动定理证明。主问题是：给定公理 $\{A_1,\dots,A_n\}$ 与猜想 $C$ ，判断 $A_1,\dots,A_n\models C$ 是否成立。

<!-- Sources: L10 p.27-28 -->

![L10 slide 29 - Robbins conjecture](assets/05-unification-automated-reasoning/slide-l10-29.png)

为什么这件事有意思？幻灯片举的第一个例子是 Robbins 猜想：数学中多年悬而未决，1996 年由计算机程序证明（McCune）。下方框里是它的一个简单等式陈述， $n$ 可以理解为“非”， $+$ 理解为“或”。第二个例子（第 30 页的验证工具截图）是程序与安全协议验证：一个验证任务常被翻译成许多个小的推理问题，交给自动推理程序。

<!-- Sources: L10 p.29-30 -->

![L10 slide 31 - Why classical predicate logic](assets/05-unification-automated-reasoning/slide-l10-31.png)

最后一张幻灯片解释为什么多数工作采用经典谓词逻辑：它是表达力与可自动化之间的折中。

- **表达力**：任何可计算问题都能编码，其中许多编码很自然；一些更复杂的逻辑也能较好地翻译成一阶逻辑（FOL）。
- **可自动化**：存在可靠且完备的演算（例如本篇的归结），搜索效率也还过得去。

<!-- Sources: L10 p.31 -->

## 本讲自测

1. 求 $P(x,f(y),y)$ 与 $P(g(z),f(a),z)$ 的 mgu，并写出每一步用到的规则编号。
2. $Q(x,x)$ 与 $Q(f(y),y)$ 能合一吗？若不能，在哪一步、因为哪条规则失败？
3. 为什么只有归结、没有因子化时，归结方法不完备？用本讲的例子说明。
4. 对 Horn 公式 $(\top\to P)\land(P\to Q)\land(P\land Q\to\bot)$ 运行标记算法，给出结论。
