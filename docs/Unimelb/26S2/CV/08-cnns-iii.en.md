# COMP90086 Lecture 8 - Convolutional Neural Networks III

Sources: `lecture/COMP90086-08-CNNsIII.pdf` and `transcript/COMP90086_2026_SM2 Week-04-F-transcript.txt`. The supplement on separable convolution comes from `workshop/week-05/worksheet05_solution.ipynb`.

Remember first: **this lecture compares how different CNN backbones improve accuracy, efficiency and trainability, and explains how to transfer a CNN already trained on ImageNet to your own task.** The point is not to memorise architecture names, but to see what problem each design solves.

Learning path: [First fix the metrics and costs](#topic-1) → [Receptive fields, multiple scales and residuals](#topic-2) → [Factorised computation and model scaling](#topic-3) → [Which parameters need updating](#topic-4).

Key points: what problem each architecture solves, and how to transfer a pretrained model. Hard parts: residual learning, and the difference between the two kinds of "separable" convolution. There is no need to memorise every architecture's year and name.

<a id="topic-1"></a>
## 1. Comparing networks: first fix the metrics and costs

### How to read image classification results

![Slide 5 - ImageNet classification](assets/08-cnns-iii/slide-05.png)

ImageNet classification has 1000 object classes. The model first outputs softmax scores for the 1000 classes.

- **Top-1 accuracy**: the highest-scoring class must equal the true label.
- **Top-N accuracy**: the prediction counts as correct as long as the true label is among the $N$ highest scores.

For example, if the true label is `dog`, the model's highest score is `cat`, but `dog` ranks second, then top-1 is wrong while top-5 may be right. Lower top-5 error is better; higher top-5 accuracy is better, so when reading a chart, first check which direction the metric goes.

An error does not necessarily mean the model learned nothing. Small objects, occlusion, unusual viewpoints, greyscale images and images rare in the training set are all harder. When evaluating, look at the metrics, the class distribution and the failure cases together, rather than remembering one overall accuracy.

### Common questions about network architecture

A CNN architecture is the arrangement of layers and the design of each layer. Common adjustable factors include:

- **Depth**: the number of layers;
- **Width**: the number of filters/channels per layer;
- Kernel size;
- Input resolution;
- Where and how downsampling happens.

Going deeper or wider usually increases expressive power, but also increases parameters, memory, running time and optimisation difficulty. So the "innovations" of different architectures are usually trade-offs between accuracy, efficiency and stable training.

<a id="topic-2"></a>
## 2. Architecture design: receptive fields, multiple scales and residuals

### From AlexNet to VGG, Inception and ResNet

#### AlexNet: making large-scale CNNs feasible

![Slide 13 - AlexNet innovations](assets/08-cnns-iii/slide-13.png)

AlexNet's key combination included ReLU, GPU parallelism, data augmentation, dropout, and the response normalization and overlapping max pooling of the time. It demonstrated that a CNN trained on large data with GPUs could greatly improve ImageNet classification.

#### VGG: stacking small kernels

![Slide 15 - Stacked convolutional layers](assets/08-cnns-iii/slide-15.png)

VGG makes heavy use of $3\times3$ convolutions. Two consecutive $3\times3$ layers have an effective receptive field of about $5\times5$ , and three have about $7\times7$ :

$$
3+3-1=5,\qquad 3+3+3-2=7.
$$

Compared with using a single large kernel directly, stacking small kernels usually needs fewer parameters, and the ReLU in each layer adds more nonlinearity. The cost is more layers, and the computation can still be heavy.

#### GoogLeNet/Inception: looking at several scales at once

![Slide 18 - Inception module](assets/08-cnns-iii/slide-18.png)

Objects and features may appear at different scales, so it is hard to decide in advance whether to use only $3\times3$ or $5\times5$ . The Inception module uses different kernel sizes in parallel within the same layer and then concatenates their outputs.

A `1x1 convolution` does not change the height/width but can reduce the number of channels, lowering the cost of subsequent computation. GoogLeNet also adds auxiliary classifiers used only during training, which provide extra gradients to earlier layers and help alleviate vanishing gradients.

#### ResNet: learn the residual instead of forcing an identity mapping

![Slide 24 - ResNet shortcut](assets/08-cnns-iii/slide-24.png)

As a network gets deeper, performance may first improve and then worsen; this is not necessarily overfitting, because training error can also get worse, which shows that optimisation itself has become harder.

ResNet adds skip connections that let the input $x$ bypass several layers, so the output is written as:

$$
y=F(x)+x.
$$

A plain network has to learn the target mapping $H(x)$ directly; a residual block instead learns $F(x)=H(x)-x$ . If the best choice is actually "keep the input unchanged", it only needs $F(x)\approx0$ , which is usually easier than making a stack of layers learn the identity mapping exactly. Skip connections also give gradients a more direct path.

<!-- figure: residual-manifold -->

<a id="topic-3"></a>
## 3. Efficiency: factorised computation and model scaling

### MobileNet and EfficientNet: reducing computation and scaling models sensibly

#### MobileNet: depthwise separable convolution

![Slide 28 - MobileNet](assets/08-cnns-iii/slide-28.png)

An ordinary convolution mixes spatial positions and channels at the same time. MobileNet splits it into two steps:

1. **Depthwise convolution**: apply $K\times K$ spatial filtering to each channel separately;
2. **Pointwise convolution**: mix channels with a $1\times1$ kernel.

**Common mistake**: what is separated here is spatial computation versus channel mixing; the separable filters of Lecture 3 separate the horizontal and vertical directions, and the two are not the same kind of factorisation. This gives fewer parameters and FLOPs (floating-point operations), making it suitable for phones and real-time applications, but it restricts the form of kernel that can be learned, and accuracy may be lower than the heavier VGG/ResNet.

#### Workshop 5 supplement: a separable CNN keeping the original design

The worksheet uses two $5\times5$ separable convolution layers with 8 and 16 output channels on greyscale MNIST input, with pooling in between and a 10-class output at the end. Following the two steps above, we only substitute the sizes from the original exercise below.

According to the original solution, the first layer has $5\times5\times1+1\times1\times1\times8+8=41$ parameters; the second has $5\times5\times8+1\times1\times8\times16+16=344$ ; the fully-connected layer has $256\times10+10=2570$ ; for a total of $2955$ . This is not the original network of the RGB parameter exercise at the start, so the whole difference between 2955 and 48770 cannot be attributed directly to separable convolution.

The original exercise asks to compare the parameter count and test accuracy against the earlier CNN. The reference solution's written conclusion is that parameters decreased and accuracy was similar, but this small model took longer to run. This reminds us that the overhead of extra operations may cancel out the savings in computation; this is an observation from the original solution, and the experiment was not re-run here.

#### EfficientNet: scaling depth, width and resolution together

Increasing depth, width or resolution can each improve accuracy, but with diminishing returns. EfficientNet considers the three factors together and searches for suitable ratios under a fixed computational budget. The lecture slides use an approximate relation to show that cost grows linearly with depth, while the effect of width and resolution is closer to quadratic:

$$
d\times w^2\times r^2\approx 2.
$$

This formula is an approximate constraint for scaling network size, not a law that every CNN must satisfy. It helps us understand that we cannot simply widen the network or enlarge the input without limit.

![Slide 31 - EfficientNet](assets/08-cnns-iii/slide-31.png)

When reading the figure, first distinguish the three terms: $d$ is the scaling factor for the number of layers, $w$ is the factor for channel width, and $r$ is the factor for input resolution. This approximation constrains the computational budget; it does not mean accuracy scales in the same proportion.

<a id="topic-4"></a>
## 4. Transfer learning: which parameters need updating

### Transfer learning: do not start from scratch for every task

#### Why features transfer better than raw pixels

![Slide 37 - Pixels](assets/08-cnns-iii/slide-37.png)

A $256\times256\times3$ image has $196{,}608$ pixel values. Translation, scaling, lighting and rotation can change the pixel values drastically, yet the class usually stays the same. Raw pixels are therefore a high-dimensional space that is sensitive to irrelevant changes.

The intermediate layers of a CNN convert pixels into feature vectors: these have lower dimensionality, and images of the same class, even if they look different, may land in nearby regions of feature space.

![Slide 40 - Using pretrained networks](assets/08-cnns-iii/slide-40.png)

**Transfer learning** means using a CNN pretrained on a large dataset (such as ImageNet) as a feature extractor or as an initial model, and then applying it to a new task.

#### Three common approaches

![Slide 44 - Replace output layer](assets/08-cnns-iii/slide-44.png)

1. **Use pretrained features directly**: take the activations of a later layer of the pretrained CNN as each image's features, then train an external classifier such as an SVM or K-NN.
2. **Frozen backbone + new task head**: remove the original 1000-class output layer and replace it with one for your task's number of classes; freeze the backbone and train only the new output layer.
3. **Fine-tuning**: initialise with the pretrained parameters, then train the last few layers or more with a smaller learning rate.

![Slide 47 - Fine-tuning](assets/08-cnns-iii/slide-47.png)

How many layers to fine-tune depends on two factors:

- The less the new dataset resembles ImageNet, the more likely the lower-level features need adjusting;
- The smaller the new dataset, the more easily training many layers overfits, so more layers should usually be frozen.

So "a pretrained model always applies directly" is inaccurate. It provides a good starting point, but you still need to check input preprocessing, class definitions, domain differences in the data, and validation performance.

## Self-check for this lecture

1. How does a residual block make it easier to represent "keep the input unchanged"?
2. Do the two steps of depthwise separable convolution each handle space or channels?
3. With only a little data for a new task, what is the trade-off between freezing the backbone and fine-tuning the whole network?
