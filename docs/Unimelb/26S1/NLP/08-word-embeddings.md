# 08 Word Embeddings

## Distributional hypothesis

- Word meaning can be inferred from contextual distribution.
<!-- Sources: L10 p.2 -->
- Document-level context reflects topic association, while local window context reflects finer-grained meaning.
<!-- Sources: L10 p.2 -->

## Count-based vectors

- A term-document matrix can represent either documents by words or words by documents.
<!-- Sources: L10 p.8-9 -->
- TF-IDF downweights words that appear in many documents.
<!-- Sources: L10 p.11 -->
- Sparse count matrices motivate dimensionality reduction to shorter, denser vectors.
<!-- Sources: L10 p.12 -->

| Count-based step | Purpose |
| --- | --- |
| term-document matrix | collect document-level co-occurrence counts |
| TF-IDF weighting | discount very common words |
| SVD / LSA | compress sparse counts into dense lower-dimensional vectors |
<!-- Sources: L10 p.9-14 -->

## Word-context matrices and PMI

- Word-window co-occurrence matrices are dominated by very common words if raw frequencies are used directly.
<!-- Sources: L10 p.15 -->

$$
\mathrm{PMI}(x,y)=\log_2 \frac{P(x,y)}{P(x)P(y)}
$$
<!-- Sources: L10 p.16 -->

- PMI measures how far actual co-occurrence deviates from independence.
<!-- Sources: L10 p.16 -->
- Dense vectors can again be derived after co-occurrence weighting and matrix factorisation.
<!-- Sources: L10 p.19 -->

## Neural embedding methods

- Neural methods can learn embeddings directly rather than only as a by-product of another task.
<!-- Sources: L10 p.21-22 -->
- Desired properties include unsupervised learning and efficient training.
<!-- Sources: L10 p.22 -->

## Word2Vec

- Skip-gram predicts surrounding words from a target word, while CBOW predicts the target word from surrounding words.
<!-- Sources: L10 p.24 -->

$$
P(c \mid w)
=
\frac{\exp(W_w \cdot C_c)}
{\sum_{u \in V} \exp(W_w \cdot C_u)}
$$
<!-- Sources: L10 p.25-26 -->

- Skip-gram maintains separate target and context embedding matrices.
<!-- Sources: L10 p.26-27 -->

## Negative sampling

- Full softmax training is expensive because it normalises over the full vocabulary.
<!-- Sources: L10 p.28 -->
- Negative sampling reframes learning as binary classification between real word-context pairs and sampled noise pairs.
<!-- Sources: L10 p.28-30 -->

$$
L(\theta)=
\sum_{(w,c)\in +}\log P(+ \mid w,c)
+
\sum_{(w,c)\in -}\log P(- \mid w,c)
$$
<!-- Sources: L10 p.30 -->

## Evaluation

| Evaluation style | Example |
| --- | --- |
| word similarity | cosine similarity against judged pairs such as WordSim-353 or SimLex-999 |
| word analogy | vector arithmetic such as `woman - man + king` |
| downstream evaluation | use embeddings as features or initialise larger models |
<!-- Sources: L10 p.33-36 -->

$$
v(\text{queen}) \approx v(\text{woman}) - v(\text{man}) + v(\text{king})
$$
<!-- Sources: L10 p.34-35 -->

## Main takeaway

- Neural embedding methods generally outperform count-based methods in the summary comparison.
<!-- Sources: L10 p.37 -->
- Pretrained word vectors are useful initialisations for downstream neural models and motivate the later shift toward pretraining whole models.
<!-- Sources: L10 p.36-37 -->
