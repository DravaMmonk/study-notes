# COMP90086 Lecture 23 - Exam Revision

Sources: `lecture/COMP90086-23-Revision.pdf` (20 pages, 2026 version); `transcript/COMP90086_2026_SM2 Week-12-W-transcript.txt` (2026-10-21). Imported 2026-10-26. Page numbers refer to PDF pages. Worked explanations below interpret the course material; they are not a separately issued official answer key.

This lecture asks: **how do we connect the semester's methods and turn recognition into explanation and calculation?**

Learning path: [Format and scope](#topic-1) → [Revision questions](#topic-2) → [Worked examples](#topic-3). Use this as a route back to the original notes rather than a duplicate set of definitions.

<a id="topic-1"></a>
## 1. Separate exam format from the revision checklist

Slide 2 specifies an on-campus, closed-book exam with two hours of writing and 15 minutes of reading. No writing is permitted during reading time; answers go in the exam booklet. The calculator wording is “Casio FX-82 any suffix and non-programmable”. In the recording, the lecturer says this wording needs clarification, so do not infer a broader set of permitted models. Follow your exam notice and course clarifications.

![PDF 6 - Coverage is not an exhaustive list](assets/23-revision/slide-06.png)

This slide sets two boundaries: coverage includes **lectures and workshops across the semester**, and the following topic list is a memory aid, **not an exhaustive syllabus**. Absence from the revision slides does not establish that a topic is excluded.

Slides 3–5 distinguish short answers, numerical work and longer explanations. Practise stating a purpose in one or two sentences, showing intermediate quantities in a calculation, and justifying a method's assumptions and limits for a task. On October 16 the lecturer identified that session as the last examinable new lecture content, while noting that the following week's workshop could still be examined.

<a id="topic-2"></a>
## 2. Connect topics through inputs, operations and outputs

This table follows revision slides 7–16. The questions are self-checks, not predictions of exam questions.

| Topic and notes | What you should be able to explain |
| --- | --- |
| [Image formation and arrays](02-basics.en.md) | What do intrinsic and extrinsic parameters change? What information can resampling lose? |
| [Spatial filtering](03-filters.en.md), [frequency domain](04-fourier.en.md) | How does a kernel combine with an image? How are boundaries handled? How do spatial operations affect frequencies? |
| [Light, colour and edges](05-image-formation-ii.en.md) | Which quantities are affected by lighting, colour representation and edge operators? Which features tolerate change? |
| [CNN basics](06-cnns-i.en.md), [training](07-cnns-ii.en.md), [architectures and transfer](08-cnns-iii.en.md) | Which layers change size or channels? How are parameters counted? Why augment or fine-tune? |
| [ViT](09-vit.en.md), [representations](10-representations.en.md) | How do CNN and ViT inductive biases differ? How does contrastive learning obtain its training signal? |
| [Local features](11-features.en.md), [matching](12-feature-matching.en.md) | What separate roles do corners, descriptors and geometric consistency play? What do Hough and RANSAC do with candidates? |
| [Depth and stereo](13-depth-stereo.en.md), [two-view geometry](14-two-view-geometry.en.md) | How does disparity relate to depth? What does an epipolar line constrain? Where are calibration and scale needed? |
| [AE/VAE](15-generation.en.md), [GAN](16-gans.en.md), [diffusion](17-diffusion.en.md) | What are each model's training target, generation input and evaluation methods? |
| [Classical segmentation](19-segmentation-i.en.md), [learned segmentation](20-segmentation-ii.en.md) | How do colour clustering, pixel classification and instance masks differ? How is spatial resolution recovered? |
| [Two-stage detection](21-object-detection-i.en.md), [YOLO, DETR and evaluation](22-object-detection-ii.en.md) | Where do proposals, query slots, NMS and mAP belong in the process? |

<a id="topic-3"></a>
## 3. Examples: identify the skill being tested

### 3.1 Concepts: state the distinction and a concrete example

The questions on slide 17 connect back to these ideas:

- **Intrinsic versus extrinsic parameters**: intrinsics describe the camera's imaging properties, such as focal length and principal point; extrinsics describe rotation and translation relative to the world.
- **Descriptors for matching**: the same location should produce similar descriptors across relevant viewpoint or lighting changes, while different locations remain distinguishable. Stability alone is insufficient: an identical descriptor at every point would be stable but useless for matching.
- **VAE versus AE**: an AE primarily learns reconstruction through an encoding; a VAE also constrains the latent distribution and samples during training, making latent space suitable for generation. See [Lecture 15](15-generation.en.md) for the objective.

### 3.2 Calculation: determine output size before computing values

![PDF 18 - Valid cross-correlation example](assets/23-revision/slide-18.png)

The left array is a $3\times3$ kernel and the right array a $3\times3$ image. The task requests **cross-correlation**, valid output and no padding. There is only one fully covered position, so the output is $1\times1$.

Multiply corresponding entries and sum. Omitting the zero-weight terms gives:

$$
y=1\cdot1+1\cdot7+4\cdot4+1\cdot8+1\cdot2=34.
$$

**Common mistake**: correlation does not flip the kernel; convolution does. This particular kernel is unchanged by a 180° rotation, so a correct answer here does not prove you understand the distinction. Check yourself with an asymmetric kernel too.

### 3.3 Analysis: does the model use the object or the background?

![PDF 19 - Object versus background reliance](assets/23-revision/slide-19.png)

The task keeps image classification fixed while asking about CNNs and ViTs. Explain **how to obtain evidence**, not merely that you would inspect features. For a CNN, inspect class-related Grad-CAM maps; for a ViT, inspect attention patterns associated with the class output. Check whether strong responses lie on the object or its background. See [Lecture 9](09-vit.en.md) and [Lecture 10](10-representations.en.md).

A heatmap is evidence, not proof of causation. You can also keep the object fixed while masking or replacing background regions and compare predictions. State what changed and how strongly the observation supports the conclusion.

### 3.4 Architecture: enlarging a feature map does not recover every detail

![PDF 20 - Downsampling and upsampling](assets/23-revision/slide-20.png)

The questions move from naming operations to explaining their purpose. Pooling and strided convolution can downsample; interpolation and transposed convolution can upsample. U-Net first reduces resolution to combine information over wider regions, then restores spatial output while using skip connections to retain earlier localisation cues. See [U-Net](20-segmentation-ii.en.md#topic-3).

## Self-test and original practice material

1. Without the notes, write one algorithm's inputs, main steps, outputs and a failure condition.
2. Apply valid correlation and convolution with an asymmetric kernel and explain the difference.
3. For one set of detections, distinguish the roles of the confidence threshold, NMS threshold and evaluation IoU threshold.

The original practice exam and solutions remain under `exam/`. [Week 12 resource links](READING-LINKS.md#week-12-revision-and-object-detection-workshop) point to Canvas. Attempt the questions independently before checking the solutions and filling gaps in your reasoning.
