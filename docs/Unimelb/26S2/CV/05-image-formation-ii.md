# COMP90086 Lecture 5 - Image Formation II

来源：`lecture/COMP90086-05-ImageFormationII.pdf` 与 `transcript/COMP90086_2026_SM2 Week-03-W-transcript.txt`。

这篇继续解释“照片为什么会长这样”。重点有三条线：**光和表面怎样决定亮度、颜色怎样被三个 channel 表示、image 中的 edge 对哪些变化保持稳定。**

## 1. Lambertian model：光、颜色和表面方向一起决定亮度

![Slide 5 - Image formation model](assets/05-image-formation-ii/slide-05.png)

> **老师原话**：“This lesson will introduce image formation two. We will continue image formation, and also talk about colour space.”

一张照片中的亮度不是物体的“固定标签”。它同时受到 light source、surface colour 和 surface orientation 影响。

![Slide 6 - Diffuse Lambertian reflectance](assets/05-image-formation-ii/slide-06.png)

在最简单的 diffuse/Lambertian model 中：

$$
I_D(x)=I_LR(x)\,\mathbf N(x)^\top\mathbf L.
$$

变量含义是：

- $I_D(x)$：位置 $x$ 观察到的 diffuse intensity；
- $I_L$：light source 的强度；
- $R(x)$：surface reflectance，可先理解成材质/颜色；
- $\mathbf N(x)$：surface normal，垂直于表面的单位向量；
- $\mathbf L$：指向 light source 的单位向量。

两个单位向量的 dot product 等于夹角的 cosine：

$$
\mathbf N(x)^\top\mathbf L=\cos\theta.
$$

表面正对光源时，$\theta$ 小，亮度较高；表面转开时，亮度降低。这个模型把亮度写成几个因素的乘积，正好也说明了为什么反推困难：一个 pixel 变亮，可能是光变强、材质更亮，也可能是表面方向变了。

> **老师原话**：“If you look straight to the sun, it will be very bright because the angle is zero.”

## 2. Colour 不是一个 wavelength，而是一段 spectrum 的结果

![Slide 10 - Spectral power distribution](assets/05-image-formation-ii/slide-10.png)

可见光大约在 $400$ 到 $700\ \mathrm{nm}$。一个物体通常反射一整段 wavelength，形成 spectral power distribution（SPD），而不是只反射一种颜色的光。

![Slide 11 - Human cone responses](assets/05-image-formation-ii/slide-11.png)

人眼有三类主要 cone，普通 colour camera 也常用三个有重叠范围的 sensor。因此 camera 不会记录完整 spectrum，而是把 spectrum 分别和三个 sensitivity curve 加权累积。

![Slide 14 - Different spectra can appear as the same colour](assets/05-image-formation-ii/slide-14.png)

对 channel $c$，简化写法是：

$$
I_c=\int_{400\ \mathrm{nm}}^{700\ \mathrm{nm}}
I(\lambda)S_c(\lambda)\,d\lambda.
$$

这里 $I(\lambda)$ 是进入 camera 的 spectrum，$S_c(\lambda)$ 是 channel 的 sensitivity。不同 SPD 经过这三个积分后，可能得到相同的三通道数值；这叫 metameric ambiguity，也就是“物理光谱不同，但看起来是同一个颜色”。

## 3. Colour spaces：同一颜色可以用不同坐标表示

![Slide 15 - Trichromatic colour response](assets/05-image-formation-ii/slide-15.png)

常见 colour spaces 的用途不同：

| Colour space | 更适合怎样理解 |
| --- | --- |
| RGB | 最常见的图像存储形式 |
| HSL / HSV | 用 hue、saturation、lightness/value 进行直观调整 |
| CIE XYZ | 根据标准观察者的 colour matching 定义的中间空间 |
| Lab | 把 lightness 与 red-green、blue-yellow 方向分开 |

![Slide 18 - Colour transforms](assets/05-image-formation-ii/slide-18.png)

一个简化的 RGB 到 XYZ 变换可以写成：

$$
\begin{bmatrix}X\\Y\\Z\end{bmatrix}
=\mathbf M
\begin{bmatrix}R\\G\\B\end{bmatrix}.
$$

