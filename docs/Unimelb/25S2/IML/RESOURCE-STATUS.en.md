# COMP90049 Resource Completeness

Check date: **2026-10-22**. The slides were recovered from Canvas on 2026-10-21; the Apple Notes were imported on 2026-10-22. The slide PDFs do not print a week number, so the weeks below are inferred from the `Wn` prefixes in the Apple Notes titles and the order of two lectures per week.

| Week | Slides | Tutorial | Solutions | Apple Notes |
| --- | --- | --- | --- | --- |
| 1 | L01, L02 | None | None | No weekly note; the topic note ★0 Introduction is folded into [00](00-ml-concepts.en.md) |
| 2 | L03, L04 | None | None | W02L03, W02L04 (not imported; topics covered by [02](02-KNN.md), [01](01-probability.md)) |
| 3 | L05, L06 | None | None | W03L05, W3L06 (not imported; topics covered by [03](03-DT.md), [04](04-NB.md)) |
| 4 | L07, L08 (PDF and `.pptx`) | None | None | W4P1 (not imported); W4P2 → [07](07-optimisation.en.md) |
| 5 | L09, L10 | None | None | W5P1, W5P2 (not imported; topics covered by [06](06-SVM.md)) |
| 6 | L11, L12 | None | None | W6L11, W6L12 → [08](08-evaluation.en.md) |
| 7 | L13, L14 | None | None | W7L13 → [09](09-feature-selection.en.md); W7L14 → [10](10-neural-networks.en.md) |
| 8 | L15, L16 | None | None | W8L15-16 → [10](10-neural-networks.en.md) |
| 9 | L17, L18 | None | None | W9L18 → [11](11-unsupervised-learning.en.md); no note for L17 |
| 10 | L19, L20 | None | None | W10L19 → [12](12-semi-supervised-learning.en.md); W10L20 → [13](13-ensemble-learning.en.md) |
| 11 | L21, L22 | None | None | W11L21 → [14](14-bias-fairness.en.md); W11L22 → [15](15-anomaly-detection.en.md) |
| No week | — | — | — | 11 topic notes ★0–★5.1; the parts relevant to the new topics are folded into 00 and 07–15 |

There are now **22 slide PDFs and 1 PowerPoint file** (Lecture 8) stored locally, plus text exports of the 29 Apple Notes (kept in the working scratch directory, not in the course directory). Notes 00 and 07–15 use **234** selected slide screenshots, each with an explanation alongside.

## Items that are incomplete or need to be kept apart

- **No tutorials, workshops or their solutions.** This recovery downloaded only the slides; the course directory has no `tutorial/` or `workshop/`. Exercises in the notes are my own or come from examples in the slides.
- **No lecture transcripts, assignments, project specifications or exam materials.** The notes therefore quote no lecturer speech and touch no assignment or exam questions.
- **Filenames that disagree with cover numbers**: the cover of `15_Neural_Networks.pdf` says Lecture 16, and the cover of `18-unsupervised.pdf` says Lecture 19. Files are filed by their filename number and were not renamed. From p.31 on, the footer numbers of `01-introduction.pdf` are one ahead of the PDF page index.
- **Lecture 8 has both a PDF and a `.pptx`**: the notes use only the PDF pages; the two were not compared page by page.
- **Lecture 17 (academic writing)** is about writing the project report and has no separate note.
- **Lecture 19 p.41–42** are exam-style example questions; the note only mentions that they exist and does not reproduce them.
- **Problems in slide numbers**: the errors on Lecture 8 p.40, Lecture 18 p.90 and Lecture 22 p.25, and smaller issues on Lecture 2 p.35, Lecture 11 p.42, Lecture 14 p.35, Lecture 18 p.85 and Lecture 22 p.41, are each explained beside the screenshot in the relevant note (see the [README](README.en.md)).
- **Apple Notes not imported**: W02L03, W02L04, W03L05, W3L06, W4P1, W5P1, W5P2, and the parts of ★3.1 and ★3.4 within the scope of 01–06. Notes 01–06 are earlier English originals; this time they received no screenshots and were not restyled.
- **Readings**: the references on the final slides were not downloaded or collected separately.

## Sync and verification

- On 2026-10-22 the **23 files** listed in [materials.json](materials.json) were checked one by one with `shasum -a 256 -c`: all match, with no missing or extra files.
- All 22 PDFs can be read with `pdfinfo`, and their page counts match `materials.json`; the selected pages were rendered with `pdftoppm` and inspected by eye. Slides with small 363 × 272 pt pages were rendered at 220 dpi and the rest at 110 dpi, giving screenshots about 1100–1470 px wide.
- The `.pptx` was only checksum-verified, not opened or rendered.
- The slides and screenshots are ignored by Git and exist only in this local checkout.
