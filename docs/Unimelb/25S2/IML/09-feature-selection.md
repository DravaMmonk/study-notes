# COMP90049 Lecture 13 - Feature Selection

来源：`lecture/13-featureselection.pdf`；Apple Notes：CS/25S2/IML — "W7L13 Feature Selection"、"★2 Feature Engineering"、"★1 Statistics"、"★3.4 Cross-Model Strategies"。

这篇讲的是：**成千上万个特征里，哪些真正有用？怎样在可接受的时间里把它们挑出来？**

学习路线：[为什么要选、怎样分类](#topic-1) → [单变量过滤](#topic-2) → [多变量选择为何困难](#topic-3) → [过滤、包装与嵌入](#topic-4) → [L1 正则化](#topic-5)。

重点：S2N 与互信息、前向选择与后向消除。难点：wrapper 与 embedded 的训练次数差别。易错：单变量方法看不到特征组合的作用。

<a id="topic-1"></a>
## 1. 为什么要选特征

### 特征选择在流程中的位置

![Slide 04 - Feature selection in the supervised pipeline](assets/09-feature-selection/slide-04.png)

沿箭头读这张流程图：整理好的数据先分成训练、验证、测试三份；训练集喂给学习算法得到模型，模型在验证集上预测得到表现。右上角的 **特征选择（feature selection）** 方框用虚线连到验证表现：它根据验证结果决定喂给算法哪些属性。最后的模型才在测试集上测一次。

机器学习者要做三件事：检查和清理数据；选适合数据的模型；**为这个模型选有用的属性**。
<!-- Sources: L13 p.4-5 -->

### 好特征的标准

![Slide 07 - Select k of d features](assets/09-feature-selection/slide-07.png)

图中数据矩阵 $X$ 有 $n$ 行（实例）、 $d$ 列（特征）；黄色的 $k$ 列是挑出来的特征。低层特征往往有成千上万甚至上百万个，特征选择就是从 $d$ 列里留下 $k$ 列。

好特征的主要目标是在某个评价指标上表现更好；附带的好处是：看到重要特征能启发我们发现其他重要特征；特征更少，模型更小，回答更快，也更容易理解。
<!-- Sources: L13 p.5-7 -->

### 四个术语

| 术语 | 含义 |
| --- | --- |
| 单变量（univariate） | 一次只考虑一个特征 |
| 多变量（multivariate） | 把若干特征作为子集一起考虑 |
| 过滤法（filter） | 不依赖分类器，用统计量给特征（或子集）排序 |
| 包装法（wrapper） | 用分类器的表现来评价特征（或子集） |
<!-- Sources: L13 p.8 -->

<a id="topic-2"></a>
## 2. 单变量过滤方法

单独评价每个属性的“好坏”，与模型无关，时间与属性数成线性。一个单独的好特征应当与标签“相关”：仅凭它自己就能预测标签。这里的“相关”是宽泛的说法，既适用于连续值也适用于离散值。
<!-- Sources: L13 p.10 -->

### 连续特征：信噪比

![Slide 11 - Signal-to-noise ratio](assets/09-feature-selection/slide-11.png)

图中蓝色和红色柱子是两个类在特征 $X_i$ 上的分布；顶部的 $\mu_-$ 、 $\mu_+$ 标出两类均值，底部的 $\sigma_-$ 、 $\sigma_+$ 标出两类各自的标准差。**信噪比（signal-to-noise ratio, S2N）** 是

$$
\mathrm{S2N}=\frac{\lvert\mu_{+}-\mu_{-}\rvert}{\sigma_{+}+\sigma_{-}} .
$$
<!-- Sources: L13 p.11 -->

分子是两类均值的距离（信号），分母是两类各自的散布（噪声）。两团分得越开、各自越紧凑，S2N 越大，这个特征越能区分两类。
<!-- Sources: L13 p.11; Apple Notes W7L13 Feature Selection -->

### 离散特征：一眼看出好坏

![Slide 12 - Good and bad discrete features](assets/09-feature-selection/slide-12.png)

左右两张表是同一份数据，绿色格子标出值得对比的位置。左表： $x_1$ 取 A 的两行 $c$ 都是 Y，取 B 的两行都是 N，所以 $x_1$ 很可能是好特征。右表： $x_2=C$ 的两行一行是 Y、一行是 N， $x_2$ 的取值与 $c$ 毫无规律，它很可能不好。
<!-- Sources: L13 p.12 -->

### 互信息

![Slide 13 - Mutual information](assets/09-feature-selection/slide-13.png)

量化这种依赖关系的是 **互信息（mutual information）** $I(Y,X_i)$ 。PPT 下方是连续变量的积分形式（图中方框是 PDF 字体缺失，原本是积分号和无穷符号）；我们主要用下一页的离散形式。

- $I(Y,X_i)=0$ ： $Y$ 与 $X_i$ 独立；
- $I(Y,X_i)>0$ ：两者相关，值越大依赖越强；选 $I$ 大的特征。
<!-- Sources: L13 p.13 -->

![Slide 14 - Empirical mutual information](assets/09-feature-selection/slide-14.png)

对离散变量，用训练集上的频率作为概率的经验估计。PPT 中 $\delta(y,y_t)$ 在两者相等时为 1、否则为 0，所以 $\hat{P}(y,x_i)$ 就是“同时取这两个值的样本数 ÷ $n$ ”：

$$
\hat{I}(Y,X_i)=\sum_{y\in\{-1,+1\}}\ \sum_{x_i=1}^{k}\hat{P}(y,x_i)\log\frac{\hat{P}(y,x_i)}{\hat{P}(y)\,\hat{P}(x_i)} .
$$
<!-- Sources: L13 p.14 -->

互信息就是 [决策树](03-DT.zh.md) 里的 **信息增益（information gain）**，也可用熵来算（熵的定义见 [01 概率](01-probability.zh.md)）：

$$
I(X;Y)=H(X)-H(X\mid Y)=H(Y)-H(Y\mid X).
$$
<!-- Sources: L13 p.16 -->

#### 用课件数据算一遍

![Slide 15 - Mutual information worked example](assets/09-feature-selection/slide-15.png)

左边是 8 个实例；中间两张小表分别数出 $\hat{P}(Y)$ 和 $\hat{P}(X_2)$ ；右边是联合频率 $\hat{P}(Y,X_2)$ ，箭头表示每一项分母要用到哪两个边缘概率。下方算式是 PPT 的代入式，数值为笔记自算：

| | $X_2=1$ | $X_2=2$ | $X_2=3$ |
| --- | --- | --- | --- |
| $Y=-1$ | 1/8 | 2/8 | 1/8 |
| $Y=+1$ | 2/8 | 0 | 2/8 |

逐项代入（以 2 为底，概率为 0 的项记为 0）：

$$
\hat{I}(Y,X_2)=2\cdot\tfrac{1}{8}\log_2\tfrac{2}{3}+\tfrac{2}{8}\log_2 2+2\cdot\tfrac{2}{8}\log_2\tfrac{4}{3}\approx-0.146+0.25+0.208=0.31\ \text{bits}.
$$
<!-- Sources: L13 p.15 -->

**补充：逐点互信息。** 公式里的每一项 $\log\frac{P(x,y)}{P(x)P(y)}$ 叫 **逐点互信息（pointwise mutual information, PMI）**：等于 0 表示 $x$ 与 $y$ 共现的次数符合独立时的预期；大于 0 表示比预期更常一起出现（正相关）；小于 0 表示更少一起出现。互信息就是 PMI 按 $P(x,y)$ 加权的平均。上面的负项来自“比预期少见”的组合。
<!-- Sources: Apple Notes ★1 Statistics; L13 p.15 -->

### 其他单变量方法

![Slide 17 - Chi-squared and ANOVA](assets/09-feature-selection/slide-17.png)

PPT 给出两种统计检验，并附上 scikit-learn 的 `SelectKBest` 用法：把打分函数换成 `f_classif`（或 p.16 的 `mutual_info_classif`），保留得分最高的 $k$ 个特征。下一页再加上相关系数法，三者对比如下：

| 方法 | 用途 |
| --- | --- |
| 卡方检验（ $\chi^2$ ） | 检验类别型变量之间是否有显著关联；用于类别特征的分类任务 |
| ANOVA F 值 | 评价单个特征的显著性；用于连续特征的分类任务 |
| 基于相关的特征选择（CFS） | 衡量特征与目标的相关性（如 Pearson 相关），选相关系数绝对值大的 |
<!-- Sources: L13 p.17-18 -->

<a id="topic-3"></a>
## 3. 多变量选择为何困难

### 单变量选择可能失败

![Slide 20 - Univariate selection may fail](assets/09-feature-selection/slide-20.png)

看坐标轴下方和左侧的投影：只看 $x_1$ 或只看 $x_2$ ，圆圈和星星都混在一起；但两个特征合起来，就能用一条斜线（左图）或几条线（右图）把它们分开。单个特征都“没用”，组合起来却很有用——单变量方法会漏掉这种情况。
<!-- Sources: L13 p.20 -->

### 穷举所有子集

![Slide 22 - Exhaustive subset search](assets/09-feature-selection/slide-22.png)

最直接的多变量方法：对每个特征子集训练模型、在验证集上评估，选最好的子集（左边表格从空集、单个属性一直列到多个属性）。它能找到对 **这个学习器** 在验证数据上最优的特征组合，但右边的求和告诉我们， $d$ 个特征有

$$
\binom{d}{0}+\binom{d}{1}+\cdots+\binom{d}{d}=2^{d}
$$

个子集，并不实用。
<!-- Sources: L13 p.21-22 -->

![Slide 23 - Lattice of feature subsets](assets/09-feature-selection/slide-23.png)

**格（lattice）** 中每个结点是一串 0/1：第 $j$ 位为 1 表示选了第 $j$ 个特征。最上面 0,0,0,0 是空集，最下面 1,1,1,1 是全选；相邻两层之间的边表示加入或删去一个特征。红色箭头举了两个例子：1,1,0,0 是选了第 1、2 个特征。后面的前向选择、后向消除都是在这张图上沿边走。
<!-- Sources: L13 p.23 -->

假设每次“训练 + 评估”只需 10 秒， $2^d$ 个子集约需 $2^d/6$ 分钟： $d=10$ 时约 3 小时， $d=60$ 时约 $3.2\times10^{15}$ 小时。只有特征极少时才可行。
<!-- Sources: L13 p.24 -->

### 怎样评估一个特征子集

![Slide 25 - Feature subset assessment](assets/09-feature-selection/slide-25.png)

左边的数据块横向是 $d$ 个特征，纵向是 $n$ 个样本，被横切成 $n_{train}$ 、 $n_{val}$ 、 $n_{test}$ 三段。对每个子集在训练集上训练，选在验证集上最好的子集，最后在测试集上测一次。这与 [08 评估](08-evaluation.md) 中调超参数的道理相同：选择过程用过的数据不能再用来报告最终表现。
<!-- Sources: L13 p.25 -->

**重点：没有放之四海皆准的方法。** 数据类型、分布、学习算法千差万别；要注意复杂度，单变量选择有时反而比多变量更好；特征选择也并不总是必要的。
<!-- Sources: L13 p.26 -->

<a id="topic-4"></a>
## 4. 过滤、包装与嵌入

| | 准则 | 搜索 | 评估 |
| --- | --- | --- | --- |
| 过滤（filter） | 特征（子集）与标签 $Y$ 的“相关性” | 通常直接排序 | 不直接评估，可用交叉验证决定保留多少个 |
| 包装（wrapper） | 特征子集对预测 $Y$ 的“有用程度” | 在子集空间中搜索，**每个候选子集都训练一个新分类器** | 交叉验证 |
| 嵌入（embedded） | 同上 | 用已训练分类器的知识引导搜索，避免为每个候选都重新训练 | 交叉验证；比 wrapper 便宜 |
<!-- Sources: L13 p.28-30 -->

### 前向选择

![Slide 31 - Forward selection (wrapper)](assets/09-feature-selection/slide-31.png)

**前向选择（forward selection）** 从顶端的空集 0,0,0,0 出发。粗黑箭头是每一步试过的候选，红色结点是被保留的那一个：第一层把 4 个单特征都试一遍，留下 0,1,0,0；第二层从它出发试 3 个，留下 1,1,0,0……wrapper 版本总共 $d+(d-1)+\cdots+1=\frac{d(d+1)}{2}=10$ 次训练—评估。
<!-- Sources: L13 p.31-32 -->

- 优点：最优子集 **较小** 时表现最好；
- 缺点：属性多时很慢；贪心，可能停在次优（甚至很差）的解；大数据集上不可行。
<!-- Sources: L13 p.32 -->

![Slide 33 - Forward selection (embedded)](assets/09-feature-selection/slide-33.png)

和上一张比，这里每层只有一条粗箭头：嵌入式版本走的是同一种路径，但每一步用当前分类器提供的信息直接判断加哪个特征，只在加入后训练一次，总共只有 $d=4$ 次训练—评估。
<!-- Sources: L13 p.33 -->

### 后向消除

![Slide 34 - Backward elimination (wrapper)](assets/09-feature-selection/slide-34.png)

**后向消除（backward elimination）** 方向相反：从底部的全集 1,1,1,1 出发，每一步删去一个特征，箭头向上走。wrapper 版本同样要把每个候选删除都试一遍，共 $\frac{d(d+1)}{2}$ 次训练。

![Slide 36 - Backward elimination (embedded)](assets/09-feature-selection/slide-36.png)

嵌入式版本每层只走一条边，只需 $d$ 次训练。后向消除一开始就能去掉最不相关的属性，最优子集 **较大** 时表现最好；缺点与前向选择相同。
<!-- Sources: L13 p.34-36 -->

#### 例子：用 SVM 做递归特征消除

![Slide 37 - Recursive feature elimination with SVM](assets/09-feature-selection/slide-37.png)

PPT 上的方框是 PDF 字体缺失：第一个公式中是求和号 $\sum$ ，约束中依次是点积 $\cdot$ 和 $\ge$ 。线性 [SVM](06-SVM.zh.md) 最小化 $\frac12\lVert\theta\rVert^2=\frac12\sum_j\theta_j^2$ 。左下的红色弧形箭头表示循环，嵌入式的 **递归特征消除（recursive feature elimination, RFE）** 是：

```text
S = {1, ..., d}                       # start with all features
repeat:
    train an SVM θ on the features in S
    j = the feature in S with the smallest θ_j^2
    S = S − {j}
    check that the validation error does not get worse
```

权重平方最小的特征对决策边界贡献最小，所以先删它；只需每步训练一次。若做成 wrapper，就不看 $\theta_j^2$ ，而是对每个候选删除都训练、评估一个模型再比较。
<!-- Sources: L13 p.37-38 -->

<a id="topic-5"></a>
## 5. L1 正则化：在训练中直接选特征

### L0：直接数非零权重

![Slide 40 - L0-norm regularized SVM](assets/09-feature-selection/slide-40.png)

另一种思路不是挑子集，而是 **直接让算法少用特征**：改写 SVM 的目标，鼓励 $\theta$ 中出现 0。PPT 的目标里 $1-\delta(\theta_j,0)$ 在 $\theta_j\ne0$ 时为 1，所以求和就是非零权重的个数，即 **L0 范数**（方框同样是缺失的 $\sum$ 、点积和 $\ge$ ）。
<!-- Sources: L13 p.40 -->

但这个目标不连续、非凸；最小化它是组合难题，可能要试遍 $2^d$ 个子集。
<!-- Sources: L13 p.41 -->

### L1：可以优化的近似

![Slide 42 - L1-norm regularized SVM](assets/09-feature-selection/slide-42.png)

把目标换成权重绝对值之和，即 **L1 范数**（PPT 右侧注明也叫 taxicab / Manhattan 范数）。约束不变：

| 目标 | 含义 | 性质 |
| --- | --- | --- |
| $\min\sum_{j=1}^{d}\big(1-\delta(\theta_j,0)\big)$ ，约束 $y_i(\theta\cdot\mathbf{x}_i)\ge1$ | L0 范数：非零权重的个数 | 不连续、非凸；组合上很难 |
| $\min\sum_{j=1}^{d}\lvert\theta_j\rvert$ ，约束同上 | L1 范数 | 凸函数，可以优化；解通常只有少数非零项 |
<!-- Sources: L13 p.40-42 -->

L1 是 L0 的可优化近似：最优解 $\theta^*$ 中大多数分量为 0，对应的特征就被“选掉”了。
<!-- Sources: L13 p.42; Apple Notes W7L13 Feature Selection -->

**补充：正则化的统一写法。** 学生复习笔记把这类做法统一成“损失 + 惩罚”：

$$
J(\theta)=\mathrm{Loss}(\theta)+\lambda\,P(\theta),\qquad
P_{L1}(\theta)=\sum_j\lvert\theta_j\rvert,\qquad P_{L2}(\theta)=\sum_j\theta_j^2 .
$$

L1 容易产生稀疏解，可用于特征选择；L2 只把权重整体压小（见 [05](05-LR.zh.md)）；L0 离散、不可导，梯度下降无法优化。
<!-- Sources: Apple Notes ★3.4 Cross-Model Strategies; Apple Notes ★2 Feature Engineering; L13 p.41-42 -->

## 本讲自测

1. 特征 A 在两类上的均值是 10 和 12，标准差都是 0.5；特征 B 的均值是 10 和 20，标准差都是 10。哪个 S2N 更高？
2. 有 20 个特征。前向选择的 wrapper 版本和 embedded 版本各需要多少次训练—评估？穷举需要多少次？
3. 为什么两个单独看都与标签无关的特征，组合后可能完美分类？哪类方法能发现这一点？
4. 为什么用 L1 而不是 L0 作为 SVM 的特征选择目标？
