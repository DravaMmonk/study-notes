---
course: COMP90042 Natural Language Processing
semester: 2026S1
topic: Recurrent Networks
source_type: lecture+workshop+reading
status: draft
review_priority: high
---

# 06 Recurrent Networks

## Big Picture

Recurrent networks model sequences by carrying a hidden state from one position to the next. They improve on fixed-window feedforward models by letting earlier context influence later predictions, but they are harder to train and less parallelisable than transformers.
<!-- Sources: L8 p.11-22, p.41; Wk5 p.16-18; JM3 Ch.13 BPTT discussion -->

## Learning Map

- Prerequisite ideas: feedforward networks, embeddings, gradient descent, and sequential language data.
<!-- Sources: L8 p.11-18 -->
- Core concepts: recurrent state, unrolling, backpropagation through time, autoregressive generation, vanishing gradients, LSTM memory cell, and gates.
<!-- Sources: L8 p.11-41; Wk5 p.16-18 -->
- Main procedures: update state for each token, predict outputs from state, unroll through time for training, and use gates to preserve or discard information.
<!-- Sources: L8 p.15-30 -->
- Tutorial skills: explain why RNNs should beat n-grams in principle and why they struggle with long-range dependencies in practice.
<!-- Sources: L8 p.21; Wk5 p.16-18 -->
- Common traps: assuming arbitrary-length state means perfect long-context learning, or forgetting RNN computation is sequential.
<!-- Sources: L8 p.21, p.41; Wk5 p.17-18 -->

## Why recurrent models matter

<!-- Figure source: L8 p.11 -->

- Recurrent neural networks process arbitrarily long input sequences by repeatedly updating a state vector.
<!-- Sources: L8 p.11 -->
- The recurrent state summarises the prefix seen so far.
<!-- Sources: L8 p.11 -->

$$
s_i=\tanh(W_s s_{i-1}+W_x x_i+b),
\qquad
y_i=\mathrm{softmax}(W_y s_i)
$$
<!-- Sources: L8 p.16 -->

## Training

<!-- Figure source: L8 p.21 -->

- Unrolling an RNN through time produces a deep computation graph with shared parameters across time steps.
<!-- Sources: L8 p.15 -->
- Training is performed with backpropagation through time.
<!-- Sources: L8 p.15; JM3 Ch.13 BPTT discussion -->

## RNNs as language models

- In a recurrent language model, the current token is the input, the recurrent state carries prior context, and the output distribution predicts the next token.
<!-- Sources: L8 p.16-18 -->
- Generation is autoregressive: generated tokens are fed back as future inputs.
<!-- Sources: L8 p.18 -->
- Typical generation failures include train-test mismatch, error propagation, and generic text.
<!-- Sources: L8 p.19 -->

## Why recurrent models should beat n-grams

- Recurrent models can in principle use arbitrarily long left contexts instead of a fixed-width history.
<!-- Sources: L8 p.21; Wk5 p.16 -->
- This offers a route to stronger generalisation on unseen sequences than count-based fixed-window models.
<!-- Sources: Wk5 p.16 -->

## Vanishing gradients

- Simple RNNs still struggle with long-range dependencies in practice because gradients shrink rapidly during backpropagation.
<!-- Sources: L8 p.21; Wk5 p.17-18 -->
- Early inputs therefore receive much weaker learning signals than later ones.
<!-- Sources: Wk5 p.17-18 -->

## LSTM memory and gates

<!-- Figure source: L8 p.39 -->

- Long Short-term Memory networks address vanishing gradients by introducing a memory cell and gates that regulate information flow.
<!-- Sources: L8 p.22 -->
- Forget, input, and output gates control what is discarded, written, and exposed.
<!-- Sources: L8 p.26-29 -->

$$
f_t=\sigma(W_f [h_{t-1},x_t]+b_f), \quad
i_t=\sigma(W_i [h_{t-1},x_t]+b_i), \quad
o_t=\sigma(W_o [h_{t-1},x_t]+b_o)
$$

$$
\tilde{C}_t=\tanh(W_C [h_{t-1},x_t]+b_C), \quad
C_t=f_t * C_{t-1}+ i_t * \tilde{C}_t, \quad
h_t=o_t * \tanh(C_t)
$$
<!-- Sources: L8 p.30 -->

## Typical NLP applications

| Application | Sequence use |
| --- | --- |
| language modelling | predict next token from prefix |
| text classification | map a sentence or document to one label |
| sequence labelling | output one label per token |
| bidirectional tagging | combine left-to-right and right-to-left context |
<!-- Sources: L8 p.16-18, p.37-40 -->

- Multi-layer LSTMs stack recurrent layers on top of one another.
<!-- Sources: L8 p.39 -->
- Bidirectional LSTMs let each output depend on both past and future context.
<!-- Sources: L8 p.40; JM3 Ch.13 stacked and bidirectional RNN discussion -->

## Practical trade-off

- Recurrent models are flexible and can in principle capture long contexts.
<!-- Sources: L8 p.41 -->
- Their drawbacks are sequential computation, weak long-range behaviour in practice, and reduced popularity after transformers.
<!-- Sources: L8 p.41 -->

## Tutorial Patterns

| Pattern | What to Recognize | How to Solve | Common Mistake |
| --- | --- | --- | --- |
| RNN vs n-gram | asks about context length | RNN has a state summarising the prefix; n-gram uses fixed history | claiming RNNs always remember all early tokens perfectly |
| BPTT | asks how recurrence is trained | unroll through time and backpropagate through shared parameters | treating each time step as unrelated parameters |
| Vanishing gradient | asks why long dependencies fail | gradients shrink across many recurrent steps | blaming only lack of data |
| LSTM gates | asks how memory is controlled | map forget/input/output gates to discard/write/expose | mixing up cell state and hidden output |
<!-- Sources: L8 p.15-30; Wk5 p.16-18 -->

## Key Comparisons

| Architecture | Context mechanism | Strength | Weakness |
| --- | --- | --- | --- |
| Feedforward LM | fixed context window | parallel and simple | cannot use arbitrary history |
| Simple RNN | recurrent hidden state | sequence-length flexibility | vanishing gradients |
| LSTM | gated memory cell | better long-range signal preservation | still sequential and slower to parallelise |
| Bidirectional LSTM | left and right context | strong tagging representation | unsuitable for left-to-right generation without future leakage |
<!-- Sources: L8 p.11-41; Wk5 p.16-18 -->

## Revision Checklist

- Can write the recurrent state update.
- Can explain backpropagation through time.
- Can describe vanishing gradients.
- Can name the LSTM forget, input, and output gates.
<!-- Sources: L8 p.15-30; Wk5 p.16-18 -->

## Active Recall

1. Why is RNN generation autoregressive?
2. What does the recurrent state represent?
3. How do LSTMs address vanishing gradients?
4. Why did transformers reduce the importance of RNNs for modern NLP?
<!-- Sources: L8 p.11-41 -->

## Glossary

| Term | Meaning |
| --- | --- |
| Recurrent state | A vector summarising the prefix processed so far. |
| BPTT | Backpropagation through time over an unrolled recurrent computation. |
| Vanishing gradient | Training signal shrinking across many steps. |
| LSTM | Long Short-term Memory network with gated memory. |
| Bidirectional model | A model that combines left-to-right and right-to-left context. |
<!-- Sources: L8 p.11-41; JM3 Ch.13 -->
