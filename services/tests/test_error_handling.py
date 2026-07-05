"""Negative 测试 — 参数校验、错误处理、并发隔离（每次 commit 运行）"""
from __future__ import annotations

import asyncio
import threading
import time

import pytest
from fastapi.testclient import TestClient

from config import settings
from main import app
from tests.conftest import create_test_photo, create_low_quality_photo


# ── 照片验证拒绝 ──


def test_reject_insufficient_photos():
    """上传少于最低要求数量的照片 → 400"""
    settings.ai_model = "mock"
    client = TestClient(app)

    photo = create_test_photo()
    files = [("photos", ("test.jpg", photo, "image/jpeg"))]

    r = client.post("/api/v1/generate", data={"realism": 50}, files=files)
    assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
    assert "至少需要" in r.json()["detail"], f"Unexpected error: {r.json()}"


def test_reject_too_many_photos():
    """上传超过 50 张照片 → 400"""
    settings.ai_model = "mock"
    client = TestClient(app)

    files = [
        ("photos", ("test.jpg", create_test_photo(), "image/jpeg"))
        for _ in range(51)
    ]

    r = client.post("/api/v1/generate", data={"realism": 50}, files=files)
    assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
    assert "50" in r.json()["detail"]


def test_reject_low_quality_photo():
    """上传低质量照片（小尺寸+模糊） → 422"""
    settings.ai_model = "mock"
    client = TestClient(app)

    # 3 张都是低质量
    low_q = create_low_quality_photo(size=(100, 100))
    files = [
        ("photos", (f"blurry_{i}.jpg", low_q, "image/jpeg"))
        for i in range(3)
    ]

    r = client.post("/api/v1/generate", data={"realism": 50}, files=files)
    assert r.status_code == 422, f"Expected 422, got {r.status_code}: {r.text}"
    detail = r.json()["detail"]
    assert "照片质量不足" in detail["error"] or detail["message"]


def test_reject_unsupported_format():
    """上传不支持的格式 → 422（全部被拒）"""
    settings.ai_model = "mock"
    client = TestClient(app)

    # 用 BMP 头伪造一张"bmp"文件
    import io
    from PIL import Image
    img = Image.new("RGB", (512, 512), color=(200, 150, 100))
    buf = io.BytesIO()
    img.save(buf, format="BMP")
    buf.seek(0)

    files = [
        ("photos", (f"cat_{i}.bmp", buf, "image/bmp"))
        for i in range(3)
    ]

    r = client.post("/api/v1/generate", data={"realism": 50}, files=files)
    assert r.status_code == 422, f"Expected 422, got {r.status_code}: {r.text}"


# ── 任务查询 ──


def test_nonexistent_task_returns_404():
    """查询不存在的任务 ID → 404"""
    settings.ai_model = "mock"
    client = TestClient(app)

    r = client.get("/api/v1/status/nonexistent-task-id-12345")
    assert r.status_code == 404


def test_nonexistent_model_returns_404():
    """下载不存在的模型 → 404"""
    settings.ai_model = "mock"
    client = TestClient(app)

    r = client.get("/api/v1/model/nonexistent-pet-id")
    assert r.status_code == 404


# ── 并发任务隔离 ──


def test_concurrent_tasks_independent():
    """同时提交 2 个任务，各自独立完成，不串号"""
    settings.ai_model = "mock"
    client = TestClient(app)

    results = {}

    def submit_and_poll(label: str, color: tuple):
        photos = [
            create_test_photo(color=color),
            create_test_photo(color=(color[0] + 10, color[1] - 10, color[2] + 10)),
            create_test_photo(color=(color[0] - 10, color[1] + 10, color[2] - 10)),
        ]
        files = [
            ("photos", (f"{label}_{i}.jpg", buf, "image/jpeg"))
            for i, buf in enumerate(photos)
        ]
        r = client.post(
            "/api/v1/generate",
            data={"realism": 50, "pet_name": label},
            files=files,
        )
        assert r.status_code == 200, f"[{label}] Submit failed: {r.text}"
        task_id = r.json()["task_id"]

        # Poll
        status = "pending"
        for _ in range(60):
            time.sleep(0.5)
            sr = client.get(f"/api/v1/status/{task_id}")
            if sr.status_code != 200:
                continue
            st = sr.json()
            status = st["status"]
            if status in ("completed", "failed"):
                break

        results[label] = {
            "task_id": task_id,
            "status": status,
            "pet_id": st.get("result", {}).get("pet_id") if status == "completed" else None,
        }

    # 启动 2 个并发线程
    t1 = threading.Thread(target=submit_and_poll, args=("CatA", (180, 140, 100)))
    t2 = threading.Thread(target=submit_and_poll, args=("CatB", (100, 180, 140)))

    t1.start()
    t2.start()
    t1.join()
    t2.join()

    # 验证两个任务都成功
    assert results["CatA"]["status"] == "completed", f"CatA failed: {results['CatA']}"
    assert results["CatB"]["status"] == "completed", f"CatB failed: {results['CatB']}"

    # 验证 pet_id 不同（不串号）
    assert results["CatA"]["pet_id"] != results["CatB"]["pet_id"], (
        f"Task IDs should be different! CatA={results['CatA']['pet_id']}, "
        f"CatB={results['CatB']['pet_id']}"
    )

    print(f"\n  [PASS] Concurrent: CatA={results['CatA']['pet_id']}, "
          f"CatB={results['CatB']['pet_id']} — independent")
