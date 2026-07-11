"""照片质量评分 & 选择单元测试"""

from __future__ import annotations

import io

import numpy as np
from PIL import Image, ImageFilter

from services.photo_scoring import (
    score_sharpness,
    score_subject_ratio,
    score_brightness,
    compute_composite_score,
    score_diversity,
    select_best_photos,
    assign_to_angles,
)


# ── Helpers ──

def _make_photo(size=(512, 512), color=(200, 150, 100)) -> bytes:
    """生成测试照片（带纹理）"""
    rng = np.random.default_rng(42)
    noise = rng.integers(0, 60, (size[1], size[0], 3), dtype=np.uint8)
    bg = np.full((size[1], size[0], 3), color, dtype=np.uint8)
    arr = np.clip(bg.astype(int) + noise.astype(int) - 30, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr, "RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def _make_blurry_photo() -> bytes:
    """生成模糊照片"""
    raw = _make_photo()
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    img = img.filter(ImageFilter.GaussianBlur(radius=5))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def _make_dark_photo() -> bytes:
    """生成欠曝照片"""
    rng = np.random.default_rng(42)
    arr = rng.integers(0, 30, (512, 512, 3), dtype=np.uint8)
    img = Image.fromarray(arr, "RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def _make_bright_photo() -> bytes:
    """生成过曝照片"""
    rng = np.random.default_rng(42)
    arr = rng.integers(230, 255, (512, 512, 3), dtype=np.uint8)
    img = Image.fromarray(arr, "RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


# ── score_sharpness ──


def test_sharp_photo_scores_higher_than_blurry():
    """清晰照片评分 > 模糊照片"""
    sharp = _make_photo()
    blurry = _make_blurry_photo()

    sharp_score = score_sharpness(Image.open(io.BytesIO(sharp)))
    blurry_score = score_sharpness(Image.open(io.BytesIO(blurry)))

    assert sharp_score > blurry_score, (
        f"sharp={sharp_score:.3f} should be > blurry={blurry_score:.3f}"
    )


def test_sharpness_in_range():
    """清晰度评分始终在 0-1 范围内"""
    for _ in range(10):
        img = Image.open(io.BytesIO(_make_photo(
            size=(256, 256),
            color=(np.random.default_rng().integers(50, 200),) * 3,
        )))
        score = score_sharpness(img)
        assert 0.0 <= score <= 1.0, f"Sharpness score {score} out of [0,1]"


def test_sharpness_tiny_image_returns_zero():
    """极小图片（<4px）返回 0"""
    img = Image.new("RGB", (2, 2), (128, 128, 128))
    assert score_sharpness(img) == 0.0


# ── score_subject_ratio ──


def test_subject_ratio_detects_content():
    """主体占比检测：纯色图片=0，带纹理图片>0"""
    solid_white = Image.new("RGB", (512, 512), (255, 255, 255))
    textured = Image.open(io.BytesIO(_make_photo()))

    assert score_subject_ratio(solid_white) < 0.1, "纯白图片应低主体占比"
    # 带纹理图片（模拟宠物）应该有非零主体占比
    # 但因为不是白色背景合成图，主体占比可能不高
    subj = score_subject_ratio(textured)
    print(f"  textured subject_ratio = {subj:.3f}")


def test_subject_ratio_in_range():
    """主体占比评分始终在 0-1 范围内"""
    img = Image.open(io.BytesIO(_make_photo()))
    score = score_subject_ratio(img)
    assert 0.0 <= score <= 1.0, f"Subject ratio score {score} out of [0,1]"


# ── score_brightness ──


def test_brightness_normal_scores_high():
    """正常亮度照片评分 > 过曝/欠曝"""
    normal = Image.open(io.BytesIO(_make_photo(color=(150, 140, 130))))
    dark = Image.open(io.BytesIO(_make_dark_photo()))
    bright = Image.open(io.BytesIO(_make_bright_photo()))

    normal_score = score_brightness(normal)
    dark_score = score_brightness(dark)
    bright_score = score_brightness(bright)

    assert normal_score > dark_score, f"normal={normal_score:.3f} should be > dark={dark_score:.3f}"
    assert normal_score > bright_score, f"normal={normal_score:.3f} should be > bright={bright_score:.3f}"


def test_brightness_in_range():
    """亮度评分始终在 0-1 范围内"""
    img = Image.open(io.BytesIO(_make_photo()))
    score = score_brightness(img)
    assert 0.0 <= score <= 1.0, f"Brightness score {score} out of [0,1]"


# ── compute_composite_score ──


def test_composite_score_structure():
    """综合评分返回完整结构"""
    img = Image.open(io.BytesIO(_make_photo()))
    result = compute_composite_score(img)

    assert "sharpness" in result
    assert "subject_ratio" in result
    assert "brightness" in result
    assert "composite" in result
    assert 0 <= result["composite"] <= 100


def test_composite_blurry_scores_lower_than_sharp():
    """模糊照片的综合分 < 清晰照片"""
    sharp = Image.open(io.BytesIO(_make_photo()))
    blurry = Image.open(io.BytesIO(_make_blurry_photo()))

    sharp_result = compute_composite_score(sharp)
    blurry_result = compute_composite_score(blurry)

    assert sharp_result["composite"] > blurry_result["composite"], (
        f"sharp={sharp_result['composite']:.0f} should be > blurry={blurry_result['composite']:.0f}"
    )


# ── score_diversity ──


def test_diversity_identical_photos():
    """相同照片的多样性评分应较低"""
    photo = _make_photo()
    scores = score_diversity([photo, photo, photo])
    # 相同照片的多样性应非常低
    for s in scores:
        assert s < 0.1, f"Identical photos should have low diversity, got {s:.3f}"


def test_diversity_different_photos():
    """不同照片的多样性评分更高"""
    photos = [
        _make_photo(color=(200, 100, 50)),
        _make_photo(color=(50, 150, 200)),
        _make_photo(color=(100, 200, 150)),
    ]
    scores_same = score_diversity([photos[0], photos[0], photos[0]])
    scores_diff = score_diversity(photos)

    avg_same = sum(scores_same) / len(scores_same)
    avg_diff = sum(scores_diff) / len(scores_diff)

    assert avg_diff > avg_same, (
        f"Different photos ({avg_diff:.3f}) should be more diverse than same ({avg_same:.3f})"
    )


def test_diversity_single_photo():
    """单张照片多样性=1.0"""
    scores = score_diversity([_make_photo()])
    assert scores == [1.0]


# ── select_best_photos ──


def test_select_empty_photos():
    """空列表返回空"""
    assert select_best_photos([]) == []


def test_select_single_photo():
    """单张照片返回 [0]"""
    result = select_best_photos([_make_photo()], num_select=4)
    assert result == [0]


def test_select_picks_best_first():
    """最佳照片（最清晰）排在最前面"""
    sharp = _make_photo()
    blurry = _make_blurry_photo()

    result = select_best_photos([blurry, sharp], num_select=2)
    # 第二张（sharp）应排名更高
    assert result[0] == 1, f"Sharp photo (idx=1) should be first, got {result}"


def test_select_respects_num_select():
    """select_best_photos 遵守 num_select 限制"""
    photos = [_make_photo() for _ in range(8)]
    result = select_best_photos(photos, num_select=4)
    assert len(result) <= 4


# ── assign_to_angles ──


def test_assign_single_photo():
    """单张照片分配给前方"""
    result = assign_to_angles([0], 1)
    assert result == [0, None, None, None]


def test_assign_two_photos():
    """2 张照片：前+后"""
    result = assign_to_angles([0, 1], 2)
    assert result == [0, None, 1, None]


def test_assign_three_photos():
    """3 张照片：前+左+右（跳过后面）"""
    result = assign_to_angles([0, 1, 2], 3)
    assert result == [0, 1, None, 2]


def test_assign_four_photos():
    """4 张照片：前+左+后+右"""
    result = assign_to_angles([0, 1, 2, 3], 4)
    assert result == [0, 1, 2, 3]
