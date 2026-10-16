# COMP90086 Lecture 5 - Image Formation II

Sources: `lecture/COMP90086-05-ImageFormationII.pdf` and `transcript/COMP90086_2026_SM2 Week-03-W-transcript.txt`.

This lecture continues explaining "why a photo looks the way it does". It follows three threads: **how light and surfaces determine brightness, how colour is represented by three channels, and which changes the edges in an image remain stable under.**

Learning path: [Where observations come from](#topic-1) → [Why the answer is not unique](#topic-2) → [Computing brightness changes](#topic-3) → [What stays stable](#topic-4).

Key points: causes of brightness, gradients, invariance and equivariance. Hard part: why a single brightness value cannot determine a 3D normal. Common mistakes: a strong edge is not necessarily an object boundary, and adding a constant brightness is different from scaling contrast.

<a id="topic-1"></a>
## 1. Brightness and colour: where observations come from

### The Lambertian model: light, colour and surface orientation jointly determine brightness

![Slide 5 - Image formation model](assets/05-image-formation-ii/slide-05.png)

The brightness in a photo is not a "fixed label" of an object. It is affected simultaneously by the light source, the surface colour and the surface orientation.

![Slide 6 - Diffuse Lambertian reflectance](assets/05-image-formation-ii/slide-06.png)

In the simplest diffuse/Lambertian model:

$$
I_D(x)=I_LR(x)\,\mathbf N(x)^\top\mathbf L.
$$

The variables mean:

- $I_D(x)$ : the diffuse brightness observed at position $x$ ;
- $I_L$ : the intensity of the light source;
- $R(x)$ : the surface reflectance, which can be thought of as material/colour for now;
- $\mathbf N(x)$ : the surface normal, a unit vector perpendicular to the surface;
- $\mathbf L$ : the unit vector pointing towards the light source.

The dot product of two unit vectors equals the cosine of the angle between them:

$$
\mathbf N(x)^\top\mathbf L=\cos\theta.
$$

When the surface faces the light directly, $\theta$ is small and the brightness is high; as the surface turns away, the brightness decreases. Because this model writes brightness as a product of several factors, it also shows exactly why inverting it is hard: a pixel may become brighter because the light is stronger, because the material is brighter, or because the surface orientation has changed.

<!-- figure: lambert-studio -->

### Colour is not a single wavelength but the result of a whole spectrum

![Slide 10 - Spectral power distribution](assets/05-image-formation-ii/slide-10.png)

Visible light lies roughly between $400$ and $700\ \mathrm{nm}$ . An object usually reflects a whole range of wavelengths, forming a spectral power distribution (SPD), rather than reflecting light of just one colour.

![Slide 11 - Human cone responses](assets/05-image-formation-ii/slide-11.png)

The human eye has three main types of cone cells, and ordinary colour cameras also commonly use three sensors with overlapping ranges. So a camera does not record the full spectrum; instead it accumulates the spectrum weighted by each of three sensitivity curves.

![Slide 14 - Different spectra can appear as the same colour](assets/05-image-formation-ii/slide-14.png)

For channel $c$ , a simplified form is:

$$
I_c=\int_{400\ \mathrm{nm}}^{700\ \mathrm{nm}}
I(\lambda)S_c(\lambda)\,d\lambda.
$$

Here $I(\lambda)$ is the spectrum entering the camera and $S_c(\lambda)$ is the sensitivity of the channel. Different SPDs may yield the same three channel values after these three integrals; this is called metameric ambiguity, i.e. "physically different spectra that look like the same colour".

### Colour spaces: the same colour can be expressed in different coordinates

![Slide 15 - Trichromatic colour response](assets/05-image-formation-ii/slide-15.png)

Common colour spaces serve different purposes:

| Colour space | Best understood as |
| --- | --- |
| RGB | The most common form of image storage |
| HSL / HSV | Intuitive adjustment via hue, saturation, and lightness/value |
| CIE XYZ | An intermediate space defined by the colour matching of a standard observer |
| Lab | Separates lightness from the red-green and blue-yellow directions |

![Slide 18 - Colour transforms](assets/05-image-formation-ii/slide-18.png)

A simplified RGB-to-XYZ transform can be written as:

$$
\begin{bmatrix}X\\Y\\Z\end{bmatrix}
=\mathbf M
\begin{bmatrix}R\\G\\B\end{bmatrix}.
$$

$\mathbf M$ is determined by the specific RGB primaries and white point. Real libraries also have to linearise encoded RGB, so do not think of every colour transform simply as "rearranging three numbers".

![Slide 19 - Colour swap example](assets/05-image-formation-ii/slide-19.png)

Swapping R and G directly in RGB may change the brightness relationships as well. If the goal is to change the red-green appearance while preserving lightness as much as possible, first convert to Lab and then adjust the $a^*$ axis. This is why you should choose a suitable coordinate system before doing colour manipulation.

<a id="topic-2"></a>
## 2. Inferring the surface: why the answer is not unique

### Shape from shading: why one brightness image is not enough to recover 3D

![Slide 23 - Recovering surface reflectance](assets/05-image-formation-ii/slide-23.png)

The checker-shadow illusion shows that the same pixel intensity does not necessarily mean the same material colour. The human eye combines the shape of the cylinder and the position of the shadow to judge which square lies in shadow.

![Slide 25 - Recovering surface normal](assets/05-image-formation-ii/slide-25.png)

Assuming the albedo (reflectance) is constant, the lighting direction is known, and only the Lambertian model is used, then:

$$
\frac{I_D(x)}{I_LR}=\mathbf N(x)^\top\mathbf L=\cos\theta.
$$

This equation only tells us the angle $\theta$ between the normal and the light; it cannot uniquely give us the full 3D normal vector. In other words, a single brightness value corresponds to many possible surface orientations.

> **Lecturer's words**: "We cannot recover the single normal vector, but we can recover what the angle is."
>
> **Interpretation**: knowing the angle to the light ray, the surface normal can still rotate around the light direction, so its direction is not yet unique.

![Slide 27 - Shape from shading](assets/05-image-formation-ii/slide-27.png)

**Shape from shading** infers 3D shape from the shading variations in a single image. To make it feasible, extra assumptions are usually needed:

- The surface colour is roughly constant;
- The position and intensity of the light source are known or stable;
- Neighbouring surfaces are fairly smooth;
- Some normal directions at the object boundary can be inferred.

Real faces, textured surfaces, multiple materials and multiple lights easily violate these assumptions, so this is not a direct formula that always works, but an inverse problem that requires assumptions.

### Luminance, reflectance and illumination

![Slide 29 - Luminance decomposition](assets/05-image-formation-ii/slide-29.png)

First remember a simplified relationship:

$$
\text{luminance}(x)
=\text{reflectance}(x)\times\text{illumination}(x).
$$

The difficulty is that a photo usually gives us only the left-hand side, without directly telling us each term on the right. A sudden change in brightness may come from:

- A change in material colour;
- A change in surface normal;
- A cast shadow;
- A specular highlight;
- Complex illumination from multiple light sources.

![Slide 31 - Cast shadow](assets/05-image-formation-ii/slide-31.png)

A cast shadow is a change in illumination, not a change in surface material. If an algorithm treats every strong edge as a material boundary, it will mistake shadows for object structure.

![Slide 32 - Specularity](assets/05-image-formation-ii/slide-32.png)

Specular reflection is strongly directional and depends heavily on the directions of the camera and the light. If the camera moves slightly, the highlight may move; this differs from the Lambertian assumption that "surface brightness does not change with viewing direction".

![Slide 34 - Transparency and translucency](assets/05-image-formation-ii/slide-34.png)

- Transparency: light passes straight through;
- Translucency: light passes through and scatters inside the material, so it looks blurry.

Anisotropic surfaces, because of tiny grooves, also make reflection vary with direction. These examples show that real image formation is more complex than a simple multiplication.

<a id="topic-3"></a>
## 3. Edges: computing brightness changes

### Gradients: writing "changes quickly" as numbers

![Slide 39 - Characterising edges](assets/05-image-formation-ii/slide-39.png)

Look at image intensity along a horizontal scan line: in flat regions it changes slowly, and near edges it changes quickly. Taking the derivative of intensity highlights this change.

![Slide 40 - Gradient](assets/05-image-formation-ii/slide-40.png)

The gradient of a 2D image $f(x,y)$ is:

$$
\nabla f=
\begin{bmatrix}
\frac{\partial f}{\partial x}\\[4pt]
\frac{\partial f}{\partial y}
\end{bmatrix}.
$$

It has two important attributes:

- **Magnitude**: how strong the change is;
- **Direction**: the direction of fastest change.

$$
\lVert\nabla f\rVert
=\sqrt{\left(\frac{\partial f}{\partial x}\right)^2+
\left(\frac{\partial f}{\partial y}\right)^2},
\qquad
\theta=\operatorname{atan2}\left(\frac{\partial f}{\partial y},\frac{\partial f}{\partial x}\right).
$$

![Slide 42 - Edge filters](assets/05-image-formation-ii/slide-42.png)

In digital images, partial derivatives are approximated with finite differences, Sobel kernels or derivative-of-Gaussian kernels. Keeping the signed response distinguishes dark-to-bright from bright-to-dark; taking the absolute value gives only the edge strength.

### Edges are useful, but they are not object boundaries

![Slide 45 - Edges and image recognition](assets/05-image-formation-ii/slide-45.png)

Look back at the shadow and specular images in "causes of brightness" above: brightness also changes rapidly at those locations.

So what an edge detector finds is "where things change", not automatically "the true outline of an object". A low-contrast object boundary may have no clear edge, while shadows or textures may produce very strong edges.

<a id="topic-4"></a>
## 4. After a change: what stays stable

### Invariance, tolerance and equivariance

![Slide 46 - Invariance definitions](assets/05-image-formation-ii/slide-46.png)

- **Invariant**: when the input undergoes some change, the representation does not change at all;
- **Tolerant / robust**: the representation changes, but only slightly;
- **Equivariant**: when the input moves in some way, the output moves in a predictable way.

For example, when an object is translated, the edge map is translated with it. The edge map is not completely invariant pixel by pixel; it is translation equivariant. Only after a later pooling step can the final class prediction become approximately translation invariant.

#### Changes in light intensity

![Slide 47 - Invariant to light intensity shift](assets/05-image-formation-ii/slide-47.png)

If a constant $b$ is added to the whole image:

$$
f_{\mathrm{new}}(x,y)=f(x,y)+b,
$$

then:

$$
\nabla f_{\mathrm{new}}=\nabla f.
$$

So derivatives are invariant to adding the same brightness constant to every pixel. But under contrast scaling, $f_{\mathrm{new}}=af$ , the gradient magnitude is multiplied by $a$ , and a fixed threshold may need readjusting.

#### Other changes

![Slide 48 - Light direction](assets/05-image-formation-ii/slide-48.png)

Changing the direction of the light source moves shadows or highlights, so when comparing the edges in the images, first distinguish "the object moved" from "the lighting changed".

![Slide 49 - Translation](assets/05-image-formation-ii/slide-49.png)

After translation, check whether the edges move with the object; comparing the value at the same fixed pixel position cannot tell you whether it is equivariant.

![Slide 50 - Rotation](assets/05-image-formation-ii/slide-50.png)

Rotation changes edge orientation, so the responses of the horizontal and vertical filters are redistributed; a change in direction does not mean the edge has disappeared.

![Slide 51 - Scale](assets/05-image-formation-ii/slide-51.png)

Scaling changes how many pixels a structure occupies. The same fixed window may go from covering an entire corner to covering only a small part of it.

![Slide 52 - 3D pose](assets/05-image-formation-ii/slide-52.png)

A change in 3D pose may reveal surfaces that were previously invisible; this is more complex than rotating the whole image within the plane.

A simple edge detector cannot automatically handle all of these changes. Practical recognition uses multiple scales, multiple orientations, normalisation, pooling, data augmentation or learned features.

## Self-check for this lecture

1. What different factors could cause the same darker pixel?
2. What do the gradients of a flat region, a shadow edge and an object outline each tell us?
3. How do adding a constant to the whole image and multiplying it by a constant affect the gradient differently?
