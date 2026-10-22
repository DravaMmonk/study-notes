# COMP90049 Lectures 14–16 - Perceptron, Neural Networks and Backpropagation

来源：`lecture/14-perceptron.pdf`、`lecture/15_Neural_Networks.pdf`（封面标为 Lecture 16）、`lecture/16-backprop.pdf`；Apple Notes：CS/25S2/IML — "W7L14 Perception - Neural Network I"、"W8L15-16 Neural Network"、"★3.2 Multi-layer Perceptron"、"★3.1 Classic Supervised Learning"（感知机部分）。

这篇讲的是：**一个模仿神经元的简单单元怎样学习？把许多单元连成多层，为什么能学到线性模型学不到的东西，又怎样训练？**

学习路线：[一个神经元：感知机](#topic-1) → [感知机怎样学习](#topic-2) → [多层感知机与 XOR](#topic-3) → [特征学习与网络设计](#topic-4) → [反向传播](#topic-5)。

重点：感知机更新规则、前向传播公式、广义 delta 规则。难点：隐藏层的误差项从哪里来。易错：阶跃函数不能用于梯度训练；更新式里 $\delta$ 的正负号约定；偏置的输入恒为 1。

<a id="topic-1"></a>
## 1. 一个神经元：感知机

### 动机：直接最小化分类错误

[朴素贝叶斯](04-NB.zh.md) 是生成式模型，最大化数据似然；[逻辑回归](05-LR.zh.md) 是判别式模型，最大化条件似然。**感知机（perceptron）** 受大脑神经元启发，不再谈概率，而是 **直接最小化分类错误**。
<!-- Sources: L14 p.4-5 -->

**人工神经网络（artificial neural network）** 由许多简单的处理单元（人工神经元）连接而成：每个单元接收一个或多个输入，对输入的加权和施加 **激活函数（activation function）** 得到输出。使用神经网络要 (a) 设计网络结构，(b) 根据数据调整权重；本课关注 (b)。所以先只看网络里的一个单元。
<!-- Sources: L14 p.6-7 -->

### 一个人工神经元

![L14 slide 09 - An artificial neuron](assets/10-neural-networks/slide-l14-09.png)

从左往右读：左列圆圈是输入，最上面的 “1” 是一个恒为 1 的假输入；每条连线上标着权重 $\theta_0,\dots,\theta_d$ （蓝字）；中间的大圆把加权和送进激活函数 $f$ （绿字）；右边箭头给出输出 $y$ （粉字）。右侧两行公式说的是同一件事：

$$
y=f(\theta_0+\theta_1x_1+\cdots+\theta_dx_d)=f(\theta\cdot\mathbf{x}),\qquad \mathbf{x}=(1,x_1,\dots,x_d).
$$

- $\mathbf{x}$ ：数值输入向量，开头补的 1 让 $\theta_0$ 成为 **偏置（bias）**；
- $\theta=(\theta_0,\dots,\theta_d)$ ：要学习的参数；
- $f$ ：激活函数，是事先选定的超参数。
<!-- Sources: L14 p.9-11 -->

### 感知机：用阶跃函数做二分类

![L14 slide 13 - Perceptron decision boundary](assets/10-neural-networks/slide-l14-13.png)

感知机做二分类（类别 $1$ 与 $-1$ ），激活函数是 **阶跃函数（step function）**：

$$
f(\theta\cdot\mathbf{x})=\begin{cases}1 & \text{if } \theta\cdot\mathbf{x}>0\\ -1 & \text{otherwise}\end{cases}
$$
<!-- Sources: L14 p.12 -->

看下方的二维例子：绿线是 $\theta\cdot\mathbf{x}=0$ ，即 **决策边界（decision boundary）**；红色箭头 $\theta$ 与绿线成直角，指向 $\theta\cdot\mathbf{x}>0$ 、预测为 $1$ 的一侧（蓝色方块）；另一侧是预测为 $-1$ 的红色圆点。边界是一条直线（高维时是超平面），所以感知机是 **线性分类器**。
<!-- Sources: L14 p.13 -->

<a id="topic-2"></a>
## 2. 感知机怎样学习

### 直觉：分错了就往反方向推

![L14 slide 18 - Perceptron update intuition](assets/10-neural-networks/slide-l14-18.png)

学习就是调整参数，让表现变好。最直接的办法是数分错的个数，但这在数学上不方便（不连续、不可导）。这一页逐行列出四种情况：预测对了（前两行）什么也不做；真实为 $1$ 却预测成 $-1$ ，就增大权重，让 $\theta\cdot\mathbf{x}$ 变大；粉色那一行是真实为 $-1$ 却预测成 $1$ ，红色箭头指出此时 $\theta\cdot\mathbf{x}>0$ ，要把它推小到 0 或以下。

最右一列把四行改写成 $y(\theta\cdot\mathbf{x})$ 的符号：对的两行大于 0，错的两行小于等于 0。于是两种错误可以统一判断为

$$
y_i(\theta\cdot\mathbf{x}_i)\le0,
$$

与 [SVM](06-SVM.zh.md) 的间隔条件同形（课件提到 Lecture 9）。
<!-- Sources: L14 p.15-18 -->

### 训练算法

![L14 slide 20 - Perceptron training algorithm](assets/10-neural-networks/slide-l14-20.png)

框里是核心：外层循环跑 $T$ 个 **轮次（epoch）**，内层逐个看 $N$ 个训练样本；样本 $i$ 分错时，

$$
\theta^{(k+1)}=\theta^{(k)}+\eta\,y_i\,\mathbf{x}_i ,
$$

其中 $\eta>0$ 是 **学习率（learning rate）**， $k$ 记录已经更新了几次。两个气泡各解释一个细节：

- 左边：严格说判错条件应是 $<0$ ，写成 $\le0$ 是为了处理起点 $\theta^{(0)}=\mathbf{0}$ （此时所有 $\theta\cdot\mathbf{x}=0$ ，必须先更新一次）；
- 右边：上标 $(k)$ 只是理论推导时方便；实现时直接写 $\theta\leftarrow\theta+\eta y_i\mathbf{x}_i$ 。
<!-- Sources: L14 p.19-20 -->

### 例 1：在图上看一次更新

![L14 slide 27 - Example 1 update for sample 2](assets/10-neural-networks/slide-l14-27.png)

例 1 没有偏置， $\eta=1$ 。从 $\theta=\mathbf{0}$ 出发，样本 1（蓝色方块，类别 1）触发第一次更新，得到 $\theta=\mathbf{x}_1$ ，即图中红色实线箭头；绿线是与它垂直的边界。现在看样本 2（红色圆点，类别 $-1$ ）：它与 $\theta$ 在边界同侧，被判成 1，分错了。

更新是 $\theta\leftarrow\theta+y\mathbf{x}=\theta-\mathbf{x}_2$ ：黑色虚线箭头 $-\mathbf{x}$ 接在 $\theta$ 的末端，得到红色虚线箭头，即新的 $\theta=\mathbf{x}_1-\mathbf{x}_2$ 。新 $\theta$ 转离了样本 2，边界跟着旋转。之后课件按样本 3、1、2 的顺序继续，样本 2 再次被分错时再减一次，直到所有点被分开。
<!-- Sources: L14 p.22-32 -->

### 为什么更新有效

![L14 slide 35 - Why the update rule works](assets/10-neural-networks/slide-l14-35.png)

蓝色的 $\theta^{(k+1)}$ 是更新后的参数，红色的 $\theta^{(k)}$ 是更新前的。把更新式代进判错量 $y_i(\theta\cdot\mathbf{x}_i)$ ：

$$
y_i(\theta^{(k+1)}\cdot\mathbf{x}_i)=y_i(\theta^{(k)}\cdot\mathbf{x}_i)+\eta\,y_i^2\,\lVert\mathbf{x}_i\rVert^2>y_i(\theta^{(k)}\cdot\mathbf{x}_i),
$$

因为 $y_i^2=1$ 、 $\eta>0$ 且 $\lVert\mathbf{x}_i\rVert^2>0$ 。也就是说，每次更新都让刚分错的样本的判错量严格变大，朝“分对”的方向移动（但一次不一定就够）。
<!-- Sources: L14 p.35; Apple Notes W7L14 Perception - Neural Network I -->

延伸内容（课件笔误）：右下气泡写的是 $\lVert\mathbf{x}_i\rVert=\mathbf{x}_i\cdot\mathbf{x}_i$ ，应为 $\lVert\mathbf{x}_i\rVert^2=\mathbf{x}_i\cdot\mathbf{x}_i$ ：欧几里得范数是点积的平方根。推导本身用的是平方，没有受影响。

### 例 2：带偏置的手算

![L14 slide 39 - Example 2 first update](assets/10-neural-networks/slide-l14-39.png)

例 2： $\eta=0.1$ ，初始 $\theta=(\theta_0,\theta_1,\theta_2)=(-0.1,0.2,0)$ ，所以边界 $-0.1+0.2x_1=0$ 是右图中 $x_1=0.5$ 的竖直绿线，红色箭头指向预测为 1 的右侧。第一个训练样本 $(1,1)$ 是红点（类别 $-1$ ），落在右侧，被分错：左下三行就是逐个分量的更新，注意 $\theta_0$ 只减 $\eta$ 。

![L14 slide 41 - Example 2 second update](assets/10-neural-networks/slide-l14-41.png)

更新后边界变成右图中穿过 $x_1=2$ 的斜线，红色箭头指向右下。第二个样本 $(2,1)$ 是蓝色方块（类别 1），却落在 $\theta\cdot\mathbf{x}<0$ 的一侧，又被分错；这次 $y=+1$ ，所以三个分量都是加。

![L14 slide 43 - Example 2 further points](assets/10-neural-networks/slide-l14-43.png)

两次更新后 $\theta=(-0.1,0.3,0)$ ，边界回到竖线 $x_1=1/3$ 。第三个点 $(1.5,0.5)$ 是蓝色方块，算得 $0.35>0$ ，分对，不更新；右上角的第四个点是红点，却在右侧，分错，要继续更新。

| 步骤 | 样本 $(x_1,x_2)$ ，标签 | $\theta\cdot\mathbf{x}$ | 是否分错 | 更新后的 $\theta$ |
| --- | --- | --- | --- | --- |
| 1 | $(1,1)$ ， $-1$ | $-0.1+0.2+0=0.1$ | 是（ $y\cdot0.1<0$ ） | $(-0.1,0.2,0)-0.1\cdot(1,1,1)=(-0.2,0.1,-0.1)$ |
| 2 | $(2,1)$ ， $+1$ | $-0.2+0.2-0.1=-0.1$ | 是 | $(-0.2,0.1,-0.1)+0.1\cdot(1,2,1)=(-0.1,0.3,0)$ |
| 3 | $(1.5,0.5)$ ， $+1$ | $-0.1+0.45+0=0.35$ | 否 | 不变，边界仍为 $x_1=1/3$ |
| 4 | 右上角的点， $-1$ | $>0$ | 是 | 继续更新 |
<!-- Sources: L14 p.37-43 -->

**易错：** 偏置 $\theta_0$ 对应的输入恒为 1，所以它的更新是 $\theta_0\leftarrow\theta_0+\eta y$ ，不乘任何特征值。
<!-- Sources: L14 p.39-41; Apple Notes W7L14 Perception - Neural Network I -->

### 收敛性与在线学习

- 数据 **线性可分** 时，感知机保证收敛；最终参数取决于初始化和学习率；不像 SVM 那样保证间隔最大。
- 数据线性不可分时，不保证收敛。
<!-- Sources: L14 p.46 -->

![L14 slide 47 - Perceptron rule vs gradient descent](assets/10-neural-networks/slide-l14-47.png)

左右对比两条更新式和对应的激活函数。左边的阶跃函数在 0 处跳变，导数在 0 处没有定义，所以感知机规则不是从导数推出来的；右边的 sigmoid 平滑上升，处处可导，可以用 [梯度下降](07-optimisation.md#topic-3)。一个用 sigmoid 激活、最小化交叉熵（负对数似然）的单个神经元，就等价于逻辑回归。
<!-- Sources: L14 p.47-48 -->

**易错：** 右边公式写的是 $+\eta\,\partial f/\partial\theta$ ，这是对要 **最大化** 的目标（如对数似然）往上走；如果 $f$ 是要最小化的误差，就要用 $-\eta\,\partial E/\partial\theta$ ，第 5 节的反向传播正是这种写法。

| | 感知机 | 朴素贝叶斯 / 逻辑回归（梯度下降） |
| --- | --- | --- |
| 更新方式 | **在线（online）**：每看一个样本就更新 | **批量（batch）**：先统计整个训练集，再一次更新所有参数 |
| 适用 | 大数据集上更高效 | 梯度下降可改成在线版本：随机梯度下降（stochastic gradient descent） |
<!-- Sources: L14 p.49 -->

<a id="topic-3"></a>
## 3. 多层感知机与 XOR

### 三种层与术语

神经网络是许多感知机式单元的组合；单元必须用 **连续** 的激活函数，连成很多层就是深度学习。
<!-- Sources: L15 p.9-12 -->

![L15 slide 16 - MLP terminology](assets/10-neural-networks/slide-l15-16.png)

图中从左到右四个色块：红色是输入层（每个特征一个单元，加上偏置 1），两块蓝色是隐藏层，绿色是输出层（二分类只需 1 个单元）。相邻两层之间每对单元都有连线，即 **全连接（fully connected）**。上方的术语：

- 层数 $L$ 叫 **深度（depth）**；第 $l$ 层的单元数 $K_l$ 叫 **宽度（width）**，各层宽度可以不同（图中隐藏层 1 有 4 个、隐藏层 2 有 2 个单元）；
- 每条连接 $ij$ 有一个权重 $\theta^{(l)}_{ij}$ （包括偏置 $\theta_0$ ）；
- 第 $l$ 层的非线性激活函数记作 $\phi^{(l)}$ 。

**多层感知机（multilayer perceptron, MLP）** 是前馈（feed-forward）、全连接的监督学习器；卷积网络、循环网络、自编码器（无监督）是其他类型的神经网络。
<!-- Sources: L15 p.13, p.16 -->

### 前向传播

把输入一层层往右推，每层先做加权和、再过激活函数。两层隐藏层的网络：

$$
h^{(1)}_i=\phi^{(1)}\Big(\sum_j\theta^{(1)}_{ij}x_j\Big),\quad
h^{(2)}_i=\phi^{(2)}\Big(\sum_j\theta^{(2)}_{ij}h^{(1)}_j\Big),\quad
y_i=\phi^{(3)}\Big(\sum_j\theta^{(3)}_{ij}h^{(2)}_j\Big).
$$

向量形式： $\mathbf{h}^{(1)}=\phi^{(1)}(\theta^{(1)\top}\mathbf{x})$ ， $\mathbf{h}^{(2)}=\phi^{(2)}(\theta^{(2)\top}\mathbf{h}^{(1)})$ ， $\mathbf{y}=\phi^{(3)}(\theta^{(3)\top}\mathbf{h}^{(2)})$ ，激活函数逐元素作用。
<!-- Sources: L15 p.17-18 -->

### 线性与非线性分类

| | 线性分类 | 非线性分类 |
| --- | --- | --- |
| 模型 | 感知机、朴素贝叶斯、逻辑回归 | 至少一个隐藏层、使用非线性激活的神经网络 |
| 决策边界 | 特征的线性组合 $\sum_i\theta_ix_i$ | 输入的非线性函数 |
| 特征交互 | 学不到，必须人工构造 | 由网络学出 |
<!-- Sources: L15 p.14 -->

### 例子：XOR

![L15 slide 21 - XOR is not linearly separable](assets/10-neural-networks/slide-l15-21.png)

课件依次画了 AND、OR、XOR 三个布尔函数。这一页是 XOR：左边真值表，右图中蓝色加号是 $y=1$ （ $(0,1)$ 和 $(1,0)$ ），红点是 $y=0$ （ $(0,0)$ 和 $(1,1)$ ）。两个蓝点在对角线上、两个红点在另一条对角线上，任何一条直线都没法把它们分到两边。AND 和 OR 都能被一条直线分开，单个感知机能学会；XOR 不能，单个感知机学不会。
<!-- Sources: L15 p.19-21 -->

![L15 slide 22 - An MLP for XOR](assets/10-neural-networks/slide-l15-22.png)

图中蓝色数字是权重，从“1”伸出的箭头是偏置；底部的激活是“ $\ge0$ 输出 1，否则 0”。读法：

- $h_1=\phi(x_1+x_2-0.5)$ ：至少一个输入为 1 就输出 1，即 OR；
- $h_2=\phi(x_1+x_2-1.5)$ ：两个都为 1 才输出 1，即 AND；
- $y=\phi(h_1-h_2-0.5)$ ：OR 为真且 AND 为假，即 XOR。

逐行验证（笔记自算）：
<!-- Sources: L15 p.22 -->

| $x_1$ | $x_2$ | $h_1$ （OR） | $h_2$ （AND） | $h_1-h_2-0.5$ | $y$ |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | 1 | 1 | $-0.5$ | 0 |
| 1 | 0 | 1 | 0 | $0.5$ | 1 |
| 0 | 1 | 1 | 0 | $0.5$ | 1 |
| 0 | 0 | 0 | 0 | $-0.5$ | 0 |

**重点：** 隐藏层先把输入变成新的表示 $(h_1,h_2)$ ，在这个新空间里只有三个点 $(0,0)$ 、 $(1,0)$ 、 $(1,1)$ ，XOR 变得线性可分，输出单元只需再画一条直线。

### 表达能力与何时用线性模型

**万能逼近定理（universal approximation theorem）**：只有一个隐藏层（有限个神经元）的前馈网络，就能逼近 $\mathbb{R}^n$ 上任意连续函数。前提是激活函数必须非线性，否则整个网络仍只是一个（复杂的）线性模型。
<!-- Sources: L15 p.42 -->

线性分类仍然够用的情形：已知类别（近似）线性可分；特征空间维度很高（特征数超过训练实例数，见核技巧）；训练集很小；可解释性很重要。
<!-- Sources: L15 p.43 -->

<a id="topic-4"></a>
## 4. 特征学习与网络设计

### 特征工程与特征学习

感知机、朴素贝叶斯、逻辑回归需要一组固定的、有信息量的特征（例如 outlook、wind），这需要领域知识，即 **特征工程（feature engineering）**。神经网络直接吃“原始”数值数据，在完成目标任务的同时把特征作为中间表示学出来：**表示学习（representation learning）**。代价是要调更多东西：层数、激活函数、学习率等。
<!-- Sources: L15 p.24-31 -->

![L15 slide 29 - Learned intermediate features](assets/10-neural-networks/slide-l15-29.png)

天气例子：真实观测到的是原始测量值 m1…mF（左列）。前一页的做法是人工把它们汇总成 Outlook、Temperature、Humidity、Windy 四个特征再预测 Play?；这一页把中间四个框换成 “???”：网络自己决定从哪些测量值组合出什么中间特征。这些 “???” 框就是隐藏单元；后面两页再把它们画成 1 个和 2 个隐藏层的 MLP。

![L15 slide 32 - Feature learning in face recognition](assets/10-neural-networks/slide-l15-32.png)

从左到右，上方小图是各层隐藏单元学到的特征：先是不同方向的边缘，然后是眼睛、鼻子一类局部部件，最后是整张脸的模式，输出层据此判断这个人是 “Sara”。隐藏层越深，学到的表示越抽象。
<!-- Sources: L15 p.32 -->

### 设计一个网络：输入表示

![L15 slide 34 - Input representations](assets/10-neural-networks/slide-l15-34.png)

输入 $\mathbf{x}$ 可以是病人的体征、一段文字或一张图像，但网络只能吃数值。橙色表格是 **独热编码（one-hot encoding）**：词表有 cat、mat、on、sat、the 五个词，每个词变成长度 5 的向量，只有自己那一列是 1，所以维度 = 词表大小 $V$ 。预训练词向量的维度则是固定的 $k$ 。图像用像素的 RGB 值或其他视觉特征。

### 其余设计项

| 设计项 | 选择 |
| --- | --- |
| 网络结构 | 深度与宽度如何取舍是经验问题，理论上了解不多；通常宽度逐层递减（经验上不超过前一层的一半）；CNN、RNN、注意力等进阶结构超出本课范围 |
| 输出函数 | 二分类：单个单元，阶跃或 sigmoid；多分类：每类一个单元，用 **softmax** 归一化成概率分布；回归：恒等函数（线性），也可用 sigmoid 或 tanh |
| 损失函数 | 分类：交叉熵（负条件对数似然）；回归：通常是 MSE |
<!-- Sources: L15 p.34-39 -->

多分类输出层的 softmax：

$$
p(y_i=j\mid\mathbf{x}_i;\theta)=\frac{\exp(z_j)}{\sum_{k=1}^{K}\exp(z_k)},
$$

$z_j$ 是倒数第二层送给第 $j$ 个输出单元的加权和， $K$ 是类别数。

![L15 slide 38 - Loss functions](assets/10-neural-networks/slide-l15-38.png)

这一页从上到下三块：分类损失的一般形式是负条件对数似然；二分类时 $\hat{y}^{(i)}_1$ 是预测为 1 的概率，得到 **二元交叉熵（binary cross-entropy）**；多分类时对每个类别 $j$ 求和，得到 **分类交叉熵（categorical cross-entropy）**：

$$
L=-\sum_i\big[y^{(i)}\log\hat{y}^{(i)}_1+(1-y^{(i)})\log(1-\hat{y}^{(i)}_1)\big],\qquad
L=-\sum_i\sum_j y^{(i)}_j\log\hat{y}^{(i)}_j ,
$$

其中真实类别 $j$ 的 $y^{(i)}_j=1$ ，其他为 0，所以内层求和只剩真实类别那一项。回归用 MSE： $L=\frac1N\sum_i(y^{(i)}-\hat{y}^{(i)})^2$ 。
<!-- Sources: L15 p.37-39 -->

### 激活函数

![L15 slide 36 - Activation functions](assets/10-neural-networks/slide-l15-36.png)

图中三条曲线：蓝色 sigmoid 把输入压到 $(0,1)$ ，橙色 tanh 压到 $(-1,1)$ 且更陡，绿色 ReLU 负半轴为 0、正半轴是直线。下一讲开头分别画出了它们的导数：

| 激活函数 | 公式 | 导数的特点 |
| --- | --- | --- |
| Sigmoid（logistic） | $f(z)=\dfrac{1}{1+e^{-z}}$ | 钟形，最大值在 0 处 |
| tanh | $f(z)=\dfrac{e^{2z}-1}{e^{2z}+1}$ | 也是钟形但更尖更高，比 sigmoid 给出更大的更新 |
| ReLU | $f(z)=\max(0,z)$ | $z>0$ 时为 1， $z<0$ 时为 0，0 处没有定义、人为设为 0；有助于“删掉”不必要的权重 |
<!-- Sources: L15 p.36; L16 p.4-6 -->

学生笔记的经验是隐藏层常用 ReLU。
<!-- Sources: L15 p.36; Apple Notes W8L15-16 Neural Network -->

![L16 slide 07 - Why not the step function](assets/10-neural-networks/slide-l16-07.png)

**易错：为什么不能用阶跃函数？** 左图是阶跃函数，右图是它的导数：0 处的空心圆表示没有定义，其他地方是一条贴着横轴的线，都是 0。梯度处处为 0 就没法更新权重，网络什么也学不到。感知机能用阶跃函数，是因为它的规则不需要导数。
<!-- Sources: L16 p.7 -->

### 深度学习为什么成功，代价是什么

![L15 slide 44 - Performance vs amount of data](assets/10-neural-networks/slide-l15-44.png)

横轴是训练数据量，纵轴是模型表现。蓝线（“经典”机器学习）很快就到顶、变平；橙线（深度学习）在数据增多时还在继续上升。数据越多，神经网络的优势越明显。

**补充：神经网络的利弊。** 优点：至少一个隐藏层就是万能逼近器；自动学习特征；在许多任务上经验表现很好。缺点：强大意味着更容易过拟合（见 [08 评估](08-evaluation.md)）；需要大量训练数据；常需要 GPU 等算力；缺乏可解释性。
<!-- Sources: L15 p.45 -->

<a id="topic-5"></a>
## 5. 反向传播

### 问题：隐藏层没有“正确答案”

训练配方：前向传播一个输入，算出输出 $\hat{y}$ ；与真实 $y$ 比较算误差；修改每个权重使误差减小，例如梯度下降

$$
\theta^{l}_{ij}\leftarrow\theta^{l}_{ij}+\Delta\theta^{l}_{ij},\qquad \Delta\theta^{l}_{ij}=-\eta\frac{\partial E}{\partial\theta^{l}_{ij}} ;
$$

然后重复。学习率怎样影响这一步见 [07 的学习率一节](07-optimisation.md#topic-4)。
<!-- Sources: L16 p.13-14 -->

![L16 slide 17 - Towards backpropagation](assets/10-neural-networks/slide-l16-17.png)

上半页回顾感知机：右图是一个单元，红字 $z=\sum_k\theta_kx_k$ 是加权和，绿字 $a=g(z)$ 是激活值。它的规则 $\theta_i\leftarrow\theta_i+\eta yx_i$ 用到了真实输出 $y$ 。下半页的 Problems 指出：我们只知道最后一层的真实输出，不知道隐藏层“应该”输出什么。**反向传播（backpropagation）** 给出了一种高效计算误差对每个权重偏导的方法：本质就是梯度下降，只是用链式法则让计算更高效。
<!-- Sources: L15 p.40; L16 p.15-17, p.25 -->

### 输出层：广义 delta 规则

设神经元 $i$ 的输入总和是 $z_i=\sum_j\theta_{ij}a_j$ ，激活为 sigmoid $a_i=g(z_i)$ ，误差用 $E=\frac12(y-a_i)^2$ 。
<!-- Sources: L16 p.27 -->

![L16 slide 30 - Error of the final layer](assets/10-neural-networks/slide-l16-30.png)

上方示意图：三个结点从左到右是 $k$ 、 $j$ 、 $i$ ，每个圆里 $\Sigma$ 表示求加权和、 $g$ 表示激活；粉色框标出要求导的权重 $\theta^{2}_{ij}$ （连接 $j$ 到输出结点 $i$ ），最右粉框 $a_i=\hat{y}_i$ 是网络输出。下方推导每一行右侧的红字说明这一步用了哪个定义，链式法则逐层剥开：

$$
\Delta\theta^{2}_{ij}=-\eta\frac{\partial E}{\partial\theta^{2}_{ij}}
=\eta(y-a_i)\frac{\partial a_i}{\partial\theta^{2}_{ij}}
=\eta(y-a_i)\,g'(z_i)\frac{\partial z_i}{\partial\theta^{2}_{ij}}
=\eta\underbrace{(y-a_i)\,g'(z_i)}_{\delta_i}\,a_j .
$$
<!-- Sources: L16 p.28-30 -->

![L16 slide 31 - The generalized delta rule](assets/10-neural-networks/slide-l16-31.png)

把下括号里的部分命名为 $\delta_i$ （图中结点 $i$ 旁的红色方块），就得到 **广义 delta 规则（generalized delta rule）**：

$$
\Delta\theta^{2}_{ij}=\eta\,\delta_i\,a_j,\qquad \delta_i=(y-a_i)\,g'(z_i).
$$

权重更新 = 误差项 $\delta_i$ × 这条连接送进来的激活 $a_j$ 。这个 $\delta_i$ 依赖目标输出 $y$ ，只能用于输出单元；所以要把 $\delta$ 从右往左“反向传播”。
<!-- Sources: L16 p.31 -->

### 隐藏层：把误差项往回传

![L16 slide 34 - Delta rule for a hidden layer](assets/10-neural-networks/slide-l16-34.png)

现在粉色框移到了前一层的权重 $\theta^{1}_{jk}$ （连接 $k$ 到隐藏结点 $j$ ）。推导的前四步与输出层完全相同（红字 “Same as the first 4 steps”），于是可以直接复用 $\delta_i$ ；再用两条定义继续求导：

$$
z_i=\sum_j\theta^{2}_{ij}g(z_j),\qquad z_j=\sum_k\theta^{1}_{jk}a_k ,
$$

得到

$$
\Delta\theta^{1}_{jk}=\eta\,\delta_i\,\theta^{2}_{ij}\,g'(z_j)\,a_k=\eta\,\delta_j\,a_k,
\qquad
\delta_j=g'(z_j)\sum_i\theta^{2}_{ij}\,\delta_i .
$$
<!-- Sources: L16 p.32-34; Apple Notes W8L15-16 Neural Network -->

图下方的蓝字提醒：当结点 $j$ 连到后一层多个结点 $i$ 时（图中 $j$ 向右伸出了好几条粗线），要对 $i$ 求和。**难点：** 隐藏单元的误差项 = 自己激活函数的导数 × 后一层误差项按连接权重的加权和。它的形式与输出层的 $\delta_i$ 一样是“误差 × $g'$ ”，只是“误差”从 $(y-a_i)$ 换成了 $\sum_i\theta_{ij}\delta_i$ 。

**易错：符号约定。** 课件定义 $\delta_i=(y-a_i)g'(z_i)$ ，所以更新是 **加** $\eta\delta_ia_j$ ；学生笔记把 $\delta$ 定义为 $\partial E/\partial z=-(y-a_i)g'(z_i)$ ，更新就写成 **减**。两种写法等价，但不要混用。
<!-- Sources: L16 p.31; Apple Notes W8L15-16 Neural Network; Apple Notes ★3.2 Multi-layer Perceptron -->

<details markdown="1">
<summary>延伸内容（可选）：sigmoid 的导数与一个数值例子</summary>

Sigmoid 的导数可以写成 $g'(z)=g(z)\big(1-g(z)\big)$ ，在 $z=0$ 时为 $0.25$ 。

理解用例（自拟）：输出单元收到 $a_j=0.5$ 、 $z_i=0$ ，所以 $a_i=0.5$ ；真实 $y=1$ ， $\eta=1$ 。

$$
\delta_i=(1-0.5)\times0.25=0.125,\qquad \Delta\theta_{ij}=1\times0.125\times0.5=0.0625 .
$$

权重增大，下次 $z_i$ 变大、输出更接近 1。

</details>

### 整个过程与算法

![L16 slide 41 - Backpropagation demo](assets/10-neural-networks/slide-l16-41.png)

这是课件动画的最后一帧（前几页逐步加上各个元素）。绿色圆点是各结点的激活值 $a$ ，红色方块是误差项 $\delta$ ，黑色粗箭头是前向传播的方向（从左到右），蓝色弧形箭头表示误差从右往左回传。按下方列表的顺序：接收输入 → 前向传播激活值 → 在输出层比较 $\hat{y}$ 与 $y$ 得到误差项 → 把误差项从输出层传回隐藏层 → 由误差项算出每个权重的偏导并更新。
<!-- Sources: L16 p.18-24, p.35-41 -->

![L16 slide 42 - Backpropagation algorithm](assets/10-neural-networks/slide-l16-42.png)

把上面的流程写成算法：设计网络、初始化参数，然后对每个训练实例重复四步。粉色框是统一的更新量 $\Delta\theta^{l}_{ij}=-\eta\,\partial E/\partial\theta^{l}_{ij}=\eta\delta_ia_j$ ，对所有层都成立，只是 $\delta$ 的算法分输出层和隐藏层两种。第 4 步的红字 “at once” 强调：所有 $\Delta\theta$ 都用更新前的权重算完后，再一起更新。
<!-- Sources: L16 p.42 -->

反向传播是梯度下降的一个特例：通过复用各层的 $\delta$ ，高效地算出所有权重的梯度。
<!-- Sources: L16 p.43 -->

## 本讲自测

1. 感知机初始 $\theta=(0,0,0)$ （含偏置）， $\eta=1$ ，第一个样本是 $\mathbf{x}=(2,-1)$ 、 $y=-1$ 。会不会更新？更新后 $\theta$ 是多少？
2. 为什么单个感知机学不会 XOR，而一个隐藏层就够了？
3. 把 MLP 所有激活函数都换成恒等函数 $f(z)=z$ ，网络还能学非线性边界吗？
4. 输出层误差项 $\delta_i$ 与隐藏层误差项 $\delta_j$ 的公式有什么不同？为什么？
5. 一个隐藏结点连到后一层的两个输出结点，它的误差项要怎样由两个输出结点的误差项得到？
