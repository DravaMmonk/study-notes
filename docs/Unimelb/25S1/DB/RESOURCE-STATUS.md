# INFO90002 资源完整性

核对日期：**2026-10-22**。资源于 2026-10-21 从 Canvas 恢复，Week 3 教程答案于 2026-10-22 补回；本页按周列出本地保存了什么，并记录仍需区分的项目。本地没有录播或字幕，笔记依据讲义、教程和学生的 Apple Notes。

| 周次 | 讲义 PDF | 教程 | 教程答案 | Apple Notes | 对应笔记 |
| --- | --- | --- | --- | --- | --- |
| 1 | 2 份（课程安排 + 数据库导论） | 安装演示 | 不适用（操作演示） | “WEEK 1” | [01](01-introduction.md) |
| 2 | 1 份 + 3 张课堂答案照片 | Workbench 建模 | 不适用（操作指引） | “FE - ER Model” | [02](02-conceptual-er-modelling.md) |
| 3 | 2 份（键与逻辑/物理设计；Toy Library 补充） | 逻辑与物理建模 | 已有（2026-10-22 补回） | “FE - Logical & Physical Design & SQL DDL” | [02](02-conceptual-er-modelling.md)、[03](03-logical-physical-design.md) |
| 4 | 2 份（数据类型；规范化）+ 1 份课堂练习 | 规范化 | 已有 | “WEEK 4 - Data Types”“FE - Normalisation” | [03](03-logical-physical-design.md)、[04](04-normalisation.md) |
| 5 | 3 份（SQL Part 1–3）+ `lecture_queries.sql` | SQL 入门 | 已有 | 无 | [05](05-sql-select-basics.md)–[07](07-sql-subqueries-views.md) |
| 6 | 无（课堂时间为测验） | SQL 进阶 | 已有 | 无 | [05](05-sql-select-basics.md)–[07](07-sql-subqueries-views.md) |
| 7 | 1 份（事务） | SQL 例题与函数 | 已有 | “FE - Transactions and Concurrency” | [08](08-transactions-concurrency.md) |
| 8 | 2 份（DBA；分布式） | 外连接、视图、关系除法 | 已有 | “FE - Database Architecture & Administration”“FE - Distributed DBs” | [09](09-dbms-architecture-administration.md)、[10](10-distributed-databases.md) |
| 9 | 1 份（数据仓库） | DDL 与参照完整性（含 `scott` 脚本） | 已有 | “FE - Data Warehouse” | [11](11-data-warehousing.md) |
| 10 | 2 份（NoSQL；安全） | 数据仓库 | 已有 | “FE - JSON NoSQL”“FE - DB Security” | [12](12-nosql-json.md)、[13](13-security-backups.md) |
| 11 | 1 份（Web 应用） | NoSQLBooster 与 MongoDB | 已有 | “FE - Web Apps” | [14](14-web-applications.md) |
| 12 | 无（课堂时间为测验） | 复习题 | 已有 | 无 | 概念并入 [04](04-normalisation.md)、[08](08-transactions-concurrency.md)、[11](11-data-warehousing.md) |

本地共 **48 个资源文件**：`lecture/` 22 个（17 份讲义 PDF、1 份课堂练习 PDF、3 张答案照片、`lecture_queries.sql`），`tutorial/` 26 个（Week 1–12 教程与 10 份答案 PDF，以及 `labs2018engv6.sql`、`labs2018byodv6.sql`、`scott.sql`、`scott_byod.sql`）。14 篇笔记共选用 300 张讲义页截图，每张旁附说明。

## 尚未完整或需要区分的项目

