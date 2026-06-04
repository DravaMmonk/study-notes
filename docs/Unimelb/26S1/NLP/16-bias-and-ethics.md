---
course: COMP90042 Natural Language Processing
semester: 2026S1
topic: Bias and Ethics
source_type: lecture+reading
status: draft
review_priority: high
---

# 16 Bias and Ethics

## Big Picture

Ethics in NLP is about the relationship between language technologies, people, and social consequences. Legal permission is not enough: public data, model predictions, and deployment choices can still violate consent, social expectations, privacy, fairness, or safety.
<!-- Sources: L22 p.1-15; EACL Ethics Tutorial slides 6-70; Benotti et al. 2023 abstract -->

The lecture uses bias, misclassification, public data, word embeddings, and text-to-image generation to show that NLP systems can reproduce and amplify social stereotypes. Ethical analysis therefore needs to ask who benefits, who is harmed, who consented, and who is responsible.
<!-- Sources: L22 p.15-25; EACL Ethics Tutorial slides 40-70 -->

## Learning Map

- Prerequisite ideas: classification, embeddings, LLMs, training data, evaluation, and deployment.
<!-- Sources: L22 p.15-25 -->
- Core concepts: law vs ethics, consent, public vs publicised data, social contract, representativeness, stereotypes, bias amplification, misclassification cost, and ethical responsibility.
<!-- Sources: L22 p.3-25; EACL Ethics Tutorial slides 6-70 -->
- Main procedures: identify stakeholders, benefits, harms, consent issues, dataset gaps, misuse risks, and responsibility.
<!-- Sources: L22 p.10-20; EACL Ethics Tutorial slides 86-99; Benotti et al. 2023 abstract -->
- Common traps: equating legal with ethical, ignoring social context, or evaluating only average accuracy when misclassification harms are uneven.
<!-- Sources: L22 p.3-25; EACL Ethics Tutorial slides 40-70 -->

## Core Concepts

### Law vs ethics

Laws are written rules with formal punishment; ethics are guiding moral principles and values that can be unwritten, socially enforced, and context-dependent.
<!-- Sources: L22 p.3-7 -->

Ethical questions often have grey areas and can change with social values over time. A system can be legal while still being ethically problematic.
<!-- Sources: L22 p.7-10; EACL Ethics Tutorial slides 6-39 -->

### Language technologies and people

Language is not only about words and meanings; NLP systems affect people and societies through data collection, modelling, deployment, and interpretation decisions.
<!-- Sources: L22 p.5-7; EACL Ethics Tutorial slides 40-70 -->

Ethical review should connect technical choices to real-world consequences, especially when models are used for sensitive classifications or social decisions.
<!-- Sources: L22 p.10-15; Benotti et al. 2023 abstract -->

### Consent and public data

Using online data can be legal but still ethically problematic if people did not consent to the specific use. Public availability does not imply that data was intended to be publicised, analysed, or used for sensitive inference.
<!-- Sources: L22 p.15-20; EACL Ethics Tutorial slides 40-70 -->

Dataset representativeness matters because gaps in population coverage can produce biased or misleading model behaviour.
<!-- Sources: L22 p.15-20; EACL Ethics Tutorial slides 40-70 -->

### Bias in embeddings and generation

Word embeddings can reflect and amplify gender stereotypes, as analogy structure may encode associations such as men with programmers and women with housekeepers, or fathers with doctors and mothers with nurses.
<!-- Sources: L22 p.21-23 -->

Text-to-image generation can also express bias because image outputs depend on stereotypes and distributions learned from training data.
<!-- Sources: L22 p.23-24 -->

### Misclassification cost

Misclassification costs depend on social context. A model can have good aggregate performance while still causing serious harm to particular groups or individuals.
<!-- Sources: L22 p.24-25; EACL Ethics Tutorial slides 40-70 -->

## Methods and Workflows

### Ethical risk checklist

1. Identify who benefits from the system.
2. Identify who can be harmed and how.
3. Check consent and intended use of data.
4. Check whether the dataset is representative.
5. Identify misuse risks.
6. Identify who is responsible across researchers, developers, managers, institutions, and society.
<!-- Sources: L22 p.10-20; EACL Ethics Tutorial slides 86-99 -->

### Bias analysis workflow

1. Inspect the data source and label distribution.
2. Look for social stereotypes in text, embeddings, or generated outputs.
3. Evaluate performance and harms across groups.
4. Consider whether the task should be built at all.
5. Document ethical considerations and mitigation limits.
<!-- Sources: L22 p.15-25; EACL Ethics Tutorial slides 40-99 -->

## Tutorial Patterns

| Pattern | What to Recognize | How to Solve | Common Mistake |
| --- | --- | --- | --- |
| Public dataset scenario | data is visible online but sensitive | ask about consent, publicised use, social contract, and representativeness | saying legal access is sufficient |
| Sensitive classifier | predicts traits from photos/text | identify beneficiaries, harms, misuse, and responsibility | evaluating only predictive accuracy |
| Embedding bias | analogy reveals stereotype | explain learned social association and amplification | treating vector arithmetic as neutral truth |
| Misclassification cost | errors affect groups unevenly | evaluate harm in social context | assuming all false positives/negatives are equal |
<!-- Sources: L22 p.10-25; EACL Ethics Tutorial slides 40-99 -->

## Key Comparisons

| Concept | Meaning | Course implication |
| --- | --- | --- |
| Legal | permitted by rules | necessary but not sufficient |
| Ethical | consistent with values, consent, and social responsibility | requires stakeholder and harm analysis |
| Public | accessible to others | does not imply consent for all uses |
| Publicised | actively exposed or amplified | can violate expectations even if source was public |
<!-- Sources: L22 p.3-20; EACL Ethics Tutorial slides 6-70 -->

## Revision Checklist

- [ ] Can distinguish law from ethics.
- [ ] Can explain public vs publicised data.
- [ ] Can identify ethical risks in a sensitive classifier.
- [ ] Can explain bias amplification in embeddings.
- [ ] Can discuss why misclassification costs are socially contextual.
<!-- Sources: L22 p.3-25; EACL Ethics Tutorial slides 6-99 -->

## Active Recall

1. Why is legal data use not automatically ethical?
2. Who might be harmed by a classifier predicting sensitive traits?
3. How can word embeddings encode gender stereotypes?
4. Why is average accuracy insufficient for ethical evaluation?
5. What should an ethics section in NLP research consider?
<!-- Sources: L22 p.3-25; EACL Ethics Tutorial slides 40-99; Benotti et al. 2023 abstract -->

## Glossary

| Term | Meaning |
| --- | --- |
| Ethics | Guiding moral principles and values about what is right or good. |
| Consent | Permission for a particular data use or interaction. |
| Bias | Systematic skew in data, model behaviour, or outcomes. |
| Misclassification cost | Harm caused by incorrect predictions. |
| Social contract | Shared expectation about how public behaviour or data will be used. |
<!-- Sources: L22 p.3-25; EACL Ethics Tutorial slides 6-70 -->
