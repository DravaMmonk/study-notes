"""Place every COMP90086 knowledge point on the vision-lab chapter map and check prerequisite order.

Usage: python3 -I coverage.py <knowledge-graph.json>
Prints the coverage appendix as Markdown; exits non-zero on a missing point or a prerequisite placed later.
"""
import json
import sys

# Chapter order of the map; lecture numbers are provenance only.
CHAPTERS = {
    0: "图像比较仪", 1: "邻域处理器与扫描仪", 2: "频率分析与去干扰仪", 3: "光照无关的比较仪",
    4: "可训练分类器", 5: "更深更省的特征提取器", 6: "注意力编码器与检索", 7: "局部特征与平面对齐",
    8: "相机、双目与两视图", 9: "区域分割器", 10: "逐像素标注网络", 11: "重建与生成", 12: "检测器与评测",
    13: "看它在看哪",
}

# id -> (chapter, layer). Layers: 现 phenomenon, 机 mechanism, 数 mathematics, 文 copy only,
# 补 extra lesson (parameter bench), 专 optional topic (technical/workshop content, off the main line).
PLACE = {
    "vision-task": (0, "文"), "pixels": (0, "机"), "projection": (8, "机"), "lens": (8, "补"),
    "sampling": (7, "机"),
    "weighted-sum": (1, "机"), "convolution": (1, "机"), "filters": (1, "机"), "padding": (1, "机"),
    "separable": (1, "数"), "gradient": (1, "机"),
    "sinusoid": (2, "机"), "fourier": (2, "机"), "frequency-filter": (2, "数"), "ringing": (2, "数"),
    "compression": (2, "文"),
    "reflectance": (3, "机"), "colour": (3, "机"), "material": (3, "文"), "equivariance": (3, "数"),
    "recognition": (4, "现"), "channels": (4, "机"), "stride": (4, "数"), "pooling": (4, "机"),
    "classification-loss": (4, "机"), "train-split": (4, "机"), "regularisation": (4, "数"),
    "optimisation": (4, "机"),
    "receptive-field": (5, "数"), "residual": (5, "机"), "depthwise": (5, "数"), "transfer": (5, "机"),
    "classification-metrics": (5, "机"),
    "patches": (6, "机"), "attention": (6, "机"), "position": (6, "机"), "attention-cost": (6, "文"),
    "contrastive": (6, "机"), "clip": (6, "机"), "embedding-view": (6, "现"),
    "keypoint": (7, "现"), "harris": (7, "机"), "sift": (7, "机"), "outlier": (7, "现"),
    "hough": (7, "机"), "ransac": (7, "数"), "ratio-test": (7, "机"), "homography": (7, "机"),
    "depth-cues": (8, "现"), "disparity": (8, "机"), "stereo-matching": (8, "机"),
    "learned-depth": (8, "机"), "homogeneous": (8, "机"), "calibration": (8, "机"),
    "epipolar": (8, "机"), "fundamental": (8, "数"), "rectification": (8, "机"),
    "segmentation": (9, "现"), "clustering": (9, "机"), "bag-features": (9, "机"),
    "mean-shift": (9, "机"), "bandwidth": (9, "数"), "superpixels": (9, "机"), "slic": (9, "数"),
    "rag": (9, "机"), "stuff-things": (9, "文"), "grabcut": (9, "机"),
    "fcn": (10, "机"), "encoder-decoder": (10, "机"), "unpooling": (10, "机"), "transpose-conv": (10, "机"),
    "unet": (10, "机"), "sam": (10, "机"), "mask-loss": (10, "机"),
    "probability": (11, "现"), "autoencoder": (11, "机"), "vae": (11, "机"), "latent-sampling": (11, "机"),
    "gan": (11, "机"), "gan-stability": (11, "数"), "generation-evaluation": (11, "机"),
    "conditional-gan": (11, "机"), "gaussian-noise": (11, "数"), "forward-diffusion": (11, "机"),
    "noise-prediction": (11, "机"), "reverse-diffusion": (11, "机"), "latent-diffusion": (11, "机"),
    "conditional-diffusion": (11, "机"), "generation-cost": (11, "文"),
    "detection": (12, "现"), "iou": (12, "机"), "proposals": (12, "机"), "box-regression": (12, "机"),
    "rcnn": (12, "机"), "roi-pooling": (12, "机"), "rpn": (12, "机"), "instance-mask": (12, "机"),
    "yolo": (12, "机"), "detr": (12, "机"), "set-matching": (12, "机"), "nms": (12, "机"),
    "detection-matching": (12, "机"), "precision-recall": (12, "机"), "map": (12, "数"),
    "interpretability": (13, "机"), "robustness": (13, "文"),
    # Off the main line: workshop and library practice.
    "bgr": (7, "专"), "camera-example": (8, "专"), "attention-distance": (6, "专"),
    "gradcam-practice": (13, "专"), "diffusion-schedule-practice": (11, "专"),
    "normalised-cut-practice": (9, "专"), "cnn-parameter-practice": (4, "专"),
    "mnist-practice": (4, "专"), "separable-cnn-practice": (5, "专"),
    "feature-map-practice": (5, "专"), "harris-api-practice": (7, "专"),
    "matching-practice": (7, "专"), "stereo-practice": (8, "专"), "calibration-practice": (8, "专"),
    "generation-practice": (11, "专"),
}

LAYER_ORDER = "现机数补文专"

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
    print("| 章 | 现象 | 机制 | 数学 | 补课 | 只在文案 | 拓展专题 |")
    print("| --- | --- | --- | --- | --- | --- | --- |")
    for ch, name in CHAPTERS.items():
        cells = []
        for layer in LAYER_ORDER:
            ks = [k for k, v in PLACE.items() if v == (ch, layer)]
            cells.append("、".join(f"{title[k]}{'' if lecture[k] is None else f'（L{lecture[k]}）'}" for k in ks) or "—")
        print(f"| {ch} {name} | " + " | ".join(cells) + " |")
    counts = {layer: sum(1 for v in PLACE.values() if v[1] == layer) for layer in LAYER_ORDER}
    print()
    print(f"共 {len(PLACE)} 个知识点：" + "，".join(f"{k} {v}" for k, v in counts.items()) + "。")


if __name__ == "__main__":
    main(sys.argv[1])
