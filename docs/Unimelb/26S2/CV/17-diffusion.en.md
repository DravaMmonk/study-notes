# COMP90086 Lecture 17 - Diffusion Models

Sources: `lecture/COMP90086-17-Diffusion.pdf` (36 pages); `transcript/COMP90086_2026_SM2 Week-09-W-transcript.txt` (2026-09-23, which opens with a supplement on GAN conditional generation); the Week 10 diffusion exercise and its solution. Imported 2026-10-13. Page numbers refer to PDF pages.

This lecture answers: **how can we generate a structured image step by step, starting from a random noise image?** During training we deliberately add noise to real images so the network learns cues for recovering them; during generation we start from noise and call the network repeatedly.

Learning path: [Adding noise](#topic-1) → [Training and generation](#topic-2) → [Latent space and conditioning](#topic-3). The key point is to separate the known noising process from the denoising process that must be learned; the hard part is the timestep and the noise coefficients.

<a id="topic-1"></a>
## 1. Key point: first learn how to destroy an image

![PDF 11 - Forward diffusion](assets/17-diffusion/slide-11.png)

Look along the dog photos from left to right: the outline gradually disappears and noise gradually dominates. Each small picture here is a whole image sample, not the trajectory of some pixel.

$$
x_t=\sqrt{1-\beta_t}\,x_{t-1}+\sqrt{\beta_t}\,\epsilon_t,
\qquad \epsilon_t\sim\mathcal N(0,I).
$$

 $x_{t-1}$ is the image from the previous step and $x_t$ the image after adding noise; $\beta_t$ controls the amount of noise in this step, and $\epsilon_t$ is standard Gaussian noise sampled independently at each position. The two square roots control how much of the old image is kept and how much noise is mixed in, respectively. $t$ indexes the step corresponding to the degree of corruption; it is not a video frame number.

### Hard part: no need to compute every intermediate image step by step

![PDF 13 - Combining noising steps](assets/17-diffusion/slide-13.png)

The purpose of the long derivation in the figure is to merge many earlier steps into a single computation. Focus on the last line:

$$
\bar\alpha_t=\prod_{i=1}^{t}(1-\beta_i),\qquad
x_t=\sqrt{\bar\alpha_t}\,x_0+\sqrt{1-\bar\alpha_t}\,\epsilon.
$$

 $x_0$ is the original image; the product $\bar\alpha_t$ records how much of the original signal remains after many steps. So during training, for any chosen $t$ , the corresponding noisy image can be sampled directly. The $\epsilon$ here is the equivalent merged Gaussian noise, **not the same noise added again and again**.

<a id="topic-2"></a>
## 2. What training learns, and what generation does

| Stage | What the network receives | What it has to do |
| --- | --- | --- |
| Training | Noisy image $x_t$ and timestep $t$ | Estimate the added noise, or estimate the original image |
| Generation | Initial random noise, then the estimate from the previous step | Repeatedly move towards a less noisy state |

Pages 19–28 of the slides implement the estimator with a U-Net. During training both the original image and the artificially added noise are known, so the predicted noise can be compared with the true noise using mean squared error. Telling the network $t$ lets it know how badly the image is currently corrupted; for the U-Net architecture see [Segmentation Lecture 2](20-segmentation-ii.en.md#topic-3).

**Common mistake**: when generating from pure noise, there is no particular original image to be recovered as the answer. The network uses image regularities learned in training to generate new samples. The slides show the idea of step-by-step estimation; the exact sampler update formula and number of steps should follow the corresponding implementation.

Week 10's `workshop/week-10/worksheet10-diffusion.ipynb` practises, in order, Gaussian noise, corrupting images, training the estimator and reverse generation; the solution is in the same directory. First compare "the real noisy images used in training" with "the intermediate images predicted by the model itself during generation", then look at the final images. The notebook has been archived; training was not run this time.

<a id="topic-3"></a>
## 3. How to reduce computation, and how to specify what to generate

![PDF 30 - Latent diffusion](assets/17-diffusion/slide-30.png)

In the figure, $E$ first compresses the image into a representation $z$ , and $D$ then restores the representation to an image. Latent diffusion performs noising and denoising on the smaller $z$ , decoding back to pixels only at the end. This reuses the idea of the [autoencoder](15-generation.en.md) and can usually reduce the amount of data the denoising network processes.

Conditional generation gives the network one more cue, such as a class, a text representation or another image. The input is no longer just $x_t,t$ , but also includes a condition saying "what we want to generate". Pages 31–34 of the slides show text conditioning and image inpainting; the condition guides the result, but it does not mean that one sentence of input yields a unique image.

## Self-test for this lecture

1. Given $x_0$ and timestep $t$ , why can $x_t$ be constructed directly?
2. During training the true noise can be used to compute the error; why not during generation?
3. Which step does latent diffusion move out of pixel space?

<details>
<summary>Extension (optional)</summary>

The original papers and blogs recommended by the course are kept together in [Week 9 Reading Links](READING-LINKS.md#week-9-diffusion-models). When reading them, first check their prediction target and sampling procedure, and do not treat the illustrative update formula in the slides as the general implementation of all diffusion models.

</details>
