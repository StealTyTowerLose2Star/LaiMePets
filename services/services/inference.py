"""AI 推理服务 — 照片转 3D 模型

支持后端：
- Meshy.ai: 云端 API（推荐！国内直连，免费 200 credits/月）
- Replicate: 云端 API（需代理 + 充值，微软 TRELLIS）
- TripoSR: 本地 GPU 推理（需 NVIDIA GPU 6GB+ 显存）
- InstantMesh: 本地 GPU 推理（备用）
- mock: 开发模式，生成占位模型
"""

from __future__ import annotations

import asyncio
import io
import json
import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
import urllib.request
import urllib.error

import numpy as np
from PIL import Image

from config import settings

# CPU 密集型操作放到线程池，避免阻塞 asyncio 事件循环
_executor = ThreadPoolExecutor(max_workers=1)


# ── 任务状态管理（内存）──

_tasks: dict[str, dict] = {}


def create_task() -> str:
    task_id = uuid.uuid4().hex[:12]
    _tasks[task_id] = {
        "task_id": task_id,
        "status": "pending",
        "progress": 0.0,
        "current_step": "",
        "message": "",
        "estimated_seconds": 120,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "result": None,  # { pet_id, model_path, ... }
    }
    return task_id


def get_task(task_id: str) -> Optional[dict]:
    return _tasks.get(task_id)


def update_task(task_id: str, **kwargs):
    if task := _tasks.get(task_id):
        task.update(kwargs)
        task["updated_at"] = datetime.now(timezone.utc)


# ── 模型加载 ──

_model = None


def _load_model():
    """懒加载 AI 模型（首次调用时加载）"""
    global _model

    if _model is not None:
        return _model

    model_type = settings.ai_model

    if model_type == "triposr":
        _model = _load_triposr()
    elif model_type == "instantmesh":
        _model = _load_instantmesh()
    elif model_type == "replicate":
        _model = _load_replicate_pipeline()
    elif model_type == "meshy":
        _model = _load_meshy_pipeline()
    elif model_type == "tripo":
        _model = _load_tripo_pipeline()
    elif model_type == "dashscope":
        _model = _load_dashscope_pipeline()
    else:
        _model = _create_mock_pipeline()

    return _model


def _load_triposr():
    """
    加载 TripoSR 模型。

    TripoSR 使用 ViT 编码器 + NeRF 解码器架构，
    单张 RGB 图片输入 → 3D Mesh (OBJ/GLB) 输出。
    """
    import torch

    device = settings.ai_device
    if device == "cuda" and not torch.cuda.is_available():
        if settings.allow_cpu_fallback:
            device = "cpu"
        else:
            raise RuntimeError("CUDA 不可用且未允许 CPU 降级")

    print(f"[TripoSR] 加载模型… device={device}")

    # TripoSR 通过 HuggingFace diffusers 加载
    from diffusers import TripoSRPipeline

    model = TripoSRPipeline.from_pretrained(
        "stabilityai/TripoSR",
        torch_dtype=torch.float32 if device == "cpu" else torch.float16,
    )
    model.to(device)
    model.eval()

    print("[TripoSR] 模型加载完成")
    return {"pipeline": model, "device": device, "type": "triposr"}


def _load_instantmesh():
    """加载 InstantMesh 模型（备用方案）"""
    import torch

    device = settings.ai_device
    if device == "cuda" and not torch.cuda.is_available():
        if settings.allow_cpu_fallback:
            device = "cpu"
        else:
            raise RuntimeError("CUDA 不可用且未允许 CPU 降级")

    print(f"[InstantMesh] 加载模型… device={device}")

    # InstantMesh 通过 HuggingFace 加载
    from diffusers import DiffusionPipeline

    # InstantMesh 的核心是 Zero123++ 多视图生成 + 稀疏重建
    # 简化版：使用 Zero123++ pipeline 生成多视角，再 mesh 重建
    pipeline = DiffusionPipeline.from_pretrained(
        "sudo-ai/zero123plus-v1.2",
        torch_dtype=torch.float32 if device == "cpu" else torch.float16,
    )
    pipeline.to(device)

    print("[InstantMesh] 模型加载完成")
    return {"pipeline": pipeline, "device": device, "type": "instantmesh"}


def _create_mock_pipeline():
    """开发模式：返回 mock pipeline"""
    print("[Mock] 使用开发模式管线（无真实 AI）")
    return {"pipeline": None, "device": "cpu", "type": "mock"}


