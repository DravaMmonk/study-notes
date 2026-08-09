# COMP90086 Lecture 6 - Convolutional Neural Networks I

来源：`lecture/COMP90086-06-CNNsI.pdf` 与 `transcript/COMP90086_2026_SM2 Week-03-F-transcript.txt`。

这篇回答一个问题：**为什么图像通常不直接交给普通 fully-connected network，而要使用 convolutional neural network（CNN）？**

## 1. 先弄清楚本讲的 recognition

![Slide 5 - Recognition labels](assets/06-cnns-i/slide-05.png)

本讲的 **image recognition** 指 whole-image、category-level classification：给模型一张完整图像，它输出一个类别。

> **老师原话**：“When we mention recognition, we mainly refer to classification. In this lecture, it is image-level classification.”

例如同一张狗的图片，可以根据 label set 被叫作：

- `dog`；
- `shiba inu`；
- `Doge`。

模型能输出哪些词，取决于训练数据中有哪些类别。如果 training set 只有 `couch`、没有 `dog`，模型不会凭空学会输出 `dog`。

### Classification、detection 和 segmentation 的区别

| 任务 | 输出 |
| --- | --- |
| Image classification | 整张图一个类别 |
| Instance recognition | 某个具体 individual 的身份 |
| Object detection | 类别 + bounding box |
| Semantic segmentation | 每个 pixel 的类别 |
| Instance segmentation | 每个 pixel 的类别 + 属于哪一个 object |

![Slide 8 - Intra-category variability](assets/06-cnns-i/slide-08.png)

recognition 很难，是因为两种变化同时存在：

- 不同类别可能看起来很像（inter-category similarity）；
- 同一类别也会因姿势、大小、光照、背景和遮挡而变化（intra-category variability）。

![Slide 9 - Recognition representation](assets/06-cnns-i/slide-09.png)

所以模型需要学习一个 representation：它应该把不同类别分开，同时对同一类别的无关变化保持 tolerant。

## 2. 从手工特征到神经网络特征

![Slide 12 - Hand-crafted features](assets/06-cnns-i/slide-12.png)

传统方法通常由人先设计 features，再交给 classifier。例如：

- local binary pattern（局部亮暗排列）；
- edge filters（边缘方向）；
- HOG（边缘方向的统计）；
- GIST（多尺度的场景布局）。

这些 features 可以很有用，但它们依赖设计者的经验。一个数据集上有效的特征，换到另一个数据集可能不再有效。

神经网络把这一步也交给 data：它从训练样本中学习哪些局部模式有助于分类。

![Slide 14 - Deep learning enablers](assets/06-cnns-i/slide-14.png)

深度学习大约在 2010 年后快速发展，原因不是只有一个：

1. GPU 可以并行处理大量数字；
2. ReLU、dropout 等方法改善了训练；
3. 互联网提供大量带标签的图片；
4. ImageNet 等数据集让大规模实验成为可能。

### Accuracy 可能骗人

老师用 class imbalance 举例：如果 dataset 有 90 张 cat、10 张 dog，永远预测 cat 也能得到 $90\%$ accuracy。这个模型其实没有识别 dog。

> **老师原话**：“If you predict all the outputs as cat, you can still get ninety percent accuracy.”

所以评价模型时还要查看每一类的结果、confusion matrix 或 balanced metrics，不能只看 overall accuracy。

## 3. Fully-connected network 是怎样计算的

![Slide 20 - Multilayer perceptron](assets/06-cnns-i/slide-20.png)

fully-connected layer 的意思是：下一层的每个 neuron 都连接上一层的所有输出。

一个 neuron 先把输入乘以 weights，加上 bias，再经过 activation function：

$$
y=f\left(\sum_j w_jx_j+b\right)
=f(\mathbf w^\top\mathbf x+b).
$$

- $x_j$：输入；
- $w_j$：这个输入对应的 weight；
- $b$：bias，允许整体向上或向下移动；
- $f$：activation function；
- $y$：neuron 输出。

如果没有 activation，许多 linear layers 合起来仍然只是一个 linear transform，表达能力有限。

![Slide 22 - Activation functions](assets/06-cnns-i/slide-22.png)

常见 activation：

$$
\begin{aligned}
\sigma(x)&=\frac{1}{1+e^{-x}},\\
\tanh(x)&=\frac{e^{2x}-1}{e^{2x}+1},\\
\operatorname{ReLU}(x)&=\max(0,x).
\end{aligned}
$$

