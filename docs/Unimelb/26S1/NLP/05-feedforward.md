---
course: COMP90042 Natural Language Processing
semester: 2026S1
topic: Feedforward Networks
source_type: lecture+workshop
status: draft
review_priority: high
---

# 05 Feedforward Networks

## Big Picture

Feedforward networks introduce neural modelling for NLP: inputs are represented as vectors, hidden layers learn nonlinear combinations, and output layers produce probabilities for labels or next words. They bridge classical feature-based classifiers and later sequence models.
<!-- Sources: L7 p.4-29; Wk5 p.10-15 -->

## Learning Map

- Prerequisite ideas: text classification, feature vectors, matrix multiplication, nonlinear activation, and probability outputs.
<!-- Sources: L7 p.4-8 -->
- Core concepts: multilayer perceptron, hidden layer, sigmoid, softmax, negative log-likelihood, gradient descent, dropout, and neural language modelling.
<!-- Sources: L7 p.4-29 -->
- Main procedures: build an input vector, compute hidden activations, produce output probabilities, train by gradient descent, and regularise.
<!-- Sources: L7 p.4-10 -->
- Tutorial skills: identify input/output shapes for document classification, language modelling, and POS tagging.
<!-- Sources: L7 p.12-28; Wk5 p.10-15 -->
- Common traps: treating neural models as feature-free, forgetting regularisation, or ignoring the fixed-window limitation in feedforward language models.
<!-- Sources: L7 p.12-29 -->

## Core architecture

<!-- Figure source: L7 p.12 -->

- Feedforward neural networks are also called multilayer perceptrons.
<!-- Sources: L7 p.4 -->
- They consist of weighted connections, nonlinear hidden layers, and an output layer that produces task predictions.
<!-- Sources: L7 p.4-7 -->

$$
h_i=\tanh\left(\sum_j w_{ij}x_j+b_i\right)
\qquad
h=\tanh(Wx+b)
$$
<!-- Sources: L7 p.6 -->

## Output layers

- Binary classification commonly uses the sigmoid or logistic function.
<!-- Sources: L7 p.7 -->
- Multiclass classification commonly uses softmax so that class probabilities are positive and sum to one.
<!-- Sources: L7 p.7 -->

## Training and regularisation

<!-- Figure source: L7 p.22 -->

- Training maximises the probability of the correct outputs or, equivalently, minimises negative log-likelihood.
<!-- Sources: L7 p.8 -->
- Gradient descent is used for optimisation.
<!-- Sources: L7 p.8 -->
- L1, L2, and dropout are presented as standard regularisation strategies.
<!-- Sources: L7 p.9 -->

## Dropout

- Dropout randomly sets a proportion of activations to zero during training, usually in hidden layers.
<!-- Sources: L7 p.10 -->
- It reduces reliance on particular neurons, penalises large weights, and injects noise into the model.
<!-- Sources: L7 p.11 -->

## Feedforward models for NLP

- Document classification is a direct application in which document features feed a class-prediction network.
<!-- Sources: L7 p.12-16 -->
- Language modelling can be cast as next-word classification from a fixed context window.
<!-- Sources: L7 p.17-19 -->

$$
x = v_{w_{i-3}} \oplus v_{w_{i-2}} \oplus v_{w_{i-1}},
\qquad
h=\tanh(W_2 x+b_1),
\qquad
y=\mathrm{softmax}(W_3 h)
$$
<!-- Sources: L7 p.22-24 -->

- Feedforward neural language models use learned embeddings instead of sparse count tables.
<!-- Sources: L7 p.19-24 -->
- Separate input and output embedding matrices are used in this architecture.
<!-- Sources: L7 p.24 -->

## Why feedforward neural language models improve on count tables

- Count-based n-gram models are cheap to train but suffer from sparsity and cannot directly share strength between similar words such as `film` and `movie`.
<!-- Sources: L7 p.26 -->
- Feedforward neural language models learn distributed word properties and therefore produce more robust estimates.
<!-- Sources: L7 p.26 -->

## POS tagging with feedforward networks

- POS tagging can also be framed as classification over the current tag.
<!-- Sources: L7 p.27 -->
- One lecture architecture uses recent word embeddings plus recent tag embeddings as inputs and predicts the current tag with a softmax output.
<!-- Sources: L7 p.28 -->

## Practical trade-off

| Strengths | Weaknesses |
| --- | --- |
| strong performance | slower than classical ML models |
| less hand-engineered features | many vocabulary-driven parameters |
| flexible task-specific architectures | data hungry without pretraining |
<!-- Sources: L7 p.29; Wk5 p.10-15 -->

## Tutorial Patterns

| Pattern | What to Recognize | How to Solve | Common Mistake |
| --- | --- | --- | --- |
| Output choice | binary vs multiclass prediction | use sigmoid for binary and softmax for multiclass | using independent sigmoid outputs for one-of-many labels without reason |
| Dropout question | asks about overfitting | explain random hidden-unit masking during training | applying dropout as a deterministic test-time deletion |
| Feedforward LM | fixed prior context window | concatenate previous word embeddings and predict next word | assuming it can use arbitrary long context |
| Neural POS tagging | current tag as classification | use word/tag embeddings as local context features | forgetting previous tag decisions affect features |
<!-- Sources: L7 p.7-29; Wk5 p.10-15 -->

## Key Comparisons

| Model family | Context handling | Representation | Main limitation |
| --- | --- | --- | --- |
| Classical classifier | hand-designed features | sparse or engineered vectors | limited learned representation |
| Feedforward NN | fixed input window | learned hidden features | no recurrent state over arbitrary length |
| Feedforward neural LM | fixed previous tokens | learned embeddings | context length is still fixed |
<!-- Sources: L7 p.12-29 -->

## Revision Checklist

- [ ] Can describe an MLP as layers of weighted nonlinear transformations.
- [ ] Can explain when sigmoid and softmax are used.
- [ ] Can explain dropout as training-time regularisation.
- [ ] Can describe how a feedforward neural language model predicts the next word.
<!-- Sources: L7 p.4-29 -->

## Active Recall

1. Why do feedforward neural LMs generalise better than count tables for similar words?
2. What role does the hidden layer play?
3. Why does dropout reduce reliance on particular neurons?
4. What fixed-window limitation remains in feedforward language modelling?
<!-- Sources: L7 p.4-29; Wk5 p.10-15 -->

## Glossary

| Term | Meaning |
| --- | --- |
| MLP | Multilayer perceptron, a feedforward neural network. |
| Hidden layer | Intermediate nonlinear representation layer. |
| Softmax | Function that maps scores to a probability distribution over classes. |
| Dropout | Randomly zeroing activations during training for regularisation. |
| Embedding | Dense learned vector representation for a token or symbol. |
<!-- Sources: L7 p.4-29 -->
