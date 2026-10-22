# INFO90002 Resource Completeness

Check date: **2026-10-22**. The resources were recovered from Canvas on 2026-10-21, and the Week 3 tutorial solution was added on 2026-10-22; this page lists by week what is held locally and records the items that still need to be kept apart. No lecture recordings or transcripts are held locally; the notes rely on the slides, the tutorials and the student's Apple Notes.

| Week | Lecture PDFs | Tutorial | Tutorial solution | Apple Notes | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | 2 (subject overview + introduction to databases) | Installation demo | Not applicable (walk-through) | "WEEK 1" | [01](01-introduction.en.md) |
| 2 | 1 + 3 in-class answer photos | Modelling in Workbench | Not applicable (step-by-step guide) | "FE - ER Model" | [02](02-conceptual-er-modelling.en.md) |
| 3 | 2 (keys and logical/physical design; Toy Library supplement) | Logical and physical modelling | Held (added 2026-10-22) | "FE - Logical & Physical Design & SQL DDL" | [02](02-conceptual-er-modelling.en.md), [03](03-logical-physical-design.en.md) |
| 4 | 2 (data types; normalisation) + 1 in-class exercise | Normalisation | Held | "WEEK 4 - Data Types", "FE - Normalisation" | [03](03-logical-physical-design.en.md), [04](04-normalisation.en.md) |
| 5 | 3 (SQL Parts 1–3) + `lecture_queries.sql` | SQL introduction | Held | None | [05](05-sql-select-basics.en.md)–[07](07-sql-subqueries-views.en.md) |
| 6 | None (class time used for a quiz) | Advanced SQL | Held | None | [05](05-sql-select-basics.en.md)–[07](07-sql-subqueries-views.en.md) |
| 7 | 1 (transactions) | SQL by example and functions | Held | "FE - Transactions and Concurrency" | [08](08-transactions-concurrency.en.md) |
| 8 | 2 (DBA; distributed) | Outer joins, views, relational division | Held | "FE - Database Architecture & Administration", "FE - Distributed DBs" | [09](09-dbms-architecture-administration.en.md), [10](10-distributed-databases.en.md) |
| 9 | 1 (data warehousing) | DDL and referential integrity (with `scott` scripts) | Held | "FE - Data Warehouse" | [11](11-data-warehousing.en.md) |
| 10 | 2 (NoSQL; security) | Data warehousing | Held | "FE - JSON NoSQL", "FE - DB Security" | [12](12-nosql-json.en.md), [13](13-security-backups.en.md) |
| 11 | 1 (web applications) | NoSQLBooster and MongoDB | Held | "FE - Web Apps" | [14](14-web-applications.en.md) |
| 12 | None (class time used for a quiz) | Revision questions | Held | None | Concepts folded into [04](04-normalisation.en.md), [08](08-transactions-concurrency.en.md), [11](11-data-warehousing.en.md) |

There are **48 resource files** locally: 22 in `lecture/` (17 lecture PDFs, 1 in-class exercise PDF, 3 answer photos, `lecture_queries.sql`) and 26 in `tutorial/` (Week 1–12 tutorials and 10 solution PDFs, plus `labs2018engv6.sql`, `labs2018byodv6.sql`, `scott.sql`, `scott_byod.sql`). The 14 notes use 300 selected slide screenshots, each with an explanation beside it.

## Items that are incomplete or need to be kept apart

- **The Week 3 tutorial solution has been recovered.** The first recovery timed out on it; on 2026-10-22 `tutorial/Week3_Tute_Logical and Physical Modelling SOLUTIONS.pdf` (9 pages) was obtained through Canvas "Alternative formats → Download original". Its source URL and checksum are in `materials.json`, and it is used for the cinema case in [03](03-logical-physical-design.en.md).
- **Weeks 6 and 12 have no lecture slides**: the module pages say these class sessions were quizzes, so no file is missing.
- **The Week 1 and Week 2 tutorials have no separate solutions**: the first is an installation demo and the second a Workbench walk-through; both are step-by-step instructions in themselves.
- **Filename week versus content week**: `INFO90002_Week5-1_SQL1.pdf` says "Week 4 - SQL" on its cover; `INFO90002_Week3-2_ToyLibraryExplanation.pdf` says "Week 2 – Data modelling"; `INFO90002_Week8-2_DistributedDBs.pdf` says "Week 8-9". The notes follow Canvas placement and content; the original filenames are unchanged.
- **Tutorials lag the lectures**: data warehousing is lectured in Week 9 and tutored in Week 10; NoSQL is lectured in Week 10 and tutored in Week 11; the SQL lectures are all in Week 5, with tutorials spread over Weeks 5–9.
- **Apple Notes intentionally not imported**: "Double Check" (quiz screenshots), "SAMPLE EXAM A" (sample-exam answers) and "EXAM NOTICE" (exam structure and questions). They only informed emphasis; the questions themselves do not appear in this public repository.
- **Slips in the source files** (all flagged in place in the relevant notes):
  - `INFO90002_Week1-2_DatabasesIntro.pdf` gives the order date as 2020 on page 28 but 2021 in the tables on pages 29–30 ([01](01-introduction.en.md));
  - the table on page 7 of `INFO90002_Week3-2_ToyLibraryExplanation.pdf` is misaligned, with the `ToyNo` values under `DateBorrowed` ([02](02-conceptual-er-modelling.en.md));
  - in `INFO90002_Week3-1_Keys_Logical&Physical.pdf` the pizza identifier has a different name or length in the logical design, the implementation and page 27 ([03](03-logical-physical-design.en.md));
  - page 8 of the Week 3 tutorial solution says the 1:M foreign key goes on the "one" side, contradicting its page 6 and its own example; its logical design says `DateOfLastScreening` while its diagram says `DateOfScreening` ([03](03-logical-physical-design.en.md));
  - page 19 of `INFO90002_Week5-1_SQL1.pdf` says `COUNT()` counts `NULL`s, which is true only of `COUNT(*)`; pages 28 and 30 use `CustomerFirstName`, while the table created on page 9 has `CustFirstName` ([05](05-sql-select-basics.en.md));
  - the Venn diagrams from page 15 of `INFO90002_Week5-2_SQL2.pdf` put Brier Patch outside the boss circle, contradicting the result table; page 22 is titled "INNER JOIN" but the query is a `LEFT OUTER JOIN` ([06](06-sql-joins-and-changes.en.md));
  - the `EXISTS` result screenshot on page 13 of `INFO90002_Week5-3_SQL3.pdf` shows a different name and phone for buyer 2 than the data on pages 7 and 8, taken from another sample data set ([07](07-sql-subqueries-views.en.md)).
- **Local SQL checking environment**: query results in 05–07 were checked against a local copy of the `labs2018` data; the course environment is MySQL, and the university server was not redeployed locally.

## Sync and verification

- All 48 files listed in `materials.json` were checked with `shasum -a 256 -c`; every SHA-256 matches, file sizes match the record, and `lecture/` and `tutorial/` hold no files outside the inventory.
- All 40 PDFs open with `pdfinfo`, and their page counts match the inventory; every selected page was re-rendered from its PDF with `pdftoppm -r 110` and inspected visually.
- Screenshot numbers are PDF page indices, not necessarily the printed footer numbers.

## Sources and storage locations

- [Canvas course page](https://canvas.lms.unimelb.edu.au/courses/211571)
- [Course notes index](README.en.md)
- [Resource inventory and checksums](materials.json)

`lecture/` and `tutorial/` hold the original materials, and `assets/<note>/` holds the selected slide screenshots; all are ignored by Git and exist only locally. The Downloads originals were copied and preserved.
