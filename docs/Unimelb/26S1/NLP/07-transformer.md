# 07 Transformer

## Why transformers replaced recurrent models

- Removing recurrent state transfer between positions makes sequence processing much easier to parallelise.
<!-- Sources: L9 p.2-4 -->
- The transformer became the dominant modern architecture for large-scale language modelling.
<!-- Sources: L9 p.34; Manning 2022 p.130 -->

## Self-attention

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
