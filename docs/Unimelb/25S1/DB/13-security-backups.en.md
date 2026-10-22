# INFO90002 Week 10 - Database Security and Backups

Sources: `lecture/INFO90002_Week10-2_DbSecurity.pdf`; Apple Notes: CS/25S1/DB — "FE - DB Security".

This lecture asks: **how do you control who can do what to the data? How do you protect data in transit and at rest? How do you get lost data back? What is SQL injection, the most common attack, and how do you prevent it?**

Learning path: [Access control](#topic-1) → [Technical safeguards: firewalls and hardening](#topic-2) → [Data safeguards: encryption and backups](#topic-3) → [Reducing the risk of data loss, and SQL injection](#topic-4).

Key points: the differences between DAC, MAC and RBAC; physical/logical, online/offline and full/incremental backups. Hard parts: combining backup types into a strategy; what replication, clustering and RAID each protect against. Common mistakes: replication and RAID do not replace backups; building SQL by concatenating user input invites injection.

<a id="topic-1"></a>
## 1. Access control

### Policy, model and mechanism

![Slide 03 - Access control policy, model and mechanism](assets/13-security-backups/slide-03.png)

The three plain sub-headings on the page are the three layers from top to bottom, and each says in brackets who is in charge:

| Layer | Content | Responsibility |
| --- | --- | --- |
| Access control policy | High-level rules to grant, revoke or deny access to the database | People and procedures, led by the data administrator / CDO / CSO (see [09](09-dbms-architecture-administration.en.md#topic-1)) |
| Access control model | The formalised policy: identify the role of the person or process attempting a task, check that role's permissions, grant or deny | Procedure |
| Access control mechanism | The means of enforcing the policy | Data and technology |
<!-- Sources: W10-2 p.3 -->

#### The three layers for HR data

![Slide 04 - Access control system example](assets/13-security-backups/slide-04.png)

This page grounds the three layers in a concrete example; the small table at bottom right lists four staff and their roles (HR manager, payroll manager, HR staff, payroll clerk):

- Policy: only HR and payroll managers may see all employee details; HR staff and payroll clerks may not see dates of birth;
- Model: the two kinds of manager see the full employee table; every other role accesses it through a view without the date of birth;
- Mechanism: role-based access control (RBAC), creating the view and granting only the view to the staff role:
<!-- Sources: W10-2 p.4 -->

```sql
CREATE VIEW V_EMPLOYEE AS
SELECT employeeid, firstname, lastname, departmentid, bossid, salary
FROM employee;                       -- no DateOfBirth

GRANT SELECT ON V_EMPLOYEE TO HRstaff;
```
<!-- Sources: W10-2 p.4 -->

How views hide data is explained in [07](07-sql-subqueries-views.en.md#topic-4).

### Three types of access control

![Slide 06 - Discretionary access control](assets/13-security-backups/slide-06.png)

**Discretionary access control (DAC)**: the data owner (or an authorised user) defines permissions for particular users or groups. The right column explains that an authorisation is a triple, subject (user), object (table) and action (DML, DDL, queries), and that it takes the form of authorisation tables, access control lists or capabilities.

![Slide 07 - DAC in operating systems and MySQL](assets/13-security-backups/slide-07.png)

The Windows permission box at bottom left (full control, modify, read… ticked item by item) and the small diagram "owner → chosen users/groups → object" are both DAC: the file owner decides who may do what. The blue text on the right is the list of privileges granted to user `lindent` in MySQL, showing that a DBA also uses DAC to control who can create databases and to stop unauthorised users registering user-defined routines.

![Slide 08 - Mandatory and role-based access control](assets/13-security-backups/slide-08.png)

**Mandatory access control (MAC)**: the vertical axis at top right ranks **data confidentiality levels** from top secret to unclassified, and the system grants access by comparing them with **user clearance levels**, on a "need to know" basis. The upward arrow crossed out in red shows that a data owner cannot downgrade an object from top secret to secret, nor decide who holds top-secret clearance. At bottom right is **role-based access control (RBAC)**: permissions are attached to roles, and roles are assigned to users, e.g. Unix / Linux / Mac groups and a learning management system (LMS).

| Type | Who decides permissions | Characteristics and examples |
| --- | --- | --- |
| Discretionary access control (DAC) | The data owner (or an authorised user) defines permissions for particular users or groups | An authorisation is a triple: subject (user), object (table), action (DML, DDL, query); held as authorisation tables, access control lists or capabilities; UNIX, Windows and Linux file permissions, Google Drive / OneDrive sharing |
| Mandatory access control (MAC) | The system decides from **data confidentiality levels** and **user clearance levels**, on a "need to know" basis | Military systems: the data owner cannot decide who has top-secret clearance, nor change an object from top secret to secret |
| Role-based access control (RBAC) | Permissions are attached to roles, and roles assigned to users | Unix / Linux / Mac groups, a learning management system (LMS) |
<!-- Sources: W10-2 p.5-8; Apple Notes FE - DB Security -->

A DBA can use DAC to control who may create databases and to stop unauthorised users registering user-defined routines. The slides also mention single sign-on (SSO, one ID to log into several related but independent systems) and Active Directory as related mechanisms.
<!-- Sources: W10-2 p.7-8 -->

### Access control in MySQL

Two approaches: grant privileges to each user individually (e.g. `GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, … ON … TO some_user`), or attach privileges to roles and assign roles to users (RBAC). Privileges can be granted at four levels: global (all databases), database, table and column.
<!-- Sources: W10-2 p.7, p.9 -->

<a id="topic-2"></a>
## 2. Technical safeguards: firewalls and hardening

![Slide 10 - Firewalls and the DMZ](assets/13-security-backups/slide-10.png)

The figure on the right runs from left to right: the Internet, a demilitarised zone (DMZ) between two green firewalls, the internal LAN and the database. The zigzag line shows packets being forwarded layer by layer through different ports (Port x, Port y) before they reach the database port inside the LAN.

A **firewall** is a protective layer between an organisation's LAN and the WAN / Internet: software, or a dedicated hardware–software unit, that selectively blocks or allows data packets; all network traffic is quarantined and authenticated; there are often several layers and types of firewall, possibly with a DMZ between them. MySQL uses port 3306 by default, and the database server should sit behind a firewall.
<!-- Sources: W10-2 p.10; Apple Notes FE - DB Security -->

![Slide 26 - Database hardening checklist](assets/13-security-backups/slide-26.png)

Later in the deck the slides give a **database hardening** checklist; it belongs with firewalls under technical safeguards, so it is read here:

- physical hardening: make the server room harder to get into;
- firewalls for database servers;
- database software, application / web servers and application code: patch regularly and check constantly for vulnerabilities;
- super-user accounts, permissions and passwords; user roles, permissions, passwords and reporting;
- auditing;
- backup and recovery;
- client workstations / browsers: the principle of least privilege.
<!-- Sources: W10-2 p.26 -->

<a id="topic-3"></a>
## 3. Data safeguards: encryption and backups

### Encryption

![Slide 11 - Encryption with prime numbers](assets/13-security-backups/slide-11.png)

![Slide 12 - Public and private keys](assets/13-security-backups/slide-12.png)

The figure on the first page: the private key is two very large secret primes, and the public key is their product, from which recovering the two primes is very hard. Read the flow on the second page left to right: the sender encrypts (locks) the document with **the recipient's public key**, and only the recipient's own **private key** can open it.

Encryption turns clear text into gibberish such as `*k4#h2nsk7`, relying on calculations with very large primes; "salting" can then add a byte or two to the encrypted string. **Encryption does not hide data; it masks it.** With public/private keys the public key is broadcast; A encrypts sensitive information with B's public key and sends it, and only B can decrypt it with the matching private key.
<!-- Sources: W10-2 p.11-12 -->

| | Encryption at rest | Encryption in transit |
| --- | --- | --- |
| Protects | Stored, static data (e.g. on disk) | Data moving from one place to another (across the Internet, a private network or between services) |
<!-- Sources: W10-2 p.13; Apple Notes FE - DB Security -->

| Type of encryption at rest | How |
| --- | --- |
| Application-level encryption | The application that modifies or generates the data encrypts it, independent of the database and file system |
| Database encryption | The whole database, or some tables, is encrypted |
| File-system encryption | Only selected file systems or folders are encrypted; anyone can boot the device, but the protected file system needs a passphrase |
| Full-disk encryption | All data on the drive becomes gibberish; the only way to boot the device is to enter a password |
<!-- Sources: W10-2 p.13; Apple Notes FE - DB Security -->

### Why back up

A backup is a copy of your data. If data is corrupted, deleted or held to ransom, it can be restored from the backup. A backup and recovery strategy is needed: a plan for how data is backed up and how it is recovered. Backups protect against human error (an accidentally dropped table), hardware or software failure (application bugs; disk, CPU or memory failure), malicious activity (compromised server, database or application) and natural or man-made disasters; they also help meet government regulations (historical archiving, metadata collection, privacy rules).
<!-- Sources: W10-2 p.15-17 -->

![Slide 18 - Categories of failure](assets/13-security-backups/slide-18.png)

The three small examples on the right match three categories: writing `celery` for `salary` is a statement failure; "unable to connect to the server" is a network failure; `DROP table employee;` followed by a hopeful `Rollback` is a user error. The question mark on the page asks what that does. Extension: `DROP` is DDL and commits implicitly in MySQL, so the following `Rollback` cannot save it; only a backup can.

| Failure category | Example |
| --- | --- |
| Statement failure | A syntax error, e.g. `celery` instead of `salary` |
| User process failure | The process doing the work errors or dies, e.g. Workbench crashes |
| Network failure | The network between user and database fails |
| User error | A user "accidentally" drops rows, a table or a database, e.g. `DROP TABLE employee;` |
| Memory failure | Memory fails or becomes corrupt |
| Media failure | Disk failure, corruption or deletion |
<!-- Sources: W10-2 p.18 -->

### Types of backup

![Slide 19 - Physical vs logical backups](assets/13-security-backups/slide-19.png)

The two columns compare line by line; the table below organises them:

| | Physical backup | Logical backup |
| --- | --- | --- |
| How | Raw copies of files and directories via the operating system | Exported through SQL queries (`mysqldump`, `SELECT … INTO OUTFILE`) |
| Speed and size | Fast; suits large databases needing fast recovery | Slower; output larger than a physical backup |
| Content | Exact copies of the database directories and files, **should include logs** | No log or configuration files |
| Portability | Only to machines with a similar configuration | Machine independent |
| Database during backup | Preferably offline (cold backup); MySQL Enterprise handles file locking automatically | Server stays available |
| Restore | Shut down the DBMS and copy the backup over the current structure on disk | Use `mysqlimport` or `LOAD DATA INFILE` in the client, without stopping the server |
<!-- Sources: W10-2 p.19; Apple Notes FE - DB Security -->

![Slide 20 - Online vs offline backups](assets/13-security-backups/slide-20.png)

Note the blue last line of each column: an online backup can be physical or logical, an offline backup only physical.

| | Online / hot backup | Offline / cold backup |
| --- | --- | --- |
| Database state | Running; clients do not notice | Stopped |
| Requirement | Appropriate locking to keep data consistent | Avoids copying data being updated; simpler |
| Downtime | None | Yes, so unsuitable for applications that cannot stop |
| Applies to | Physical and logical backups | Physical backups only |
<!-- Sources: W10-2 p.20; Apple Notes FE - DB Security -->

![Slide 21 - Full vs incremental backups](assets/13-security-backups/slide-21.png)

The four-step restore on the right is the key part of this page: an incremental backup is mostly log files, and restoring it means having the DBMS redo them, which is exactly what the transaction log in [08](08-transactions-concurrency.en.md#topic-6) is for.

| | Full backup | Incremental backup |
| --- | --- | --- |
| What is backed up | The whole database, everything needed to get it running after a failure | Only the changes since the last backup; for most databases this means the log files |
| How | Physical (online or offline) or logical (online) | |
| Restore | Restore directly | 1. stop the database; 2. copy the backed-up logs to disk; 3. start the database; 4. have the DBMS **redo** the logs |
<!-- Sources: W10-2 p.21; Apple Notes FE - DB Security -->

### Backup strategy and offsite backups

![Slide 22 - Backup strategy](assets/13-security-backups/slide-22.png)

The bar chart at top right: Sunday (Su) is a tall full backup, Monday to Friday (Mo–Fr) are small triangles that back up only that day's changes (the delta), and the next Sunday is another full backup.

- Usually combine full and incremental backups, e.g. a weekly full backup and weekday incrementals;
- back up when the database load is low;
- if the database is replicated, back up from the mirror to avoid slowing the main database;
- **test your backup before you need it!**
<!-- Sources: W10-2 p.22; Apple Notes FE - DB Security -->

![Slide 23 - Offsite backup](assets/13-security-backups/slide-23.png)

**Offsite backup**: if backups are connected to your network, hackers may still reach them. Offsite means the backups are not stored in the organisation's own building, supporting disaster recovery and business continuity. Examples: a regulator requiring the backup site to be 100 km away; backup tapes taken to an underground vault; a remote mirror database maintained by replication; backing up to the cloud. The small figure at bottom right shows that the transfer from server to offsite backup is encrypted too.
<!-- Sources: W10-2 p.23 -->

<a id="topic-4"></a>
## 4. Reducing the risk of data loss, and SQL injection

### What replication, clustering and RAID protect against

![Slide 25 - Other ways to reduce risk of data loss](assets/13-security-backups/slide-25.png)

The three small tables have the same layout, problem × protection, with red meaning not protected. Merged together:

| Measure | Accidental drop or delete | Server failure | Security compromise |
| --- | --- | --- | --- |
| Server replication | Data lost (the delete is replicated too) | Protected | Limited protection |
| Server cluster | Data lost | Protected | Limited protection |
| RAID (redundant array of independent disks) | Data lost | Data may be lost | All data compromised |
<!-- Sources: W10-2 p.25; Apple Notes FE - DB Security -->

**Common mistake:** the first row of all three tables is a red "data loss!": none of these measures stops an accidental delete. The delete is copied faithfully to the replicas, and RAID stores the post-delete state just as well. Only a backup (plus logs) recovers from it.

### SQL injection

![Slide 27 - OWASP top ten](assets/13-security-backups/slide-27.png)

OWASP (the Open Web Application Security Project) lists the ten most common web-application vulnerabilities. In the 2017 list on the left, Injection is first; in the 2021 list on the right it has dropped to third, but it is still in the top ten.

![Slide 29 - SQL built from user input](assets/13-security-backups/slide-29.png)

**SQL injection** exploits web applications that put user input directly into database queries: malicious code entered in a field becomes part of an SQL command run against the database. The attacker aims to learn the database structure (table and column names), view data in important tables (e.g. customer accounts) and add data to tables (e.g. new accounts and passwords).
<!-- Sources: W10-2 p.27-28; Apple Notes FE - DB Security -->

On the left are the login box and the query template, with `@name` and `@pw` as the slots; on the right is what the programmer intended: fill the user name and password into the template.

```sql
SELECT * FROM User
WHERE username = '@name' AND password = '@pw';
-- with the normal input Anne / pass123:
SELECT * FROM User
WHERE username = 'Anne' AND password = 'pass123';
```
<!-- Sources: W10-2 p.29 -->

![Slide 30 - Malicious input](assets/13-security-backups/slide-30.png)

The attacker types `' or 1=1; --` in the user-name box and anything as the password:

```sql
SELECT * FROM User
WHERE username = '' or 1=1; -- ' and password = 'any text';
```
<!-- Sources: W10-2 p.30 -->

The four points on the right are exactly what this input does: the first `'` closes the string; `or 1=1` adds a condition that is always true; `;` ends the statement; `--` starts a comment that neutralises the password check. An empty user name will not match, but `1=1` is always true, so the query returns every user and the login is bypassed.
<!-- Sources: W10-2 p.30 -->

![Slide 31 - SQL injection prevention](assets/13-security-backups/slide-31.png)

| Defence | How |
| --- | --- |
| Primary: prepared statements (parameterised queries) | Pass input as parameters; the SQL structure is fixed and no longer built "dynamically" |
| Primary: stored procedures | Pass input as parameters to a stored procedure rather than building SQL strings in code |
| Primary: escape all user input | Turn SQL special characters such as `'`, `;` and `--` into ordinary characters; block `OR`, `UNION` and similar |
| Additional: principle of least privilege | Do not give application accounts DBA privileges |
| Additional: whitelist input validation | Check that input comes from a list of acceptable values |
<!-- Sources: W10-2 p.28, p.31; Apple Notes FE - DB Security -->

**In other words:** once parameterised, the whole input is treated only as the value of "user name"; `'`, `;` and `--` lose their SQL meaning, so the query's structure cannot change. The database simply finds no user with that name, and the login fails.

**Note:** in the multi-tier architecture of Lecture 14, security can be enforced at several layers: application passwords, database-level privileges and encrypted client/server communication (see [14](14-web-applications.en.md#topic-2)).
<!-- Sources: W11-1 p.19 -->

## Self-check

1. A university rules that "only the subject coordinator may see the whole class's marks; tutors may see only their own tutorial group's marks". Describe an implementation in terms of policy, model and mechanism.
2. Can a 24×7 e-commerce database be backed up cold? What combination do you recommend?
3. A company has master–slave replication and RAID, so it stops taking backups. An intern accidentally runs `DROP TABLE orders;`. What happens?
4. Which of these prevent SQL injection, which are only additional defences, and which are useless: passing input as parameters to a stored procedure; giving the application account DBA privileges to ease debugging; only accepting values chosen from a drop-down list?
