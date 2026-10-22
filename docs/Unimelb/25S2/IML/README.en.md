# COMP90049 Introduction to Machine Learning

These notes are written for learners who are new to machine learning (semester **25S2**, [Canvas course](https://canvas.lms.unimelb.edu.au/courses/213823)). Each lecture first states the problem it sets out to solve and then works through it topic by topic: the selected slide pages are the primary reference, each screenshot comes with a note on what to look at and what it shows, and each formula with an explanation of its symbols. **Key point / Hard part / Common mistake** mark places that deserve extra attention while studying; they are not predictions of what the exam will cover. Supplementary material is listed briefly or folded away, and each note ends with self-check questions. Notes 00 and 07–15 are Chinese originals written from the slides and Apple Notes (their English translations are the `.en.md` files); notes 01–06 are earlier English originals (their Chinese translations are the `.zh.md` files) and were not rewritten this time.

## Study by module

| Module | Reading order | Skills to build |
| --- | --- | --- |
| Basic concepts | [00 Basic concepts of ML](00-ml-concepts.en.md) → [01 Probability](01-probability.md) | Tell task types and attribute types apart; use entropy and Bayes' rule |
| Classic supervised models | [02 KNN](02-KNN.md) → [03 Decision trees](03-DT.md) → [04 Naive Bayes](04-NB.md) → [05 Linear & logistic regression](05-LR.md) → [07 Optimisation](07-optimisation.en.md) → [06 SVM](06-SVM.md) | Understand each model's assumptions, training and decision boundary |
| Evaluation and features | [08 Evaluation and generalisation](08-evaluation.en.md) → [09 Feature selection](09-feature-selection.en.md) | Split data and choose metrics correctly; diagnose bias and variance |
| Neural networks | [10 Perceptron, neural networks and backpropagation](10-neural-networks.en.md) | Go from a single neuron to multilayer networks and how they are trained |
| Beyond supervised learning | [11 Unsupervised learning: clustering](11-unsupervised-learning.en.md) → [12 Semi-supervised, active learning and pre-training](12-semi-supervised-learning.en.md) | Learn with few or no labels |
| Combining and applying | [13 Ensemble learning](13-ensemble-learning.en.md) → [14 Algorithmic bias and fairness](14-bias-fairness.en.md) → [15 Anomaly detection](15-anomaly-detection.en.md) | Combine models and think about their impact in the real world |

While following the course, read lecture by lecture: files 00 and 07–15 are numbered in lecture order, while 01–06 keep the numbering of the earlier notes and do not strictly follow it (01 Probability is Lecture 4, 02 KNN is Lecture 3); when revising, read by module using the table above. The linear/logistic regression models of Lectures 7–8 are already in 05, so 07 adds only the optimisation part (objective functions, the maximum likelihood derivation, gradient descent), because 05 does not cover gradient descent. A concept that recurs across lectures is explained in detail only in its main note; other places link back to it.

| Slides (`lecture/`) | Topic | Note |
| --- | --- | --- |
| `01-introduction.pdf`, `02-mlconcepts.pdf` | Introduction, maths review, ML concepts | [00](00-ml-concepts.en.md) |
| `03-knn.pdf` | K-nearest neighbours | [02](02-KNN.md) |
| `04-probability theory and modelling.pdf` | Probability theory and probabilistic modelling | [01](01-probability.md) |
| `05-decisiontrees.pdf` | Decision trees | [03](03-DT.md) |
| `06-naivebayes.pdf` | Naive Bayes | [04](04-NB.md) |
| `07-linearregression.pdf`, `08-logisticregression.pdf` (and `.pptx`) | Linear regression, logistic regression | [05](05-LR.md) (models), [07](07-optimisation.en.md) (optimisation and gradient descent) |
| `09-svm-1.pdf`, `10-svm-2.pdf` | Support vector machines and extensions | [06](06-SVM.md) |
| `11-evaluation-1.pdf`, `12-evaluation-2.pdf` | Evaluation, generalisation, bias and variance | [08](08-evaluation.en.md) |
| `13-featureselection.pdf` | Feature selection | [09](09-feature-selection.en.md) |
| `14-perceptron.pdf`, `15_Neural_Networks.pdf`, `16-backprop.pdf` | Perceptron, multilayer perceptron, backpropagation | [10](10-neural-networks.en.md) |
| `17-academic_writing.pdf` | Academic writing (how to write the project report) | No separate note |
| `18-unsupervised.pdf` | Unsupervised learning and clustering | [11](11-unsupervised-learning.en.md) |
| `19-semisupervised.pdf` | Semi-supervised learning, active learning, data augmentation, pre-training | [12](12-semi-supervised-learning.en.md) |
| `20-ensembles.pdf` | Ensemble learning | [13](13-ensemble-learning.en.md) |
| `21-bias-fairness.pdf` | Algorithmic bias and fairness | [14](14-bias-fairness.en.md) |
| `22-anomalydetection.pdf` | Anomaly detection | [15](15-anomaly-detection.en.md) |

No tutorial or workshop materials are held locally, so there is no exercise mapping table.

## Resources and sources

- [Resource completeness](RESOURCE-STATUS.en.md): a week-by-week check on 2026-10-22 of the slides, exercises, solutions and Apple Notes held locally, listing what is missing or needs to be kept apart.
- [Resource inventory and checksums](materials.json): each file's stable source URL, SHA-256, size, PDF page count and first-page excerpt.

**Recovery of the slides.** The slides were recovered on **21 October 2026**: lecture PDFs L01–L22 plus the PowerPoint provided for L08; the Lecture 7 and 8 PDFs were found inside their Canvas pages. Weeks 6–11 cover evaluation, feature selection, perceptrons, neural networks and backpropagation, unsupervised and semi-supervised learning, ensembles, fairness and bias, and anomaly detection. The original filenames are retained; the Downloads originals were copied and preserved.

**Apple Notes import.** On 2026-10-22 the parts of the 29 notes in the Apple Notes folder CS/25S2/IML that relate to the new topics were imported, as a secondary source used to set emphasis and keep the student's own intuitions:

- Folded into new notes: ★0 Introduction, ★2 Feature Engineering, ★3 Models (→ 00); W4P2 Optimisation, ★4 Optimisation (→ 07); W6L11 Evaluation, W6L12 Generalisation, ★5 Evaluation, ★5.1 Bias vs. Variance (→ 08); W7L13 Feature Selection, ★1 Statistics (mutual information), ★3.4 Cross-Model Strategies (regularisation) (→ 09); W7L14 Perception - Neural Network I, W8L15-16 Neural Network, ★3.2 Multi-layer Perceptron, ★3.1 Classic Supervised Learning (perceptron part) (→ 10); W9L18 Unsupervised Learning and the clustering metrics of ★5 (→ 11); W10L19 Weakly supervised learning (→ 12); W10L20 Ensemble Learning, ★3.3 Ensemble Learning (→ 13); W11L21 Bias & Fairness (→ 14); W11L22 Anomaly Detection (→ 15).
- Intentionally not imported: W02L03 K-Nearest Neighbours, W02L04 Probability, W03L05 Decision Trees, W3L06 Naive Bayes, W4P1 Linear & Logistic Regression, W5P1 Support Vector Machines, W5P2 SVM Extension Strategy, and the parts of ★3.1 about those models — their topics are covered by notes 01–06, which were not modified this time; the multi-class strategies in ★3.4 (OvR, OvO, softmax) also belong to 05/06, and OvO is not in the slides. These Apple Notes contain no assignment, project or exam questions.
- Lecture 17 (academic writing) is about writing the project report and introduces no new machine-learning concepts, so it has no separate note; the exam example on Lecture 19 p.41–42 is not reproduced.

**Filenames that disagree with the content.** The cover of `15_Neural_Networks.pdf` says "Lecture 16" (the same number as `16-backprop.pdf`), and the cover of `18-unsupervised.pdf` says "Lecture 19" (the same as `19-semisupervised.pdf`). The notes are filed by filename number and course order. From p.31 on, the printed footer numbers of `01-introduction.pdf` are one ahead of the PDF page index.

**Slide errors found.** These are marked as `Extension` or `Note` in the notes, right beside the screenshot concerned: the summation limit on Lecture 8 p.40 (the sum runs over the $N$ examples, not the $F$ features); the conditional entropy and homogeneity values on Lecture 18 p.90; and the variance and z-value on Lecture 22 p.25 (recomputed, $z\approx2.99$ ). This restyling also found a few smaller issues: the counts on Lecture 2 p.35, the F1 rounding on Lecture 11 p.42, the norm on Lecture 14 p.35 (it should be $\lVert x\rVert^2=x\cdot x$ ), the swapped denominator and conditional entropy on Lecture 18 p.85, and the relative density on Lecture 22 p.41 (about 8.8, where the slide writes 9.1), each explained beside the screenshot in its note.

Slide screenshot numbers always refer to the **PDF page index**, which may differ from the printed footer number. `L07`, `L18` and so on in the notes refer to the number prefix of the file in `lecture/`, and page numbers `p.N` are PDF page indices too. A note that uses a single PDF names its screenshots `slide-XX.png`; a note that uses several names them `slide-lNN-XX.png`, with captions such as `L14 slide 12 - ...`.

| Local directory | Contents |
| --- | --- |
| `lecture/` | 22 lecture PDFs and the Lecture 8 `.pptx`, 23 files in total |
| `assets/<note name>/` | PNG screenshots of the slide pages selected for 00 and 07–15 |
| `materials.json` | Sources, checksums and page counts |

The original slides and screenshots are ignored by Git and exist only in this local checkout; they are not committed to the repository.
