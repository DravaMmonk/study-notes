# COMP90086 Lecture 22 - Object Detection II

Sources: `lecture/COMP90086-22-ObjectDetection2.pdf` (2026 version, 36 pages, Canvas file 29006972); `transcript/COMP90086_2026_SM2 Week-11-F-transcript.txt` (2026-10-16). Updated 2026-10-26. Page numbers below refer to PDF pages, since printed slide numbers are discontinuous. The earlier 58-page file is preserved under `lecture/superseded/2026-10-13/`; this note follows the new version.

This lecture asks: **how can a model directly predict a set of objects, avoid duplicate detections and evaluate its results?**

Learning path: [YOLO](#topic-1) → [DETR](#topic-2) → [NMS](#topic-3) → [AP and mAP](#topic-4). Keep model outputs, duplicate handling and evaluation against ground truth separate.

<a id="topic-1"></a>
## 1. YOLO predicts classes and boxes from the whole image

![PDF 6 - YOLO v1](assets/22-object-detection-ii/slide-06.png)

Read left to right: whole-image features become class scores and box parameters on a grid. YOLO v1 predicts these directly rather than proposing regions and then classifying each one. The “20 classes, 2 boxes” at the right belongs to the illustrated version and configuration, not every YOLO model.

Each box has a centre, width, height and confidence score. A grid cell predicts objects whose centres lie in its region. When objects crowd into a small region, the finite grid and box count limit what it can express. These slides discuss early YOLO v1; its speed and accuracy comparisons do not automatically apply to later versions.

<a id="topic-2"></a>
## 2. Difficult: why DETR treats detection as set prediction

DETR (Detection Transformer) outputs a set of class–box pairs. Their order should not matter: listing the left horse before or after the right horse describes the same detection result.

![PDF 11 - DETR encoder and decoder](assets/22-object-detection-ii/slide-11.png)

From left to right, a CNN extracts image features and a Transformer encoder exchanges information across positions. The decoder combines this image information with **object queries**, producing one class and one box per query.

Think of a query as a learned output slot. It is neither a typed question nor a predefined region proposal. The slides use $N=100$ slots: if the image contains fewer than $N$ objects, unused slots should predict **no object**. Thus $N$ limits the number of possible detections; it does not mean that every image contains 100 objects.

### One-to-one matching before the training loss

![PDF 13 - Set prediction matching](assets/22-object-detection-ii/slide-13.png)

Ground truth is on the left and predictions on the right. Arrows cross rows because the first prediction need not correspond to the first answer. Training finds a one-to-one assignment across the sets using class and box costs, then computes losses for the assigned pairs. Slots not assigned to real objects learn to predict no object, with a lower loss weight for that class.

**Common mistake**: several predictions cannot all receive a correct assignment to the same horse. One-to-one training teaches the model to produce a non-duplicated set, so the original DETR introduced here normally does not need NMS to remove duplicate boxes. This does not guarantee that it never makes false detections or misses objects.

| Method | Prediction structure | Main distinction |
| --- | --- | --- |
| Faster R-CNN | Proposed regions → classes and box corrections | Two stages; see [Lecture 21](21-object-detection-i.en.md#topic-3) |
| YOLO v1 | Class and box maps on a grid | Direct predictions can overlap |
| DETR | Query slots → classes and boxes | Set prediction with one-to-one matching during training |

<a id="topic-3"></a>
## 3. NMS removes repeated reports of the same object

![PDF 19 - Duplicate detections](assets/22-object-detection-ii/slide-19.png)

The blue and orange boxes cover the same left-hand dog with IoU 0.78. The boxes around the other dog overlap little with the blue box. With the slide example's threshold of 0.7, keep the highest-scoring blue box (0.9), suppress the lower-scoring orange box (0.8), and continue with the remaining boxes.

This is non-maximum suppression (NMS), usually performed separately for each class. It compares **predictions with predictions**, requiring no ground-truth boxes. Different objects can also overlap heavily, so NMS may remove a correct detection in a crowded scene.

<a id="topic-4"></a>
## 4. AP and mAP check ranking, class and position

For one class, rank test-set detections by score, then match them to ground-truth boxes of that class using the chosen IoU threshold. A real object can be successfully matched only once; duplicate detections count as errors rather than extra credit. As progressively lower-scoring detections are included, compute:

$$
\mathrm{Precision}=\frac{TP}{TP+FP},\qquad
\mathrm{Recall}=\frac{TP}{N_{\mathrm{GT}}}.
$$

$TP$ counts correct matches, $FP$ counts false detections and $N_{\mathrm{GT}}$ counts real objects. Precision asks how many reported detections are correct; recall asks how many real objects were found. Accumulating these values along the ranking produces a P–R curve. AP summarises its area for one class; the evaluation protocol specifies the interpolation rule.

![PDF 34 - Class and IoU averaging](assets/22-object-detection-ii/slide-34.png)

Bird, cat and dog AP are 0.65, 0.80 and 0.86, giving mAP@0.5 = 0.77 after averaging over classes. COCO mAP also averages across IoU thresholds from 0.50 to 0.95 in steps of 0.05. Stricter thresholds demand closer boxes, so these two scores are not directly interchangeable.

**Common mistake**: the NMS IoU threshold controls which predictions are removed; the evaluation IoU threshold controls whether a prediction matches ground truth. Their purposes differ and their values need not be equal.

## Workshop 12: trace the score back to individual errors

`workshop/week-12/worksheet12_colab_new.ipynb` runs pretrained TensorFlow 2 detectors and uses FiftyOne for metrics and image-level inspection. Compare models on the same data and evaluation settings, then inspect misses, false positives and misplaced boxes to explain a score difference.

Canvas explicitly states that the problems are already solved inside the notebook, so **there is no separate Week 12 solution**. Colab is recommended. This import did not execute the notebook or download its external datasets or models.

## Self-test

1. Why do 100 DETR queries not imply 100 real objects in every image?
2. At which stages do one-to-one matching and NMS address duplicate predictions?
3. What evaluation settings must agree before two reported mAP scores can be compared?