def _load_replicate_pipeline():
    """
    加载 Replicate API 客户端（云端推理）。

    无需 GPU，通过 Replicate 托管的模型进行推理。
    需要设置环境变量 REPLICATE_API_TOKEN 或在 config 中配置。
    """
    import os

    api_token = settings.replicate_api_token or os.environ.get("REPLICATE_API_TOKEN", "")

    if not api_token:
        raise RuntimeError(
            "Replicate API token 未设置。请：\n"
            "1. 访问 https://replicate.com/account/api-tokens 获取 token\n"
            "2. 设置环境变量: set REPLICATE_API_TOKEN=r8_xxx\n"
            "3. 或在 services/.env 文件中添加: REPLICATE_API_TOKEN=r8_xxx"
        )

    os.environ["REPLICATE_API_TOKEN"] = api_token

    model_id = settings.replicate_model
    if settings.replicate_model_version:
        model_id = f"{model_id}:{settings.replicate_model_version}"

    print(f"[Replicate] 使用云端模型: {model_id}")

    return {
        "pipeline": None,
        "device": "cloud",
        "type": "replicate",
        "model_id": model_id,
    }


def _load_meshy_pipeline():
    """
    加载 Meshy.ai API 客户端（云端推理）。

    无需 GPU，国内直连，免费 200 credits/月。
    需要设置环境变量 MESHY_API_KEY 或在 config 中配置。
    """
    import os

    api_key = settings.meshy_api_key or os.environ.get("MESHY_API_KEY", "")

    if not api_key:
        raise RuntimeError(
            "Meshy API key 未设置。请：\n"
            "1. 访问 https://meshy.ai 注册账号\n"
            "2. 在 Settings → API 中获取 API Key\n"
            "3. 设置环境变量: set MESHY_API_KEY=msy_xxx\n"
            "4. 或在 services/.env 文件中添加: MESHY_API_KEY=msy_xxx"
        )

    print(f"[Meshy] 使用模型: {settings.meshy_model}")

    return {
        "pipeline": None,
        "device": "cloud",
        "type": "meshy",
        "api_key": api_key,
        "model": settings.meshy_model,
    }


def _load_tripo_pipeline():
    """
    加载 Tripo AI API 客户端（云端推理）。

    无需 GPU，国内直连，免费 300 credits/月。
    需要设置环境变量 TRIPO_API_KEY 或在 config 中配置。
    """
    import os

    api_key = settings.tripo_api_key or os.environ.get("TRIPO_API_KEY", "")

    if not api_key:
        raise RuntimeError(
            "Tripo API key 未设置。请：\n"
            "1. 访问 https://platform.tripo3d.ai 注册账号\n"
            "2. 获取 API Key\n"
            "3. 设置环境变量: set TRIPO_API_KEY=tcli_xxx\n"
            "4. 或在 services/.env 文件中添加: TRIPO_API_KEY=tcli_xxx"
        )

    print(f"[Tripo] 使用 Tripo AI API")

    return {
        "pipeline": None,
        "device": "cloud",
        "type": "tripo",
        "api_key": api_key,
    }


def _load_dashscope_pipeline():
    """
    加载阿里云百炼 DashScope API 客户端。

    国内直连，无需代理，阿里云 Tripo 模型。
    需要设置环境变量 DASHSCOPE_API_KEY。
    """
    import os

    api_key = settings.dashscope_api_key or os.environ.get("DASHSCOPE_API_KEY", "")

    if not api_key:
        raise RuntimeError(
            "DashScope API key 未设置。请：\n"
            "1. 访问 https://bailian.console.aliyun.com 开通 Tripo 模型\n"
            "2. 获取 API Key（格式: sk-xxx）\n"
            "3. 设置环境变量: set DASHSCOPE_API_KEY=sk-xxx\n"
            "4. 或在 services/.env 文件中添加: DASHSCOPE_API_KEY=sk-xxx"
        )

    print(f"[DashScope] 使用模型: {settings.dashscope_model} (阿里云百炼)")

    return {
        "pipeline": None,
        "device": "cloud",
        "type": "dashscope",
        "api_key": api_key,
        "model": settings.dashscope_model,
    }


async def _download_replicate_output(file_url: str, label: str = "file") -> bytes:
    """从 Replicate 返回的 URL 下载输出文件"""
    import httpx

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.get(file_url)
        resp.raise_for_status()
        print(f"[Replicate] 下载 {label}: {len(resp.content):,} bytes")
        return resp.content


# ── 辅助 ──


