# 02 N-gram Language Models

## Scope

- Lecture: `L3 N-gram Language Models`.
- Workshop: `Week 3` n-gram exercises.

## What a language model is used for

- The lecture introduces language models as models that assign probabilities to text sequences so that we can compare how fluent alternative strings are. [Sources: L3 p.2]
- The lecture uses speech recognition, query completion, OCR, machine translation, summarisation, and dialogue systems as example applications. [Sources: L3 p.2-4]
- The lecture also notes that language models can be used for generation and names them as part of the foundation of systems like ChatGPT. [Sources: L3 p.2]

## From joint probability to n-grams

- The lecture starts with the chain rule to rewrite the probability of a word sequence into a product of conditional probabilities. [Sources: L3 p.6]
- The Markov assumption then approximates each conditional probability using only the previous `n - 1` words. [Sources: L3 p.7]
- The lecture presents unigram, bigram, and trigram models as specific cases of this assumption. [Sources: L3 p.7]
- Sentence boundary symbols `<s>` and `</s>` are included so the model can learn how sentences begin and end. [Sources: L3 p.9]

## Maximum likelihood estimation

- The lecture estimates unigram probabilities from corpus counts divided by the total number of word tokens. [Sources: L3 p.8]
- The lecture estimates higher-order n-gram probabilities by dividing the count of an n-gram by the count of its `(n - 1)`-word history. [Sources: L3 p.8]
- The lecture's trigram example expands `P(yes no no yes)` into five factors, including the probability of the sentence-end symbol after the final word. [Sources: L3 p.10]
- The workshop explicitly works with a two-sentence `wood chuck` corpus and defines `M` as total token count and `V` as vocabulary size. [Sources: Wk3 p.17]
- The workshop also explains why `<s>` is omitted from the vocabulary count used in final n-gram probabilities: it is inserted for context rather than treated as normal text content. [Sources: Wk3 p.17]

## Main limitations of count-based n-gram models

- The lecture highlights long-distance effects as a problem, because local context windows miss dependencies that are farther away in the sentence. [Sources: L3 p.16]
- The lecture notes that multiplying many small probabilities can cause numerical underflow, motivating log probabilities in practice. [Sources: L3 p.16]
- The lecture treats unseen n-grams as the central modelling problem, because a single zero factor collapses the full sequence probability to zero. [Sources: L3 p.16]

## Smoothing families

- The lecture defines smoothing as assigning some probability mass to unseen events while keeping total probability mass equal to 1. [Sources: L3 p.18]
- The lecture lists Laplacian smoothing, add-k smoothing, absolute discounting, Kneser-Ney smoothing, and interpolation. [Sources: L3 p.18]

## Add-one and add-k smoothing

- Laplacian smoothing in the lecture simply pretends each n-gram has been seen once more than it actually was. [Sources: L3 p.19]
- The add-one example in the lecture shows that even an unseen bigram such as `P(ate | cheese)` receives non-zero probability after smoothing. [Sources: L3 p.20]
- The lecture then generalises add-one to add-k or Lidstone smoothing by adding a smaller constant `k` instead of `1`. [Sources: L3 p.21-22]
- The workshop mirrors these computations with unigram, bigram, and trigram examples on the `wood chuck` corpus. [Sources: Wk3 p.18-23]

## Absolute discounting, backoff, and Kneser-Ney

- The lecture describes absolute discounting as subtracting a fixed amount from observed counts and redistributing the reserved mass to unseen events. [Sources: L3 p.23-24]
- The lecture explains Katz backoff as using a lower-order model to redistribute that leftover mass when a higher-order n-gram is unseen. [Sources: L3 p.25]
- The lecture points out a weakness of Katz backoff with the `reading ___` example: a frequent word like `Francisco` can be preferred over the more plausible `glasses` because raw unigram frequency is too blunt. [Sources: L3 p.26]
- Kneser-Ney smoothing is presented as fixing this by using continuation probability, rewarding words that appear in many distinct contexts. [Sources: L3 p.27-28]
- The workshop makes the same idea concrete by counting how many different preceding words `chuck` and `wood` have in the `wood chuck` corpus. [Sources: Wk3 p.24-25]

## Interpolation

- The lecture defines interpolation as combining multiple n-gram orders rather than only falling back after failure. [Sources: L3 p.29]
- The interpolated trigram in the lecture is a weighted sum of trigram, bigram, and unigram probabilities, with weights learned on held-out data. [Sources: L3 p.29]
- The workshop contrasts interpolation with backoff by noting that interpolation always mixes all relevant orders, whereas backoff only uses lower-order models when needed. [Sources: Wk3 p.27]

## Worked-example lessons from the workshop

- Week 3 uses the same corpus to compare unsmoothed, Laplacian-smoothed, and Kneser-Ney-smoothed models across unigram, bigram, and trigram settings. [Sources: Wk3 p.17-27]
- The structure of the workshop makes one practical point very clear: increasing the n-gram order makes the model more context-sensitive, but also makes sparsity worse and therefore increases the importance of smoothing. [Sources: Wk3 p.18-27]

## Final takeaways

- The lecture concludes that n-gram language models are simple, unsupervised, scalable baselines for modelling the predictability of language. [Sources: L3 p.30]
- The lecture also positions neural language models as the next step once we want stronger generalisation and better handling of sparsity. [Sources: L3 p.30]
