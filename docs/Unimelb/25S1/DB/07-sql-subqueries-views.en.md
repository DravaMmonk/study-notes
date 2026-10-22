# INFO90002 Week 5 - SQL Part 3: Subqueries, Views and Data Control

Sources: `lecture/INFO90002_Week5-3_SQL3.pdf`, `lecture/INFO90002_Week5-2_SQL2.pdf` (p.24); `tutorial/Week6Tute_SQL_Advanced_SOLUTIONS.pdf`, `tutorial/Week7Tute_SQL_Advanced2_SOLUTIONS.pdf`, `tutorial/Week8Tute_SQL_Advanced3_Solutions.pdf`. There is no matching Apple Note.

This lecture asks: **when a question needs "work out a set of values first, then use it", asks whether something "exists / does not exist", or even demands "true for all …", how does SQL express it? How do you package a complex query as a view, and how do you take apart a new question?**

Learning path: [Nested subqueries](#topic-1) → [EXISTS and correlated subqueries](#topic-2) → [Relational division: "for all"](#topic-3) → [Views and data control](#topic-4) → [Thinking like SQL](#topic-5).

Key points: choosing between `IN` / `NOT IN` / `EXISTS`; what views are for. Hard parts: a correlated subquery runs once per outer row; double `NOT EXISTS`. Common mistakes: using `=` when the subquery returns several rows; a `NULL` inside a `NOT IN` subquery.

The auction example comes from the slides; the other examples use the department-store practice database of [05](05-sql-select-basics.en.md#topic-1), and results on the practice database were checked locally against the same data.

<a id="topic-1"></a>
## 1. Nested subqueries

### A subquery returns a table

Every `SELECT` returns a table, so one query can be nested inside another. The most common use of a subquery is a set test: is a value in a set (set membership), or how does it compare with the values in a set (set comparison)?
<!-- Sources: W5-3 p.4 -->

![Slide 05 - Sub-query comparison operators](assets/07-sql-subqueries-views/slide-05.png)

Remember the four operators by what they ask: `IN` / `NOT IN` ask whether a value is in the subquery's result list; `ANY` asks whether **at least one** returned value meets the condition; `ALL` asks whether **every** returned value does; `EXISTS` ignores the values and only asks whether the subquery returns at least one row.
<!-- Sources: W5-3 p.5 -->

An `ALL` example: `WHERE Salary > ALL (SELECT Salary FROM employee WHERE departmentID = 11)` means paid more than everyone in Marketing, which is the same as "above that department's highest salary"; in the practice database that is Alice and Sarah. Likewise, `> ANY (…)` is the same as "above that department's lowest salary".
<!-- Sources: W5-3 p.5 -->

### Slide example: the auction database

![Slide 06 - Auction bids physical model](assets/07-sql-subqueries-views/slide-06.png)

The slides' auction database has four tables: `Seller`, `Artefact`, `Buyer`, and `Offer`, which records "which buyer bid how much on which artefact". Look at `Offer` in the middle: its primary key consists of three foreign keys, `SellerID`, `BuyerID` and `ArtefactID`, making it the associative table that links the other three.
<!-- Sources: W5-3 p.6-7 -->

![Slide 07 - Auction tables with sample data](assets/07-sql-subqueries-views/slide-07.png)

Read `Offer` at the bottom right first: all four bids come from buyers 1 (Maggie) and 2 (Nigel), on artefacts 1 (the Vase) and 2 (the Sketch). From that you can already guess the next answers: nobody bid on artefact 3 (the Pot), and buyer 3 (Olga) never bid.

![Slide 08 - Subquery example: bidders on artefact 1](assets/07-sql-subqueries-views/slide-08.png)

The inner query in brackets runs first and gives the list of `BuyerID`s who bid on artefact 1, {1, 2}; the outer query then checks, row by row, whether each buyer's `BuyerID` is in that list. The result is Maggie and Nigel.

![Slide 09 - Artefacts with no offers](assets/07-sql-subqueries-views/slide-09.png)

Replacing `IN` with `NOT IN` finds "what is missing": artefacts whose `ID` is not in the list of artefacts appearing in `Offer`. The only result is the Pot. The physical model on the right reminds you that the link here is `Artefact.ID` to `Offer.ArtefactID`.

![Slide 11 - Buyers who have not bid on the Pot](assets/07-sql-subqueries-views/slide-11.png)

This one nests two levels, so read it from the inside out: the innermost query finds the `ID` of the artefact named Pot; the middle one finds the `BuyerID`s that bid on those artefacts; the outer one keeps buyers not in that list. Since nobody bid on the Pot, the middle level is empty and all three buyers are returned.
<!-- Sources: W5-3 p.8-11 -->

### Single-value subqueries and IN

To find "which department the lowest-paid person is in": first find the lowest salary, then find the rows equal to it. The two steps fit in one statement: the inner query in brackets runs first, and the outer query compares each row with its result.
<!-- Sources: Tut W6 Sol p.5-6 -->

```sql
SELECT FirstName, LastName, departmentID
FROM employee
WHERE Salary = (SELECT MIN(Salary) FROM employee);
-- Paul Innit, department 4, salary 41000
```
<!-- Sources: Tut W6 Sol p.6 -->

The tutorial points out that `ORDER BY` with `LIMIT 1` also works, but misses people when several share the lowest salary, so it is best avoided.
<!-- Sources: Tut W6 Sol p.5 -->

**Common mistake:** when the inner query returns several rows, `=` cannot be used; MySQL reports `Error Code: 1242. Subquery returns more than 1 row`. Use `IN` instead:
<!-- Sources: Tut W6 Sol p.6 -->

```sql
-- Number of employees working in the departments on floor 5
SELECT COUNT(employeeID) AS EMP_COUNT_FLOORS
FROM employee
WHERE departmentID IN (SELECT departmentID FROM department WHERE Floor = 5);
-- 9
```
<!-- Sources: Tut W6 Sol p.6 -->

### Prefer a join when one will do

![Slide 12 - IN versus INNER JOIN](assets/07-sql-subqueries-views/slide-12.png)

Both halves answer the same question, "buyers who bid on artefact 1". The left uses an `IN` subquery; the right inner-joins `Buyer` and `Offer` and then filters, and the red arrow marks the join as more efficient. This matches the rule of thumb "joins are faster than subqueries" in [06](06-sql-joins-and-changes.en.md#topic-3).
<!-- Sources: W5-3 p.12; W8-1 p.23 -->

**Common mistake:** the two forms are not always identical row for row. If a buyer bids twice on the same artefact, the join lists them twice and the `IN` form once; add `DISTINCT` when needed. Also, the right-hand version uses `SELECT *`, so the result carries every column of both `Buyer` and `Offer`; write `SELECT b.*` if you only want buyer details.

### Hard part: NOT IN meets NULL

The slides mention that `IN` cannot compare with `NULL` while `EXISTS` can (slide 24 in [06](06-sql-joins-and-changes.en.md#topic-3)). The consequence is easy to see in the practice database:
<!-- Sources: W5-2 p.24 -->

```sql
-- Trying to count "employees who are nobody's boss"
SELECT COUNT(*) FROM employee
WHERE employeeID NOT IN (SELECT BossID FROM employee);
-- The result is 0!
```

The reason: the `BossID` column contains one `NULL` (Alice has no boss). `x NOT IN (…, NULL)` means "x differs from every value", and "x differs from NULL" is unknown, so the whole condition is never true. Fix it by excluding nulls in the subquery, or use `NOT EXISTS`:
<!-- Sources: W5-2 p.24; tutorial/labs2018engv6.sql -->

```sql
SELECT COUNT(*) FROM employee
WHERE employeeID NOT IN (SELECT BossID FROM employee WHERE BossID IS NOT NULL);
-- 11

SELECT COUNT(*) FROM employee e
WHERE NOT EXISTS (SELECT * FROM employee w WHERE w.BossID = e.employeeID);
-- 11
```

**Key point:** the danger comes from a `NULL` in the **subquery result**, not in the outer table. When an outer row's value is `NULL`, only that row is left out; a single `NULL` in the subquery result makes `NOT IN` reject **every** row. So before writing `NOT IN`, ask: can the column the subquery returns be null?

<a id="topic-2"></a>
## 2. EXISTS and correlated subqueries

### EXISTS only asks "is there any?"

![Slide 13 - EXISTS example](assets/07-sql-subqueries-views/slide-13.png)

`EXISTS (subquery)` is true when the subquery returns one or more rows. It does not care which columns come back, so `SELECT *` is fine inside it. The key is the inner `WHERE Buyer.BuyerID = Offer.BuyerID`: the subquery refers to a column of the outer table, so it is re-run for **each** outer row. This is a **correlated subquery**; the earlier `IN` subqueries do not refer to the outer query, run only once, and are called non-correlated.
<!-- Sources: W5-3 p.5, p.13 -->

How to read it: for each buyer, ask "does `Offer` contain a bid by this buyer on artefact 1?" If so, keep the buyer. **Common mistake (slide data):** the result table on this page calls buyer 2 Nicole, phone 0444444444, which does not match the data on slides 07 and 08 (Nigel, 0519 434 389): the screenshot comes from a different sample dataset. The query logic is unaffected; the result is still buyers 1 and 2.

### IN or EXISTS?

| | `IN` | `EXISTS` |
| --- | --- | --- |
| Large subquery result | Slower | Much faster |
| Small subquery result | Faster | Slower |
| Meeting `NULL` | Cannot compare correctly | Can |
<!-- Sources: W5-2 p.24 -->

The `NULL` row shows up concretely as the `NOT IN` trap of [the previous topic](#topic-1): `NOT EXISTS` only asks whether a matching row exists, and `NULL` matches no row, so it cannot turn the whole result into unknown.

### Both conditions / either condition

Two independent conditions can each be written as a subquery and combined with `AND` or `OR`:
<!-- Sources: Tut W7 Sol p.8; Tut W6 Sol p.11-12 -->

```sql
-- Items both supplied by Nepalese Corp. and sold in the Navigation department
SELECT DISTINCT item.Name
FROM item
WHERE itemID IN (
        SELECT di.itemId FROM deliveryitem di
        INNER JOIN delivery dl ON di.DeliveryId = dl.DeliveryID
        INNER JOIN supplier s  ON s.SupplierID = dl.SupplierID
        WHERE s.Name = 'Nepalese Corp.')
  AND itemID IN (
        SELECT si.itemId FROM saleitem si
        INNER JOIN sale sa       ON sa.SaleID = si.SaleId
        INNER JOIN department d  ON d.departmentID = sa.departmentID
        WHERE d.Name = 'Navigation');
```
<!-- Sources: Tut W7 Sol p.8 -->

Replace `AND` with `OR` for "either"; "either" can also be written as a `UNION` of two queries (see [06](06-sql-joins-and-changes.en.md#topic-1)).
<!-- Sources: Tut W6 Sol p.11-12 -->

A subquery can also contain `GROUP BY … HAVING`:

```sql
-- Name and salary of managers who manage more than 2 employees
SELECT FirstName, LastName, Salary
FROM employee
WHERE employeeID IN (SELECT BossID FROM employee GROUP BY BossID HAVING COUNT(*) > 2);
-- Alice, Andrew, Clare
```
<!-- Sources: Tut W7 Sol p.7 -->

<a id="topic-3"></a>
## 3. Relational division: "for all"

Questions such as "items sold by **all** departments on floor 2" or "departments that have sold **every** item they received" are called relational division. The slides do not cover it directly, but the Week 8 tutorial gives two ways to write it.
<!-- Sources: Tut W8 Sol p.8-11 -->

### Method 1: compare counts

Floor 2 has two departments (Clothes, Recreation). An item satisfies "all" if it has been sold on floor 2 by two **different** departments:
<!-- Sources: Tut W8 Sol p.10 -->

```sql
SELECT si.itemId
FROM saleitem si
INNER JOIN sale s       ON si.SaleId = s.SaleID
INNER JOIN department d ON s.departmentID = d.departmentID
WHERE d.Floor = 2
GROUP BY si.itemId
HAVING COUNT(DISTINCT d.departmentID) =
       (SELECT COUNT(DISTINCT departmentID) FROM department WHERE Floor = 2);
-- item 14
```
<!-- Sources: Tut W8 Sol p.10 -->

How to read it: `WHERE` first keeps only floor-2 sales; after grouping by item, the left side counts "how many different floor-2 departments sold this item", and the subquery on the right counts "how many departments floor 2 has". If the two are equal, none was missed.

### Method 2: double NOT EXISTS

Rewrite "sold in every floor-2 department" as "there is **no** floor-2 department in which this item was **not** sold":
<!-- Sources: Tut W8 Sol p.8-10 -->

```sql
SELECT i.itemID
FROM item i
WHERE NOT EXISTS (                         -- there is no department such that:
  SELECT * FROM department d
  WHERE d.Floor = 2
    AND NOT EXISTS (                       --   this item has no sale in it
      SELECT * FROM saleitem si
      INNER JOIN sale s ON si.SaleId = s.SaleID
      WHERE si.itemId = i.itemID
        AND s.departmentID = d.departmentID
    )
);
-- also item 14
```
<!-- Sources: Tut W8 Sol p.10 -->

**Hard part:** to read a double `NOT EXISTS`, fix one item in the outer query and check the floor-2 departments one by one in the middle level; as soon as one department makes the innermost query "find no record", the middle level has a row, the outer `NOT EXISTS` is false, and the item is excluded. The counting method is more intuitive and generalises more easily; for example, changing `> 1` to `> 2` answers "at least three kinds".
<!-- Sources: Tut W8 Sol p.9-10; Tut W7 Sol p.10 -->

**Common mistake:** the counting method must use `COUNT(DISTINCT …)`: one department selling the same item several times produces several rows.

<a id="topic-4"></a>
## 4. Views and data control

### Views: stored queries

![Slide 15 - Views](assets/07-sql-subqueries-views/slide-15.png)

A relation that is not in the physical model but is offered to users as a virtual relation is called a **view**. The syntax is `CREATE VIEW viewname AS valid SELECT statement`. Read the page in three parts:
<!-- Sources: W5-3 p.15 -->

- Benefits: hiding query complexity; hiding data users may not see (for example, keeping stock levels or purchase prices from customers), with different users using different views, which is one way to improve security (how permissions are granted is in [13](13-security-backups.en.md#topic-1));
- A defined view stores only its definition (metadata), not data; it can be used like a table; every query shows up-to-date data.
<!-- Sources: W5-3 p.15; Tut W8 Sol p.5 -->

![Slide 16 - Create view example: EmpPay](assets/07-sql-subqueries-views/slide-16.png)

`EmpPay` merges three kinds of employee into one "pay table": hourly workers contribute `HourlyRate`, salaried staff `AnnualSalary`, consultants `BillingRate`, each aliased `AS Pay`, and two `UNION`s stack them. This is exactly the set-operation requirement from [06](06-sql-joins-and-changes.en.md#topic-1): every part must line up in column count and type. From then on users only query `EmpPay` and never need to know that four tables sit behind it.

![Slide 17 - CREATE VIEW example: department salary](assets/07-sql-subqueries-views/slide-17.png)

The second example stores "join departments to employees and total the salaries per department" as the view `v_DEPT_SALARY`. Look at `SUM(employee.salary) AS DEPTSAL`: a computed column in a view must be named, or it cannot be referred to by name later.

![Slide 18 - Using a view](assets/07-sql-subqueries-views/slide-18.png)

At the top left, `SELECT * FROM EmpPay;` returns all 6 employees; at the bottom right, adding `WHERE EmployeeType = "H" OR EmployeeType = "C"` to the view leaves 4 rows. Querying a view is written exactly like querying a table.

The tutorial does the same on the practice database: store "average salary per department" as a view, then join it to the employee table:

```sql
CREATE VIEW vdepartmentSalary (departmentID, dptavgsal) AS
SELECT departmentID, AVG(Salary)
FROM employee
GROUP BY departmentID;

-- Each Accounting employee's difference from the department average
SELECT e.FirstName, e.LastName, FORMAT(e.Salary - v.dptavgsal, 2) AS DiffFromAvg
FROM employee e
INNER JOIN vdepartmentSalary v ON v.departmentID = e.departmentID
INNER JOIN department d        ON d.departmentID = e.departmentID
WHERE d.Name = 'Accounting';
-- Todd +8,000.00, Nancy -8,000.00
```
<!-- Sources: Tut W8 Sol p.6 -->

When a view is used, the DBMS actually runs its definition as a subquery in the `FROM` clause; written out by hand, this is also called an **inline view**. View definitions can be read from the data dictionary: `SELECT table_name, view_definition FROM information_schema.views;`. A `v` prefix on view names is a good habit but not required.
<!-- Sources: Tut W8 Sol p.5-6, p.8 -->

### Data control language and administration statements

![Slide 20 - Data control language and other commands](assets/07-sql-subqueries-views/slide-20.png)

The top half is the **data control language** (DCL): managing users (`CREATE USER`, `DROP USER`, `SET PASSWORD`) and permissions (`GRANT` to give, `REVOKE` to take back). The bottom half lists other administration commands: backing up, restoring and analysing tables (`BACKUP TABLE`, `RESTORE TABLE`, `ANALYZE TABLE`), plus the everyday `DESCRIBE tablename` (show a table's structure) and `USE db_name` (switch database). The last line says these are usually called "database administration statements".
<!-- Sources: W5-3 p.20; W5-1 p.2 -->

Views and DCL together form a kind of access control: do not grant a class of users the base table, only `GRANT` them a view without the sensitive columns. Permission models (DAC, RBAC) and practical use of `GRANT` are in [13](13-security-backups.en.md#topic-1).
<!-- Sources: W5-3 p.20 -->

<a id="topic-5"></a>
## 5. Thinking like SQL

![Slide 22 - How to think like SQL](assets/07-sql-subqueries-views/slide-22.png)

The slides give three steps for writing a query:
<!-- Sources: W5-3 p.22 -->

1. Use the database design as a **map**: find the columns and tables you need and the join path between them;
2. Use the structure of the `SELECT` statement as a **template**;
3. **Fill in** the parts one by one to build the query.

![Slide 23 - Example schema: students, streams and courses](assets/07-sql-subqueries-views/slide-23.png)

The question: which employers employ students who attend a class in a location with capacity over 20, and what are those locations? First find the columns on the diagram: `Employer` is in `Student`, `Location` and `Capacity` are in `Stream` (a class stream). Then the path: there is no direct line between `Student` and `Stream`, so go through the associative table `StudentStream`. `Instructor` and `Course` are not needed.

![Slide 24 - How to approach writing queries](assets/07-sql-subqueries-views/slide-24.png)

The top left breaks the question into three things: the output columns (F: Employer, Location, Capacity), the tables involved (T: Student, Stream, StudentStream), and the condition (capacity over 20). The two SQL versions below give the same result: the left writes two `INNER JOIN`s in a row and lists both join conditions in one `ON … AND …`, which MySQL allows; the right gives each `JOIN` its own `ON`, which is clearer (see [06](06-sql-joins-and-changes.en.md#topic-2)).
<!-- Sources: W5-3 p.23-24 -->

**Note:** the slides recommend LeetCode's "Top SQL 50" for extra practice.
<!-- Sources: W5-3 p.26 -->

## Self-check

1. Write "employees paid more than their own department's average". Which outer column must the inner query refer to, and why does that make it a correlated subquery?
2. List "suppliers who have never supplied a compass (name starting with Compass)", once with `NOT IN` and once with `NOT EXISTS`. If the data contains a `NULL`, where must it appear to affect the `NOT IN` version?
3. Use the counting method for "departments that have sold **every** item of type N": what does the left side of `HAVING` count for each department, and what does the subquery on the right count?
4. Front-desk staff should be able to look up item names and selling prices but not purchase prices or stock levels. How do you achieve this with a view and DCL?
5. Using the three steps "map – template – fill in", write down the columns, tables, join path and condition needed for "the phone number of instructors who teach student 202 in a course costing over 10000".
