# COMP90049 Lecture 19 - Semi-supervised Learning, Active Learning and Pre-training

来源：`lecture/19-semisupervised.pdf`（p.1–55）；Apple Notes：CS/25S2/IML — "W10L19 Weakly supervised learning"。p.41–42 是考试风格的例题页，本笔记不收录。

这篇讲的是：**有标签的数据很少、没标签的数据很多时，怎样把两者都用上？**

学习路线：[为什么要两者兼用](#topic-1) → [半监督学习与自训练](#topic-2) → [主动学习](#topic-3) → [数据增强](#topic-4) → [自监督预训练与微调](#topic-5)。

重点：自训练的循环与置信度阈值；三种不确定性采样。难点：各方法各自引入的偏差。易错：“先聚类再按多数标签打标”看似合理却是坏主意；不同不确定性采样策略可能选出不同实例。

<a id="topic-1"></a>
## 1. 为什么要两者兼用

### 监督与无监督各有短板

![Slide 03 - Supervised vs unsupervised pros and cons](assets/12-semi-supervised-learning/slide-03.png)

上半部分用蓝色加号、减号列出两种学习的优缺点；下方三张条形图是某个主题模型找出的三个“主题”（topic 1–3），每条横条是一个词及其权重。右侧箭头的批注提醒：无监督结果“你能解读出多少，它就有多少意义”。

| | 监督学习 | 无监督学习 |
| --- | --- | --- |
| 优点 | 清楚、可解释 | 能发现新东西；数据充足 |
| 缺点 | 必须事先知道要找什么（类别、标签）；标注数据稀缺 | 常常噪声大、难以解释 |
<!-- Sources: L19 p.3 -->

### 标签是瓶颈，数据量又很重要

![Slide 06 - More data helps as much as more layers](assets/12-semi-supervised-learning/slide-06.png)

横轴是网络层数（50、101、152），纵轴是 mean AP（平均精度）。蓝线用约 1400 万张图的 ImageNet 训练，橙线用 3 亿张图（300M）训练：在每一种深度上，橙线都更高，而且从 50 层加到 152 层带来的提升，和把数据从 ImageNet 换成 300M 带来的提升差不多大。所以“加数据”几乎和“加层数”一样有效；数据少时，参数再多也学不到更多。

标签可能需要专家、专门设备，或受隐私限制难以获得；而无标签数据便宜且量大。另一方面，纯无监督学习的簇或隐特征可能与任务无关、难以解释，甚至找错方向（p.7）。
<!-- Sources: L19 p.4-7 -->

### 四条出路

![Slide 08 - Four alternatives to going unsupervised](assets/12-semi-supervised-learning/slide-08.png)

这一页用四个“如果……”问句，各自用红色箭头指向一种方法，也就是本讲后面四个主题：

| 手里有什么 | 方法 |
| --- | --- |
| 少量有标签 + 大量无标签数据 | 半监督学习（自训练） |
| 少量有标签数据 + 有限的标注预算 | 主动学习 |
| 能对有标签数据做变形，造出更多样本 | 数据增强 |
| 能先在相关的无监督（自监督）任务上“热身” | 预训练 + 微调 |
<!-- Sources: L19 p.8; Apple Notes W10L19 Weakly supervised learning -->

学生笔记的概括很好记：少量有标签数据“指方向”，大量无标签数据“推一把”。
<!-- Sources: Apple Notes W10L19 Weakly supervised learning -->

<a id="topic-2"></a>
## 2. 半监督学习与自训练

### 被动学习者同时吃两种数据

![Slide 11 - Semi-supervised learning diagram](assets/12-semi-supervised-learning/slide-11.png)

顶部是原始无标签数据 $X_1,X_2,X_3,\dots$ 。右边的 Expert/Oracle 给其中一部分打标签，得到底部的 $(X_1,Y_1),(X_2,Y_2),\dots$ ，交给左边的 **被动学习者（passive learner）**。和上一页的普通监督学习相比，这一页多了左上那条箭头：无标签数据也直接送进学习者。“被动”指学习者不能决定哪些数据被标注（对比主动学习）。

### 目标

设 $L=\{(x_i,y_i)\}_{i=1}^{l}$ 是有标签实例， $U=\{x_i\}_{i=l+1}^{l+u}$ 是无标签实例，通常 $U\gg L$ 。**半监督学习（semi-supervised learning）** 的目标是：用 $L\cup U$ 学到比只用 $L$ 更好的分类器。
<!-- Sources: L19 p.12 -->

### 一个坏主意：聚类后按多数标签打标

![Slide 13 - Clusters over labelled and unlabelled points](assets/12-semi-supervised-learning/slide-13.png)

空心圆是无标签点，红点、蓝点是少数有标签点，虚线圈是聚类得到的两个簇。想法是：把每个簇里有标签样本的多数类，贴给簇里的所有无标签样本。

![Slide 15 - Clustering plus majority voting is a bad idea](assets/12-semi-supervised-learning/slide-15.png)

这是打标后的结果：上方簇里的点全部变红，下方簇里的点全部变蓝，斜线是由此得到的分界。注意只有四个有标签点，却决定了约四十个点的标签；最上面那一小团和左下那一小团离任何有标签点都很远，只因为聚类把它们划进了某个簇，就整体继承了那个簇的标签。如果聚类的划分和真实类别不一致（例如左下那一团其实属于另一类），整团就一起错。页面右上角直接写着 “A bad idea”。
<!-- Sources: L19 p.12-15 -->

**易错：** 簇不一定和类别对齐。学生笔记补充了原因：错误会在整簇中系统性地传播；而且边界附近的点被“一刀切”，没有尊重类别之间应当位于低密度区域的假设。
<!-- Sources: L19 p.15; Apple Notes W10L19 Weakly supervised learning -->

### 自训练

![Slide 16 - Self-training algorithm](assets/12-semi-supervised-learning/slide-16.png)

**自训练（self-training，也叫 bootstrapping）** 不借助外部资源，只用自己的预测给自己扩充训练集：

```text
repeat
    train a model f on L with any supervised method
    use f to predict labels for the instances in U
    pick the subset of U with "high confidence" labels
    move them from U to L, using the predictions as ground truth
until L does not change
```
<!-- Sources: L19 p.16 -->

**重点：** 被移进 $L$ 的是模型的 **预测**，不是真实标签；后面的每一轮都把这些预测当作“真相”来训练。

#### 以 1-NN 为例

以 1-NN 为例，“高置信度”就是：最近邻已经在 $L$ 中的那些无标签实例。
<!-- Sources: L19 p.17 -->

![Slide 19 - One step of 1-NN self-training](assets/12-semi-supervised-learning/slide-19.png)

实心红点、蓝点已经在 $L$ 中。红圈空心点和蓝圈空心点是这一轮被选中的：它们的最近邻是已标注点，于是得到那个点的颜色。下一页（p.20）它们就变成实心，再下一页又有新的点被圈出——标签就这样一步步向外扩散。

![Slide 22 - Self-training with 1-NN over iterations](assets/12-semi-supervised-learning/slide-22.png)

真实数据上的过程：横轴体重、纵轴身高，绿色是尚未标注的点。四个小图是第 1、25、70、100 轮：标签从最初的一个红叉、一个蓝点出发，沿着最近邻向外扩散，最终两团数据被分别染成红色和蓝色。
<!-- Sources: L19 p.18-22 -->

![Slide 24 - Self-training can propagate errors](assets/12-semi-supervised-learning/slide-24.png)

红、蓝椭圆是两类的真实范围，红叉和蓝点是最初的有标签点。课件追问：如果最初的有标签点在箭头处（蓝组边缘的一小撮点）会怎样？标签只能从起点沿最近邻一步步扩散，起点不同，传播路径和结果就可能不同；一旦某一步贴错，错误会继续往下传。
<!-- Sources: L19 p.23-24 -->

### 自训练的假设与安全网

![Slide 25 - Self-training assumptions](assets/12-semi-supervised-learning/slide-25.png)

传播标签依赖一个假设：相近（相似）的点很可能有相同标签。分类错误会传播，所以需要“安全网”：置信度低于阈值时不加入 $L$ ，例如 1-NN 中只接受最近邻距离小于 $\tau$ 的点。没有这个阈值时，低置信度的错误预测也会被当作真标签加入 $L$ ，在之后每一轮继续扩散。
<!-- Sources: L19 p.25 -->

用朴素贝叶斯做自训练也一样：在 $L$ 上训练，对 $U$ 预测类别概率，把概率超过阈值（或最自信的前 N 个）的实例连同预测标签移入 $L$ ，直到 $L$ 不变或变化很小。
<!-- Sources: L19 p.26 -->

<a id="topic-3"></a>
## 3. 主动学习

### 让模型自己挑要标注的样本

![Slide 29 - Active learning loop](assets/12-semi-supervised-learning/slide-29.png)

和 slide 11 同一张图，但左边的 “Passive” 被划掉，改成 “Active”。中间多了一列来回箭头：红色箭头是学习者发出的请求 $(X_1,?)$ 、 $(X_3,?)$ ，蓝色箭头是 oracle 返回的 $(X_1,Y_1)$ 、 $(X_3,Y_3)$ 。所以 **主动学习（active learning）** 中，学习器主动挑出一些无标签实例，请 **oracle**（例如人工标注者）给出标签，再用这些新标签训练。
<!-- Sources: L19 p.28-30 -->

背后的假设：如果让分类器参与挑选训练实例，用更少的实例就能达到更高的准确率；标注是有限资源，应当花在最能提高效果的地方。
<!-- Sources: L19 p.30 -->

![Slide 32 - Which mushrooms to ask about](assets/12-semi-supervised-learning/slide-32.png)

左上和右上是两个已知标签的参考：红底白点的有毒，棕色的无毒。中间一堆蘑菇无标签。被圈出的两个正是“说不准”的：上面那个是棕色却带白点，下面那个是红帽子却长着另一种菌柄，都同时像两个参考。学习者应当拿它们去问专家，而不是问那些一眼就能判断的。

### 选哪些实例

![Slide 33 - Choose uncertain instances](assets/12-semi-supervised-learning/slide-33.png)

值得标注的是模型最 **不确定** 的实例：靠近类别边界的点（图中 × 与 o 交界的红线附近，那些黑色小点），或标签很少的区域里的点。
<!-- Sources: L19 p.33 -->

查询策略分两大类：**不确定性采样（uncertainty sampling）**（下面三种）和 **委员会查询（query by committee）**。

### 不确定性采样

三页课件都用同一个例子：三个角色 Left、Middle、Right 在 Cat/Dog/Pig 上的预测概率。

#### 最小置信度

![Slide 36 - Least confidence](assets/12-semi-supervised-learning/slide-36.png)

**最小置信度（least confidence）**：先看每个实例最可能那一类的概率，再挑这个概率最小的实例：

$$
x^{*}=\arg\min_x \max_y P(y\mid x).
$$

表中绿色格子是每行的最大值（0.70、0.50、0.34），红框标出最小的那个：Right。

#### 间隔采样

![Slide 38 - Margin sampling](assets/12-semi-supervised-learning/slide-38.png)

**间隔采样（margin sampling）**：看前两名类别的概率差，差越小越难分：

$$
x^{*}=\arg\min_x \big(P(y_1\mid x)-P(y_2\mid x)\big),
$$

其中 $y_1,y_2$ 是对 $x$ 而言概率最大和第二大的类别。黄色高亮是每行的前两名：Left 差 0.45，Middle 差 0.05，Right 只差 0.01，所以选 Right。

#### 熵采样

![Slide 39 - Entropy uses all class probabilities](assets/12-semi-supervised-learning/slide-39.png)

前两种只看一两个概率；**熵采样（entropy sampling）** 用上全部类别的概率。两幅手绘柱状图是两个预测分布：左边各类差不多高（分布平，熵高，模型很不确定）；右边有一根明显更高（分布尖，熵低）。课件公式中的 $\theta$ 是模型参数， $\hat y_i$ 遍历所有类别，对数以 2 为底。

![Slide 40 - Entropy sampling table](assets/12-semi-supervised-learning/slide-40.png)

$$
x^{*}=\arg\max_x \Big(-\sum_y P(y\mid x)\log P(y\mid x)\Big).
$$

表的最后一列只写了 Low / Medium / High。下表把数值补上（熵为笔记以 2 为底自算）：

| 实例 | P(Cat) | P(Dog) | P(Pig) | 最大概率 | 前两名之差 | 熵 |
| --- | --- | --- | --- | --- | --- | --- |
| Left | 0.70 | 0.05 | 0.25 | 0.70 | 0.45 | 1.08 |
| Middle | 0.45 | 0.05 | 0.50 | 0.50 | 0.05 | 1.23 |
| Right | 0.34 | 0.33 | 0.33 | 0.34 | 0.01 | 1.58 |
<!-- Sources: L19 p.34-40 -->

三种策略都选 Right：它的最大概率最低、前两名几乎打平、熵最高。
<!-- Sources: L19 p.35-40 -->

**易错：** 这个例子里三者一致，但一般并不保证。`理解用例（自拟）`：两个实例的预测分布为 (0.5, 0.5, 0) 和 (0.4, 0.3, 0.3)。最小置信度比较 0.5 与 0.4，选第二个；间隔采样比较 0 与 0.1，选第一个。原因是间隔只看前两名，而最小置信度只看第一名。

### 委员会投票

![Slide 43 - Query by committee](assets/12-semi-supervised-learning/slide-43.png)

**委员会查询（query by committee, QBC）**：维护一组模型，都用同样的有标签数据但以不同方式训练；对每个无标签实例让它们投票，选 **分歧最大** 的实例去标注。委员会意见不一，说明模型不确定，看到真实标签收益最大。分歧可以用 **投票熵（vote entropy）** 衡量：投票越分散，熵越大。
<!-- Sources: L19 p.43 -->

**补充：** 学生笔记把投票熵写成 $-\sum_y\frac{V(y)}{C}\log\frac{V(y)}{C}$ ，其中 $V(y)$ 是投给类别 $y$ 的票数， $C$ 是委员会规模。它就是把“票数比例”当作概率分布再算熵。
<!-- Sources: Apple Notes W10L19 Weakly supervised learning -->

### 注意事项

主动学习在实践中越来越常用，经验上很稳健，但缺乏理论依据；它会引入偏差：被挑选并标注的数据不再服从真实的标签分布（被选中的总是边界附近这类“难”样本，而不是按真实分布随机抽取的样本）；不确定性采样还可能挑中离群值或噪声。
<!-- Sources: L19 p.44 -->

<a id="topic-4"></a>
## 4. 数据增强

![Slide 45 - Augmented versions of one image](assets/12-semi-supervised-learning/slide-45.png)

左边一张原图（猫），右边是它的六个变体：翻转（flip）、旋转（rotation）、模糊（blur）、曝光（exposure）、对比度（contrast）、灰度（grayscale）。六张图标签都还是“猫”，于是一个有标签样本变成了七个。

**数据增强（data augmentation）**：给每个有标签实例加一点“噪声”，生成多个变体（p.46 用一只小狗的多个裁剪、旋转版本示意）。
<!-- Sources: L19 p.46 -->

- 图像：调亮度、左右翻转、上下左右平移、缩放、旋转；
- 音频：调音量、时间平移、调频率；
- 文本：同义词替换。
<!-- Sources: L19 p.47 -->

这些扰动不应改变实例的标签，而且一般应是真实数据中会出现的变化。
<!-- Sources: L19 p.47 -->

**易错：** 某种变换是否“安全”取决于任务。`理解用例（自拟）`：手写数字左右翻转后，有的数字不再是同一个数字，而且真实书写中也不会出现镜像数字，所以一般不适合。

![Slide 49 - Crops that lose the object](assets/12-semi-supervised-learning/slide-49.png)

这一页放在“优缺点”标题下，是缺点的直观例子：同一只小狗的六个随机裁剪里，上中那张只剩地面，左上只剩一只爪子，其余几张也只有鼻子、耳朵等局部。把这些图仍标成“狗”，就是给模型喂了不存在的特征，甚至是错误标签。

| 优点 | 缺点 |
| --- | --- |
| 更多数据几乎总能改进学习 | 训练数据有偏 |
| 大多数学习算法对噪声有一定鲁棒性 | 可能引入现实中不存在的特征 |
| | 可能传播错误 |
| | 加重可解释性与透明度问题 |
<!-- Sources: L19 p.48 -->

<a id="topic-5"></a>
## 5. 自监督预训练与微调

### 预训练加微调

![Slide 52 - Pre-training and fine-tuning](assets/12-semi-supervised-learning/slide-52.png)

深度学习的成功来自更好的模型、各种训练技巧、更强的硬件（GPU）和更多数据——但数据不可能都标注（p.51）。关键做法是 **预训练 + 微调**：
<!-- Sources: L19 p.51-52 -->

1. 在某个无监督（**自监督，self-supervised**）任务上预训练可复用的参数；
2. 用预训练权重初始化模型；
3. 在（通常是有监督的）目标任务上微调。
<!-- Sources: L19 p.52 -->

自监督的“标签”来自数据本身：先破坏或修改数据，再让模型重建。文本：遮住词预测、句子打乱、预测下一个词（自回归）；图像：扩散（加噪与去噪）、对比学习（生成增强版本，学会它们是同一个东西）。
<!-- Sources: L19 p.52 -->

### 例子：BERT

![Slide 53 - BERT pre-training tasks](assets/12-semi-supervised-learning/slide-53.png)

BERT 预训练用两个任务：**掩码语言模型（masked language modelling, MLM）**——预测句子中被遮住的词，如 "The cat [MASK] on the mat."；**下一句预测（next sentence prediction, NSP）**——判断一句话是否紧跟另一句。下方两个框是 NSP 的正例与反例：猫坐在垫子上之后接“它在阳光下轻声呼噜”，标签 `IsNext`；接一句股市新闻，标签 `NotNext`。两个任务的标签都直接从原文得到，不需要人工标注。

![Slide 54 - BERT fine-tuning](assets/12-semi-supervised-learning/slide-54.png)

上方三个图标是可微调到的下游任务：垃圾邮件检测、IT 工单分级、评论情感分析。下方三步：取预训练好的 BERT，在上面加一个分类层，再用一个小的有标签数据集微调整个模型。
<!-- Sources: L19 p.53-54 -->

## 本讲自测

1. 自训练中如果不设置置信度阈值，会发生什么？
2. 三个实例的预测分布是 (0.6, 0.4, 0)、(0.5, 0.25, 0.25) 和 (0.45, 0.45, 0.1)。最小置信度、间隔采样和熵采样分别会选哪个？
3. 主动学习为什么会让训练集的标签分布偏离真实分布？
4. 给一个识别交通标志的模型做数据增强时，哪些变换合适，哪些可能改变标签？
5. 为什么 BERT 的 MLM 与 NSP 不需要人工标注？
