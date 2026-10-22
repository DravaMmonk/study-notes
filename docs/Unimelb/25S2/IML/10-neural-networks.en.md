# COMP90049 Lectures 14–16 - Perceptron, Neural Networks and Backpropagation

Sources: `lecture/14-perceptron.pdf`, `lecture/15_Neural_Networks.pdf` (its cover says Lecture 16), `lecture/16-backprop.pdf`; Apple Notes: CS/25S2/IML — "W7L14 Perception - Neural Network I", "W8L15-16 Neural Network", "★3.2 Multi-layer Perceptron", "★3.1 Classic Supervised Learning" (perceptron part).

This lecture asks: **how does a simple unit modelled on a neuron learn? Why can many such units connected in layers learn what linear models cannot, and how are they trained?**

Learning path: [One neuron: the perceptron](#topic-1) → [How the perceptron learns](#topic-2) → [Multilayer perceptron and XOR](#topic-3) → [Feature learning and network design](#topic-4) → [Backpropagation](#topic-5).

Key points: the perceptron update rule, the forward-pass formulas, the generalized delta rule. Hard parts: where the error terms of hidden layers come from. Common mistakes: the step function cannot be used for gradient training; the sign convention for $\delta$ in the update; the input paired with the bias is always 1.

<a id="topic-1"></a>
## 1. One neuron: the perceptron

### Motivation: minimise classification errors directly

[Naive Bayes](04-NB.md) is a generative model that maximises the data likelihood; [logistic regression](05-LR.md) is a discriminative model that maximises the conditional likelihood. The **perceptron** is inspired by neurons in the brain: it drops probabilities and instead **minimises the classification error directly**.
<!-- Sources: L14 p.4-5 -->

An **artificial neural network** consists of many simple processing units (artificial neurons) connected together: each unit receives one or more inputs and applies an **activation function** to their weighted sum to produce an output. Using a neural network requires (a) designing the network topology and (b) adjusting the weights to the data; this subject focuses on (b). So we first look at a single unit of the network.
<!-- Sources: L14 p.6-7 -->

### An artificial neuron

![L14 slide 09 - An artificial neuron](assets/10-neural-networks/slide-l14-09.png)

Read from left to right: the left column of circles are the inputs, and the "1" at the top is a dummy input that is always 1; each line carries a weight $\theta_0,\dots,\theta_d$ (blue); the big circle in the middle passes the weighted sum through the activation function $f$ (green); the arrow on the right gives the output $y$ (pink). The two formulas on the right say the same thing:

$$
y=f(\theta_0+\theta_1x_1+\cdots+\theta_dx_d)=f(\theta\cdot\mathbf{x}),\qquad \mathbf{x}=(1,x_1,\dots,x_d).
$$

- $\mathbf{x}$ : the numeric input vector; the leading 1 makes $\theta_0$ the **bias**;
- $\theta=(\theta_0,\dots,\theta_d)$ : the parameters to be learned;
- $f$ : the activation function, a hyperparameter chosen in advance.
<!-- Sources: L14 p.9-11 -->

### The perceptron: binary classification with a step function

![L14 slide 13 - Perceptron decision boundary](assets/10-neural-networks/slide-l14-13.png)

The perceptron does binary classification (classes $1$ and $-1$ ), and its activation function is the **step function**:

$$
f(\theta\cdot\mathbf{x})=\begin{cases}1 & \text{if } \theta\cdot\mathbf{x}>0\\ -1 & \text{otherwise}\end{cases}
$$
<!-- Sources: L14 p.12 -->

Look at the 2-d example below: the green line is $\theta\cdot\mathbf{x}=0$ , the **decision boundary**; the red arrow $\theta$ is at a right angle to the green line and points to the side where $\theta\cdot\mathbf{x}>0$ and the prediction is $1$ (blue squares); the other side, predicted $-1$ , holds the red dots. The boundary is a straight line (a hyperplane in higher dimensions), so the perceptron is a **linear classifier**.
<!-- Sources: L14 p.13 -->

<a id="topic-2"></a>
## 2. How the perceptron learns

### Intuition: when wrong, push in the opposite direction

![L14 slide 18 - Perceptron update intuition](assets/10-neural-networks/slide-l14-18.png)

Learning means adjusting the parameters so that performance improves. The most direct idea is to count misclassifications, but that is mathematically inconvenient (discontinuous, not differentiable). This slide lists four cases row by row: when the prediction is right (first two rows), do nothing; when the truth is $1$ but the prediction is $-1$ , increase the weights so that $\theta\cdot\mathbf{x}$ gets larger; the pink row is truth $-1$ but prediction $1$ , and the red arrow points out that here $\theta\cdot\mathbf{x}>0$ and must be pushed down to 0 or below.

The rightmost column rewrites the four rows as the sign of $y(\theta\cdot\mathbf{x})$ : greater than 0 for the two correct rows, less than or equal to 0 for the two wrong rows. So both kinds of mistake can be detected by

$$
y_i(\theta\cdot\mathbf{x}_i)\le0,
$$

the same form as the margin condition in [SVM](06-SVM.md) (the slide refers to Lecture 9).
<!-- Sources: L14 p.15-18 -->

### The training algorithm

![L14 slide 20 - Perceptron training algorithm](assets/10-neural-networks/slide-l14-20.png)

The box holds the core: the outer loop runs $T$ **epochs**, the inner loop visits the $N$ training examples one by one; when sample $i$ is misclassified,

$$
\theta^{(k+1)}=\theta^{(k)}+\eta\,y_i\,\mathbf{x}_i ,
$$

where $\eta>0$ is the **learning rate** and $k$ counts how many updates have been made. Each speech bubble explains one detail:

- left: strictly the mistake condition should be $<0$ ; writing $\le0$ handles the starting point $\theta^{(0)}=\mathbf{0}$ (where every $\theta\cdot\mathbf{x}=0$ and an update is needed first);
- right: the superscript $(k)$ is only convenient for theory; in an implementation just write $\theta\leftarrow\theta+\eta y_i\mathbf{x}_i$ .
<!-- Sources: L14 p.19-20 -->

### Example 1: one update seen on the plot

![L14 slide 27 - Example 1 update for sample 2](assets/10-neural-networks/slide-l14-27.png)

Example 1 has no bias and $\eta=1$ . Starting from $\theta=\mathbf{0}$ , sample 1 (blue square, class 1) triggers the first update, giving $\theta=\mathbf{x}_1$ , the solid red arrow; the green line is the boundary perpendicular to it. Now look at sample 2 (red dot, class $-1$ ): it lies on the same side of the boundary as $\theta$ , so it is classified as 1 — a mistake.

The update is $\theta\leftarrow\theta+y\mathbf{x}=\theta-\mathbf{x}_2$ : the dotted black arrow $-\mathbf{x}$ is attached to the tip of $\theta$ , giving the dotted red arrow, the new $\theta=\mathbf{x}_1-\mathbf{x}_2$ . The new $\theta$ has turned away from sample 2, and the boundary rotates with it. The slides then continue with samples 3, 1 and 2; when sample 2 is misclassified again it is subtracted once more, until all points are separated.
<!-- Sources: L14 p.22-32 -->

### Why the update works

![L14 slide 35 - Why the update rule works](assets/10-neural-networks/slide-l14-35.png)

The blue $\theta^{(k+1)}$ is the parameter after the update, the red $\theta^{(k)}$ the one before. Substitute the update into the mistake quantity $y_i(\theta\cdot\mathbf{x}_i)$ :

$$
y_i(\theta^{(k+1)}\cdot\mathbf{x}_i)=y_i(\theta^{(k)}\cdot\mathbf{x}_i)+\eta\,y_i^2\,\lVert\mathbf{x}_i\rVert^2>y_i(\theta^{(k)}\cdot\mathbf{x}_i),
$$

because $y_i^2=1$ , $\eta>0$ and $\lVert\mathbf{x}_i\rVert^2>0$ . In other words, every update strictly increases the mistake quantity of the sample just misclassified, moving it towards "correct" (though one update is not always enough).
<!-- Sources: L14 p.35; Apple Notes W7L14 Perception - Neural Network I -->

Extension (slide typo): the bubble at the bottom right says $\lVert\mathbf{x}_i\rVert=\mathbf{x}_i\cdot\mathbf{x}_i$ ; it should be $\lVert\mathbf{x}_i\rVert^2=\mathbf{x}_i\cdot\mathbf{x}_i$ : the Euclidean norm is the square root of the dot product. The derivation itself uses the square and is unaffected.

### Example 2: a hand trace with a bias

![L14 slide 39 - Example 2 first update](assets/10-neural-networks/slide-l14-39.png)

Example 2: $\eta=0.1$ , initial $\theta=(\theta_0,\theta_1,\theta_2)=(-0.1,0.2,0)$ , so the boundary $-0.1+0.2x_1=0$ is the vertical green line $x_1=0.5$ on the right, and the red arrow points to the right-hand side, predicted 1. The first training example $(1,1)$ is a red dot (class $-1$ ) on the right-hand side, so it is misclassified: the three lines at the bottom left are the component-wise update; note that $\theta_0$ only loses $\eta$ .

![L14 slide 41 - Example 2 second update](assets/10-neural-networks/slide-l14-41.png)

After the update the boundary becomes the sloped line through $x_1=2$ on the right, with the red arrow pointing down and to the right. The second example $(2,1)$ is a blue square (class 1) but lies on the side where $\theta\cdot\mathbf{x}<0$ , so it is misclassified too; this time $y=+1$ , so all three components are added.

![L14 slide 43 - Example 2 further points](assets/10-neural-networks/slide-l14-43.png)

After two updates $\theta=(-0.1,0.3,0)$ and the boundary is back to a vertical line, $x_1=1/3$ . The third point $(1.5,0.5)$ is a blue square, gives $0.35>0$ , is correct and causes no update; the fourth point at the top right is a red dot but lies on the right-hand side, so it is misclassified and another update follows.

| Step | Sample $(x_1,x_2)$ , label | $\theta\cdot\mathbf{x}$ | Misclassified? | $\theta$ after the step |
| --- | --- | --- | --- | --- |
| 1 | $(1,1)$ , $-1$ | $-0.1+0.2+0=0.1$ | yes ( $y\cdot0.1<0$ ) | $(-0.1,0.2,0)-0.1\cdot(1,1,1)=(-0.2,0.1,-0.1)$ |
| 2 | $(2,1)$ , $+1$ | $-0.2+0.2-0.1=-0.1$ | yes | $(-0.2,0.1,-0.1)+0.1\cdot(1,2,1)=(-0.1,0.3,0)$ |
| 3 | $(1.5,0.5)$ , $+1$ | $-0.1+0.45+0=0.35$ | no | unchanged; boundary still $x_1=1/3$ |
| 4 | the top-right point, $-1$ | $>0$ | yes | update again |
<!-- Sources: L14 p.37-43 -->

**Common mistake:** the input paired with the bias $\theta_0$ is always 1, so its update is $\theta_0\leftarrow\theta_0+\eta y$ , not multiplied by any feature value.
<!-- Sources: L14 p.39-41; Apple Notes W7L14 Perception - Neural Network I -->

### Convergence and online learning

- When the data are **linearly separable**, the perceptron is guaranteed to converge; the final parameters depend on the initialisation and the learning rate; unlike an SVM, the margin is not guaranteed to be maximised.
- When the data are not linearly separable, convergence is not guaranteed.
<!-- Sources: L14 p.46 -->

![L14 slide 47 - Perceptron rule vs gradient descent](assets/10-neural-networks/slide-l14-47.png)

The two update rules and their activation functions are compared side by side. The step function on the left jumps at 0, and its derivative is undefined there, so the perceptron rule is not derived from a derivative; the sigmoid on the right rises smoothly and is differentiable everywhere, so [gradient descent](07-optimisation.en.md#topic-3) can be used. A single neuron with sigmoid activation that minimises the cross-entropy (negative log-likelihood) is equivalent to logistic regression.
<!-- Sources: L14 p.47-48 -->

**Common mistake:** the formula on the right is written $+\eta\,\partial f/\partial\theta$ , which climbs an objective to be **maximised** (such as the log-likelihood); if $f$ is an error to be minimised, use $-\eta\,\partial E/\partial\theta$ , which is exactly how backpropagation in Section 5 is written.

| | Perceptron | Naive Bayes / logistic regression (gradient descent) |
| --- | --- | --- |
| Update style | **Online**: update after every example | **Batch**: compute statistics over the whole training set, then update all parameters at once |
| Suitability | More efficient on large data sets | Gradient descent can be turned into an online version: stochastic gradient descent |
<!-- Sources: L14 p.49 -->

<a id="topic-3"></a>
## 3. Multilayer perceptron and XOR

### Three kinds of layer and the terminology

A neural network is a combination of many perceptron-like units; the units must use **continuous** activation functions, and connecting them into many layers is deep learning.
<!-- Sources: L15 p.9-12 -->

![L15 slide 16 - MLP terminology](assets/10-neural-networks/slide-l15-16.png)

The figure has four coloured blocks from left to right: red is the input layer (one unit per feature, plus the bias 1), the two blue blocks are hidden layers, and green is the output layer (one unit suffices for binary classification). Every pair of units in adjacent layers is connected, which is what **fully connected** means. The terminology above:

- the number of layers $L$ is the **depth**; the number of units $K_l$ in layer $l$ is its **width**, and widths can differ between layers (here hidden layer 1 has 4 units, hidden layer 2 has 2);
- each connection $ij$ has a weight $\theta^{(l)}_{ij}$ (including the bias $\theta_0$ );
- the non-linear activation function of layer $l$ is written $\phi^{(l)}$ .

The **multilayer perceptron (MLP)** is a feed-forward, fully connected supervised learner; convolutional networks, recurrent networks and autoencoders (unsupervised) are other kinds of neural network.
<!-- Sources: L15 p.13, p.16 -->

### The forward pass

Push the input to the right layer by layer; each layer takes a weighted sum and then applies its activation function. For a network with two hidden layers:

$$
h^{(1)}_i=\phi^{(1)}\Big(\sum_j\theta^{(1)}_{ij}x_j\Big),\quad
h^{(2)}_i=\phi^{(2)}\Big(\sum_j\theta^{(2)}_{ij}h^{(1)}_j\Big),\quad
y_i=\phi^{(3)}\Big(\sum_j\theta^{(3)}_{ij}h^{(2)}_j\Big).
$$

In vector form: $\mathbf{h}^{(1)}=\phi^{(1)}(\theta^{(1)\top}\mathbf{x})$ , $\mathbf{h}^{(2)}=\phi^{(2)}(\theta^{(2)\top}\mathbf{h}^{(1)})$ , $\mathbf{y}=\phi^{(3)}(\theta^{(3)\top}\mathbf{h}^{(2)})$ , with the activation functions applied element-wise.
<!-- Sources: L15 p.17-18 -->

### Linear vs non-linear classification

| | Linear classification | Non-linear classification |
| --- | --- | --- |
| Models | Perceptron, naive Bayes, logistic regression | Neural networks with at least one hidden layer and non-linear activations |
| Decision boundary | A linear combination of features $\sum_i\theta_ix_i$ | A non-linear function of the inputs |
| Feature interactions | Not learned; must be engineered by hand | Learned by the network |
<!-- Sources: L15 p.14 -->

### Example: XOR

![L15 slide 21 - XOR is not linearly separable](assets/10-neural-networks/slide-l15-21.png)

The slides plot three Boolean functions in turn: AND, OR and XOR. This page is XOR: the truth table on the left; in the plot, blue plus signs are $y=1$ ( $(0,1)$ and $(1,0)$ ) and red dots are $y=0$ ( $(0,0)$ and $(1,1)$ ). The two blue points lie on one diagonal and the two red points on the other, so no single straight line can put them on different sides. AND and OR can each be separated by a line, so a single perceptron can learn them; XOR cannot, so a single perceptron cannot learn it.
<!-- Sources: L15 p.19-21 -->

![L15 slide 22 - An MLP for XOR](assets/10-neural-networks/slide-l15-22.png)

The blue numbers are weights, and the arrows from "1" are biases; the activation at the bottom is "output 1 if $\ge0$ , else 0". How to read it:

- $h_1=\phi(x_1+x_2-0.5)$ : outputs 1 if at least one input is 1, i.e. OR;
- $h_2=\phi(x_1+x_2-1.5)$ : outputs 1 only if both are 1, i.e. AND;
- $y=\phi(h_1-h_2-0.5)$ : OR is true and AND is false, i.e. XOR.

Row-by-row check (my own calculation):
<!-- Sources: L15 p.22 -->

| $x_1$ | $x_2$ | $h_1$ (OR) | $h_2$ (AND) | $h_1-h_2-0.5$ | $y$ |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | 1 | 1 | $-0.5$ | 0 |
| 1 | 0 | 1 | 0 | $0.5$ | 1 |
| 0 | 1 | 1 | 0 | $0.5$ | 1 |
| 0 | 0 | 0 | 0 | $-0.5$ | 0 |

**Key point:** the hidden layer first turns the input into a new representation $(h_1,h_2)$ ; in this new space there are only three points, $(0,0)$ , $(1,0)$ and $(1,1)$ , XOR becomes linearly separable, and the output unit only needs to draw one more line.

### Expressive power and when to use a linear model

**Universal approximation theorem**: a feed-forward network with a single hidden layer (and finitely many neurons) can approximate any continuous function on $\mathbb{R}^n$ . The precondition is that the activation functions are non-linear; otherwise the whole network is still just a (complicated) linear model.
<!-- Sources: L15 p.42 -->

Linear classification is still enough when: the classes are known to be (approximately) linearly separable; the feature space is very high-dimensional (more features than training instances, cf. the kernel trick); the training set is small; interpretability matters.
<!-- Sources: L15 p.43 -->

<a id="topic-4"></a>
## 4. Feature learning and network design

### Feature engineering vs feature learning

The perceptron, naive Bayes and logistic regression need a fixed set of informative features (for example outlook, wind), which requires domain knowledge: this is **feature engineering**. Neural networks take "raw" numeric data as input and learn features as intermediate representations while solving the target task: **representation learning**. The price is more things to tune: number of layers, activation functions, learning rates and so on.
<!-- Sources: L15 p.24-31 -->

![L15 slide 29 - Learned intermediate features](assets/10-neural-networks/slide-l15-29.png)

The weather example: what we really observe are raw measurements m1…mF (left column). The previous slide summarised them by hand into four features, Outlook, Temperature, Humidity and Windy, before predicting Play?; this slide replaces the four middle boxes with "???": the network itself decides which measurements to combine into which intermediate features. These "???" boxes are the hidden units; the next two slides redraw them as an MLP with 1 and then 2 hidden layers.

![L15 slide 32 - Feature learning in face recognition](assets/10-neural-networks/slide-l15-32.png)

From left to right, the small images at the top are the features learned by successive hidden layers: first edges at different orientations, then local parts such as eyes and noses, finally whole-face patterns, from which the output layer decides that the person is "Sara". The deeper the hidden layer, the more abstract its representation.
<!-- Sources: L15 p.32 -->

### Designing a network: input representation

![L15 slide 34 - Input representations](assets/10-neural-networks/slide-l15-34.png)

The input $\mathbf{x}$ might be a patient's measurements, a piece of text or an image, but the network can only consume numbers. The orange table is **one-hot encoding**: the vocabulary has five words, cat, mat, on, sat and the; each word becomes a length-5 vector with a 1 only in its own column, so the dimension equals the vocabulary size $V$ . Pre-trained word embeddings instead have a fixed dimension $k$ . Images use pixel RGB values or other visual features.

### The other design choices

| Design choice | Options |
| --- | --- |
| Network structure | How to trade off depth against width is an empirical question that is poorly understood theoretically; width usually decreases layer by layer (rule of thumb: no more than half of the previous layer); advanced structures such as CNNs, RNNs and attention are beyond this subject |
| Output function | Binary classification: a single unit with a step function or sigmoid; multiclass: one unit per class, normalised into a probability distribution with **softmax**; regression: the identity (linear) function, or possibly sigmoid or tanh |
| Loss function | Classification: cross-entropy (negative conditional log-likelihood); regression: usually MSE |
<!-- Sources: L15 p.34-39 -->

Softmax at a multiclass output layer:

$$
p(y_i=j\mid\mathbf{x}_i;\theta)=\frac{\exp(z_j)}{\sum_{k=1}^{K}\exp(z_k)},
$$

where $z_j$ is the weighted sum sent by the penultimate layer to output unit $j$ , and $K$ is the number of classes.

![L15 slide 38 - Loss functions](assets/10-neural-networks/slide-l15-38.png)

The slide has three blocks from top to bottom: the general classification loss is the negative conditional log-likelihood; for binary classification $\hat{y}^{(i)}_1$ is the predicted probability of class 1, giving **binary cross-entropy**; for multiclass the sum runs over every class $j$ , giving **categorical cross-entropy**:

$$
L=-\sum_i\big[y^{(i)}\log\hat{y}^{(i)}_1+(1-y^{(i)})\log(1-\hat{y}^{(i)}_1)\big],\qquad
L=-\sum_i\sum_j y^{(i)}_j\log\hat{y}^{(i)}_j ,
$$

where $y^{(i)}_j=1$ for the true class $j$ and 0 otherwise, so only the true-class term survives the inner sum. Regression uses MSE: $L=\frac1N\sum_i(y^{(i)}-\hat{y}^{(i)})^2$ .
<!-- Sources: L15 p.37-39 -->

### Activation functions

![L15 slide 36 - Activation functions](assets/10-neural-networks/slide-l15-36.png)

Three curves: the blue sigmoid squashes its input into $(0,1)$ , the orange tanh into $(-1,1)$ and more steeply, and the green ReLU is 0 on the negative half-axis and a straight line on the positive half. The start of the next lecture plots their derivatives:

| Activation | Formula | Shape of the derivative |
| --- | --- | --- |
| Sigmoid (logistic) | $f(z)=\dfrac{1}{1+e^{-z}}$ | Bell-shaped, maximum at 0 |
| tanh | $f(z)=\dfrac{e^{2z}-1}{e^{2z}+1}$ | Also bell-shaped but sharper and taller, giving larger updates than sigmoid |
| ReLU | $f(z)=\max(0,z)$ | 1 for $z>0$ , 0 for $z<0$ ; undefined at 0 and set to 0 by convention; helps to "delete" unnecessary weights |
<!-- Sources: L15 p.36; L16 p.4-6 -->

The student's notes record that ReLU is the usual choice for hidden layers.
<!-- Sources: L15 p.36; Apple Notes W8L15-16 Neural Network -->

![L16 slide 07 - Why not the step function](assets/10-neural-networks/slide-l16-07.png)

**Common mistake: why not the step function?** The left plot is the step function, the right plot its derivative: the open circle at 0 means it is undefined there, and elsewhere it is a line lying on the horizontal axis, i.e. 0. With a gradient of 0 everywhere there is no way to update the weights, so the network learns nothing. The perceptron can use a step function only because its rule needs no derivative.
<!-- Sources: L16 p.7 -->

### Why deep learning succeeds, and what it costs

![L15 slide 44 - Performance vs amount of data](assets/10-neural-networks/slide-l15-44.png)

The horizontal axis is the amount of training data, the vertical axis model performance. The blue line ("classical" machine learning) quickly levels off; the orange line (deep learning) keeps rising as data grow. The more data, the clearer the advantage of neural networks.

**Note: pros and cons of neural networks.** Pros: with at least one hidden layer they are universal approximators; they learn features automatically; empirically they perform very well on many tasks. Cons: their power increases the danger of overfitting (see [08 Evaluation](08-evaluation.en.md)); they need large training sets; they often need powerful compute such as GPUs; they lack interpretability.
<!-- Sources: L15 p.45 -->

<a id="topic-5"></a>
## 5. Backpropagation

### The problem: hidden layers have no "correct answer"

The training recipe: forward-propagate an input and compute the output $\hat{y}$ ; compare it with the true $y$ to get the error; change every weight so the error decreases, for example by gradient descent

$$
\theta^{l}_{ij}\leftarrow\theta^{l}_{ij}+\Delta\theta^{l}_{ij},\qquad \Delta\theta^{l}_{ij}=-\eta\frac{\partial E}{\partial\theta^{l}_{ij}} ;
$$

then repeat. How the learning rate affects this step is covered in [the learning-rate section of 07](07-optimisation.en.md#topic-4).
<!-- Sources: L16 p.13-14 -->

![L16 slide 17 - Towards backpropagation](assets/10-neural-networks/slide-l16-17.png)

The top half recalls the perceptron: the figure on the right is a single unit, where the red $z=\sum_k\theta_kx_k$ is the weighted sum and the green $a=g(z)$ is the activation. Its rule $\theta_i\leftarrow\theta_i+\eta yx_i$ uses the true output $y$ . The Problems in the bottom half point out that we only know the true output of the last layer, not what the hidden layers "should" output. **Backpropagation** gives an efficient way to compute the partial derivative of the error with respect to every weight: it is essentially gradient descent, with the chain rule used to make the computation efficient.
<!-- Sources: L15 p.40; L16 p.15-17, p.25 -->

### Output layer: the generalized delta rule

Let the total input to neuron $i$ be $z_i=\sum_j\theta_{ij}a_j$ , its activation a sigmoid $a_i=g(z_i)$ , and the error $E=\frac12(y-a_i)^2$ .
<!-- Sources: L16 p.27 -->

![L16 slide 30 - Error of the final layer](assets/10-neural-networks/slide-l16-30.png)

The diagram at the top: the three nodes from left to right are $k$ , $j$ , $i$ ; in each circle $\Sigma$ means taking the weighted sum and $g$ means the activation; the pink box marks the weight being differentiated, $\theta^{2}_{ij}$ (from $j$ to the output node $i$ ), and the pink box on the far right, $a_i=\hat{y}_i$ , is the network output. In the derivation below, the red note to the right of each line says which definition that step uses; the chain rule peels off one layer at a time:

$$
\Delta\theta^{2}_{ij}=-\eta\frac{\partial E}{\partial\theta^{2}_{ij}}
=\eta(y-a_i)\frac{\partial a_i}{\partial\theta^{2}_{ij}}
=\eta(y-a_i)\,g'(z_i)\frac{\partial z_i}{\partial\theta^{2}_{ij}}
=\eta\underbrace{(y-a_i)\,g'(z_i)}_{\delta_i}\,a_j .
$$
<!-- Sources: L16 p.28-30 -->

![L16 slide 31 - The generalized delta rule](assets/10-neural-networks/slide-l16-31.png)

Naming the part under the brace $\delta_i$ (the red square next to node $i$ ) gives the **generalized delta rule**:

$$
\Delta\theta^{2}_{ij}=\eta\,\delta_i\,a_j,\qquad \delta_i=(y-a_i)\,g'(z_i).
$$

Weight update = error term $\delta_i$ × the activation $a_j$ coming in along this connection. This $\delta_i$ depends on the target output $y$ and so applies only to output units; that is why $\delta$ has to be "back-propagated" from right to left.
<!-- Sources: L16 p.31 -->

### Hidden layers: passing the error terms back

![L16 slide 34 - Delta rule for a hidden layer](assets/10-neural-networks/slide-l16-34.png)

The pink box has now moved to a weight of the previous layer, $\theta^{1}_{jk}$ (from $k$ to the hidden node $j$ ). The first four steps of the derivation are exactly the same as for the output layer (red note "Same as the first 4 steps"), so $\delta_i$ can be reused directly; two more definitions continue the derivative:

$$
z_i=\sum_j\theta^{2}_{ij}g(z_j),\qquad z_j=\sum_k\theta^{1}_{jk}a_k ,
$$

giving

$$
\Delta\theta^{1}_{jk}=\eta\,\delta_i\,\theta^{2}_{ij}\,g'(z_j)\,a_k=\eta\,\delta_j\,a_k,
\qquad
\delta_j=g'(z_j)\sum_i\theta^{2}_{ij}\,\delta_i .
$$
<!-- Sources: L16 p.32-34; Apple Notes W8L15-16 Neural Network -->

The blue note at the bottom reminds us that when node $j$ feeds several nodes $i$ in the next layer (in the figure $j$ sends several thick lines to the right), we must sum over $i$ . **Hard part:** a hidden unit's error term = the derivative of its own activation × the weighted sum of the next layer's error terms along the connections. It has the same "error × $g'$ " form as the output-layer $\delta_i$ ; only the "error" changes from $(y-a_i)$ to $\sum_i\theta_{ij}\delta_i$ .

**Common mistake: sign conventions.** The slides define $\delta_i=(y-a_i)g'(z_i)$ , so the update **adds** $\eta\delta_ia_j$ ; the student's notes define $\delta$ as $\partial E/\partial z=-(y-a_i)g'(z_i)$ , so the update **subtracts**. Both are equivalent, but do not mix them.
<!-- Sources: L16 p.31; Apple Notes W8L15-16 Neural Network; Apple Notes ★3.2 Multi-layer Perceptron -->

<details markdown="1">
<summary>Extension (optional): the sigmoid derivative and a numerical example</summary>

The sigmoid derivative can be written $g'(z)=g(z)\big(1-g(z)\big)$ , which equals $0.25$ at $z=0$ .

Worked example (my own): an output unit receives $a_j=0.5$ and $z_i=0$ , so $a_i=0.5$ ; the truth is $y=1$ and $\eta=1$ .

$$
\delta_i=(1-0.5)\times0.25=0.125,\qquad \Delta\theta_{ij}=1\times0.125\times0.5=0.0625 .
$$

The weight increases, so next time $z_i$ is larger and the output moves closer to 1.

</details>

### The whole process and the algorithm

![L16 slide 41 - Backpropagation demo](assets/10-neural-networks/slide-l16-41.png)

This is the last frame of the slide animation (the earlier pages add the elements step by step). Green dots are the activations $a$ of the nodes, red squares are the error terms $\delta$ , thick black arrows show the direction of the forward pass (left to right), and the curved blue arrows show the error flowing back from right to left. In the order of the list below: receive the input → forward-propagate the activations → compare $\hat{y}$ with $y$ at the output layer to get the error terms → pass the error terms back from the output layer to the hidden layer → compute each weight's partial derivative from the error terms and update.
<!-- Sources: L16 p.18-24, p.35-41 -->

![L16 slide 42 - Backpropagation algorithm](assets/10-neural-networks/slide-l16-42.png)

The process above written as an algorithm: design the network, initialise the parameters, then repeat four steps for every training instance. The pink box is the single update formula $\Delta\theta^{l}_{ij}=-\eta\,\partial E/\partial\theta^{l}_{ij}=\eta\delta_ia_j$ , valid for every layer; only the way $\delta$ is computed differs between output and hidden layers. The red "at once" in step 4 stresses that all $\Delta\theta$ are computed with the weights from before the update, and then everything is updated together.
<!-- Sources: L16 p.42 -->

Backpropagation is a special case of gradient descent: by reusing each layer's $\delta$ it computes the gradients of all weights efficiently.
<!-- Sources: L16 p.43 -->

## Self-check

1. A perceptron starts with $\theta=(0,0,0)$ (including the bias), $\eta=1$ , and the first example is $\mathbf{x}=(2,-1)$ , $y=-1$ . Is there an update? What is $\theta$ afterwards?
2. Why can a single perceptron not learn XOR, while one hidden layer is enough?
3. If every activation function in an MLP is replaced by the identity $f(z)=z$ , can the network still learn a non-linear boundary?
4. How do the formulas for the output-layer error term $\delta_i$ and the hidden-layer error term $\delta_j$ differ, and why?
5. A hidden node feeds two output nodes in the next layer. How is its error term obtained from the error terms of the two output nodes?
