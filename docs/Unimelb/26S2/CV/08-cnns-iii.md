# COMP90086 Lecture 8 - Convolutional Neural Networks III

来源：`lecture/COMP90086-08-CNNsIII.pdf` 与 `transcript/COMP90086_2026_SM2 Week-04-F-transcript.txt`。

先记住：**这一讲比较不同 CNN backbone 如何提升准确率、效率和可训练性，并说明如何把 ImageNet 上已经学好的 CNN 迁移到自己的任务。** 重点不是背 architecture 名字，而是看每种设计在解决什么问题。

## 1. 怎样看 image-classification 结果

![Slide 5 - ImageNet classification](assets/08-cnns-iii/slide-05.png)

ImageNet classification 有 1000 个 object classes。模型先输出 1000 个类别的 softmax 分数。

- **Top-1 accuracy**：最高分的类别必须等于 ground truth。
- **Top-N accuracy**：前 $N$ 个最高分中只要包含 ground truth 就算正确。

例如真实标签是 `dog`，模型分数最高的是 `cat`，但 `dog` 排在第 2 位，那么 top-1 错、top-5 可能对。top-5 error 越低越好；top-5 accuracy 越高越好，读图时先确认指标方向。

> **老师原话**：“Top-1 means the most likely class is the ground truth. For top-N, the ground-truth label only needs to be included within the N largest probabilities.”

![Slide 13 - AlexNet innovations](assets/08-cnns-iii/slide-13.png)

错误不一定说明模型完全没有学到东西。小目标、遮挡、奇怪视角、灰度图和训练集中很少见的图像都更难。评价时要同时看指标、类别分布和失败案例，不能只记一个 overall accuracy。

## 2. Architecture 的共同问题

CNN architecture 是 layers 的排列和每层的设计。常见可调因素包括：

- **depth**：层数；
- **width**：每层 filters/channels 的数量；
- kernel size；
- input resolution；
- downsampling 的位置和方式。

更深或更宽通常增加表达能力，但也增加参数、显存、运行时间和优化难度。所以不同 architecture 的“创新”通常是在准确率、效率、稳定训练之间做取舍。

## 3. 从 AlexNet 到 VGG、Inception、ResNet

### 3.1 AlexNet：让大规模 CNN 变得可行

AlexNet 的关键组合包括 ReLU、GPU 并行、data augmentation、dropout，以及当时的 response normalization 和 overlapping max pooling。它证明了：在大数据和 GPU 上训练的 CNN 可以大幅提升 ImageNet classification。

### 3.2 VGG：堆叠小 kernel

![Slide 15 - Stacked convolutional layers](assets/08-cnns-iii/slide-15.png)

VGG 大量使用 $3\times3$ convolution。两个连续的 $3\times3$ layers 具有约 $5\times5$ 的 effective receptive field，三个则约为 $7\times7$：

$$
3+3-1=5,\qquad 3+3+3-2=7.
$$

相比直接使用一个大 kernel，堆叠小 kernel 通常参数更少，并且每层 ReLU 带来更多 non-linearity。代价是 layers 更多、计算仍然可能很重。

> **老师原话**：“VGG uses stacked 3 by 3 convolutional kernels. Two 3 by 3 layers have an effective receptive field of 5 by 5, and three have 7 by 7, with fewer parameters than one large kernel.”

### 3.3 GoogLeNet/Inception：同时看多种尺度

![Slide 18 - Inception module](assets/08-cnns-iii/slide-18.png)

物体和 feature 可能出现在不同尺度，因此很难提前决定只用 $3\times3$ 还是 $5\times5$。Inception module 在同一层并行使用不同 kernel sizes，再 concatenate 它们的输出。

`1x1 convolution` 不改变 height/width，但可以减少 channels，先压低后续计算量。GoogLeNet 还加入只在 training 使用的 auxiliary classifiers，为较早的 layers 提供额外 gradient，帮助缓解 vanishing gradient。

### 3.4 ResNet：学习 residual，而不是硬学 identity

![Slide 24 - ResNet shortcut](assets/08-cnns-iii/slide-24.png)

网络变深后，表现可能先变好再变差；这不一定是 overfitting，因为 training error 也可能变差，说明优化本身变难。

ResNet 加入 shortcut/skip connection，让输入 $x$ 绕过几层，输出写成：

$$
y=F(x)+x.
$$

普通网络要直接学目标映射 $H(x)$；residual block 改为学习 $F(x)=H(x)-x$。如果最好的选择其实是“保持输入不变”，只需让 $F(x)\approx0$，通常比让一串 layers 精确学 identity 更容易。shortcut 也为 gradient 提供了更直接的路径。

> **老师原话**：“The residual network learns $H(x)-x$ and then adds $x$ back. If the best solution is an identity mapping, it is easier to learn a residual close to zero.”

## 4. MobileNet 和 EfficientNet：减少计算、合理扩大模型

### 4.1 MobileNet：depthwise-separable convolution

![Slide 28 - MobileNet](assets/08-cnns-iii/slide-28.png)

普通 convolution 同时混合空间位置和 channels。MobileNet 把它拆成两步：

