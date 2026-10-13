# COMP90086 Lecture 21 - Object Detection I

来源：`lecture/COMP90086-21-ObjectDetection.pdf`（55 页）。2026-10-13 从 Canvas Week 11 导入；封面沿用 2021 年，按当前发布位置归档。Week 11 录播尚未发生，本篇是讲义预习笔记，不引用老师原话。

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

框回归预测的是对候选框的调整，而不是直接把候选框当最终答案。课件第 27 页写成：

$$
b_x=p_x+p_wt_x,\quad b_y=p_y+p_ht_y,\qquad
b_w=p_w e^{t_w},\quad b_h=p_h e^{t_h}.
$$

 $p$ 表示候选框， $b$ 表示修正后的框， $t$ 是预测的变换参数。下标 $x,y$ 表示框中心坐标， $w,h$ 表示宽高。横向移动按原宽度缩放，纵向移动按原高度缩放；宽高用指数调整，保持为正。重点是“候选位置 + 学到的修正”。

<a id="topic-3"></a>
## 3. 从 Fast 到 Faster，各快在哪里

![PDF 34 - Shared features in Fast R-CNN](assets/21-object-detection-i/slide-34.png)

图中整张图先经过一次 CNN，得到共享特征图。各 ROI 在特征图中取对应区域，再用 ROI pooling 整理成固定大小，最后分别预测类别和框。Fast R-CNN 避免了原版对每个候选框重跑 CNN，但候选区域仍来自外部方法。

![PDF 50 - Learned proposals in Faster R-CNN](assets/21-object-detection-i/slide-50.png)

从下往上读：共享特征图先送入 RPN（区域候选网络），产生候选框，再交给检测分支。RPN 在特征图各位置放置不同尺度或长宽比的参考框，预测是否有物体及框的调整。

| 方法 | 候选框从哪里来 | CNN 是否共享整图特征 |
| --- | --- | --- |
| R-CNN | Selective Search | 否，逐候选框处理 |
| Fast R-CNN | Selective Search | 是 |
| Faster R-CNN | 学习得到的 RPN | 是，候选与检测分支共享骨干 |

**易错**：RPN 的“是否有物体”与最终“是哪一类物体”是不同问题。名字中的 Faster 指候选生成也交给网络，不表示不再需要候选区域。

## 本讲自测

1. 一个框 IoU 很高，为什么仍可能是错误检测？
2. Fast R-CNN 共享了哪部分计算？
3. Faster R-CNN 相比 Fast R-CNN 改变了哪一部分？
