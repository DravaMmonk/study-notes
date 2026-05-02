# 1 Core of DBMC
---
## Core of DBMS

- Efficiency
	- Hardware
		- Disks & IO bandwidth
		- Main memory
		- Type of architecture
	- Software / DB tuning
		- Type of DB
		- Indexing
		- Query Optimisation
- Effectiveness
	- Concurrent Users
		- 🖼️Users R&W over the same data
	- Transactions
		- 🖼️Required tasks are all done together
- Security & Reliability
	- Crash recovery
	- Fault tolerance
	- Data duplication

---
## Hardware

### HDD (Hard Disk Drive)

![[assets/Screenshot 2026-03-09 at 1.01.35 pm.png]]


> [!NOTE]- Head
> 
> ![[assets/Screenshot 2026-03-09 at 1.03.58 pm.png]]
> - Magnetic
> - Left: Reader
> - Right: Writer
> - Directions: Represent bitcode - "1" / "0"

$$
\text{HDD access time} = \text{seek time} + \text{rotational time} + \frac{\text{transfer length}}{\text{bandwidth}}
$$

### SSD (Solid-State Drive)

- No moving parts
- Silicon rather than magnetic materials
- No seek/rotational latency
- No start-up times like HDD
- Runs silently
- Random access (speed 2000-3000x rather than HDD)
- Relatively expensive

$$
\text{SSD access time} = \frac{\text{transfer length}}{\text{bandwidth}}
$$

### Memories

![[assets/Screenshot 2026-03-09 at 1.25.47 pm.png]]

Effective memory access time (EMAT): 
$$
EMAT = H \times C + (1 - H) \times M
$$

where, 
$H$ = hit ratio, (hit if the targeted data is in caches)
$C$ = cache access time, 
$M$ = memory access time

### Disk Cache (Buffer)

If the targeted data needs to be transferred from HDD  
- First look into the disk buffer (with a hit ratio & faster access)
- Then seek from the main disk

$$
EDAT = HB \times BC + (1 - HB) \times D
$$

where, 
$HB$ = hit ratio of the disk buffer
$BC$ = buffer access time
$D$ = disk access time

> [!note] Conclution
> ⭐️ Balance between size & speed → highest EMAT/EDAT

---
## Database Types

### Simple Files

- Store as text-based files
- ✅Can be fast for simple applications
- ❌Slow for complex applications
- ❌No *application-dependent optimisation* (update, delete data need to be incorporated manually)
	- ❌ Unnecessary code dev
	- ⚠️Hard to maintain
	- ⚠️Potential increase in unreliability

### Relational DBS

- Store as tables
- ✅Most commonly used, well suited to many applications
- ✅Very reliable
- ✅With ADO, very fast in most cases
- ⚠️Can be slow for some simple applications

### Object-Oriented DBS

- Store as objects+methods
- ✅Easier for applications running on OOPs
- ⚠️More features required
	- nested objects, lists, graphs, trees, ...
- ⚠️Limited applications
	- CAD, GIS, Multi-media, ...
- More common application: RDBS + ORM (Object-Relational Mapping)

### NoSQL

- Store as a flexible format (e.g. JSON)
- ✅Provide more flexibility than RDBS
- ⚠️Can only linearly scale

### NoSQL Types

- Key Value (Redis server) 
	- Store as a collection of key-value pairs
	- ✅Useful for **fast, highly parallel processing** of large data
	- ✅Highly scalable
	- ✅Easy to move from one system to another
	- ⚠️Atomic updates at k-v pair level only
	- ⚠️Simple query only
- Document-Based (MongoDB) 
- Column-Based (BigTable) 
- Graph-Based (Neo4J)

### Deductive DBS

- DDB = DB + Logic Inference
- ✅Allows recursion query
	- ⚠️Higher computation cost
	- ❌Expressive power not required in most of applications
- No commercially available systems but provide ideas for other DBSs

### Spreadsheet

- Spreadsheet (e.g. *Microsoft Excel*) is not a DBS but an **end-user data tool**.
- ✅Easier to use for end-user
- ✅Similar Features

---

## Database Architectures

### Centralised DBS

- Data in one location
- ✅Simple administration
- ✅Effective optimisation
- ⚠️Lack of scalability
- Application: **Client-server architecture**
	- A central data server + UI for clients
	- The server provides necessary functionality
	- ✅Simple administration
	- ✅System recovery is simple

### Distributed DBS

- Data is shared among a group of users
- System provides concurrency, recovery and transaction processing
- ✅Higher scalability
- ⚠️Very hard administration (extra single resource broker needed)
- ⚠️Very hard crash recovery
- ⚠️Higher possibility of inconsistency

### DDBS E1: World Wide Web
 
- No certainty of data availability or consistency
- No central standard for how to store the data
- ✅Higher scalability + flexibility
- ✅Simple Administration (common protocols)
- ⚠️Very hard optimisation process
- ⚠️Higher security risk
- ⚠️Very hard consistency (for transactions)

### DDBS E2: Grid Computing & Databases

- Data stored locally, **Computing Resources** are shared among a group of users
- ⚠️Administration are done locally by the owner of the system

### DDBS E3: P2P Databases

- Data is shared among a group of users but **more highly de-centralised**
	- ✅**Dynamic Membership**: End-users can join and leave the network at will
		- Tech: Replication Graceful Leave + Routing Ping
- Designed mostly for scientific applications
- Administration are done by the owner of the data

### DDBS E4: Cloud Computing

- Data Storage + Computing Resources are **served as a service**
	- ✅On-demand
	- ✅Elastic scaling
	- ✅Pay-as-you-go
	- ✅Virtualised resources
- Types of services
	- Infrastructure as a service (IaaS) - Amazon EC2, Azure VM
	- Platform as a service (PaaS) - Windows, Linux
	- Software as a service (SaaS) - Notion, Slack

---

AWS Elastic Compute Cloud (EC2)  
- VM - access to computing resources

AWS Elastic Block Store (EBS)  
- Block Storage (Volume/Virtual Disk)
- Be accessed by mounting to EC2

AWS Simple Storage Service (S3)  
- Object Storage (Bucket - Objects)
- Be accessed through API/HTTP
