# COMP90086 Lecture 3 - Spatial Filtering

来源：`lecture/COMP90086-03-Filters.pdf` 与 `transcript/COMP90086_2026_SM2 Week-02-W-transcript.txt`。

这篇讲的是：**一个 pixel 的新值，要不要参考附近的 pixels？如果要参考，怎样组合它们？**

## 1. 三种 operator：看一个点、看邻居、做加权和

![Slide 6 - Pixel operator](assets/03-filters/slide-06.png)

### Pixel operator

输出位置 $(i,j)$ 只看输入同一个位置的 pixel。例如把每个 pixel 变亮、变暗或做 gamma correction。每个位置独立计算，不看邻居。

> **老师原话**：“The output of the pixel intensity depends only on the input pixel. It doesn't depend on the neighbours.”

### Local operator

输出位置 $(i,j)$ 会看它周围的一个小区域。blur、sharpening 和 edge detection 都属于这一类。这个小区域叫 **neighbourhood**，决定它能看到多远。

### Linear filter

linear filter 是 local operator 的一种：把 neighbourhood 中的 pixel 分别乘以权重，再相加。权重排成的小矩阵叫 **kernel** 或 **filter**。

![Slide 8 - Local operator](assets/03-filters/slide-08.png)

## 2. Linear filtering 到底在算什么

![Slide 9 - Linear filtering](assets/03-filters/slide-09.png)

把 kernel 放在 image 的一个位置，对齐后逐项相乘，再把结果相加：

$$
g(i,j)=\sum_{u,v}h(u,v)f(i-u,j-v).
$$

符号含义是：

- $f$：输入 image；
- $h$：kernel 中的权重；
- $g$：输出 image；
- $(i,j)$：当前输出位置；
- $u,v$：在 neighbourhood 中移动的偏移量。

如果 kernel 中心是 $1$、其他位置是 $0$，输出大致等于原图。如果中心右边的权重是 $1$，输出会读取右邻居，所以整张图看起来向左移动。这些小例子很适合检查自己是否理解了 kernel 的方向。

## 3. Cross-correlation 和 convolution

![Slide 17 - Cross-correlation vs convolution](assets/03-filters/slide-17.png)

两者都做“滑动、相乘、相加”，唯一关键区别是 kernel 是否翻转：

| 操作 | 使用 kernel 前是否翻转？ |
| --- | --- |
| Cross-correlation | 不翻转，直接使用 |
| Convolution | 先旋转 $180^\circ$，再使用 |

如果 kernel 关于中心对称，翻转前后一样，两个结果就相同；如果 kernel 不对称，方向会改变。

> **老师原话**：“The kernel ... is flipped vertically and horizontally. This is the key difference between convolution and cross-correlation.”

![Slide 19 - Filtering recap](assets/03-filters/slide-19.png)

很多 deep-learning library 把函数叫作 `convolution`，实际做的却是 cross-correlation。CNN 里的 kernel 是从数据学习出来的自由参数，所以整体表达能力通常不受预先翻转影响；但在 signal processing 中，convolution 的定义仍然必须记得，因为 convolution theorem 使用的就是严格定义。

### 手算一个位置

![Slide 11 - Filtering example](assets/03-filters/slide-11.png)

1. 把 kernel 的中心放在当前位置；
2. 取出被覆盖的 neighbourhood；
3. 每个 pixel 与对应 kernel weight 相乘；
4. 把所有乘积相加；
5. 把总和写到 output 的当前位置；
6. 移动 kernel，重复进行。

如果只允许 kernel 完全落在 image 内部，就是 **valid filtering**，边界附近会没有输出。

## 4. 常见 filters：它们各自想做什么

### Blur：让变化变慢

![Slide 27 - Gaussian filter](assets/03-filters/slide-27.png)

average filter 给 neighbourhood 中每个 pixel 相同权重；Gaussian filter 离中心越近权重越大，离中心越远权重越小。二维 Gaussian 的形式是：

$$
G_\sigma(x,y)=
\frac{1}{2\pi\sigma^2}
\exp\left(-\frac{x^2+y^2}{2\sigma^2}\right).
$$

$\sigma$ 控制影响范围：$\sigma$ 越大，blur 越强。为了不改变图像整体平均亮度，blur kernel 通常会归一化，使所有权重的和为 $1$。

![Slide 28 - Blur filters](assets/03-filters/slide-28.png)

### Sobel：找变化快的地方

![Slide 29 - Sobel x](assets/03-filters/slide-29.png)

![Slide 30 - Sobel y](assets/03-filters/slide-30.png)

Sobel filter 近似计算横向或纵向的 derivative：

$$
S_x=
\begin{bmatrix}
1&0&-1\\
2&0&-2\\
1&0&-1
\end{bmatrix},
\qquad
S_y=
\begin{bmatrix}
1&2&1\\
0&0&0\\
-1&-2&-1
\end{bmatrix}.
$$

平坦区域的左右或上下差异小，response 接近 0；edge 附近差异大，response 较大。保留正负号可以区分亮到暗和暗到亮；取绝对值后只剩 edge strength，再用 threshold 选出明显 edges。

