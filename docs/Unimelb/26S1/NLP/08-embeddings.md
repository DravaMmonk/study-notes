# 08 Word Embeddings

## Source Pack
- Lecture: `L10 Word Embeddings (v2)`, pp. 2-39.
- Workshop connections: representation discussion in `wk3` and neural-language-model discussion in `wk5`.
- Reading: course reading for this lecture (`JM3 Chapter 5.2-5.5`).

## Distributional Hypothesis
- The lecture starts from Firth's dictum "You shall know a word by the company it keeps". [Source: L10 p.2]
- It distinguishes two context choices: document-level co-occurrence, which signals topic, and local word-window context, which reflects meaning more directly. [Source: L10 p.2]
- The lecture uses the unknown word `tezgüino` to show how meaning can be inferred from usage and from similarity to words with similar contexts. [Source: L10 p.3]

## Word Vectors as Distributional Summaries
- Each row in a co-occurrence table can be interpreted as a word vector describing the distributional properties of that word. [Source: L10 p.4]
- The lecture explicitly says such vectors can capture semantic relations including synonymy and analogy. [Source: L10 p.4]
- It then connects these vectors back to neural NLP by noting that word embeddings are one particular way of producing word vectors. [Source: L10 p.5]

## Count-based Methods

### Document as Context
- One count-based approach uses documents as contexts, creating a term-document matrix that can be viewed either as documents represented by words or words represented by documents. [Source: L10 p.9]
- TF-IDF is introduced as the standard information-retrieval weighting scheme for this setting, with the explicit role of down-weighting common words. [Source: L10 p.11]

### Dimensionality Reduction
- The lecture says term-document matrices are sparse, so dimensionality reduction is used to create shorter, denser vectors that are more practical and less noisy. [Source: L10 p.12]
- Singular value decomposition factorises the matrix, and truncating it gives latent semantic analysis (LSA), whose reduced `U_k` matrix serves as low-dimensional word vectors. [Source: L10 pp. 13-14]

### Words as Context
- A second count-based family uses neighbouring words as context rather than full documents. [Source: L10 p.15]
- Raw co-occurrence counts are dominated by frequent words, so the lecture introduces pointwise mutual information (PMI) to compare joint occurrence with what would be expected under independence. [Source: L10 pp. 15-16]

## Neural Methods: Skip-gram
- The lecture says task-specific neural models can learn embeddings as a by-product, but then asks whether the network can be designed specifically to learn good word vectors. [Source: L10 pp. 20-21]
- Its chosen answer is the skip-gram model: predict each neighbouring word given the target word. [Source: L10 p.25]
- The total objective multiplies the conditional probabilities of all context words in a fixed window around the target. [Source: L10 p.25]
- The lecture makes the parameterisation explicit: skip-gram learns two matrices, a word matrix `W` and a context matrix `C`. [Source: L10 pp. 26-27]

## Negative Sampling
- Full softmax over the vocabulary is too slow in practice, so the lecture reduces training to a binary classification problem: distinguish real target-context pairs from fake negative pairs. [Source: L10 p.28]
- Negative samples are drawn randomly from the vocabulary. [Source: L10 p.28]
- The lecture writes the resulting loss as a sum over positive and negative examples and then simplifies it to the common `k`-negative-sample form used in practice. [Source: L10 pp. 29-30]
- The lecture's design goals for word2vec-style training are therefore unsupervised learning from unlabeled corpora and computational efficiency at very large scale. [Source: L10 p.31]

## How Embeddings Are Evaluated
- The lecture lists three evaluation styles: word similarity, word analogy, and downstream-task usefulness. [Source: L10 pp. 33-36]
- For similarity, cosine similarity is compared with human judgments, using datasets such as WordSim-353 and SimLex-999. [Source: L10 p.33]
- For analogy, the lecture uses the standard vector arithmetic pattern `woman - man + king` and then finds the nearest word vector. [Source: L10 p.34]
- The lecture says the geometry of word2vec embeddings helps explain why they perform well on analogy tasks. [Source: L10 p.35]
- The lecture also says the strongest evaluation is downstream use, either as bag-of-word embedding features or as initialisation for the first layer of a larger model. [Source: L10 p.36]

## Cross-lecture Positioning
- The lecture's final summary is blunt: neural methods outperform count-based ones, and pretrained word vectors are useful for initialising downstream models. [Source: L10 p.37]
- Its closing question, "Why not pretrain a whole model and use it for downstream task?", directly sets up L11. [Source: L10 p.37]

## Workshop Links
- The workshop material from week 3 introduces TF-IDF and bag-of-words as document representations, which connect directly to the count-based side of this lecture. [Source: wk3 representation slides]
- The week 5 workshop then revisits word embeddings as the representational basis for neural language models. [Source: wk5 embedding slides]
