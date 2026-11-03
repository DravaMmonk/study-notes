# 检测、集合与评估

[词条索引与使用方法](README.md) · [专题主线与补充关](../LEARNING-PATHS.md)

每个词条注明来源与直接前置。下面的层级是学习设计，验收活动均为自拟，尚未接入游戏。

<a id="detection"></a>
## 检测框与滑动窗口

- 编号：`detection`
- 分类：**讲义内容**
- 出处：[L21 PDF](../lecture/COMP90086-21-ObjectDetection.pdf)，PDF p.6–12；对照 `transcript/COMP90086_2026_SM2 Week-11-W-transcript.txt` 相应主题段。
- 依赖：[视觉任务与输出](01-image-formation.md#vision-task)、[分类表示与神经网络](03-learning.md#recognition)
- 层级：**关卡**

检测同时报告类别和位置。滑动窗口必须考虑位置步幅、尺度与长宽比；更密搜索增加候选与计算。大量背景窗口还带来类别不平衡，分类分数阈值影响漏检与误检。

**关卡验收（自拟）**：枚举小图上的两种尺度窗口，计算候选数，说明增大步幅可能漏掉哪些目标。

<a id="iou"></a>
## 交并比 IoU

- 编号：`iou`
- 分类：**讲义内容**
- 出处：[L21 PDF](../lecture/COMP90086-21-ObjectDetection.pdf)，PDF p.13–16；对照 `transcript/COMP90086_2026_SM2 Week-11-W-transcript.txt` 相应主题段。
- 依赖：[检测框与滑动窗口](07-detection.md#detection)
- 层级：**关卡**

IoU 是交集面积除以并集面积，用于衡量两个框的重叠；并集等于两面积之和减交集。它只度量几何重合，不检查类别。课件 p.14 示例为 18/51≈0.35，须先统一框坐标与面积约定。

**关卡验收（自拟）**：对不相交、完全重合和部分重合的框算 IoU，另给出几何正确但类别错误的检测。

<a id="proposals"></a>
## 候选区域与 Selective Search

- 编号：`proposals`
- 分类：**讲义内容**
- 出处：[L21 PDF](../lecture/COMP90086-21-ObjectDetection.pdf)，PDF p.18–23；对照 `transcript/COMP90086_2026_SM2 Week-11-W-transcript.txt` 相应主题段。
- 依赖：[检测框与滑动窗口](07-detection.md#detection)、[区域邻接图与合并](06-segmentation.md#rag)
- 层级：**关卡**

候选区域只挑出可能有物体的窗口，后续才判断类别与修正边界。Selective Search 利用超像素及区域合并提出框；漏掉的物体可能使后续分类器无从补救。

**关卡验收（自拟）**：把过分割、区域合并、候选框和最终检测排列成流水线，找出一个候选阶段漏检的后果。

<a id="box-regression"></a>
## 边界框回归

- 编号：`box-regression`
- 分类：**讲义内容**
- 出处：[L21 PDF](../lecture/COMP90086-21-ObjectDetection.pdf)，PDF p.26–29；对照 `transcript/COMP90086_2026_SM2 Week-11-W-transcript.txt` 相应主题段。
- 依赖：[候选区域与 Selective Search](07-detection.md#proposals)
- 层级：**关卡**

以候选框中心和宽高为基准，预测平移和对数尺度修正：b_x=p_x+p_w t_x，b_y=p_y+p_h t_y，b_w=p_w exp(t_w)，b_h=p_h exp(t_h)。平移归一化于候选尺寸，指数保持宽高为正。

**关卡验收（自拟）**：给定候选中心 (10,20)、宽高 (8,4) 与 t_x=0.25、t_y=−0.5、t_w=t_h=0，算出新中心 (12,18) 和不变宽高。

<a id="rcnn"></a>
## R-CNN 的区域分类与训练

- 编号：`rcnn`
- 分类：**讲义内容**
- 出处：[L21 PDF](../lecture/COMP90086-21-ObjectDetection.pdf)，PDF p.21–32；对照 `transcript/COMP90086_2026_SM2 Week-11-W-transcript.txt` 相应主题段。
- 依赖：[候选区域与 Selective Search](07-detection.md#proposals)、[边界框回归](07-detection.md#box-regression)、[迁移学习与微调](03-learning.md#transfer)
- 层级：**任务**

原始 R-CNN 逐候选区域变形并运行 CNN；预训练网络先适配含背景的检测分类，再用特征训练线性 SVM 与框回归。笔记应区分这些阶段，不能把原版直接写成单一端到端分类回归训练。

**任务验收（自拟）**：画出原版训练阶段，明确 CNN、SVM、回归器分别如何取得输入，以及逐框 CNN 的重复成本。

<a id="roi-pooling"></a>
## 共享特征与 RoI pooling

- 编号：`roi-pooling`
- 分类：**讲义内容**
- 出处：[L21 PDF](../lecture/COMP90086-21-ObjectDetection.pdf)，PDF p.34–46；对照 `transcript/COMP90086_2026_SM2 Week-11-W-transcript.txt` 相应主题段。
- 依赖：[R-CNN 的区域分类与训练](07-detection.md#rcnn)、[最大池化与平均池化](03-learning.md#pooling)
- 层级：**关卡**

Fast R-CNN 先对整图算共享特征，再把每个候选映射到特征图，量化边界、划分网格并各自最大池化成固定形状。共享的是骨干计算，不是让所有候选拥有相同特征值。

**关卡验收（自拟）**：在小特征图中框选两个区域，各分成 2×2 格取最大值，检查映射与取整怎样影响边界。

<a id="rpn"></a>
## Faster R-CNN、锚框与 RPN

- 编号：`rpn`
- 分类：**讲义内容**
- 出处：[L21 PDF](../lecture/COMP90086-21-ObjectDetection.pdf)，PDF p.47–54；对照 `transcript/COMP90086_2026_SM2 Week-11-W-transcript.txt` 相应主题段。
- 依赖：[共享特征与 RoI pooling](07-detection.md#roi-pooling)、[边界框回归](07-detection.md#box-regression)
- 层级：**关卡**

RPN 在共享特征图的位置放置多尺度或比例的锚框，预测是否有物体和位置修正，再交给检测头。objectness 不是最终类别分布。Faster 把候选生成学出来，仍保留候选与检测两个阶段。

**关卡验收（自拟）**：给定特征图尺寸与每位置锚框数，算锚框总数，分别标记 objectness、回归和最终分类的输出。

<a id="yolo"></a>
## YOLO v1 的网格预测

- 编号：`yolo`
- 分类：**讲义内容**
- 出处：[L22 PDF](../lecture/COMP90086-22-ObjectDetection2.pdf)，PDF p.5–9；对照 `transcript/COMP90086_2026_SM2 Week-11-F-transcript.txt` 相应主题段。
- 依赖：[检测框与滑动窗口](07-detection.md#detection)、[边界框回归](07-detection.md#box-regression)、[Softmax 与交叉熵](03-learning.md#classification-loss)
- 层级：**关卡**

YOLO v1 不先选 RoI，而是从整图特征直接预测网格上的类别分数和框参数。讲义版本中类别概率按格子组织，每格预测多个框；20 类和 2 框只是示例设置，不是所有版本规定。

**关卡验收（自拟）**：按给定格子数、类别数与每格框数列输出形状，区分类别概率、位置参数和框置信度。

<a id="detr"></a>
## DETR、对象查询与集合预测

- 编号：`detr`
- 分类：**讲义内容**
- 出处：[L22 PDF](../lecture/COMP90086-22-ObjectDetection2.pdf)，PDF p.10–15；对照 `transcript/COMP90086_2026_SM2 Week-11-F-transcript.txt` 相应主题段。
- 依赖：[Query、Key、Value 与自注意力](03-learning.md#attention)、[位置编码与 Transformer 块](03-learning.md#position)、[检测框与滑动窗口](07-detection.md#detection)
- 层级：**关卡**

图像经 CNN 和 Transformer 编码，解码器以对象查询汇集图像信息，各输出类别与框。查询数给出最大输出槽位，未使用槽位预测 no object；不是每个查询预先绑定一个类别或某个真实物体。

**关卡验收（自拟）**：给定 3 个查询和 2 个真实物体，分配两个检测与一个 no object，打乱输出顺序仍表示同一集合。

<a id="set-matching"></a>
## 集合匹配损失

- 编号：`set-matching`
- 分类：**讲义内容**
- 出处：[L22 PDF](../lecture/COMP90086-22-ObjectDetection2.pdf)，PDF p.12–14；对照 `transcript/COMP90086_2026_SM2 Week-11-F-transcript.txt` 相应主题段。
- 依赖：[DETR、对象查询与集合预测](07-detection.md#detr)、[边界框回归](07-detection.md#box-regression)
- 层级：**关卡**

训练比较预测集合与真值集合，通过一对一二分匹配决定对应，再计算分类和框损失。它避免把输出槽位顺序当成标签；一个真实物体不能同时监督成多个独立正确检测。

**关卡验收（自拟）**：对两个真值与三个预测的给定代价表选一对一最低总代价匹配，剩余预测分配 no object；不能各行独立选同一预测。

<a id="nms"></a>
## 非极大值抑制 NMS

- 编号：`nms`
- 分类：**讲义内容**
- 出处：[L22 PDF](../lecture/COMP90086-22-ObjectDetection2.pdf)，PDF p.17–22；对照 `transcript/COMP90086_2026_SM2 Week-11-F-transcript.txt` 相应主题段。
- 依赖：[交并比 IoU](07-detection.md#iou)、[检测框与滑动窗口](07-detection.md#detection)
- 层级：**关卡**

按分数取最高框，抑制与它重叠超过阈值的低分框，再处理剩余框，通常分类别执行。输入是预测，不需真实框；拥挤物体可能互相误抑制。课程中的原版 DETR 用集合预测处理重复问题，不必把 NMS 当作所有检测器的必备层。

**关卡验收（自拟）**：按阈值处理一组预测，记录每次保留与抑制；展示某框被抑制后不再用于抑制下一框。

<a id="detection-matching"></a>
## 检测评估的一对一匹配

- 编号：`detection-matching`
- 分类：**讲义内容**
- 出处：[L22 PDF](../lecture/COMP90086-22-ObjectDetection2.pdf)，PDF p.23–31；对照 `transcript/COMP90086_2026_SM2 Week-11-F-transcript.txt` 相应主题段。
- 依赖：[交并比 IoU](07-detection.md#iou)、[非极大值抑制 NMS](07-detection.md#nms)
- 层级：**关卡**

把整个测试集某类预测按置信分数排序，在同图同类中按 IoU 协议匹配尚未占用的真实框。成功一次后该真实框不能再次贡献 TP；重复框、类别错误和定位不够都可能记 FP。

**关卡验收（自拟）**：逐项标注含重复框、错类和漏检的列表为 TP/FP，记录使用过的真值；禁止跨图匹配。

<a id="precision-recall"></a>
## 精确率、召回率与 P–R 曲线

- 编号：`precision-recall`
- 分类：**讲义内容**
- 出处：[L22 PDF](../lecture/COMP90086-22-ObjectDetection2.pdf)，PDF p.24–32；对照 `transcript/COMP90086_2026_SM2 Week-11-F-transcript.txt` 相应主题段。
- 依赖：[检测评估的一对一匹配](07-detection.md#detection-matching)
- 层级：**关卡**

Precision=TP/(TP+FP)，Recall=TP/N_GT。按分数从高到低纳入预测形成不同阈值下的曲线，单个阈值的点不能代替整条曲线。漏掉的真值使召回率不足，重复预测拉低精确率。

**关卡验收（自拟）**：对课程的 TP、TP、FP、FP、TP 顺序及 3 个真值计算五个点：(1,1/3)、(1,2/3)、(2/3,2/3)、(1/2,2/3)、(3/5,1)。

<a id="map"></a>
## AP、mAP 与评价协议

- 编号：`map`
- 分类：**讲义内容**
- 出处：[L22 PDF](../lecture/COMP90086-22-ObjectDetection2.pdf)，PDF p.31–36；对照 `transcript/COMP90086_2026_SM2 Week-11-F-transcript.txt` 相应主题段。
- 依赖：[精确率、召回率与 P–R 曲线](07-detection.md#precision-recall)
- 层级：**关卡**

AP 汇总一个类别的 P–R 表现，mAP 对类别平均。讲义的 0.65、0.80、0.86 平均为 0.77；COCO 式汇总还平均 0.50 至 0.95、步长 0.05 的 IoU 阈值。具体插值与阈值边界应随评价协议说明。

**关卡验收（自拟）**：分别算类别均值与多 IoU 均值，解释为何同名 mAP 不能脱离阈值协议比较；区分 NMS 阈值与匹配阈值。

<a id="instance-mask"></a>
## Mask R-CNN 与实例掩码

- 编号：`instance-mask`
- 分类：**讲义内容**
- 出处：[L19 PDF](../lecture/COMP90086-19-Segmentation.pdf)，PDF p.42–45；对照 `transcript/COMP90086_2026_SM2 Week-10-W-transcript.txt` 相应主题段。
- 依赖：[Faster R-CNN、锚框与 RPN](07-detection.md#rpn)、[逐像素分类与全卷积网络](06-segmentation.md#fcn)、[区域、语义与实例分割](06-segmentation.md#segmentation)
- 层级：**任务**

在候选物体区域内加入全卷积掩码预测，输出每个实例的前景区域；它连接检测和实例分割。此处依据 L19 的介绍，当前新版 L22 不再介绍该模型，不能继续把旧版 L22 页码当现行来源。

**任务验收（自拟）**：把语义分割图和每实例掩码对照，指出分类、框和实例内像素各需什么监督。

