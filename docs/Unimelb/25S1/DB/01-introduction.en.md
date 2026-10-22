# INFO90002 Week 1 - Introduction to Databases

Sources: `lecture/INFO90002_Week1-1_AdminIntro.pdf`, `lecture/INFO90002_Week1-2_DatabasesIntro.pdf`; `tutorial/Week1_TuteDemo_MySQLinstallation_LMS.pdf`; Apple Notes: CS/25S1/DB — "WEEK 1".

This lecture asks: **why store data in a database management system, what does a relational database look like, and which stages does a database go through from design to production?**

Learning path: [Data and its forms](#topic-1) → [Why a DBMS is needed](#topic-2) → [Client-server and MySQL](#topic-3) → [The relational model and the Pizza Online case](#topic-4) → [The four SQL sub-languages and the development lifecycle](#topic-5).

Key points: the advantages of a DBMS over flat files, and the basic rules of a relational table. Hard parts: the difference between a database and a DBMS; the two kinds of data independence. Common mistakes: mixing up the jobs of conceptual, logical and physical design.

Screenshot numbers are PDF page numbers. W1-1 is mostly subject administration, so only one teaching page is used from it; Tutorial 1 is a MySQL installation demo, summarised in the text without screenshots.

<a id="topic-1"></a>
## 1. Data, information and the forms of data

### Databases in everyday life

![W1-1 slide 05 - A day in Susan's life with databases](assets/01-introduction/slide-w11-05.png)

Read the five scenes from left to right: grocery shopping, collecting a prescription, shopping online, booking flights and hotels in the evening, and checking social media before bed. The questions under each picture ask "where is this data stored, and who updates it?", and the cylinders at the bottom are the databases behind each scene, labelled with what they hold, such as Products / Sales / Customers, Flights / Hotels, Users / Friends / Posts.

The point to take away: an ordinary person deals with several databases in one day, and each records facts with a fixed format, such as products, sales and customers.

### Data and information

![W1-2 slide 04 - Software and data](assets/01-introduction/slide-w12-04.png)

The book title on the right, *Algorithms + Data Structures = Programs*, stands for earlier subjects that care about "how to compute"; the last two lines on the left mark this subject's shift of focus to **the data itself**.

A computer system consists of software that processes data; this subject moves the focus from "how to compute" to "the data itself". Data becomes information once it is processed: an orders table is data, "which store sold the most this month" is information.
<!-- Sources: W1-2 p.4 -->

### Structured, semi-structured and unstructured

![W1-2 slide 07 - Unstructured data](assets/01-introduction/slide-w12-07.png)

![W1-2 slide 08 - Semi-structured data](assets/01-introduction/slide-w12-08.png)

![W1-2 slide 09 - Structured data](assets/01-introduction/slide-w12-09.png)

The three slides go from least to most organised:

- **Slide 7, unstructured data**: no pre-defined organisation; neither the format nor the content is known in advance. Social-media posts and email are examples, and one item may mix text, audio, video, links and images. The last line of the page is the real question: how can such data be stored so that it can be retrieved, collated and analysed?
- **Slide 8, semi-structured data**: organised enough to ease analysis, but not meeting the requirements of a relational database, e.g. XML documents and NoSQL databases.
- **Slide 9, structured data**: every record is stored in the same format with the same data types. Look at the university example in the lower half: the student ID is numeric, the name alphabetic and the date of birth a date — every student differs, but the storage format is identical.
<!-- Sources: W1-2 p.5-9; Apple Notes WEEK 1 -->

**Common mistake:** PDF page 6 labels spreadsheets "semi-structured?", with a question mark. A spreadsheet has rows and columns, but one column can freely mix numbers, text and comments with no enforced type, so it is not the same as a relational table.

A relational DBMS (RDBMS), such as Access, Oracle, SQL Server or MySQL, handles structured data; semi-structured data returns in [12 NoSQL and JSON](12-nosql-json.en.md).

<a id="topic-2"></a>
## 2. Why a DBMS is needed

### Problems with flat files

![W1-2 slide 10 - File processing with COBOL](assets/01-introduction/slide-w12-10.png)

The top left shows the `DATA DIVISION` of a COBOL program: the program itself spells out which fields each `StudentFile` record has and how long each field is (`PIC 9(7)` means seven digits). That is how the flat-file era worked: the data structure is hard-coded into the program.

The problems listed in the lower half all follow from this:

- every program has to code its own data-access routines in detail, including the full data structure;
- multiple users cannot access the data at the same time;
- the same data exists in several copies that nobody manages centrally;
- there is little security.
<!-- Sources: W1-2 p.10; Apple Notes WEEK 1 -->

The key to understanding is the first point: add one field to the file and every program that reads it must change. That is the first thing a DBMS sets out to fix.

### What a DBMS provides

![W1-2 slide 11 - Why use a DBMS part 1](assets/01-introduction/slide-w12-11.png)

![W1-2 slide 12 - Why use a DBMS part 2](assets/01-introduction/slide-w12-12.png)

**Key: the database is the data itself; the DBMS (DataBase Management System) is the software that manages it. They are not the same thing.**

Slide 11 covers the first three items: data independence, efficient access, integrity and security; slide 12 adds uniform administration, concurrent access and crash recovery, and splits data independence into two kinds. Remember them against the flat-file problems on the previous slide:

| Flat-file problem | Matching DBMS capability |
| --- | --- |
| Every program hard-codes the data structure | Data independence: applications are not exposed to how data is represented and stored; the DBMS offers an abstract view |
| Each program writes its own access routines, with uneven efficiency | Efficient access: more efficient storage and retrieval than flat files |
| Little security | Data integrity and security: the DBMS itself enforces integrity constraints and access control, rather than relying only on the operating system |
| Several copies, no central management | Uniform data administration: specialists manage the data, reducing risk to the data |
| Multiple users cannot access at once | Concurrent access and crash recovery: schedules simultaneous access and protects data from system failures |
<!-- Sources: W1-2 p.11-12; Apple Notes WEEK 1 -->

**Hard: two kinds of data independence.** Look at Data Independence in the middle of slide 12:

- Logical data independence: the logical schema can change (e.g. add or delete an attribute, entity or relationship) without rewriting application programs;
- Physical data independence: storage can change (e.g. cloud storage instead of a local disk, a new compression technique) without affecting applications.
<!-- Sources: W1-2 p.12 -->

Illustrative example (own): a university moves its results database from a server-room disk to the cloud and the enrolment website needs no code change — physical data independence; it adds an "emergency contact" column to the student table and the results program, which uses only the old columns, needs no change either — logical data independence.

<a id="topic-3"></a>
## 3. Client-server and MySQL

### Database servers

![W1-2 slide 15 - RDBMS and database servers](assets/01-introduction/slide-w12-15.png)

A database server is a networked computer that stores the databases; users on the network read and write data through it. Note the sentence in the middle of slide 15: there is only **one copy** of the data (apart from backups). Because there is only one copy and many people change it at once, the DBMS has to schedule concurrent access, e.g. many people checking the price of the same product, enrolling in the same subject, or booking the same flight. The details of concurrency control are in [08 Transactions and concurrency control](08-transactions-concurrency.en.md).

### The client-server structure

![W1-2 slide 16 - Client server in industry](assets/01-introduction/slide-w12-16.png)

Read the figure as two layers: at the top is the server, holding the DBMS and the application/web server; at the bottom are clients, which may be a database client, a DBMS admin tool or a browser. All three kinds of client reach the same single copy of the data on the server over the network.
<!-- Sources: W1-2 p.15-16; Apple Notes WEEK 1 -->

Note the browser column: ordinary users do not connect to the DBMS directly; they connect to the application/web server, which in turn accesses the database. That path is developed in [14 Web applications](14-web-applications.en.md).

### The MySQL setup used in this subject

![W1-2 slide 17 - MySQL server and Workbench in teaching](assets/01-introduction/slide-w12-17.png)

The subject uses MySQL: MySQL Server is the RDBMS, and MySQL Workbench is a graphical client that connects to it. You can connect to the university server (with a VPN off campus) or install both server and Workbench on your own machine (`127.0.0.1`).
<!-- Sources: W1-2 p.17; W1-1 p.19; Tut W1 p.3 -->

Reading the figure: the grey box on the left is the university server, and Workbench on a lab computer or your laptop connects to it through the VPN; the whole box on the right is "your PC", with server and client on the same machine, hence the local address. W1-1 page 19 adds that the Assignment 2 SQL must run on the university server, so even if you practise locally, try it on the university server as well.

Installation points from Tutorial 1:

- download MySQL Community Server and MySQL Workbench; no account sign-up is needed;
- untick safe mode in Workbench under Preferences → SQL Editor;
- if you cannot connect to the university server, check that the username is your unimelb username in lowercase and that you are on the campus network or VPN, then retype the connection details.

<details markdown="1"><summary>Extension (optional): what Workbench's safe mode blocks</summary>

Workbench's safe updates mode rejects `UPDATE` and `DELETE` statements whose `WHERE` does not restrict a key column, to stop one statement from changing a whole table by mistake. Course exercises often need such statements, so the tutorial has you turn it off; once it is off, check the `WHERE` condition all the more carefully before running an `UPDATE` or `DELETE` (see [06](06-sql-joins-and-changes.en.md)).

</details>

<a id="topic-4"></a>
## 4. The relational model and the Pizza Online case

### Rules of a relational table

![W1-2 slide 20 - Relational table: attributes, rows and cells](assets/01-introduction/slide-w12-20.png)

The relational data model, proposed by Ted Codd in 1970, represents data as two-dimensional tables. Follow the blue annotations around the figure:

- each column is an attribute, and column names are unique;
- each row is a tuple; rows are unnamed and unnumbered, and **their order is irrelevant**;
- each cell holds **only one value**;
- each row is identified by a unique primary key, with no duplicates (e.g. a student ID).
<!-- Sources: W1-2 p.19-23; Apple Notes WEEK 1 -->

Slide 21 gives the mathematical name: a table is a **relation**, which is why this is called the relational model.

### What an RDBMS does

![W1-2 slide 23 - Setting up an RDBMS: keys and constraints](assets/01-introduction/slide-w12-23.png)

A relational database is a set of related tables, for example Student, Subject and Enrolment. An RDBMS lets users perform CRUD on table data: Create, Read (Retrieve), Update, Delete. Constraints based on business rules can also be added, e.g. "student type must be PG or UG".
<!-- Sources: W1-2 p.21-23 -->

The three constraints in the lower half of slide 23 check a format (student ID length), a range of values (PG or UG), and a fact across tables (the subject is actually offered this semester). Once constraints are written into the database, the DBMS enforces them in one place instead of every program checking separately — this is what the "integrity" of the previous section looks like in practice.

### Why split the table

![W1-2 slide 28 - Pizza Online completed order](assets/01-introduction/slide-w12-28.png)

Start with the business: one order belongs to one customer (C2045), has a date and time and delivery instructions, contains several items each with a quantity, and ends with a total.

![W1-2 slide 29 - Pizza Online data in one big table](assets/01-introduction/slide-w12-29.png)

Now see what happens when this order goes straight into one big table: order 3224 bought three pizzas, so its date, time, delivery instructions and total are written three times; and no column in the lower table points to a customer, so you cannot tell whose order it is. The two Problems at the bottom of the page are exactly these.

![W1-2 slide 30 - Pizza Online split into related tables](assets/01-introduction/slide-w12-30.png)

After splitting there are four tables: customers, orders, order lines and pizzas. Follow the three arrows: Customer ID in the customer table points to Customer ID in the order table; Order No in the order table points to the order lines; Code in the pizza table points to Line Item in the order lines. Each fact is written once, and the tables are linked by IDs.

Going from one big table to four solves exactly the two problems of "repetition" and "no link". [04 Normalisation](04-normalisation.en.md) turns this intuition into a procedure.
<!-- Sources: W1-2 p.24-30 -->

An order-line row (Order No, Line Item, Quantity) only describes "how many of one item in one order"; the quantity belongs neither to the order nor to the pizza, so it gets its own table. This structure is the associative entity that resolves many-to-many in [02](02-conceptual-er-modelling.en.md#topic-5).

**Note:** slide 28 dates the order 1 September 2020, while the tables on slides 29–30 say 1/09/2021; the slides are inconsistent, which does not affect the idea. The Tutorial 1 exercise uses the same case: looking at the order confirmation page, think about which tables are needed and which columns each table holds.

<a id="topic-5"></a>
## 5. The four SQL sub-languages and the database development lifecycle

### Operating on table structure versus table contents

![W1-2 slide 33 - Lifecycle steps and SQL sub-languages](assets/01-introduction/slide-w12-33.png)

The four steps on the left follow a database through its life: design it first (draw the ER diagram), build it with DDL, store and fetch data with DML, and finally manage permissions with DCL; the blue words on the right are each sub-language's keywords.

- DDL (Data Definition Language) changes **table structure**: `CREATE`, `DROP`, `ALTER`, `RENAME`;
- DML (Data Manipulation Language) changes **table contents**: `SELECT`, `INSERT`, `UPDATE`, `DELETE`;
- DCL (Data Control Language) manages **permissions**: `GRANT`, `REVOKE`.
<!-- Sources: W1-2 p.31-33; W5-1 p.5; Apple Notes WEEK 1 -->

**Common mistake:** `DROP` removes the whole table (structure and all), while `DELETE` only removes rows and the table remains. Slide 31 says "DROP (i.e. delete) a table"; that "delete" is everyday English, not the SQL `DELETE`.

The syntax starts in [05 SQL query basics](05-sql-select-basics.en.md).

### The database development lifecycle

![W1-2 slide 35 - Database development lifecycle: planning](assets/01-introduction/slide-w12-35.png)

Follow the arrows from planning at the top left through implementation, data conversion and testing at the bottom right, and back to operational maintenance. The subject concentrates on the **Database Design** box in the middle. Slides 35–45 each highlight one box in red and explain that step on the right; only the first is shown here, and the non-design stages are summarised in the table:

| Stage | What happens | Covered in this subject? |
| --- | --- | --- |
| Database planning | Decide how the project will run and how the enterprise works | No |
| Systems definition | Set scope, users, major user views and application areas | Barely |
| Requirements collection and analysis | Gather and analyse the new system's requirements | Given in case studies |
| Application design | Design the interface and programs that use the database | Briefly in [14 Web applications](14-web-applications.en.md) |
| Implementation | Build the design as a working database | The SQL part |
| Data conversion and loading | Move data in from old systems; not a trivial task | Concepts in [11 Data warehousing](11-data-warehousing.en.md) |
| Testing | Run the database to find errors in the design or setup, also checking performance, robustness, recoverability and security | Barely |
| Operational maintenance | Monitor and tune after commissioning, handle changing requirements | Partly in [09](09-dbms-architecture-administration.en.md) |
<!-- Sources: W1-2 p.33-46; Apple Notes WEEK 1 -->

### Three levels of design

![W1-2 slide 38 - Conceptual design](assets/01-introduction/slide-w12-38.png)

**Conceptual design**: a high-level, first-pass model concerned only with which entities exist and how they connect. The points on the right say it usually omits most attributes and need not even target a relational database, so it may contain many-to-many relationships, repeating groups and composite attributes. The whole of the next lecture, [02 Conceptual modelling](02-conceptual-er-modelling.en.md), is this step.

![W1-2 slide 39 - Logical design](assets/01-introduction/slide-w12-39.png)

**Logical design**: builds on the conceptual design and commits to a relational database, so columns and keys are written out; it is still independent of a specific vendor (MySQL or Oracle) and other physical factors.

![W1-2 slide 40 - Physical design](assets/01-introduction/slide-w12-40.png)

**Physical design**: implements the design for a specific DBMS; the right side lists what must be decided: base tables, data types, indexes, integrity constraints, file organisation, security measures.

**Common mistake:** many-to-many relationships are allowed in conceptual design but must be resolved in logical design; adding data types belongs to physical design, not logical design. The concrete conversions are in [02 Conceptual modelling](02-conceptual-er-modelling.en.md) and [03 Logical and physical design](03-logical-physical-design.en.md).

<details markdown="1"><summary>Note: subject organisation (2025 S1)</summary>

The subject has four parts: modelling, SQL, normalisation, and advanced database concepts. Assessment includes a group data-modelling assignment, an individual SQL assignment, two quizzes in Weeks 6 and 12, and a final exam; check Canvas for exact weights and hurdles. The subject recommends plenty of practice with data modelling and SQL.
<!-- Sources: W1-1 p.6, p.9-10 -->

</details>

## Self-check

1. A small shop keeps customers, orders and stock in three Excel files, and two staff often edit the orders file at once. Using this lecture's DBMS advantages, name at least three things that would improve.
2. A company moves its database from a local disk to cloud storage and the application needs no change. Which kind of data independence is this? Adding a column to the customer table without changing the program — which kind is that?
3. Someone wants to store a customer's two phone numbers in the same cell. By the rules of a relational table, what is wrong with this, and how should it be changed?
4. Choosing `DECIMAL(5,2)` for `Price` belongs to which lifecycle stage? Deciding that Order and Pizza are many-to-many?
