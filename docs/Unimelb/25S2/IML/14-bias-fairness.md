# COMP90049 Lecture 21 - Measuring and Mitigating Algorithmic Bias

来源：`lecture/21-bias-fairness.pdf`；Apple Notes：CS/25S2/IML — "W11L21 Bias & Fairness"。

这篇讲的是：**机器学习系统会在哪里产生不公平？怎样用数字定义“公平”，又能在哪些环节改进？**

学习路线：[偏差的来源](#topic-1) → [机器学习流程中的偏差](#topic-2) → [敏感属性与“无视”](#topic-3) → [形式化的公平标准](#topic-4) → [让分类器更公平](#topic-5)。

重点：三种群体公平标准各自比较的是哪个条件概率。难点：为什么各标准不能同时满足。易错：删掉敏感属性并不能消除歧视（代理变量）。

<a id="topic-1"></a>
## 1. 偏差的来源

医疗诊断、仇恨言论检测、保险推荐、预测性警务、法律领域……机器学习用得越广，出错的后果越严重。PPT p.5–9 用几篇新闻报道说明这一点，这里不转载。
<!-- Sources: L21 p.4-9 -->

### 人有偏差

![Slide 12 - Humans are biased](assets/14-bias-fairness/slide-12.png)

PPT 从数千种认知偏差中挑了两种：

- **外群体同质性偏差（out-group homogeneity bias）**：人们倾向于把外群体成员看得比内群体成员更单一，即刻板印象与偏见；
- **相关性谬误（correlation fallacy）**：把碰巧同时出现的两件事误当成因果。
<!-- Sources: L21 p.12 -->

### 数据有偏差

![Slide 13 - Historical bias in image search](assets/14-bias-fairness/slide-13.png)

**历史偏差（historical bias）**：即使随机抽样，数据也反映过去的世界，包括不应延续的偏见。截图是搜索 “professor” 的图片结果（下一页是 “nurse”）：结果反映的是过去这些职业的人群构成，模型若从中学习，就会把这种构成当成“规律”。

![Slide 15 - Reporting bias word counts](assets/14-bias-fairness/slide-15.png)

**代表性 / 报告偏差（representation / reporting bias）**：数据不能忠实代表总体。看右下的词频表（单位是每万亿词）：“murdered” 出现了 280 多万次，“breathed” 只有 70 多万次，“exhaled” 更少——人们每天都在呼吸，却很少写下来。显而易见的事实少被提及、异常被夸大；同理，少数群体代表不足，负面结果少报、正面结果多报。

![Slide 17 - Measurement bias and remedies](assets/14-bias-fairness/slide-17.png)

**测量偏差（measurement bias）** 有三种形式，PPT 各给了一个例子：

| 形式 | 例子 |
| --- | --- |
| ① 测量有噪声，错误或缺失不是随机分布的 | 不同邮编区的逮捕记录详略不同 |
| ② 用有噪声的代理当作目标标签 | 用“是否录用”代替“求职者质量” |
| ③ 把关心的量过度简化 | 把美国政治倾向简化为民主党 vs 共和党 |
<!-- Sources: L21 p.13-16 -->

底部粉色条是对策：了解领域、了解任务、了解数据。
<!-- Sources: L21 p.17 -->

### 模型有偏差

![Slide 19 - Model bias and remedies](assets/14-bias-fairness/slide-19.png)

- **模型拟合**：弱模型高偏差、低方差（见 [08](08-evaluation.md)）；模型假设可能没有根据。右上角的两条分布曲线示意模型的假设形状；
- **有偏的损失函数**：对某些类型的错误“视而不见”。例如数据高度不平衡时，0/1 损失会容忍少数类上的错误。
<!-- Sources: L21 p.18 -->

粉色框里是对策：仔细考虑模型假设；仔细选择损失函数；对不同群体分别建模；在数据中公平地代表各群体。
<!-- Sources: L21 p.19 -->

### 评估与部署有偏差

![Slide 21 - Evaluation and deployment bias](assets/14-bias-fairness/slide-21.png)

- **评估偏差**：测试集不能代表目标人群；对测试集过拟合（被广泛使用的基准数据集会加重这个问题）；评估指标没有覆盖所有关心的量（例如 accuracy 会忽略少数群体或只反映平均效果；人脸识别模型主要在白人图像上训练和评估）。
- **部署偏差**：系统被用于并非设计初衷的场景；终端用户缺乏相关知识。
<!-- Sources: L21 p.20 -->

右上的粉色框是对策：仔细选择评估指标；同时用多个指标；仔细选择测试集与基准；为模型写文档，确保它被正确使用。
<!-- Sources: L21 p.21 -->

<a id="topic-2"></a>
## 2. 机器学习流程中的偏差

![Slide 22 - The machine learning pipeline](assets/14-bias-fairness/slide-22.png)

沿着图中的箭头走一圈：从 **世界** 测量（measure）得到 **数据**，从数据学习（learn）得到 **模型**，模型对 **个人** 采取行动（action），个人的行为又作为反馈（feedback）回到模型；虚线表示个人也是世界的一部分。每一步都可能引入偏差（PPT p.23–26 依次高亮每一环）：
<!-- Sources: L21 p.22 -->

| 环节 | 要注意什么 |
| --- | --- |
| 测量 | 定义关心的变量和目标变量；目标没有被直接测量时尤其关键，如用录用决定代替求职者质量、用收入代替信用 |
| 学习 | 数据中既有“知识”（吸烟致癌），也有“刻板印象”（男孩喜欢蓝色、女孩喜欢粉色）；两者的区别取决于社会规范，没有清晰界线 |
| 行动 | 机器学习的输出（分类、回归、检索）变成实际行动：是否垃圾邮件、是否发放信贷、搜索结果、酒店推荐 |
| 反馈 | 从用户行为近似得到，例如点击率 |
<!-- Sources: L21 p.23-26 -->

### 例子：无意的歧视

![Slide 27 - Unintended discrimination case study](assets/14-bias-fairness/slide-27.png)

亚马逊在美国按邮编推出当日送达，目标是降低成本、提高效率，用模型预测该给哪些区域送货。看右边波士顿和纽约的地图：服务区（蓝色）与不服务区（灰色）呈现出明显的地域分布——没有人有意歧视，但结果可能对某些群体不利。
<!-- Sources: L21 p.27 -->

<a id="topic-3"></a>
## 3. 敏感属性与“无视”

![Slide 29 - Sensitive attributes notation](assets/14-bias-fairness/slide-29.png)

| 符号 | 含义 |
| --- | --- |
| $X$ | 非敏感特征 |
| $A$ | 敏感属性，取离散值（男/女、老/少……） |
| $Y$ | 真实标签 |
| $\hat{Y}$ | 预测标签 |
<!-- Sources: L21 p.29 -->

实例通常混有有用且无争议的属性和 **敏感属性（sensitive attributes）**——我们不希望基于它们做决定。不同属性把人口分成不同的群体。哪些属性敏感往往并不清楚，而选择会产生深远影响。
<!-- Sources: L21 p.29 -->

![Slide 30 - Fairness through unawareness](assets/14-bias-fairness/slide-30.png)

**通过无视实现公平（fairness through unawareness）**：把敏感特征全部藏起来，只用 $X$ 训练：

$$
P(\hat{Y}_n\mid X_n,A_n)\approx P(\hat{Y}_n\mid X_n).
$$
<!-- Sources: L21 p.30 -->

**易错：** $X$ 可能与 $A$ 相关。PPT 下半页的案例：一家银行同时服务人类和火星人，火星上的学校和学历层次与地球不同，所以即便删掉“物种”，“教育”仍会泄露它。学生笔记称之为 **代理歧视（proxy discrimination）**，例如学历与年龄、姓名与种族或性别。
<!-- Sources: L21 p.30; Apple Notes W11L21 Bias & Fairness -->

<a id="topic-4"></a>
## 4. 形式化的公平标准

![Slide 32 - Metric recap](assets/14-bias-fairness/slide-32.png)

先回顾指标。表格的行是真实标签 $y$ 、列是预测 $\hat{y}$ （混淆矩阵见 [08](08-evaluation.md)）：

$$
\mathrm{PPV}=\frac{TP}{TP+FP}\ (\text{precision}),\qquad
\mathrm{TPR}=\frac{TP}{TP+FN}\ (\text{recall}),\qquad
\mathrm{FNR}=\frac{FN}{TP+FN}=1-\mathrm{TPR}.
$$
<!-- Sources: L21 p.32 -->

例子贯穿全节：银行训练分类器决定是否给申请人发放信贷；申请人有人类（多数群体）和火星人（受保护的少数群体），“物种”是 **受保护属性（protected attribute）**，分类器应当对两者公平。
<!-- Sources: L21 p.33 -->

### 标准一：群体公平（人口统计均等）

![Slide 34 - Demographic parity example](assets/14-bias-fairness/slide-34.png)

**人口统计均等（demographic parity）** 要求预测与敏感属性统计独立， $\hat{Y}\perp A$ ：

$$
P(\hat{Y}=1\mid A=m)=P(\hat{Y}=1\mid A=h).
$$
<!-- Sources: L21 p.34 -->

怎样读图：上方两个框是训练集中的两组申请人，实心圆 = 真实应发放，空心圆 = 不应发放（蓝色火星人、红色人类）；下方横条是被预测为“发放”的样本，实心是真阳性、空心是假阳性。火星人 12 人中 4 人被批准，人类 18 人中 6 人被批准： $4/12=6/18=1/3$ ，满足人口统计均等。
<!-- Sources: L21 p.34 -->

再细看下方横条：被批准的 4 个火星人大多是空心（不合格），被批准的 6 个人类大多是实心（合格）。这正是它的缺陷：它简单直观，但 **完全不看真实标签** $Y$ ，分类器可以对多数群体批准真正合格的人，对少数群体却批准不合格的人，而不受任何惩罚——这反而可能进一步损害少数群体的声誉。
<!-- Sources: L21 p.35 -->

### 标准二：预测均等

![Slide 36 - Predictive parity example](assets/14-bias-fairness/slide-36.png)

**预测均等（predictive parity）**：各群体的 PPV（precision）相同，即被预测为正的人中真正为正的比例相同：

$$
P(Y=1\mid\hat{Y}=1,A=m)=P(Y=1\mid\hat{Y}=1,A=h).
$$

在图中，被批准的火星人中 2/4、被批准的人类中 3/6 是实心（真正合格），都是 1/2。
<!-- Sources: L21 p.36 -->

它考虑了真实标签，但会 **接受（甚至放大）真实标签中已有的不公平**：如果数据里人类本来就更常有好信用，分类器就可以一开始更常给人类好分数。
<!-- Sources: L21 p.37 -->

### 标准三：机会均等

![Slide 38 - Equal opportunity example](assets/14-bias-fairness/slide-38.png)

**机会均等（equal opportunity）**：各群体的 FNR（等价地，TPR）相同，即真正合格的人被拒绝的概率相同：

$$
P(\hat{Y}=0\mid Y=1,A=m)=P(\hat{Y}=0\mid Y=1,A=h)
\iff
P(\hat{Y}=1\mid Y=1,A=m)=P(\hat{Y}=1\mid Y=1,A=h).
$$
<!-- Sources: L21 p.38 -->

这次看上方的实心圆：火星人和人类各有 6 个真正合格，各有 4 个出现在下方被批准的横条里，都是 $4/6=2/3$ 。对信用真正好的人，无论物种，预测应该相似；局限与预测均等相同。
<!-- Sources: L21 p.38-39 -->

**补充：** 学生笔记还记了 **均等几率（equalised odds）**：在机会均等之外，再要求 $P(\hat{Y}=0\mid Y=0,A)$ 在各群体相同，即对真正不合格的人也同样对待。
<!-- Sources: Apple Notes W11L21 Bias & Fairness -->

| 标准 | 比较的量 | 是否用到 $Y$ | 直觉 |
| --- | --- | --- | --- |
| 人口统计均等 | $P(\hat{Y}=1\mid A)$ | 否 | 批准率相同 |
| 预测均等 | $P(Y=1\mid\hat{Y}=1,A)$ ，PPV | 是 | 被批准的人同样可靠（不错选） |
| 机会均等 | $P(\hat{Y}=1\mid Y=1,A)$ ，TPR | 是 | 合格的人同样有机会（不漏选） |
<!-- Sources: L21 p.34-39; Apple Notes W11L21 Bias & Fairness -->

**易错：** 三个标准分母不同。人口统计均等的分母是“整组人”，预测均等的分母是“被批准的人”，机会均等的分母是“真正合格的人”。一个分类器可以满足其中一个而违反另一个：两组批准率相同，并不保证被批准者中合格的比例也相同。判断时先问“分母是谁”。

### 标准四：个体公平

![Slide 40 - Individual fairness](assets/14-bias-fairness/slide-40.png)

**个体公平（individual fairness）** 不按群体平衡，而是直接比较个体：特征 $X$ （工作、学历……）相似的人应得到相似的分数：

$$
P(\hat{Y}_i=1\mid A_i,X_i)\approx P(\hat{Y}_j=1\mid A_j,X_j)\quad\text{if }\ \mathrm{sim}(X_i,X_j)>\theta .
$$

图中把一个人类和一个火星人放进 $\mathrm{sim}(\cdot,\cdot)$ ，结果写着 “???”：难点正是要定义相似度函数 $\mathrm{sim}()$ （往往不简单），还要选阈值 $\theta$ 。
<!-- Sources: L21 p.40 -->

### 没有免费的公平

![Slide 41 - No fair free lunch](assets/14-bias-fairness/slide-41.png)

图中每组柱子是一个族群中“不会违约者获得贷款的比例”，不同颜色对应不同的决策规则（只求最大利润、统一阈值、人口统计均等、机会均等、均等几率）。同一族群在不同规则下的比例差别很大：不同公平标准给出的“公平”预测并不一样；同时满足所有标准很困难，有时可以证明不可能；公平与整体性能之间也常常需要权衡。
<!-- Sources: L21 p.41 -->

<a id="topic-5"></a>
## 5. 让分类器更公平

可以在三个环节改进：预处理、训练（优化）、后处理。
<!-- Sources: L21 p.43 -->

### 预处理

**平衡数据集**：上采样少数群体，或下采样多数群体。
<!-- Sources: L21 p.44 -->

![Slide 45 - Re-weighting data instances](assets/14-bias-fairness/slide-45.png)

**重新加权（re-weighting）**：若 $A$ 与 $Y$ 独立，期望分布是 $P_{\exp}(A=a,Y=y)=P(A=a)\times P(Y=y)$ ；实际观察到的是 $P_{\text{obs}}(A=a,Y=y)=\frac{\#(Y=y,A=a)}{\lvert D\rvert}$ 。PPT 自上而下三行就是这三步，每个实例的权重是

$$
W(X_i=\{x_i,a_i,y_i\})=\frac{P_{\exp}(A=a_i,Y=y_i)}{P_{\text{obs}}(A=a_i,Y=y_i)} .
$$
<!-- Sources: L21 p.45 -->

**理解用例（自拟）：** 100 位申请人中火星人 20 位，其中 5 位信用好；全体中 50 位信用好。 $P_{\exp}(m,1)=0.2\times0.5=0.1$ ，而 $P_{\text{obs}}(m,1)=5/100=0.05$ ，所以信用好的火星人权重为 2：它们在数据里“少了一半”，训练时就加倍计算。

### 训练时加约束

![Slide 46 - Fairness-constrained training](assets/14-bias-fairness/slide-46.png)

公平标准也可以直接放进训练。以逻辑回归的损失 $\mathcal{L}(\theta)$ 为例，若要求人口统计均等：

$$
\min_\theta\ \mathcal{L}(\theta)\quad\text{subject to}\quad P(\hat{Y}=1\mid A=m)=P(\hat{Y}=1\mid A=h).
$$

优点是公平性直接成为训练的一部分；缺点是优化问题更复杂。
<!-- Sources: L21 p.46 -->

### 后处理

![Slide 47 - Post-processing](assets/14-bias-fairness/slide-47.png)

修改分类器的预测：例如为不同群体选择阈值 $\theta$ （ $w\cdot x_i>\theta$ 时预测 1），以调节 PPV、TPR、FNR；或对“难判”的实例（ $P(\hat{y}_i)\approx0.5$ ）采用特殊策略（学生笔记举例：人工复核）。优点是与模型无关，连专有的黑箱模型也能用；缺点是测试时需要知道受保护属性。
<!-- Sources: L21 p.47; Apple Notes W11L21 Bias & Fairness -->

## 本讲自测

1. 招聘模型对男女的录用率都是 30%，但被录用的女性中只有 40% 真正合格，男性中是 80%。满足哪个标准，违反哪个？
2. 为什么删掉“性别”这一列后，模型仍可能对性别有歧视？
3. 某人脸识别系统在测试集上 accuracy 98%，测试集 90% 是同一族群的人脸。这属于哪种偏差？该怎样评估？
4. 后处理为不同群体设不同阈值，部署时需要什么额外条件？
