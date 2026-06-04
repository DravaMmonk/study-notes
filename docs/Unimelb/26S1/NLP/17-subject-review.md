---
course: COMP90042 Natural Language Processing
semester: 2026S1
topic: Subject Review
source_type: lecture
status: draft
review_priority: high
---

# 17 Subject Review

## Big Picture

The subject review consolidates the full semester into exam-ready themes: preprocessing, n-gram language models, classification, POS tagging and HMMs, feedforward networks, recurrent networks, transformers, word embeddings, pretrained models, LLMs, prompting, PEFT, RLHF, multimodal LLMs, retrieval and knowledge augmentation, and ethics.
<!-- Sources: L23 Part 1 p.2-11; L23 Part 2 p.2-8 -->

The exam is closed book, on campus, allows a non-programmable calculator, has 120 points, and has 120 minutes writing time plus 15 minutes reading time. It contains short answer, method, and algorithm questions.
<!-- Sources: L23 Part 1 p.12-17 -->

## Learning Map

- Short-answer questions test definitions, relationships between concepts, purposes of methods, and examples.
<!-- Sources: L23 Part 1 p.14 -->
- Method questions test analysis, comparisons, algorithm/application understanding, modelling motivation, and mathematical explanation or derivation.
<!-- Sources: L23 Part 1 p.15 -->
- Algorithm questions test numerical computation on given examples or algorithm outlines on self-chosen examples.
<!-- Sources: L23 Part 1 p.16 -->
- Coverage is expected to be even across the semester, including topics not already assessed by assignments or the project.
<!-- Sources: L23 Part 1 p.17 -->

## Topic Checklist

| Topic | Must be able to do |
| --- | --- |
| Preprocessing | explain segmentation, tokenisation, subword tokenisation, normalisation, morphology, lemmatisation, stemming, and stopwords |
| N-gram LMs | derive sequence probabilities and explain add-k, absolute discounting, Katz backoff, Kneser-Ney, and interpolation |
| Classification | build a classifier workflow and compare NB, LR, SVM, kNN, and neural networks |
| POS/HMM | explain tagsets, automatic taggers, emission/transition probabilities, training, Viterbi, and generative vs discriminative models |
| Feedforward networks | formulate FF models and design them for classification, language modelling, and POS tagging |
| RNNs | explain RNN LMs, LSTM gates, variants, text classification, and POS tagging |
| Transformer | explain Q/K/V attention, transformer blocks, and positional embeddings |
| Word embeddings | explain VSM, TF-IDF, PMI/PPMI, SVD, skip-gram, CBOW, and evaluation |
| Pretrained models | compare GPT, BERT, and T5 by architecture, objective, and pros/cons |
<!-- Sources: L23 Part 1 p.2-11 -->

| Later topic | Must be able to do |
| --- | --- |
| LLMs | compare GPT-1/2/3 and explain in-context learning |
| Prompting | explain prompting, chain-of-thought, and instruction fine-tuning |
| PEFT | compare parameter, input, and function composition; explain LoRA |
| RLHF | explain SFT, reward modelling, Bradley-Terry loss, PPO, and DPO |
| Multimodal LLMs | explain modality encoders, projectors, LLM backbones, tuning, and distillation |
| Retrieval/KG | explain RAG, RETRO, datastore design, knowledge graphs, and KG-CoT |
| Ethics | discuss law vs ethics, consent, bias, stereotypes, and misclassification cost |
<!-- Sources: L23 Part 2 p.2-8 -->

## Exam Strategy

### Short answer

Answer short questions with a definition, one key contrast or purpose, and a concrete example when requested.
<!-- Sources: L23 Part 1 p.14 -->

### Method questions

Use method questions to show understanding: compare alternatives, explain assumptions, motivate model choice, and interpret formulas rather than only naming methods.
<!-- Sources: L23 Part 1 p.15 -->

### Algorithm questions

For algorithmic questions, write the recurrence or computational rule, apply it step by step to the given example, and state the final answer with enough intermediate work to be checkable.
<!-- Sources: L23 Part 1 p.16 -->

## Tutorial Patterns

| Pattern | What to Recognize | How to Solve | Common Mistake |
| --- | --- | --- | --- |
| Definition prompt | asks "what is X?" | define X and state why it matters | giving only an example |
| Compare methods | asks "relate X and Y" | contrast assumptions, inputs, outputs, and trade-offs | listing facts without comparison |
| Formula derivation | asks to explain equation | define variables and modelling assumptions | copying formula without interpretation |
| Algorithm computation | gives toy data | compute carefully and show intermediate state | skipping boundary cases or smoothing |
<!-- Sources: L23 Part 1 p.14-16 -->

## Key Comparisons

| Exam part | Expected answer style | Preparation focus |
| --- | --- | --- |
| Short answer | concise definition, concept relation, or example | terminology and clean explanations |
| Method | longer analysis or comparison | assumptions, trade-offs, motivations, formulas |
| Algorithm | computation or algorithm outline | step-by-step practice on toy data |
<!-- Sources: L23 Part 1 p.14-16 -->

## Revision Checklist

- [ ] Can explain every topic in the topic checklist without notes.
- [ ] Can compute n-gram probabilities with smoothing.
- [ ] Can run Viterbi-style dynamic programming on a small example.
- [ ] Can compare neural architecture families.
- [ ] Can compare adaptation methods from prompting to DPO.
- [ ] Can discuss ethics with stakeholders and harms.
<!-- Sources: L23 Part 1 p.2-17; L23 Part 2 p.2-8 -->

## Active Recall

1. What is the difference between a short-answer and method question?
2. Which topics require numerical computation practice?
3. How do GPT, BERT, and T5 differ?
4. How do PEFT, RLHF, DPO, and RAG differ as adaptation strategies?
5. Why should ethics questions include social context?
<!-- Sources: L23 Part 1 p.2-17; L23 Part 2 p.2-8 -->

## Glossary

| Term | Meaning |
| --- | --- |
| Short answer | Brief definitional or conceptual question. |
| Method question | Longer analytical question about methods, assumptions, or applications. |
| Algorithm question | Question requiring computation or algorithm outline. |
| Even coverage | Exam expectation that semester topics are broadly represented. |
<!-- Sources: L23 Part 1 p.12-17 -->
