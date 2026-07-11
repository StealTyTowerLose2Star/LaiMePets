"""AI 视角合成 — Stage 1: 用户照片 → 标准化四视图

支持 provider：
- nano_banana: Google Nano Banana 2 (Gemini 3.1 Flash Image) via Replicate（推荐）

工作流程：
1. 接收预处理后的猫咪照片（1-4 张，白底）
2. 调用 AI 生成 2×2 网格四视图（前/后/左/右）
3. 拆分网格为 4 张独立 PNG
4. 返回 [front, back, left, right]
"""

from __future__ import annotations

import io
import os
import tempfile
from typing import Optional

from PIL import Image

from config import settings

# 视角顺序：前、后、左、右（与 prompt 中的 2×2 网格布局对齐）
VIEW_ANGLES = ["front", "back", "left", "right"]

# Replicate 上的 Nano Banana 2 模型标识符
NANO_BANANA_MODEL = "google/nano-banana-2"


def run_view_synthesis(
    photos: list[bytes],
    provider: str = "nano_banana",
) -> tuple[list[Optional[bytes]], bool]:
    """
    将用户照片合成为标准化四视图。

    Args:
        photos: 预处理后的照片（1-4 张，白底 PNG）
        provider: "nano_banana"（当前唯一支持的 provider）

    Returns:
        (views, fully_successful)：
        - views: [front, back, left, right]，None 表示该角度生成失败
        - fully_successful: 四个角度全部成功为 True
    """
    if provider == "nano_banana":
        return _synthesize_nano_banana(photos)
    else:
        raise ValueError(
            f"未知视角合成 provider: {provider}。可用: nano_banana"
        )


# ── Nano Banana 2 (via Replicate) ──


def _synthesize_nano_banana(
    photos: list[bytes],
) -> tuple[list[Optional[bytes]], bool]:
    """
    使用 Nano Banana 2 生成 2×2 四视图网格。

    流程：
    1. 构建角色参考表 prompt
    2. 通过 Replicate SDK 提交任务（含参考图，SDK 自动轮询）
    3. 下载输出图片
    4. 拆分 2×2 网格 → 4 张独立视图
    """
    import replicate as replicate_sdk

    api_token = settings.replicate_api_token or os.environ.get("REPLICATE_API_TOKEN", "")
    if not api_token:
        raise RuntimeError(
            "Replicate API token 未设置，Nano Banana 2 需要 Replicate 账号。"
            "请在 .env 中设置 REPLICATE_API_TOKEN"
        )
    os.environ["REPLICATE_API_TOKEN"] = api_token

    prompt = _build_grid_prompt()

    tmp_files: list[str] = []
    try:
        for photo in photos[:4]:
            tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
            img = Image.open(io.BytesIO(photo)).convert("RGB")
            img.save(tmp.name, format="PNG")
            tmp_files.append(tmp.name)
            tmp.close()

        print(f"[NanoBanana] 提交视角合成 — {len(tmp_files)} 张参考图")

        output = replicate_sdk.run(
            NANO_BANANA_MODEL,
            input={
                "prompt": prompt,
                "image_input": [open(f, "rb") for f in tmp_files],
                "resolution": "2K",
                "aspect_ratio": "1:1",
                "output_format": "png",
            },
        )

        image_url = _extract_url(output)
        if not image_url:
            raise RuntimeError(f"Nano Banana 2 未返回图片 URL: {output}")

        print(f"[NanoBanana] 生成完成，下载图片...")

        import urllib.request
        with urllib.request.urlopen(str(image_url)) as resp:
            image_data = resp.read()

        print(f"[NanoBanana] 下载完成: {len(image_data):,} bytes")

        views = _split_grid(image_data)
        success_count = sum(1 for v in views if v is not None)
        print(f"[NanoBanana] 网格拆分: {success_count}/4 视图")

        return views, success_count == 4

    finally:
        for f in tmp_files:
            try:
                os.unlink(f)
            except OSError:
                pass


def _build_grid_prompt() -> str:
    """构建 2×2 角色参考表 prompt（英文，NB2 对英文响应更好）。"""
    return (
        "Character reference sheet of this EXACT cat shown in the reference photos. "
        "Generate a precisely aligned 2x2 grid with four standardized orthographic views. "
        "Grid layout: "
        "[top-left quadrant] FRONT view — cat standing upright, facing the camera directly, "
        "full body from head to paws visible, symmetrical pose. "
        "[top-right quadrant] BACK view — cat seen from directly behind, "
        "full body, tail visible, same scale as front view. "
        "[bottom-left quadrant] LEFT side view — cat in profile facing left, "
        "full body, all four legs visible, same scale. "
        "[bottom-right quadrant] RIGHT side view — cat in profile facing right, "
        "full body, all four legs visible, same scale. "
        "CRITICAL: The cat MUST look IDENTICAL in all four views — same fur colors, "
        "same markings and patterns, same eye color, same body proportions. "
        "Pure white background (#FFFFFF) in every quadrant. "
        "Photorealistic studio lighting, consistent across all views. "
        "Full body visible in each quadrant — do not crop any part of the cat. "
        "Consistent scale — cat should be same relative size in all four quadrants."
    )


def _extract_url(output) -> Optional[str]:
    """从 Replicate SDK 返回值中提取图片 URL。"""
    if hasattr(output, "url"):
        return str(output.url)

    if isinstance(output, list) and output:
        first = output[0]
        if hasattr(first, "url"):
            return str(first.url)
        if isinstance(first, str):
            return first

    if isinstance(output, str):
        return output

    return None


def _split_grid(image_data: bytes) -> list[Optional[bytes]]:
    """
    拆分 2×2 网格图为 4 张独立视图。

    网格布局（与 prompt 对齐）：
    ┌─────────┬─────────┐
    │  FRONT  │  BACK   │
    ├─────────┼─────────┤
    │  LEFT   │  RIGHT  │
    └─────────┴─────────┘

    Returns:
        [front, back, left, right]，每个为 PNG bytes 或 None
    """
    try:
        img = Image.open(io.BytesIO(image_data))
    except Exception as e:
        print(f"[NanoBanana] 无法打开输出图片: {e}")
        return [None, None, None, None]

    w, h = img.size
    half_w, half_h = w // 2, h // 2

    if half_w < 64 or half_h < 64:
        print(f"[NanoBanana] 输出图片太小 ({w}×{h})，无法拆分网格")
        return [None, None, None, None]

    quadrants = [
        (0, 0, half_w, half_h),            # top-left → FRONT
        (half_w, 0, w, half_h),            # top-right → BACK
        (0, half_h, half_w, h),            # bottom-left → LEFT
        (half_w, half_h, w, h),            # bottom-right → RIGHT
    ]

    views: list[Optional[bytes]] = []
    for left, upper, right, lower in quadrants:
        try:
            cell = img.crop((left, upper, right, lower))
            buf = io.BytesIO()
            cell.save(buf, format="PNG")
            views.append(buf.getvalue())
        except Exception as e:
            print(f"[NanoBanana] 裁剪视图失败: {e}")
            views.append(None)

    return views
