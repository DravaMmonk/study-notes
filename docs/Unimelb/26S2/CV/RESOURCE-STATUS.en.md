# COMP90086 Resource Completeness

Incremental check date: **2026-10-13**. Canvas currently shows Weeks 1–11; this check covered Weeks 9–11, newly added recordings and the Week 8 solutions. Existing resources for Weeks 1–8 are kept; their online versions were not re-audited page by page.

| Week | Slides PDF | Transcript | Workshop | Solutions | Reading Links |
| --- | --- | --- | --- | --- | --- |
| 1 | 2 | 2 | Available | Not applicable | Saved |
| 2–7 (each week) | 2 | 2 | Available | Available | Saved |
| 8 | 2 | 2 (Friday added in this check) | Available | Added in this check | Saved |
| 9 | 1 (1 released on the page) | 1; see the date notes below | Downloaded, with pretrained weights | Downloaded | Added in this check |
| 10 | 2 | 2 | Downloaded | Downloaded | Added in this check |
| 11 | 2 | Lecture dates not yet reached | Both new and old versions kept | No link on the page yet | Added in this check |

There are now **21 lecture slide PDFs and 19 transcripts** stored locally. This check added 5 slide PDFs, 4 transcripts, the Week 9–11 exercises, and the Week 8–10 solutions with their accompanying files, **23 resource files** in total (including original archives, old exercise versions and extracted weights). It also added 5 study notes and 17 selected slide screenshots, each with an explanation alongside.

## Items that are incomplete or need to be kept apart

- The Week 11 recordings are scheduled for 14 and 16 October; as of the check date they are still in the future, so the two object-detection notes are written from the slides and marked as previews.
- The Echo360 entries for 25 September, 30 September and 2 October have no visible Transcript panel or download link. A recording entry alone does not prove a lecture was actually given that day, so these three are not counted as missing lecture transcripts.
- The Week 11 Workshop has no solutions link yet.
- The released lecture numbering jumps from 17 to 19; the Week 9–11 pages checked this time show no Lecture 18 link, so the original numbering is kept.
- Readings Online still returned a Leganto error when rechecked on 13 October. The reading links and book chapters on the weekly pages are saved, but it cannot be confirmed whether an additional list exists; nor does this mean the full text of textbooks or external web pages has been downloaded for offline use.
- External data, model dependencies and download links referenced inside the notebooks were not mirrored separately; no exercises were run and no models were trained in this check.

## Sync and verification

- The **149 categorised resource files** in the course directory and in study notes match file by file on SHA-256; the sources and checksums of the new files are stored in the JSON inventory.
- The 5 new PDFs are readable; the two original Week 9 ZIPs pass integrity checks. All 21 top-level notebooks, stored by week across the library, parse as JSON.
- Two Week 9 pages offer archives with the same name; the exercises and weights inside are identical, differing only in `__MACOSX` metadata. Both original archives are kept, and system metadata and notebook auto-backups were skipped when extracting.
- The Week 11 lecture page provides `worksheet11.ipynb` and the Workshop page provides `worksheet11-old-24.ipynb`; they are saved separately so the old version does not overwrite the new one.
- The cover slides of Lectures 21 and 22 still print 2021, and the footer of Lecture 22 still prints Week 10. These are the source files Canvas currently provides; the covers were not altered, and the files were not re-filed under a different week on that basis.
- The original full Canvas export and the 2026-09-18 Excel sheet are kept as historical snapshots; this page and the JSON inventory record the state after this incremental check.

## Sources and storage locations

- [Canvas Modules](https://canvas.lms.unimelb.edu.au/courses/241625/modules)
- [Course notes index](README.en.md)
- [Reading Links](READING-LINKS.md)
- [Resource inventory](RESOURCE-INVENTORY.json)

`lecture/`, `transcript/` and `workshop/week-NN/` hold the categorised materials, and `workshop/packages/` keeps the original accompanying packages. One copy is kept in the main course directory and one in study notes; original materials and screenshots stay local and are not committed to the repository.
