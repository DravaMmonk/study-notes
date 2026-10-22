# COMP30026 Models of Computation

Semester: **25S2**. [Canvas course](https://canvas.lms.unimelb.edu.au/courses/215477). Lecturers: Cezary Kaliszyk and William Umboh.

These notes are written for students meeting logic and the theory of computation for the first time. Each note first states the question its lectures answer and then follows the slide order: **the selected slide pages are the primary reference**, and every screenshot is followed directly by an explanation of where to look and what the states, arrows, tables or derivations in it show; tables, Mermaid diagrams and hand traces are kept only where they add something the slides do not develop. **Key points / Hard parts / Common mistakes** mark places that deserve extra attention while studying; they are not predictions of exam coverage. The student's Apple Notes are a secondary source, examples of our own and material beyond the course are marked separately, optional extensions are folded away, and each note ends with self-check questions.

## Study by module

| Module | Reading order | Skills to build |
| --- | --- | --- |
| Introduction | [01 Introduction](01-introduction.en.md) | The idea of encoding a problem in logic and asking about satisfiability |
| Propositional logic and mechanical proof | [02 Propositional logic](02-propositional-logic.en.md) → [03 Resolution](03-resolution.en.md) | Analyse formulas with truth tables and equivalence laws; convert to CNF; prove by resolution refutation |
| Predicate logic and automated reasoning | [04 Predicate logic](04-predicate-logic.en.md) → [05 Unification and automated reasoning](05-unification-automated-reasoning.en.md) | Translate English sentences; evaluate truth in a model; Skolemise; compute mgus and resolve predicate clauses |
| Regular languages | [06 Finite automata](06-finite-automata.en.md) → [07 Determinisation and minimisation](07-nfa-determinisation-minimisation.en.md) → [08 Regular expressions](08-regular-expressions.en.md) → [09 Proving non-regularity](09-non-regularity.en.md) | Design DFAs/NFAs, convert between the three representations, prove non-regularity with fooling sets and closure |
| Context-free languages | [10 CFGs and PDAs](10-cfl-pda.en.md) | Write grammars, spot ambiguity, design pushdown automata |
| Computability | [11 Turing machines](11-turing-machines.en.md) → [12 Universality and undecidability](12-decidability-universality.en.md) → [13 Reductions and unrecognisability](13-unrecognisable-reductions.en.md) | Tell recognisable from decidable; prove impossibility by diagonalisation, reductions and closure |

Follow the course in file order 01–13 (see "Lectures, PDFs and notes" below for how file numbers map to lectures); when revising, read by module using the table above, or start from [the summary tables and review map in note 13](13-unrecognisable-reductions.en.md#topic-5). A concept that recurs across lectures is explained in detail in one place only, and other places link back to it. There are no local tutorial or workshop materials, so there is no exercise map.

## Resources and sources

- [Resource completeness](RESOURCE-STATUS.en.md): checked on 2026-10-22; lists, lecture by lecture, the local slides, Apple Notes and the materials not yet obtained.
- [materials.json](materials.json): each file's Canvas source URL, SHA-256, size, page count and first-page excerpt.

On 21 October 2026, slides were recovered for Lectures 1–16 and 18, Lecture 19 (two parts) and Lectures 21–24; the original file names are retained. Lectures 17 and 20 have no local slides: the grammar part of note 10 and section 6 of note 11 follow the Apple Notes and are marked as limited coverage.

Slide screenshot numbers always refer to the **PDF page index**, which may differ from the printed footer number: the L01–L14 and L18 decks build each slide up over several animation pages, so screenshots use the most complete build of each slide and page indices run far ahead of the footer numbers; the `w*.pdf` files and pages 2–11 of L24 are handwritten board notes from class, and screenshots likewise use the completed page. A note drawing on one PDF names its files `slide-XX.png`; a note drawing on several uses `slide-<short>-XX.png` (e.g. `slide-l18-21.png`, `slide-w11l2-07.png`), and the image captions carry the same short name.

### Lectures, PDFs and notes

| Lecture | Topic | Local PDF | Note |
| --- | --- | --- | --- |
| L01 | Introduction | `lecture/01.pdf` | [01](01-introduction.en.md) |
| L02–L03 | Propositional logic; consequence and satisfaction | `lecture/02.pdf`, `03.pdf` | [02](02-propositional-logic.en.md) |
| L04–first half of L05 | Resolution; review | `lecture/04.pdf`, `05.pdf` pages 1–54 | [03](03-resolution.en.md) |
| Second half of L05–L08 | Predicate logic: syntax, semantics, clausal form | `lecture/05.pdf` pages 56–69, `06.pdf`, `07.pdf`, `08.pdf` | [04](04-predicate-logic.en.md) |
| L09–L10 | Unification and resolution; automated reasoning | `lecture/09.pdf`, `10.pdf` | [05](05-unification-automated-reasoning.en.md) |
| L11–L12 | Introduction to finite automata; operations on languages; NFAs | `lecture/w6l1-slides.pdf`, `w6l2-slides.pdf` | [06](06-finite-automata.en.md) |
| L13 | NFA determinisation and minimisation | `lecture/13.pdf` | [07](07-nfa-determinisation-minimisation.en.md) |
| L14 | Regular expressions | `lecture/14.pdf` | [08](08-regular-expressions.en.md) |
| L15–L16 | Proving non-regularity | `lecture/w8l1-slides.pdf`, `w8l2-slides.pdf` | [09](09-non-regularity.en.md) |
| L17 | CFGs and PDAs (Sipser slides) | not available locally | [10](10-cfl-pda.en.md) (from Apple Notes) |
| L18 | Pushdown automata | `lecture/16.pdf` | [10](10-cfl-pda.en.md) |
| L19 | First half: wrapping up CFLs; second half: introduction to Turing machines | `lecture/w10l1part1.pdf`; `lecture/Lecture 19 Part 2 - Turing machines prelecture.pdf` | [10](10-cfl-pda.en.md), [11](11-turing-machines.en.md) |
| L20 | The Church–Turing thesis | not available locally | [11](11-turing-machines.en.md) (from Apple Notes, limited coverage) |
| L21–L22 | Universal Turing machines; diagonalisation; undecidability | `lecture/w11l1.pdf`, `w11l2.pdf` | [12](12-decidability-universality.en.md) |
| L23 | Reductions; closure; unrecognisable problems | `lecture/w12l1.pdf` | [13](13-unrecognisable-reductions.en.md) |
| L24 | Wrapping up TMs (Rice's theorem, intractability) and subject review | `lecture/Lecture 24.pdf` | [13](13-unrecognisable-reductions.en.md) |

Lecture numbers follow the first page of each PDF, not its file name:

- the first page of `16.pdf` reads **Lecture 18 Pushdown Automata**;
- the first page of `w10l1part1.pdf` reads "Wrap up CFL · Intro to TM": it is the **first half of Lecture 19** (week 10, lecture 1), not Lecture 17;
- `w6l1/w6l2`, `w8l1/w8l2`, `w11l1/w11l2` and `w12l1` are Lectures 11–12, 15–16, 21–22 and 23 respectively;
- the two summary tables on pages 16–17 of `Lecture 24.pdf` carry a 2023 review-lecture footer: they are older slides included in this semester's deck.

Source comments in the notes use these abbreviations: `L01`–`L14` for `lecture/NN.pdf`; `L18 (16.pdf)` for `lecture/16.pdf`; `W6L1`, `W6L2`, `W8L1`, `W8L2`, `W10L1part1`, `W11L1`, `W11L2`, `W12L1` for the matching `w*.pdf`; `L19-TM` for `Lecture 19 Part 2 - Turing machines prelecture.pdf`; `L24` for `Lecture 24.pdf`. Page numbers are always PDF page indices.

### Problems found in the slides and the student's notes

Slips or omissions found against the slides are explained beside the matching screenshot in the notes; the original files are not altered:

- L09 page 5 has a `}` that should be a closing parenthesis; L09 page 11 asks whether $L(x)$ and $L(y)$ unify but gives no answer, which the note supplies ([05](05-unification-automated-reasoning.en.md));
- the `0110` computation path on W6L2 page 3 omits the step back to $q_1$ ; page 8 writes $L^*$ as $\{L^k\mid k\ge0\}$ , where it should be the union of these languages ([06](06-finite-automata.en.md));
- W8L2 page 9 states union on its first line, but the highlighted rule uses intersection ([09](09-non-regularity.en.md));
- the diagonal argument's "add 1 to each digit" needs another choice when it meets a 9 and when a number has two decimal expansions; this is added as an extension ([12](12-decidability-universality.en.md#topic-3)).

Errors in the student's notes are marked under "Common mistake" or "Extension", e.g. the reading of ${\$}$ and $\varepsilon$ in PDA transitions ([10](10-cfl-pda.en.md#topic-4)), the claim that a fooling set of exactly the right size cannot always be built ([09](09-non-regularity.en.md)), and a Kleene-star decider that cuts the input into equal-length pieces ([13](13-unrecognisable-reductions.en.md#topic-3)).

### Apple Notes import

On 2026-10-22, 20 of the student's notes from the Apple Notes folder CS/25S2/MoC were imported as a secondary source: they decide emphasis and keep some useful examples and intuitions; where they conflict with the slides or contain errors, the notes say so under "Common mistake".

| Apple Note | Merged into |
| --- | --- |
| Lec01-02 Basic Concepts | [01](01-introduction.en.md), [02](02-propositional-logic.en.md) |
| Lec03 Formula, Equivalence Cheatsheet | [02](02-propositional-logic.en.md) (quantifier rules in [04](04-predicate-logic.en.md)) |
| ★1 Resolution & Refutation | [03](03-resolution.en.md) |
| LEC05-06 Predicate Logic, LEC07 Languages | [04](04-predicate-logic.en.md) ("LEC07 Languages" is actually about predicate-logic semantics: universe, interpretation, models) |
| ★2 Resolution for Predicate Logic | [04](04-predicate-logic.en.md), [05](05-unification-automated-reasoning.en.md) |
| LEC09 Unification, LEC10 Automated Reasoning | [05](05-unification-automated-reasoning.en.md) |
| LEC11-12 Finite Automata | [06](06-finite-automata.en.md) |
| LEC13 NFA Determinisation and Minimisation | [07](07-nfa-determinisation-minimisation.en.md) |
| LEC14 Regular Expressions | [08](08-regular-expressions.en.md) |
| LEC15-16 Proving Non-regularity | [09](09-non-regularity.en.md) |
| LEC17-18 Context-free Language & Pushdown Automaton | [10](10-cfl-pda.en.md) |
| LEC19 Turing Machine, LEC20 Church-Turing Thesis | [11](11-turing-machines.en.md) |
| LEC21-22 Universality of Turing Machines | [12](12-decidability-universality.en.md) |
| LEC23-24 Identify Unrecognisable Problems | [13](13-unrecognisable-reductions.en.md) |
| ★3 Languages, ★ Review | [10](10-cfl-pda.en.md), [12](12-decidability-universality.en.md), [13](13-unrecognisable-reductions.en.md) |

Intentionally not imported:

- the "Assignment 1" note: assignment content, not published in this public repository;
- an unrelated list of Melbourne area codes at the end of "LEC19 Turing Machine";
- the images in Apple Notes (slide screenshots, lecture-capture whiteboard shots, screenshots of text explanations): figures were replaced by pages re-rendered from the PDFs or rewritten as tables, formulas and Mermaid diagrams, and useful text was rewritten into the notes. No student-drawn diagram needed to be kept separately.

### Local directories

| Local directory | Contents |
| --- | --- |
| `lecture/` | 23 lecture PDFs |
| `assets/<note name>/` | PNG renders (110 dpi) of the lecture pages selected for the notes |
| `materials.json` | Source and checksum records for the materials |

Binary materials (PDFs and renders) are ignored by Git and exist only in this local checkout; the Downloads originals were copied and preserved.
