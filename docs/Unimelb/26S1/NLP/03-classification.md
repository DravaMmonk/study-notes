# 03 Text Classification

## Source Pack
- Lecture: `L4 Text Classification (v2)`, pp. 3-32.
- Workshop: `workshop_nlp_JL_2026s1_wk3.pdf`.
- Reading: course reading for this lecture (`E18 Chapter 4.1, 4.3-4.4.1`).

## Classification Setup
- The lecture defines classification as mapping a document `d` to a predicted class from a fixed categorical set `C = {c1, c2, ..., ck}`. [Source: L4 p.3]
- The same slide distinguishes classification from regression and ranking: the output space is categorical rather than continuous or ordinal. [Source: L4 p.3]
- The workshop rephrases the same formulation as "a document plus a fixed output set of labels goes to one predicted class". [Source: wk3 definition slides]

## Representative NLP Classification Tasks

### Topic Classification
- The lecture motivates topic classification via library science and information retrieval. [Source: L4 p.6]
- It lists unigram bag-of-words features with stopword removal and longer n-grams for phrases as standard topic features. [Source: L4 p.6]
- Example corpora in the lecture include Reuters/RCV1, PubMed abstracts, and tweets with hashtags. [Source: L4 p.6]

### Sentiment Analysis
- The lecture frames sentiment analysis as opinion mining and business analytics. [Source: L4 p.8]
- The target label set is positive, negative, or optionally neutral. [Source: L4 p.8]
- The lecture lists n-grams and polarity lexicons as core features. [Source: L4 p.8]

### Native-Language Identification
- The lecture presents native-language identification as relevant to forensic linguistics and educational applications. [Source: L4 p.10]
- Features named in the lecture include word n-grams, syntactic patterns such as POS or parse trees, and phonological features. [Source: L4 p.10]

### Natural Language Inference
- The lecture uses the synonym "textual entailment" for natural language inference. [Source: L4 p.12]
- Its label space is entailment, contradiction, or neutral. [Source: L4 p.12]
- Example features listed by the lecture are word overlap, sentence-length difference, and n-grams. [Source: L4 p.12]

### Other Task Names in the Lecture
- The lecture overview also names automatic fact-checking and paraphrase as common text classification-style tasks. [Source: L4 p.4]

## How to Build a Text Classifier
- The lecture gives a nine-step pipeline: choose a task, collect a corpus, annotate it, select features, choose a learning algorithm, train and tune on held-out development data, iterate earlier steps if needed, train the final model, and evaluate on held-out test data. [Source: L4 p.13]
- Hyper-parameter tuning should use a dedicated development set rather than the training or test set; the lecture also mentions k-fold cross-validation. [Source: L4 p.30]

## Representation Is the Core Difficulty
- The workshop says text classification is difficult mainly because of document representation: the model needs document features that distinguish labels. [Source: wk3 "Why is text classification difficult?" slides]
- The workshop explicitly walks through one-hot encodings, bag-of-words, and TF-IDF as alternative ways to represent lexical evidence. [Source: wk3 representation slides]
- The workshop summarises bag-of-words as representing text through word occurrence counts and motivates it with the intuition that documents with similar content should look similar in feature space. [Source: wk3 BoW slides]

## Choosing an Algorithm
- The lecture proposes four general criteria when choosing a classifier: bias-variance tradeoff, modelling assumptions, complexity, and speed. [Source: L4 p.15]

## Algorithm Notes from the Lecture

### Naive Bayes
- The lecture writes Naive Bayes as choosing the class with highest posterior under Bayes' law and explicitly states the naive independence assumption over features. [Source: L4 pp. 16-17]
- The lecture's advantages are speed, robustness in low-data settings, low variance, and simplicity; its disadvantages are unrealistic independence assumptions, lower accuracy in many settings, and the need for smoothing. [Source: L4 p.17]

### Logistic Regression
- The lecture describes logistic regression as a classifier despite its name and as a linear model combined with a softmax-like squashing step to produce valid probabilities. [Source: L4 p.18]
- The lecture says it handles correlated features better than Naive Bayes, but is slower to train, benefits from feature scaling, needs more data in practice, and depends strongly on the regularisation choice. [Source: L4 p.19]

### Support Vector Machines
- The lecture defines SVMs through the maximum-margin separating hyperplane. [Source: L4 p.20]
- Its listed strengths are speed, strong accuracy for linear classification, support for non-linearity through kernels, and good behaviour on huge feature sets. [Source: L4 p.20]
- Its listed weaknesses are awkward multiclass handling, need for feature scaling, poor behaviour under class imbalance, and weak interpretability. [Source: L4 p.20]
- The lecture separately notes that SVMs were especially popular in pre-deep-learning NLP because text problems often have large feature sets and large datasets. [Source: L4 p.21]

### K-Nearest Neighbour
- The lecture defines KNN as classification by majority vote among the nearest training examples, with Euclidean or cosine distance as example neighbourhood metrics. [Source: L4 pp. 22-23]
- Its pros are simplicity, no explicit training, natural multiclass behaviour, and optimality with infinite data; its cons are choosing `k`, class-imbalance sensitivity, neighbour-search cost, and heavy dependence on feature choice. [Source: L4 p.23]
- The workshop reinforces KNN by showing both Euclidean-distance and cosine-similarity variants. [Source: wk3 KNN slides]

### Decision Trees and Random Forests
- The lecture defines a decision tree as a classifier whose internal nodes test features and whose leaves return class decisions, using greedy maximisation of mutual information. [Source: L4 p.24]
- Decision trees are described as fast to build/test, feature-scale insensitive, and good for small feature sets, but not competitive for large feature spaces and not as interpretable in practice as their reputation suggests. [Source: L4 p.25]
- Random forests are introduced as ensembles of trees trained on different subsets of the data and feature space, with the final decision obtained by majority vote. [Source: L4 p.26]
- The lecture says random forests are usually more accurate and robust than single trees and parallelise well, but remain weak on interpretability and slow on large feature sets. [Source: L4 p.27]

### Neural Networks
- The lecture characterises neural networks as layered systems with input, hidden, and output layers, where each node linearly combines its inputs and then applies an activation function. [Source: L4 p.28]
- Their advantages in the lecture are power and reduced manual feature engineering; their drawbacks are optimisation difficulty, many hyper-parameters, slow training, and overfitting risk. [Source: L4 p.29]

## Hyper-parameters and Overfitting
- The lecture stresses that many hyper-parameters are effectively regularisation choices because they control model complexity. [Source: L4 p.30]
- For multiple hyper-parameters, the lecture recommends grid search. [Source: L4 p.30]

## Practical Summary
- The lecture's closing advice is pragmatic rather than ideological: many algorithms are available, but if the goal is strong results on a new task, feature engineering and task setup matter as much as the choice of classifier. [Source: L4 pp. 31-32]
