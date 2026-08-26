# COMP90086 Lecture 12 - Feature Matching

来源：`lecture/COMP90086_12_feature-matching.pdf`（29 页，Week 6 Lecture 2）与 `transcript/COMP90086_2026_SM2 Week-06-F-transcript.txt`（原文件 `F-transcript-5.txt`）。主要内容依照 PPT 页序；Week 6 Readings & Links 只在末尾折叠栏保留。页码为 PDF 页码，截图中的摄像头、按钮与滑块不可直接操作。

接着 [Local Features](11-features.md)：有了关键点和描述子，我们能提出“这两个点可能对应”。本讲进一步问：**能否用同一个几何变换，解释一组匹配点的位置变化？** 依次学习错误匹配、Hough 投票、RANSAC 随机采样，最后连接书封面的实例识别。

## 1. PPT 5–7：为什么外观相似还不够

![PPT 5 - Matching two views of a toy truck](assets/12-feature-matching/slide-05.png)

PPT 的玩具车在两个视角下有不同外观。**Correspondence（对应关系）** 指两个图像位置来自同一个物理点；**matching（匹配）** 是寻找这种关系的过程。

困难不只是图块看起来变了。一个点可能在另一张图里被遮挡或移出画面，根本没有可见对应；背景和重复结构又可能提供很像的假候选。Transcript 以教室里相似的桌角、座椅解释：每个局部都像，不能只靠外观确定是哪一张桌子。

因此要检查 **geometric consistency（几何一致性）**：这些候选对应点能否共同服从一个变换？本讲具体估计的是平面在不同视角下的 **homography（单应变换）**。开头的车图用于说明匹配问题，不表示整辆三维汽车都能由一个平面变换完整解释。

> **老师原话**：“Today we're going to look at planar geometry, so this is what's called a homography,”

## 2. PPT 8–9：noise 和 outlier 不是同一种错误

![PPT 8 - Noise, outliers and model fitting](assets/12-feature-matching/slide-08.png)

**Model fitting（模型拟合）** 是选择参数，让模型解释观测。此处的 model 可以只是直线，也可以是图像间的几何变换，不一定是神经网络。

- **Noise（噪声）**：关系基本正确，但测量位置有偏差，例如角点定位偏了几个像素。
- **Outlier（外点）**：根本不服从目标模型，例如把书角匹配到背景桌角。
- **Inlier（内点）**：在允许误差内支持当前模型的数据。

**Least squares（最小二乘）** 累加所有残差的平方。它可以处理合适噪声假设下的测量偏差，却容易被大误差外点拉走，因为大误差平方后影响很大。

PPT 9 引入 **voting（投票）**：让数据支持与自己相容的模型，寻找支持集中之处。Hough 和 RANSAC 共享这个思想，区别在于怎样提出候选模型。

## 3. PPT 11–12：Hough 把“找一条线”变成“找一个峰”

![PPT 12 - Image space and parameter space](assets/12-feature-matching/slide-12.png)

**Hough transform（霍夫变换）** 先把模型表示成参数，再让观测点为相容参数投票。

从熟悉的直线  $y=mx+b$  开始： $m$  是斜率， $b$  是截距。一张图中的点  $(x_i,y_i)$  可以落在许多直线上；固定这个点后，所有可行参数满足：

$$
b=y_i-mx_i.
$$

在 **image space（图像空间）** 中它是一个点，在 **parameter space（参数空间）**  $(m,b)$  中却是一条线。如果几个图像点来自同一条直线，它们在参数空间的投票轨迹会经过共同位置；那个位置就是共同直线的参数。

斜率表示在竖直线附近会变得很大。因此 PPT 改用法向式：

$$
\rho=x\cos\theta+y\sin\theta.
$$

 $\theta$  是直线**法向量**与横轴的夹角，不是直线本身与横轴的角度； $\rho$  是原点到直线沿该法向的有符号距离。对每个图像点，枚举  $\theta$ ，算出相应  $\rho$ ，它会在参数空间画出一条正弦曲线。多个共线点的曲线交于同一个  $(\theta,\rho)$ 。

所以 PPT 顶部说“参数空间里是一条线”对应前面的  $(m,b)$  表示；下方的  $(\theta,\rho)$  显示的是曲线。不要把这两个阶段混在一起。

