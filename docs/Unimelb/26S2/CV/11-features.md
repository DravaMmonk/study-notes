# COMP90086 Lecture 11 - Local Features

来源：`lecture/COMP90086-11-features.pdf`（31 页，Week 6 Lecture 1）与 `transcript/COMP90086_2026_SM2 Week-06-W-transcript.txt`（原文件 `W-transcript-5.txt`）。封面沿用 Semester 2, 2025 字样；按本次课程、Week 标题与讲课内容归档至 2026 Week 6。页码均为 PDF 页码，交互画面在 PDF 中为静态截图。

从 [Representation Learning](10-representations.md) 转到几何：上一讲问图里“有什么”，这一讲开始问“同一个位置，换张照片还能找到吗”。**先检测值得找的点，再描述点周围的外观。** Harris 的推导是本讲重点，SIFT 则解释怎样让描述在图像变化后仍可比较。

学习路线：[哪些点容易再找到](#topic-1) → [Harris 从位移代价到角点](#topic-2) → [检测的边界与其他评分](#topic-3) → [SIFT 怎样便于比较](#topic-4)。

重点：角点的两方向变化、Harris 评分、SIFT 描述。难点：位移代价到矩阵与特征值的连接。易错：强梯度不等于角点，128 维不等于 128 个点。

<a id="topic-1"></a>
## 1. 选择位置：哪些点容易再找到

### 局部特征还要不要保留位置

![PPT 6 - Three uses of local features](assets/11-features/slide-06.png)

**Local 特征（局部特征）** 描述图像一小片区域的外观。PPT 把使用方式分成三类：

- **Bag of 词语 / bag of 特征（视觉词袋／特征袋）**：汇总有哪些局部特征，忽略精确位置。
- **Spatial pyramid（空间金字塔）**：保留大致区域关系；本讲只提及，不展开算法。
- **Explicit spatial relations（显式空间关系）**：保留特征之间的几何关系，用于关键点跟踪与匹配。PPT 也列出 deformable-部件 models（可变形部件模型），这里只需知道它建模部件位置关系。

这些方法的差别不只是“提取哪种特征”，还在于“提取后保留多少位置”。要将两张照片对齐，不能只知道都有几个相似图块，还得知道它们分别在哪里。

> **老师原话**：“We're going to use the where in a geometry sense.”
>
> **理解**：后面不仅保存描述子，也要保存它在图中的位置，否则无法建立两张照片的几何关系。

### 什么点值得被反复找到

![PPT 10 - Shift a window over the flower garden](assets/11-features/slide-10.png)

**Dense（稠密）** 方法在每个位置计算特征；**Sparse（稀疏）** 方法只选择少量点，减少描述和比较的数量。本讲采用稀疏路线，因此首先要定义什么是 **interest point / keypoint（兴趣点／关键点）**。

关键不是单个像素多亮，而是周围图块是否容易重新认出。好点应具有 **repeatability（可重复检测性）**：换视角、旋转或光照后，仍有机会检测到同一个物理位置。它还需要局部区分度，不能和紧邻位置几乎一样。

![PPT 11 - Uniform, edge and corner](assets/11-features/slide-11.png)

沿 PPT 三个窗口想象稍微移动：

- **Flat / uniform（平坦区域）**：向各方向移动都差不多，不知道原来是哪一点。
- **Edge（边缘）**：横跨边缘变化大，沿边缘滑动却变化小，因此沿边缘的位置难以确定。
- **Corner（角点）**：各方向移动都改变窗口内容，更容易把位置锁定。

这里的角点是局部灰度变化的性质，不要求它是人眼认出的建筑物直角。PPT 花园里花朵的局部结构同样可以提供这样的点。

<a id="topic-2"></a>
## 2. 难点：Harris 从位移代价到角点

### 把“移动以后变化大”写成公式

![PPT 12 - Weighted squared difference](assets/11-features/slide-12.png)

$$
E(u,v)=\sum_{x,y}w(x,y)\left[I(x+u,y+v)-I(x,y)\right]^2.
$$

逐项读： $I(x,y)$ 是窗口内像素的灰度； $(u,v)$ 是水平、竖直位移，单位按图像坐标理解为像素；差值比较移动前后同一相对位置的亮度；平方避免正负抵消；最后在窗口内相加。

  $w(x,y)\ge0$ 是窗口权重。方窗可以同等重视窗口内像素；Gaussian 窗口（高斯窗口）让中心像素权重较大、边缘较小。 $E$ 是加权平方差，不是“角点概率”。

  $E(0,0)=0$ 永远成立，因为没有移动时图块与自己完全相同。我们关注的是**离开零位移后，沿任意方向是否都迅速增加**，不是要求零点的值大。

### 为什么只用一个小矩阵就够了

![PPT 13 - Taylor expansion](assets/11-features/slide-13.png)

你在高等数学里学过用导数近似小范围变化。这里用二维一阶 Taylor expansion：

$$
I(x+u,y+v)\approx I(x,y)+uI_x+vI_y,
\qquad I_x=\frac{\partial I}{\partial x},\quad I_y=\frac{\partial I}{\partial y}.
$$

  $I_x,I_y$ 是当前位置沿两轴的亮度变化率。代回上一式， $I(x,y)$ 抵消，于是：

$$
E(u,v)\approx\sum_{x,y}w(x,y)(uI_x+vI_y)^2
=\begin{bmatrix}u&v\end{bmatrix}M\begin{bmatrix}u\\v\end{bmatrix}.
$$

这里的近似只适用于小位移；它让我们不用为每个候选位移重新比较整个窗口。

![PPT 14 - The matrix M](assets/11-features/slide-14.png)

$$
M=\sum_{x,y}w(x,y)
\begin{bmatrix}
I_x^2&I_xI_y\\
I_xI_y&I_y^2
\end{bmatrix}.
$$

  $M$ 是 $2\times2$ 矩阵，汇总一个窗口的梯度信息。左上记录水平方向变化强度，右下记录竖直方向变化强度，两个相同的非对角项记录两方向变化的关系。

若写作 $M=\begin{bmatrix}A&B\\B&C\end{bmatrix}$ ，则 $E\approx Au^2+2Buv+Cv^2$ 。所以这个矩阵决定不同移动方向的代价。不要把 $I_x^2$ 读成二阶导数：它是**一阶导数的平方**。

### 特征值为什么能区分边缘和角点

![PPT 15 - Eigenvalues and unit shifts](assets/11-features/slide-15.png)

**Eigenvector（特征向量）** 是矩阵作用后方向不改变的特殊方向；**eigenvalue（特征值）** 是在这个方向上的缩放量。设 $M e_i=\lambda_i e_i$ ，并将方向向量长度设为 1，则这个方向上的近似位移代价为 $e_i^\top M e_i=\lambda_i$ 。

  $M$ 对称，且由非负加权的平方项构成，所以两个特征值都非负。记 $\lambda_1\ge\lambda_2\ge0$ ；在长度固定为 1 的位移方向中，近似代价最低是 $\lambda_2$ ，最高是 $\lambda_1$ 。这是用单位方向比较局部二次模型，不表示 Taylor 近似对任意大位移都精确。

PPT 标题 “On a unit shift, E is an eigenvalue” 应结合正文读：**沿单位特征向量方向**时等于对应特征值；一般单位方向的值介于两者之间。

![PPT 17 - Both eigenvalues must be large](assets/11-features/slide-17.png)

| 窗口类型 | 特征值 | 移动窗口的含义 |
| --- | --- | --- |
| 平坦 | 两个都小 | 各方向都容易滑动 |
| 边缘 | 一个大、一个小 | 仍存在低代价滑动方向 |
| 角点 | 两个都大 | 最容易移动的方向也有较大代价 |

理解角点的关键是“最弱方向也强”，不是仅仅“有一个很强的梯度”。单个边缘也可以有非常强的梯度。

> **老师原话**：“E is a weighted sum of squares and it can't be negative,”
>
> **理解**：如果直接计算这个平方差却得到负值，应先检查实现；它与后面的 Harris 响应 R 不同，R 可以为负。

### 从矩阵到真正检测出的点

![PPT 18 - Harris response](assets/11-features/slide-18.png)

**Harris response（Harris 响应）** 用行列式和迹避开显式特征值分解：

$$
R=\det(M)-k\left(\operatorname{tr}(M)\right)^2
=\lambda_1\lambda_2-k(\lambda_1+\lambda_2)^2.
$$

**Determinant（行列式）** 是两特征值的乘积；**trace（迹）** 是主对角线之和，也是两特征值之和。对 $M=\begin{bmatrix}A&B\\B&C\end{bmatrix}$ ，直接计算 $\det(M)=AC-B^2$ ， $\operatorname{tr}(M)=A+C$ 。

  $k$ 是经验参数，PPT 给出约 $0.04$ – $0.06$ 。它惩罚“总变化大、但主要集中在一个方向”的情形：平坦区 $R$ 接近 0，边缘常为负，角点候选有较大的正响应。不能只凭 $R>0$ 就保留所有点，还要设置强度阈值。

![PPT 19 - Response and non-max suppression](assets/11-features/slide-19.png)

按照课堂方法实现时，流程是：

1. 从灰度图计算 $I_x,I_y$ 。
2. 对 $I_x^2,I_xI_y,I_y^2$ 在局部窗口加权求和，得到每个位置的 $A,B,C$ 。
3. 计算 $R=AC-B^2-k(A+C)^2$ ，得到一张响应图。
4. 丢弃低于阈值的响应。
5. 做 **non-maximum suppression（非极大值抑制）**：一个局部邻域只保留峰值，避免一个角点周围报告一串点。

窗口大小、 $k$ 、阈值各控制不同事情：汇总多大邻域、如何惩罚边缘、响应多强才接受。PPT 的房间示例把原图、响应、最终角点并列，检查时也应按这个顺序看。

<a id="topic-3"></a>
## 3. 检测的边界与其他评分

### Harris 的能力边界与其他检测器

![PPT 20 - Harris invariances](assets/11-features/slide-20.png)

图像平移后，局部梯度结构与响应也随之移动；图像平面内旋转时，理想局部模型的特征方向改变而特征值不变。PPT 因此把它们称为平移/旋转不变。这里的重点是仍可检测对应角点，**坐标并非不变**。

光照整体偏移时，梯度较稳定；但“容忍光照变化”不是对任意亮度改变都绝对不变。固定窗口也**不具备尺度不变性**：放大后，原先窗口里尖锐的拐角可能只剩局部平缓曲线。

<details>
<summary>延伸内容（可选）：为什么亮度增益会影响固定阈值</summary>

<p>由本讲公式进一步推导：若新图像为 I′ = aI + b，常数偏移 b 在求导时消失；梯度乘 a，矩阵 M 乘 a²，Harris 响应 R 乘 a⁴。因此角点结构可能保留，但响应数值会变，固定阈值不保证保留完全相同的点。这是对 PPT “tolerant” 的补充推导。</p>

</details>

![PPT 21 - Other corner scores](assets/11-features/slide-21.png)

**Shi–Tomasi** 直接使用 $\min(\lambda_1,\lambda_2)$ ，即最弱方向强度。**Brown–Szeliski–Winder** 使用 $\det(M)/\operatorname{tr}(M)$ ；非零迹时，它等于两特征值调和平均的一半。这两种评分不需要 Harris 的 $k$ ，但仍要决定检测阈值。

**Blob detector（斑点检测器）** 寻找局部区域结构；**learned detector（学习式检测器）** 用网络学习可重复的点，PPT 举例 SuperPoint。它们是其他路线的简短介绍，本讲详细推导的仍是 Harris。

<a id="topic-4"></a>
## 4. 描述外观：SIFT 怎样便于比较

### 检测到角点，不等于知道匹配谁

![PPT 24 - Corners in two views](assets/11-features/slide-24.png)

看 PPT 两张建筑照片：每张都有很多红点，但红点的坐标本身不能告诉我们另一张的哪个点对应它。同一物理位置在两张图中通常具有不同坐标。

**Detector（检测器）** 回答“哪里值得看”；**descriptor（描述子）** 回答“那里长什么样”。后者将关键点周围的图块编码成可比较的向量或代码。

直接用原始图块很简单，但光照、旋转和视角变化会改变像素值。PPT 列出手工设计的 SIFT、GLOH、BRIEF、BRISK、ORB，以及学习式描述子。这里无需记住所有缩写，先掌握共同目标：同一物理点变化后仍相似，不同点仍有区分度。

### SIFT 为什么是 128 维

![PPT 26 - Gradient histograms in cells](assets/11-features/slide-26.png)

**SIFT（Scale-Invariant Feature Transform）** 的描述子统计局部梯度方向，而不是逐像素存亮度。**Histogram（直方图）** 是把数值按区间分组累加；这里分组的是方向。

沿图读：左侧每个箭头是一个像素梯度，方向表示亮度上升方向，长度表示变化强度。把窗口分成 cells（小格），每个小格按方向累计梯度；同方向的梯度共同增加对应 bin（区间）的值。强梯度权重大，离中心近的梯度也通过高斯权重得到较大影响。

图中为了看清只画了 $2\times2$ 小格，**不是最终描述子的格子数量**。

![PPT 27 - SIFT dimensions](assets/11-features/slide-27.png)

PPT 的完整设置是： $16\times16$ 像素的标准描述窗口，划成 $4\times4$ 小格，每个小格有 8 个方向区间，因此：

$$
\text{descriptor length}=4\times4\times8=128.
$$

128 维不是 128 个角点，而是一个关键点的 128 个描述数值。空间小格仍保留局部布局；不是把整个窗口的方向全部混成一个直方图。

PPT 与 transcript 将归一化讲成“归一化 → 大值截到 0.2 → 再归一化”，并用总和为 1 作直觉说明。这里先记住其教学目的：减少整体强度差异，避免少数极强梯度主宰描述；不把这段课堂简述当成完整 SIFT 实现规范。

### 尺度、方向对齐后再比较

![PPT 28 - Scale and dominant orientation](assets/11-features/slide-28.png)

**Scale（尺度）** 变大时，同一物理区域在图里占更多像素。SIFT 在多个尺度检测，选择响应合适的尺度，再按该尺度建立描述区域，因此两张图的图块可以对应同一物体部分。

**Dominant orientation（主方向）** 是局部较突出的梯度方向。构造描述时以主方向为参考，而不是一直以整张图的水平轴为参考。相机转动后，如果区域和主方向一起转，描述中的相对方向便能较稳定。

这两步分别对付“同一局部结构有多大”和“朝哪里”，再用梯度统计描述外观。它们提高稳定性，不保证严重遮挡、任意三维视角或重复纹理下都能唯一匹配。

下一讲会将描述子比较产生的候选匹配放进同一个几何模型检查。**外观相似是候选证据，空间关系一致才进一步支持对应关系。**

### Workshop 7：把窗口参数与评分参数分开

`workshop/week-07/worksheet07.ipynb` 使用 `cornerHarris`。其中 `blockSize` 控制汇总梯度的邻域，`ksize` 控制求导算子大小，`k` 控制 Harris 评分中的惩罚项。它们对应本讲不同步骤，不能都理解为“角点灵敏度”。

## 本讲自测

1. 为什么直线边缘上的位置，比角点更难唯一确定？
2. Harris 矩阵的两个特征值都大，意味着什么？
3. SIFT 的 128 维怎样数出来，尺度与主方向分别对付什么变化？
