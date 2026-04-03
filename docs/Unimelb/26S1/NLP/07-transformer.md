# 07 Transformer

## Scope

- Lecture: `L9 Transformer`.
- Reading: `JM3 Chapter 8`.

## Why transformers replaced recurrent models

- The lecture starts from an RNN language model and points out that recurrent computation is inherently sequential, because prediction for later positions depends on having completed earlier recurrent updates. [Sources: L9 p.2]
- The transformer is introduced as removing this state transfer between positions, which allows prediction computations to be parallelised. [Sources: L9 p.3-4]
- JM3 likewise describes transformers as non-recurrent models whose key mechanism is multi-head attention. [Sources: JM3 Ch.8, chapter introduction]

## Self-attention intuition

- The lecture motivates attention with the sentence `I made her duck`, where the representation of a target word should depend selectively on relevant context words. [Sources: L9 p.8-12]
- In the lecture, query, key, and value are all vector projections of word embeddings. [Sources: L9 p.11]
- The target word's representation is a weighted sum of value vectors, with the weights derived from comparisons between its query vector and context key vectors. [Sources: L9 p.11-13]
- The lecture summarises the matrix form as `SelfAttention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V`. [Sources: L9 p.13]
- JM3 describes the same mechanism as building contextualized representations by selectively attending to neighbouring tokens. [Sources: JM3 Ch.8, attention discussion]

## Contextual representations

- The lecture's main conceptual claim is that self-attention produces contextual representations, meaning each word vector is updated using the surrounding sentence context. [Sources: L9 p.14]
- This is a major difference from static embeddings, where the representation of a word type does not change from sentence to sentence. [Sources: L9 p.14; L10 p.21]

## Multi-head attention

- The lecture argues that words can relate to each other syntactically, semantically, and discourse-wise, so one attention mechanism is not enough. [Sources: L9 p.15]
- Multi-head attention therefore performs multiple independent attention computations and combines their outputs. [Sources: L9 p.15-16]
- JM3 makes the same argument: different heads can specialise in different relationships while preserving a common model dimension after recombination. [Sources: JM3 Ch.8, multi-head attention]

## Transformer block

- The lecture defines a full transformer block as self-attention plus a feedforward sublayer, two residual connections, and two normalising layers. [Sources: L9 p.19]
- The feedforward layer is a two-layer network applied independently at each position, expanding then compressing the embedding dimension. [Sources: L9 p.21]
- Residual connections add lower-layer information directly to higher-layer outputs, improving optimisation by giving upper layers direct access to lower-level representations. [Sources: L9 p.22]
- Layer norm is introduced as a vector-wise normalisation, analogous to a z-score with learned gain and offset parameters. [Sources: L9 p.23]
- The lecture then puts these pieces together in an explicit block computation before stacking many such blocks. [Sources: L9 p.24-25]
- JM3 describes the same block in terms of a residual stream that is progressively enriched by attention and feedforward modules. [Sources: JM3 Ch.8, transformer block discussion]

## Positional embeddings

- The lecture observes that pure query-key comparison is permutation-insensitive: swapping `I` and `made` would otherwise give the same attention computation. [Sources: L9 p.27]
- Positional embeddings are therefore added to word embeddings so the model can represent sequence order. [Sources: L9 p.28]
- The lecture presents sinusoidal position embeddings as one way to compute them. [Sources: L9 p.29]
- JM3 explains the same input representation as the sum of a token embedding and a position embedding. [Sources: JM3 Ch.8, positional embedding discussion]

## Language-model head and training

- The lecture trains the transformer for next-word prediction by projecting the final hidden representation back into vocabulary space. [Sources: L9 p.31]
- The training slides keep the model autoregressive: each target position only attends to a left context. [Sources: L9 p.31-32]
- The lecture notes that this still looks like a fixed-context language model, but with a much larger window than classical n-gram models. [Sources: L9 p.33]

## Why transformers scale

- The lecture's closing message is that transformers became dominant because they parallelise well and keep improving as layers and heads are scaled up. [Sources: L9 p.34]
- JM3 makes the same point more formally by emphasising the parallelisability of sequence processing and the strong empirical returns from scaling. [Sources: JM3 Ch.8, summary]
- The Manning essay similarly identifies the transformer as the dominant modern model family and describes attention, residual connections, and normalisation as central pieces of the architecture. [Sources: Manning 2022, p. 130]
