# COMP90086 Lecture 2 - Imaging Basics

来源：`lecture/COMP90086-02-Basics.pdf`、`transcript/COMP90086_2026_SM2 Week-01-F-transcript.txt`，并结合 `workshop02_solution.ipynb` 的实作题。

这篇回答三个问题：**图像从哪里来、电脑怎样存图像、改变图像大小时到底发生了什么。**

学习路线：[从拍照到投影](#topic-1) → [视野与清晰范围](#topic-2) → [存储与坐标](#topic-3) → [重采样与 Workshop 实作](#topic-4)。

重点：投影关系、数组坐标和插值。难点：毫米与像素的单位换算。易错：裁剪与缩放、宽高顺序、RGB 与 BGR。

<a id="topic-1"></a>
## 1. 从拍照到投影

### 先记住：电脑看到的像素不一定可靠

![Slide 2 - Adversarial demo](assets/02-basics/slide-02.png)

![Slide 3 - Dog to hot dog](assets/02-basics/slide-03.png)

两张图分别展示数字与狗的例子。**Adversarial example（对抗样本）** 指刻意扰动输入以误导模型：只改动很少的像素，就可能让神经网络把一个数字判断成另一个数字，或把 dog 判断成 hot dog。人眼可能觉得图像几乎没变，但模型的置信度已经大幅改变。

这告诉我们两件事：

1. **模型的高置信度不等于人类认为它正确。**
2. 之后做识别时，要关心 robustness：输入有小变化，输出是否仍然可靠？

### 成像：三维世界怎样变成二维图像

![Slide 8 - What is an image](assets/02-basics/slide-08.png)

一次拍照可以分成以下步骤：

$$
\text{light source}
\longrightarrow \text{surface reflection}
\longrightarrow \text{lens/optics}
\longrightarrow \text{sensor}
\longrightarrow \text{electronic signal}
\longrightarrow \text{digital values}.
$$

物体反射光，镜头把光投到传感器，传感器把光变成电信号，电脑最后把电信号保存为像素数值。

最重要的困难是：现实世界是三维，普通照片只有二维。一个像素通常告诉我们“这里有多亮”，却不能单独告诉我们“这个点离相机多远”。这就是为什么计算机视觉需要相机模型、多视图、深度传感器或学习模型来补回缺失信息。

> **老师原话**：“We are dealing with a 2D projection of a 3D scene. So one dimension of information has gone missing.”
>
> **理解**：因此后面看到投影公式时，不要试图仅凭一个像素坐标唯一求出三维点。

### 针孔相机模型：先学最简单的投影

![Slide 11 - Pinhole projection](assets/02-basics/slide-11.png)

先想象一个只有小孔的相机。三维点记为 $P=(x,y,z)$ ，成像平面上的点记为 $(x_i,y_i)$ ，pinhole 到成像平面的距离为 $f$ 。由相似三角形：

$$
\begin{aligned}
x_i&=\frac{fx}{z},\\
y_i&=\frac{fy}{z}.
\end{aligned}
$$

每个符号的意思是：

- $x,y$ ：三维点在横向和纵向的位置；
- $z$ ：点离相机的深度；
- $f$ ：焦距；
- $x_i,y_i$ ：点在成像平面上的位置。

式子的直觉很简单：同样大小的物体， $z$ 越大，投影越小； $f$ 越大，投影越大。

真实相机还要把世界坐标转成相机坐标，再考虑主点、像素尺寸和镜头畸变；但这个小模型是之后所有相机 geometry 的基础。

<!-- figure: pinhole-camera -->

<a id="topic-2"></a>
## 2. 镜头：视野与清晰范围

### 为什么相机需要镜头

![Slide 12 - Why lenses](assets/02-basics/slide-12.png)

小孔只让很少的光进入，所以图像会很暗。如果把孔变大，来自同一空间点的多条光线可能落到传感器的不同位置，结果就是模糊。镜头的作用是：让较多光线进入，同时把来自同一点的光线尽量聚到同一点。

![Slide 13 - Lens and aperture](assets/02-basics/slide-13.png)

图中 $D$ 标出光圈直径， $f$ 标出焦距：前者控制放进多少光，后者影响投影大小。不要把这两个长度混为一谈。

#### 焦距与视野范围

![Slide 15 - Focal length and angle of view](assets/02-basics/slide-15.png)

- **短焦距**：看得更宽，视野范围更大；
- **长焦距**：看得更窄，但物体在图像中通常更大。

在数字图像中，焦距常用像素表示。例如图像宽度是 $2000$ 像素，主点在中间，焦距是 $1000$ 像素时，左右各约 $45^\circ$ ，总视野范围约 $90^\circ$ 。

这里的“像素”并不神秘：它只是把 physical 焦距除以像素尺寸后换成图像坐标单位。

#### 光圈与景深

![Slide 16 - Depth of field](assets/02-basics/slide-16.png)

- 光圈小：接近 pinhole，进光少，但较多深度范围可以同时清晰；
- 光圈大：进光多，但只有较窄的深度范围清晰。

摄影中的光圈值是：

$$
\text{f-number}=\frac{\text{focal length}}{\text{aperture diameter}}.
$$

例如 $70\ \mathrm{mm}$ 镜头的 f/5.6，光圈直径约为 $70/5.6=12.5\ \mathrm{mm}$ 。f/32 的光圈更小，因此景深通常更大。

### 镜头畸变和简化模型

![Slide 17 - Lens distortion](assets/02-basics/slide-17.png)

课堂图里的直线光线模型是方便计算的近似，不是真实镜头的完整物理过程。真实光线会在镜头表面折射；离光轴越远，偏差通常越明显。广角镜头可能出现桶形畸变，也就是原本的直线向外弯。

![Slide 18 - Image formation model](assets/02-basics/slide-18.png)

课上把成像平面假想放到相机前方，以避免处理倒像和负号。这是坐标约定，不是说真实传感器真的在相机前面。读公式时要知道自己正在使用哪一种约定。

影响图像的因素可以分成两组：

| 一组 | 例子 |
| --- | --- |
| World / scene | 光、材质颜色、表面方向、物体位置 |
| Camera | 焦距、光圈、对焦、畸变 |

<a id="topic-3"></a>
## 3. 图像数组：存储与坐标

### 数字图像是怎样存储的

![Slide 22 - Image tensor](assets/02-basics/slide-22.png)

一张灰度图像可以看成二维数组；一张颜色图像通常有三个通道，所以可以表示成一个三维张量：

$$
\text{height}\times\text{width}\times\text{channels}.
$$

RGB 的三个通道不是自然界只有三种“颜色”。它是相机和 human 视觉的工程表示：人眼有三类主要视锥细胞，普通相机也常用三类传感器，把可见光压缩成三个数。

使用图像前先检查三件事：

1. 形状是 `H × W × C` 还是 `C × H × W`？
2. 通道顺序是 RGB 还是 BGR？
3. 数值范围和数据类型是什么？

![Slide 25 - Channel ordering](assets/02-basics/slide-25.png)

不同程序库的约定可能不同。不要看到名字叫 `image` 就假定每个函数都使用相同顺序。

### 像素坐标、数据类型和文件格式

![Slide 26 - Pixel coordinates](assets/02-basics/slide-26.png)

图像数组通常从左上角开始： $x$ 向右增加， $y$ 向下增加，并且通常从 0 开始编号。它和数学课上 y 轴向上的笛卡尔坐标不一样。

最常见的 `uint8` 像素范围是 $0$ 到 $255$ ：

$$
\begin{aligned}
\text{white}&=[255,255,255],\\
\text{black}&=[0,0,0],\\
\text{pure red in RGB}&=[255,0,0].
\end{aligned}
$$

但处理时经常转成 `float32`，因为相加、相乘和归一化需要小数，也需要避免 `uint8` 溢出。医学图像还可能使用 `uint16` 或更宽的类型。

![Slide 31 - JPEG compression](assets/02-basics/slide-31.png)

文件格式也会影响数据：

- JPEG 通常是有损压缩，会优先损失高频细节；
- PNG 可使用无损编码；其他格式还要查看具体编码方式，不能只凭扩展名认定像素未改变。

一张 JPEG 缩略图看起来可能很好，但边缘、纹理和小字等高频内容已经改变。做逐像素比较或实验时，文件格式本身也是处理步骤。

> **老师原话**：“JPEG is imperfect when reconstructing high-frequency things.”
>
> **理解**：做边缘或纹理实验时，要把图像是否经过有损压缩也作为输入条件检查。

<a id="topic-4"></a>
## 4. 重采样与 Workshop 实作

### 裁剪与缩放不是一回事

![Slide 34 - Crop and resize](assets/02-basics/slide-34.png)

- **Crop**：从原数组取一个子区域，已有像素数值不变；
- **Resize**：改变数组尺寸，必须为新位置计算像素数值。

直接把 $768\times512$ 压成 $512\times512$ 会改变宽高比，物体可能变胖或变瘦。若保持比例，目标尺寸应接近 $512\times341$ 。

#### 最近邻插值

![Slide 35 - Nearest-neighbour](assets/02-basics/slide-35.png)

对每个新像素，找到原图中最近的像素，直接复制它的值。优点是快、边缘硬；缺点是放大或缩小时容易出现明显的方块感或锯齿。

#### 双线性插值

![Slide 36 - Bilinear weights](assets/02-basics/slide-36.png)

若新位置落在四个旧像素之间，设横向距离为 $H$ 、纵向距离为 $V$ ，四个权重是：

$$
\left\{
(1-H)(1-V),\ H(1-V),\ (1-H)V,\ HV
\right\}.
$$

它们加起来等于 1，所以 bilinear 本质上是“四个邻居的加权平均”。它通常比最近邻平滑，但会让非常锐利的边缘稍微软化。

> **老师原话**：“it effectively incorporates the blur into that sampling step.”
>
> **理解**：这解释了插值后的边缘为什么可能变软；缩图时仍要根据采样比例检查是否需要额外抗混叠。

![Slide 37 - Resampling trade-offs](assets/02-basics/slide-37.png)

bicubic 会看更大的邻域，用 cubic function 估计新值；Lanczos 是另一种采样方法。没有一种插值对所有任务都最好，要根据速度、边缘和目标尺寸选择。

### Workshop 2：把概念写成代码

Workshop 参考解答把本讲的五个重点串在一起：读图、缩放、裁剪、改通道、用相似三角形求焦距。

#### OpenCV 和 Matplotlib 的颜色顺序

`cv2.imread` 默认读入 BGR，但 `matplotlib.pyplot.imshow` 按 RGB 显示。显示前要转换：

```python
display_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
```

这只改变通道顺序，不改变图像内容或空间尺寸。

#### 缩放、中心裁剪和深拷贝

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

#### 用传感器尺寸求焦距

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

## 本讲自测

1. 物体距离加倍、焦距不变时，投影大小怎样变？
2. 为什么 NumPy 的形状不能原样当作 OpenCV 的缩放尺寸？
3. 新像素落在四个旧像素之间时，双线性插值怎样得到它的值？
