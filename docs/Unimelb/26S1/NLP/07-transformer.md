# 07 Transformer

## Source Pack
- Lecture: `L9 Transformer (v3)`, pp. 2-35.
- Reading: course reading for this lecture (`JM3 Chapter 8.1-8.5` as listed in the subject outline).
- Primary paper cited in the lecture: Vaswani et al., "Attention Is All You Need" (2017).

## Why the Architecture Changes Again
- The lecture contrasts RNN language models with Transformers by noting that RNN computation must proceed sequentially, one word at a time. [Source: L9 p.2]
- The Transformer removes state transfer between word positions, so per-position computation can be parallelised. [Source: L9 pp. 3-4]
- The lecture explicitly answers "How?" with attention. [Source: L9 p.4]

## Self-attention with Query, Key, and Value
- The lecture presents self-attention as the mechanism for capturing dependencies between words. [Source: L9 pp. 7, 11]
- In its formulation, a target word contributes a query vector, context words contribute key and value vectors, and the target representation is a weighted sum of value vectors. [Source: L9 p.11]
- The lecture states that query, key, and value are all linear projections of embeddings. [Source: L9 p.11]
- For matrix form, the lecture writes self-attention as `softmax(QK^T) V`, with scaled dot-product attention used to prevent values from growing too large. [Source: L9 p.13]
- The lecture summarises the outcome as contextual representation: each word representation now takes neighbouring context into account. [Source: L9 p.14]

## Multi-head Attention
- The lecture argues that a single attention head cannot capture all relevant relations in a sentence, which motivates multi-head attention. [Source: L9 pp. 15-17]
- Its summary of repeated attention computation is that each word's output embedding now bundles information gathered through multiple independent attention views. [Source: L9 pp. 16-17]

## Transformer Block
- The lecture defines a full transformer block as more than self-attention: it also contains a feedforward layer, two residual connections, and two normalisation layers. [Source: L9 p.19]
- The feedforward sublayer is a two-layer network that expands and then compresses an embedding, using the same projection for each word position. [Source: L9 p.21]
- Residual connections are described as direct paths from lower to higher layers that improve learning by giving higher layers access to lower-level representations. [Source: L9 p.22]
- Layer norm is introduced as a regularisation-like normalisation over a single vector, analogous to a z-score with learnable scale and shift parameters. [Source: L9 p.23]
- The lecture then presents the block composition order explicitly: multi-head attention, residual addition, layer norm, feedforward, another residual addition, and another layer norm. [Source: L9 p.24]
- Deep language models arise by stacking many such transformer blocks; the lecture notes GPT-3 as an example with 96 blocks. [Source: L9 p.25]

## Positional Embeddings
- Because plain query-key comparison is permutation-insensitive, the lecture points out that swapping words can otherwise produce the same output vectors. [Source: L9 p.27]
- The fix in the lecture is positional embeddings: the input representation is the sum of word embeddings and position embeddings. [Source: L9 p.28]
- The lecture's example uses a static sinusoidal function to map each position to a vector. [Source: L9 p.29]

## Language-model Head
- For training, the lecture keeps the next-word prediction objective and projects the final contextual embedding back into vocabulary space. [Source: L9 p.31]
- The lecture notes that the same embedding matrix `E` can be reused for input and output vocabulary projection. [Source: L9 p.31]

## Context Window and Scaling
- The lecture acknowledges that causal self-attention still uses a fixed left context window for prediction, but says the window is far larger than in classical n-gram models. [Source: L9 p.33]
- Its concrete scale claim is that training can use about `100K` tokens of context and inference about `1M`. [Source: L9 p.33]
- The lecture ends by calling the Transformer the dominant architecture for language modelling because it parallelises well and keeps improving when layers or attention heads are increased. [Source: L9 p.34]

## Main Takeaway
- In the course narrative, the Transformer's importance is not just accuracy but the combination of contextual modelling, parallel training, and smooth scaling to larger models, which directly sets up the transition to pretrained language models and generative AI. [Source: L9 pp. 31-34]
