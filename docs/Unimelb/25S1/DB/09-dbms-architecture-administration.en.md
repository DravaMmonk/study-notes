# INFO90002 Week 8 - Database Architecture, Administration and Performance

Sources: `lecture/INFO90002_Week8-1_DBA.pdf`; Apple Notes: CS/25S1/DB — "FE - Database Architecture & Administration".

This lecture asks: **who looks after the data and the database? Which internal components does an SQL statement pass through inside a DBMS? What makes a database fast, and when should you create an index?**

Learning path: [Data administrator and database administrator](#topic-1) → [Inside the DBMS](#topic-2) → [What affects performance](#topic-3) → [Indexes](#topic-4).

Key points: the split between DA and DBA; the four groups of memory structures and their roles; when to create an index. Hard parts: the nine steps of an `UPDATE` inside the DBMS; the four states of a buffer in the buffer pool. Common mistakes: more indexes are not always better; small tables need no indexes.

<a id="topic-1"></a>
## 1. Data administrator and database administrator

### Where the DBA sits in the lifecycle

![Slide 03 - The DBA role](assets/09-dbms-architecture-administration/slide-03.png)

The cycle at top right is the development lifecycle from [01](01-introduction.en.md#topic-4), with "Maintenance" highlighted in yellow: the DBA is mainly concerned with the "operations" phase but should be consulted in every phase of development. The two lines at the bottom compare organisation sizes: a large organisation has separate DA and DBA roles, with several DBAs (the stacked circles); in a small one a single developer is also the DBA and the server administrator. Cloud databases or "data as a service" (DaaS) can make the DBA role redundant.
<!-- Sources: W8-1 p.3 -->

### How the two roles divide the work

![Slide 04 - Data and database administration duties](assets/09-dbms-architecture-administration/slide-04.png)

The left column is the **Data Administrator (DA)**, labelled a management role (Chief Data Officer CDO / Chief Security Officer CSO); the right column is the **Database Administrator (DBA)**, a technical role. Reading the two columns side by side shows a pattern: the DA's duties are all about "setting rules and external compliance" (data policies and standards, compliance with the EU GDPR and the Australian Privacy Act, company policy, planning, data conflict resolution, the information repository, internal marketing and education); the DBA's duties are all about "keeping one particular database running" (analysis and design, choosing the DBMS and tools, installing and upgrading, tuning, managing security, privacy and integrity, backup and recovery).
<!-- Sources: W8-1 p.4; Apple Notes FE - Database Architecture & Administration -->

What some DA duties mean:

- **Data conflict resolution**: e.g. in a replicated environment, salespeople update the same customer's address in different databases, and the system can resolve the conflict by applying the most recent update;
- **Information repository**: where a corporation stores a large amount of information long term, not public, accessible only to users with specific roles and permissions;
- **Internal marketing**: promoting the company's objectives, products and services to employees to increase their engagement with company goals.
<!-- Sources: W8-1 p.5 -->

![Slide 06 - DA versus DBA](assets/09-dbms-architecture-administration/slide-06.png)

This comparison table compresses the pattern into seven rows: strategic planning vs control and supervision, sets long-term goals vs executes plans, sets policies and **standards** vs enforces policies and programming standards, broad vs narrow scope, long term vs short term (daily operations), managerial vs technical orientation, DBMS-independent vs DBMS-specific.
<!-- Sources: W8-1 p.4, p.6; Apple Notes FE - Database Architecture & Administration -->

**Common mistake:** to decide whose task something is, ask whether it is "setting" or "enforcing". The slides pose a scenario about responsibility: a data policy requires staff handling personal data to complete annual privacy training; the system flags someone who did not, and the DBA removes their privileges, disrupting processes. The DA sets the policy and the DBA enforces the privileges; a discussion has to keep these two layers apart. The student's revision also marked long-term goals, strategic planning, and setting policies and standards as DA; short-term daily operations, enforcing standards, and control and supervision as DBA.
<!-- Sources: W8-1 p.7; Apple Notes Double Check -->

<a id="topic-2"></a>
## 2. Inside the DBMS

### Memory and disk

A DBMS exists in two places at once: in memory (RAM) and on disk. Both manage data, performance, concurrency and recoverability. The disk representation is persistent and always present; the memory part is transient, existing only while the DBMS runs.
<!-- Sources: W8-1 p.9 -->

![Slide 10 - DBMS overview](assets/09-dbms-architecture-administration/slide-10.png)

**Key point: this is the diagram you should be able to draw and label from memory.** The vertical arrows on the left split it into two halves: the top is memory, with three groups from left to right, orange query processing, yellow concurrency control and blue storage, and the grey bar along the bottom is crash recovery; the bottom half shows heap files and index files on disk. The note at bottom right says a **heap file** is an unordered set of records stored on a set of pages.
<!-- Sources: W8-1 p.10 -->

| Group | Contains | Role |
| --- | --- | --- |
| Query Processing | Parser / Compiler, Optimiser, Executor | Check syntax and permissions, produce an execution plan, execute |
| Concurrency Control | Transaction Manager, Lock Manager | Manage who is using which resources and who must wait |
| Storage | File and access methods, Buffer Pool, disk space management | Move data between disk and memory |
| Crash Recovery | Log Manager | Record every change to support rollback and recovery |
<!-- Sources: W8-1 p.10-21; Apple Notes FE - Database Architecture & Administration -->

### Query processing

![Slide 11 - Query processing components](assets/09-dbms-architecture-administration/slide-11.png)

The three components in the orange box, top to bottom, are the order a query passes through; the text on the right explains each:

| Phase | What happens |
| --- | --- |
| Parsing | Check the syntax can "compile", user permissions and required resources; convert the text into internal binary structures |
| Optimising | Rewrite the query into an equivalent but more efficient form; evaluate indexes, table scans, hashing; choose the lowest-cost execution plan |
| Execution | Meet ACID; make sure resources such as data, logs, memory and cursors are available to do the user's work |
<!-- Sources: W8-1 p.11-12 -->

The optimiser's **access plan** covers the order in which tables are joined, how records are read (index or table scan) and which keys are used. If the SQL cache already holds an access plan for the query, the DBMS reuses it; otherwise it evaluates several plans and puts the chosen one in the cache.
<!-- Sources: W8-1 p.12 -->

![Slide 13 - Query processing phases](assets/09-dbms-architecture-administration/slide-13.png)

This textbook figure (Coronel & Morris) draws the same process as a pipeline: the user's `SELECT` first enters the **parsing phase** (syntax, naming and access-rights checks; it generates the access plan and stores it in the SQL cache), then the **execution phase** (executes I/O, adds locks, retrieves data blocks from the data files into the data cache), and finally the **fetching phase** generates the result set, which the red dotted line returns to the user. Note that the SQL cache and the data cache are two different caches: the first stores "how to do it", the second stores "the data itself".

### Concurrency control

The transaction manager handles every aspect of an SQL transaction: which user or process wants which resources. The lock manager keeps a list of which resources are locked, by whom and at what level, and who is waiting. Locks cover not only tables and indexes but also buffers, cursors and memory addresses. It works like a traffic policeman: who may go, who must queue, who may pass through together (usually readers). Lock types are in [08](08-transactions-concurrency.en.md#topic-3).
<!-- Sources: W8-1 p.14-15 -->

### Storage: files, pages and the buffer pool

![Slide 17 - Paging](assets/09-dbms-architecture-administration/slide-17.png)

**Paging** is how the operating system organises memory. In the figure on the right, Job 1's 350 lines are cut into 4 equal pages (Page 0–3), placed in non-adjacent frames of main memory (frames 5, 8, 10, 11), with wasted space in the last page. The OS splits physical memory into frames and logical memory into pages of the same size (commonly 4K or 2K), linking pages to frames with a page table; a program need not be wholly in memory, nor in contiguous memory.

![Slide 18 - Files, pages and frames](assets/09-dbms-architecture-administration/slide-18.png)

The figure on the right makes it clearer: two processes each have their own consecutively numbered logical pages (yellow 0–16, green 0–10), yet they are interleaved across the physical frames. The left side lists the ways of accessing a file:

- **full scan** (full table scan): read the whole table sequentially from the first row to the last, the slowest;
- **partial scan** (index range): read the index first to get row IDs and then fetch the rows directly, e.g. an index range scan for `2 < deptno < 9`, faster than a full scan.
<!-- Sources: W8-1 p.16-19; Apple Notes FE - Database Architecture & Administration -->

The other two storage components:

- **Buffer pool**: a memory area that caches database pages, holding row data and index data; the buffer manager keeps needed pages in memory to reduce secondary-storage access. The same data may have several copies, so the DBMS must know which is the current committed version;
- **Disk space management**: letting files grow on disk (with a maximum size) and file organisation, e.g. index reorganisation and `VARCHAR` growth (a surname changing from Brown to Nicholson).

#### The four states of a buffer

![Slide 20 - Buffer pool status types](assets/09-dbms-architecture-administration/slide-20.png)

The blue text on the right follows one example: changing Nancy's department from 8 to 9.

| State | Meaning | Example |
| --- | --- | --- |
| Current | The in-use, current committed version | `DepartmentID = 8` before the change |
| Active | The most recent change, possibly not committed | `DepartmentID = 9`; after commit it becomes current |
| Stale | An old version of the data | `DepartmentID = 8` after the commit |
| Aged | Old and about to be removed from the buffer pool | An older `DepartmentID = 8` |
<!-- Sources: W8-1 p.20; Apple Notes Double Check -->

### The log manager

The log manager records every change: statements; transactions (statements, rollback values, before and after values, and timestamps for transaction begin, savepoints and commit); and database-level data dictionary changes. A savepoint is a point in a request that marks the state of the database at that time. What a log table looks like is shown in [08](08-transactions-concurrency.en.md#topic-6).
<!-- Sources: W8-1 p.21 -->

### The nine steps of an UPDATE

![Slide 22 - How a transaction works](assets/09-dbms-architecture-administration/slide-22.png)

**Hard part:** the statement at top left is `UPDATE employee SET departmentid = 9 WHERE firstname = 'Nancy' AND departmentid = 8;`, and the numbers go round the components. While reading, map each number onto a box of the overview diagram above:
<!-- Sources: W8-1 p.22 -->

1. The code is parsed and optimised; data access permissions are checked (query processing);
2. The DBMS checks whether the table and index data (rows) are already in the buffer pool; if so, skip to step 4 (storage);
3. Otherwise read them from the table and index on disk into the buffer pool;
4. The transaction manager ensures all needed table and index data are in the buffer pool and ready for execution;
5. The lock manager locks rows and indexes as the query requires;
6. The SQL is executed;
7. The buffer pool records the before value, after value and change; the log manager writes a timestamp, before value, after value and change to the log file;
8. Commit, making the change permanent;
9. The changed data and the transaction log are written to disk.
<!-- Sources: W8-1 p.22; Apple Notes Double Check -->

<a id="topic-3"></a>
## 3. What affects performance

![Slide 23 - What affects database performance](assets/09-dbms-architecture-administration/slide-23.png)

The nine items on the left are the factors the slides list and then expand one by one. The two SQL snippets at bottom right illustrate "good code": both find buyers for `ArtefactID = 1`; the left uses an `IN` subquery, the right an `INNER JOIN`, and the slides favour the latter.

| Factor | Why it helps |
| --- | --- |
| Caching data in memory (data buffers) | Disk reads are expensive, so the aim is to minimise reads (and writes); an "in-memory database" loads all code and data at startup |
| Data files spread across several disks; distribution and replication | Spreads the load, less work per server, faster response (see [10](10-distributed-databases.en.md)) |
| Fast reliable storage (SSD, RAID) | Lower I/O time |
| Database replication and server clustering | Spreads load, improves availability |
| Indexes to speed up searches and joins | Fewer disk I/Os |
| Good choice of data types (especially primary keys) | Saves space, faster comparisons |
| Good program logic (no long-running CRUD) | Locks are held for less time |
| Good execution plans | The lowest-cost plan is best (cost-based optimisation, CBO) |
| Good code (no deadlocks) | E.g. use a join rather than an `IN` subquery where possible |
<!-- Sources: W8-1 p.23-26; Apple Notes FE - Database Architecture & Administration -->

![Slide 26 - Good execution plans](assets/09-dbms-architecture-administration/slide-26.png)

Compare the numbers in the two red ovals: the query on the left filters customers by `cust_last_name`, `cust_first_name` and `cust_city`, and its plan is a red "Full Table Scan" costing 12136.20; on the right an index is created first, `CREATE INDEX cust_city_idx ON Customers(cust_city);`, and the same query becomes a green "Non-Unique Key Lookup" costing 104.40, with the estimated rows read falling from over fifty thousand to 87.
<!-- Sources: W8-1 p.26 -->

<a id="topic-4"></a>
## 4. Indexes

### What an index is

Without an index, finding an employee ID means looking at every record in turn. With 100,000 records and one disk I/O per comparison, that averages about 50,000 I/Os (in reality the DBMS reads blocks, so one I/O brings in many records); the more rows, the slower.
<!-- Sources: W8-1 p.28-31 -->

![Slide 29 - Searching a sorted list](assets/09-dbms-architecture-administration/slide-29.png)

The previous page is an unordered table of employee IDs asking whether 502 and 91 exist; this page asks again with the same numbers sorted. Once sorted, a glance tells you 91 is absent and 502 is present, which is the basic idea of an index.

An **index** stores two things: the index value (e.g. the employee ID) and the location of the record in the database. A lookup quickly finds the employee ID in the index, gets the location and fetches that row directly.
<!-- Sources: W8-1 p.31 -->

### Automatic maintenance on insert

![Slide 34 - Inserting into a simple index](assets/09-dbms-architecture-administration/slide-34.png)

On the left is the table in insertion order (`RowLoc` 1, 2, 3 are employees 109, 13, 27); on the right is the primary-key index with the same three rows sorted by `Key` as 13, 27, 109, each key paired with its row location. When a table has a primary key, the DBMS automatically creates an index on it; each inserted row automatically adds its key and row location to the index, kept in key order.

### Binary search

![Slide 36 - Binary search: first step](assets/09-dbms-architecture-administration/slide-36.png)

![Slide 37 - Binary search: second step](assets/09-dbms-architecture-administration/slide-37.png)

![Slide 38 - Retrieve the matching row](assets/09-dbms-architecture-administration/slide-38.png)

The three pages together trace the search for employee 289:

1. the first page starts at 88 in the middle of the index; 289 is larger, so the upper half is eliminated;
2. the second page takes the new middle, 145, of what remains and eliminates another half;
3. the third page finds 289 with `RowLoc` 11 and fetches row 11 of the table directly (Susan Armstrong).

This is **binary search**: each comparison eliminates at least half of the keys. The slides count only 2 disk I/Os to find employee 289: one to read the index into memory and one to read row 11.
<!-- Sources: W8-1 p.32-42, p.46 -->

**Note:**

- An index stores not a "record number" but a physical disk address (in Oracle something like `AAAYUzAAEAABIjLAAJ`). Record numbers change when earlier rows are deleted, which is one reason to use primary keys;
- binary search is only one method; real DBMSs have many more complex indexing options, and indexes are often stored in compressed, non-human-readable formats.

### Multi-level indexes

![Slide 46 - A multi-level index](assets/09-dbms-architecture-administration/slide-46.png)

A very large index can be split into segments, with an "index of indexes" over them. To find employee 145: first look at the small table at bottom left, which records each segment's last key (56, 112, 215, 340); 145 falls between 112 and 215, so go to segment 3; in segment 3, 145 maps to Row 6; finally fetch row 6 of the table on the right (Lisa). The pink highlights mark these three steps.

### The cost of indexes

![Slide 44 - The cost of creating indexes](assets/09-dbms-architecture-administration/slide-44.png)

Why not index every field? Disk space is minor; **update time is the major cost**: every insert, change or delete must update every index to keep it in key order, and too many indexes cause unacceptable delays. The slides use subject enrolment and census data entry as examples: every entry waits while all the indexes are updated, and users will not be happy.
<!-- Sources: W8-1 p.44 -->

A compromise: a once-a-week report that needs many indexes to run acceptably can create them before running, drop them afterwards, and be scheduled to do so automatically. Indexing fields central to a report (used in `WHERE` and `HAVING`) has often cut report time from many hours to a few minutes.
<!-- Sources: W8-1 p.43, p.45 -->

### The optimiser may skip an index

The DBMS optimiser decides the quickest way to access data. When several indexes exist, the optimiser decides whether to use them. For a small table that loads into memory in one or two reads, reading the whole table may be faster than reading the index and then the rows.
<!-- Sources: W8-1 p.47 -->

### When to create an index

![Slide 48 - When to create indexes](assets/09-dbms-architecture-administration/slide-48.png)

Choose the columns to index for each table, in the page's order:

- columns queried frequently (used in `WHERE`);
- columns used for joins (primary key to foreign key);
- primary keys (automatic in most DBMSs), foreign keys (automatic in MySQL), unique columns (automatic in most DBMSs);
- large tables only: worthwhile when you usually retrieve less than about 15% of the rows; small tables need none;
- columns with a wide range of values suit regular indexes; a small range of values suits bitmap or hash indexes.
<!-- Sources: W8-1 p.48; Apple Notes FE - Database Architecture & Administration -->

## Self-check

1. Which of these belong to the DA and which to the DBA: setting company-wide data naming standards; patching a MySQL upgrade; ensuring the system complies with privacy law; checking each night that backups succeeded?
2. A `SELECT` runs noticeably faster the second time. Give two possible reasons using the buffer pool and the SQL cache.
3. An orders table has 50 million rows, is often queried by `CustomerID` and often filtered by `OrderStatus` (only 4 values). What index suits each?
4. A table receives thousands of inserts per second, and a developer has indexed all 12 columns. What goes wrong?
