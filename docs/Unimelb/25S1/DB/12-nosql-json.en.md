# INFO90002 Week 10 - NoSQL Databases and JSON

Sources: `lecture/INFO90002_Week10-1_JSON_NoSQL.pdf`; `tutorial/Week11_Tute_NoSQLBooster.pdf`, `tutorial/Week11_Tute_NoSQLBooster_SOLUTIONS.pdf`; Apple Notes: CS/25S1/DB — "FE - JSON NoSQL".

This lecture asks: **when is a relational database not enough? What kinds of non-relational (NoSQL) database exist, and how does each store data? How does a JSON document differ from a relational table?**

Learning path: [Why NoSQL](#topic-1) → [Four kinds of NoSQL database](#topic-2) → [ACID and BASE](#topic-3) → [JSON and document databases](#topic-4).

Key points: schema on write versus schema on read; ACID versus BASE; which data suits each NoSQL type. Hard parts: when a document database should embed child documents and when it should split them out. Common mistakes: NoSQL does not mean "no SQL"; it means "non-relational".

<a id="topic-1"></a>
## 1. Why NoSQL

### Strengths and weaknesses of relational databases

In a relational database every table has a schema, every column a pre-defined size and data type, and every row must conform to the table design; tables are related by foreign keys and duplication is eliminated, so a piece of information is ideally stored once and changed once; SQL retrieves the data. But relational databases are **not good with "big" data** and **not good with distributed (especially partitioned) databases**.
<!-- Sources: W10-1 p.2 -->

### The three Vs of big data

![Slide 03 - Big data: volume, variety, velocity](assets/12-nosql-json/slide-03.png)

The three blue capitalised words on the page are the three Vs:

| V | Meaning |
| --- | --- |
| Volume | Much larger quantities of data than traditional relational databases |
| Variety | Many different data types and formats |
| Velocity | Data arriving very fast, e.g. mobile sensors, click streams |
<!-- Sources: W10-1 p.3; Apple Notes FE - JSON NoSQL -->

Read the last two lines together: NoSQL adoption is driven by these relational weaknesses, but relational DBMSs will not go away.
<!-- Sources: W10-1 p.3 -->

### Schema on write versus schema on read

| | Schema on write | Schema on read |
| --- | --- | --- |
| When the structure is set | A data model exists first, and data must conform when written (relational databases; see [03](03-logical-physical-design.en.md#topic-2)) | Capture and store the data first, decide the model later according to how it will be used (XML, JSON) |
| Typical of | SQL / relational databases | NoSQL |
<!-- Sources: W10-1 p.4; W3-1 p.22; Apple Notes FE - JSON NoSQL -->

### The problem with distributed data

Distributed, and especially partitioned, databases are a poor fit for relational features such as foreign keys and transactions: the data a foreign key refers to may live at a remote site, and network latency creates resource bottlenecks (partitioning options are in [10](10-distributed-databases.en.md#topic-4)).
<!-- Sources: W10-1 p.5 -->

<a id="topic-2"></a>
## 2. Four kinds of NoSQL database

A NoSQL database is a non-relational database. The slides introduce four kinds in order: key-value, column family, graph, document.
<!-- Sources: W10-1 p.6, p.34 -->

### Key-value store

![Slide 07 - Key-value store](assets/12-nosql-json/slide-07.png)

The table at top right has only two columns: `Key` (K1…K5) and `Value`. Note that the values have different shapes: some are comma-separated strings, some mix dates and numbers. **Key = primary key; value = anything** (number, array, image, JSON); there is no query language, and the application interprets what the value means. Typical uses are login session data and shopping carts; the main advantage is scalability and easy distribution across machines. Examples: Redis, Riak, Memcached, Berkeley DB.

### Column family (wide column)

![Slide 08 - Column family](assets/12-nosql-json/slide-08.png)

The `AuthorProfile` column family on the right has three rows: Mahesh has gender, expertise and rank columns; David has gender and book; Allen has city, book and rank. **Each row has different columns**; each column is a name/value pair with a timestamp belonging to its own row, rather than spanning all rows as in a relational table. Column-family data is stored by column on disk, so column-wise analysis is faster; it is not for OLTP. Examples: Cassandra, BigTable, HBase, DynamoDB.
<!-- Sources: W10-1 p.8-9 -->

### Aggregate-oriented databases

![Slide 10 - Aggregate-oriented databases](assets/12-nosql-json/slide-10.png)

Key-value, document and column-family stores are **aggregate-oriented** databases in Fowler's terminology: a whole aggregate of related data is stored together (in the figure at top right an order is kept in one block with its lines, payment and address), there is less need for transactions, and storage on clusters and distributed systems is efficient; the drawback is that analysing across subfields of aggregates is hard: a table like the one at bottom right, "revenue by product", requires opening up every order block.
<!-- Sources: W10-1 p.10; Apple Notes FE - JSON NoSQL -->

### Graph database

![Slide 12 - Graph database](assets/12-nosql-json/slide-12.png)

A graph consists of nodes and edges: nodes are entities, edges are relationships, both can have properties and types, and connected nodes physically "point" to each other in the database. The table at bottom right is the page's evidence: finding "friends of friends" is fast at depth 2 in both a relational database and Neo4j; at depth 4 the relational database takes over 1,500 seconds and Neo4j about 1.4 seconds; at depth 5 the relational database does not finish. Typical uses: who talks to whom on social media, road networks, networked devices, geospatial data. Examples: Neo4j, OrientDB, FlockDB.

![Slide 13 - Neo4j example graph](assets/12-nosql-json/slide-13.png)

In this Neo4j example graph, the circles are labelled nodes (Movie, Actor, Director, User, Genre), the arrows are relationships (ACTED_IN, IN_GENRE, DIRECTED, RATED) and the boxes are properties. Note that the `RATED` edge has its own properties: a rating and a timestamp.

![Slide 14 - Neo4j Cypher query](assets/12-nosql-json/slide-14.png)

Neo4j queries graph patterns in the Cypher language. On the page the left column names each step, the middle column is the statement and the right column explains it: find "user –rated→ movie" paths, keep titles containing Matrix, count reviews per movie, return the movie and count, sorted by count descending, top 5:
<!-- Sources: W10-1 p.13-14 -->

```text
MATCH (m:Movie)<-[:RATED]-(u:User)
WHERE m.title CONTAINS "Matrix"
WITH m.title AS movie, COUNT(*) AS reviews
RETURN movie, reviews
ORDER BY reviews DESC
LIMIT 5;
```
<!-- Sources: W10-1 p.14 -->

### Document database

![Slide 15 - Document database](assets/12-nosql-json/slide-15.png)

A document database is like a key-value store, except that the "value" (a document, i.e. an object represented in JSON) can be examined, queried and updated by the DBMS. The cyan box on the right is headed `<Key=CustomerID>`, and the whole JSON below it is the value: the customer's name, company, an array of likes and a billing-address object. **A "document" here is not a Word or PDF file.** It suits semi-structured data such as content and user profiles. Examples: MongoDB, CouchDB, RavenDB.
<!-- Sources: W10-1 p.6-15; Apple Notes FE - JSON NoSQL -->

#### Illustrative example: choosing a NoSQL type (adapted from Tut W11)

| Library requirement | Suitable type | Reason |
| --- | --- | --- |
| Catalogue entries have author, title, publisher plus any extra fields the cataloguer chooses | Column family | Each row can have different columns |
| Each catalogue record is a complete document in an industry-standard format (MARC) | Document | A record is one structured document |
| Store cover images: JPEG, PNG, PDF or a URL | Key-value | The value can be anything; images are not structured data like a document |
| Track which papers cite which | Graph | Papers as nodes, citations as edges, good at relationship queries |
<!-- Sources: Tut W11 Sol p.5-6 -->

<a id="topic-3"></a>
## 3. ACID and BASE

![Slide 17 - ACID vs BASE](assets/12-nosql-json/slide-17.png)

| Relational databases: ACID | NoSQL: BASE |
| --- | --- |
| Atomicity, Consistency, Isolation, Durability (see [08](08-transactions-concurrency.en.md#topic-1)) | Basically Available, Soft state, Eventual consistency |
| Consistency over availability | Availability over consistency |
<!-- Sources: W10-1 p.17; Apple Notes FE - JSON NoSQL -->

The three bold paragraphs on the page define the letters of BASE in turn:

- **Basically available**: the system guarantees availability and answers every request, but the data may be inconsistent or changing;
- **Soft state**: the system's state may change over time even without input, because eventual consistency is still in progress;
- **Eventual consistency**: the system becomes consistent once it stops receiving input; data propagates everywhere it needs to sooner or later, but the system does not check every transaction's consistency before moving on to the next.
<!-- Sources: W10-1 p.17 -->

**Contrast:** a relational database usually holds a single copy of the data and enforces strong consistency: after an update every user sees the new value immediately, and nobody should see an out-of-date bank balance. Document databases are often replicated to handle high query volumes, and changes propagate to the replicas (e.g. a changed customer address updates several documents and several replicas over time), so all data is eventually updated. The question is: does everyone need to see the very latest comment immediately? This is the same question as the CAP trade-off in [10](10-distributed-databases.en.md#topic-5).
<!-- Sources: W10-1 p.18 -->

<a id="topic-4"></a>
## 4. JSON and document databases

### JSON syntax

JSON (JavaScript Object Notation, pronounced "Jason") represents an object and its properties: an object is a set of attribute–value pairs whose values can be arrays or other objects, giving a **tree structure**. It was originally used to transmit data between computers and is now the storage format of document databases. It is **not normalised, not even 1NF**: a property can hold an array or a nested object, i.e. several values in one cell.
<!-- Sources: W10-1 p.21; Apple Notes FE - JSON NoSQL -->

![Slide 22 - What is JSON](assets/12-nosql-json/slide-22.png)

The example `my_it_skills` on the left is an object whose `programming` and `database` are each an array, and the array elements are objects with `name` and `yearstarted`. The red text on the right gives the syntax rules:

- curly braces `{ }` are containers (objects);
- square brackets `[ ]` hold arrays, with elements separated by commas;
- names and values are separated by a colon; values (and in some notations names) are in double quotes;
- "name–value", "key–value" and "attribute–value" pair mean the same thing (blue text at top right);
- human-readable and hierarchical (values can contain values).
<!-- Sources: W10-1 p.22 -->

#### Illustrative example (our own): one customer document

```json
{
  "_id": "C2045",
  "name": { "first": "Fred", "last": "Smith" },
  "phones": ["0400 111 222", "03 9000 1234"],
  "orders": [
    { "orderNo": 3224, "items": [ { "code": "P1", "qty": 2 }, { "code": "P3", "qty": 1 } ] }
  ]
}
```

This single document contains a nested object (`name`), an array (`phones`) and an array of objects (`orders`, each with its own `items` array). A relational database would split the same information into four tables: customer, phone, order and order line (compare [04](04-normalisation.en.md#topic-3)).

### Documents compared with relational tables

The slides build up the same orange comparison table page by page (Leonard Lobel's diagrams), adding one contrast each time:

| Relational database | Document database |
| --- | --- |
| Data in rows: 3 customers, 3 rows | Data in documents: 3 customers, 3 documents (flexibly arranged) |
| Each row has several columns | Each document has several properties |
| Every row must conform to the schema (strongly typed) | **Schema free**: each document may use any properties, but every document must have an ID property |
| Indexes created as needed | **Every property is indexed automatically** when a document is added, so any data is retrieved quickly |
| Highly normalised, related by foreign keys, joined at query time with a performance overhead | Usually denormalised: related data in the same document, so queries are simple, fast and need fewer joins |
| Redundancy eliminated | Documents contain redundant data, e.g. the same product description repeated in many documents |
<!-- Sources: W10-1 p.24-29; Apple Notes FE - JSON NoSQL -->

![Slide 26 - Documents are schema free](assets/12-nosql-json/slide-26.png)

The three rows of the relational table at bottom left have exactly the same columns; of the three documents on the right, Document 1 uses `name`, Document 2 uses `fullName`, and Document 3's `fullName` is an object with `first` and `last`. All three can live in the same collection; the only shared requirement is an `id`.

![Slide 28 - Normalised vs denormalised](assets/12-nosql-json/slide-28.png)

Bottom left is the relational way: a `User` table and a `Holdings` table linked by `UserID`; bottom right is the document way: user John Smith's holdings sit as an array inside his document. Fetching this user with his holdings is one read in the document model and a join of two tables in the relational one.
<!-- Sources: W10-1 p.28 -->

![Slide 29 - Redundant data in documents](assets/12-nosql-json/slide-29.png)

The price of denormalisation is in the three order documents at the bottom: the description "Black chair" for product "BC" is written out again in both John Smith's and Adam Stark's orders. A relational database would store the description once, in a product table.

### Parent and child: embed or split

![Slide 30 - Parent and child in one document](assets/12-nosql-json/slide-30.png)

The post document on the left embeds its comments (the "children" of a 1:M) directly, which is reasonable when the number of comments is limited; the document on the right, carrying comment number 1,598,873, is crossed out: **when the number of children may be unlimited, do not cram them all into one document**.
<!-- Sources: W10-1 p.30 -->

![Slide 31 - Comments as separate documents](assets/12-nosql-json/slide-31.png)

![Slide 32 - One hundred comments per document](assets/12-nosql-json/slide-32.png)

The first page splits each comment into its own document, each carrying a `postid` back to the post, which is a 1:M between documents; the second page is the compromise: the post document holds the first 100 comments, and later comments go 100 to a document (#301–#400 in one).

| Option | How | Suits |
| --- | --- | --- |
| Embed | Put the child array inside the parent | A limited number of children |
| Normalised documents | Each comment is its own document referring to the post ID, a 1:M between documents | Many or unlimited children |
| Hybrid | Each document stores a batch (e.g. 100) of comments | Balancing read efficiency and document size |
<!-- Sources: W10-1 p.30-32; Apple Notes FE - JSON NoSQL -->

### Working with a document database

Data in a document database is also manipulated with JSON. In MongoDB, `db.<collection>.find()` is equivalent to `SELECT … FROM <table>`, with the collection name in place of `<collection>`. "Browser" tools such as Compass, Studio 3T and NoSQLBooster exist, and some translate SQL into JSON queries.
<!-- Sources: W10-1 p.34 -->

Browsing MongoDB sample data in NoSQLBooster in the tutorial, notice:

- selecting a collection gives a default query of the form `SELECT * FROM <collection>`, and "Query Code" reveals the matching `db.companies.aggregate…` form;
- in tree view the document is at the top with properties nested by level, hence "tree"; properties like `acquisitions` are arrays;
- comparison operators are written like `$gt` (greater than); replacing `find` with `count` counts directly;
- double quotes are for object (field) names, single quotes for strings;
- adding "signature dish" details to a restaurant document means inserting a nested object that itself holds an array of diet tags.
<!-- Sources: Tut W11 Sol p.1-5 -->

**Note: four advantages of NoSQL (tutorial summary)**: flexible modelling (no fixed schema, suiting loosely structured data); scalability (horizontal scale-out with cheap servers); performance (routing users to the nearest data centre); high availability (data spread over many instances, with automatic failover when nodes fail).
<!-- Sources: Tut W11 Sol p.8-9 -->

## Self-check

1. Why is a JSON document said to be "not even 1NF"? Name the properties in the customer document above that break 1NF.
2. An IoT platform receives tens of thousands of sensor readings per second in varied formats and decides later how to analyse them. Is schema on write or schema on read the better fit?
3. Each article on a blogging system may collect hundreds of thousands of comments. Should the comments be embedded in the article document or split into separate documents?
4. After a post on a social app, some friends see it only a few seconds later. Which part of BASE is this? Why can a bank transfer not behave like this?
