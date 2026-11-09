# COMP90086 Computer Vision

These notes are written for learners who are new to computer vision. Each lecture first states the problem it sets out to solve and then works through it topic by topic; figures come with a note on what to look at, and the lecturer's own words come with an explanation of what they mean. **Key point / Difficult / Common mistake** mark places that deserve extra attention while studying; they are not predictions of what the exam will cover. Supplementary material is listed briefly or folded away, and each note ends with self-test questions to check your understanding.

## Study by module

| Module | Reading order | Skills to build |
| --- | --- | --- |
| How images are formed and stored | [01 Vision tasks](01-introduction.en.md) → [02 Image formation and arrays](02-basics.en.md) → [05 Light, colour and edges](05-image-formation-ii.en.md) | Tell apart the real scene, its projection and the pixel values |
| How to process images | [03 Spatial filtering](03-filters.en.md) → [04 Frequency filtering](04-fourier.en.md) | Understand local weighted computation, and how frequency shapes an image |
| How to learn image features | [06 CNN basics](06-cnns-i.en.md) → [07 Training CNNs](07-cnns-ii.en.md) → [08 Architectures and transfer](08-cnns-iii.en.md) → [09 ViT](09-vit.en.md) → [10 Representation learning](10-representations.en.md) | Read the information flow, parameters, training objectives and the limits of a model |
| How to match and recover 3D | [11 Local features](11-features.en.md) → [12 Feature matching](12-feature-matching.en.md) → [13 Depth and stereo](13-depth-stereo.en.md) → [14 Two-view geometry](14-two-view-geometry.en.md) | Go from appearance-based candidates to geometric constraints and depth |
| How to generate new images | [15 AE and VAE](15-generation.en.md) → [16 GAN](16-gans.en.md) → [17 Diffusion models](17-diffusion.en.md) | Tell apart reconstruction, adversarial training and step-by-step denoising |
| How to locate and segment objects | [19 Classical segmentation](19-segmentation-i.en.md) → [20 Learned segmentation](20-segmentation-ii.en.md) → [21 Two-stage detection](21-object-detection-i.en.md) → [22 One-stage detection and evaluation](22-object-detection-ii.en.md) | Distinguish pixel grouping, classes, instances and bounding boxes |

While following the course, read the notes in file order 01–22 (21 content lectures; Lecture 18 was cancelled, so the original numbering skips it); when revising, read by topic using the table above. For a hands-on feel for the concepts, see the [Device Gallery](topics/README.en.md): 16 interactive devices cover the first 16 lectures, grouped into five topic notes, and each is also embedded in the matching section of its lecture (they are only visible when reading in Fieldnotes). A concept that recurs across lectures is explained in detail only in its main section; other places link back to it.

Relevant sections link directly to Vision Complete levels. Some levels need parts unlocked in earlier levels; start from the [level map](https://dravammonk.github.io/games/vision-complete/index.html) if needed.

## Where the workshops fit

Workshops are numbered by the week in their package; some Canvas pages have mismatched topic names. The links below follow what the notebooks actually contain.

| Workshop | Main links in the notes |
| --- | --- |
| Week 1 Setup and examples | Image arrays and the basic environment |
| Week 2 Image operations | [02](02-basics.en.md): channel order, cropping, interpolation, unit conversion |
| Week 3 Filtering | [03](03-filters.en.md), [04](04-fourier.en.md): spatial and frequency-domain methods |
| Week 4 Colour and MNIST | [05](05-image-formation-ii.en.md), [07](07-cnns-ii.en.md): brightness, colour, and MLP vs CNN |
| Week 5 CNN parameters and features | [07](07-cnns-ii.en.md), [08](08-cnns-iii.en.md), [10](10-representations.en.md) |
| Week 6 ViT and Grad-CAM | [09](09-vit.en.md), [10](10-representations.en.md): attention distance and class heat maps |
| Week 7 Hough and feature matching | [11](11-features.en.md), [12](12-feature-matching.en.md) |
| Week 8 Calibration, epipolar lines and stereo | [13](13-depth-stereo.en.md), [14](14-two-view-geometry.en.md); solutions now complete |
| Week 9 Autoencoders and GAN | [15](15-generation.en.md), [16](16-gans.en.md); includes pretrained weights and solutions |
| Week 10 Diffusion | [17](17-diffusion.en.md): adding noise, predicting noise and reverse sampling; includes solutions |
| Week 11 Image segmentation | [19](19-segmentation-i.en.md), [20](20-segmentation-ii.en.md); the new version from the lecture page and the old version from the Workshop page are saved separately |

The notes explain the purpose of each original exercise and where it is easy to go wrong; the models in the notebooks were not re-run or retrained for this write-up.

## Resources and sources

- [Resource completeness](RESOURCE-STATUS.en.md): local archive checked on 2026-11-03; distinguishes available sources from unresolved gaps.
- [Reading Links](READING-LINKS.md): all reading links and chapters kept in one place, so the notes do not repeat them.
- [Resource inventory and checksums](RESOURCE-INVENTORY.json): sources, original file names and local checksum records.

Each note opens by listing its PDF and transcripts. Lectures 1–17 and 19–22 have corresponding local transcripts; Lecture 23 Revision also has a transcript. Lecturer quotations refer to verified transcript wording.

Slide screenshot numbers always refer to the **PDF page number**, which may differ from the printed footer number; screenshots of interactive demos are static images. Lectures 10 and 11 retain older cover years; the current L21/L22 covers say 2026, while the copyright line retains 2021. Lectures 15 and 16 retain Week 9 footers. Filing follows the archived course context and topic.

| Local directory | Contents |
| --- | --- |
| `lecture/` | 22 current lecture slide PDFs |
| `transcript/` | 22 transcripts filed by Week/W/F |
| `workshop/week-NN/` | Week 1–11 exercises and accompanying files, Week 2–10 released solutions |
| `workshop/packages/` | Original workshop archives |
| `assets/<topic>/` | PNG screenshots of selected slides |
| `assignment/A1/` | Assignment specification, notebook and test images |
| `exam/` | Practice exam and solutions |

Original course materials and screenshots are kept locally and not committed to the repository. The reusable rules for organising these notes are in the repository at `.agents/skills/study-notes-course-materials/SKILL.md`.

## Assignment 1: available materials

**Sampling, Aliasing, and Filtering**. The original due date was 2026-08-23 23:59, worth 6% of the final grade; this records the original requirements and says nothing about any current extension or submission status.

The tasks cover downsampling and aliasing, Gaussian anti-aliasing, and a run-time comparison of direct 2D filtering, separable 1D filtering and the FFT method. The local `assignment/A1/` keeps the specification, the notebook, `zoneplate.png` and `picket-fence.jpg`; the original specification is authoritative for the exact deliverables.

## Local archive update, 2026-11-03

The current local archive contains 22 slide PDFs (including Lecture 23 Revision), 22 weekly transcripts and 23 workshop notebooks including solutions and the old Week 11 worksheet. Lectures 21 and 22 are no longer previews. The current L22 PDF has 36 pages and covers YOLO, DETR and evaluation. The 2021 copyright line on L21/L22 is not the cover semester. Lecture 18 was cancelled and is not missing material. This was a local check, not a fresh Canvas publication check.

The new [Chinese encyclopedia](encyclopedia/README.md) contains 121 entries with sources, direct prerequisites and activity tiers. [Learning paths](LEARNING-PATHS.md) separate lecture routes, supplementary activities and optional workshop/application topics. These are teaching specifications, not implemented game levels. The detailed new entry material is currently in Chinese.
