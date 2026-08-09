# COMP90086 Lecture 4 - Frequency Filtering

来源：`lecture/COMP90086-04-Fourier.pdf` 与 `transcript/COMP90086_2026_SM2 Week-02-F-transcript.txt`。

这篇换一种方式看 image：不只问“每个 pixel 是多少”，还问“图像里变化得快和变化得慢的部分各有多少”。这就是 frequency-domain view。

## 1. 为什么要看 frequency

![Slide 6 - Signals as sinusoids](assets/04-fourier/slide-06.png)

一维 signal 可以看成许多 sinusoids 相加。一个 sinusoid 可以写成：

$$
y=A\sin(\omega x+\varphi).
$$

- $A$：amplitude，波动有多大；
- $\omega$：frequency，波动有多快；
- $\varphi$：phase，波形从哪里开始，相当于平移。

提高 $\omega$，波纹更密；提高 $A$，波峰波谷更高；改变 $\varphi$，形状整体移动，但频率不变。

> **老师原话**：“If you increase omega, it means the frequency increases. The change in the image is more frequent.”

![Slide 8 - Sinusoid parameters](assets/04-fourier/slide-08.png)

对 image 来说，缓慢变化的大轮廓是低 frequency；边缘、细纹理和小细节是 high frequency。频域的价值是：有些变化在 spatial image 中不明显，但在频率分布中很明显。

## 2. Fourier transform 输出什么

![Slide 18 - Fourier transform](assets/04-fourier/slide-18.png)

Fourier transform 把 signal 从 spatial/time domain 改写到 frequency domain。每个 frequency 对应一个 complex coefficient。这个 complex value 要拆成两部分理解：

- **Magnitude**：这个 frequency 有多强；
- **Phase**：这个 frequency 在整体结构中的位置关系。

不能只看 magnitude。两个 image 可能有相似的 magnitude，却因为 phase 不同而有完全不同的可辨认结构。

![Slide 20 - DC component](assets/04-fourier/slide-20.png)

frequency $0$ 叫 **DC component**，代表平均亮度或平均值。低 frequency 描述大范围、缓慢的变化；高 frequency 描述快速变化。

> **老师原话**：“The middle one is a low frequency. Low frequency means the overall structure.”

![Slide 21 - Magnitude and phase](assets/04-fourier/slide-21.png)

### 一个简单的读图方法

看到一个频谱时先问：

1. 中心是否很亮？如果是，图像可能有较强的平均亮度或低频结构；
2. 远离中心是否有亮点？如果是，图像包含快速重复变化；
3. 亮点的方向是什么？它反映 image 中重复 pattern 的方向关系；
4. 频谱是集中还是分散？越分散，通常说明频率成分更丰富。

## 3. 从一维 signal 到二维 image

![Slide 25 - Fourier transform of an image](assets/04-fourier/slide-25.png)

image 有横向和纵向两个空间方向，所以它的频域也有 $\omega_x$ 和 $\omega_y$ 两个方向。通常把 zero frequency 移到频谱中心：

- 中心附近：low spatial frequencies；
- 离中心越远：higher spatial frequencies。

![Slide 26 - Interpreting Fourier spectra](assets/04-fourier/slide-26.png)

对一组规则 stripe：stripe 越密，频谱亮点离中心越远；stripe 旋转，频谱也旋转。image 中的 edge 方向与频谱亮点方向存在垂直关系，读图时不要把两者当成同一个方向。

## 4. Magnitude 和 phase 谁更重要

![Slide 33 - Magnitude and phase](assets/04-fourier/slide-33.png)

可以把 magnitude 想成“各类频率能量的分布”，把 phase 想成“这些频率怎样在空间中排列”。

![Slide 34 - Mixing magnitude and phase](assets/04-fourier/slide-34.png)

课堂把不同 image 的 magnitude 和 phase 交叉组合。重建结果通常保留 magnitude 来源的整体亮度/纹理感觉，但可辨认的轮廓和物体结构更接近 phase 来源。

这不是说 magnitude 没有用，而是提醒我们：**phase 不能简单当成 noise。** 它承载了频率成分之间的空间关系，缺少它就很难恢复清晰的物体结构。

## 5. Convolution theorem：两种 filtering 做法可以互换

![Slide 37 - Convolution theorem](assets/04-fourier/slide-37.png)

核心公式是：

$$
\mathcal F\{h*f\}
=\mathcal F\{h\}\,\mathcal F\{f\}.
$$

它的意思是：

- spatial domain 的 convolution，变成 frequency domain 的逐元素相乘；
- frequency domain 相乘，再 inverse transform，就得到 spatial filtering 的结果；
- 反过来，spatial domain 相乘对应 frequency domain 的 convolution。

