# COMP90086 Lecture 3 - Spatial Filtering

Sources: `lecture/COMP90086-03-Filters.pdf` and `transcript/COMP90086_2026_SM2 Week-02-W-transcript.txt`.

This lecture asks: **should a pixel's new value take its neighbouring pixels into account? And if so, how should they be combined?**

Learning path: [How one output is computed](#topic-1) → [Smoothing, edges and channels](#topic-2) → [Extent and efficiency](#topic-3) → [Size and padding](#topic-4).

Key points: sliding weighted sums and what different filters do. Hard parts: the flip in convolution, separable computation. Common mistakes: kernel size is not the same as the Gaussian scale, and the output size is not necessarily the input size.

<a id="topic-1"></a>
## 1. Local computation: how one output is computed

### Three kinds of operation: look at one point, look at the neighbours, take a weighted sum

![Slide 6 - Pixel operator](assets/03-filters/slide-06.png)

#### Point (per-pixel) operations

The output at position $(i,j)$ depends only on the input pixel at the same position. Examples include brightening or darkening each pixel, or applying gamma correction. Every position is computed independently, without looking at neighbours.

#### Local operations

The output at position $(i,j)$ looks at a small region around it. Blurring, sharpening and edge detection all belong to this category. This small region is called the **neighbourhood**, and it determines how far the operation can see.

#### Linear filters

A linear filter is one kind of local operation: each pixel in the neighbourhood is multiplied by a weight, and the products are summed. The small matrix of weights is called the **kernel** or **filter**.

![Slide 8 - Local operator](assets/03-filters/slide-08.png)

Look at the edges of the grapes: the right image amplifies differences within the neighbourhood, so the outlines become more pronounced, but graininess may be amplified as well. A local operation changes the relationships between neighbouring pixels.

### What linear filtering actually computes

![Slide 9 - Linear filtering](assets/03-filters/slide-09.png)

Place the kernel at a position in the image, multiply the aligned entries element by element, and sum the results:

$$
g(i,j)=\sum_{u,v}h(u,v)f(i-u,j-v).
$$

The symbols mean:

- $f$ : the input image;
- $h$ : the weights in the kernel;
- $g$ : the output image;
- $(i,j)$ : the current output position;
- $u,v$ : the offsets that move across the neighbourhood.

**Common mistake: first decide whether the kernel is flipped.** The $i-u,j-v$ in the formula above denotes convolution. If it is implemented as cross-correlation, where the window is multiplied directly against the aligned kernel, the offsets should be read as $i+u,j+v$ . When the centre weight is 1 and all others are 0, both simply copy the current pixel; for an asymmetric kernel, however, the direction of the shift differs. The next subsection compares them with a figure.

<!-- figure: conv-press -->

### Cross-correlation and convolution

![Slide 17 - Cross-correlation vs convolution](assets/03-filters/slide-17.png)

Both perform "slide, multiply, sum"; the only essential difference is whether the kernel is flipped:

| Operation | Is the kernel flipped before use? |
| --- | --- |
| Cross-correlation | No, used directly |
| Convolution | Rotated by $180^\circ$ first, then used |

If the kernel is symmetric about its centre, flipping it changes nothing and the two results are identical; if the kernel is asymmetric, the direction changes.

Many deep learning libraries call their function `convolution`, yet what they actually compute is cross-correlation. Since CNN kernels are free parameters learned from data, the overall expressive power is usually unaffected by whether the kernel is flipped in advance. In signal processing, however, the definition of convolution must still be remembered, because the convolution theorem uses the strict definition.

#### Computing one position by hand

![Slide 11 - Filtering example](assets/03-filters/slide-11.png)

1. Place the centre of the kernel at the current position;
2. Take the neighbourhood that it covers;
3. Multiply each pixel by the corresponding kernel weight;
4. Sum all the products;
5. Write the sum to the current position of the output;
6. Move the kernel and repeat.

If the kernel is only allowed to lie entirely inside the image, this is **valid filtering**, and there will be no output near the borders.

<a id="topic-2"></a>
## 2. Choosing a filter: smoothing, edges and channels

### Common filters: what each one is trying to do

#### Blurring: making changes slower

![Slide 27 - Gaussian filter](assets/03-filters/slide-27.png)

A mean (box) filter gives every pixel in the neighbourhood the same weight; a Gaussian filter gives larger weights to pixels closer to the centre and smaller weights to those farther away. The 2D Gaussian has the form:

$$
G_\sigma(x,y)=
\frac{1}{2\pi\sigma^2}
\exp\left(-\frac{x^2+y^2}{2\sigma^2}\right).
$$

$\sigma$ controls the range of influence: the larger $\sigma$ , the stronger the blur. To avoid changing the overall average brightness of the image, blur kernels are usually normalised so that all weights sum to $1$ .

![Slide 28 - Blur filters](assets/03-filters/slide-28.png)

The left image is the reference, the middle one uses Gaussian weights and the right one uses uniform weights. Both reduce the sharpness of the fine twigs, but because the weights are distributed differently, the details that survive also differ.

#### Sobel: finding where things change quickly

![Slide 29 - Sobel x](assets/03-filters/slide-29.png)

![Slide 30 - Sobel y](assets/03-filters/slide-30.png)

The two images compare the horizontal and vertical Sobel responses respectively; each finds locations that change quickly along the corresponding direction. They approximate the derivatives in the two directions:

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

In flat regions, the left-right or top-bottom differences are small and the response is close to 0; near edges the differences are large and so is the response. Keeping the sign distinguishes bright-to-dark from dark-to-bright transitions; taking the absolute value leaves only the edge strength, and a threshold then selects the prominent edges.

#### Sharpening and motion blur

Sharpening usually uses a positive centre weight and negative neighbour weights, amplifying the difference between the centre and its neighbourhood. Motion blur averages along the direction of motion: for example, placing three values of $1/3$ in the middle row blurs the image horizontally.

### Kernels for colour images have one more dimension

![Slide 31 - Colour filtering](assets/03-filters/slide-31.png)

A greyscale image has only spatial dimensions; an RGB image also has a channel dimension. A colour filter can have size $K_h\times K_w\times3$ : it looks at R, G and B over the same neighbourhood simultaneously and adds all the products together to produce a single output value.

To obtain several feature maps, use several kernels. Each kernel produces one map, and stacking all the maps forms a new multi-channel image.

A common mistake is to treat `height × width × channel` as an ordinary 2D image and forget that the kernel must also span the channel dimension.

<a id="topic-3"></a>
## 3. Extent and efficiency

### Kernel size, support and Gaussian scale

![Slide 32 - Filter support](assets/03-filters/slide-32.png)

- **Kernel size**: the size of the window that is actually stored and computed;
- **Support**: the range over which a pixel can influence the output;
- ** $\sigma$ **: the scale at which the Gaussian weights decay.

In theory a Gaussian has infinite reach, but a computer can only use a kernel of finite size, so it must be truncated. A window that is too small cuts off important weights; one that is too large increases the computation.

With $\sigma$ fixed, enlarging only the window adds positions whose weights may already be tiny; increasing $\sigma$ instead gives larger weights to more distant neighbours, and the blur becomes noticeably stronger. Do not treat the kernel size and $\sigma$ as the same thing.

#### Four algebraic properties of linear filtering

![Slide 37 - Filter properties](assets/03-filters/slide-37.png)

These properties let us rearrange computations:

- **Commutative**: $f*h=h*f$ ;
- **Associative**: $f*h_1*h_2=f*(h_1*h_2)$ ;
- **Distributive**: a filter distributes over a sum of images;
- **Scalar associativity**: $k(f*h)=(kf)*h=f*(kh)$ .

In theory operations can be swapped or merged, but in practice one must also consider image size, memory access, whether intermediate results are needed, and how the library implements things.

### Separable filtering: splitting a 2D computation into two 1D computations

![Slide 39 - Separable filters](assets/03-filters/slide-39.png)

If a 2D kernel can be written as the outer product of a column vector and a row vector (column vector times row vector), it is called **separable**. In that case we can:

1. First apply a 1D filter along every row;
2. Then apply a 1D filter along every column.

A $k\times k$ kernel originally needs about $k^2$ multiplications per pixel; after splitting it needs about $2k$ , and the difference is significant when $k$ is large. Gaussian kernels are often close to separable, or can be constructed as separable kernels.

![Slide 40 - Separable filter calculation](assets/03-filters/slide-40.png)

Associativity also allows several linear filters to be combined first and then applied to the image in a single pass. This can be faster, but it is not necessarily worthwhile if intermediate results must be kept, or if the combined kernel becomes too large.

<a id="topic-4"></a>
## 4. Borders: size and padding

### Output size: why the borders disappear

![Slide 41 - Valid convolution](assets/03-filters/slide-41.png)

For valid filtering of an $N\times N$ input with a $K\times K$ kernel and stride 1, the output size is:

$$
(N-K+1)\times(N-K+1).
$$

This is because the kernel cannot extend beyond the image boundary. If the output should be the same size as the input, pixels must be added outside the image, which is called **padding**.

#### Four common border rules

![Slide 42 - Constant padding](assets/03-filters/slide-42.png)

- **Constant / zero padding**: pad with a fixed value outside; simple, but it may create dark borders;

![Slide 43 - Wrap](assets/03-filters/slide-43.png)

- **Wrap**: join the left edge to the right and the top edge to the bottom; suitable for tileable textures, not for ordinary photos;

![Slide 44 - Clamp](assets/03-filters/slide-44.png)

- **Clamp / replicate**: extend the edge pixels outward; usually looks natural for ordinary photos;

![Slide 45 - Reflect](assets/03-filters/slide-45.png)

- **Reflect**: extend the image by mirroring it; often reduces artificial borders.

No single border rule is always best. Choose according to whether the image is periodic, whether the task cares about the borders, and the properties of the filter.

## Self-check for this lecture

1. Why do convolution and cross-correlation give different results for the same asymmetric kernel?
2. With the kernel window fixed, how does increasing the Gaussian scale change the weights?
3. Why can a separable 2D kernel be computed with two 1D passes?
