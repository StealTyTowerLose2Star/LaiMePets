"""Cloud API E2E 测试 — 参数化多后端（需 API Key，按需 / 每日定时运行）"""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from config import settings
from main import app
from tests.conftest import run_e2e_pipeline


# ── Backend 定义 ──
# 每个 backend 需对应的 API Key 环境变量，未设置时自动 skip

CLOUD_BACKENDS = [
    pytest.param(
        "dashscope",
        marks=pytest.mark.skipif(
            not os.getenv("DASHSCOPE_API_KEY") and not settings.dashscope_api_key,
            reason="DASHSCOPE_API_KEY not set",
        ),
    ),
    pytest.param(
        "replicate",
        marks=pytest.mark.skipif(
            not os.getenv("REPLICATE_API_TOKEN") and not settings.replicate_api_token,
            reason="REPLICATE_API_TOKEN not set",
        ),
    ),
    pytest.param(
        "tripo",
        marks=pytest.mark.skipif(
            not os.getenv("TRIPO_API_KEY") and not settings.tripo_api_key,
            reason="TRIPO_API_KEY not set",
        ),
    ),
    pytest.param(
        "meshy",
        marks=pytest.mark.skipif(
            not os.getenv("MESHY_API_KEY") and not settings.meshy_api_key,
            reason="MESHY_API_KEY not set",
        ),
    ),
]


@pytest.mark.integration
@pytest.mark.parametrize("backend", CLOUD_BACKENDS)
def test_e2e_cloud_pipeline(backend: str):
    """
    Integration: Cloud API 端到端（需 API Key）。

    每个已配置 API Key 的 backend 都会独立运行完整管线。
    """
    client = TestClient(app)

    print(f"\n{'='*60}")
    print(f"[E2E] Testing backend: {backend}")
    print(f"{'='*60}")

    result = run_e2e_pipeline(client, backend=backend, pet_name=f"E2E-{backend}")

    assert result["error"] is None, (
        f"[{backend}] E2E failed: {result['error']}"
    )
    assert result["glb_bytes"] > 0, f"[{backend}] GLB is empty"

    print(f"\n  [PASS] [{backend}]: pet_id={result['pet_id']}, "
          f"GLB={result['glb_bytes']:,}B, thumb={result['thumb_bytes']:,}B")
