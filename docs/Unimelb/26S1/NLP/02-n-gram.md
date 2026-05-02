---
course: COMP90042 Natural Language Processing
semester: 2026S1
topic: N-gram Language Models
source_type: lecture+workshop
status: draft
review_priority: high
---

# 02 N-gram Language Models

## Big Picture

N-gram language models estimate sequence probabilities from local word histories. They are simple, interpretable classical baselines that introduce core ideas reused later: probabilistic sequence modelling, sparse data, smoothing, and evaluation by held-out text likelihood.
<!-- Sources: L3 p.2-7, p.16-30; Wk3 p.17-27 -->

## Learning Map

- Prerequisite ideas: token sequences, conditional probability, counts, vocabulary, and sentence boundary symbols.
<!-- Sources: L3 p.6-9; Wk3 p.17 -->
- Core concepts: chain rule, Markov approximation, maximum-likelihood estimation, sparsity, smoothing, backoff, interpolation, and Kneser-Ney.
<!-- Sources: L3 p.6-30; Wk3 p.18-27 -->
- Main procedures: count n-grams, estimate conditional probabilities, smooth unseen events, and compare sentence probabilities.
<!-- Sources: L3 p.8-29; Wk3 p.17-27 -->
- Tutorial skills: compute unigram/bigram/trigram probabilities with and without smoothing, and explain when lower-order models are used.
<!-- Sources: Wk3 p.17-27 -->
- Common traps: omitting sentence boundary symbols, letting one unseen n-gram zero the full sentence, or confusing backoff with interpolation.
<!-- Sources: L3 p.9, p.16, p.25-29; Wk3 p.27 -->

## What language models do

- Language models assign probabilities to text sequences so that more fluent alternatives receive higher scores.
<!-- Sources: L3 p.2 -->
- Common applications include speech recognition, query completion, OCR, machine translation, summarisation, dialogue systems, and generation.
<!-- Sources: L3 p.2-4 -->

## Chain rule and n-gram approximation

<!-- Figure source: L3 p.8 -->

$$
P(w_1,\dots,w_m)=\prod_{i=1}^{m} P(w_i \mid w_1,\dots,w_{i-1})
$$
<!-- Sources: L3 p.6 -->

$$
P(w_i \mid w_1,\dots,w_{i-1}) \approx P(w_i \mid w_{i-n+1},\dots,w_{i-1})
$$
<!-- Sources: L3 p.7 -->

- Unigram, bigram, and trigram models are the first three special cases of this approximation.
<!-- Sources: L3 p.7 -->
- Sentence boundary symbols such as `<s>` and `</s>` make sentence starts and ends part of the modelled distribution.
<!-- Sources: L3 p.9 -->

## Maximum-likelihood estimation

$$
P(w_i)=\frac{C(w_i)}{M}
\qquad
P(w_i \mid w_{i-n+1},\dots,w_{i-1})=\frac{C(w_{i-n+1},\dots,w_i)}{C(w_{i-n+1},\dots,w_{i-1})}
$$
<!-- Sources: L3 p.8 -->

- A two-sentence `wood chuck` corpus makes the token count `M` and vocabulary size `V` explicit in worked calculations.
<!-- Sources: Wk3 p.17 -->
- The start symbol is used for context but is omitted from the normal vocabulary count in the workshop calculations.
<!-- Sources: Wk3 p.17 -->

## Main limitations

- Fixed-width context misses long-distance dependencies.
<!-- Sources: L3 p.16 -->
- Multiplying many small probabilities leads to numerical underflow in practice.
<!-- Sources: L3 p.16 -->
- Unseen n-grams create zero probabilities, and a single zero factor collapses the entire sequence probability.
<!-- Sources: L3 p.16 -->

## Smoothing families

<!-- Figure source: L3 p.25 -->

| Method | Core idea |
| --- | --- |
| add-one | pretend every n-gram was seen once more |
| add-k | add a smaller fractional constant |
| absolute discounting | subtract fixed mass from seen events and reassign it |
| backoff | use a lower-order model when a higher-order event is unseen |
| Kneser-Ney | use continuation behaviour for the lower-order distribution |
| interpolation | combine several n-gram orders at once |
<!-- Sources: L3 p.18-29 -->

## Add-one and add-k

