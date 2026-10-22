# COMP90049 Lecture 22 - Anomaly Detection

来源：`lecture/22-anomalydetection.pdf`；Apple Notes：CS/25S2/IML — "W11L22 Anomaly Detection"。

这篇讲的是：**怎样找出那些“像是由另一种机制产生的”数据点？有没有标签、数据是什么形状，分别该用什么方法？**

学习路线：[什么是异常](#topic-1) → [三种异常](#topic-2) → [三种检测范式](#topic-3) → [统计方法](#topic-4) → [近邻、密度与聚类方法](#topic-5)。

重点：z-score、马氏距离、基于 kNN 的密度与相对密度（LOF）。难点：为什么局部密度能处理密度不均的数据。易错：异常不等于噪声；有监督异常检测不能看 accuracy。

<a id="topic-1"></a>
## 1. 什么是异常

### 一个警示：被当成噪声的臭氧洞

![Slide 04 - Ozone depletion history](assets/15-anomaly-detection/slide-04.png)

1985 年，英国南极调查局的数据显示南极臭氧比正常低 10%。NASA 的 Nimbus 7 卫星本来也有测量仪器，却没有报告这么低的浓度——因为数值低得离谱，被程序当作噪声丢掉了。右边的曲线是南极臭氧洞的平均面积，1980 年代起迅速增大：被丢掉的“异常值”恰恰是最重要的信号。
<!-- Sources: L22 p.4 -->

应用很广：银行（异常大额消费、异常地点取款）、保险欺诈、社交媒体上的机器人或被盗账号、监控中的异常行为、天气与地震异常、客户行为突变、皮肤癌筛查，以及机器学习中去除数据集里的离群值。
<!-- Sources: L22 p.3 -->

### 定义

![Slide 05 - Anomalies vs noise](assets/15-anomaly-detection/slide-05.png)

**异常（anomaly / outlier）**：明显偏离正常对象、仿佛由 **另一种机制** 产生的数据对象，例如异常的信用卡消费。
<!-- Sources: L22 p.5 -->

**易错：异常 ≠ 噪声。** **噪声（noise）** 是测量变量中的随机误差或方差，应当在异常检测 **之前** 去除；异常则违反了产生正常数据的机制，往往对应重要（甚至关键）的现实问题，如网络入侵、信用卡欺诈。
<!-- Sources: L22 p.5 -->

### 问题的三种形式

| 形式 | 做法 | 适用场景 |
| --- | --- | --- |
| 阈值检测 | 找出异常分数大于阈值 $t$ 的点 | 已有打分函数，以及用有标签正常数据学到的阈值 |
| Top-n 检测 | 找出异常分数 $f(x)$ 最大的 $n$ 个点 | 探索性分析，只想标出有限个最可疑的点 |
| 逐点评分 | 数据库 $D$ 大多是正常（但无标签）的点，对新测试点 $x$ 计算相对于 $D$ 的异常分数 | 新数据不断到来、需要逐个评估 |
<!-- Sources: L22 p.6 -->

<a id="topic-2"></a>
## 2. 三种异常

### 全局（点）异常

![Slide 08 - Global anomalies](assets/15-anomaly-detection/slide-08.png)

**全局异常（global / point anomaly）**：单个对象明显偏离数据集的其余部分，例如计算机网络中的入侵。图中 $o_1$ 远离两团正常数据 $N_1$ 、 $N_2$ ，是全局异常；而 $o_2$ 、 $o_3$ 旁边的问号说明难点：要找到合适的“偏离”度量。
<!-- Sources: L22 p.8 -->

### 情境（条件）异常

**情境异常（contextual / conditional anomaly）** 只在特定情境下才异常。属性分两组：**情境属性（contextual attributes）** 定义情境，如时间、地点；**行为属性（behavioural attributes）** 描述对象本身、用来判断是否异常，如温度。它可以看作局部异常的推广——情境不一定是空间上的。难点是怎样定义有意义的情境。
<!-- Sources: L22 p.9 -->

![Slide 10 - Contextual anomaly example](assets/15-anomaly-detection/slide-10.png)

巴黎的月平均气温曲线上，左边圆圈 $t_1$ 处冬天 10°C 是正常的，右边圆圈 $t_2$ 处夏天出现同样的 10°C 就是异常——数值相同，情境（月份）不同。PPT 接着问：如果是墨尔本呢？那里一天之内天气多变，这可能只是更复杂的模式。
<!-- Sources: L22 p.10-11 -->

### 集体异常

![Slide 13 - Collective anomaly example](assets/15-anomaly-detection/slide-13.png)

**集体异常（collective anomaly）**：一组对象合在一起明显偏离整体，尽管其中每个对象单独看并不异常。图中心电信号虚线圈内是一段平直的子序列：每个点的数值都正常，但这么长一段没有起伏就不正常。检测时要看对象之间的关系，适用于序列（时间序列）、空间、图数据。例如短时间内来自不同 IP 的一串登录尝试，单看都不可疑，合起来可能是入侵。
<!-- Sources: L22 p.12-13 -->

| 类型 | 含义 |
| --- | --- |
| 全局 / 点异常 | 单个点明显偏离数据集其余部分 |
| 情境 / 条件异常 | 只在特定情境（时间、地点等）下才异常 |
| 集体异常 | 一组点合起来异常，单个点并不异常 |
<!-- Sources: L22 p.14 -->

<a id="topic-3"></a>
## 3. 三种检测范式

### 有监督

![Slide 16 - Supervised anomaly detection](assets/15-anomaly-detection/slide-16.png)

正常和异常都有标签（由领域专家检查过），于是当作二分类问题。PPT 列出的挑战：需要两类标签；类别极不平衡（可增强异常类、人工造异常）；无法发现未知的新型异常；accuracy 有误导性。

**易错：** 有监督异常检测中要尽量抓住更多异常，即提高 **recall**；但一味追求 recall 会带来大量误报（把正常样本判成异常）。所以要同时看 precision（见 [08](08-evaluation.md)）。
<!-- Sources: L22 p.16; Apple Notes W11L22 Anomaly Detection -->

### 半监督与无监督

| 范式 | 有什么标签 | 做法 | 挑战 |
| --- | --- | --- | --- |
| 半监督 | 只有正常数据有标签 | 只用正常数据训练，让模型学会“正常”；对所有数据应用，落在决策边界之外（残差大、概率低）的标为可能异常 | 需要正常类标签；误报率可能很高——没见过但合法的记录也会被当作异常 |
| 无监督 | 没有标签 | 假设正常对象聚成若干群，异常远离所有群；先建立“正常”画像（总体统计量、多元分布模型），再找与之明显不同的点 | 正常对象可能没有很强的共同模式，而集体异常反而在小区域里很相似；误报率可能高，同时还漏掉真异常 |
<!-- Sources: L22 p.16-19 -->

![Slide 19 - Unsupervised challenges](assets/15-anomaly-detection/slide-19.png)

回到第 2 节的点图：没有标签时，方法只能依靠“正常数据聚成群”的假设。 $o_1$ 容易发现；但 $o_3$ 是几个挨在一起的点，它们彼此相似，可能被当成一个小的正常群——这就是“集体异常在小区域里反而很相似”的意思。

无监督方法分四类，后两节依次介绍：

| 方法 | 假设 |
| --- | --- |
| 统计（基于模型） | 正常数据服从某个统计模型 |
| 基于近邻 | 异常的最近邻离它很远 |
| 基于密度 | 异常位于低密度区域 |
| 基于聚类 | 正常数据属于大而密的簇 |
<!-- Sources: L22 p.21 -->

<a id="topic-4"></a>
## 4. 统计方法

![Slide 22 - Statistical anomaly detection](assets/15-anomaly-detection/slide-22.png)

思路：用一个参数分布 $f(x,\theta)$ 拟合数据，落在模型低概率区域的对象就是异常——概率密度越小越可能是离群点。难点在于结果高度依赖统计模型的假设是否成立。
<!-- Sources: L22 p.22 -->

![Slide 23 - Visualising the data](assets/15-anomaly-detection/slide-23.png)

先可以画图看：一维用箱线图，二维用散点图，三维用旋转图。左边箱线图上下两个红圈是落在须线之外的点；右边散点图里红圈标出的点不属于两团数据中的任何一团。缺点是费时且主观。
<!-- Sources: L22 p.23 -->

### 一元：z-score

![Slide 24 - Univariate z-score](assets/15-anomaly-detection/slide-24.png)

假设数据服从正态分布，用最大似然估计

$$
\mu=\frac{1}{N}\sum_{i=1}^{N}x_i,\qquad
\sigma=\sqrt{\frac{1}{N}\sum_{i=1}^{N}(x_i-\mu)^2}.
$$

选一个置信界限：右边正态曲线标出 $\mu\pm3\sigma$ 包含 99.7% 的数据，两端红圈是剩下的约 0.1% + 0.1%。再计算 **z 分数（z-score）**

$$
z=\left|\frac{x-\mu}{\sigma}\right| ,
$$

在 99.7% 置信水平下， $z>3$ 就认为是异常。
<!-- Sources: L22 p.24 -->

![Slide 25 - Univariate data example](assets/15-anomaly-detection/slide-25.png)

PPT 的例子：平均气温 {24.0, 28.9, 28.9, 29.0, 29.1, 29.1, 29.2, 29.2, 29.3, 29.4}， $\mu=28.61$ ，PPT 给出 $\sigma=\sqrt{2.29}=1.51$ ，于是 24 的 $z=\frac{24-28.61}{1.51}\approx3.04>3$ ，判为异常。
<!-- Sources: L22 p.25 -->

**延伸内容（对课件数值的核对）：** 按上式重新计算，平方偏差之和是 $23.849$ ，方差是 $23.849/10\approx2.385$ （PPT 写作 2.29）， $\sigma\approx1.54$ ， $z\approx2.99$ ——恰好略低于 3。方法不变，但这个例子说明：固定阈值附近的点，判定结果对 $\sigma$ 的估计很敏感。
<!-- Sources: L22 p.25 -->

### 多元：马氏距离

![Slide 26 - Multivariate normal and Mahalanobis distance](assets/15-anomaly-detection/slide-26.png)

假设数据服从多元正态分布，用均值向量 $\mu$ 和协方差矩阵 $\Sigma$ 刻画（PPT 右上的气泡给出二维时的 $\Sigma$ ：对角线是两个方差，非对角线是协方差）。**马氏距离（Mahalanobis distance）** 衡量一个点离分布中心多远，同时考虑特征之间如何共同变化：

$$
D_M(x)=\sqrt{(x-\mu)^\top\Sigma^{-1}(x-\mu)} .
$$

距离大说明该点在这个分布下不太可能出现，可能是离群点。
<!-- Sources: L22 p.26 -->

![Slide 28 - Euclidean vs Mahalanobis distance](assets/15-anomaly-detection/slide-28.png)

数据云是一个向右上倾斜的椭圆，点的灰度表示马氏距离。看下方表格：按欧氏距离，B（7.1）比 A（5.7）离中心更远；按马氏距离，A（35）反而比 B（24）更异常——A 偏离了数据倾斜的方向，B 则大致沿着椭圆的长轴。两个特征高度相关时，沿相关方向的偏离不算太异常，偏离相关方向才显著，这正是要用马氏距离的原因。
<!-- Sources: L22 p.28 -->

再对这些马氏距离（视为一元、近似正态）做 **Grubbs 检验（Grubbs' test）**，找出一个离群点：

$$
G=\frac{\max_i\lvert x_i-\mu\rvert}{\sigma}.
$$

马氏距离主要适合发现全局异常，对局部、情境或集体异常效果较差。
<!-- Sources: L22 p.27 -->

| 优点 | 缺点 |
| --- | --- |
| 统计检验成熟、经过充分验证 | 数据可能很难用参数模型描述（多峰、密度不均） |
| 能量化一个对象“有多异常” | 高维时数据可能不足以估计真实分布 |
<!-- Sources: L22 p.29 -->

<a id="topic-5"></a>
## 5. 近邻、密度与聚类方法

### 基于近邻

如果一个对象的最近邻都离它很远——它的“邻近程度”明显不同于数据集中大多数对象——它就是异常。常用做法：离群分数 = 到第 $k$ 个最近邻的距离（kNN 距离见 [02 KNN](02-KNN.zh.md)）。
<!-- Sources: L22 p.31 -->

![Slide 32 - Proximity-based detection with 1 nearest neighbour](assets/15-anomaly-detection/slide-32.png)

![Slide 33 - Proximity-based detection with 5 nearest neighbours](assets/15-anomaly-detection/slide-33.png)

这两张图是同一份数据，颜色越深分数越高。用 1 个最近邻时，右上角圈出的 C 其实是两个挨在一起、远离其他数据的点，它们互为最近邻，所以颜色很浅，被漏掉了；改用 5 个最近邻后，这一对点的颜色明显变深，左边簇里另一组被圈出的点分数也随之变化。分数对 $k$ 很敏感。

![Slide 34 - Proximity-based detection near a dense cluster](assets/15-anomaly-detection/slide-34.png)

换一份数据，仍用 5 个最近邻：C 是黑色，最可疑；D 是紧贴一团极密小簇的单个点，按绝对距离看它离邻居不远，颜色很浅；而左边稀疏簇边上的 A 颜色反而更深。D 算不算异常？只看绝对距离答不好——这种方法处理不好密度差异大的数据。
<!-- Sources: L22 p.32-35 -->

优点：定义邻近度量比确定统计分布容易；能量化异常程度；天然能处理多峰数据。缺点： $O(n^2)$ 复杂度；对 $k$ 敏感；数据密度变化大时效果差。
<!-- Sources: L22 p.35 -->

### 基于密度

![Slide 37 - Basic density-based detection](assets/15-anomaly-detection/slide-37.png)

异常位于低密度区域：周围越稀疏，离群分数越高。右上角的示意图里，A 到三个近邻 B、C、D 的连线都很长，所以 A 周围密度低。密度可以是固定半径 $d$ 内的点数，或到 $k$ 个最近邻平均距离的倒数：

$$
\mathrm{density}(x,k)=\left(\frac{1}{k}\sum_{y\in N(x,k)}\mathrm{distance}(x,y)\right)^{-1}.
$$

局限：用的是 **绝对** 密度，数据密度不均时无法适应局部变化。
<!-- Sources: L22 p.37 -->

![Slide 38 - Local density-based detection](assets/15-anomaly-detection/slide-38.png)

**局部密度方法**把一个点的密度和它的 $k$ 个近邻的平均密度相比：右上图中 A 的近邻都挤在一团很密的点里，A 比它们稀得多。即使所在区域在全局上不算稀疏，只要明显比邻居稀，就是离群点。PPT 的 **LOF（local outlier factor）** 分数是相对密度的倒数：

$$
\text{relative density}(x,k)=\left(\frac{\mathrm{density}(x,k)}{\frac{1}{k}\sum_{y\in N(x,k)}\mathrm{density}(y,k)}\right)^{-1}.
$$

值远大于 1：比邻居稀得多，可能是异常；约等于或小于 1：和邻居差不多。所以在“一团很密的簇 + 一团很稀的簇”的数据里，稀疏簇中的正常点用绝对密度会得到偏高的离群分数，用 LOF 则因为和邻居一样稀，分数约为 1。
<!-- Sources: L22 p.38 -->

#### 例子：一维数据上的 LOF

![Slide 39 - LOF example setup](assets/15-anomaly-detection/slide-39.png)

PPT 的例子：数据集是 {1, 1.05, 1.1, 1.15, 1.2, 1.21, 1.3, 1.4, 1.45, 1.5, 4.55, 5.6, 6.8, 7.58, 8.6, 9.7, 10.3, 11.4, 12.3, 13.5}，用 2 个最近邻、曼哈顿距离，计算 $x=0.5$ 和 $x=4$ 的分数。数轴上两个箭头分别指向这两个查询点（橙色）：0.5 紧挨着左边一团密集的点，4 落在右边稀疏的区域。
<!-- Sources: L22 p.39 -->

![Slide 41 - LOF for x = 0.5](assets/15-anomaly-detection/slide-41.png)

![Slide 43 - LOF for x = 4](assets/15-anomaly-detection/slide-43.png)

两页分别算出两个查询点的近邻密度（上方弧线标出每个近邻自己的 2 个近邻）和最终分数：

| 查询点 | 2 个近邻 | 自身密度 | 近邻的密度 | 相对密度的倒数 |
| --- | --- | --- | --- | --- |
| 0.5 | 1、1.05 | $\big(\frac{0.5+0.55}{2}\big)^{-1}\approx1.9$ | 13.3、20 | $\approx8.8$ （PPT 写 9.1） |
| 4 | 4.55、5.6 | $\big(\frac{0.55+1.6}{2}\big)^{-1}\approx0.93$ | 0.61、0.89 | $\approx0.81$ |
<!-- Sources: L22 p.40-44 -->

**补充：** 第一行按 PPT 自己的中间值重算是 $\frac{(13.3+20)/2}{1.9}\approx8.8$ ，PPT p.41 写成 9.1；结论不受影响。

关键对比：0.5 的绝对密度（1.9）其实比 4（0.93）还高，只看绝对密度会把 4 当得更可疑；但 0.5 紧挨着一团极密的点，相对密度说明它比邻居稀九倍左右，是异常；4 落在本来就稀疏的区域，和邻居差不多，不算异常。
<!-- Sources: L22 p.40-44 -->

优点：能量化异常程度；数据密度不均时也能工作。缺点： $O(n^2)$ ；要选参数 $k$ 和距离阈值 $d$ 。
<!-- Sources: L22 p.45 -->

### 基于聚类

异常是不强烈属于任何簇的对象。问题在于：离群点可能影响最初簇的形成。
<!-- Sources: L22 p.47 -->

![Slide 48 - Cluster-based outlier factor](assets/15-anomaly-detection/slide-48.png)

PPT 把做法分成四步：

**第 1 步，聚类：** 用某种聚类算法（如 [K-means](11-unsupervised-learning.md)）和相似度（如欧氏距离）分簇。

**第 2 步，区分大簇和小簇：** 按大小排序，用参数 $\alpha$ （累计大小阈值，如 90% 的点）和 $\beta$ （最小大小比例，如 5 倍）区分包含大部分数据的大簇（LC）和只有少量点的小簇（SC）。

**第 3 步，为每个点 $t$ 计算 CBOF：**

$$
\mathrm{CBOF}(t)=\begin{cases}
\lvert C_i\rvert\cdot\mathrm{distance}(t,C_i) & \text{if } C_i\in LC\\
\lvert C_i\rvert\cdot\min_{C_j\in LC}\mathrm{distance}(t,C_j) & \text{if } C_i\in SC
\end{cases}
$$

**第 4 步，标记：** 分数越高越可能异常：小而孤立的簇里的点，或大簇中离中心很远的点，会被标出。
<!-- Sources: L22 p.48 -->

![Slide 49 - Cluster-based outlier scores](assets/15-anomaly-detection/slide-49.png)

图中黄色和蓝色是两个大簇，左上角的绿色是小簇；红色数字是各点的 CBOF 分数。大簇边缘、远离中心的点分数较高，而 (5, 0) 处的 535.2 和 (10, 10) 处的 564.1 这两个孤立点分数最高。
<!-- Sources: L22 p.49 -->

常见的两阶段做法：**点级过滤**——迭代删除显著降低聚类质量的点，作为单个异常；**簇级过滤**——丢弃远离其他簇的小簇，作为群体异常。
<!-- Sources: L22 p.50 -->

优点：有些聚类方法是 $O(n)$ ；把离群的概念从单个对象扩展到对象群。缺点：需要大小簇的阈值；对簇数敏感；离群点可能影响最初的簇。
<!-- Sources: L22 p.51 -->

## 本讲自测

1. 一个传感器偶尔出现随机跳动，和一个被入侵的服务器发出的规律性异常流量，哪个是噪声、哪个是异常？处理顺序是什么？
2. 某数据 $\mu=50$ 、 $\sigma=4$ ，新点 $x=63$ 。在 $3\sigma$ 规则下是否异常？
3. 为什么两个特征高度相关时，应该用马氏距离而不是欧氏距离？
4. 数据中有一团很密的簇和一团很稀的簇。基本密度方法和局部密度（LOF）方法各会怎样对待稀疏簇里的正常点？
