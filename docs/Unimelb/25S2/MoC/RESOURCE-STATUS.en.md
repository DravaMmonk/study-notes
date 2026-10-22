# COMP30026 Resource Completeness

Check date: **2026-10-22**. The slides were recovered from Canvas on 2026-10-21 and the student's notes were imported from Apple Notes on 2026-10-22; this pass restyled the 13 notes in the COMP90086 format and re-rendered and inspected all 23 PDFs one by one. Weeks are inferred at two lectures per week, which agrees with the file names `w6l*`, `w8l*`, `w10l1`, `w11l*` and `w12l1`.

| Week | Lectures | Slides PDF | Tutorial | Solutions | Apple Notes | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | L01–L02 | 2 (`01.pdf`, `02.pdf`) | not held locally | not held locally | Lec01-02 Basic Concepts | [01](01-introduction.en.md), [02](02-propositional-logic.en.md) |
| 2 | L03–L04 | 2 (`03.pdf`, `04.pdf`) | not held locally | not held locally | Lec03 Formula, Equivalence Cheatsheet, ★1 Resolution & Refutation | [02](02-propositional-logic.en.md), [03](03-resolution.en.md) |
| 3 | L05–L06 | 2 (`05.pdf` spans two notes, `06.pdf`) | not held locally | not held locally | LEC05-06 Predicate Logic | [03](03-resolution.en.md), [04](04-predicate-logic.en.md) |
| 4 | L07–L08 | 2 (`07.pdf`, `08.pdf`) | not held locally | not held locally | LEC07 Languages, ★2 Resolution for Predicate Logic | [04](04-predicate-logic.en.md) |
| 5 | L09–L10 | 2 (`09.pdf`, `10.pdf`) | not held locally | not held locally | LEC09 Unification, LEC10 Automated Reasoning | [05](05-unification-automated-reasoning.en.md) |
| 6 | L11–L12 | 2 (`w6l1-slides.pdf`, handwritten `w6l2-slides.pdf`) | not held locally | not held locally | LEC11-12 Finite Automata | [06](06-finite-automata.en.md) |
| 7 | L13–L14 | 2 (`13.pdf`, `14.pdf`) | not held locally | not held locally | LEC13, LEC14 | [07](07-nfa-determinisation-minimisation.en.md), [08](08-regular-expressions.en.md) |
| 8 | L15–L16 | 2 (handwritten `w8l1-slides.pdf`, `w8l2-slides.pdf`) | not held locally | not held locally | LEC15-16 Proving Non-regularity | [09](09-non-regularity.en.md) |
| 9 | L17–L18 | 1 (`16.pdf`, actually L18); **L17 missing** | not held locally | not held locally | LEC17-18 Context-free Language & Pushdown Automaton | [10](10-cfl-pda.en.md) |
| 10 | L19–L20 | 2 (handwritten `w10l1part1.pdf` and `Lecture 19 Part 2`, both L19); **L20 missing** | not held locally | not held locally | LEC19 Turing Machine, LEC20 Church-Turing Thesis | [10](10-cfl-pda.en.md), [11](11-turing-machines.en.md) |
| 11 | L21–L22 | 2 (handwritten `w11l1.pdf`, `w11l2.pdf`) | not held locally | not held locally | LEC21-22 Universality of Turing Machines | [12](12-decidability-universality.en.md) |
| 12 | L23–L24 | 2 (handwritten `w12l1.pdf`, `Lecture 24.pdf`) | not held locally | not held locally | LEC23-24 Identify Unrecognisable Problems, ★ Review | [13](13-unrecognisable-reductions.en.md) |

There are **23 lecture PDFs** stored locally, covering 22 of the 24 lectures; 20 Apple Notes have been merged into the notes ("★3 Languages" spans notes 10, 12 and 13). The 13 notes use **242** selected slide screenshots, each with an explanation alongside.

## Items that are incomplete or need to be kept apart

- **Lecture 17 has no local slides**: the lecture used [Sipser's CFG/PDA slides (external PowerPoint)](https://math.mit.edu/~sipser/18404/Lectures%20Fall%202020/Lecture%204%20final.pptx), which were not downloaded. The grammar definitions in section 2 of [note 10](10-cfl-pda.en.md) rely on the student's notes and the review pages at the start of Lecture 18, and are marked as limited coverage.
- **Lecture 20 has no local slides**: the [Canvas file](https://canvas.lms.unimelb.edu.au/courses/215477/files/25195591) can be listed and previewed, but the download repeatedly timed out. Section 6 of [note 11](11-turing-machines.en.md) (multi-tape TMs, nondeterministic TMs, encodings) relies only on the student's notes and could not be checked against the slides.
- [Official companion notes and lecture schedule (web)](https://williamumboh.com/comp30026-2025/): the supplementary lecture-note module items link to William Umboh's course website; they are web resources, not missing PDF attachments, and were not mirrored in this pass.
- No tutorials, workshops, solutions, recordings or transcripts are held locally, so the notes have no exercise map and no verifiable lecturer quotations.
- File names that do not match content: the first page of `16.pdf` is Lecture 18; `w10l1part1.pdf` is the first half of Lecture 19, not Lecture 17; pages 1–54 of `05.pdf` are a review (filed under note 3) and predicate logic starts on pages 56–69 (filed under note 4).
- Pages 16–17 of `Lecture 24.pdf` carry a Semester 2, 2023 review-lecture footer: they are older pages folded into this semester's deck. Pages 12–15 are reading suggestions, exam preparation, the course survey and a closing slide, and were not selected.
- The semantics pages 44–55 of `06.pdf` reappear in `07.pdf`; note 4 uses only the L07 versions.
- Slips in the slides and errors in the student's notes found during this pass are listed in the "Problems found in the slides and the student's notes" section of the [course index](README.en.md); the original files are unchanged.
- The "Assignment 1" Apple Note is assignment content and was not imported into the public repository.

## Sync and verification

- Each of the **23 PDFs** listed in [materials.json](materials.json) was hashed with `shasum -a 256`; SHA-256, byte size and page count all match the inventory.
- All 23 PDFs are readable by `pdfinfo`; text was extracted with `pdftotext -layout` and every page was rendered with `pdftoppm -png -r 110` and inspected visually; the handwritten board notes (`w*.pdf`, pages 2–11 of L24) were read as images. For animated decks only the most complete build of each slide was selected.
- Every screenshot referenced by a note exists under `assets/<note name>/`, and no unreferenced image is left in those directories; superseded or renamed screenshots were moved to a temporary directory rather than kept in the course directory.
- The Chinese and English notes were compared note by note for title, number of headings at each level, anchors, image order, number of source comments and balanced `$$` fences.

## Sources and storage locations

- [Canvas course](https://canvas.lms.unimelb.edu.au/courses/215477)
- [Course notes index](README.en.md)
- [Material inventory and checksums](materials.json)

`lecture/` holds the lecture PDFs and `assets/` the selected screenshots; both are ignored by Git and exist only in this local checkout.
