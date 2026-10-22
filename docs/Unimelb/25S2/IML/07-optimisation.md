# COMP90049 Lectures 7–8 - Optimisation: From Derivatives to Gradient Descent

来源：`lecture/07-linearregression.pdf`（p.12–14、p.22–39）、`lecture/08-logisticregression.pdf`（p.2–18、p.38–40）；Apple Notes：CS/25S2/IML — "W4P2 Optimisation"、"★4 Optimisation"。线性回归与逻辑回归模型本身见 [05 线性与逻辑回归](05-LR.zh.md)，这里只讲怎样求出它们的参数。

这篇讲的是：**定好了模型和“好坏”的标准之后，怎样真正找到最好的参数？**

学习路线：[目标函数与损失](#topic-1) → [精确优化：令导数为零](#topic-2) → [迭代优化：梯度下降](#topic-3) → [学习率、多参数与局部最优](#topic-4) → [用在逻辑回归上](#topic-5)。

重点：求极值的四步法、梯度下降的更新式。难点：二项分布的最大似然推导、学习率与收敛的关系。易错：梯度前面的减号、多参数要同时更新、课件 L08 p.40 求和上限写错。

<a id="topic-1"></a>
## 1. 目标函数与损失函数

### 训练就是让错误最小

![L07 slide 12 - Residuals of a regression line](assets/07-optimisation/slide-l07-12.png)

图中横轴是每周工作小时数，纵轴是收入，蓝点是真实数据，橙色直线是模型的预测。看中间标出的那个点：蓝色的 $y_i$ 是真实值，红色的 $\hat{y}_i$ 是直线在同一个 $x_i$ 上给出的预测值，两者之差

$$
\varepsilon_i=y_i-\hat{y}_i
$$

就是这个样本的 **残差（residual）**，也就是模型犯的“错误”。每个点下面或上面的蓝色虚线都是一个残差：点在直线上方时 $\varepsilon_i>0$ （预测偏低），在下方时 $\varepsilon_i<0$ （预测偏高）。

要找“最好”的直线，就需要一个 **损失函数（loss function）**：把所有样本的错误汇总成一个数。训练线性回归，就是找让这个数最小的参数 $\beta_0,\beta_1,\dots,\beta_D$ 。常见的损失有 RSS、MSE、MAE、RMSE；本讲只用 **均方误差（MSE, mean squared error）**，它们作为评价指标的比较见 [08 评估](08-evaluation.md)。
<!-- Sources: L07 p.12-13; Apple Notes W4P2 Optimisation -->
<!-- Sources: L07 p.12-14 -->

### 优化：找让目标最优的参数

![L07 slide 23 - Finding optimal points: profit vs price](assets/07-optimisation/slide-l07-23.png)

**优化（optimisation）** 就是寻找让某个目标最优的参数。课件举了两个例子：多少学习时间能让成绩最好？鞋子定价多少利润最高？下面的曲线画的是第二个例子：横轴是价格，纵轴是利润。价格太低赚得少，太高没人买，曲线在价格约 15 处达到最高点（利润约 200）。优化要找的就是这个最高点对应的横坐标，而不是最高点的纵坐标本身。
<!-- Sources: L07 p.23; L08 p.3 -->

### 目标函数：求最大还是求最小

![L07 slide 24 - Objective functions: argmax and argmin](assets/07-optimisation/slide-l07-24.png)

**目标函数（objective function）** $f(\theta)$ 输入一组参数 $\theta$ ，输出一个评价分数。我们要找的是它的 **极值点（extreme point）**；根据任务，可能是最大值，也可能是最小值：

$$
\hat{\theta}=\arg\max_{\theta} f(\theta)\quad\text{(e.g. profit, log likelihood)},\qquad
\hat{\theta}=\arg\min_{\theta} f(\theta)\quad\text{(e.g. error, MSE)}.
$$

$\arg\max$ 读作“使 $f$ 最大的那个 $\theta$ ”：它返回的是参数，不是最大值。求最小值时，课件把 $f$ 叫作损失函数。
<!-- Sources: L07 p.24 -->

<a id="topic-2"></a>
## 2. 精确优化：令导数为零

### 极值点处斜率为零

![L07 slide 25 - Slope is zero at an extreme point](assets/07-optimisation/slide-l07-25.png)

左边的图画的是 $f(\theta)=\theta^2$ ，三条橙色虚线是三个点上的切线：在 $\theta=-3$ 处切线向下倾斜（斜率为负），在 $\theta=3$ 处向上倾斜（斜率为正），只有在最低点 $\theta=0$ 处切线是水平的。切线的斜率就是 **一阶导数（first derivative）** $\partial f/\partial\theta$ ：它衡量输入 $\theta$ 变一点时，输出 $f(\theta)$ 变多少。所以在极值点，函数是“平的”，导数等于 0。

右边的黄框说明这一招什么时候能找到全局最优：对 **凸函数（convex function，形状像 ∪）** 求最小值，或对 **凹函数（concave function，形状像 ∩）** 求最大值。

**易错：** 中文教材里“凹/凸”的叫法并不统一，有的把 ∪ 形叫“凹函数”。读课件时以英文为准：convex 就是碗口向上的 ∪ 形，导数为零处是最小值。
<!-- Sources: L07 p.25 -->

### 一维例子

![L07 slide 26 - Example: minimise (theta - 1) squared](assets/07-optimisation/slide-l07-26.png)

对 $f(\theta)=(\theta-1)^2$ ，求导得 $\partial f/\partial\theta=2(\theta-1)$ ；令它等于 0，得 $\theta=1$ 。右边的红色曲线在 $\theta=1$ 处碰到横轴，正是最低点。因为这条曲线是凸的，所以 $\hat{\theta}=\arg\min_\theta f(\theta)=1$ 是全局最小值点。
<!-- Sources: L07 p.26 -->

### 求极值的四步法

![L07 slide 28 - Recipe for finding minima and maxima](assets/07-optimisation/slide-l07-28.png)

把上面的例子抽象出来，就是课件的四步法：

1. 写出目标函数 $f(\theta)$ （例如数据的对数似然）；
2. 对 $\theta$ 求一阶导数；
3. 令导数等于 0；
4. 解出 $\theta$ 。

**重点：** 这套方法能直接写出答案，叫 **闭式解（closed-form solution）**。它的前提是第 4 步真的解得出来；逻辑回归正是解不出来的例子（见 [第 5 节](#topic-5)）。
<!-- Sources: L07 p.25-27 -->

### 例子：垃圾邮件比例的最大似然估计

#### 问题设定

![L07 slide 29 - Binomial spam model setup](assets/07-optimisation/slide-l07-29.png)

课件回到 Week 2 的垃圾邮件模型：一共 $N$ 封邮件，每封要么是垃圾邮件、要么不是，其中 $x$ 封是垃圾邮件。参数 $\theta=P(\text{spam})$ 是“一封邮件是垃圾邮件的概率”。在这个设定下，数据服从 **二项分布（binomial distribution）**，于是数据的 **似然（likelihood）** ——把它看成 $\theta$ 的函数——是

$$
\mathcal{L}(\theta)=p(x;N,\theta)=\frac{N!}{x!\,(N-x)!}\,\theta^{x}(1-\theta)^{N-x}=C\,\theta^{x}(1-\theta)^{N-x}.
$$

阶乘那一项只依赖 $N$ 和 $x$ ，对 $\theta$ 来说是常数，记作 $C$ 。 **最大似然估计（maximum likelihood estimation, MLE）** 就是找让 $\mathcal{L}(\theta)$ 最大的 $\theta$ 。
<!-- Sources: L07 p.29-31 -->

#### 先取对数

![L07 slide 30 - Log transformation aside](assets/07-optimisation/slide-l07-30.png)

图中横轴是 $z$ ，纵轴是 $\log z$ ：曲线一直往上走，从不回头，这就是 **单调（monotonic）**。所以：

- 让 $f(\theta)$ 最大的 $\theta$ ，也让 $\log f(\theta)$ 最大，最优点不会移动；
- 对比横纵轴的范围可以看到，取对数后数值变得不那么极端；
- 乘积变成和：避免很多小概率相乘造成的数值下溢，求导也更容易。
<!-- Sources: L07 p.30 -->

#### 求导并令其为零

![L07 slide 32 - Log likelihood and its derivative](assets/07-optimisation/slide-l07-32.png)

取对数后，乘积和幂都变成了加法和系数：

$$
\log\mathcal{L}(\theta)=\log C+x\log\theta+(N-x)\log(1-\theta),
\qquad
\frac{\partial\log\mathcal{L}}{\partial\theta}=\frac{x}{\theta}-\frac{N-x}{1-\theta}.
$$

$\log C$ 不含 $\theta$ ，求导后消失；这就是课件把阶乘项框起来、标为常数的原因。第二项前面的减号来自 $\log(1-\theta)$ 对 $\theta$ 求导时内层的 $-1$ 。

![L07 slide 33 - Solving the derivative for theta](assets/07-optimisation/slide-l07-33.png)

这一页按箭头“右 → 左下 → 右”之字形读，是令导数为 0 之后的代数整理：先把减号移到等号另一边，得 $\frac{x}{\theta}=\frac{N-x}{1-\theta}$ ；再整理成 $\frac{1-\theta}{\theta}=\frac{N-x}{x}$ ；把两边拆开就是 $\frac{1}{\theta}-1=\frac{N}{x}-1$ （紫色的 $-1$ 两边相同，可以消掉）；于是 $\frac{1}{\theta}=\frac{N}{x}$ 。也可以直接交叉相乘： $x(1-\theta)=(N-x)\theta$ ，两边的 $x\theta$ 抵消，剩下 $x=N\theta$ 。两条路都得到

$$
\hat{\theta}=\frac{x}{N}.
$$
<!-- Sources: L07 p.32-33; Apple Notes W4P2 Optimisation -->

#### 代入数据

![L07 slide 34 - MLE with 100 emails, 20 spam](assets/07-optimisation/slide-l07-34.png)

100 封邮件中 20 封是垃圾邮件时， $\hat{\theta}=20/100=0.2$ 。课件这里用 $\approx$ 是因为省略了常数 $C$ ，它不影响最优点。最大似然估计就是我们直觉上的“出现频率”， [朴素贝叶斯](04-NB.zh.md) 里用计数估计概率，正是这个结果。
<!-- Sources: L07 p.34 -->

### 线性回归的 MSE

![L07 slide 35 - MSE for the income data](assets/07-optimisation/slide-l07-35.png)

右边的表是 10 个人的每周工作小时数与收入（单位千元），也就是 L07 p.12 散点图的数据。上方的公式把 MSE 写成参数的函数：

$$
\mathrm{MSE}(\boldsymbol\beta)=\frac{1}{N}\sum_{i=1}^{N}(y_i-\hat{y}_i)^2=\frac{1}{N}\sum_{i=1}^{N}(y_i-\boldsymbol\beta\cdot\mathbf{x}_i)^2,
\qquad
\hat{y}_i=\beta_0+\beta_1x_i .
$$

左下的代码没有求导，而是在 $w_0\in[-20,20]$ 、 $w_1\in[-1,2]$ 上各取 100 个值，组成网格，逐点算出 MSE；这里的 $w_0,w_1$ 就是 $\beta_0,\beta_1$ 。课件的公式里 $\frac{1}{n}$ 与上限 $N$ 混用，指的都是样本数。
<!-- Sources: L07 p.35 -->

![L07 slide 37 - MSE surface with the minimum highlighted](assets/07-optimisation/slide-l07-37.png)

这是上面网格画出的曲面：两条水平轴是 $w_0$ 和 $w_1$ ，高度是 MSE。曲面像一个拉长的碗，红箭头指向碗底，图例给出网格上的最小点 $(w_0,w_1)=(-13.13,\,1.48)$ ，也就是预测式约为“收入 ≈ −13.13 + 1.48 × 小时数”。

**理解用例（自拟）：** 用同一份数据算闭式解，得到 $\beta_0\approx-12.79$ 、 $\beta_1\approx1.477$ ，MSE 约 119.8。网格最小点与它非常接近但不完全相同，因为网格只能落在离散的格点上。这说明逐点搜索只能近似，而令导数为零能直接得到精确的碗底。
<!-- Sources: L07 p.36-37 -->

<details markdown="1">
<summary>延伸内容（可选）：矩阵形式的推导（课件注明具体公式不考）</summary>

![L07 slide 39 - Matrix derivation of the normal equation](assets/07-optimisation/slide-l07-39.png)

把所有样本叠成矩阵 $X$ （含一列全 1 作截距），MSE 可以写成

$$
\mathrm{MSE}(\boldsymbol\beta)=\frac{1}{n}(\mathbf{y}-X\boldsymbol\beta)^\top(\mathbf{y}-X\boldsymbol\beta),
\qquad
\frac{\partial\,\mathrm{MSE}}{\partial\boldsymbol\beta}=-\frac{2}{n}X^\top\mathbf{y}+\frac{2}{n}X^\top X\boldsymbol\beta=0
\;\Rightarrow\;
\boldsymbol\beta=(X^\top X)^{-1}X^\top\mathbf{y}.
$$

这一页按“求导 → 令其为零 → 解出 $\boldsymbol\beta$ ”三步排列，正是四步法的矩阵版。右下黄框提醒：特征之间高度相关时， $X^\top X$ 接近不可逆，求逆不稳定，这就是 [05](05-LR.zh.md) 所说的多重共线性问题。

</details>
<!-- Sources: L07 p.38-39; Apple Notes W4P2 Optimisation -->

<a id="topic-3"></a>
## 3. 迭代优化：梯度下降

### 为什么需要迭代

![L08 slide 5 - Closed-form vs iterative optimisation](assets/07-optimisation/slide-l08-05.png)

上半页回顾：二项分布按四步法能得到唯一的闭式解。下半页说明现实没那么简单：

- 很多问题 **没有闭式解**：“导数 = 0”这个方程解不出来；
- 参数有成千上万甚至上百万个时（例如自然语言处理），一次性处理整个函数也非常困难；
- 这时只能从一个猜测出发， **一步步改进** 估计值 $\hat{\theta}$ ，直到足够好。 **梯度下降（gradient descent）** 是最常用的迭代方法。
<!-- Sources: L08 p.5; Apple Notes W4P2 Optimisation -->

### 沿最陡的方向下山

![L08 slide 7 - Descending a 2-D loss surface](assets/07-optimisation/slide-l08-07.png)

图中的彩色曲面是一个有两个参数 $\theta_0,\theta_1$ 的损失函数 $J(\theta_0,\theta_1)$ ：红色是高处，蓝色是低处。想象自己站在山上蒙着眼，只能感觉脚下哪边最陡，于是每一步都往最陡的下坡方向走一小步。走出来的一串位置 $\theta^{(0)},\theta^{(1)},\theta^{(2)},\dots$ 就是梯度下降的迭代结果；每一步只依赖当前位置。
<!-- Sources: L08 p.6-8 -->

### 更新规则从哪里来

![L08 slide 11 - Gradient descent details](assets/07-optimisation/slide-l08-11.png)

我们想要一个“告诉参数怎么动”的规则 $\theta\leftarrow\theta+\Delta\theta$ 。看右边 $f(\theta)=\theta^2$ 的小图和左边三条规则：

- 在最低点左边，导数 $<0$ ：增大 $\theta$ （往右）会让 $f$ 下降；
- 在最低点右边，导数 $>0$ ：减小 $\theta$ （往左）会让 $f$ 下降；
- 导数 $=0$ ：已经在最小值，不再移动。

两种情况都是 **朝导数的反方向** 走，于是

$$
\theta^{(t+1)}=\theta^{(t)}-\eta\,\frac{\partial f}{\partial\theta^{(t)}} .
$$

- $\theta^{(t)}$ ：第 $t$ 步的参数；
- $\partial f/\partial\theta^{(t)}$ ：在当前位置的导数（梯度），它指向函数 **增长最快** 的方向，所以要减去它；
- $\eta$ ： **学习率（learning rate）**，决定每一步走多远。

**易错：** 求最小值用减号（梯度下降）；如果把减号写成加号，就变成往上爬，求的是最大值（梯度上升）。
<!-- Sources: L08 p.6-11 -->
<!-- Sources: L08 p.10-11 -->

### 单参数的算法

![L08 slide 13 - Gradient descent algorithm for a single parameter](assets/07-optimisation/slide-l08-13.png)

框里的五行把上面的规则写成算法：定义目标函数 → 给参数一个初始值 $\theta^{(0)}$ → 循环 $T$ 次，每次先算当前位置的导数，再减去“学习率 × 导数”。框下说明两件事： $\eta$ 也叫步长（step size），是需要人为设定的值；什么时候停，可以固定迭代次数，也可以自定其他标准（例如参数几乎不再变化）。
<!-- Sources: L08 p.13 -->

<a id="topic-4"></a>
## 4. 学习率、多参数与局部最优

### 学习率太小或太大

![L08 slide 15 - Four learning rates on the same function](assets/07-optimisation/slide-l08-15.png)

四个小图是同一个碗形函数，标题里分别是学习率 0.01、0.1、0.95、1.01；红点都是同一个起点 $(-6.63,\,43.953)$ 。课堂上这是一段动画，PDF 只留下第 0 步，所以四张图看起来一样，区别要靠计算看出来。L08 p.14 的结论是： $\eta$ 太小，算法很慢； $\eta$ 太大，可能越过最小值。

**理解用例（自拟）：** 起点满足 $6.63^2\approx43.95$ ，所以函数是 $f(\theta)=\theta^2$ ，导数为 $2\theta$ 。代入更新式：

$$
\theta^{(t+1)}=\theta^{(t)}-\eta\cdot2\theta^{(t)}=(1-2\eta)\,\theta^{(t)} .
$$

每一步都把 $\theta$ 乘以同一个因子 $1-2\eta$ ：

| $\eta$ | 因子 $1-2\eta$ | 第 1 步 | 第 10 步 | 表现 |
| --- | --- | --- | --- | --- |
| 0.01 | 0.98 | −6.50 | −5.42 | 每步只挪一点，很慢 |
| 0.1 | 0.8 | −5.30 | −0.71 | 稳定地快速接近 0 |
| 0.95 | −0.9 | 5.97 | −2.31 | 每步跳到另一侧，但越跳越近，仍收敛 |
| 1.01 | −1.02 | 6.76 | −8.08 | 每步跳到另一侧且越跳越远，发散 |

所以对这个函数，只有 $|1-2\eta|<1$ 时才会收敛。学习率不是越大越快：过了某个界限，损失反而会越来越大。
<!-- Sources: L08 p.14-15; Apple Notes W4P2 Optimisation -->

### 多个参数：分别求偏导、一起更新

![L08 slide 16 - Gradient descent algorithm for multiple parameters](assets/07-optimisation/slide-l08-16.png)

模型通常有多个参数。对每个参数求 **偏导数（partial derivative）**：只让这个参数变、其他参数固定，看 $f$ 怎么变（L08 p.12）。所有偏导排成一个向量，就是梯度 $\nabla f$ 。这一页的算法比单参数版多了第 4–7 行：先建一个空的 `gradients` 列表，对每个参数算偏导并放进去；第 8 行才 **一次性更新所有参数**。

```text
define objective f(θ)
initialise θ(0)
for t = 0, 1, ..., T:
    gradients = [∂f/∂θ_j at θ(t) for every parameter j]
    θ(t+1) = θ(t) − η · gradients        # update all parameters at once
stop after a fixed number of iterations, or when another criterion is met
```

**易错：** 要先在同一个位置 $\theta^{(t)}$ 算出所有偏导，再一起更新；不要用已经更新过的 $\theta_1$ 去算 $\theta_2$ 的偏导。另外，这一页的字母 $f$ 身兼两职：既是目标函数 $f(\theta)$ ，又是第 5 行的参数编号 $f\in\{1,\dots,F\}$ ，这里的 $F$ 是参数（特征）的个数。读的时候要分开。
<!-- Sources: L08 p.12 -->
<!-- Sources: L08 p.13, p.16 -->

### 凸性与局部最优

![L08 slide 17 - Global and local minima and maxima](assets/07-optimisation/slide-l08-17.png)

红色曲线有好几个“山峰”和“谷底”。左下标出的是 **全局最小值（global minimum）**：整条曲线上最低的那一点；右下那个谷底只是 **局部最小值（local minimum）**：只比它附近的点低。最大值同理。课件同时给出凸函数的定义：函数图像上任意两点之间连一条线段，线段都在图像上方。这条曲线显然不是凸的（例如连接两个谷底的线段会穿过中间的山峰）。
<!-- Sources: L08 p.17 -->

### 梯度下降能保证什么

![L08 slide 18 - Gradient descent guarantees](assets/07-optimisation/slide-l08-18.png)

学习率合适时：

1. 对可微的凸函数，梯度下降会找到 **全局最小值**；
2. 对可微的非凸函数，只保证找到 **某个局部最小值**。

看下面的黄色曲线：最深的谷底在右边，但蓝点所在处的切线（绿色）向右上倾斜，导数为正，所以梯度下降会往左走，落进中间较浅的谷底，再也出不来，因为那里导数已经是 0。
<!-- Sources: L08 p.18 -->

**补充：** 可以从多个起点分别运行，取最好的结果；或者先分析数据，再在合理的范围里选起点，以降低困在差的局部最小值里的风险。
<!-- Sources: Apple Notes W4P2 Optimisation; Apple Notes ★4 Optimisation -->

<a id="topic-5"></a>
## 5. 用在逻辑回归上

### 目标：最小化负对数似然

![L08 slide 39 - Minimising the negative likelihood](assets/07-optimisation/slide-l08-39.png)

逻辑回归用 sigmoid 函数 $\sigma(\theta\cdot\mathbf{x})$ 表示 $P(y=1\mid\mathbf{x})$ （模型与概率解释见 [05](05-LR.zh.md)）。给定 $N$ 个独立的训练样本，每个样本的似然是 $\sigma^{y_i}(1-\sigma)^{1-y_i}$ ：当 $y_i=1$ 时取 $\sigma$ ，当 $y_i=0$ 时取 $1-\sigma$ 。所有样本相乘就是整份数据的似然。

课件这一页的写法有些混乱：左边写 $\mathcal{L}(\beta)$ 而参数其实叫 $\theta$ ；先在乘积前加了负号，最后“Take a log”给出的却是不带负号的对数似然。把它统一读成一句话即可：训练要 **最小化负对数似然（negative log likelihood）**，

$$
-\log\mathcal{L}(\theta)=-\sum_{i=1}^{N}\Big[y_i\log\sigma(\theta\cdot\mathbf{x}_i)+(1-y_i)\log\big(1-\sigma(\theta\cdot\mathbf{x}_i)\big)\Big].
$$

先取对数的理由和二项分布例子一样：乘积变成求和，最优点不变。
<!-- Sources: L08 p.38-39 -->

### 求导与梯度下降更新

![L08 slide 40 - Derivative of the loss and the gradient descent update](assets/07-optimisation/slide-l08-40.png)

第一行是损失对第 $j$ 个参数的偏导：

$$
\frac{\partial\,(-\log\mathcal{L})}{\partial\theta_j}=\sum_{i=1}^{N}\big(\sigma(\theta\cdot\mathbf{x}_i)-y_i\big)\,x_{ij}.
$$

中间三条说明接下来的困难：令它等于 0，得到 $\sum_i(\sigma(\theta\cdot\mathbf{x}_i)-y_i)x_{ij}=0$ ，而 $\theta$ 藏在每个样本的 sigmoid 里面，还要对所有样本求和，无法像 $\hat{\theta}=x/N$ 那样把 $\theta$ 单独移到一边。所以没有闭式解，只能用梯度下降：

$$
\theta_j^{(t+1)}=\theta_j^{(t)}-\eta\sum_{i=1}^{N}(\hat{y}_i-y_i)\,x_{ij},
\qquad \hat{y}_i=\sigma(\theta^{(t)}\cdot\mathbf{x}_i).
$$
<!-- Sources: L08 p.40 -->

**延伸内容（课件更正）：** 这一页最后一行把求和上限写成了 $F$ （特征数），但这里的下标 $i$ 是样本编号，求和是对 $N$ 个训练样本进行的，应为 $\sum_{i=1}^{N}$ ，与同页第一行的偏导一致；特征编号是 $j$ ，每个 $\theta_j$ 各更新一次。这个 $F$ 很可能沿用了 L08 p.16 里参数编号的写法。另外，第一行左边标的是 $\partial\log\mathcal{L}/\partial\theta_j$ ，但右边的 $\sigma-y_i$ 符号对应的是 **负** 对数似然（损失）的导数；对数似然本身的导数是 $\sum_i(y_i-\sigma)x_{ij}$ 。只有用损失的导数，配合更新式里的减号，才是在往下走。
<!-- Sources: L08 p.40 -->

直觉上，每个样本按“预测概率 − 真实标签”这个误差，沿自己的特征方向推一下参数：预测偏高（ $\hat{y}_i>y_i$ ）时，把 $\theta_j$ 往减小 $\theta\cdot\mathbf{x}_i$ 的方向推；预测完全正确时，这个样本不产生推力。

梯度下降也是后面感知机的比较对象和神经网络反向传播的基础，见 [10 神经网络](10-neural-networks.md)。

## 本讲自测

1. 用四步法求 $f(\theta)=\theta^2-6\theta+5$ 的最小值点，并说明为什么它是全局最小值点，而不只是导数为零的点。
2. 一枚硬币抛 50 次出现 35 次正面，正面概率的最大似然估计是多少？推导中取对数这一步改变了什么、没有改变什么？
3. 对 $f(\theta)=\theta^2$ 做梯度下降，学习率取 0.6 时，从 $\theta^{(0)}=5$ 出发前两步的位置是多少？它会收敛吗？
4. 二项分布的参数可以直接解出，为什么逻辑回归的参数却要用梯度下降？
5. 逻辑回归有 $N$ 个训练样本和 $F$ 个特征时，一次梯度下降更新要算几个偏导？每个偏导要对什么求和？
