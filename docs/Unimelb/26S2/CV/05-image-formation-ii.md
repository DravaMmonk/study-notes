# COMP90086 Lecture 5 - Image Formation II

来源：`lecture/COMP90086-05-ImageFormationII.pdf` 与 `transcript/COMP90086_2026_SM2 Week-03-W-transcript.txt`。

这篇继续解释“照片为什么会长这样”。重点有三条线：**光和表面怎样决定亮度、颜色怎样被三个通道表示、图像中的边缘对哪些变化保持稳定。**

学习路线：[观察值从哪里来](#topic-1) → [为什么答案不唯一](#topic-2) → [把亮度变化算出来](#topic-3) → [什么保持稳定](#topic-4)。

重点：亮度成因、梯度、不变与等变。难点：一个亮度值为何不能确定三维法线。易错：强边缘未必是物体边界，整体加亮与对比度缩放不同。

<a id="topic-1"></a>
## 1. 亮度与颜色：观察值从哪里来

### Lambertian（朗伯）模型：光、颜色和表面方向一起决定亮度

![Slide 5 - Image formation model](assets/05-image-formation-ii/slide-05.png)

一张照片中的亮度不是物体的“固定标签”。它同时受到光源、表面颜色和表面朝向影响。

![Slide 6 - Diffuse Lambertian reflectance](assets/05-image-formation-ii/slide-06.png)

在最简单的 diffuse/Lambertian（朗伯）模型中：

$$
I_D(x)=I_LR(x)\,\mathbf N(x)^\top\mathbf L.
$$

变量含义是：

- $I_D(x)$ ：位置 $x$ 观察到的漫反射亮度；
- $I_L$ ：光源的强度；
- $R(x)$ ：表面反射率，可先理解成材质/颜色；
- $\mathbf N(x)$ ：表面法线，垂直于表面的单位向量；
- $\mathbf L$ ：指向光源的单位向量。

两个单位向量的点积等于夹角的余弦：

$$
\mathbf N(x)^\top\mathbf L=\cos\theta.
$$

表面正对光源时， $\theta$ 小，亮度较高；表面转开时，亮度降低。这个模型把亮度写成几个因素的乘积，正好也说明了为什么反推困难：一个像素变亮，可能是光变强、材质更亮，也可能是表面方向变了。

<!-- figure: lambert-studio -->

### 颜色不是一个波长，而是一段频谱的结果

![Slide 10 - Spectral power distribution](assets/05-image-formation-ii/slide-10.png)

可见光大约在 $400$ 到 $700\ \mathrm{nm}$ 。一个物体通常反射一整段波长，形成 spectral power distribution（SPD），而不是只反射一种颜色的光。

![Slide 11 - Human cone responses](assets/05-image-formation-ii/slide-11.png)

人眼有三类主要视锥细胞，普通颜色相机也常用三个有重叠范围的传感器。因此相机不会记录完整频谱，而是把频谱分别和三个敏感度曲线加权累积。

![Slide 14 - Different spectra can appear as the same colour](assets/05-image-formation-ii/slide-14.png)

对通道 $c$ ，简化写法是：

$$
I_c=\int_{400\ \mathrm{nm}}^{700\ \mathrm{nm}}
I(\lambda)S_c(\lambda)\,d\lambda.
$$

这里 $I(\lambda)$ 是进入相机的频谱， $S_c(\lambda)$ 是通道的敏感度。不同 SPD 经过这三个积分后，可能得到相同的三通道数值；这叫 metameric ambiguity，也就是“物理光谱不同，但看起来是同一个颜色”。

### 颜色空间：同一颜色可以用不同坐标表示

![Slide 15 - Trichromatic colour response](assets/05-image-formation-ii/slide-15.png)

常见颜色 spaces 的用途不同：

| 颜色空间 | 更适合怎样理解 |
| --- | --- |
| RGB | 最常见的图像存储形式 |
| HSL / HSV | 用 hue、saturation、明度/数值进行直观调整 |
| CIE XYZ | 根据标准观察者的颜色匹配定义的中间空间 |
| Lab | 把明度与 red-green、blue-yellow 方向分开 |

![Slide 18 - Colour transforms](assets/05-image-formation-ii/slide-18.png)

一个简化的 RGB 到 XYZ 变换可以写成：

$$
\begin{bmatrix}X\\Y\\Z\end{bmatrix}
=\mathbf M
\begin{bmatrix}R\\G\\B\end{bmatrix}.
$$

$\mathbf M$ 由具体 RGB 基色和白点决定。实际程序库还要处理 encoded RGB 的线性化，所以不要把所有颜色变换都简单理解成“换三个数字的位置”。

![Slide 19 - Colour swap example](assets/05-image-formation-ii/slide-19.png)

如果直接在 RGB 中交换 R 和 G，亮度关系也可能一起改变。若目标是改 red-green appearance、但尽量保留明度，可以先转到 Lab，再调整 $a^*$ axis。这就是为什么做颜色 manipulation 前要先选择合适的坐标系。

<a id="topic-2"></a>
## 2. 反推表面：为什么答案不唯一

### 从明暗恢复形状：为什么一张亮度图不够恢复 3D

![Slide 23 - Recovering surface reflectance](assets/05-image-formation-ii/slide-23.png)

checker-阴影 illusion 说明：同样的像素强度不一定代表同样的材质颜色。人眼会结合 cylinder 的形状和阴影的位置判断哪个 square 处在阴影中。

![Slide 25 - Recovering surface normal](assets/05-image-formation-ii/slide-25.png)

假设 albedo（reflectance）不变、光照方向已知、只使用 Lambertian（朗伯）模型，那么：

$$
\frac{I_D(x)}{I_LR}=\mathbf N(x)^\top\mathbf L=\cos\theta.
$$

这个式子只能告诉我们法线和光之间的夹角 $\theta$ ，不能唯一告诉我们完整的三维法线向量。换句话说，一个亮度值对应许多可能的表面方向。

> **老师原话**：“We cannot recover the single normal vector, but we can recover what the angle is.”
>
> **理解**：已知与光线的夹角，表面法线仍可绕光线方向转动，因此还没有唯一方向。

![Slide 27 - Shape from shading](assets/05-image-formation-ii/slide-27.png)

**Shape from shading** 是从单张图的亮暗变化推测三维形状。要让它可行，通常还要额外假设：

- 表面颜色大致不变；
- 光源位置和强度已知或稳定；
- 邻近表面比较平滑；
- 物体边界的一些法线方向可推断。

真实 face、纹理表面、多种材质和多盏灯很容易违反这些假设，所以这不是一个总能正确的直接公式，而是一个需要 assumptions 的反向问题。

### 亮度、反射率和照明

![Slide 29 - Luminance decomposition](assets/05-image-formation-ii/slide-29.png)

可以先记一个简化关系：

$$
\text{luminance}(x)
=\text{reflectance}(x)\times\text{illumination}(x).
$$

难点在于照片通常只给我们左边的结果，不直接告诉我们右边每一项。亮度的突然变化可能来自：

- 材质颜色变化；
- 表面法线变化；
- 投影阴影；
- 镜面高光；
- 多光源造成的复杂照明。

![Slide 31 - Cast shadow](assets/05-image-formation-ii/slide-31.png)

投影阴影是照明变了，不是表面材质变了。如果算法把每个强烈的边缘都当成材质边界，就会把阴影误判为物体结构。

![Slide 32 - Specularity](assets/05-image-formation-ii/slide-32.png)

镜面反射具有明显的方向性，强烈依赖相机和光的方向。相机轻微移动，高光可能移动；这和“表面亮度不随观察方向改变”的 Lambertian 假设不同。

![Slide 34 - Transparency and translucency](assets/05-image-formation-ii/slide-34.png)

- 透明：光直接穿过；
- 半透明：光穿过并在材料内部散射，因此看起来模糊。

各向异性表面还会因为微小沟槽，让反射随方向改变。这些例子说明，真实图像的形成比一个简单乘法更复杂。

<a id="topic-3"></a>
## 3. 边缘：把亮度变化算出来

### 梯度：把“变化快”写成数字

![Slide 39 - Characterising edges](assets/05-image-formation-ii/slide-39.png)

沿一条水平扫描线看图像强度：平坦区域变化慢，边缘附近变化快。对强度求导数，就能突出这种变化。

![Slide 40 - Gradient](assets/05-image-formation-ii/slide-40.png)

二维图像 $f(x,y)$ 的梯度是：

$$
\nabla f=
\begin{bmatrix}
\frac{\partial f}{\partial x}\\[4pt]
\frac{\partial f}{\partial y}
\end{bmatrix}.
$$

它有两个重要属性：

- **幅度**：变化有多强；
- **direction**：变化最快的方向。

$$
\lVert\nabla f\rVert
=\sqrt{\left(\frac{\partial f}{\partial x}\right)^2+
\left(\frac{\partial f}{\partial y}\right)^2},
\qquad
\theta=\operatorname{atan2}\left(\frac{\partial f}{\partial y},\frac{\partial f}{\partial x}\right).
$$

![Slide 42 - Edge filters](assets/05-image-formation-ii/slide-42.png)

在数字图像中，偏导数用有限差分、Sobel 或高斯导数卷积核近似。保留带符号响应，可以区别由暗到亮和由亮到暗；取绝对值后只得到边缘强度。

### 边缘很有用，但不等于物体边界

![Slide 45 - Edges and image recognition](assets/05-image-formation-ii/slide-45.png)

回看前面“亮度成因”的阴影与反光图：这些位置的亮度也会快速变化。

因此边缘检测器找到的是“变化的位置”，不是自动找到了“物体真正的轮廓”。低对比度的物体边界可能没有明显边缘；阴影或纹理却可能产生很强的边缘。

<a id="topic-4"></a>
## 4. 变化之后：什么保持稳定

### 不变、容忍度和等变

![Slide 46 - Invariance definitions](assets/05-image-formation-ii/slide-46.png)

- **Invariant**：输入发生某种变化，表示完全不变；
- **Tolerant / robust**：表示会变，但影响较小；
- **Equivariant**：输入怎样移动，输出按可预测的方式移动。

例如物体平移后，边缘图也跟着平移。边缘图不是逐像素完全不变，而是平移等变；后面再做池化，最终类别结果才可能近似平移-不变。

#### 光照强度的变化

![Slide 47 - Invariant to light intensity shift](assets/05-image-formation-ii/slide-47.png)

如果整张图只加一个常数 $b$ ：

$$
f_{\mathrm{new}}(x,y)=f(x,y)+b,
$$

那么：

$$
\nabla f_{\mathrm{new}}=\nabla f.
$$

所以导数对所有像素加同一亮度常数不变。但如果是对比度缩放， $f_{\mathrm{new}}=af$ ，梯度幅度会乘以 $a$ ，固定阈值可能需要重新调整。

#### 其他变化

![Slide 48 - Light direction](assets/05-image-formation-ii/slide-48.png)

光源方向改变会移动阴影或高光，因此比较图中的边缘时，先区分“物体动了”还是“照明变了”。

![Slide 49 - Translation](assets/05-image-formation-ii/slide-49.png)

平移后要看边缘是否跟随物体移动；比较同一个固定像素位置的值，不能用来判断它是否等变。

![Slide 50 - Rotation](assets/05-image-formation-ii/slide-50.png)

旋转改变边缘朝向，因此横向与纵向滤波器的响应会重新分配；方向变了不等于边缘消失。

![Slide 51 - Scale](assets/05-image-formation-ii/slide-51.png)

缩放改变结构占据的像素数。同一个固定窗口，可能从覆盖整个拐角变成只覆盖其中一小段。

![Slide 52 - 3D pose](assets/05-image-formation-ii/slide-52.png)

三维姿态变化可能露出原来看不见的表面；这比在平面中旋转整张图更复杂。

一个简单边缘检测器不可能自动解决所有变化。实际识别会使用多尺度、多方向、归一化、池化、数据增强或学习得到的特征。

## 本讲自测

1. 同样一个较暗像素，可能由哪些不同因素造成？
2. 平坦区域、阴影边缘和物体轮廓的梯度分别告诉我们什么？
3. 整图加常数与乘常数，对梯度有何不同影响？
