# COMP90086 Lecture 6 - Convolutional Neural Networks I

Sources: `lecture/COMP90086-06-CNNsI.pdf` and `transcript/COMP90086_2026_SM2 Week-03-F-transcript.txt`.

This lecture answers one question: **why are images usually not fed directly into an ordinary fully-connected network, but into a convolutional neural network (CNN) instead?**

Learning path: [Labels and features](#topic-1) → [From fully-connected to convolution](#topic-2) → [Channels, parameter counts and output sizes](#topic-3) → [Feature hierarchies and limits](#topic-4).

Key points: local connectivity, weight sharing, computing parameters and shapes. Hard part: the relationship between input channels, the number of filters and output channels. Common mistake: more output positions do not create a new set of parameters.

<a id="topic-1"></a>
## 1. The learning task: labels and features

### First, be clear about what "recognition" means here

![Slide 5 - Recognition labels](assets/06-cnns-i/slide-05.png)

In this lecture, **image recognition** means classifying a whole image: give the model a complete image and it outputs a single class.

For example, the same picture of a dog could be called, depending on the label set:

- `dog`;
- `shiba inu`;
- `Doge`.

Which words a model can output depends on which classes are in the training data. If the training set has only `couch` and no `dog`, the model will not learn to output `dog` out of nowhere.

For other output formats, see [the task comparison in Lecture 1](01-introduction.en.md). Here we stick to whole-image classification, and clarify the label set before discussing networks.

Slides 8–9 connect to [the recognition challenges of Lecture 1](01-introduction.en.md): first compare the variation in appearance among objects of the same class, then consider how a representation should separate the classes. The rest of this lecture covers networks that implement such a representation.

### From hand-crafted features to neural network features

![Slide 12 - Hand-crafted features](assets/06-cnns-i/slide-12.png)

Traditional methods usually have a person design the features first and then pass them to a classifier. For example:

- Local binary patterns (local arrangement of light and dark);
- Edge filters (edge orientation);
- HOG (statistics of edge orientations);
- GIST (multi-scale scene layout).

These features can be very useful, but they depend on the designer's experience. Features that work on one dataset may stop working on another.

Neural networks hand this step to the data as well: they learn from training samples which local patterns help classification.

![Slide 14 - Deep learning enablers](assets/06-cnns-i/slide-14.png)

Deep learning developed rapidly from around 2010, and there was more than one reason:

1. GPUs can process large quantities of numbers in parallel;
2. Methods such as ReLU and dropout improved training;
3. The internet provided large numbers of labelled images;
4. Datasets such as ImageNet made large-scale experiments possible.

#### Accuracy can be misleading

The lecturer used class imbalance as an example: if a dataset has 90 cats and 10 dogs, always predicting cat still gives $90\%$ accuracy. That model does not actually recognise dogs.

So when evaluating a model, also look at per-class results, the confusion matrix, or metrics that account for class balance, rather than only overall accuracy.

<a id="topic-2"></a>
## 2. Network computation: from fully-connected to convolution

### How a fully-connected network computes

![Slide 20 - Multilayer perceptron](assets/06-cnns-i/slide-20.png)

A fully-connected layer means that every neuron in the next layer is connected to all outputs of the previous layer.

A neuron first multiplies its inputs by weights, adds a bias, and then applies an activation function:

$$
y=f\left(\sum_j w_jx_j+b\right)
=f(\mathbf w^\top\mathbf x+b).
$$

- $x_j$ : input;
- $w_j$ : the weight for this input;
- $b$ : bias, allowing the whole output to shift up or down;
- $f$ : activation function;
- $y$ : neuron output.

Without activations, many linear layers combined are still just one linear transformation, with limited expressive power.

![Slide 22 - Activation functions](assets/06-cnns-i/slide-22.png)

Common activations:

$$
\begin{aligned}
\sigma(x)&=\frac{1}{1+e^{-x}},\\
\tanh(x)&=\frac{e^{2x}-1}{e^{2x}+1},\\
\operatorname{ReLU}(x)&=\max(0,x).
\end{aligned}
$$

ReLU is the easiest to remember first: positive values are kept as they are, negative values become 0. It adds nonlinearity to the network, allowing it to learn more complex decision boundaries.

#### How training changes the weights

![Slide 23 - Backpropagation](assets/06-cnns-i/slide-23.png)

Training can be divided into four steps:

1. Compute predictions with the current weights;
2. Compare the predictions with the true labels to obtain a loss;
3. Use backpropagation to compute how each parameter affects the loss;
4. Update the parameters along the gradient direction.

The simplest gradient descent is written as:

$$
\theta_{t+1}=\theta_t-\eta\nabla_\theta\mathcal L.
$$

$\theta$ denotes the weights and biases to be learned, and $\eta$ is the learning rate. The learning rate, the number of layers and the number of neurons per layer are usually hyperparameters that must be set by hand.

### Why images are poorly suited to being flattened and fed into an MLP

![Slide 26 - AlexNet architecture](assets/06-cnns-i/slide-26.png)

Flattening an $H\times W\times C$ image and feeding it into a fully-connected network is certainly possible, but it has two problems:

1. The number of parameters grows quickly with the image area;
2. After flattening, the model no longer explicitly knows which pixels are spatially adjacent.

Images follow a very stable regularity: edges, corners and textures are usually determined jointly by neighbours within a small area, and the same local pattern may appear at different positions in the image. A CNN builds this regularity directly into the network:

- **Local connectivity**: a neuron looks at only one small patch;
- **Weight sharing**: the same filter is reused at every position.

![Slide 30 - Reusing local connections](assets/06-cnns-i/slide-30.png)

This way the model can search the whole image for the same pattern while learning only one set of weights. The cost is that a single layer sees only a local patch; multiple stacked layers or downsampling are needed to gradually see a larger area.

### How convolution in a CNN works in detail

![Slide 32 - Kernel and stride](assets/06-cnns-i/slide-32.png)

Consider one filter first: place it on a small patch of the image, multiply element by element and sum to get a single number; then move the filter to the next position. How many pixels it moves is determined by the **stride**.

For an input $X\in\mathbb R^{H\times W\times C_{\mathrm{in}}}$ , the pre-activation of output channel $o$ can be written as:

$$
Y_{i,j,o}
=b_o+
\sum_{u=0}^{K_h-1}
\sum_{v=0}^{K_w-1}
\sum_{c=0}^{C_{\mathrm{in}}-1}
K_{u,v,c,o}X_{i+u,j+v,c}.
$$

There is no need to be intimidated by this formula. It simply writes "multiply each number in the patch by its corresponding weight, then add them all up" as a triple sum.

![Slide 35 - CNN uses cross-correlation](assets/06-cnns-i/slide-35.png)

**Common mistake**: the kernel in the figure is not flipped, so this is [the cross-correlation of Lecture 3](03-filters.en.md); CNNs nonetheless keep the name convolution.

<a id="topic-3"></a>
## 3. Key point: channels, parameter counts and output sizes

### Colour channels, filters and activation maps

![Slide 36 - Colour channels and kernel depth](assets/06-cnns-i/slide-36.png)

If the input is an RGB image, the number of input channels is $C_{\mathrm{in}}=3$ . A filter cannot look at just one channel; it must have $K_h\times K_w\times3$ weights, covering R, G and B simultaneously.

![Slide 38 - One activation map](assets/06-cnns-i/slide-38.png)

After one filter slides over all positions, it produces a 2D **activation map**. This map can be understood as "how much of the target pattern this filter detected at each position".

![Slide 40 - Stacked activation maps](assets/06-cnns-i/slide-40.png)

Using $C_{\mathrm{out}}$ filters produces $C_{\mathrm{out}}$ maps, which are stacked to form the multi-channel input of the next layer.

The number of parameters in one layer is:

$$
\#\text{parameters}
=(K_hK_wC_{\mathrm{in}}+1)C_{\mathrm{out}}.
$$

The final `+1` is the bias of each filter. Note that the number of spatial positions in the output does not add any new weights, because all positions share the same filter.

![Slide 42 - Layer input and output](assets/06-cnns-i/slide-42.png)

A convolution is usually followed by ReLU: the convolution computes a local weighted sum, and ReLU provides nonlinearity. After many layers, the network can gradually combine edges into textures, parts and higher-level patterns.

### The difference in parameters between fully-connected and convolutional layers

![Slide 44 - Fully-connected versus convolutional](assets/06-cnns-i/slide-44.png)

Suppose the input is $32\times32\times3$ :

- One fully-connected neuron: $32\times32\times3=3072$ weights plus a bias, $3073$ parameters in total;
- One $5\times5\times3$ convolutional filter: $75$ weights plus a bias, $76$ parameters in total.

![Slide 45 - Fully-connected parameter question](assets/06-cnns-i/slide-45.png)

![Slide 46 - Convolutional parameter question](assets/06-cnns-i/slide-46.png)

This $5\times5\times3$ filter can be reused at $28\times28$ valid locations while still learning only these $76$ parameters. That is the enormous saving brought by weight sharing.

<!-- figure: channel-stack -->

### Output size, stride and padding

![Slide 47 - Convolution output size](assets/06-cnns-i/slide-47.png)

Along one spatial direction, with input size $N$ , kernel size $K$ , padding $P$ and stride $S$ :

$$
N_{\mathrm{out}}
=\left\lfloor\frac{N+2P-K}{S}\right\rfloor+1.
$$

For example, a $32\times32$ input with a $5\times5$ kernel, $P=0$ , $S=1$ :

$$
32-5+1=28,
$$

so the output is $28\times28$ . To keep the size unchanged with $K=5$ , pad 2 pixels on each side:

$$
P=\frac{K-1}{2}=2.
$$

Padding is not only about "restoring the size". The values outside the border affect the outputs near the boundary, so zero, reflect or replicate padding produce different results.

<!-- figure: conv-press -->

<a id="topic-4"></a>
## 4. Feature hierarchies and limits

### The feature hierarchy learned by a CNN

![Slide 49 - Layer 1 kernels](assets/06-cnns-i/slide-49.png)

The first layer often learns oriented edges, colour contrasts and simple textures. These patterns share an intuition with classical filters such as Sobel, but a CNN's weights are learned through training.

![Slide 50 - Layer 2 features](assets/06-cnns-i/slide-50.png)

![Slide 52 - Higher-layer features](assets/06-cnns-i/slide-52.png)

Deeper layers combine earlier local responses, possibly forming textures, corners and parts, and eventually high-level patterns useful for classification. Do not take a single activation visualisation as rigorous proof of semantics; a concept is usually distributed across many channels and positions.

### Strengths and limitations of CNNs

![Slide 53 - Convolutional layer trade-offs](assets/06-cnns-i/slide-53.png)

Main strengths:

- Uses fewer parameters than fully-connected layers on large images;
- The same pattern can be detected at different positions;
- Activation maps preserve spatial structure;
- Local computation suits GPU parallelism.

Main limitations:

- The receptive field of a single layer is still limited;
- Weight sharing automatically provides translation equivariance, but does not automatically handle rotation, scale, lighting or 3D pose;
- Results depend on the data, labels, class balance, loss and optimisation;
- Stride, padding and downsampling may lose edges or details.

A CNN is not "guaranteed to recognise well just because it uses convolution". It provides structural assumptions suited to images; genuine invariance still has to be learned from the network architecture, the data and the training objective.

## Self-check for this lecture

1. If the input has 3 channels and the output has 10 channels, how many input channels should one filter cover?
2. What quantities do a convolutional layer's parameter count and output size each depend on?
3. Why is ReLU also added between stacked convolutions?
