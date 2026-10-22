# INFO90002 Week 7 - Transactions and Concurrency Control

Sources: `lecture/INFO90002_Week7-1_Transactions.pdf`; `tutorial/Week12_Tute_ExamRevision_SOLUTIONS.pdf` (transaction questions, rewritten in our own words); Apple Notes: CS/25S1/DB — "FE - Transactions and Concurrency".

This lecture asks: **what do you do when several SQL statements must be "all or nothing"? When many users change the same data at once, how does a DBMS stop the result going wrong, and how does it recover after a failure?**

Learning path: [Transactions and ACID](#topic-1) → [Three problems caused by concurrency](#topic-2) → [Locking](#topic-3) → [Isolation levels](#topic-4) → [Deadlock and other concurrency control methods](#topic-5) → [The transaction log and recovery](#topic-6).

Key points: writing a business transaction with `START TRANSACTION … COMMIT`; the three concurrency problems; shared and exclusive locks. Hard parts: strict two-phase locking; what each of the four isolation levels allows. Common mistakes: packing unrelated operations into one transaction; only exclusive locks can deadlock.

<a id="topic-1"></a>
## 1. Transactions and ACID

### Where this lecture sits inside a DBMS

![Slide 03 - Components of a DBMS](assets/08-transactions-concurrency/slide-03.png)

The red box marks this lecture's focus: the **Concurrency Control** module, with its Transaction Manager and Lock Manager. Query processing on the left decides "how to compute the result", storage on the right decides "where the data sits on disk", and Crash Recovery and the Log Manager along the bottom appear in the last section of this lecture. The internal structure of the whole diagram is covered in [09](09-dbms-architecture-administration.en.md#topic-2).

### A business transaction is several SQL statements

![Slide 05 - Business transactions](assets/08-transactions-concurrency/slide-05.png)

The blue text lists three "business transactions": placing an order, transferring funds, sending monthly statements. Each is one thing to the business, but several steps in the database:

- placing an order: insert one row in `Order`, then several in `OrderItem`;
- transferring funds: check the amount does not exceed the balance; subtract from one account, add to another; record it in a transactions table;
- sending monthly statements: generate and send a statement for every row in `Customer`.
<!-- Sources: W7-1 p.5 -->

The lower half breaks "move money from savings to the credit-card account" into concrete steps. If it fails halfway, with money taken from savings but not yet added to the credit-card account, the database is left inconsistent.
<!-- Sources: W7-1 p.5, p.9 -->

### A transaction: an indivisible unit of work

![Slide 06 - What is a database transaction](assets/08-transactions-concurrency/slide-06.png)

A **transaction** is a logical unit of work that must be completed entirely or aborted entirely (indivisible, atomic). A successful transaction moves the database from one consistent state to another, with every integrity constraint satisfied.
<!-- Sources: W7-1 p.6; Apple Notes FE - Transactions and Concurrency -->

Note the footnote asterisk: "single DML statements are already atomic" holds for MySQL and SQL Server only; Oracle DML is not an atomic transaction by default.

The slides then say transactions solve two problems:

1. users need the ability to define a unit of work;
2. more than one user or program accesses the data concurrently.
<!-- Sources: W7-1 p.7; Apple Notes FE - Transactions and Concurrency -->

![Slide 08 - Problem 1: unit of work](assets/08-transactions-concurrency/slide-08.png)

The top half is the **implicit transaction**: an `UPDATE` of 700 rows that crashes after 200 leaves no rows changed after restart, "all or none". The bottom half is the **user-defined transaction**, where you wrap several statements yourself:
<!-- Sources: W7-1 p.6, p.8 -->

```sql
START TRANSACTION;   -- or BEGIN
  -- SQL statement 1
  -- SQL statement 2
  -- …
COMMIT;              -- save every change permanently; or ROLLBACK to undo them all
```
<!-- Sources: W7-1 p.8; Apple Notes FE - Transactions and Concurrency -->

On an error: statements already completed must be reversed, the user sees an error message, and when ready the user tries again. This is only a brief annoyance for the user, whereas inconsistent data has serious consequences.
<!-- Sources: W7-1 p.9 -->

### The four ACID properties

![Slide 10 - Transaction properties ACID](assets/08-transactions-concurrency/slide-10.png)

Read the four bold headings one by one and remember what each letter guards against:

- **Atomicity**: a transaction is an indivisible logical unit, guarding against "only half done";
- **Consistency**: constraints that hold before a transaction hold after it, guarding against "breaking an integrity rule";
- **Isolation**: a transaction's intermediate states are invisible to others until it commits, guarding against "concurrent transactions interfering"; the three problems in Section 2 all come from breaking it;
- **Durability**: committed changes are kept in non-volatile storage such as disk or SSD and survive a system failure; the log in Section 6 serves this property.
<!-- Sources: W7-1 p.10; Apple Notes FE - JSON NoSQL -->

For ACID versus NoSQL's BASE, see [12](12-nosql-json.en.md#topic-3).

### Writing a business transaction

![Slide 11 - Exercise 1: unrelated tasks](assets/08-transactions-concurrency/slide-11.png)

The slides' example: a designer-brands retailer has `Product`, `ProductStockLevel`, and `Action`, which records sales and returns. The transaction at the bottom of Exercise 1 bundles "add a new product" with "discount every product by 5%"; the two are unrelated and should not be tied into one transaction.
<!-- Sources: W7-1 p.12-13 -->

![Slide 13 - Exercise 2 solution](assets/08-transactions-concurrency/slide-13.png)

Exercise 2 records "2 units of G43546 sold". The sentence in the middle of the page gives the idea: two changes are needed, inserting a purchase in `Action` and reducing stock in `ProductStockLevel`. The blue code is the answer:

```sql
START TRANSACTION;
SET @qty = 2;
SET @price  = (SELECT RetailPrice FROM Product WHERE ProdID = 'G43546');
SET @amount = @price * @qty;
INSERT INTO Action VALUES (1028, '2024-04-15', 'Purchase', 'G43546', @qty, @amount);
UPDATE ProductStockLevel SET QtyInStock = QtyInStock - @qty WHERE ProdID = 'G43546';
COMMIT;
```
<!-- Sources: W7-1 p.13; Apple Notes FE - Transactions and Concurrency -->

**Common mistakes:**

- the sale amount uses the retail price `RetailPrice`, not the purchase price `PurchasePrice` (the student's notes used the purchase price); check against the first row of the `Action` table on the page: 2 × 1080.00 = 2160.00;
- use variables (`SET @qty = 2`) rather than hard-coding the value in several places, so one change suffices (Tut W12 stresses this too);
- put only **related** operations in a transaction. Exercise 1 is the counter-example; likewise, updating stock and changing prices for a sale do not belong in one transaction.
<!-- Sources: W7-1 p.7, p.11, p.13; Tut W12 Sol p.4; Apple Notes FE - Transactions and Concurrency -->

#### Illustrative example: a transfer (adapted from Tut W12)

To move 500 from account A to account B: in one transaction subtract 500 from A, add 500 to B, then `COMMIT`. If the second statement fails, `ROLLBACK` also reverses A's debit, so the money does not vanish. The same reasoning applies to paired changes such as "change the price + write the price history": both steps must succeed together, or the history will not match the current price.
<!-- Sources: Tut W12 Sol p.3-4 -->

<a id="topic-2"></a>
## 2. Three problems caused by concurrency

Sharing data among many users is where much of a database's value comes from, but concurrent DML can go wrong: lost updates, uncommitted data, inconsistent retrievals.
<!-- Sources: W7-1 p.15 -->

### Lost update

![Slide 16 - Lost update](assets/08-transactions-concurrency/slide-16.png)

Follow the green timeline: Alice (top) and Bob (bottom) both read a balance of 1000; Alice withdraws 100 and writes 900, Bob withdraws 800 and writes 200. Bob's write overwrites Alice's, leaving 200, while the red text says the right answer is 100. **Two concurrent transactions update the same data and one update is overwritten by the other.**
<!-- Sources: W7-1 p.16 -->

### Uncommitted data

![Slide 17 - Uncommitted data](assets/08-transactions-concurrency/slide-17.png)

This time Bob moves first: he withdraws 800 (the balance temporarily becomes 200) and then **rolls back**, restoring 1000; but before the rollback Alice read that 200, withdrew 100 from it and wrote 100. The right answer is 900. **The second transaction used the first one's uncommitted data before the first rolled back**, violating isolation.
<!-- Sources: W7-1 p.17 -->

### Inconsistent retrieval

One transaction computes an aggregate over a set of data (e.g. `SUM(Salary)`) while another updates that data, so some values are read before the change and some after:
<!-- Sources: W7-1 p.18 -->

![Slide 19 - Inconsistent retrieval trace](assets/08-transactions-concurrency/slide-19.png)

Read the table row by row; red rows are T2, black rows are T1, and "T1 SUM" on the right is the running total:

- rows 3–5: T2 changes employee 33's salary from 30,000 to 30,300; in row 6 T1 reads the value **after** the change, 30,300;
- in row 7 T1 reads employee 44 before T2 has touched it, getting the **before** value 40,000; only in rows 8–11 does T2 change it to 40,400 and commit;
- T1 ends with 210,300, which is neither the before total 210,000 nor the after total 210,700 (purple note).
<!-- Sources: W7-1 p.19 -->

**Note:** the student's revision flagged this case specifically: "one transaction computing summary functions while others update the data" is an inconsistent retrieval.
<!-- Sources: Apple Notes Double Check -->

### Serializability

![Slide 20 - Serializability](assets/08-transactions-concurrency/slide-20.png)

The upper row of red arrows is reality: several transactions overlap in time; the lower row is "how it appears": one after another. Ideally transactions are **serializable**: they actually run concurrently, but the effect is the same as some serial order. The DBMS **scheduler** decides the order in which operations of concurrent transactions execute, ensuring serializability and isolation. The blue line reminds us that truly serial execution (no concurrency at all) is far too expensive.
<!-- Sources: W7-1 p.20, p.22 -->

<a id="topic-3"></a>
## 3. Locking

There are three kinds of concurrency control: locking (the main one), timestamps, and optimistic methods. This section covers locking; the other two are at the end of [Section 5](#topic-5).
<!-- Sources: W7-1 p.22; Apple Notes FE - Transactions and Concurrency -->

A lock guarantees the current transaction exclusive use of a data item: T1 locks before accessing the data and releases when the transaction completes; T2 must wait to access the same data. The **lock manager** assigns and polices locks.
<!-- Sources: W7-1 p.23 -->

### Lock granularity: how big a piece to lock

![Slide 24 - Lock granularity: database and table](assets/08-transactions-concurrency/slide-24.png)

![Slide 25 - Lock granularity: page, row and field](assets/08-transactions-concurrency/slide-25.png)

The two pages run through five granularities from largest to smallest. Hold on to one thread while reading: **the bigger the lock, the lower the management overhead but the lower the concurrency; the smaller the lock, the higher the concurrency and the higher the overhead.**

- **Database level**: locks the whole database; fine for batch processing, unsuitable for multi-user systems (SQLite, Access);
- **Table level**: transactions can run in parallel as long as they use different tables; good when updating most rows, but different parts of the same table still block each other;
- **Page level**: locks one disk page, which may hold rows of several tables; one of the most frequently used levels;
- **Row level**: different rows of the same table, even on the same page, can proceed in parallel; the most popular in MySQL and Oracle; escalates automatically to a page lock when too many rows on one page are locked;
- **Field level**: different columns of the same row can proceed in parallel (e.g. online banking showing transactions but not the balance); most flexible but extremely high overhead, rarely used.
<!-- Sources: W7-1 p.24-25 -->

### Binary, shared and exclusive locks

A **binary lock** has only two states, locked (1) and unlocked (0), with no read/write distinction. It eliminates lost updates, but two read-only transactions also block each other, which is too restrictive. The alternative is shared and exclusive locks, which distinguish reading from writing.

![Slide 27 - Shared and exclusive locks](assets/08-transactions-concurrency/slide-27.png)

- **Exclusive lock (write lock)**: required to write; granted only if **no other lock at all** is held on the item. In MySQL: `SELECT … FOR UPDATE` or `LOCK TABLES … WRITE`;
- **Shared lock (read lock)**: granted for reading when no exclusive lock is held; many transactions can hold one at once. In MySQL: `SELECT … LOCK IN SHARE MODE` or `LOCK TABLES … READ`.
<!-- Sources: W7-1 p.26-27; Apple Notes FE - Transactions and Concurrency -->

![Slide 28 - Lock compatibility matrix](assets/08-transactions-concurrency/slide-28.png)

The green matrix at top left: rows are the lock already held, columns the lock requested. Only S meeting S gets a tick; the other three cells are crosses. In one sentence: while others read, you may read but not write; while someone writes, you may neither read nor write.
<!-- Sources: W7-1 p.28 -->

**Note: multi-version concurrency control (MVCC).** With simple locking, writers block readers and other writers, and readers block writers. MySQL implements MVCC: versions are tracked with sequential transaction IDs plus a change log, so readers can see the "old" version while a writer updates, and neither has to block the other completely.
<!-- Sources: W7-1 p.29 -->

### Strict two-phase locking (Strict 2PL)

![Slide 30 - Strict two-phase locking](assets/08-transactions-concurrency/slide-30.png)

1. **Growing phase**: a transaction obtains all the locks it needs before reading or writing; no lock is released while another is still needed;
2. **Shrinking phase**: all locks held by the transaction are released when it completes.

The lower half of the page gives the effect: two transactions touching completely different data obtain their locks concurrently and proceed; if they touch the same object and one wants to modify it, their actions are serialised, with all of T1 finishing before T2 continues.
<!-- Sources: W7-1 p.30 -->

#### Ordering the locks for the sale transaction

![Slide 32 - Locking timeline for the sale transaction](assets/08-transactions-concurrency/slide-32.png)

Put the sale transaction from Section 1 under "pessimistic row-level locking + the two-phase protocol"; the table at the bottom is the chronological order:

1. steps 1–3 lock the three pieces of data it needs: the `Product` row for G43546, `Action`, and the `ProductStockLevel` row for G43546;
2. steps 4–7 set variables, read the retail price, insert the sale, reduce stock;
3. steps 8–10 unlock the three in turn.

The key point is that **every lock is taken before any lock is released**.
<!-- Sources: W7-1 p.31-32 -->

<a id="topic-4"></a>
## 4. Isolation levels

An isolation level sets how far a transaction is exposed to the actions of other running transactions, trading consistency against concurrency. Set it with `SET TRANSACTION ISOLATION LEVEL <level>;`
<!-- Sources: W7-1 p.33 -->

| Level | Behaviour | What can happen |
| --- | --- | --- |
| READ UNCOMMITTED | No shared locks before reading; high performance | **Dirty read**: reading another transaction's uncommitted data, which may later be rolled back; no isolation |
| READ COMMITTED (default in Oracle, SQL Server, Postgres) | Reads only committed changes; exclusive locks before writing, shared locks before reading | Reading the same data twice in one transaction may give different results |
| REPEATABLE READ (MySQL default) | The first `SELECT` creates a snapshot that later `SELECT`s in the same transaction see | Ignores others' changes, which can cause lost updates; **phantom reads** (new rows inserted by others) can appear |
| SERIALIZABLE | Locks for both reads and writes; rows selected by T1 cannot be changed, deleted or have new rows inserted by others until T1 finishes | Strongest isolation, least concurrency |
<!-- Sources: W7-1 p.34-41 -->

The table merges four pages of slide text; the four timeline examples below are the slides' evidence. Each figure has three columns: time point, Process 1, Process 2; check whether what Process 1 sees changes between its two `SELECT`s.

### Dirty read

![Slide 35 - Example of dirty read](assets/08-transactions-concurrency/slide-35.png)

At t2 Process 2 starts a transfer, taking 100 from account 1 and adding 100 to account 2, **but without `COMMIT`** (comment on the right at t3). At t3 Process 1 reads savings 100 and credit 800, which answers the question on the right: the dirty read happens at t3, because it reads data that may still be rolled back.

### READ COMMITTED: other transactions' committed new rows become visible

![Slide 37 - READ COMMITTED example](assets/08-transactions-concurrency/slide-37.png)

At t4 Process 2 inserts a loan account and commits at t5. Process 1 reads 2 rows at t3 and 3 rows at t6. No dirty read, but two reads in the same transaction give different results.

### REPEATABLE READ: one snapshot for the whole transaction

![Slide 39 - REPEATABLE READ example](assets/08-transactions-concurrency/slide-39.png)

At t4 Process 2 adds 100 to account 1 and commits, yet Process 1 still reads 200 at t6: it keeps seeing the snapshot made by its first `SELECT`.

**Common mistake:** a REPEATABLE READ snapshot covers the whole table, not just the rows selected by `WHERE`; it is deleted when the transaction ends.
<!-- Sources: W7-1 p.39 -->

### SERIALIZABLE: others cannot change what I have read

![Slide 41 - SERIALIZABLE example](assets/08-transactions-concurrency/slide-41.png)

As with REPEATABLE READ, t6 returns exactly the rows of the first read; the extra restriction is that rows Process 1 has read cannot be changed, deleted or have new rows inserted by others until it finishes.

**Illustrative example (our own):** a month-end report sums 10,000 accounts while transfers keep committing. If the report must contain no uncommitted data and stay consistent from start to finish, it needs at least REPEATABLE READ; READ COMMITTED only prevents dirty reads, and the sum would still mix in values that others committed mid-way, which is the inconsistent retrieval of Section 2.

<a id="topic-5"></a>
## 5. Deadlock and other concurrency control methods

### Deadlock

Two transactions wait for each other to release locks: T1 locks X and then wants Y, T2 locks Y and then wants X, and without intervention they wait forever. Three or more transactions can form a cycle too: T1 waits for T2, T2 for T3, T3 for T1. **Deadlock can only occur with exclusive locks; with shared locks alone it cannot.**
<!-- Sources: W7-1 p.42; Apple Notes FE - Transactions and Concurrency -->

![Slide 43 - Deadlock example](assets/08-transactions-concurrency/slide-43.png)

Read the sequence diagram on the left top to bottom; the five numbered notes on the right match it step by step: each transaction obtains a read lock on one object; then transaction 1 requests a write lock on object 2 and is blocked by transaction 2's read lock (yellow Lock Wait); transaction 2 requests a write lock on object 1 and is blocked by transaction 1's read lock, giving the deadlock at the red cross. The DBMS chooses transaction 2 as the **victim** and rolls it back; once its read lock is released, transaction 1 gets its write lock.
<!-- Sources: W7-1 p.43 -->

| Approach | How |
| --- | --- |
| Timeout | Give up after waiting too long |
| Prevention | Design transactions carefully, e.g. always acquire locks in the same order and release them as soon as possible |
| Detection | Periodically scan the transaction log for wait cycles and abort one transaction |
| Avoidance | Avoid circular waits; use an algorithm to predict whether running certain transactions together could deadlock |
<!-- Sources: W7-1 p.44; Apple Notes FE - Transactions and Concurrency -->

### Timestamps and optimistic methods

- **Timestamp**: each transaction gets a globally unique timestamp, and accessed data items are stamped too; when a transaction wants to read or write, the DBMS compares timestamps to decide whether to allow it;
- **Optimistic**: assume most operations do not conflict; run the transaction without restrictions, and only when it is ready to commit check whether any data it read has changed, rolling back if so.
<!-- Sources: W7-1 p.45; Apple Notes FE - Transactions and Concurrency -->

<a id="topic-6"></a>
## 6. The transaction log and recovery

### What the log records

When a transaction cannot complete, it must be aborted and its changes rolled back. To make this possible the DBMS tracks every update; the **transaction log** contains:
<!-- Sources: W7-1 p.46 -->

- a record for the beginning of the transaction;
- for each SQL statement: the operation (update, delete, insert), the objects affected, the "before" and "after" values of updated fields, and pointers to the previous and next log entries;
- the end (`COMMIT`) of the transaction.
<!-- Sources: W7-1 p.46 -->

### Recovering from failure

![Slide 47 - Checkpoint and crash](assets/08-transactions-concurrency/slide-47.png)

The timeline shows a checkpoint and a crash. The red arrows are transactions: those still incomplete at the crash are undone from the log during recovery, while committed ones are kept. After a system failure, the DBMS examines the log for all uncommitted or incomplete transactions and restores the database to its previous consistent state. The log can also restore a corrupted database.
<!-- Sources: W7-1 p.47 -->

![Slide 48 - Example transaction log](assets/08-transactions-concurrency/slide-48.png)

Map the elements of the previous page onto a real log table:

- the `TRX NUM` column splits the entries into three transactions, 101, 106 and 155; `PREV PTR` / `NEXT PTR` chain each transaction's entries into a linked list (e.g. 101's 341 → 352 → 363 → 365);
- `BEFORE VALUE` / `AFTER VALUE` are the "before" and "after" values: entry 352 changes product 54778-2T's stock `PROD_QOH` from 45 to 43;
- the dark row 423 is the checkpoint, and the bottom row marks the crash;
- all three transactions have a `COMMIT` record before the crash, so recovery should keep all of them. 101 finished before the checkpoint; 106 spans the checkpoint; 155 lies entirely after it.

<details markdown="1">
<summary>Extension (optional): why a checkpoint shortens recovery</summary>

The slides only say "recover from the log". A common scheme: at a checkpoint the in-memory changes are written to disk, so transactions committed before the checkpoint (such as 101) need no further work; transactions committed after it (such as 106 and 155) are redone using `AFTER VALUE`; transactions still uncommitted at the crash are undone using `BEFORE VALUE`. This is an explanation added to the slides; the exact algorithm varies between DBMSs.

</details>

**Note:** the student's revision recorded that recovering from a damaged disk uses the checkpoint information, the log and a database backup. Backup types and "redo the logs" incremental restore are in [13](13-security-backups.en.md#topic-3); where the log manager sits inside the DBMS is in [09](09-dbms-architecture-administration.en.md#topic-2).
<!-- Sources: Apple Notes Double Check; W10-2 p.21 -->

## Self-check

1. Write a transaction that cuts a product's retail price by 10% and records the old and new price in a `PriceHistory` table. Why must the two steps share a transaction?
2. Two tellers deposit into the same account at once and one deposit vanishes. Which concurrency problem is this? Can a binary lock fix it?
3. T1 holds a shared lock on item A. T2 requests a shared lock on A and T3 an exclusive lock on A. What happens to each?
4. An online shop shows its catalogue to customers while stock quantities may be changing in other transactions. Why is READ COMMITTED enough here, but not for a month-end reconciliation report?
5. In the example log, if the crash happened after entry 431 and before entry 457, how should recovery treat transaction 106?
