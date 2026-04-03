# 05 Feedforward Networks

## Core architecture

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