## 4. PPT 13–15：为什么要分 bins，怎样读 accumulator

![PPT 13 - Quantised accumulator](assets/12-feature-matching/slide-13.png)

实际点有噪声，投票轨迹可能只是靠近，而不精确交于一点。解决方法是 **quantisation（量化）**：把连续参数空间分成小格 **bins**，同一格里的票累加。这个计数表叫 **accumulator（累加器）**。

**Peak（峰值）** 是局部票数较高的格子。PPT 圈出的相邻大数说明许多观测支持相近直线参数。峰值对应无限延伸的直线，线段的起止位置还需要额外处理。

![PPT 14 - Edges, accumulator and recovered lines](assets/12-feature-matching/slide-14.png)

顺着三幅图读：原图先产生边缘点；边缘点投到累加器；选出高峰并转回原图的直线／线段。边缘检测只告诉你“哪些地方有亮度变化”，Hough 才进一步组织“哪些边缘点可以属于同一条直线”。

![PPT 15 - Hough parameters](assets/12-feature-matching/slide-15.png)

| 参数 | 调得过小／过低 | 调得过大／过高 |
| --- | --- | --- |
| Bin size | 同一条线的噪声票被拆散 | 不同直线合在一起 |
| Peak threshold | 较弱的偶然聚票也可能被接受 | 真实但较弱的线消失 |
| Number of peaks | 可能漏掉其他结构 | 可能纳入弱峰 |
| Minimum length | 很短的碎片也留下 | 短的真实线段被丢弃 |
| Maximum gap | 同一线段容易断开 | 分开的片段可能被连起来 |

这些参数对应不同判断，不能只调一个“灵敏度”就解决全部问题。

## 5. PPT 16：Hough 为什么不适合直接搜索八维变换

![PPT 16 - Dimension and grid size](assets/12-feature-matching/slide-16.png)

直线需要两个参数，圆需要圆心横纵坐标与半径三个参数。每一维若用  $B$  个 bins， $d$  维累加器有  $B^d$  个格子； $B$  是每维分辨率， $d$  是独立参数数量。

PPT 的 homography 有 8 个自由度，即使每维只取 10 个 bins，也有  $10^8$  个格子。这是**参数维数增加导致网格数量爆炸**。课堂这里讲的是穷举网格式 Hough，不是说每个观测会给所有格子都投票；观测只支持与自己相容的模型。

接下来换一个办法：不预先枚举整个网格，直接让少数数据生成一个模型，再用其他数据验证。

## 6. PPT 18–19：RANSAC 的一轮到底做什么

![PPT 19 - RANSAC line-fitting loop](assets/12-feature-matching/slide-19.png)

**RANSAC** 是 RANdom SAmple Consensus，随机采样一致性。先用 PPT 的直线例子：

1. 随机抽两个不同的点。两点是确定一条直线的最小样本。
2. 计算经过这两个点的直线，即一个 **hypothesis（候选模型）**。
3. 计算每个数据点到直线的距离。
4. 距离小于阈值  $\delta$  的点投支持票，形成 **consensus set（一致集）**，也就是该模型的内点集合。
5. 如果这一轮的支持数高于当前最佳，保存它。
6. 重复若干轮，最后可用最佳模型的全部内点重新拟合，减小测量噪声影响。

抽出的两个点只负责提出模型；**评估时要看所有点**。保存的也不应该只是“穿过抽样点所以误差为零”的模型，因为任何两点都可以这样拟合。

 $\delta$  是内点阈值，不是迭代次数。对像素坐标中的几何距离，单位可以是像素；应根据正确匹配的定位误差选择。太窄会丢正确点，太宽会接收错误点。PPT 建议让正确测量以较高概率落在阈值内，例如 95%。

**Refit（重拟合）** 是用筛出的全部内点重新估计参数；它不是把已剔除的外点加回来。最初的最小样本对噪声敏感，更多可信点能帮助稳定估计。

## 7. PPT 20：需要抽多少轮，逐步推导

![PPT 20 - RANSAC iteration probability](assets/12-feature-matching/slide-20.png)

