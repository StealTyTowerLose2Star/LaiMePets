"""文件存储服务 — 本地文件系统（后续对接 S3）"""

from __future__ import annotations

import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import aiofiles

from config import settings


def _ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


async def save_upload(task_id: str, filename: str, data: bytes) -> Path:
    """保存上传的原始照片"""
    task_dir = _ensure_dir(settings.upload_dir / task_id)
    filepath = task_dir / filename
    async with aiofiles.open(filepath, "wb") as f:
        await f.write(data)
    return filepath


async def save_preprocessed(task_id: str, filename: str, data: bytes) -> Path:
    """保存预处理后的照片"""
    pp_dir = _ensure_dir(settings.upload_dir / task_id / "preprocessed")
    filepath = pp_dir / f"{Path(filename).stem}.png"
    async with aiofiles.open(filepath, "wb") as f:
        await f.write(data)
    return filepath


async def save_model(pet_id: str, model_data: bytes, fmt: str = "glb") -> Path:
    """保存生成的 3D 模型"""
    pet_dir = _ensure_dir(settings.output_dir / pet_id)
    filepath = pet_dir / f"model.{fmt}"
    async with aiofiles.open(filepath, "wb") as f:
        await f.write(model_data)
    return filepath


async def save_thumbnail(pet_id: str, image_data: bytes) -> Path:
    """保存模型缩略图"""
    pet_dir = _ensure_dir(settings.output_dir / pet_id)
    filepath = pet_dir / "thumbnail.png"
    async with aiofiles.open(filepath, "wb") as f:
        await f.write(image_data)
    return filepath


async def get_model_data(pet_id: str) -> Optional[bytes]:
    """读取已生成的 3D 模型数据"""
    model_path = settings.output_dir / pet_id / "model.glb"
    if not model_path.exists():
        return None
    async with aiofiles.open(model_path, "rb") as f:
        return await f.read()


async def list_pets() -> list[dict]:
    """列出所有已生成的宠物"""
    output_dir = settings.output_dir
    if not output_dir.exists():
        return []

    pets = []
    for pet_dir in sorted(output_dir.iterdir(), reverse=True):
        if not pet_dir.is_dir():
            continue
        model_file = pet_dir / "model.glb"
        thumb_file = pet_dir / "thumbnail.png"
        meta_file = pet_dir / "meta.json"

        meta = {}
        if meta_file.exists():
            import json
            meta = json.loads(meta_file.read_text(encoding="utf-8"))

        pets.append({
            "pet_id": pet_dir.name,
            "pet_name": meta.get("pet_name", pet_dir.name),
            "model_exists": model_file.exists(),
            "model_size_bytes": model_file.stat().st_size if model_file.exists() else 0,
            "thumbnail_exists": thumb_file.exists(),
            "created_at": meta.get("created_at", ""),
        })

    return pets


def cleanup_task_files(task_id: str) -> None:
    """清理任务临时文件"""
    task_dir = settings.upload_dir / task_id
    if task_dir.exists():
        shutil.rmtree(task_dir)