ReLU 最容易先记住：正数原样保留，负数变成 0。它给 network 加入 non-linearity，让 network 可以学习更复杂的分界。

### 训练怎样改变 weights

![Slide 23 - Backpropagation](assets/06-cnns-i/slide-23.png)

训练过程可以分成四步：

1. 用当前 weights 计算 prediction；
2. 把 prediction 和 ground truth 比较，得到 loss；
3. 用 backpropagation 计算每个 parameter 对 loss 的影响；
4. 按 gradient 方向更新 parameters。

最简单的 gradient descent 写成：

$$
\theta_{t+1}=\theta_t-\eta\nabla_\theta\mathcal L.
$$

$\theta$ 表示要学习的 weights 和 biases，$\eta$ 是 learning rate。learning rate、层数和每层 neuron 数通常是 hyperparameters，需要人为设定。

## 4. 为什么图像不适合直接 flatten 后交给 MLP

![Slide 26 - AlexNet architecture](assets/06-cnns-i/slide-26.png)

把 $H\times W\times C$ image flatten 后交给 fully-connected network 当然可以，但会有两个问题：

1. 参数数量随着 image area 很快增加；
2. flatten 后，模型不再显式知道哪些 pixels 在空间上相邻。

图像有一个很稳定的规律：edge、corner 和 texture 通常由小范围的邻居共同决定，而且同一个局部 pattern 可能出现在图像的不同位置。CNN 把这个规律直接写进网络：

- **local connectivity**：一个 neuron 只看一个小 patch；
- **weight sharing**：同一个 filter 在所有位置重复使用。

![Slide 30 - Reusing local connections](assets/06-cnns-i/slide-30.png)

这样模型可以在整张图中寻找同一种 pattern，同时只学习一套 weights。代价是单层只能看到 local patch，需要多层堆叠或 downsampling 才能逐渐看到更大的范围。

## 5. CNN 的 convolution 具体怎么做

![Slide 32 - Kernel and stride](assets/06-cnns-i/slide-32.png)

先看一个 filter：把它放到 image 的一个小 patch 上，逐项相乘后相加，得到一个数字；然后把 filter 移到下一个位置。移动多少 pixels 由 **stride** 决定。

对 input $X\in\mathbb R^{H\times W\times C_{\mathrm{in}}}$，output channel $o$ 的 pre-activation 可以写成：

$$
Y_{i,j,o}
=b_o+
\sum_{u=0}^{K_h-1}
\sum_{v=0}^{K_w-1}
\sum_{c=0}^{C_{\mathrm{in}}-1}
K_{u,v,c,o}X_{i+u,j+v,c}.
$$

不用先害怕这个公式。它只是把“patch 中每个数字乘对应 weight，然后全部相加”写成了三重求和。

![Slide 35 - CNN uses cross-correlation](assets/06-cnns-i/slide-35.png)

CNN library 通常不先把 kernel 翻转，所以严格说做的是 cross-correlation，但历史上仍称作 convolution。它和上一讲 signal-processing 的 convolution 定义不同，读题时要看上下文。

> **老师原话**：“Convolution operation in CNN is identical with the cross-correlation operation.”

## 6. Colour channels、filters 和 activation maps

![Slide 36 - Colour channels and kernel depth](assets/06-cnns-i/slide-36.png)

如果 input 是 RGB image，input channel 数 $C_{\mathrm{in}}=3$。一个 filter 不能只看一个 channel，而要有 $K_h\times K_w\times3$ 个 weights，同时覆盖 R、G、B。

![Slide 38 - One activation map](assets/06-cnns-i/slide-38.png)

一个 filter 在所有位置滑过后，会产生一张二维 **activation map**。这张 map 可以理解为“这个 filter 在每个位置检测到了多少目标 pattern”。

![Slide 40 - Stacked activation maps](assets/06-cnns-i/slide-40.png)

如果使用 $C_{\mathrm{out}}$ 个 filters，就得到 $C_{\mathrm{out}}$ 张 maps，叠起来成为下一层的多-channel input。

一层的参数数量是：

$$
\#\text{parameters}
=(K_hK_wC_{\mathrm{in}}+1)C_{\mathrm{out}}.
$$

最后的 `+1` 是每个 filter 的 bias。注意：output 有多少个 spatial positions，不会增加新的 weights，因为所有位置共享同一个 filter。

