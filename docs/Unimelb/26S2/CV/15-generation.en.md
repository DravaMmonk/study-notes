# COMP90086 Lecture 15 - Image Generation

Sources: `lecture/COMP90086-15-Generation.pdf` (47 pages) and `transcript/COMP90086_2026_SM2 Week-08-W-transcript.txt`. Released on Canvas in Week 8, while the PDF footer still says Week 9; PDF page numbers are used throughout below.

This lecture answers: **beyond classifying photos, how can a network generate new ones?** We first separate predicting labels from generating images, then go from the ordinary autoencoder to the variational autoencoder.

Learning path: [What to generate](#topic-1) → [Ordinary autoencoder](#topic-2) → [Distribution and loss of the VAE](#topic-3) → [Sampling and limits](#topic-4).

Key point: the difference between an AE and a VAE. Hard part: why the encoder outputs a distribution, and what the reconstruction term and the KL term each constrain. Common mistake: good reconstruction does not guarantee that an arbitrary latent variable will generate a plausible image.

<a id="topic-1"></a>
## 1. What to generate: first read conditional probability correctly

### Which is the input, image or label?

Denote an image by $x$ and a class label by $y$ . In $p(y\mid x)$ , the right of the bar is the known condition and the left is what is being predicted.

| Model | What is known | What is learned |
| --- | --- | --- |
| Discriminative model | Image $x$ | Label distribution $p(y\mid x)$ |
| Conditional generative model | A label or other condition $y$ | Distribution of images matching the condition $p(x\mid y)$ |
| Unconditional generative model | No class specified | Image distribution $p(x)$ |

![PDF 12 - Conditional generation](assets/15-generation/slide-12.png)

In the figure the known condition is frog, and the bars give the relative likelihood of different candidate images. Plausible frog images should be more likely and cluttered noise less likely. **Sampling** means generating a concrete sample according to the distribution the model has learned; given the same class, repeated sampling can yield different images.

**Common mistake**: a classifier outputting a "frog" score does not mean it can draw frogs. A generative model must also describe or learn how to produce the complex relationships among pixels.

### A probabilistic relationship is not a free inversion of a classifier

Bayes' formula connects the two directions:

$$
p(y\mid x)=\frac{p(x\mid y)p(y)}{p(x)}.
$$

$p(y)$ is the class prior and $p(x)$ the overall image distribution. With only a classifier $p(y\mid x)$ , the other terms are still missing, so it cannot simply be "flipped" to obtain an image generator.

**Supplement**: probabilities of discrete labels sum to 1; continuous variables use probability densities, and only integrating over a region gives a probability. When reading $p(x)$ in the slides, distinguish by variable type, and do not treat the height of a density as the probability of an exact continuous value.

<a id="topic-2"></a>
## 2. Ordinary autoencoder: compress first, then reconstruct

### The input itself is the learning target

![PDF 24 - Autoencoder structure](assets/15-generation/slide-24.png)

From left to right the figure first narrows and then widens. The left half, the **encoder**, compresses the image $x$ into a latent variable $z$ ; the right half, the **decoder**, reconstructs an image $\hat x$ from $z$ . The narrowest point is called the **bottleneck**: it forces the model to keep the important information with fewer numbers.

> **Lecturer's words**: "we call that hidden layer, the bottleneck layer sometimes."
>
> **Interpretation**: "bottleneck" here means the representational capacity is limited, not that this layer runs slowest.

One reconstruction loss is mean squared error:

$$
\mathcal L_{\mathrm{rec}}=\frac1M\sum_{j=1}^{M}(x_j-\hat x_j)^2.
$$

$M$ is the number of pixel channels being compared, and $j$ indexes one of these values. The closer the network output is to the input, the smaller the loss. The target comes directly from the input, so no human class labels are needed; there is still a well-defined training objective.

### Why being able to reconstruct does not mean being able to generate

![PDF 30 - Limitation of a plain autoencoder](assets/15-generation/slide-30.png)

This page emphasises gaps in the latent space: training only requires that "seen images can be decoded after being encoded". It does not specify that an arbitrary random $z$ corresponds to a plausible image, nor does it tell us where to sample $z$ from.

**Common mistake**: the decoder accepting a string of random numbers does not mean that string lies in a region covered by training. An ordinary AE's ability to reconstruct and its ability to reliably generate new samples are two different things.

**Supplement**: a denoising autoencoder takes a corrupted image as input and the clean image as target, learning to remove the corruption. This changes the reconstruction task, but does not by itself establish a suitable sampling distribution over latent variables.

<a id="topic-3"></a>
## 3. Hard part: how a VAE organises latent variables into a samplable distribution

### The encoder no longer outputs just one fixed point

![PDF 34 - Probabilistic encoder](assets/15-generation/slide-34.png)

The two outputs of the encoder in the figure describe the mean and covariance of the latent variable: the former is the centre of the distribution, the latter the range of variation in different directions. The encoder learns an approximate distribution $q(z\mid x)$ , rather than knowing the true $p(z\mid x)$ directly.

A common setting is a diagonal Gaussian: each dimension is described by a mean $\mu_i$ and a standard deviation $\sigma_i$ ; the latent prior is taken to be the simple standard normal $p(z)=\mathcal N(0,I)$ . The prior is simply the sampling rule chosen in advance for generation.

### Random sampling during training

![PDF 35 - VAE training path](assets/15-generation/slide-35.png)

Following the arrows: image → encoder distribution → sample $z$ → decoder distribution → reconstruction. The transcript explains that sampling scales standard normal noise by the predicted standard deviation, which can be written as:

$$
\epsilon\sim\mathcal N(0,I),\qquad z=\mu+\sigma\odot\epsilon.
$$

$\odot$ is element-wise multiplication. The randomness is placed in $\epsilon$ , while $\mu,\sigma$ are still learned by the network; the same input can map to different nearby latent variables during training.

<details>
<summary>Extension: the slides' notation for covariance and standard deviation</summary>

<p>The previous page in the figure calls Σ the covariance, yet this page writes it directly as the scale that multiplies the random variable. If Σ really is the covariance, sampling should use its square-root factor; in the diagonal case that is the per-dimension standard deviation σ, not the variance σ². The main text follows the transcript's "standard deviation" to avoid mixing up these two quantities.</p>

</details>

<!-- figure: vae-sampler -->

### What each of the two loss terms controls

![PDF 36 - Variational objective](assets/15-generation/slide-36.png)

The right side of the slide is an optimisable lower bound on the log-likelihood. Rewriting maximisation of the bound as minimisation of its negative, the objective is:

$$
\mathcal L=
-\mathbb E_{z\sim q(z\mid x)}[\log p(x\mid z)]
+D_{\mathrm{KL}}\big(q(z\mid x)\,\|\,p(z)\big).
$$

Understand it via the two parts in the figure:

1. **Reconstruction term**: after sampling from the current encoding distribution, the decoder should still explain the original image well. $\mathbb E$ means averaging over different sampled results, rather than relying on one lucky success.
2. **KL term**: measures the difference between the encoding distribution and the chosen prior, pushing encodings to follow a shared rule and preventing each image from occupying its own completely unorganised corner.

The two terms trade off: caring only about reconstruction may leave a latent space that is hard to sample; caring only about matching the prior may lose the information needed to tell different inputs apart. First understand what each constrains; there is no need to memorise the full derivation of the bound first.

<a id="topic-4"></a>
## 4. Sampling and limits: how to tell whether the latent space is useful

### To generate a new image, start from the prior

To generate a new sample, you do not need to give the encoder an original image first: sample directly from $p(z)$ and pass it through the decoder. To modify an existing image, you can encode it first, then change the latent variable and decode.

![PDF 41 - Latent space grid](assets/15-generation/slide-41.png)

The figure lays out many faces or digits by their positions in latent space. Looking along the grid, appearance changes gradually between neighbouring positions. This shows smooth variation in latent space; it does not establish that every axis corresponds to a nameable attribute.

![PDF 38 - Desired latent-space properties](assets/15-generation/slide-38.png)

The goals listed in the slides are: nearby $z$ produce similar images, and the sampling region has as few invalid holes as possible. **Interpretation**: these are properties training hopes to achieve, not guarantees that come automatically from choosing a standard normal; the decoder still has to be learned well.

<details>
<summary>Extension: independent latent variables are not independent semantics</summary>

<p>A diagonal Gaussian specifies the statistical relationship among dimensions within that Gaussian; it does not guarantee that the model will automatically put pose, lighting and identity into separate dimensions. The slides later also remind us that without additional constraints, directions in latent space do not necessarily correspond to recognisable image attributes.</p>

</details>

### Why outputs can be blurry

The slides list the blurriness problem of early VAEs. When a pixel reconstruction objective faces many plausible details, a compromise prediction may average away edges. So low reconstruction error cannot be directly equated with sharp visual quality. The next lecture's [GAN](16-gans.en.md) instead uses a learned discriminative signal to evaluate generated results.

This week's denoising demos and reading links are collected in [Reading Links](READING-LINKS.md).

### Workshop 9: from reconstruction to generation

`workshop/week-09/worksheet9.ipynb` and `worksheet9_Autoencoders_solution.ipynb` have been archived, and the accompanying `pretrained_checkpoints/` keeps the pretrained weights. When comparing models, first distinguish "input an image and reconstruct it" from "sample from the latent space to generate"; if you move on to the adversarial training part, continue with [GAN's two networks](16-gans.en.md#topic-1). This time only the resources were organised; these models were not run or trained.

## Self-test for this lecture

1. What are the input and the predicted object in $p(y\mid x)$ and in $p(x\mid y)$ respectively?
2. An ordinary AE reconstructs very well; why might it still fail to generate plausible images from random latent variables?
3. What do the VAE's reconstruction term and KL term each constrain? Is an encoder input still needed to generate a new image?
