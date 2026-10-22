# COMP90049 Lectures 7–8 - Optimisation: From Derivatives to Gradient Descent

Sources: `lecture/07-linearregression.pdf` (p.12–14, p.22–39), `lecture/08-logisticregression.pdf` (p.2–18, p.38–40); Apple Notes: CS/25S2/IML — "W4P2 Optimisation", "★4 Optimisation". The linear and logistic regression models themselves are in [05 Linear & logistic regression](05-LR.md); this note only covers how their parameters are found.

This lecture asks: **once the model and the measure of "good" are fixed, how do we actually find the best parameters?**

Learning path: [Objective and loss](#topic-1) → [Exact optimisation: set the derivative to zero](#topic-2) → [Iterative optimisation: gradient descent](#topic-3) → [Learning rate, several parameters and local optima](#topic-4) → [Applying it to logistic regression](#topic-5).

Key points: the four-step recipe for extreme points, the gradient descent update. Hard parts: the maximum likelihood derivation for the binomial model, how the learning rate decides convergence. Common mistakes: the minus sign in front of the gradient, updating several parameters simultaneously, the wrong summation limit on slide L08 p.40.

<a id="topic-1"></a>
## 1. Objective functions and loss functions

### Training means making the mistakes as small as possible

![L07 slide 12 - Residuals of a regression line](assets/07-optimisation/slide-l07-12.png)

The horizontal axis is hours worked per week, the vertical axis is income; the blue dots are the real data and the orange line is the model's prediction. Look at the labelled point in the middle: the blue $y_i$ is the actual value, the red $\hat{y}_i$ is the value the line predicts at the same $x_i$, and their difference

$$
\varepsilon_i=y_i-\hat{y}_i
$$

is the **residual** of this instance, i.e. the "mistake" the model makes. Each blue dashed segment above or below a point is one residual: when the point is above the line $\varepsilon_i>0$ (the prediction is too low), when it is below $\varepsilon_i<0$ (the prediction is too high).

To find the "best" line we need a **loss function**: something that sums up all the instances' mistakes into one number. Training linear regression means finding the parameters $\beta_0,\beta_1,\dots,\beta_D$ that make this number smallest. Common losses are RSS, MSE, MAE and RMSE; this lecture uses only the **mean squared error (MSE)**, and the comparison of these as evaluation metrics is in [08 Evaluation](08-evaluation.en.md).
<!-- Sources: L07 p.12-13; Apple Notes W4P2 Optimisation -->
<!-- Sources: L07 p.12-14 -->

### Optimisation: find the parameters that optimise a target

![L07 slide 23 - Finding optimal points: profit vs price](assets/07-optimisation/slide-l07-23.png)

**Optimisation** means finding the parameters that make some target optimal. The slide gives two examples: how much study time gives the best grade? What shoe price gives the largest profit? The curve shows the second example: price on the horizontal axis, profit on the vertical axis. A price too low earns little, a price too high sells nothing, and the curve peaks at a price of about 15 (profit about 200). Optimisation looks for the horizontal coordinate of that peak, not the peak height itself.
<!-- Sources: L07 p.23; L08 p.3 -->

### Objective functions: maximise or minimise

![L07 slide 24 - Objective functions: argmax and argmin](assets/07-optimisation/slide-l07-24.png)

An **objective function** $f(\theta)$ takes a set of parameters $\theta$ and returns a score. We look for its **extreme points**; depending on the task, that is the maximum or the minimum:

$$
\hat{\theta}=\arg\max_{\theta} f(\theta)\quad\text{(e.g. profit, log likelihood)},\qquad
\hat{\theta}=\arg\min_{\theta} f(\theta)\quad\text{(e.g. error, MSE)}.
$$

$\arg\max$ reads "the $\theta$ that makes $f$ largest": it returns the parameter, not the maximum value. When minimising, the slides call $f$ a loss function.
<!-- Sources: L07 p.24 -->

<a id="topic-2"></a>
## 2. Exact optimisation: set the derivative to zero

### The slope is zero at an extreme point

![L07 slide 25 - Slope is zero at an extreme point](assets/07-optimisation/slide-l07-25.png)

The left plot is $f(\theta)=\theta^2$, and the three orange dashed lines are tangents at three points: at $\theta=-3$ the tangent slopes down (negative slope), at $\theta=3$ it slopes up (positive slope), and only at the lowest point $\theta=0$ is it horizontal. The slope of the tangent is the **first derivative** $\partial f/\partial\theta$: it measures how much the output $f(\theta)$ changes when the input $\theta$ changes slightly. So at an extreme point the function is "flat" and the derivative is 0.

The yellow box on the right says when this trick finds the global optimum: when minimising a **convex function** (shaped like ∪) or maximising a **concave function** (shaped like ∩).

**Common mistake:** Chinese textbooks are not consistent about the words for convex and concave; some call the ∪ shape "concave". Follow the English on the slides: convex means the upward-opening ∪ shape, where a zero derivative is a minimum.
<!-- Sources: L07 p.25 -->

### A one-dimensional example

![L07 slide 26 - Example: minimise (theta - 1) squared](assets/07-optimisation/slide-l07-26.png)

For $f(\theta)=(\theta-1)^2$ the derivative is $\partial f/\partial\theta=2(\theta-1)$; setting it to 0 gives $\theta=1$. The red curve on the right touches the horizontal axis at $\theta=1$, which is exactly its lowest point. Because the curve is convex, $\hat{\theta}=\arg\min_\theta f(\theta)=1$ is the global minimiser.
<!-- Sources: L07 p.26 -->

### The four-step recipe

![L07 slide 28 - Recipe for finding minima and maxima](assets/07-optimisation/slide-l07-28.png)

Abstracting the example gives the slides' four-step recipe:

1. Write down the objective $f(\theta)$ (e.g. the data log likelihood);
2. Take its first derivative with respect to $\theta$;
3. Set the derivative to zero;
4. Solve for $\theta$.

**Key point:** this method writes the answer down directly, which is called a **closed-form solution**. It assumes step 4 can actually be solved; logistic regression is exactly an example where it cannot (see [Section 5](#topic-5)).
<!-- Sources: L07 p.25-27 -->

### Example: maximum likelihood for the spam rate

#### Problem setup

![L07 slide 29 - Binomial spam model setup](assets/07-optimisation/slide-l07-29.png)

The slides return to the spam model from Week 2: there are $N$ emails, each either spam or not, and $x$ of them are spam. The parameter $\theta=P(\text{spam})$ is "the probability that an email is spam". In this setting the data follows a **binomial distribution**, so the data **likelihood**, viewed as a function of $\theta$, is

$$
\mathcal{L}(\theta)=p(x;N,\theta)=\frac{N!}{x!\,(N-x)!}\,\theta^{x}(1-\theta)^{N-x}=C\,\theta^{x}(1-\theta)^{N-x}.
$$

The factorial term depends only on $N$ and $x$, so it is a constant with respect to $\theta$, written $C$. **Maximum likelihood estimation (MLE)** means finding the $\theta$ that makes $\mathcal{L}(\theta)$ largest.
<!-- Sources: L07 p.29-31 -->

#### Take the log first

![L07 slide 30 - Log transformation aside](assets/07-optimisation/slide-l07-30.png)

The plot has $z$ on the horizontal axis and $\log z$ on the vertical axis: the curve keeps rising and never turns back, which is what **monotonic** means. Therefore:

- the $\theta$ that maximises $f(\theta)$ also maximises $\log f(\theta)$, so the optimum does not move;
- comparing the ranges of the two axes shows that log values are less extreme;
- products become sums, which avoids numerical underflow from multiplying many small probabilities and makes the derivative easier.
<!-- Sources: L07 p.30 -->

#### Differentiate and set to zero

![L07 slide 32 - Log likelihood and its derivative](assets/07-optimisation/slide-l07-32.png)

After the log, products and powers become sums and coefficients:

$$
\log\mathcal{L}(\theta)=\log C+x\log\theta+(N-x)\log(1-\theta),
\qquad
\frac{\partial\log\mathcal{L}}{\partial\theta}=\frac{x}{\theta}-\frac{N-x}{1-\theta}.
$$

$\log C$ contains no $\theta$, so it vanishes when differentiated; that is why the slide boxes the factorial term and labels it a constant. The minus sign in the second term comes from the inner $-1$ when differentiating $\log(1-\theta)$ with respect to $\theta$.

![L07 slide 33 - Solving the derivative for theta](assets/07-optimisation/slide-l07-33.png)

Read this page zig-zagging along the arrows "right → down-left → right": it is the algebra after setting the derivative to 0. First move the minus term to the other side, giving $\frac{x}{\theta}=\frac{N-x}{1-\theta}$; then rearrange to $\frac{1-\theta}{\theta}=\frac{N-x}{x}$; splitting both sides gives $\frac{1}{\theta}-1=\frac{N}{x}-1$ (the purple $-1$ is the same on both sides and cancels); hence $\frac{1}{\theta}=\frac{N}{x}$. Alternatively, cross-multiply directly: $x(1-\theta)=(N-x)\theta$, the $x\theta$ on both sides cancel, leaving $x=N\theta$. Both routes give

$$
\hat{\theta}=\frac{x}{N}.
$$
<!-- Sources: L07 p.32-33; Apple Notes W4P2 Optimisation -->

#### Plug in the data

![L07 slide 34 - MLE with 100 emails, 20 spam](assets/07-optimisation/slide-l07-34.png)

With 20 spam emails among 100, $\hat{\theta}=20/100=0.2$. The slide uses $\approx$ because it drops the constant $C$, which does not affect the optimum. The maximum likelihood estimate is the intuitive "relative frequency", which is exactly the counting estimate used in [Naive Bayes](04-NB.md).
<!-- Sources: L07 p.34 -->

### MSE for linear regression

![L07 slide 35 - MSE for the income data](assets/07-optimisation/slide-l07-35.png)

The table on the right lists 10 people's weekly hours and incomes (in thousands), the same data as the scatter plot on L07 p.12. The formula at the top writes MSE as a function of the parameters:

$$
\mathrm{MSE}(\boldsymbol\beta)=\frac{1}{N}\sum_{i=1}^{N}(y_i-\hat{y}_i)^2=\frac{1}{N}\sum_{i=1}^{N}(y_i-\boldsymbol\beta\cdot\mathbf{x}_i)^2,
\qquad
\hat{y}_i=\beta_0+\beta_1x_i .
$$

The code at the bottom left does not differentiate: it takes 100 values each of $w_0\in[-20,20]$ and $w_1\in[-1,2]$, forms a grid, and computes the MSE at every grid point; here $w_0,w_1$ are $\beta_0,\beta_1$. The slide's formula mixes $\frac{1}{n}$ with the upper limit $N$; both mean the number of instances.
<!-- Sources: L07 p.35 -->

![L07 slide 37 - MSE surface with the minimum highlighted](assets/07-optimisation/slide-l07-37.png)

This is the surface drawn from that grid: the two horizontal axes are $w_0$ and $w_1$, and the height is MSE. The surface looks like an elongated bowl; the red arrow points to the bottom, and the legend gives the grid minimum $(w_0,w_1)=(-13.13,\,1.48)$, i.e. a prediction of roughly "income ≈ −13.13 + 1.48 × hours".

**Worked example (my own):** computing the closed-form solution on the same data gives $\beta_0\approx-12.79$ and $\beta_1\approx1.477$, with MSE about 119.8. The grid minimum is very close to it but not identical, because the grid can only land on discrete grid points. Point-by-point search can only approximate, whereas setting the derivative to zero gives the exact bottom of the bowl.
<!-- Sources: L07 p.36-37 -->

<details markdown="1">
<summary>Extension (optional): the matrix derivation (the slides say the specific formulas are not examinable)</summary>

![L07 slide 39 - Matrix derivation of the normal equation](assets/07-optimisation/slide-l07-39.png)

Stacking all instances into a matrix $X$ (with a column of ones for the intercept), MSE can be written as

$$
\mathrm{MSE}(\boldsymbol\beta)=\frac{1}{n}(\mathbf{y}-X\boldsymbol\beta)^\top(\mathbf{y}-X\boldsymbol\beta),
\qquad
\frac{\partial\,\mathrm{MSE}}{\partial\boldsymbol\beta}=-\frac{2}{n}X^\top\mathbf{y}+\frac{2}{n}X^\top X\boldsymbol\beta=0
\;\Rightarrow\;
\boldsymbol\beta=(X^\top X)^{-1}X^\top\mathbf{y}.
$$

The page is laid out as "differentiate → set to zero → solve for $\boldsymbol\beta$", which is the matrix version of the four-step recipe. The yellow box at the bottom right warns that when features are highly correlated, $X^\top X$ is close to singular and inverting it is unstable; this is the multicollinearity problem mentioned in [05](05-LR.md).

</details>
<!-- Sources: L07 p.38-39; Apple Notes W4P2 Optimisation -->

<a id="topic-3"></a>
## 3. Iterative optimisation: gradient descent

### Why iterate

![L08 slide 5 - Closed-form vs iterative optimisation](assets/07-optimisation/slide-l08-05.png)

The top half recaps that the binomial model gives a single closed-form solution with the four-step recipe. The bottom half says reality is not that simple:

- many problems have **no closed-form solution**: the equation "derivative = 0" cannot be solved;
- with thousands or even millions of parameters (e.g. in natural language processing), handling the whole function at once is also very hard;
- then we can only start from a guess and **improve the estimate** $\hat{\theta}$ **step by step** until it is good enough. **Gradient descent** is the most common iterative method.
<!-- Sources: L08 p.5; Apple Notes W4P2 Optimisation -->

### Walk down along the steepest direction

![L08 slide 7 - Descending a 2-D loss surface](assets/07-optimisation/slide-l08-07.png)

The coloured surface is a loss function $J(\theta_0,\theta_1)$ with two parameters $\theta_0,\theta_1$: red is high, blue is low. Imagine standing blindfolded on a mountain, only able to feel which way is steepest under your feet, so each step goes a little way down the steepest slope. The sequence of positions $\theta^{(0)},\theta^{(1)},\theta^{(2)},\dots$ is what gradient descent produces; each step depends only on the current position.
<!-- Sources: L08 p.6-8 -->

### Where the update rule comes from

![L08 slide 11 - Gradient descent details](assets/07-optimisation/slide-l08-11.png)

We want a rule $\theta\leftarrow\theta+\Delta\theta$ that tells the parameter how to move. Look at the small plot of $f(\theta)=\theta^2$ on the right and the three rules on the left:

- left of the minimum the derivative is $<0$: increasing $\theta$ (moving right) lowers $f$;
- right of the minimum the derivative is $>0$: decreasing $\theta$ (moving left) lowers $f$;
- the derivative is $=0$: we are already at the minimum and stop moving.

In both cases we move **against the derivative**, which gives

$$
\theta^{(t+1)}=\theta^{(t)}-\eta\,\frac{\partial f}{\partial\theta^{(t)}} .
$$

- $\theta^{(t)}$: the parameter at step $t$;
- $\partial f/\partial\theta^{(t)}$: the derivative (gradient) at the current position; it points in the direction of **greatest increase**, so we subtract it;
- $\eta$: the **learning rate**, which sets how far each step goes.

**Common mistake:** minimising uses the minus sign (gradient descent); writing a plus sign instead climbs uphill and looks for a maximum (gradient ascent).
<!-- Sources: L08 p.6-11 -->
<!-- Sources: L08 p.10-11 -->

### The single-parameter algorithm

![L08 slide 13 - Gradient descent algorithm for a single parameter](assets/07-optimisation/slide-l08-13.png)

The five lines in the box turn the rule into an algorithm: define the objective → give the parameter an initial value $\theta^{(0)}$ → loop $T$ times, each time first computing the derivative at the current position, then subtracting "learning rate × derivative". Below the box are two remarks: $\eta$ is also called the step size and must be set by hand; to decide when to stop, fix the number of iterations or define another criterion (e.g. the parameter barely changes any more).
<!-- Sources: L08 p.13 -->

<a id="topic-4"></a>
## 4. Learning rate, several parameters and local optima

### Learning rate too small or too large

![L08 slide 15 - Four learning rates on the same function](assets/07-optimisation/slide-l08-15.png)

The four panels show the same bowl-shaped function, titled with learning rates 0.01, 0.1, 0.95 and 1.01; the red dot is the same starting point $(-6.63,\,43.953)$ in each. In class this was an animation and the PDF keeps only step 0, so the four panels look identical and the differences have to be worked out by calculation. The conclusion on L08 p.14 is: with $\eta$ too small the algorithm is slow; with $\eta$ too large it may overshoot the minimum.

**Worked example (my own):** the starting point satisfies $6.63^2\approx43.95$, so the function is $f(\theta)=\theta^2$ with derivative $2\theta$. Substituting into the update:

$$
\theta^{(t+1)}=\theta^{(t)}-\eta\cdot2\theta^{(t)}=(1-2\eta)\,\theta^{(t)} .
$$

Every step multiplies $\theta$ by the same factor $1-2\eta$:

| $\eta$ | Factor $1-2\eta$ | Step 1 | Step 10 | Behaviour |
| --- | --- | --- | --- | --- |
| 0.01 | 0.98 | −6.50 | −5.42 | Moves only a little each step, very slow |
| 0.1 | 0.8 | −5.30 | −0.71 | Approaches 0 steadily and quickly |
| 0.95 | −0.9 | 5.97 | −2.31 | Jumps to the other side each step, but closer each time; still converges |
| 1.01 | −1.02 | 6.76 | −8.08 | Jumps to the other side each step, further each time; diverges |

So for this function gradient descent converges only when $|1-2\eta|<1$. A larger learning rate is not always faster: past a certain bound the loss actually keeps growing.
<!-- Sources: L08 p.14-15; Apple Notes W4P2 Optimisation -->

### Several parameters: take partial derivatives, update together

![L08 slide 16 - Gradient descent algorithm for multiple parameters](assets/07-optimisation/slide-l08-16.png)

Models usually have several parameters. For each one, take the **partial derivative**: vary only that parameter, hold the others fixed, and see how $f$ changes (L08 p.12). Arranged as a vector, the partial derivatives form the gradient $\nabla f$. Compared with the single-parameter version, this algorithm adds lines 4–7: start an empty `gradients` list, compute each parameter's partial derivative and append it; only line 8 then **updates all parameters at once**.

```text
define objective f(θ)
initialise θ(0)
for t = 0, 1, ..., T:
    gradients = [∂f/∂θ_j at θ(t) for every parameter j]
    θ(t+1) = θ(t) − η · gradients        # update all parameters at once
stop after a fixed number of iterations, or when another criterion is met
```

**Common mistake:** compute all the partial derivatives at the same position $\theta^{(t)}$ first, then update together; do not use an already-updated $\theta_1$ when computing the partial derivative for $\theta_2$. Also, the letter $f$ on this page does double duty: it is both the objective $f(\theta)$ and, on line 5, the parameter index $f\in\{1,\dots,F\}$, where $F$ is the number of parameters (features). Keep the two apart when reading.
<!-- Sources: L08 p.12 -->
<!-- Sources: L08 p.13, p.16 -->

### Convexity and local optima

![L08 slide 17 - Global and local minima and maxima](assets/07-optimisation/slide-l08-17.png)

The red curve has several "peaks" and "valleys". The one marked at the bottom left is the **global minimum**: the lowest point on the whole curve; the valley at the bottom right is only a **local minimum**: lower only than the points near it. Maxima work the same way. The slide also defines a convex function: for any two points on the graph, the line segment joining them lies above the graph. This curve is clearly not convex (for example, the segment joining the two valleys passes through the peak between them).
<!-- Sources: L08 p.17 -->

### What gradient descent guarantees

![L08 slide 18 - Gradient descent guarantees](assets/07-optimisation/slide-l08-18.png)

With an appropriate learning rate:

1. for a differentiable convex function, gradient descent finds the **global minimum**;
2. for a differentiable non-convex function, it only guarantees **a local minimum**.

Look at the yellow curve below: the deepest valley is on the right, but the tangent (green) at the blue dot slopes up to the right, so the derivative is positive and gradient descent moves left, into the shallower middle valley, and never leaves it, because the derivative there is already 0.
<!-- Sources: L08 p.18 -->

**Note:** running from several starting points and keeping the best result, or analysing the data first and choosing starting points in a sensible range, reduces the risk of getting stuck in a poor local minimum.
<!-- Sources: Apple Notes W4P2 Optimisation; Apple Notes ★4 Optimisation -->

<a id="topic-5"></a>
## 5. Applying it to logistic regression

### The objective: minimise the negative log likelihood

![L08 slide 39 - Minimising the negative likelihood](assets/07-optimisation/slide-l08-39.png)

Logistic regression uses the sigmoid $\sigma(\theta\cdot\mathbf{x})$ for $P(y=1\mid\mathbf{x})$ (the model and its probabilistic meaning are in [05](05-LR.md)). Given $N$ independent training instances, each instance's likelihood is $\sigma^{y_i}(1-\sigma)^{1-y_i}$: it is $\sigma$ when $y_i=1$ and $1-\sigma$ when $y_i=0$. Multiplying over all instances gives the likelihood of the whole data set.

The notation on this page is a little muddled: the left side says $\mathcal{L}(\beta)$ although the parameter is called $\theta$; a minus sign is put in front of the product, yet "Take a log" ends with the log likelihood without the minus. Read it all as one statement: training **minimises the negative log likelihood**,

$$
-\log\mathcal{L}(\theta)=-\sum_{i=1}^{N}\Big[y_i\log\sigma(\theta\cdot\mathbf{x}_i)+(1-y_i)\log\big(1-\sigma(\theta\cdot\mathbf{x}_i)\big)\Big].
$$

The reason for taking the log first is the same as in the binomial example: products become sums and the optimum does not move.
<!-- Sources: L08 p.38-39 -->

### Derivative and gradient descent update

![L08 slide 40 - Derivative of the loss and the gradient descent update](assets/07-optimisation/slide-l08-40.png)

The first line is the partial derivative of the loss with respect to the $j$-th parameter:

$$
\frac{\partial\,(-\log\mathcal{L})}{\partial\theta_j}=\sum_{i=1}^{N}\big(\sigma(\theta\cdot\mathbf{x}_i)-y_i\big)\,x_{ij}.
$$

The three bullets in the middle state the difficulty: setting it to 0 gives $\sum_i(\sigma(\theta\cdot\mathbf{x}_i)-y_i)x_{ij}=0$, where $\theta$ sits inside every instance's sigmoid and is summed over all instances, so $\theta$ cannot be isolated on one side the way $\hat{\theta}=x/N$ was. There is no closed-form solution, so we use gradient descent:

$$
\theta_j^{(t+1)}=\theta_j^{(t)}-\eta\sum_{i=1}^{N}(\hat{y}_i-y_i)\,x_{ij},
\qquad \hat{y}_i=\sigma(\theta^{(t)}\cdot\mathbf{x}_i).
$$
<!-- Sources: L08 p.40 -->

**Extension (correction to the slide):** the last line of this page writes the upper limit of the sum as $F$ (the number of features), but the index $i$ here numbers the instances and the sum runs over the $N$ training instances, so it should be $\sum_{i=1}^{N}$, consistent with the partial derivative in the first line of the same page; the feature index is $j$, and each $\theta_j$ is updated once. The $F$ is probably carried over from the parameter index on L08 p.16. Also, the first line is labelled $\partial\log\mathcal{L}/\partial\theta_j$, but the sign of $\sigma-y_i$ on the right belongs to the derivative of the **negative** log likelihood (the loss); the derivative of the log likelihood itself is $\sum_i(y_i-\sigma)x_{ij}$. Only the derivative of the loss, combined with the minus sign in the update, actually moves downhill.
<!-- Sources: L08 p.40 -->

Intuitively, each instance pushes the parameters along its own feature directions, scaled by its error "predicted probability − true label": when the prediction is too high ($\hat{y}_i>y_i$), $\theta_j$ is pushed in the direction that lowers $\theta\cdot\mathbf{x}_i$; a perfectly predicted instance exerts no push.

Gradient descent is also what the perceptron is compared with later, and the basis of backpropagation in neural networks; see [10 Neural networks](10-neural-networks.en.md).

## Self-check

1. Use the four-step recipe to find the minimiser of $f(\theta)=\theta^2-6\theta+5$, and explain why it is the global minimiser rather than just a point where the derivative is zero.
2. A coin is tossed 50 times and shows heads 35 times. What is the maximum likelihood estimate of the probability of heads? What does taking the log in the derivation change, and what does it leave unchanged?
3. Running gradient descent on $f(\theta)=\theta^2$ with learning rate 0.6 from $\theta^{(0)}=5$, where are the first two steps? Does it converge?
4. The binomial parameter can be solved directly; why do logistic regression's parameters need gradient descent?
5. For logistic regression with $N$ training instances and $F$ features, how many partial derivatives does one gradient descent update compute, and what does each one sum over?