1. **depthwise convolution**：对每个 channel 单独做 $K\times K$ 空间 filtering；
2. **pointwise convolution**：用 $1\times1$ kernel 混合 channels。

这样参数和 FLOPs 更少，适合手机和实时应用，但限制了可学习的 kernel 形式，准确率可能低于较重的 VGG/ResNet。

### 4.2 EfficientNet：共同缩放 depth、width、resolution

增加 depth、width 或 resolution 都可能提高 accuracy，但收益会逐渐变小。EfficientNet 把这三个因素一起考虑，在固定计算预算下搜索合适的比例。课程 slide 用近似关系说明成本随 depth 线性增长，而 width 和 resolution 的影响更接近平方：

$$
d\times w^2\times r^2\approx 2.
$$

这里的公式是 architecture scaling 的近似约束，不是所有 CNN 都必须满足的定律。它帮助我们理解：不能只把网络无限加宽或把输入无限放大。

![Slide 31 - EfficientNet](assets/08-cnns-iii/slide-31.png)

## 5. Transfer learning：不要每个任务都从零开始

### 5.1 为什么 features 比 raw pixels 更适合迁移

![Slide 37 - Pixels](assets/08-cnns-iii/slide-37.png)

一张 $256\times256\times3$ 图片有 $196{,}608$ 个 pixel attributes。平移、缩放、光照和旋转会让 pixel values 大幅改变，但类别通常没有改变。因此 raw pixels 是高维且对无关变化敏感的空间。

CNN 的中间层把 pixels 转换成 feature embedding：它的维度更低，而且同一类别的图片即使外观不同，也可能落在相近的 feature space 区域。

![Slide 40 - Using pretrained networks](assets/08-cnns-iii/slide-40.png)

**Transfer learning** 就是使用一个在大数据集（例如 ImageNet）上预训练的 CNN 作为 feature extractor 或初始化模型，再把它用于新任务。

### 5.2 三种常见用法

![Slide 44 - Replace output layer](assets/08-cnns-iii/slide-44.png)

1. **Off-the-shelf feature embedding**：取预训练 CNN 较后层的 activation，当作每张图的 features，再训练 SVM、K-NN 等外部 classifier。
2. **Frozen backbone + new head**：删除原来 1000 类的 output layer，换成自己任务的类别数；冻结 backbone，只训练新 output layer。
3. **Fine-tuning**：先用预训练参数初始化，再用较小 learning rate 训练后面几层或更多层。

> **老师原话**：“Transfer learning means using features from a CNN trained on a large-scale task, such as ImageNet, for another vision task. You can replace the output layer, freeze the other parameters, or fine-tune some layers.”

![Slide 47 - Fine-tuning](assets/08-cnns-iii/slide-47.png)

要 fine-tune 多少层取决于两个因素：

- 新 dataset 和 ImageNet 越不像，越可能需要调整较低层的 features；
- 新 dataset 越小，训练很多层越容易 overfit，通常应冻结更多层。

因此“预训练模型一定直接适用”是不准确的。它提供好的 starting point，但仍要检查输入预处理、类别定义、domain gap 和 validation performance。

## 6. Workshop 4 如何连接本讲

`worksheet04_solution.ipynb` 没有实现 ImageNet transfer learning，而是用小型 MNIST CNN 帮你建立前置直觉：输入预处理、分类 head、softmax、参数量和 CNN/MLP 的差异。学会这些后，迁移学习可以看成“保留一个已经训练好的 feature extractor，只替换或微调最后的 classifier”。

## 7. 容易混淆的地方

- **Top-5 accuracy ≠ top-5 error**：一个越高越好，一个越低越好。
- **更深不自动更好**：ResNet 的重点是让深网络更容易优化，而不是简单堆层。
- **1x1 convolution 不是只看一个 pixel 就没有作用**：它在每个空间位置混合 channels，并可减少 channel 数。
- **feature embedding ≠ ground-truth label**：embedding 是模型学到的表示，仍需 classifier 或任务 head 才能输出类别。
- **冻结和 fine-tune 不同**：冻结时参数不更新；fine-tune 时会更新，只是通常使用较小 learning rate。
- **MobileNet 不是“免费加速”**：它减少计算，也限制 kernel 表达能力，速度、内存和 accuracy 之间要权衡。

## 8. 本讲复习

1. 用 top-1/top-N 评价分类时，先确认 ground truth 是否出现在前 $N$ 个预测中。
2. AlexNet、VGG、Inception、ResNet、MobileNet、EfficientNet 分别代表训练可行性、小 kernel、多尺度、skip connection、轻量化和系统缩放等设计思路。
3. VGG 用多个 $3\times3$ layers 获得更大 receptive field；Inception 并行看多种尺度；ResNet 学 $F(x)$ 并加回 $x$。
4. MobileNet 用 depthwise + pointwise convolution 减少 FLOPs；EfficientNet 一起考虑 depth、width、resolution。
5. Transfer learning 可以使用 pretrained features、冻结 backbone 只训练新 head，或用较小 learning rate fine-tune。