- Add-one smoothing gives non-zero probability even to unseen bigrams such as `P(ate | cheese)`.
<!-- Sources: L3 p.19-20 -->
- Add-k or Lidstone smoothing generalises add-one by replacing `1` with a smaller constant `k`.
<!-- Sources: L3 p.21-22 -->
- Unsmoothed and Laplacian-smoothed unigram, bigram, and trigram probabilities can be compared directly on the same toy corpus.
<!-- Sources: Wk3 p.18-23 -->

## Absolute discounting, backoff, and Kneser-Ney

- Absolute discounting subtracts a fixed amount from observed counts and reserves that mass for unseen events.
<!-- Sources: L3 p.23-24 -->
- Katz backoff redistributes leftover mass using a lower-order model when the higher-order n-gram is unseen.
<!-- Sources: L3 p.25 -->
- Raw unigram frequency can be a weak lower-order signal because frequent words may still be poor continuations in a given context.
<!-- Sources: L3 p.26 -->
- Kneser-Ney addresses this by rewarding words that appear in many distinct contexts rather than only words with high raw frequency.
<!-- Sources: L3 p.27-28; Wk3 p.24-25 -->

## Interpolation

$$
P_{\mathrm{IN}}(w_i \mid w_{i-2},w_{i-1})
=
\lambda_3 P_3(w_i \mid w_{i-2},w_{i-1})
+ \lambda_2 P_2(w_i \mid w_{i-1})
+ \lambda_1 P_1(w_i)
$$
<!-- Sources: L3 p.29 -->

- Interpolation always mixes several orders, while backoff only drops to lower orders when needed.
<!-- Sources: L3 p.29; Wk3 p.27 -->

## Practical takeaway

- Larger n-gram orders increase context sensitivity but also increase sparsity.
<!-- Sources: Wk3 p.18-27 -->
- N-gram models are simple, unsupervised, and scalable classical baselines, but stronger generalisation motivated the later move to neural language models.
<!-- Sources: L3 p.30 -->

## Tutorial Patterns

| Pattern | What to Recognize | How to Solve | Common Mistake |
| --- | --- | --- | --- |
| MLE probability | asks for `P(word | context)` from counts | divide full n-gram count by context count | dividing by total corpus tokens for conditional probability |
| Add-one/add-k smoothing | unseen n-gram has zero count | add smoothing mass to numerator and vocabulary-adjusted denominator | forgetting to adjust denominator |
| Backoff | higher-order event is unseen | drop to a lower-order model with redistributed mass | mixing all orders regardless of seen/unseen status |
| Interpolation | formula contains lambda weights | combine all selected n-gram orders | treating it as only a fallback mechanism |
<!-- Sources: L3 p.8-29; Wk3 p.17-27 -->

## Key Comparisons

| Method | Handles unseen n-grams? | Uses lower-order information? | Main idea |
| --- | --- | --- | --- |
| MLE | no | no | observed relative frequency |
| Add-k | yes | no | add a constant to every event |
| Backoff | yes | only when needed | use lower order if higher order is unavailable |
| Interpolation | yes | always | weighted mixture of several orders |
| Kneser-Ney | yes | yes | lower-order continuation behaviour matters |
<!-- Sources: L3 p.18-29; Wk3 p.24-27 -->

## Revision Checklist

- [ ] Can write the chain rule factorisation.
- [ ] Can explain the n-gram Markov approximation.
- [ ] Can compute an MLE bigram probability.
- [ ] Can explain why smoothing is required.
- [ ] Can distinguish interpolation from backoff.
<!-- Sources: L3 p.6-30; Wk3 p.17-27 -->

## Active Recall

1. Why does a single unseen n-gram make an unsmoothed sentence probability zero?
2. What does Kneser-Ney reward that raw unigram frequency misses?
3. Why do larger n-gram orders increase sparsity?
4. Why did neural language models improve on count-based n-grams?
<!-- Sources: L3 p.16-30; Wk3 p.24-27 -->

## Glossary

| Term | Meaning |
| --- | --- |
| Language model | A model that assigns probabilities to token sequences. |
| N-gram | A contiguous sequence of `n` tokens. |
| Smoothing | Reassigning probability mass so unseen events can receive non-zero probability. |
| Backoff | Falling back to a lower-order model when a higher-order event is unseen. |
| Interpolation | Combining multiple n-gram orders with weights. |
<!-- Sources: L3 p.2-30 -->
