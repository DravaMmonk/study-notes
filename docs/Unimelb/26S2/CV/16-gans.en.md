# COMP90086 Lecture 16 - Generative Adversarial Networks

Sources: `lecture/COMP90086-16-GANs.pdf` (41 pages). Released on Canvas in Week 8, while the PDF footer still says Week 9. On 2026-10-13, `transcript/COMP90086_2026_SM2 Week-08-F-transcript.txt` (18 September) was added, along with `Week-09-W-transcript.txt` (23 September), which contains a recap of conditional GANs. This note is based mainly on the slides, and no new verbatim quotes were added. Page numbers below are PDF page numbers.

This lecture answers: **without a pixel-by-pixel reconstruction objective, can we train a network to generate new images that look real?** A GAN has one network generate and another network judge real versus fake; the hard parts are balancing training and evaluating results.

Learning path: [Two networks](#topic-1) → [Adversarial training](#topic-2) → [Three checks on generated results](#topic-3) → [Conditional generation](#topic-4).

Key points: the objectives of the generator and the discriminator, realism and diversity. Hard part: why the same objective function is both maximised and minimised. Common mistakes: a discriminator that cannot tell real from fake does not necessarily mean the generator has learned well, and sharpness is not the same as diversity.

<a id="topic-1"></a>
## 1. Two networks: one generates, one judges

![PDF 8 - GAN architecture](assets/16-gans/slide-08.png)

Reading the figure: the **generator** $G$ turns a random latent variable $z$ into a fake image $G(z)$ ; the **discriminator** $D$ receives both generated images and real training images and judges whether the input is real.

$z$ comes from a simple distribution, e.g. the standard normal. $D(x)$ is the discriminator's score that image $x$ comes from the real data, usually between 0 and 1. The real/fake labels are produced by the training process: training-set samples are labelled real and generator samples fake, so no human needs to rate generated images one by one.

Compared with the [VAE](15-generation.en.md), the generator here directly learns "how to sample images that look like real data", and usually does not provide an explicit probability density $p(x)$ for an arbitrary image. Once training is done, sampling mainly uses $G$ ; $D$'s role is to provide feedback during training.

<a id="topic-2"></a>
## 2. Hard part: the same function, different goals for each side

### Understand the directions first, then read the formula

![PDF 13 - Minimax objective](assets/16-gans/slide-13.png)

The slide splits the objective into a real-image part and a generated-image part:

$$
\min_G\max_D V(D,G)
=\mathbb E_{x\sim p_{\mathrm{data}}}[\log D(x)]
+\mathbb E_{z\sim p(z)}[\log(1-D(G(z)))].
$$

$p_{\mathrm{data}}$ is the real data distribution, $p(z)$ the sampling distribution of the latent variable, and $\mathbb E$ denotes an average. Read it according to which network is currently being updated:

| Updated network | What it wants to happen | Why |
| --- | --- | --- |
| Discriminator $D$ | $D(x)$ for real images close to 1, $D(G(z))$ for fake images close to 0 | Both log terms move closer to 0, so the overall objective increases |
| Generator $G$ | $D(G(z))$ for fake images close to 1 | The second term decreases, meaning the discriminator more readily takes generated images as real |

**Common mistake**: it is not that both sides modify the same set of parameters in the same direction at once. When updating $D$ , the current $G$ is treated as given; when updating $G$ , the generated images are improved through the current $D$'s feedback.

### Why balance is hard

If the discriminator is too weak, even very poor images can fool it, and the feedback the generator receives is useless. If the discriminator easily spots every fake, the original training objective may fail to give the generator a sufficiently useful improvement signal.

So even if the training curves look stable, it may just be two not-good-enough networks stalling each other. The generated results need to be checked separately; you cannot draw conclusions just from "equilibrium was reached".

<!-- figure: gan-bench -->

<a id="topic-3"></a>
## 3. Key point: checking generated results from three angles

### Is it just memorising training samples?

![PDF 21 - Generated images and nearest training neighbours](assets/16-gans/slide-21.png)

The top of each column is a generated face, and below are the three most similar faces in the training set. The vertical comparison checks whether the generated image directly copies some training sample, not just whether "this face looks good".

Not finding an identical neighbour provides a clue; a handful of examples alone cannot prove that the whole model never memorises training data.

### Is it realistic: what the Inception score looks at

![PDF 27 - Confidence and class variety](assets/16-gans/slide-27.png)

In the figure, generated images are given to a pretrained classifier, with class scores on the right. The slides want to see two things at once: each single image can be clearly recognised, and a batch of images covers different classes.

This is the core intuition of the **Inception score (IS)**: per-image class distributions are concentrated, and the batch-level class distribution is rich. It is convenient for automatic comparison but has clear limitations.

**Common mistake**: generating just one fixed image per class over and over could also satisfy "clear per image, rich in classes". So IS alone cannot check within-class diversity; the classifier can also be fooled by noise or adversarial images. High classification confidence cannot replace human judgement of realism.

### Is it diverse: mode collapse and repeated samples

**Mode collapse** means the generator only produces one or a few kinds of results. They can be very sharp, yet fail to cover the variation in pose, appearance and background found in the real data.

![PDF 31 - Birthday-style diversity estimate](assets/16-gans/slide-31.png)

This page borrows the idea of birthday collisions: if the model produces $N$ discrete outcomes with equal probability, then drawing about $\sqrt N$ samples is likely to show a repeat. $N$ is the number of possible outcomes, whereas the sample count is the number actually drawn for inspection; the two are different.

**Interpretation**: repeatedly running into identical results with few samples suggests there may be little effective variation. Equal probability and discrete outcomes are assumptions here; what counts as a "repeat" for real images must also be defined, so this is an estimation idea, and the sample count cannot be taken directly as the model's exact capacity.

<a id="topic-4"></a>
## 4. Conditional generation: asking it to draw specified content

### Given a label or another image

![PDF 35 - Conditional GAN](assets/16-gans/slide-35.png)

In the figure, the conditioning image is fed into both the generator and the discriminator. The generator must produce a result that fits the condition; the discriminator checks whether the **pair** is real, not just whether the result image on its own looks like a photo.

With the condition written as $y$ , the goal is to generate samples from $p(x\mid y)$ . $y$ can be a class, or an input such as an edge map or a sketch. If there are corresponding inputs and real targets, these pairs can be used directly for training.

### Without paired images: CycleGAN

![PDF 37 - Cycle-consistent translation](assets/16-gans/slide-37.png)

The left of the figure has generators in both directions, and the right shows a round trip: an image $x$ from domain $X$ goes to domain $Y$ , then back to $\hat x$ . A **domain** is simply a collection of images of one kind, e.g. two different appearance styles.

The adversarial loss requires the translated result to look like an image of the target domain; **cycle-consistency** requires that after a round trip the result is still close to the starting point:

$$
G_{Y\to X}(G_{X\to Y}(x))\approx x.
$$

The reverse direction is checked in the same way. This removes the need to supply a one-to-one corresponding $Y$ image for every $X$ image.

**Common mistake**: not needing paired samples still means needing data from both domains; being able to reconstruct after a round trip does not guarantee that the translation preserves the semantics a person wants to keep. Check both target-domain appearance and whether the content is sensible.

Demo links such as GAN Lab are collected in [Reading Links](READING-LINKS.md). First observe whether the generator and discriminator have different objectives, then observe whether the generated results concentrate on only a few locations.

## Self-test for this lecture

1. When updating the discriminator and when updating the generator, in which direction do we want $D(G(z))$ to change?
2. A batch of images is very sharp; why could it still come from a poor generative model?
3. Why does CycleGAN check "translate there and back again"? Does that mean it needs no training data?
