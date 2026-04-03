# 00 Course Overview and History

## What NLP studies

- Natural language processing is an interdisciplinary area spanning linguistics, computer science, and artificial intelligence.
<!-- Sources: L1 p.14 -->
- Its central goal is to design algorithms that process and analyse human language data.
<!-- Sources: L1 p.14 -->
- Large amounts of information are trapped in unstructured text, so useful systems must identify structure, salient elements, and relations before they can reason over that text.
<!-- Sources: L1 p.15 -->

## Course trajectory up to L11

- The first block covers text preprocessing, n-gram language models, and text classification.
<!-- Sources: L1 p.20 -->
- The next block moves to sequence tagging and then to feedforward, recurrent, and transformer architectures.
<!-- Sources: L1 p.20 -->
- The modern block covers pretrained and large language models, prompting, post-training, multimodal models, and retrieval-augmented generation.
<!-- Sources: L1 p.21 -->

## Working expectations

- The stated expectations include developing Python skills, keeping up with readings, and participating through lectures or the discussion board.
<!-- Sources: L1 p.5 -->
- The stated outcomes include practical familiarity with text-analysis technologies, understanding of the models behind them, and the ability to read research literature.
<!-- Sources: L1 p.5 -->
- Lecture and workshop materials are both examinable.
<!-- Sources: L1 p.6 -->

## Core language difficulty

- A short sentence such as `I made her duck` can be ambiguous in lexical category, pronoun function, and argument structure at the same time.
<!-- Sources: L1 p.23-24 -->
- In that example, `duck` can be a noun or a verb, `her` can be dative or possessive, and `make` can appear in more than one syntactic frame.
<!-- Sources: L1 p.24 -->
- Long-context tasks, misinformation, hallucination, stereotyping, and bias remain active challenges even in modern systems.
<!-- Sources: L1 p.32 -->

## Historical timeline

| Era | Main ideas highlighted in the course materials |
| --- | --- |
| 1950s | Turing's conversational test, Chomsky's formal language theory, and the distinction between syntax and semantics |
| 1960s-1970s | Symbolic grammar and parsing, Bayesian methods for OCR and authorship attribution, Brown Corpus |
| 1970s-1980s | Hidden Markov models, noisy-channel decoding, speech systems, SHRDLU and blocks-world understanding |
| 1980s-1990s | Finite-state methods, return of empiricism, held-out evaluation, probabilistic IBM-style approaches |
| 1990s-2000s | More compute, more corpora, and machine-learning models such as logistic regression and SVMs |
| 2000s onward | Deep neural networks, reduced feature engineering, GPU scaling, and the path toward large language models |
<!-- Sources: L1 p.26-31 -->

- `Colorless green ideas sleep furiously` is used as a classic example of grammatical form without plausible meaning.
<!-- Sources: L1 p.26 -->
- The Brown Corpus is described as a 1 million word corpus of 500 documents from different genres.
<!-- Sources: L1 p.27 -->

## Four-era history

| Era | Characterisation |
| --- | --- |
| 1950-1969 | Early machine translation and early AI |
| 1970-1992 | Hand-built rule-based understanding systems |
| 1993-2012 | Empirical machine learning over large text collections |
| 2013-present | Deep learning and then large-scale self-supervised language models |
<!-- Sources: Manning 2022 pp.127-129 -->

- The Georgetown-IBM machine translation demonstration in 1954 slightly predates the coining of `artificial intelligence` in 1956.
<!-- Sources: Manning 2022 pp.127-128 -->
- The post-2018 phase is characterised by very large self-supervised models trained on massive unlabeled text collections.
<!-- Sources: Manning 2022 pp.128-129 -->

## Bridge to later lectures

- The transformer is the dominant modern model family for NLP applications.
<!-- Sources: Manning 2022 p.130 -->
- Pretrained language models such as BERT and GPT are early examples of foundation models that can be adapted to many downstream tasks.
<!-- Sources: Manning 2022 pp.127, 132 -->
