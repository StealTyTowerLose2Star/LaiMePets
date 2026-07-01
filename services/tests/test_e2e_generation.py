"""端到端测试：照片上传 → AI 生成 → 模型下载（mock 模式）"""
from __future__ import annotations

import io
import time

import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def create_test_photo(filename: str, size: tuple[int, int] = (512, 512),
                      color: tuple[int, int, int] = (200, 150, 100)) -> tuple[str, bytes, io.BytesIO]:
    """生成一张模拟宠物照片（纯色 + 随机纹理）"""
    arr = np.random.randint(0, 30, (size[1], size[0], 3), dtype=np.uint8)
    bg = np.full((size[1], size[0], 3), color, dtype=np.uint8)
    # 混合纯色底 + 纹理，模拟真实照片
    img_arr = np.clip(bg.astype(int) + arr.astype(int) - 15, 0, 255).astype(np.uint8)
    img = Image.fromarray(img_arr, "RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    buf.seek(0)
    return filename, buf.getvalue(), buf


def test_e2e_mock_generation():
    """完整端到端流程测试"""
    print("=" * 60)
    print("🧪 LaiMePet AI 端到端测试（mock 模式）")
    print("=" * 60)

    # ── Step 1: 健康检查 ──
    print("\n[1/5] 健康检查…")
    r = client.get("/api/v1/health")
    assert r.status_code == 200, f"健康检查失败: {r.text}"
    health = r.json()
    print(f"  状态: {health['status']}, 模型: {health['ai_model']}, GPU: {health['gpu_available']}")

    # ── Step 2: 生成 3 张模拟宠物照片 ──
    print("\n[2/5] 准备测试照片（3 张模拟宠物照）…")
    photos = [
        create_test_photo("cat_front.jpg", color=(180, 140, 100)),   # 暖色（模拟橘猫正面）
        create_test_photo("cat_side.jpg", color=(160, 130, 90)),    # 侧面
        create_test_photo("cat_top.jpg", color=(200, 160, 120)),    # 俯视
    ]
    for name, data, _ in photos:
        print(f"  {name}: {len(data) // 1024} KB")

    # ── Step 3: 调用生成接口 ──
    print("\n[3/5] 提交生成任务…")
    files = [
        ("photos", (name, buf, "image/jpeg"))
        for name, _, buf in photos
    ]
    r = client.post("/api/v1/generate", data={"realism": 60, "pet_name": "测试猫"}, files=files)
    assert r.status_code == 200, f"生成请求失败 (HTTP {r.status_code}): {r.text}"
    task = r.json()
    task_id = task["task_id"]
    print(f"  task_id: {task_id}")
    print(f"  状态: {task['status']}, 预估: {task['estimated_seconds']}s")

    # ── Step 4: 轮询任务状态 ──
    print("\n[4/5] 等待生成完成…")
    max_wait = 30  # mock 模式很快，最多等 30s
    status = "pending"
    for i in range(max_wait * 2):  # 每 0.5s 轮询一次
        time.sleep(0.5)
        r = client.get(f"/api/v1/status/{task_id}")
        if r.status_code != 200:
            print(f"  查询失败: {r.text}")
            continue
        st = r.json()
        status = st["status"]
        print(f"  [{st['progress']:.0f}%] {st['status']} — {st['current_step']}")
        if status in ("completed", "failed"):
            break

    assert status == "completed", f"任务未完成，最终状态: {status}"
    pet_id = st.get("result", {}).get("pet_id")
    assert pet_id, f"生成成功但无 pet_id: {st}"
    print(f"  ✅ 生成完成! pet_id: {pet_id}")

    # ── Step 5: 下载并验证 GLB 模型 ──
    print("\n[5/5] 验证产出文件…")

    # 下载模型
    r = client.get(f"/api/v1/model/{pet_id}")
    assert r.status_code == 200, f"模型下载失败: {r.text}"
    glb_data = r.content
    print(f"  GLB 模型: {len(glb_data):,} bytes")

    # 验证 GLB magic number (glTF Binary: 0x46546C67 = "glTF")
    magic = int.from_bytes(glb_data[:4], "little")
    assert magic == 0x46546C67, f"无效的 GLB 文件（magic: {magic:#x}）"
    # 验证 version = 2
    version = int.from_bytes(glb_data[4:8], "little")
    assert version == 2, f"GLB 版本应为 2，实际: {version}"
    print(f"  GLB magic: ✅, version: {version}")

    # 下载缩略图
    r = client.get(f"/api/v1/model/{pet_id}/thumbnail")
    assert r.status_code == 200, f"缩略图下载失败: {r.text}"
    thumb_data = r.content
    print(f"  缩略图: {len(thumb_data):,} bytes")

    # 验证缩略图是有效的 PNG
    assert thumb_data[:4] == b"\x89PNG", "缩略图不是有效的 PNG"
    print(f"  缩略图格式: ✅ PNG")

    # 列出所有宠物
    r = client.get("/api/v1/pets")
    assert r.status_code == 200
    pets = r.json()
    print(f"  已生成宠物数: {len(pets)}")
    assert any(p["pet_id"] == pet_id for p in pets), "新生成的 pet_id 不在列表中"

    print("\n" + "=" * 60)
    print("✅ 端到端测试全部通过！")
    print(f"   pet_id: {pet_id}")
    print(f"   GLB: {len(glb_data):,} bytes (有效)")
    print(f"   缩略图: {len(thumb_data):,} bytes (PNG)")
    print("=" * 60)

    return pet_id, glb_data


if __name__ == "__main__":
    pet_id, glb_data = test_e2e_mock_generation()
