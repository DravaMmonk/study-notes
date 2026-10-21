# Historical course materials recovery

Recovered from the student’s authenticated Canvas access on **21 October 2026 (Australia/Melbourne)**. This records source-material recovery only; it does not claim Apple Notes were imported, existing notes were verified, or new lecture notes were written.

Raw materials remain local under the existing ignored `lecture/` and `tutorial/` directories. The tracked per-course `materials.json` files record stable Canvas file URLs, SHA-256 hashes, byte counts, PDF page counts and first-page excerpts. Signed download tokens and authentication data are excluded. Original Downloads files were preserved.

| Term | Subject | Local files | PDFs | Lecture directory |
| --- | --- | ---: | ---: | --- |
| 25S1 | [COMP90038 — Algorithms and Complexity](25S1/Alg/README.md) | 62 | 62 | `25S1/Alg/lecture/` |
| 25S1 | [INFO90002 — Database Systems & Information Modelling](25S1/DB/README.md) | 47 | 39 | `25S1/DB/lecture/` |
| 25S1 | [COMP90007 — Internet Technologies](25S1/IT/README.md) | 26 | 26 | `25S1/IT/lecture/` |
| 25S1 | [COMP90041 — Programming and Software Development](25S1/Java/README.md) | 15 | 15 | `25S1/Java/lecture/` |
| 25S2 | [COMP90054 — AI Planning for Autonomy](25S2/AIP/README.md) | 4 | 4 | `25S2/AIP/lecture/` |
| 25S2 | [COMP90049 — Introduction to Machine Learning](25S2/IML/README.md) | 23 | 22 | `25S2/IML/lecture/` |
| 25S2 | [COMP30026 — Models of Computation](25S2/MoC/README.md) | 23 | 23 | `25S2/MoC/lecture/` |

**Total: 200 files**, including 191 PDFs. All copied bytes were checked against their Downloads originals. All PDFs passed `pdfinfo`; PowerPoint files were checked as Office ZIP containers.

## Coverage and exceptions

- **COMP90038:** Recovered lecture PDFs cover L01–L22, including the available pre-class and after-class versions. Tutorial questions and solutions cover Weeks 2–12. The extra Philip Cervenjak tutorial slide decks were not archived: the Week 3 PDF download timed out, and the remaining optional decks were deferred after the core handouts were recovered.
- **INFO90002:** Recovered lecture material covers introduction, ER modelling, keys/logical/physical design, data types, normalisation, SQL, transactions/concurrency, administration/architecture, distributed databases, data warehousing, JSON/NoSQL, security and web applications. Tutorial resources cover Weeks 1–12; the Week 3 solution download timed out. Lecture 6 and Lecture 12 are not missing lecture PDFs: their module entries say that the scheduled sessions were quizzes with no lecture. Original filenames sometimes retain an earlier week number; Canvas page placement and document content take precedence over filename guesses.
- **COMP90007:** Recovered all 26 file links visible on the Week 1–7 and Week 9–12 lecture pages, including worked-example solutions and revision material. Week 7 explicitly reuses W6-L3; its other two lectures were cancelled. No Week 8 lecture entry was present in the expanded module list. Tutorial pages were outside the requested lecture-PDF scope.
- **COMP90041:** Recovered all 12 weekly lecture decks, UML problem/solution material and the Week 12 Poll Everywhere questions. The Week 11 module label omits the PDF extension, but the downloaded document is a valid PDF.
- **COMP90054:** Recovered the introduction slides, two separately published Search pre-handouts, and the Week 5 delete-relaxation handout. Other listed pre-handouts (Weeks 3, 4 and 6) repeatedly timed out when downloaded. Weeks 2 and 3 also link to post-handouts; a direct attempt on the Week 2 link returned ERR_BLOCKED_BY_CLIENT. These are acquisition failures, not evidence that the files are absent. The Week 6 page labels one attachment intro05-pre-handout.pdf; its topic must be checked before any future renaming. Weeks 7–12 link to the official reinforcement-learning website and videos rather than standalone Canvas slide PDFs; these web resources have not been converted to local PDFs.
- **COMP90049:** Recovered lecture PDFs L01–L22 plus the provided L08 PowerPoint. This includes Weeks 6–11: evaluation, feature selection, perceptrons, neural networks/backpropagation, unsupervised and semi-supervised learning, ensembles, fairness/bias, and anomaly detection. Lecture 7 and 8 PDFs were found inside their Canvas pages. Existing repository notes have not yet been compared against these sources or expanded.
- **COMP30026:** Recovered slides for L01–L16, L18, L19 (two parts), and L21–L24. The file named 16.pdf is actually Lecture 18 Pushdown Automata according to its first page. L17 uses the linked Sipser CFG/PDA PowerPoint rather than a local numbered PDF; that external file was not downloaded. L20 was listed and previewable, but its download repeatedly timed out. Supplementary lecture-note module items link to William Umboh’s course website; they are web resources, not missing PDF attachments.

The acquisition failures above are browser download failures. They do not prove that Canvas removed the content or revoked access. No alternate academic year or unrelated public course was substituted.

## Validation

All 200 manifest entries were checked against the archived files and their Downloads originals. The 191 PDFs passed `pdfinfo`; the PowerPoint archive structure was valid. Total local resource size is approximately 161.9 MiB. `mkdocs build` completed successfully; it reported existing missing-image warnings in ADBS/SPM, existing CV topic anchor messages and existing absolute links in the NLP index. None of those files were edited in this recovery.
