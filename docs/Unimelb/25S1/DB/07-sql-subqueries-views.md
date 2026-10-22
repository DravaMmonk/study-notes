# INFO90002 Week 5 - SQL Part 3: Subqueries, Views and Data Control

来源：`lecture/INFO90002_Week5-3_SQL3.pdf`、`lecture/INFO90002_Week5-2_SQL2.pdf`（p.24）；`tutorial/Week6Tute_SQL_Advanced_SOLUTIONS.pdf`、`tutorial/Week7Tute_SQL_Advanced2_SOLUTIONS.pdf`、`tutorial/Week8Tute_SQL_Advanced3_Solutions.pdf`。没有对应的 Apple Note。

这篇讲的是：**当一个问题要“先算出一组值再拿来用”、要判断“存在 / 不存在”、甚至要求“对所有……都成立”时，SQL 怎样表达？怎样把复杂查询包装成视图，又怎样拆解一道新题？**

学习路线：[嵌套子查询](#topic-1) → [EXISTS 与相关子查询](#topic-2) → [关系除法：“对所有”](#topic-3) → [视图与数据控制](#topic-4) → [像 SQL 一样思考](#topic-5)。

重点：`IN` / `NOT IN` / `EXISTS` 的选择；视图的用途。难点：相关子查询的逐行执行；双重 `NOT EXISTS`。易错：子查询返回多行时用 `=`；`NOT IN` 的子查询中含 `NULL`。

拍卖例子来自课件，其余例子使用 [05](05-sql-select-basics.md#topic-1) 的百货商店练习库；练习库上的结果都在本地用同一份数据核对过。

<a id="topic-1"></a>
## 1. 嵌套子查询

### 子查询返回一张表

任何 `SELECT` 都返回一张表，所以可以把一个查询嵌进另一个查询里。子查询最常见的用途是做集合测试：某个值在不在一个集合里（集合成员），或者和一个集合里的值比大小（集合比较）。
<!-- Sources: W5-3 p.4 -->

![Slide 05 - Sub-query comparison operators](assets/07-sql-subqueries-views/slide-05.png)

四个运算符按“问的是什么”来记：`IN` / `NOT IN` 问值在不在子查询结果的列表里；`ANY` 问是否 **有一个** 返回值满足条件；`ALL` 问是否 **全部** 返回值都满足条件；`EXISTS` 不看值，只问子查询有没有返回至少一行。
<!-- Sources: W5-3 p.5 -->

`ALL` 的例子：`WHERE Salary > ALL (SELECT Salary FROM employee WHERE departmentID = 11)` 表示比市场部（Marketing）每个人都高，等价于“高于该部门最高工资”，练习库中是 Alice 和 Sarah。同理，`> ANY (…)` 等价于“高于该部门最低工资”。
<!-- Sources: W5-3 p.5 -->

### 课件例子：拍卖库

![Slide 06 - Auction bids physical model](assets/07-sql-subqueries-views/slide-06.png)

课件的拍卖库有四张表：卖家 `Seller`、拍品 `Artefact`、买家 `Buyer`，以及记录“哪位买家对哪件拍品出价多少”的 `Offer`。看中间的 `Offer`：它的主键由 `SellerID`、`BuyerID`、`ArtefactID` 三个外键组成，是连接另外三张表的关联表。
<!-- Sources: W5-3 p.6-7 -->

![Slide 07 - Auction tables with sample data](assets/07-sql-subqueries-views/slide-07.png)

先读右下角的 `Offer`：四行出价全部来自买家 1（Maggie）和 2（Nigel），对象是拍品 1（花瓶 Vase）和 2（素描 Sketch）。由此可以先猜出后面几题的答案：拍品 3（陶罐 Pot）没人出价，买家 3（Olga）没出过价。

![Slide 08 - Subquery example: bidders on artefact 1](assets/07-sql-subqueries-views/slide-08.png)

括号里的内层查询先执行，得到对拍品 1 出过价的 `BuyerID` 列表 {1, 2}；外层查询再逐行检查每位买家的 `BuyerID` 在不在这个列表里。结果是 Maggie 和 Nigel。

![Slide 09 - Artefacts with no offers](assets/07-sql-subqueries-views/slide-09.png)

把 `IN` 换成 `NOT IN` 就是在找“没有”：拍品的 `ID` 不在 `Offer` 出现过的拍品列表里，结果只有 Pot。右边的物理模型提醒你，这里的连接路径是 `Artefact.ID` 对 `Offer.ArtefactID`。

![Slide 11 - Buyers who have not bid on the Pot](assets/07-sql-subqueries-views/slide-11.png)

这一题嵌套了两层，要从最里层往外读：最里层找出名为 Pot 的拍品 `ID`；中间层找出对这些拍品出过价的 `BuyerID`；最外层留下不在这个列表里的买家。因为没人对 Pot 出过价，中间层是空集，所以三位买家全部入选。
<!-- Sources: W5-3 p.8-11 -->

### 单值子查询与 IN

想找“工资最低的人在哪个部门”：先求最低工资，再找等于它的行。两步可以合成一条语句：括号里的内层查询先执行，外层查询逐行与内层结果比较。
<!-- Sources: Tut W6 Sol p.5-6 -->

```sql
SELECT FirstName, LastName, departmentID
FROM employee
WHERE Salary = (SELECT MIN(Salary) FROM employee);
-- Paul Innit，部门 4，工资 41000
```
<!-- Sources: Tut W6 Sol p.6 -->

教程提醒：也可以 `ORDER BY` 后 `LIMIT 1`，但若有并列最低就会漏掉人，应尽量避免。
<!-- Sources: Tut W6 Sol p.5 -->

**易错：** 内层查询返回多行时不能用 `=`，否则 MySQL 报 `Error Code: 1242. Subquery returns more than 1 row`，要改用 `IN`：
<!-- Sources: Tut W6 Sol p.6 -->

```sql
-- 在五楼各部门工作的员工人数
SELECT COUNT(employeeID) AS EMP_COUNT_FLOORS
FROM employee
WHERE departmentID IN (SELECT departmentID FROM department WHERE Floor = 5);
-- 9
```
<!-- Sources: Tut W6 Sol p.6 -->

### 能用连接就用连接

![Slide 12 - IN versus INNER JOIN](assets/07-sql-subqueries-views/slide-12.png)

左右两段回答同一个问题“对拍品 1 出过价的买家”。左边用 `IN` 子查询，右边把 `Buyer` 和 `Offer` 内连接后再过滤，红色箭头指出连接写法更高效。这和 [06](06-sql-joins-and-changes.md#topic-3) 里“连接比子查询快”的经验一致。
<!-- Sources: W5-3 p.12; W8-1 p.23 -->

**易错：** 两种写法并不总是逐行相同。一位买家对同一拍品出价两次时，连接写法会把他列两次，`IN` 写法只列一次；需要时加 `DISTINCT`。另外右边用了 `SELECT *`，结果会同时带上 `Buyer` 和 `Offer` 的所有列，只要买家信息就写 `SELECT b.*`。

### 难点：NOT IN 遇到 NULL

课件提到 `IN` 不能和 `NULL` 比较，而 `EXISTS` 可以（[06](06-sql-joins-and-changes.md#topic-3) 的 slide 24）。在练习库里可以直接看到后果：
<!-- Sources: W5-2 p.24 -->

```sql
-- 想数“不是任何人上司的员工”
SELECT COUNT(*) FROM employee
WHERE employeeID NOT IN (SELECT BossID FROM employee);
-- 结果是 0！
```

原因：`BossID` 列里有一个 `NULL`（Alice 没有上司）。`x NOT IN (…, NULL)` 意味着“x 不等于其中每一个值”，而“x 不等于 NULL”的结果是未知，所以整个条件永远不为真。修正方法是在子查询中排除空值，或改用 `NOT EXISTS`：
<!-- Sources: W5-2 p.24; tutorial/labs2018engv6.sql -->

```sql
SELECT COUNT(*) FROM employee
WHERE employeeID NOT IN (SELECT BossID FROM employee WHERE BossID IS NOT NULL);
-- 11

SELECT COUNT(*) FROM employee e
WHERE NOT EXISTS (SELECT * FROM employee w WHERE w.BossID = e.employeeID);
-- 11
```

**重点：** 危险来自 **子查询结果** 里的 `NULL`，而不是外层表。外层某一行的值为 `NULL` 时，只是这一行自己不被选中；子查询结果里只要有一个 `NULL`，`NOT IN` 就会让 **所有** 行都落选。所以写 `NOT IN` 前先问：子查询返回的那一列可能为空吗？

<a id="topic-2"></a>
## 2. EXISTS 与相关子查询

### EXISTS 只问“有没有”

![Slide 13 - EXISTS example](assets/07-sql-subqueries-views/slide-13.png)

`EXISTS (子查询)` 在子查询返回一行或多行时为真，它不关心返回了哪些列，所以子查询里写 `SELECT *` 就行。关键在内层的 `WHERE Buyer.BuyerID = Offer.BuyerID`：子查询引用了外层表的列，所以它对外层的 **每一行** 重新执行一次。这叫 **相关子查询**（correlated subquery）；前面的 `IN` 子查询不引用外层，只需执行一次，叫非相关子查询。
<!-- Sources: W5-3 p.5, p.13 -->

读法：对每一位买家，问“`Offer` 里有没有他对拍品 1 的出价？”有就保留。**易错（课件数据）：** 这一页结果表里的买家 2 叫 Nicole、电话是 0444444444，和 slide 07、08 的数据（Nigel，0519 434 389）对不上，是课件截图来自另一份样例数据；查询逻辑不受影响，结果仍是买家 1 和 2。

### IN 还是 EXISTS

| | `IN` | `EXISTS` |
| --- | --- | --- |
| 子查询结果很大时 | 较慢 | 快得多 |
| 子查询结果很小时 | 较快 | 较慢 |
| 遇到 `NULL` | 不能正确比较 | 可以 |
<!-- Sources: W5-2 p.24 -->

`NULL` 一行的具体表现就是 [上一节](#topic-1) 的 `NOT IN` 陷阱：`NOT EXISTS` 只看“有没有匹配的行”，`NULL` 不会匹配任何行，也就不会把结果整个变成未知。

### 同时满足 / 满足其一

两个独立条件可以分别写成子查询，再用 `AND` 或 `OR` 组合：
<!-- Sources: Tut W7 Sol p.8; Tut W6 Sol p.11-12 -->

```sql
-- 既由 Nepalese Corp. 供货、又在 Navigation 部门卖出过的商品
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

把 `AND` 换成 `OR` 就是“满足其一”；“满足其一”也可以写成两个查询的 `UNION`（见 [06](06-sql-joins-and-changes.md#topic-1)）。
<!-- Sources: Tut W6 Sol p.11-12 -->

子查询里还可以带 `GROUP BY … HAVING`：

```sql
-- 管理超过 2 名员工的经理的姓名和工资
SELECT FirstName, LastName, Salary
FROM employee
WHERE employeeID IN (SELECT BossID FROM employee GROUP BY BossID HAVING COUNT(*) > 2);
-- Alice、Andrew、Clare
```
<!-- Sources: Tut W7 Sol p.7 -->

<a id="topic-3"></a>
## 3. 关系除法：“对所有”

问题形如“卖过 **所有** 二楼部门的商品”“收到过的 **每一种** 商品都卖出过的部门”，叫关系除法（relational division）。课件没有专门讲，但 Week 8 教程给出两种写法。
<!-- Sources: Tut W8 Sol p.8-11 -->

### 方法一：计数比较

二楼有两个部门（Clothes、Recreation）。某商品若在二楼被 **不同的** 两个部门卖过，就满足“所有”：
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
-- 商品 14
```
<!-- Sources: Tut W8 Sol p.10 -->

读法：`WHERE` 先只留二楼的销售；按商品分组后，左边数“这件商品在二楼被几个不同部门卖过”，右边的子查询数“二楼一共有几个部门”。两者相等，就说明一个都没漏。

### 方法二：双重 NOT EXISTS

把“对所有二楼部门都卖过”改写成“**不存在** 一个二楼部门，使得这件商品 **没有** 在那里卖过”：
<!-- Sources: Tut W8 Sol p.8-10 -->

```sql
SELECT i.itemID
FROM item i
WHERE NOT EXISTS (                         -- 不存在这样的部门：
  SELECT * FROM department d
  WHERE d.Floor = 2
    AND NOT EXISTS (                       --   这件商品在该部门没有销售记录
      SELECT * FROM saleitem si
      INNER JOIN sale s ON si.SaleId = s.SaleID
      WHERE si.itemId = i.itemID
        AND s.departmentID = d.departmentID
    )
);
-- 同样得到商品 14
```
<!-- Sources: Tut W8 Sol p.10 -->

**难点：** 读双重 `NOT EXISTS` 时，固定外层的一件商品，在中间层逐个检查二楼部门；只要有一个部门让最内层“找不到记录”，中间层就有行，外层 `NOT EXISTS` 为假，这件商品被排除。计数法更直观，也更容易推广，例如把 `> 1` 改成 `> 2` 就能回答“至少三种”。
<!-- Sources: Tut W8 Sol p.9-10; Tut W7 Sol p.10 -->

**易错：** 计数法必须用 `COUNT(DISTINCT …)`：同一部门多次卖同一商品会产生多行。

<a id="topic-4"></a>
## 4. 视图与数据控制

### 视图：存起来的查询

![Slide 15 - Views](assets/07-sql-subqueries-views/slide-15.png)

不在物理模型中、但作为虚拟关系提供给用户的关系叫 **视图**（view）。语法是 `CREATE VIEW 视图名 AS 合法的 SELECT 语句`。这一页分三块看：
<!-- Sources: W5-3 p.15 -->

- 好处：隐藏查询的复杂性；隐藏用户无权看的数据（例如不让顾客看到库存量或进价），不同用户用不同视图，是提高安全性的一种方式（权限怎样授予见 [13](13-security-backups.md#topic-1)）；
- 定义好的视图只存定义（元数据），不存数据；可以像表一样使用；每次查询都显示最新数据。
<!-- Sources: W5-3 p.15; Tut W8 Sol p.5 -->

![Slide 16 - Create view example: EmpPay](assets/07-sql-subqueries-views/slide-16.png)

`EmpPay` 把三类员工合成一张“薪酬表”：小时工取 `HourlyRate`、年薪员工取 `AnnualSalary`、合同工取 `BillingRate`，三处都起别名 `AS Pay`，再用两个 `UNION` 上下拼起来。这正是 [06](06-sql-joins-and-changes.md#topic-1) 集合运算的要求：每一半的列数和类型对齐。用户以后只需查 `EmpPay`，不必知道背后有四张表。

![Slide 17 - CREATE VIEW example: department salary](assets/07-sql-subqueries-views/slide-17.png)

第二个例子把“部门连接员工、按部门求工资总和”存成视图 `v_DEPT_SALARY`。看 `SUM(employee.salary) AS DEPTSAL`：视图里的计算列一定要起名字，否则以后没法按列名引用它。

![Slide 18 - Using a view](assets/07-sql-subqueries-views/slide-18.png)

左上 `SELECT * FROM EmpPay;` 返回全部 6 名员工；右下在视图上加 `WHERE EmployeeType = "H" OR EmployeeType = "C"`，只剩 4 行。查视图的写法和查表完全一样。

教程在练习库上做了同样的事：先把“各部门平均工资”存成视图，再拿它和员工表连接：

```sql
CREATE VIEW vdepartmentSalary (departmentID, dptavgsal) AS
SELECT departmentID, AVG(Salary)
FROM employee
GROUP BY departmentID;

-- 会计部每名员工与部门平均工资的差
SELECT e.FirstName, e.LastName, FORMAT(e.Salary - v.dptavgsal, 2) AS DiffFromAvg
FROM employee e
INNER JOIN vdepartmentSalary v ON v.departmentID = e.departmentID
INNER JOIN department d        ON d.departmentID = e.departmentID
WHERE d.Name = 'Accounting';
-- Todd +8,000.00，Nancy -8,000.00
```
<!-- Sources: Tut W8 Sol p.6 -->

使用视图时，DBMS 实际上把视图定义当作 `FROM` 子句里的子查询来执行，这种写法也叫 **内联视图**（inline view）。视图定义可以从数据字典查到：`SELECT table_name, view_definition FROM information_schema.views;`。给视图名加 `v` 前缀是好习惯，但不是强制的。
<!-- Sources: Tut W8 Sol p.5-6, p.8 -->

### 数据控制语言与管理语句

![Slide 20 - Data control language and other commands](assets/07-sql-subqueries-views/slide-20.png)

上半是 **数据控制语言**（DCL）：管理用户（`CREATE USER`、`DROP USER`、`SET PASSWORD`）和权限（`GRANT` 授予、`REVOKE` 收回）。下半是其他管理命令：备份、恢复和分析表（`BACKUP TABLE`、`RESTORE TABLE`、`ANALYZE TABLE`），以及日常的 `DESCRIBE 表名`（看表结构）和 `USE 库名`（切换数据库）。最后一行说明这些通常统称“数据库管理语句”。
<!-- Sources: W5-3 p.20; W5-1 p.2 -->

视图和 DCL 配合起来就是一种访问控制：不把底表授权给某类用户，只把去掉敏感列的视图 `GRANT` 给他们。权限模型（DAC、RBAC）和 `GRANT` 的实际用法见 [13](13-security-backups.md#topic-1)。
<!-- Sources: W5-3 p.20 -->

<a id="topic-5"></a>
## 5. 像 SQL 一样思考

![Slide 22 - How to think like SQL](assets/07-sql-subqueries-views/slide-22.png)

课件给出写查询的三步：
<!-- Sources: W5-3 p.22 -->

1. 把数据库设计当作 **地图**，找出需要的列和表，以及它们之间的连接路径；
2. 把 `SELECT` 语句的结构当作 **模板**；
3. 逐个 **填空**，拼出查询。

![Slide 23 - Example schema: students, streams and courses](assets/07-sql-subqueries-views/slide-23.png)

题目是：哪些雇主雇用了正在上课的学生，且上课地点容量大于 20 人？列出雇主和地点。先在图上找列：`Employer` 在 `Student` 表，`Location` 和 `Capacity` 在 `Stream`（课程班）表。再找路径：`Student` 和 `Stream` 之间没有直接的线，要经过关联表 `StudentStream`。`Instructor` 和 `Course` 用不到。

![Slide 24 - How to approach writing queries](assets/07-sql-subqueries-views/slide-24.png)

左上把题目拆成三样东西：要输出的列（F：Employer、Location、Capacity），涉及的表（T：Student、Stream、StudentStream），以及条件（容量大于 20）。下面两段 SQL 结果相同：左边连续写两个 `INNER JOIN`，最后用一个 `ON … AND …` 列出两个连接条件，这是 MySQL 允许的写法；右边每个 `JOIN` 紧跟自己的 `ON`，更清楚（见 [06](06-sql-joins-and-changes.md#topic-2)）。
<!-- Sources: W5-3 p.23-24 -->

**补充：** 课件推荐 LeetCode “Top SQL 50” 做额外练习。
<!-- Sources: W5-3 p.26 -->

## 本讲自测

1. 写出“工资高于本部门平均工资的员工”。内层查询要引用外层的哪一列？它为什么是相关子查询？
2. 列出“从未供应过指南针（名称以 Compass 开头）的供应商”，分别用 `NOT IN` 和 `NOT EXISTS` 写。如果数据中出现 `NULL`，它要出现在哪里才会影响 `NOT IN` 写法？
3. 用计数法回答“卖出过 **所有** N 类商品的部门”：每个部门 `HAVING` 左边数什么，右边的子查询数什么？
4. 想让前台员工能查商品名称和售价，但看不到进价和库存量。用视图和 DCL 怎样做到？
5. 用“地图–模板–填空”三步，写出“给 202 号学生上过课、且课程费用超过 10000 的讲师的电话”需要的列、表、连接路径和条件。
