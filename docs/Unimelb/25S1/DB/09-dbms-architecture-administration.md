# INFO90002 Week 8 - Database Architecture, Administration and Performance

来源：`lecture/INFO90002_Week8-1_DBA.pdf`；Apple Notes：CS/25S1/DB — "FE - Database Architecture & Administration"。

这篇讲的是：**谁负责管理数据和数据库？一条 SQL 进入 DBMS 后经过哪些内部组件？哪些因素决定数据库快不快，什么时候该建索引？**

学习路线：[数据管理员与数据库管理员](#topic-1) → [DBMS 内部结构](#topic-2) → [影响性能的因素](#topic-3) → [索引](#topic-4)。

重点：DA 与 DBA 的分工；四组内存结构及其作用；何时建索引。难点：一条 `UPDATE` 在 DBMS 中的九个步骤；缓冲池中缓冲区的四种状态。易错：索引不是越多越好；小表不需要索引。

<a id="topic-1"></a>
## 1. 数据管理员与数据库管理员

### DBA 在生命周期中的位置

![Slide 03 - The DBA role](assets/09-dbms-architecture-administration/slide-03.png)

右上角的循环是 [01](01-introduction.md#topic-4) 讲过的开发生命周期，黄色高亮的是 “Maintenance”：DBA 主要负责“运维”阶段，但应在开发的所有阶段都被咨询。下方两条横线比较组织规模：大公司里 DA、DBA 各自独立，而且 DBA 有好几位（叠起来的圆）；小公司里一个开发者同时兼任 DBA 和服务器管理员。云数据库或“数据即服务”（DaaS）可能让 DBA 这个角色不再需要。
<!-- Sources: W8-1 p.3 -->

### 两种角色的分工

![Slide 04 - Data and database administration duties](assets/09-dbms-architecture-administration/slide-04.png)

左列是 **数据管理员（Data Administrator, DA）**，括号注明是管理角色（首席数据官 CDO / 首席安全官 CSO）；右列是 **数据库管理员（Database Administrator, DBA）**，技术角色。对着两列读，能看出一个规律：DA 的职责都是“定规则、对外合规”（数据政策和标准、遵守欧盟 GDPR 和澳大利亚隐私法、公司政策、规划、数据冲突解决、信息资源库、内部宣传与培训）；DBA 的职责都是“让某个具体的数据库跑起来”（分析设计、选 DBMS 与工具、安装升级、调优、管理安全隐私与完整性、备份恢复）。
<!-- Sources: W8-1 p.4; Apple Notes FE - Database Architecture & Administration -->

几项 DA 职责的含义：

- **数据冲突解决**：例如在复制环境中，销售员在不同数据库里修改了同一客户的地址，系统可以采用“最近一次更新”来解决冲突；
- **信息资源库（information repository）**：公司长期存放大量信息的地方，不对外公开，只有具备特定角色和权限的用户可访问；
- **内部宣传**：向员工推广公司的目标、产品和服务，提高员工对公司目标的投入。
<!-- Sources: W8-1 p.5 -->

![Slide 06 - DA versus DBA](assets/09-dbms-architecture-administration/slide-06.png)

这张对照表把上面的规律压缩成七行：战略规划对控制监督，设定长期目标对执行计划，制定政策和 **标准** 对执行政策和编程标准，范围广对范围窄，长期对短期（日常运营），管理导向对技术导向，与 DBMS 无关对针对特定 DBMS。
<!-- Sources: W8-1 p.4, p.6; Apple Notes FE - Database Architecture & Administration -->

**易错：** 判断一项任务属于谁，看它是“制定”还是“执行”。课件用一个情景让人讨论责任归属：数据政策要求处理个人数据的员工每年参加隐私培训，系统发现有人没参加，DBA 撤销了他的权限并影响了业务——政策由 DA 制定，权限由 DBA 执行，讨论时要分清这两层。学生复习时也标出：长期、战略规划、制定政策和标准属于 DA；短期日常运营、执行标准、控制与监督属于 DBA。
<!-- Sources: W8-1 p.7; Apple Notes Double Check -->

<a id="topic-2"></a>
## 2. DBMS 内部结构

### 内存与磁盘

DBMS 同时存在于两个地方：内存（RAM）和磁盘。两处都管理数据、性能、并发和可恢复性。磁盘上的表示是持久的、一直存在；内存中的部分是暂时的，只在 DBMS 运行时存在。
<!-- Sources: W8-1 p.9 -->

![Slide 10 - DBMS overview](assets/09-dbms-architecture-administration/slide-10.png)

**重点：这是本讲要能默画并标注的图。** 左侧竖箭头把图分成上下两部分：上面是内存，从左到右三组——橙色的查询处理、黄色的并发控制、蓝色的存储，底部灰色横条是崩溃恢复；下面是磁盘上的堆文件和索引文件。右下角注明：**堆文件（heap file）** 是存放在一组页上的无序记录集合。
<!-- Sources: W8-1 p.10 -->

| 组件组 | 包含 | 作用 |
| --- | --- | --- |
| 查询处理（Query Processing） | 解析器/编译器（Parser / Compiler）、优化器（Optimiser）、执行器（Executor） | 检查语法和权限、生成执行计划、执行 |
| 并发控制（Concurrency Control） | 事务管理器（Transaction Manager）、锁管理器（Lock Manager） | 管理谁在用哪些资源、谁要等待 |
| 存储（Storage） | 文件与访问方法、缓冲池（Buffer Pool）、磁盘空间管理 | 在磁盘和内存之间搬运数据 |
| 崩溃恢复（Crash Recovery） | 日志管理器（Log Manager） | 记录所有修改，支持回滚和恢复 |
<!-- Sources: W8-1 p.10-21; Apple Notes FE - Database Architecture & Administration -->

### 查询处理

![Slide 11 - Query processing components](assets/09-dbms-architecture-administration/slide-11.png)

左边橙框里的三个组件从上往下就是一条查询经过的顺序，右边文字逐个说明：

| 阶段 | 做什么 |
| --- | --- |
| 解析（parsing） | 检查语法能否“编译”、用户权限、所需资源；把文本转成内部二进制结构 |
| 优化（optimising） | 把查询改写成等价但更高效的形式；评估索引、全表扫描、哈希等方案；选出代价最低的执行计划 |
| 执行（execution） | 满足 ACID；确保数据、日志、内存、游标等资源可用，为用户完成工作 |
<!-- Sources: W8-1 p.11-12 -->

优化器生成的 **访问计划（access plan）** 包括表的连接顺序、读取记录的方法（走索引还是扫表）、使用哪些键。如果 SQL 缓存里已有该查询的访问计划，DBMS 直接复用；否则评估多种方案，选一个放进缓存。
<!-- Sources: W8-1 p.12 -->

![Slide 13 - Query processing phases](assets/09-dbms-architecture-administration/slide-13.png)

这张教材图（Coronel & Morris）把同一过程画成流水线：用户的 `SELECT` 先进入 **解析阶段**（语法、命名、权限检查，生成访问计划并存进 SQL 缓存），再进入 **执行阶段**（执行 I/O、加锁、从数据文件取数据块放进数据缓存），最后 **取回阶段** 生成结果集，红色虚线把结果送回用户。注意 SQL 缓存和数据缓存是两个不同的缓存：前者存“怎么做”，后者存“数据本身”。

### 并发控制

事务管理器处理 SQL 事务的方方面面：哪个用户或进程要哪些资源。锁管理器维护一张清单：哪些资源被谁以什么级别锁住、谁在等待。锁的对象不只是表和索引，还包括缓冲区、游标、内存地址。它就像交警：谁可以通过、谁要排队、谁可以同时通过（通常是读者）。锁的类型见 [08](08-transactions-concurrency.md#topic-3)。
<!-- Sources: W8-1 p.14-15 -->

### 存储：文件、页与缓冲池

![Slide 17 - Paging](assets/09-dbms-architecture-administration/slide-17.png)

**分页（paging）** 是操作系统的内存组织方式。右图里 Job 1 的 350 行代码被切成 4 个等大的页（Page 0–3），它们被放进主内存中不相邻的帧（frame 5、8、10、11），最后一页还有浪费的空间。操作系统把物理内存分成帧，把逻辑内存分成同样大小的页（常见 4K 或 2K），用页表把页映射到帧；程序不必整个在内存里，也不必占用连续内存。

![Slide 18 - Files, pages and frames](assets/09-dbms-architecture-administration/slide-18.png)

右图更直观：两个进程各有自己连续编号的逻辑页（黄色 0–16、绿色 0–10），但在物理帧里交错分布。左边列出访问文件的方式：

- **全表扫描（full scan）**：从第一行顺序读到最后一行，最慢；
- **部分扫描（partial scan，index range）**：先读索引取得行号再直接取行，例如对 `2 < deptno < 9` 的索引范围扫描，比全表扫描快。
<!-- Sources: W8-1 p.16-19; Apple Notes FE - Database Architecture & Administration -->

其余两个存储组件：

- **缓冲池（buffer pool）**：缓存数据库页的内存区域，存放行数据和索引数据；缓冲管理器把需要的页留在内存中，减少对二级存储的访问。同一份数据可能有多个副本，需要知道哪个是当前已提交版本；
- **磁盘空间管理**：让文件能在磁盘上增长（并设上限），以及文件组织，例如索引重组、`VARCHAR` 变长（姓从 Brown 改成 Nicholson）。

#### 缓冲区的四种状态

![Slide 20 - Buffer pool status types](assets/09-dbms-architecture-administration/slide-20.png)

右侧蓝字跟着一个例子走：把 Nancy 的部门从 8 改成 9。

| 状态 | 含义 | 例子 |
| --- | --- | --- |
| 当前（Current） | 正在使用的、当前已提交版本 | 修改前 `DepartmentID = 8` |
| 活跃（Active） | 最近的修改，可能尚未提交 | `DepartmentID = 9`；提交后它成为当前版本 |
| 陈旧（Stale） | 数据的旧版本 | 提交后的 `DepartmentID = 8` |
| 老化（Aged） | 旧的、即将从缓冲池移除 | 更早的 `DepartmentID = 8` |
<!-- Sources: W8-1 p.20; Apple Notes Double Check -->

### 日志管理器

日志管理器记录所有修改：语句；事务（语句、回滚值、前后值、事务开始、保存点 savepoint 和提交的时间戳）；数据库层面的数据字典修改。保存点是请求中标记当时数据库状态的一个点。日志表的样子见 [08](08-transactions-concurrency.md#topic-6)。
<!-- Sources: W8-1 p.21 -->

### 一条 UPDATE 的九个步骤

![Slide 22 - How a transaction works](assets/09-dbms-architecture-administration/slide-22.png)

**难点：** 图左上角是语句 `UPDATE employee SET departmentid = 9 WHERE firstname = 'Nancy' AND departmentid = 8;`，编号沿着各组件绕一圈。读图时把每个编号对到上面那张总览图的某个方框：
<!-- Sources: W8-1 p.22 -->

1. 代码被解析和优化；检查数据访问权限（查询处理）；
2. DBMS 检查表和索引数据（行）是否已在缓冲池中，在就跳到第 4 步（存储）；
3. 否则从磁盘上的表和索引读入缓冲池；
4. 事务管理器确保所需的表和索引数据都在缓冲池中，可以用于执行；
5. 锁管理器按查询要求给行和索引加锁；
6. 执行 SQL；
7. 在缓冲池中记录前值、后值和变化；日志管理器在日志文件中记下时间戳、前值、后值和变化；
8. 提交，使修改永久生效；
9. 修改后的数据和事务日志写入磁盘。
<!-- Sources: W8-1 p.22; Apple Notes Double Check -->

<a id="topic-3"></a>
## 3. 影响性能的因素

![Slide 23 - What affects database performance](assets/09-dbms-architecture-administration/slide-23.png)

左边九条是课件列出的因素，后面几页逐个展开。右下角的两段 SQL 是“好代码”的例子：同样找 `ArtefactID = 1` 的买家，左边用 `IN` 子查询，右边用 `INNER JOIN`，课件建议后者。

| 因素 | 为什么有用 |
| --- | --- |
| 把数据缓存在内存中（数据缓冲区） | 读磁盘很昂贵，目标是尽量减少读（和写）；“内存数据库”在启动时把全部代码和数据载入内存 |
| 数据文件分布在多个磁盘上；分布与复制 | 分散负载，每台服务器工作更少，响应更快（见 [10](10-distributed-databases.md)） |
| 快速可靠的存储（SSD、RAID） | 降低 I/O 时间 |
| 数据库复制和服务器集群 | 分散负载、提高可用性 |
| 用索引加速搜索和连接 | 减少磁盘 I/O |
| 选好数据类型（尤其是主键） | 节省空间，比较更快 |
| 良好的程序逻辑（避免长时间运行的 CRUD） | 减少锁持有时间 |
| 良好的执行计划 | 代价最低的计划最好（基于代价的优化 CBO） |
| 良好的代码（没有死锁） | 例如能用连接就不用 `IN` 子查询 |
<!-- Sources: W8-1 p.23-26; Apple Notes FE - Database Architecture & Administration -->

![Slide 26 - Good execution plans](assets/09-dbms-architecture-administration/slide-26.png)

比较两个红圈里的数字：左边查询按 `cust_last_name`、`cust_first_name`、`cust_city` 过滤客户，执行计划是红色的 “Full Table Scan”，代价 12136.20；右边先建索引 `CREATE INDEX cust_city_idx ON Customers(cust_city);`，同一查询变成绿色的 “Non-Unique Key Lookup”，代价降到 104.40，估计读取的行数也从五万多降到 87。
<!-- Sources: W8-1 p.26 -->

<a id="topic-4"></a>
## 4. 索引

### 索引是什么

没有索引时，找一个员工号要顺序查看每一条记录。10 万条记录、每次比较一次磁盘 I/O，平均要约 5 万次 I/O（实际上 DBMS 按块读取，一次 I/O 读入多条记录）；行数越多越慢。
<!-- Sources: W8-1 p.28-31 -->

![Slide 29 - Searching a sorted list](assets/09-dbms-architecture-administration/slide-29.png)

前一页是一张乱序的员工号表，问 502 和 91 在不在；这一页把同样的数字按顺序排好再问一次。排好序后，扫一眼就能判断 91 不在、502 在——这就是索引的基本想法。

**索引** 存两样东西：索引值（如员工号）和该记录在数据库中的位置。查找时先在索引里迅速找到员工号，取得位置，再直接取那一行。
<!-- Sources: W8-1 p.31 -->

### 插入时自动维护

![Slide 34 - Inserting into a simple index](assets/09-dbms-architecture-administration/slide-34.png)

左边是表，按插入先后排列（`RowLoc` 1、2、3 分别是员工 109、13、27）；右边是主键索引，同样三行却按 `Key` 排成 13、27、109，每个键旁边记着行位置。表有主键时，DBMS 会自动基于主键建索引；每插入一行，自动把键和行位置插入索引，并保持按键排序。

### 二分查找

![Slide 36 - Binary search: first step](assets/09-dbms-architecture-administration/slide-36.png)

![Slide 37 - Binary search: second step](assets/09-dbms-architecture-administration/slide-37.png)

![Slide 38 - Retrieve the matching row](assets/09-dbms-architecture-administration/slide-38.png)

三页连起来是找 289 号员工的全过程：

1. 第一页从索引中间的 88 开始比较，289 比它大，上半部分全部排除；
2. 第二页在剩下的部分取新的中间值 145，再排除一半；
3. 第三页找到 289，它的 `RowLoc` 是 11，于是直接取表的第 11 行（Susan Armstrong）。

这就是 **二分查找（binary search）**：每次比较排除至少一半的键。课件统计找 289 号员工只需 2 次磁盘 I/O——一次把索引读进内存，一次读第 11 行。
<!-- Sources: W8-1 p.32-42, p.46 -->

**补充：**

- 索引里存的不是“记录号”，而是磁盘上的物理地址（Oracle 中形如 `AAAYUzAAEAABIjLAAJ`）。记录号会因前面的行被删除而变化，这也是要用主键的原因之一；
- 二分查找只是方法之一，实际 DBMS 有多种更复杂的索引方式，索引常以压缩、非人类可读的格式存储。

### 多级索引

![Slide 46 - A multi-level index](assets/09-dbms-architecture-administration/slide-46.png)

很大的索引可以分段，再为各段建一个“索引的索引”。找 145 号员工：先看左下的小表，每段记下最后一个键（56、112、215、340），145 落在 112 和 215 之间，所以去第 3 段；在第 3 段里找到 145 对应 Row 6；最后取右边表的第 6 行（Lisa）。粉色高亮就是这三步。

### 索引的代价

![Slide 44 - The cost of creating indexes](assets/09-dbms-architecture-administration/slide-44.png)

为什么不给每个字段都建索引？磁盘空间是次要的；**更新时间才是主要代价**：每次插入、修改、删除记录，所有索引都要更新以保持有序，索引太多会造成不可接受的延迟。课件用选课和人口普查录入举例：每次录入都要等所有索引更新完，用户会很不满意。
<!-- Sources: W8-1 p.44 -->

一种折中：每周只跑一次的报表需要很多索引才能跑得动，就在跑报表前建索引、跑完删掉，并安排成自动任务。为报表中关键字段（`WHERE`、`HAVING` 用到的）建索引，常能把几小时的报表缩到几分钟。
<!-- Sources: W8-1 p.43, p.45 -->

### 优化器可能不用索引

DBMS 的优化器决定访问数据的最快方式。多个索引都存在时，是否使用由优化器决定。表很小时，读一两次就能把整张表装进内存，可能比先读索引再取行更快。
<!-- Sources: W8-1 p.47 -->

### 何时建索引

![Slide 48 - When to create indexes](assets/09-dbms-architecture-administration/slide-48.png)

为每张表选择要建索引的列，按页上的顺序：

- 经常被查询的列（出现在 `WHERE` 中）；
- 用于连接的列（主键到外键）；
- 主键（多数 DBMS 自动）、外键（MySQL 自动）、唯一列（多数 DBMS 自动）；
- 只为大表建：经常只取不到约 15% 的行时才值得；小表不需要；
- 取值范围广的列适合普通索引；取值范围小的列适合位图或哈希索引。
<!-- Sources: W8-1 p.48; Apple Notes FE - Database Architecture & Administration -->

## 本讲自测

1. 下列职责分别属于 DA 还是 DBA：制定全公司的数据命名标准；为 MySQL 升级打补丁；确保系统符合隐私法；每晚检查备份是否成功？
2. 一条 `SELECT` 第二次执行明显比第一次快。用缓冲池和 SQL 缓存解释两个可能的原因。
3. 订单表有 5000 万行，常按 `CustomerID` 查询，也常按 `OrderStatus`（只有 4 种取值）筛选。分别应该建什么索引？
4. 某表每秒插入上千行，开发者给 12 个列都建了索引。会出什么问题？
