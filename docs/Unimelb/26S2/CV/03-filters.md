# COMP90086 Lecture 3 - Spatial Filtering

来源：`lecture/COMP90086-03-Filters.pdf` 与 `transcript/COMP90086_2026_SM2 Week-02-W-transcript.txt`。

这篇讲的是：**一个像素的新值，要不要参考附近的像素？如果要参考，怎样组合它们？**

学习路线：[一个输出怎样得到](#topic-1) → [平滑、边缘与通道](#topic-2) → [计算范围与效率](#topic-3) → [尺寸与补值](#topic-4)。

重点：滑动加权计算与滤波效果。难点：卷积的翻转方向、可分离计算。易错：核大小不等于高斯尺度，输出尺寸不等于原图尺寸。

<a id="topic-1"></a>
## 1. 局部计算：一个输出怎样得到

### 三种运算：看一个点、看邻居、做加权和

![Slide 6 - Pixel operator](assets/03-filters/slide-06.png)

#### 逐像素运算

输出位置 $(i,j)$ 只看输入同一个位置的像素。例如把每个像素变亮、变暗或做 gamma correction。每个位置独立计算，不看邻居。

#### 局部运算

输出位置 $(i,j)$ 会看它周围的一个小区域。模糊、锐化和边缘检测都属于这一类。这个小区域叫 **邻域**，决定它能看到多远。

#### 线性滤波器

线性滤波器是局部运算的一种：把邻域中的像素分别乘以权重，再相加。权重排成的小矩阵叫 **卷积核** 或 **滤波器**。

![Slide 8 - Local operator](assets/03-filters/slide-08.png)

看葡萄的边缘：右图把邻域差异加强，因此轮廓更明显，也可能把颗粒感一起放大。局部运算改变的是邻居之间的关系。

### 线性滤波到底在算什么

![Slide 9 - Linear filtering](assets/03-filters/slide-09.png)

把卷积核放在图像的一个位置，对齐后逐项相乘，再把结果相加：

$$
g(i,j)=\sum_{u,v}h(u,v)f(i-u,j-v).
$$

符号含义是：

- $f$ ：输入图像；
- $h$ ：卷积核中的权重；
- $g$ ：输出图像；
- $(i,j)$ ：当前输出位置；
- $u,v$ ：在邻域中移动的偏移量。

**易错：先确定是否翻核。** 上式的 $i-u,j-v$ 表示卷积。若用“窗口直接与核对齐相乘”的互相关实现，偏移应读成 $i+u,j+v$ 。中心权重为 1、其余为 0 时两者都复制当前像素；非对称核的移动方向则不同，下一小节用图比较。

<!-- figure: conv-press -->

### 互相关和卷积

![Slide 17 - Cross-correlation vs convolution](assets/03-filters/slide-17.png)

两者都做“滑动、相乘、相加”，唯一关键区别是卷积核是否翻转：

| 操作 | 使用卷积核前是否翻转？ |
| --- | --- |
| Cross-correlation | 不翻转，直接使用 |
| Convolution | 先旋转 $180^\circ$ ，再使用 |

如果卷积核关于中心对称，翻转前后一样，两个结果就相同；如果卷积核不对称，方向会改变。

很多深度学习程序库把函数叫作 `convolution`，实际做的却是互相关。CNN 里的卷积核是从数据学习出来的自由参数，所以整体表达能力通常不受预先翻转影响；但在信号处理中，卷积的定义仍然必须记得，因为卷积定理使用的就是严格定义。

#### 手算一个位置

![Slide 11 - Filtering example](assets/03-filters/slide-11.png)

1. 把卷积核的中心放在当前位置；
2. 取出被覆盖的邻域；
3. 每个像素与对应卷积核权重相乘；
4. 把所有乘积相加；
5. 把总和写到输出的当前位置；
6. 移动卷积核，重复进行。

如果只允许卷积核完全落在图像内部，就是 **valid 滤波**，边界附近会没有输出。

<a id="topic-2"></a>
## 2. 滤波器选择：平滑、边缘与通道

### 常见滤波器：它们各自想做什么

#### 模糊：让变化变慢

![Slide 27 - Gaussian filter](assets/03-filters/slide-27.png)

均值滤波器给邻域中每个像素相同权重；高斯滤波器离中心越近权重越大，离中心越远权重越小。二维高斯的形式是：

$$
G_\sigma(x,y)=
\frac{1}{2\pi\sigma^2}
\exp\left(-\frac{x^2+y^2}{2\sigma^2}\right).
$$

$\sigma$ 控制影响范围： $\sigma$ 越大，模糊越强。为了不改变图像整体平均亮度，模糊卷积核通常会归一化，使所有权重的和为 $1$ 。

![Slide 28 - Blur filters](assets/03-filters/slide-28.png)

左图作参考，中间用高斯权重，右边用均匀权重。都减少了细枝的清晰度，但权重分配不同，保留下来的细节也不同。

#### Sobel：找变化快的地方

![Slide 29 - Sobel x](assets/03-filters/slide-29.png)

![Slide 30 - Sobel y](assets/03-filters/slide-30.png)

两张图分别比较横向与纵向的 Sobel 响应，找的是沿相应方向变化快的位置。它们近似计算两个方向的导数：

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

平坦区域的左右或上下差异小，响应接近 0；边缘附近差异大，响应较大。保留正负号可以区分亮到暗和暗到亮；取绝对值后只剩边缘强度，再用阈值选出明显边缘。

#### 锐化和运动模糊

锐化通常让中心权重为正、邻居权重为负，从而放大中心与邻域的差异；运动模糊则沿运动方向平均，例如中间一行放三个 $1/3$ ，会让图像沿水平方向变模糊。

### 彩色图像的滤波核多了一个维度

![Slide 31 - Colour filtering](assets/03-filters/slide-31.png)

灰度图像只有空间维度；RGB 图像还有通道维度。一个颜色滤波器的尺寸可以是 $K_h\times K_w\times3$ ，它会同时看同一个邻域的 R、G、B，并把所有乘积加在一起，得到一个输出数值。

如果想得到多张特征图，就使用多个卷积核。每一个卷积核产生一张图，所有图叠起来形成新的多-通道图像。

常见错误是把 `height × width × channel` 当成普通二维图像，忘记卷积核还要覆盖通道维度。

<a id="topic-3"></a>
## 3. 计算范围与效率

### 滤波核大小、影响范围和高斯尺度

![Slide 32 - Filter support](assets/03-filters/slide-32.png)

- **Kernel 大小**：实际存储和计算的窗口大小；
- **Support**：某个像素可能影响输出的范围；
- ** $\sigma$ **：高斯权重衰减的尺度。

高斯理论上影响无限远，但电脑只能使用有限大小的卷积核，所以要截断它。窗口太小会截断重要权重；窗口太大则增加计算量。

固定 $\sigma$ 时，只增加窗口大小，新增位置的权重可能已经很小；增加 $\sigma$ 则会让更远的邻居获得更大权重，模糊也会明显增强。不要把卷积核尺寸和 $\sigma$ 当成同一个东西。

#### 线性滤波的四个代数性质

![Slide 37 - Filter properties](assets/03-filters/slide-37.png)

这些性质帮助我们重排计算：

- **Commutative**： $f*h=h*f$ ；
- **Associative**： $f*h_1*h_2=f*(h_1*h_2)$ ；
- **Distributive**：滤波器可以分配到相加的图像上；
- **Scalar associativity**： $k(f*h)=(kf)*h=f*(kh)$ 。

理论上可以交换或合并操作，但实际还要考虑图像大小、内存访问、是否需要中间结果和程序库的实现。

### 可分离滤波：把二维计算拆成两次一维计算

![Slide 39 - Separable filters](assets/03-filters/slide-39.png)

如果二维卷积核可以写成一个列向量和一个行向量的外积（列向量乘行向量），就叫 **可分离**。此时可以：

1. 先对每一行做一次一维滤波；
2. 再对每一列做一次一维滤波。

原本一个 $k\times k$ 卷积核每个像素约需 $k^2$ 次乘法；拆开后约需 $2k$ 次， $k$ 较大时差别很明显。高斯卷积核常常接近或可以构造成可分离卷积核。

![Slide 40 - Separable filter calculation](assets/03-filters/slide-40.png)

Associativity 还允许先合并多个线性滤波器，再对图像扫描一次。这样可以更快，但如果需要保留中间结果，或者合并后卷积核变得太大，就不一定值得。

<a id="topic-4"></a>
## 4. 边界：尺寸与补值

### 输出大小：为什么边缘会消失

![Slide 41 - Valid convolution](assets/03-filters/slide-41.png)

对 $N\times N$ 输入、 $K\times K$ 卷积核、步幅为 1 的 valid 滤波，输出大小是：

$$
(N-K+1)\times(N-K+1).
$$

因为卷积核不能伸出图像边界。如果希望输出和输入一样大，就要在图像外面补像素，也就是 **补边**。

#### 四种常见边界规则

![Slide 42 - Constant padding](assets/03-filters/slide-42.png)

- **Constant / zero 补边**：外面补固定值，简单但可能制造黑边；

![Slide 43 - Wrap](assets/03-filters/slide-43.png)

- **Wrap**：把左边接到右边、上边接到下边，适合 tileable 纹理，不适合普通照片；

![Slide 44 - Clamp](assets/03-filters/slide-44.png)

- **Clamp / replicate**：把边缘像素向外延伸，普通照片通常较自然；

![Slide 45 - Reflect](assets/03-filters/slide-45.png)

- **Reflect**：把图像镜像延伸，常能减少人工边界。

没有一种边界规则永远最好。要根据图像是否周期性、任务是否关心边缘以及滤波器的性质来选择。

## 本讲自测

1. 同一个非对称核，卷积与互相关为什么会给出不同结果？
2. 固定核窗口，增大高斯尺度会怎样改变权重？
3. 为什么可分离的二维核能用两次一维计算完成？
