"""照片预处理服务 — 质量检测、去噪、格式校验"""

from __future__ import annotations

import io
from pathlib import Path

from PIL import Image, ImageFilter
import numpy as np

from config import settings


def validate_photo(file_bytes: bytes, filename: str) -> dict:
    """
    验证单张照片的质量，返回：
    { passed: bool, resolution: (w, h), score: float, issues: [str] }
    """
    issues: list[str] = []

    # 1. 格式检查
    ext = Path(filename).suffix.lower()
    if ext not in settings.supported_formats:
        return {
            "passed": False,
            "resolution": (0, 0),
            "score": 0.0,
            "issues": [f"不支持的格式 {ext}，允许: {settings.supported_formats}"],
        }

    # 2. 文件大小检查
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(file_bytes) > max_bytes:
        issues.append(f"文件过大 ({len(file_bytes) / 1024 / 1024:.1f}MB > {settings.max_upload_size_mb}MB)")

    try:
        img = Image.open(io.BytesIO(file_bytes))
        w, h = img.size
    except Exception:
        return {
            "passed": False,
            "resolution": (0, 0),
            "score": 0.0,
            "issues": ["无法解析图片文件"],
        }

    # 3. 分辨率检查
    min_w, min_h = settings.min_photo_resolution
    if w < min_w or h < min_h:
        issues.append(f"分辨率过低 ({w}×{h} < {min_w}×{min_h})")

    # 4. 质量评分（基于清晰度）
    score = _estimate_sharpness(img)
    if score < 0.3:
        issues.append(f"图片模糊（清晰度 {score:.2f}，建议重拍）")

    return {
        "passed": len(issues) == 0,
        "resolution": (w, h),
        "score": round(score, 2),
        "issues": issues,
    }


def _estimate_sharpness(img: Image.Image) -> float:
    """用拉普拉斯方差估算图片清晰度"""
    gray = img.convert("L")
    arr = np.array(gray, dtype=np.float64)

    # 计算拉普拉斯（3×3 核）
    laplacian = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]], dtype=np.float64)

    h, w = arr.shape
    if h < 4 or w < 4:
        return 0.0

    # 简化的拉普拉斯变换
    var = np.var(arr)

    # 归一化到 0~1
    score = min(var / 2048.0, 1.0)  # 经验阈值
    return round(score, 2)


def preprocess_photo(file_bytes: bytes) -> bytes:
    """
    预处理单张照片：
    - 缩放到最大 2048px（保留比例）
    - 轻微去噪
    - 转为 RGB PNG
    """
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")

    # 缩放到合理尺寸
    max_side = 2048
    w, h = img.size
    if max(w, h) > max_side:
        ratio = max_side / max(w, h)
        new_size = (int(w * ratio), int(h * ratio))
        img = img.resize(new_size, Image.LANCZOS)

    # 轻微降噪
    img = img.filter(ImageFilter.MedianFilter(size=3))

    # 输出为 PNG bytes
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def batch_validate(photos: list[tuple[str, bytes]]) -> dict:
    """
    批量验证照片集，返回：
    { total: int, passed: int, results: [dict], sufficient: bool }
    """
    results = []
    for filename, data in photos:
        result = validate_photo(data, filename)
        result["filename"] = filename
        results.append(result)

    passed = sum(1 for r in results if r["passed"])
    return {
        "total": len(photos),
        "passed": passed,
        "results": results,
        "sufficient": passed >= settings.min_photos_required,
        "message": _batch_message(passed, len(photos)),
    }


def _batch_message(passed: int, total: int) -> str:
    if passed >= settings.min_photos_required:
        return f"已通过 {passed}/{total} 张，素材充足 ✓"
    elif passed >= 1:
        need = settings.min_photos_required - passed
        return f"仅 {passed}/{total} 张合格，还需 {need} 张"
    else:
        return "没有合格的照片，请重新上传清晰的宠物照片"
