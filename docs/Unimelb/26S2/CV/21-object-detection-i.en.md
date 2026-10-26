# COMP90086 Lecture 21 - Object Detection I

Sources: `lecture/COMP90086-21-ObjectDetection.pdf` (2026 version, 55 pages, Canvas file 28975448); `transcript/COMP90086_2026_SM2 Week-11-W-transcript.txt` (2026-10-14, beginning with a continuation on SAM). Slides and transcript updated 2026-10-26. References use PDF page numbers. The earlier version with a 2021 cover is preserved under `lecture/superseded/2026-10-13/`.

This lecture answers: **beyond knowing what is in an image, how do we point out where each object is?**

Learning path: [Boxes and IoU](#topic-1) → [R-CNN](#topic-2) → [Fast and Faster R-CNN](#topic-3). The key point is which step's computation each of the three methods reduces.

<a id="topic-1"></a>
## 1. Detection needs a class and also a location

A detector outputs object classes, confidence scores and bounding boxes. The most direct approach is to scan the image with windows of different sizes and positions and decide whether each window contains a target; the more windows, the worse the repeated computation.

![PDF 14 - Bounding-box overlap](assets/21-object-detection-i/slide-14.png)

The two boxes in the figure do not overlap completely. The intersection is the area covered by both boxes, and the union is the area covered by at least one of them:

$$
\operatorname{IoU}(A,B)=\frac{|A\cap B|}{|A\cup B|}.
$$

In this example the intersection area is 18 and the union is 51, so the IoU is about 0.35. A larger IoU means the box positions are closer; it does not check whether the class was judged correctly. Detection evaluation must check both class and box matching.

<a id="topic-2"></a>
## 2. R-CNN: first find regions worth checking

R-CNN uses region proposals to narrow the search. It first proposes boxes that may contain objects via Selective Search, then resizes each box, extracts CNN features, and performs class prediction and location refinement.

Box regression predicts an adjustment to the proposal box, rather than taking the proposal directly as the final answer. Page 27 of the slides writes it as:

$$
b_x=p_x+p_wt_x,\quad b_y=p_y+p_ht_y,\qquad
b_w=p_w e^{t_w},\quad b_h=p_h e^{t_h}.
$$

 $p$ denotes the proposal box, $b$ the refined box, and $t$ the predicted transformation parameters. The subscripts $x,y$ denote the box centre coordinates and $w,h$ its width and height. Horizontal shifts are scaled by the original width and vertical shifts by the original height; width and height are adjusted exponentially so they stay positive. The key idea is "proposal location + learned correction".

<a id="topic-3"></a>
## 3. From Fast to Faster: where each one gets faster

![PDF 34 - Shared features in Fast R-CNN](assets/21-object-detection-i/slide-34.png)

In the figure, the whole image first passes through a CNN once, producing a shared feature map. Each ROI takes its corresponding region of the feature map, ROI pooling turns it into a fixed size, and finally class and box are predicted for each. Fast R-CNN avoids the original's rerunning of the CNN for every proposal box, but proposals still come from an external method.

![PDF 50 - Learned proposals in Faster R-CNN](assets/21-object-detection-i/slide-50.png)

Read from bottom to top: the shared feature map is first fed into the RPN (region proposal network), which produces proposal boxes that are then passed to the detection branch. The RPN places reference boxes of different scales or aspect ratios at each feature-map position, and predicts whether there is an object and how to adjust the box.

| Method | Where proposals come from | Does the CNN share whole-image features? |
| --- | --- | --- |
| R-CNN | Selective Search | No, processes each proposal separately |
| Fast R-CNN | Selective Search | Yes |
| Faster R-CNN | A learned RPN | Yes, the proposal and detection branches share the backbone |

**Common mistake**: the RPN's "is there an object" and the final "which class of object is it" are different questions. "Faster" in the name refers to handing proposal generation to the network as well; it does not mean region proposals are no longer needed.

## Self-test for this lecture

1. A box has a very high IoU; why could it still be a wrong detection?
2. Which part of the computation does Fast R-CNN share?
3. Which part did Faster R-CNN change relative to Fast R-CNN?
