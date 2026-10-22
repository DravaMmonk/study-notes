# INFO90002 Week 5 - SQL Part 1: Creating Tables and SELECT Basics

来源：`lecture/INFO90002_Week5-1_SQL1.pdf`、`lecture/INFO90002_Week5-2_SQL2.pdf`、`lecture/lecture_queries.sql`；`tutorial/Week5_Tute_SQLintro.pdf`、`tutorial/Week5_Tute_SQLintro_SOLUTIONS.pdf`、`tutorial/Week6Tute_SQL_Advanced_SOLUTIONS.pdf`、`tutorial/Week8Tute_SQL_Advanced3_Solutions.pdf`、`tutorial/labs2018engv6.sql`、`tutorial/labs2018byodv6.sql`。没有对应的 Apple Note。

这篇讲的是：**怎样用 SQL 建一张表、放进数据，再按列、按行、按组把需要的数据取出来？**

学习路线：[SQL 的分工与练习库](#topic-1) → [CREATE、INSERT 与 NULL](#topic-2) → [SELECT：子句顺序、投影与选择](#topic-3) → [聚合、分组与输出整理](#topic-4) → [第一次连接两张表](#topic-5)。

重点：`SELECT` 子句的书写顺序；`GROUP BY` 中非聚合列的规则；`WHERE` 与 `HAVING` 的分工。难点：`COUNT(*)` 与 `COUNT(列)` 对 `NULL` 的不同处理；没有 `ORDER BY` 时顺序未定义。易错：`NULL` 不是空字符串；`NATURAL JOIN` 会按同名列悄悄连接。

**说明：** 课件封面写的是 “Week 4 - SQL”，但文件归在 Week 5；三份 SQL 课件按 SQL Part 1–3 的顺序对应本篇与 [06](06-sql-joins-and-changes.md)、[07](07-sql-subqueries-views.md)。截图编号是 PDF 页码：`w51` 是 Week 5-1 课件，`t05s` 是 Week 5 Tutorial 答案。课件里的 `Customer` / `Account` 例子来自讲课用的小数据库；标注“练习库”的查询都在课程练习库 `labs2018` 上写成，结果在本地用同一份数据核对过。

<a id="topic-1"></a>
## 1. SQL 的分工与练习库

### SQL 的四类语句

![W5-1 slide 05 - SQL language: DDL, DML, DCL and other commands](assets/05-sql-select-basics/slide-w51-05.png)

**SQL**（Structured Query Language，读作 “sequel”）是关系数据库通用的语言。这一页把它的命令分成四组，看每组下面蓝色的关键字：

- **数据定义语言（Data Definition Language, DDL）**：定义和搭建数据库结构，`CREATE`、`ALTER`、`DROP`；
- **数据操纵语言（Data Manipulation Language, DML）**：使用和维护数据，`SELECT`、`INSERT`、`DELETE`、`UPDATE`；
- **数据控制语言（Data Control Language, DCL）**：控制谁能访问，`GRANT`、`REVOKE`（见 [07](07-sql-subqueries-views.md#topic-4)）；
- **其他命令**：管理数据库和事务控制，例如 `START TRANSACTION`（见 [08](08-transactions-concurrency.md#topic-1)）。

区分 DDL 和 DML 的简单办法：DDL 改的是“表长什么样”，DML 改或读的是“表里有什么”。本篇的 `CREATE TABLE` 是 DDL，`INSERT` 和 `SELECT` 是 DML。

### 练习用的百货商店模式

教程用脚本 `labs2018` 建立一个百货商店数据库（在学校服务器上用 `labs2018engv6.sql`，在自己电脑上用 `labs2018byodv6.sql`，后者会先创建 `labs2018` 模式）。
<!-- Sources: W5-1 p.3; Tut W5 Sol p.1 -->

![Tut W5 Sol slide 14 - Department store physical ER model](assets/05-sql-select-basics/slide-t05s-14.png)

这张物理 ER 图是后面所有练习查询的地图。按区域看：

- **中间偏右**：`Department`（部门，楼层、电话、经理 `ManagerID`）和 `Employee`（员工，工资、`DepartmentID`、上司 `BossID`）。两者之间有两条线：“work in”（员工属于部门）和 “manages”（部门由某员工管理）；
- **右边那条 “supervises” 线** 从 `Employee` 指回自己：`BossID` 引用另一名员工，这是 [03](03-logical-physical-design.md#topic-4) 的一元一对多；
- **左边**：`Item`（商品，`Type` 是一个字母、颜色、价格）；
- **上方**：`Supplier` 发出 `Delivery`，一次送货的明细在 `DeliveryItem`，主键是 `(DeliveryId, ItemId, DepartmentID)`——哪次送货、什么商品、送到哪个部门；
- **下方**：`Sale` 是部门的销售单，明细在 `SaleItem`，主键是 `(SaleId, ItemId)`。
<!-- Sources: Tut W5 Sol p.14; tutorial/labs2018engv6.sql -->

`DeliveryItem` 和 `SaleItem` 都是消解多对多的关联表。写查询前先在图上找“从哪张表走到哪张表”，这就是课件说的“把数据库设计当作地图”（见 [07](07-sql-subqueries-views.md#topic-5)）。

**易错：** 学校服务器跑的是 Unix，表名区分大小写。图上的表名首字母大写，但脚本里的表名都是小写，所以要写 `department` 而不是 `Department`；关键字和列名不区分大小写。
<!-- Sources: Tut W5 Sol p.2; W5-2 p.3 -->

<a id="topic-2"></a>
## 2. CREATE、INSERT 与 NULL

### 从建表到查询的三步

![W5-1 slide 08 - SQL in the development process: CREATE, INSERT, SELECT](assets/05-sql-select-basics/slide-w51-08.png)

按页面编号 1、2、3 读：

1. `CREATE TABLE BankHQ (...)`：每行一个列，写列名、类型和约束。`AUTO_INCREMENT` 让数据库自动编号，`NOT NULL` 规定地址必须有值，最后一行 `PRIMARY KEY(BankHQID)` 指定主键；
2. 两条 `INSERT INTO BankHQ VALUES (...)`：按列的顺序各放进一行；
3. `SELECT * FROM BankHQ;`：取回全部列和全部行，下方灰色小表就是结果。

右边的小 ER 图里，`BankHQ` 被圈出：它是物理设计中的一张表，SQL 就是把 [03](03-logical-physical-design.md) 的物理设计真正落到数据库里。
<!-- Sources: W5-1 p.8; lecture/lecture_queries.sql -->

### 查看表定义

![W5-1 slide 09 - CREATE TABLE Customer and DESCRIBE output](assets/05-sql-select-basics/slide-w51-09.png)

左边是 Workbench 里的 `Customer` 表，中间是建表语句。注意两处约束：`CustLastName` 是 `NOT NULL`；`CustType` 用 `ENUM("Personal","Company")`，只允许这两个值。建好后用 `DESCRIBE Customer;`、`DESC Customer;` 或 `SHOW COLUMNS FROM Customer;` 查看表定义（也叫 **元数据（metadata）**）。右下角就是输出：`Null` 一列里 `CustomerID`（主键自动非空）、`CustLastName` 和 `CustType` 是 `NO`，`Key` 一列里 `CustomerID` 标着 `PRI`，`Extra` 是 `auto_increment`。
<!-- Sources: W5-1 p.9; Tut W5 Sol p.1 -->

### INSERT 的两种写法

![W5-1 slide 10 - Inserting rows with and without a column list](assets/05-sql-select-basics/slide-w51-10.png)

页面三条插入语句对应两种写法，红字分别解释：

- **写法 A：指定列**。第一条只给 `(CustFirstName, CustLastName, CustType)` 三列，没列出的列取 `NULL` 或默认值，`CustomerID` 自动递增成 1；
- **写法 B：不指定列**。后两条没有列清单，就必须按表定义的顺序给出 **全部** 列；`DEFAULT` 让自增列自己取下一个编号。

下方结果表对照着看：Peter 的中间名和公司名是 `NULL`（没给值）；第三行 Smythe 的名字和公司名在 `INSERT` 里写成 `""`（空字符串），表里显示为空白，而中间名明确写成 `NULL`。
<!-- Sources: W5-1 p.9-10; lecture/lecture_queries.sql -->

**难点：`NULL` 不是空字符串。** 空字符串是“已知为空的文本”，是一个值；`NULL` 表示“未知 / 不适用”，不是任何值。比较 `NULL` 要用 `IS NULL` / `IS NOT NULL`，`= NULL` 永远不会成立。这个区别在 [第 4 节](#topic-4) 的 `COUNT` 里会再次出现。
<!-- Sources: W5-1 p.10; W5-2 p.11 -->

一次插入多行、从另一张表插入、`UPDATE`、`DELETE` 等见 [06](06-sql-joins-and-changes.md#topic-4)。

### 带外键的建表

![W5-1 slide 11 - Foreign key review: Customer and Account](assets/05-sql-select-basics/slide-w51-11.png)

这一页复习外键：一个顾客可以有多个账户。跟着彩色圆圈看：Customer 1（Peter）的绿色箭头指到账户 01；Customer 2（James）的两条紫色箭头指到账户 05 和 06。连接靠的是 `Account` 最右边的 `CustID` 列——“多”的一方记住“一”的一方的主键。

![W5-1 slide 12 - CREATE TABLE Account with a foreign key](assets/05-sql-select-basics/slide-w51-12.png)

把这层关系写成 SQL：`FOREIGN KEY (CustomerID) REFERENCES Customer(CustomerID)` 声明外键；`CustomerID INT NOT NULL` 表示每个账户必须属于某位顾客（必选参与）。最后两行规定父表变化时怎么办：`ON DELETE RESTRICT`——还有账户引用的顾客不能删；`ON UPDATE CASCADE`——顾客编号改了，账户里的外键跟着改。四种参照动作的完整对比见 [03](03-logical-physical-design.md#topic-2)。

**易错：** 建表顺序有依赖。`Account` 引用 `Customer`，所以必须先建 `Customer`；插入数据时也要先有顾客，才能插入他的账户。

<a id="topic-3"></a>
## 3. SELECT：子句顺序、投影与选择

### 子句的书写顺序

![W5-1 slide 14 - The SELECT statement clauses in order](assets/05-sql-select-basics/slide-w51-14.png)

这一页用不同颜色列出 `SELECT` 的七个子句，每个子句下面一行说明它管什么：

- `SELECT [DISTINCT]`：返回哪些列或表达式，`DISTINCT` 去掉重复行；
- `FROM`：数据从哪些表来；
- `WHERE`：哪一行进入结果；
- `GROUP BY`：怎样分组；
- `HAVING`：哪一组进入结果；
- `ORDER BY ... [ASC | DESC]`：怎样排序；
- `LIMIT`：取多少行（如 “5 行” 或 “从第 2 行起取 5 行”）。

除 `SELECT` 外都是可选的，但出现时必须按这个顺序写。
<!-- Sources: W5-1 p.14; Tut W5 Sol p.2 -->

**易错：** 顺序不能换，例如 `HAVING` 不能写在 `GROUP BY` 或 `WHERE` 之前（页面最下面的红字）。
<!-- Sources: W5-1 p.14 -->

![W5-1 slide 15 - SELECT * FROM Customer and its result set](assets/05-sql-select-basics/slide-w51-15.png)

最简单的查询 `SELECT * FROM Customer;`：`*` 表示全部列，没有 `WHERE` 就是全部行。下方 **结果集（result set）** 有 9 位顾客——讲课数据库此时比第 10 页多了几行。

### 投影与选择

![W5-1 slide 16 - Projection: choosing columns](assets/05-sql-select-basics/slide-w51-16.png)

**投影（projection）** 是选哪些列：`SELECT CustLastName FROM Customer;` 只返回姓一列。看右边结果：仍然是 9 行，`Jones` 出现了两次。SQL 默认保留重复值，要去重得写 `SELECT DISTINCT CustLastName`。

![W5-1 slide 17 - Selection: choosing rows with WHERE](assets/05-sql-select-basics/slide-w51-17.png)

**选择（selection）** 是选哪些行：加上 `WHERE CustLastName = "Smith"` 后只剩一行。投影和选择可以同时用：`SELECT` 管列，`WHERE` 管行。练习库里的对应写法如 `SELECT Name, Floor FROM department WHERE Floor = 2;`。
<!-- Sources: W5-1 p.16-17; Tut W5 Sol p.3-4 -->

比较运算符有 `=`、`<`、`>`、`<=`、`>=`、`<>` 或 `!=`（不等于，取决于 DBMS）；逻辑运算符有 `AND`、`OR`、`NOT`，混用时用括号写清楚：
<!-- Sources: W5-2 p.6; Tut W5 Sol p.5 -->

```sql
-- 练习库：部门名以 M 开头 且 经理是 1 号员工：只有 Management 一行
SELECT * FROM department
WHERE Name LIKE 'M%' AND ManagerID = 1;
```
<!-- Sources: Tut W5 Sol p.5 -->

把 `AND` 改成 `OR`，结果就变成“名字以 M 开头的部门”加上“经理是 1 号的部门”，从 1 行变成 2 行。
<!-- Sources: Tut W5 Sol p.5 -->

### LIKE 通配符

![W5-1 slide 18 - LIKE patterns with % and _](assets/05-sql-select-basics/slide-w51-18.png)

左边表格列出六种模式，右边是一个实际查询 `WHERE CustLastName LIKE "Sm%"`，返回 Smith、Smithies、Smythe、Smart——全部以 Sm 开头。规则只有两个符号：
<!-- Sources: W5-1 p.18 -->

- `%` 代表零个、一个或多个字符：`'a%'` 以 a 开头，`'%a'` 以 a 结尾，`'%or%'` 任意位置含 or，`'a%o'` 以 a 开头、以 o 结尾；
- `_` 代表恰好一个字符：`'_r%'` 第二个字符是 r，`'a_%_%'` 以 a 开头且至少 3 个字符。

较新版本的 MySQL 对字面量做 `LIKE` 时不区分大小写，`'M%'` 也会匹配小写 m 开头的值；Oracle 等数据库则区分大小写。
<!-- Sources: W5-1 p.18; Tut W5 Sol p.5 -->

**易错：** 只知道部分名称时用 `LIKE` 而不是 `=`。练习库里的指南针商品实际叫 `'Compass - Silva'`，写 `= 'Compass'` 会返回 0 行；先查一下参考表里数据实际怎么存。
<!-- Sources: Tut W8 Sol p.3 -->

<a id="topic-4"></a>
## 4. 聚合、分组与输出整理

### 五个聚合函数与 NULL

![W5-1 slide 19 - Aggregate functions and NULL handling](assets/05-sql-select-basics/slide-w51-19.png)

`COUNT()`、`SUM()`、`AVG()`、`MIN()`、`MAX()` 作用在一列（或一组行）上，返回一个值。
<!-- Sources: W5-1 p.19 -->

**难点：`NULL` 的处理。** 页面 N.B. 说：除 `COUNT()` 外，聚合函数都忽略 `NULL`，全部为 `NULL` 时返回 `NULL`。紧接着一句说 `COUNT()` 数的是行、`NULL` 也会被数到——**这句只对 `COUNT(*)` 成立**。`COUNT(列)` 数的是该列非空的值，所以下一条要点才特意提醒 “`COUNT(Column)` versus `COUNT(*)`”：
<!-- Sources: W5-1 p.19 -->

```sql
-- 练习库
SELECT COUNT(*), COUNT(BossID), COUNT(DISTINCT departmentID)
FROM employee;
-- 17, 16, 11：总经理 Alice 没有上司，BossID 为 NULL；17 名员工分布在 11 个部门
```
<!-- Sources: tutorial/labs2018engv6.sql; W5-1 p.19 -->

反过来，空字符串是一个值，会被数到。练习库 `item` 表有 25 件商品，其中 7 件的 `Colour` 是 `''`（脚本里插入的就是空字符串，不是 `NULL`），所以 `SELECT COUNT(*), COUNT(Colour) FROM item;` 返回 25、25。想数“有颜色的商品”，得写 `COUNT(NULLIF(Colour, ''))` 或加 `WHERE Colour <> ''`。

### COUNT、AVG 与 GROUP BY

![W5-1 slide 20 - COUNT and AVG examples](assets/05-sql-select-basics/slide-w51-20.png)

四个例子从上往下读，红字是每条查询回答的问题：`COUNT(CustomerID)` 数顾客数（表的基数）；`AVG(OutstandingBalance)` 求全部账户的平均余额；加 `WHERE CustomerID=1` 先筛行再平均；最后一条加 `GROUP BY CustomerID`，变成 **每位顾客** 一个平均值。前三条都只返回一个数，最后一条每组返回一个数。

![W5-1 slide 21 - GROUP BY and HAVING](assets/05-sql-select-basics/slide-w51-21.png)

`GROUP BY` 把分组列取值相同的行归成一组，聚合函数在每组内各算一次。页面下半的问题是“平均余额低于 10000 的顾客”：条件是加在 **组** 上的，只能写在 `HAVING` 里。

练习库里的同类例子：

```sql
-- 练习库：每层楼有几个部门
SELECT Floor AS DEPT_FLOOR, COUNT(departmentID) AS DEPT_COUNT
FROM department
GROUP BY Floor
ORDER BY Floor;
-- 第 5 层最多，有 5 个部门
```
<!-- Sources: Tut W5 Sol p.11 -->

| DEPT_FLOOR | DEPT_COUNT |
| --- | --- |
| 1 | 2 |
| 2 | 2 |
| 3 | 1 |
| 4 | 1 |
| 5 | 5 |

**易错：** 用了聚合函数后，`SELECT` 中每个非聚合列都必须出现在 `GROUP BY` 里。`SELECT MIN(Salary), DepartmentID FROM employee;` 会报错，要加 `GROUP BY DepartmentID`。原因是：不分组时整张表只产出一行，而 `DepartmentID` 有很多个值，数据库不知道该放哪一个。去掉 `GROUP BY` 再运行一次，就能看到差别。
<!-- Sources: Tut W5 Sol p.11; Tut W6 Sol p.5 -->

### WHERE 筛行，HAVING 筛组

`HAVING` 之所以存在，是因为 `WHERE` 不能使用聚合函数。两者可以同时出现：
<!-- Sources: W5-1 p.21; W5-2 p.5 -->

```sql
-- 练习库：先去掉工资不高于 50000 的人，再按部门分组，最后只留下平均工资高于 70000 的部门
SELECT departmentID, AVG(Salary) AS AvgSal
FROM employee
WHERE Salary > 50000          -- 行条件
GROUP BY departmentID
HAVING AVG(Salary) > 70000;   -- 组条件
-- 结果：部门 1、9、10
```
<!-- Sources: W5-1 p.21; W5-2 p.5 -->

### 别名

![W5-1 slide 22 - Column aliases with AS](assets/05-sql-select-basics/slide-w51-22.png)

上半的查询按 `custtype` 分组计数，结果列头是难读的 `COUNT(customerid)`。下半用 `AS` 改名，红色箭头把两个别名连到结果列头：`"Customer Type"` 含空格，必须用直的双引号括起来；`CUST_TOTAL` 没有空格，不用引号。结果是 Personal 1 位、Company 2 位。

课件建议给聚合结果起别名，并在 `HAVING` 里用别名，例如 `HAVING CountOfCustomers > 5`，可读性更好，也避免重复调用函数。这是 MySQL 允许的写法，并非所有数据库都支持。
<!-- Sources: W5-2 p.5, p.24; Tut W6 Sol p.8 -->

### 排序与限制行数

![W5-1 slide 23 - ORDER BY one or several columns](assets/05-sql-select-basics/slide-w51-23.png)

左边 `ORDER BY lastname` 默认升序（`ASC`），结果从 Beamer、Cartwright 一直到 Zhang。右边 `ORDER BY departmentid DESC, lastname ASC`：先按部门号从大到小，部门号相同时再按姓升序——看部门 11 的三个人 Jackson、Kelly、Underwood，正是按姓排好的。

![W5-1 slide 24 - LIMIT and OFFSET](assets/05-sql-select-basics/slide-w51-24.png)

同一个排序后，`LIMIT 6` 只取前 6 行（左），`LIMIT 6 OFFSET 3` 先跳过 3 行再取 6 行（右）。中间那张完整结果上的两个括号标出了两段各自取的是哪几行：右边从第 4 行 Sophie Monk 开始。

```sql
-- 练习库：工资最高的 5 名员工
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

几条补充规则：

- 可按多列、各列不同方向排序；排序列不必出现在 `SELECT` 中；
- `AS` 改的是输出列名，例如 `SELECT CustType AS "Customer Type"`；
- 可以输出表里没有的列：`SELECT '123459999' AS STUID, Name FROM department;` 每行都带上这个字面量；
- SQL 里可以直接算数：`SELECT 1*1+1/1-1;`。
<!-- Sources: W5-1 p.22-24; W5-2 p.3; Tut W5 Sol p.6-9 -->

**难点：没有 `ORDER BY` 时结果顺序是未定义的。** 可能碰巧是插入顺序，但优化器可能改变它。需要顺序就写 `ORDER BY`；不需要就别写，因为排序会拖慢执行。`LIMIT` 前一定要有 `ORDER BY`，否则“前 5 行”是哪 5 行没有保证。
<!-- Sources: W5-2 p.4 -->

<details markdown="1"><summary>延伸内容（可选）：逻辑执行顺序</summary>

书写顺序是 `SELECT … FROM … WHERE … GROUP BY … HAVING … ORDER BY … LIMIT`，但数据库在逻辑上大致按 `FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT` 处理。这解释了为什么 `WHERE` 里不能用聚合函数（分组还没发生），而 `ORDER BY` 可以用 `SELECT` 里定义的别名。

</details>

<a id="topic-5"></a>
## 5. 第一次连接两张表

### 表名限定与别名

![W5-1 slide 26 - Table name qualification and table aliases](assets/05-sql-select-basics/slide-w51-26.png)

同一个查询写了三遍：直接写列名；列名前加表名 `Customer.CustLastName`；给表起别名 `FROM Customer c`，再写 `c.CustLastName`。别名只在当前语句有效；用了别名后，同一语句里就不能再用原表名指代它。多表查询时，两张表常有同名列（例如都有 `CustomerID`），这时必须加前缀，否则数据库不知道你指哪一个。
<!-- Sources: W5-1 p.26 -->

### 笛卡尔积

![W5-1 slide 27 - Cross product of Customer and Account](assets/05-sql-select-basics/slide-w51-27.png)

`SELECT * FROM Customer, Account;` 返回 **笛卡尔积（cross product / Cartesian product）**：3 位顾客 × 3 个账户 = 9 行。看第一行：Peter 配上了他自己的账户；第二行 James 也配上了 Peter 的账户——这显然不对。原因写在页底：SQL 并不会自动根据外键去配对，它不“知道”两张表的关系。练习库里 `SELECT * FROM employee, department;` 同样是 17 × 11 = 187 行。
<!-- Sources: W5-1 p.27 -->

### INNER JOIN

![W5-1 slide 28 - INNER JOIN syntax and example](assets/05-sql-select-basics/slide-w51-28.png)

`INNER JOIN` 只保留满足连接条件的行组合，条件通常是“外键列 = 主键列”，写在 `ON` 后面。页面下方的例子用 `c.CustomerID = a.CustomerID` 把每个账户接到它的顾客上。
<!-- Sources: W5-1 p.28 -->

**易错：** 这一页和第 30 页的列名写成 `CustomerFirstName`、`CustomerLastName`，但第 9 页建表时的列名是 `CustFirstName`、`CustLastName`。照抄会得到“未知列”错误；写查询时以表定义（`DESC`）为准。

```sql
-- 练习库：五楼各部门的员工
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

`ON` 管“怎么配对”，`WHERE` 管“配好后留哪些”。连接之后照样可以分组，例如数每个部门的人数：

```sql
-- 练习库：员工多于 2 人的部门
SELECT d.Name, COUNT(e.employeeID) AS NumEmployees
FROM department d
INNER JOIN employee e ON e.departmentID = d.departmentID
GROUP BY d.departmentID, d.Name
HAVING COUNT(e.employeeID) > 2;
-- 结果：只有 Marketing，3 人
```

`GROUP BY` 里同时写 `d.departmentID` 和 `d.Name`：按编号分组保证两个同名部门不会被并成一组，写上 `d.Name` 才能在 `SELECT` 里输出它（上一节的非聚合列规则）。

### 不推荐的两种写法

![W5-1 slide 29 - Inner join versus natural join](assets/05-sql-select-basics/slide-w51-29.png)

上半是 `INNER JOIN ... ON`，红圈标出的就是 CONDITION；下半是 `NATURAL JOIN`，不写条件，数据库自动按 **同名列** 连接。两份结果都是 3 行，但仔细看列：自然连接的结果末尾少了一个 `CustomerID`，因为同名列被合并成了一列。

![W5-1 slide 30 - Avoid old-style joins in the WHERE clause](assets/05-sql-select-basics/slide-w51-30.png)

这一页的红叉是 **旧式连接**：`FROM Customer c, Account a WHERE c.CustomerID = a.CustomerID`，把连接条件写进 `WHERE`。2000 年以前的一些 DBMS 没有 `INNER JOIN` 关键字，老代码和老教材仍这样写。

- **`NATURAL JOIN` 的风险**：它只看列名，不看意义。`item` 和 `department` 都有一列叫 `Name`，意义完全不同，`item NATURAL JOIN department` 照样能执行，只是返回 0 行，且不报错。它也比 `INNER JOIN` 慢，课程作业和考试不允许使用；
- **旧式连接的问题**：连接条件和过滤条件混在 `WHERE` 里。课程建议用 `ON` 写连接条件、用 `WHERE` 写过滤条件，分开更易读，换成外连接时也不容易出错。
<!-- Sources: W5-1 p.29-30; Tut W5 Sol p.10; Tut W6 Sol p.3-4; W5-2 p.24 -->

### 预告：外连接

![W5-1 slide 31 - LEFT and RIGHT OUTER JOIN](assets/05-sql-select-basics/slide-w51-31.png)

内连接只留下能配上的行。上半的 `LEFT OUTER JOIN` 保留 **左表** 的全部行：红圈里的 Akin 没有账户，也出现在结果里，右边账户列全是 `NULL`。下半的 `RIGHT OUTER JOIN` 保留右表（账户）的全部行；这份数据里每个账户都有顾客，所以结果和内连接一样是 3 行。外连接、反连接和自连接在 [06](06-sql-joins-and-changes.md#topic-2) 详细展开。

## 本讲自测

1. 写出练习库查询：列出工资低于 55000 的员工的名、姓和部门编号，按工资从高到低排序，只要前 3 行。
2. 有人写了 `SELECT departmentID, MAX(Salary) FROM employee WHERE MAX(Salary) > 80000;`。指出其中的两处错误并改正。
3. 为某健身房设计 `Member` 和 `Booking` 两张表的 `CREATE TABLE`：每次预约必须属于一位会员，会员被删除前必须先处理他的预约。哪一列要写 `NOT NULL`？外键的 `ON DELETE` 应该写什么？
4. 一张表有 10 行，其中某列有 3 个 `NULL`、2 个空字符串。分别估计 `COUNT(*)`、`COUNT(该列)`、`COUNT(DISTINCT 该列)` 的取值范围或确定值，并说明理由。
5. 用 `employee` 和 `department` 写一个查询，列出每层楼的员工人数。如果改用 `NATURAL JOIN`，这两张表的结果会变吗？什么样的表结构会让它悄悄出错？
