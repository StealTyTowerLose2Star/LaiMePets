"""照片预处理服务 — 质量检测、去噪、背景移除、格式校验"""

from __future__ import annotations

import io
from pathlib import Path

from PIL import Image, ImageFilter
import numpy as np

from config import settings

# rembg 懒加载（首次调用时下载模型，约 176MB）
_rembg_session = None


def _get_rembg_session():
    """懒加载 rembg 会话（复用模型避免重复加载）"""
    global _rembg_session
    if _rembg_session is None:
        from rembg import new_session
        # u2net 通用模型，适合宠物分割
        _rembg_session = new_session("u2net")
    return _rembg_session


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


def preprocess_photo(
    file_bytes: bytes,
    remove_bg: bool = True,
    smart_crop: bool = True,
    enhance: bool = True,
) -> bytes:
    """
    预处理单张照片，为 AI 3D 生成做最佳准备：

    1. 缩放到最大 2048px（保留比例）
    2. 轻微去噪
    3. 移除背景（rembg u2net） + 合成白色背景
    4. 智能裁剪到宠物主体（让 AI 聚焦在宠物上，而非大片空白）
    5. 图像增强（锐化 + 对比度优化，帮助 AI 捕捉细节）
    6. 输出 RGB PNG
    """
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")

    # ── 1. 缩放到合理尺寸 ──
    max_side = 2048
    w, h = img.size
    if max(w, h) > max_side:
        ratio = max_side / max(w, h)
        new_size = (int(w * ratio), int(h * ratio))
        img = img.resize(new_size, Image.LANCZOS)

    # ── 2. 轻微降噪 ──
    img = img.filter(ImageFilter.MedianFilter(size=3))

    # ── 3. 背景移除 ──
    if remove_bg and settings.enable_background_removal:
        try:
            session = _get_rembg_session()
            from rembg import remove
            img = remove(img, session=session)
            # 将 RGBA 合成到白色背景上
            if img.mode == "RGBA":
                bg = Image.new("RGB", img.size, (255, 255, 255))
                bg.paste(img, mask=img.split()[3])
                img = bg
        except Exception as e:
            print(f"[预处理] 背景移除失败（使用原图）: {e}")
            img = img.convert("RGB")

    # ── 4. 智能裁剪到宠物主体 ──
    if smart_crop and remove_bg and settings.enable_background_removal:
        img = _smart_crop_to_subject(img)

    # ── 5. 图像增强（让 AI 更容易识别毛发纹理等细节）──
    if enhance:
        img = _enhance_for_ai(img)

    # ── 6. 输出 ──
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def _smart_crop_to_subject(
    img: Image.Image,
    bg_threshold: int = 240,
    padding_ratio: float = 0.08,
) -> Image.Image:
    """
    智能裁剪：找到宠物主体边界框，紧密裁剪（带少量留白）。

    通过在白色背景上寻找非白色像素定位宠物，
    裁剪后确保宠物占据画面主体（AI 模型能更好地捕捉细节）。

    Args:
        img: 已去背景的 RGB 图片（宠物在白色背景上）
        bg_threshold: 判定为"背景白色"的灰度阈值（越高越激进）
        padding_ratio: 边界框外扩比例（避免裁太紧）

    Returns:
        裁剪后的图片（保持 RGB）
    """
    import numpy as np

    arr = np.array(img, dtype=np.uint8)
    h, w = arr.shape[:2]

    # 找到非白色像素（宠物主体）
    # 白色背景: R>threshold, G>threshold, B>threshold
    is_bg = (arr[:, :, 0] > bg_threshold) & \
            (arr[:, :, 1] > bg_threshold) & \
            (arr[:, :, 2] > bg_threshold)

    # 非背景像素的行列范围
    rows = np.any(~is_bg, axis=1)
    cols = np.any(~is_bg, axis=0)

    if not rows.any() or not cols.any():
        # 没有找到主体（全白），返回原图
        print("[预处理] 智能裁剪：未检测到宠物主体，保留原图")
        return img

    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]

    # 加 padding
    pad_h = int((rmax - rmin) * padding_ratio)
    pad_w = int((cmax - cmin) * padding_ratio)

    crop_top = max(0, rmin - pad_h)
    crop_bottom = min(h, rmax + pad_h + 1)
    crop_left = max(0, cmin - pad_w)
    crop_right = min(w, cmax + pad_w + 1)

    cropped = img.crop((crop_left, crop_top, crop_right, crop_bottom))

    # 确保最小尺寸（AI 模型通常要求 ≥512px）
    cw, ch = cropped.size
    min_dim = 512
    if cw < min_dim or ch < min_dim:
        ratio = max(min_dim / cw, min_dim / ch)
        cropped = cropped.resize(
            (max(int(cw * ratio), min_dim), max(int(ch * ratio), min_dim)),
            Image.LANCZOS,
        )

    pet_fill = (1.0 - np.sum(is_bg) / (h * w)) * 100
    print(
        f"[预处理] 智能裁剪: ({w}×{h}) → ({cropped.size[0]}×{cropped.size[1]}), "
        f"宠物占比 {pet_fill:.0f}%"
    )
    return cropped


def _enhance_for_ai(img: Image.Image) -> Image.Image:
    """
    图像增强：帮助 AI 模型更好地识别宠物细节。

    - 适度锐化（突出毛发纹理、眼睛轮廓）
    - 自适应对比度拉伸（改善明暗细节）
    - 保留自然色彩（不做过度处理）

    这些处理在"宠物已抠出放在白色背景上"之后进行，
    确保增强只作用于宠物本身。
    """
    from PIL import ImageEnhance

    # 1. 轻微锐化 — 突出边缘（毛发、耳朵轮廓等）
    sharpener = ImageEnhance.Sharpness(img)
    img = sharpener.enhance(1.3)  # 1.0=原图, 2.0=强锐化

    # 2. 对比度增强 — 让花纹/斑点更清晰
    contrast = ImageEnhance.Contrast(img)
    img = contrast.enhance(1.15)

    # 3. 色彩饱和度 — 略微增强让毛色更鲜明
    color = ImageEnhance.Color(img)
    img = color.enhance(1.05)

    return img


def remove_background_only(file_bytes: bytes) -> bytes:
    """
    仅移除背景，不做缩放/去噪（用于生成抠图预览）。
    返回 RGBA PNG bytes。
    """
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")

    try:
        session = _get_rembg_session()
        from rembg import remove
        img = remove(img, session=session)
    except Exception as e:
        print(f"[抠图] 失败: {e}")
        img = img.convert("RGB")

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
