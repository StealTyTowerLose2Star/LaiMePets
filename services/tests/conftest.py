"""共享测试 fixtures 和辅助函数"""

from __future__ import annotations

import io
from pathlib import Path

import numpy as np
from PIL import Image


def create_test_photo(
    size: tuple[int, int] = (512, 512),
    color: tuple[int, int, int] = (200, 150, 100),
) -> io.BytesIO:
    """生成一张模拟宠物照片（带真实纹理，能通过清晰度检测）"""
    rng = np.random.default_rng()
    arr = rng.integers(0, 200, (size[1], size[0], 3), dtype=np.uint8)
    bg = np.full((size[1], size[0], 3), color, dtype=np.uint8)
    img_arr = np.clip(bg.astype(int) + arr.astype(int) - 100, 0, 255).astype(np.uint8)
    img = Image.fromarray(img_arr, "RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    buf.seek(0)
    return buf


def create_low_quality_photo(size: tuple[int, int] = (100, 100)) -> io.BytesIO:
    """生成一张低质量照片（小尺寸 + 模糊，应被质量检测拒绝）"""
    img = Image.new("RGB", size, color=(128, 128, 128))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=10)
    buf.seek(0)
    return buf


def validate_glb(data: bytes) -> dict:
    """验证 GLB 二进制格式"""
    if len(data) < 12:
        return {"valid": False, "magic": None, "version": None, "size": len(data)}
    magic = int.from_bytes(data[:4], "little")
    version = int.from_bytes(data[4:8], "little")
    return {
        "valid": magic == 0x46546C67 and version == 2,
        "magic": hex(magic) if magic else None,
        "version": version,
        "size": len(data),
    }


def validate_png(data: bytes) -> bool:
    """验证 PNG 文件头"""
    return data[:4] == b"\x89PNG"


def run_e2e_pipeline(client, backend: str, pet_name: str = "E2E-Test") -> dict:
    """
    执行标准 E2E 管道：health → upload → poll → download → validate。

    返回 {"pet_id": str, "glb_bytes": int, "thumb_bytes": int, "error": str|None}
    """
    import asyncio

    from config import settings

    settings.ai_model = backend

    # 1. Health check
    r = client.get("/api/v1/health")
    if r.status_code != 200:
        return {"error": f"Health check failed: {r.status_code}"}

    # 2. Prepare photos
    photos = [
        create_test_photo(color=(180, 140, 100)),
        create_test_photo(color=(160, 130, 90)),
        create_test_photo(color=(200, 160, 120)),
    ]

    # 3. Submit generation
    files = [
        ("photos", (f"test_{i}.jpg", buf, "image/jpeg"))
        for i, buf in enumerate(photos)
    ]
    r = client.post(
        "/api/v1/generate",
        data={"realism": 60, "pet_name": pet_name},
        files=files,
    )
    if r.status_code != 200:
        return {"error": f"Generate failed (HTTP {r.status_code}): {r.text[:200]}"}

    task = r.json()
    task_id = task["task_id"]

    # 4. Poll for completion
    status = "pending"
    for _ in range(240):  # max 120s
        try:
            loop = asyncio.get_event_loop()
            loop.run_until_complete(asyncio.sleep(0.5))
        except RuntimeError:
            asyncio.run(asyncio.sleep(0.5))
        r = client.get(f"/api/v1/status/{task_id}")
        if r.status_code != 200:
            continue
        st = r.json()
        status = st["status"]
        if status in ("completed", "failed"):
            break

    if status != "completed":
        msg = st.get("message", "") if "st" in dir() else ""
        return {"error": f"Task {task_id} ended as '{status}': {msg[:200]}"}

    pet_id = st.get("result", {}).get("pet_id")
    if not pet_id:
        return {"error": "No pet_id in completed task"}

    # 5. Download & validate GLB
    r = client.get(f"/api/v1/model/{pet_id}")
    if r.status_code != 200:
        return {"error": f"Model download failed: {r.status_code}"}

    glb_data = r.content
    glb_check = validate_glb(glb_data)
    if not glb_check["valid"]:
        return {"error": f"Invalid GLB: magic={glb_check['magic']}, v={glb_check['version']}"}

    # 6. Download & validate thumbnail
    r = client.get(f"/api/v1/model/{pet_id}/thumbnail")
    if r.status_code != 200:
        return {"error": f"Thumbnail download failed: {r.status_code}"}

    thumb_data = r.content
    if not validate_png(thumb_data):
        return {"error": "Thumbnail is not a valid PNG"}

    return {
        "pet_id": pet_id,
        "glb_bytes": len(glb_data),
        "thumb_bytes": len(thumb_data),
        "error": None,
    }


# ── 真实照片 fixtures ──


def load_geigei_photos() -> list[bytes]:
    """加载 Geigei01-03 真实猫照（用于预处理保真度测试）"""
    photos = []
    test_dir = Path(__file__).parent
    for i in range(1, 4):
        path = test_dir / f"Geigei{i:02d}.jpg"
        if path.exists():
            photos.append(path.read_bytes())
    return photos


def load_geigei_photo(index: int) -> bytes | None:
    """加载单张 Geigei 照片（1-indexed）"""
    path = Path(__file__).parent / f"Geigei{index:02d}.jpg"
    if path.exists():
        return path.read_bytes()
    return None
