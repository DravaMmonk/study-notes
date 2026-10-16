# COMP90086 Lecture 22 - Object Detection II

Sources: `lecture/COMP90086-22-ObjectDetection2.pdf` (58 pages). Imported from Canvas Week 11 on 2026-10-13; the cover still says 2021, and some footers still say Week 10. The Week 11 recording has not happened yet, so this note is a preview based on the slides.

This lecture answers: **how can we predict object boxes more directly, remove duplicate results, and evaluate detection quality fairly?**

Learning path: [Single-stage detection](#topic-1) → [Instance masks](#topic-2) → [NMS](#topic-3) → [AP and mAP](#topic-4). The key point is to keep proposal generation, duplicate-box handling and final evaluation distinct.

<a id="topic-1"></a>
## 1. Single-stage detection: predict classes and boxes directly

![PDF 13 - YOLO v1](assets/22-object-detection-ii/slide-13.png)

Following the network from left to right, whole-image features eventually become class scores and box parameters on a grid. YOLO v1 does not first generate a batch of region proposals and then classify each one; it predicts these outputs directly. The "20 classes, 2 boxes" at the right end of the slide belong to the version and settings shown, not a fixed configuration of every YOLO.

SSD also predicts classes and boxes directly, but places reference boxes on feature layers at several resolutions, helping to cover objects of different scales. Single-stage methods skip the explicit proposal stage, but still have to handle class, location and duplicate predictions.

<a id="topic-2"></a>
## 2. Mask R-CNN: which pixels inside the box belong to this object

![PDF 28 - Mask R-CNN branches](assets/22-object-detection-ii/slide-28.png)

In the figure, the ROI features split into class, box and mask branches. Mask R-CNN builds on Faster R-CNN by adding a foreground/background prediction inside the region, so that each detected instance has its own pixel mask.

Semantic segmentation labels both cows as "cow"; instance segmentation must also distinguish cow 1 from cow 2. The difference between the two kinds of output is covered in [Segmentation Lecture 1](19-segmentation-i.en.md#topic-1); here the focus is on how to obtain instance masks from candidate object regions.

<a id="topic-3"></a>
## 3. Key point: NMS removes duplicate boxes

![PDF 35 - Duplicate detections](assets/22-object-detection-ii/slide-35.png)

On the left, the blue and orange boxes mainly cover the same dog, with an IoU of 0.78; the box for the dog on the right overlaps very little with the blue box. Using the slide example's threshold of 0.7, first keep the highest-scoring blue box at 0.9, then suppress the lower-scoring orange box at 0.8 that overlaps it heavily.

Repeating this process is non-maximum suppression (NMS). It is usually done separately for each class. It uses the overlap between predicted boxes and **does not need ground-truth boxes**. In crowded scenes, different objects can also overlap heavily, so NMS may wrongly remove correct detections.

<a id="topic-4"></a>
## 4. Hard part: evaluation must check ranking, class and location together

For one class, sort all detections by score from high to low, then match them to ground-truth boxes using a given IoU threshold. One real object cannot repeatedly earn credit for duplicate detections. As more low-scoring detections are included, compute:

$$
\mathrm{Precision}=\frac{TP}{TP+FP},\qquad
\mathrm{Recall}=\frac{TP}{N_{\mathrm{GT}}}.
$$

 $TP$ is the number of correctly matched detections, $FP$ the number of wrong detections, and $N_{\mathrm{GT}}$ the number of real objects. Precision asks "of what was reported, how much is correct?", and Recall asks "of what actually exists, how much was found?". Accumulating along the score order gives the P–R curve.

![PDF 50 - Class and IoU averaging](assets/22-object-detection-ii/slide-50.png)

The slides explain single-class AP as the area under the P–R curve; mAP then averages over classes. In the figure, the APs for bird, cat and dog are 0.65, 0.80 and 0.86, averaging 0.77. COCO mAP also averages results over multiple IoU thresholds, so it is usually stricter than a score using only the 0.5 threshold; computation details should follow one consistent evaluation protocol.

**Common mistake**: the IoU threshold in NMS decides which predicted boxes are removed; the IoU threshold in evaluation decides whether a prediction is close enough to a ground-truth box. Both use IoU but serve different tasks, and need not take the same value. A high mAP still cannot replace a concrete analysis of misses, false detections and localisation errors.

## Self-test for this lecture

1. Why should outputting ten boxes for one object not score higher than outputting one good box?
2. Does NMS need ground-truth boxes? What about evaluating AP?
3. Why must the IoU threshold or evaluation protocol be stated when comparing mAP?