> **老师原话**：“Sobel filter is an edge detector.”

### Sharpening 和 motion blur

sharpening 通常让中心 weight 为正、邻居 weights 为负，从而放大中心与邻域的差异；motion blur 则沿运动方向平均，例如中间一行放三个 $1/3$，会让图像沿水平方向变模糊。

![Slide 35 - Common filters](assets/03-filters/slide-35.png)

## 5. Colour image 的 kernel 多了一个维度

![Slide 31 - Colour filtering](assets/03-filters/slide-31.png)

grayscale image 只有空间维度；RGB image 还有 channel 维度。一个 colour filter 的尺寸可以是 $K_h\times K_w\times3$，它会同时看同一个 neighbourhood 的 R、G、B，并把所有乘积加在一起，得到一个 output value。

如果想得到多张 feature maps，就使用多个 kernels。每一个 kernel 产生一张 map，所有 maps 叠起来形成新的多-channel image。

常见错误是把 `height × width × channel` 当成普通二维 image，忘记 kernel 还要覆盖 channel 维度。

## 6. Kernel size、support 和 $\sigma$

![Slide 32 - Filter support](assets/03-filters/slide-32.png)

- **Kernel size**：实际存储和计算的窗口大小；
- **Support**：某个 pixel 可能影响输出的范围；
- **$\sigma$**：Gaussian 权重衰减的尺度。

Gaussian 理论上影响无限远，但电脑只能使用有限大小的 kernel，所以要截断它。窗口太小会截断重要权重；窗口太大则增加计算量。

固定 $\sigma$ 时，只增加窗口大小，新增位置的权重可能已经很小；增加 $\sigma$ 则会让更远的邻居获得更大权重，blur 也会明显增强。不要把 kernel size 和 $\sigma$ 当成同一个东西。

### Linear filtering 的四个代数性质

![Slide 37 - Filter properties](assets/03-filters/slide-37.png)

这些性质帮助我们重排计算：

- **Commutative**：$f*h=h*f$；
- **Associative**：$f*h_1*h_2=f*(h_1*h_2)$；
- **Distributive**：filter 可以分配到相加的 images 上；
- **Scalar associativity**：$k(f*h)=(kf)*h=f*(kh)$。

理论上可以交换或合并操作，但实际还要考虑 image 大小、内存访问、是否需要中间结果和 library 的实现。

## 7. Separable filter：把二维计算拆成两次一维计算

![Slide 39 - Separable filters](assets/03-filters/slide-39.png)

如果二维 kernel 可以写成一个 column vector 和一个 row vector 的 outer product，就叫 **separable**。此时可以：

1. 先对每一行做一次一维 filtering；
2. 再对每一列做一次一维 filtering。

原本一个 $k\times k$ kernel 每个 pixel 约需 $k^2$ 次乘法；拆开后约需 $2k$ 次，$k$ 较大时差别很明显。Gaussian kernel 常常接近或可以构造成 separable kernel。

![Slide 40 - Separable filter calculation](assets/03-filters/slide-40.png)

Associativity 还允许先合并多个 linear filters，再对 image 扫描一次。这样可以更快，但如果需要保留中间结果，或者合并后 kernel 变得太大，就不一定值得。

## 8. Output size：为什么边缘会消失

![Slide 41 - Valid convolution](assets/03-filters/slide-41.png)

对 $N\times N$ input、$K\times K$ kernel、stride 为 1 的 valid filtering，output size 是：

$$
(N-K+1)\times(N-K+1).
$$

因为 kernel 不能伸出 image 边界。如果希望 output 和 input 一样大，就要在 image 外面补 pixels，也就是 **padding**。

### 四种常见 border rule

![Slide 42 - Constant padding](assets/03-filters/slide-42.png)

- **Constant / zero padding**：外面补固定值，简单但可能制造黑边；

![Slide 43 - Wrap](assets/03-filters/slide-43.png)

- **Wrap**：把左边接到右边、上边接到下边，适合 tileable texture，不适合普通照片；

![Slide 44 - Clamp](assets/03-filters/slide-44.png)

- **Clamp / replicate**：把边缘 pixel 向外延伸，普通照片通常较自然；

![Slide 45 - Reflect](assets/03-filters/slide-45.png)

- **Reflect**：把 image 镜像延伸，常能减少人工边界。

没有一种 border rule 永远最好。要根据 image 是否周期性、任务是否关心边缘以及 filter 的性质来选择。

> **老师原话**：“We have different ways of padding.”

## 9. 本讲复习

1. Pixel operator 只看当前 pixel；local operator 会看 neighbourhood；linear filter 用权重做加权和。
2. Cross-correlation 不翻 kernel；convolution 要先旋转 $180^\circ$。
3. Blur 减少快速变化，Sobel 找快速变化，sharpening 放大细节，motion blur 模拟运动造成的平均。
4. Colour image 的 kernel 必须覆盖 channel 维度。
5. Kernel size、support 和 $\sigma$ 不同；separability 可以显著减少计算。
6. Output size 和 border handling 是实现 filtering 时不能省略的部分。
