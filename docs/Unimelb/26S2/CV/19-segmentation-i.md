# COMP90086 Lecture 19 - Image Segmentation I

来源：`lecture/COMP90086-19-Segmentation.pdf`（50 页）；`transcript/COMP90086_2026_SM2 Week-10-W-transcript.txt`（2026-10-07）；Week 11 分割练习。2026-11-03 依据本地归档复核。

本讲回答：**怎样把图像切成内部相似、彼此不同的区域？** 本讲主要从颜色和位置出发，不先要求网络认出“这是什么”。

学习路线：[分割的目标](#topic-1) → [像素聚类](#topic-2) → [超像素与合并](#topic-3)。重点是特征与相似性的选择；易错点是把“颜色相近的一块”当成“一个物体”。

<a id="topic-1"></a>
## 1. 切出区域，不等于认出类别

普通分割把图像划成区域；**语义分割**给每个像素类别，如牛、草、天空；**实例分割**还要把两头牛分别编号。

单凭颜色聚类，可能把绿色的叶子和绿色衣服分到一起，也可能把同一只动物的不同颜色分开。因此“聚类成功”不等于“物体识别成功”。本讲先建立区域，下一讲再讨论 [像素分类](20-segmentation-ii.md)。

<a id="topic-2"></a>
## 2. 重点：选哪些特征来判断像素相似

**动手练习 · 视觉完备：**[9-3 颜色分割](https://dravammonk.github.io/games/vision-complete/index.html?level=9-3)

第 10–13 页并排展示 K-means、GMM 与 Mean shift。GMM 用多个高斯成分表达颜色分布，可给软归属；课件没有展开参数估计推导。K-means 先给定簇数 $K$ ，交替把像素分给最近中心、再更新中心。只使用 RGB 时，它按颜色接近程度分组，不关心两个像素是否相邻。

![PDF 25 - Spatial and colour features](assets/19-segmentation-i/slide-25.png)

左边是原图；右边把位置和颜色一起表示，图中的 $x,y$ 是位置轴， $A$ 是 Lab 颜色中的一个分量。加入位置后，可以让空间距离也影响聚类。

**易错**： $(x,y,R,G,B)$ 是人为构造的五维特征。一个 RGB 像素的颜色值仍然是三维；位置是额外加入的信息。位置和颜色的数值尺度不同，不能忽略两者的相对权重。

### Mean shift：不断移向附近更密集的位置

Mean shift 从当前位置出发，计算附近样本的加权平均，再向平均位置移动；距离近的点通常权重大。重复后，走向同一密集区域的点归入同一簇。它用带宽控制“附近多大范围算邻居”，不要求像 K-means 那样先指定簇数。

第 23–24 页中的“shift”是**新均值减当前位置**，不是把样本直接改成某个预设中心。若当前位置为 z，邻近样本为 $z_i$，可先算：

$$
z_{\mathrm{new}}=\frac{\sum_i w_i(z)z_i}{\sum_i w_i(z)},\qquad
m(z)=z_{\mathrm{new}}-z.
$$

权重由距离核和带宽决定。重复更新至位移足够小，再把走向邻近峰的点归并；不预设 K 仍需选择带宽。练习见 [加权中心更新关卡](encyclopedia/06-segmentation.md#mean-shift)。

![PDF 26 - Mean shift bandwidth comparison](assets/19-segmentation-i/slide-26.png)

这组图要分两个方向看：向下增大整体带宽，更多细节被合并；向右增大空间带宽相对颜色带宽的比例，更远处的像素也可能互相影响。它展示了参数怎样改变区域尺度，不能只凭区域少就认定结果更好。

<a id="topic-3"></a>
## 3. 超像素：先得到小区域，再讨论合并

**超像素**是颜色等特征相似、空间相邻的一小组像素。它通常比完整物体小，是后续处理的中间表示。

课件第 31–33 页介绍 SLIC：先在规则网格初始化中心，再移到附近梯度较低的位置，避免中心直接落在强边缘。每个中心只在局部窗口比较颜色与位置差，然后更新分配与均值，迭代到中心变化较小。最后处理不连通的小块，重新分到邻近区域。颜色相似与空间连通是两个不同条件，不能省去最后这一步。距离权重和局部窗口的作用见 [SLIC 词条与关卡](encyclopedia/06-segmentation.md#slic)。

![PDF 36 - Region adjacency graph](assets/19-segmentation-i/slide-36.png)

图文中的 RAG 是“区域邻接图”：一个节点代表一块区域，只有相邻区域之间连边，边的权重记录差异。可以合并差异较小的相邻区域；合并后重新计算差异，再决定下一步。这样比逐像素处理更紧凑，也保留了区域相邻关系。

### 框内分割：GrabCut 与 Mask R-CNN

课件第 41 页先区分可数个体（things）与草地、道路这样的连续区域（stuff）。实例分割常先找到疑似物体区域，再在区域里分前景和背景。

第 43、47–49 页的 GrabCut 用前景和背景 GMM 表达颜色，再结合图上的邻接与边界代价划分像素；更新颜色模型和分割后继续迭代。用户画框只是给初始范围，不是已经画好轮廓。第 44 页的 Mask R-CNN 则在候选区域内用全卷积网络预测掩码，概念连接见 [实例掩码](encyclopedia/07-detection.md#instance-mask)。两者都可产生框内前景，训练与推理方式却不同，不能统称为颜色聚类。

## Workshop 连接

`workshop/week-11/worksheet11.ipynb` 包含 K-means、Mean shift、超像素和图方法；答案 `worksheet11_solution.ipynb` 已在本地。Normalized cut 的具体实验仅在 [可选专题](encyclopedia/08-optional.md#normalised-cut-practice) 展开。`worksheet11-old-24.ipynb` 是另一个 Canvas 页面仍链接的旧版，单独保留。比较结果时固定同一张图，观察参数改变的是边界、区域数量还是颜色，不把“更平滑”直接等同于“更正确”。

## 本讲自测

1. 只用 RGB 聚类为什么可能把远处的两个物体连在同一类？
2. 超像素和完整物体之间是什么关系？
3. 为什么合并区域后，RAG 的边权可能需要重算？

## 词条与学习任务

本讲按概念拆分的独立词条如下；出处、直接依赖和关卡／任务目标见各词条。应用实验单列在 [可选专题](encyclopedia/08-optional.md)。

[区域、语义与实例分割](encyclopedia/06-segmentation.md#segmentation) · [颜色聚类、K-means 与 GMM](encyclopedia/06-segmentation.md#clustering) · [Mean shift 的加权均值与模式](encyclopedia/06-segmentation.md#mean-shift) · [空间颜色特征与带宽](encyclopedia/06-segmentation.md#bandwidth) · [超像素与过分割](encyclopedia/06-segmentation.md#superpixels) · [SLIC 的局部聚类与连通处理](encyclopedia/06-segmentation.md#slic) · [区域邻接图与合并](encyclopedia/06-segmentation.md#rag) · [可数物体与连续材质](encyclopedia/06-segmentation.md#stuff-things) · [GrabCut 与框内前景背景](encyclopedia/06-segmentation.md#grabcut) · [Mask R-CNN 与实例掩码](encyclopedia/07-detection.md#instance-mask)
