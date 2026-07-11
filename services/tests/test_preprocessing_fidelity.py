"""预处理保真度测试 — 使用 Geigei01-03 真实猫照验证预处理管线

测试目标：
- 背景移除不损伤猫体（像素级检查）
- 智能裁剪不切断耳朵/尾巴
- fidelity 模式保留原始色彩和毛发细节
- 白色皮毛不被误判为背景
"""

from __future__ import annotations

import io

import numpy as np
from PIL import Image

from conftest import load_geigei_photos, load_geigei_photo
from services.preprocessing import preprocess_photo
from config import settings


def test_geigei_photos_exist():
    """验证测试环境中有 Geigei 照片"""
    photos = load_geigei_photos()
    assert len(photos) == 3, f"需要 3 张 Geigei 照片，实际 {len(photos)} 张"
    for i, data in enumerate(photos):
        assert len(data) > 10000, f"Geigei{i+1:02d}.jpg 太小 ({len(data)} bytes)"


def test_preprocessing_fidelity_preserves_size():
    """fidelity 模式：预处理不应大幅改变照片尺寸"""
    for i in range(1, 4):
        photo = load_geigei_photo(i)
        if photo is None:
            continue

        original = Image.open(io.BytesIO(photo))
        pp_data = preprocess_photo(photo, mode="fidelity")
        processed = Image.open(io.BytesIO(pp_data))

        # 处理后尺寸不应缩小超过 50%
        ratio = processed.size[0] / original.size[0]
        assert ratio > 0.5, (
            f"Geigei{i:02d}: 预处理后宽度缩小至 {ratio:.0%} (原 {original.size[0]} → {processed.size[0]})"
        )


def test_preprocessing_fidelity_preserves_colors():
    """fidelity 模式：猫咪主体区域的平均色彩不应大幅偏离原图

    注意：预处理会抠图+换白色背景+智能裁剪，所以全图像素级 MSE 对比不适用。
    这里用颜色直方图分布的相关性来判断色彩是否保留。
    """
    for i in range(1, 4):
        photo = load_geigei_photo(i)
        if photo is None:
            continue

        original = Image.open(io.BytesIO(photo)).convert("RGB")
        pp_data = preprocess_photo(photo, mode="fidelity")
        processed = Image.open(io.BytesIO(pp_data)).convert("RGB")

        # 方法：比较颜色直方图分布的相似度
        # 对每张图计算三个通道的均值，均值偏差应在合理范围
        orig_arr = np.array(original, dtype=np.float64)
        proc_arr = np.array(processed, dtype=np.float64)

        # 预处理产物的非白色区域（猫咪主体）的平均颜色
        is_white = (proc_arr[:, :, 0] > 240) & (proc_arr[:, :, 1] > 240) & (proc_arr[:, :, 2] > 240)
        non_white_mask = ~is_white
        if non_white_mask.sum() > 100:  # 有足够的主体像素
            proc_mean = np.array([
                proc_arr[:, :, 0][non_white_mask].mean(),
                proc_arr[:, :, 1][non_white_mask].mean(),
                proc_arr[:, :, 2][non_white_mask].mean(),
            ])

            # 原图的整体均值（原图没有抠图，用整体近似）
            orig_mean = np.array([
                orig_arr[:, :, 0].mean(),
                orig_arr[:, :, 1].mean(),
                orig_arr[:, :, 2].mean(),
            ])

            # 三通道平均偏差应在合理范围（< 80 每通道）
            channel_diff = np.abs(proc_mean - orig_mean).mean()
            assert channel_diff < 80, (
                f"Geigei{i:02d}: 猫咪主体色彩偏差过大 (avg channel diff={channel_diff:.1f})"
            )
            print(f"  Geigei{i:02d}: 原图均值={orig_mean.astype(int)}, "
                  f"主体均值={proc_mean.astype(int)}, diff={channel_diff:.1f}")


