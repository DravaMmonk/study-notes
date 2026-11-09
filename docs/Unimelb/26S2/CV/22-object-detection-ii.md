# COMP90086 Lecture 22 - Object Detection II

来源：`lecture/COMP90086-22-ObjectDetection2.pdf`（**36 页**，2026-10-26 归档的当前版）；`transcript/COMP90086_2026_SM2 Week-11-F-transcript.txt`。2026-11-03 对照复核。PDF 页脚部分编号沿用旧版，以下一律按文件实际页序引用。旧版 58 页文件保存在 `lecture/superseded/2026-10-13/`，不用于当前主线。

本讲回答：**怎样直接预测检测结果、用集合避免重复，并按类别与位置共同评估？**

学习路线：[YOLO](#topic-1) → [DETR 与集合匹配](#topic-2) → [NMS](#topic-3) → [检测匹配与 AP](#topic-4)。前置从 [框、IoU 和候选区域](21-object-detection-i.md) 开始。

<a id="topic-1"></a>
## 1. YOLO v1：从整图直接输出网格预测

![PDF 6 - YOLO v1](assets/22-object-detection-ii/slide-06.png)

从左往右看：整图经过网络，输出每个网格的类别概率以及多个框的中心、宽高和置信度。讲义的 20 类、2 框属于所展示版本；不能把它当作所有 YOLO 的固定配置。第 8 页还指出位置项权重更高、无物体网格不计算同样的类别损失，说明“直接输出”并不等于所有输出统一随便算一个误差。

单阶段省去先选 RoI 再逐个分类的步骤，却仍需同时处理分类、定位和多个候选。原版 YOLO 的网格会限制空间精度，小物体和拥挤目标更困难；这个结论按课件中的原版讨论，不推广成所有后续变体的固定缺点。[输出形状关卡](encyclopedia/07-detection.md#yolo) 先检查网络究竟输出了什么。

<a id="topic-2"></a>
## 2. DETR：预测一个集合，而非给每块区域分类

![PDF 11 - DETR architecture](assets/22-object-detection-ii/slide-11.png)

先看左侧 CNN 与 Transformer 编码器，它们把图像变成含上下文的表示；再看下方 object queries，它们是解码器使用的输出槽位。每个槽位最后输出类别与框，空余槽位输出 no object。查询不是预先命名的鸟、车或树，也不是给定的候选区域。

### 难点：集合没有固定顺序，怎样训练

第 12–14 页把真实物体与预测看作两个集合，使用一对一二分匹配决定对应，再计算损失。若图里有两匹马和一棵树，不要求输出槽位 1 必须永远负责左边的马；但同一个真值不能由多个槽位同时当成独立正确物体。

理解用例（自拟）：两个真值与三个预测，先按给定代价表找不同槽位的一对一匹配，未匹配槽位作为 no object。不能让每个真值独立选自己最喜欢的预测，导致两者占用同一槽位。[集合匹配关卡](encyclopedia/07-detection.md#set-matching) 要求实际完成分配，而非只记算法名。

原版 DETR 通过集合目标学习减少重复，因此无需把传统 NMS 当成其固定后处理步骤。课程第 15 页的比较针对原版 YOLO、DETR，后续变体不在这次主线展开。**版本纠正**：旧笔记在此处介绍 SSD 与 Mask R-CNN；当前 L22 已改为 DETR。Mask R-CNN 的现行讲义依据在 [L19 的实例分割](19-segmentation-i.md)，不继续沿用旧 L22 页码。

<a id="topic-3"></a>
## 3. NMS：只根据预测框去除重复

**动手练习 · 视觉完备：**[10-5 一只狗三个框](https://dravammonk.github.io/games/vision-complete/index.html?level=10-5)

![PDF 19 - NMS example](assets/22-object-detection-ii/slide-19.png)

蓝框分数 0.9，橙框 0.8，二者 IoU 为 0.78。阈值取课件示例的 0.7 时先保留蓝框、删除橙框，再从剩下的框中选最高分继续。被删除的框不再参与后续抑制；第 20–21 页继续演示剩余框的筛选。

NMS 通常按类别做，不需要真实框。它使用预测与预测的重叠；拥挤场景中两个真实个体也会高度重叠，可能被误删。[NMS 关卡](encyclopedia/07-detection.md#nms) 逐步记录保留列表，而不是一次性把所有互相重叠的框都丢掉。

<a id="topic-4"></a>
## 4. 先匹配真值，再计算 Precision、Recall 与 AP

**动手练习 · 视觉完备：**[10-1 重叠多少](https://dravammonk.github.io/games/vision-complete/index.html?level=10-1) · [10-6 合格的框](https://dravammonk.github.io/games/vision-complete/index.html?level=10-6) · [10-7 排名表](https://dravammonk.github.io/games/vision-complete/index.html?level=10-7) · [10-8 两类求平均](https://dravammonk.github.io/games/vision-complete/index.html?level=10-8)

按一个类别汇总整个测试集的预测，按置信度从高到低处理。每个预测只与**同一图像、同一类别且未被占用**的真值框匹配；达到评价协议的 IoU 阈值才记 TP，否则记 FP。一个真值只能被成功检测一次，重复框不能重复加分。

$$
\mathrm{Precision}=\frac{TP}{TP+FP},\qquad
\mathrm{Recall}=\frac{TP}{N_{\mathrm{GT}}}.
$$

Precision 看已报告预测有多少正确，Recall 看实际目标找到了多少。第 24–31 页例子有 3 个真值，按分数处理的结果为 TP、TP、FP、FP、TP：

| 纳入预测数 | 累计 TP | 累计 FP | Precision | Recall |
| --- | --- | --- | --- | --- |
| 1 | 1 | 0 | 1 | 1/3 |
| 2 | 2 | 0 | 1 | 2/3 |
| 3 | 2 | 1 | 2/3 | 2/3 |
| 4 | 2 | 2 | 1/2 | 2/3 |
| 5 | 3 | 2 | 3/5 | 1 |

把不同阈值的点连成 P–R 曲线，再按约定计算 AP。单点 Precision 不是 AP，最后 Recall=1 也不意味着排序没有错误。

![PDF 34 - mAP and IoU thresholds](assets/22-object-detection-ii/slide-34.png)

先看鸟、猫、狗三个类别 AP 的均值，(0.65+0.80+0.86)/3=0.77；再看下方 COCO 式评价，要对 0.50、0.55、…、0.95 十个 IoU 阈值的结果进一步平均。图中的 COCO mAP=0.45 属于给定示例，不能只用前面的三个类别数值推出来。

**易错**：NMS 阈值比较预测框之间的重叠，评价阈值比较预测与真值；两者可取不同值。具体 AP 插值、阈值边界和类别处理应固定为同一评价协议，不能只写一个“mAP”就比较所有模型。[匹配](encyclopedia/07-detection.md#detection-matching)、[P–R](encyclopedia/07-detection.md#precision-recall)、[AP](encyclopedia/07-detection.md#map) 分成三个关卡，逐级检查。

## 本讲自测

1. 三个查询、两个真值时，为什么不能把第三个查询也算成正确目标？
2. 一个低分框被 NMS 删除后，还应参与下一轮抑制吗？
3. 第二个预测重复检测已经匹配的真值时，Precision 和 Recall 如何变化？
4. 为什么 IoU、Precision 和 AP 分别回答不同的问题？

## 词条与学习任务

本讲按概念拆分的独立词条如下；出处、直接依赖和关卡／任务目标见各词条。应用实验单列在 [可选专题](encyclopedia/08-optional.md)。

[YOLO v1 的网格预测](encyclopedia/07-detection.md#yolo) · [DETR、对象查询与集合预测](encyclopedia/07-detection.md#detr) · [集合匹配损失](encyclopedia/07-detection.md#set-matching) · [非极大值抑制 NMS](encyclopedia/07-detection.md#nms) · [检测评估的一对一匹配](encyclopedia/07-detection.md#detection-matching) · [精确率、召回率与 P–R 曲线](encyclopedia/07-detection.md#precision-recall) · [AP、mAP 与评价协议](encyclopedia/07-detection.md#map)