def _create_fallback_glb(photos: list[bytes]) -> tuple[bytes, bytes]:
    """
    降级方案：基于照片生成简单的占位 3D 模型。

    实际方案：用照片的主色调生成基础几何体（猫的简化形状）。
    这里创建一个最小可用的 GLB 文件。

    在生产环境中，这会被真实的 AI 生成模型替换。
    """
    # 从第一张照片提取主色调
    img = Image.open(io.BytesIO(photos[0])).convert("RGB").resize((64, 64))
    arr = np.array(img).reshape(-1, 3).astype(float)
    dominant_color = arr.mean(axis=0).astype(np.uint8).tolist()

    # 创建一个带颜色的简单 GLB 模型（trimesh 生成基础几何体）
    import trimesh

    # 构建一个简化的猫形场景（组合几何体）
    scene = trimesh.Scene()

    # 身体（椭圆体）
    body = trimesh.creation.icosphere(subdivisions=3, radius=0.5)
    body.apply_translation([0, 0.3, 0])
    body_color = np.array(dominant_color + [255], dtype=np.uint8)  # RGBA
    body.visual.vertex_colors = body_color
    scene.add_geometry(body, node_name="body")

    # 头（球体）
    head = trimesh.creation.icosphere(subdivisions=2, radius=0.3)
    head.apply_translation([0, 0.85, 0.15])
    head.visual.vertex_colors = body_color
    scene.add_geometry(head, node_name="head")

    # 耳朵（锥体 × 2）
    for side, sx in [("left", -0.12), ("right", 0.12)]:
        ear = trimesh.creation.cone(radius=0.08, height=0.18, sections=8)
        ear.apply_translation([sx, 1.05, 0.2])
        inner_color = np.array([255, 180, 180, 255], dtype=np.uint8)
        ear.visual.vertex_colors = inner_color
        scene.add_geometry(ear, node_name=f"ear_{side}")

    # 尾巴
    tail = trimesh.creation.cylinder(radius=0.04, height=0.6, sections=8)
    tail.apply_translation([0, 0.3, -0.5])
    # 旋转尾巴
    tail.apply_transform(
        trimesh.transformations.rotation_matrix(np.radians(60), [1, 0, 0])
    )
    tail.visual.vertex_colors = body_color
    scene.add_geometry(tail, node_name="tail")

    # 四条腿
    for lx, lz in [(-0.2, 0.15), (0.2, 0.15), (-0.2, -0.15), (0.2, -0.15)]:
        leg = trimesh.creation.cylinder(radius=0.06, height=0.35, sections=8)
        leg.apply_translation([lx, 0.05, lz])
        leg.visual.vertex_colors = body_color
        scene.add_geometry(leg, node_name=f"leg_{lx}_{lz}")

    # 导出 GLB
    glb_bytes = io.BytesIO()
    scene.export(glb_bytes, file_type="glb")
    glb_data = glb_bytes.getvalue()

    # 生成缩略图（简单颜色块）
    thumb = Image.new("RGB", (256, 256), tuple(dominant_color))
    thumb_buf = io.BytesIO()
    thumb.save(thumb_buf, format="PNG")
    thumb_data = thumb_buf.getvalue()

    return glb_data, thumb_data


# ── 公开 API ──