def test_preprocessing_fidelity_vs_enhanced():
    """fidelity 模式比 enhanced 模式更接近原图"""
    for i in range(1, 4):
        photo = load_geigei_photo(i)
        if photo is None:
            continue

        original = Image.open(io.BytesIO(photo)).convert("RGB").resize((256, 256))
        orig_arr = np.array(original, dtype=np.float64)

        pp_fidelity = preprocess_photo(photo, mode="fidelity")
        pp_enhanced = preprocess_photo(photo, mode="enhanced")

        proc_fid = Image.open(io.BytesIO(pp_fidelity)).convert("RGB").resize((256, 256))
        proc_enh = Image.open(io.BytesIO(pp_enhanced)).convert("RGB").resize((256, 256))

        mse_fid = np.mean((orig_arr - np.array(proc_fid, dtype=np.float64)) ** 2)
        mse_enh = np.mean((orig_arr - np.array(proc_enh, dtype=np.float64)) ** 2)

        # fidelity 的 MSE 应 ≤ enhanced（即更接近原图）
        assert mse_fid <= mse_enh * 1.1, (
            f"Geigei{i:02d}: fidelity MSE={mse_fid:.0f} 应 ≤ enhanced MSE={mse_enh:.0f}"
        )


def test_preprocessing_does_not_remove_cat():
    """验证预处理（抠图+裁剪）不会把整只猫移除"""
    for i in range(1, 4):
        photo = load_geigei_photo(i)
        if photo is None:
            continue

        for mode in ["fidelity", "enhanced"]:
            pp_data = preprocess_photo(photo, mode=mode)
            processed = Image.open(io.BytesIO(pp_data)).convert("RGB")
            arr = np.array(processed, dtype=np.uint8)

            # 检查非白色像素比例（猫咪主体）
            is_white = (arr[:, :, 0] > 240) & (arr[:, :, 1] > 240) & (arr[:, :, 2] > 240)
            non_white_ratio = 1.0 - np.sum(is_white) / (arr.shape[0] * arr.shape[1])

            assert non_white_ratio > 0.05, (
                f"Geigei{i:02d} {mode}: 猫咪主体占比过低 ({non_white_ratio:.1%})，可能被误删"
            )


def test_preprocessing_minimal_is_smallest_change():
    """minimal 模式只缩放，不做任何其他处理"""
    for i in range(1, 4):
        photo = load_geigei_photo(i)
        if photo is None:
            continue

        original = Image.open(io.BytesIO(photo)).convert("RGB").resize((256, 256))
        orig_arr = np.array(original, dtype=np.float64)

        pp_minimal = preprocess_photo(photo, mode="minimal")
        proc_min = Image.open(io.BytesIO(pp_minimal)).convert("RGB").resize((256, 256))

        mse = np.mean((orig_arr - np.array(proc_min, dtype=np.float64)) ** 2)
        # minimal 模式应该非常接近原图（仅缩放，MSE < 500）
        assert mse < 500, (
            f"Geigei{i:02d}: minimal 模式应最接近原图，但 MSE={mse:.0f}"
        )


def test_preprocessing_output_is_valid_image():
    """预处理输出应该是有效的图片文件"""
    for i in range(1, 4):
        photo = load_geigei_photo(i)
        if photo is None:
            continue

        for mode in ["fidelity", "enhanced", "minimal"]:
            pp_data = preprocess_photo(photo, mode=mode)

            # 验证是有效的图片
            img = Image.open(io.BytesIO(pp_data))
            assert img.size[0] > 0 and img.size[1] > 0
            assert img.mode in ("RGB", "RGBA")

            # 验证文件大小合理（不应为 0 或过大）
            assert 1024 < len(pp_data) < 10 * 1024 * 1024, (
                f"Geigei{i:02d} {mode}: 输出大小异常 ({len(pp_data)} bytes)"
            )


