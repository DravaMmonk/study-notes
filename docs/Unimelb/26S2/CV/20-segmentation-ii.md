# COMP90086 Lecture 20 - Image Segmentation II

来源：`lecture/COMP90086-20-Segmentation2.pdf`（47 页）；`transcript/COMP90086_2026_SM2 Week-10-F-transcript.txt`（2026-10-09）；Week 11 分割练习。2026-11-03 依据本地归档复核，SAM 还对照 Week-11-W 开头的续讲；以下使用 PDF 页码。

本讲回答：**怎样让网络给每一个像素预测类别，并保留物体边界？**

学习路线：[编码与解码](#topic-1) → [上采样](#topic-2) → [U-Net](#topic-3) → [SAM](#topic-4)。重点是空间分辨率与语义信息的关系；难点是上采样不等于找回全部原始信息。

<a id="topic-1"></a>
## 1. 从整图分类变成逐像素分类

分类网络通常给整张图一个类别；语义分割要输出一张与输入位置对应的类别图。若为每个像素单独裁剪一块图再运行网络，会重复计算大量相邻内容。

FCN（全卷积网络）让整张图共享卷积计算，保留空间特征图。最后可以用 $1\times1$ 卷积把每个位置的特征通道转成各类别分数；它混合通道信息，不是把整幅图压成一个像素。

![PDF 13 - Encoder and decoder](assets/20-segmentation-ii/slide-13.png)

沿图从左向右看：编码器降低宽高，提取较大范围的信息；解码器再扩大特征图，输出右侧的像素类别。图中 $D_1,D_2,D_3$ 表示通道数，和图像宽高是不同的量。

训练时每个有标签的位置都可计算类别预测的交叉熵。预测图要保持与标签图的位置对应，整图类别预测正确并不能替代像素边界正确。

<a id="topic-2"></a>
## 2. 难点：怎样把特征图放大

插值按固定规则补出中间位置；max unpooling 利用池化时记住的最大值位置，把传入值放回对应位置，其余位置常置零；转置卷积用可学习的权重生成输出。**反池化的索引只记录最大值曾在哪里，没有记录其余原始值。** 因此不同输入可得到相同池化值和索引，反池化并不是完整逆过程。第 15 页对应的 [索引还原任务](encyclopedia/06-segmentation.md#unpooling) 独立于转置卷积，不省略。

![PDF 23 - Transposed convolution as a matrix operation](assets/20-segmentation-ii/slide-23.png)

看左、右矩阵的形状：普通卷积可以写成矩阵乘法，转置卷积使用相应矩阵的转置，输入输出的连接方向交换了。**转置不是求逆**，所以它不保证把降采样之前丢掉的细节还原出来。

第 19–21 页的操作顺序是：每个输入值乘整个核，把结果写到输出网格；不同输入贡献重叠时**相加**；再按规定处理边缘。理解用例（自拟）：输入 [1,2]、核 [1,2,1]、步幅 2，无裁剪时两次贡献是 [1,2,1,0,0] 与 [0,0,2,4,2]，输出 [1,2,3,4,2]。这既不是简单复制输入，也不是重叠处取平均。

课件示例展示的是连接关系。实际输出尺寸还受 stride、padding 和 kernel 等参数影响，不能只凭名字断定一定放大几倍。

<a id="topic-3"></a>
## 3. U-Net：把早期的定位信息送回来

![PDF 33 - U-Net architecture](assets/20-segmentation-ii/slide-33.png)

U 形左侧逐步下采样，右侧逐步上采样。横向灰箭头把编码器中对应尺度的特征送到解码器，与上采样结果拼接。底部特征帮助理解较大范围的内容，横向传来的特征帮助确定细节位置。

**易错**：这里的 skip connection 是特征拼接，不应自动理解成 ResNet 中逐元素相加。课件第 34 页还用细胞之间的边界加权，说明损失函数可以强调特别重要、容易混淆的位置。

<a id="topic-4"></a>
## 4. SAM：用户提示决定想分出哪一块

![PDF 39 - SAM architecture](assets/20-segmentation-ii/slide-39.png)

图像进入 image encoder，点、框等提示进入 prompt encoder，二者送给 mask decoder，输出候选掩码。掩码表达“哪些像素属于所指区域”，不等于自动给所有区域命名。

老师在 10 月 9 日录播开头用收据演示：点击一张收据，可以得到对应区域；相邻收据颜色很接近、边缘不明显时仍会出错。这说明提示缩小了目标范围，但不能保证边界完全正确。

一个点也可能指物体的一部分或整个物体。课件第 42 页通过多个候选输出处理这种歧义。读示意图时要区分图中支持的提示概念与具体演示界面实际开放的功能。

### 补足损失与输出质量

第 27 页的像素交叉熵直接约束类别预测；第 34 页用加权交叉熵强调细胞边界；第 43 页的 SAM 把掩码学习与质量评分分开：掩码用 focal 与 Dice 组合，质量分支学习预测 IoU。两类输出的真值与用途不同，详见 [损失词条](encyclopedia/06-segmentation.md#mask-loss)。这里保留课件的作用层面说明，不把一句“物体比背景重要”当成通用 focal loss 的完整定义。

## 本讲自测

1. 编码器压低分辨率有什么好处，又会损失什么？
2. 为什么转置卷积不能保证恢复原图？
3. 给 SAM 一个点，与要求网络给所有像素分类，有什么不同？

## 词条与学习任务

本讲按概念拆分的独立词条如下；出处、直接依赖和关卡／任务目标见各词条。应用实验单列在 [可选专题](encyclopedia/08-optional.md)。

[逐像素分类与全卷积网络](encyclopedia/06-segmentation.md#fcn) · [编码解码与空间分辨率](encyclopedia/06-segmentation.md#encoder-decoder) · [最大反池化](encyclopedia/06-segmentation.md#unpooling) · [转置卷积与重叠求和](encyclopedia/06-segmentation.md#transpose-conv) · [U-Net 的跨尺度特征拼接](encyclopedia/06-segmentation.md#unet) · [SAM 的提示与候选掩码](encyclopedia/06-segmentation.md#sam) · [分割损失与掩码质量预测](encyclopedia/06-segmentation.md#mask-loss)
