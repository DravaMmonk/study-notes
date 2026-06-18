# ADBS Remaining Lecture Supplement Design

## Goal

Append the substantive lecture material identified as missing or too brief to
the end of the COMP90050 ADBS exam sheet. The supplement should favour
exam-ready explanations and readability over minimum page count.

## Scope

- Preserve the existing 44-topic English body and the current Chinese overview.
- Preserve the Week 1 supplement already present in `concepts-zh.tex`.
- Add new Chinese-first supplement boxes after the existing final overview,
  retaining English technical terms, formulas, SQL names and compact examples.
- Cover Weeks 2--12 from the supplied gap summary.
- Do not expand Week 5 beyond a short low-priority note because its fundamental
  reasoning and application templates are already covered.
- Avoid repeating procedures that are already sufficiently detailed; add only
  the missing distinction, rule, example or implementation detail.

## Content organisation

The appended section will be grouped by lecture week:

1. **Week 2 — Query engine, storage and security**
   - Range reduction factors and assumptions.
   - Engine/storage hierarchy, logical versus physical reads.
   - Query Store regression workflow, memory-optimised tables.
   - SQL injection and prepared statements.
   - Security parameterisation versus plan-reuse parameterisation.
2. **Week 3 — Index definitions and variants**
   - Primary/clustering versus secondary/non-clustering indexes.
   - Search key versus primary key.
   - B+ tree file organisation and occupancy/root exceptions.
   - Hash indexes, automatic constraint indexes and filtered indexes.
3. **Week 4 — Transaction programs and TP monitors**
   - Unprotected, protected and real actions.
   - Chained transactions.
   - SQLCA, `WHENEVER`, singleton `SELECT` and cursor execution.
   - Individual TP-monitor services.
4. **Weeks 5--7 — Isolation and advanced concurrency**
   - Week 5 implementation details marked low priority.
   - Transaction input/output model, converse locking theorem and rollback
     theorem.
   - SQL isolation names, Degree 0--3 mapping and phantom rows.
   - OCC validation, snapshot visibility, first-writer-commits, write skew,
     timestamp validation, `READ_COMMITTED_SNAPSHOT` and update locks.
5. **Week 8 — Reliability calculations and RAID**
   - Exact independent-event union and mean-time relationship.
   - RAID 1+0 failure conditions and read/write throughput.
   - Failvote degradation, repairable supermodules and Failfast assumptions.
6. **Weeks 9--10 — Reliable writes, logging and checkpoints**
   - Atomic block-write requirement, duplex-write version selection.
   - Buffer lookup structures, latches versus locks and fuzzy checkpoints.
   - Undo locking/logging, crash during restart and redo-log behaviour.
   - Indirect/manual checkpoints and target recovery configuration.
7. **Week 11 — Distributed and NoSQL details**
   - Weak consistency and per-state consistency choices.
   - Document indexing, MapReduce, column families/locality groups and named
     NoSQL examples.
   - Exact 2PC participant lock-release timing.
8. **Week 12 — Operational recovery, MongoDB and warehouses**
   - Simple, Full and Bulk-logged recovery models and selection rules.
   - Target recovery interval, genuine redundancy and correlated failures.
   - MongoDB terminology, insertion, flexible schema and `$and` filtering.
   - Warehouse refresh-frequency decisions and aggregate-versus-detail rules.

## Presentation

- Use existing breakable `topic`, `formula`, `mini` and `warningbox`
  environments.
- Use compact tables for formal mappings and comparisons.
- Use short worked traces where the summary explicitly calls for execution
  behaviour, especially snapshot write skew and crash-during-restart.
- State exam traps where terms are commonly confused.
- Target an additional two to three A4 landscape pages. If the content exceeds
  that range, reduce repetition and prose before reducing font size.

## Verification

- Compile with XeLaTeX using the existing project workflow.
- Check that every requested gap is represented or deliberately marked as
  already covered/low priority.
- Extract PDF text to confirm formulas, SQL keywords and named mechanisms.
- Render and inspect all newly added pages for clipping, overflow, broken
  tables and unreadably dense boxes.
- Synchronise the generated exam-sheet PDF and Overleaf ZIP.