因此 filtering 有两条路线：

1. 直接在 image 上滑动 kernel；
2. 把 image 和 filter 都 transform 到频域，相乘后 inverse transform。

哪一条更快取决于 image 大小、kernel 大小和实际 library；公式告诉我们两者等价，不代表每个 implementation 的成本一样。

## 6. Low-pass、high-pass 和 band-pass

### Low-pass：保留大轮廓

![Slide 39 - Low-pass filter](assets/04-fourier/slide-39.png)

low-pass 让低 frequency 通过，削弱 high frequency。因此结果更平滑：大体布局保留，边缘、细纹理和小细节变弱。

![Slide 40 - Low-pass mask](assets/04-fourier/slide-40.png)

在频域中，filter 可以看成一个 mask：想保留的位置取值接近 1，想删除的位置取值接近 0。把 mask 与 spectrum 逐元素相乘，再 inverse transform，就得到 filtered image。

### High-pass：保留快速变化

![Slide 42 - High-pass filter](assets/04-fourier/slide-42.png)

high-pass 做相反的事：去掉低 frequency，强调 edges 和细节。结果常像 edge sketch，因为平滑区域和整体亮度被移除了。

### Band-pass：只保留一个频率范围

band-pass 同时去掉太低和太高的 frequency，只保留中间范围。它适合研究某种尺度的纹理或 pattern。

## 7. Ringing：为什么硬切频率会出现波纹

![Slide 45 - Ringing artefact](assets/04-fourier/slide-45.png)

如果 mask 在某个频率位置突然从 1 变成 0，就是 hard cutoff。它在 spatial domain 对应一个会振荡的 kernel，遇到 sharp edge 时可能在边缘两侧产生亮暗交替的波纹，这叫 **ringing artifact**。

直觉是：突然截断一大组 sinusoids，重建时会产生不自然的振荡。Gaussian mask 从保留到删除是平滑过渡，所以通常比矩形 hard mask 更少 ringing，但它的 cutoff 也没有那么锐利。

> **老师原话**：“When you convert this frequency spectrum to image domain, you may see ringing.”

![Slide 48 - Gaussian low-pass](assets/04-fourier/slide-48.png)

![Slide 49 - Gaussian high-pass](assets/04-fourier/slide-49.png)

若 Gaussian low-pass transfer function 是 $H_{\mathrm{LP}}$，对应的 high-pass 可以写为：

$$
H_{\mathrm{HP}}=1-H_{\mathrm{LP}}.
$$

## 8. Frequency domain 和 image compression

![Slide 52 - Frequency-domain compression](assets/04-fourier/slide-52.png)

人眼通常对某些高 frequency 差异不太敏感，所以压缩可以减少一部分高频信息而不让缩略图明显变样。但对 computer vision 来说，高频可能正是 edge、小目标和纹理，不能简单当成“没用的信息”。

![Slide 53 - JPEG and DCT](assets/04-fourier/slide-53.png)

JPEG 的简化流程是：

1. 把图像分成 $8\times8$ blocks；
2. 对每个 block 做 discrete cosine transform（DCT）；
3. 对不同 frequency coefficients 做量化，高频通常更激进；
4. 编码并保存。

所以 JPEG artifacts 常在 edges、细纹理和重复 pattern 附近更明显。

## 9. Frequency analysis 的其他用途

![Slide 56 - Dog vs hot dog frequency differences](assets/04-fourier/slide-56.png)

adversarial image 在 spatial domain 中可能只改变很少 pixels，但在频域比较时，magnitude 或 phase 的变化可能更容易被发现。这能帮助我们研究 model 为什么改变 prediction。

> **老师原话**：“If you compare the image domain, you barely see the difference, but in the frequency domain you can see the difference.”

![Slide 57 - GAN-generated images](assets/04-fourier/slide-57.png)

真实照片和 GAN-generated image 也可能有不同的 frequency statistics。frequency analysis 因此可以用于 image forensics，例如寻找生成图像或处理图像留下的规律。

## 10. 本讲复习

1. Signal 可以看成许多 sinusoids 的组合。
2. Fourier transform 把 spatial pattern 改写成 frequency components。
3. 每个 frequency 有 magnitude 和 phase；phase 对空间结构很重要。
4. 频谱中心通常是低频，离中心越远是高频。
5. Spatial convolution 等价于 frequency domain multiplication。
6. Low-pass 保留整体、削弱细节；high-pass 强调边缘；band-pass 选择中间范围。
7. Hard cutoff 可能产生 ringing；平滑的 Gaussian mask 通常更自然。
8. Frequency domain 可用于 filtering、compression 和 forensics，但高频并不等于无用。