沿用 PPT 的符号： $p$  是随机点为内点的概率； $n$  是一个模型需要的最少样本数； $k$  是抽样轮数； $P$  是希望至少抽到一次全内点样本的概率。 $P$  和  $p$  不同， $n$  也不是整份数据的大小。

在课堂采用的独立抽样近似下：

$$
\Pr(\text{一轮全是内点})=p^n.
$$

一轮至少含一个外点的概率是  $1-p^n$ ；连续  $k$  轮都没有抽中全内点样本的概率是  $(1-p^n)^k$ 。所以希望：

$$
1-(1-p^n)^k\ge P.
$$

整理得到：

$$
k\ge\frac{\log(1-P)}{\log(1-p^n)},\qquad 0<p<1,\quad 0<P<1.
$$

分母为负，因此取对数后除以它时不等号方向要翻转。最后向上取整。

PPT 例子：一半点为外点，即  $p=0.5$ ；直线需要  $n=2$ ；要求  $P=0.99$ ：

$$
k\ge\frac{\log0.01}{\log0.75}\approx16.008,
$$

所以至少 **17 轮**，不能取 16。这表示“至少抽到一次全内点最小样本”的概率达到目标；不等于无条件保证最终输出正确。

<details>
<summary>延伸内容（可选）：怎样准确理解 RANSAC 的成本与保证</summary>

<p>课件把它与 Hough 对比为“不依赖参数空间维数”。准确地说，它避免了高维穷举网格，但更复杂模型通常需要更多最小样本 n；由本页公式可见，n 增大会降低单轮成功概率。每轮还要检查全部数据，因此数据量仍影响运行时间。课件“外点永远不会互相同意”的表述是理想化直觉：重复结构或另一运动物体也可能支持错误模型，阈值、模型假设及内点分布仍须检查。</p>

</details>

## 8. PPT 22–24：先用 ratio test 减少模糊匹配

![PPT 22 - Candidate descriptor matches](assets/12-feature-matching/slide-22.png)

**Instance recognition（实例识别）** 关心“是不是这一具体对象”，例如两张图里是否出现同一本书的这个封面；只认出“都是书”还不够。

先在两张图里检测 keypoints，计算 SIFT descriptors。对左图每个描述子，在右图找最近候选。PPT 的书封面例子得到 1722 个候选，画面只显示其中 150 条。即使每个点都找了“最近”的一个，也可能只是许多不合适候选里相对最近的。

![PPT 23 - Nearest-to-second-nearest distance ratio](assets/12-feature-matching/slide-23.png)

**Ratio test（距离比检验）** 比较第一名与第二名：

$$
\frac{d_1}{d_2}<r.
$$

 $d_1$  是到最近描述子的距离， $d_2$  是到次近描述子的距离， $r$  是接受阈值。距离越小越相似；比值明显小于 1，说明第一名领先较多；接近 1 则表示两个候选几乎一样好，匹配模糊。

![PPT 24 - Ratio test at 0.8](assets/12-feature-matching/slide-24.png)

PPT 用  $r=0.8$ ，从 1722 个候选留下 1156 个。原来的 563 个错误匹配中剔除 465 个，也丢掉 1159 个正确匹配中的 101 个。因此剩下  $98$  个错误、 $1058$  个正确，错误约占  $98/1156\approx8.5\%$ ，课件写作约 8%。这些是 PPT 的示例数据，不是本次重新运行的结果。

Ratio test 提高候选质量，但没有检查几何关系，仍需要 RANSAC。减少外点也能提高上一节的  $p$ ，让获得全内点样本更容易。

## 9. PPT 25–26：homography 为什么需要四对点

![PPT 25 - Transformation families and degrees of freedom](assets/12-feature-matching/slide-25.png)

**Degrees of freedom（自由度）** 是独立参数数目。沿 PPT 表格，从限制强到弱：平移 2 个，平面刚体变换 3 个，相似变换 4 个，仿射变换 6 个，投影变换 8 个。

**Affine（仿射）** 变换保持平行线仍平行；**projective transformation（投影变换）** 允许原来的平行线在图像里汇聚。斜拍书封面时，矩形可能变成梯形，因此需要更一般的平面投影模型。

![PPT 26 - Four point pairs for eight unknowns](assets/12-feature-matching/slide-26.png)

