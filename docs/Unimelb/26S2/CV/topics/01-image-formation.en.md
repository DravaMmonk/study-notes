# Topic 1: How images are formed

This topic answers one question: **where does each pixel value captured by a camera come from?** First the geometry (where a ray of light lands), then the brightness (how strong the light landing there is). The two devices correspond to these two steps.

Learning path: the [pinhole camera](#1-pinhole-camera-lecture-2) decides "where it lands" → the [Lambertian studio](#2-lambertian-studio-lecture-5) decides "how bright it is".

## 1. Pinhole camera (Lecture 2)

<!-- figure: pinhole-camera -->

**What this device is**: a pinhole camera on an optical bench. The front plate has nothing but a small hole, behind it is a ground-glass screen that slides back and forth, and far down the rail stands an arrow 100 mm tall.

**The concept**: pinhole projection x = −f·X/Z. Rays cross over as they pass through the hole, so the image is upside down; the size of the image is inversely proportional to the distance Z.

**How to play**: hover over the rail or press the left/right arrow keys to move the arrow (changing Z); hover over the camera or press the up/down keys to move the rear plate (changing the focal length f); press 1–3 or the buttons below to change the aperture.

**What to watch**: the inverted arrow on the ground glass and the readout in the bottom-right corner. Push Z from 300 mm to 600 mm and the image height goes from −33.3 mm to −16.7 mm.

**Common misconceptions**: thinking a bigger hole is always better. A bigger hole is indeed brighter, but each point spreads into a blur spot and the image becomes blurry, which is exactly why cameras need lenses. Also, doubling Z halves the image height, not the image area.

Lecture notes: [Lecture 2 · The pinhole camera model](../02-basics.en.md)

## 2. Lambertian studio (Lecture 5)

<!-- figure: lambert-studio -->

**What this device is**: a small photo studio. On the turntable lie a dark card laid flat and a light card tilted backwards; each card has an upright "normal rod", a spotlight moves along an arc track, and the thin line from the lamp to the centre is the light direction.

**The concept**: the Lambertian model I = I_L·R·cosθ. Brightness is the product of three things: light intensity I_L, reflectance R and surface orientation (the angle θ between the normal and the light ray).

**How to play**: hover over the arc track or press the left/right keys to swing the lamp; the up/down keys or buttons change the lamp's power; press 1–3 to change the reflectance of the dark card.

**What to watch**: the grey level of the two cards, the two sliders on the grey-scale bar, and the readout "θ 0° · I_A 0.40 = I_B 0.40".

**Common misconceptions**: thinking that equal brightness means the same material. With the dark card facing the lamp and the light card tilted away, the readouts can be exactly equal; only changing the lamp's direction separates them. Changing the lamp's power just scales both cards by the same ratio, so it cannot tell them apart.

Lecture notes: [Lecture 5 · The Lambertian model](../05-image-formation-ii.en.md)

## Putting it together

A pixel value is shaped by two things at once: **geometry** decides which scene point lands on this pixel (pinhole camera: positions scale with 1/Z), and **photometry** decides how bright that point looks (studio: brightness = light intensity × reflectance × cosθ). Both steps lose information: pinhole projection discards the depth Z, and brightness mixes reflectance, lighting and orientation into a single number. So "inferring the world from an image" is always under-constrained, and the later topics keep coming back to this problem, for example by using two cameras to recover depth ([Topic 4](04-matching-and-3d.en.md)).

## Hands-on self-test

1. On the pinhole camera, first double f, then double Z. What fraction of the original image height do you end up with?
2. In the studio, find a lamp position where the two cards read the same; then change only the lamp's power. Are the readouts still the same? Why?
3. When the pinhole camera's hole is changed from 0.5 mm to 6 mm, which two quantities in the readout change together? What trade-off does this reflect?
