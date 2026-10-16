# COMP90086 Lecture 7 - Convolutional Neural Networks II

Sources: `lecture/COMP90086-07-CNNsII.pdf` and `transcript/COMP90086_2026_SM2 Week-04-W-transcript.txt`. The Workshop 5 supplement comes from `workshop/week-05/worksheet05_solution.ipynb`; it only organises the original exercises, and the training was not re-run.

Remember first: **this lecture tackles two practical problems in training CNNs: intermediate feature maps are too large, and the model memorises the training images instead of generalising.** The former is addressed by downsampling to reduce computation; the latter by regularisation, data augmentation and validation monitoring to limit overfitting.

Learning path: [Downsampling and a parameter exercise](#topic-1) → [Training constraints and when to stop](#topic-2) → [Losses, batches and data](#topic-3) → [Putting the training pipeline together](#topic-4).

Key points: pooling, regularisation and classification losses. Hard part: keeping validation performance separate from parameter updates. Common mistakes: the test set must not be used repeatedly to select models, and a high softmax score does not guarantee a correct prediction.

<a id="topic-1"></a>
## 1. Reducing computation: downsampling and a parameter exercise

### Downsampling: why shrink the feature maps

![Slide 7 - Strided convolution](assets/07-cnns-ii/slide-07.png)

The feature maps output by a convolutional layer can still be very large. If the next layer keeps processing every position, computation and GPU memory both increase. **Downsampling** reduces the height and width of the feature maps; it does not crop the image arbitrarily, but uses a regular operation to retain the more useful information.

It usually brings two benefits:

1. Later layers have fewer numbers to process, so training and inference are faster;
2. More tolerance to very small translations: when an object moves by a pixel or two, the downsampled result may still be similar.

The cost is that details may be lost, especially when the stride is too large.

#### Strided convolution

**Stride** is the distance the convolution window moves each time. With stride 1 the window moves pixel by pixel; with stride 2 it skips two positions at a time, so the output is smaller.

Output sizes all use the formula from [CNNs I](06-cnns-i.en.md). **Common mistake**: only with the `same` padding rule can the output be abbreviated as $\lceil N/S\rceil$ ; it cannot be used for arbitrary padding.

For example, with $N=8,K=3,S=2$ , the window no longer looks at every adjacent position but samples every other position. This is faster, but the window skips some positions and may miss small objects or fine edges.

![Slide 11 - Max pooling](assets/07-cnns-ii/slide-11.png)

#### Max pooling and average pooling

Pooling usually processes each activation map separately. With a $2\times2$ window and stride 2, it turns four numbers into one, so the height and width are roughly halved:

- **Max pooling**: take the largest activation in the window. It tends to preserve the signal "whether some feature occurs strongly in this local area".
- **Average pooling**: take the mean of the window. It preserves the overall level but averages away sharp edge responses, producing a blurrier result.

![Slide 12 - Average pooling](assets/07-cnns-ii/slide-12.png)

Do not think of max pooling as "selecting the brightest pixel". It selects the largest **feature response** on the feature map; that response may represent an edge, a texture or a higher-level pattern. Pooling also discards information at other positions, so the kernel, stride and pooling type should be chosen according to the task.

<!-- figure: pool-sorter -->

#### Workshop 5 supplement: computing parameters and outputs for the original exercise

Source: the CNN parameter exercise at the start of `workshop/week-05/worksheet05_solution.ipynb`. The original solution's heading mistakenly says Exercise 3, but it corresponds to Exercise 1 at the start.

Using the parameter formula from [CNNs I](06-cnns-i.en.md), substitute the sizes from the original exercise layer by layer:

| Layer in exercise | Parameter calculation | Output shape (excluding batch) |
| --- | --- | --- |
| A | $5\times5\times3\times20+20=1520$ | $22\times22\times20$ |
| B | $3\times3\times20\times40+40=7240$ | $20\times20\times40$ |
| C pooling | $0$ | $10\times10\times40$ |
| D fully-connected | $4000\times10+10=40010$ | $10$ |

The total number of parameters is $1520+7240+40010=48770$ . The 4000 obtained by flattening before the Dense layer comes from $10\times10\times40$ ; it is not an additional set of trainable parameters.

The exercise also asks about the output after initialisation. If all parameters are 0, the output of B is an all-zero array of shape $20\times20\times40$ . If all weights are 1 and biases are 0, every output channel performs the same local summation and therefore produces the same blurred response; the original reference solution describes this as an averaging filter.

<details>
<summary>Extension (optional): correcting the wording "averaging" in the original solution</summary>

<p>With all weights equal to 1, what is computed is strictly a sum, without dividing by the number of kernel elements, so the values are not an average. You can understand the spatial effect as a blurred image, but do not conclude from this that the brightness range is preserved. This is a correction to the original solution based on the weight setting in the exercise.</p>

</details>

The exercise finally proposes reducing parameters with separable convolutions or stacked small kernels. The concrete separable exercise continues in the corresponding topic of [CNNs III](08-cnns-iii.en.md).

<a id="topic-2"></a>
## 2. Reducing overfitting: training constraints and when to stop

### Regularisation: why high training accuracy is not enough

CNNs have many parameters and are prone to **overfitting**: the model performs very well on the training set, but treats incidental details of the training images as general rules, and its performance drops on the validation or test set. The goal of regularisation is to make the model learn a more stable, simpler representation.

#### L1 and L2 regularisation

Denote the original supervised loss by $\mathcal L_{data}$ ; after adding regularisation:

$$
\mathcal L=\mathcal L_{data}+\lambda\,\mathcal R(\theta),
$$

where $\theta$ are the network parameters and $\lambda$ controls how much the penalty matters.

![Slide 17 - L1, L2 regularisation](assets/07-cnns-ii/slide-17.png)

- **L1**: $\mathcal R(\theta)=\sum_i|\theta_i|$ . It tends to push some parameters to 0, giving sparser parameters.
- **L2**: $\mathcal R(\theta)=\sum_i\theta_i^2$ . It tends to make parameters smaller, but usually does not make many of them exactly 0.

The "penalty" here does not delete parameters directly; rather, large parameters incur a higher loss at every update. If $\lambda$ is too small it may fail to curb overfitting; if too large it may suppress useful signal as well, leading to underfitting. You must also decide which layers to penalise and whether to include biases.

#### Dropout

![Slide 20 - Dropout](assets/07-cnns-ii/slide-20.png)

**Dropout** randomly sets the outputs of some neurons to 0 during training. This way the network cannot rely on any one fixed neuron, and multiple neurons must learn relatively independent, interchangeable evidence. You can think of it as training a slightly different sub-network on each mini-batch.

The dropout rate is a hyperparameter; for example, 0.2 means about 20% of neurons are dropped at random. It is used only during training; at validation and test time all neurons are active. Dropout may increase total training time, because the model needs more epochs to reach stable performance.

#### Early stopping

![Slide 22 - Early stopping](assets/07-cnns-ii/slide-22.png)

Split the data into three parts: training, validation and test sets. Use the training set to update the model parameters, and periodically check the loss and accuracy on the validation set. If the training loss keeps falling but validation performance starts to worsen, the model may be starting to overfit; stop training at that point and keep the model checkpoint with the best validation performance. The test set should be reserved for one final evaluation and must not be used repeatedly to choose models.

<a id="topic-3"></a>
## 3. Classification training: losses, batches and data

### How a CNN for image recognition is trained

![Slide 25 - CNN overview](assets/07-cnns-ii/slide-25.png)

A common architecture can be split into two parts:

1. Convolution + activation + downsampling: turn pixels into a higher-level feature vector;
2. Fully-connected (dense) layers: classify based on the embedding vector.

Finally, softmax outputs a score for each class, and cross-entropy compares the prediction with the true label. Denote the unnormalised scores of the classification layer as logits $a_i$ :

$$
\hat y_i=\operatorname{softmax}(a_i)=\frac{e^{a_i}}{\sum_{j=1}^{N}e^{a_j}},
$$

Here $N$ is the number of classes and $\hat y_i$ is the predicted value for class $i$ ; the $y_i$ below refers specifically to the true label, to avoid confusing labels with logits. The outputs lie between 0 and 1 and sum to 1. **Common mistake**: a high normalised score does not guarantee a correct prediction. If the true class is $k$ , the position equal to $1$ in the one-hot label (1 only at the true class) is $k$ , and cross-entropy encourages $\hat y_k$ to grow:

$$
\mathcal L_{CE}=-\sum_{i=1}^{N}y_i\log(\hat y_i).
$$

![Slide 28 - Cross-entropy loss](assets/07-cnns-ii/slide-28.png)

In the figure, the true label is 1 only in the frog column, so the loss in this example directly reads only the model's predicted value for frog; giving high scores to other classes squeezes out the probability of frog. The slides also divide by the number of classes; the text here keeps the single-sample form without that constant scaling.

#### Batches, epochs and learning rate

We cannot put the entire dataset onto the GPU for every update, so the training set is split into mini-batches. The **batch size** is the number of samples used to compute one gradient; an **epoch** means every training image has been seen once. Small batches update more often but have noisier gradients; large batches are more stable but use more computation and memory per step.

The **learning rate** controls the step size of [the parameter update in Lecture 6](06-cnns-i.en.md). Too large and it may overshoot good solutions; too small and progress is very slow. Reducing the learning rate later in training allows finer adjustment of the parameters.

#### Data preprocessing and augmentation

Inputs are usually first scaled or whitened so that their range and centre are better suited to optimisation. **Data augmentation** applies reasonable random changes only to training images, such as random crops, horizontal flips and slight colour/contrast changes, to simulate differences in capture conditions that may occur at test time.

![Slide 32 - Data augmentation](assets/07-cnns-ii/slide-32.png)

Augmentation must not contradict the meaning of the label. For example, natural objects can usually be flipped horizontally, but vertical flips or excessive colour changes may turn an image into something that does not exist in the training distribution, which actually hurts the model.

<a id="topic-4"></a>
## 4. Workshop: putting the training pipeline together

### Workshop 4: comparing an MLP and a CNN on MNIST

This week's `workshop/week-04/worksheet04_solution.ipynb` first deals with colour spaces and image formation, then uses MNIST ( $28\times28$ single-channel handwritten digits) to compare an MLP and a CNN:

- The MLP first flattens the image into $784$ numbers and then classifies with fully-connected layers;
- The CNN keeps the 2D structure and classifies with `Conv2D`, `MaxPooling2D`, `Flatten` and an output layer;
- The code divides pixels by 255 so that inputs lie in $[0,1]$ , and adds a channel dimension to match Keras's `(batch, height, width, channels)` input format;
- The parameter calculation in the reference solution reminds us that convolutional filters share weights across spatial positions, so they usually have fewer parameters than an MLP on flattened input; in this MNIST exercise, the CNN also achieves higher test accuracy.

Focus on the concepts first; there is no need to memorise the specific accuracy from a single run: random initialisation, number of epochs, hardware and software versions all change the final decimals.

## Self-check for this lecture

1. Strided convolution and pooling both shrink the feature map; how do they differ in terms of parameters?
2. When the training loss falls but the validation loss rises, what should you check?
3. Why does cross-entropy penalise a low predicted probability for the true class?