$\mathbf M$ 由具体 RGB primaries 和 white point 决定。实际 library 还要处理 encoded RGB 的 linearisation，所以不要把所有 colour transform 都简单理解成“换三个数字的位置”。

![Slide 19 - Colour swap example](assets/05-image-formation-ii/slide-19.png)

如果直接在 RGB 中交换 R 和 G，亮度关系也可能一起改变。若目标是改 red-green appearance、但尽量保留 lightness，可以先转到 Lab，再调整 $a^*$ axis。这就是为什么做 colour manipulation 前要先选择合适的坐标系。

## 4. Shape from shading：为什么一张亮度图不够恢复 3D

![Slide 23 - Recovering surface reflectance](assets/05-image-formation-ii/slide-23.png)

checker-shadow illusion 说明：同样的 pixel intensity 不一定代表同样的材质颜色。人眼会结合 cylinder 的形状和 shadow 的位置判断哪个 square 处在阴影中。

![Slide 25 - Recovering surface normal](assets/05-image-formation-ii/slide-25.png)

假设 albedo（reflectance）不变、light direction 已知、只使用 Lambertian model，那么：

$$
\frac{I_D(x)}{I_LR}=\mathbf N(x)^\top\mathbf L=\cos\theta.
$$

这个式子只能告诉我们 normal 和 light 之间的夹角 $\theta$，不能唯一告诉我们完整的三维 normal vector。换句话说，一个亮度值对应许多可能的表面方向。

> **老师原话**：“We cannot recover the single normal vector, but we can recover what the angle is.”

![Slide 27 - Shape from shading](assets/05-image-formation-ii/slide-27.png)

**Shape from shading** 是从单张图的亮暗变化推测三维形状。要让它可行，通常还要额外假设：

- surface colour 大致不变；
- light source 位置和强度已知或稳定；
- 邻近表面比较平滑；
- object boundary 的一些 normals 可推断。

真实 face、纹理表面、多种材质和多盏灯很容易违反这些假设，所以这不是一个总能正确的直接公式，而是一个需要 assumptions 的 inverse problem。

> **老师原话**：“Shape from shading is recovering the 3D shape from a single image ... we need additional assumptions.”

## 5. Luminance、reflectance 和 illumination

![Slide 29 - Luminance decomposition](assets/05-image-formation-ii/slide-29.png)

可以先记一个简化关系：

$$
\text{luminance}(x)
=\text{reflectance}(x)\times\text{illumination}(x).
$$

难点在于照片通常只给我们左边的结果，不直接告诉我们右边每一项。一个 sharp intensity change 可能来自：

- material colour change；
- surface normal change；
- cast shadow；
- specular highlight；
- 多光源造成的复杂 illumination。

![Slide 31 - Cast shadow](assets/05-image-formation-ii/slide-31.png)

cast shadow 是 illumination 变了，不是表面材质变了。如果算法把每个 strong edge 都当成 material boundary，就会把 shadow 误判为物体结构。

![Slide 32 - Specularity](assets/05-image-formation-ii/slide-32.png)

specular reflection 类似镜面反射，强烈依赖 camera 和 light 的方向。camera 轻微移动，highlight 可能移动；这和“所有光都由 diffuse surface 均匀散射”的 Lambertian 假设不同。

![Slide 34 - Transparency and translucency](assets/05-image-formation-ii/slide-34.png)

- transparent：光直接穿过；
- translucent：光穿过并在材料内部散射，因此看起来模糊。

anisotropic surface 还会因为微小 grooves，让反射随方向改变。它们都说明真实 image formation 比一个简单乘法更复杂。

## 6. Gradient：把“变化快”写成数字

![Slide 39 - Characterising edges](assets/05-image-formation-ii/slide-39.png)

沿一条水平 scanline 看 image intensity：平坦区域变化慢，edge 附近变化快。对 intensity 求 derivative，就能突出这种变化。

![Slide 40 - Gradient](assets/05-image-formation-ii/slide-40.png)

二维 image $f(x,y)$ 的 gradient 是：

$$
\nabla f=
\begin{bmatrix}
\frac{\partial f}{\partial x}\\[4pt]
\frac{\partial f}{\partial y}
\end{bmatrix}.
$$

它有两个重要属性：

- **magnitude**：变化有多强；
- **direction**：变化最快的方向。

