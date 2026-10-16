# COMP90086 Lecture 1 - Introduction

Sources: `lecture/COMP90086-01-Introduction.pdf` and `transcript/COMP90086_2026_SM2 Week-01-W-transcript.txt`.

This note does not rush into algorithms. It answers the most basic question first: **what exactly does computer vision want a computer to learn from an image, and what should it then do with that?**

Learning path: [state the output first](#topic-1) → [why inferring backwards is hard](#topic-2) → [the difficulty of recognition and visual cues](#topic-3) → [how applications combine these tasks](#topic-4).

Key point: distinguish the task outputs and the forward vs. inverse problems. Common mistake: a high classification score does not mean the system has understood the scene. For the application examples, you only need to know which tasks they use.

<a id="topic-1"></a>
## 1. Vision tasks: state the output first

### What computer vision is

![Slide 6 - Computer vision](assets/01-introduction/slide-06.png)

The simplest definition is:

> Give images or video to a computer, let it extract a useful understanding from them, and use that understanding to make a judgement or take an action.

> **Lecturer's words**: "Anything where image-based information goes into a computer and it does something intelligent with it."
>
> **Interpretation**: to decide whether something is a vision task, first ask whether the input contains image information and whether the output supports understanding or action.

### First, distinguish the common tasks

![Slide 7 - Computer vision tasks](assets/01-introduction/slide-07.png)

The same image can be asked different questions. Different questions call for answers of different forms.

| Task | What it answers | Example output |
| --- | --- | --- |
| Recognition / classification | What category is the image mainly showing? | `dog` |
| Detection | Which objects are where? | class + bounding box |
| Semantic segmentation | Which class does each pixel belong to? | road, sky, person |
| Instance segmentation | Which specific object does each pixel belong to? | person-1, person-2 |
| 3D reconstruction | What are the 3D shape and depth of the scene? | depth, surface points |
| Visual navigation | Where am I, and where should I go? | camera pose, motion |
| Vision-guided action | Having seen this, what should be done? | robot grasping, obstacle avoidance |

One point that is easy to confuse: **classification gives only one or a few class labels; detection must also give locations; segmentation refines the answer down to individual pixels.**

<a id="topic-2"></a>
## 2. Images and the world: why inferring backwards is hard

### Computer vision runs in the opposite direction to computer graphics

![Slide 8 - Related fields](assets/01-introduction/slide-08.png)

Think of the two as the two ends of one arrow:

- **Computer graphics**: given the objects, materials, lighting and camera, generate an image going forwards.
- **Computer vision**: given an image, infer the objects, materials, lighting and camera going backwards.

Graphics is therefore a **forward problem** and vision is an **inverse problem**. Inverse problems are usually harder, because different 3D scenes can produce very similar 2D images.

Practical systems often combine the two: render a predicted image from the current estimate, compare it with the real image, and use the difference to correct the estimate. This is the basic idea of "render and compare".

### How the subject will unfold

![Slide 12 - Subject content](assets/01-introduction/slide-12.png)

The subject proceeds roughly from low level to high level:

1. **Image formation**: how images are formed by light, objects and cameras;
2. **Digital images and filtering**: pixels, channels, kernels and frequency;
3. **Recognition and representation learning**: how to learn useful features from images;
4. **3D perception**: depth, camera motion and 3D structure;
5. **Generative models**: generating new image-related content;
6. **Segmentation and detection**: making outputs finer-grained and closer to real applications.

This order matters. The later topics, CNNs, generative models and detection, still rely on the earlier foundations of coordinates, image formation and filtering.

<a id="topic-3"></a>
## 3. The difficulty of recognition and visual cues

### Why recognition is hard

![Slide 28 - Difficulties](assets/01-introduction/slide-28.png)

Suppose we want to recognise "bird". Photos of the same kind of bird may differ in:

- size and distance;
- viewpoint and pose;
- lighting;
- background;
- occlusion of the object;
- many irrelevant objects also being in the image.

At the same time, different categories may look very similar. So a model cannot just memorise a few pixels; it has to learn a fairly stable **representation**.

A good representation must satisfy two things at once:

1. different categories must be separable;
2. irrelevant variation within the same category must not change the representation completely.

This subject often asks for **tolerance** to irrelevant variation, meaning the result does not degrade badly; the difference between strict invariance and approximate stability is explained in Lecture 5.

### Intuitions from biological vision

![Slide 29 - Visual encoding](assets/01-introduction/slide-29.png)

The lecturer uses biological vision to show that visual processing is not necessarily a single straight line. A fast pathway may produce a first guess, and later recurrent connections then check and correct it. This intuition reappears later in the multi-layer representations of neural networks: early layers look at simple local patterns, and later layers combine them.

> **Lecturer's words**: "These looping mechanisms will then refine that estimate and maybe change it."
>
> **Interpretation**: guess first, then refine, is one way of processing; this biological-vision analogy does not mean that every CNN contains recurrent feedback.

![Slide 30 - Beyond classification](assets/01-introduction/slide-30.png)

This slide adds finer-grained outputs to the earlier list of tasks. Focus on how the same scene in the figure is labelled with different kinds of information:

- the location of each object;
- the semantics of each pixel;
- object parts, for example head, torso, legs;
- surface normals, i.e. which way a surface faces;
- saliency, i.e. which regions most deserve attention.

### How multiple photos help 3D understanding

![Slide 31 - Rome in a day](assets/01-introduction/slide-31.png)

A single photo loses part of the depth information. With many photos taken from different positions, we can find points the photos have in common, estimate the position of each camera, and then intersect multiple lines of sight.

The black pyramids in the figure can be read as camera viewing frustums: the apex is the camera position and the four sides show the range it sees. By estimating how these frustums relate across many photos, the system gradually recovers the 3D structure of the city.

<a id="topic-4"></a>
## 4. Supplement: how applications combine these tasks

### Augmented reality (AR)

![Slide 32 - AR stormtrooper](assets/01-introduction/slide-32.png)

AR is not simply pasting a picture onto the screen. The system needs to estimate the room's floor, walls and the camera pose before it can place a virtual object at the correct 3D position and produce plausible-looking shadows.

### Tracking, rendering and interaction

![Slide 33 - Sliding-block T-shirt](assets/01-introduction/slide-33.png)

A seemingly simple T-shirt AR app actually has to do four things: find the T-shirt, keep tracking it, render content on it, and handle the user's touches. This shows that real applications usually combine several vision tasks.

### Robot grasping

![Slide 34 - Robot vision](assets/01-introduction/slide-34.png)

When a robot's camera sees objects in a tray, it does not just output "this is a cup". It also has to estimate the object's position and pose, choose a way to grasp it, and account for the robot's own errors. A good visual output must be sufficient to support the action that follows.

### GANs and diffusion models

![Slide 35 - GANs](assets/01-introduction/slide-35.png)

The GAN example illustrates the historical path of generative models: the model first generates an image and then progressively increases its resolution. The lecturer points out that such methods are part of the subject's background; we now also need to understand diffusion models, because they have become an important method for many generation tasks.

## Self-test for this lecture

1. Given a street-scene image, what should classification, detection and segmentation each output?
2. Why might the same photo correspond to different 3D scenes?
3. When a robot grasps a cup, is the class label "cup" alone enough?
