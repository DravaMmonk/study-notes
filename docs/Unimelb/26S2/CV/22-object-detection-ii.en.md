# COMP90086 Lecture 22 - Object Detection II

Sources: `lecture/COMP90086-22-ObjectDetection2.pdf` (**36 pages**, current archive version dated 2026-10-26) and `transcript/COMP90086_2026_SM2 Week-11-F-transcript.txt`. Checked locally on 2026-11-03. Page references use actual PDF page order, rather than retained footer numbers. The previous 58-page PDF is archived under `lecture/superseded/2026-10-13/`.

This lecture connects direct box prediction, set prediction and detection evaluation. The [expanded Chinese note](22-object-detection-ii.md) and [entry index](encyclopedia/07-detection.md) include prerequisites and planned exercises.

<a id="topic-1"></a>
## 1. YOLO v1: direct grid prediction

![PDF 6 - YOLO v1](assets/22-object-detection-ii/slide-06.png)

Read left to right: whole-image features become grid-based class probabilities and box parameters. Twenty classes and two boxes belong to the illustrated configuration, not every YOLO version. YOLO avoids selecting RoIs before classifying them. The original version's coarse grid limits spatial precision, especially for small or crowded objects; this is not a claim about all later variants.

<a id="topic-2"></a>
## 2. DETR: predict a set

![PDF 11 - DETR](assets/22-object-detection-ii/slide-11.png)

The CNN and Transformer encoder produce image representations. Object queries enter the decoder as output slots, each predicting a class and a box, or no object. A query is not a predefined bird or car class. Training uses one-to-one bipartite matching between predictions and ground truth, then evaluates class and box losses. Reordering predictions does not change the represented set, and two true objects cannot independently claim the same prediction.

The original DETR formulation learns to avoid duplicate detections through set prediction, rather than requiring conventional NMS. The current lecture covers DETR in place of the old note's SSD and Mask R-CNN section. Mask R-CNN remains grounded in [Lecture 19](19-segmentation-i.en.md), which introduces instance masks inside object regions.

<a id="topic-3"></a>
## 3. Non-maximum suppression

![PDF 19 - NMS](assets/22-object-detection-ii/slide-19.png)

Keep the highest-scoring box and suppress lower-scoring boxes whose overlap with it exceeds the threshold; repeat on the remaining boxes. In the example, the 0.9 blue box suppresses the 0.8 orange box because their IoU is 0.78 and the threshold is 0.7. Suppressed boxes do not suppress other boxes in later iterations. NMS usually runs per class and needs no ground-truth boxes. It can remove distinct but heavily overlapping objects.

<a id="topic-4"></a>
## 4. Matching, precision, recall and AP

For each class, rank detections across the test set by confidence. Match only to unused, same-class ground-truth boxes in the same image, under the specified IoU protocol. Each true object contributes at most one TP; duplicate detections are FP.

$$
\mathrm{Precision}=\frac{TP}{TP+FP},\qquad
\mathrm{Recall}=\frac{TP}{N_{\mathrm{GT}}}.
$$

With three true objects and the sequence TP, TP, FP, FP, TP, the precision values are 1, 1, 2/3, 1/2, 3/5, and recall is 1/3, 2/3, 2/3, 2/3, 1. These points describe a P–R curve; a single precision value is not AP. AP summarises the curve under a stated integration or interpolation convention.

![PDF 34 - mAP](assets/22-object-detection-ii/slide-34.png)

The illustrated class APs 0.65, 0.80 and 0.86 average to 0.77. COCO-style mAP also averages over IoU thresholds from 0.50 to 0.95 in steps of 0.05. The illustrated COCO mAP of 0.45 requires those additional measurements and cannot be derived from the three class APs alone. NMS overlap thresholds and evaluation matching thresholds have different purposes.

## Self-check

1. With three queries and two objects, what should the unmatched output predict?
2. Why does a duplicate detection not increase recall?
3. Why must a reported mAP specify its evaluation protocol?