Homography 用  $3\times3$  矩阵  $H$  表示，整体倍数不改变其投影结果，因此有 8 个独立自由度。一对对应点提供目标横坐标、纵坐标两个约束；因此最少需要 **4 对对应点**，不是一共四个单独的点。

PPT 的四角示例还帮助理解应使用分散的平面点。不要把所有点挤在一条边上。这里学习平面关系；一般非平面三维场景的几何约束是后续课程内容。

## 10. PPT 27–28：把整条流水线连起来

![PPT 27 - Homography consensus and image alignment](assets/12-feature-matching/slide-27.png)

按照本讲内容：

1. 输入同一平面的两张图。
2. 分别检测关键点并计算描述子。
3. 查找描述子的第一、第二近邻，用 ratio test 筛候选。
4. RANSAC 每轮抽 4 对可用于估计的对应点，拟合 homography。
5. 用该变换预测所有候选点在另一图的位置；在几何误差阈值内的匹配支持它。
6. 保存支持最多的模型，按其内点重拟合并检查对齐结果。

**Warp（图像变换／重映射）** 是按估计关系将第一张图映射到第二张图坐标中。PPT 27 显示另一次示例运行中 193 个匹配里有 138 个支持同一个 homography，55 个被排除。它不是 PPT 24 的 1156 个匹配继续处理后的同一组数字。

PPT 参数栏给出  $\delta=3$  px、150 次迭代。这是该演示的设置，不是对所有数据都通用的推荐值。观察绿线保留、红线剔除，以及书封面是否重合，比只看“估计出矩阵”更能理解模型结果。

课程列出的应用包括实例识别、视频稳定、全景拼接、平面与消失点检测、三维重建。这些应用共享特征和鲁棒拟合思想，但不都使用同一个平面模型。

## 11. Hough 与 RANSAC 怎样比较

| 问题 | Hough | RANSAC |
| --- | --- | --- |
| 候选模型从哪里来 | 将参数空间分格搜索 | 随机最小样本生成 |
| 数据怎样支持模型 | 给相容的参数格投票 | 残差小于阈值就计为内点 |
| 本讲关键限制 | 高维网格太大 | 内点比例低或样本数大时，需要更多轮 |
| 主要参数 | bin、峰值阈值、线段设置 | 内点阈值、轮数、模型类型 |
| 本讲使用位置 | 解释直线检测与投票 | 从候选对应关系拟合平面变换 |

## 12. Week 6 Readings & Links

<details>
<summary>延伸内容（可选）：教材章节、Hough 与 RANSAC 演示</summary>

<p>课程指定可选阅读：<em>Computer Vision: Algorithms and Applications, 2nd Ed</em>，7.1、7.4、8.1 节。本次没有提供教材正文，因此仅登记章节，不将未读取内容写成课程结论。</p>

<p><a href="https://www.youtube.com/watch?v=ebfi7qOFLuo">Hough Transform Demo</a>：按课程提供的原链接保留，本次未能读取视频内容。可带着本讲的问题观看：图像中的共线点，怎样在参数空间聚成一个峰？</p>

<p><a href="https://www.visual-experiments.com/demo/ransac.js/">RANSAC demo</a>：页面给出二维直线拟合示例。它展示的评分使用截断残差累计，与 PPT 按内点数选最佳的版本存在区别；用它观察抽样与外点，不把网页伪代码当作课堂算法原文。页面可读取，交互未实测。</p>

</details>

## 本讲复习

1. 描述子外观匹配会产生外点；几何一致性检验一组匹配能否支持同一模型。
2. 噪声是正确关系的测量偏差，外点是不符合目标模型的观测。
3. Hough 将每个点映射为参数空间中的投票轨迹，再从累加器找峰。
4. 直线的法向形式是  $\rho=x\cos\theta+y\sin\theta$ ；高维网格限制了穷举 Hough。
5. RANSAC 的核心是最小采样、拟合、全体评估、保留最佳、用内点重拟合。
6. 迭代数满足  $k\ge\log(1-P)/\log(1-p^n)$ ，须向上取整。
7. Ratio test 比较最近与次近描述子距离，筛去模糊候选，但不能代替几何检验。
8. Homography 有 8 个自由度，最少需要 4 对对应点；本讲应用于平面视图。
