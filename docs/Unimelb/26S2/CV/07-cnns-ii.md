# COMP90086 Lecture 7 - Convolutional Neural Networks II

来源：`lecture/COMP90086-07-CNNsII.pdf` 与 `transcript/COMP90086_2026_SM2 Week-04-W-transcript.txt`。Workshop 5 补充来自 `workshop/week-05/worksheet05_solution.ipynb`，仅整理原练习，未重新执行训练。

先记住：**这一讲解决两个训练 CNN 的实际问题：中间特征图太大，以及模型只记住训练图片而不会泛化。** 前者用 downsampling 减少计算量，后者用 regularisation、数据增强和 validation monitoring 限制 overfitting。

## 1. Downsampling：为什么要缩小 feature map

![Slide 7 - Strided convolution](assets/07-cnns-ii/slide-07.png)

convolution layer 输出的 feature map 仍然可能很大。下一层如果继续处理全部位置，计算量和显存都会增加。**Downsampling** 就是减少 feature map 的 height 和 width；它不是把图片随便裁掉，而是用一个有规则的操作保留较有用的信息。

> **老师原话**：“Downsampling here is simply to reduce the feature size. You can use a convolution layer with stride greater than one, max pooling, or average pooling.”

它通常带来两个好处：

1. 后续层要处理的数字更少，所以训练和推理更快；
2. 对很小的 translation 更 tolerant：物体移动一两个像素时，缩小后的结果可能仍然相近。

代价是细节可能丢失，尤其是 stride 太大时。

### 1.1 Strided convolution

**Stride** 是 convolution window 每次移动的距离。stride 为 1 时，窗口逐像素移动；stride 为 2 时，每次跳两格，因此输出更小。

没有 padding 时，一个空间方向的输出大小可写成：

$$
N_{out}=\left\lceil\frac{N-K+1}{S}\right\rceil,
$$

其中  $N$  是 input size， $K$  是 kernel size， $S$  是 stride。带 padding 的课程简化式是：

$$
N_{out}=\left\lceil\frac{N}{S}\right\rceil.
$$

例如  $N=8,K=3,S=2$  时，窗口不再看每个相邻位置，而是隔一个位置取一次。这样计算更快，但窗口会跳过一些位置，可能错过小目标或细边缘。

![Slide 11 - Max pooling](assets/07-cnns-ii/slide-11.png)

### 1.2 Max pooling 和 average pooling

pooling 通常逐张处理 activation map。以  $2\times2$  window、stride 2 为例，它把四个数变成一个数，因此 height 和 width 大约减半：

- **Max pooling**：取 window 中最大的 activation。它倾向于保留“这个局部是否强烈出现某个 feature”的信号。
- **Average pooling**：取 window 中的平均值。它保留整体水平，但会把尖锐的 edge response 平均掉，产生更模糊的结果。

![Slide 12 - Average pooling](assets/07-cnns-ii/slide-12.png)

不要把 max pooling 当成“选出最亮的 pixel”。它是在 feature map 上选最大的**特征响应**；这个响应可能代表 edge、texture 或更高层的 pattern。pooling 也会丢弃其他位置的信息，所以要根据任务选择 kernel、stride 和 pooling 类型。

> **老师原话**：“Max pooling returns the maximum value in the region. With average pooling, an important edge can become less sharp, so the feature is blurred.”

### Workshop 5 补充：沿原题计算参数与输出

来源：`workshop/week-05/worksheet05_solution.ipynb` 开头的 CNN 参数题。原解答标题误写成 Exercise 3，但对应的是开头 Exercise 1。

卷积层的参数量为  $K_hK_wC_{in}C_{out}+C_{out}$ ：两个  $K$  是核高、核宽， $C_{in}$  是输入通道数， $C_{out}$  是输出通道数，最后一项是每个输出通道的 bias。输出图有多少空间位置，不会让共享的参数跟着复制。

| 原题层 | 参数计算 | 输出形状（不含 batch） |
| --- | --- | --- |
| A |  $5\times5\times3\times20+20=1520$  |  $22\times22\times20$  |
| B |  $3\times3\times20\times40+40=7240$  |  $20\times20\times40$  |
| C pooling |  $0$  |  $10\times10\times40$  |
| D dense |  $4000\times10+10=40010$  |  $10$  |

