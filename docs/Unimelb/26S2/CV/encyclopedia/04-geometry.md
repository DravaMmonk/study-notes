# 匹配与三维几何

[词条索引与使用方法](README.md) · [专题主线与补充关](../LEARNING-PATHS.md)

每个词条注明来源与直接前置。下面的层级是学习设计，验收活动均为自拟，尚未接入游戏。

<a id="keypoint"></a>
## 关键点、检测器与描述子

- 编号：`keypoint`
- 分类：**讲义内容**
- 出处：[L11 PDF](../lecture/COMP90086-11-features.pdf)，PDF p.6–11、24–25；对照 `transcript/COMP90086_2026_SM2 Week-06-W-transcript.txt` 相应主题段。
- 依赖：[偏导数、梯度与边缘](02-processing.md#gradient)、[不变性、容忍度与等变性](01-image-formation.md#equivariance)
- 层级：**关卡**

检测器选择容易重复找到的位置；描述子编码附近外观以便比较。平坦区域没有定位依据，长直边只能约束垂直方向的移动，角点通常能同时约束两个方向。

**关卡验收（自拟）**：在平坦、直边和角点三个窗口中分别移动，记录哪些方向变化小；区分选点与匹配的步骤。

<a id="harris"></a>
## 结构张量与 Harris 角点

- 编号：`harris`
- 分类：**讲义内容**
- 出处：[L11 PDF](../lecture/COMP90086-11-features.pdf)，PDF p.12–21；对照 `transcript/COMP90086_2026_SM2 Week-06-W-transcript.txt` 相应主题段。
- 依赖：[关键点、检测器与描述子](04-geometry.md#keypoint)、[像素算子与局部加权和](02-processing.md#weighted-sum)
- 层级：**关卡**

小位移的窗口平方差可近似为位移向量与梯度二次型。结构矩阵的两个特征值反映两个方向的变化。Harris 用 det(M)−k trace(M)² 评分；平方差不能为负，但 Harris 分数可以。

**关卡验收（自拟）**：从给定梯度算矩阵与分数，区分两特征值都小、仅一个大、两个都大的窗口，再做局部峰值筛选。

<a id="sift"></a>
## SIFT 描述与尺度方向对齐

- 编号：`sift`
- 分类：**讲义内容**
- 出处：[L11 PDF](../lecture/COMP90086-11-features.pdf)，PDF p.25–29；对照 `transcript/COMP90086_2026_SM2 Week-06-W-transcript.txt` 相应主题段。
- 依赖：[关键点、检测器与描述子](04-geometry.md#keypoint)、[偏导数、梯度与边缘](02-processing.md#gradient)
- 层级：**任务**

SIFT 汇总局部梯度方向直方图。讲义示例用 4×4 个空间格、每格 8 个方向，得到 128 维；多尺度检测与主方向对齐帮助处理尺度和旋转变化，能力不能简化为对所有形变严格不变。

**任务验收（自拟）**：按格子和方向数计算维度，说明为什么只有检测位置还不足以跨视图找到同一点。

<a id="outlier"></a>
## 噪声、外点与几何一致性

- 编号：`outlier`
- 分类：**讲义内容**
- 出处：[L12 PDF](../lecture/COMP90086_12_feature-matching.pdf)，PDF p.5–9；对照 `transcript/COMP90086_2026_SM2 Week-06-F-transcript.txt` 相应主题段。
- 依赖：[SIFT 描述与尺度方向对齐](04-geometry.md#sift)
- 层级：**关卡**

噪声是正确对应附近的小偏差；外点是错误对应。描述子相似只提供候选，空间排列还必须满足几何模型。用所有候选直接做最小二乘，可能被少量严重外点拉偏。

**关卡验收（自拟）**：从带标注的小匹配集中区分小偏差与错配，指出何者违反共同几何关系。

<a id="hough"></a>
## Hough 参数空间投票

- 编号：`hough`
- 分类：**讲义内容**
- 出处：[L12 PDF](../lecture/COMP90086_12_feature-matching.pdf)，PDF p.11–16；对照 `transcript/COMP90086_2026_SM2 Week-06-F-transcript.txt` 相应主题段。
- 依赖：[偏导数、梯度与边缘](02-processing.md#gradient)、[噪声、外点与几何一致性](04-geometry.md#outlier)
- 层级：**关卡**

图像中的点向所有经过它的候选直线投票，参数空间峰值对应共同支持的模型。分箱过细会分散噪声点的票，过粗会混合不同直线；参数维数高时穷举网格成本增长很快。

**关卡验收（自拟）**：为几个点画参数空间票，改变分箱后比较峰值，并解释为何不穷举八维单应参数。

<a id="ransac"></a>
## RANSAC 与采样次数

- 编号：`ransac`
- 分类：**讲义内容**
- 出处：[L12 PDF](../lecture/COMP90086_12_feature-matching.pdf)，PDF p.18–20；对照 `transcript/COMP90086_2026_SM2 Week-06-F-transcript.txt` 相应主题段。
- 依赖：[噪声、外点与几何一致性](04-geometry.md#outlier)
- 层级：**关卡**

反复抽最小样本拟合模型，用残差阈值计内点，保留支持多的模型后再拟合。若内点率为 w、每轮需 n 点，独立采样下成功概率为 1−(1−wⁿ)^k；退化样本仍不能建立有效模型。

**关卡验收（自拟）**：给定内点率、最小样本数与目标成功率算轮数，再对一组候选执行抽样、计数与内点重拟合。

<a id="ratio-test"></a>
## 描述子比值检验

- 编号：`ratio-test`
- 分类：**讲义内容**
- 出处：[L12 PDF](../lecture/COMP90086_12_feature-matching.pdf)，PDF p.22–24；对照 `transcript/COMP90086_2026_SM2 Week-06-F-transcript.txt` 相应主题段。
- 依赖：[SIFT 描述与尺度方向对齐](04-geometry.md#sift)
- 层级：**任务**

比较最近候选距离与次近距离的比值，拒绝最佳和次佳几乎一样的模糊对应。比值小表示相对突出，不证明几何正确，仍需 RANSAC 等后续检查。

**任务验收（自拟）**：在两组距离上应用相同阈值，保留相对明确的对应，并找出一个仍需几何排除的错配。

<a id="homography"></a>
## 平面单应变换

- 编号：`homography`
- 分类：**讲义内容**
- 出处：[L12 PDF](../lecture/COMP90086_12_feature-matching.pdf)，PDF p.25–28；对照 `transcript/COMP90086_2026_SM2 Week-06-F-transcript.txt` 相应主题段。
- 依赖：[RANSAC 与采样次数](04-geometry.md#ransac)、[描述子比值检验](04-geometry.md#ratio-test)
- 层级：**关卡**

单应用一个只定义到整体比例的 3×3 矩阵映射平面两视图，有八个自由度，通常需四对非退化对应建立。一般三维场景有深度变化时，不能强行让一个单应解释所有点。

**关卡验收（自拟）**：选择四对非退化平面点估计模型，检验额外点；把突出平面的点作为模型边界案例。

<a id="depth-cues"></a>
## 单视图深度线索

- 编号：`depth-cues`
- 分类：**讲义内容**
- 出处：[L13 PDF](../lecture/COMP90086_13_depth-stereo.pdf)，PDF p.5–8；对照 `transcript/COMP90086_2026_SM2 Week-07-W-transcript.txt` 相应主题段。
- 依赖：[针孔投影与深度歧义](01-image-formation.md#projection)
- 层级：**任务**

透视、遮挡、相对大小、纹理与明暗提供深度线索，但依赖物体大小、表面或光照等假设。单张图可以支持合理猜测，却不自动提供唯一绝对距离。

**任务验收（自拟）**：为同一投影给出两种不同尺度场景，指出遮挡能说明前后关系但未必给出米制距离。

<a id="disparity"></a>
## 校正双目的视差与深度

- 编号：`disparity`
- 分类：**讲义内容**
- 出处：[L13 PDF](../lecture/COMP90086_13_depth-stereo.pdf)，PDF p.10–13；对照 `transcript/COMP90086_2026_SM2 Week-07-W-transcript.txt` 相应主题段。
- 依赖：[针孔投影与深度歧义](01-image-formation.md#projection)
- 层级：**关卡**

在对齐且焦距一致的双目设置中，视差 d 为同一点横向位置差，深度 Z=fb/d。焦距与视差要用一致图像单位，基线与深度用一致长度单位。视差误差会在远处产生更大深度误差。

**关卡验收（自拟）**：手算两组视差的深度与一像素误差影响；先核对焦距、基线及左右坐标约定。

<a id="stereo-matching"></a>
## 双目窗口代价与全局约束

- 编号：`stereo-matching`
- 分类：**讲义内容**
- 出处：[L13 PDF](../lecture/COMP90086_13_depth-stereo.pdf)，PDF p.15–24；对照 `transcript/COMP90086_2026_SM2 Week-07-W-transcript.txt` 相应主题段。
- 依赖：[校正双目的视差与深度](04-geometry.md#disparity)、[噪声、外点与几何一致性](04-geometry.md#outlier)
- 层级：**关卡**

沿对应行比较窗口，用 SSD 或归一化相关等代价选候选。平坦、重复、遮挡和高光各有不同失败原因。平滑性等全局项让相邻答案协调，但深度边界不能一律抹平。

**关卡验收（自拟）**：在重复纹理和遮挡的例子中输出候选代价，标记无可靠对应的位置，而非强制每点得到正确深度。

<a id="learned-depth"></a>
## 监督与双目自监督深度

- 编号：`learned-depth`
- 分类：**讲义内容**
- 出处：[L13 PDF](../lecture/COMP90086_13_depth-stereo.pdf)，PDF p.27–30；对照 `transcript/COMP90086_2026_SM2 Week-07-W-transcript.txt` 相应主题段。
- 依赖：[双目窗口代价与全局约束](04-geometry.md#stereo-matching)、[训练、验证与测试](03-learning.md#train-split)
- 层级：**任务**

可用测量深度训练逐像素预测，也可利用双目重建提供监督。后者没有深度标签，仍依赖图像对与相机几何。单图推理的尺度和泛化受到训练设置约束。

**任务验收（自拟）**：区分训练所需图像与推理输入，检查绝对尺度来自哪里，以及遮挡为何影响重建损失。

<a id="homogeneous"></a>
## 齐次点、直线与叉积

- 编号：`homogeneous`
- 分类：**讲义内容**
- 出处：[L14 PDF](../lecture/COMP90086_14_two-view-geometry.pdf)，PDF p.6–8；对照 `transcript/COMP90086_2026_SM2 Week-07-F-transcript.txt` 相应主题段。
- 依赖：[像素、坐标与通道](01-image-formation.md#pixels)
- 层级：**关卡**

平面点 (x,y) 可写为 (x,y,1)，非零整体缩放表示同一点；一般坐标需除以最后一项。直线系数 l 满足 lᵀp=0。叉积可求过两点的线或两线交点，最后一项为零时不能普通除法。

**关卡验收（自拟）**：计算两点的连线和两线交点，验证点在线上，并处理平行线的无穷远交点。

<a id="calibration"></a>
## 相机内参、外参与标定

- 编号：`calibration`
- 分类：**讲义内容**
- 出处：[L14 PDF](../lecture/COMP90086_14_two-view-geometry.pdf)，PDF p.10–13；对照 `transcript/COMP90086_2026_SM2 Week-07-F-transcript.txt` 相应主题段。
- 依赖：[齐次点、直线与叉积](04-geometry.md#homogeneous)、[针孔投影与深度歧义](01-image-formation.md#projection)
- 层级：**关卡**

相机矩阵可写 K[R|t]：内参把相机坐标投影到像素坐标，外参把世界坐标转到相机坐标。多姿态的已知平面图案可用于标定；一次变换必须说明坐标方向。

**关卡验收（自拟）**：把焦距、主点、旋转和平移归到正确矩阵，追踪一个世界点到像素坐标。

<a id="epipolar"></a>
## 极平面、极点与极线

- 编号：`epipolar`
- 分类：**讲义内容**
- 出处：[L14 PDF](../lecture/COMP90086_14_two-view-geometry.pdf)，PDF p.18–22；对照 `transcript/COMP90086_2026_SM2 Week-07-F-transcript.txt` 相应主题段。
- 依赖：[相机内参、外参与标定](04-geometry.md#calibration)
- 层级：**关卡**

两个光心与一个空间点确定极平面，平面分别与两幅图像相交形成极线。知道一个像点，另一图的对应点被限制在一条线上，却没有唯一位置。极点是另一个光心的投影。

**关卡验收（自拟）**：给定相机与点画出极平面及两条极线，说明它怎样把二维搜索缩为一维。

<a id="fundamental"></a>
## 本质矩阵与基础矩阵

- 编号：`fundamental`
- 分类：**讲义内容**
- 出处：[L14 PDF](../lecture/COMP90086_14_two-view-geometry.pdf)，PDF p.20–26；对照 `transcript/COMP90086_2026_SM2 Week-07-F-transcript.txt` 相应主题段。
- 依赖：[极平面、极点与极线](04-geometry.md#epipolar)、[RANSAC 与采样次数](04-geometry.md#ransac)
- 层级：**关卡**

本质矩阵 E 作用于归一化相机坐标；基础矩阵 F 作用于像素齐次坐标，满足 p′ᵀFp=0。Fp 是另一图中的极线系数。八点法建立线性方程，还要归一化坐标并施加秩约束。

**关卡验收（自拟）**：分别对归一化坐标和像素坐标选择 E 或 F，计算极线与点线残差，拒绝把 Fp 当作对应像点。

<a id="rectification"></a>
## 双目校正、三角化与退化

- 编号：`rectification`
- 分类：**讲义内容**
- 出处：[L14 PDF](../lecture/COMP90086_14_two-view-geometry.pdf)，PDF p.16、28–31；对照 `transcript/COMP90086_2026_SM2 Week-07-F-transcript.txt` 相应主题段。
- 依赖：[本质矩阵与基础矩阵](04-geometry.md#fundamental)、[校正双目的视差与深度](04-geometry.md#disparity)、[平面单应变换](04-geometry.md#homography)
- 层级：**任务**

校正用图像变换把极线整理成便于同行搜索的形式。已知相机运动后可三角化；一般单目两视图恢复仍有尺度歧义。纯旋转缺少基线，平面场景也需识别模型退化。

**任务验收（自拟）**：判断纯旋转能否测深，区分校正改变的图像坐标和真实相机位置，再指出三角化所需信息。

