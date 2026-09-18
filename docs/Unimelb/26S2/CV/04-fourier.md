# COMP90086 Lecture 4 - Frequency Filtering

来源：`lecture/COMP90086-04-Fourier.pdf` 与 `transcript/COMP90086_2026_SM2 Week-02-F-transcript.txt`。

这篇换一种方式看图像：不只问“每个像素是多少”，还问“图像里变化得快和变化得慢的部分各有多少”。这就是频域视图。

学习路线：[频率、幅度与相位](#topic-1) → [从公式到效果](#topic-2) → [波纹与压缩](#topic-3) → [用频谱检查图像](#topic-4)。

重点：频谱读图、卷积定理、低通与高通。难点：相位为何影响形状、硬截断为何产生波纹。压缩与生成图像检测只作应用补充。

<a id="topic-1"></a>
## 1. 读懂频谱：频率、幅度与相位

### 为什么要看频率

![Slide 6 - Signals as sinusoids](assets/04-fourier/slide-06.png)

一维信号可以看成许多正弦波相加。一个正弦波可以写成：

$$
y=A\sin(\omega x+\varphi).
$$

- $A$ ：振幅，波动有多大；
- $\omega$ ：频率，波动有多快；
- $\varphi$ ：相位，波形从哪里开始，相当于平移。

提高 $\omega$ ，波纹更密；提高 $A$ ，波峰波谷更高；改变 $\varphi$ ，形状整体移动，但频率不变。

![Slide 8 - Sinusoid parameters](assets/04-fourier/slide-08.png)

对图像来说，缓慢变化的大轮廓是低频率；边缘、细纹理和小细节是高频。频域的价值是：有些变化在空间图像中不明显，但在频率分布中很明显。

### 傅里叶变换输出什么

![Slide 18 - Fourier transform](assets/04-fourier/slide-18.png)

傅里叶变换把信号从空间域或时间域改写到频域。每个频率对应一个复数系数。这个复数值要拆成两部分理解：

- **Magnitude**：这个频率有多强；
- **Phase**：这个频率在整体结构中的位置关系。

先分清这两个量；后面用交换实验说明相位为什么不能丢。

![Slide 20 - DC component](assets/04-fourier/slide-20.png)

频率 $0$ 叫 **直流分量（DC component）**，代表平均亮度或平均值。低频率描述大范围、缓慢的变化；高频率描述快速变化。

![Slide 21 - Magnitude and phase](assets/04-fourier/slide-21.png)

图中的向量长度 $A$ 对应幅度，角度 $\phi$ 对应相位；它们共同描述一个复数系数，而不是两种互不相关的频率。

#### 一个简单的读图方法

看到一个频谱时先问：

1. 中心是否很亮？如果是，图像可能有较强的平均亮度或低频结构；
2. 远离中心是否有亮点？如果是，图像包含快速重复变化；
3. 亮点的方向是什么？它反映图像中重复模式的方向关系；
4. 频谱是集中还是分散？越分散，通常说明频率成分更丰富。

### 从一维信号到二维图像

![Slide 25 - Fourier transform of an image](assets/04-fourier/slide-25.png)

图像有横向和纵向两个空间方向，所以它的频域也有 $\omega_x$ 和 $\omega_y$ 两个方向。通常把零频率移到频谱中心：

- 中心附近：低空间频率；
- 离中心越远：更高空间频率。

![Slide 26 - Interpreting Fourier spectra](assets/04-fourier/slide-26.png)

对一组规则条纹：条纹越密，频谱亮点离中心越远；条纹旋转，频谱也旋转。图像中的边缘方向与频谱亮点方向存在垂直关系，读图时不要把两者当成同一个方向。

### 幅度和相位谁更重要

![Slide 33 - Magnitude and phase](assets/04-fourier/slide-33.png)

可以把幅度想成“各类频率能量的分布”，把相位想成“这些频率怎样在空间中排列”。

![Slide 34 - Mixing magnitude and phase](assets/04-fourier/slide-34.png)

课堂把不同图像的幅度和相位交叉组合。重建结果通常保留幅度来源的整体亮度/纹理感觉，但可辨认的轮廓和物体结构更接近相位来源。

这不是说幅度没有用，而是提醒我们：**相位不能简单当成噪声。** 它承载了频率成分之间的空间关系，缺少它就很难恢复清晰的物体结构。

<a id="topic-2"></a>
## 2. 频域滤波：从公式到效果

### 卷积定理：两种滤波做法可以互换

![Slide 37 - Convolution theorem](assets/04-fourier/slide-37.png)

核心公式是：

$$
\mathcal F\{h*f\}
=\mathcal F\{h\}\,\mathcal F\{f\}.
$$

它的意思是：

- 空间域的卷积，变成频域的逐元素相乘；
- 频域相乘，再逆变换，就得到空间滤波的结果；
- 反过来，空间域相乘对应频域的卷积。

因此滤波有两条路线：

1. 直接在图像上滑动卷积核；
2. 把图像和滤波器都变换到频域，相乘后逆变换。

哪一条更快取决于图像大小、卷积核大小和实际程序库；公式告诉我们两者等价，不代表每个实现的成本一样。

### 低通、高通和带通

#### 低通：保留大轮廓

![Slide 39 - Low-pass filter](assets/04-fourier/slide-39.png)

低通滤波让低频率通过，削弱高频。因此结果更平滑：大体布局保留，边缘、细纹理和小细节变弱。

![Slide 40 - Low-pass mask](assets/04-fourier/slide-40.png)

在频域中，滤波器可以看成一个掩膜：想保留的位置取值接近 1，想删除的位置取值接近 0。把掩膜与频谱逐元素相乘，再逆变换，就得到滤波后的图像。

#### 高通：保留快速变化

![Slide 42 - High-pass filter](assets/04-fourier/slide-42.png)

高通滤波做相反的事：去掉低频率，强调边缘和细节。结果常像边缘轮廓草图，因为平滑区域和整体亮度被移除了。

#### 带通：只保留一个频率范围

带通滤波同时去掉太低和太高的频率，只保留中间范围。它适合研究某种尺度的纹理或模式。

<a id="topic-3"></a>
## 3. 截断的代价：波纹与压缩

### 振铃：为什么硬切频率会出现波纹

![Slide 45 - Ringing artefact](assets/04-fourier/slide-45.png)

如果掩膜在某个频率位置突然从 1 变成 0，就是硬截断。它在空间域对应一个会振荡的卷积核，遇到突变的边缘时可能在边缘两侧产生亮暗交替的波纹，这叫 **振铃伪影**。

直觉是：突然截断一大组正弦波，重建时会产生不自然的振荡。高斯掩膜从保留到删除是平滑过渡，所以通常比矩形硬掩膜更少振铃，但它的截止边界也没有那么锐利。

![Slide 48 - Gaussian low-pass](assets/04-fourier/slide-48.png)

![Slide 49 - Gaussian high-pass](assets/04-fourier/slide-49.png)

若高斯低通传递函数是 $H_{\mathrm{LP}}$ ，对应的高通滤波可以写为：

$$
H_{\mathrm{HP}}=1-H_{\mathrm{LP}}.
$$

### 频域与图像压缩

![Slide 52 - Frequency-domain compression](assets/04-fourier/slide-52.png)

人眼通常对某些高频率差异不太敏感，所以压缩可以减少一部分高频信息而不让缩略图明显变样。但对计算机视觉来说，高频可能正是边缘、小目标和纹理，不能简单当成“没用的信息”。

![Slide 53 - JPEG and DCT](assets/04-fourier/slide-53.png)

JPEG 的简化流程是：

1. 把图像分成 $8\times8$ 块；
2. 对每个小块做离散余弦变换（DCT）；
3. 对不同频率系数做量化，高频通常更激进；
4. 编码并保存。

所以 JPEG 压缩痕迹常在边缘、细纹理和重复模式附近更明显。

<a id="topic-4"></a>
## 4. 补充：用频谱检查图像

### 频率分析的其他用途

![Slide 56 - Dog vs hot dog frequency differences](assets/04-fourier/slide-56.png)

对抗图像在空间域中可能只改变很少像素，但在频域比较时，幅度或相位的变化可能更容易被发现。这能帮助我们研究模型为什么改变预测。

![Slide 57 - GAN-generated images](assets/04-fourier/slide-57.png)

真实照片和 GAN 生成的图像也可能有不同的频率统计。频率分析因此可以用于图像取证，例如寻找生成图像或处理图像留下的规律。

## 本讲自测

1. 条纹变密后，中心化频谱的亮点向哪里移动？
2. 为什么交换两张图的相位会改变可辨认的结构？
3. 硬低通与高斯低通在边缘附近可能有什么不同？