总参数为  $1520+7240+40010=48770$ 。Dense 前 flatten 得到的 4000，来自  $10\times10\times40$ ，不是另加的训练参数。

原题还问初始化后的输出。若所有参数为 0，B 的输出是  $20\times20\times40$  的全零数组。若权重全为 1、bias 为 0，所有输出通道执行相同局部累加，因而形成相同的模糊响应；原 solution 将其描述为 averaging filters。

<details>
<summary>延伸内容（可选）：原解答“averaging”的措辞校正</summary>

<p>权重全为 1 时严格算的是求和，没有除以核元素数量，因此数值不等于平均。可以用模糊图理解空间效果，但不要据此认为亮度范围保持不变。这是按题目权重设置对原解答的校正。</p>

</details>

原题最后提出用 separable convolution 或堆叠小卷积核减少参数。具体 separable 练习接在 [CNNs III](08-cnns-iii.md) 对应主题中。

## 2. Regularisation：为什么训练集准确率高还不够

CNN 参数很多，容易出现 **overfitting**：模型在 training set 上表现很好，却把训练图片的偶然细节当成规律，到了 validation/test set 就下降。Regularisation 的目标是让模型学到更稳定、较简单的表示。

> **老师原话**：“Regularisation puts a restriction on the parameter values. We use it because a neural network can overfit the training set.”

### 2.1 L1 和 L2 regularisation

把原来的 supervised loss 记作  $\mathcal L_{data}$ ，加入 regularisation 后：

$$
\mathcal L=\mathcal L_{data}+\lambda\,\mathcal R(\theta),
$$

其中  $\theta$  是网络 parameters， $\lambda$  控制惩罚有多重要。

![Slide 17 - L1, L2 regularisation](assets/07-cnns-ii/slide-17.png)

- **L1**： $\mathcal R(\theta)=\sum_i|\theta_i|$ 。它倾向于把一部分 parameters 推到 0，因此得到较 sparse 的 representation。
- **L2**： $\mathcal R(\theta)=\sum_i\theta_i^2$ 。它倾向于让 parameters 变小，但通常不会大量变成精确的 0。

这里的“惩罚”不是把参数直接删掉，而是在每次更新时让大参数付出更高 loss。 $\lambda$  太小可能压不住 overfitting；太大则可能把有用的 signal 也压掉，导致 underfitting。还要决定惩罚哪些 layers，以及是否包含 bias。

### 2.2 Dropout

![Slide 20 - Dropout](assets/07-cnns-ii/slide-20.png)

**Dropout** 在 training 时随机把一些 neurons 的输出设为 0。这样 network 不能依赖某一个固定 neuron，必须让多个 neurons 学到较独立、可替换的证据。可以把它理解为每次 mini-batch 都在训练一个略有不同的子网络。

Dropout rate 是 hyperparameter，例如 0.2 表示随机丢弃约 20% 的 units。它只在 training 使用；validation/test 时所有 neurons 都启用。Dropout 可能使总训练时间增加，因为模型需要更多 epochs 才达到稳定表现。

> **老师原话**：“Dropout is only used in training. During testing, all neurons are retained.”

### 2.3 Early stopping

![Slide 22 - Early stopping](assets/07-cnns-ii/slide-22.png)

把数据分成 train、validation、test 三部分。训练只更新 train 上的参数，定期在 validation 上检查 loss/accuracy。如果 training loss 继续下降，但 validation 表现开始变差，就说明模型可能开始 overfit；此时停止训练，并保留 validation 表现最好的 checkpoint。test set 应该留到最后一次评估，不能用来反复挑模型。

## 3. 一个 image-recognition CNN 如何训练

![Slide 25 - CNN overview](assets/07-cnns-ii/slide-25.png)

常见结构可以分成两部分：

1. convolution + activation + downsampling：把 pixels 变成较高层的 feature embedding；
2. fully-connected（dense）层：根据 embedding 做分类。

最后用 softmax 输出各类别的分数，并用 cross-entropy 比较预测和 ground truth。对 logits  $y_i$ ：

$$
\operatorname{softmax}(y_i)=\frac{e^{y_i}}{\sum_{j=1}^{N}e^{y_j}},
$$

