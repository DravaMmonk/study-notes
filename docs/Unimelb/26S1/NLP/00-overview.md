---
course: COMP90042 Natural Language Processing
semester: 2026S1
topic: Course Overview and History
source_type: lecture+reading
status: draft
review_priority: medium
---

# 00 Course Overview and History

## Big Picture

NLP studies how to process human language computationally, from basic text processing through statistical models, neural networks, transformers, and modern large language models. This overview note is the course map: it explains why language is difficult, what the course expects, and how the historical shifts lead into the later model families.
<!-- Sources: L1 p.5-6, p.14-21; Manning 2022 pp.127-132 -->

## Learning Map

- Prerequisite ideas: basic programming, probability, machine learning, and awareness that natural language is structured but ambiguous.
<!-- Sources: L1 p.5, p.23-24 -->
- Core concepts: NLP task pipeline, ambiguity, empirical evaluation, rule-based systems, statistical models, neural models, and pretrained foundation models.
<!-- Sources: L1 p.14-32; Manning 2022 pp.127-132 -->
- Main procedures: identify the language task, decide what structure must be extracted, choose a modelling family, and evaluate on realistic text data.
<!-- Sources: L1 p.14-21; Manning 2022 pp.127-132 -->
- Tutorial skills: connect a concrete NLP task to the course trajectory and explain why surface text is not enough.
<!-- Sources: L1 p.15, p.23-24 -->
- Common traps: assuming grammatical form implies meaningful content, assuming one sentence has one obvious structure, or treating LLMs as a break from earlier NLP rather than a continuation of pretraining and scaling.
<!-- Sources: L1 p.23-32; Manning 2022 pp.128-132 -->

## What NLP studies

<!-- Figure source: L1 p.14 -->

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

## Tutorial Patterns

| Pattern | What to Recognize | How to Solve | Common Mistake |
| --- | --- | --- | --- |
| Ambiguous sentence | one surface form supports multiple parses or meanings | list the competing lexical, syntactic, or semantic interpretations | choosing the first plausible reading only |
| Course-history question | asks how NLP changed over time | contrast rule-based, statistical, neural, and pretrained/LLM phases | treating deep learning as unrelated to earlier empirical NLP |
| Task identification | gives a practical language application | name the input, output, and required linguistic structure | describing the application without the modelling target |
<!-- Sources: L1 p.14-32; Manning 2022 pp.127-132 -->

## Key Comparisons

| Era | Main modelling style | Main limitation that motivates the next era |
| --- | --- | --- |
| Rule-based NLP | hand-built grammars and symbolic systems | expensive to scale and brittle outside designed domains |
| Statistical NLP | empirical models trained from corpora | feature engineering and sparse data limitations |
| Neural NLP | distributed representations and deep networks | large supervised data and architecture-specific adaptation needs |
| Pretrained / LLM era | self-supervised models adapted across tasks | alignment, grounding, hallucination, and efficient adaptation |
<!-- Sources: L1 p.26-32; Manning 2022 pp.127-132 -->

## Revision Checklist

- [ ] Can define NLP in terms of language data, algorithms, and human-language structure.
- [ ] Can explain why `I made her duck` is ambiguous.
- [ ] Can describe the four broad historical phases of NLP.
- [ ] Can connect transformers and pretrained models to earlier course topics.
<!-- Sources: L1 p.14-32; Manning 2022 pp.127-132 -->

## Active Recall

1. What kinds of structure must NLP systems recover from unstructured text?
2. Why does grammaticality not guarantee plausible meaning?
3. What changed between rule-based NLP and empirical machine-learning NLP?
4. Why are BERT and GPT considered bridge models toward LLMs?
<!-- Sources: L1 p.14-32; Manning 2022 pp.127-132 -->

## Glossary

| Term | Meaning |
| --- | --- |
| NLP | Computational processing and analysis of human language. |
| Corpus | A collection of language data used for analysis or modelling. |
| Ambiguity | Multiple plausible interpretations for the same language form. |
| Foundation model | A broadly pretrained model that can be adapted across downstream tasks. |
<!-- Sources: L1 p.14-32; Manning 2022 pp.127-132 -->
