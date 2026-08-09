# COMP90086 Lecture 2 - Imaging Basics

来源：`lecture/COMP90086-02-Basics.pdf`、`transcript/COMP90086_2026_SM2 Week-01-F-transcript.txt`，并结合 `workshop02_solution.ipynb` 的实作题。

这篇回答三个问题：**图像从哪里来、电脑怎样存图像、改变图像大小时到底发生了什么。**

## 1. 先记住：电脑看到的 pixel 不一定可靠

![Slide 2 - Adversarial demo](assets/02-basics/slide-02.png)

![Slide 3 - Dog to hot dog](assets/02-basics/slide-03.png)

老师用 adversarial example 开场：只改动很少的 pixel，就可能让 neural network 把一个数字判断成另一个数字，或把 dog 判断成 hot dog。人眼可能觉得图像几乎没变，但模型的 confidence 已经大幅改变。

这告诉我们两件事：

1. **模型的高 confidence 不等于人类认为它正确。**
2. 之后做 recognition 时，要关心 robustness：输入有小变化，输出是否仍然可靠？

## 2. Image formation：三维世界怎样变成二维图像

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

物体反射光，镜头把光投到 sensor，sensor 把光变成电信号，电脑最后把电信号保存为 pixel values。

最重要的困难是：现实世界是三维，普通照片只有二维。一个 pixel 通常告诉我们“这里有多亮”，却不能单独告诉我们“这个点离相机多远”。这就是为什么 computer vision 需要 camera model、多视图、深度 sensor 或学习模型来补回缺失信息。

> **老师原话**：“We are dealing with a 2D projection of a 3D scene. So one dimension of information has gone missing.”

## 3. Pinhole camera model：先学最简单的投影

![Slide 11 - Pinhole projection](assets/02-basics/slide-11.png)

先想象一个只有小孔的相机。三维点记为 $P=(x,y,z)$，image-plane 上的点记为 $(x_i,y_i)$，pinhole 到 image plane 的距离为 $f$。由相似三角形：

$$
\begin{aligned}
x_i&=\frac{fx}{z},\\
y_i&=\frac{fy}{z}.
\end{aligned}
$$

每个符号的意思是：

- $x,y$：三维点在横向和纵向的位置；
- $z$：点离 camera 的深度；
- $f$：focal length；
- $x_i,y_i$：点在 image plane 上的位置。

式子的直觉很简单：同样大小的物体，$z$ 越大，投影越小；$f$ 越大，投影越大。

真实相机还要把 world coordinate 转成 camera coordinate，再考虑 principal point、pixel size 和镜头畸变；但这个小模型是之后所有 camera geometry 的基础。

> **老师原话**：“This is gonna be core to everything you do in this subject. You'll need to internalise these models.”

## 4. 为什么相机需要 lens

![Slide 12 - Why lenses](assets/02-basics/slide-12.png)

小孔只让很少的光进入，所以图像会很暗。如果把孔变大，来自同一 world point 的多条光线可能落到 sensor 的不同位置，结果就是 blur。lens 的作用是：让较多光线进入，同时把来自同一点的光线尽量聚到同一点。

![Slide 13 - Lens and aperture](assets/02-basics/slide-13.png)

### Focal length 与 field of view

![Slide 15 - Focal length and angle of view](assets/02-basics/slide-15.png)

- **短 focal length**：看得更宽，field of view 更大；
- **长 focal length**：看得更窄，但物体在图像中通常更大。

在 digital image 中，focal length 常用 pixels 表示。例如 image width 是 $2000$ pixels，principal point 在中间，focal length 是 $1000$ pixels 时，左右各约 $45^\circ$，总 field of view 约 $90^\circ$。

这里的“pixels”并不神秘：它只是把 physical focal length 除以 pixel size 后换成图像坐标单位。

### Aperture 与 depth of field

![Slide 16 - Depth of field](assets/02-basics/slide-16.png)

- aperture 小：接近 pinhole，进光少，但较多深度范围可以同时清晰；
- aperture 大：进光多，但只有较窄的深度范围清晰。

