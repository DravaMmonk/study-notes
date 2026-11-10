# COMP90086 Lecture 10 - Representation Learning

Sources: `lecture/COMP90086-10-representations.pdf` (44 pages, Week 5 Lecture 2) and `transcript/COMP90086_2026_SM2 Week-05-F-transcript.txt` (original file `F-transcript-4.txt`). The workshop material comes from `workshop/week-05/worksheet05_solution.ipynb`. The PDF cover says Semester 2, 2025; based on the course archive, the Week heading and the transcript topic, it is filed here under 2026 Week 5, with the original file kept. All page numbers below are PDF page numbers; interactive buttons in the screenshots are static images.

This lecture continues from [ViT](09-vit.en.md): **instead of rushing the network to answer "what class is this", first turn the image into a useful representation, then check what that representation keeps.** The main thread is contrastive learning → CLIP → model interpretation → the limits of generalisation.

Learning path: [setting up the training problem](#topic-1) → [CLIP and zero-shot classification](#topic-2) → [neighbours, regions and components](#topic-3) → [shape, perturbations and data sources](#topic-4).

Key points: positive/negative pairs, the contrastive loss and the CLIP classification procedure. Hard part: the candidate set and the temperature. Common mistake: an explanation heatmap is only the result of one particular check; it does not prove that the model understands the image the way a human does.

<a id="topic-1"></a>
## 1. Learning representations: setting up the training problem

### What representations and self-supervised learning are

![PPT 5 - Self-supervised learning](assets/10-representations/slide-05.png)

A **representation** describes the input with a set of numbers. An **encoder** is the network that turns an image into that set of numbers. If you remove the final classification layer of a CNN, the output of the previous layer can serve as a representation; the final class token of a ViT can play the same role. This is exactly how the lecturer connects this lecture to the previous one at the start.

An **embedding** can be thought of as the image's coordinates in feature space. It is usually not yet a class probability. A good representation should make task-relevant information easy to compare, rather than just keeping the raw pixels.

The slides distinguish three kinds of learning signal:

- **Supervised learning**: humans provide images with their correct classes, and prediction errors are used to update the network.
- **Unsupervised learning**: no class labels, e.g. clustering based on the structure of the data.
- **Self-supervised learning**: the training target is created from the data itself. There are no human class labels, but there is still a loss that can be computed.

The two examples on the slide are masking out part of an image and predicting the missing content, and generating two views of the same image and deciding whether they are a pair. A **view** here can simply be a cropped or flipped image; it need not be a photo taken by a different camera. A **proxy task** is an intermediate task set up in order to learn a representation; this lecture mainly studies pairing.

### Turning "learning a representation" into a multiple-choice question

![PPT 6 - Four images and their second views](assets/10-representations/slide-06.png)

Follow the four images on the slide in order:

1. Take a **mini-batch** containing 4 original images.
2. Crop, rescale or flip each image to get a second view. We know which original it came from, so we automatically know the correct pairing.
3. The encoder outputs vectors $z_i$ and $z'_j$ , where the subscripts $i,j$ are image indices.
4. Compare every original-image representation with every second view to get a $4\times4$ similarity matrix.
5. The diagonal holds the pairs from the same original image, i.e. **positive pairs**; in this training design all the other entries are treated as **negative pairs**.
6. Apply softmax to each row, turning the four scores into choice probabilities that sum to 1, then raise the probability of the correct column.

The "classes" here are just this batch's candidate views, not fixed semantic classes such as cat or dog. **Vocabulary** is borrowed here to mean the candidate set being chosen from; the next batch can use a different set of candidates.

> **Lecturer's words**: "the vocabulary is made from the data, that's the key."
>
> **Interpretation**: the candidates change from batch to batch; do not mistake this pairing task for a fixed cat-vs-dog classification.

Using the first row of the slide: the correct pair gets 98%, and the other candidates share 2%; the model can already separate the correct view from the other images. In the second row the correct entry is only 74%, and one wrong entry takes about 25%, meaning this pair is still fairly easy to confuse. Training changes the encoder's parameters so that these pairs become easier to separate.

### Reading the contrastive loss term by term

![PPT 8 - Contrastive loss and SimCLR candidates](assets/10-representations/slide-08.png)

The goal of **contrastive learning** is to make positive pairs more similar relative to the candidate negative pairs. The slides use **cosine similarity**:

$$
\operatorname{sim}(a,b)=\frac{a^\top b}{\|a\|_2\|b\|_2}.
$$

  $a,b$ are non-zero feature vectors, $a^\top b$ is their dot product, and $\|a\|_2$ is the length of a vector. It compares the directions of the vectors and equals 1 when they point the same way; do not misremember "larger similarity means more alike" as "larger distance means more alike". The transcript alternates between distance and similarity in this part; these notes follow the similarity formula on the slide throughout.

First look at the simplified version at the top of the slide:

$$
\ell_i=-\log\frac{\exp(\operatorname{sim}(z_i,z'_i)/\tau)}{\sum_{j=1}^{N}\exp(\operatorname{sim}(z_i,z'_j)/\tau)}.
$$

  $N$ is the number of original images; the numerator is the correct pair for image $i$ ; the denominator runs over all $N$ candidates in the second set; $\exp$ turns the scores into positive numbers; the ratio is the softmax probability of the correct column. Finally the negative log is taken: the closer the correct probability is to 1, the closer the loss is to 0. Success does not mean raising all the candidate similarities together; the correct entry has to win within its row.

The **temperature** $\tau>0$ controls how sharp the distribution is: for fixed similarities, a smaller $\tau$ amplifies the differences between scores, while a larger $\tau$ flattens the probabilities. When the temperature is increased on the slide, the four candidates gradually approach 25%. A small temperature does not automatically make the "correct" entry win; it emphasises whichever entry currently has the highest score.

Next look at the SimCLR version at the bottom. Each image gets two views, giving $2N$ views in total. Choose one view $i$ as the **anchor** (the current reference for comparison); its correct partner is $j$ :

$$
\ell_{i,j}=-\log\frac{\exp(\operatorname{sim}(z_i,z_j)/\tau)}{\sum_{k=1}^{2N}\mathbf{1}_{[k\ne i]}\exp(\operatorname{sim}(z_i,z_k)/\tau)}.
$$

  $\mathbf{1}_{[k\ne i]}$ is an indicator function: 1 if the condition holds, 0 otherwise. It excludes the anchor itself, not the positive pair. So there are $2N-1$ candidates: 1 positive pair and $2(N-1)$ negative pairs. With the four original images, there are now 8 views, and one anchor is compared with 7 candidates, of which 1 is positive and 6 are negative. The only difference from the four-column diagram above is that the candidate set is larger.

<a id="topic-2"></a>
## 2. Aligning images and text: CLIP and zero-shot classification

### CLIP replaces the other axis with text

![PPT 12 - CLIP image and text encoders](assets/10-representations/slide-12.png)

**CLIP** stands for Contrastive Language–Image Pretraining. Before, both sides were images; now one side is an image and the other is its corresponding **caption**. An image encoder and a text encoder turn the two kinds of input into comparable vectors; image and text do not need the same network architecture, but their final vectors must be comparable in the same space.

A batch has $N$ image–text pairs, corresponding to $N^2$ possible pairings, of which the $N$ original pairs lie on the diagonal and the $N^2-N$ non-matching entries serve as negatives. The two-way comparison in the figure means using images to find text and also using text to find images.

PPT 13 gives the training scale of the original CLIP as 400 million image–text pairs. What it reduces is the need to label each image with a fixed class specifically; training still relies on existing image–text correspondences. The value of a **shared embedding space** is that text does not have to become one column of weights in a fixed classification layer; it can also serve as something to compare against.

### Why it can do zero-shot classification

![PPT 14 - Using class names as text prompts](assets/10-representations/slide-14.png)

Following the slide's example, put each class name into a **prompt** (an input text template) such as "A photo of a …", encode it into a vector with the text encoder, compare it with the vector of the image to be classified, and pick the most similar candidate text.

**Zero-shot** here means the model is not retrained for this downstream classification task. It does not mean the model was never pre-trained, nor that it can reliably recognise arbitrary concepts. The candidate labels are still supplied by the user, and the model chooses among those candidates.

PPT 15–16 show comparisons between zero-shot CLIP and a trained ResNet-50 on specific benchmarks, and the performance under shifts in the data distribution. These should be read as the results of those experiments, not expanded into "CLIP is more robust on every task". PPT 17 also points out that a shared image–text representation can support image–text filtering, pseudo-labelling, and supplying image features to other models. A **pseudo-label** is a label produced automatically by a model; it cannot be equated with human-verified ground truth.

<!-- figure: contrastive-board -->

<a id="topic-3"></a>
## 3. Inspecting representations: neighbours, regions and components

### Which images are close in representation space

![PPT 21 - Neighbours in feature space](assets/10-representations/slide-21.png)

**Nearest neighbours** means finding the images whose feature vectors are closest. The left side of the slide warns that similarity in pixel space is not necessarily semantic similarity; on the right, flowers, elephants and boats in the same row can have different poses and backgrounds, yet feature space may still place them close together.

What you want to check is "which samples does the network consider similar", not just how many images the final classifier got right. This helps reveal whether the representation is really focusing on objects, textures or backgrounds.

![PPT 22 - PCA and t-SNE](assets/10-representations/slide-22.png)

High-dimensional vectors cannot be drawn directly on a 2-D page, so we need **dimensionality reduction**. **PCA** (principal component analysis) projects onto the directions with the most variation; **t-SNE** tries to keep high-dimensional neighbours close together on a 2-D or 3-D plot.

The slides particularly stress the local interpretation of t-SNE: you can observe which points form small nearby clusters, but you cannot treat the distance between two clusters as a reliable distance in the original space. The Birds200/Cars196 plots on PPT 23 show that classes not used in training can also cluster together; this indicates that the representation learned in that experiment transfers, but it does not guarantee that any new class will be separated.

### Where to occlude so classification suffers most

![PPT 25 - Elephant occlusion experiment](assets/10-representations/slide-25.png)

**Occlusion** here is an inspection method: first record the original image's score for some class, then cover different positions with an occluding patch and predict again.

Using the slide's elephant example: the original score is 0.98; covering the background beside it gives 0.96, a drop of 0.02; covering the head gives 0.70, a drop of 0.28. This shows that for this input and occlusion setup, the head region has more influence on the class score. The slide explicitly labels these numbers as illustrative scores, not outputs of an experiment run for these notes.

Sliding the occlusion window point by point lets you plot the relationship between position and score drop. In the go-kart example on PPT 26, the track background also affects the prediction: the model may use both the object and its context.

> **Lecturer's words**: "which pixels if I removed them? Harm the classification the most."
>
> **Interpretation**: the point is to compare the change in class score before and after occlusion; the heatmap is not a hand-drawn ground-truth object segmentation.

### How CAM and Grad-CAM produce location maps

![PPT 27 - Class Activation Mapping](assets/10-representations/slide-27.png)

A **feature map** keeps the network's response at each position. **Global average pooling (GAP)** averages over all spatial positions within each channel, turning one feature map into a single number. The classification layer then takes a weighted combination of these numbers.

**CAM (Class Activation Mapping)** reuses the classification weights on the corresponding spatial feature maps: the more important a channel is for the target class, the larger the contribution of the positions where it responds strongly. The coloured hot regions in the figure show the areas relevant to that class. For the same image with a different target class, the weights change and the hot regions may change too.

![PPT 29 - Grad-CAM for cat and dog](assets/10-representations/slide-29.png)

A **gradient** describes how sensitive a class score is to some intermediate response. **Grad-CAM** uses these gradients to estimate the role of each feature map for a class, so the network does not have to be restructured into the GAP-plus-classifier form required by CAM. Look at the slide's example with a cat and a dog in the same picture: asking about cat and about dog highlights different regions.

The three methods are, respectively: re-predicting after occlusion, using the classification-layer weights, and using the gradient of the class score. First understand how each one produces its map; you do not need to study a full implementation beyond this lecture.

#### Workshop 6: same image, different target class

`workshop/week-06/worksheet06.ipynb` asks you to generate Grad-CAM maps for the top two predicted classes of an image containing several kinds of fruit. Compare whether the hot regions follow the target class; if you do not change the target class, you cannot test "what this heatmap is explaining". This is an exercise task, not a conclusion obtained by running it for these notes.

### Workshop 5 extra: a filter and a feature map are not the same thing

The original notebook first loads a pre-trained VGG16, then looks at the three input channels of the first six filters in the first layer, and then feeds `harry.png` into the network to display the 64 feature maps of the first layer.

A **filter** is a set of trained weights; a **feature map** is the result of applying those weights to a particular image. Changing the input image changes the feature maps, but does not change the filters that have already been loaded. In the original exercise the first-layer output is $224\times224\times64$ ; arranging the 64 spatial maps in an $8\times8$ grid is only for display.

The last part of the workshop loads ResNet50 with `include_top=False`, takes `conv3_block4_out` as the output, and extracts features for `wallaby.jpeg`. The residual structure is covered in [CNNs III](08-cnns-iii.en.md); here we only care about which layer's output is taken. These are the notebook's original tasks; the model was not retrained or run for these notes, and the intermediate feature maps are not called class predictions.

### What a single attention head contributes

![PPT 31 - Decomposing the class token](assets/10-representations/slide-31.png)

Recall ViT's class token: it keeps absorbing information through the attention and MLP of each layer. The expression on the slide writes the final class token as the sum of the initial token, the contributions of each attention block and the contributions of each MLP.

In the figure, $L$ is the number of layers, $H$ is the number of attention heads per layer, and $N$ is the number of patches involved in the decomposition; $y_{i,h,l}$ denotes the contribution from patch $i$ in head $h$ of layer $l$ . $Q,K,V$ are still the queries, keys and values from the previous lecture, $W_O$ is the output projection, and $D$ is the dimension used for scaling. Summing grouped by patch, head or layer lets you ask separately "which position" or "which head" contributed what.

CLIP's text and images live in a comparable space, so the slides show these contributions described in words, e.g. pyramid and camel. This is a particular interpretation method from the slides; it is not that each attention head was assigned a human word in advance. For now it is enough to understand that "the sum can be split up by source".

<a id="topic-4"></a>
## 4. Limits of capability: shape, perturbations and data sources

### Accurate classification does not mean understanding shape the way humans do

![PPT 36 - BagNet local patches](assets/10-representations/slide-36.png)

[Lecture 5](05-image-formation-ii.en.md) already distinguished invariance from tolerance. Here they are checked with experiments rather than defined again. This lecture discusses, in turn, changes in lighting, translation, in-plane rotation, scale and 3-D pose. A change in 3-D pose can reveal new surfaces and cannot be treated simply as rotating a 2-D image.

**BagNet** makes decisions on independent small patches and then aggregates them, and still achieves fairly good results on the classification task shown on the slide. Local regions of the dog in the figure already provide class cues; classification does not necessarily need the complete global shape.

![PPT 37 - Texture versus silhouette and edges](assets/10-representations/slide-37.png)

Compare along the slide's cat images: the original, the greyscale image, the pure silhouette, the edge map and the texture image each keep different information. **Texture** is a locally repeated or fine-grained appearance pattern; **shape** is the overall outline or layout. The CNN in the figure degrades clearly when only the silhouette or edges remain, while it still recognises the image easily when the texture is kept.

In the specific VGG-16 experiment on PPT 38, scrambling the layout of texturised images drops the accuracy from 90% to 79%. This example shows that local cues can carry a large share of the decision; it does not mean every vision task can ignore layout — the geometric matching in the next lecture needs precise positions.

![PPT 40 - Training distortion and test distortion](assets/10-representations/slide-40.png)

When reading this kind of matrix, one axis is the perturbation used during training and the other is the perturbation used at test time. **Distortion** includes changes such as greyscale, contrast, filtering and noise. Training on one distortion and improving on it does not guarantee improvement on other distortions. You need to check the changes you will actually face; "we used data augmentation" cannot be taken as having obtained every invariance.

### The training distribution is not the whole world

![PPT 41 - Geographic distribution of images](assets/10-representations/slide-41.png)

**Distribution** here includes where the images come from, what objects they show and under what conditions they were taken. The map shows that the sources of the training images are unbalanced. If the common training appearances cover only part of the possible environments, objects in a new environment may be hard to recognise.

![PPT 42 - Household appearance and recognition](assets/10-representations/slide-42.png)

The slide uses objects of the same kind in different household environments to show that having the same function or class does not mean having the same pixel appearance. The core reminder from class is that when evaluating a model, look carefully at where the data comes from and at which samples the accuracy differences fall on.

> **Lecturer's words**: "you should be worried about where your data comes from."
>
> **Interpretation**: checking whether a new scenario is covered by the training data helps you judge whether a model is applicable far more than just remembering the overall accuracy.

## Self-test

1. If each of four original images produces two views, how many positive and negative pairs does one SimCLR anchor view have?
2. What candidate information must still be supplied for CLIP's zero-shot classification?
3. What question does each of nearest neighbours, occlusion and Grad-CAM answer?
