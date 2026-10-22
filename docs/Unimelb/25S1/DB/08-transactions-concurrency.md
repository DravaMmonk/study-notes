# INFO90002 Week 7 - Transactions and Concurrency Control

来源：`lecture/INFO90002_Week7-1_Transactions.pdf`；`tutorial/Week12_Tute_ExamRevision_SOLUTIONS.pdf`（事务题，用自己的话改写）；Apple Notes：CS/25S1/DB — "FE - Transactions and Concurrency"。

这篇讲的是：**几条 SQL 必须“要么全做、要么全不做”时怎么办？很多用户同时改同一份数据时，DBMS 怎样防止结果出错，出了故障又怎样恢复？**

学习路线：[事务与 ACID](#topic-1) → [并发带来的三类问题](#topic-2) → [加锁](#topic-3) → [隔离级别](#topic-4) → [死锁与其他并发控制方法](#topic-5) → [事务日志与恢复](#topic-6)。

重点：用 `START TRANSACTION … COMMIT` 写一个业务事务；三类并发问题；共享锁与排他锁。难点：严格两阶段锁；四种隔离级别各自允许什么现象。易错：把不相关的操作塞进一个事务；只有排他锁才可能死锁。

<a id="topic-1"></a>
## 1. 事务与 ACID

### 这一讲在 DBMS 里的位置

![Slide 03 - Components of a DBMS](assets/08-transactions-concurrency/slide-03.png)

图中红框圈出的是本讲的焦点：**并发控制（Concurrency Control）** 模块里的事务管理器（Transaction Manager）和锁管理器（Lock Manager）。左边的查询处理负责“怎样算出结果”，右边的存储负责“数据放在磁盘哪里”，底部的崩溃恢复（Crash Recovery）和日志管理器（Log Manager）在本讲最后一节出现。整张图的内部结构在 [09](09-dbms-architecture-administration.md#topic-2) 展开。

### 业务事务由多条 SQL 组成

![Slide 05 - Business transactions](assets/08-transactions-concurrency/slide-05.png)

蓝字列出三个“业务事务”：下订单、转账、发月结单。每一个在业务上是一件事，但在数据库里要做好几步：

- 下订单：在 `Order` 表插一行，再在 `OrderItem` 表插若干行；
- 转账：检查金额不超过余额；从一个账户减钱，给另一个账户加钱；在交易表记一笔；
- 发月结单：对 `Customer` 表每一行生成并发送账单。
<!-- Sources: W7-1 p.5 -->

下半页把“从储蓄账户转钱到信用卡账户”拆成具体步骤。如果做到一半系统出错——钱已从储蓄账户扣掉，却没加到信用卡账户上——数据库就处于不一致状态。
<!-- Sources: W7-1 p.5, p.9 -->

### 事务：不可分割的工作单元

![Slide 06 - What is a database transaction](assets/08-transactions-concurrency/slide-06.png)

**事务（transaction）** 是一个逻辑工作单元，必须完整完成，否则整个中止（不可分割，atomic）。一个成功的事务把数据库从一个一致状态带到另一个一致状态，所有完整性约束都满足。
<!-- Sources: W7-1 p.6; Apple Notes FE - Transactions and Concurrency -->

注意页脚的星号：“单条 DML 已经是原子的”只对 MySQL、SQL Server 成立，Oracle 的 DML 默认不是原子事务。

课件接着说明事务解决两个问题：

1. 用户需要能定义一个工作单元；
2. 多个用户或程序并发访问数据。
<!-- Sources: W7-1 p.7; Apple Notes FE - Transactions and Concurrency -->

![Slide 08 - Problem 1: unit of work](assets/08-transactions-concurrency/slide-08.png)

上半页是 **隐式事务**：一条 `UPDATE` 要改 700 行，改到第 200 行时数据库崩溃，重启后一行都没变——“全有或全无”。下半页是 **用户定义的事务**，多条语句要自己包起来：
<!-- Sources: W7-1 p.6, p.8 -->

```sql
START TRANSACTION;   -- 或 BEGIN
  -- SQL 语句 1
  -- SQL 语句 2
  -- …
COMMIT;              -- 永久保存全部修改；或 ROLLBACK 撤销全部修改
```
<!-- Sources: W7-1 p.8; Apple Notes FE - Transactions and Concurrency -->

出错时：已经执行完的语句要撤销，给用户显示错误，用户准备好后再试一次。这对用户只是一时的麻烦，而不一致的数据会造成严重后果。
<!-- Sources: W7-1 p.9 -->

### ACID 四个性质

![Slide 10 - Transaction properties ACID](assets/08-transactions-concurrency/slide-10.png)

逐个读四个粗体标题，并记住每个字母在防什么：

- **原子性（Atomicity）**：事务是不可分割的逻辑单元——防“只做了一半”；
- **一致性（Consistency）**：事务前成立的约束，事务后仍成立——防“违反完整性规则”；
- **隔离性（Isolation）**：一个事务的中间状态在提交前对其他事务不可见——防“并发事务互相干扰”，第 2 节的三类问题都是它被破坏的结果；
- **持久性（Durability）**：提交后的修改保存在硬盘、SSD 等非易失存储上，系统故障也不丢——第 6 节的日志就是为它服务的。
<!-- Sources: W7-1 p.10; Apple Notes FE - JSON NoSQL -->

ACID 与 NoSQL 的 BASE 对照见 [12](12-nosql-json.md#topic-3)。

### 写一个业务事务

![Slide 11 - Exercise 1: unrelated tasks](assets/08-transactions-concurrency/slide-11.png)

课件的例子：设计师品牌零售商有 `Product`、`ProductStockLevel` 和记录销售与退货的 `Action` 三张表。练习 1 底部的事务把“新增一件商品”和“所有商品打九五折”放在一起——两件事毫无关系，不该绑定在一个事务里。
<!-- Sources: W7-1 p.12-13 -->

![Slide 13 - Exercise 2 solution](assets/08-transactions-concurrency/slide-13.png)

练习 2 要记录“卖出 2 件 G43546”。页中间一句话点出思路：需要两处修改——在 `Action` 插一条购买记录，在 `ProductStockLevel` 减库存。蓝色代码就是答案：

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

**易错：**

- 销售金额要用零售价 `RetailPrice`，不是进价 `PurchasePrice`（学生笔记里写成了进价）；对照页上 `Action` 表第一行：2 件 × 1080.00 = 2160.00；
- 用变量（`SET @qty = 2`）而不是把数值硬编码在多处，改一处就够了（Tut W12 也这样强调）；
- 事务里只放 **相关** 的操作。练习 1 是反例；同理，更新库存和为促销改价也不应放在一个事务里。
<!-- Sources: W7-1 p.7, p.11, p.13; Tut W12 Sol p.4; Apple Notes FE - Transactions and Concurrency -->

#### 理解用例：转账（改写自 Tut W12）

从账户 A 转 500 到账户 B：在一个事务里先给 A 减 500、再给 B 加 500，然后 `COMMIT`。如果第二条失败，`ROLLBACK` 会把 A 的扣款也撤回，钱不会凭空消失。同样的道理适用于“改价 + 写价格历史”这类成对修改：两步必须同时成功，否则历史记录与现价对不上。
<!-- Sources: Tut W12 Sol p.3-4 -->

<a id="topic-2"></a>
## 2. 并发带来的三类问题

多个用户共享数据正是数据库价值所在，但并发执行 DML 可能出错：丢失更新、读到未提交数据、不一致检索。
<!-- Sources: W7-1 p.15 -->

### 丢失更新

![Slide 16 - Lost update](assets/08-transactions-concurrency/slide-16.png)

沿绿色时间轴看：Alice（上方）和 Bob（下方）都在余额为 1000 时读取；Alice 取 100 写回 900，Bob 取 800 写回 200。Bob 的写入覆盖了 Alice 的，最终 200，而红字指出正确结果是 100。**两个并发事务更新同一数据，一个更新被另一个覆盖。**
<!-- Sources: W7-1 p.16 -->

### 读到未提交数据

![Slide 17 - Uncommitted data](assets/08-transactions-concurrency/slide-17.png)

这次 Bob 先动：取 800（余额暂时变成 200）后 **回滚**，余额恢复为 1000；但 Alice 在回滚前读到了那个 200，在它基础上取 100 写回 100。正确结果应是 900。**第一个事务回滚之前，第二个事务已经用了它未提交的数据**，违反了隔离性。
<!-- Sources: W7-1 p.17 -->

### 不一致检索

一个事务在对一组数据做汇总（如 `SUM(Salary)`），另一个事务同时在改这组数据，于是有的值是改之前读的，有的是改之后读的：
<!-- Sources: W7-1 p.18 -->

![Slide 19 - Inconsistent retrieval trace](assets/08-transactions-concurrency/slide-19.png)

逐行读这张表，红色行是 T2，黑色行是 T1，右侧 “T1 SUM” 是累计和：

- 第 3–5 行，T2 把 33 号员工工资从 30,000 改成 30,300；第 6 行 T1 读到的是 **改之后** 的 30,300；
- 第 7 行 T1 读 44 号时 T2 还没改，读到 **改之前** 的 40,000；第 8–11 行 T2 才把它改成 40,400 并提交；
- 最终 T1 得到 210,300——既不是改前的 210,000，也不是改后的 210,700（紫色批注）。
<!-- Sources: W7-1 p.19 -->

**补充：** 学生复习时特别标出了这一类：“一个事务在计算汇总函数，同时别的事务在更新数据”就是不一致检索。
<!-- Sources: Apple Notes Double Check -->

### 可串行化

![Slide 20 - Serializability](assets/08-transactions-concurrency/slide-20.png)

上面一排红箭头是现实：多个事务在时间上重叠；下面一排是“看起来的样子”：一个接一个。理想情况下事务是 **可串行化（serializable）** 的——实际并发执行，效果却和某种顺序执行一样。DBMS 中的 **调度器（scheduler）** 决定并发事务中各操作的执行次序，保证可串行化和隔离性。蓝字提醒：真正的串行执行（完全不并发）代价太高。
<!-- Sources: W7-1 p.20, p.22 -->

<a id="topic-3"></a>
## 3. 加锁

并发控制方法有三类：加锁（最主要）、时间戳、乐观方法。本节讲加锁，另外两种在 [第 5 节](#topic-5) 末尾。
<!-- Sources: W7-1 p.22; Apple Notes FE - Transactions and Concurrency -->

锁保证当前事务独占一个数据项：T1 在访问数据前加锁，事务完成后释放；T2 要访问同一数据就得等待。**锁管理器（lock manager）** 负责分配和监管锁。
<!-- Sources: W7-1 p.23 -->

### 锁粒度：锁住多大一块

![Slide 24 - Lock granularity: database and table](assets/08-transactions-concurrency/slide-24.png)

![Slide 25 - Lock granularity: page, row and field](assets/08-transactions-concurrency/slide-25.png)

两页从大到小排列五种粒度。读的时候抓住一条主线：**锁得越大，管理开销越小，但并发度越低；锁得越小，并发度越高，开销越大。**

- **数据库级**：锁住整个库，适合批处理，不适合多用户（SQLite、Access）；
- **表级**：不同事务只要用不同的表就能并行；大量行更新时合适，但同一张表的不同部分也会互相堵；
- **页级**：锁一个磁盘页，一页里可以有多张表的多行，是最常用的级别之一；
- **行级**：同一张表、甚至同一页里的不同行可以并行；MySQL、Oracle 最常用；同一页里锁的行太多时会自动升级为页锁；
- **字段级**：同一行的不同列也能并行（例如网银里看得到交易但看不到余额），最灵活但开销极高，很少用。
<!-- Sources: W7-1 p.24-25 -->

### 二元锁、共享锁与排他锁

**二元锁（binary lock）** 只有加锁（1）和未加锁（0）两态，不区分读写。它能消除丢失更新，但两个只读事务也会互相阻塞，太严格。替代方案是区分读写的共享锁和排他锁。

![Slide 27 - Shared and exclusive locks](assets/08-transactions-concurrency/slide-27.png)

- **排他锁（exclusive，写锁）**：要写时必须加；只有在该数据上 **没有任何其他锁** 时才授予。MySQL 写法：`SELECT … FOR UPDATE` 或 `LOCK TABLES … WRITE`；
- **共享锁（shared，读锁）**：想读且没有排他锁时授予；多个事务可同时持有。MySQL 写法：`SELECT … LOCK IN SHARE MODE` 或 `LOCK TABLES … READ`。
<!-- Sources: W7-1 p.26-27; Apple Notes FE - Transactions and Concurrency -->

![Slide 28 - Lock compatibility matrix](assets/08-transactions-concurrency/slide-28.png)

左上的绿色矩阵：行是已经持有的锁，列是新请求的锁。只有 S 遇到 S 是对勾，其余三格都是叉。一句话：别人在读，你也可以读但不能写；别人在写，你既不能读也不能写。
<!-- Sources: W7-1 p.28 -->

**补充：多版本并发控制（MVCC）。** 简单的锁机制中，写者阻塞读者和其他写者，读者阻塞写者。MySQL 实现了多版本并发控制：用顺序递增的事务号加修改日志记录版本，写者更新时读者可以读到“旧版本”，两者不必完全互相阻塞。
<!-- Sources: W7-1 p.29 -->

### 严格两阶段锁（Strict 2PL）

![Slide 30 - Strict two-phase locking](assets/08-transactions-concurrency/slide-30.png)

1. **增长阶段**：事务在读写数据前获取它需要的所有锁；还需要加锁时不能释放任何锁；
2. **收缩阶段**：事务完成时一次性释放它持有的全部锁。

页下半说明效果：访问完全不同数据的两个事务可以同时拿锁并推进；访问同一对象且其中一个要修改时，两者的动作就被串行化——T1 全部完成后 T2 才能继续。
<!-- Sources: W7-1 p.30 -->

#### 给销售事务排出加锁顺序

![Slide 32 - Locking timeline for the sale transaction](assets/08-transactions-concurrency/slide-32.png)

把第 1 节的销售事务放进“行级悲观锁 + 两阶段协议”下，下方表格就是时间顺序：

1. 第 1–3 步先锁住要用的三处数据：`Product` 中 G43546 那一行、`Action`、`ProductStockLevel` 中 G43546 那一行；
2. 第 4–7 步设置变量，读零售价，插入销售记录，扣减库存；
3. 第 8–10 步依次解锁这三处。

关键点是 **所有加锁都发生在任何解锁之前**。
<!-- Sources: W7-1 p.31-32 -->

<a id="topic-4"></a>
## 4. 隔离级别

隔离级别决定一个事务在多大程度上受其他正在执行的事务影响，目的是在一致性和并发度之间取舍。设置方法：`SET TRANSACTION ISOLATION LEVEL <级别>;`
<!-- Sources: W7-1 p.33 -->

| 级别 | 行为 | 可能出现的现象 |
| --- | --- | --- |
| READ UNCOMMITTED | 读之前不加共享锁，性能高 | **脏读（dirty read）**：读到别人尚未提交、之后可能回滚的数据；事务间没有隔离 |
| READ COMMITTED（Oracle、SQL Server、Postgres 默认） | 只读别人已提交的修改；写前加排他锁，读前加共享锁 | 同一事务两次读同一数据可能得到不同结果 |
| REPEATABLE READ（MySQL 默认） | 第一次 `SELECT` 建立快照，之后同一事务的 `SELECT` 都看这个快照 | 不考虑别人的修改，可能导致丢失更新；可能出现 **幻读（phantom read）**——别人插入的新行 |
| SERIALIZABLE | 读和写都加锁；被 T1 选中的行在 T1 结束前不能被别人修改、删除，也不能插入新行 | 隔离最强，并发最低 |
<!-- Sources: W7-1 p.34-41 -->

上表把课件四页文字合在一起，下面四个时间线例子是课件给的证据。每张图都是三列：时间点、Process 1、Process 2；看 Process 1 在两次 `SELECT` 之间看到的结果有没有变。

### 脏读

![Slide 35 - Example of dirty read](assets/08-transactions-concurrency/slide-35.png)

t2 时 Process 2 开始转账，从 1 号账户扣 100、给 2 号账户加 100，**但没有 `COMMIT`**（t3 右侧注释）。t3 时 Process 1 读到 savings 100、credit 800——这正是右侧问题的答案：脏读发生在 t3，因为它读到的是可能被回滚的数据。

### READ COMMITTED：看得到别人已提交的新行

![Slide 37 - READ COMMITTED example](assets/08-transactions-concurrency/slide-37.png)

t4 时 Process 2 插入一个 loan 账户，t5 提交。Process 1 在 t3 读到 2 行，t6 再读变成 3 行。没有脏读，但同一事务里两次读的结果不同。

### REPEATABLE READ：同一事务内看同一个快照

![Slide 39 - REPEATABLE READ example](assets/08-transactions-concurrency/slide-39.png)

t4 时 Process 2 给 1 号账户加 100 并提交，但 Process 1 在 t6 读到的仍是 200——它一直看第一次 `SELECT` 时建立的快照。

**易错：** REPEATABLE READ 的快照针对的是整张表，而不只是 `WHERE` 选中的行；事务结束后快照删除。
<!-- Sources: W7-1 p.39 -->

### SERIALIZABLE：别人不能改我读过的东西

![Slide 41 - SERIALIZABLE example](assets/08-transactions-concurrency/slide-41.png)

和 REPEATABLE READ 一样，t6 返回的行与第一次完全相同；额外的限制是 Process 1 读过的行在它结束前不能被别人修改、删除或插入新行。

**理解用例（自拟）：** 月底报表事务要对 1 万个账户求和，期间不断有转账提交。若希望报表既不含未提交数据、又在整个事务内前后一致，至少需要 REPEATABLE READ；READ COMMITTED 只能防脏读，求和过程中仍会混进别人刚提交的新值，也就是第 2 节的不一致检索。

<a id="topic-5"></a>
## 5. 死锁与其他并发控制方法

### 死锁

两个事务互相等待对方释放锁：T1 锁住 X 后想要 Y，T2 锁住 Y 后想要 X，若不处理会永远等下去。三个或更多事务也可能形成环：T1 等 T2，T2 等 T3，T3 等 T1。**死锁只会因排他锁发生；只有共享锁时不会死锁。**
<!-- Sources: W7-1 p.42; Apple Notes FE - Transactions and Concurrency -->

![Slide 43 - Deadlock example](assets/08-transactions-concurrency/slide-43.png)

从上往下读左边的时序图，右边五条文字和它一一对应：两个事务各自拿到一个对象的读锁；接着事务 1 想给对象 2 加写锁，被事务 2 的读锁挡住（黄色 Lock Wait）；事务 2 又想给对象 1 加写锁，被事务 1 的读锁挡住——红叉处形成死锁。DBMS 选事务 2 作为“牺牲者（victim）”回滚，它的读锁释放后，事务 1 才拿到写锁。
<!-- Sources: W7-1 p.43 -->

| 应对方式 | 做法 |
| --- | --- |
| 超时（timeout） | 等太久就放弃 |
| 预防（prevention） | 仔细设计事务，例如总按相同顺序加锁、尽早释放锁 |
| 检测（detection） | 定期扫描事务日志找出等待环，选一个事务中止 |
| 避免（avoidance） | 避免循环等待；用算法预判某些事务一起运行是否会死锁 |
<!-- Sources: W7-1 p.44; Apple Notes FE - Transactions and Concurrency -->

### 时间戳与乐观方法

- **时间戳（timestamp）**：给每个事务一个全局唯一的时间戳，被访问的数据项也记上时间戳；事务要读写时，DBMS 比较时间戳决定是否允许；
- **乐观方法（optimistic）**：假设大多数操作不冲突，事务执行时不加限制，准备提交时才检查它读过的数据有没有被改过，被改过就回滚。
<!-- Sources: W7-1 p.45; Apple Notes FE - Transactions and Concurrency -->

<a id="topic-6"></a>
## 6. 事务日志与恢复

### 日志记录什么

事务无法完成时必须中止并回滚已做的修改。为此 DBMS 记录所有更新，**事务日志（transaction log）** 包含：
<!-- Sources: W7-1 p.46 -->

- 事务开始的记录；
- 每条 SQL 语句：操作类型（更新、删除、插入）、受影响的对象、被更新字段的“前值”和“后值”、指向前后日志项的指针；
- 事务结束（`COMMIT`）的记录。
<!-- Sources: W7-1 p.46 -->

### 从故障中恢复

![Slide 47 - Checkpoint and crash](assets/08-transactions-concurrency/slide-47.png)

时间轴上有一个检查点（checkpoint）和一次崩溃。红色箭头是事务：在崩溃时还没有完成的事务，恢复时根据日志撤销到之前的状态；已提交的事务则保留。系统故障后，DBMS 检查日志中所有未提交或不完整的事务，把数据库恢复到之前的一致状态。日志也能用来修复损坏的数据库。
<!-- Sources: W7-1 p.47 -->

![Slide 48 - Example transaction log](assets/08-transactions-concurrency/slide-48.png)

把上一页的要素对到一张真实的日志表上：

- `TRX NUM` 列把日志项分成三个事务 101、106、155；`PREV PTR` / `NEXT PTR` 把同一事务的日志项串成链表（例如 101 的 341 → 352 → 363 → 365）；
- `BEFORE VALUE` / `AFTER VALUE` 就是“前值”和“后值”：352 号记录把产品 54778-2T 的库存 `PROD_QOH` 从 45 改成 43；
- 深色的 423 行是检查点，最底部一行标出崩溃；
- 三个事务在崩溃前都有 `COMMIT` 记录，因此恢复时都应保留。101 在检查点前已结束；106 跨过检查点；155 完全在检查点之后。

<details markdown="1">
<summary>延伸内容（可选）：检查点为什么能缩短恢复</summary>

课件只说明“根据日志恢复”。常见的做法是：检查点时把内存中的修改写到磁盘，所以检查点之前已提交的事务（如 101）无需再处理；检查点之后才提交的事务（如 106、155）用 `AFTER VALUE` 重做（redo）；崩溃时仍未提交的事务用 `BEFORE VALUE` 撤销（undo）。这是对课件的补充解释，具体算法因 DBMS 而异。

</details>

**补充：** 学生复习时记下，磁盘损坏后的恢复需要用到检查点信息、日志和数据库备份。备份类型和“重做日志”式的增量恢复见 [13](13-security-backups.md#topic-3)；日志管理器在 DBMS 内部的位置见 [09](09-dbms-architecture-administration.md#topic-2)。
<!-- Sources: Apple Notes Double Check; W10-2 p.21 -->

## 本讲自测

1. 写一个事务：把某商品的零售价打九折，并在 `PriceHistory` 表记下旧价和新价。为什么这两步要放在同一个事务里？
2. 两名柜员同时给同一账户存款，结果少了一笔。这是哪类并发问题？二元锁能解决吗？
3. T1 持有数据项 A 的共享锁。T2 请求 A 的共享锁、T3 请求 A 的排他锁，各自结果如何？
4. 网店向顾客展示商品目录时，库存数量可能正在被别的事务修改。为什么 READ COMMITTED 对这种场景已经够用，而月底对账报表却不够？
5. 在示例日志中，如果崩溃发生在 431 号记录之后、457 号之前，恢复时事务 106 应怎样处理？
