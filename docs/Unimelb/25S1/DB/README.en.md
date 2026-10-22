# INFO90002 Database Systems & Information Modelling

Semester: **25S1**. [Canvas course](https://canvas.lms.unimelb.edu.au/courses/211571).

These notes are written for readers meeting databases systematically for the first time. Each note first states the question its lecture answers and then follows the slides in order: **the selected slide pages are the primary reference**, and every screenshot comes with an explanation of where to look and what it shows; the SQL examples are written against the subject's own department-store practice database, with their results checked. **Key point / Hard part / Common mistake** mark places that deserve extra attention while studying; they are not predictions of exam coverage. Our own examples and outside additions are labelled, and optional material is folded away. Each note ends with a few application questions for self-checking.

## Study by module

| Module | Reading order | Skills to build |
| --- | --- | --- |
| What a database is | [01 Introduction to databases](01-introduction.en.md) | Tell data from the DBMS; the rules of a relational table and the development lifecycle |
| How to design a database | [02 Conceptual modelling (ER)](02-conceptual-er-modelling.en.md) → [03 Logical and physical design](03-logical-physical-design.en.md) → [04 Normalisation](04-normalisation.en.md) | Draw an ERD from a business description, turn it into tables with keys and data types, and check redundancy with functional dependencies |
| How to read and write data with SQL | [05 Creating tables and SELECT basics](05-sql-select-basics.en.md) → [06 Joins and changing data](06-sql-joins-and-changes.en.md) → [07 Subqueries and views](07-sql-subqueries-views.en.md) | Use "map, template, fill in" to write joins, grouping, outer joins, subqueries and "for all" queries |
| How a DBMS stays correct and fast | [08 Transactions and concurrency](08-transactions-concurrency.en.md) → [09 Architecture, administration and indexes](09-dbms-architecture-administration.en.md) | Write transactions; understand locks, isolation levels, logs, the buffer pool and indexes |
| Beyond a single relational database | [10 Distributed databases](10-distributed-databases.en.md) → [11 Data warehousing](11-data-warehousing.en.md) → [12 NoSQL and JSON](12-nosql-json.en.md) | Compare replication with partitioning, OLTP with OLAP, ACID with BASE; design a star schema |
| How to serve data safely | [13 Security and backups](13-security-backups.en.md) → [14 Web applications](14-web-applications.en.md) | Choose access control and backup schemes, prevent SQL injection, understand multi-tier architectures |

Follow the file numbers 01–14 alongside the lectures (the numbering is the lecture order; in Weeks 6 and 12 the class time was used for quizzes, so there are no slides); revise by module using the table above. A concept that recurs across lectures is explained in full only in its main note and linked from elsewhere (e.g. views in 07, using views for access control in 13; the transaction log in 08, using logs for incremental restore in 13).

## Where the tutorials fit

Tutorials run a week or more behind the matching lectures; the table links the notes by what each tutorial actually contains.

| Tutorial | Main connection in the notes |
| --- | --- |
| Week 1 Installing MySQL Server and Workbench | [01](01-introduction.en.md#topic-3): client–server and MySQL |
| Week 2 Modelling with MySQL Workbench | [02](02-conceptual-er-modelling.en.md#topic-4): solid/dashed relationship lines, strong and weak entities |
| Week 3 Logical and physical modelling (cinema case) | [03](03-logical-physical-design.en.md#topic-3): the full cinema case, based on the recovered tutorial solution |
| Week 4 Normalisation | [04](04-normalisation.en.md): anomalies, functional dependencies, step by step to 3NF |
| Week 5 SQL introduction | [05](05-sql-select-basics.en.md): filtering, sorting, `LIMIT`, aggregates and `GROUP BY` |
| Week 6 Advanced SQL | [05](05-sql-select-basics.en.md#topic-5), [06](06-sql-joins-and-changes.en.md#topic-1), [07](07-sql-subqueries-views.en.md#topic-1): `NATURAL` vs `INNER JOIN`, `UNION`, subqueries, `HAVING` |
| Week 7 SQL by example and functions | [06](06-sql-joins-and-changes.en.md#topic-1), [06](06-sql-joins-and-changes.en.md#topic-2), [07](07-sql-subqueries-views.en.md#topic-1): multi-table joins, self joins, date and string functions |
| Week 8 Outer joins, unary joins, views, relational division | [06](06-sql-joins-and-changes.en.md#topic-2): outer and self joins; [07](07-sql-subqueries-views.en.md#topic-3), [07](07-sql-subqueries-views.en.md#topic-4): relational division and views |
| Week 9 DDL and referential integrity | [03](03-logical-physical-design.en.md#topic-2), [06](06-sql-joins-and-changes.en.md#topic-4) |
| Week 10 Data warehousing | [11](11-data-warehousing.en.md#topic-4): grain and Kimball's four steps |
| Week 11 NoSQLBooster and MongoDB | [12](12-nosql-json.en.md#topic-4) |
| Week 12 Revision questions | [04](04-normalisation.en.md), [08](08-transactions-concurrency.en.md), [11](11-data-warehousing.en.md): concepts only, rewritten in our own words |

The SQL practice database is built from `tutorial/labs2018engv6.sql` (university server) or `tutorial/labs2018byodv6.sql` (your own machine; it creates the `labs2018` schema first); Week 9 also uses `tutorial/scott.sql` / `scott_byod.sql`. Query results quoted in the notes were checked locally against the same data; the university's MySQL server was not redeployed for this.

## Resources and sources

- [Resource completeness](RESOURCE-STATUS.en.md): what is held locally, week by week, as checked on 2026-10-22, the items still to be kept apart, and the verification results.
- [Resource inventory and checksums](materials.json): each file's stable source URL, SHA-256, size, PDF page count and first-page excerpt.

The resources were recovered from Canvas on **21 October 2026**. The lectures cover the introduction, ER modelling, keys and logical/physical design, data types, normalisation, SQL, transactions and concurrency, administration and architecture, distributed databases, data warehousing, JSON/NoSQL, security and web applications; the tutorials cover Weeks 1–12. The Week 3 tutorial solution timed out during the first recovery; on **2026-10-22** it was recovered through Canvas "Alternative formats → Download original", so the inventory now holds 48 files and the gap is closed. Original filenames are retained; the Downloads originals were copied and preserved.

Each note lists the PDFs, tutorials and Apple Note it uses at the top. **Screenshot numbers are PDF page indices**, not necessarily the printed footer numbers; when a note uses several PDFs, screenshot names carry a short prefix (e.g. `slide-w31-25.png` comes from the Week 3-1 lecture, `slide-t03s-09.png` from the Week 3 tutorial solution), and the alt text starts with the same short name. The `<!-- Sources: … -->` comments in the body use short forms: `W5-2 p.17` is PDF page 17 of `INFO90002_Week5-2_SQL2.pdf`; `Tut W8 Sol p.3` is page 3 of the Week 8 tutorial solution; `Apple Notes FE - ER Model` is the Apple Note of that name.

Where filename and content week disagree (Canvas placement and file content take precedence):

- `INFO90002_Week5-1_SQL1.pdf` has "Week 4 - SQL" on its cover, while `Week5-2` and `Week5-3` say "Week 5 - SQL"; the three are filed as SQL Parts 1–3 in notes 05–07, all titled Week 5;
- `INFO90002_Week3-2_ToyLibraryExplanation.pdf` has "Week 2 – Data modelling" on its cover; it supplements the Week 2 ER modelling lecture and is filed under 02;
- `INFO90002_Week8-2_DistributedDBs.pdf` says "Week 8-9" on its cover, so its note is titled Weeks 8–9;
- Lectures 6 and 12 are not missing lecture PDFs: their module entries say the scheduled sessions were quizzes.

Slips found in the source files are flagged in place in the relevant notes and summarised in [Resource completeness](RESOURCE-STATUS.en.md).

**Apple Notes import record.** On 2026-10-22, 12 student notes from the Apple Notes folder CS/25S1/DB were imported as a secondary source, used to decide emphasis and keep the student's own examples: "WEEK 1", "WEEK 4 - Data Types", and the final-exam revision notes "FE - ER Model", "FE - Logical & Physical Design & SQL DDL", "FE - Normalisation", "FE - Transactions and Concurrency", "FE - Database Architecture & Administration", "FE - Distributed DBs", "FE - Data Warehouse", "FE - JSON NoSQL", "FE - DB Security" and "FE - Web Apps". The images in those notes are all lecture screenshots; the notes use pages re-rendered from the PDFs instead. Intentionally not imported: "Double Check" (quiz screenshots), "SAMPLE EXAM A" (sample-exam answers) and "EXAM NOTICE" (exam structure and questions); they only informed which concepts to emphasise, those concepts have been folded into the relevant topics in our own words, and the questions themselves and the exam structure are not published in this repository. The SQL material (the three Week 5 lectures and the Week 5–9 tutorials) has no student note, so notes 05–07 are written directly from the lectures and tutorials.

| Local directory | Contents |
| --- | --- |
| `lecture/` | 22 files: 17 lecture PDFs, the in-class exercise `Week4-1_Exercise_SubjectEnrol.pdf`, three in-class answer photos, `lecture_queries.sql` |
| `tutorial/` | 26 files: Week 1–12 tutorials and 10 solutions, the practice-database scripts `labs2018*.sql` and `scott*.sql` |
| `assets/<note>/` | PNG screenshots of the selected slide pages, re-rendered from the PDFs at 110 dpi |

| Note | Lecture files (`lecture/`) |
| --- | --- |
| 01 | `INFO90002_Week1-1_AdminIntro.pdf`, `INFO90002_Week1-2_DatabasesIntro.pdf` |
| 02 | `INFO90002_Week2-1_DataModelIntro.pdf`, `INFO90002_Week3-2_ToyLibraryExplanation.pdf`, three in-class answer photos `*.jpg` |
| 03 | `INFO90002_Week3-1_Keys_Logical&Physical.pdf`, `INFO90002_Week4-1_Physical&DataTypes.pdf`, `Week4-1_Exercise_SubjectEnrol.pdf` |
| 04 | `INFO90002_Week4-2_Normalisation.pdf` |
| 05 | `INFO90002_Week5-1_SQL1.pdf`, `lecture_queries.sql` |
| 06 | `INFO90002_Week5-2_SQL2.pdf` |
| 07 | `INFO90002_Week5-3_SQL3.pdf` |
| 08 | `INFO90002_Week7-1_Transactions.pdf` |
| 09 | `INFO90002_Week8-1_DBA.pdf` |
| 10 | `INFO90002_Week8-2_DistributedDBs.pdf` |
| 11 | `INFO90002_Week9-1_DW.pdf` |
| 12 | `INFO90002_Week10-1_JSON_NoSQL.pdf` |
| 13 | `INFO90002_Week10-2_DbSecurity.pdf` |
| 14 | `INFO90002_Week11-1_WebApps.pdf` |

Original materials and screenshots are ignored by Git and kept only locally; they are not committed to the repository.
