# COMP90086 Lecture 21 - Object Detection I

来源：`lecture/COMP90086-21-ObjectDetection.pdf`（55 页，2026-10-26 归档的当前版）；`transcript/COMP90086_2026_SM2 Week-11-W-transcript.txt`。2026-11-03 复核；转写开头先续讲 SAM，随后才进入检测。本篇不再标为预习。以下使用 PDF 页码，封面年份与版权年份分开看。

本讲回答：**除了知道图里有什么，怎样指出每个物体在哪里？**

学习路线：[框与 IoU](#topic-1) → [R-CNN](#topic-2) → [Fast 与 Faster R-CNN](#topic-3)。重点是三种方法分别减少了哪一步的计算。

<a id="topic-1"></a>
## 1. 检测需要类别，也需要位置

检测器输出物体类别、置信分数和边界框。最直接的办法是用不同大小、位置的窗口扫描图像，判断每个窗口里是否存在目标；窗口越多，重复计算越严重。

![PDF 14 - Bounding-box overlap](assets/21-object-detection-i/slide-14.png)

图中的两个框没有完全重合。交集是两框共同覆盖的区域，并集是至少被其中一个框覆盖的区域：

$$
\operatorname{IoU}(A,B)=\frac{|A\cap B|}{|A\cup B|}.
$$

本例交集面积为 18，并集为 51，所以 IoU 约为 0.35。IoU 越大表示框的位置越接近；它不检查类别是否判断正确。检测评价还要同时检查类别和框的匹配。

<a id="topic-2"></a>
## 2. R-CNN：先找值得检查的区域

R-CNN 用候选区域（region proposals）缩小搜索范围。先通过 Selective Search 提出可能包含物体的框，再逐框调整尺寸、提取 CNN 特征，做类别判断和位置修正。

### 先分清原版的训练阶段

第 28 页的原版 R-CNN 先从 ImageNet 预训练 CNN 开始，将分类层改成物体类别加背景并适配检测区域；再把提取的特征用于逐类线性 SVM 和类别特定的框回归。不能把原版的整套训练压成一个现代的端到端检测头。候选框中背景很多，课件还用采样比例说明类别不平衡。

框回归预测的是对候选框的调整，而不是直接把候选框当最终答案。课件第 27 页写成：

$$
b_x=p_x+p_wt_x,\quad b_y=p_y+p_ht_y,\qquad
b_w=p_w e^{t_w},\quad b_h=p_h e^{t_h}.
$$

 $p$ 表示候选框， $b$ 表示修正后的框， $t$ 是预测的变换参数。下标 $x,y$ 表示框中心坐标， $w,h$ 表示宽高。横向移动按原宽度缩放，纵向移动按原高度缩放；宽高用指数调整，保持为正。重点是“候选位置 + 学到的修正”。

<a id="topic-3"></a>
## 3. 从 Fast 到 Faster，各快在哪里

![PDF 34 - Shared features in Fast R-CNN](assets/21-object-detection-i/slide-34.png)

图中整张图先经过一次 CNN，得到共享特征图。各 ROI 在特征图中取对应区域，再用 ROI pooling 整理成固定大小，最后分别预测类别和框。Fast R-CNN 避免了原版对每个候选框重跑 CNN，但候选区域仍来自外部方法。第 39–40 页的 RoI pooling 先把像素框映射到特征网格，取整后分箱，再在各箱做最大池化。它得到统一尺寸，却可能丢失精细位置；“共享整图特征”也不代表不同框的池化结果相同。

![PDF 50 - Learned proposals in Faster R-CNN](assets/21-object-detection-i/slide-50.png)

从下往上读：共享特征图先送入 RPN（区域候选网络），产生候选框，再交给检测分支。RPN 在特征图各位置放置不同尺度或长宽比的参考框，预测是否有物体及框的调整。

| 方法 | 候选框从哪里来 | CNN 是否共享整图特征 |
| --- | --- | --- |
| R-CNN | Selective Search | 否，逐候选框处理 |
| Fast R-CNN | Selective Search | 是 |
| Faster R-CNN | 学习得到的 RPN | 是，候选与检测分支共享骨干 |

第 53 页补充 RPN 的两个训练目标：是否有物体使用二元交叉熵，框修正使用 Smooth L1。整个模型还包括 Fast R-CNN 的检测分支；共享骨干不意味着所有损失或输出都是同一种量。

**易错**：RPN 的“是否有物体”与最终“是哪一类物体”是不同问题。名字中的 Faster 指候选生成也交给网络，不表示不再需要候选区域。

## 本讲自测

1. 一个框 IoU 很高，为什么仍可能是错误检测？
2. Fast R-CNN 共享了哪部分计算？
3. Faster R-CNN 相比 Fast R-CNN 改变了哪一部分？

## 词条与学习任务

本讲按概念拆分的独立词条如下；出处、直接依赖和关卡／任务目标见各词条。应用实验单列在 [可选专题](encyclopedia/08-optional.md)。

[检测框与滑动窗口](encyclopedia/07-detection.md#detection) · [交并比 IoU](encyclopedia/07-detection.md#iou) · [候选区域与 Selective Search](encyclopedia/07-detection.md#proposals) · [边界框回归](encyclopedia/07-detection.md#box-regression) · [R-CNN 的区域分类与训练](encyclopedia/07-detection.md#rcnn) · [共享特征与 RoI pooling](encyclopedia/07-detection.md#roi-pooling) · [Faster R-CNN、锚框与 RPN](encyclopedia/07-detection.md#rpn)