摄影中的 f-number 是：

$$
\text{f-number}=\frac{\text{focal length}}{\text{aperture diameter}}.
$$

例如 $70\ \mathrm{mm}$ 镜头的 f/5.6，aperture diameter 约为 $70/5.6=12.5\ \mathrm{mm}$。f/32 的 aperture 更小，因此 depth of field 通常更大。

## 5. Lens distortion 和简化模型

![Slide 17 - Lens distortion](assets/02-basics/slide-17.png)

课堂图里的直线光线模型是方便计算的近似，不是真实 lens 的完整物理过程。真实光线会在 lens 表面折射；离 optical axis 越远，偏差通常越明显。广角镜头可能出现 barrel distortion，也就是原本的直线向外弯。

![Slide 18 - Image formation model](assets/02-basics/slide-18.png)

课上把 image plane 假想放到 camera 前方，以避免处理倒像和负号。这是 coordinate convention，不是说真实 sensor 真的在 camera 前面。读公式时要知道自己正在使用哪一种 convention。

影响图像的因素可以分成两组：

| 一组 | 例子 |
| --- | --- |
| World / scene | light、材质颜色、表面方向、物体位置 |
| Camera | focal length、aperture、focus、distortion |

## 6. Digital image 是怎样存储的

![Slide 22 - Image tensor](assets/02-basics/slide-22.png)

一张 grayscale image 可以看成二维 array；一张 colour image 通常有三个 channel，所以可以表示成一个三维 tensor：

$$
\text{height}\times\text{width}\times\text{channels}.
$$

RGB 的三个 channel 不是自然界只有三种“颜色”。它是 camera 和 human vision 的工程表示：人眼有三类主要 cone，普通相机也常用三类 sensor，把可见光压缩成三个数。

使用 image 前先检查三件事：

1. shape 是 `H × W × C` 还是 `C × H × W`？
2. channel 顺序是 RGB 还是 BGR？
3. 数值范围和 data type 是什么？

![Slide 25 - Channel ordering](assets/02-basics/slide-25.png)

不同 library 的 convention 可能不同。不要看到名字叫 `image` 就假定每个函数都使用相同顺序。

> **老师原话**：“You'll have to be aware that this is a problem and check.”

## 7. Pixel 坐标、数据类型和文件格式

![Slide 26 - Pixel coordinates](assets/02-basics/slide-26.png)

图像数组通常从左上角开始：$x$ 向右增加，$y$ 向下增加，并且通常从 0 开始编号。它和数学课上 y 轴向上的 Cartesian coordinate 不一样。

最常见的 `uint8` pixel 范围是 $0$ 到 $255$：

$$
\begin{aligned}
\text{white}&=[255,255,255],\\
\text{black}&=[0,0,0],\\
\text{pure red in RGB}&=[255,0,0].
\end{aligned}
$$

但 processing 时经常转成 `float32`，因为相加、相乘和归一化需要小数，也需要避免 `uint8` overflow。medical image 还可能使用 `uint16` 或更宽的类型。

![Slide 31 - JPEG compression](assets/02-basics/slide-31.png)

文件格式也会影响数据：

- JPEG 通常是 lossy compression，会优先损失高频细节；
- PNG、BMP、GIF、TIFF 通常保留更多原始信息。

一张 JPEG 缩略图看起来可能很好，但边缘、纹理和小字等高频内容已经改变。做 pixel-level comparison 或实验时，文件格式本身也是 processing step。

> **老师原话**：“JPEG is imperfect when reconstructing high-frequency things.”

## 8. Crop 与 resize 不是一回事

![Slide 34 - Crop and resize](assets/02-basics/slide-34.png)

- **Crop**：从原数组取一个子区域，已有 pixel value 不变；
- **Resize**：改变数组尺寸，必须为新位置计算 pixel value。

直接把 $768\times512$ 压成 $512\times512$ 会改变 aspect ratio，物体可能变胖或变瘦。若保持比例，目标尺寸应接近 $512\times341$。