$$
\lVert\nabla f\rVert
=\sqrt{\left(\frac{\partial f}{\partial x}\right)^2+
\left(\frac{\partial f}{\partial y}\right)^2},
\qquad
\theta=\operatorname{atan2}\left(\frac{\partial f}{\partial y},\frac{\partial f}{\partial x}\right).
$$

![Slide 42 - Edge filters](assets/05-image-formation-ii/slide-42.png)

在 digital image 中，partial derivative 用 finite-difference、Sobel 或 derivative-of-Gaussian kernel 近似。保留 signed response，可以区别 dark-to-light 和 light-to-dark；取 absolute value 后只得到 edge strength。

## 7. Edge 很有用，但不等于物体边界

![Slide 45 - Edges and image recognition](assets/05-image-formation-ii/slide-45.png)

high gradient 只说明 image intensity 在变，可能是：

- occlusion boundary；
- corner 或其他 surface normal change；
- reflectance/colour change；
- cast shadow 或 light change。

因此 edge detector 找到的是“变化的位置”，不是自动找到了“物体真正的轮廓”。低 contrast 的物体边界可能没有明显 edge；shadow 或 texture 却可能产生很强的 edge。

## 8. Invariant、tolerant 和 equivariant

![Slide 46 - Invariance definitions](assets/05-image-formation-ii/slide-46.png)

- **Invariant**：输入发生某种变化，representation 完全不变；
- **Tolerant / robust**：representation 会变，但影响较小；
- **Equivariant**：输入怎样移动，输出按可预测的方式移动。

例如物体平移后，edge map 也跟着平移。edge map 不是逐 pixel 完全不变，而是 translation-equivariant；后面再做 pooling，最终类别结果才可能近似 translation-invariant。

### 光照强度的变化

![Slide 47 - Invariant to light intensity shift](assets/05-image-formation-ii/slide-47.png)

如果整张图只加一个常数 $b$：

$$
f_{\mathrm{new}}(x,y)=f(x,y)+b,
$$

那么：

$$
\nabla f_{\mathrm{new}}=\nabla f.
$$

所以 derivative 对 additive brightness shift 不变。但如果是 contrast scaling，$f_{\mathrm{new}}=af$，gradient magnitude 会乘以 $a$，固定 threshold 可能需要重新调整。

> **老师原话**：“This edge is invariant to light intensity, but you need to be aware of the threshold.”

### 其他变化

![Slide 48 - Light direction](assets/05-image-formation-ii/slide-48.png)

![Slide 49 - Translation](assets/05-image-formation-ii/slide-49.png)

![Slide 50 - Rotation](assets/05-image-formation-ii/slide-50.png)

![Slide 51 - Scale](assets/05-image-formation-ii/slide-51.png)

![Slide 52 - 3D pose](assets/05-image-formation-ii/slide-52.png)

| 变化 | edge response 的直觉 |
| --- | --- |
| 加一个亮度常数 | derivative 不变 |
| 改变 contrast | edge 位置可能相近，但强度和 threshold 会变 |
| 改变 light direction | shadow 和 highlight 改变，通常不 invariant |
| 2D translation | edge map 跟着移动，属于 equivariance |
| 2D rotation | edge orientation 改变，方向专用 filter 的 response 会变 |
| scale | edge 宽度和 sampling 关系改变 |
| 3D pose | 可见区域、遮挡和轮廓都可能改变 |

一个简单 edge detector 不可能自动解决所有变化。实际 recognition 会使用多尺度、多方向、normalisation、pooling、data augmentation 或 learned features。

## 9. 本讲复习

1. Lambertian model 把亮度拆成 light、reflectance 和 normal-light angle，但单个 pixel 无法唯一恢复三维信息。
2. Colour channel 是 spectrum 和 sensor sensitivity 的加权积分，不是一个单独 wavelength。
3. 不同 colour spaces 适合不同操作；RGB 适合存储，Lab 更方便分离 lightness 和 colour axes。
4. Shape from shading 需要 assumptions；shadow、specularity、transparency 和多光源会破坏简单模型。
5. Gradient 描述 intensity 变化的强度和方向；strong edge 的物理原因不一定只有一个。
6. 识别系统要区分 invariance、tolerance 和 equivariance。
