# INFO90002 Database Systems & Information Modelling

学期：**25S1**。[Canvas 课程页](https://canvas.lms.unimelb.edu.au/courses/211571)。

这套笔记面向第一次系统学习数据库的读者。每篇先说明这一讲要回答的问题，再按讲义顺序展开：**选用的讲义页是主要参照**，每张截图旁边说明要看哪里、它说明了什么；SQL 例子都在课程自带的百货商店练习库上写成并核对过结果。**重点／难点／易错** 标出学习时需要多花注意力的地方，不代表对考试范围的预测；自拟例子和课外补充单独标明，可选内容折叠起来。每篇末尾用几道应用题自测。

## 按知识模块学习

| 模块 | 学习顺序 | 要建立的能力 |
| --- | --- | --- |
| 数据库是什么 | [01 数据库导论](01-introduction.md) | 分清数据与 DBMS、关系表的规则和开发生命周期 |
| 怎样设计数据库 | [02 概念建模（ER）](02-conceptual-er-modelling.md) → [03 逻辑与物理设计](03-logical-physical-design.md) → [04 规范化](04-normalisation.md) | 从业务描述画出 ERD，转换成带键和数据类型的表，并用函数依赖检查冗余 |
| 怎样用 SQL 读写数据 | [05 建表与 SELECT 基础](05-sql-select-basics.md) → [06 连接与修改数据](06-sql-joins-and-changes.md) → [07 子查询与视图](07-sql-subqueries-views.md) | 按“地图—模板—填空”写出连接、分组、外连接、子查询和“对所有”查询 |
| DBMS 怎样保证正确与高效 | [08 事务与并发](08-transactions-concurrency.md) → [09 体系结构、管理与索引](09-dbms-architecture-administration.md) | 写事务，理解锁、隔离级别、日志、缓冲池与索引 |
| 超越单机关系数据库 | [10 分布式数据库](10-distributed-databases.md) → [11 数据仓库](11-data-warehousing.md) → [12 NoSQL 与 JSON](12-nosql-json.md) | 比较复制与分区、OLTP 与 OLAP、ACID 与 BASE，设计星型模式 |
| 怎样安全地对外提供数据 | [13 安全与备份](13-security-backups.md) → [14 Web 应用](14-web-applications.md) | 选择访问控制和备份方案，防 SQL 注入，理解多层架构 |

跟课时按文件编号 01–14 阅读（编号顺序就是讲义顺序：第 6、12 周课堂时间用于测验，没有讲义）；复习时按上表的模块阅读。跨讲重复的概念只在主要章节详细解释，其他地方用链接回去（例如视图在 07，用视图做权限控制在 13；事务日志在 08，用日志做增量恢复在 13）。

## Tutorial 对应位置

教程周次比对应讲义晚一周或更多；下表按教程的实际内容连接笔记。

| 练习 | 笔记中的主要连接 |
| --- | --- |
| Week 1 安装 MySQL Server 与 Workbench | [01](01-introduction.md#topic-3)：客户端—服务器与 MySQL |
| Week 2 用 MySQL Workbench 建模 | [02](02-conceptual-er-modelling.md#topic-4)：实心/虚线关系线、强弱实体 |
| Week 3 逻辑与物理建模（电影院案例） | [03](03-logical-physical-design.md#topic-3)：完整的电影院案例，依据已补回的教程答案 |
| Week 4 规范化 | [04](04-normalisation.md)：异常、函数依赖、逐步到 3NF |
| Week 5 SQL 入门 | [05](05-sql-select-basics.md)：过滤、排序、`LIMIT`、聚合与 `GROUP BY` |
| Week 6 SQL 进阶 | [05](05-sql-select-basics.md#topic-5)、[06](06-sql-joins-and-changes.md#topic-1)、[07](07-sql-subqueries-views.md#topic-1)：`NATURAL` 与 `INNER JOIN`、`UNION`、子查询、`HAVING` |
| Week 7 SQL 例题与函数 | [06](06-sql-joins-and-changes.md#topic-1)、[06](06-sql-joins-and-changes.md#topic-2)、[07](07-sql-subqueries-views.md#topic-1)：多表连接、自连接、日期与字符串函数 |
| Week 8 外连接、一元连接、视图、关系除法 | [06](06-sql-joins-and-changes.md#topic-2)：外连接与自连接；[07](07-sql-subqueries-views.md#topic-3)、[07](07-sql-subqueries-views.md#topic-4)：关系除法与视图 |
| Week 9 DDL 与参照完整性 | [03](03-logical-physical-design.md#topic-2)、[06](06-sql-joins-and-changes.md#topic-4) |
| Week 10 数据仓库 | [11](11-data-warehousing.md#topic-4)：粒度与 Kimball 四步 |
| Week 11 NoSQLBooster 与 MongoDB | [12](12-nosql-json.md#topic-4) |
| Week 12 复习题 | [04](04-normalisation.md)、[08](08-transactions-concurrency.md)、[11](11-data-warehousing.md)：只吸收概念，用自己的话改写 |

SQL 练习库由 `tutorial/labs2018engv6.sql`（学校服务器）或 `tutorial/labs2018byodv6.sql`（自己电脑，会先建 `labs2018` 模式）建立；Week 9 另用 `tutorial/scott.sql` / `scott_byod.sql`。笔记中的查询结果是在本地用同一份数据核对过的；本次整理没有重新部署学校的 MySQL 服务器。

## 资源与来源

- [资源完整性](RESOURCE-STATUS.md)：2026-10-22 按周核对的本地资料、仍需区分的项目和校验结果。
- [资源清单与校验值](materials.json)：每个文件的稳定来源 URL、SHA-256、大小、PDF 页数和首页摘录。

资源于 **2026 年 10 月 21 日** 从 Canvas 恢复。讲义覆盖导论、ER 建模、键与逻辑/物理设计、数据类型、规范化、SQL、事务与并发、管理与体系结构、分布式数据库、数据仓库、JSON/NoSQL、安全和 Web 应用；教程覆盖 Week 1–12。首次恢复时 Week 3 教程答案下载超时；**2026-10-22** 经 Canvas 的 “Alternative formats → Download original” 补回，清单现为 48 个文件，缺口已消除。原始文件名保留不变；Downloads 中的原件已复制并保留。

每篇开头列出所用的 PDF、教程和 Apple Note。**讲义截图编号均指 PDF 页码**，未必等于页脚印刷编号；一篇笔记用到多个 PDF 时，截图名带短名前缀（如 `slide-w31-25.png` 来自 Week 3-1 讲义，`slide-t03s-09.png` 来自 Week 3 教程答案），图片说明文字也以同样的短名开头。正文中的 `<!-- Sources: … -->` 注释使用简写：`W5-2 p.17` 指 `INFO90002_Week5-2_SQL2.pdf` 的 PDF 第 17 页；`Tut W8 Sol p.3` 指 Week 8 教程答案第 3 页；`Apple Notes FE - ER Model` 指同名 Apple Note。

文件名与内容周次不一致的地方（以 Canvas 页面位置和文件内容为准）：

- `INFO90002_Week5-1_SQL1.pdf` 封面写 “Week 4 - SQL”，`Week5-2`、`Week5-3` 封面写 “Week 5 - SQL”；三份按 SQL Part 1–3 归入 05–07，标题统一记为 Week 5；
- `INFO90002_Week3-2_ToyLibraryExplanation.pdf` 封面写 “Week 2 – Data modelling”，内容是第 2 周 ER 建模的补充，归入 02；
- `INFO90002_Week8-2_DistributedDBs.pdf` 封面写 “Week 8-9”，标题记为 Weeks 8–9；
- 第 6 讲和第 12 讲不是缺失的讲义：模块页说明这两次课堂时间用于测验。

整理时发现的源文件笔误已在对应笔记中就地标出，汇总见 [资源完整性](RESOURCE-STATUS.md)。

**Apple Notes 导入记录。** 2026-10-22 导入 Apple Notes 文件夹 CS/25S1/DB 中的 12 篇学生笔记，作为次要来源，用来决定讲解重点、保留学生自己的例子：“WEEK 1”“WEEK 4 - Data Types”，以及期末复习笔记 “FE - ER Model”“FE - Logical & Physical Design & SQL DDL”“FE - Normalisation”“FE - Transactions and Concurrency”“FE - Database Architecture & Administration”“FE - Distributed DBs”“FE - Data Warehouse”“FE - JSON NoSQL”“FE - DB Security”“FE - Web Apps”。笔记中的图片都是讲义截图，正文改用从 PDF 重新渲染的页面。有意未导入：“Double Check”（测验题截图）、“SAMPLE EXAM A”（样卷作答）、“EXAM NOTICE”（考试结构与题目）——它们只用于判断哪些概念需要强调，相关概念已用自己的话并入对应专题，题目本身和考试结构不在本仓库公开。SQL 部分（Week 5 的三份讲义与 Week 5–9 教程）没有学生笔记，05–07 直接依据讲义和教程写成。

| 本地目录 | 内容 |
| --- | --- |
| `lecture/` | 22 个文件：17 份讲义 PDF、课堂练习 `Week4-1_Exercise_SubjectEnrol.pdf`、三张课堂答案照片、`lecture_queries.sql` |
| `tutorial/` | 26 个文件：Week 1–12 教程与 10 份答案、练习库脚本 `labs2018*.sql` 与 `scott*.sql` |
| `assets/<笔记名>/` | 选用讲义页的 PNG 截图，从 PDF 以 110 dpi 重新渲染 |

| 笔记 | 讲义（`lecture/`） |
| --- | --- |
| 01 | `INFO90002_Week1-1_AdminIntro.pdf`、`INFO90002_Week1-2_DatabasesIntro.pdf` |
| 02 | `INFO90002_Week2-1_DataModelIntro.pdf`、`INFO90002_Week3-2_ToyLibraryExplanation.pdf`、三张课堂答案照片 `*.jpg` |
| 03 | `INFO90002_Week3-1_Keys_Logical&Physical.pdf`、`INFO90002_Week4-1_Physical&DataTypes.pdf`、`Week4-1_Exercise_SubjectEnrol.pdf` |
| 04 | `INFO90002_Week4-2_Normalisation.pdf` |
| 05 | `INFO90002_Week5-1_SQL1.pdf`、`lecture_queries.sql` |
| 06 | `INFO90002_Week5-2_SQL2.pdf` |
| 07 | `INFO90002_Week5-3_SQL3.pdf` |
| 08 | `INFO90002_Week7-1_Transactions.pdf` |
| 09 | `INFO90002_Week8-1_DBA.pdf` |
| 10 | `INFO90002_Week8-2_DistributedDBs.pdf` |
| 11 | `INFO90002_Week9-1_DW.pdf` |
| 12 | `INFO90002_Week10-1_JSON_NoSQL.pdf` |
| 13 | `INFO90002_Week10-2_DbSecurity.pdf` |
| 14 | `INFO90002_Week11-1_WebApps.pdf` |

原始资料和截图被 Git 忽略，只保留在本地，不提交到版本库。
