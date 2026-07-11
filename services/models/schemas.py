"""Pydantic 数据模型 — API 请求/响应"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, field_validator


# ── 枚举 ──


class TaskStatus(str, Enum):
    """生成任务状态"""

    PENDING = "pending"  # 等待处理
    PREPROCESSING = "preprocessing"  # 照片预处理中
    VIEW_SYNTHESIS = "view_synthesis"  # AI 视角合成：照片→标准四视图
    GENERATING = "generating"  # AI 推理中（3D 生成）
    POSTPROCESSING = "postprocessing"  # 后处理（保存文件等）
    COMPLETED = "completed"  # 生成完成
    FAILED = "failed"  # 生成失败


class GenerationMode(str, Enum):
    LOCAL = "local"
    CLOUD = "cloud"


class RealismLevel(int, Enum):
    """写实度（对齐前端滑块）"""

    CARTOON = 0  # Q版卡通
    SEMI_CARTOON = 25
    BALANCED = 50  # 半写实
    SEMI_REALISTIC = 75
    REALISTIC = 100  # 最大写实


# ── 请求 ──


class GenerateRequest(BaseModel):
    """POST /api/v1/generate — 发起生成"""

    mode: GenerationMode = GenerationMode.CLOUD
    realism: RealismLevel = RealismLevel.BALANCED
    pet_name: str = Field(
        default="", max_length=20, description="宠物名称（可选，后续可修改）"
    )
    pet_type: Optional[str] = Field(
        default=None, pattern="^(cat|dog|other)$", description="宠物类型提示"
    )


class PhotoQualityCheck(BaseModel):
    """单张照片的质量检查结果"""

    filename: str
    passed: bool
    resolution: tuple[int, int]
    score: float = Field(ge=0, le=1, description="质量评分 0~1")
    issues: list[str] = Field(default_factory=list)


# ── 响应 ──


class TaskResponse(BaseModel):
    """生成任务创建后的响应"""

    task_id: str
    status: TaskStatus
    message: str
    estimated_seconds: int = Field(default=120, description="预估剩余秒数")


class TaskStatusResponse(BaseModel):
    """GET /api/v1/status/{task_id} — 查询进度"""

    task_id: str
    status: TaskStatus
    progress: float = Field(default=0.0, ge=0, le=100, description="进度百分比")
    current_step: str = ""
    message: str = ""
    estimated_seconds: int = 0
    created_at: datetime
    updated_at: datetime
    result: Optional[dict] = Field(default=None, description="完成时包含 pet_id 等结果")


class PetModelInfo(BaseModel):
    """已生成的宠物模型信息"""

    pet_id: str
    pet_name: str
    model_format: str = "glb"  # GLB 格式（GLTF Binary）
    model_size_bytes: int = 0
    thumbnail_url: str = ""
    model_url: str = ""
    created_at: datetime


class HealthResponse(BaseModel):
    """健康检查"""

    status: str = "ok"
    version: str
    ai_model: str
    ai_device: str
    gpu_available: bool
    cloud_model: str = ""
    generation_mode: str = "cloud"
    supported_formats: list[str] = ["glb"]


class ErrorResponse(BaseModel):
    """统一错误响应"""

    error: str
    detail: str
    task_id: Optional[str] = None
