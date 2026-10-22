# COMP90049 Lectures 11–12 - Evaluation and Generalisation

来源：`lecture/11-evaluation-1.pdf`、`lecture/12-evaluation-2.pdf`；Apple Notes：CS/25S2/IML — "W6L11 Evaluation"、"W6L12 Generalisation"、"★5 Evaluation"、"★5.1 Bias vs. Variance"。

这篇讲的是：**怎样知道模型真的学会了，而且在没见过的数据上也表现好？**

学习路线：[怎样切分数据](#topic-1) → [分类指标](#topic-2) → [回归指标](#topic-3) → [过拟合与学习曲线](#topic-4) → [偏差与方差](#topic-5) → [诊断、对策与评估本身的偏差](#topic-6)。

重点：交叉验证、Precision/Recall/F1、三种平均方式、偏差—方差分解。难点：用学习曲线判断高偏差还是高方差。易错：用测试集调超参数（数据泄露）；在类别不平衡时只看 accuracy。

<a id="topic-1"></a>
## 1. 评估策略：切分数据与调超参数

### 为什么要切分

目标是让模型在 **未见过的数据** 上表现好。手里通常只有一份数据，所以要把它分成训练数据和测试数据。前提假设是：训练集和测试集来自同一分布，样本彼此独立。
<!-- Sources: L11 p.5-7 -->

### 留出法

**留出法（holdout）**：随机把每个实例分到训练集或测试集，两者不重叠；只用训练集建模，只用测试集评估。常见比例 50–50、80–20、90–10。它简单、可复现，但有三个问题：划分大小、抽样偏差、数据浪费。
<!-- Sources: L11 p.10-12 -->

![L11 slide 13 - Holdout split size](assets/08-evaluation/slide-l11-13.png)

两条横条的绿色部分是训练集、白色部分是测试集。上面一条测试多、训练少：模型没有足够信息学好。下面一条训练多、测试少：模型学得好，但少量测试实例未必有代表性，所以估计出的性能可能偏高，也可能偏低。

![L11 slide 14 - Sampling bias in holdout](assets/08-evaluation/slide-l11-14.png)

顶部横条是原数据，橙、紫、黄三种颜色代表三个类别，色块长度就是类别比例。上面一次随机抽样让测试集只剩黄色；下面一次让测试集只有橙色和紫色、训练集缺了橙色。两次都是“随机”，却让训练集和测试集的类别分布不同，这就是 **抽样偏差（sampling bias）**。

第三个问题是 **数据浪费**：有些实例只用来训练，有些只用来测试，没有一个实例两种用途都发挥。
<!-- Sources: L11 p.13-14 -->

### 分层抽样

![L11 slide 15 - Stratification](assets/08-evaluation/slide-l11-15.png)

和上一张对比：分层后，测试集和训练集里都有橙、紫、黄三段，而且三段的比例和顶部原数据一样。

**分层抽样（stratification）**：让每个划分（或每一折）保持与原数据相同的类别比例，在类别不平衡时特别重要。它保证小类也有代表，但实现更复杂，而且仍然没有让每个样本都既当训练又当测试。
<!-- Sources: L11 p.15-16 -->

### k 折交叉验证

![L11 slide 18 - k-fold cross-validation](assets/08-evaluation/slide-l11-18.png)

**k 折交叉验证（k-fold cross-validation）**：把数据分成 $k$ 折。第 $i$ 轮用第 $i$ 折测试、其余 $k-1$ 折训练，得到 $E_i$ ，最后取平均 $E=\frac{1}{k}\sum_{i=1}^{k}E_i$ 。图中每一行是一轮，蓝色格子是这一轮的测试折：它从右向左移动，每一折都恰好当一次测试；右边的大括号把 $E_1,\dots,E_k$ 合成一个平均值。
<!-- Sources: L11 p.17-18 -->

- 优点：每个实例都既当过训练又当过测试，估计更可靠；
- 缺点：要训练 $k$ 次，更费时；
- $k$ 少：每折更大，但性能估计的方差更大； $k$ 多：方差更小但更慢。最常用 $k=10$ （有时 5），相当于更可靠的 90–10 留出法；
- 也可以做 **分层交叉验证**：每一折都保持原数据的类别比例。
<!-- Sources: L11 p.19-21 -->

**留一交叉验证（leave-one-out）** 就是 $k$ 等于样本数的 k 折交叉验证：没有抽样偏差，一般偏差和方差都最低，但最耗时。
<!-- Sources: L12 p.44; Apple Notes W6L12 Generalisation -->

### 超参数调优需要第三份数据

决策树太浅就接近 1-R，太深又无法泛化；“深度”这类训练前要定好的量就是 **超参数（hyperparameter）**，挑选它叫 **超参数调优（hyperparameter tuning）**。在 scikit-learn 里，它就是 `DecisionTreeClassifier(max_depth=...)` 的参数。
<!-- Sources: L11 p.22-24 -->

**易错：数据泄露（data leakage）。** 如果用测试集来挑超参数，最终模型就没有真正“没见过”的数据可评估了。所以需要第三份 **验证集（validation data）**。
<!-- Sources: L11 p.25 -->

![L11 slide 26 - Supervised models pipeline](assets/08-evaluation/slide-l11-26.png)

按圆圈编号读：训练数据（1）和选定的算法（2）一起训练模型（3），得到模型参数（4）；用验证集（5）预测，得到验证表现（6）；根据这个表现调超参数或选特征（7），虚线箭头指回 3 重新训练。这一圈（3→4→5→6→7→3）只用训练集和验证集。定下来之后才用测试集（8）评估最终模型（9）。红色虚线框圈出的是“拿模型去预测、看表现”的部分：验证集在调参循环里反复用，测试集只在最后用一次。

**易错：** 不要把红色虚线框读成“调参循环”。框里同时有验证集和测试集；调参循环是上面那一圈，测试集不在其中。
<!-- Sources: L11 p.26-27 -->

选出最佳超参数后，把训练集和验证集合并，用该超参数重新训练，再用测试集检查表现。
<!-- Sources: L11 p.27 -->

![L11 slide 28 - Cross-validation for hyperparameter tuning](assets/08-evaluation/slide-l11-28.png)

也可以不单独留验证集，而是在训练数据内部做 k 折交叉验证来挑超参数：图中训练数据被分成 3 块，每一行换一块当验证数据（浅蓝色），另外两块训练；每个候选超参数都跑 $k$ 次、取平均分。右边的测试数据始终放在一边，不参与任何一行。
<!-- Sources: L11 p.28 -->

<a id="topic-2"></a>
## 2. 分类指标

### 混淆矩阵

![L11 slide 33 - Confusion matrix](assets/08-evaluation/slide-l11-33.png)

**混淆矩阵（confusion matrix）** 的行是实际类别，列是预测类别。绿色对角格是预测正确：TP（真正例，实际正、预测正）、TN（真反例，实际负、预测负）；红色格是两种错误：FN（假反例，实际正却预测负）、FP（假正例，实际负却预测正）。记法：第二个字母是“预测成什么”，第一个字母是“预测得对不对”。
<!-- Sources: L11 p.33 -->

$$
\text{Accuracy}=\frac{TP+TN}{TP+TN+FP+FN},\qquad
\text{Precision}=\frac{TP}{TP+FP},\qquad
\text{Recall}=\frac{TP}{TP+FN},
$$

$$
F_1=\frac{2\times\text{Precision}\times\text{Recall}}{\text{Precision}+\text{Recall}} .
$$
<!-- Sources: L11 p.31, p.35-36, p.41 -->

### Recall 与 Precision

![L11 slide 35 - Recall](assets/08-evaluation/slide-l11-35.png)

红框圈住的是“实际为 Positive”这一行：recall 只看这一行，问其中有多少被预测对。下一张课件（Precision）把红框换成“预测为 Positive”这一列，问预测为正的里面有多少真的是正。

- **召回率（recall）**：实际为正的样本里，被找出来的比例。接近 1 说明 FN 少。
- **精确率（precision）**：预测为正的样本里，真的为正的比例。接近 1 说明 FP 少。
- **F1**：两者的调和平均，用来在两者之间求平衡。Precision 和 Recall 通常此消彼长：把阈值放松，找出的正例多了（recall 升），混进来的负例也多了（precision 降）。
<!-- Sources: L11 p.35-36, p.40-41 -->

并非所有错误代价相同：把真正感染病毒的人判成阴性（FN）要尽量避免，应看重 recall；把无辜的人判成罪犯（FP）要尽量避免，应看重 precision。
<!-- Sources: L11 p.34 -->

**补充：** 特异度（specificity，TNR） $=TN/(TN+FP)$ ，即实际为负的样本里被正确识别的比例，与 recall 互补。
<!-- Sources: Apple Notes W6L11 Evaluation; Apple Notes ★5 Evaluation -->

### Accuracy 会骗人：需要基线

![L11 slide 38 - 99 percent accuracy that finds no patient](assets/08-evaluation/slide-l11-38.png)

右边的混淆矩阵是 100 个人：唯一的病人被判成阴性（FN = 1），99 个健康人都判对（TN = 99），预测为 Positive 的那一列全是 0。accuracy $=99/100=99\%$ ，但 recall $=0/1=0$ ：一个病人也没找到；precision 则是 $0/0$ ，根本没有定义。

只有 1% 的人患某病时，一个永远预测“没病”的模型 accuracy 就是 99%，却毫无用处。所以要和 **基线（baseline）** 比较，例如 [Zero-R 与 One-R](03-DT.zh.md)：基线还能反映任务本身的难度（同样 accuracy，5% 和 99% 的基线意义完全不同）。
<!-- Sources: L11 p.37-39 -->

### 二分类手算例子

![L11 slide 42 - Binary worked example](assets/08-evaluation/slide-l11-42.png)

右上表是 4 个实例的真实标签（Label）和预测（Prediction），以 Red 为正类。逐行对照：第 1 行 Red→Red 是 TP；第 2、4 行 Blue→Red 是 FP；第 3 行 Red→Blue 是 FN；没有 Blue→Blue，所以 TN = 0。右下的混淆矩阵把这四个数填进去，左边逐个代入公式：accuracy $=1/4$ ，recall $=1/2$ ，precision $=1/3$ 。

**易错：** 课件把 precision 先四舍五入成 0.33 再算 F1，得到 $\approx 0.398$ ；用精确值 $P=1/3$ 、 $R=1/2$ 时 $F_1=\frac{2\cdot\frac13\cdot\frac12}{\frac13+\frac12}=0.4$ 。手算时尽量保留分数到最后一步。

### 多分类：先选“感兴趣的类”

![L11 slide 44 - Multi-class confusion matrix with Red as the interesting class](assets/08-evaluation/slide-l11-44.png)

多分类时，把一个类当作感兴趣的正类，其他类都当作负类，就能为每个类算一套 TP/FP/FN。看右下 $3\times3$ 混淆矩阵（5 个实例，类别 Red/Blue/Gold）以 Red 为正类时怎样标记：

- TP：Red 行与 Red 列交叉的那一格；
- FN：Red 行的其余格（实际 Red、预测成别的）；
- FP：Red 列的其余格（实际是别的、预测成 Red）；
- TN：右下角剩下的 $2\times2$ 块，与 Red 无关的全部格子。
<!-- Sources: L11 p.43-46, p.49 -->

以 Red 为正类：TP = 1，FP = 2（实际 Blue 被预测成 Red），所以 $\text{Precision}_{Red}=1/3$ ；FN = 1，所以 $\text{Recall}_{Red}=1/2$ 。换成 Blue 或 Gold 当正类时，它们的 TP 都是 0，所以 precision 和 recall 都是 0。
<!-- Sources: L11 p.44-46, p.48 -->

### 三种平均方式

![L11 slide 48 - Macro averaging](assets/08-evaluation/slide-l11-48.png)

**宏平均（macro averaging）**：左侧先列出每个类自己的 precision 和 recall，右侧把它们直接相加除以类别数 $c=3$ 。每个类权重相同，不管它有多少实例。

![L11 slide 49 - Micro averaging](assets/08-evaluation/slide-l11-49.png)

**微平均（micro averaging）**：不先算每类的比值，而是把所有类的计数加在一起再除一次。precision 的分母 $1+0+0+2+2+0$ 是三个 TP 加三个 FP（Red 列有 2 个 FP，Blue 列有 2 个 FP：一个实际 Red、一个实际 Gold）；recall 的分母是三个 TP 加三个 FN（各行对角线以外的数之和：1、2、1）。

| 平均方式 | 做法 | 本例 Precision | 特点 |
| --- | --- | --- | --- |
| Macro | 每类算完再简单平均 | $(0.33+0+0)/3=0.11$ | 各类同等重要，突出小类 |
| Micro | 把所有类的 TP、FP 先加总再算 | $1/(1+2+2)=0.2$ | 每个实例同等重要，被大类主导 |
| Weighted | 每类按样本占比加权 | $\frac{2}{5}\times0.33+\frac{2}{5}\times0+\frac{1}{5}\times0=0.132$ | 样本多的类权重大 |
<!-- Sources: L11 p.47-51 -->

表中 weighted 一行对应 **加权平均（weighted averaging）**：权重 $n_i/N$ 是第 $i$ 类的实际实例数占总数的比例（Red 2 个、Blue 2 个、Gold 1 个）。

![L11 slide 52 - Comparing averaging methods](assets/08-evaluation/slide-l11-52.png)

这张换成类别大小悬殊的混淆矩阵：实际 Red 200 个、Blue 20 个、Gold 10 个。右下先算每类 recall：0.9、0.25、0.1；左边三种平均的结果是 macro ≈ 0.42，而 micro 和 weighted 都 ≈ 0.81——大类表现好就能掩盖小类很差。如果关心小类，就要看 macro。
<!-- Sources: L11 p.52 -->

**补充：** 每个实例只有一个真实标签、一个预测标签时，所有类的 FP 总数等于 FN 总数（每个错分实例同时是一个类的 FP 和另一个类的 FN），所以 micro precision = micro recall = accuracy（本例都是 0.2）。同理，weighted recall $=\sum_i \frac{n_i}{N}\cdot\frac{TP_i}{n_i}=\frac{\sum_i TP_i}{N}$ 也等于 accuracy，这就是上图 micro 和 weighted recall 都是 0.81 的原因。
<!-- Sources: L11 p.44, p.49 -->

<a id="topic-3"></a>
## 3. 回归指标

回归不数对错，而是衡量误差的 **大小**；误差越小，对新实例的预测越好。
<!-- Sources: L11 p.54 -->

![L11 slide 55 - Sum of squared errors](assets/08-evaluation/slide-l11-55.png)

先看中间的定义：第 $i$ 个实例的 **残差（residual）** 是真实值减预测值 $y_i-\hat{y}_i$ ，可正可负；底部的 SSE 把每个残差平方后相加，平方一来去掉正负号，二来让大误差占更大比重。后面的 MSE、RMSE、MAE 都从同一个残差出发，只是汇总方式不同。

$$
\mathrm{SSE}=\sum_{i=1}^{n}(y_i-\hat{y}_i)^2,\qquad
\mathrm{MSE}=\frac{1}{N}\sum_{i=1}^{N}(y_i-\hat{y}_i)^2=\frac{\mathrm{SSE}}{N},
$$

$$
\mathrm{RMSE}=\sqrt{\mathrm{MSE}},\qquad
\mathrm{MAE}=\frac{1}{N}\sum_{i=1}^{N}\lvert y_i-\hat{y}_i\rvert .
$$
<!-- Sources: L11 p.55-58 -->

| 指标 | 特点 |
| --- | --- |
| SSE（也叫 RSS、SSR） | 残差平方和 |
| MSE | 平方放大大误差，对离群值敏感 |
| RMSE | MSE 开根号，单位与目标变量相同，更好解释 |
| MAE | 所有误差同等对待，对离群值不那么敏感 |
<!-- Sources: L11 p.55-59 -->

`理解用例（自拟）`：4 个残差为 $1,1,1,10$ 。MAE $=13/4=3.25$ ；MSE $=(1+1+1+100)/4=25.75$ ，RMSE $\approx5.07$ 。一个离群残差让 RMSE 比 MAE 高出一半多，这就是“对离群值敏感”的含义。

<a id="topic-4"></a>
## 4. 泛化：过拟合与学习曲线

### 欠拟合、过拟合与合适的拟合

- **欠拟合（underfitting）**：模型表达力不够，抓不住数据里的模式；
- **过拟合（overfitting）**：模型太复杂，把噪声也学进去了；
- 合适的模型抓住数据的本质模式。

课件这一页的三幅散点图在 PDF 里没有画出决策边界，三幅的点完全相同；带拟合线的对照图见 [偏差与方差](#topic-5) 中的 L12 slide 29。
<!-- Sources: L12 p.4 -->

### 学习曲线

**学习曲线（learning curve）** 把学习表现画成“经验”的函数：纵轴是 accuracy、错误率等指标；横轴可以是训练集大小、模型复杂度或迭代次数。训练曲线显示模型学得怎样，验证曲线显示它泛化得怎样。
<!-- Sources: L12 p.6 -->

![L12 slide 9 - Learning curve over training size](assets/08-evaluation/slide-l12-09.png)

横轴是训练数据所占百分比（例如 10–90、20–80 …… 90–10 的划分，每个划分最好多跑几次取平均），红色 × 是训练准确率，蓝色 + 是测试准确率。测试准确率随训练数据增加而上升并趋于平稳；训练准确率始终在它上方，两线越来越近。结论写在顶部：更多训练实例通常带来更好的模型；更多评估实例让性能估计更可靠——两者争夺同一份数据，学习曲线让我们看见这个取舍。
<!-- Sources: L12 p.8-9 -->

### 模型复杂度：多项式阶数

![L12 slide 10 - MSE against polynomial order](assets/08-evaluation/slide-l12-10.png)

这是第二种学习曲线：横轴换成模型复杂度（多项式最高阶数 $D$ ），纵轴是 MSE。蓝色训练误差随阶数增加一直下降；橙色测试误差在 $D\approx2$ 附近最低，之后缓慢上升，到 $D=10,11$ 时陡增。训练误差越来越小、测试误差却变大，正是过拟合的信号。

![L12 slide 11 - Polynomial orders](assets/08-evaluation/slide-l12-11.png)

用 $\phi(x)=[1,x,x^2,\dots,x^D]$ 扩展线性回归： $y=\mathbf{w}\cdot\phi(x)$ 。四个小图依次是 $D=0$ （水平线，MSE 84.4）、 $D=1$ （直线）、 $D=2$ 、 $D=3$ （曲线）；每个小图标题里写着该阶数的 MSE，阶数越高曲线越灵活、训练 MSE 越低。**模型复杂度（model complexity）** 可理解为可调参数的多少，例如决策树深度、多项式阶数。
<!-- Sources: L12 p.10-14 -->

![L12 slide 15 - Overfitting and underfitting](assets/08-evaluation/slide-l12-15.png)

横轴是决策树叶子数，纵轴是错误率（ $=100\%-$ accuracy）；实线是训练集，虚线是测试集，蓝色竖虚线约在 100 个叶子处。左侧训练和测试错误都高：欠拟合的证据。右侧训练错误继续下降、测试错误却回升，两者差距很大：过拟合的证据。
<!-- Sources: L12 p.15 -->

<a id="topic-5"></a>
## 5. 偏差与方差

### 两个词各有三种用法

**期望（expectation）** 可以理解为“无限多次抽样后的平均”：掷公平硬币的平均值，样本越多越接近 $1/2$ 。偏差和方差都是用期望来定义的。
<!-- Sources: L12 p.17 -->

![L12 slide 18 - Model bias](assets/08-evaluation/slide-l12-18.png)

右上图：灰色粗线是真实函数 $f(x)$ ，三种颜色的点是三份训练集，三条直线是在各自训练集上拟合的线性模型。三条直线几乎重合（换训练集变化不大），但都抓不住弯曲的真实函数，两端系统性偏低、中间偏高：这就是 **高偏差（high bias）**。

![L12 slide 19 - Model variance](assets/08-evaluation/slide-l12-19.png)

同样三份训练集，换成非常灵活的模型：三条折线各自穿过自己的训练点，彼此差别很大。平均起来离真实函数不远，但单独一条随训练集剧烈变化：这就是 **高方差（high variance）**。

| | 偏差（bias） | 方差（variance） |
| --- | --- | --- |
| 模型 | 系统性地预测错的倾向 | 训练数据稍有变化时预测随之变化的程度 |
| 评估 | 评估策略系统性地高估或低估模型 | 换一批测试数据时指标波动的程度 |
| 抽样 | 训练或评估数据不能代表总体 | — |
<!-- Sources: L12 p.18-19 -->

回归中，模型偏差可以用带符号误差的平均来看： $\frac{1}{N}\sum_{i=1}^{N}(y_i-\hat{y}_i)$ 。预测系统性偏高或偏低，模型就有偏；有高有低、正负抵消，则无偏。模型方差衡量换一个训练集后预测变化多大——高方差与预测对不对无关，只看稳不稳：

$$
\mathrm{Var}(\hat{f})=\mathbb{E}\big[(\hat{f}(x)-\mathbb{E}[\hat{f}(x)])^2\big].
$$
<!-- Sources: L12 p.20-21; Apple Notes W6L12 Generalisation -->

### 泛化误差的分解

假设数据由 $Y=f(X)+\epsilon$ 生成，噪声 $\epsilon\sim\mathcal{N}(0,\sigma^2)$ 来自无法测量的来源（如标注错误、测量误差）。不同训练集会得到不同的 $\hat{f}$ ，所以看它在多次训练上的期望平方误差 $\mathbb{E}[(Y-\hat{f}(x))^2]$ 。在回归中它可以分解为：
<!-- Sources: L12 p.23-24 -->

![L12 slide 25 - Bias-variance decomposition](assets/08-evaluation/slide-l12-25.png)

$$
\mathrm{Err}=\underbrace{\big(\mathbb{E}[f(x)-\hat{f}(x)]\big)^2}_{\text{Bias}^2}
+\underbrace{\mathbb{E}\big[(\hat{f}(x)-\mathbb{E}[\hat{f}(x)])^2\big]}_{\text{Variance}}
+\underbrace{\sigma^2}_{\text{Irreducible error}} .
$$
<!-- Sources: L12 p.25 -->

公式下面的红色括号把三项分别标成 Bias、Variance 和蓝色的 Irreducible Error。下半部分的图：红线是真实的 $f(x)$ ；每条黄线是用一份训练集得到的 $\hat{f}(x)$ ；绿色虚线是许多次训练的平均 $\mathbb{E}[\hat{f}(x)]$ 。平均模型（绿）与真实 $f(x)$ （红）的差距是偏差；各条黄线围绕绿线的摆动是方差；数据点本身围绕红线的散布是噪声 $\sigma^2$ 。

- **方差**：换训练集模型会变多少——模型有多“专门化”于某个训练集；
- **偏差**：即使训练数据无限多也会有的误差，来自模型本身偏向某类解；
- **噪声**：来自数据分布和特征表示的模糊性，任何模型都无法消除；噪声太大时应考虑换数据或换特征。
<!-- Sources: L12 p.26; Apple Notes W6L12 Generalisation -->

### 打靶图与两种失败

![L12 slide 28 - Bias and variance targets](assets/08-evaluation/slide-l12-28.png)

把靶心当作真实值、绿点当作不同训练集训练出的预测：上下两行看点是否聚拢（方差），左右两列看点群中心是否在靶心（偏差）。最好的情况是左上角：低偏差、低方差；右下角最差：点既散、中心又偏。
<!-- Sources: L12 p.27-28 -->

![L12 slide 29 - Overfitting, underfitting and good balance](assets/08-evaluation/slide-l12-29.png)

底部三幅图把打靶图换成回归拟合：左边折线穿过每个点（高方差、过拟合）；中间一条水平线（高偏差、欠拟合）；右边一条平滑曲线顺着数据的趋势（低偏差、低方差）。

高偏差和高方差都导致泛化差。例如 Zero-R 方差为零但偏差很高。
<!-- Sources: L12 p.29 -->

### 偏差—方差权衡

![L12 slide 31 - Bias-variance trade-off](assets/08-evaluation/slide-l12-31.png)

**偏差—方差权衡（bias-variance trade-off）**：模型越复杂，偏差平方（红线）越小、方差（青线）越大；总误差（黑线）呈 U 形，竖虚线标出它的最低点，即最合适的复杂度。竖虚线左边是欠拟合区，右边是过拟合区：处理偏差和方差，本质上就是处理欠拟合和过拟合。
<!-- Sources: L12 p.31 -->

**补充：常见模型的大致倾向。** 下表来自学生复习笔记，帮助把超参数和偏差/方差联系起来：

| 模型 / 超参数 | 倾向 |
| --- | --- |
| 线性 / 逻辑回归 | 偏差较高、方差较低 |
| kNN 的 $k$ 增大 | 偏差 ↑、方差 ↓ |
| 决策树深度增大 | 偏差 ↓、方差 ↑ |
| SVM 的 $C$ 增大 | 更少容忍违反间隔，方差 ↑ |
| 多层感知机 | 表达力强，偏差低，容易过拟合 |
| 随机森林（bagging） | 主要降低方差 |
| AdaBoost（boosting） | 主要降低偏差，迭代多了可能过拟合 |
<!-- Sources: Apple Notes ★5.1 Bias vs. Variance; L11 p.24; L15 p.45; L20 p.15, p.44 -->

<a id="topic-6"></a>
## 6. 诊断、对策与评估本身的偏差

### 用学习曲线诊断

把训练误差和测试误差画成训练集大小 $N'$ 的函数。课件用二次回归 $h(x;\theta)=\theta_0+\theta_1x+\theta_2x^2$ 逐步增加训练点 $N'=1,2,3,\dots$ ：点很少时模型能完美拟合，训练误差接近 0、测试误差很高；点越多，训练误差上升、测试误差下降。

![L12 slide 34 - Diagnosing high bias](assets/08-evaluation/slide-l12-34.png)

**高偏差**：左下图里黄色训练误差和红色测试误差都很快变平，最后都停在较高的位置、彼此靠得很近；黑色双箭头量的是这个整体偏高的误差水平。右边两幅小图里，蓝色直线无论只有几个点（上）还是很多点（下）都拟合不好弯曲的数据。此时单靠增加数据帮助不大。
<!-- Sources: L12 p.32-34 -->

![L12 slide 35 - Diagnosing high variance](assets/08-evaluation/slide-l12-35.png)

**高方差**：训练误差很低，测试误差高，双箭头标出两条曲线之间明显的 **缺口（gap）**。右上小图里，弯来弯去的曲线穿过了每个训练点；右下小图在点多了之后，曲线变得平滑合理。增加训练数据很可能有帮助——缺口会随数据增多而缩小。
<!-- Sources: L12 p.35 -->

| 问题 | 对策 |
| --- | --- |
| 高偏差 | 用更复杂的模型（如非线性模型）；增加特征；boosting |
| 高方差 | 增加训练数据；减少特征（[09 特征选择](09-feature-selection.md)）；降低模型复杂度；bagging |
<!-- Sources: L12 p.37-38 -->

Boosting 与 bagging 见 [13 集成学习](13-ensemble-learning.md)。

### 评估指标本身也是估计量

我们想知道分类器的“真实”错误率，但只能用某一批评估实例算出一个估计值。样本无限多时，表观错误率才等于真实错误率。可能的问题是：在某些评估集上准确率高，换一批就很差；也可能对验证集过拟合。
<!-- Sources: L12 p.40-42 -->

- **评估偏差（evaluation bias）**：估计的效果系统性偏高或偏低；
- **评估方差（evaluation variance）**：换一批测试实例，估计值变化很大（很难与模型方差区分）。
<!-- Sources: L12 p.43 -->

| 手段 | 效果 |
| --- | --- |
| 留出法：训练多、测试少 | 模型方差小，评估方差大（反之亦然） |
| k 折交叉验证 | 模型和评估的方差都比留出法小 |
| 分层抽样 | 模型偏差和评估偏差更小 |
| 留一交叉验证 | 没有抽样偏差，一般偏差和方差最低 |
<!-- Sources: L12 p.44 -->

![L12 slide 45 - Report mean and variance of k-fold scores](assets/08-evaluation/slide-l12-45.png)

这张图就是 [k 折交叉验证](#topic-1) 那张，只是右边除了均值 $\mu$ ，还多了 $k$ 个分数 $E_1,\dots,E_k$ 的方差。

**重点：** 报告交叉验证结果时，除了平均值 $\mu=\frac{1}{k}\sum E_i$ ，也报告方差 $\frac{1}{k}\sum(E_i-\mu)^2$ ，让读者知道估计有多稳定。
<!-- Sources: L12 p.45 -->

## 本讲自测

1. 你用测试集比较了 5 个 $k$ 值，选出最好的再报告它在测试集上的 accuracy。问题在哪里？应怎样改？
2. 一个癌症筛查模型 precision 0.9、recall 0.3，另一个 precision 0.4、recall 0.95。筛查场景应优先哪一个？各自的 F1 是多少？
3. 三类数据中一类占 90%。为什么 micro 平均的 F1 可能很好看，而 macro 平均很差？
4. 训练误差 2%、验证误差 25%，增加训练数据后差距逐渐缩小。这是高偏差还是高方差？还能怎么做？
5. 一个回归模型的 RMSE 远大于 MAE，这说明残差有什么特点？