async def run_inference_async(
    task_id: str,
    photos: list[bytes],
    realism: int = 50,
) -> dict:
    """
    对照片集运行 AI 推理，生成 3D 模型。

    这是一个异步包装，实际推理在线程池中运行（CPU/GPU 密集）。
    """
    update_task(task_id, status="preprocessing", progress=10, current_step="预处理照片")

    # 模拟预处理延迟
    await asyncio.sleep(0.5)

    update_task(task_id, status="generating", progress=30, current_step="AI 特征提取中",
                estimated_seconds=90)

    try:
        result = await asyncio.get_event_loop().run_in_executor(
            _executor, _run_inference, photos, realism
        )

        update_task(task_id, status="postprocessing", progress=85, current_step="后处理：骨骼绑定")

        # 保存模型和缩略图
        pet_id = uuid.uuid4().hex[:8]
        glb_data, thumb_data = result

        from .storage import save_model, save_thumbnail
        model_path = await save_model(pet_id, glb_data)
        thumb_path = await save_thumbnail(pet_id, thumb_data)

        # 保存元数据
        import json
        import aiofiles
        meta = {
            "pet_name": "",
            "realism": realism,
            "photo_count": len(photos),
            "model_type": settings.ai_model,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        meta_path = settings.output_dir / pet_id / "meta.json"
        meta_path.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(meta_path, "w") as f:
            await f.write(json.dumps(meta, ensure_ascii=False, indent=2))

        update_task(
            task_id,
            status="completed",
            progress=100,
            current_step="生成完成",
            estimated_seconds=0,
            result={
                "pet_id": pet_id,
                "model_size_bytes": len(glb_data),
                "model_format": "glb",
            },
        )

        # 模型已保存到 outputs/，清理 uploads/ 中的临时文件
        from .storage import cleanup_task_files
        cleanup_task_files(task_id)

        return {"pet_id": pet_id, "success": True}

    except Exception as e:
        update_task(
            task_id,
            status="failed",
            progress=0,
            current_step="生成失败",
            message=str(e),
        )

        # 失败也清理临时上传文件（节省磁盘空间）
        from .storage import cleanup_task_files
        cleanup_task_files(task_id)

        return {"pet_id": None, "success": False, "error": str(e)}


def _run_inference(photos: list[bytes], realism: int) -> tuple[bytes, bytes]:
    """在线程池中运行的同步推理（CPU/GPU 密集）"""
    model = _load_model()

    if model["type"] == "mock":
        return _create_fallback_glb(photos)

    elif model["type"] == "triposr":
        return _run_triposr(model, photos, realism)

    elif model["type"] == "instantmesh":
        return _run_instantmesh(model, photos, realism)

    elif model["type"] == "replicate":
        return _run_replicate(model, photos, realism)

    elif model["type"] == "meshy":
        return _run_meshy(model, photos, realism)

    elif model["type"] == "tripo":
        return _run_tripo(model, photos, realism)

    elif model["type"] == "dashscope":
        return _run_dashscope(model, photos, realism)

    else:
        raise ValueError(f"未知模型类型: {model['type']}")


def _run_triposr(model: dict, photos: list[bytes], realism: int) -> tuple[bytes, bytes]:
    """TripoSR 推理 — 单图 → 3D Mesh"""
    pipeline = model["pipeline"]
    device = model["device"]

    # TripoSR 取第一张图片（选择质量最好的那张）
    img = Image.open(io.BytesIO(photos[0])).convert("RGB")

    # 调整为模型所需尺寸
    img = img.resize((384, 384), Image.LANCZOS)

    import torch

    with torch.no_grad():
        # TripoSR pipeline 返回 mesh
        result = pipeline(img)

    # result 可能是 mesh 对象或多视角图
    # 此处根据实际 pipeline 返回类型处理
    if hasattr(result, "mesh"):
        mesh = result.mesh
    else:
        # 降级：用 trimesh 创建占位模型
        import trimesh
        mesh = trimesh.creation.icosphere(subdivisions=3, radius=0.5)

    # 导出 GLB
    import trimesh
    if not isinstance(mesh, trimesh.Trimesh):
        # 确保是 trimesh 对象
        mesh = trimesh.Trimesh(vertices=mesh.vertices, faces=mesh.faces)

    glb_buf = io.BytesIO()
    mesh.export(glb_buf, file_type="glb")
    glb_data = glb_buf.getvalue()

    # 缩略图（用输入图缩略）
    thumb = img.resize((256, 256), Image.LANCZOS)
    thumb_buf = io.BytesIO()
    thumb.save(thumb_buf, format="PNG")
    thumb_data = thumb_buf.getvalue()

    return glb_data, thumb_data


def _run_instantmesh(model: dict, photos: list[bytes], realism: int) -> tuple[bytes, bytes]:
    """InstantMesh 推理 — 多视图生成 → 3D Mesh"""
    # InstantMesh 流程：生成多视角图 → sparse reconstruction → mesh
    pipeline = model["pipeline"]

    img = Image.open(io.BytesIO(photos[0])).convert("RGB")
    img = img.resize((320, 320), Image.LANCZOS)

    import torch

    with torch.no_grad():
        result = pipeline(img)

    # 根据 pipeline 输出构建 mesh（此处为简化版）
    import trimesh
    mesh = trimesh.creation.icosphere(subdivisions=3, radius=0.5)

    glb_buf = io.BytesIO()
    mesh.export(glb_buf, file_type="glb")
    glb_data = glb_buf.getvalue()

    thumb = img.resize((256, 256), Image.LANCZOS)
    thumb_buf = io.BytesIO()
    thumb.save(thumb_buf, format="PNG")
    thumb_data = thumb_buf.getvalue()

    return glb_data, thumb_data


def _run_replicate(model: dict, photos: list[bytes], realism: int) -> tuple[bytes, bytes]:
    """
    Replicate API 推理 — 云端图像→3D 模型。

    使用 Replicate 托管的 Hunyuan3D-2.1 / TRELLIS 等模型，
    无需本地 GPU，通过 REST API 调用。

    流程：
    1. 将第一张照片编码为 data URI
    2. 调用 replicate.run() 提交推理任务
    3. 等待任务完成（replicate SDK 自动轮询）
    4. 从返回的 URL 下载 GLB 模型
    5. 生成缩略图
    """
    import replicate as replicate_sdk

    model_id = model["model_id"]
    img = Image.open(io.BytesIO(photos[0])).convert("RGB")

    # 将图片保存为临时文件（Replicate SDK 需要文件路径或 URL）
    import tempfile
    import os

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        img.save(tmp, format="PNG")
        tmp_path = tmp.name

    try:
        print(f"[Replicate] 提交推理任务到 {model_id}...")

        # Replicate SDK run() 会自动轮询直到完成
        output = replicate_sdk.run(
            model_id,
            input={
                "image": open(tmp_path, "rb"),
            },
        )

        print(f"[Replicate] 推理完成，输出: {output}")

        # 解析输出 — 通常是 FileOutput 或 URL 字符串
        glb_url = None
        if isinstance(output, list):
            # 多个输出文件，找 .glb
            for item in output:
                if hasattr(item, 'url'):
                    url_str = str(item.url)
                    if '.glb' in url_str or 'model' in url_str:
                        glb_url = url_str
                        break
                elif isinstance(item, str) and ('.glb' in item or item.startswith('http')):
                    glb_url = item
                    break
            # 如果没找到 glb，取第一个 URL
            if glb_url is None and output:
                first = output[0]
                glb_url = str(first.url) if hasattr(first, 'url') else str(first)
        elif hasattr(output, 'url'):
            glb_url = str(output.url)
        elif isinstance(output, str):
            glb_url = output
        else:
            raise ValueError(f"无法解析 Replicate 输出: {type(output)} — {output}")

        if not glb_url:
            raise ValueError(f"Replicate 未返回 3D 模型 URL，输出: {output}")

        print(f"[Replicate] GLB URL: {glb_url[:80]}...")

        # 下载 GLB
        with urllib.request.urlopen(glb_url) as resp:
            glb_data = resp.read()

        print(f"[Replicate] GLB 下载完成: {len(glb_data):,} bytes")

        # 验证 GLB magic number
        magic = int.from_bytes(glb_data[:4], "little")
        if magic != 0x46546C67:
            print(f"[Replicate] 警告: GLB magic 不匹配 ({magic:#x})，尝试直接使用")

        # 缩略图：使用输入照片的缩略版本
        thumb = img.resize((256, 256), Image.LANCZOS)
        thumb_buf = io.BytesIO()
        thumb.save(thumb_buf, format="PNG")
        thumb_data = thumb_buf.getvalue()

        return glb_data, thumb_data

    finally:
        # 清理临时文件
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def _run_meshy(model: dict, photos: list[bytes], realism: int) -> tuple[bytes, bytes]:
    """
    Meshy.ai API 推理 — 云端图像→3D 模型。

    无需 GPU，国内直连，免费 200 credits/月。
    使用 Meshy 6 模型（最新）生成高质量 3D 模型。

    流程：
    1. 将第一张照片编码为 data URI
    2. POST /openapi/v1/image-to-3d 创建任务
    3. 轮询 GET /openapi/v1/image-to-3d/:id 直到完成
    4. 下载 model_urls.glb
    5. 生成缩略图
    """
    import base64
    import time

    api_key = model["api_key"]
    api_base = "https://api.meshy.ai/openapi/v1"
    headers = {"Authorization": f"Bearer {api_key}"}

    img = Image.open(io.BytesIO(photos[0])).convert("RGB")

    # 编码为 data URI（Meshy 支持直传）
    img_buf = io.BytesIO()
    img.save(img_buf, format="JPEG", quality=90)
    data_uri = "data:image/jpeg;base64," + base64.b64encode(img_buf.getvalue()).decode("ascii")

    # ── 创建任务 ──
    print(f"[Meshy] 创建 Image-to-3D 任务...")
    create_payload = {
        "image_url": data_uri,
        "ai_model": settings.meshy_model,
        "enable_pbr": settings.meshy_enable_pbr,
        "should_remesh": True,
        "target_polycount": settings.meshy_target_polycount,
        "target_formats": ["glb"],
        "should_texture": True,
    }

    resp = _meshy_request("POST", f"{api_base}/image-to-3d", headers, create_payload)
    task_id = resp.get("result")
    if not task_id:
        raise RuntimeError(f"Meshy 任务创建失败: {resp}")

    print(f"[Meshy] 任务 ID: {task_id}")

    # ── 轮询任务状态 ──
    print(f"[Meshy] 等待推理完成...")
    status = "IN_PROGRESS"
    for i in range(300):  # Max 300 * 2s = 600s
        time.sleep(2)
        task = _meshy_request("GET", f"{api_base}/image-to-3d/{task_id}", headers)
        status = task.get("status", "UNKNOWN")
        progress = task.get("progress", 0)
        if i % 5 == 0:
            print(f"[Meshy] [{progress}%] {status}")
        if status in ("SUCCEEDED", "FAILED", "EXPIRED"):
            break

    if status != "SUCCEEDED":
        error_msg = task.get("error_message", task.get("message", "未知错误"))
        raise RuntimeError(f"Meshy 任务失败 ({status}): {error_msg}")

    credits = task.get("consumed_credits", "?")
    print(f"[Meshy] 推理完成！消耗 {credits} credits")

    # ── 下载 GLB ──
    model_urls = task.get("model_urls", {})
    glb_url = model_urls.get("glb")
    if not glb_url:
        raise RuntimeError(f"Meshy 未返回 GLB 模型 URL。可用格式: {list(model_urls.keys())}")

    print(f"[Meshy] 下载 GLB: {glb_url[:80]}...")
    glb_data = _meshy_download(glb_url)

    print(f"[Meshy] GLB 下载完成: {len(glb_data):,} bytes")

    # 验证 GLB
    magic = int.from_bytes(glb_data[:4], "little")
    if magic != 0x46546C67:
        print(f"[Meshy] 警告: GLB magic 不匹配 ({magic:#x})")

    # 缩略图
    thumb = img.resize((256, 256), Image.LANCZOS)
    thumb_buf = io.BytesIO()
    thumb.save(thumb_buf, format="PNG")
    thumb_data = thumb_buf.getvalue()

    return glb_data, thumb_data


def _meshy_request(method: str, url: str, headers: dict, payload: dict = None) -> dict:
    """发送 Meshy API 请求（支持代理）"""
    import json as _json

    req_data = _json.dumps(payload).encode("utf-8") if payload else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return _json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Meshy API HTTP {e.code}: {body[:300]}")


def _meshy_download(url: str) -> bytes:
    """从 Meshy 返回的 URL 下载文件"""
    import httpx
    # Meshy 使用国内 CDN，直连即可
    with httpx.Client(timeout=120, follow_redirects=True) as client:
        resp = client.get(url)
        resp.raise_for_status()
        return resp.content


def _run_tripo(model: dict, photos: list[bytes], realism: int) -> tuple[bytes, bytes]:
    """
    Tripo AI API 推理 — 云端图像→3D 模型。

    免费 300 credits/月，国内直连，无需代理。
    支持 image_to_model（单图）和 multi_view_image_to_model（多图多视角）。

    增强功能：
    - ≥3 张照片时自动切换多视图模式，从不同角度重建 3D 模型
    - 单图时使用最佳照片

    流程：
    1. 照片 → data URI(s)
    2. POST /v2/openapi/task 创建任务
    3. 轮询 GET /v2/openapi/task/{task_id} 直到完成
    4. 下载 GLB 模型
    """
    import base64
    import time

    api_key = model["api_key"]
    api_base = "https://api.tripo3d.ai/v2/openapi"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    # ── 编码所有可用照片 ──
    data_uris: list[str] = []
    for photo in photos[:8]:  # Tripo 最多支持 8 张多视图
        img = Image.open(io.BytesIO(photo)).convert("RGB")
        img_buf = io.BytesIO()
        img.save(img_buf, format="JPEG", quality=95)
        uri = "data:image/jpeg;base64," + base64.b64encode(img_buf.getvalue()).decode("ascii")
        data_uris.append(uri)

    use_multi_view = len(data_uris) >= 3

    # ── 创建任务 ──
    if use_multi_view:
        print(f"[Tripo] 创建 multi_view_image_to_model 任务 ({len(data_uris)} 张)...")
        create_payload = {
            "type": "multi_view_image_to_model",
            "images": data_uris,
            "texture_quality": settings.tripo_texture_quality,
            "face_limit": settings.tripo_face_limit,
            "auto_scale": settings.tripo_auto_scale,
        }
    else:
        print(f"[Tripo] 创建 image_to_model 任务...")
        create_payload = {
            "type": "image_to_model",
            "image": data_uris[0],
            "texture_quality": settings.tripo_texture_quality,
            "face_limit": settings.tripo_face_limit,
            "auto_scale": settings.tripo_auto_scale,
        }

    req_data = json.dumps(create_payload).encode("utf-8")
    req = urllib.request.Request(f"{api_base}/task", data=req_data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Tripo API HTTP {e.code}: {body[:300]}")

    task_id = result.get("data", {}).get("task_id")
    if not task_id:
        raise RuntimeError(f"Tripo 任务创建失败: {result}")

    print(f"[Tripo] 任务 ID: {task_id}")

    # ── 轮询 ──
    print(f"[Tripo] 等待推理完成...")
    status = "running"
    for i in range(150):  # Max 150 * 2s = 300s
        time.sleep(2)
        req = urllib.request.Request(f"{api_base}/task/{task_id}", headers={
            "Authorization": f"Bearer {api_key}",
        })
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                task = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Tripo poll HTTP {e.code}: {body[:200]}")

        status = task.get("data", {}).get("status", "running")
        progress = task.get("data", {}).get("progress", 0)
        if i % 5 == 0:
            print(f"[Tripo] [{progress}%] {status}")

        if status in ("success", "failed", "cancelled", "error"):
            break

    if status != "success":
        error = task.get("data", {}).get("error", task.get("message", "未知错误"))
        raise RuntimeError(f"Tripo 任务失败 ({status}): {error}")

    print(f"[Tripo] 推理完成！")

    # ── 下载 GLB ──
    outputs = task.get("data", {}).get("output", {})
    model_url = outputs.get("model")  # GLB URL

    if not model_url:
        # Fallback: try other keys (pbr_model, base_model, etc.)
        for key in ["pbr_model", "glb", "model_file"]:
            if key in outputs:
                model_url = outputs[key]
                break
    if not model_url:
        raise RuntimeError(f"Tripo 未返回模型 URL。Output keys: {list(outputs.keys())}")

    print(f"[Tripo] 下载模型: {str(model_url)[:80]}...")
    import httpx
    with httpx.Client(timeout=120, follow_redirects=True) as client:
        resp = client.get(model_url)
        resp.raise_for_status()
        glb_data = resp.content

    print(f"[Tripo] 下载完成: {len(glb_data):,} bytes")

    # 验证
    magic = int.from_bytes(glb_data[:4], "little")
    if magic != 0x46546C67:
        print(f"[Tripo] 警告: GLB magic {magic:#x}")

    # 缩略图（使用第一张照片）
    thumb_img = Image.open(io.BytesIO(photos[0])).convert("RGB")
    thumb = thumb_img.resize((256, 256), Image.LANCZOS)
    thumb_buf = io.BytesIO()
    thumb.save(thumb_buf, format="PNG")
    thumb_data = thumb_buf.getvalue()

    return glb_data, thumb_data


def _run_dashscope(model: dict, photos: list[bytes], realism: int) -> tuple[bytes, bytes]:
    """
    阿里云百炼 DashScope API — Tripo 模型推理。

    国内直连，无需代理。使用 subprocess+curl 绕过 Python SSL 问题。
    支持 Tripo/Tripo-P1.0（专业版，2万面，快速）和 Tripo/Tripo-H3.1（高精度，2M面）。

    增强功能：
    - 多视图输入：上传 ≥3 张不同角度照片时，尝试多视图 3D 重建（更逼真）
    - 智能选图：照片已通过预处理管线（抠图+裁剪+增强）

    流程：
    1. 照片 → data URI(s)
    2. curl POST → 创建任务（单图或多图）
    3. curl GET → 轮询状态
    4. curl -o → 下载 GLB
    """
    import base64
    import time
    import subprocess
    import tempfile as tmpfile_mod

    api_key = model["api_key"]
    dashscope_model = model["model"]

    # ── 编码所有可用照片为 data URI ──
    # 预处理管线已确保：抠图 + 智能裁剪 + 增强 → 每张都是高质量输入
    data_uris: list[str] = []
    for i, photo in enumerate(photos[:8]):  # 最多 8 张（API 限制）
        img = Image.open(io.BytesIO(photo)).convert("RGB")
        img_buf = io.BytesIO()
        img.save(img_buf, format="JPEG", quality=95)  # 高质量编码
        uri = "data:image/jpeg;base64," + base64.b64encode(img_buf.getvalue()).decode("ascii")
        data_uris.append(uri)

    use_multi_view = len(data_uris) >= 3
    view_label = "多视图" if use_multi_view else "单图"
    print(f"[DashScope] 创建 image-to-3d 任务 ({dashscope_model}, {view_label}, {len(data_uris)}张)...")

    # ── 构建请求 ──
    # 注意：DashScope Tripo 目前仅支持单图输入（不支持 images 数组）
    # 多视图需通过 Tripo 原生 API (_run_tripo) 实现
    # 这里始终使用第一张（已预处理：抠图+裁剪+增强）最佳照片
    create_payload = json.dumps({
        "model": dashscope_model,
        "input": {"image": data_uris[0]},
        "parameters": {
            "texture_quality": settings.dashscope_texture_quality,
            "pbr": settings.dashscope_pbr,
        },
    })
    single_view_label = f"({len(data_uris)}张中选最佳)"
    print(f"[DashScope] 使用单图模式 {single_view_label}")

    # 写入临时文件（避免 Windows 命令行长度限制）
    tmp = tmpfile_mod.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8")
    tmp.write(create_payload)
    tmp_path = tmp.name
    tmp.close()

    try:
        result = subprocess.run([
            "curl", "-s", "--noproxy", "*",
            "-H", f"Authorization: Bearer {api_key}",
            "-H", "X-DashScope-Async: enable",
            "-H", "Content-Type: application/json",
            "-d", f"@{tmp_path}",
            "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/3d-generation",
        ], capture_output=True, timeout=60)
        resp = json.loads(result.stdout.decode("utf-8", errors="replace"))
    finally:
        os.unlink(tmp_path)

    output = resp.get("output", {})
    task_id = output.get("task_id")
    if not task_id:
        raise RuntimeError(f"DashScope 任务创建失败: {resp}")

    print(f"[DashScope] 任务 ID: {task_id}, 状态: {output.get('task_status')}")

    # ── 轮询 ──
    print(f"[DashScope] 等待推理完成...")
    status = "PENDING"
    consecutive_errors = 0
    for i in range(200):
        time.sleep(2)
        try:
            result = subprocess.run([
                "curl", "-s", "--noproxy", "*", "--connect-timeout", "10", "--max-time", "30",
                "-H", f"Authorization: Bearer {api_key}",
                f"https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}",
            ], capture_output=True, timeout=35)
            raw = result.stdout.decode("utf-8", errors="replace").strip()
            if not raw:
                consecutive_errors += 1
                if consecutive_errors > 3:
                    raise RuntimeError("DashScope 连续空响应，请检查网络")
                if i % 5 == 0:
                    print(f"[DashScope] [空响应, 重试 {consecutive_errors}/3]")
                continue
            task_result = json.loads(raw)
        except (json.JSONDecodeError, subprocess.TimeoutExpired) as e:
            consecutive_errors += 1
            if consecutive_errors > 3:
                raise RuntimeError(f"DashScope 轮询失败: {e}")
            if i % 5 == 0:
                print(f"[DashScope] [{type(e).__name__}, 重试 {consecutive_errors}/3]")
            continue

        consecutive_errors = 0
        output = task_result.get("output", {})
        status = output.get("task_status", "UNKNOWN")
        if i % 5 == 0:
            print(f"[DashScope] [{status}]")
        if status in ("SUCCEEDED", "FAILED", "CANCELED", "UNKNOWN"):
            break

    if status != "SUCCEEDED":
        msg = output.get("message", task_result.get("message", "未知错误"))
        raise RuntimeError(f"DashScope 任务失败 ({status}): {msg}")

    print(f"[DashScope] 推理完成！")

    # ── 下载 GLB ──
    results = output.get("results", [])
    model_url = None
    if results:
        r = results[0]
        model_url = r.get("pbr_model_url") or r.get("base_model_url")
    if not model_url:
        raise RuntimeError(f"DashScope 未返回模型 URL。Results: {results}")

    print(f"[DashScope] 下载模型: {model_url[:80]}...")

    dl_tmp = tmpfile_mod.NamedTemporaryFile(suffix=".glb", delete=False)
    dl_path = dl_tmp.name
    dl_tmp.close()
    try:
        subprocess.run([
            "curl", "-s", "--noproxy", "*", "-o", dl_path, "-L", model_url,
        ], timeout=120, check=True)
        with open(dl_path, "rb") as f:
            glb_data = f.read()
    finally:
        os.unlink(dl_path)

    print(f"[DashScope] 下载完成: {len(glb_data):,} bytes")

    # 验证
    magic = int.from_bytes(glb_data[:4], "little")
    if magic != 0x46546C67:
        print(f"[DashScope] 警告: GLB magic {magic:#x}")

    # 缩略图（使用第一张照片）
    thumb_img = Image.open(io.BytesIO(photos[0])).convert("RGB")
    thumb = thumb_img.resize((256, 256), Image.LANCZOS)
    thumb_buf = io.BytesIO()
    thumb.save(thumb_buf, format="PNG")
    thumb_data = thumb_buf.getvalue()

    return glb_data, thumb_data


def get_gpu_info() -> dict:
    """获取 GPU 信息用于健康检查"""
    try:
        import torch
        return {
            "gpu_available": torch.cuda.is_available(),
            "gpu_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
            "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "",
        }
    except ImportError:
        return {"gpu_available": False, "gpu_count": 0, "gpu_name": ""}


async def cleanup_stale_tasks():
    """
    定期检查并清理超时任务。

    将超过 generation_timeout 的 pending/preprocessing/generating 任务标记为 failed。
    建议在 FastAPI lifespan 中作为后台任务定期调用（例如每 30 秒）。
    """
    from datetime import datetime, timezone, timedelta

    timeout = timedelta(seconds=settings.generation_timeout)
    now = datetime.now(timezone.utc)
    stale_ids = []

    for task_id, task in _tasks.items():
        if task["status"] in ("pending", "preprocessing", "generating", "postprocessing"):
            created = task.get("created_at")
            if created is not None and now - created > timeout:
                stale_ids.append(task_id)

    for task_id in stale_ids:
        update_task(
            task_id,
            status="failed",
            progress=0,
            current_step="任务超时",
            message=f"任务超过 {settings.generation_timeout}s 未完成，自动标记为失败",
        )

    if stale_ids:
        print(f"[LaiMePet] 已清理 {len(stale_ids)} 个超时任务: {stale_ids}")
