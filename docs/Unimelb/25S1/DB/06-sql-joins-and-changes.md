# INFO90002 Week 5 - SQL Part 2: Joins, Set Operations and Changing Data

来源：`lecture/INFO90002_Week5-2_SQL2.pdf`、`lecture/lecture_queries.sql`；`tutorial/Week6Tute_SQL_Advanced_SOLUTIONS.pdf`、`tutorial/Week7Tute_SQL_Advanced2_SOLUTIONS.pdf`、`tutorial/Week8Tute_SQL_Advanced3_Solutions.pdf`、`tutorial/Week9Tute_SQL_DDL_Solutions.pdf`、`tutorial/scott.sql`。没有对应的 Apple Note。

这篇讲的是：**怎样合并两次查询的结果，怎样把多张表接起来（包括“没有匹配的行”也要列出来），以及怎样安全地修改数据和表结构？**

学习路线：[查询补充：规则、函数与集合运算](#topic-1) → [连接：内连接、外连接与自连接](#topic-2) → [效率与可读性](#topic-3) → [修改数据与表结构](#topic-4)。

重点：`LEFT OUTER JOIN … WHERE 右表.键 IS NULL` 找“没有的”；自连接的两个别名；`UNION` 与 `UNION ALL` 的区别。难点：外连接上的条件写在 `ON` 还是 `WHERE`；多个一对多同时外连接时的计数。易错：`UPDATE` / `DELETE` 忘写 `WHERE`；多条 `UPDATE` 的先后顺序；`TRUNCATE` 和 `DROP` 不能撤销。

除课件自带的例子外，所有例子使用 [05](05-sql-select-basics.md#topic-1) 介绍的百货商店练习库；练习库上的行数和结果都在本地用同一份数据核对过。

<a id="topic-1"></a>
## 1. 查询补充：规则、函数与集合运算

### 复习：写 SQL 时的几条规则

![Slide 03 - Things to remember about SQL](assets/06-sql-joins-and-changes/slide-03.png)

这一页把 Part 1 里零散提到的规则收在一起。逐条看：关键字不分大小写，大写只是为了好读；**表名** 是否区分大小写取决于操作系统（Linux / Unix 上 `Account` 和 `ACCOUNT` 是两张表），而 **列名** 不区分；`SELECT` 可以只算表达式（`SELECT 1*1+1/1-1;`），也可以造一个表里没有的字面量列（`SELECT '123459999' AS MyID`）。表名大小写在练习库里的后果见 [05](05-sql-select-basics.md#topic-1)。

![Slide 04 - Note on SELECT and ORDER BY](assets/06-sql-joins-and-changes/slide-04.png)

**易错：** 没有 `ORDER BY` 时，行的顺序是未定义的，优化器可能改变它；需要顺序就写，不需要就别写，因为排序会拖慢执行。详见 [05](05-sql-select-basics.md#topic-3)。

![Slide 05 - HAVING clause revisited](assets/06-sql-joins-and-changes/slide-05.png)

红框圈出的 `COUNT(CustomerID) > 5` 是“对聚合结果的条件”，所以只能放在 `HAVING`。右边的写法先在 `SELECT` 里给聚合结果起别名 `CountOfCustomers`，再在 `HAVING` 里直接用别名，MySQL 允许这样写。`WHERE` 与 `HAVING` 的分工见 [05](05-sql-select-basics.md#topic-4)。

![Slide 06 - Comparison and logic operators](assets/06-sql-joins-and-changes/slide-06.png)

看 Example 3：`(LastName='Nguyen' OR LastName='Smith') AND DeptNo=170`。括号去掉后，`AND` 先于 `OR` 结合，意思就变成“姓 Nguyen 的任何人，或 170 部门姓 Smith 的人”。`AND` 和 `OR` 混用时一律加括号。

### 字符串函数与其他常用函数

![Slide 07 - Some useful string functions](assets/06-sql-joins-and-changes/slide-07.png)

课件只列了四个字符串函数，右边的说明是：大小写转换只影响 A–Z / a–z，数字和符号原样保留。教程里还用到下面这些函数，一起记：

| 函数 | 作用 |
| --- | --- |
| `UPPER()`、`LOWER()` | 转大写 / 小写（A–Z 以外的字符不受影响） |
| `LEFT(s, n)`、`RIGHT(s, n)` | 取左 / 右 n 个字符 |
| `CONCAT(a, ' ', b)` | 拼接字符串 |
| `ROUND(x, d)` | 四舍五入到 d 位，结果仍是 **数字** |
| `FORMAT(x, d)` | 保留 d 位并加千分位逗号，结果是 **字符串**，例如 `60,529.41` |
| `YEAR()`、`MONTHNAME()`、`DAYNAME()` | 取年份、月份名、星期名 |
| `DATEDIFF(d1, d2)` | 两个日期相差的天数 |
<!-- Sources: W5-2 p.7; Tut W6 Sol p.1; Tut W7 Sol p.12-13 -->

**重点：** 这些函数都 **不会改变表中的数据**，只影响输出。**易错：** `FORMAT` 的结果是字符串，拿它再排序或比较大小会按字符比较；需要继续计算时用 `ROUND`。
<!-- Sources: W5-2 p.7 -->

### 集合运算：把两次查询的结果上下拼起来

![Slide 08 - Set operations](assets/06-sql-joins-and-changes/slide-08.png)

连接是把两张表 **左右** 拼成更宽的行；集合运算是把两次查询的结果 **上下** 拼成更长的结果。看第二条要求：两次查询的列数和对应列的数据类型必须一致，列长度可以不同。`UNION` 合并并去重；加 `ALL` 保留重复行；`INTERSECT` 只留两边都有的行。底部红字说明课件所用的 MySQL 只支持 `UNION` 和 `UNION ALL`。
<!-- Sources: W5-2 p.8-10 -->

<details markdown="1">
<summary>补充：较新的 MySQL 与 INTERSECT</summary>

MySQL 8.0.31 起也支持 `INTERSECT` 和 `EXCEPT`。在不支持的版本里，“两边都有”可以用 `IN` 子查询或内连接表达，“左边有、右边没有”可以用 `NOT IN` / `NOT EXISTS` 或下一节的反连接表达。

</details>

![Slide 09 - UNION ALL example](assets/06-sql-joins-and-changes/slide-09.png)

左边两个框分别是学生名单和助教名单。中间框是 `UNION ALL` 的结果：红色箭头指出 Connie Chang 出现了两次，因为她既是学生又是助教。改用 `UNION`，她只出现一次。
<!-- Sources: W5-2 p.8-9 -->

![Slide 10 - UNION example](assets/06-sql-joins-and-changes/slide-10.png)

每一半各是一个内连接：上半找出按小时计薪的员工（`Hourly` 子类型表），下半找出领年薪的员工（`Salaried`）。两半都只选 `Name, EmployeeType` 两列，类型对得上，才能 `UNION`。结果的 4 行里，H 来自上半，S 来自下半。这里 `Employee` 存所有员工共有的信息，`Hourly`、`Salaried` 各存一类员工特有的信息（时薪或年薪）；[07](07-sql-subqueries-views.md#topic-4) 的视图例子会把三类员工的薪酬用同样的办法合成一列。

![Slide 11 - SELECT with literals](assets/06-sql-joins-and-changes/slide-11.png)

左上查询返回有性别的顾客，右上查询返回性别为空的顾客，但它在第二列放了一个 **字面量**（literal）`'Unknown'`：这个值写死在查询里，不来自表。这样两次查询的列就对齐了，底部的 `UNION` 把两部分合成一张完整名单，空性别显示为 Unknown。
<!-- Sources: W5-2 p.11 -->

<a id="topic-2"></a>
## 2. 连接：内连接、外连接与自连接

### 用维恩图读连接

![Slide 14 - INNER and NATURAL JOIN Venn diagram](assets/06-sql-joins-and-changes/slide-14.png)

两个圆分别代表 T1 和 T2 的行，打勾的区域就是结果。内连接只要两圆的交集：两边都能按 `T1.ID = T2.ID` 匹配上的行。`NATURAL JOIN` 画在同一张图里，因为它也是内连接，只是自动按所有同名列匹配，风险见 [05](05-sql-select-basics.md#topic-5)。
<!-- Sources: W5-2 p.12-22; W5-1 p.31 -->

### 课件演示：员工和上司是同一张表

![Slide 15 - INNER JOIN labs demo on employee and boss](assets/06-sql-joins-and-changes/slide-15.png)

`employee` 表的 `BossID` 指向同一张表的 `employeeID`（[03](03-logical-physical-design.md#topic-4) 的一元一对多）。要同时看到员工和上司，就把同一张表用两个别名打开两次：`emp` 当“员工”，`boss` 当“上司”。这就是 **自连接**（self join，课件叫 unary join）。左边的结果表有 16 行；对照右边的维恩图，左圆 EMP 外侧只剩 Alice Munro，因为她的 `BossID` 是 `NULL`，匹配不到任何上司，内连接把她漏掉了。
<!-- Sources: W5-2 p.13-15; Tut W8 Sol p.4 -->

教程里同一个自连接的写法，按上司、员工排序：

```sql
SELECT emp.FirstName AS Employee, boss.FirstName AS Boss
FROM employee emp
INNER JOIN employee boss
  ON emp.BossID = boss.employeeID
ORDER BY boss.FirstName, emp.FirstName;
```
<!-- Sources: Tut W8 Sol p.4; lecture/lecture_queries.sql -->

**易错（课件图）：** 这几页维恩图把 Brier Patch 画在 BOSS 圆的外侧（“不是任何人的上司”），但结果表里 Sarah Fergusson 的上司正是 Brier。练习库中真正当上司的是 Alice、Ned、Andrew、Clare、Todd、Brier 六人；看结果表，不要只看图中名字的位置。

![Slide 16 - LEFT OUTER JOIN Venn diagram](assets/06-sql-joins-and-changes/slide-16.png)

左外连接打勾的是整个左圆：T1 的每一行都保留，T2 中匹配不上的位置填 `NULL`。

![Slide 17 - LEFT OUTER JOIN labs demo](assets/06-sql-joins-and-changes/slide-17.png)

高亮的名字是被结果选中的行。左外连接以“员工”为准，所以连没有上司的 Alice Munro 也出现了（结果表第一行，上司两列为 `NULL`），共 17 行。
<!-- Sources: W5-2 p.17; Tut W8 Sol p.4 -->

![Slide 18 - RIGHT OUTER JOIN Venn diagram](assets/06-sql-joins-and-changes/slide-18.png)

右外连接是左外连接的镜像：保留 T2 的每一行。
<!-- Sources: W5-2 p.12-20; Tut W8 Sol p.1 -->

`LEFT` 和 `RIGHT` 只是看哪张表写在左边：把两张表的位置交换，左连接就变成右连接。写成 `LEFT OUTER JOIN` 而不是 `LEFT JOIN`，可以把意图写得更清楚。

![Slide 19 - RIGHT OUTER JOIN labs demo](assets/06-sql-joins-and-changes/slide-19.png)

这次以“上司”一侧为准：每个员工都被当作可能的上司列一遍。前 16 行是真正的“员工–上司”配对；后面员工两列为 `NULL` 的 11 行（Nancy、Sarah、Sophie、Rita……）是没有下属的人，所以共 27 行。课件说的 “Lists every employee of every manager” 就是这个意思。

![Slide 20 - FULL OUTER JOIN Venn diagram](assets/06-sql-joins-and-changes/slide-20.png)

全外连接三块都打勾：两边所有行都保留。底部写明 MySQL 不支持 `FULL OUTER JOIN`。

<details markdown="1">
<summary>补充：在 MySQL 中拼出全外连接</summary>

把左外连接和右外连接的结果 `UNION` 起来即可：

```sql
SELECT emp.FirstName AS Employee, boss.FirstName AS Boss
FROM employee emp LEFT OUTER JOIN employee boss ON emp.BossID = boss.employeeID
UNION
SELECT emp.FirstName, boss.FirstName
FROM employee emp RIGHT OUTER JOIN employee boss ON emp.BossID = boss.employeeID;
```

在练习库上得到 28 行：16 对配对 + 没有上司的 Alice + 11 个没有下属的人。`UNION` 会去掉两半共有的 16 行配对；如果原数据本身就有完全相同的行，它们也会被合并，这时要小心。

</details>

![Slide 21 - LEFT OUTER JOIN with WHERE T2.ID IS NULL](assets/06-sql-joins-and-changes/slide-21.png)

图中只有左圆中不与右圆相交的部分被选中：先左外连接，再只保留右表一侧为 `NULL` 的行，结果就是“左表中在右表找不到对应的行”。这种写法常叫 **反连接**（anti-join）。
<!-- Sources: W5-2 p.21 -->

![Slide 22 - Anti-join labs demo](assets/06-sql-joins-and-changes/slide-22.png)

结果只剩 Alice Munro：她是唯一一个“在上司表里找不到上司”的员工。**易错（课件标题）：** 这一页标题写的是 “INNER JOIN – Labs demo”，但查询实际是 `LEFT OUTER JOIN … WHERE boss.employeeid IS NULL`。

把这一组演示放在一起比较：

| 变体 | 回答的问题 | 行数 |
| --- | --- | --- |
| `emp INNER JOIN boss` | 每个有上司的员工及其上司 | 16 |
| `emp LEFT OUTER JOIN boss` | 所有员工，包括没有上司的总经理 | 17 |
| `emp RIGHT OUTER JOIN boss` | 以“上司”一侧为准列出每个人及其下属；没有下属的人，员工列为 `NULL` | 27 |
| `emp LEFT OUTER JOIN boss … WHERE boss.employeeID IS NULL` | 没有上司的人（只有 Alice） | 1 |
<!-- Sources: W5-2 p.15-22; lecture/lecture_queries.sql -->

### 外连接的典型用法：把“没有记录的”也列出来

```sql
-- 每种商品被送货的次数，包括从未送过货的商品
SELECT i.itemID, i.Name, COUNT(di.DeliveryId) AS Deliveries
FROM item i
LEFT OUTER JOIN deliveryitem di
  ON di.itemId = i.itemID
GROUP BY i.itemID, i.Name
ORDER BY Deliveries;
-- 最前面两行：Polo Mallet 和 Hammock，次数为 0
```
<!-- Sources: Tut W8 Sol p.1-2 -->

如果用 `INNER JOIN`，从未送货的商品根本不会出现，也就看不到“0 次”。**易错：** 这里用 `COUNT(di.DeliveryId)` 而不是 `COUNT(*)`：没匹配的行里 `di.DeliveryId` 是 `NULL`，不被计数，于是得到 0；`COUNT(*)` 会把这一行算成 1。原则是：外连接后计数，数 **右表** 的列。
<!-- Sources: Tut W8 Sol p.1-2; W5-1 p.19 -->

### 反连接：找“没有”的东西

```sql
-- 从未收到过任何送货的部门
SELECT d.departmentID, d.Name
FROM department d
LEFT OUTER JOIN deliveryitem di
  ON d.departmentID = di.departmentID
WHERE di.departmentID IS NULL;
-- Management、Accounting、Purchasing、Personnel、Marketing（都在五楼的办公部门）
```
<!-- Sources: Tut W8 Sol p.3 -->

同一个问题也能用 `NOT IN` 子查询写，教程指出子查询通常比连接慢；`NOT IN` 遇到 `NULL` 时的陷阱见 [07](07-sql-subqueries-views.md#topic-1)。
<!-- Sources: Tut W8 Sol p.3; W5-2 p.23 -->

### 多个外连接与 COUNT(DISTINCT)

```sql
-- 每个部门的送货次数和销售单数，包括两者都为 0 的部门
SELECT d.departmentID, d.Name,
       COUNT(DISTINCT di.DeliveryId) AS noOfDeliveries,
       COUNT(DISTINCT s.SaleID)      AS noOfSales
FROM department d
LEFT OUTER JOIN deliveryitem di ON di.departmentID = d.departmentID
LEFT OUTER JOIN sale s          ON s.departmentID  = d.departmentID
GROUP BY d.departmentID, d.Name;
```
<!-- Sources: Tut W8 Sol p.12 -->

**难点：** 两个一对多同时连到部门上，每个部门的送货行和销售行会两两相乘：一个有 $a$ 条送货行、 $b$ 笔销售的部门，连接后变成 $a\times b$ 行。这时必须用 `COUNT(DISTINCT …)`，否则两个数字都会被放大。

### 自连接比较同一张表里的两行

自连接不只用来“把上司名字找出来”，还能把一行和它关联的另一行放在同一行里比较：

```sql
-- 工资比自己上司高的员工
SELECT emp.FirstName, emp.Salary, boss.FirstName AS Boss, boss.Salary AS BossSalary
FROM employee emp
INNER JOIN employee boss ON emp.BossID = boss.employeeID
WHERE emp.Salary > boss.Salary;
-- Sarah（86000）的上司 Brier（73000）

-- 每位上司的直接下属人数
SELECT boss.employeeID, CONCAT(boss.FirstName, ' ', boss.LastName) AS Boss, COUNT(*) AS Reports
FROM employee wrk
INNER JOIN employee boss ON wrk.BossID = boss.employeeID
GROUP BY boss.employeeID, Boss
ORDER BY Reports DESC;
-- Andrew Jackson 5 人最多
```
<!-- Sources: Tut W7 Sol p.5; Tut W8 Sol p.5 -->

### 连接三张及以上的表

原则不变：每两张相邻的表之间都要有一个“主键 = 外键”的条件。先在 ER 图上找路径：`item → saleitem → sale → department`。
<!-- Sources: Tut W6 Sol p.6-7; W5-3 p.22-24 -->

```sql
-- 各种帐篷在哪些日期卖出了多少
SELECT item.Name, sale.SaleDate, SUM(saleitem.Quantity) AS QtyTotal
FROM item
INNER JOIN saleitem ON item.itemID = saleitem.itemId
INNER JOIN sale     ON saleitem.SaleId = sale.SaleID
WHERE item.Name LIKE 'Tent%'
GROUP BY item.Name, sale.SaleDate;
```
<!-- Sources: Tut W6 Sol p.7 -->

**补充：** 教程答案和 [07](07-sql-subqueries-views.md#topic-5) 的课件例子常写成 MySQL 允许的另一种形式：连续写几个 `INNER JOIN`，最后用一个 `ON … AND … AND …` 列出全部连接条件。结果相同，但每个 `JOIN` 紧跟自己的 `ON` 更清楚，也更通用。
<!-- Sources: Tut W6 Sol p.7; Tut W7 Sol p.1 -->

<a id="topic-3"></a>
## 3. 效率与可读性

![Slide 23 - Effectiveness and readability](assets/06-sql-joins-and-changes/slide-23.png)

上半是三条经验：`INNER JOIN` 比 `NATURAL JOIN` 快；`UNION` 比连接快；连接比子查询快。下半用两种写法回答同一个问题“谁是上司”：左边用右外连接，保留有下属的上司再分组去重；右边用 `IN` 子查询。在练习库上两者都得到同样的 6 人（Alice、Andrew、Brier、Clare、Ned、Todd）。课件更推荐左边的连接写法；同样的取舍在 [07](07-sql-subqueries-views.md#topic-1) 的拍卖例子里还会出现。
<!-- Sources: W5-2 p.23-24 -->

**补充：** 这些是经验法则，不是定律。现代优化器常把 `IN` 子查询改写成连接，真正的快慢要看执行计划和数据量；但写成连接通常更容易让优化器选到好计划。

![Slide 24 - Effectiveness and readability continued](assets/06-sql-joins-and-changes/slide-24.png)

左栏第一条比较 `IN` 与 `EXISTS`：子查询结果很大时 `EXISTS` 快，很小时 `IN` 快；`IN` 不能正确地和 `NULL` 比较，`EXISTS` 可以。两者的具体区别和 `NULL` 陷阱见 [07](07-sql-subqueries-views.md#topic-2)。左栏第二条：调用函数有开销，所以给计算结果起别名，在 `HAVING` 里直接用别名。右栏是下面这个难点。

### 难点：条件写在 ON 还是 WHERE

课件建议：`ON` 只写连接条件，`WHERE` 只写过滤条件。对内连接两种写法结果相同；对外连接则不同：把右表上的条件放错地方，外连接会不知不觉变成内连接。
<!-- Sources: W5-2 p.24 -->

#### 理解用例（自拟）：只统计 2 号部门的送货

| 写法 | 结果 |
| --- | --- |
| `… LEFT OUTER JOIN deliveryitem di ON di.itemId = i.itemID WHERE di.departmentID = 2` | 先外连接，再用 `WHERE` 过滤：没有送货记录的商品 `di.departmentID` 为 `NULL`，被过滤掉，**只剩 7 种有送货的商品**，等于内连接 |
| `… LEFT OUTER JOIN deliveryitem di ON di.itemId = i.itemID AND di.departmentID = 2` | 条件参与匹配：25 种商品全部保留，其中 18 种没送到 2 号部门，计数为 0 |

想“保留左表全部行”时，右表上的条件应写进 `ON`。

<a id="topic-4"></a>
## 4. 修改数据与表结构

### INSERT：一次多行、从表插入

![Slide 25 - More on INSERT](assets/06-sql-joins-and-changes/slide-25.png)

上面一框是 **从表插入**：把 `SELECT` 的结果整批插入另一张 **已存在** 的表。下面两框都是一次插入多行：第一种不列列名，每一行都必须按表定义的顺序给齐所有列（自增主键写 `DEFAULT`，可空列写 `NULL`）；第二种列出要插入的列，其余列取默认值或 `NULL`。教程在练习库上的写法：
<!-- Sources: W5-2 p.25; Tut W9 Sol p.4 -->

```sql
-- 一次插入多行
INSERT INTO customer VALUES
  (DEFAULT, 'Jon', 'Smith', '22522255', '1985-12-05'),
  (DEFAULT, 'An',  'Hone',  '22454852', '1956-01-22');

-- 把查询结果插入另一张已存在的表
INSERT INTO NewEmployee
SELECT * FROM Employee;
```
<!-- Sources: W5-2 p.25; Tut W9 Sol p.3-4 -->

字符串和日期都要加引号。

### UPDATE：WHERE 和顺序都重要

![Slide 26 - The UPDATE statement](assets/06-sql-joins-and-changes/slide-26.png)

右上的 `UPDATE Hourly SET HourlyRate = HourlyRate * 1.10;` 没有 `WHERE`，所以给 **所有** 小时工涨薪；这正是课件说“除非你想作用于整张表，否则要写 `WHERE`”。练习库上的普通写法：

```sql
UPDATE customer
SET FirstName = 'Yoshi'
WHERE LastName = 'Senti';
```
<!-- Sources: Tut W9 Sol p.5 -->

不写 `WHERE` 就会更新整张表。MySQL Workbench 默认开启“安全更新（safe updates）”，会拦住没有键条件的 `UPDATE` / `DELETE`；教程练习前要在偏好设置里关掉它。
<!-- Sources: W5-2 p.26; Tut W9 Sol p.1 -->

**难点：两条 UPDATE 的顺序。** 看下方红字 “Any problems with this?”：要求是“工资高于 100000 的涨 10%，其余涨 5%”。按图中顺序先执行“不高于 100000 的涨 5%”，一个原本 98000 的人涨到 102900，接着第二条“高于 100000 的涨 10%”又会再涨他一次。把两条语句的顺序反过来（先处理高工资）可以避免重复，但这种依赖顺序的写法很容易出错。
<!-- Sources: W5-2 p.26-27 -->

![Slide 27 - The UPDATE statement with CASE](assets/06-sql-joins-and-changes/slide-27.png)

课件推荐的做法：用一条 `UPDATE` 加 `CASE`。每一行只被检查一次，按 **原来的** 工资决定涨 5% 还是 10%，不存在先后顺序的问题。
<!-- Sources: W5-2 p.27 -->

### DELETE 与 REPLACE

![Slide 28 - DELETE and REPLACE](assets/06-sql-joins-and-changes/slide-28.png)

`REPLACE` 的用法和 `INSERT` 一样，区别在于新行的主键（或唯一键）已存在时，旧行被覆盖。`DELETE FROM Employee;` 删掉全部行，所以课件说它危险；下面带 `WHERE Name = "Grace"` 的才是安全写法。最后一条提醒外键约束：删除被引用的父行时，结果取决于 `ON DELETE CASCADE` 还是 `RESTRICT`。下面的教程实操正好演示这一点。

#### 实操：参照完整性怎样拦住你（Tut W9）

教程用 Scott 示例库（`Emp`、`Dept` 两张表，脚本故意没加外键）演示外键约束。用自己的话概括这段操作：

```sql
-- 1. 事后补上外键：员工的部门号必须在 Dept 中存在，父键修改或删除时级联
ALTER TABLE emp
  ADD CONSTRAINT FK_DEPT FOREIGN KEY (deptno) REFERENCES dept(deptno)
  ON DELETE CASCADE ON UPDATE CASCADE;
```
<!-- Sources: Tut W9 Sol p.5; tutorial/scott.sql -->

| 操作 | 结果 | 原因 |
| --- | --- | --- |
| 把新员工的 `deptno` 改成 50，而 Dept 中没有 50 | 报错 | 外键值必须对应一个已存在的主键 |
| 先插入 50 号部门，再改 | 成功 | 现在有了对应的主键 |
| 把 Dept 中的 50 改成 60 | 员工的 `deptno` 自动变成 60 | `ON UPDATE CASCADE` |
| 删除一位仍是别人上司的员工（上司外键用 `RESTRICT`） | 报错 | 还有子行引用他 |
| 先把下属的上司改成别人，再删除 | 成功 | 不再被引用 |
<!-- Sources: Tut W9 Sol p.5-9 -->

约束可以从数据字典查到：`SELECT * FROM information_schema.table_constraints WHERE table_name IN ('emp', 'dept');`。
<!-- Sources: Tut W9 Sol p.5 -->

### DDL：ALTER、RENAME、TRUNCATE、DROP 与 CTAS

![Slide 30 - ALTER and RENAME](assets/06-sql-joins-and-changes/slide-30.png)

`ALTER TABLE … ADD` / `DROP` 给已有的表加一列或删一列，上面的 `ADD CONSTRAINT` 也是 `ALTER TABLE` 的一种用法；`RENAME TABLE` 只改表名，数据不动。
<!-- Sources: W5-2 p.30-31 -->

![Slide 31 - TRUNCATE, DROP and CTAS](assets/06-sql-joins-and-changes/slide-31.png)

左栏两条都很危险：`TRUNCATE` 清空所有行，比 `DELETE` 快，但 **不能回滚**；`DROP` 连数据带表结构一起删掉，没有撤销命令，只能从备份恢复。右栏是 **CTAS**（`CREATE TABLE … AS SELECT`）：用查询结果建新表，连数据一起复制；加上永远为假的 `WHERE 1=0` 时，查询一行也不返回，于是只复制表结构。**易错（课件写法）：** 左栏的 “`DELETE * FROM table`” 不是合法的 MySQL 语句，正确写法是 `DELETE FROM table;`。

把四种“删”放在一起比较：

| 命令 | 作用 | 注意 |
| --- | --- | --- |
| `DELETE FROM t WHERE …` | 删除满足条件的行 | `DELETE FROM t;` 删掉全部行，很危险；受外键约束影响：可能被拒绝，也可能级联删掉子行 |
| `REPLACE INTO t …` | 与 `INSERT` 相同，但若主键已存在，就覆盖旧行 | |
| `TRUNCATE TABLE t` | 清空全部行，比 `DELETE` 快 | **不能回滚**，只能从备份恢复 |
| `DROP TABLE t` | 删除整张表：数据和结构都没了 | 没有撤销命令 |
<!-- Sources: W5-2 p.28, p.31 -->

## 本讲自测

1. 写出查询：列出每个供应商的名称和送货次数，**包括** 从未送货的供应商。用哪种连接？计数时数哪一列？
2. 用两种写法列出“从未卖出过的商品名称”：一种用外连接，一种用子查询。两种写法各自要注意什么？
3. 下面的查询想列出所有员工及其上司的名字，为什么 Alice 不见了？怎样改？`SELECT e.FirstName, b.FirstName FROM employee e INNER JOIN employee b ON e.BossID = b.employeeID;`
4. 要给“工资不高于 80000 的员工涨 8%，其余涨 3%”，写成一条语句。为什么不建议写成两条 `UPDATE`？
5. `TRUNCATE TABLE sale;` 和 `DELETE FROM sale;` 都能清空表，各有什么风险？
