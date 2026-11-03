# 区域与像素分割

[词条索引与使用方法](README.md) · [专题主线与补充关](../LEARNING-PATHS.md)

每个词条注明来源与直接前置。下面的层级是学习设计，验收活动均为自拟，尚未接入游戏。

<a id="segmentation"></a>
## 区域、语义与实例分割

- 编号：`segmentation`
- 分类：**讲义内容**
- 出处：[L19 PDF](../lecture/COMP90086-19-Segmentation.pdf)，PDF p.3–8、40–42；对照 `transcript/COMP90086_2026_SM2 Week-10-W-transcript.txt` 相应主题段。
- 依赖：[视觉任务与输出](01-image-formation.md#vision-task)、[像素、坐标与通道](01-image-formation.md#pixels)
- 层级：**关卡**

区域分割给像素分组，标签可仅是编号；语义分割给类别；实例分割还区别同类的不同个体。两头牛都标成牛是语义标签，要分开计数则需实例信息。

**关卡验收（自拟）**：为两头相邻牛和草地分别构造区域、语义、实例三种输出，检查类别与个体编号。

<a id="clustering"></a>
## 颜色聚类、K-means 与 GMM

- 编号：`clustering`
- 分类：**讲义内容**
- 出处：[L19 PDF](../lecture/COMP90086-19-Segmentation.pdf)，PDF p.10–13；对照 `transcript/COMP90086_2026_SM2 Week-10-W-transcript.txt` 相应主题段。
- 依赖：[区域、语义与实例分割](06-segmentation.md#segmentation)、[光谱、三色响应与颜色空间](01-image-formation.md#colour)
- 层级：**任务**

像素可视作颜色空间中的样本。K-means 用中心和硬分配，GMM 用多个高斯成分表示分布并允许软归属。讲义用相同 K 比较示例，未展开 GMM 参数估计推导；颜色簇不能自动等同物体。

**任务验收（自拟）**：把远处相同颜色的像素放入同簇，再指出这为何不保证空间连通或属于同一物体。

<a id="mean-shift"></a>
## Mean shift 的加权均值与模式

- 编号：`mean-shift`
- 分类：**讲义内容**
- 出处：[L19 PDF](../lecture/COMP90086-19-Segmentation.pdf)，PDF p.14–24；对照 `transcript/COMP90086_2026_SM2 Week-10-W-transcript.txt` 相应主题段。
- 依赖：[颜色聚类、K-means 与 GMM](06-segmentation.md#clustering)、[像素算子与局部加权和](02-processing.md#weighted-sum)、[高斯噪声与方差相加](05-generation.md#gaussian-noise)
- 层级：**关卡**

从当前位置选邻域，以距离核计算样本加权均值，把窗口中心移过去；反复迭代至收敛，收敛到邻近密度峰的点归为同簇。它不预先指定 K，但仍需选择核与带宽。

**关卡验收（自拟）**：对一维样本做至少两次加权中心更新，区分当前位置、均值与位移向量。

<a id="bandwidth"></a>
## 空间颜色特征与带宽

- 编号：`bandwidth`
- 分类：**讲义内容**
- 出处：[L19 PDF](../lecture/COMP90086-19-Segmentation.pdf)，PDF p.25–27；对照 `transcript/COMP90086_2026_SM2 Week-10-W-transcript.txt` 相应主题段。
- 依赖：[Mean shift 的加权均值与模式](06-segmentation.md#mean-shift)、[像素、坐标与通道](01-image-formation.md#pixels)
- 层级：**关卡**

可把位置与颜色组合成 (x,y,L,a,b)，并分别控制位置和颜色的尺度。p.26 向下增大整体带宽，向右增大空间带宽相对颜色带宽。带宽控制邻域，不能把未设 K 误记为没有参数。

**关卡验收（自拟）**：固定图像比较两个带宽方向，分别记录区域合并和空间影响；先规范坐标和颜色的数值尺度。

<a id="superpixels"></a>
## 超像素与过分割

- 编号：`superpixels`
- 分类：**讲义内容**
- 出处：[L19 PDF](../lecture/COMP90086-19-Segmentation.pdf)，PDF p.29–30、35、38；对照 `transcript/COMP90086_2026_SM2 Week-10-W-transcript.txt` 相应主题段。
- 依赖：[区域、语义与实例分割](06-segmentation.md#segmentation)
- 层级：**关卡**

超像素把相邻且外观相似的像素组成小区域，通常故意把一个物体分成多块。它是压缩后续计算的中间表示，不是完整物体检测结果，也不保证每块永远不跨真实边界。

**关卡验收（自拟）**：把一张小图先过分割，区分区域编号与物体类别，并用区域数比较后续图的规模。

<a id="slic"></a>
## SLIC 的局部聚类与连通处理

- 编号：`slic`
- 分类：**讲义内容**
- 出处：[L19 PDF](../lecture/COMP90086-19-Segmentation.pdf)，PDF p.31–33；对照 `transcript/COMP90086_2026_SM2 Week-10-W-transcript.txt` 相应主题段。
- 依赖：[超像素与过分割](06-segmentation.md#superpixels)、[颜色聚类、K-means 与 GMM](06-segmentation.md#clustering)、[偏导数、梯度与边缘](02-processing.md#gradient)
- 层级：**关卡**

在网格上初始化颜色和位置中心，再移到附近低梯度点；在局部搜索范围内综合颜色差和空间差更新分组。课件以 D_lab+(α/M)D_xy 表示距离。最后需处理不连通小块，距离相近不直接保证连通。

**关卡验收（自拟）**：逐步完成一个中心的低梯度初始化、局部分配与均值更新，找出并重分配孤立小块。

<a id="rag"></a>
## 区域邻接图与合并

- 编号：`rag`
- 分类：**讲义内容**
- 出处：[L19 PDF](../lecture/COMP90086-19-Segmentation.pdf)，PDF p.36–38；对照 `transcript/COMP90086_2026_SM2 Week-10-W-transcript.txt` 相应主题段。
- 依赖：[超像素与过分割](06-segmentation.md#superpixels)
- 层级：**关卡**

RAG 以区域为节点，相邻区域连边，边权表示区域差异。可一次合并低于阈值的连接，也可每次合并最低权重边后重算。后者改变区域统计，因此下一次边权不一定沿用旧值。

**关卡验收（自拟）**：从区域图构造邻接表，完成一次最低边合并，更新区域统计与相邻边，拒绝合并不相邻同色块。

<a id="stuff-things"></a>
## 可数物体与连续材质

- 编号：`stuff-things`
- 分类：**讲义内容**
- 出处：[L19 PDF](../lecture/COMP90086-19-Segmentation.pdf)，PDF p.41；对照 `transcript/COMP90086_2026_SM2 Week-10-W-transcript.txt` 相应主题段。
- 依赖：[区域、语义与实例分割](06-segmentation.md#segmentation)
- 层级：**纯文案**

things 指人、车等可数个体，stuff 指草地、道路等连续区域。有的类别如树可按任务采用不同粒度。这个区分帮助解释为何并非每块背景都要按实例计数。

<a id="grabcut"></a>
## GrabCut 与框内前景背景

- 编号：`grabcut`
- 分类：**讲义内容**
- 出处：[L19 PDF](../lecture/COMP90086-19-Segmentation.pdf)，PDF p.43、47–49；对照 `transcript/COMP90086_2026_SM2 Week-10-W-transcript.txt` 相应主题段。
- 依赖：[颜色聚类、K-means 与 GMM](06-segmentation.md#clustering)、[区域邻接图与合并](06-segmentation.md#rag)
- 层级：**任务**

用户指定感兴趣区域，前景和背景各用 GMM 表示颜色，图划分同时考虑像素归属与边界代价；更新模型和分割反复改进。框提供目标范围，不是人工给出最终轮廓，前后景颜色相近时仍困难。

**任务验收（自拟）**：给定初始框与前背景颜色分布，解释边界经过强颜色差处的偏好，并识别一个仅靠颜色无法可靠分开的例子。

<a id="fcn"></a>
## 逐像素分类与全卷积网络

- 编号：`fcn`
- 分类：**讲义内容**
- 出处：[L20 PDF](../lecture/COMP90086-20-Segmentation2.pdf)，PDF p.8–13、26–30；对照 `transcript/COMP90086_2026_SM2 Week-10-F-transcript.txt` 相应主题段。
- 依赖：[多通道卷积与参数共享](03-learning.md#channels)、[Softmax 与交叉熵](03-learning.md#classification-loss)、[区域、语义与实例分割](06-segmentation.md#segmentation)
- 层级：**关卡**

FCN 保留空间特征图，让整图共享卷积运算，避免对每个像素的邻域重复运行分类器。1×1 卷积把位置上的特征通道转为类别分数；逐像素损失需与标签坐标对齐。

**关卡验收（自拟）**：追踪 H×W×C 特征到 H×W×K 类别分数和 H×W 标签的形状，计算一个位置的交叉熵。

<a id="encoder-decoder"></a>
## 编码解码与空间分辨率

- 编号：`encoder-decoder`
- 分类：**讲义内容**
- 出处：[L20 PDF](../lecture/COMP90086-20-Segmentation2.pdf)，PDF p.12–14、25；对照 `transcript/COMP90086_2026_SM2 Week-10-F-transcript.txt` 相应主题段。
- 依赖：[逐像素分类与全卷积网络](06-segmentation.md#fcn)、[最大池化与平均池化](03-learning.md#pooling)
- 层级：**关卡**

编码器下采样以降低计算并扩大上下文；解码器再提高输出分辨率。恢复网格大小不等于恢复所有细节，因此像素分类正确率与边界精确程度都值得检查。

**关卡验收（自拟）**：逐层标出特征宽高和通道，找出压缩中丢失的信息，解释放大尺寸后仍可能缺失边界。

<a id="unpooling"></a>
## 最大反池化

- 编号：`unpooling`
- 分类：**讲义内容**
- 出处：[L20 PDF](../lecture/COMP90086-20-Segmentation2.pdf)，PDF p.15；对照 `transcript/COMP90086_2026_SM2 Week-10-F-transcript.txt` 相应主题段。
- 依赖：[编码解码与空间分辨率](06-segmentation.md#encoder-decoder)、[最大池化与平均池化](03-learning.md#pooling)
- 层级：**关卡**

最大池化可保存每个窗口中最大值的位置。反池化把传入值放回这些位置，其余位置常置零；它没有保存原来的非最大值，不能视为池化的完整逆运算。

**关卡验收（自拟）**：从给定最大值与索引还原稀疏图，再提供两张共享这些最大值和索引的不同原图。

<a id="transpose-conv"></a>
## 转置卷积与重叠求和

- 编号：`transpose-conv`
- 分类：**讲义内容**
- 出处：[L20 PDF](../lecture/COMP90086-20-Segmentation2.pdf)，PDF p.16–24；对照 `transcript/COMP90086_2026_SM2 Week-10-F-transcript.txt` 相应主题段。
- 依赖：[编码解码与空间分辨率](06-segmentation.md#encoder-decoder)、[卷积与互相关](02-processing.md#convolution)
- 层级：**关卡**

每个输入值把加权核写到输出位置，重叠处求和，边缘按约定裁剪。把普通卷积写成矩阵乘法后，转置卷积使用对应矩阵的转置；转置不是求逆。输出尺寸仍受核、步幅和补边影响。

**关卡验收（自拟）**：手算一维输入 [1,2]、核 [1,2,1]、步幅 2、无裁剪的输出 [1,2,3,4,2]，明确重叠处相加。

<a id="unet"></a>
## U-Net 的跨尺度特征拼接

- 编号：`unet`
- 分类：**讲义内容**
- 出处：[L20 PDF](../lecture/COMP90086-20-Segmentation2.pdf)，PDF p.32–36；对照 `transcript/COMP90086_2026_SM2 Week-10-F-transcript.txt` 相应主题段。
- 依赖：[编码解码与空间分辨率](06-segmentation.md#encoder-decoder)、[转置卷积与重叠求和](06-segmentation.md#transpose-conv)
- 层级：**关卡**

U-Net 把编码器对应尺度的特征与解码器上采样特征拼接，结合早期位置细节与深层语义。拼接增加通道，和 ResNet 的逐元素相加不同。原细胞任务还对相邻细胞边界赋更大损失权重。

**关卡验收（自拟）**：把两张同宽高特征图拼接后计算通道数，检查需要裁剪或对齐的位置，并区分拼接与相加。

<a id="sam"></a>
## SAM 的提示与候选掩码

- 编号：`sam`
- 分类：**讲义内容**
- 出处：[L20 PDF](../lecture/COMP90086-20-Segmentation2.pdf)，PDF p.38–42、44–47；对照 `transcript/COMP90086_2026_SM2 Week-10-F-transcript.txt` 相应主题段。
- 依赖：[Query、Key、Value 与自注意力](03-learning.md#attention)、[编码解码与空间分辨率](06-segmentation.md#encoder-decoder)
- 层级：**任务**

SAM 把图像表示、提示表示交给掩码解码器，输出区域掩码和质量估计。点可能指物体局部或整体，因此可以产生多个候选。掩码没有自动给所有区域语义命名；示例界面的功能范围也未必等同讲义列出的提示概念。

**任务验收（自拟）**：对一个歧义点给出局部和整体两个合理掩码，区分区域选择、类别命名和候选质量排序。

<a id="mask-loss"></a>
## 分割损失与掩码质量预测

- 编号：`mask-loss`
- 分类：**讲义内容**
- 出处：[L20 PDF](../lecture/COMP90086-20-Segmentation2.pdf)，PDF p.27、34、43；对照 `transcript/COMP90086_2026_SM2 Week-10-F-transcript.txt` 相应主题段。
- 依赖：[Softmax 与交叉熵](03-learning.md#classification-loss)、[SAM 的提示与候选掩码](06-segmentation.md#sam)
- 层级：**任务**

FCN 对每个位置计算类别交叉熵，U-Net 可对重要边界加权；SAM 结合 focal 与 Dice 损失，并用实际 IoU 和预测 IoU 间的 MSE 训练质量分数。掩码损失约束像素，质量预测帮助选候选，两者目标不同。

**任务验收（自拟）**：把类别分数、二值掩码和预测质量分别连接到相应真值与损失，指出质量高不等于类别标签正确。