- **Week 3 教程答案已补回。** 首次恢复时下载超时；2026-10-22 经 Canvas 的 “Alternative formats → Download original” 取得 `tutorial/Week3_Tute_Logical and Physical Modelling SOLUTIONS.pdf`（9 页），来源 URL 与校验值已写入 `materials.json`，并已用于 [03](03-logical-physical-design.md) 的电影院案例。
- **Week 6、Week 12 没有讲义**：模块页说明这两次课堂时间用于测验，不是缺失文件。
- **Week 1、Week 2 教程没有单独答案**：前者是安装演示，后者是 Workbench 操作指引，本身就是带步骤的说明。
- **文件名周次与内容不一致**：`INFO90002_Week5-1_SQL1.pdf` 封面写 “Week 4 - SQL”；`INFO90002_Week3-2_ToyLibraryExplanation.pdf` 封面写 “Week 2 – Data modelling”；`INFO90002_Week8-2_DistributedDBs.pdf` 封面写 “Week 8-9”。笔记按 Canvas 页面位置和内容归档，原文件名不改。
- **教程比讲义晚**：数据仓库讲义在 Week 9、教程在 Week 10；NoSQL 讲义在 Week 10、教程在 Week 11；SQL 讲义集中在 Week 5，教程分布在 Week 5–9。
- **有意未导入的 Apple Notes**：“Double Check”（测验截图）、“SAMPLE EXAM A”（样卷作答）、“EXAM NOTICE”（考试结构与题目）。它们只用于判断讲解重点，题目本身不在公开仓库中出现。
- **源文件中的笔误**（均已在对应笔记中就地标出）：
  - `INFO90002_Week1-2_DatabasesIntro.pdf` 第 28 页订单日期写 2020 年，第 29–30 页表格写 2021 年（[01](01-introduction.md)）；
  - `INFO90002_Week3-2_ToyLibraryExplanation.pdf` 第 7 页表格错位，`ToyNo` 的值挤到了 `DateBorrowed` 一栏（[02](02-conceptual-er-modelling.md)）；
  - `INFO90002_Week3-1_Keys_Logical&Physical.pdf` 中比萨编号在逻辑设计、实现和第 27 页三处的列名与长度不一致（[03](03-logical-physical-design.md)）；
  - Week 3 教程答案第 8 页把 1:M 外键说成放在“一”侧，与同一答案第 6 页及示例矛盾；逻辑设计写 `DateOfLastScreening`，图中写 `DateOfScreening`（[03](03-logical-physical-design.md)）；
  - `INFO90002_Week5-1_SQL1.pdf` 第 19 页说 `COUNT()` 会数到 `NULL`，这只对 `COUNT(*)` 成立；第 28、30 页用 `CustomerFirstName`，而第 9 页建表的列名是 `CustFirstName`（[05](05-sql-select-basics.md)）；
  - `INFO90002_Week5-2_SQL2.pdf` 第 15 页起的维恩图把 Brier Patch 画在上司圆外，与结果表矛盾；第 22 页标题写 “INNER JOIN”，查询实际是 `LEFT OUTER JOIN`（[06](06-sql-joins-and-changes.md)）；
  - `INFO90002_Week5-3_SQL3.pdf` 第 13 页的 `EXISTS` 结果截图中买家 2 的姓名和电话与第 7、8 页数据不同，来自另一份样例数据（[07](07-sql-subqueries-views.md)）。
- **本地 SQL 核对环境**：05–07 的查询结果是在 `labs2018` 数据的本地副本上核对的；课程原环境是 MySQL，本地没有重新部署学校服务器。

## 同步与验证

- `materials.json` 列出的 48 个文件，用 `shasum -a 256 -c` 逐个核对 SHA-256，全部一致；文件大小也与记录相符；`lecture/`、`tutorial/` 中没有清单之外的文件。
- 40 份 PDF 均可由 `pdfinfo` 读取，页数与清单记录一致；所有选用页都用 `pdftoppm -r 110` 从 PDF 重新渲染并目视检查。
- 讲义截图编号均为 PDF 页码，不一定等于页脚印刷编号。

## 来源与存放位置

- [Canvas 课程页](https://canvas.lms.unimelb.edu.au/courses/211571)
- [课程笔记索引](README.md)
- [资源清单与校验值](materials.json)

`lecture/`、`tutorial/` 保存原始资料，`assets/<笔记名>/` 保存选用的讲义页截图；它们都被 Git 忽略，只存在于本地。Downloads 中的原件已复制并保留。
