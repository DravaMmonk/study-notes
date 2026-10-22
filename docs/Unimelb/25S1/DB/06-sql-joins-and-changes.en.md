# INFO90002 Week 5 - SQL Part 2: Joins, Set Operations and Changing Data

Sources: `lecture/INFO90002_Week5-2_SQL2.pdf`, `lecture/lecture_queries.sql`; `tutorial/Week6Tute_SQL_Advanced_SOLUTIONS.pdf`, `tutorial/Week7Tute_SQL_Advanced2_SOLUTIONS.pdf`, `tutorial/Week8Tute_SQL_Advanced3_Solutions.pdf`, `tutorial/Week9Tute_SQL_DDL_Solutions.pdf`, `tutorial/scott.sql`. There is no matching Apple Note.

This lecture asks: **how do you combine the results of two queries, join several tables (including listing the rows that have no match), and change data and table structures safely?**

Learning path: [Query extras: rules, functions and set operations](#topic-1) → [Joins: inner, outer and self joins](#topic-2) → [Efficiency and readability](#topic-3) → [Changing data and table structure](#topic-4).

Key points: `LEFT OUTER JOIN … WHERE right.key IS NULL` to find "what is missing"; the two aliases of a self join; the difference between `UNION` and `UNION ALL`. Hard parts: whether a condition on an outer join goes in `ON` or `WHERE`; counting when several one-to-many tables are outer-joined at once. Common mistakes: forgetting `WHERE` on `UPDATE` / `DELETE`; the order of several `UPDATE` statements; `TRUNCATE` and `DROP` cannot be undone.

Apart from the slides' own examples, all examples use the department-store practice database introduced in [05](05-sql-select-basics.en.md#topic-1); row counts and results on the practice database were checked locally against the same data.

<a id="topic-1"></a>
## 1. Query extras: rules, functions and set operations

### Recap: a few rules for writing SQL

![Slide 03 - Things to remember about SQL](assets/06-sql-joins-and-changes/slide-03.png)

This page gathers rules that were scattered through Part 1. Point by point: keywords are case-insensitive, and capitals are only for readability; whether **table names** are case-sensitive depends on the operating system (on Linux / Unix, `Account` and `ACCOUNT` are two tables), while **column names** are not; `SELECT` can compute a bare expression (`SELECT 1*1+1/1-1;`) or make up a literal column that is not in any table (`SELECT '123459999' AS MyID`). What table-name case means on the practice database is in [05](05-sql-select-basics.en.md#topic-1).

![Slide 04 - Note on SELECT and ORDER BY](assets/06-sql-joins-and-changes/slide-04.png)

**Common mistake:** without `ORDER BY`, the row order is undefined and the optimiser may change it; write it when you need an order and leave it out when you do not, because sorting slows execution. Details are in [05](05-sql-select-basics.en.md#topic-3).

![Slide 05 - HAVING clause revisited](assets/06-sql-joins-and-changes/slide-05.png)

The red ring around `COUNT(CustomerID) > 5` marks a "condition over the aggregate", which can only go in `HAVING`. The version on the right first names the aggregate `CountOfCustomers` in `SELECT` and then uses the alias directly in `HAVING`, which MySQL allows. The division of labour between `WHERE` and `HAVING` is in [05](05-sql-select-basics.en.md#topic-4).

![Slide 06 - Comparison and logic operators](assets/06-sql-joins-and-changes/slide-06.png)

Look at Example 3: `(LastName='Nguyen' OR LastName='Smith') AND DeptNo=170`. Without the brackets, `AND` binds before `OR`, and the meaning becomes "anyone named Nguyen, or a Smith in department 170". Always add brackets when mixing `AND` and `OR`.

### String functions and other common functions

![Slide 07 - Some useful string functions](assets/06-sql-joins-and-changes/slide-07.png)

The slide lists only four string functions; the note on the right says case conversion only touches A–Z / a–z, leaving digits and symbols as they are. The tutorials also use the functions below; learn them together:

| Function | Purpose |
| --- | --- |
| `UPPER()`, `LOWER()` | Convert to upper / lower case (characters outside A–Z are unaffected) |
| `LEFT(s, n)`, `RIGHT(s, n)` | Take the left / right n characters |
| `CONCAT(a, ' ', b)` | Join strings |
| `ROUND(x, d)` | Round to d places; the result is still a **number** |
| `FORMAT(x, d)` | Keep d places and add thousands separators; the result is a **string**, e.g. `60,529.41` |
| `YEAR()`, `MONTHNAME()`, `DAYNAME()` | Year, month name, day name |
| `DATEDIFF(d1, d2)` | Number of days between two dates |
<!-- Sources: W5-2 p.7; Tut W6 Sol p.1; Tut W7 Sol p.12-13 -->

**Key point:** none of these functions **changes the data in the table**; they only affect the output. **Common mistake:** `FORMAT` returns a string, so sorting or comparing its result works character by character; use `ROUND` when you still need to calculate.
<!-- Sources: W5-2 p.7 -->

### Set operations: stacking the results of two queries

![Slide 08 - Set operations](assets/06-sql-joins-and-changes/slide-08.png)

A join places two tables **side by side** to make wider rows; a set operation stacks the results of two queries **on top of each other** to make a longer result. Look at the second requirement: both queries must return the same number of columns with matching data types, though column lengths may differ. `UNION` combines and removes duplicates; adding `ALL` keeps duplicate rows; `INTERSECT` keeps only rows found on both sides. The red line at the bottom says that the MySQL used in the course supports only `UNION` and `UNION ALL`.
<!-- Sources: W5-2 p.8-10 -->

<details markdown="1">
<summary>Note: newer MySQL and INTERSECT</summary>

From MySQL 8.0.31, `INTERSECT` and `EXCEPT` are supported too. In versions without them, "on both sides" can be written with an `IN` subquery or an inner join, and "on the left but not the right" with `NOT IN` / `NOT EXISTS` or the anti-join of the next section.

</details>

![Slide 09 - UNION ALL example](assets/06-sql-joins-and-changes/slide-09.png)

The two boxes on the left are the student list and the tutor list. The middle box is the `UNION ALL` result: the red arrows show Connie Chang appearing twice, because she is both a student and a tutor. With `UNION`, she appears once.
<!-- Sources: W5-2 p.8-9 -->

![Slide 10 - UNION example](assets/06-sql-joins-and-changes/slide-10.png)

Each half is an inner join: the top half finds hourly-paid employees (the `Hourly` table), the bottom half salaried ones (`Salaried`). Both halves select only the two columns `Name, EmployeeType`, so the types line up and `UNION` is allowed. Of the 4 result rows, H comes from the top half and S from the bottom. Here `Employee` holds what all employees share, while `Hourly` and `Salaried` each hold what is specific to one kind of employee (hourly rate or annual salary); the view example in [07](07-sql-subqueries-views.en.md#topic-4) uses the same trick to merge three kinds of pay into one column.

![Slide 11 - SELECT with literals](assets/06-sql-joins-and-changes/slide-11.png)

The top-left query returns customers with a gender; the top-right one returns customers whose gender is null, but puts a **literal** `'Unknown'` in its second column: the value is hard-coded in the query, not taken from the table. Now the columns of the two queries line up, and the `UNION` at the bottom merges both parts into one complete list, with a missing gender shown as Unknown.
<!-- Sources: W5-2 p.11 -->

<a id="topic-2"></a>
## 2. Joins: inner, outer and self joins

### Reading joins as Venn diagrams

![Slide 14 - INNER and NATURAL JOIN Venn diagram](assets/06-sql-joins-and-changes/slide-14.png)

The two circles stand for the rows of T1 and T2, and the ticked region is the result. An inner join takes only the overlap: rows that match on both sides by `T1.ID = T2.ID`. `NATURAL JOIN` sits on the same picture because it is also an inner join, only it matches automatically on every same-named column; the risk is in [05](05-sql-select-basics.en.md#topic-5).
<!-- Sources: W5-2 p.12-22; W5-1 p.31 -->

### Slide demo: employees and bosses live in one table

![Slide 15 - INNER JOIN labs demo on employee and boss](assets/06-sql-joins-and-changes/slide-15.png)

The `BossID` of the `employee` table points to `employeeID` in the same table (the unary one-to-many of [03](03-logical-physical-design.en.md#topic-4)). To see an employee next to their boss, open the same table twice under two aliases: `emp` as "employee" and `boss` as "boss". This is a **self join** (the slides call it a unary join). The result table on the left has 16 rows; in the Venn diagram on the right, only Alice Munro is left outside on the EMP side, because her `BossID` is `NULL` and matches no boss, so the inner join drops her.
<!-- Sources: W5-2 p.13-15; Tut W8 Sol p.4 -->

The tutorial's version of the same self join, sorted by boss and employee:

```sql
SELECT emp.FirstName AS Employee, boss.FirstName AS Boss
FROM employee emp
INNER JOIN employee boss
  ON emp.BossID = boss.employeeID
ORDER BY boss.FirstName, emp.FirstName;
```
<!-- Sources: Tut W8 Sol p.4; lecture/lecture_queries.sql -->

**Common mistake (slide diagram):** these Venn diagrams draw Brier Patch outside the BOSS overlap ("nobody's boss"), yet in the result table Sarah Fergusson's boss is Brier. In the practice database the six actual bosses are Alice, Ned, Andrew, Clare, Todd and Brier; read the result table, not just where a name sits in the picture.

![Slide 16 - LEFT OUTER JOIN Venn diagram](assets/06-sql-joins-and-changes/slide-16.png)

A left outer join ticks the whole left circle: every row of T1 is kept, and where T2 has no match the columns are filled with `NULL`.

![Slide 17 - LEFT OUTER JOIN labs demo](assets/06-sql-joins-and-changes/slide-17.png)

The highlighted names are the rows picked by the result. The left outer join keeps every "employee", so even Alice Munro, who has no boss, appears (the first result row, with `NULL` in both boss columns): 17 rows in all.
<!-- Sources: W5-2 p.17; Tut W8 Sol p.4 -->

![Slide 18 - RIGHT OUTER JOIN Venn diagram](assets/06-sql-joins-and-changes/slide-18.png)

A right outer join is the mirror image of the left one: every row of T2 is kept.
<!-- Sources: W5-2 p.12-20; Tut W8 Sol p.1 -->

`LEFT` versus `RIGHT` only depends on which table is written on the left: swap the tables and a left join becomes a right join. Writing `LEFT OUTER JOIN` rather than `LEFT JOIN` states the intent more clearly.

![Slide 19 - RIGHT OUTER JOIN labs demo](assets/06-sql-joins-and-changes/slide-19.png)

This time the "boss" side is kept: every employee is listed once as a possible boss. The first 16 rows are the real employee–boss pairs; the 11 rows with `NULL` in the employee columns (Nancy, Sarah, Sophie, Rita, …) are people with no subordinates, giving 27 rows. This is what the slide means by "Lists every employee of every manager".

![Slide 20 - FULL OUTER JOIN Venn diagram](assets/06-sql-joins-and-changes/slide-20.png)

A full outer join ticks all three regions: every row from both sides is kept. The bottom line states that MySQL does not support `FULL OUTER JOIN`.

<details markdown="1">
<summary>Note: building a full outer join in MySQL</summary>

`UNION` the results of a left and a right outer join:

```sql
SELECT emp.FirstName AS Employee, boss.FirstName AS Boss
FROM employee emp LEFT OUTER JOIN employee boss ON emp.BossID = boss.employeeID
UNION
SELECT emp.FirstName, boss.FirstName
FROM employee emp RIGHT OUTER JOIN employee boss ON emp.BossID = boss.employeeID;
```

On the practice database this gives 28 rows: 16 pairs + Alice with no boss + 11 people with no subordinates. `UNION` removes the 16 pairs that both halves share; if the original data itself contains identical rows, they are merged too, so take care.

</details>

![Slide 21 - LEFT OUTER JOIN with WHERE T2.ID IS NULL](assets/06-sql-joins-and-changes/slide-21.png)

Only the part of the left circle outside the right circle is selected: do a left outer join, then keep only rows where the right-hand side is `NULL`. The result is "rows of the left table with no counterpart in the right table". This pattern is often called an **anti-join**.
<!-- Sources: W5-2 p.21 -->

![Slide 22 - Anti-join labs demo](assets/06-sql-joins-and-changes/slide-22.png)

Only Alice Munro is left: she is the one employee for whom no boss can be found. **Common mistake (slide title):** the page is titled "INNER JOIN – Labs demo", but the query is actually `LEFT OUTER JOIN … WHERE boss.employeeid IS NULL`.

The demos side by side:

| Variant | Question answered | Rows |
| --- | --- | --- |
| `emp INNER JOIN boss` | Every employee who has a boss, with that boss | 16 |
| `emp LEFT OUTER JOIN boss` | All employees, including the general manager who has no boss | 17 |
| `emp RIGHT OUTER JOIN boss` | Everyone on the "boss" side with their subordinates; people with no subordinates get `NULL` in the employee columns | 27 |
| `emp LEFT OUTER JOIN boss … WHERE boss.employeeID IS NULL` | People with no boss (only Alice) | 1 |
<!-- Sources: W5-2 p.15-22; lecture/lecture_queries.sql -->

### The typical outer-join use: list the rows with no records too

```sql
-- How many times each item has been delivered, including items never delivered
SELECT i.itemID, i.Name, COUNT(di.DeliveryId) AS Deliveries
FROM item i
LEFT OUTER JOIN deliveryitem di
  ON di.itemId = i.itemID
GROUP BY i.itemID, i.Name
ORDER BY Deliveries;
-- The first two rows: Polo Mallet and Hammock, with 0
```
<!-- Sources: Tut W8 Sol p.1-2 -->

With `INNER JOIN`, items never delivered would not appear at all, so the "0" would be invisible. **Common mistake:** use `COUNT(di.DeliveryId)` rather than `COUNT(*)` here: on an unmatched row `di.DeliveryId` is `NULL` and is not counted, giving 0; `COUNT(*)` would count that row as 1. The rule: after an outer join, count a column of the **right** table.
<!-- Sources: Tut W8 Sol p.1-2; W5-1 p.19 -->

### Anti-joins: finding what is missing

```sql
-- Departments that have never received a delivery
SELECT d.departmentID, d.Name
FROM department d
LEFT OUTER JOIN deliveryitem di
  ON d.departmentID = di.departmentID
WHERE di.departmentID IS NULL;
-- Management, Accounting, Purchasing, Personnel, Marketing (the office departments on floor 5)
```
<!-- Sources: Tut W8 Sol p.3 -->

The same question can be written with a `NOT IN` subquery; the tutorial notes that subqueries are usually slower than joins. The `NULL` trap of `NOT IN` is in [07](07-sql-subqueries-views.en.md#topic-1).
<!-- Sources: Tut W8 Sol p.3; W5-2 p.23 -->

### Several outer joins and COUNT(DISTINCT)

```sql
-- Deliveries and sales per department, including departments with 0 of both
SELECT d.departmentID, d.Name,
       COUNT(DISTINCT di.DeliveryId) AS noOfDeliveries,
       COUNT(DISTINCT s.SaleID)      AS noOfSales
FROM department d
LEFT OUTER JOIN deliveryitem di ON di.departmentID = d.departmentID
LEFT OUTER JOIN sale s          ON s.departmentID  = d.departmentID
GROUP BY d.departmentID, d.Name;
```
<!-- Sources: Tut W8 Sol p.12 -->

**Hard part:** with two one-to-many tables joined to a department at once, its delivery rows and sale rows multiply: a department with $a$ delivery rows and $b$ sales becomes $a\times b$ rows after the joins. `COUNT(DISTINCT …)` is then required, or both numbers are inflated.

### Self joins that compare two rows of one table

A self join is not only for "looking up the boss's name"; it also puts a row and its related row side by side for comparison:

```sql
-- Employees paid more than their boss
SELECT emp.FirstName, emp.Salary, boss.FirstName AS Boss, boss.Salary AS BossSalary
FROM employee emp
INNER JOIN employee boss ON emp.BossID = boss.employeeID
WHERE emp.Salary > boss.Salary;
-- Sarah (86000), whose boss is Brier (73000)

-- Number of direct reports per boss
SELECT boss.employeeID, CONCAT(boss.FirstName, ' ', boss.LastName) AS Boss, COUNT(*) AS Reports
FROM employee wrk
INNER JOIN employee boss ON wrk.BossID = boss.employeeID
GROUP BY boss.employeeID, Boss
ORDER BY Reports DESC;
-- Andrew Jackson has the most, 5
```
<!-- Sources: Tut W7 Sol p.5; Tut W8 Sol p.5 -->

### Joining three or more tables

The principle is the same: every pair of adjacent tables needs a "primary key = foreign key" condition. Find the path on the ER diagram first: `item → saleitem → sale → department`.
<!-- Sources: Tut W6 Sol p.6-7; W5-3 p.22-24 -->

```sql
-- How many of each kind of tent were sold on which dates
SELECT item.Name, sale.SaleDate, SUM(saleitem.Quantity) AS QtyTotal
FROM item
INNER JOIN saleitem ON item.itemID = saleitem.itemId
INNER JOIN sale     ON saleitem.SaleId = sale.SaleID
WHERE item.Name LIKE 'Tent%'
GROUP BY item.Name, sale.SaleDate;
```
<!-- Sources: Tut W6 Sol p.7 -->

**Note:** tutorial answers and the slide example in [07](07-sql-subqueries-views.en.md#topic-5) often use another form that MySQL allows: several `INNER JOIN`s in a row, followed by a single `ON … AND … AND …` listing all join conditions. The result is the same, but giving each `JOIN` its own `ON` is clearer and more portable.
<!-- Sources: Tut W6 Sol p.7; Tut W7 Sol p.1 -->

<a id="topic-3"></a>
## 3. Efficiency and readability

![Slide 23 - Effectiveness and readability](assets/06-sql-joins-and-changes/slide-23.png)

The top half gives three rules of thumb: `INNER JOIN` is faster than `NATURAL JOIN`; `UNION` is faster than joins; joins are faster than subqueries. The bottom half answers one question, "who is a boss?", in two ways: on the left, a right outer join keeps bosses who have subordinates and then groups to remove repeats; on the right, an `IN` subquery. On the practice database both give the same 6 people (Alice, Andrew, Brier, Clare, Ned, Todd). The slides prefer the join on the left; the same trade-off returns in the auction example of [07](07-sql-subqueries-views.en.md#topic-1).
<!-- Sources: W5-2 p.23-24 -->

**Note:** these are rules of thumb, not laws. Modern optimisers often rewrite an `IN` subquery as a join, and real speed depends on the execution plan and the data volume; still, writing a join usually makes it easier for the optimiser to find a good plan.

![Slide 24 - Effectiveness and readability continued](assets/06-sql-joins-and-changes/slide-24.png)

The first point in the left column compares `IN` and `EXISTS`: `EXISTS` is faster when the subquery result is large, `IN` when it is small; `IN` cannot compare correctly with `NULL`, while `EXISTS` can. The exact difference and the `NULL` trap are in [07](07-sql-subqueries-views.en.md#topic-2). The second point in the left column: calling functions has overhead, so name the computed result and use the alias directly in `HAVING`. The right column is the hard part below.

### Hard part: does the condition go in ON or WHERE?

The slide's advice: `ON` holds only the join condition, `WHERE` only the filter. For inner joins both placements give the same result; for outer joins they do not: put a condition on the right table in the wrong place and the outer join silently becomes an inner join.
<!-- Sources: W5-2 p.24 -->

#### Worked example (our own): counting deliveries to department 2 only

| Form | Result |
| --- | --- |
| `… LEFT OUTER JOIN deliveryitem di ON di.itemId = i.itemID WHERE di.departmentID = 2` | Outer join first, then `WHERE` filters: items with no delivery have `di.departmentID` = `NULL` and are filtered out, **leaving only the 7 items with deliveries**, the same as an inner join |
| `… LEFT OUTER JOIN deliveryitem di ON di.itemId = i.itemID AND di.departmentID = 2` | The condition takes part in matching: all 25 items are kept, and the 18 never delivered to department 2 get a count of 0 |

To "keep every row of the left table", put conditions on the right table in `ON`.

<a id="topic-4"></a>
## 4. Changing data and table structure

### INSERT: several rows at once, and from a table

![Slide 25 - More on INSERT](assets/06-sql-joins-and-changes/slide-25.png)

The top box **inserts from a table**: the whole result of a `SELECT` goes into another table that must **already exist**. Both lower boxes insert several rows at once: the first lists no column names, so each row must give every column in the order of the table definition (`DEFAULT` for the auto-increment key, `NULL` for a nullable column); the second lists the columns to insert, and the rest take their default or `NULL`. The tutorial's version on the practice database:
<!-- Sources: W5-2 p.25; Tut W9 Sol p.4 -->

```sql
-- Several rows at once
INSERT INTO customer VALUES
  (DEFAULT, 'Jon', 'Smith', '22522255', '1985-12-05'),
  (DEFAULT, 'An',  'Hone',  '22454852', '1956-01-22');

-- Insert the result of a query into another existing table
INSERT INTO NewEmployee
SELECT * FROM Employee;
```
<!-- Sources: W5-2 p.25; Tut W9 Sol p.3-4 -->

Strings and dates are quoted.

### UPDATE: both WHERE and order matter

![Slide 26 - The UPDATE statement](assets/06-sql-joins-and-changes/slide-26.png)

The top-right `UPDATE Hourly SET HourlyRate = HourlyRate * 1.10;` has no `WHERE`, so it raises the rate of **every** hourly worker; this is why the slide says to write `WHERE` unless you mean the whole table. The everyday form on the practice database:

```sql
UPDATE customer
SET FirstName = 'Yoshi'
WHERE LastName = 'Senti';
```
<!-- Sources: Tut W9 Sol p.5 -->

Without `WHERE`, the whole table is updated. MySQL Workbench turns on "safe updates" by default, which blocks `UPDATE` / `DELETE` without a key condition; the tutorial turns it off in Preferences before the exercises.
<!-- Sources: W5-2 p.26; Tut W9 Sol p.1 -->

**Hard part: the order of two UPDATE statements.** Look at the red "Any problems with this?" below: the requirement is "raise salaries above 100000 by 10% and all others by 5%". Running the slide's order, "5% for those not above 100000" first, someone on 98000 rises to 102900, and the second statement, "10% for those above 100000", then raises them again. Reversing the two statements (high salaries first) avoids the double raise, but order-dependent code like this is easy to get wrong.
<!-- Sources: W5-2 p.26-27 -->

![Slide 27 - The UPDATE statement with CASE](assets/06-sql-joins-and-changes/slide-27.png)

The slides' recommended fix: one `UPDATE` with `CASE`. Each row is examined once, and its **original** salary decides 5% or 10%, so there is no ordering problem.
<!-- Sources: W5-2 p.27 -->

### DELETE and REPLACE

![Slide 28 - DELETE and REPLACE](assets/06-sql-joins-and-changes/slide-28.png)

`REPLACE` is used exactly like `INSERT`, except that when the new row's primary key (or a unique key) already exists, the old row is overwritten. `DELETE FROM Employee;` deletes every row, which is why the slide calls it dangerous; the version below with `WHERE Name = "Grace"` is the safe form. The last point is about foreign keys: when a referenced parent row is deleted, the outcome depends on `ON DELETE CASCADE` versus `RESTRICT`. The tutorial exercise below shows exactly that.

#### Hands-on: how referential integrity stops you (Tut W9)

The tutorial uses the Scott sample database (two tables, `Emp` and `Dept`; the script deliberately leaves out foreign keys) to demonstrate foreign-key constraints. In our own words:

```sql
-- 1. Add the foreign key afterwards: an employee's department must exist in Dept; cascade when the parent key changes or is deleted
ALTER TABLE emp
  ADD CONSTRAINT FK_DEPT FOREIGN KEY (deptno) REFERENCES dept(deptno)
  ON DELETE CASCADE ON UPDATE CASCADE;
```
<!-- Sources: Tut W9 Sol p.5; tutorial/scott.sql -->

| Action | Result | Why |
| --- | --- | --- |
| Change a new employee's `deptno` to 50 when Dept has no 50 | Error | A foreign-key value must match an existing primary key |
| Insert department 50 first, then change it | Succeeds | The matching primary key now exists |
| Change 50 to 60 in Dept | The employee's `deptno` becomes 60 automatically | `ON UPDATE CASCADE` |
| Delete an employee who is still someone's boss (boss foreign key uses `RESTRICT`) | Error | A child row still refers to them |
| First give the subordinate another boss, then delete | Succeeds | No longer referenced |
<!-- Sources: Tut W9 Sol p.5-9 -->

Constraints can be looked up in the data dictionary: `SELECT * FROM information_schema.table_constraints WHERE table_name IN ('emp', 'dept');`.
<!-- Sources: Tut W9 Sol p.5 -->

### DDL: ALTER, RENAME, TRUNCATE, DROP and CTAS

![Slide 30 - ALTER and RENAME](assets/06-sql-joins-and-changes/slide-30.png)

`ALTER TABLE … ADD` / `DROP` adds or removes a column of an existing table, and the `ADD CONSTRAINT` above is another use of `ALTER TABLE`; `RENAME TABLE` changes only the table's name and leaves the data alone.
<!-- Sources: W5-2 p.30-31 -->

![Slide 31 - TRUNCATE, DROP and CTAS](assets/06-sql-joins-and-changes/slide-31.png)

Both commands in the left column are dangerous: `TRUNCATE` empties all rows, faster than `DELETE`, but **cannot be rolled back**; `DROP` removes the data and the table structure together, has no undo command, and can only be recovered from a backup. The right column is **CTAS** (`CREATE TABLE … AS SELECT`): build a new table from a query result, copying the data too; with an always-false `WHERE 1=0`, the query returns no rows, so only the structure is copied. **Common mistake (slide wording):** "`DELETE * FROM table`" in the left column is not valid MySQL; the correct form is `DELETE FROM table;`.

The four ways of "deleting" compared:

| Command | Effect | Watch out |
| --- | --- | --- |
| `DELETE FROM t WHERE …` | Delete the rows that match | `DELETE FROM t;` deletes every row, dangerous; subject to foreign keys: it may be refused, or may cascade and delete child rows |
| `REPLACE INTO t …` | Like `INSERT`, but if the primary key already exists the old row is overwritten | |
| `TRUNCATE TABLE t` | Empty all rows, faster than `DELETE` | **Cannot be rolled back**; restore only from backup |
| `DROP TABLE t` | Remove the whole table: data and structure | No undo command |
<!-- Sources: W5-2 p.28, p.31 -->

## Self-check

1. Write a query listing every supplier's name and number of deliveries, **including** suppliers that have never delivered. Which join do you use, and which column do you count?
2. List "names of items never sold" in two ways: one with an outer join, one with a subquery. What does each version need to watch out for?
3. The query below is meant to list every employee with their boss's name. Why is Alice missing, and how do you fix it? `SELECT e.FirstName, b.FirstName FROM employee e INNER JOIN employee b ON e.BossID = b.employeeID;`
4. Give "employees on 80000 or less a raise of 8%, everyone else 3%" in one statement. Why is writing two `UPDATE` statements not recommended?
5. `TRUNCATE TABLE sale;` and `DELETE FROM sale;` both empty the table. What is the risk of each?
