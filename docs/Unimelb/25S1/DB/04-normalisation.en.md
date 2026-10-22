# INFO90002 Week 4 - Normalisation

Sources: `lecture/INFO90002_Week4-2_Normalisation.pdf`; `tutorial/Week4_Tute_Normalisation.pdf`, `tutorial/Week4_Tute_Normalisation_Solutions.pdf`, `tutorial/Week12_Tute_ExamRevision_SOLUTIONS.pdf`; Apple Notes: CS/25S1/DB — "FE - Normalisation".

This lecture asks: **what goes wrong with one big table that "holds everything", and how do functional dependencies guide splitting it, step by step, into tables free of redundancy anomalies?**

Learning path: [Anomalies caused by redundancy](#topic-1) → [Functional dependencies and Armstrong's axioms](#topic-2) → [The unnormalised relation and 1NF](#topic-3) → [2NF and 3NF](#topic-4) → [Applying the three steps to new tables](#topic-5).

Key points: spotting partial and transitive dependencies; keeping a foreign key at every split. Hard parts: writing the unnormalised relation with its repeating group first; checking that the primary key is really unique. Common mistakes: a relation with a single-attribute primary key is automatically in 2NF; derived attributes do not go into a relation; a "transitive dependency" and the "transitivity rule" are not the same thing.

Screenshot numbers are PDF page numbers: `w42` is the Week 4-2 lecture deck, `t04s` is the Week 4 tutorial solutions. Notation in this note: **bold** = primary key (underlined in the slides), *italic* = foreign key, ***bold italic*** = PFK (part of the primary key and a foreign key).

<a id="topic-1"></a>
## 1. Why normalise: anomalies caused by redundancy

### One table that holds everything

![W4-2 slide 04 - One big table of students, subjects and lecturers](assets/04-normalisation/slide-w42-04.png)

Each row of this table is "one student took one subject in one semester". Read down the first five rows: Joy Egbert's name, campus address, degree and phone number are repeated five times across the A121 rows; now look at the ACC101 rows: lecturer Davern's office T240C and phone 8344-1846 are copied again for every enrolment. Repetition is itself the warning sign: when the same fact is written many times, it can end up written differently.

![W4-2 slide 05 - Normalised student data](assets/04-normalisation/slide-w42-05.png)

This is what it looks like after splitting. The Student table (top left) and the Subject table (bottom left) each describe one student or one subject per row; the Subject Coordinator table in the middle uses `(Subject ID, Sem.)` to record who is in charge in a given semester; the Lecturer table (bottom right) holds offices and phones; the Enrolled Table (top right) keeps only `Student ID#, Subject ID, Sem., Grade` — identifiers plus a grade. Notice Wilkin in the Lecturer table: he coordinates no subject this semester, so the big table had nowhere to store him; after the split he can be recorded on his own.
<!-- Sources: W4-2 p.4-5 -->

### Insertion, deletion and update anomalies

![W4-2 slide 06 - Insertion, deletion and update anomalies](assets/04-normalisation/slide-w42-06.png)

This page switches to a smaller table `(StudentID, StLastN, SubjectCode, SubjectTitle, FinalMark)`, and the three paragraphs underneath correspond to the three kinds of **anomaly**:

- **Insertion anomaly**: a newly offered subject cannot be inserted as a row until some student enrols in it (the student fields are part of the key and cannot be left empty);
- **Deletion anomaly**: when Cook withdraws from ISYS90003 and that row is deleted, the fact "ISYS90003 is called Ethics in IS" disappears with it;
- **Update anomaly**: renaming ISYS90001 means changing every row it appears in; miss one and the data contradicts itself.

All three anomalies have the same root: the subject title, a "fact about a subject", has been placed in rows that describe "an enrolment". The tutorial example works the same way: a timetable table that stores each room's seating capacity must change many rows when a room is enlarged (update), loses the room's details when the only class using it is deleted (deletion), and cannot record a newly built room until a class is scheduled there (insertion).
<!-- Sources: W4-2 p.6; Tut W4 Sol p.1 -->

**Normalisation** breaks one large table into several smaller ones to remove undesired redundancy. Page 7 of the slides then asks "how do we split it?"; the answer is functional dependencies, covered next: they tell us which attributes are "about the same thing" and so belong together.
<!-- Sources: W4-2 p.7 -->

<a id="topic-2"></a>
## 2. Functional dependencies and Armstrong's axioms

### Functional dependencies and determinants

![W4-2 slide 11 - Functional dependency definition](assets/04-normalisation/slide-w42-11.png)

If each value of attribute X determines exactly one value of attribute Y, then Y is **functionally dependent** on X (a **functional dependency, FD**), written $X \to Y$ (also $Y = f(X)$ ): if you know X, you know Y. The two orange arrows at the bottom of the page are examples: `StudentID → Student-name` and `StudentID → Student-email`.
<!-- Sources: W4-2 p.11-12; Apple Notes FE - Normalisation -->

![Tut W4 Sol slide 02 - Formal FD definition, determinants, keys and partial dependency](assets/04-normalisation/slide-t04s-02.png)

Page 2 of the tutorial solutions gives a stricter statement (top half of the page): if two rows agree on $A_1,\dots,A_n$ , they must also agree on $B_1,\dots,B_m$ , giving $A_1,\dots,A_n \to B_1,\dots,B_m$ . A functional dependency must hold for **every** possible instance of the relation, not just happen to hold for the data in front of you.
<!-- Sources: Tut W4 Sol p.2 -->

Read further down the same page for three concepts:

- **Determinant**: the attribute(s) on the left of the arrow. In `Person(ssn, name, birthdate, address, age)` both `ssn` and `birthdate` are determinants, because `birthdate → age`;
- **Key**: a **minimal** set of attributes that determines all the others. `ssn` is a key; `{ssn, name}` also determines everything, but it still does after removing `name`, so it is only a **super key**;
- **Partial functional dependency**: see the next subsection.

**Note:** sample data can **refute** a dependency (find two rows that agree on the left but differ on the right), but it cannot **prove** one. Dependencies come from business rules: "each student number has one name" is a rule, not something counted from a few rows of data.

### Key attributes, partial and transitive dependencies

![W4-2 slide 12 - Determinants, partial and transitive dependency](assets/04-normalisation/slide-w42-12.png)

Start with $A(X, Y, Z, D)$ in the top-right corner: X and Y are underlined and together form the primary key. Every attribute is either a **key attribute** (part of the primary key) or a **non-key attribute**. The page uses this four-attribute relation to mark the two kinds of dependency that must be removed:

| Dependency type | Meaning | Example |
| --- | --- | --- |
| Full | A non-key attribute depends on the **whole** primary key | `(StudentID, SubjectCode) → Grade` |
| Partial | A non-key attribute depends on only **part** of a composite primary key, $Y \to Z$ | In `(StudentID, SubjectCode)`, `StudentID → StudentName` |
| Transitive | One non-key attribute determines another, $Z \to D$ | `LecturerID → LecturerName` |
<!-- Sources: W4-2 p.12; Tut W4 Sol p.2-3; Apple Notes FE - Normalisation -->

The transitive example is at the very bottom of the page: in the relation `SubjCode | SubjectName | LecturerID | LecturerName` with primary key `SubjCode`, `LecturerName` is not determined directly by the subject but by a detour "subject → lecturer ID → lecturer name", hence "transitive".

Back to Figure 1 at the bottom of tutorial page 2: the large green circle on the left is the composite primary key, the small box inside it marks a **subset** of that key, and the arrow points from that subset to a non-key attribute. The text example: $R(A, B, C, D)$ has primary key $(A, D)$ , while $A \to B$ and $D \to C$ each use only half of the key.

![Tut W4 Sol slide 03 - Transitive dependency figure and Armstrong's axioms](assets/04-normalisation/slide-t04s-03.png)

Figure 2 in the top half of this page shows a transitive dependency: both circles are non-key attributes. The text adds something the slides do not say: if a non-key attribute is determined jointly by "part of the primary key + a non-key attribute", that also counts as a transitive dependency — what matters is that the left-hand side is **not the complete key**. The bottom half of the page gives the formal definitions of Armstrong's axioms, discussed next alongside the slides.

**Common mistake:** the student's notes describe a transitive dependency as "$X \to Y$ and $Y \to Z$ imply $X \to Z$", but that is actually the **transitivity rule** of the next subsection (an inference rule). A transitive dependency is a **kind of dependency to be removed in 3NF**: non-key determining non-key. The two are related (it is because of the transitivity rule that the primary key "indirectly" determines `LecturerName`), but do not confuse them.

### Armstrong's axioms

![W4-2 slide 13 - Armstrong's axioms with examples](assets/04-normalisation/slide-w42-13.png)

Armstrong's axioms derive new dependencies from known ones:

$$
\text{Reflexivity: } B \subseteq A \Rightarrow A \to B
$$

$$
\text{Augmentation: } A \to B \Rightarrow AC \to BC
$$

$$
\text{Transitivity: } A \to B,\ B \to C \Rightarrow A \to C
$$
<!-- Sources: W4-2 p.13; Tut W4 Sol p.3; Apple Notes FE - Normalisation -->

When reading the red examples on the page, notice what each rule does: **reflexivity** yields a "trivial dependency" whose right-hand side is already contained in the left (`Student_ID, name → name`); **augmentation** adds the same attribute to both sides of the arrow (`surname` on both sides); **transitivity** chains two dependencies end to end (`ID → birthdate → age`).
<!-- Sources: W4-2 p.13 -->

#### Illustrative example: the three axioms on an inventory table (Tut W12)

Given `ItemID → Cost/Unit` and `Quantity, Cost/Unit → InventoryValue`:

1. Reflexivity: $\{Dept\} \subseteq \{Dept, Qty\}$ , so `Dept, Qty → Dept`;
2. Augmentation: add `Qty` to both sides to get `ItemID, Qty → Cost/Unit, Qty`;
3. Transitivity: chain with the second dependency to get `ItemID, Qty → InventoryValue`.
<!-- Sources: Tut W12 Sol p.3 -->

<details markdown="1"><summary>Extension (optional): three additional rules</summary>

The student's notes list additional rules derived from the three axioms; the slides do not include them:

| Rule | Statement |
| --- | --- |
| Union | If $X \to Y$ and $X \to Z$ , then $X \to YZ$ |
| Decomposition | If $X \to YZ$ , then $X \to Y$ and $X \to Z$ |
| Pseudotransitivity | If $X \to Y$ and $WY \to Z$ , then $WX \to Z$ |
<!-- Sources: Apple Notes FE - Normalisation -->

</details>

### Finding candidate keys from dependencies

Tutorial exercise: relation $R(A, B, C, D)$ with dependencies $AB \to C$ , $AC \to B$ , $BC \to A$ , $B \to D$ . Take $AB$ : $AB \to C$ , and since $B \to D$ , $AB$ determines every attribute; likewise $AC$ ( $AC \to B$ , then $B \to D$ ) and $BC$ are **candidate keys**. $ABC$ also determines every attribute, but it is not minimal, so it is only a super key. Because $B$ is only part of a candidate key yet determines $D$ , $B \to D$ is a partial dependency, and $R$ splits into $R_1(A, B, C)$ and $R_2(B, D)$ ; after the split neither table has a partial or transitive dependency, so both are already in 3NF.
<!-- Sources: Tut W4 Sol p.4-5 -->

<a id="topic-3"></a>
## 3. The unnormalised relation and 1NF

### What each of the three steps removes

![W4-2 slide 14 - Steps in normalisation](assets/04-normalisation/slide-w42-14.png)

A **normal form** is the state a relation reaches after it has been tidied up by dependency rules. Look at the three boxes and the downward arrows on the left: the steps are **cumulative** — 2NF presupposes 1NF, and 3NF presupposes 2NF. The three sentences on the right say:

- **1NF**: remove multi-valued attributes and **repeating groups**, so every cell holds a single value (the student's notes call this an atomic value);
- **2NF**: remove partial dependencies, so every non-key attribute is determined by the **whole** primary key;
- **3NF**: remove transitive dependencies, so every non-key attribute is determined **only** by the primary key, not by another non-key attribute.
<!-- Sources: W4-2 p.14; Apple Notes FE - Normalisation -->

### From an invoice to the unnormalised relation

![W4-2 slide 15 - Invoice document](assets/04-normalisation/slide-w42-15.png)

The slides work through the whole process on a real invoice. The top half holds the customer (Bill To / Ship To) and invoice-level details (date, salesperson Charles Wooten); in the table on the bottom half each row is one product: ID, description, unit price, quantity, amount. One invoice has many product rows — that is where the repeating group comes from.

![W4-2 slide 16 - Invoice as a spreadsheet with repeating groups](assets/04-normalisation/slide-w42-16.png)

In a spreadsheet, the INV0012 row fills in the invoice number, date and customer only once, and the four rows below have values only in the product columns; the red boxes mark the repeating group. The red text in the top-right corner stresses: **this is not the relational model** — a relational table does not allow "one cell for several rows". Notice also that `Amount` (unit price × quantity) and `Sub Total` (the sum of the line amounts) are both computed.

![W4-2 slide 17 - Writing the unnormalised relation](assets/04-normalisation/slide-w42-17.png)

Before normalising, write it as **one** big relation (unnormalised form, UNF). The four rules on the page:

- list every attribute that must be recorded;
- leave out anything derivable (e.g. age, `Amount`, `SubTotal`, `TotalDue`);
- put parentheses around the repeating group;
- mark the primary key (underline).
<!-- Sources: W4-2 p.16-17 -->

In the result at the bottom of the page, `(ProductNo, ProductDesc, UnitPrice, Qty)` inside the parentheses is the repeating group, and `ProductNo` is underlined, meaning it distinguishes the rows within the group. Derived values are left out; the reason is clearer in the inventory example in [Section 5](#topic-5): a derived column adds another dependency and has to be kept consistent all the time.

### 1NF: move the repeating group out

![W4-2 slide 19 - Getting to 1NF in the invoice example](assets/04-normalisation/slide-w42-19.png)

The method is to move the bracketed part out as a whole: the original relation `Invoice` keeps the invoice-level attributes; the part moved out becomes a new relation `InvoiceLineItem`, which takes `InvoiceNo` with it as a foreign key (that is what the red FK arrow points to), so each line item can still find the invoice it belongs to.

The page ends by asking what the new relation's primary key is. The answer is `(InvoiceNo, ProductNo)`: one invoice has several products, so `InvoiceNo` alone is not unique; the same product appears on many invoices, so `ProductNo` alone is not unique either. `InvoiceNo` is therefore both a foreign key and part of the primary key — a PFK.
<!-- Sources: W4-2 p.19; Apple Notes FE - Normalisation -->

![W4-2 slide 20 - Summary of steps to 1NF](assets/04-normalisation/slide-w42-20.png)

This page writes 1NF as four steps:

1. move the bracketed repeating group out, forming two relations;
2. give the new relation a **meaningful name** (a wrong name leads to mistakes in 2NF and 3NF as well);
3. link the two tables with a foreign key — think about which one gets it;
4. choose primary keys for both tables, then check again that they really are unique.
<!-- Sources: W4-2 p.18-20 -->

**Common mistake:** the foreign key goes in the table that was moved out (the "many" side). One invoice has many line items, so each line item remembers the invoice number, rather than the invoice remembering a list of product numbers — that would turn back into a multi-valued attribute.

<a id="topic-4"></a>
## 4. 2NF and 3NF

### 2NF: only composite primary keys need checking

![W4-2 slide 21 - Second normal form applies to composite keys](assets/04-normalisation/slide-w42-21.png)

**Only relations with a composite primary key need a 2NF check**; a relation with a single-attribute primary key is automatically in 2NF — a partial dependency means "depends on part of the primary key", and a single attribute has no "part". That is why the purple text says `Invoice` is already in 2NF, and only `InvoiceLineItem` needs to be examined.

![W4-2 slide 22 - From 1NF to 2NF](assets/04-normalisation/slide-w42-22.png)

`InvoiceLineItem` has primary key `(InvoiceNo, ProductNo)`, but `ProductDesc` and `UnitPrice` depend only on `ProductNo` — a product's description and unit price have nothing to do with which invoice it is on, so this is a partial dependency. The blue text gives the method: move the dependent attributes, together with the part of the key they depend on, into a new relation. Follow the downward arrow: `Product(ProductNo, ProductDesc, UnitPrice)` is split off, and `InvoiceLineItem` keeps only `Qty` — the quantity really does depend on both "which invoice" and "which product". `ProductNo` stays in the line item as both part of the primary key and a foreign key to `Product`.
<!-- Sources: W4-2 p.21-22 -->

At this point the 2NF design is `Invoice` unchanged, plus `Product` and the shortened `InvoiceLineItem` (page 23 of the slides lists these three tables). The student's notes put it plainly: `ProductDesc` and `UnitPrice` "have nothing to do with `InvoiceNo`", so they move out.
<!-- Sources: W4-2 p.23; Apple Notes FE - Normalisation -->

### 3NF: a non-key attribute must not determine a non-key attribute

![W4-2 slide 24 - Third normal form rules](assets/04-normalisation/slide-w42-24.png)

The three steps of 3NF: find transitive dependencies where a non-key attribute determines another non-key attribute; move the determinant and the fields that depend on it into a new relation; **keep the determinant in the original relation as a foreign key**. The bottom of the page first rules out two tables: `Product` and `InvoiceLineItem` have no non-key-determines-non-key dependency, so they are already in 3NF.

![W4-2 slide 25 - From 2NF to 3NF](assets/04-normalisation/slide-w42-25.png)

In the remaining `Invoice`, `CustomerNo → CustomerName, CustomerAddress` (blue) and `ClerkNo → ClerkName` (red) are both non-key determining non-key. After `Clerk` and `Customer` are extracted, the page asks what is left in `Invoice`: `InvoiceNo` as primary key, `CustomerNo` and `ClerkNo` in italics as foreign keys, plus `Date`.
<!-- Sources: W4-2 p.24-25 -->

### The final result and the ER diagram

![W4-2 slide 26 - Final 3NF relations and ER diagram](assets/04-normalisation/slide-w42-26.png)

On the left are the five 3NF relations; on the right is the corresponding ER diagram: key icons are primary keys, red diamonds are foreign keys. `Customer` and `Clerk` each connect one-to-many to `Invoice` (a customer or a clerk can have zero or more invoices); `Invoice` connects one-to-many to `InvoiceLineItem` (an invoice has at least one line item); `Product` connects one-to-many to `InvoiceLineItem`. `InvoiceLineItem` is exactly the associative entity from [02](02-conceptual-er-modelling.en.md#topic-5) that resolves the many-to-many relationship between invoices and products.

Putting the three steps in one table shows what each step splits off and which dependency justifies it:

| Step | Split off / changed | Justification |
| --- | --- | --- |
| 1NF | InvoiceLineItem(***InvoiceNo***, **ProductNo**, ProductDesc, UnitPrice, Qty) | The product rows are a repeating group |
| 2NF | Product(**ProductNo**, ProductDesc, UnitPrice); InvoiceLineItem(***InvoiceNo***, ***ProductNo***, Qty) | `ProductNo → ProductDesc, UnitPrice` is a partial dependency |
| 3NF | Customer(**CustomerNo**, CustomerName, CustomerAddress); Clerk(**ClerkNo**, ClerkName); Invoice(**InvoiceNo**, *CustomerNo*, *ClerkNo*, Date) | `CustomerNo → CustomerName, CustomerAddress` and `ClerkNo → ClerkName` are transitive dependencies |
<!-- Sources: W4-2 p.25-26; Apple Notes FE - Normalisation -->

**Common mistake:** if you move `CustomerName` out and forget to leave `CustomerNo` in `Invoice`, you can no longer tell whose invoice it is. At every split, ask: which column lets the original table find its way back to the new one?

### Beyond 3NF

Stopping at 3NF is generally sufficient. BCNF (Boyce-Codd normal form), 4NF, 5NF and 6NF are also defined, but they are not assessed in this subject. Page 30 of the slides lists what is examinable: the normalisation process (1NF → 2NF → 3NF), functional dependencies, and Armstrong's axioms.
<!-- Sources: W4-2 p.27, 30 -->

<a id="topic-5"></a>
## 5. Applying the three steps to new tables

### Student subject records (slides Case study 1)

![W4-2 slide 28 - Case study 1 student subject records](assets/04-normalisation/slide-w42-28.png)

The slides end with a student results table to practise on. Look at the three columns on the left: Student ID, name and date of birth are filled in only on each student's first row and left blank below — just like the invoice spreadsheet, the seven columns on the right are a repeating group. Then notice that INFO90002 is paired with Teacher 4, Tanya Linden, in both students' rows, which tells us that in this data each subject is taught by one teacher.

The student's notes work this exercise (assuming each subject is taught by a single teacher):

```text
Student(StudentID, StudentName, StudentDOB,
        (SubjectID, SubjectName, SubjectFaculty, TeacherID, TeacherName, WhenTaken, Result))
```

| Normal form | Relations |
| --- | --- |
| 1NF | Student(**StudentID**, StudentName, StudentDOB); SubjectRecord(***StudentID***, **SubjectID**, SubjectName, SubjectFaculty, TeacherID, TeacherName, WhenTaken, Result) |
| 2NF | `SubjectName, SubjectFaculty, TeacherID, TeacherName` depend only on `SubjectID`, so move them to Subject(**SubjectID**, SubjectName, SubjectFaculty, TeacherID, TeacherName); SubjectRecord(***StudentID***, ***SubjectID***, WhenTaken, Result) |
| 3NF | `TeacherID → TeacherName` is a transitive dependency: Teacher(**TeacherID**, TeacherName); Subject keeps *TeacherID* |
<!-- Sources: Apple Notes FE - Normalisation -->

**Hard part:** before running the normal-form steps, confirm that the primary key really is unique in business terms. If retakes are allowed, the same student and subject appear twice, and `SubjectRecord`'s key needs `WhenTaken`; if the teacher changes every semester, `TeacherID` depends on `(SubjectID, WhenTaken)` rather than `SubjectID`, and a separate "offering" table is needed — just as the Subject Coordinator table on page 5 uses `(Subject ID, Sem.)` as its primary key.

### Property inspection records (Tut W4)

`StaffPropertyInspection(propertyNo, pAddress, iDate, iTime, comments, staffNo, sName)`, with dependencies `propertyNo, iDate → iTime, comments, staffNo, sName`; `propertyNo → pAddress`; `staffNo → sName`.

| Step | Analysis | Result |
| --- | --- | --- |
| 1NF | A property has many inspections, so `iDate, iTime, comments, staffNo, sName` is a repeating group | Property(**propertyNo**, pAddress); PropertyInspection(***propertyNo***, **iDate**, iTime, comments, staffNo, sName) |
| 2NF | `Property` has a single-attribute primary key; nothing in `PropertyInspection` depends on `propertyNo` alone or on `iDate` alone | Unchanged |
| 3NF | `staffNo → sName` is a transitive dependency | Add Staff(**staffNo**, sName); PropertyInspection keeps *staffNo* |
<!-- Sources: Tut W4 Sol p.5-6 -->

Why is there nothing to do at the 2NF step? Because the partial dependency `propertyNo → pAddress` was already resolved at 1NF, when `pAddress` stayed behind in `Property`. With a well-chosen repeating group, the 1NF step removes the partial dependency along the way.

### Simply delete derived values (Tut W12)

The inventory table has `Quantity, Cost/Unit → InventoryValue`. Since `InventoryValue = Quantity × Cost/Unit` is computed, the fix is not a new table but **dropping the derived column** and calculating it when needed. This is the same rule as "do not write derivable attributes" on page 17: keeping a derived column adds another dependency, and it can go stale as soon as the quantity or unit price changes.
<!-- Sources: Tut W12 Sol p.2; W4-2 p.17 -->

The answer to this exercise also shows another point: the repeating group can be viewed from the item side (one item appears in several departments) or from the department side (one department has several items). The two versions give different 1NF relations, but after finishing 2NF and 3NF both arrive at the same three tables, "item, department, inventory" — the dependencies have not changed, so the final 3NF is the same.

## Self-check

1. A gym records bookings in `ClassBooking(MemberID, MemberName, ClassID, ClassTime, CoachID, CoachName)`, with primary key `(MemberID, ClassID)`. Give one insertion, one deletion and one update anomaly, and name the functional dependency each comes from.
2. Relation `Order(OrderNo, OrderDate, CustNo, CustName)` has primary key `OrderNo`. Is it in 2NF? Is it in 3NF?
3. Normalise `Borrower(BorrowerID, BorrowerName, (BookID, Title, PublisherID, PublisherName, LoanDate))` to 3NF, marking primary keys, foreign keys and PFKs with this note's notation. If the same borrower can borrow the same book several times, how must the primary key change?
4. Relation $R(A, B, C, D, E)$ has dependencies $A \to B$ , $B \to C$ , $AD \to E$ . Find the candidate key, say which dependency violates 2NF and which violates 3NF, and decompose to 3NF.
5. If the `Amount` column were kept in `InvoiceLineItem` in the invoice example, which attributes would it functionally depend on? Why do the slides choose to leave it out from the start rather than split it off at 3NF?
