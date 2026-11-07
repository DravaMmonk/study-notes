"""Place every COMP90086 knowledge point on the Vision Lab chapter map and check prerequisite order.

Usage: python3 -I coverage.py <knowledge-graph.json>
Prints the coverage appendix as Markdown; exits non-zero on a missing point or a prerequisite placed later.
"""
import json
import sys

# Chapter order of the map; lecture numbers are provenance only.
CHAPTERS = {
    1: "滤波与边缘", 2: "频率", 3: "光与颜色", 4: "学习与卷积网络", 5: "更深的网络",
    6: "特征与匹配", 7: "相机与深度", 8: "注意力与表示", 9: "分割", 10: "检测",
    11: "生成", 12: "解释",
}

# id -> (chapter, primary landing). Landings: 主 main line, 原 an optional
# principle series, 应 an application branch (challenge or topic), 文 intro, display or glossary only, 专 technical or
# workshop content inside an optional series or topic.
PLACE = {
    "vision-task": (1, "文"), "pixels": (1, "文"),
    "weighted-sum": (1, "主"), "convolution": (1, "原"), "filters": (1, "主"), "padding": (1, "应"),
    "separable": (1, "原"), "gradient": (1, "主"),
    "sinusoid": (2, "主"), "fourier": (2, "主"), "frequency-filter": (2, "主"), "ringing": (2, "主"),
    "compression": (2, "文"),
    "reflectance": (3, "主"), "colour": (3, "主"), "material": (3, "文"), "equivariance": (3, "主"),
    "recognition": (4, "主"), "channels": (4, "主"), "stride": (4, "原"), "pooling": (4, "主"),
    "classification-loss": (4, "主"), "train-split": (4, "主"), "regularisation": (4, "主"),
    "optimisation": (4, "主"),
    "receptive-field": (5, "主"), "residual": (5, "主"), "depthwise": (5, "主"), "transfer": (5, "主"),
    "classification-metrics": (5, "主"),
    "keypoint": (6, "主"), "harris": (6, "主"), "sift": (6, "主"), "outlier": (6, "主"),
    "hough": (7, "主"), "ransac": (6, "主"), "ratio-test": (6, "主"), "homography": (6, "主"),
    "sampling": (6, "主"),
    "projection": (7, "主"), "lens": (7, "主"), "depth-cues": (7, "文"), "disparity": (7, "主"),
    "stereo-matching": (7, "主"), "learned-depth": (7, "主"), "homogeneous": (7, "原"),
    "calibration": (7, "原"), "epipolar": (7, "主"), "fundamental": (7, "原"), "rectification": (7, "主"),
    "patches": (8, "主"), "attention": (8, "主"), "position": (8, "主"), "attention-cost": (8, "原"),
    "contrastive": (8, "主"), "clip": (8, "主"), "embedding-view": (8, "主"),
    "segmentation": (9, "文"), "clustering": (9, "主"), "bag-features": (9, "文"),
    "mean-shift": (9, "主"), "bandwidth": (9, "主"), "superpixels": (9, "主"), "slic": (9, "主"),
    "rag": (9, "主"), "stuff-things": (9, "文"), "grabcut": (9, "文"),
    "fcn": (9, "主"), "encoder-decoder": (9, "主"), "unpooling": (9, "主"), "transpose-conv": (9, "主"),
    "unet": (9, "主"), "sam": (9, "主"), "mask-loss": (9, "文"),
    "detection": (10, "主"), "iou": (10, "主"), "proposals": (10, "主"), "box-regression": (10, "主"),
    "rcnn": (10, "主"), "roi-pooling": (10, "主"), "rpn": (10, "主"), "instance-mask": (10, "文"),
    "yolo": (10, "主"), "detr": (10, "主"), "set-matching": (10, "主"), "nms": (10, "主"),
    "detection-matching": (10, "主"), "precision-recall": (10, "主"), "map": (10, "主"),
    "probability": (11, "文"), "autoencoder": (11, "主"), "vae": (11, "主"), "latent-sampling": (11, "主"),
    "gan": (11, "主"), "gan-stability": (11, "主"), "generation-evaluation": (11, "主"),
    "conditional-gan": (11, "文"), "gaussian-noise": (11, "原"), "forward-diffusion": (11, "主"),
    "noise-prediction": (11, "主"), "reverse-diffusion": (11, "主"), "latent-diffusion": (11, "文"),
    "conditional-diffusion": (11, "主"), "generation-cost": (11, "文"),
    "interpretability": (12, "主"), "robustness": (12, "主"),
    # Off the main line: workshop and library practice.
    "bgr": (6, "专"), "camera-example": (7, "专"), "attention-distance": (8, "专"),
    "gradcam-practice": (12, "专"), "diffusion-schedule-practice": (11, "专"),
    "normalised-cut-practice": (9, "专"), "cnn-parameter-practice": (5, "专"),
    "mnist-practice": (4, "专"), "separable-cnn-practice": (5, "专"),
    "feature-map-practice": (5, "专"), "harris-api-practice": (6, "专"),
    "matching-practice": (6, "专"), "stereo-practice": (7, "专"), "calibration-practice": (7, "专"),
    "generation-practice": (11, "专"),
}

