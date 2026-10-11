# COMP90086 Lecture 6 - Convolutional Neural Networks I

来源：`lecture/COMP90086-06-CNNsI.pdf` 与 `transcript/COMP90086_2026_SM2 Week-03-F-transcript.txt`。

这篇回答一个问题：**为什么图像通常不直接交给普通全连接网络，而要使用卷积神经网络（CNN）？**

学习路线：[标签与特征](#topic-1) → [从全连接到卷积](#topic-2) → [通道、参数量和输出尺寸](#topic-3) → [特征层次与能力边界](#topic-4)。

重点：局部连接、权重共享、参数和形状计算。难点：输入通道、滤波器个数与输出通道的关系。易错：输出位置增加不会复制一套新参数。

<a id="topic-1"></a>
## 1. 学习任务：标签与特征

### 先弄清楚本讲的识别

![Slide 5 - Recognition labels](assets/06-cnns-i/slide-05.png)

本讲的 **图像识别** 指整张图像的类别分类：给模型一张完整图像，它输出一个类别。

例如同一张狗的图片，可以根据标签集合被叫作：

- `dog`；
- `shiba inu`；
- `Doge`。

模型能输出哪些词，取决于训练数据中有哪些类别。如果训练集只有 `couch`、没有 `dog`，模型不会凭空学会输出 `dog`。

其他输出形式见 [第 1 讲的任务比较](01-introduction.md)。这里固定使用整图分类，先弄清标签集合再讨论网络。

PPT 8–9 连接 [第 1 讲的识别难题](01-introduction.md)：先比较同类物体的外观差异，再看表示应如何把类别分开。本讲接下来学习实现这种表示的网络。

### 从手工特征到神经网络特征

![Slide 12 - Hand-crafted features](assets/06-cnns-i/slide-12.png)

传统方法通常由人先设计特征，再交给分类器。例如：

- 局部二值模式（局部亮暗排列）；
- 边缘滤波器（边缘方向）；
- HOG（边缘方向的统计）；
- GIST（多尺度的场景布局）。

这些特征可以很有用，但它们依赖设计者的经验。一个数据集上有效的特征，换到另一个数据集可能不再有效。

神经网络把这一步也交给数据：它从训练样本中学习哪些局部模式有助于分类。

![Slide 14 - Deep learning enablers](assets/06-cnns-i/slide-14.png)

深度学习大约在 2010 年后快速发展，原因不是只有一个：

1. GPU 可以并行处理大量数字；
2. ReLU、dropout 等方法改善了训练；
3. 互联网提供大量带标签的图片；
4. ImageNet 等数据集让大规模实验成为可能。

#### 准确率可能骗人

老师用类别不平衡举例：如果数据集有 90 张 cat、10 张 dog，永远预测 cat 也能得到 $90\%$ 准确率。这个模型其实没有识别 dog。

所以评价模型时还要查看每一类的结果、混淆矩阵或考虑类别平衡的指标，不能只看整体准确率。

<a id="topic-2"></a>
## 2. 网络计算：从全连接到卷积

### 全连接网络是怎样计算的

![Slide 20 - Multilayer perceptron](assets/06-cnns-i/slide-20.png)

全连接层的意思是：下一层的每个神经元都连接上一层的所有输出。

一个神经元先把输入乘以权重，加上偏置，再经过激活函数：

$$
y=f\left(\sum_j w_jx_j+b\right)
=f(\mathbf w^\top\mathbf x+b).
$$

- $x_j$ ：输入；
- $w_j$ ：这个输入对应的权重；
- $b$ ：偏置，允许整体向上或向下移动；
- $f$ ：激活函数；
- $y$ ：神经元输出。

如果没有激活，许多线性层合起来仍然只是一个线性变换，表达能力有限。

![Slide 22 - Activation functions](assets/06-cnns-i/slide-22.png)

常见激活：

$$
\begin{aligned}
\sigma(x)&=\frac{1}{1+e^{-x}},\\
\tanh(x)&=\frac{e^{2x}-1}{e^{2x}+1},\\
\operatorname{ReLU}(x)&=\max(0,x).
\end{aligned}
$$

ReLU 最容易先记住：正数原样保留，负数变成 0。它给网络加入非线性，让网络可以学习更复杂的分界。

#### 训练怎样改变权重

![Slide 23 - Backpropagation](assets/06-cnns-i/slide-23.png)

训练过程可以分成四步：

1. 用当前权重计算预测；
2. 把预测和真实标签比较，得到损失；
3. 用反向传播计算每个参数对损失的影响；
4. 按梯度方向更新参数。

最简单的梯度 descent 写成：

$$
\theta_{t+1}=\theta_t-\eta\nabla_\theta\mathcal L.
$$

$\theta$ 表示要学习的权重和 biases， $\eta$ 是学习率。学习率、层数和每层神经元数通常是超参数，需要人为设定。

### 为什么图像不适合直接展平后交给 MLP

![Slide 26 - AlexNet architecture](assets/06-cnns-i/slide-26.png)

把 $H\times W\times C$ 图像展平后交给全连接网络当然可以，但会有两个问题：

1. 参数数量随着图像 area 很快增加；
2. 展平后，模型不再显式知道哪些像素在空间上相邻。

图像有一个很稳定的规律：边缘、角点和纹理通常由小范围的邻居共同决定，而且同一个局部模式可能出现在图像的不同位置。CNN 把这个规律直接写进网络：

- **局部连接**：一个神经元只看一个小图块；
- **权重共享**：同一个滤波器在所有位置重复使用。

![Slide 30 - Reusing local connections](assets/06-cnns-i/slide-30.png)

这样模型可以在整张图中寻找同一种模式，同时只学习一套权重。代价是单层只能看到局部图块，需要多层堆叠或下采样才能逐渐看到更大的范围。

### CNN 的卷积具体怎么做

![Slide 32 - Kernel and stride](assets/06-cnns-i/slide-32.png)

先看一个滤波器：把它放到图像的一个小图块上，逐项相乘后相加，得到一个数字；然后把滤波器移到下一个位置。移动多少像素由 **步幅** 决定。

对输入 $X\in\mathbb R^{H\times W\times C_{\mathrm{in}}}$ ，输出通道 $o$ 的 pre-激活可以写成：

$$
Y_{i,j,o}
=b_o+
\sum_{u=0}^{K_h-1}
\sum_{v=0}^{K_w-1}
\sum_{c=0}^{C_{\mathrm{in}}-1}
K_{u,v,c,o}X_{i+u,j+v,c}.
$$

不用先害怕这个公式。它只是把“图块中每个数字乘对应权重，然后全部相加”写成了三重求和。

![Slide 35 - CNN uses cross-correlation](assets/06-cnns-i/slide-35.png)

**易错**：图中核没有翻转，因此是 [第 3 讲的互相关](03-filters.md)；CNN 仍沿用卷积这个名称。

<a id="topic-3"></a>
## 3. 重点：通道、参数量和输出尺寸

### 颜色通道、滤波器与激活图

![Slide 36 - Colour channels and kernel depth](assets/06-cnns-i/slide-36.png)

如果输入是 RGB 图像，输入通道数 $C_{\mathrm{in}}=3$ 。一个滤波器不能只看一个通道，而要有 $K_h\times K_w\times3$ 个权重，同时覆盖 R、G、B。

![Slide 38 - One activation map](assets/06-cnns-i/slide-38.png)

一个滤波器在所有位置滑过后，会产生一张二维 **激活图**。这张图可以理解为“这个滤波器在每个位置检测到了多少目标模式”。

![Slide 40 - Stacked activation maps](assets/06-cnns-i/slide-40.png)

如果使用 $C_{\mathrm{out}}$ 个滤波器，就得到 $C_{\mathrm{out}}$ 张图，叠起来成为下一层的多-通道输入。

一层的参数数量是：

$$
\#\text{parameters}
=(K_hK_wC_{\mathrm{in}}+1)C_{\mathrm{out}}.
$$

最后的 `+1` 是每个滤波器的偏置。注意：输出有多少个空间位置，不会增加新的权重，因为所有位置共享同一个滤波器。

![Slide 42 - Layer input and output](assets/06-cnns-i/slide-42.png)

通常在卷积后接 ReLU：卷积做局部加权和，ReLU 提供非线性。多层之后，网络可以从边缘逐步组合出纹理、部件和更高层的模式。

### 全连接层和卷积层的参数差异

![Slide 44 - Fully-connected versus convolutional](assets/06-cnns-i/slide-44.png)

假设输入是 $32\times32\times3$ ：

- 一个 fully-connected 神经元： $32\times32\times3=3072$ 权重，加偏置，共 $3073$ 参数；
- 一个 $5\times5\times3$ 卷积滤波器： $75$ 权重，加偏置，共 $76$ 参数。

![Slide 45 - Fully-connected parameter question](assets/06-cnns-i/slide-45.png)

![Slide 46 - Convolutional parameter question](assets/06-cnns-i/slide-46.png)

这个 $5\times5\times3$ 滤波器可以在 $28\times28$ 个 valid locations 重复使用，仍然只学习这 $76$ 个参数。这就是权重共享带来的巨大节省。

<!-- figure: channel-stack -->

### 输出大小、步幅和补边

![Slide 47 - Convolution output size](assets/06-cnns-i/slide-47.png)

在一个空间方向上，输入大小 $N$ 、卷积核尺寸 $K$ 、补边 $P$ 、步幅 $S$ 时：

$$
N_{\mathrm{out}}
=\left\lfloor\frac{N+2P-K}{S}\right\rfloor+1.
$$

例如 $32\times32$ 输入用 $5\times5$ 卷积核、 $P=0$ 、 $S=1$ ：

$$
32-5+1=28,
$$

所以输出是 $28\times28$ 。如果想保持尺寸不变，对 $K=5$ 可以每侧补 2 像素：

$$
P=\frac{K-1}{2}=2.
$$

补边不只是为了“补回尺寸”。边缘外面的数值会影响边界附近的输出，因此 zero、reflect 或 replicate 会产生不同结果。

<!-- figure: conv-press -->

<a id="topic-4"></a>
## 4. 特征层次与能力边界

### CNN 学到的特征层次

![Slide 49 - Layer 1 kernels](assets/06-cnns-i/slide-49.png)

第一层常学到 oriented 边缘、颜色对比度和简单纹理。这些图案和 Sobel 等 classical 滤波器有相似直觉，但 CNN 的权重是由训练学出来的。

![Slide 50 - Layer 2 features](assets/06-cnns-i/slide-50.png)

![Slide 52 - Higher-layer features](assets/06-cnns-i/slide-52.png)

更深的层把前面的局部响应组合起来，可能形成纹理、角点、部件，最后形成对分类有用的高层模式。不要把一张激活可视化直接当成严格语义证明；一个概念通常分布在许多通道和位置中。

### CNN 的优点和限制

![Slide 53 - Convolutional layer trade-offs](assets/06-cnns-i/slide-53.png)

主要优点：

- 比大图像上的全连接层使用更少参数；
- 同一模式在不同位置都能被检测；
- 激活图保留空间结构；
- 局部计算适合 GPU 并行。

主要限制：

- 单层感受野仍然有限；
- 权重共享自动带来平移等变性，但不自动解决旋转、尺度、光照或 3D 姿态；
- 结果依赖数据、labels、class balance、损失和优化；
- 步幅、补边和下采样可能损失边缘或细节。

CNN 不是“只要用了卷积就一定识别得好”。它提供了适合图像的结构假设，真正的不变性仍然要由网络结构、数据和训练 objective 学出来。

## 本讲自测

1. 输入有 3 个通道、输出有 10 个通道，一个滤波器应覆盖多少输入通道？
2. 卷积层参数量与输出尺寸分别取决于哪些量？
3. 为什么卷积堆叠中还要加入 ReLU？
