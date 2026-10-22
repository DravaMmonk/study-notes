# INFO90002 Weeks 8–9 - Distributed Databases

Sources: `lecture/INFO90002_Week8-2_DistributedDBs.pdf`; Apple Notes: CS/25S1/DB — "FE - Distributed DBs".

This lecture asks: **what are the benefits and the troubles of spreading one logical database over several computers in several places? Should data be replicated or partitioned, and should updates be synchronous or asynchronous?**

Learning path: [What a distributed database is](#topic-1) → [Advantages and disadvantages](#topic-2) → [Objectives and trade-offs](#topic-3) → [Replication and partitioning](#topic-4) → [The CAP theorem and five configurations](#topic-5).

Key points: the pros and cons of replication, horizontal partitioning and vertical partitioning; synchronous versus asynchronous updates. Hard parts: during a network partition you can have consistency or availability, not both. Common mistakes: a distributed database looks like **one** database to users, whereas a decentralised one looks like many.

<a id="topic-1"></a>
## 1. What a distributed database is

![Slide 03 - Distributed vs decentralized definitions](assets/10-distributed-databases/slide-03.png)

Start with the figure at top right: User Mary at Site 1 and User Tom at Site 2 reach the "single logical database" in the purple box through a communications network, yet it actually consists of fragments A1 and A2 held in the two places. The two small figures at bottom right compare the structures: on the left, databases in four locations are joined into one whole by a computer network; on the right, the four locations are not connected.

| | Distributed database | Decentralised database |
| --- | --- | --- |
| Definition | A single logical database physically spread across multiple computers in multiple locations connected by a data communications link | A collection of independent databases that are not networked together as one logical database |
| Users see | One database | Many databases |
<!-- Sources: W8-2 p.3 -->

This subject is concerned with distributed databases. AWS, for example, offers many kinds of database across data centres worldwide, each centre having several "zones" for redundancy and availability.
<!-- Sources: W8-2 p.3-4 -->

![Slide 06 - Distributed memory structures](assets/10-distributed-databases/slide-06.png)

The servers in London, New York and Sydney each have a full set of the memory structures from [09](09-dbms-architecture-administration.en.md#topic-2), and the **cluster manager** in the red box below links them. Each physical server often accesses both its own storage and storage shared by all servers; the cluster manager coordinates communication between the servers, including query processing, multiple concurrency control, storage and crash recovery (the footnote says vendors name it differently).
<!-- Sources: W8-2 p.5-6 -->

<a id="topic-2"></a>
## 2. Advantages and disadvantages

![Slide 07 - Distributed DBMS advantages](assets/10-distributed-databases/slide-07.png)

Two small figures are worth reading: the four blue blocks at the top are ESPN sports scores, each kept in the city with greatest demand (AFL in Melbourne, EPL in London, NFL in New York, Hurling in Dublin); at the bottom, 1 server carrying 33,000 concurrent users on the left becomes 4 servers sharing 9,000 + 12,000 + 7,000 + 5,000 on the right.

![Slide 08 - Distributed DBMS advantages continued](assets/10-distributed-databases/slide-08.png)

The continuation page's three figures show: a row of servers that can keep growing to the right (modular growth); one server with a red cross while the others remain (lower risk of a single point of failure); arrows copying data and logs to another server (support for recovery).

| Advantage | Explanation |
| --- | --- |
| Good fit for geographically distributed organisations and users | Uses the internet; data sits near the site with greatest demand, e.g. AFL scores in Melbourne, EPL scores in London |
| Faster local data access and processing | The workload is shared between servers, e.g. 33,000 concurrent users spread over 4 servers |
| Modular growth | Add servers as load increases |
| Higher reliability and availability | Lower danger of a single point of failure (SPOF) |
| Supports recovery | Data and recovery logs can be replicated across sites |
<!-- Sources: W8-2 p.7-8; Apple Notes FE - Distributed DBs -->

The disadvantages are all costs of "having more places":

| Disadvantage | Explanation |
| --- | --- |
| Complexity of management and control | The database or application must stitch data together across sites: which version is current, where is it, who is waiting to update it |
| Data integrity | If users in two places update the same record at the same moment, who wins? A transaction manager or master–slave design is needed |
| Security | More sites mean a higher chance of breach; network and storage infrastructure need protection from cyber and physical attacks |
| Lack of standards | Vendors use different protocols, hampering interoperability and migration |
| Higher training and maintenance costs | Disk, intra- and inter-network infrastructure, clustering software and network speed all cost more |
<!-- Sources: W8-2 p.9-10; Apple Notes FE - Distributed DBs -->

<a id="topic-3"></a>
## 3. Objectives and trade-offs

### Two objectives

- **Location transparency**: a user or program need not know where data is stored; requests are forwarded automatically to the relevant sites; all data appears as one logical database at one site, and a single query can join tables from several sites;
- **Local autonomy**: when the network connection is lost, a local node keeps working for local users: controlling local data, administering security, logging transactions, recovering from local failures and providing full access to local data.
<!-- Sources: W8-2 p.11-13; Apple Notes FE - Distributed DBs -->

![Slide 12 - Location transparency query](assets/10-distributed-databases/slide-12.png)

The query at the bottom of the page joins `results` and `codes` and filters three sports, NFL, Hurling and EPL; the three arrows show that those rows actually live in London, New York and Dublin. Whoever writes the query never names these places, which is what location transparency means.

### Synchronous versus asynchronous updates

| | Synchronous | Asynchronous |
| --- | --- | --- |
| How | Wait until every involved node has updated before confirming to the requester; if any copy fails, the whole update is aborted | Confirm once the master node is written; other nodes catch up later (in batches, at set intervals) |
| Pros | Data always current, the same answer everywhere; integrity guaranteed, no need to track where the latest copy is | Acceptable response time |
| Cons | Slow responses, heavy network use; the committed record must be identical on every server | Temporary inconsistency is tolerated; harder to plan and design |
| Priority | Consistency first | Availability first |
<!-- Sources: W8-2 p.14, p.24-25; Apple Notes FE - Distributed DBs -->

**In other words:** the more consistency is enforced, the lower the availability. Financial systems usually choose synchronous updates; social-media comments can live with asynchronous ones.
<!-- Sources: W8-2 p.14, p.25 -->

<a id="topic-4"></a>
## 4. Replication and partitioning

![Slide 16 - Distribution options](assets/10-distributed-databases/slide-16.png)

The two globes on the right show "partitioned" (each site holds part of the data) and "replicated" (each site holds a full copy). The three basic options can be combined (hybrid): e.g. partition a user table horizontally and replicate a lookup table everywhere.
<!-- Sources: W8-2 p.16 -->

### Horizontal partitioning

![Slide 18 - Example horizontal partitioning](assets/10-distributed-databases/slide-18.png)

The full teams table at the top is cut by the `Region` column: the two Europe rows (Arsenal, Racing92) go to London, the two APAC rows (Carlton FC, Swifts) to Melbourne, and the two Americas rows (Jets, Yankees) to New York. Every cylinder holds **complete rows**, just fewer of them; for a worldwide list, `UNION` the three back together.

### Vertical partitioning

![Slide 19 - Vertical partitioning](assets/10-distributed-databases/slide-19.png)

This time the columns are cut: three coloured frames are drawn around the players table at the top. The orange frame (ID, first name, last name, biography) goes to Manchester, the blue frame (ID, first name, last name, team, league) to Dublin, and the dark-blue frame (ID, photo, biography) to London. Note that all three keep the `ID` column, and the same column (such as names or biography) can appear in more than one place.

![Slide 20 - Vertical partitioning needs the primary key](assets/10-distributed-databases/slide-20.png)

The note at bottom left is the key point of this page.

**Common mistake:** when photo and biography move to another server under vertical partitioning, that server also needs the player ID (as a PFK), otherwise the two parts cannot be matched back to the same player.
<!-- Sources: W8-2 p.20 -->

| | Horizontal | Vertical |
| --- | --- | --- |
| What is split | Different **rows** of a table at different sites | Different **columns** of a table at different sites |
| Example | A teams table split by region: European teams in London, APAC teams in Melbourne, American teams in New York | A players table: photo and biography in one place, team and league in another |
| Combining data | `UNION` | Joins, which is harder; every part must carry the primary key |
| Suits | Queries selecting whole rows | Aggregate queries on some columns |
<!-- Sources: W8-2 p.17-20; Apple Notes FE - Distributed DBs -->

Both kinds of partitioning share the same pros and cons:
<!-- Sources: W8-2 p.17, p.20 -->

| Advantages | Disadvantages |
| --- | --- |
| Data stored close to where it is used (efficiency) | Inconsistent access speed when crossing partitions |
| Local access optimisation (better performance) | No replication: backup vulnerability, a single point of failure |
| Only relevant data stored locally (security) | |
| Queries can combine partitions (ease of query) | |
<!-- Sources: W8-2 p.17; Apple Notes FE - Distributed DBs -->

### Replication

![Slide 21 - Replication advantages](assets/10-distributed-databases/slide-21.png)

![Slide 22 - Replication needs more storage](assets/10-distributed-databases/slide-22.png)

The first page lists the advantages, and every location on the globe at right holds a full set A–F. The second page quantifies the most obvious disadvantage: on the left a centralised database stores 1 copy of the data; in the middle, spread over 4 servers in Melbourne, London, New York and Dublin, it is 4 copies; the bar on the far right shows the total data size becoming four times as large.

| Advantages | Disadvantages |
| --- | --- |
| High reliability through redundant copies | More storage: every server stores a copy |
| Fast access where the data is used most | Incorrect (stale) data may be read before updates arrive |
| Copies refreshed on schedule can avoid complicated distributed integrity routines | Updates take time, so out-of-date data must be tolerated; updates burden busy nodes |
| Decoupled nodes: transactions proceed even if some nodes are down | Updates place heavy demand on networks, and high-speed networks are expensive |
| Less network traffic at peak times if updates can be delayed | |
<!-- Sources: W8-2 p.21-23; Apple Notes FE - Distributed DBs -->

Replication is currently a popular way to achieve high availability for global systems, offered by most SQL and NoSQL databases; large companies also use content delivery networks (CDNs) that replicate content across a massive array of computers.
<!-- Sources: W8-2 p.21 -->

<a id="topic-5"></a>
## 5. The CAP theorem and five configurations

### The CAP theorem

![Slide 26 - CAP theorem](assets/10-distributed-databases/slide-26.png)

The three circles are Consistency (all clients see the same data, even right after an update or delete), Availability (every client can find a replica even if nodes fail) and Partition tolerance (the system works as expected despite partial network failure). The pairwise overlaps are labelled CA, CP and AP, and the red cross where all three meet says you cannot have all three. The CAP theorem says a distributed system gets at most two; **during a network partition, the system must choose between consistency and availability.**
<!-- Sources: W8-2 p.26; Apple Notes FE - Distributed DBs -->

![Slide 27 - Distributed DBMS architecture](assets/10-distributed-databases/slide-27.png)

The textbook architecture: every site (site 1 … site n) has its own local DBMS and database, with a distributed DBMS and a distributed data repository (holding the catalogue) layered above, and sites connected through communications controllers. User terminals talk only to their own site; requests that cross sites are forwarded by the distributed DBMS.

![Slide 28 - Network partition](assets/10-distributed-databases/slide-28.png)

Imagine a synchronously updated replicated database whose replication link between two data centres breaks (the jagged line in the middle). There are only two choices: shut the system down to avoid inconsistency (choose consistency), or keep it available to users and accept inconsistency (choose availability).
<!-- Sources: W8-2 p.28 -->

### The distributed catalogue

Distributed catalogue management manages metadata about data objects spread across nodes: their location, structure, access rights and other attributes. The catalogue is itself a database and needs a storage scheme; three common ones are centralised catalogues, fully replicated catalogues and partially replicated catalogues.
<!-- Sources: W8-2 p.29 -->

### Five configurations

| Configuration | Description |
| --- | --- |
| Centralised database, distributed access | The database is in one place and accessed from everywhere |
| Replication with periodic (asynchronous) snapshot updates | Many locations, each copy updated periodically |
| Replication with near real-time synchronisation | Many locations, each copy updated in near real time |
| Partitioned, integrated, one logical database | Data partitioned across many sites within one logical database and a single DBMS |
| Partitioned, independent, non-integrated segments | Data partitioned across many sites in independent segments, with multiple DBMSs and computers |
<!-- Sources: W8-2 p.30; Apple Notes FE - Distributed DBs -->

**Note:** comparisons that came up in the student's revision quiz: the centralised configuration is easiest to manage but expands poorly; synchronised replication has the best reliability; partitioned integrated databases have very poor data consistency; independent partitions have the lowest communication overhead. These ratings come from the configuration comparison in the textbook the slides cite (Hoffer et al.).
<!-- Sources: Apple Notes Double Check; W8-2 p.2 -->

### What a distributed DBMS must do

- locate data with a distributed catalogue (metadata);
- decide where to retrieve data and process the parts of a query;
- translate between nodes running different local DBMSs (via middleware);
- keep data consistent with multiphase commit protocols;
- control global primary keys;
- scale;
- handle security, concurrency, query optimisation and failure recovery.
<!-- Sources: W8-2 p.31 -->

## Self-check

1. A multinational retailer has stores in Sydney, London and New York; each site queries only its own stock, but head office totals worldwide sales. Which partitioning suits the stock table? Would the total use `UNION` or `JOIN`?
2. A product catalogue rarely changes and is read heavily everywhere. Replicate or partition? Synchronous or asynchronous updates?
3. Online-banking balances must be globally consistent at all times. During a network partition, should the system choose CP or AP, and at what cost?
4. An employee table is split vertically into "basic details" and "salary", stored in two places. What has to happen to answer "each department's average salary with employee names", and what must the split preserve?