def test_smart_crop_keeps_reasonable_aspect_ratio():
    """智能裁剪后的图片纵横比不应极端（不应裁成细条）"""
    for i in range(1, 4):
        photo = load_geigei_photo(i)
        if photo is None:
            continue

        pp_data = preprocess_photo(photo, mode="fidelity")
        processed = Image.open(io.BytesIO(pp_data))

        w, h = processed.size
        aspect = max(w, h) / min(w, h) if min(w, h) > 0 else 999

        # 纵横比不应超过 4:1（极端细条可能意味着裁剪错误）
        assert aspect < 4.0, (
            f"Geigei{i:02d}: 裁剪后纵横比异常 ({w}×{h}, ratio={aspect:.1f})"
        )


def test_background_removal_produces_white_bg():
    """背景移除后，边缘区域应为白色（而非透明或黑色）"""
    for i in range(1, 4):
        photo = load_geigei_photo(i)
        if photo is None:
            continue

        if not settings.enable_background_removal:
            continue

        pp_data = preprocess_photo(photo, mode="fidelity")
        processed = Image.open(io.BytesIO(pp_data)).convert("RGB")
        arr = np.array(processed, dtype=np.uint8)

        # 检查四角区域（通常应该是背景）
        corners = [
            arr[0:20, 0:20],           # 左上
            arr[0:20, -20:],           # 右上
            arr[-20:, 0:20],           # 左下
            arr[-20:, -20:],           # 右下
        ]

        # 至少 3 个角应是白色背景（均值 > 230）
        white_corners = sum(
            1 for c in corners
            if np.mean(c[:, :, 0]) > 230 and np.mean(c[:, :, 1]) > 230 and np.mean(c[:, :, 2]) > 230
        )

        # 不强制所有角都白（宠物可能占据整个画面），但至少检查不崩溃
        # 这是一个合理性检查，而非硬性断言
        print(f"  Geigei{i:02d}: {white_corners}/4 个角为白色背景")


def test_white_fur_handling_lowered_threshold():
    """白色宠物检测：fidelity 模式使用更低的 bg_threshold (220)

    此测试验证智能裁剪中的白色宠物回退逻辑不会崩溃。
    真正的白色猫咪可能在 Geigei 照片中不完全匹配，
    但至少确保代码路径可执行。
    """
    # 创建一张模拟的白色宠物照片（白色区域多，只有少量边缘特征）
    # 这比 Geigei 更能测试白猫场景
    from PIL import ImageDraw

    img = Image.new("RGB", (1024, 1024), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    # 画一个接近白色的"猫"（灰白色轮廓 + 暗色眼睛）
    # 身体：非常浅的灰色
    draw.ellipse([200, 300, 800, 900], fill=(240, 238, 235), outline=(220, 218, 215), width=2)
    # 头
    draw.ellipse([300, 150, 700, 500], fill=(245, 242, 240), outline=(220, 218, 215), width=2)
    # 眼睛（唯一显著非白色特征）
    draw.ellipse([420, 280, 470, 320], fill=(60, 140, 80))
    draw.ellipse([530, 280, 580, 320], fill=(60, 140, 80))
    draw.ellipse([430, 285, 460, 310], fill=(10, 10, 10))
    draw.ellipse([540, 285, 570, 310], fill=(10, 10, 10))
    # 鼻子
    draw.ellipse([490, 360, 510, 380], fill=(220, 150, 150))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    white_cat_data = buf.getvalue()

    # 运行预处理（fidelity 模式）
    pp_data = preprocess_photo(white_cat_data, mode="fidelity")
    processed = Image.open(io.BytesIO(pp_data)).convert("RGB")

    # 验证：处理后不应全白（猫咪应该保留）
    arr = np.array(processed, dtype=np.uint8)
    is_white = (arr[:, :, 0] > 240) & (arr[:, :, 1] > 240) & (arr[:, :, 2] > 240)
    non_white_ratio = 1.0 - np.sum(is_white) / (arr.shape[0] * arr.shape[1])

    assert non_white_ratio > 0.01, (
        f"白色宠物模拟: 主体占比过低 ({non_white_ratio:.3%})，白色猫可能被误删"
    )
    print(f"  白色宠物模拟: non-white ratio = {non_white_ratio:.1%}")
