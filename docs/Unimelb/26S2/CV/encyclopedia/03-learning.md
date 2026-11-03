# 学习特征与表示

[词条索引与使用方法](README.md) · [专题主线与补充关](../LEARNING-PATHS.md)

每个词条注明来源与直接前置。下面的层级是学习设计，验收活动均为自拟，尚未接入游戏。

<a id="recognition"></a>
## 分类表示与神经网络

- 编号：`recognition`
- 分类：**讲义内容**
- 出处：[L06 PDF](../lecture/COMP90086-06-CNNsI.pdf)，PDF p.5–24；对照 `transcript/COMP90086_2026_SM2 Week-03-F-transcript.txt` 相应主题段。
- 依赖：[视觉任务与输出](01-image-formation.md#vision-task)、[像素、坐标与通道](01-image-formation.md#pixels)
- 层级：**关卡**

分类器要让同类的不同外观仍可归为一类，让相似外观的异类可区分。多层线性映射之间加入非线性，才能表达更复杂的函数；训练通过损失的梯度更新参数。

**关卡验收（自拟）**：在简化两层网络中追踪输入、特征、分数与损失，并判断哪些量由训练更新。

<a id="channels"></a>
## 多通道卷积与参数共享

- 编号：`channels`
- 分类：**讲义内容**
- 出处：[L06 PDF](../lecture/COMP90086-06-CNNsI.pdf)，PDF p.29–46；对照 `transcript/COMP90086_2026_SM2 Week-03-F-transcript.txt` 相应主题段。
- 依赖：[卷积与互相关](02-processing.md#convolution)、[分类表示与神经网络](03-learning.md#recognition)
- 层级：**关卡**

一个普通卷积核跨越全部输入通道，先分别加权再求和，得到一个输出通道。多个核形成多个输出通道，同一核在空间共享。含偏置的参数量为 k_h k_w C_in C_out+C_out，与输出位置数不同。

**关卡验收（自拟）**：给定输入通道、核尺寸和输出通道，算参数并手工合成一个输出位置；禁止把每个 RGB 通道误算成一个独立输出。

<a id="stride"></a>
## 步幅、尺寸与感受野

- 编号：`stride`
- 分类：**讲义内容**
- 出处：[L06 PDF](../lecture/COMP90086-06-CNNsI.pdf)，PDF p.47–53；对照 `transcript/COMP90086_2026_SM2 Week-03-F-transcript.txt` 相应主题段。
- 依赖：[多通道卷积与参数共享](03-learning.md#channels)、[边界与输出尺寸](02-processing.md#padding)
- 层级：**任务**

步幅是相邻窗口在输入上移动的距离。输出长度为 floor((n+2p−k)/s)+1（无膨胀时）。多层局部运算让后层读取更大输入范围，但读取范围大不等于所有位置贡献相同。

**任务验收（自拟）**：逐层计算非正方形输入的宽高与通道，指出步幅和输出通道分别改变哪一部分。

<a id="pooling"></a>
## 最大池化与平均池化

- 编号：`pooling`
- 分类：**讲义内容**
- 出处：[L07 PDF](../lecture/COMP90086-07-CNNsII.pdf)，PDF p.6–14；对照 `transcript/COMP90086_2026_SM2 Week-04-W-transcript.txt` 相应主题段。
- 依赖：[多通道卷积与参数共享](03-learning.md#channels)
- 层级：**关卡**

池化在每个通道内压缩空间窗口。最大池化保留最大响应，平均池化保留平均值；标准池化没有可学习核参数。压缩可省计算，却会丢失位置与数值信息。

**关卡验收（自拟）**：手算池化结果并保存最大值位置；构造两张池化结果相同、原值不同的小图。

<a id="classification-loss"></a>
## Softmax 与交叉熵

- 编号：`classification-loss`
- 分类：**讲义内容**
- 出处：[L07 PDF](../lecture/COMP90086-07-CNNsII.pdf)，PDF p.25–28；对照 `transcript/COMP90086_2026_SM2 Week-04-W-transcript.txt` 相应主题段。
- 依赖：[分类表示与神经网络](03-learning.md#recognition)
- 层级：**关卡**

网络先产生类别分数，Softmax 将它们变成和为 1 的概率；交叉熵惩罚真实类别概率低的预测。分数、概率、类别编号与损失是不同对象，argmax 本身不是可用于训练的损失。

**关卡验收（自拟）**：给定概率与真值比较两次交叉熵，指出错误且高置信的预测为何损失更大。

<a id="train-split"></a>
## 训练、验证与测试

- 编号：`train-split`
- 分类：**讲义内容**
- 出处：[L07 PDF](../lecture/COMP90086-07-CNNsII.pdf)，PDF p.29、35–40；对照 `transcript/COMP90086_2026_SM2 Week-04-W-transcript.txt` 相应主题段。
- 依赖：[Softmax 与交叉熵](03-learning.md#classification-loss)
- 层级：**关卡**

训练集更新参数，验证集用于选择设置和停止时机，测试集评估最终选择。训练损失下降不保证未见数据表现改善；反复根据测试结果调参会使其失去独立评估的意义。

**关卡验收（自拟）**：把更新权重、选学习率、提前停止和最终汇报分别分配到正确数据集，并修复一个测试集调参流程。

<a id="regularisation"></a>
## 正则化、Dropout 与提前停止

- 编号：`regularisation`
- 分类：**讲义内容**
- 出处：[L07 PDF](../lecture/COMP90086-07-CNNsII.pdf)，PDF p.16–23；对照 `transcript/COMP90086_2026_SM2 Week-04-W-transcript.txt` 相应主题段。
- 依赖：[训练、验证与测试](03-learning.md#train-split)
- 层级：**任务**

L1/L2 向损失加入参数惩罚；Dropout 在训练中随机屏蔽部分激活；提前停止根据验证表现决定何时停。它们针对过拟合，不能保证所有网络或数据都受益。

**任务验收（自拟）**：从训练与验证曲线选择停止点，解释训练阶段随机丢弃和测试阶段预测的区别。

<a id="optimisation"></a>
## 批次、学习率与增强

- 编号：`optimisation`
- 分类：**讲义内容**
- 出处：[L07 PDF](../lecture/COMP90086-07-CNNsII.pdf)，PDF p.30–40；对照 `transcript/COMP90086_2026_SM2 Week-04-W-transcript.txt` 相应主题段。
- 依赖：[训练、验证与测试](03-learning.md#train-split)
- 层级：**任务**

小批次给出带噪梯度估计；学习率控制每次更新幅度。数据增强应保留当前任务的标签语义，不能因一种变换在一个数据集有用就直接套到另一任务。

**任务验收（自拟）**：为有方向含义的类别选择合法增强，并诊断学习率过大或训练过久的曲线。

<a id="receptive-field"></a>
## 小核堆叠与多尺度结构

- 编号：`receptive-field`
- 分类：**讲义内容**
- 出处：[L08 PDF](../lecture/COMP90086-08-CNNsIII.pdf)，PDF p.12–20；对照 `transcript/COMP90086_2026_SM2 Week-04-F-transcript.txt` 相应主题段。
- 依赖：[步幅、尺寸与感受野](03-learning.md#stride)
- 层级：**任务**

VGG 堆叠小核扩大感受野并加入更多非线性；Inception 并行处理不同尺度，再汇合特征。1×1 卷积在每个位置混合通道，可在昂贵空间运算前减少通道数。

**任务验收（自拟）**：比较一个 5×5 与两个 3×3 层的理论感受野和参数；计算前须说明中间通道数。

<a id="residual"></a>
## 残差连接

- 编号：`residual`
- 分类：**讲义内容**
- 出处：[L08 PDF](../lecture/COMP90086-08-CNNsIII.pdf)，PDF p.21–26；对照 `transcript/COMP90086_2026_SM2 Week-04-F-transcript.txt` 相应主题段。
- 依赖：[多通道卷积与参数共享](03-learning.md#channels)、[分类表示与神经网络](03-learning.md#recognition)
- 层级：**关卡**

残差块输出 x+F(x)，把目标写成在输入基础上的修正。恒等路径有助于信息和梯度传播，但分支形状必须相容；需要投影时不能直接逐元素相加。

**关卡验收（自拟）**：搭出可相加的两个分支，指出一个宽高或通道不匹配的失败例，并说明 F(x)=0 时输出是什么。

<a id="depthwise"></a>
## 深度可分离卷积与模型缩放

- 编号：`depthwise`
- 分类：**讲义内容**
- 出处：[L08 PDF](../lecture/COMP90086-08-CNNsIII.pdf)，PDF p.27–32；对照 `transcript/COMP90086_2026_SM2 Week-04-F-transcript.txt` 相应主题段。
- 依赖：[多通道卷积与参数共享](03-learning.md#channels)、[小核堆叠与多尺度结构](03-learning.md#receptive-field)
- 层级：**任务**

MobileNet 先逐输入通道做空间滤波，再以 1×1 卷积混合通道。这与把二维核拆为横纵核不同。EfficientNet 联合考虑深度、宽度与分辨率，不把只增加某一个维度视为唯一扩展方式。

**任务验收（自拟）**：按给定通道数比较普通卷积与 depthwise+pointwise 的参数，明确两次运算的输出形状。

<a id="transfer"></a>
## 迁移学习与微调

- 编号：`transfer`
- 分类：**讲义内容**
- 出处：[L08 PDF](../lecture/COMP90086-08-CNNsIII.pdf)，PDF p.35–48；对照 `transcript/COMP90086_2026_SM2 Week-04-F-transcript.txt` 相应主题段。
- 依赖：[训练、验证与测试](03-learning.md#train-split)、[分类表示与神经网络](03-learning.md#recognition)
- 层级：**任务**

预训练表示可以冻结后接新分类头，也可微调部分或全部层。改最后一层不意味着骨干一定更新；应明确哪些参数训练、数据是否与目标任务接近以及如何验证。

**任务验收（自拟）**：分别列出冻结骨干与全量微调的可训练参数，替换类别数后检查输出维数。

<a id="patches"></a>
## 归纳偏置与图块 token

- 编号：`patches`
- 分类：**讲义内容**
- 出处：[L09 PDF](../lecture/COMP90086-09-ViT.pdf)，PDF p.5–14；对照 `transcript/COMP90086_2026_SM2 Week-05-W-transcript.txt` 相应主题段。
- 依赖：[不变性、容忍度与等变性](01-image-formation.md#equivariance)、[多通道卷积与参数共享](03-learning.md#channels)
- 层级：**关卡**

CNN 偏向局部结构和空间共享；ViT 把图像分块后映射成向量。图块不是语义物体，一个物体可能跨多个块。切块仍带有对尺度和分组方式的假设，不是完全没有归纳偏置。

**关卡验收（自拟）**：给定图像与图块尺寸计算 token 数，并画出跨块的小物体，解释块尺寸改变的取舍。

<a id="attention"></a>
## Query、Key、Value 与自注意力

- 编号：`attention`
- 分类：**讲义内容**
- 出处：[L09 PDF](../lecture/COMP90086-09-ViT.pdf)，PDF p.15–18、20；对照 `transcript/COMP90086_2026_SM2 Week-05-W-transcript.txt` 相应主题段。
- 依赖：[归纳偏置与图块 token](03-learning.md#patches)
- 层级：**关卡**

每个 token 产生查询、键和值。查询与各键比较后归一化为权重，再加权汇总值。注意力权重随输入变化；学到的投影矩阵与每张图产生的注意力表不能混为一谈。

**关卡验收（自拟）**：对两个 token 的给定分数做归一化并加权求值，核对每行权重和，区分权重与可训练矩阵。

<a id="position"></a>
## 位置编码与 Transformer 块

- 编号：`position`
- 分类：**讲义内容**
- 出处：[L09 PDF](../lecture/COMP90086-09-ViT.pdf)，PDF p.19–24；对照 `transcript/COMP90086_2026_SM2 Week-05-W-transcript.txt` 相应主题段。
- 依赖：[Query、Key、Value 与自注意力](03-learning.md#attention)、[残差连接](03-learning.md#residual)
- 层级：**任务**

不含位置信息的注意力不能区分仅由顺序改变产生的布局。位置编码给 token 提供位置线索。ViT 编码块还含前馈网络、归一化和残差路径；分类 token 也参与信息交换。

**任务验收（自拟）**：打乱图块并追踪位置编码，解释保留与打乱位置线索的两种输入为何不同。

<a id="attention-cost"></a>
## 注意力的成本与数据取舍

- 编号：`attention-cost`
- 分类：**讲义内容**
- 出处：[L09 PDF](../lecture/COMP90086-09-ViT.pdf)，PDF p.26–34；对照 `transcript/COMP90086_2026_SM2 Week-05-W-transcript.txt` 相应主题段。
- 依赖：[Query、Key、Value 与自注意力](03-learning.md#attention)、[训练、验证与测试](03-learning.md#train-split)
- 层级：**纯文案**

全局自注意力需要计算 token 两两关系，关系表大小随 token 数平方增长。图块变小可保留细节，却增加计算。比较 ViT 与 CNN 必须说明训练数据、算力和训练流程，不能把特定实验结论当作结构永远优劣的定论。

<a id="contrastive"></a>
## 自监督与对比学习

- 编号：`contrastive`
- 分类：**讲义内容**
- 出处：[L10 PDF](../lecture/COMP90086-10-representations.pdf)，PDF p.5–9；对照 `transcript/COMP90086_2026_SM2 Week-05-F-transcript.txt` 相应主题段。
- 依赖：[Softmax 与交叉熵](03-learning.md#classification-loss)、[批次、学习率与增强](03-learning.md#optimisation)
- 层级：**关卡**

自监督从数据构造训练信号。对比学习把同一图像的不同视图作为正对，将其他样本作为对照。配对任务中的候选来自当前数据，不是固定类别；增强必须保留希望表示的语义。

**关卡验收（自拟）**：标出一批图像视图的正负配对，并检查一次错误增强怎样破坏正对假设。

<a id="clip"></a>
## CLIP 与零样本分类

- 编号：`clip`
- 分类：**讲义内容**
- 出处：[L10 PDF](../lecture/COMP90086-10-representations.pdf)，PDF p.11–17；对照 `transcript/COMP90086_2026_SM2 Week-05-F-transcript.txt` 相应主题段。
- 依赖：[自监督与对比学习](03-learning.md#contrastive)
- 层级：**任务**

图像编码器和文本编码器把配对图文放到可比较空间。零样本分类把类别写成提示文本，与图像表示比较；没有针对当前任务训练分类器，不等于从来没见过相关概念。

**任务验收（自拟）**：把候选类别写成文本并按相似度选结果，指出改提示词和分布变化可能改变预测。

<a id="interpretability"></a>
## 遮挡、CAM 与表示检查

- 编号：`interpretability`
- 分类：**讲义内容**
- 出处：[L10 PDF](../lecture/COMP90086-10-representations.pdf)，PDF p.19–30；对照 `transcript/COMP90086_2026_SM2 Week-05-F-transcript.txt` 相应主题段。
- 依赖：[分类表示与神经网络](03-learning.md#recognition)、[多通道卷积与参数共享](03-learning.md#channels)
- 层级：**任务**

可用特征邻居、遮挡后的分数变化和类别激活图检查表示。热图反映特定模型与目标类别的响应线索，不是人工真值掩码，也不能单凭一张热图证明模型推理原因。

**任务验收（自拟）**：保持图像不变而更换目标类别，比较热区，并说明为何不能直接当作实例分割结果。

<a id="robustness"></a>
## 纹理偏置与分布变化

- 编号：`robustness`
- 分类：**讲义内容**
- 出处：[L10 PDF](../lecture/COMP90086-10-representations.pdf)，PDF p.35–43；对照 `transcript/COMP90086_2026_SM2 Week-05-F-transcript.txt` 相应主题段。
- 依赖：[训练、验证与测试](03-learning.md#train-split)、[遮挡、CAM 与表示检查](03-learning.md#interpretability)
- 层级：**纯文案**

模型可能依靠纹理或数据中的捷径获得较高准确率。遮挡、扰动、形状与纹理冲突的输入帮助暴露边界；训练数据来源和评估分布决定可支持的泛化结论。

<a id="bag-features"></a>
## 视觉词袋与空间信息

- 编号：`bag-features`
- 分类：**讲义内容**
- 出处：[L09 PDF](../lecture/COMP90086-09-ViT.pdf)，PDF p.8–13；对照 `transcript/COMP90086_2026_SM2 Week-05-W-transcript.txt` 相应主题段。
- 依赖：[关键点、检测器与描述子](04-geometry.md#keypoint)、[颜色聚类、K-means 与 GMM](06-segmentation.md#clustering)
- 层级：**任务**

视觉词袋将局部外观编码成词频直方图，方便比较整图，却忽略这些外观在图中的空间排列。相似词频不保证相同物体结构；ViT 用 token 间信息交换处理不同的表示问题。

**任务验收（自拟）**：构造局部块相同但位置重排的两张图，比较词频与布局，说明需增加什么信息才能区分。

<a id="embedding-view"></a>
## PCA、t-SNE 与表示邻居

- 编号：`embedding-view`
- 分类：**讲义内容**
- 出处：[L10 PDF](../lecture/COMP90086-10-representations.pdf)，PDF p.20–23；对照 `transcript/COMP90086_2026_SM2 Week-05-F-transcript.txt` 相应主题段。
- 依赖：[分类表示与神经网络](03-learning.md#recognition)
- 层级：**任务**

高维表示可通过邻居检索或降维查看。PCA 选择方差较大的方向；t-SNE 侧重保留局部邻近关系，图上远处簇的距离不宜直接当作原空间距离。可视化分开不等于已经证明分类或泛化性能。

**任务验收（自拟）**：比较同一表示的邻居和二维图，指出哪些结论需要独立标签与评估数据验证。

<a id="classification-metrics"></a>
## 分类准确率与错误分析

- 编号：`classification-metrics`
- 分类：**讲义内容**
- 出处：[L08 PDF](../lecture/COMP90086-08-CNNsIII.pdf)，PDF p.5–10；对照 `transcript/COMP90086_2026_SM2 Week-04-F-transcript.txt` 相应主题段。
- 依赖：[训练、验证与测试](03-learning.md#train-split)
- 层级：**任务**

分类评估需说明候选类别、top-1 或 top-5、数据分布和计算成本。背景、尺寸或可见性影响错误，不同设置下的一个总准确率不能自动比较模型能力。

**任务验收（自拟）**：在给定分数排序上分别计算 top-1 与 top-5，按背景干扰、遮挡和相似类别归纳错误。

