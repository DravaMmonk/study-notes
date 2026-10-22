# COMP90049 Lecture 20 - Ensemble Learning

来源：`lecture/20-ensembles.pdf`；Apple Notes：CS/25S2/IML — "W10L20 Ensemble Learning"、"★3.3 Ensemble Learning"。

这篇讲的是：**与其挑一个“最好”的分类器，能不能把许多个（较弱或不稳定的）分类器组合成一个更强的？**

学习路线：[为什么组合有效](#topic-1) → [四种制造差异的方法](#topic-2) → [Stacking](#topic-3) → [Bagging 与随机森林](#topic-4) → [Boosting 与 AdaBoost](#topic-5)。

重点：集成有效的两个条件；bagging 降方差、boosting 降偏差。难点：AdaBoost 的分类器权重与样本权重更新。易错：stacking 的元分类器不能“看到”基分类器训练时用过的数据。

<a id="topic-1"></a>
## 1. 为什么组合有效

**集成学习（ensemble learning，也叫分类器组合）**：从训练数据构造一组 **基分类器（base classifiers）**，再把它们的输出汇总成一个 **元分类器（meta-classifier）**。两个直觉：许多弱分类器组合起来至少可以和一个强分类器一样好；若干强分类器组合起来（通常）至少和其中最好的一样好。
<!-- Sources: L20 p.2-4 -->

### 两个条件

![Slide 07 - When does majority voting work](assets/13-ensemble-learning/slide-07.png)

三个表各是三个分类器 $C_1,C_2,C_3$ 在三个测试实例 $t_1,t_2,t_3$ 上的对错（√/×）， $C^*$ 是多数投票的结果。A 中每个分类器错在不同的实例上，投票后全对；B 中大家错在同一个实例上，投票救不回来；C 中每个分类器都只对一个（橙色格子），投票后全错。B、C 被打上红叉，所以集成需要：
<!-- Sources: L20 p.5-7 -->

1. 基分类器 **不犯同样的错误**（偏差不同）；
2. 基分类器 **有一定准确度**（好于随机猜测）。
<!-- Sources: L20 p.5 -->

### 错误率能降多少

![Slide 09 - Ensemble error vs base error](assets/13-ensemble-learning/slide-09.png)

横轴是基分类器错误率，纵轴是集成错误率。蓝色虚线是“所有基分类器完全相同”的情况：集成等于单个分类器。红线是独立基分类器：错误率小于 0.5 时，集成错误率被压到更低（绿色区域，黑色虚线标出 0.35 对应约 0.06）；大于 0.5 时反而更糟。集成在基分类器 **略好于随机**（ $\epsilon<0.5$ ）时就有效。
<!-- Sources: L20 p.8-9 -->

![Slide 11 - Binomial ensemble error](assets/13-ensemble-learning/slide-11.png)

这一页算出上图那一点：假设有 25 个相互独立的二分类基分类器，每个错误率 $\epsilon=0.35$ ，多数投票时，超过一半（至少 13 个）出错才会出错：

$$
\sum_{i=13}^{25}\binom{25}{i}\epsilon^{i}(1-\epsilon)^{25-i}\approx0.06 .
$$
<!-- Sources: L20 p.10-11 -->

红色箭头指出这是 **二项分布（binomial distribution）**：多个独立伯努利试验之和。PPT 也提醒独立性在现实中通常不成立，所以这是理想情况。
<!-- Sources: L20 p.10-11 -->

### 最简单的组合：投票

分类时取多数基分类器预测的类；回归时对数值预测取平均，例如 0.8、0.7、0.2、0.9 平均为 0.65。
<!-- Sources: L20 p.12 -->

<a id="topic-2"></a>
## 2. 四种制造差异的方法

![Slide 13 - Instance and feature manipulation](assets/13-ensemble-learning/slide-13.png)

![Slide 14 - Algorithm and class label manipulation](assets/13-ensemble-learning/slide-14.png)

这两页列出让基分类器“犯不同错误”的四种办法。第一页的例子把特征表拆成 [age, state, …] 与 [experience, education, …] 两份数据；第二页把五个类 A–E 改写成 [A; not A] 或 [A or B; C or D or E] 这样的二分类问题，“可逆”指最后还能把这些答案拼回原来的五类。

| 方法 | 做法 |
| --- | --- |
| 实例操作（instance manipulation） | 通过抽样生成多个训练集，每个训练一个基分类器 |
| 特征操作（feature manipulation） | 用不同的特征子集生成多个训练集 |
| 算法操作（algorithm manipulation） | 调整同一算法的内部参数（如随机种子、超参数）得到多个基分类器 |
| 类别标签操作（class label manipulation） | 以可逆的方式改写标签 |
<!-- Sources: L20 p.13-14; Apple Notes W10L20 Ensemble Learning -->

![Slide 15 - Three main algorithms](assets/13-ensemble-learning/slide-15.png)

本讲的三个主要算法分别用了上面不同的操作：

| 算法 | 基分类器 | 制造差异的方式 | 主要作用 |
| --- | --- | --- | --- |
| Stacking | 不同模型（或同一模型配不同特征） | 模型本身不同 / 特征操作 | 平滑不同算法的偏差 |
| Bagging（例：随机森林） | 同一分类器 | 实例操作（随机森林再加特征操作） | 降低方差 |
| Boosting（例：AdaBoost） | 同一分类器 | 实例与算法操作 | 降低偏差 |
<!-- Sources: L20 p.15 -->

偏差与方差的含义见 [08 评估](08-evaluation.md)。

<a id="topic-3"></a>
## 3. Stacking

直觉：用一组偏差各不相同的算法“抹平”彼此的错误。简单投票假设各分类器表现相当；**元分类（meta classification）** 则在基分类器的输出上再训练一个分类器。
<!-- Sources: L20 p.18 -->

### 两层结构

![Slide 20 - Stacking meta classification](assets/13-ensemble-learning/slide-20.png)

从左往右读：同一份训练数据分别训练 C1、C2、C3，它们的预测 P1、P2、P3（红色虚线框，即 Level 0 预测）一起送进三角形的元分类器，得到最终预测。

- **第 0 层**：在训练集 $(X,y)$ 上训练神经网络、朴素贝叶斯、决策树等，得到预测 P1、P2、P3；
- 把这些预测（可选地再加上置信度等信息）作为新属性： $X_{\text{new}}=[\hat{Y}_{C1},\hat{Y}_{C2},\hat{Y}_{C3},\dots,X_{\text{old}}]$ ，原特征可保留也可丢掉；
- **第 1 层**：在新属性上训练元分类器，通常用逻辑回归。
<!-- Sources: L20 p.19-20 -->

### 用嵌套交叉验证避免泄露

![Slide 22 - Nested cross-validation for stacking](assets/13-ensemble-learning/slide-22.png)

**易错：** 第 0 层分类器绝不能见过第 1 层的测试数据。做法是 **嵌套交叉验证（nested cross-validation）**：外层（蓝色，Level 1）把数据切成若干折，每次留一折（斜线）测试元分类器；红色箭头表示把外层的训练部分拿出来，在内层（绿色，Level 0）再做交叉验证，训练基分类器、产生它们的预测。这样内部模型从不接触第 1 层的测试折，又有足够数据训练，而且所有数据最终都能用来测试元分类器。
<!-- Sources: L20 p.18, p.21-22 -->

如果基分类器在全部数据上训练，再在同一批数据上产生预测，这些预测会过于乐观；元分类器学到的就是不会在新数据上出现的输入。

Stacking 数学上简单但计算昂贵；能组合表现各异的异质分类器；通常至少和最好的基分类器一样好；在应用研究中常见，理论界兴趣较少。
<!-- Sources: L20 p.23 -->

<a id="topic-4"></a>
## 4. Bagging 与随机森林

### Bagging

直觉：数据越多，表现越好（方差越低）。怎样从固定的训练集中得到“更多”数据？用 **有放回抽样（bootstrap）** 构造新数据集：从原数据随机抽 $N$ 次、有放回，得到同样大小的新数据集。某个实例一次也没被抽中的概率是 $(1-\frac{1}{N})^{N}\approx0.37$ ，这也削弱了离群值的影响。构造 $k$ 个数据集、训练 $k$ 个基分类器，最后投票。这就是 **bagging（bootstrap aggregating）**。
<!-- Sources: L20 p.25 -->

![Slide 26 - Bootstrap samples](assets/13-ensemble-learning/slide-26.png)

原数据是 1–10。看黄色的 2 和绿色的 10：在不同的 bootstrap 样本里，它们有时出现多次，有时一次也不出现。每个样本都和原数据一样大，但内容不同。
<!-- Sources: L20 p.26 -->

![Slide 27 - Bagging pipeline](assets/13-ensemble-learning/slide-27.png)

图把整个流程画成三层：顶部的原始数据经 bootstrapping 抽出多份样本（每份颜色比例略有不同），每份训练一个分类器，最后 aggregating 合成集成分类器。

- 由于 bagging 靠抽样来降低方差，基分类器应当 **不稳定（高方差）**，例如 [决策树](03-DT.zh.md)；
- 方法简单，基于抽样和投票；基分类器可以并行训练；
- 对噪声数据非常有效（离群值可能在一些样本中消失）；
- 表现通常显著好于基分类器，只是偶尔明显更差。
<!-- Sources: L20 p.27-28 -->

### 随机森林

**随机树（random tree）** 是在每个结点只考虑部分属性的决策树，例如所有属性中固定比例 $\tau$ 的一部分（排除树上更早用过的）。这是特征操作：试图控制无用属性的影响；比确定性的决策树建得快得多，但单棵树方差更大。
<!-- Sources: L20 p.30 -->

![Slide 31 - Random forest voting](assets/13-ensemble-learning/slide-31.png)

三棵树的形状和分裂各不相同（红色小箭头是各自的决策路径），最后一起投票。橙色字点出思路：降低各棵随机树之间的相关性。**随机森林（random forest）**：许多随机树的投票集成，每棵树用不同的 bagging 训练集（实例操作）。目标是降低整体模型方差，同时不引入（组合后的）偏差。
<!-- Sources: L20 p.31 -->

![Slide 32 - Random forest hyperparameters](assets/13-ensemble-learning/slide-32.png)

| 超参数 | 说明 |
| --- | --- |
| 树的数量 $B$ | 可用 **袋外误差（out-of-bag error）** 调：每个实例只参与约 63% 的树的训练，对其余的树它就是袋外样本，相当于验证集 |
| 特征子样本大小 | 增大时，单棵树更强，树之间的相关性也更高；常用 $\lfloor\log_2\lvert F\rvert+1\rfloor$ |
<!-- Sources: L20 p.32; Apple Notes W10L20 Ensemble Learning -->

63% 与上面的 37% 是同一件事的两面：一个实例出现在某个 bootstrap 样本里的概率约为 $1-0.37$ 。单个实例的预测逻辑可以沿着各棵树一路追踪（很繁琐），整体模型的逻辑则难以说清（PPT 写作 “???”）。实际特性：通常表现很强；可并行；出奇地高效；不易过拟合；牺牲了可解释性。
<!-- Sources: L20 p.32-33 -->

<a id="topic-5"></a>
## 5. Boosting 与 AdaBoost

### 思路

直觉：让基分类器专注于“难分”的实例。做法：根据上一轮分类器的表现，迭代地改变训练实例的分布和权重。开始时每个实例被抽到的概率都是 $1/N$ ；共 $T$ 轮，每轮训练一个分类器，按实例是否分对更新权重；最后加权投票组合基分类器。
<!-- Sources: L20 p.36 -->

![Slide 37 - Boosting samples](assets/13-ensemble-learning/slide-37.png)

和 bagging 的抽样图对比：红色的 4 在第 1 轮出现一次，第 2 轮出现三次，到第 3 轮占了一半样本。它一直被分错，权重不断增大，于是越来越常被抽中。
<!-- Sources: L20 p.37 -->

### AdaBoost 的四步

**AdaBoost（adaptive boosting）** 是顺序集成方法，基分类器通常是 **决策树桩（decision stump）**，即只做一次划分的树（见 [03](03-DT.zh.md) 的 One-R）。
<!-- Sources: L20 p.39 -->

![Slide 39 - AdaBoost error rate](assets/13-ensemble-learning/slide-39.png)

实例为 $\{(x_j,y_j)\}_{j=1}^{N}$ ，初始权重 $w^{(1)}_j=1/N$ 。第 $i$ 轮，**第 1 步：** 训练分类器 $C_i$ ，计算加权错误率。右侧红字说明指示函数 $\delta(\cdot)$ 在预测错时为 1、对时为 0，所以 $\varepsilon_i$ 就是分错样本的权重之和：

$$
\varepsilon_i=\sum_{j=1}^{N}w^{(i)}_j\,\delta\big(C_i(x_j)\ne y_j\big).
$$
<!-- Sources: L20 p.39 -->

![Slide 40 - Classifier importance alpha](assets/13-ensemble-learning/slide-40.png)

**第 2 步：** 计算分类器的重要性（对数几率）：

$$
\alpha_i=\frac{1}{2}\ln\frac{1-\varepsilon_i}{\varepsilon_i}.
$$

看曲线：横轴是 $\varepsilon$ ，纵轴是 $\alpha$ 。错误率越低， $\alpha_i$ 越大，投票越有分量。红框标出 $\varepsilon<0.5$ 时 $\alpha_i>0$ ：只信任好于随机的分类器；右侧 $\varepsilon>0.5$ 的部分标着 “IGNORE”。恰好 $\varepsilon=0.5$ 时 $\alpha=\frac12\ln1=0$ ：这个分类器的票不起作用，下一步的权重更新也不改变分布。
<!-- Sources: L20 p.40 -->

![Slide 41 - AdaBoost weight update](assets/13-ensemble-learning/slide-41.png)

**第 3 步：** 更新实例权重，为第 $i+1$ 轮做准备：

$$
w^{(i+1)}_j=\frac{w^{(i)}_j}{Z^{(i)}}\times
\begin{cases}e^{-\alpha_i} & \text{if } C_i(x_j)=y_j\\ e^{\alpha_i} & \text{if } C_i(x_j)\ne y_j\end{cases}
$$

$Z^{(i)}$ 是归一化项，让权重之和为 1。分错的样本权重增大，分对的减小。右上角的曲线是 $e^{\alpha_i}$ 随 $\alpha_i$ 增长：越可信的分类器，对它分错的样本“放大”得越厉害。
<!-- Sources: L20 p.41 -->

![Slide 42 - AdaBoost output and prediction](assets/13-ensemble-learning/slide-42.png)

**第 4 步：** 把加权的 $C_i$ 加入集成。最终输出 $\{(\alpha_1,C_1),\dots,(\alpha_T,C_T)\}$ ，预测时对每个类别 $y$ 把投给它的分类器的 $\alpha$ 加起来，取总和最大的类：

$$
C^{*}(x)=\arg\max_{y}\sum_{i=1}^{T}\alpha_i\,\delta\big(C_i(x)=y\big).
$$

只要每个基分类器好于随机，就保证收敛到一个更强的模型。
<!-- Sources: L20 p.42 -->

**理解用例（自拟）：** 10 个实例，权重都是 0.1；第一个树桩分错 2 个，所以 $\varepsilon=0.2$ ， $\alpha=\frac12\ln4\approx0.693$ ， $e^{\alpha}=2$ 、 $e^{-\alpha}=0.5$ 。

| | 个数 | 更新前权重 | 乘以 | 未归一化 | 归一化后（ $Z=0.8$ ） |
| --- | --- | --- | --- | --- | --- |
| 分错 | 2 | 0.1 | 2 | 0.2 | 0.25 |
| 分对 | 8 | 0.1 | 0.5 | 0.05 | 0.0625 |

更新后，两个分错的实例合计占一半权重：下一轮的分类器不得不认真对待它们。

### 小结与比较

Boosting 数学上复杂但计算便宜，基于迭代抽样和加权投票；因为是顺序的，比 bagging 更费时；在训练数据上有误差上界形式的性能保证；实际应用中容易过拟合。
<!-- Sources: L20 p.43 -->

![Slide 44 - Bagging vs boosting](assets/13-ensemble-learning/slide-44.png)

左右两列逐行对照：

| Bagging | Boosting |
| --- | --- |
| 并行抽样 | 迭代抽样 |
| 简单投票 | 加权投票 |
| 单一分类算法 | 单一分类算法 |
| 降低方差 | 降低（实例）偏差 |
| 不易过拟合 | 容易过拟合 |
<!-- Sources: L20 p.44 -->

## 本讲自测

1. 三个独立分类器错误率都是 0.4，多数投票的错误率是多少？若错误率都是 0.6 呢？
2. 为什么 bagging 适合决策树，却对 kNN（ $k$ 较大）帮助不大？
3. AdaBoost 中某一轮 $\varepsilon=0.5$ ，会发生什么？
4. Stacking 时，如果用全部训练数据训练基分类器，再用它们在同一批数据上的预测训练元分类器，问题在哪？
