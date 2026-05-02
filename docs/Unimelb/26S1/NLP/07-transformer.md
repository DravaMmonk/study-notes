---
course: COMP90042 Natural Language Processing
semester: 2026S1
topic: Transformer
source_type: lecture+workshop+reading
status: draft
review_priority: high
---

# 07 Transformer

## Big Picture

Transformers replace recurrent state with attention over token representations, allowing much more parallel sequence processing. This architecture is the direct technical foundation for BERT, GPT, T5, and the later large language models.
<!-- Sources: L9 p.2-4, p.34; W6 p.3-6; W7 p.5-8; Manning 2022 p.130 -->

## Learning Map

- Prerequisite ideas: embeddings, neural networks, sequence modelling, and matrix multiplication.
<!-- Sources: L9 p.8-14 -->
- Core concepts: self-attention, query/key/value projections, scaled dot-product attention, multi-head attention, residual connections, layer normalisation, positional embeddings, and causal masking.
<!-- Sources: L9 p.8-34; W6 p.3-6; W7 p.5-8 -->
- Main procedures: compute attention weights, combine value vectors, run multiple heads, add feedforward/residual/layer-norm blocks, and inject position information.
<!-- Sources: L9 p.11-29; W6 p.3-6 -->
- Tutorial skills: distinguish attention, self-attention, and cross-attention; explain decoder-only masking.
<!-- Sources: W7 p.7-8 -->
- Common traps: forgetting that pure attention has no order information, confusing bidirectional encoder attention with causal decoder attention, or treating attention as inherently sequential.
<!-- Sources: L9 p.27-32; W7 p.7-8 -->

## Why transformers replaced recurrent models

- Removing recurrent state transfer between positions makes sequence processing much easier to parallelise.
<!-- Sources: L9 p.2-4 -->
- The transformer became the dominant modern architecture for large-scale language modelling.
<!-- Sources: L9 p.34; Manning 2022 p.130 -->

## Self-attention

<!-- Figure source: L9 p.13 -->

- Self-attention builds a new representation for each token by comparing it with other tokens in the same sequence.
<!-- Sources: L9 p.8-14 -->
- Query, key, and value are vector projections derived from embeddings.
<!-- Sources: L9 p.11 -->

$$
\mathrm{SelfAttention}(Q,K,V)=\mathrm{softmax}\left(\frac{QK^{T}}{\sqrt{d_k}}\right)V
$$
<!-- Sources: L9 p.13 -->

- The resulting vectors are contextual representations because they depend on sentence context rather than only on word identity.
<!-- Sources: L9 p.14 -->

## Multi-head attention

- Different heads can specialise in different relationships such as syntax, semantics, or discourse reference.
<!-- Sources: L9 p.15-16 -->
- Multi-head attention therefore performs several independent attention computations before recombining them.
<!-- Sources: L9 p.15-16; JM3 Ch.8 multi-head attention -->

## Transformer block

<!-- Figure source: L9 p.20 -->

| Component | Role |
| --- | --- |
| self-attention | contextualise each token using the sequence |
| feedforward sublayer | apply a position-wise nonlinear transformation |
| residual connection | preserve lower-layer information and improve optimisation |
| layer norm | normalise the vector stream with learned scaling and offset |
<!-- Sources: L9 p.19-25 -->

- The feedforward layer expands the hidden dimension and then compresses it again.
<!-- Sources: L9 p.21 -->
- Residual connections add lower-layer information directly to higher-layer outputs.
<!-- Sources: L9 p.22 -->
- Layer norm applies vector-wise normalisation analogous to a z-score with learned gain and bias.
<!-- Sources: L9 p.23 -->

## Positional embeddings

<!-- Figure source: L9 p.28 -->

- Pure attention is permutation-insensitive, so order information must be injected separately.
<!-- Sources: L9 p.27 -->
- Positional embeddings are added to token embeddings to represent sequence order.
<!-- Sources: L9 p.28 -->
- Sinusoidal functions are one way to compute these position vectors.
<!-- Sources: L9 p.29 -->

## Autoregressive training

- The language-model head projects final hidden states back into vocabulary space for next-token prediction.
<!-- Sources: L9 p.31 -->
- Training remains autoregressive in this language-model setup, so each target attends only to left context.
<!-- Sources: L9 p.31-32 -->
- The usable context window is still finite, but much larger than in classical n-gram models.
<!-- Sources: L9 p.33 -->

## Main takeaway

- Transformer performance improves well with larger depth and more attention heads.
<!-- Sources: L9 p.34 -->
- Parallelisable attention-based modelling is a major reason transformers enabled large language models and generative AI.
<!-- Sources: L9 p.34; Manning 2022 p.130 -->

## Tutorial Patterns

| Pattern | What to Recognize | How to Solve | Common Mistake |
| --- | --- | --- | --- |
| Q/K/V explanation | asks what attention components mean | query is what is looking, key is what is compared, value is retrieved information | treating Q, K, V as unrelated token types |
| Self vs cross attention | asks where Q/K/V come from | self-attention uses same sequence; cross-attention uses Q from one sequence and K/V from another | calling all attention self-attention |
| Positional embeddings | asks why order is needed | attention alone is permutation-insensitive | assuming token order is automatic |
| Decoder-only masking | asks what tokens can be attended to | causal mask blocks future tokens | allowing future tokens during language-model training |
<!-- Sources: L9 p.8-32; W7 p.7-8 -->

## Key Comparisons

| Model | Context mechanism | Parallelism | Typical role |
| --- | --- | --- | --- |
| RNN | recurrent state | limited by sequence order | earlier sequence modelling |
| Transformer encoder | bidirectional self-attention | high | understanding and representation |
| Transformer decoder | masked self-attention | high during training | autoregressive generation |
| Encoder-decoder transformer | encoder self-attention plus decoder cross-attention | high | conditional generation such as translation |
<!-- Sources: L9 p.2-34; W7 p.7-8 -->

## Revision Checklist

- [ ] Can write the scaled dot-product self-attention formula.
- [ ] Can explain why multi-head attention is useful.
- [ ] Can explain the roles of residual connections and layer normalisation.
- [ ] Can explain why positional embeddings are necessary.
<!-- Sources: L9 p.8-34; W6 p.3-6; W7 p.5-8 -->

## Active Recall

1. Why are transformers easier to parallelise than RNNs?
2. What does the softmax in attention normalise?
3. Why does autoregressive training require masking?
4. How does multi-head attention differ from a single attention computation?
<!-- Sources: L9 p.2-34; W6 p.3-6; W7 p.5-8 -->

## Glossary

| Term | Meaning |
| --- | --- |
| Query | Vector representing what a token is looking for. |
| Key | Vector used for comparison against a query. |
| Value | Vector combined according to attention weights. |
| Multi-head attention | Multiple attention computations whose outputs are recombined. |
| Positional embedding | Vector added to represent token order. |
<!-- Sources: L9 p.8-34; W7 p.7 -->