LAYER_ORDER = "主原应文专"

# Principle series: letter -> (title, knowledge points the series takes to implementation depth).
SERIES = {
    "K": ("拆开滤波器", ["weighted-sum", "convolution", "separable"]),
    "F": ("频谱怎么算出来", ["fourier", "frequency-filter"]),
    "B": ("反向传播", ["optimisation", "classification-loss"]),
    "N": ("网络的账", ["stride", "receptive-field", "depthwise"]),
    "R": ("估计的原理", ["homography", "ransac", "sampling", "homogeneous", "calibration", "fundamental"]),
    "A": ("注意力的计算", ["attention", "attention-cost"]),
    "U": ("转置卷积", ["transpose-conv"]),
    "D": ("扩散的数学", ["gaussian-noise", "forward-diffusion", "reverse-diffusion"]),
}

# Graph edges this map deliberately does not follow, with the reason recorded in the chapter map.
OVERRIDES = {
    # Only the shared idea "one observation, many scenes" is needed; chapter 3 meets it through
    # reflectance itself, and projection's depth ambiguity reuses it in chapter 8.
    ("reflectance", "projection"),
    # Mean shift needs a Gaussian distance kernel, already built as chapter 1's smoothing kernel;
    # adding noise variances belongs to diffusion.
    ("mean-shift", "gaussian-noise"),
}


def main(path):
    entries = json.load(open(path, encoding="utf-8"))["entries"]
    ids = {e["id"] for e in entries}
    problems = [f"unplaced: {i}" for i in sorted(ids - PLACE.keys())]
    problems += [f"unknown id: {i}" for i in sorted(PLACE.keys() - ids)]
    problems += [f"unknown series point: {k}" for _, ks in SERIES.values() for k in ks if k not in PLACE]
    for e in entries:
        if e["id"] not in PLACE:
            continue
        ch = PLACE[e["id"]][0]
        for r in e["requires"]:
            if r in PLACE and PLACE[r][0] > ch and (e["id"], r) not in OVERRIDES:
                problems.append(f"order: {e['id']} (ch {ch}) requires {r} (ch {PLACE[r][0]})")
    if problems:
        print("\n".join(problems), file=sys.stderr)
        sys.exit(1)

    title = {e["id"]: e["title"] for e in entries}
    lecture = {e["id"]: e["lecture"] for e in entries}
    def name(k):
        return f"{title[k]}{'' if lecture[k] is None else f'（L{lecture[k]}）'}"

    print("| 章 | 主线 | 原理系列 | 应用 | 只在引言与词条 | 技术与实验 |")
    print("| --- | --- | --- | --- | --- | --- |")
    for ch, label in CHAPTERS.items():
        cells = []
        for layer in LAYER_ORDER:
            ks = [k for k, v in PLACE.items() if v == (ch, layer)]
            cells.append("、".join(name(k) for k in ks) or "—")
        print(f"| {ch} {label} | " + " | ".join(cells) + " |")
    print()
    print("| 原理系列 | 加深的知识点 |")
    print("| --- | --- |")
    for letter, (label, ks) in SERIES.items():
        print(f"| {letter} {label} | " + "、".join(name(k) for k in ks) + " |")
    counts = {layer: sum(1 for v in PLACE.values() if v[1] == layer) for layer in LAYER_ORDER}
    print()
    print(f"共 {len(PLACE)} 个知识点：" + "，".join(f"{k} {v}" for k, v in counts.items()) + "。")


if __name__ == "__main__":
    main(sys.argv[1])
