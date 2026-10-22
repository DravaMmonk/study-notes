# COMP90049 Lecture 18 - Unsupervised Learning: Clustering

来源：`lecture/18-unsupervised.pdf`（p.1–98；封面标为 Lecture 19）；Apple Notes：CS/25S2/IML — "W9L18 Unsupervised Learning"、"★5 Evaluation"（聚类指标部分）。

这篇讲的是：**没有标签时，怎样只凭数据本身找出“相似的组”，又怎样判断分组好不好？**

学习路线：[无监督学习与聚类的假设](#topic-1) → [K-means](#topic-2) → [怎样选 K：好聚类的标准](#topic-3) → [层次聚类](#topic-4) → [聚类评估](#topic-5)。

重点：K-means 的“分配—更新”循环、三种 linkage 的手算、WCSS/BCSS/CH。难点：同质性与完整性里的两个条件熵。易错：忘记先归一化；把 homogeneity 和 completeness 的条件方向弄反；课件 p.90 的数值有误。

<a id="topic-1"></a>
## 1. 无监督学习与聚类的假设

### 监督与无监督的区别

![Slide 04 - Supervised vs unsupervised learning](assets/11-unsupervised-learning/slide-04.png)

上半部分是 **监督学习（supervised learning）**：训练数据已经按 Apple / Banana 分好列，训练出的模型拿到一个新苹果，输出预测 “Apple”。下半部分是 **无监督学习（unsupervised learning）**：训练数据是一堆没标名字的水果，模型输出的不是类名，而是三个圆圈——苹果一组、西瓜一组、香蕉一组。它只知道“这几个彼此像”，并不知道这组叫什么。

之前的数据集都有实例、特征和明确的目标类别。但给实例找到正确标签往往困难又昂贵（通常要人工标注），带标签的数据有限；没有标签的数据却多得多。
<!-- Sources: L18 p.3-5 -->

无监督学习的几种常见任务：

| 类型 | 做什么 |
| --- | --- |
| PCA | 从特征很多的数据中提取最本质的信息（降维） |
| 聚类（clustering） | 找出彼此相似的实例组 |
| 异常检测（anomaly detection） | 找出与既有模式不同、可疑的罕见情况，见 [15](15-anomaly-detection.md) |
| 关联规则挖掘（association rule mining） | 根据交易中已有的商品，预测其他商品是否出现（如 {Diaper} → {Beer}） |
<!-- Sources: L18 p.6-7 -->

### 聚类前要先想清楚的五个问题

聚类只从数据本身学习结构，但我们通常会带着对结构的假设：
<!-- Sources: L18 p.9-12 -->

| 问题 | 两种选择 |
| --- | --- |
| 一个实例能否属于多个簇？ | 互斥（exclusive）vs 重叠（overlapping） |
| 能否部分地、以一定程度属于一个簇？ | 确定性 / 硬聚类（deterministic）vs 概率 / 软聚类（probabilistic） |
| 簇之间有没有包含关系（嵌套成树）？ | 层次（hierarchical）vs 划分（partitioning） |
| 是否所有数据都要分到簇里？ | 完全（complete）vs 部分（partial） |
| 簇的大小、形状、密度是否差别很大？ | 同质（homogeneous）vs 异质（heterogeneous） |
<!-- Sources: L18 p.12-17 -->

![Slide 14 - Hard vs soft clustering](assets/11-unsupervised-learning/slide-14.png)

左图是硬聚类：每个点只属于一个簇（绿色圆点或蓝色六边形）。右图是软聚类：括号里是该点属于（第一簇, 第二簇）的概率。(0.99, 0.01) 几乎肯定属于第一簇，(0.02, 0.98) 几乎肯定属于第二簇，而夹在中间的浅蓝点 (0.51, 0.49) 两边都差不多。
<!-- Sources: L18 p.14 -->

![Slide 15 - Hierarchical vs partitioning](assets/11-unsupervised-learning/slide-15.png)

左边的大黄椭圆里套着绿色和灰色椭圆，灰色里又套着更小的椭圆：层次聚类的簇有包含关系，可以画成一棵树。右边三个蓝色椭圆互不包含：划分式聚类把数据切成平行的几块。
<!-- Sources: L18 p.15 -->

![Slide 17 - Homogeneous vs heterogeneous clusters](assets/11-unsupervised-learning/slide-17.png)

左边两团点大小、密度、形状都差不多（同质）。右边上方是一大团稀疏点加一小团密集红点；下方是“笑脸”：外面一圈环、里面两只眼睛和一张嘴，大小形状完全不同（异质）。后面会看到 K-means 恰恰处理不好右边这种数据。

本讲的两个算法都是互斥、确定性、完全的；K-means 是划分式，凝聚聚类是层次式。
<!-- Sources: L18 p.18 -->

**易错：先归一化。** 很多聚类方法基于距离，通常要先把每个属性缩放到 $[0,1]$ ，否则取值范围大的属性会主导距离（见 [00 的数值特征缩放](00-ml-concepts.md#topic-4)）。
<!-- Sources: L18 p.19 -->

<a id="topic-2"></a>
## 2. K-means

### 算法：分配与更新两步循环

![Slide 22 - K-means algorithm](assets/11-unsupervised-learning/slide-22.png)

这一页就是完整算法。右上角的“→ K”提醒： **簇数 $K$ 由用户事先给定**。之后反复做两步：把每个实例分给最近的 **质心（centroid）**，再用簇内所有点的均值重新算质心。

```text
ask the user for the number of clusters K
randomly pick K points as the initial centroids (seeds)
repeat
    assign each instance to the cluster with the nearest centroid
    recompute the centroid (mean) of each cluster
until the centroids do not change
      (or the change is below a threshold, or few points change clusters)
```
<!-- Sources: L18 p.22 -->

页面底部的三个彩色词说明 K-means 是 **互斥、完全、划分式** 的聚类方法；它倾向于得到 **紧凑（compact）的球形（spherical）簇**。
<!-- Sources: L18 p.22 -->

### 看一次运行：从第 1 轮到第 7 轮

![Slide 23 - K-means iteration 1](assets/11-unsupervised-learning/slide-23.png)

![Slide 29 - K-means iteration 7](assets/11-unsupervised-learning/slide-29.png)

两张图是同一组二维数据，十字是当前质心，点的颜色是当前分到的簇。第 1 轮时三个质心都在上方那团点附近，于是上方一团被红、蓝、绿三色瓜分，下面两团只能就近分给绿和蓝。课件 p.24–28 是中间几轮：每轮质心都向“自己那团”的中心移动一点。到第 7 轮，三个十字分别落在三团点的中心，颜色和肉眼看到的三团完全对应，再迭代质心也不动了，算法停止。
<!-- Sources: L18 p.23-29 -->

<details markdown="1">
<summary>延伸内容（可选）：为什么 K-means 一定会停下来</summary>

两步都不会让簇内平方和（WCSS，定义见 [下一节](#topic-3)）变大：分配步让每个点去离它最近的质心，每个点的平方距离只会变小或不变；更新步里，均值正是使“到簇内各点平方距离之和”最小的那个点。WCSS 单调不增，而把 $N$ 个点分成 $K$ 组的方式是有限的，所以算法必然在有限步内停止。但它停在的是 **局部最优**，不一定是全局最好的分法——这就是下面“对初始质心敏感”的原因。

</details>

### 局限

- “均值”对类别型属性没有定义；
- 对离群值敏感：离群点会拉动质心；
- 对初始质心敏感：不同初始化可能收敛到次优解；
- 处理不了非球形的簇，也处理不了大小或密度差别很大的簇；
- 需要事先给定 $K$ 。
<!-- Sources: L18 p.30-35 -->

![Slide 30 - Sensitivity to outliers](assets/11-unsupervised-learning/slide-30.png)

(A) 中右边那个离群点（outlier）被硬塞进一个簇，质心（+）被拖到中间空白处，簇变成一条长条；(B) 是理想结果：两个紧凑的簇，离群点单独留着。因为均值会被极端值拉动，一个点就能扭曲整个簇。

![Slide 31 - Sensitivity to initial centroids](assets/11-unsupervised-learning/slide-31.png)

左边是理想的三簇（上方绿、左下红、右下蓝）；右边两次运行同样是 $K=3$ ，只因为初始质心不同，都把上方一团切成绿、蓝两半，又把下面两团合成一个红色簇。两次都收敛了，但都是次优解。实践中常用不同初始化多跑几次，取 WCSS 最小的一次。
<!-- Sources: L18 p.31 -->

![Slide 32 - Non-spherical clusters](assets/11-unsupervised-learning/slide-32.png)

上排是两个弯月：理想分法是沿着月牙形状，红一个、蓝一个；K-means（ $K=2$ ）却按到两个质心的距离画一条直线，把每个月牙都切掉一截。下排是“笑脸”：K-means（ $K=3$ ）把平面切成蓝、红、绿三块扇形区域，环、眼睛、嘴都被拦腰切开。原因是 K-means 的边界永远是“到哪个质心更近”的直线分界，只能切出凸的块。课件 p.33–34 用同样方式展示了大小不同、密度不同的簇也会被切错。
<!-- Sources: L18 p.32 -->

优点：简单易懂；计算高效、收敛较快，适合大量数据；结果容易解释和可视化；适用面广，簇接近球形且分得开时效果好。
<!-- Sources: L18 p.36 -->

<a id="topic-3"></a>
## 3. 怎样选 K：好聚类的标准

### 肘部法

![Slide 37 - Elbow method](assets/11-unsupervised-learning/slide-37.png)

横轴是簇数 $k$ ，纵轴是误差（distortion，即下面的 WCSS，左侧红圈标出 “Error”）。从 $k=1$ 到 $k=3$ 曲线陡降，绿色虚线标出这几步；过了 $k=3$ （红叉，“Elbow Point”）以后下降明显变平。 **肘部法（elbow method）** 就选这个拐点 $k=3$ 。

为什么不直接选误差最小的 $k$ ？因为 $k$ 越大误差一定越小（每个点自成一簇时为 0），最小值没有意义；我们要的是“再多加一个簇也换不来多少改进”的位置。
<!-- Sources: L18 p.37, p.41 -->

### 好聚类的两个标准

![Slide 38 - Cohesion and separation](assets/11-unsupervised-learning/slide-38.png)

红色箭头连的是 **同一簇内部** 的点：它们越近越好，叫 **簇内紧凑（cohesion）**。紫色箭头连的是 **不同簇之间**：它们越远越好，叫 **簇间分离（separation）**。好的聚类两者兼有（至少有其一）。紧凑用簇内平方和衡量，分离用簇间平方和衡量（见 [聚类评估](#topic-5)）。
<!-- Sources: L18 p.38-39 -->

### 簇内平方和

![Slide 40 - WCSS as K grows](assets/11-unsupervised-learning/slide-40.png)

**簇内平方和（within-cluster sum of squares, WCSS）** 把每个点到它所在簇质心的平方距离加起来：

$$
\mathrm{WCSS}=\sum_{j=1}^{K}\sum_{x_i\in C_j}(x_i-\mu_j)^2 ,
$$

其中 $C_j$ 是第 $j$ 个簇， $\mu_j$ 是它的均值（质心）；多维数据时 $(x_i-\mu_j)^2$ 指平方欧氏距离 $\lVert x_i-\mu_j\rVert^2$ 。WCSS 越小，簇越紧凑。

下排图从左到右是 $K=1,2,3$ ：一个大圆里的点离中心（×）很远；分成两簇后，绿色长椭圆仍然松散；分成三簇后每个小圆都很紧。WCSS 随 $K$ 一路变小，画成曲线就是上面的肘部图。具体做法是：对一系列 $K$ 跑聚类，算每次的 WCSS，画出来，找下降显著变慢的那一点。
<!-- Sources: L18 p.40, p.73 -->

<a id="topic-4"></a>
## 4. 层次聚类

### 树状图

![Slide 44 - Dendrogram](assets/11-unsupervised-learning/slide-44.png)

层次聚类得到一组嵌套的簇，可以画成 **树状图（dendrogram）**：底部是各个点，纵轴（distance）是合并时两簇之间的距离，横线的高度就是这次合并发生的距离。红圈数字 1–5 是合并顺序，与右边嵌套圆圈上的数字一一对应：先合 1 和 3（最低），再合 2 和 5，……最后在最高处合成一个簇。在某个高度画一条横线“切”树状图，切到几根竖线就得到几个簇。
<!-- Sources: L18 p.44, p.69 -->

两种方向： **凝聚（agglomerative，自底向上）** 从每个点一簇开始，每步合并最近的两簇； **分裂（divisive，自顶向下）** 从一个大簇开始，每步拆分一个簇。两者都基于距离（相异度）矩阵。
<!-- Sources: L18 p.45 -->

### 凝聚聚类算法

![Slide 46 - Agglomerative clustering steps](assets/11-unsupervised-learning/slide-46.png)

右边九个小图按从左到右、从上到下的顺序看：9 个点各自一簇 → 8 簇（最近的两点被圈起来）→ 7 簇 → …… → 1 簇（所有圈套在一个大圈里）。每一步只做一次合并，左边的伪代码就是这个过程：

```text
compute the distance (dissimilarity) matrix
let each data point be a cluster
repeat
    merge the two closest clusters
    update the distance matrix
until only a single cluster remains
```
<!-- Sources: L18 p.46 -->

### 簇与簇的距离：linkage

![Slide 48 - Four linkage definitions](assets/11-unsupervised-learning/slide-48.png)

关键操作是：两个 **簇** 之间的距离怎么算？右边四对圆里的连线说明了四种定义：

- **单链接（single linkage）**：两簇最近的一对点之间的距离， $D(c_1,c_2)=\min D(x_1,x_2)$ ；
- **全链接（complete linkage）**：两簇最远的一对点之间的距离， $D(c_1,c_2)=\max D(x_1,x_2)$ ；
- **平均链接（average linkage）**：所有跨簇点对距离的平均， $D(c_1,c_2)=\frac{1}{\lvert c_1\rvert\,\lvert c_2\rvert}\sum_{x_1\in c_1}\sum_{x_2\in c_2}D(x_1,x_2)$ ；
- **质心法（centroid method）**：两簇质心之间的距离。

| Linkage | 优点 | 缺点 |
| --- | --- | --- |
| 单链接 | 能处理非球形的形状 | 对噪声和离群值敏感 |
| 全链接 | 对噪声和离群值不那么敏感 | 倾向于得到直径相近的球形簇；容易拆开大簇 |
| 质心 | — | 可能破坏层次结构；对离群值敏感 |
<!-- Sources: L18 p.49-50, p.61-65, p.68 -->

### 手算一个例子：单链接与全链接

课件的距离矩阵：

| | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| 1 | 0 | 15 | 30 | 5 | 10 |
| 2 | 15 | 0 | 35 | 20 | 25 |
| 3 | 30 | 35 | 0 | 50 | 40 |
| 4 | 5 | 20 | 50 | 0 | 45 |
| 5 | 10 | 25 | 40 | 45 | 0 |
<!-- Sources: L18 p.51 -->

![Slide 54 - Updating the distance matrix after merging 1 and 4](assets/11-unsupervised-learning/slide-54.png)

第一步两种 linkage 相同：最小距离是 1–4（5，左表橙色），先合并 {1,4}。然后要更新“{1,4} 到其他点”的距离。看左表绿色的两格：1 到 2 是 15，4 到 2 是 20。单链接取较小的 15（右上表），全链接取较大的 20（右下表）。对 3 和 5 同样处理：

| | 到 2 | 到 3 | 到 5 |
| --- | --- | --- | --- |
| 单链接（取 min） | min(15,20)=15 | min(30,50)=30 | min(10,45)=10 |
| 全链接（取 max） | max(15,20)=20 | max(30,50)=50 | max(10,45)=45 |
<!-- Sources: L18 p.52-56 -->

- **单链接**：下一步最小是 10，合并 {1,4,5}；再在 15 合并 2；最后在 30 合并 3。
- **全链接**：下一步最小是 20（{1,4} 与 2），合并 {1,4,2}；剩下 {3,5} 距离 40 小于 {1,4,2} 到 3 的 50 或到 5 的 45，于是合并 {3,5}；最后在 50 合并全部。
<!-- Sources: L18 p.57-59 -->

![Slide 60 - Single vs complete linkage dendrograms](assets/11-unsupervised-learning/slide-60.png)

中间是原始距离矩阵，左右是两种结果。左边全链接的树：{1,4} 先合，再挂上 2，另一边 5 和 3 单独成一枝，最后两大枝在顶端（50）汇合，切成两簇就是 {1,4,2} 和 {3,5}。右边单链接的树是“一个个挂上去”的链状：{1,4} 先挂 5、再挂 2，3 最后才加入，最终高度只有 30（课件把 2 和 5 的连线画得有点交叉，但顺序如上）。同一个矩阵，linkage 不同，树就不同。
<!-- Sources: L18 p.60 -->

### 单链接的弱点：噪声搭桥

![Slide 62 - Single linkage is sensitive to noise](assets/11-unsupervised-learning/slide-62.png)

左边原始数据是一小团和一大团，中间有一些零散的噪声点。右边单链接切成两簇的结果：深蓝簇不仅包括左边小团，还顺着噪声点一路延伸进右边大团的边缘，红蓝分界很不自然。因为单链接只看 **最近的一对点**，只要有一串噪声点像桥一样连起来，两团就会被“链”在一起，这叫 **链式效应（chaining）**。反过来，正是这种“只看最近点”的性质让它能顺着弯月、圆环等非球形形状走（p.61）。全链接看的是最远点，对噪声不敏感，但会把一个大簇拆开去迁就直径相近的球形簇（p.63–64）。
<!-- Sources: L18 p.61-64 -->

### 质心法

![Slide 66 - Centroid linkage example](assets/11-unsupervised-learning/slide-66.png)

这是 **另一组数据**：左上表给出 5 个点的二维坐标，左下表是它们之间的距离。注意这里的距离是 **曼哈顿距离（Manhattan distance）** $\lvert\Delta x\rvert+\lvert\Delta y\rvert$ ，例如点 1 $(0,10)$ 到点 2 $(5,0)$ 是 $5+10=15$ ；而且 2–4、3–4 等数值和上一例不同，不要混用两张表。

第一步仍然合并距离最小的 1 和 4（5）。合并后用两点的质心 $(2.5,10)$ 代表 {1,4}（右上表），再重新算它到其他点的距离（右下表）：到 2 是 $2.5+10=12.5$ ，到 3 是 $7.5+20=27.5$ ，到 5 是 $7.5+5=12.5$ 。到 2 和到 5 打平，课件选了 2。课件 p.67 继续：{1,4,2} 的新质心取 $(3.75,5)$ ，到 5 的距离 18.75 最小，合并；{1,4,2,5} 的质心 $(-0.625,10)$ 到 3 是 30.625，最后合并。
<!-- Sources: L18 p.66-67 -->

**补充：** 课件的新质心是“两个被合并簇的质心取中点”：(2.5,10) 和点 2 (5,0) 的中点是 (3.75,5)。如果按 {1,4,2} 三个点真正求平均，应是 $(10/3,\ 20/3)\approx(3.33,6.67)$ 。两种更新方式都有人用，手算时要先确认题目用哪一种。

![Slide 68 - Centroid, complete and single linkage dendrograms](assets/11-unsupervised-learning/slide-68.png)

三棵树并排比较。左边质心法的树：{1,4} → 加 2 → 加 5 → 加 3，合并高度依次是 5、12.5、18.75、30.625。红色箭头和下方的字提醒质心法的两个问题： **可能破坏层次结构**，并且和 K-means 一样 **对离群值敏感**（质心是均值）。
<!-- Sources: L18 p.68 -->

**延伸内容（理解 p.68 的提醒）：** 这个例子里的高度其实是单调上升的，树没有“倒挂”；箭头说的是质心法的一般风险。所谓破坏层次结构，是指可能出现 **倒置（inversion）**：后一次合并的距离反而比前一次小，树状图上的横线会低于它下面的横线，“在某个高度横切”就不再对应一致的分组。理解用例（自拟）：三个点构成边长为 1 的等边三角形（欧氏距离）。先合并任意两点，高度 1；它们的质心是那条边的中点，到第三个点的距离是 $\sqrt3/2\approx0.87<1$ ，于是第二次合并的高度比第一次还低。单链接、全链接、平均链接不会出现这种情况。

层次聚类的优缺点：

- 优点：不需要预先假设簇数，切树状图就能得到任意个数；不假设簇的形状、大小、密度；结果可能对应有意义的分类体系（如生物分类）。
- 缺点：一旦合并就无法撤销，分错的点永远留在错的簇里；没有直接最小化的目标函数。
<!-- Sources: L18 p.69-70 -->

<a id="topic-5"></a>
## 5. 聚类评估

### 无监督指标：紧凑与分离

紧凑用 [WCSS](#topic-3)（越小越好），分离用 **簇间平方和（between-cluster sum of squares, BCSS）**（越大越好）：

$$
\mathrm{BCSS}=\sum_{j=1}^{K}n_j(\mu-\mu_j)^2 ,
$$

其中 $\mu$ 是全部数据的均值， $\mu_j$ 、 $n_j$ 是第 $j$ 簇的均值和大小。每个簇质心离总中心越远、簇越大，BCSS 越大。
<!-- Sources: L18 p.38-39, p.72-74 -->

**Calinski–Harabasz 指数**（又叫方差比准则，variance ratio criterion）同时考虑两者，越大越好：

$$
\mathrm{CH}=\frac{\mathrm{BCSS}}{\mathrm{WCSS}}\times\frac{N-K}{K-1},
$$

$N$ 是数据点总数， $K$ 是簇数。后一个因子用来抵消“ $K$ 越大 WCSS 越小”的天然优势。
<!-- Sources: L18 p.75 -->

![Slide 76 - CH index example](assets/11-unsupervised-learning/slide-76.png)

数据是数轴上的 6 个点 0, 0.5, 1, 3, 4, 5（2 处没有点，只是刻度），总均值 $\mu=2.25$ 。A 把它们分成左右两簇，B 分成三簇，中间那簇横跨空白把 1 和 3 放在一起。课件 p.77–83 逐步算出：

| 方案 | 簇 | WCSS | BCSS | CH |
| --- | --- | --- | --- | --- |
| A（ $K=2$ ） | {0, 0.5, 1}，{3, 4, 5} | 0.5 + 2 = 2.5 | $3(1.75)^2+3(1.75)^2=18.375$ | $\frac{18.375}{2.5}\times\frac{4}{1}=29.4$ |
| B（ $K=3$ ） | {0, 0.5}，{1, 3}，{4, 5} | 0.125 + 2 + 0.5 = 2.625 | $2(2)^2+2(0.25)^2+2(2.25)^2=18.25$ | $\frac{18.25}{2.625}\times\frac{3}{2}\approx10.43$ |
<!-- Sources: L18 p.76-83 -->

A 的 CH 更高，聚类更好：B 多用了一个簇，WCSS 反而更大，因为它把相距 2 的 1 和 3 放进了同一簇。

### 有监督指标：同质性

如果有真实标签，就可以比较聚类结果与真实类别。设真实类别为 $C$ 、聚类结果为 $K$ 。
<!-- Sources: L18 p.84 -->

![Slide 85 - Homogeneity definition](assets/11-unsupervised-learning/slide-85.png)

**同质性（homogeneity）**：每个簇里是否只有同一类的点。

$$
\text{homogeneity}=1-\frac{H(C\mid K)}{H(C)} .
$$

$H(C\mid K)$ 是“已知点在哪个簇以后，类别还剩多少不确定性”。如果每个簇都纯，知道簇就知道类， $H(C\mid K)=0$ ，同质性为 1。
<!-- Sources: L18 p.85 -->

**易错（课件笔误）：** 这一页中间式子的分母写成了 $Y_{true}$ ，应为 $H(Y_{true})=H(C)$ ；最后一句写“ $H(Y_{pred}\mid Y_{true})$ will be 0”，按同页定义应是 $H(Y_{true}\mid Y_{pred})=H(C\mid K)$ 。 $H(K\mid C)$ 是下面完整性用的。记法：同质性看“ **给定簇** ，类别乱不乱”，条件放簇 $K$ 。

![Slide 86 - Homogeneity improves with more clusters](assets/11-unsupervised-learning/slide-86.png)

上排三个大圆里各自又画了更小的圈，下排干脆每个点自己一个圈。簇越分越细，每个簇里越容易只剩一种颜色；每点一簇时同质性必然是 1。所以 **只看同质性会鼓励把簇分得越来越碎**，需要完整性来制衡。
<!-- Sources: L18 p.86 -->

### 有监督指标：完整性

**完整性（completeness）**：同一类的点是否都被分进同一个簇。

$$
\text{completeness}=1-\frac{H(K\mid C)}{H(K)} .
$$

完美时 $H(K\mid C)=0$ （知道类别就知道它在哪个簇），完整性为 1。每点一簇时完整性很低，因为同一类被拆进了许多簇。
<!-- Sources: L18 p.85-87 -->

### 例子：三个簇、三种颜色

条件熵按 [决策树](03-DT.zh.md) 的方式计算，也就是各组熵按组大小加权平均（熵的定义见 [01 概率](01-probability.zh.md)）：

$$
H(C\mid K)=\sum_k P(k)\,H(C\mid k),\qquad H(K\mid C)=\sum_c P(c)\,H(K\mid c).
$$

课件例子（p.88 起）把 17 个点分成三个簇，数一数每个圆里的颜色得到列联表：

| 簇 \ 类 | Red | Blue | Green | 合计 |
| --- | --- | --- | --- | --- |
| I | 5 | 1 | 0 | 6 |
| II | 1 | 4 | 1 | 6 |
| III | 2 | 0 | 3 | 5 |
| 合计 | 8 | 5 | 4 | 17 |
<!-- Sources: L18 p.88-95 -->

类别分布 8/17、5/17、4/17 给出 $H(C)\approx1.52$ （课件 p.89 写 1.527，按公式算是 1.522，差别只在第三位）。

![Slide 90 - Homogeneity calculation (contains an error)](assets/11-unsupervised-learning/slide-90.png)

这一页按簇逐个算类别熵：簇 I 是 5 红 1 蓝，簇 II 是 1 红 4 蓝 1 绿，簇 III 是 2 红 3 绿；最后一行按簇大小 6/17、6/17、5/17 加权得到 $H(C\mid K)$ 。右下角的 “Decision Tree lecture (lecture 5) – slide 45” 是从旧课件复制过来留下的页脚，不用理会。
<!-- Sources: L18 p.89-91 -->

**延伸内容（对课件数值的更正）：** $H(C\mid C_1)\approx0.65$ 和 $H(C\mid C_3)\approx0.97$ 是对的，但 $H(C\mid C_2)$ 不是 0.81。按同页公式重新计算：

$$
H(C\mid C_2)=-\Big(2\cdot\tfrac16\log_2\tfrac16+\tfrac46\log_2\tfrac46\Big)\approx0.862+0.390\approx1.25 .
$$

于是

$$
H(C\mid K)\approx\tfrac{6}{17}(0.65)+\tfrac{6}{17}(1.25)+\tfrac{5}{17}(0.97)\approx0.96,
\qquad
\text{homogeneity}\approx1-\frac{0.96}{1.52}\approx0.37,
$$

而不是课件 p.91 的 $1-0.799/1.527\approx0.477$ 。（课件的 0.799 正是用错值 0.81 代入加权得到的。）方法不变，只是这一个熵算错了。直觉检查：簇 II 里有三种颜色，它的熵理应比只有两种颜色的簇 III（0.97）更大，0.81 显然偏小。
<!-- Sources: L18 p.89-91 -->

![Slide 94 - Completeness calculation](assets/11-unsupervised-learning/slide-94.png)

完整性反过来 **按类别** 分组：红色 8 个点分布在簇 I、II、III 中各 5、1、2 个；蓝色 5 个分在 I、II 中各 1、4 个；绿色 4 个分在 II、III 中各 1、3 个。每种颜色算一个“簇分布的熵”，再按类别大小 8/17、5/17、4/17 加权：

$$
H(K\mid C)=\tfrac{8}{17}(1.30)+\tfrac{5}{17}(0.722)+\tfrac{4}{17}(0.811)\approx1.01 .
$$

簇大小 6/17、6/17、5/17 给出 $H(K)\approx1.58$ ，所以完整性 $\approx1-1.01/1.58\approx0.36$ （p.96）。这几个数经复核都正确。
<!-- Sources: L18 p.92-96 -->

<details markdown="1">
<summary>延伸内容（可选）：V-measure</summary>

学生笔记还记录了 V-measure：同质性与完整性的调和平均， $V=\dfrac{2\,h\,c}{h+c}$ ，用一个数综合两者（与 F1 综合 precision 和 recall 的方式相同，见 [08 评估](08-evaluation.md#topic-2)）。用更正后的同质性 0.37 和完整性 0.36，本例 $V\approx0.36$ 。它不在本讲课件中。

</details>
<!-- Sources: Apple Notes W9L18 Unsupervised Learning -->

## 本讲自测

1. 一维数据 1, 2, 10, 11, 12，取 $K=2$ ，初始质心为 1 和 2。手算 K-means 直到收敛，最终的簇和 WCSS 是什么？若初始质心改为 11 和 12 呢？
2. 数据是两个同心圆环。K-means、单链接、全链接三种做法中，哪个最可能把两个环分开？为什么另外两个不行？
3. 用本讲第一个距离矩阵改用平均链接：合并 {1,4} 之后，{1,4} 到 2、3、5 的距离各是多少？下一步合并谁？
4. 把每个点单独作为一簇：同质性、完整性各是多少？这时 CH 指数能算吗？
5. 把 17 个点全部放进一个簇：同质性和完整性分别是多少？结合第 4 题说明为什么两个指标必须一起看。
