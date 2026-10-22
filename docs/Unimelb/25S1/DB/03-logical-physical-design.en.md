# INFO90002 Weeks 3–4 - Logical Design, Physical Design and Data Types

Sources: `lecture/INFO90002_Week3-1_Keys_Logical&Physical.pdf`, `lecture/INFO90002_Week4-1_Physical&DataTypes.pdf`, `lecture/Week4-1_Exercise_SubjectEnrol.pdf`, `lecture/lecture_queries.sql`; `tutorial/Week3_Tute_Logical and Physical Modelling.pdf`, `tutorial/Week3_Tute_Logical and Physical Modelling SOLUTIONS.pdf`, `tutorial/Week9Tute_SQL_DDL_Solutions.pdf`; Apple Notes: CS/25S1/DB — "FE - Logical & Physical Design & SQL DDL", "WEEK 4 - Data Types".

This lecture asks: **once the conceptual ERD is drawn, how does it become, step by step, relations with keys, a physical design with data types, and finally `CREATE TABLE` statements that can be run?**

Learning path: [The relational model and the design chain](#topic-1) → [Keys and integrity constraints](#topic-2) → [Mapping binary relationships and weak entities](#topic-3) → [Unary and ternary relationships](#topic-4) → [MySQL data types](#topic-5).

Key points: the hierarchy of superkey, candidate key and primary key; the mapping rules for 1:M, M:N, 1:1 and weak entities; foreign keys and referential integrity. Hard parts: which side gets the foreign key in a 1:1; a unary many-to-many needs two differently named foreign keys; the primary key of a ternary relationship. Common mistakes: writing data types during logical design; writing `(M)` on integer types; confusing the time-zone behaviour of `TIMESTAMP` and `DATETIME`.

Image note: `w31`, `w41`, `w41ex` and `t03s` in the file names mean the W3-1 lecture, the W4-1 lecture, the W4-1 class exercise and the Week 3 tutorial solutions; the number is the PDF page.

<a id="topic-1"></a>
## 1. The relational model and the design chain

### Relation, attribute and tuple: three sets of names for the same thing

![W3-1 slide 04 - Terminology and the Customer and Order tables](assets/03-logical-physical-design/slide-w31-04.png)

First look at the comparison table in the top half: the relational model's relation, attribute and tuple (or row) are called table, field and record in MS Access, and table, column and row in MySQL and Oracle. The three columns say the same thing; only the names differ between systems.

Then look at the bottom half: each value in the Customer ID column of the `Order` table has a blue arrow pointing to a row of the `Customer` table. This "use a value to refer to a row of another table" is the foreign key of Section 2 of this lecture.
<!-- Sources: W3-1 p.4 -->

![W3-1 slide 05 - Relational database definitions](assets/03-logical-physical-design/slide-w31-05.png)

A relational database is a set of relations. A relation has two parts:

- **Schema**: the relation's name plus the name and type of each column. The `Pizza(pID: string, pizzaName: string, price: decimal)` in the middle of the slide is a text notation that needs no diagram;
- **Instance**: a concrete table at one moment. The number of rows is its **cardinality**, the number of columns its **degree / arity**. The Pizza instance on the next page has 8 rows and 3 columns, so its cardinality is 8 and its degree is 3.

The two lines at the bottom of the page say that a relation is a **set** of rows: all rows are distinct and there is no order among them. So "the first row of the table" has no meaning in the relational model; when you need an order, write `ORDER BY` in the query.
<!-- Sources: W3-1 p.5-6; Apple Notes FE - Logical & Physical Design & SQL DDL -->

**Common mistake:** "cardinality" here means the number of rows of a table, a different use from the "cardinality" of an ER relationship (minimum/maximum participation); tell them apart from context.

### Five steps from concept to instance

![W3-1 slide 10 - The entire cycle for Customer](assets/03-logical-physical-design/slide-w31-10.png)

Read it by the numbers on the slide; the same `Customer` goes through all five steps:

1. **Conceptual design**: the entity `Customer` in the ERD;
2. **Logical design**: the entity set becomes the relation `Customer(customerID, Surname, FirstName, Email)`, with the primary key underlined; this step **decides the keys**;
3. **Physical design**: each attribute gets a **data type**, for example `customerID CHAR(11)`, `Surname VARCHAR(35)`;
4. **Implementation**: written as the `CREATE TABLE` statement at the top right, where the blue `PRIMARY KEY (customerID)` turns the underline into a constraint;
5. **Instance**: the table after inserting data, the three customers at the bottom right.
<!-- Sources: W3-1 p.10 -->

The one-line summary from Apple Notes: **logical design decides the keys; physical design decides the data types.** The two pages before (slides 7–8) demonstrate the same process with `Building(bCode, bName)` and explain that both logical and physical designs can be drawn as MySQL Workbench table boxes; the physical diagram only adds the type next to each column name.
<!-- Sources: W3-1 p.7-10; Apple Notes FE - Logical & Physical Design & SQL DDL -->

### What else physical design decides

![W4-1 slide 02 - Inputs and decisions of physical design](assets/03-logical-physical-design/slide-w41-02.png)

The left box holds the **inputs** to physical design: the normalised relations (see [04](04-normalisation.en.md)), attribute definitions, response-time requirements, data security, backup and recovery, integrity requirements, and the DBMS being used. The yellow arrow points to the **decisions** in the right box: the attribute data types in red and the physical record descriptions (which need not match the logical design one to one), plus file organisation, indexes and database architecture, and query optimisation.

The bottom of the page explains the **physical record**: a group of fields stored in adjacent storage locations and read as one unit. Its design affects read speed and the disk space needed. This lecture mainly practises "choosing data types" (see [Section 5](#topic-5)); indexes are developed in [09](09-dbms-architecture-administration.en.md#topic-4).
<!-- Sources: W4-1 p.2 -->

<a id="topic-2"></a>
## 2. Keys and integrity constraints

### Keys link rows in different tables

![W3-1 slide 12 - Primary key and foreign key](assets/03-logical-physical-design/slide-w31-12.png)

The red circle on the left is the Customer ID column of `Customer`: each value appears only once and finds exactly one customer, so it is the **primary key (PK)**. The red circle on the right is the Customer ID column of `Order`: values can repeat (C2045 placed three orders), and each value points to some row on the left, so it is a **foreign key (FK)**.

The slide's text also says that keys are one kind of **integrity constraint (IC)**. The business rule "only customers can place orders" is guaranteed by "the customer number in an order must exist in the customer table".

### From superkey to primary key

![W3-1 slide 13 - Superkey](assets/03-logical-physical-design/slide-w31-13.png)

**Superkey**: a set of fields on which no two rows have exactly the same values. All the attributes together are always a superkey; in the customer table, CustomerID plus any other column is also a superkey.

**Key / candidate key**: a minimal superkey; removing any attribute makes it no longer unique. In the customer table `{CustomerID}` is a candidate key, while `{CustomerID, Surname}` is only a superkey.

![W3-1 slide 14 - Primary keys exercise on Student](assets/03-logical-physical-design/slide-w31-14.png)

The student table at the top right has `sid`, `name`, `login`, `age` and `gpa`, and two people are both called Smith. Think through the slide's four questions:

1. `sid` differs in every row, so it can be the primary key;
2. `name` has duplicates, so it is not a key;
3. `{sid, gpa}` is a superkey but not a primary key: after removing `gpa`, `sid` is still unique, so it is not minimal;
4. `{sid, login}` is not minimal either: `sid` and `login` are each unique on their own, so both are candidate keys, and you pick one of them as the primary key.
<!-- Sources: W3-1 p.14 -->

![W3-1 slide 15 - Superkeys to candidate keys to primary key](assets/03-logical-physical-design/slide-w31-15.png)

The arrows on the left show the hierarchy: picking the minimal ones out of the superkeys gives the candidate keys, and one candidate key is then chosen as the primary key. When choosing the primary key, the designer should choose the one with the fewest columns that will never change during the entity's whole lifetime. The final N.B. reminds us that some relations have no suitable candidate key; then the designer adds a **surrogate key**.
<!-- Sources: W3-1 p.13-16; Apple Notes FE - Logical & Physical Design & SQL DDL -->

#### Surrogate keys and natural keys

![W3-1 slide 16 - Surrogate keys](assets/03-logical-physical-design/slide-w31-16.png)

The top half lists the features of a surrogate key: it has no business meaning, is usually numeric, and is often generated in sequence by the DBMS (MySQL's `AUTO_INCREMENT`). The bottom half turns to modelling: when talking with the client, use the terms of their business and their **natural keys**; do not force fields on them that they do not use.

![W3-1 slide 18 - Modelling with natural keys](assets/03-logical-physical-design/slide-w31-18.png)

The two kinds of key belong to different stages. Modelling uses natural keys; sometimes the ER model itself is the final product and no database is ever built. When the database is actually built, the implementer may add a surrogate key. Adding a surrogate key loses no data: the natural-key columns are still kept, they just stop being the primary key.

Slide 17, between the two pages, gives an example: a small college offering only 20 subjects usually identifies subjects by their names, so a "subject code" need not be forced on it during modelling. The same page asks: is an employee's work email or mobile number a reliable identifier? They change and get reassigned, so they do not meet "unchanged during the lifetime" and are not good primary keys.
<!-- Sources: W3-1 p.16-18 -->

### Foreign keys and referential integrity

![W3-1 slide 20 - Foreign keys in SQL](assets/03-logical-physical-design/slide-w31-20.png)

A foreign key is a set of fields in one relation used to "refer to" a row in another relation; it must correspond to the primary key of the other relation, that is, the referenced primary-key value must exist. When all foreign-key constraints are enforced, **referential integrity** is achieved.
<!-- Sources: W3-1 p.19; Apple Notes FE - Logical & Physical Design & SQL DDL -->

The SQL at the top of the slide circles the key line in red: `FOREIGN KEY (customerID) REFERENCES Customer (customerID)`. It is written in the `Order` table, which **refers to another table**, not in the referenced `Customer` table. The `customerID CHAR(8) NOT NULL` in the same block means every order must have a customer (covered again in [Section 3](#topic-3)).

![W3-1 slide 21 - Enforcing referential integrity](assets/03-logical-physical-design/slide-w31-21.png)

Referential integrity has to answer two questions. Inserting an order that refers to a non-existent customer number: reject it outright. Deleting a customer that is still referenced by orders: the slide lists four choices, written in SQL as follows:

| Choice | SQL | Effect |
| --- | --- | --- |
| Delete along with it | `ON DELETE CASCADE` | When the parent row is deleted, the child rows referring to it are deleted automatically |
| Disallow the delete | `ON DELETE NO ACTION` / `RESTRICT` | As long as child rows still refer to it, the parent row cannot be deleted; this is the default |
| Change to a default value | `ON DELETE SET DEFAULT` | Changes the child rows' foreign key to a default customer number |
| Change to null | `ON DELETE SET NULL` | Changes the child rows' foreign key to `NULL` (meaning "unknown" or "not applicable") |
<!-- Sources: W3-1 p.21, p.34; W4-1 p.7; Apple Notes FE - Logical & Physical Design & SQL DDL -->

The bottom of the page says that updating a primary key raises the same question, specified with `ON UPDATE ...`. In MySQL, writing `RESTRICT` or `NO ACTION` has the same effect as omitting `ON DELETE` (W4-1 slide 7 says so too). Hands-on practice (child rows following when the parent key is renumbered, an error when deleting a referenced employee) is in [06](06-sql-joins-and-changes.en.md#topic-4).
<!-- Sources: W3-1 p.21; W4-1 p.7 -->

**Note:** Extension: MySQL's InnoDB engine recognises the `SET DEFAULT` syntax but rejects table definitions that contain it; in MySQL only the other three are actually usable.

### Integrity constraints and "schema on write"

![W3-1 slide 22 - Integrity constraints](assets/03-logical-physical-design/slide-w31-22.png)

An integrity constraint is a condition that **every** instance of the database must satisfy, for example a **domain constraint**: a column can only take values of a certain kind. ICs are specified when the schema is defined and checked when relations are modified; an instance that satisfies all ICs is a **legal instance**, and the DBMS should not allow illegal instances to appear. Because the table structure is fixed before any data is inserted, this approach is called **schema on write**; for the contrast with NoSQL's "schema on read" see [12](12-nosql-json.en.md#topic-1).
<!-- Sources: W3-1 p.22; Apple Notes FE - Logical & Physical Design & SQL DDL -->

<a id="topic-3"></a>
## 3. Mapping binary relationships and weak entities

The Tut W3 solutions reduce "conceptual design → logical design" to three jobs: split multi-valued attributes into separate columns or entities; split composite attributes (for example an address made of street, city and postcode) into their component parts; and resolve relationships by adding foreign keys and associative entities, placing the relationship's own attributes in the right location. This section follows that order and ends by walking through the whole process with the cinema case from the solutions.
<!-- Sources: Tut W3 Sol p.7 -->

### Multi-valued attributes must be flattened

![W3-1 slide 24 - Flattening a multi-valued attribute](assets/03-logical-physical-design/slide-w31-24.png)

In the Chen diagram on the left, `phoneNum` is drawn as a double ellipse, a **multi-valued attribute**: one customer can have home, work and mobile numbers. Each cell of a relation can hold only one value, so the logical relation the red arrow points to splits it into three columns `home_num`, `work_num` and `mobile`: `Customer(CustID, Surname, FirstName, home_num, work_num, mobile)`.
<!-- Sources: W3-1 p.24 -->

**Note:** splitting into a fixed set of columns suits the case where the kinds of number are fixed and few. If the number of phone numbers is not fixed, split out a separate phone table; this is exactly the idea of removing repeating groups for 1NF in [04](04-normalisation.en.md#topic-3).

### From ERD to logical relations: associative entities bring PFKs

![W3-1 slide 25 - ER to logical relations with PFKs](assets/03-logical-physical-design/slide-w31-25.png)

This diagram writes the pizza-order ERD from [02](02-conceptual-er-modelling.en.md#topic-5) as three logical relations. In the red-circled `OrderItem(OrderID, PizzaCode, Quantity)`, the first two columns are borrowed from the two parent entities and become **PFKs** (both part of the primary key and a foreign key); `CustomerID` in `Order` is an ordinary foreign key.
<!-- Sources: W3-1 p.25 -->

The notation used in the slides (red text at the bottom right): primary keys are underlined, foreign keys in italics, and PFKs both underlined and italic. The arrow at the bottom left reminds us that a PFK need not have the same name as the parent entity's primary key; for example `PizzaCode` in `OrderItem` refers to `Pizza.Code`.
<!-- Sources: W3-1 p.25 -->

### From logical to implementation: the same keys written in SQL

![W3-1 slide 27 - Physical relations and CREATE TABLE](assets/03-logical-physical-design/slide-w31-27.png)

The top half shows the **physical relations**: the logical relations plus types, for example `Code CHAR(6)`, `Price DECIMAL(5,2)`, `OrderDateTime DATETIME` (slide 26 is just this half on its own). The bottom half writes them as `CREATE TABLE`: underlines become `PRIMARY KEY (...)` and italics become `FOREIGN KEY (...) REFERENCES ...`. The two PFK columns of `OrderItem` appear twice in the SQL: once in the composite primary key `PRIMARY KEY (OrderID, PizzaCode)`, and once each in their own `FOREIGN KEY`.

**Common mistake:** on the slide the foreign key of `Order` is written `REFERENCES Customer(CustID)`, while the customer table's primary key on slide 10 is called `customerID`. When the statement actually runs, the column name in the parentheses must be a primary-key column that really exists in the parent table.

![W3-1 slide 28 - Sample instances linked by keys](assets/03-logical-physical-design/slide-w31-28.png)

Once data is inserted, the keys become the connecting lines: the green arrows show that order 3224 has two rows in `OrderItem`, and the yellow arrows show that those two rows bought P1 and P3. To read a row of `OrderItem` you look at both PFKs at once; for example the first row is "order 3224 bought 2 Mario’s Supreme Pizzas".

**Common mistake:** customer numbers in the instance look like `C2045`, letters plus digits, while the physical design on the previous page makes `CustomerID` an `INTEGER`; the two cannot both hold. Look at what the real data looks like before choosing a type (see [Section 5](#topic-5)).

### Expressing connectivity and participation in SQL

![W3-1 slide 33 - Connectivity constraint rule](assets/03-logical-physical-design/slide-w31-33.png)

**Connectivity rule**: the primary key of the "one" side becomes a foreign key on the "many" side. In the diagram `Customer` is the one and `Order` the many, so `CustID` goes into `Order`, written in SQL as `FOREIGN KEY (CustID) REFERENCES Customer`. With the foreign key on the many side, each order can hold only one customer number, which guarantees what the red text says: "each order belongs to one customer".

![W3-1 slide 34 - NOT NULL for mandatory participation](assets/03-logical-physical-design/slide-w31-34.png)

**Mandatory participation** is expressed with `NOT NULL`: an order must belong to a customer, so write `CustID CHAR(11) NOT NULL` (the first red circle). The second red circle is `ON DELETE NO ACTION`; the bottom of the page says it is the default and can be omitted: a customer still referenced by orders cannot be deleted, and to delete it you must first change those orders' foreign keys.
<!-- Sources: W3-1 p.33-34; Apple Notes FE - Logical & Physical Design & SQL DDL -->

A complete example from the course script uses a surrogate key, mandatory participation and two referential actions at once:

```sql
CREATE TABLE Account (
  AccountID          INT AUTO_INCREMENT,
  AccountName        VARCHAR(12),
  OutstandingBalance DECIMAL(10,2) NOT NULL,
  CustomerID         INT NOT NULL,          -- 每个账户必须属于一位顾客
  PRIMARY KEY (AccountID),
  FOREIGN KEY (CustomerID) REFERENCES Customer(CustomerID)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);
```
<!-- Sources: W5-1 p.12; lecture/lecture_queries.sql -->

### Weak entities: the foreign key becomes part of the primary key

![W3-1 slide 36 - Translating weak entity sets](assets/03-logical-physical-design/slide-w31-36.png)

A weak entity and its identifying relationship translate into **one table**. `OrderItem` can only be identified through `Order`, so the order number goes into the primary key; when an order is deleted its items should be deleted with it, so the foreign key gets `ON DELETE CASCADE` (red circle). The first bullet also reminds us that when a relationship becomes an entity, the relationship name "Contains" is not suitable as a table name and should be replaced by a noun such as `OrderItem`.
<!-- Sources: W3-1 p.35-36 -->

**Common mistake:** the logical design on this page writes `pizzaID`, the implementation writes `pizzaCode CHAR(3)`, and slide 27 uses `PizzaCode CHAR(6)`. The same column has different names and lengths in three places; in your own work keep the logical design, physical design and SQL consistent.

A version that runs directly in MySQL:

```sql
CREATE TABLE OrderItem (
  pizzaCode CHAR(3) NOT NULL,
  qty       INTEGER,
  orderNo   INTEGER NOT NULL,
  PRIMARY KEY (pizzaCode, orderNo),
  FOREIGN KEY (orderNo)   REFERENCES `Order`(orderNo) ON DELETE CASCADE,
  FOREIGN KEY (pizzaCode) REFERENCES Pizza(Code)     ON DELETE CASCADE
);
```

**Note:** `ORDER` is an SQL reserved word (`ORDER BY`). The slides use `Order` directly as a table name; when actually running it in MySQL, write it with backticks as `` `Order` ``, or rename it `Orders`.

**Note:** the foreign key to `Pizza` also uses `CASCADE`, meaning that deleting a pizza deletes the matching items in historical orders too. Whether that is appropriate depends on the business: if sales records must be kept, this one usually uses `RESTRICT` instead.

### One-to-one: the foreign key goes on the optional side

![W4-1 slide 04 - One-to-one logical and physical design](assets/03-logical-physical-design/slide-w41-04.png)

Nurse and care centre: each care centre must be run by one nurse, while a nurse need not run a centre. If the foreign key went into `Nurse`, this column would be null in most nurse rows; in `CareCentre` every row has a value. So `CareCentre(CentreID, Location, NurseID, DateAssigned)`, and the assignment date goes in the same place as the foreign key. In the physical diagram the `NurseID` in `CareCentre` has a red diamond in front of it, marking it as a foreign key. **The deciding question: on which side does the foreign key produce the fewest nulls?**

**Common mistake:** the "mandatory side / optional side" in the slides refers to the **symbols** at the two ends of the line: the `Nurse` end is drawn mandatory (every centre must have a nurse), the `CareCentre` end is drawn optional (a nurse may run no centre). So the foreign key lands in the `CareCentre` table, the table in which "every row definitely has a partner".
<!-- Sources: W4-1 p.3-4 -->

### Three rules for binary relationships

![W4-1 slide 05 - Summary of binary relationships](assets/03-logical-physical-design/slide-w41-05.png)

This page sums up the rules in three lines: for 1:M, put the primary key of the "one" side into the "many" side as a foreign key; for M:N, create a new **associative entity** whose composite primary key is made of the two sides' primary keys; for 1:1, put the primary key of the mandatory side into the optional side as a foreign key, and pick either side when both are optional or both mandatory.
<!-- Sources: W4-1 p.5; Apple Notes WEEK 4 - Data Types -->

### Identifying relationships and weak entities

![W4-1 slide 06 - Identifying relationship](assets/03-logical-physical-design/slide-w41-06.png)

An identifying relationship is mapped like an ordinary one-to-many: the foreign key goes at the crow's-foot end. The only difference is that **the foreign key also becomes part of the primary key**: `Loan(LoanID, Amount)`, `Payment(PaymentNumber, LoanID, Date, Amount)`, where `LoanID` is a PFK. The red text at the bottom right says that in MySQL Workbench 8.0 a PFK should be shown as a red key; the display difference in the diagram is only cosmetic.
<!-- Sources: W4-1 p.6 -->

### Complete example: the cinema case (Tut W3 and solutions)

The tutorial case in my own words: a cinema chain has several cinemas, and the theatres in each cinema are numbered from 1, with their size, seating capacity and whether they offer Gold Class recorded; the chain owns hundreds of film or digital projectors, each theatre can hold only one, and technicians need to know which theatre each projector is in now; the system records the last time each movie was shown in which theatre of which cinema; and cinemas that are not owned outright also need their yearly rent recorded.
<!-- Sources: Tut W3 p.1-2 -->

#### Conceptual stage: entities, relationships and participation

The solutions first identify four entities: `Cinema`, `Theatre`, `Projector`, `Movie`. "The cinema chain" itself is not an entity: it has only one instance and no data to store. The three relationships and their participation constraints are:

- A theatre is **located in** a cinema: each theatre must belong to exactly one cinema, and each cinema has at least one theatre;
- A projector **projects onto** a theatre: both ends are "optional one". A projector may be a spare or under repair, and a theatre may briefly have no projector during maintenance or while projectors are swapped;
- A theatre **shows** movies: over time, one theatre has shown many movies and one movie has been shown in many theatres, so both ends are "optional many".

The solutions also make two reminders: the requirements will not spell out every constraint, and the gaps must be filled with common sense; relationship names should be specific verbs, not vague words like "has".
<!-- Sources: Tut W3 Sol p.4-5 -->

#### Logical stage: one rule for each kind of relationship

This model has no multi-valued or composite attributes, so logical design is left with just one job, "resolve the relationships":

1. **The 1:1 projects-onto relationship**: the foreign key may go on either side; the deciding question in the solutions is "which side is less likely to have `NULL`?" Most theatres have a projector installed at any time, while spare and under-repair projectors are in no theatre, so the foreign key goes into `Theatre` as a new column `ProjectorSerialNumber`. This is the same deciding question as in the nurse example above. Because a theatre may also briefly have no projector, this column must still allow nulls.
2. **The 1:M located-in relationship**: the foreign key goes on the "many" side, `Theatre`. This is also an identifying relationship (a theatre number is unique only within one cinema), so `CinemaID` also enters the primary key and becomes a PFK: `Theatre(CinemaID, TheatreNumber, Size, SeatingCapacity, HasGoldClass, ProjectorSerialNumber)`.
3. **The M:N shows relationship**: create a new associative entity `MovieScreening`. The primary key of `Theatre` is now two columns, and both must be brought in, plus `MovieID`: `MovieScreening(CinemaID, TheatreNumber, MovieID, DateOfLastScreening)`. The relationship's own attribute, "date of last screening", follows the foreign keys; the foreign keys are in the associative entity, so it goes there too, as a non-key column.

None of `Movie`'s existing attributes (title, year, rating) can reliably tell movies apart, so a `MovieID` must be added. The other three tables are kept unchanged from the conceptual stage: `Cinema(CinemaID, Name, Address, YearlyRent)`, `Movie(MovieID, Title, YearOfRelease, Rating)`, `Projector(SerialNumber, Format, ModelNumber, Resolution, HoursOfUse)`. The solutions also mention a naming convention: at the logical stage names are changed to CamelCase, so "seating capacity" becomes `SeatingCapacity`.
<!-- Sources: Tut W3 Sol p.5-6, p.8-9 -->

**Hard part:** `MovieScreening` refers to the weak entity `Theatre`, so `(CinemaID, TheatreNumber)` is **one foreign key made of two columns** and must refer to `Theatre`'s composite primary key as a whole. If only `TheatreNumber` were carried over, it would be unclear which cinema's "theatre 3" is meant.

**Common mistake:** page 8 of the solutions writes the 1:M rule as "add the foreign key on the one side". This is a slip: page 6 of the same solutions says the Many side, and the example right after on page 8 also puts `CinemaID` into `Theatre`, the "many" side. Remember it by the three rules above: the primary key of the "one" side goes into the "many" side.
<!-- Sources: Tut W3 Sol p.6, p.8 -->

The solutions end by explaining that the textual logical relations do not show whether participation is optional or mandatory, but participation constraints are still part of the logical design and must be used again in physical design, becoming `NOT NULL` or nullable columns (compare slide 34 earlier).
<!-- Sources: Tut W3 Sol p.9 -->

#### Physical stage: adding types and nullability

![Tut W3 Sol slide 09 - Completed logical relations and physical model of the cinema case](assets/03-logical-physical-design/slide-t03s-09.png)

The top half of the page is the completed logical relations: primary keys are underlined, foreign keys have FK above the column name, and a column with both is a PFK. The bottom half is the physical model from the homework task, with a type after each column. Look at four things in the diagram:

- **Key icons**: in `Theatre`, `TheatreNumber` has a yellow key (primary key) and `CinemaID` a red key (PFK); all three columns of `MovieScreening` have red keys: together they form the primary key, and each is also a foreign key.
- **Diamond icons**: a filled diamond means `NOT NULL`, a hollow one means nullable. `Theatre.ProjectorSerialNumber` is a hollow red diamond, a nullable foreign key, matching "a theatre may briefly have no projector"; `Cinema.YearlyRent` is hollow because an owned cinema pays no rent; `Resolution` and `HoursOfUse` in `Projector` are hollow too.
- **Line styles**: `Located in`, `Screens` and `Showing` are solid lines, meaning identifying relationships (the foreign key entered the child table's primary key); `Projects into` is dashed, meaning a non-identifying relationship, with a circle plus a bar at both ends (optional one).
- **Types**: compare with [Section 5](#topic-5). `HasGoldClass TINYINT` is MySQL's convention for a Boolean; `Format` and `Rating` can take only a few fixed values, so they use `ENUM(...)`; `YearOfRelease` uses `YEAR`; `Size DECIMAL(3,1)` means at most 99.9 metres with one decimal place.
<!-- Sources: Tut W3 Sol p.9 -->

**Common mistake:** in the logical relations this column is called `DateOfLastScreening`, but the physical diagram writes `DateOfScreening`; in your own work use the same name for the same column throughout. Also, the task asks for the "last time" a movie was shown, while the diagram's `DATE` stores only the date; if different sessions on the same day must be told apart, `DATETIME` could be used instead (this is my own judgement; the solutions do not discuss it).

<a id="topic-4"></a>
## 4. Unary and ternary relationships

### The degree of a relationship

![W3-1 slide 29 - Relationship degree](assets/03-logical-physical-design/slide-w31-29.png)

The **degree** of a relationship is the number of participating entities: unary (also called recursive), binary (the most common), ternary, n-ary. The `Employee` diagram at the top right is unary: the "manages" line leaves `Employee` and comes back to `Employee`, and `ManagerID` refers to the same table. The Apple Notes way to remember it: a unary associative entity has two PFKs pointing at the same table, a binary one two, a ternary one three, and an n-ary one n.
<!-- Sources: W3-1 p.29; Apple Notes FE - Logical & Physical Design & SQL DDL -->

### Ternary relationships

![W3-1 slide 31 - Ternary relationship to logical relation](assets/03-logical-physical-design/slide-w31-31.png)

In the Chen diagram on the left, `Contract` connects `Part`, `Supplier` and `Department` at once and has its own attributes `Quantity` and `Date`. The business sentence given on slide 30 is "departments buy one or more parts from one or more suppliers". The text at the bottom right is the conversion rule: when an n-ary relationship becomes a logical relation, it includes the primary key of each participating entity (as foreign keys) and all descriptive attributes; these foreign keys together **probably** form a superkey.
<!-- Sources: W3-1 p.30-32 -->

**Common mistake:** in the diagram `Contract` has two attributes, `Quantity` and `Date` (yet the red text on slide 30 says "one relationship attribute"), while the logical relation at the bottom left lists only `Quantity`. By the rule on the right, "all descriptive attributes", `Date` should also go into the relation.

![W3-1 slide 32 - Ternary implementation and the PK question](assets/03-logical-physical-design/slide-w31-32.png)

In the implementation, each of the three foreign keys `REFERENCES` its own parent table, and the primary key is first written as `(SupplierID, PartID, DepCode)`; the arrow on the right asks: is this primary key right?

**Hard part:** if the same department may order the same part from the same supplier on different dates, these three columns will repeat, and `Date` must also be included in the primary key. This brings us back to the method of "checking identifiers with sample data" (see [02](02-conceptual-er-modelling.en.md#topic-6)): the three foreign keys are only a "probable" superkey, and the primary key must be confirmed against the business.
<!-- Sources: W3-1 p.30, p.32 -->

### Unary relationships: a table referring to itself

A unary relationship is mapped with the same rules as a binary one; only both ends are the same entity. W4-1 demonstrates 1:1, 1:M and M:N with three groups of slides, and slide 9 sums up the three cases in text.
<!-- Sources: W4-1 p.7-11; Apple Notes WEEK 4 - Data Types -->

![W4-1 slide 07 - Unary one-to-one Person and spouse](assets/03-logical-physical-design/slide-w41-07.png)

**1:1**: `Person(ID, Name, DateOfBirth, SpouseID)`, where `SpouseID` refers to `Person(ID)`. Look at the instance at the bottom right: Ann's `SpouseID` is 3 (Chon) and Chon's is 1 (Ann); Fred and Nancy have no spouse, so theirs is `NULL`, which is why `SpouseID` cannot be `NOT NULL`. The bottom left says that writing `RESTRICT` (or `NO ACTION`) is the same as omitting `ON DELETE`.

![W4-1 slide 08 - Unary one-to-many Employee and manager](assets/03-logical-physical-design/slide-w41-08.png)

**1:M**: `Employee(ID, Name, DateOfBirth, ManagerID)`, where `ManagerID` refers to `Employee(ID)`. In the instance Ann is the top boss and has no manager, so her `ManagerID` is `NULL`; the other three all have manager 1, Ann. `ON UPDATE CASCADE` means that if Ann's ID changes, her three subordinates' `ManagerID` changes along with it automatically; `ON DELETE RESTRICT` means Ann cannot be deleted while she still has subordinates.
<!-- Sources: W4-1 p.8 -->

In SQL this self-referencing structure becomes a "self join"; for how to write the query see [06](06-sql-joins-and-changes.en.md#topic-2).

![W4-1 slide 10 - Unary many-to-many](assets/03-logical-physical-design/slide-w41-10.png)

**M:N**: items are made of components, and a component is itself an item. By the rule, create a new associative entity `Component(ID, ComponentID, Quantity)`; both foreign keys refer to `Item(ID)`, **must have different names**, and together form the primary key. Look at the physical diagram at the bottom right: there are two lines between `Item` and `Component`, one "contains" and one "contained by", matching the two PFKs `ID` and `ComponentID`, both pointing back to `Item`. `Quantity` is the combination's own attribute: how many of this component an item contains.
<!-- Sources: W4-1 p.10-11 -->

![W4-1 slide 11 - Unary many-to-many implementation](assets/03-logical-physical-design/slide-w41-11.png)

In the implementation `Component` has two `FOREIGN KEY` clauses, both referring to the same `Item(ID)`. Both use `ON DELETE RESTRICT`: as long as an item still contains components, or is still used as a component of another item, it cannot simply be deleted.

<a id="topic-5"></a>
## 5. MySQL data types

### Principles for choosing types

![W4-1 slide 13 - Choosing data types](assets/03-logical-physical-design/slide-w41-13.png)

A column is the smallest unit of data in a database, and data types help the DBMS store and use data efficiently. The five principles on the left: guarantee data integrity (quality), represent all possible values, support the operations needed, save storage where possible, and improve performance (for example choosing fixed or variable length). On the right are the main categories: text, numeric (integer, fixed-point, floating-point), and date and time.
<!-- Sources: W4-1 p.13 -->

### Character types

![W4-1 slide 14 - Character types](assets/03-logical-physical-design/slide-w41-14.png)

When reading this page, hold on to "fixed or variable length":

- `CHAR(M)` is **fixed length**: when stored it is padded on the right with spaces up to M, suiting values of fixed length (codes with a fixed number of characters, state abbreviations); `CHAR` equals `CHAR(1)`;
- `VARCHAR(M)` is **variable length**: it stores only the actual characters, without padding, suiting values of varying length such as names and emails;
- `BLOB` / `TEXT` store larger binary or text objects, kept apart from the row data; `LONGBLOB` / `LONGTEXT` go up to $2^{32}-1$ ;
- `ENUM('v1','v2',...)` can only take one of the listed values.
<!-- Sources: W4-1 p.14; Apple Notes WEEK 4 - Data Types -->

**Common mistake:** at BLOB/TEXT the slide writes "65535 (2^16)"; strictly $65535=2^{16}-1$ , and the $2^{16}-1$ recorded in Apple Notes is right.

### Numeric types

![W4-1 slide 15 - Integer types](assets/03-logical-physical-design/slide-w41-15.png)

The five integer types grow in size from `TINYINT` to `BIGINT`. Each has a signed and an unsigned range: unsigned moves the negative half over to the positives, for example `TINYINT` is −128 to 127, or 0 to 255. Choose so that both "represent all possible values" and "save space" hold: `TINYINT` is enough for an age, while numbers that keep growing, such as order numbers, need plenty of headroom.
<!-- Sources: W4-1 p.15 -->

- `BIT(M)` stores an M-bit binary value (M from 1 to 64); for example `b'111'` means 7;
- The red text on the last line: **do not write `(M)`** on integer types. Extension: the 11 in `INT(11)` is only a display width from older versions and does not limit the range of values; it has been deprecated since MySQL 8.0.17.

![W4-1 slide 16 - Real number types and Boolean](assets/03-logical-physical-design/slide-w41-16.png)

- `FLOAT` (single precision) and `DOUBLE` / `REAL` (double precision) are **floating-point** numbers, stored as binary approximations and commonly used for scientific data;
- `DECIMAL(M,D)` is **fixed-point**, stored exactly in decimal, and **suits money**: M is the total number of digits and D the number of them after the decimal point. For example `DECIMAL(5,2)` goes up to 999.99, as in the pizza `Price DECIMAL(5,2)` on slide 27;
- Bottom of the page: MySQL has no true Boolean type; it uses `TINYINT`, with 1 for true and 0 for false.
<!-- Sources: W4-1 p.15-16; Apple Notes WEEK 4 - Data Types -->

Understanding example (my own): 0.1 cannot be represented exactly in binary, so adding many amounts of 0.10 with `FLOAT` or `DOUBLE` can leave an error in the last digit; `DECIMAL(10,2)` stores in decimal, so the sum comes out to the exact cent. This is why "money uses fixed-point".

### Date and time types

![W4-1 slide 17 - Date and time types](assets/03-logical-physical-design/slide-w41-17.png)

- `DATE` holds only a date; `TIME` can mean either a time of day or an elapsed duration, so its range can exceed 24 hours (−838:59:59 to 838:59:59);
- `DATETIME` and `TIMESTAMP` both contain a date and a time; the difference is how they are stored: `DATETIME` stores the local time as written, while `TIMESTAMP` is stored as UTC and converted to the current connection's time zone when read, and its range only reaches 2038-01-19 03:14:07;
- `YEAR` stores only a year, from 1901 to 2155.
<!-- Sources: W4-1 p.17; Apple Notes WEEK 4 - Data Types -->

**Common mistake:** the three lines at the bottom of the page explain that if you store a value in `TIMESTAMP`, change the connection's time zone and read it again, you get a different value; `DATETIME` does not change with the time zone.

#### Understanding example: how the Tut W9 customer table chooses types

When the Week 9 tutorial builds the `customer` table it chooses like this (in my own words): `CustomerID` uses `SMALLINT AUTO_INCREMENT` as a surrogate key; `FirstName VARCHAR(25)` may be null, while `LastName`, `Phone` and `BirthDate` all get `NOT NULL`; the phone uses `VARCHAR(16)` rather than an integer, and the birth date uses `DATE`. Phone numbers take part in no arithmetic, may start with 0, and may contain `+` or spaces, so storing them as strings is safer.
<!-- Sources: Tut W9 Sol p.2 -->

### Class exercise: the subject enrolment model

![W4-1 Ex slide 01 - Subject enrolment exercise](assets/03-logical-physical-design/slide-w41ex-01.png)

The exercise describes: students enrol in subjects, and the result is a mark and a grade; a failed subject can be repeated; subjects have static information (code, name) and information that changes each semester (semester, year, coordinator); each subject in each semester has several assignments A1, A2, …; each assignment a student submits gets a mark. Four points are worth noting when modelling:

- "Repeating" means the same student and the same subject can appear several times, so the enrolment's identifier must include the semester and year;
- Split the static and per-semester information into two entities; a semester offering is a weak entity of the subject;
- An assignment number such as A1 is unique only within one offering, so an assignment is in turn a weak entity of the offering;
- An assignment mark belongs to "one enrolment record × one assignment", a many-to-many relationship between the two, and the mark is that relationship's own attribute.
<!-- Sources: lecture/Week4-1_Exercise_SubjectEnrol.pdf -->

## Self-check

1. Each country has exactly one capital city, each city is the capital of at most one country, and most cities are not capitals. Which table gets the foreign key, and why?
2. A person can tutor many subjects, a subject can have many tutors, and the hours each person works on each subject must be recorded. Write the logical relations and mark the PFKs.
3. In `Student(sid, email, name)`, both `sid` and `email` are unique. List the two candidate keys, and one superkey that is not a candidate key.
4. A subject can have other subjects as prerequisites. Write the logical relation and the `CREATE TABLE`, and explain why the two foreign keys cannot have the same name.
5. Choose a MySQL type for each of "price (at most 9999.99 dollars)", "whether the student has graduated", "date of birth" and "state abbreviation (always 3 letters)".