### Nearest-neighbour

![Slide 35 - Nearest-neighbour](assets/02-basics/slide-35.png)

对每个新 pixel，找到原图中最近的 pixel，直接复制它的值。优点是快、边缘硬；缺点是放大或缩小时容易出现 blocky artifacts。

### Bilinear interpolation

![Slide 36 - Bilinear weights](assets/02-basics/slide-36.png)

若新位置落在四个旧 pixels 之间，设横向距离为 $H$、纵向距离为 $V$，四个权重是：

$$
\left\{
(1-H)(1-V),\ H(1-V),\ (1-H)V,\ HV
\right\}.
$$

它们加起来等于 1，所以 bilinear 本质上是“四个邻居的加权平均”。它通常比 nearest 平滑，但会让非常锐利的边缘稍微软化。

> **老师原话**：“Bilinear sampling ... effectively incorporates the blur into that sampling step.”

![Slide 37 - Resampling trade-offs](assets/02-basics/slide-37.png)

bicubic 会看更大的邻域，用 cubic function 估计新值；Lanczos 是另一种采样方法。没有一种 interpolation 对所有任务都最好，要根据速度、边缘和目标尺寸选择。

## 9. Workshop 2：把概念写成代码

Workshop solution 把本讲的五个重点串在一起：读图、resize、crop、改 channel、用相似三角形求 focal length。

### OpenCV 和 Matplotlib 的颜色顺序

`cv2.imread` 默认读入 BGR，但 `matplotlib.pyplot.imshow` 按 RGB 显示。显示前要转换：

```python
display_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
```

这只改变 channel 顺序，不改变图像内容或空间尺寸。

### Resize、center crop 和 deep copy

OpenCV 的 size tuple 是 `(width, height)`，NumPy shape 却通常写成 `(height, width, channels)`。对 $H\times W$ image 做宽 $w_c$、高 $h_c$ 的 center crop：

$$
x_0=\left\lfloor\frac{W-w_c}{2}\right\rfloor,
\qquad
y_0=\left\lfloor\frac{H-h_c}{2}\right\rfloor.
$$

然后取 `image[y0:y0 + hc, x0:x0 + wc]`。NumPy slicing 常返回 view；如果要修改副本而不影响原 crop，应使用 `.copy()`。

对 BGR image，把 red channel 改成 blue 与 green 的平均值：

$$
R'(x,y)=\frac{G(x,y)+B(x,y)}{2}.
$$

如果原数组是 `uint8`，先用较宽或 floating-point type 做计算，再明确 cast，避免 overflow 或隐式截断。

### 用 sensor 尺寸求 focal length

sensor 高度为 $20\ \mathrm{mm}$，对应 $200$ pixels；物体在图像中高 $100$ pixels，因此它在 sensor 上高：

$$
h_i=20\ \mathrm{mm}\times\frac{100}{200}=10\ \mathrm{mm}.
$$

物体实际高 $h_o=120\ \mathrm{mm}$，距离 $z=600\ \mathrm{mm}$。由相似三角形：

$$
\frac{h_i}{f}=\frac{h_o}{z}
\quad\Longrightarrow\quad
f=\frac{h_i z}{h_o}
=\frac{10\times600}{120}
=50\ \mathrm{mm}.
$$

重点是先把 pixels 换成 sensor 上的 millimetres；不能直接把 pixels 和 millimetres 放进同一个比例式。

## 10. 本讲复习

1. 图像是三维世界经过光学和 sensor 形成的二维观测，所以单个 pixel 通常没有完整深度信息。
2. Pinhole projection 的核心是 $x_i=fx/z$、$y_i=fy/z$；距离越远，投影越小。
3. Focal length 影响视野宽窄，aperture 影响进光量和 depth of field。
4. 使用 image 前检查 shape、channel order、data type 和 compression。
5. Crop 不重新计算 pixel；resize 必须选择 interpolation。
6. Workshop 2 的 focal-length 答案是 $50\ \mathrm{mm}$，关键是先统一 physical units。
