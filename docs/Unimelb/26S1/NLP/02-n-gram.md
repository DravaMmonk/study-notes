# 02 N-gram Language Models

## Source Pack
- Lecture: `L3 N-gram Language Models (v2)`, pp. 2-31.
- Workshop: `workshop_nlp_JL_2026s1_wk3.pdf`.
- Reading: course reading for this lecture (`E18 Chapter 6`, excluding 6.3).

## What a Language Model Does
- The lecture describes language models as a way to measure the quality or fluency of text using probabilities. [Source: L3 p.2]
- The lecture uses speech recognition as a motivating example: a language model helps prefer a fluent analysis such as `recognise speech` over an implausible alternative such as `wreck a nice beach`. [Source: L3 p.2]
- The lecture also lists query completion, optical character recognition, machine translation, summarisation, and dialogue systems as language-model applications. [Source: L3 p.4]

## Chain Rule and the Markov Assumption
- The lecture starts from the chain rule, expressing the joint probability of a sequence as a product of conditional probabilities over progressively longer histories. [Source: L3 p.6]
- Because conditioning on the entire history is intractable, the lecture introduces the Markov assumption: approximate the probability of the next word using only the previous `n - 1` words. [Source: L3 p.7]
- Under this approximation, unigram, bigram, and trigram models keep zero, one, or two previous words respectively. [Source: L3 p.7]

## Sentence Boundaries and Estimation
- The lecture introduces special start and end tags so that sentence boundaries are part of the probability calculation. [Source: L3 p.15]
- Maximum-likelihood estimation is done with corpus counts, directly paralleling the counting logic used in simpler probabilistic NLP models. [Source: L3 lecture derivation and worked examples; pp. 6-17]
- The workshop uses the same setup and explicitly defines `M` as the total token count in the corpus and `V` as vocabulary size when computing smoothed unigram, bigram, and trigram probabilities. [Source: wk3 n-gram discussion slides]

## Why Plain N-grams Break
- The lecture lists three main problems with plain n-gram models: language has long-distance effects, probabilities become extremely small, and unseen n-grams lead to zero probabilities. [Source: L3 p.17]
- Because a single zero factor collapses the whole sequence probability, smoothing is not optional in practical n-gram modelling. [Source: L3 pp. 17-18]

## Smoothing Family 1: Additive Methods
- The lecture summarises smoothing as assigning some probability mass to unseen events while still keeping the total probability mass equal to one. [Source: L3 p.18]
- Add-one (Laplacian) smoothing pretends that every n-gram has been seen one extra time. [Source: L3 p.19]
- In the lecture's bigram example, `<s>` is excluded from the vocabulary because the model never has to predict `<s>` as the next token. [Source: L3 p.20]
- The lecture then generalises add-one to add-`k` / Lidstone smoothing, where a fractional constant is added instead of one. [Source: L3 p.21]

## Smoothing Family 2: Discounting and Backoff
- Absolute discounting, as presented in the lecture, subtracts a fixed amount from observed counts and redistributes the borrowed mass to unseen n-grams. [Source: L3 pp. 23-24]
- Katz backoff uses a lower-order model to distribute the leftover probability mass rather than sharing it equally across all unseen continuations. [Source: L3 p.25]
- The lecture also shows a failure case for Katz backoff: if `reading glasses` and `reading Francisco` are both unseen, a pure lower-order model can prefer `Francisco` simply because the unigram `Francisco` is more frequent. [Source: L3 p.26]

## Kneser-Ney and Continuation Probability
- The lecture introduces Kneser-Ney smoothing as redistributing probability mass according to how versatile a continuation is across distinct contexts. [Source: L3 p.27]
- The key lower-order quantity is continuation probability: words that occur after many different predecessors receive higher lower-order probability. [Source: L3 pp. 27-28]
- The lecture contrasts `glasses` with `Francisco`: `glasses` appears after many distinct words, while `Francisco` is largely tied to `San`, so Kneser-Ney prefers `glasses` in the `reading ___` context. [Source: L3 pp. 27-28]
- The workshop explicitly asks students to compute continuation probabilities and compare unsmoothed, Laplacian, and Kneser-Ney results. [Source: wk3 KN smoothing slides]

## Interpolation
- The lecture presents interpolation as a more systematic way to combine different n-gram orders, rather than using a hard backoff decision. [Source: L3 p.29]
- In the lecture's interpolated trigram model, the trigram, bigram, and unigram components are combined with weights `lambda_3`, `lambda_2`, and `lambda_1` that sum to one and are learned on held-out data. [Source: L3 p.29]

## What the Workshop Adds
- The workshop reframes text classification and language modelling around the same representation question: how text is converted into features or counts is often the decisive modelling choice. [Source: wk3 discussion slides]
- For n-gram exercises, the workshop has students compute unsmoothed and smoothed unigram/bigram/trigram probabilities by hand before moving to backoff and Kneser-Ney, reinforcing that the formulas are operational rather than purely theoretical. [Source: wk3 n-gram discussion slides]

## Final Position of N-grams in the Subject
- The lecture calls n-gram models simple but effective ways to capture linguistic predictability. [Source: L3 p.30]
- It also stresses that they can be trained in an unsupervised way and scale to large corpora, but require smoothing and are no longer the dominant modern language-model architecture. [Source: L3 p.30]
