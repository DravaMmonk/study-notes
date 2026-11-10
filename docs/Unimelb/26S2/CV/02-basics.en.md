# COMP90086 Lecture 2 - Imaging Basics

Sources: `lecture/COMP90086-02-Basics.pdf`, `transcript/COMP90086_2026_SM2 Week-01-F-transcript.txt`, together with the hands-on exercises in `workshop02_solution.ipynb`.

This note answers three questions: **where images come from, how a computer stores them, and what actually happens when you change an image's size.**

Learning path: [from taking a photo to projection](#topic-1) → [field of view and the in-focus range](#topic-2) → [storage and coordinates](#topic-3) → [resampling and the workshop exercises](#topic-4).

Key points: the projection relation, array coordinates and interpolation. Hard part: converting units between millimetres and pixels. Common mistakes: cropping vs. resizing, width/height order, RGB vs. BGR.

<a id="topic-1"></a>
## 1. From taking a photo to projection

### Remember first: the pixels a computer sees are not necessarily reliable

![Slide 2 - Adversarial demo](assets/02-basics/slide-02.png)

![Slide 3 - Dog to hot dog](assets/02-basics/slide-03.png)

The two figures show a digit example and a dog example. An **adversarial example** is an input deliberately perturbed to mislead a model: changing only a very small number of pixels can make a neural network classify one digit as another, or a dog as a hot dog. To the human eye the image may look almost unchanged, yet the model's confidence has shifted dramatically.

This tells us two things:

1. **A model's high confidence does not mean a human would consider it correct.**
2. When we do recognition later, we need to care about robustness: if the input changes slightly, is the output still reliable?

### Image formation: how the 3D world becomes a 2D image

![Slide 8 - What is an image](assets/02-basics/slide-08.png)

Taking a photo can be broken into the following steps:

$$
\text{light source}
\longrightarrow \text{surface reflection}
\longrightarrow \text{lens/optics}
\longrightarrow \text{sensor}
\longrightarrow \text{electronic signal}
\longrightarrow \text{digital values}.
$$

An object reflects light, the lens projects that light onto the sensor, the sensor turns the light into an electrical signal, and finally the computer stores the signal as pixel values.

The most important difficulty is that the real world is three-dimensional while an ordinary photo is only two-dimensional. A pixel usually tells us "how bright it is here", but on its own it cannot tell us "how far this point is from the camera". This is why computer vision needs camera models, multiple views, depth sensors or learned models to recover the missing information.

> **Lecturer's words**: "We are dealing with a 2D projection of a 3D scene. So one dimension of information has gone missing."
>
> **Interpretation**: so when you meet projection formulas later, do not try to recover a unique 3D point from a single pixel coordinate alone.

### The pinhole camera model: start with the simplest projection

![Slide 11 - Pinhole projection](assets/02-basics/slide-11.png)

First imagine a camera that is nothing but a small hole. Write a 3D point as $P=(x,y,z)$ , the point on the image plane as $(x_i,y_i)$ , and the distance from the pinhole to the image plane as $f$ . By similar triangles:

$$
\begin{aligned}
x_i&=\frac{fx}{z},\\
y_i&=\frac{fy}{z}.
\end{aligned}
$$

The symbols mean:

- $x,y$ : the horizontal and vertical position of the 3D point;
- $z$ : the depth of the point from the camera;
- $f$ : the focal length;
- $x_i,y_i$ : the position of the point on the image plane.

The intuition behind the formula is simple: for objects of the same size, the larger $z$ is, the smaller the projection; the larger $f$ is, the larger the projection.

A real camera also has to convert world coordinates into camera coordinates and then account for the principal point, pixel size and lens distortion; but this small model is the foundation of all the camera geometry that follows.

<!-- figure: pinhole-camera -->

<a id="topic-2"></a>
## 2. Lenses: field of view and the in-focus range

### Why cameras need lenses

![Slide 12 - Why lenses](assets/02-basics/slide-12.png)

A small hole lets in very little light, so the image is dark. If you make the hole bigger, several rays from the same point in space may land at different places on the sensor, and the result is blur. The job of a lens is to let more light in while bringing the rays from the same point together at the same point as far as possible.

![Slide 13 - Lens and aperture](assets/02-basics/slide-13.png)

In the figure, $D$ marks the aperture diameter and $f$ marks the focal length: the former controls how much light gets in, the latter affects the size of the projection. Do not confuse these two lengths.

#### Focal length and field of view

![Slide 15 - Focal length and angle of view](assets/02-basics/slide-15.png)

- **Short focal length**: sees wider, with a larger field of view;
- **Long focal length**: sees narrower, but objects usually appear larger in the image.

In digital images the focal length is often expressed in pixels. For example, if the image is $2000$ pixels wide, the principal point is in the middle and the focal length is $1000$ pixels, then each side covers about $45^\circ$ and the total field of view is about $90^\circ$ .

There is nothing mysterious about "pixels" here: it is just the physical focal length divided by the pixel size, converted into image-coordinate units.

#### Aperture and depth of field

![Slide 16 - Depth of field](assets/02-basics/slide-16.png)

- Small aperture: close to a pinhole, lets in little light, but a larger range of depths can be in focus at the same time;
- Large aperture: lets in more light, but only a narrower range of depths is in focus.

The aperture value used in photography is:

$$
\text{f-number}=\frac{\text{focal length}}{\text{aperture diameter}}.
$$

For example, for a $70\ \mathrm{mm}$ lens at f/5.6, the aperture diameter is about $70/5.6=12.5\ \mathrm{mm}$ . An f/32 aperture is smaller, so the depth of field is usually greater.

### Lens distortion and simplified models

![Slide 17 - Lens distortion](assets/02-basics/slide-17.png)

The straight-ray model in the lecture figures is an approximation that is convenient to compute with, not the full physical process of a real lens. Real rays refract at the lens surfaces; the further from the optical axis, the more noticeable the deviation usually is. Wide-angle lenses may show barrel distortion, where lines that should be straight bend outwards.

![Slide 18 - Image formation model](assets/02-basics/slide-18.png)

In lectures the image plane is imagined to sit in front of the camera, to avoid dealing with inverted images and minus signs. This is a coordinate convention; it does not mean the real sensor is actually in front of the camera. When reading a formula, you need to know which convention you are using.

The factors that affect an image fall into two groups:

| Group | Examples |
| --- | --- |
| World / scene | light, material colour, surface orientation, object position |
| Camera | focal length, aperture, focus, distortion |

<a id="topic-3"></a>
## 3. Image arrays: storage and coordinates

### How digital images are stored

![Slide 22 - Image tensor](assets/02-basics/slide-22.png)

A greyscale image can be seen as a 2D array; a colour image usually has three channels, so it can be represented as a 3D tensor:

$$
\text{height}\times\text{width}\times\text{channels}.
$$

The three RGB channels do not mean that nature has only three "colours". They are an engineering representation tied to cameras and human vision: the human eye has three main types of cone cells, and ordinary cameras also commonly use three types of sensor, compressing visible light into three numbers.

Before using an image, check three things:

1. Is the shape `H × W × C` or `C × H × W`?
2. Is the channel order RGB or BGR?
3. What are the value range and data type?

![Slide 25 - Channel ordering](assets/02-basics/slide-25.png)

Different libraries may use different conventions. Do not assume that every function uses the same order just because a variable is called `image`.

### Pixel coordinates, data types and file formats

![Slide 26 - Pixel coordinates](assets/02-basics/slide-26.png)

Image arrays usually start at the top-left corner: $x$ increases to the right, $y$ increases downwards, and numbering usually starts from 0. This differs from the Cartesian coordinates of maths class, where the y-axis points up.

The most common `uint8` pixel range is $0$ to $255$ :

$$
\begin{aligned}
\text{white}&=[255,255,255],\\
\text{black}&=[0,0,0],\\
\text{pure red in RGB}&=[255,0,0].
\end{aligned}
$$

During processing, however, images are often converted to `float32`, because addition, multiplication and normalisation need fractional values and `uint8` overflow must be avoided. Medical images may also use `uint16` or wider types.

![Slide 31 - JPEG compression](assets/02-basics/slide-31.png)

The file format also affects the data:

- JPEG is usually lossy compression and loses high-frequency detail first;
- PNG can use lossless encoding; for other formats you need to check the specific encoding, and you cannot conclude from the file extension alone that the pixels are unchanged.

A JPEG thumbnail may look fine, yet high-frequency content such as edges, textures and small text has already been altered. In pixel-by-pixel comparisons or experiments, the file format is itself a processing step.

> **Lecturer's words**: "JPEG is imperfect when reconstructing high-frequency things."
>
> **Interpretation**: when running edge or texture experiments, also check whether the image went through lossy compression as one of the input conditions.

<a id="topic-4"></a>
## 4. Resampling and the workshop exercises

### Cropping and resizing are not the same thing

![Slide 34 - Crop and resize](assets/02-basics/slide-34.png)

- **Crop**: take a sub-region of the original array; the existing pixel values are unchanged;
- **Resize**: change the array size, which requires computing pixel values for the new positions.

Squashing $768\times512$ directly into $512\times512$ changes the aspect ratio, so objects may become fatter or thinner. To keep the proportions, the target size should be close to $512\times341$ .

#### Nearest-neighbour interpolation

![Slide 35 - Nearest-neighbour](assets/02-basics/slide-35.png)

For each new pixel, find the nearest pixel in the original image and copy its value directly. The advantages are speed and hard edges; the drawback is that enlarging or shrinking easily produces visible blockiness or jagged edges.

#### Bilinear interpolation

![Slide 36 - Bilinear weights](assets/02-basics/slide-36.png)

If a new position falls between four old pixels, let the horizontal distance be $H$ and the vertical distance be $V$ ; the four weights are:

$$
\left\{
(1-H)(1-V),\ H(1-V),\ (1-H)V,\ HV
\right\}.
$$

They sum to 1, so bilinear interpolation is essentially "a weighted average of the four neighbours". It is usually smoother than nearest-neighbour, but it softens very sharp edges slightly.

> **Lecturer's words**: "it effectively incorporates the blur into that sampling step."
>
> **Interpretation**: this explains why edges may become softer after interpolation; when shrinking an image you still need to check, based on the sampling ratio, whether extra anti-aliasing is needed.

![Slide 37 - Resampling trade-offs](assets/02-basics/slide-37.png)

Bicubic interpolation looks at a larger neighbourhood and uses a cubic function to estimate new values; Lanczos is another sampling method. No single interpolation method is best for every task; choose according to speed, edge behaviour and target size.

### Workshop 2: turning the concepts into code

The workshop reference solution ties together five key points from this lecture: reading an image, resizing, cropping, modifying channels, and finding the focal length with similar triangles.

#### Colour order in OpenCV and Matplotlib

`cv2.imread` reads images as BGR by default, but `matplotlib.pyplot.imshow` displays them as RGB. Convert before displaying:

```python
display_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
```

This only changes the channel order; it does not change the image content or its spatial size.

#### Resizing, centre cropping and deep copies

OpenCV's size tuple is `(width, height)`, whereas a NumPy shape is usually written `(height, width, channels)`. For an $H\times W$ image, a centre crop of width $w_c$ and height $h_c$ starts at:

$$
x_0=\left\lfloor\frac{W-w_c}{2}\right\rfloor,
\qquad
y_0=\left\lfloor\frac{H-h_c}{2}\right\rfloor.
$$

Then take `image[y0:y0 + hc, x0:x0 + wc]`. NumPy slicing often returns a view; if you want to modify a copy without affecting the original crop, use `.copy()`.

For a BGR image, set the red channel to the average of the blue and green channels:

$$
R'(x,y)=\frac{G(x,y)+B(x,y)}{2}.
$$

If the original array is `uint8`, do the computation in a wider or floating-point type first and then cast explicitly, to avoid overflow or implicit truncation.

#### Finding the focal length from the sensor size

The sensor is $20\ \mathrm{mm}$ tall, corresponding to $200$ pixels; the object is $100$ pixels tall in the image, so its height on the sensor is:

$$
h_i=20\ \mathrm{mm}\times\frac{100}{200}=10\ \mathrm{mm}.
$$

The object's real height is $h_o=120\ \mathrm{mm}$ and its distance is $z=600\ \mathrm{mm}$ . By similar triangles:

$$
\frac{h_i}{f}=\frac{h_o}{z}
\quad\Longrightarrow\quad
f=\frac{h_i z}{h_o}
=\frac{10\times600}{120}
=50\ \mathrm{mm}.
$$

The key is to convert pixels into millimetres on the sensor first; you cannot put pixels and millimetres into the same proportion directly.

## Self-test for this lecture

1. If an object's distance doubles while the focal length stays the same, how does the size of its projection change?
2. Why can't a NumPy shape be used as-is for the OpenCV resize size?
3. When a new pixel falls between four old pixels, how does bilinear interpolation obtain its value?
