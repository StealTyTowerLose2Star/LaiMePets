"""E2E test: DashScope (Alibaba Cloud Bailian) — Photo → 3D Model"""
from __future__ import annotations

import asyncio
import io

import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

from config import settings
from main import app

# Use DashScope for this test
settings.ai_model = "dashscope"

client = TestClient(app)


def create_test_photo(size=(320, 320), color=(180, 140, 100)):
    """Generate a test photo that passes quality checks."""
    rng = np.random.default_rng()
    arr = rng.integers(0, 200, (size[1], size[0], 3), dtype=np.uint8)
    bg = np.full((size[1], size[0], 3), color, dtype=np.uint8)
    img_arr = np.clip(bg.astype(int) + arr.astype(int) - 100, 0, 255).astype(np.uint8)
    img = Image.fromarray(img_arr, "RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    buf.seek(0)
    return buf


def test_e2e_dashscope_generation():
    """Full E2E: FastAPI → DashScope Tripo → GLB download"""
    print("=" * 60)
    print("[TEST] LaiMePet AI E2E — DashScope (Alibaba Cloud)")
    print("=" * 60)

    # ── Step 1: Health check ──
    print("\n[1/5] Health check...")
    r = client.get("/api/v1/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    health = r.json()
    print(f"  Model: {health['ai_model']}, GPU: {health['gpu_available']}")

    # ── Step 2: Prepare test photos ──
    print("\n[2/5] Prepare test photos (3 simulated pet photos)...")
    photos = [
        create_test_photo(color=(180, 140, 100)),
        create_test_photo(color=(160, 130, 90)),
        create_test_photo(color=(200, 160, 120)),
    ]
    print(f"  Generated {len(photos)} photos")

    # ── Step 3: Submit generation ──
    print("\n[3/5] Submit generation task...")
    files = [
        ("photos", (f"test_{i}.jpg", buf, "image/jpeg"))
        for i, buf in enumerate(photos)
    ]
    r = client.post("/api/v1/generate", data={"realism": 60, "pet_name": "DashScope-Test"}, files=files)
    assert r.status_code == 200, f"Generate failed (HTTP {r.status_code}): {r.text}"
    task = r.json()
    task_id = task["task_id"]
    print(f"  task_id: {task_id}")
    print(f"  status: {task['status']}, est: {task['estimated_seconds']}s")

    # ── Step 4: Poll for completion ──
    print("\n[4/5] Waiting for DashScope (typically 10-30s)...")
    max_wait = 120  # DashScope can take up to 60s
    status = "pending"
    for i in range(max_wait * 2):
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
        step = st.get("current_step", "")
        print(f"  [{st['progress']:.0f}%] {status} — {step}")
        if status in ("completed", "failed"):
            break

    assert status == "completed", f"Task not completed, final: {status} — {st.get('message', '')}"
    pet_id = st.get("result", {}).get("pet_id")
    assert pet_id, f"No pet_id: {st}"
    print(f"  [OK] Generated! pet_id: {pet_id}")

    # ── Step 5: Download & validate GLB ──
    print("\n[5/5] Download and validate GLB...")

    r = client.get(f"/api/v1/model/{pet_id}")
    assert r.status_code == 200, f"Model download failed: {r.text}"
    glb_data = r.content
    print(f"  GLB: {len(glb_data):,} bytes")

    # Validate GLB
    magic = int.from_bytes(glb_data[:4], "little")
    version = int.from_bytes(glb_data[4:8], "little")
    assert magic == 0x46546C67, f"Invalid GLB (magic: {magic:#x})"
    assert version == 2, f"GLB version != 2: {version}"
    print(f"  GLB: magic=OK, version={version}")

    # Download thumbnail
    r = client.get(f"/api/v1/model/{pet_id}/thumbnail")
    assert r.status_code == 200, f"Thumbnail failed: {r.text}"
    thumb_data = r.content
    assert thumb_data[:4] == b"\x89PNG", "Not valid PNG"
    print(f"  Thumbnail: {len(thumb_data):,} bytes PNG [OK]")

    print("\n" + "=" * 60)
    print("[PASS] DashScope E2E test passed!")
    print(f"      pet_id: {pet_id}")
    print(f"      GLB: {len(glb_data):,} bytes (valid)")
    print(f"      Thumbnail: {len(thumb_data):,} bytes (PNG)")
    print("=" * 60)

    return pet_id, glb_data


if __name__ == "__main__":
    test_e2e_dashscope_generation()
