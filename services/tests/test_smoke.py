"""Smoke 测试 — Mock 模式全链路（每次 commit 运行，无需 API Key）"""
from __future__ import annotations

from fastapi.testclient import TestClient

from config import settings
from main import app
from tests.conftest import run_e2e_pipeline


def test_smoke_mock_full_pipeline():
    """
    Smoke: Mock 模式端到端。验证：
    - Health check 正常
    - 照片上传 + 质量验证通过
    - 异步任务从 pending → completed
    - GLB 下载 + magic/version 校验
    - 缩略图下载 + PNG 校验
    - 宠物列表包含新生成的 pet_id
    """
    settings.ai_model = "mock"
    client = TestClient(app)

    result = run_e2e_pipeline(client, backend="mock", pet_name="Smoke-Test")

    assert result["error"] is None, f"Smoke test failed: {result['error']}"
    assert result["glb_bytes"] > 0, "GLB file is empty"
    assert result["thumb_bytes"] > 0, "Thumbnail is empty"

    # 验证宠物列表
    r = client.get("/api/v1/pets")
    assert r.status_code == 200
    pets = r.json()
    assert any(p["pet_id"] == result["pet_id"] for p in pets), (
        f"pet_id {result['pet_id']} not found in /pets list"
    )

    print(f"\n  [PASS] Smoke: pet_id={result['pet_id']}, "
          f"GLB={result['glb_bytes']:,}B, thumb={result['thumb_bytes']:,}B")


def test_smoke_health_check():
    """验证 health check 返回正确的结构"""
    settings.ai_model = "mock"
    client = TestClient(app)

    r = client.get("/api/v1/health")
    assert r.status_code == 200

    health = r.json()
    assert health["status"] == "ok"
    assert health["ai_model"] == "mock"
    assert "version" in health
    assert "gpu_available" in health
