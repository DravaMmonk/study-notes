# 06 Recurrent Networks

## Why recurrent models matter

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
