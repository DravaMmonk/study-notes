# COMP90086 Lecture 19 - Image Segmentation I

Sources: `lecture/COMP90086-19-Segmentation.pdf` (50 pages); `transcript/COMP90086_2026_SM2 Week-10-W-transcript.txt` (2026-10-07); the Week 11 segmentation exercise. Imported 2026-10-13. Canvas jumps from Lecture 17 to 19 and no Lecture 18 link was seen this time, so the course's original numbering is kept.

This lecture answers: **how can we cut an image into regions that are similar inside and different from one another?** This lecture works mainly from colour and position, without first requiring the network to recognise "what this is".

Learning path: [The goal of segmentation](#topic-1) → [Pixel clustering](#topic-2) → [Superpixels and merging](#topic-3). The key point is the choice of features and similarity; the common mistake is treating "a patch of similar colour" as "one object".

<a id="topic-1"></a>
## 1. Cutting out regions is not the same as recognising classes

Ordinary segmentation divides an image into regions; **semantic segmentation** assigns each pixel a class, such as cow, grass or sky; **instance segmentation** additionally numbers two cows separately.

Clustering by colour alone may group green leaves with green clothing, or split different-coloured parts of the same animal. So "clustering succeeded" is not the same as "object recognition succeeded". This lecture first builds regions; the next lecture discusses [pixel classification](20-segmentation-ii.en.md).

<a id="topic-2"></a>
## 2. Key point: which features to use to judge pixel similarity

K-means first fixes the number of clusters $K$ , then alternates between assigning pixels to the nearest centre and updating the centres. Using only RGB, it groups pixels by how close their colours are, regardless of whether two pixels are adjacent.

![PDF 25 - Spatial and colour features](assets/19-segmentation-i/slide-25.png)

On the left is the original image; on the right, position and colour are represented together. In the figure $x,y$ are position axes and $A$ is one component of Lab colour. Adding position lets spatial distance also influence clustering.

**Common mistake**: $(x,y,R,G,B)$ is a hand-constructed five-dimensional feature. The colour of an RGB pixel is still three-dimensional; position is extra information that has been added. Position and colour have different numerical scales, so their relative weighting cannot be ignored.

### Mean shift: keep moving towards nearby denser locations

Mean shift starts from the current position, computes the weighted average of nearby samples, then moves to that average; closer points usually get larger weights. After repeating, points that head to the same dense region are put into the same cluster. It uses a bandwidth to control "how large a neighbourhood counts as nearby", and does not require specifying the number of clusters in advance like K-means.

![PDF 26 - Mean shift bandwidth comparison](assets/19-segmentation-i/slide-26.png)

This set of images should be read in two directions: going down increases the overall bandwidth, merging more detail; going right increases the ratio of spatial bandwidth to colour bandwidth, so pixels farther away can also influence each other. It shows how parameters change the scale of regions; fewer regions alone does not make a result better.

<a id="topic-3"></a>
## 3. Superpixels: get small regions first, then discuss merging

A **superpixel** is a small group of spatially adjacent pixels with similar features such as colour. It is usually smaller than a complete object and serves as an intermediate representation for further processing.

Pages 31–33 of the slides introduce SLIC: initialise centres near an image grid, measure similarity using both colour difference and position difference, and update groupings locally; afterwards, disconnected small fragments still need to be handled. Colour similarity and spatial connectivity are two different conditions.

![PDF 36 - Region adjacency graph](assets/19-segmentation-i/slide-36.png)

The RAG in the figure and text is a "region adjacency graph": each node represents a region, edges connect only adjacent regions, and edge weights record their difference. Adjacent regions with small differences can be merged; after merging, differences are recomputed before deciding the next step. This is more compact than processing pixel by pixel, and also preserves region adjacency.

**Supplement**: the closing slides use GrabCut to illustrate interactive foreground/background separation; a user-specified region helps identify the intended object.

<a id="mask-rcnn"></a>
### Mask R-CNN: from an object box to its pixel mask

![PDF 44 - Mask R-CNN](assets/19-segmentation-i/slide-44.png)

Read left to right: the detector extracts features for candidate regions, then branches into class, box and mask predictions. Different colours at the right identify different people. Each instance gets its own foreground/background mask, separating people rather than merely assigning all of them the same class. See [Faster R-CNN](21-object-detection-i.en.md#topic-3) for the detection backbone.

## Workshop connection

`workshop/week-11/worksheet11.ipynb` covers K-means, Mean shift, superpixels and graph methods. `worksheet11-old-24.ipynb` is an older version still linked from another Canvas page, kept separately. When comparing results, fix the same image and observe whether a parameter change affects boundaries, the number of regions or colours; do not equate "smoother" with "more correct".

The official `worksheet11_solution.ipynb` is now archived beside the worksheet.

## Self-test for this lecture

1. Why might clustering with RGB alone put two distant objects in the same group?
2. What is the relationship between superpixels and complete objects?
3. Why might the RAG's edge weights need to be recomputed after merging regions?
