# INFO90002 Week 5 - SQL Part 1: Creating Tables and SELECT Basics

Sources: `lecture/INFO90002_Week5-1_SQL1.pdf`, `lecture/INFO90002_Week5-2_SQL2.pdf`, `lecture/lecture_queries.sql`; `tutorial/Week5_Tute_SQLintro.pdf`, `tutorial/Week5_Tute_SQLintro_SOLUTIONS.pdf`, `tutorial/Week6Tute_SQL_Advanced_SOLUTIONS.pdf`, `tutorial/Week8Tute_SQL_Advanced3_Solutions.pdf`, `tutorial/labs2018engv6.sql`, `tutorial/labs2018byodv6.sql`. There is no corresponding Apple Note.

This lecture asks: **how do you use SQL to create a table, put data into it, and then get back the data you need by column, by row and by group?**

Learning path: [What SQL does and the practice database](#topic-1) → [CREATE, INSERT and NULL](#topic-2) → [SELECT: clause order, projection and selection](#topic-3) → [Aggregation, grouping and tidying the output](#topic-4) → [Joining two tables for the first time](#topic-5).

Key points: the written order of the `SELECT` clauses; the rule for non-aggregated columns in `GROUP BY`; the division of labour between `WHERE` and `HAVING`. Hard parts: how `COUNT(*)` and `COUNT(column)` treat `NULL` differently; the row order is undefined without `ORDER BY`. Common mistakes: `NULL` is not an empty string; `NATURAL JOIN` silently joins on every column with the same name.

**Note:** the deck's cover says "Week 4 - SQL", but the file is filed under Week 5; the three SQL decks, SQL Part 1–3, correspond to this note and to [06](06-sql-joins-and-changes.en.md) and [07](07-sql-subqueries-views.en.md). Screenshot numbers are PDF page numbers: `w51` is the Week 5-1 deck, `t05s` is the Week 5 tutorial solutions. The `Customer` / `Account` examples in the slides come from a small lecture database; queries labelled "practice database" were written against the course practice database `labs2018`, and their results were checked locally on the same data.

<a id="topic-1"></a>
## 1. What SQL does and the practice database

### The four kinds of SQL statement

![W5-1 slide 05 - SQL language: DDL, DML, DCL and other commands](assets/05-sql-select-basics/slide-w51-05.png)

**SQL** (Structured Query Language, pronounced "sequel") is the common language of relational databases. This page splits its commands into four groups; look at the blue keywords under each:

- **Data Definition Language (DDL)**: defines and sets up the database structure — `CREATE`, `ALTER`, `DROP`;
- **Data Manipulation Language (DML)**: uses and maintains the data — `SELECT`, `INSERT`, `DELETE`, `UPDATE`;
- **Data Control Language (DCL)**: controls who may access it — `GRANT`, `REVOKE` (see [07](07-sql-subqueries-views.en.md#topic-4));
- **Other commands**: database administration and transaction control, e.g. `START TRANSACTION` (see [08](08-transactions-concurrency.en.md#topic-1)).

A simple way to tell DDL from DML: DDL changes "what the table looks like", DML changes or reads "what is in the table". In this note `CREATE TABLE` is DDL, and `INSERT` and `SELECT` are DML.

### The department-store schema used for practice

The tutorials build a department-store database with the `labs2018` script (use `labs2018engv6.sql` on the university server and `labs2018byodv6.sql` on your own computer; the latter creates the `labs2018` schema first).
<!-- Sources: W5-1 p.3; Tut W5 Sol p.1 -->

![Tut W5 Sol slide 14 - Department store physical ER model](assets/05-sql-select-basics/slide-t05s-14.png)

This physical ER diagram is the map for every practice query that follows. Read it by region:

- **Centre right**: `Department` (floor, phone, manager `ManagerID`) and `Employee` (salary, `DepartmentID`, boss `BossID`). Two lines run between them: "work in" (an employee belongs to a department) and "manages" (a department is managed by an employee);
- **The "supervises" line on the right** points from `Employee` back to itself: `BossID` references another employee — the unary one-to-many relationship of [03](03-logical-physical-design.en.md#topic-4);
- **Left**: `Item` (a product; `Type` is a single letter, plus colour and price);
- **Top**: a `Supplier` sends a `Delivery`; the lines of a delivery are in `DeliveryItem`, whose primary key is `(DeliveryId, ItemId, DepartmentID)` — which delivery, which item, to which department;
- **Bottom**: `Sale` is a department's sales docket, with its lines in `SaleItem`, primary key `(SaleId, ItemId)`.
<!-- Sources: Tut W5 Sol p.14; tutorial/labs2018engv6.sql -->

`DeliveryItem` and `SaleItem` are both associative tables that resolve many-to-many relationships. Before writing a query, find on the diagram "which table you walk from and to" — this is what the slides mean by "using the database design as a map" (see [07](07-sql-subqueries-views.en.md#topic-5)).

**Common mistake:** the university server runs Unix, so table names are case-sensitive. The diagram capitalises table names, but in the script they are all lower case, so write `department`, not `Department`; keywords and column names are not case-sensitive.
<!-- Sources: Tut W5 Sol p.2; W5-2 p.3 -->

<a id="topic-2"></a>
## 2. CREATE, INSERT and NULL

### Three steps from creating a table to querying it

![W5-1 slide 08 - SQL in the development process: CREATE, INSERT, SELECT](assets/05-sql-select-basics/slide-w51-08.png)

Read it by the numbers 1, 2, 3 on the page:

1. `CREATE TABLE BankHQ (...)`: one column per line, giving the column name, type and constraints. `AUTO_INCREMENT` makes the database number rows automatically, `NOT NULL` requires the address to have a value, and the last line `PRIMARY KEY(BankHQID)` names the primary key;
2. two `INSERT INTO BankHQ VALUES (...)` statements: each puts in one row, in column order;
3. `SELECT * FROM BankHQ;`: fetches all columns and all rows; the small grey table underneath is the result.

In the small ER diagram on the right, `BankHQ` is circled: it is one table of a physical design, and SQL is how the physical design of [03](03-logical-physical-design.en.md) actually gets built in the database.
<!-- Sources: W5-1 p.8; lecture/lecture_queries.sql -->

### Viewing a table definition

![W5-1 slide 09 - CREATE TABLE Customer and DESCRIBE output](assets/05-sql-select-basics/slide-w51-09.png)

On the left is the `Customer` table in Workbench, in the middle the `CREATE` statement. Notice two constraints: `CustLastName` is `NOT NULL`; `CustType` uses `ENUM("Personal","Company")`, allowing only those two values. After creating the table, view its definition (also called **metadata**) with `DESCRIBE Customer;`, `DESC Customer;` or `SHOW COLUMNS FROM Customer;`. The output is at the bottom right: in the `Null` column, `CustomerID` (a primary key is automatically non-null), `CustLastName` and `CustType` show `NO`; in the `Key` column `CustomerID` is marked `PRI`, and its `Extra` is `auto_increment`.
<!-- Sources: W5-1 p.9; Tut W5 Sol p.1 -->

### Two ways to write INSERT

![W5-1 slide 10 - Inserting rows with and without a column list](assets/05-sql-select-basics/slide-w51-10.png)

The three `INSERT` statements on the page illustrate two styles, each explained by the red text:

- **Style A: name the columns.** The first statement supplies only `(CustFirstName, CustLastName, CustType)`; unlisted columns get `NULL` or their default, and `CustomerID` auto-increments to 1;
- **Style B: no column list.** The last two statements have no column list, so they must supply **every** column in the order of the table definition; `DEFAULT` lets the auto-increment column take its next number.

Compare with the result table below: Peter's middle name and business name are `NULL` (no value given); in the third row, Smythe's first name and business name were written as `""` (an empty string) in the `INSERT` and show as blank, while the middle name was explicitly written as `NULL`.
<!-- Sources: W5-1 p.9-10; lecture/lecture_queries.sql -->

**Hard part: `NULL` is not an empty string.** An empty string is "text known to be empty" — it is a value; `NULL` means "unknown / not applicable" and is not any value. Test for `NULL` with `IS NULL` / `IS NOT NULL`; `= NULL` is never true. This difference comes up again with `COUNT` in [Section 4](#topic-4).
<!-- Sources: W5-1 p.10; W5-2 p.11 -->

Inserting several rows at once, inserting from another table, `UPDATE`, `DELETE` and so on are covered in [06](06-sql-joins-and-changes.en.md#topic-4).

### Creating a table with a foreign key

![W5-1 slide 11 - Foreign key review: Customer and Account](assets/05-sql-select-basics/slide-w51-11.png)

This page reviews foreign keys: one customer can have several accounts. Follow the coloured circles: Customer 1 (Peter) has a green arrow to account 01; Customer 2 (James) has two purple arrows to accounts 05 and 06. The link is the `CustID` column at the far right of `Account` — the "many" side remembers the primary key of the "one" side.

![W5-1 slide 12 - CREATE TABLE Account with a foreign key](assets/05-sql-select-basics/slide-w51-12.png)

Writing this relationship in SQL: `FOREIGN KEY (CustomerID) REFERENCES Customer(CustomerID)` declares the foreign key; `CustomerID INT NOT NULL` says every account must belong to some customer (mandatory participation). The last two lines say what happens when the parent changes: `ON DELETE RESTRICT` — a customer still referenced by accounts cannot be deleted; `ON UPDATE CASCADE` — if a customer number changes, the foreign key in the accounts follows. For a full comparison of the four referential actions, see [03](03-logical-physical-design.en.md#topic-2).

**Common mistake:** table creation has an order. `Account` references `Customer`, so `Customer` must be created first; when inserting data, the customer must also exist before their accounts can be inserted.

<a id="topic-3"></a>
## 3. SELECT: clause order, projection and selection

### The written order of the clauses

![W5-1 slide 14 - The SELECT statement clauses in order](assets/05-sql-select-basics/slide-w51-14.png)

This page lists the seven clauses of `SELECT` in different colours, each followed by a line saying what it controls:

- `SELECT [DISTINCT]`: which columns or expressions are returned; `DISTINCT` removes duplicate rows;
- `FROM`: which tables the data comes from;
- `WHERE`: which rows go into the result;
- `GROUP BY`: how to group;
- `HAVING`: which groups go into the result;
- `ORDER BY ... [ASC | DESC]`: how to sort;
- `LIMIT`: how many rows to take (e.g. "5 rows" or "5 rows from row 2").

All except `SELECT` are optional, but when present they must be written in this order.
<!-- Sources: W5-1 p.14; Tut W5 Sol p.2 -->

**Common mistake:** the order cannot be changed; for example `HAVING` cannot go before `GROUP BY` or `WHERE` (the red text at the bottom of the page).
<!-- Sources: W5-1 p.14 -->

![W5-1 slide 15 - SELECT * FROM Customer and its result set](assets/05-sql-select-basics/slide-w51-15.png)

The simplest query, `SELECT * FROM Customer;`: `*` means all columns, and with no `WHERE` it returns all rows. The **result set** below has 9 customers — by now the lecture database has a few more rows than on page 10.

### Projection and selection

![W5-1 slide 16 - Projection: choosing columns](assets/05-sql-select-basics/slide-w51-16.png)

**Projection** chooses columns: `SELECT CustLastName FROM Customer;` returns only the surname column. Look at the result on the right: there are still 9 rows, and `Jones` appears twice. SQL keeps duplicates by default; to remove them write `SELECT DISTINCT CustLastName`.

![W5-1 slide 17 - Selection: choosing rows with WHERE](assets/05-sql-select-basics/slide-w51-17.png)

**Selection** chooses rows: adding `WHERE CustLastName = "Smith"` leaves just one row. Projection and selection can be combined: `SELECT` controls columns, `WHERE` controls rows. The practice-database equivalent is something like `SELECT Name, Floor FROM department WHERE Floor = 2;`.
<!-- Sources: W5-1 p.16-17; Tut W5 Sol p.3-4 -->

The comparison operators are `=`, `<`, `>`, `<=`, `>=`, and `<>` or `!=` (not equal; which one depends on the DBMS); the logical operators are `AND`, `OR`, `NOT` — use parentheses to be explicit when mixing them:
<!-- Sources: W5-2 p.6; Tut W5 Sol p.5 -->

```sql
-- Practice database: departments whose name starts with M AND whose manager is employee 1: only the Management row
SELECT * FROM department
WHERE Name LIKE 'M%' AND ManagerID = 1;
```
<!-- Sources: Tut W5 Sol p.5 -->

Change `AND` to `OR` and the result becomes "departments whose name starts with M" plus "departments managed by employee 1", growing from 1 row to 2.
<!-- Sources: Tut W5 Sol p.5 -->

### LIKE wildcards

![W5-1 slide 18 - LIKE patterns with % and _](assets/05-sql-select-basics/slide-w51-18.png)

The table on the left lists six patterns; on the right is a real query `WHERE CustLastName LIKE "Sm%"`, returning Smith, Smithies, Smythe and Smart — all starting with Sm. There are only two symbols to learn:
<!-- Sources: W5-1 p.18 -->

- `%` stands for zero, one or more characters: `'a%'` starts with a, `'%a'` ends with a, `'%or%'` contains or anywhere, `'a%o'` starts with a and ends with o;
- `_` stands for exactly one character: `'_r%'` has r as the second character, `'a_%_%'` starts with a and is at least 3 characters long.

Recent versions of MySQL are not case-sensitive when applying `LIKE` to literals, so `'M%'` also matches values starting with a lower-case m; Oracle and other databases are case-sensitive.
<!-- Sources: W5-1 p.18; Tut W5 Sol p.5 -->

**Common mistake:** when you only know part of a name, use `LIKE`, not `=`. The compass in the practice database is actually called `'Compass - Silva'`, so `= 'Compass'` returns 0 rows; check first how the data is actually stored in the reference table.
<!-- Sources: Tut W8 Sol p.3 -->

<a id="topic-4"></a>
## 4. Aggregation, grouping and tidying the output

### The five aggregate functions and NULL

![W5-1 slide 19 - Aggregate functions and NULL handling](assets/05-sql-select-basics/slide-w51-19.png)

`COUNT()`, `SUM()`, `AVG()`, `MIN()` and `MAX()` operate on a column (or a set of rows) and return a single value.
<!-- Sources: W5-1 p.19 -->

**Hard part: handling `NULL`.** The N.B. on the page says that all aggregate functions except `COUNT()` ignore `NULL`, and return `NULL` if all values are `NULL`. The next sentence says `COUNT()` counts rows, so `NULL`s are counted too — **that is true only of `COUNT(*)`**. `COUNT(column)` counts the non-null values in that column, which is why the following bullet specifically flags "`COUNT(Column)` versus `COUNT(*)`":
<!-- Sources: W5-1 p.19 -->

```sql
-- Practice database
SELECT COUNT(*), COUNT(BossID), COUNT(DISTINCT departmentID)
FROM employee;
-- 17, 16, 11: general manager Alice has no boss, so her BossID is NULL; the 17 employees are in 11 departments
```
<!-- Sources: tutorial/labs2018engv6.sql; W5-1 p.19 -->

Conversely, an empty string is a value and is counted. The practice database's `item` table has 25 items, 7 of which have `Colour` equal to `''` (the script inserts an empty string, not `NULL`), so `SELECT COUNT(*), COUNT(Colour) FROM item;` returns 25, 25. To count "items that have a colour", write `COUNT(NULLIF(Colour, ''))` or add `WHERE Colour <> ''`.

### COUNT, AVG and GROUP BY

![W5-1 slide 20 - COUNT and AVG examples](assets/05-sql-select-basics/slide-w51-20.png)

Read the four examples from top to bottom; the red text gives the question each query answers: `COUNT(CustomerID)` counts the customers (the table's cardinality); `AVG(OutstandingBalance)` is the average balance over all accounts; adding `WHERE CustomerID=1` filters rows first and then averages; the last adds `GROUP BY CustomerID` and becomes one average **per customer**. The first three each return a single number; the last returns one number per group.

![W5-1 slide 21 - GROUP BY and HAVING](assets/05-sql-select-basics/slide-w51-21.png)

`GROUP BY` puts rows with the same values in the grouping columns into one group, and the aggregate function is computed once inside each group. The question in the lower half of the page is "customers whose average balance is under 10000": the condition applies to **groups**, so it can only go in `HAVING`.

A similar example on the practice database:

```sql
-- Practice database: how many departments are on each floor
SELECT Floor AS DEPT_FLOOR, COUNT(departmentID) AS DEPT_COUNT
FROM department
GROUP BY Floor
ORDER BY Floor;
-- Floor 5 has the most, with 5 departments
```
<!-- Sources: Tut W5 Sol p.11 -->

| DEPT_FLOOR | DEPT_COUNT |
| --- | --- |
| 1 | 2 |
| 2 | 2 |
| 3 | 1 |
| 4 | 1 |
| 5 | 5 |

**Common mistake:** once you use an aggregate function, every non-aggregated column in `SELECT` must appear in `GROUP BY`. `SELECT MIN(Salary), DepartmentID FROM employee;` gives an error; add `GROUP BY DepartmentID`. The reason: without grouping, the whole table produces one row, but `DepartmentID` has many values and the database does not know which one to show. Run it once more without `GROUP BY` to see the difference.
<!-- Sources: Tut W5 Sol p.11; Tut W6 Sol p.5 -->

### WHERE filters rows, HAVING filters groups

`HAVING` exists because `WHERE` cannot use aggregate functions. The two can appear together:
<!-- Sources: W5-1 p.21; W5-2 p.5 -->

```sql
-- Practice database: drop employees earning 50000 or less, group by department, then keep only departments averaging above 70000
SELECT departmentID, AVG(Salary) AS AvgSal
FROM employee
WHERE Salary > 50000          -- row condition
GROUP BY departmentID
HAVING AVG(Salary) > 70000;   -- group condition
-- Result: departments 1, 9 and 10
```
<!-- Sources: W5-1 p.21; W5-2 p.5 -->

### Aliases

![W5-1 slide 22 - Column aliases with AS](assets/05-sql-select-basics/slide-w51-22.png)

The query in the top half counts by `custtype`, and the result's column header is the hard-to-read `COUNT(customerid)`. The bottom half renames it with `AS`; the red arrows connect the two aliases to the result headers: `"Customer Type"` contains a space, so it must be enclosed in straight double quotes; `CUST_TOTAL` has no space and needs no quotes. The result is 1 Personal and 2 Company customers.

The slides recommend giving aggregate results an alias and using that alias in `HAVING`, e.g. `HAVING CountOfCustomers > 5`: it reads better and avoids calling the function twice. MySQL allows this, but not every database does.
<!-- Sources: W5-2 p.5, p.24; Tut W6 Sol p.8 -->

### Sorting and limiting rows

![W5-1 slide 23 - ORDER BY one or several columns](assets/05-sql-select-basics/slide-w51-23.png)

On the left, `ORDER BY lastname` defaults to ascending (`ASC`), and the result runs from Beamer and Cartwright down to Zhang. On the right, `ORDER BY departmentid DESC, lastname ASC`: first by department number from high to low, then by surname ascending within the same department — look at the three people in department 11, Jackson, Kelly and Underwood, already in surname order.

![W5-1 slide 24 - LIMIT and OFFSET](assets/05-sql-select-basics/slide-w51-24.png)

With the same ordering, `LIMIT 6` takes only the first 6 rows (left), and `LIMIT 6 OFFSET 3` skips 3 rows and then takes 6 (right). The two brackets on the full result in the middle mark which rows each one takes: the right-hand one starts from the 4th row, Sophie Monk.

```sql
-- Practice database: the 5 highest-paid employees
SELECT FirstName, LastName, Salary
FROM employee
ORDER BY Salary DESC
LIMIT 5;
```
<!-- Sources: Tut W5 Sol p.9; W5-1 p.23-24 -->

| FirstName | LastName | Salary |
| --- | --- | --- |
| Alice | Munro | 125000 |
| Sarah | Fergusson | 86000 |
| Ned | Kelly | 85000 |
| Sophie | Monk | 75000 |
| Brier | Patch | 73000 |

A few more rules:

- you can sort by several columns, each in its own direction; a sort column need not appear in `SELECT`;
- `AS` renames an output column, e.g. `SELECT CustType AS "Customer Type"`;
- you can output a column that is not in the table: `SELECT '123459999' AS STUID, Name FROM department;` attaches this literal to every row;
- SQL can do arithmetic directly: `SELECT 1*1+1/1-1;`.
<!-- Sources: W5-1 p.22-24; W5-2 p.3; Tut W5 Sol p.6-9 -->

**Hard part: without `ORDER BY`, the row order is undefined.** It may happen to be insertion order, but the optimiser can change it. If you need an order, write `ORDER BY`; if you do not, leave it out, because sorting slows execution. Always put `ORDER BY` before `LIMIT`, or there is no guarantee which rows are "the first 5".
<!-- Sources: W5-2 p.4 -->

<details markdown="1"><summary>Extension (optional): logical order of execution</summary>

The written order is `SELECT … FROM … WHERE … GROUP BY … HAVING … ORDER BY … LIMIT`, but logically the database processes it roughly as `FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT`. This explains why `WHERE` cannot use aggregate functions (grouping has not happened yet), while `ORDER BY` can use an alias defined in `SELECT`.

</details>

<a id="topic-5"></a>
## 5. Joining two tables for the first time

### Table-name qualification and aliases

![W5-1 slide 26 - Table name qualification and table aliases](assets/05-sql-select-basics/slide-w51-26.png)

The same query is written three times: plain column names; column names prefixed with the table name, `Customer.CustLastName`; and with a table alias, `FROM Customer c`, then `c.CustLastName`. An alias applies only to the current statement; once an alias is used, the original table name can no longer refer to that table within the same statement. In multi-table queries, two tables often share a column name (e.g. both have `CustomerID`), and then the prefix is required, or the database cannot tell which one you mean.
<!-- Sources: W5-1 p.26 -->

### The Cartesian product

![W5-1 slide 27 - Cross product of Customer and Account](assets/05-sql-select-basics/slide-w51-27.png)

`SELECT * FROM Customer, Account;` returns the **cross product (Cartesian product)**: 3 customers × 3 accounts = 9 rows. Look at the first row: Peter is paired with his own account; the second row pairs James with Peter's account too — clearly wrong. The reason is at the bottom of the page: SQL does not pair rows by foreign key automatically; it does not "know" how the two tables are related. In the practice database, `SELECT * FROM employee, department;` likewise gives 17 × 11 = 187 rows.
<!-- Sources: W5-1 p.27 -->

### INNER JOIN

![W5-1 slide 28 - INNER JOIN syntax and example](assets/05-sql-select-basics/slide-w51-28.png)

An `INNER JOIN` keeps only the row combinations that satisfy the join condition, normally "foreign-key column = primary-key column", written after `ON`. The example at the bottom of the page uses `c.CustomerID = a.CustomerID` to attach each account to its customer.
<!-- Sources: W5-1 p.28 -->

**Common mistake:** this page and page 30 write the column names as `CustomerFirstName` and `CustomerLastName`, but the table created on page 9 uses `CustFirstName` and `CustLastName`. Copying them verbatim gives an "unknown column" error; when writing queries, go by the table definition (`DESC`).

```sql
-- Practice database: employees of each department on floor 5
SELECT e.FirstName, e.LastName, d.Name AS Dept
FROM employee e
INNER JOIN department d
  ON e.departmentID = d.departmentID
WHERE d.Floor = 5
ORDER BY d.Name, e.LastName;
```
<!-- Sources: W5-1 p.28; Tut W6 Sol p.3 -->

| FirstName | LastName | Dept |
| --- | --- | --- |
| Todd | Beamer | Accounting |
| Nancy | Cartwright | Accounting |
| Alice | Munro | Management |
| Andrew | Jackson | Marketing |
| Ned | Kelly | Marketing |
| Clare | Underwood | Marketing |
| Sophie | Monk | Personnel |
| Sarah | Fergusson | Purchasing |
| Brier | Patch | Purchasing |

`ON` decides "how rows are paired", `WHERE` decides "which paired rows are kept". You can still group after a join, for example to count the people in each department:

```sql
-- Practice database: departments with more than 2 employees
SELECT d.Name, COUNT(e.employeeID) AS NumEmployees
FROM department d
INNER JOIN employee e ON e.departmentID = d.departmentID
GROUP BY d.departmentID, d.Name
HAVING COUNT(e.employeeID) > 2;
-- Result: only Marketing, with 3
```

`GROUP BY` lists both `d.departmentID` and `d.Name`: grouping by the ID ensures two departments with the same name are not merged into one group, and listing `d.Name` is what allows it to be output in `SELECT` (the non-aggregated-column rule from the previous section).

### Two styles to avoid

![W5-1 slide 29 - Inner join versus natural join](assets/05-sql-select-basics/slide-w51-29.png)

The top half is `INNER JOIN ... ON`, with the CONDITION circled in red; the bottom half is `NATURAL JOIN`, which has no condition — the database joins automatically on **columns with the same name**. Both results have 3 rows, but look closely at the columns: the natural join's result lacks the final `CustomerID`, because the same-named columns were merged into one.

![W5-1 slide 30 - Avoid old-style joins in the WHERE clause](assets/05-sql-select-basics/slide-w51-30.png)

The red cross on this page marks the **old-style join**: `FROM Customer c, Account a WHERE c.CustomerID = a.CustomerID`, with the join condition written in `WHERE`. Some pre-2000 DBMS products had no `INNER JOIN` keyword, and old code and old textbooks still write joins this way.

- **The risk of `NATURAL JOIN`**: it looks only at names, not meanings. `item` and `department` both have a column called `Name` with completely different meanings, yet `item NATURAL JOIN department` still runs — it just returns 0 rows, without any error. It is also slower than `INNER JOIN`, and is not allowed in the subject's assignments and exam;
- **The problem with old-style joins**: join conditions and filter conditions are mixed together in `WHERE`. The subject recommends writing join conditions with `ON` and filters with `WHERE`; keeping them apart is easier to read and less error-prone when switching to an outer join.
<!-- Sources: W5-1 p.29-30; Tut W5 Sol p.10; Tut W6 Sol p.3-4; W5-2 p.24 -->

### Preview: outer joins

![W5-1 slide 31 - LEFT and RIGHT OUTER JOIN](assets/05-sql-select-basics/slide-w51-31.png)

An inner join keeps only rows that match. The `LEFT OUTER JOIN` in the top half keeps every row of the **left** table: Akin, circled in red, has no account but still appears, with all the account columns `NULL`. The `RIGHT OUTER JOIN` in the bottom half keeps every row of the right table (accounts); in this data every account has a customer, so the result is the same 3 rows as the inner join. Outer joins, anti-joins and self-joins are developed in [06](06-sql-joins-and-changes.en.md#topic-2).

## Self-check

1. Write a practice-database query listing the first name, surname and department number of employees earning less than 55000, sorted by salary from highest to lowest, keeping only the first 3 rows.
2. Someone wrote `SELECT departmentID, MAX(Salary) FROM employee WHERE MAX(Salary) > 80000;`. Identify the two errors and correct them.
3. Write `CREATE TABLE` statements for a gym's `Member` and `Booking` tables: every booking must belong to a member, and a member's bookings must be dealt with before the member can be deleted. Which column needs `NOT NULL`? What should the foreign key's `ON DELETE` say?
4. A table has 10 rows; one column contains 3 `NULL`s and 2 empty strings. Give the exact value or possible range of `COUNT(*)`, `COUNT(that column)` and `COUNT(DISTINCT that column)`, and explain why.
5. Using `employee` and `department`, write a query listing the number of employees on each floor. If you switched to `NATURAL JOIN`, would the result for these two tables change? What kind of table structure would make it go wrong silently?