输出都在  $0$  到  $1$  之间且总和为  $1$ 。如果真实类别是  $k$ ，one-hot label 为  $1$  的位置就是  $k$ ，cross-entropy 会鼓励  $\hat y_k$  变大：

$$
\mathcal L_{CE}=-\sum_{i=1}^{N}y_i\log(\hat y_i).
$$

![Slide 28 - Cross-entropy loss](assets/07-cnns-ii/slide-28.png)

### 3.1 Batch、epoch 和 learning rate

不能每次更新都把整个 dataset 放进 GPU，所以把 training set 分成 mini-batches。**Batch size** 是一次计算 gradient 使用的样本数；一个 **epoch** 表示所有 training images 都被看过一次。小 batch 更新更频繁但 gradient 噪声更大；大 batch 更稳定但单次计算和显存占用更高。

**Learning rate**  $\eta$  决定每次参数更新步子：

$$
\theta_{t+1}=\theta_t-\eta\nabla_\theta\mathcal L.
$$

学习率太大可能越过好解、训练不稳定；太小则收敛很慢。通常会使用 learning-rate decay，让后期步子变小。

### 3.2 Data preprocessing 和 augmentation

输入通常先缩放或 whiten，使数值范围和中心更适合优化。**Data augmentation** 则只对 training images 做合理的随机变化，例如 random crop、horizontal flip、轻微颜色/对比度变化，从而模拟测试时可能出现的拍摄差异。

![Slide 32 - Data augmentation](assets/07-cnns-ii/slide-32.png)

增强不能违背标签的含义。例如自然物体通常可以水平翻转，但上下翻转、过大的颜色变化可能把图像变成训练分布中不存在的样子，反而伤害模型。

## 4. Workshop 4：用 MNIST 对比 MLP 和 CNN

本周 `workshop/week-04/worksheet04_solution.ipynb` 先处理颜色空间和图像形成，再用 MNIST（ $28\times28$  单通道手写数字）比较 MLP 与 CNN：

- MLP 先把图像 flatten 成  $784$  个数字，再用 dense layers 分类；
- CNN 保留二维结构，用 `Conv2D`、`MaxPooling2D`、`Flatten` 和输出层分类；
- 代码把 pixel 除以 255，使输入落在  $[0,1]$ ，并增加 channel 维度以符合 Keras 的 `(batch, height, width, channels)` 输入格式；
- solution 的参数计算提醒我们：convolution filter 会在空间位置共享 weights，所以通常比直接 flatten 的 MLP 参数更少；在这个 MNIST exercise 中，CNN 测试准确率也更高。

先关注概念，不必死记一次运行得到的具体 accuracy：随机初始化、epoch 数、硬件和软件版本都会改变最后的小数。

## 5. 容易混淆的地方

- **stride convolution ≠ pooling**：前者仍用 learned kernel 做加权计算；pooling 通常没有 learned weights，只在局部取 max 或 average。
- **regularisation ≠ validation**：regularisation 改变训练目标或训练过程；validation 用来监控泛化和选择 checkpoint。
- **dropout 不是永久删除 neurons**：只在 training 随机屏蔽，evaluation 时恢复全部 units。
- **softmax 输出不是保证正确的概率**：它是归一化后的 confidence-like 分数；类别集合和数据分布改变时，数值也会改变。
- **augmentation 不是越多越好**：变化必须与真实任务中的不变性一致。

## 6. 本讲复习

1. Downsampling 减少后续计算，并可能提高对小 translation 的 tolerance，但会牺牲细节。
2. Stride 是 convolution window 的移动距离；max/average pooling 在 activation map 上分别取最大值/平均值。
3. L1 偏好 sparse parameters，L2 偏好较小 parameters； $\lambda$  太大可能 underfit。
4. Dropout 只在 training 随机屏蔽 units；early stopping 根据 validation 表现保存最佳 checkpoint。
5. CNN 常用 feature extractor + classifier + softmax/cross-entropy；batch size、learning rate、augmentation 都是需要实验的 training choices。
6. Workshop 4 用 MNIST 展示：保留空间结构的 CNN 可以用更少参数取得更好的分类表现。
