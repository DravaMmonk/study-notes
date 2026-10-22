# COMP90049 Lectures 1–2 - Basic Concepts of Machine Learning

来源：`lecture/01-introduction.pdf`（p.13–45）、`lecture/02-mlconcepts.pdf`；Apple Notes：CS/25S2/IML — "★0 Introduction"、"★2 Feature Engineering"、"★3 Models"。概率复习见 [01 概率](01-probability.zh.md)。

这篇讲的是：**机器学习到底在“学”什么？数据要整理成什么样子，模型才能使用？**

学习路线：[什么是机器学习](#topic-1) → [需要的数学记号](#topic-2) → [实例、概念与学习方式](#topic-3) → [属性类型与转换](#topic-4) → [真实数据的问题](#topic-5) → [给模型分类](#topic-6)。

重点：监督与无监督、分类与回归的区别；三种属性类型；内积、范数与余弦。难点：等宽与等频离散化的取舍；缺失机制的判断。易错：把类别编号当成有大小关系的数字；离散化最后一箱要包含最大值。

<a id="topic-1"></a>
## 1. 什么是机器学习

### 从例子中学习

![L01 slide 14 - Machine learning inside AI and data science](assets/00-ml-concepts/slide-l01-14.png)

先看图中的三层圆：最外层是数据科学（data science，收集、整理、分析数据），中间是人工智能（artificial intelligence，让机器做“聪明”的决定），最里面的黄色小圆才是机器学习（machine learning）。它是 AI 的一个子集，也是数据科学的工具之一。

图下方那句话是定义的核心：机器学习让程序 **从数据中学会做判断**，而不是由人把每条规则写死。前一页的例子是小孩学习给事物贴标签：看过 Baby→Cute、Tiger→Cool 之后，再遇到 Koala 也能给出判断。目标就是给 **从未见过的新实体** 打上正确标签。
<!-- Sources: L01 p.13-15 -->

![L01 slide 15 - Definitions of machine learning](assets/00-ml-concepts/slide-l01-15.png)

这一页用四个问题拆开“学习”：

- **学什么？** 概念（concept），例如给输入贴标签、把邮件分到 {spam, no-spam}、发现数据里的模式；
- **从什么学？** 数据（data），要问数据从哪里来、可靠吗、有代表性吗；
- **怎么学？** 先定义一个 **模型（model）** 说明输入怎样变成输出，再设计 **学习算法（learning algorithm）** 去找最好的模型参数；
- **怎么知道真的学到了？** 数据越多，任务表现越好，而且这种进步要能被 **客观评估**。

接下来的三页（p.16–18）把它归纳成三个要素：

| 要素 | 要回答的问题 |
| --- | --- |
| 数据（data） | 离散还是连续？大数据还是小数据？有无标签？公开还是敏感？ |
| 模型（model） | 从输入到输出的函数；可以是概率模型或几何模型；函数的参数未知 |
| 学习（learning） | 在看到数据后改进任务表现，即为给定任务找到最好的模型参数；分监督与无监督 |
<!-- Sources: L01 p.16-18; Apple Notes ★0 Introduction -->

**补充：参数与超参数。** 模型 **参数（parameters）** 是学习要找的未知量；**超参数（hyper-parameters）** 在训练前就固定好，例如 kNN 的 $k$ 、决策树的最大深度。超参数怎样挑选见 [08 评估](08-evaluation.md)。
<!-- Sources: Apple Notes ★0 Introduction; L11 p.23-25 -->

### 三个场景对应三类任务

![L01 slide 23 - Scenario 2: supervised classification](assets/00-ml-concepts/slide-l01-23.png)

课上用三个场景练习“把问题翻译成任务类型”。图中是第二个：考古学家想让非专家也能一致地判断骨头的物种。解法是测量容易获得的属性（大小、形状、“突起”的个数），再和一个 **已经分好类** 的骨头库比较。关键词是“已经分好类”：有标签，所以是监督分类。三个场景并排看：

| 场景 | 做法 | 任务类型 |
| --- | --- | --- |
| 一大堆化石骨头，想快速找出“世纪发现” | 找出尺寸、形状与其他骨头明显不同的样本 | 聚类 / 离群点检测 |
| 想让非专家也能一致地判断骨头的物种 | 测量容易获得的属性，和已分好类的骨头库比较 | 监督分类 |
| 预测新配方饮料受欢迎程度 | 对不同配料比例做口味测试，估计“配料 → 满意度”的函数 | 回归 |
<!-- Sources: L01 p.20-25 -->

判断技巧：先问“有没有标签”，再问“要输出的东西是类别还是数值”。场景 1 没有标签、只想找“与众不同”的样本；场景 3 输出的是满意度这个连续数值。

<a id="topic-2"></a>
## 2. 需要的数学记号

### 数学要到什么程度

![L01 slide 29 - What level of maths](assets/00-ml-concepts/slide-l01-29.png)

这一页展示课程会用到的“推导强度”：从 $\ln\dfrac{P(y=\text{true}\mid x)}{1-P(y=\text{true}\mid x)}=w\cdot x$ 出发，两边取指数，把含 $P$ 的项移到同一边，最后解出

$$
P(y=\text{true}\mid x)=\frac{1}{1+e^{-w\cdot x}}.
$$

逐行看：第二行去掉对数；第三、四行把 $P$ 乘开、移项；第五行提出 $P$ 并把分子分母同除 $e^{w\cdot x}$ 。这正是逻辑回归的 sigmoid 函数，模型本身见 [05 线性与逻辑回归](05-LR.zh.md)；条件概率 $P(y\mid x)$ 等概率记号见 [01 概率](01-probability.zh.md)。现在只要求能跟着代数一步步变形。

后面的线性回归、逻辑回归、SVM、感知机都使用线性代数记号。课程强调：**只需熟悉记号本身**，这不是一门线性代数课。
<!-- Sources: L01 p.31-45 -->

### 矩阵：形状与乘法

![L01 slide 32 - Matrix notation](assets/00-ml-concepts/slide-l01-32.png)

矩阵（matrix）是二维数字表。 $A_{i,j}$ 中第一个下标是行（图中绿色椭圆圈住一行），第二个下标是列（橙色椭圆圈住一列）。 $A\in\mathbb{R}^{m\times n}$ 读作“ $A$ 是 $m$ 行 $n$ 列的实数矩阵”，同时说明了类型和形状。

![L01 slide 34 - Matrix multiplication](assets/00-ml-concepts/slide-l01-34.png)

矩阵乘法要求 **A 的列数等于 B 的行数**：

$$
(AB)_{i,j}=\sum_k A_{i,k}B_{k,j}.
$$

看图中蓝圈：结果第 1 行第 2 列的 13，就是 $A$ 的第 1 行 $(3,1,-2,4)$ 与 $B$ 的第 2 列 $(2,5,3,2)$ 逐项相乘再相加： $6+5-6+8=13$ 。 $A$ 是 $2\times4$ 、 $B$ 是 $4\times3$ ，结果是 $2\times3$ 。

同一组幻灯片还讲了加减（同形状逐项相加减）、数乘（每一项乘 $c$ ）和 **转置（transpose）**： $(A^\top)_{i,j}=A_{j,i}$ ，即行变列、列变行；乘积的转置要交换顺序， $(AB)^\top=B^\top A^\top$ 。若 $A=A^\top$ ，称 $A$ 为对称矩阵（symmetric）。

### 向量：内积、范数与夹角

向量（vector）是只有一列的矩阵，记作 $a\in\mathbb{R}^m$ ，例如 $a=(5,7,1,4)^\top$ 。

![L01 slide 41 - Inner product](assets/00-ml-concepts/slide-l01-41.png)

**内积（inner product）** 要求两个向量长度相同，用矩阵乘法记号写成：

$$
a\cdot b=a^\top b=\sum_{k=1}^{m}a_k b_k.
$$

图中的例子： $a=(3,2,4)^\top$ 、 $b=(1,-7,3)^\top$ ，蓝圈标出第一对相乘的分量， $a\cdot b=3-14+12=1$ 。

![L01 slide 42 - Euclidean norm](assets/00-ml-concepts/slide-l01-42.png)

**欧氏范数（Euclidean norm）** 就是向量的长度：

$$
\lVert a\rVert=\sqrt{a\cdot a}=\sqrt{a_1^2+a_2^2+\cdots+a_m^2}.
$$

图中蓝色箭头 $a=(4,3)$ 从原点出发，长度 $\sqrt{3^2+4^2}=5$ ，正是勾股定理。两向量的距离是 $\lVert a-b\rVert$ ，[KNN](02-KNN.zh.md) 的欧氏距离就是它。只要 $a\neq0$ ， $a/\lVert a\rVert$ 的长度就是 1，例如 $(4/5,3/5)$ 。

**易错：** 幻灯片把长度为 1 的向量称为 “unitary”，通常的说法是 **单位向量（unit vector）**；“unitary” 在线性代数里一般指酉矩阵，不要混用。

![L01 slide 43 - Cosine of the angle](assets/00-ml-concepts/slide-l01-43.png)

两向量夹角的余弦由内积和范数给出：

$$
\cos\theta=\frac{a\cdot b}{\lVert a\rVert\,\lVert b\rVert}
=\left(\frac{a}{\lVert a\rVert}\right)\cdot\left(\frac{b}{\lVert b\rVert}\right).
$$

右边的写法说明：先把两个向量都缩成单位长度，再做内积，所以余弦只看 **方向**、不看长短。用图中的 $a=(5,3)$ 、 $b=(1,5)$ 算一下：

$$
\cos\theta=\frac{5\cdot1+3\cdot5}{\sqrt{34}\,\sqrt{26}}=\frac{20}{\sqrt{884}}\approx0.673,
\qquad \theta\approx47.7^\circ.
$$

图中红色弧线标出的就是这个角。[KNN](02-KNN.zh.md) 的余弦距离 $1-\cos\theta$ 就来自这里。

### 单位矩阵与逆矩阵

![L01 slide 44 - Identity and inverse](assets/00-ml-concepts/slide-l01-44.png)

**单位矩阵（identity matrix）** $I$ 对角线是 1、其余是 0，任何向量乘它都不变： $Ix=x$ 。**逆矩阵（inverse）** 满足 $A^{-1}A=I$ ，像是“撤销” $A$ 的作用。

页面下方列出不可逆的三种情况：行数多于列数、列数多于行数（非方阵根本没有通常意义的逆），以及行或列之间有冗余（线性相关）。线性回归的闭式解要对 $X^\top X$ 求逆，特征之间高度相关时就会碰上第三种情况。怎样数值计算逆矩阵，课上明确不展开。

<a id="topic-3"></a>
## 3. 实例、概念与学习方式

### 三个术语

![L02 slide 08 - weather.nominal instances, attributes and concept](assets/00-ml-concepts/slide-l02-08.png)

经典的 weather.nominal 数据把三个术语放在一张表里：

- **实例（instance）**：表中的一行，这里是一天；一般也可以是一张猫的照片、一条购买记录；
- **属性 / 特征（attribute / feature）**：红色框圈住的列，如 Outlook、Temperature，描述实例某个方面；
- **概念（concept）**：蓝色框圈住的 Play 列，也就是想学会预测的标签。

把一个实例的所有属性排成一列，就是 **特征向量（feature vector）**，例如苹果可以写成 (red, round, medium)。
<!-- Sources: L02 p.4-8, p.22 -->

前一页的同一张表把前两行（两个实例）涂成红色，强调“行 = 实例”。
<!-- Sources: L02 p.7-8 -->

### 四种“概念”

| 概念 | 输出 | 例子 |
| --- | --- | --- |
| 分类（classification） | 离散类别 | 今天打不打球 |
| 回归（regression） | 连续数值 | 明天的气温 |
| 聚类（clustering） | 相似实例组成的群 | 相似的学生群体 |
| 关联学习（association learning） | 属性值之间的关联 | 买了牛奶和面包的人也可能买黄油 |
<!-- Sources: L02 p.9 -->

### 无监督学习

![L02 slide 10 - Unsupervised learning](assets/00-ml-concepts/slide-l02-10.png)

图中左边是一堆没有标签的水果，模型输出的是三个圈：苹果一组、西瓜一组、香蕉一组。模型并不知道它们叫“苹果”“香蕉”，只是把相似的放在一起。这就是 **无监督学习（unsupervised learning）**：数据没有标签，目标是发现隐藏的模式、群组或关系。例子有客户分群、异常检测、降维、购物篮分析。

**难点：** 没有“正确答案”可以对照，所以成功与否常常只能主观判断，评估是个难题。把 weather 表的 Play 列删掉再去聚类，就是这种情况。详见 [11 无监督学习](11-unsupervised-learning.md)。
<!-- Sources: L02 p.10-15 -->

### 监督学习

![L02 slide 14 - Supervised learning](assets/00-ml-concepts/slide-l02-14.png)

**监督学习（supervised learning）** 用带标签的训练数据（图左：已标明 Apple / Banana 的水果）训练模型，再对新的测试数据（图下方的那个苹果）给出预测。页面上方的两个箭头把目标分成两类：预测 **一个标签** 是分类，预测 **一个数值** 是回归。效果在标签已知但训练时没用过的 **留出（held-out）评估数据** 上衡量。

![L02 slide 18 - Classification predictions on weather.nominal](assets/00-ml-concepts/slide-l02-18.png)

看这张表：红色部分是训练数据，蓝色部分是评估数据。最右列 Classified 是模型的预测，和左边的 True Label 比较：4 个里第 1 行（真为 yes、预测 no）和第 4 行（真为 no、预测 yes）用红字标出，是错的，所以准确率是 $2/4$ 。分类的预测只有“对”或“错”。

![L02 slide 21 - Regression predictions on weather](assets/00-ml-concepts/slide-l02-21.png)

换成回归：要预测的是 Actual Temp 这个数值。最右列的预测里，71.2（真值 72）和 79.6（真值 81）离真值很近，用黑字；68.8（真值 75）和 78.5（真值 71）偏差较大，用红字。回归的预测没有“刚好对”，只有“离真值多远”。

**易错：分类与回归的本质区别。** 分类的可能标签可以全部列出，预测要么对要么错；回归的可能值有“无穷多”，预测只要和真实值足够接近就算好。所以两者的评价指标完全不同，见 [08 评估](08-evaluation.md)。
<!-- Sources: L02 p.19; L11 p.54 -->

<a id="topic-4"></a>
## 4. 属性类型与转换

### 三种属性类型

![L02 slide 25 - Ordinal quantities](assets/00-ml-concepts/slide-l02-25.png)

属性先分离散和连续，离散的又分名义和有序。这一页讲中间那种 **有序（ordinal）**：{hot, mild, cool} 有明确顺序，所以可以写出 “temperature < hot → play = yes” 这样的规则；但 hot 和 mild 之间“差多少”没有定义，所以红字强调 **加减没有意义**。页面最后一点提醒：outlook {sunny, overcast, rainy} 算名义还是有序，并不总是清楚。

| 类型 | 特点 | 允许的运算 | 例子 |
| --- | --- | --- | --- |
| 名义（nominal / categorical） | 值只是名字，没有顺序和距离 | 只能判断是否相等 | {red, orange, yellow}；布尔 {yes, no} |
| 有序（ordinal） | 有顺序，但相邻值之间的距离没有定义 | 比较大小，不能加减 | {hot, mild, cool} |
| 数值（numeric） | 实数，有数学意义 | 所有数学运算 | 温度、身高、每日顾客数 |
<!-- Sources: L02 p.23-26 -->

名义和有序的界线并不总是清楚，例如 outlook {sunny, overcast, rainy}。
<!-- Sources: L02 p.25 -->

大多数算法都假设某种属性类型：朴素贝叶斯可用名义或数值属性；线性/逻辑回归、感知机和神经网络需要数值属性。类型不合时有三条路：只选类型对的属性；改模型假设；或 **把属性转换成模型需要的类型**（课上标红的一条）。
<!-- Sources: L02 p.27 -->

### 名义转数值：编码

![L02 slide 28 - Map category names to numbers](assets/00-ml-concepts/slide-l02-28.png)

**方法一：直接编号。** red→0、blue→1、green→2、orange→3、pink→4。简单省空间，但看图中两条括线：红色的那条问 “Green > Blue？”——编号凭空制造了顺序；蓝色的那条问 “Pink − Red？”——编号之间的差值也没有意义。

![L02 slide 29 - One-hot encoding](assets/00-ml-concepts/slide-l02-29.png)

**方法二：独热编码（one-hot encoding）。** 每个类别占一列（图中 Color-Red 到 Color-Pink 五列），只有自己那一列是 1，其余是 0，所以 Red 变成 [1,0,0,0,0]。任何两种颜色之间的欧氏距离都是 $\sqrt2$ ，不再有虚假的远近。代价写在页面下方：维度增加，数据变稀疏（大量 0）。
<!-- Sources: L02 p.28-30 -->

**易错：** 直接编号后再用欧氏距离或线性模型，模型会把“编号大小”当成真实信息。

### 数值转名义：离散化

**离散化（discretisation）** 把连续数值分成几组预先定好的类别，例如把房价分成 {high, medium, low}。做法分两步：先定类别个数，再定类别边界。

![L02 slide 33 - Equal width binning example](assets/00-ml-concepts/slide-l02-33.png)

**方法一：等宽（equal width）。** 找出最小值和最大值，按宽度 $\dfrac{\max-\min}{n}$ 切成 $n$ 个等宽区间。图中教育年限 min = 6、max = 18：

- $n=3$ 时宽度为 4，得到 [6,10)、[10,14)、[14,18]；
- $n=2$ 时宽度为 6，得到 [6,12)、[12,18]。

右边的表把每个值换成它所在的区间，例如 9 → [6,10)、13 → [10,14)。

**易错：** 前面的区间是左闭右开，但最后一个区间必须右端闭合，才能装下最大值本身。图中右表把 18 写成 “[14,18)”，按字面它并不包含 18，应读作 [14,18]。

按这三个区间数一下，10 个值的分布是 5、4、1：各箱数量可能很不均匀，这是等宽的第一个缺点。

![L02 slide 35 - Equal width is sensitive to outliers](assets/00-ml-concepts/slide-l02-35.png)

第二个缺点是 **对离群值敏感**。图中把 18 换成离群值 36（红色箭头），最大值被拉高，宽度变成 $(36-6)/3=10$ ，区间变成 [6,16)、[16,26)、[26,36]：几乎所有人挤进第一箱，中间一箱是空的。
<!-- Sources: L02 p.32-35 -->

<details markdown="1">
<summary>延伸内容（可选）：这一页的计数有误</summary>

表中共有 10 个值：36 和其余 9 个（9、13、9、9、10、9、6、13、10）。落在 [6,16) 的是那 9 个，所以三个区间的计数应为 9、0、1；幻灯片写成 10、0、1，总数变成了 11。结论（离群值让数据挤进同一箱）不变。

</details>

![L02 slide 39 - Equal frequency binning by ranking](assets/00-ml-concepts/slide-l02-39.png)

**方法二：等频（equal frequency）。** 先排序，再让每箱的样本数尽量相同。图中把 10 个年龄分成 3 箱：中间一列按大小排好，左边的小数字是原来的 ID；按 **排名位置** 切成 Bin1（20、22、25）、Bin2（25、25、31）、Bin3（31、39、61、70），再按 ID 把箱号写回右边的原顺序。

注意两个细节：10 个值分不成三个完全相等的箱，所以最后一箱多一个；同样是 25，ID 3 进了 Bin1，ID 7 和 9 却进了 Bin2（31 也被拆到两箱）。前一页用问号标出的正是这些“相同值该放哪边”的困扰。这就是课上说的缺点 **可能不一致（inconsistency）**。

优点：对离群值稳健（36 换成 999 也只影响最后一箱的边界）、保留了数据分布、避免了空箱或稀疏区间；缺点：区间边界不再直观、可能出现上面的不一致、并且损失信息。
<!-- Sources: L02 p.36-40; Apple Notes ★2 Feature Engineering -->

**方法三：聚类。** 用无监督学习（例如 K-means）把数值分成 $n$ 组，每组就是一个类别。
<!-- Sources: L02 p.41 -->

### 数值特征的缩放

![L02 slide 42 - Features with different scales](assets/00-ml-concepts/slide-l02-42.png)

两张散点图画的是同样四件商品，纵轴都是价格（美元），横轴是重量：左图用千克，右图用克。用千克时重量差只有零点几，四个点几乎挤在一条竖线上，距离主要由价格决定；改成克之后，重量差放大一千倍，点在横向拉开，距离主要由重量决定。只是换了单位，“谁离谁近”就变了。因此基于距离的方法需要先把特征缩放到可比的尺度：

**标准化（standardisation / z-score）** 让特征以 0 为均值、1 为标准差：

$$
x'=\frac{x-\mu}{\sigma}\qquad\text{(standardisation / z-score)}
$$

其中 $\mu$ 是该特征的均值， $\sigma$ 是标准差。

**归一化（min-max scaling）** 用观测到的最小值和最大值把特征压到 $[0,1]$ ：

$$
x'=\frac{x-\min}{\max-\min}\qquad\text{(min-max scaling, range exactly }[0,1])
$$
<!-- Sources: L02 p.42-44 -->

两者在 scikit-learn 中分别是 `StandardScaler` 和 `MinMaxScaler`。min-max 直接依赖最小、最大值，所以和等宽离散化一样，会被一个离群值拉偏。

<a id="topic-5"></a>
## 5. 真实数据的问题

### 整合

![L02 slide 46 - Preparing the input](assets/00-ml-concepts/slide-l02-46.png)

真实数据常来自多个部门（销售部、客户账单部……），记录习惯、约定、时间范围、主键都不同。看表中每一列的混乱：Name 有 “Henry” 带引号、“Oscar@!!” 带乱码、“-” 表示缺失；Age 有小数 20.2、英文 “Forty-one”、字符串 “5”、不可能的 669；Date of Birth 有 “20 years ago”、美式 11/20/66、英式 20/5/79。红字结论：数据必须先 **整合、清理**，才能交给模型。
<!-- Sources: L02 p.46 -->

### 缺失值

缺失的原因有设备故障、实验设计改变、合并不同数据集等。多数算法默认缺失是“随机的”；但缺失本身也可能带有意义，例如医学检查里某项没做。
<!-- Sources: L02 p.47-49 -->

![L02 slide 48 - Missing at random example](assets/00-ml-concepts/slide-l02-48.png)

![L02 slide 49 - Missing not at random example](assets/00-ml-concepts/slide-l02-49.png)

两张图用同一份“年龄 + IQ”数据对比两种缺失：左表是完整数据，右表是有缺失的版本。

- **MAR 图（slide 48）**：被删掉的 IQ 有高有低（133、105、98、104、97……），和年龄、和 IQ 本身都看不出关系，**无法写出规则预测哪里会缺**。
- **MNAR 图（slide 49）**：被删掉的恰好是 91、98、93、97，都是低于 100 的 IQ。缺失与该变量 **自身的取值** 有关，所以 **能写出规则**：“IQ 低的人更容易缺”。

| 缺失类型 | 含义 | 能否预测缺什么 |
| --- | --- | --- |
| MAR（missing at random） | 缺失与其他变量、与该变量本身都无关 | 无法写出规则预测哪里缺 |
| MNAR（missing not at random） | 缺失与该变量自身的取值有关 | 能写出规则，例如低分的人更常不填 |

<details markdown="1">
<summary>延伸内容（可选）：统计学里的三种缺失机制</summary>

统计学通常分三类：**MCAR**（missing completely at random，缺失与任何变量都无关）、**MAR**（缺失只取决于其他已观测的变量，例如年轻人更常不填 IQ）、**MNAR**（缺失取决于这个值本身）。课上对 “MAR” 的定义（与其他变量、与自身都无关）在统计学里对应的是 MCAR。课程考核以幻灯片的两分法为准，读其他资料时注意名称的差别。

</details>

还要警惕 **伪装的缺失（disguised missing data）**：所有人生日都是 1 月 1 日、邮箱是 xx@xx.com，或者课上的例子：国际邮编填不进 4 位的系统，员工就填了租车门店自己的邮编。这些是“填了但没意义”的值，需要结合领域知识找出可疑值。
<!-- Sources: L02 p.47, p.50 -->

![L02 slide 51 - Simple imputation](assets/00-ml-concepts/slide-l02-51.png)

**插补（imputation）** 是猜测缺失值的方法。最简单的是统计量插补：用均值、中位数或众数填补数值缺失，scikit-learn 中是 `SimpleImputer(strategy='mean')`。页面下方列出取舍：优点是容易、不丢记录；缺点是会扭曲方差、标准差等统计量——所有填进去的值都等于同一个均值，数据看起来比真实情况更集中。

**易错：** 在 MNAR 情况下用均值插补还会带来系统性偏差。上面 IQ 的例子里，缺的都是低分，用剩下（偏高）的均值去填，会高估这些人的 IQ。
<!-- Sources: L02 p.51 -->

### 不准确的值

名义属性里的拼写错误需要一致性检查；数值属性的录入或测量错误会表现为离群值；错误也可能是故意的（如上面的邮编）。
<!-- Sources: L02 p.52-53 -->

![L02 slide 53 - Inaccurate values example](assets/00-ml-concepts/slide-l02-53.png)

这一页列出常见的不准确：同一机构的不同写法（"Melbourne University" 与 "University of Melbourne"，"three" 与 "3"）、不同日期格式（"3/4/2016" 可能是 3 月 4 日也可能是 4 月 3 日）、两个学生共用一个学号，以及离群值。

看离群值那一行：序列 62, 72, …, 90 之后跟着紫色的 999。作为医院病人的年龄，它显然不对；作为 LinkedIn 联系人数量，它却可能正常。是否“异常”取决于领域，自动方法也离不开领域知识，见 [15 异常检测](15-anomaly-detection.md)。
<!-- Sources: L02 p.53 -->

最后一页的建议：用直方图看名义属性的分布是否合理，用散点图看数值属性有没有明显离群点；数据太多就抽样；还要请教领域专家。“你永远不会太了解你的数据。”
<!-- Sources: L02 p.54 -->

<a id="topic-6"></a>
## 6. 给模型分类

模型可以从几个角度分类。下表把课程中出现的分法集中在一起，具体模型请看各自笔记。

| 角度 | 一边 | 另一边 | 课程中的例子 |
| --- | --- | --- | --- |
| 怎样给出依据 | 概率模型：输出 $P(y\mid x)$ 或 $P(x,y)$ | 几何模型：用距离、间隔或边界 | 概率：[朴素贝叶斯](04-NB.zh.md)、[逻辑回归](05-LR.zh.md)；几何：[kNN](02-KNN.zh.md)、[SVM](06-SVM.zh.md)、感知机 |
| 学什么分布 | 判别式（discriminative）：直接学 $P(y\mid x)$ 或边界 | 生成式（generative）：学 $P(x,y)$ ，可以生成新样本 | 判别：逻辑回归；生成：朴素贝叶斯 |
| 边界形状 | 线性：边界是特征的线性组合 | 非线性 | 线性：感知机、朴素贝叶斯、逻辑回归；非线性：至少一个隐藏层且用非线性激活的神经网络 |
<!-- Sources: L01 p.17; L08 p.46; L14 p.4; L15 p.14; Apple Notes ★3 Models -->

**难点：** 线性模型无法自然学到特征之间的交互，必须靠人工构造特征；神经网络可以把交互作为中间表示学出来，见 [10 神经网络](10-neural-networks.md)。
<!-- Sources: L15 p.14, p.24 -->

## 本讲自测

1. 预测一套房子的成交价和预测它“会不会在一个月内卖出”，分别是什么任务？评价方式为什么不同？
2. 一个颜色属性有 5 种取值，为什么直接编成 0–4 再算欧氏距离会出问题？独热编码付出了什么代价？
3. 收入数据里有一位亿万富翁。等宽和等频离散化各会受到什么影响？换成 min-max 缩放呢？
4. 问卷中收入低的人更倾向于不填收入，这属于哪种缺失？用均值插补会带来什么偏差？
5. 对 $a=(1,2,2)$ 、 $b=(2,0,1)$ ，求 $\lVert a\rVert$ 、 $a\cdot b$ 和 $\cos\theta$ ；把 $a$ 放大 10 倍后，哪些量会变，哪些不变？
