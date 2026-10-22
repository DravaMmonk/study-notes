# COMP90049 Lectures 1–2 - Basic Concepts of Machine Learning

Sources: `lecture/01-introduction.pdf` (p.13–45), `lecture/02-mlconcepts.pdf`; Apple Notes: CS/25S2/IML — "★0 Introduction", "★2 Feature Engineering", "★3 Models". The probability review is in [01 Probability](01-probability.md).

This lecture asks: **what exactly does machine learning "learn", and what shape must the data be in before a model can use it?**

Learning path: [What machine learning is](#topic-1) → [The maths notation you need](#topic-2) → [Instances, concepts and ways of learning](#topic-3) → [Attribute types and conversion](#topic-4) → [Problems with real data](#topic-5) → [Ways to classify models](#topic-6).

Key points: supervised vs unsupervised, classification vs regression; the three attribute types; inner product, norm and cosine. Hard parts: choosing between equal-width and equal-frequency discretisation; telling missingness mechanisms apart. Common mistakes: treating category codes as numbers with a meaningful size; forgetting that the last bin must include the maximum.

<a id="topic-1"></a>
## 1. What machine learning is

### Learning from examples

![L01 slide 14 - Machine learning inside AI and data science](assets/00-ml-concepts/slide-l01-14.png)

Look at the three nested circles first: the outer one is data science (collecting, preparing and analysing data), the middle one is artificial intelligence (machines making "intelligent" decisions), and the small yellow circle at the centre is machine learning. It is a subset of AI and one of the tools of data science.

The sentence under the figure is the heart of the definition: machine learning lets a program **learn to make decisions from data** instead of having a person hard-code every rule. The previous slide's example is a child learning to label things: after seeing Baby→Cute and Tiger→Cool, she can still give an answer for Koala. The goal is to label **new entities not seen before** correctly.
<!-- Sources: L01 p.13-15 -->

![L01 slide 15 - Definitions of machine learning](assets/00-ml-concepts/slide-l01-15.png)

This slide breaks "learning" into four questions:

- **Learning what?** A concept, e.g. assigning labels to inputs, sorting email into {spam, no-spam}, finding patterns in data;
- **Learning from what?** Data; ask where it comes from, whether it is reliable, whether it is representative;
- **How do we learn?** First define a **model** that says how inputs become outputs, then derive a **learning algorithm** that finds the best model parameters;
- **How do we know learning is happening?** Performance on the task improves with more data, and this improvement must be **evaluated objectively**.

The next three slides (p.16–18) summarise this as three ingredients:

| Ingredient | Questions it raises |
| --- | --- |
| Data | Discrete or continuous? Big or small? Labelled or not? Public or sensitive? |
| Model | A function from inputs to outputs; probabilistic or geometric; its parameters are unknown |
| Learning | Improving at a task after seeing data, i.e. finding the best model parameters for that task; supervised or unsupervised |
<!-- Sources: L01 p.16-18; Apple Notes ★0 Introduction -->

**Note: parameters vs hyper-parameters.** Model **parameters** are the unknowns that learning finds; **hyper-parameters** are fixed before training, such as $k$ in kNN or the maximum depth of a decision tree. How to choose hyper-parameters is covered in [08 Evaluation](08-evaluation.en.md).
<!-- Sources: Apple Notes ★0 Introduction; L11 p.23-25 -->

### Three scenarios, three kinds of task

![L01 slide 23 - Scenario 2: supervised classification](assets/00-ml-concepts/slide-l01-23.png)

The lecture uses three scenarios to practise "translating a problem into a task type". The figure shows the second: an archaeologist wants non-experts to determine a bone's species consistently. The solution is to measure easy properties (size, shape, number of "lumps") and compare a new bone with a database of **already classified** bones. The key phrase is "already classified": there are labels, so this is supervised classification. The three scenarios side by side:

| Scenario | Approach | Task type |
| --- | --- | --- |
| A mountain of fossil bones; quickly spot any "find of the century" | Find bones whose size or shape differs clearly from the rest | Clustering / outlier detection |
| Let non-experts determine a bone's species consistently | Measure easy properties and compare with a pre-classified bone database | Supervised classification |
| Predict how well a new drink recipe will be received | Run taste tests over varying ingredient ratios and estimate the "ingredients → satisfaction" function | Regression |
<!-- Sources: L01 p.20-25 -->

A useful habit: first ask "are there labels?", then ask "is the output a class or a number?". Scenario 1 has no labels and only wants the "unusual" samples; scenario 3 outputs satisfaction, a continuous number.

<a id="topic-2"></a>
## 2. The maths notation you need

### What level of maths

![L01 slide 29 - What level of maths](assets/00-ml-concepts/slide-l01-29.png)

This slide shows the strength of derivation the subject expects: starting from $\ln\dfrac{P(y=\text{true}\mid x)}{1-P(y=\text{true}\mid x)}=w\cdot x$, exponentiate both sides, collect the terms containing $P$ on one side, and solve:

$$
P(y=\text{true}\mid x)=\frac{1}{1+e^{-w\cdot x}}.
$$

Line by line: the second line removes the logarithm; the third and fourth multiply out $P$ and move terms across; the fifth factors out $P$ and divides numerator and denominator by $e^{w\cdot x}$. This is exactly the sigmoid of logistic regression; the model itself is in [05 Linear and logistic regression](05-LR.md), and probability notation such as $P(y\mid x)$ is in [01 Probability](01-probability.md). For now you only need to follow the algebra step by step.

Linear regression, logistic regression, SVMs and the perceptron all use linear-algebra notation. The lecture stresses that **you only need to be familiar with the notation**; this is not a linear algebra subject.
<!-- Sources: L01 p.31-45 -->

### Matrices: shape and multiplication

![L01 slide 32 - Matrix notation](assets/00-ml-concepts/slide-l01-32.png)

A matrix is a 2-D array of numbers. In $A_{i,j}$ the first index is the row (the green ellipse circles a row) and the second is the column (the orange ellipse circles a column). $A\in\mathbb{R}^{m\times n}$ reads "$A$ is a real matrix with $m$ rows and $n$ columns", stating both type and shape.

![L01 slide 34 - Matrix multiplication](assets/00-ml-concepts/slide-l01-34.png)

Matrix multiplication requires **the number of columns of A to equal the number of rows of B**:

$$
(AB)_{i,j}=\sum_k A_{i,k}B_{k,j}.
$$

Follow the blue circles: the 13 in row 1, column 2 of the result is row 1 of $A$, $(3,1,-2,4)$, multiplied entry by entry with column 2 of $B$, $(2,5,3,2)$, and summed: $6+5-6+8=13$. $A$ is $2\times4$, $B$ is $4\times3$, so the result is $2\times3$.

The same set of slides also covers addition and subtraction (entry by entry, same shape), multiplication by a scalar (multiply every entry by $c$), and the **transpose**: $(A^\top)_{i,j}=A_{j,i}$, i.e. rows become columns and columns become rows; the transpose of a product reverses the order, $(AB)^\top=B^\top A^\top$. If $A=A^\top$, $A$ is called symmetric.

### Vectors: inner product, norm and angle

A vector is a matrix with a single column, written $a\in\mathbb{R}^m$, e.g. $a=(5,7,1,4)^\top$.

![L01 slide 41 - Inner product](assets/00-ml-concepts/slide-l01-41.png)

The **inner product** requires two vectors of the same length and, in matrix-multiplication notation, is:

$$
a\cdot b=a^\top b=\sum_{k=1}^{m}a_k b_k.
$$

The example on the slide: $a=(3,2,4)^\top$, $b=(1,-7,3)^\top$; the blue circles mark the first pair of entries multiplied, and $a\cdot b=3-14+12=1$.

![L01 slide 42 - Euclidean norm](assets/00-ml-concepts/slide-l01-42.png)

The **Euclidean norm** is the length of a vector:

$$
\lVert a\rVert=\sqrt{a\cdot a}=\sqrt{a_1^2+a_2^2+\cdots+a_m^2}.
$$

The blue arrow $a=(4,3)$ starts at the origin and has length $\sqrt{3^2+4^2}=5$, which is just Pythagoras. The distance between two vectors is $\lVert a-b\rVert$; the Euclidean distance in [KNN](02-KNN.md) is exactly this. As long as $a\neq0$, $a/\lVert a\rVert$ has length 1, e.g. $(4/5,3/5)$.

**Common mistake:** the slide calls a vector of length 1 "unitary"; the usual term is **unit vector**. In linear algebra "unitary" normally refers to unitary matrices, so do not mix the two.

![L01 slide 43 - Cosine of the angle](assets/00-ml-concepts/slide-l01-43.png)

The cosine of the angle between two vectors comes from the inner product and the norms:

$$
\cos\theta=\frac{a\cdot b}{\lVert a\rVert\,\lVert b\rVert}
=\left(\frac{a}{\lVert a\rVert}\right)\cdot\left(\frac{b}{\lVert b\rVert}\right).
$$

The right-hand form shows that we first shrink both vectors to unit length and then take the inner product, so the cosine depends only on **direction**, not length. With the slide's $a=(5,3)$ and $b=(1,5)$:

$$
\cos\theta=\frac{5\cdot1+3\cdot5}{\sqrt{34}\,\sqrt{26}}=\frac{20}{\sqrt{884}}\approx0.673,
\qquad \theta\approx47.7^\circ.
$$

This is the angle marked by the red arc. The cosine distance $1-\cos\theta$ in [KNN](02-KNN.md) comes from here.

### Identity matrix and inverse

![L01 slide 44 - Identity and inverse](assets/00-ml-concepts/slide-l01-44.png)

The **identity matrix** $I$ has 1s on the diagonal and 0s elsewhere; multiplying any vector by it leaves the vector unchanged: $Ix=x$. The **inverse** satisfies $A^{-1}A=I$, like "undoing" what $A$ does.

The bottom of the slide lists three cases where a matrix cannot be inverted: more rows than columns, more columns than rows (a non-square matrix has no inverse in the usual sense), and redundant rows or columns (linear dependence). The closed-form solution of linear regression inverts $X^\top X$, and highly correlated features run into the third case. How to compute an inverse numerically is explicitly left out of the lecture.

<a id="topic-3"></a>
## 3. Instances, concepts and ways of learning

### Three terms

![L02 slide 08 - weather.nominal instances, attributes and concept](assets/00-ml-concepts/slide-l02-08.png)

The classic weather.nominal dataset puts the three terms in one table:

- **Instance**: one row of the table, here one day; in general it could be a photo of a cat or a purchase record;
- **Attribute / feature**: the columns in red boxes, such as Outlook and Temperature, each describing one aspect of an instance;
- **Concept**: the Play column in the blue box, i.e. the label we want to learn to predict.

Lining up all the attributes of one instance gives a **feature vector**; an apple, for example, can be written as (red, round, medium).
<!-- Sources: L02 p.4-8, p.22 -->

The previous slide shades the first two rows (two instances) of the same table in red, to stress that "row = instance".
<!-- Sources: L02 p.7-8 -->

### Four kinds of "concept"

| Concept | Output | Example |
| --- | --- | --- |
| Classification | A discrete class | Will we play today? |
| Regression | A continuous number | Tomorrow's temperature |
| Clustering | Groups of similar instances | Similar groups of students |
| Association learning | Associations between attribute values | People who buy milk and bread are likely to buy butter |
<!-- Sources: L02 p.9 -->

### Unsupervised learning

![L02 slide 10 - Unsupervised learning](assets/00-ml-concepts/slide-l02-10.png)

On the left is a pile of unlabelled fruit; the model outputs three circles: apples together, watermelon together, bananas together. The model does not know they are called "apple" or "banana"; it only puts similar items together. This is **unsupervised learning**: the data has no labels, and the aim is to discover hidden patterns, groups or relationships. Examples include customer segmentation, anomaly detection, dimensionality reduction and market-basket analysis.

**Hard part:** there is no "right answer" to compare with, so success is often judged subjectively and evaluation is a real problem. Deleting the Play column of the weather table and clustering what remains is exactly this situation. See [11 Unsupervised learning](11-unsupervised-learning.en.md).
<!-- Sources: L02 p.10-15 -->

### Supervised learning

![L02 slide 14 - Supervised learning](assets/00-ml-concepts/slide-l02-14.png)

**Supervised learning** trains a model on labelled training data (left: fruit already marked Apple / Banana) and then predicts for new testing data (the apple at the bottom). The two arrows at the top split the goal in two: predicting **a label** is classification, predicting **a numeric value** is regression. Performance is measured on **held-out evaluation data** whose labels are known but which was not used for training.

![L02 slide 18 - Classification predictions on weather.nominal](assets/00-ml-concepts/slide-l02-18.png)

Read the table: the red part is training data, the blue part is evaluation data. The rightmost column, Classified, holds the model's predictions; compare it with True Label on its left. Of the 4 rows, row 1 (true yes, predicted no) and row 4 (true no, predicted yes) are in red and wrong, so the accuracy is $2/4$. A classification prediction is either "right" or "wrong".

![L02 slide 21 - Regression predictions on weather](assets/00-ml-concepts/slide-l02-21.png)

Now switch to regression: the target is the number Actual Temp. In the prediction column, 71.2 (true 72) and 79.6 (true 81) are close and printed in black; 68.8 (true 75) and 78.5 (true 71) are further off and printed in red. A regression prediction is never "exactly right", only "how far from the truth".

**Common mistake: what really separates classification from regression.** In classification, all possible labels can be listed and a prediction is either right or wrong; in regression there are "infinitely" many possible values, and a prediction is good when it is acceptably close to the true value. That is why their evaluation metrics are completely different; see [08 Evaluation](08-evaluation.en.md).
<!-- Sources: L02 p.19; L11 p.54 -->

<a id="topic-4"></a>
## 4. Attribute types and conversion

### Three attribute types

![L02 slide 25 - Ordinal quantities](assets/00-ml-concepts/slide-l02-25.png)

Attributes are first split into discrete and continuous, and discrete ones into nominal and ordinal. This slide is about the middle type, **ordinal**: {hot, mild, cool} has an explicit order, so a rule such as "temperature < hot → play = yes" can be written; but "how much" hot differs from mild is undefined, so the red line stresses that **addition and subtraction make no sense**. The last point warns that whether outlook {sunny, overcast, rainy} is nominal or ordinal is not always clear.

| Type | Characteristics | Allowed operations | Example |
| --- | --- | --- | --- |
| Nominal / categorical | Values are just names, with no order or distance | Equality tests only | {red, orange, yellow}; Boolean {yes, no} |
| Ordinal | Ordered, but the distance between neighbouring values is undefined | Comparison, no addition or subtraction | {hot, mild, cool} |
| Numeric | Real values with mathematical meaning | All mathematical operations | Temperature, height, customers per day |
<!-- Sources: L02 p.23-26 -->

The line between nominal and ordinal is not always clear, e.g. outlook {sunny, overcast, rainy}.
<!-- Sources: L02 p.25 -->

Most algorithms assume a certain attribute type: Naive Bayes works with nominal or numeric attributes; linear/logistic regression, the perceptron and neural networks need numeric attributes. When the types do not match there are three options: select only attributes of the right type; change the model's assumptions; or **convert the attributes to the type the model needs** (the option highlighted in red in the lecture).
<!-- Sources: L02 p.27 -->

### Nominal to numeric: encoding

![L02 slide 28 - Map category names to numbers](assets/00-ml-concepts/slide-l02-28.png)

**Option 1: map categories to numbers.** red→0, blue→1, green→2, orange→3, pink→4. Simple and space-efficient, but look at the two brackets: the red one asks "Green > Blue?" — the codes invent an order; the blue one asks "Pink − Red?" — differences between codes are meaningless too.

![L02 slide 29 - One-hot encoding](assets/00-ml-concepts/slide-l02-29.png)

**Option 2: one-hot encoding.** Each category gets its own column (Color-Red to Color-Pink, five columns), set to 1 only in its own column and 0 elsewhere, so Red becomes [1,0,0,0,0]. The Euclidean distance between any two colours is $\sqrt2$, so there are no false "near" and "far" colours. The cost is listed at the bottom: more dimensions and sparser data (many zeros).
<!-- Sources: L02 p.28-30 -->

**Common mistake:** after numbering categories directly, a Euclidean distance or a linear model will treat the size of the code as real information.

### Numeric to nominal: discretisation

**Discretisation** groups continuous values into a pre-defined set of categories, e.g. house prices into {high, medium, low}. It takes two steps: first decide the number of categories, then the category boundaries.

![L02 slide 33 - Equal width binning example](assets/00-ml-concepts/slide-l02-33.png)

**Option 1: equal width.** Find the minimum and maximum and cut into $n$ intervals of width $\dfrac{\max-\min}{n}$. In the figure, education years have min = 6 and max = 18:

- with $n=3$ the width is 4, giving [6,10), [10,14), [14,18];
- with $n=2$ the width is 6, giving [6,12), [12,18].

The table on the right replaces each value with its interval, e.g. 9 → [6,10), 13 → [10,14).

**Common mistake:** the earlier intervals are closed on the left and open on the right, but the last interval must be closed on the right so that it contains the maximum itself. The right-hand table writes 18 as "[14,18)", which literally excludes 18; read it as [14,18].

Counting the three intervals, the 10 values split 5, 4, 1: bins can hold very unequal numbers of samples, the first drawback of equal width.

![L02 slide 35 - Equal width is sensitive to outliers](assets/00-ml-concepts/slide-l02-35.png)

The second drawback is **sensitivity to outliers**. Here 18 is replaced by the outlier 36 (red arrow); the maximum jumps, the width becomes $(36-6)/3=10$, and the intervals become [6,16), [16,26), [26,36]: almost everyone is squeezed into the first bin and the middle bin is empty.
<!-- Sources: L02 p.32-35 -->

<details markdown="1">
<summary>Extension (optional): the counts on this slide are wrong</summary>

The table holds 10 values: 36 and nine others (9, 13, 9, 9, 10, 9, 6, 13, 10). Those nine fall into [6,16), so the counts for the three intervals should be 9, 0, 1; the slide prints 10, 0, 1, which adds up to 11. The conclusion (an outlier squeezes the data into one bin) is unchanged.

</details>

![L02 slide 39 - Equal frequency binning by ranking](assets/00-ml-concepts/slide-l02-39.png)

**Option 2: equal frequency.** Sort first, then give every bin as nearly as possible the same number of items. The figure splits 10 ages into 3 bins: the middle column is sorted, the small numbers on its left are the original IDs; cutting by **rank position** gives Bin1 (20, 22, 25), Bin2 (25, 25, 31) and Bin3 (31, 39, 61, 70), and the bin labels are then written back in the original order on the right using the IDs.

Note two details: 10 values cannot be split into three exactly equal bins, so the last bin has one extra; and the same value 25 goes to Bin1 for ID 3 but to Bin2 for IDs 7 and 9 (31 is split across two bins as well). The question marks on the previous slide flag exactly this "which side does an equal value go to" problem. This is the drawback the lecture calls **inconsistency**.

Pros: robust to outliers (replacing 36 with 999 only moves the edge of the last bin), preserves the data distribution, avoids empty or sparse intervals; cons: less interpretable boundaries, possible inconsistency as above, and information loss.
<!-- Sources: L02 p.36-40; Apple Notes ★2 Feature Engineering -->

**Option 3: clustering.** Use unsupervised learning (e.g. K-means) to group the values into $n$ clusters, each cluster being one category.
<!-- Sources: L02 p.41 -->

### Scaling numeric features

![L02 slide 42 - Features with different scales](assets/00-ml-concepts/slide-l02-42.png)

Both scatter plots show the same four products, with price (dollars) on the vertical axis and weight on the horizontal axis: kilograms on the left, grams on the right. In kilograms the weight differences are fractions of a unit, the four points almost sit on a vertical line, and distance is dominated by price; in grams the weight differences grow a thousandfold, the points spread out horizontally, and distance is dominated by weight. Only the unit changed, yet "who is close to whom" changed. Distance-based methods therefore need features rescaled to comparable ranges first:

**Standardisation (z-score)** gives a feature mean 0 and standard deviation 1:

$$
x'=\frac{x-\mu}{\sigma}\qquad\text{(standardisation / z-score)}
$$

where $\mu$ is the feature's mean and $\sigma$ its standard deviation.

**Min-max scaling** uses the observed minimum and maximum to squeeze the feature into $[0,1]$:

$$
x'=\frac{x-\min}{\max-\min}\qquad\text{(min-max scaling, range exactly }[0,1])
$$
<!-- Sources: L02 p.42-44 -->

In scikit-learn these are `StandardScaler` and `MinMaxScaler`. Min-max depends directly on the minimum and maximum, so, like equal-width discretisation, a single outlier can distort it.

<a id="topic-5"></a>
## 5. Problems with real data

### Integration

![L02 slide 46 - Preparing the input](assets/00-ml-concepts/slide-l02-46.png)

Real data often comes from several departments (sales, customer billing, …) with different record-keeping styles, conventions, time periods and primary keys. Look at the mess in each column: Name has "Henry" in quotes, "Oscar@!!" with junk characters, and "-" for missing; Age has the decimal 20.2, the words "Forty-one", the string "5" and the impossible 669; Date of Birth has "20 years ago", US-style 11/20/66 and UK-style 20/5/79. The red conclusion: data must be **assembled, integrated and cleaned** before it reaches a model.
<!-- Sources: L02 p.46 -->

### Missing values

Values go missing because of malfunctioning equipment, changes in experimental design, merging different datasets, and so on. Most algorithms assume missingness is "random"; but a missing value can itself be meaningful, e.g. a test not done in a medical examination.
<!-- Sources: L02 p.47-49 -->

![L02 slide 48 - Missing at random example](assets/00-ml-concepts/slide-l02-48.png)

![L02 slide 49 - Missing not at random example](assets/00-ml-concepts/slide-l02-49.png)

The two slides use the same "age + IQ" data to contrast two kinds of missingness: the left table is complete, the right one has gaps.

- **MAR slide (slide 48)**: the deleted IQ scores are high and low alike (133, 105, 98, 104, 97, …), unrelated to age or to IQ itself, so **no rule can predict where values are missing**.
- **MNAR slide (slide 49)**: the deleted scores are exactly 91, 98, 93 and 97, all IQs below 100. Missingness depends on **the variable's own value**, so **a rule can be written**: "people with low IQ are more likely to be missing".

| Missingness | Meaning | Can you predict what is missing? |
| --- | --- | --- |
| MAR (missing at random) | Missingness is unrelated to other variables and to the variable itself | No rule can predict where values are missing |
| MNAR (missing not at random) | Missingness depends on the value of the variable itself | A rule can be written, e.g. people with low scores skip the question more often |

<details markdown="1">
<summary>Extension (optional): the three missingness mechanisms in statistics</summary>

Statistics usually distinguishes three kinds: **MCAR** (missing completely at random, unrelated to any variable), **MAR** (missingness depends only on other observed variables, e.g. younger people skip the IQ test more often) and **MNAR** (missingness depends on the value itself). The lecture's definition of "MAR" (unrelated to other variables and to the variable itself) is what statistics calls MCAR. The subject uses the slides' two-way split; just be aware of the naming difference when reading other sources.

</details>

Also watch for **disguised missing data**: everyone's birthday is 1 January, the email is xx@xx.com, or the lecture's example: an international post-code did not fit a 4-digit field, so the employee entered the rental office's own post-code instead. These values are filled in but meaningless, and finding them means looking for suspicious values with domain knowledge.
<!-- Sources: L02 p.47, p.50 -->

![L02 slide 51 - Simple imputation](assets/00-ml-concepts/slide-l02-51.png)

**Imputation** means guessing missing values. The simplest kind is statistical-measurement imputation: fill missing numeric values with the mean, median or mode; in scikit-learn this is `SimpleImputer(strategy='mean')`. The bottom of the slide lists the trade-off: it is easy and keeps all records, but it distorts statistics such as variance and standard deviation — every filled-in value equals the same mean, so the data looks more concentrated than it really is.

**Common mistake:** under MNAR, mean imputation also introduces systematic bias. In the IQ example above, the missing values are all low, so filling them with the (higher) mean of what remains overestimates these people's IQ.
<!-- Sources: L02 p.51 -->

### Inaccurate values

Typos in nominal attributes need consistency checks; typing or measurement errors in numeric attributes show up as outliers; errors can also be deliberate (like the post-code above).
<!-- Sources: L02 p.52-53 -->

![L02 slide 53 - Inaccurate values example](assets/00-ml-concepts/slide-l02-53.png)

This slide lists common inaccuracies: different names for the same institution ("Melbourne University" vs "University of Melbourne", "three" vs "3"), different date formats ("3/4/2016" may be 3 April or 4 March), two students sharing one student ID, and outliers.

Look at the outlier line: the sequence 62, 72, …, 90 is followed by 999 in purple. As a hospital patient's age it is clearly wrong; as a number of LinkedIn contacts it may be perfectly normal. Whether something is "anomalous" depends on the domain, and automated methods still need domain knowledge; see [15 Anomaly detection](15-anomaly-detection.en.md).
<!-- Sources: L02 p.53 -->

The last slide's advice: use histograms to check whether nominal attributes have a sensible distribution, and scatter plots to spot obvious outliers in numeric ones; sample when there is too much data; and consult domain experts. "You can never know your data too well."
<!-- Sources: L02 p.54 -->

<a id="topic-6"></a>
## 6. Ways to classify models

Models can be classified from several angles. The table gathers the distinctions used in this course; see each model's own note for details.

| Angle | One side | Other side | Examples in the course |
| --- | --- | --- | --- |
| What evidence it gives | Probabilistic: outputs $P(y\mid x)$ or $P(x,y)$ | Geometric: uses distances, margins or boundaries | Probabilistic: [Naive Bayes](04-NB.md), [logistic regression](05-LR.md); geometric: [kNN](02-KNN.md), [SVM](06-SVM.md), perceptron |
| Which distribution it learns | Discriminative: learns $P(y\mid x)$ or the boundary directly | Generative: learns $P(x,y)$ and can generate new samples | Discriminative: logistic regression; generative: Naive Bayes |
| Shape of the boundary | Linear: the boundary is a linear combination of features | Non-linear | Linear: perceptron, Naive Bayes, logistic regression; non-linear: neural networks with at least one hidden layer and non-linear activations |
<!-- Sources: L01 p.17; L08 p.46; L14 p.4; L15 p.14; Apple Notes ★3 Models -->

**Hard part:** a linear model cannot learn interactions between features by itself; they must be engineered by hand. A neural network can learn them as intermediate representations; see [10 Neural networks](10-neural-networks.en.md).
<!-- Sources: L15 p.14, p.24 -->

## Self-check

1. Predicting a house's sale price versus predicting whether it "sells within a month": which task is each, and why are they evaluated differently?
2. A colour attribute has 5 values. Why is coding them 0–4 and then using Euclidean distance a problem? What does one-hot encoding cost?
3. An income dataset contains one billionaire. How does this affect equal-width and equal-frequency discretisation? What about min-max scaling?
4. In a survey, people with low incomes tend to leave the income question blank. Which kind of missingness is this? What bias does mean imputation introduce?
5. For $a=(1,2,2)$ and $b=(2,0,1)$, find $\lVert a\rVert$, $a\cdot b$ and $\cos\theta$. If $a$ is scaled up by 10, which of these change and which do not?
