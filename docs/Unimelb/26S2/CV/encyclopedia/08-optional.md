# 可选专题：Workshop 与应用

[词条索引与使用方法](README.md) · [专题主线与补充关](../LEARNING-PATHS.md)

每个词条注明来源与直接前置。下面的层级是学习设计，验收活动均为自拟，尚未接入游戏。

<a id="bgr"></a>
## OpenCV 的 BGR 与数组副本

- 编号：`bgr`
- 分类：**只在 Workshop 出现**
- 出处：`workshop/week-02/worksheet02.ipynb：OpenCV / Channel order；workshop02_solution.ipynb：(3)–(5)`
- 依赖：[像素、坐标与通道](01-image-formation.md#pixels)、[裁剪、重采样与插值](01-image-formation.md#sampling)
- 层级：**任务**

Workshop 2 演示 OpenCV 读图的 BGR 通道顺序，以及裁剪后的深拷贝。把 BGR 直接当 RGB 显示会交换红蓝；切片可能共享原数组的数据，修改前需弄清是否要独立副本。

**原练习说明（可选）**

Workshop 参考解答把本讲的五个重点串在一起：读图、缩放、裁剪、改通道、用相似三角形求焦距。

**OpenCV 和 Matplotlib 的颜色顺序**

`cv2.imread` 默认读入 BGR，但 `matplotlib.pyplot.imshow` 按 RGB 显示。显示前要转换：

```python
display_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
```

这只改变通道顺序，不改变图像内容或空间尺寸。

**缩放、中心裁剪和深拷贝**

OpenCV 的大小 tuple 是 `(width, height)`，NumPy 形状却通常写成 `(height, width, channels)`。对 $H\times W$ 图像做宽 $w_c$ 、高 $h_c$ 的 center 裁剪：

$$
x_0=\left\lfloor\frac{W-w_c}{2}\right\rfloor,
\qquad
y_0=\left\lfloor\frac{H-h_c}{2}\right\rfloor.
$$

然后取 `image[y0:y0 + hc, x0:x0 + wc]`。NumPy 切片常返回视图；如果要修改副本而不影响原裁剪，应使用 `.copy()`。

对 BGR 图像，把红色通道改成蓝色与绿色通道的平均值：

$$
R'(x,y)=\frac{G(x,y)+B(x,y)}{2}.
$$

如果原数组是 `uint8`，先用较宽或浮点类型做计算，再明确 cast，避免溢出或隐式截断。

**用传感器尺寸求焦距**

传感器高度为 $20\ \mathrm{mm}$ ，对应 $200$ 像素；物体在图像中高 $100$ 像素，因此它在传感器上高：

$$
h_i=20\ \mathrm{mm}\times\frac{100}{200}=10\ \mathrm{mm}.
$$

物体实际高 $h_o=120\ \mathrm{mm}$ ，距离 $z=600\ \mathrm{mm}$ 。由相似三角形：

$$
\frac{h_i}{f}=\frac{h_o}{z}
\quad\Longrightarrow\quad
f=\frac{h_i z}{h_o}
=\frac{10\times600}{120}
=50\ \mathrm{mm}.
$$

重点是先把像素换成传感器上的毫米；不能直接把像素和毫米放进同一个比例式。

**任务验收（自拟）**：修复一次红蓝颠倒，并修改裁剪副本验证原数组不变。

<a id="attention-distance"></a>
## 平均注意距离

- 编号：`attention-distance`
- 分类：**只在 Workshop 出现**
- 出处：`workshop/week-06/worksheet06.ipynb：mean attention distance`
- 依赖：[Query、Key、Value 与自注意力](03-learning.md#attention)、[位置编码与 Transformer 块](03-learning.md#position)
- 层级：**任务**

Workshop 6 用注意力权重对图块间距离加权，比较各层各头的平均注意距离。结构允许看全图不等于每个头都平均使用远处信息；一次输入的观察不能替代全数据统计。

**原练习说明（可选）**

来源：`workshop/week-06/worksheet06.ipynb`。原练习用预训练 ViT 分类，再计算各层各个 head 的平均注意距离：用注意力权重加权图块之间的空间距离。它让你检查“结构允许看远处”是否真的变成“这张图上关注远处”。换图后再比较，不能把单张图的结果当成所有输入的固定规律。本次未重新运行模型。

**任务验收（自拟）**：在给定注意力矩阵上算距离加权和，换图比较并保留分类 token 的处理约定。

<a id="gradcam-practice"></a>
## 同图不同目标的 Grad-CAM 实验

- 编号：`gradcam-practice`
- 分类：**应用举例**
- 出处：`workshop/week-06/worksheet06.ipynb：Grad-CAM / Exercise 5；概念见 L10 PDF p.27–29`
- 依赖：[遮挡、CAM 与表示检查](03-learning.md#interpretability)
- 层级：**任务**

Workshop 6 对同一张图改变目标类别生成 Grad-CAM。对比回答的是模型为哪个类别使用了哪些区域线索，不是自动得到一份独立于类别的准确分割。

**原练习说明（可选）**

`workshop/week-06/worksheet06.ipynb` 要求对含多种水果的图像，分别为预测靠前的两个类别生成 Grad-CAM。比较热区是否跟随目标类别变化；若不换目标类别，就无法检验“这张热图在解释谁”。这是练习任务，不是本次运行所得结论。

**任务验收（自拟）**：保持图像和模型固定，只改目标类别，解释两张热图差异。

<a id="diffusion-schedule-practice"></a>
## 扩散的 1000 步实现实验

- 编号：`diffusion-schedule-practice`
- 分类：**应用举例**
- 出处：`workshop/week-10/worksheet10-diffusion.ipynb：2.1–2.3、3、5`
- 依赖：[前向扩散与累计信号](05-generation.md#forward-diffusion)、[反向生成与采样器边界](05-generation.md#reverse-diffusion)
- 层级：**任务**

Workshop 10 在 MNIST 中构造 beta 与累计 alpha，比较逐步加噪与直接加噪，训练 U-Net 并迭代生成。1000 步是这份练习的设置；两种加噪随机路径只需分布相符，不必逐图完全相同。

**任务验收（自拟）**：只读核对系数数组长度、时间索引与 t=0；比较固定统计量，执行训练需另行安排。

<a id="normalised-cut-practice"></a>
## Normalized cut 图分割实验

- 编号：`normalised-cut-practice`
- 分类：**只在 Workshop 出现**
- 出处：`workshop/week-11/worksheet11.ipynb：Graph-based Segmentation / Normalized Cut`
- 依赖：[区域邻接图与合并](06-segmentation.md#rag)
- 层级：**任务**

Workshop 11 在区域邻接图上做 normalized cut，按图内联系与跨组联系权衡划分。它和按颜色差逐边合并不是同一个算法；L19 正文展开 RAG 合并，未把此练习的目标函数作为主线推导。

**任务验收（自拟）**：比较固定图上阈值合并和 normalized cut 的目标，记录算法参数，避免把两者输出差异解释为实现错误。

<a id="camera-example"></a>
## 从像素高度计算焦距

- 编号：`camera-example`
- 分类：**应用举例**
- 出处：`workshop/week-02/workshop02_solution.ipynb：(6)`
- 依赖：[针孔投影与深度歧义](01-image-formation.md#projection)、[像素、坐标与通道](01-image-formation.md#pixels)
- 层级：**任务**

Workshop 2 的传感器 20×30 mm 对应 200×300 像素。先把题目像高换成毫米，再与物高、距离统一单位，最后由针孔关系求焦距；不能把像素高度直接与厘米混算。

**任务验收（自拟）**：复核原解答的 10 mm 像高、120 mm 物高、600 mm 距离，得到 f=50 mm。

<a id="cnn-parameter-practice"></a>
## Workshop 5 补充：沿原题计算参数与输出

- 编号：`cnn-parameter-practice`
- 分类：**应用举例**
- 出处：`workshop/week-05/worksheet05_solution.ipynb：Exercise 1`
- 依赖：[多通道卷积与参数共享](03-learning.md#channels)、[步幅、尺寸与感受野](03-learning.md#stride)、[最大池化与平均池化](03-learning.md#pooling)
- 层级：**任务**

来源：`workshop/week-05/worksheet05_solution.ipynb` 开头的 CNN 参数题。原解答标题误写成 Exercise 3，但对应的是开头 Exercise 1。

沿用 [CNNs I](../06-cnns-i.md) 的参数公式，逐层代入原题尺寸：

| 原题层 | 参数计算 | 输出形状（不含批次） |
| --- | --- | --- |
| A | $5\times5\times3\times20+20=1520$ | $22\times22\times20$ |
| B | $3\times3\times20\times40+40=7240$ | $20\times20\times40$ |
| C 池化 | $0$ | $10\times10\times40$ |
| D 全连接 | $4000\times10+10=40010$ | $10$ |

总参数为 $1520+7240+40010=48770$ 。Dense 前展平得到的 4000，来自 $10\times10\times40$ ，不是另加的训练参数。

原题还问初始化后的输出。若所有参数为 0，B 的输出是 $20\times20\times40$ 的全零数组。若权重全为 1、偏置为 0，所有输出通道执行相同局部累加，因而形成相同的模糊响应；原参考解答将其描述为 averaging 滤波器。

<details>
<summary>延伸内容（可选）：原解答“averaging”的措辞校正</summary>

<p>权重全为 1 时严格算的是求和，没有除以核元素数量，因此数值不等于平均。可以用模糊图理解空间效果，但不要据此认为亮度范围保持不变。这是按题目权重设置对原解答的校正。</p>

</details>

原题最后提出用可分离卷积或堆叠小卷积核减少参数。具体可分离练习接在 [CNNs III](../08-cnns-iii.md) 对应主题中。


**任务验收（自拟）**：按原练习核对输入、参数与输出，说明适用条件；不要求重新训练模型。

<a id="mnist-practice"></a>
## Workshop：把训练流程连起来

- 编号：`mnist-practice`
- 分类：**应用举例**
- 出处：`workshop/week-04/worksheet04_solution.ipynb：MNIST`
- 依赖：[分类表示与神经网络](03-learning.md#recognition)、[训练、验证与测试](03-learning.md#train-split)
- 层级：**任务**

**Workshop 4：用 MNIST 对比 MLP 和 CNN**

本周 `workshop/week-04/worksheet04_solution.ipynb` 先处理颜色空间和图像形成，再用 MNIST（ $28\times28$ 单通道手写数字）比较 MLP 与 CNN：

- MLP 先把图像展平成 $784$ 个数字，再用全连接层分类；
- CNN 保留二维结构，用 `Conv2D`、`MaxPooling2D`、`Flatten` 和输出层分类；
- 代码把像素除以 255，使输入落在 $[0,1]$ ，并增加通道维度以符合 Keras 的 `(batch, height, width, channels)` 输入格式；
- 参考解答的参数计算提醒我们：卷积滤波器会在空间位置共享权重，所以通常比直接展平的 MLP 参数更少；在这个 MNIST 练习中，CNN 测试准确率也更高。

先关注概念，不必死记一次运行得到的具体准确率：随机初始化、轮数、硬件和软件版本都会改变最后的小数。

**任务验收（自拟）**：按原练习核对输入、参数与输出，说明适用条件；不要求重新训练模型。

<a id="separable-cnn-practice"></a>
## Workshop 5 补充：保留原设计的可分离 CNN

- 编号：`separable-cnn-practice`
- 分类：**应用举例**
- 出处：`workshop/week-05/worksheet05_solution.ipynb：Separable CNN`
- 依赖：[深度可分离卷积与模型缩放](03-learning.md#depthwise)、[训练、验证与测试](03-learning.md#train-split)
- 层级：**任务**

练习本在 MNIST 灰度输入上使用 8、16 个输出通道的两层 $5\times5$ 可分离卷积，中间配合池化，最后接 10 类输出。沿用上面两步，下面只代入原题尺寸。

按原解答，第一层参数为 $5\times5\times1+1\times1\times1\times8+8=41$ ；第二层为 $5\times5\times8+1\times1\times8\times16+16=344$ ；全连接为 $256\times10+10=2570$ ；合计 $2955$ 。这不是开头 RGB 参数题的原网络，不能直接把 2955 与 48770 的差全部归因于可分离卷积。

原练习要求对照较早的 CNN 比较参数量与测试准确率，参考解答的文字结论是参数减少、准确率相近，但这次小模型运行时间更长。它提醒我们额外操作开销可能抵消计算量节省；这是原解答中的观察，本次没有重新跑实验。

**任务验收（自拟）**：按原练习核对输入、参数与输出，说明适用条件；不要求重新训练模型。

<a id="feature-map-practice"></a>
## Workshop 5 补充：滤波器与特征图不是同一件事

- 编号：`feature-map-practice`
- 分类：**应用举例**
- 出处：`workshop/week-05/worksheet05_solution.ipynb：VGG16 / ResNet50`
- 依赖：[多通道卷积与参数共享](03-learning.md#channels)、[迁移学习与微调](03-learning.md#transfer)
- 层级：**任务**

练习本原设计先加载预训练 VGG16，再查看第一层前六个滤波器的三个输入通道，随后将 `harry.png` 输入网络，显示第一层的 64 张特征图。

**Filter** 是训练得到的权重；**特征图** 是这些权重作用于某张图的结果。换输入图片会改变特征图，不会因此改掉已经加载的滤波器。原练习第一层输出是 $224\times224\times64$ ；64 张空间图按 $8\times8$ 排列只是为了显示。

Workshop 最后一部分加载 ResNet50，设置 `include_top=False`，取 `conv3_block4_out` 作为输出，并对 `wallaby.jpeg` 提取特征。残差结构见 [CNNs III](../08-cnns-iii.md)，此处只关注取哪一层的输出。这些是练习本的原始任务，本次没有重新训练或运行模型，也没有把中间特征图称为类别预测。

**任务验收（自拟）**：按原练习核对输入、参数与输出，说明适用条件；不要求重新训练模型。

<a id="harris-api-practice"></a>
## Workshop 7：把窗口参数与评分参数分开

- 编号：`harris-api-practice`
- 分类：**应用举例**
- 出处：`workshop/week-07/worksheet07.ipynb：cornerHarris`
- 依赖：[结构张量与 Harris 角点](04-geometry.md#harris)
- 层级：**任务**

`workshop/week-07/worksheet07.ipynb` 使用 `cornerHarris`。其中 `blockSize` 控制汇总梯度的邻域，`ksize` 控制求导算子大小，`k` 控制 Harris 评分中的惩罚项。它们对应本讲不同步骤，不能都理解为“角点灵敏度”。

**任务验收（自拟）**：按原练习核对输入、参数与输出，说明适用条件；不要求重新训练模型。

<a id="matching-practice"></a>
## Workshop 7：从描述子候选到书封面定位

- 编号：`matching-practice`
- 分类：**应用举例**
- 出处：`workshop/week-07/worksheet07.ipynb：Hough / SIFT / FLANN / Homography`
- 依赖：[描述子比值检验](04-geometry.md#ratio-test)、[平面单应变换](04-geometry.md#homography)
- 层级：**任务**

`workshop/week-07/worksheet07.ipynb` 把 Hough、Harris、SIFT、近邻检索与单应估计接在一起。FLANN 是加快近邻查找的工具；它提出候选，不负责证明几何对应。

<details>
<summary>延伸内容：练习中的 ratio test 文字方向</summary>

<p>原练习文字有“比值大于阈值才保留”的表述；应按本讲公式及练习代码理解为最近距离显著小于次近距离才接受。距离比接近 1 表示候选难分，不是更可靠。</p>

</details>

**任务验收（自拟）**：按原练习核对输入、参数与输出，说明适用条件；不要求重新训练模型。

<a id="stereo-practice"></a>
## Workshop 8：调窗口时观察什么

- 编号：`stereo-practice`
- 分类：**应用举例**
- 出处：`workshop/week-08/worksheet08.ipynb；worksheet08_solution.ipynb`
- 依赖：[双目窗口代价与全局约束](04-geometry.md#stereo-matching)
- 层级：**任务**

`workshop/week-08/worksheet08.ipynb` 要求改变 `numDisparities` 与 `blockSize`，并比较 BM 与 SGBM。前者改变搜索的视差范围，后者改变局部匹配窗口；分别观察漏匹配、杂点与深度边界。**易错**：算法给出的视差图不是天然以米计的深度图，需结合本讲相机参数换算。第 8 周答案已在同目录归档，本次未运行练习。

**任务验收（自拟）**：按原练习核对输入、参数与输出，说明适用条件；不要求重新训练模型。

<a id="calibration-practice"></a>
## Workshop 8：先标定，再检查极线

- 编号：`calibration-practice`
- 分类：**应用举例**
- 出处：`workshop/week-08/worksheet08.ipynb；worksheet08_solution.ipynb`
- 依赖：[相机内参、外参与标定](04-geometry.md#calibration)、[本质矩阵与基础矩阵](04-geometry.md#fundamental)、[双目校正、三角化与退化](04-geometry.md#rectification)
- 层级：**任务**

`workshop/week-08/worksheet08.ipynb` 先比较单张与多张棋盘标定，再用特征匹配估计 F 并画极线。检查点是否落在对应极线上，而不是只看函数是否返回一个矩阵。原题还给出已知 10 米基线：在匹配有效、非退化且内参已知时，这个长度可用来补上最后的尺度信息。这是依据本讲的解题思路。官方答案现已保存为同目录下的 `worksheet08_solution.ipynb`，可用来核对结果。

**任务验收（自拟）**：按原练习核对输入、参数与输出，说明适用条件；不要求重新训练模型。

<a id="generation-practice"></a>
## Workshop 9：从重建走向生成

- 编号：`generation-practice`
- 分类：**应用举例**
- 出处：`workshop/week-09/worksheet9.ipynb；worksheet9_Autoencoders_solution.ipynb`
- 依赖：[自编码器与瓶颈](05-generation.md#autoencoder)、[VAE、重参数化与两项损失](05-generation.md#vae)、[GAN 的生成器与判别器](05-generation.md#gan)
- 层级：**任务**

`workshop/week-09/worksheet9.ipynb` 与 `worksheet9_Autoencoders_solution.ipynb` 已归档，配套的 `pretrained_checkpoints/` 保留预训练权重。比较模型时，先区分“输入一张图再重建”与“从潜空间采样生成”；若进入对抗训练部分，接着阅读 [GAN 的两个网络](../16-gans.md#topic-1)。本次只整理资源，没有运行或训练这些模型。

**任务验收（自拟）**：按原练习核对输入、参数与输出，说明适用条件；不要求重新训练模型。