![Slide 42 - Layer input and output](assets/06-cnns-i/slide-42.png)

通常把 convolution 接在 ReLU 后面：convolution 做局部加权和，ReLU 提供 non-linearity。多层之后，网络可以从 edge 逐步组合出 texture、parts 和更高层的 pattern。

> **老师原话**：“Convolution is a linear operation, and ReLU is the nonlinear operation.”

## 7. Fully-connected 和 convolutional 的参数差异

![Slide 44 - Fully-connected versus convolutional](assets/06-cnns-i/slide-44.png)

假设 input 是 $32\times32\times3$：

- 一个 fully-connected neuron：$32\times32\times3=3072$ weights，加 bias，共 $3073$ parameters；
- 一个 $5\times5\times3$ convolution filter：$75$ weights，加 bias，共 $76$ parameters。

![Slide 45 - Fully-connected parameter question](assets/06-cnns-i/slide-45.png)

![Slide 46 - Convolutional parameter question](assets/06-cnns-i/slide-46.png)

这个 $5\times5\times3$ filter 可以在 $28\times28$ 个 valid locations 重复使用，仍然只学习这 $76$ 个 parameters。这就是 weight sharing 带来的巨大节省。

## 8. Output size、stride 和 padding

![Slide 47 - Convolution output size](assets/06-cnns-i/slide-47.png)

在一个空间方向上，input size $N$、kernel size $K$、padding $P$、stride $S$ 时：

$$
N_{\mathrm{out}}
=\left\lfloor\frac{N+2P-K}{S}\right\rfloor+1.
$$

例如 $32\times32$ input 用 $5\times5$ kernel、$P=0$、$S=1$：

$$
32-5+1=28,
$$

所以 output 是 $28\times28$。如果想保持尺寸不变，对 $K=5$ 可以每侧补 2 pixels：

$$
P=\frac{K-1}{2}=2.
$$

padding 不只是为了“补回尺寸”。边缘外面的数值会影响边界附近的 output，因此 zero、reflect 或 replicate 会产生不同结果。

## 9. CNN 学到的 hierarchy

![Slide 49 - Layer 1 kernels](assets/06-cnns-i/slide-49.png)

第一层常学到 oriented edges、colour contrast 和简单 texture。这些图案和 Sobel 等 classical filters 有相似直觉，但 CNN 的 weights 是由 training 学出来的。

![Slide 50 - Layer 2 features](assets/06-cnns-i/slide-50.png)

![Slide 52 - Higher-layer features](assets/06-cnns-i/slide-52.png)

更深的层把前面的局部 response 组合起来，可能形成 texture、corner、parts，最后形成对分类有用的高层 pattern。不要把一张 activation visualisation 直接当成严格语义证明；一个概念通常分布在许多 channels 和位置中。

> **老师原话**：“The lower level learns edges ... as the network goes deeper, it learns higher-level structures.”

## 10. CNN 的优点和限制

![Slide 53 - Convolutional layer trade-offs](assets/06-cnns-i/slide-53.png)

主要优点：

- 比大图像上的 fully-connected layer 使用更少 parameters；
- 同一 pattern 在不同位置都能被检测；
- activation maps 保留空间结构；
- 局部计算适合 GPU 并行。

主要限制：

- 单层 receptive field 仍然有限；
- weight sharing 自动带来 translation equivariance，但不自动解决 rotation、scale、lighting 或 3D pose；
- 结果依赖 data、labels、class balance、loss 和 optimisation；
- stride、padding 和 downsampling 可能损失边缘或细节。

CNN 不是“只要用了 convolution 就一定识别得好”。它提供了适合图像的结构假设，真正的 invariance 仍然要由 architecture、data 和 training objective 学出来。

## 11. 本讲复习

1. 本讲的 recognition 是 whole-image category classification；先和 detection、segmentation 区分。
2. MLP neuron 计算 weighted sum + bias + activation，并通过 loss 和 backpropagation 学 parameters。
3. CNN 用 local connectivity 和 weight sharing 保留图像结构、减少参数。
4. CNN 中的“convolution”通常实际是 cross-correlation；一个 filter 覆盖所有 input channels。
5. 一个 filter 产生一张 activation map；多个 filters 产生多个 output channels。
6. Output size 由 input、kernel、padding 和 stride 决定；parameter count 由 kernel shape 和 channel 数决定。
7. 浅层常见 edge/colour/texture，深层逐步组合出 parts 和高层 pattern。
