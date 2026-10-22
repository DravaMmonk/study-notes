# Historical course materials recovery

Source intake: **21 October 2026**. Follow-up: **22 October 2026 (Australia/Melbourne)**. This report covers source recovery only; other chats may import or edit course notes independently.

Raw source files remain in the existing ignored `lecture/` and `tutorial/` directories. Tracked materials.json manifests record source URLs, SHA-256, sizes, PDF page counts, excerpts and follow-up version notes. Authentication data and signed download tokens are excluded. Downloads originals were preserved.

| Term | Subject | Local files | PDFs |
| --- | --- | ---: | ---: |
| 25S1 | [COMP90038](25S1/Alg/README.md) | 72 | 71 |
| 25S1 | [INFO90002](25S1/DB/README.md) | 48 | 40 |
| 25S1 | [COMP90007](25S1/IT/README.md) | 26 | 26 |
| 25S1 | [COMP90041](25S1/Java/README.md) | 15 | 15 |
| 25S2 | [COMP90054](25S2/AIP/README.md) | 25 | 25 |
| 25S2 | [COMP90049](25S2/IML/README.md) | 23 | 22 |
| 25S2 | [COMP30026](25S2/MoC/README.md) | 25 | 25 |

**Total: 234 files, including 224 PDFs.** The original intake contained 200 files; the follow-up added 34 files: 19 Canvas originals, one MIT OCW PDF of the referenced Sipser lecture, and 14 current AIP website PDFs.

## Follow-up results

- **AIP:** All seven previously failed Canvas handout links were recovered through Alternative formats → Download original. There are now 11 Canvas PDFs. Original file names and Canvas labels are both retained because the two links described as post-handouts have pre-handout filenames. The 14 PDFs in `25S2/AIP/lecture/official-site-2026-10-22/` are current official website supplements. Their equivalence to the 2025 edition is unverified; mdps.pdf was generated in August 2026. They do not establish the 2025 syllabus.
- **MoC L20:** The original 16-page, Semester 2 2025 Canvas PDF was recovered through the same original-file button.
- **MoC L17:** The linked MIT PowerPoint and its old directory return 404. MIT OCW preserves a 13-page PDF of Michael Sipser’s Fall 2020 Lecture 4 (CFG/PDA), the same course/year/lecture referenced by the subject website. It is archived as `Sipser-Lecture-4-CFG-PDA.pdf`; byte identity with the unavailable PPTX is unverified.
- **Database:** The previously failed Week 3 tutorial solution was recovered.
- **Algorithms:** Nine extra tutorial PDFs for Weeks 3–11 were recovered. The Week 12 PDF still failed and the original-file service stalled while preparing it; the matching Week 12 PowerPoint was recovered instead (115 slides, title checked). This preserves the original deck without claiming its PDF was downloaded.

## Limits and remaining distinctions

- The identified content gaps now have local sources. Exact-format exceptions remain: MoC L17 uses MIT OCW PDF instead of the dead PPTX, and Algorithms Week 12 tutorial uses the original PPTX instead of the separate PDF.
- The current AIP website PDFs supplement the archive; they are not substituted for verified 2025 originals.
- MoC notes 10 and 11 still need to be checked and illustrated against the newly recovered L17/L20 sources. This source-recovery pass does not rewrite those lessons.
- MoC companion lecture notes are still linked web resources, not a local website mirror. Tutorial/recording categories outside the original download scope are not claimed complete.
- Database Weeks 6 and 12 explicitly scheduled quizzes with no lecture; IT Week 7 reuses W6-L3 and cancelled its other two lectures. No Week 8 IT lecture entry was present in the expanded module list.

## Validation

All additions were checked against their local download originals. New PDFs passed pdfinfo and text extraction; the MoC source title pages were rendered and inspected. The Week 12 PowerPoint was checked as an Office ZIP container with 115 slides and the expected title. Every archived file matches the SHA-256 and byte count in its manifest. The earlier successful site build reported existing ADBS/SPM image warnings, CV topic anchor messages and NLP absolute links; none of those unrelated pages were changed in this recovery.

The follow-up full-site build was stopped after more than two minutes while processing the concurrently edited course-note tree; it did not complete and is not reported as passing. Its log included missing-image and relative-link messages in other chats’ Alg/DB notes. File-integrity, PDF parsing and staged-diff checks for this recovery passed.
