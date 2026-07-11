"""LaiMePet AI Service — 配置管理"""

from pathlib import Path
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置，可从环境变量 / .env 文件读取"""

    # ── 服务 ──
    app_name: str = "LaiMePet AI Service"
    app_version: str = "0.1.0"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000

    # ── 路径 ──
    base_dir: Path = Path(__file__).resolve().parent
    upload_dir: Path = Path("uploads")
    output_dir: Path = Path("outputs")
    max_upload_size_mb: int = 100

    # ── AI 推理 ──
    # 模型类型: "tripo" | "meshy" | "replicate" | "triposr" | "mock"
    # "dashscope" — 阿里云百炼 Tripo（推荐！国内直连，可能有免费额度）
    # "tripo" — Tripo AI 云端 API（需代理，需付费）
    # "meshy" — Meshy.ai 云端 API
    # "replicate" — Replicate 云端 API（需代理 + 充值）
    # "mock" — 开发模式，生成占位模型
    ai_model: str = "tripo"
    # 设备: "cuda" | "cpu"（仅对 triposr/instantmesh 本地模式有效）
    ai_device: str = "cpu"
    # 是否允许 CPU 推理（很慢但可降级）
    allow_cpu_fallback: bool = True
    # 生成超时（秒）
    generation_timeout: int = 600

    # ── Replicate API ──
    # 从 https://replicate.com/account/api-tokens 获取
    replicate_api_token: str = ""
    # Replicate 上的模型标识符
    #   "firtoz/trellis" — 微软 TRELLIS，最高质量（推荐）
    #   "tencent/hunyuan3d-2" — 腾讯混元 3D-2（需付费）
    replicate_model: str = "firtoz/trellis"
    replicate_model_version: str = ""  # 空 = 使用最新版本

    # ── Meshy API ──
    # 从 https://meshy.ai 注册，在 Settings → API 获取 key
    meshy_api_key: str = ""
    # Meshy 模型版本: "meshy-6" (最新) | "meshy-5" | "latest"
    meshy_model: str = "latest"
    # 是否生成 PBR 纹理（metallic/roughness/normal maps）
    meshy_enable_pbr: bool = True
    # 目标多边形数（100 ~ 300000）
    meshy_target_polycount: int = 50000

    # ── Tripo AI API ──
    # 从 https://platform.tripo3d.ai 注册，免费 300 credits/月
    tripo_api_key: str = ""
    # Tripo 纹理质量: "high" | "standard" | "low"
    tripo_texture_quality: str = "detailed"
    # 面数上限（0 = 自动）
    tripo_face_limit: int = 50000
    # 自动缩放
    tripo_auto_scale: bool = True
    # 模型版本（从 SDK 提取）:
    #   "v3.1-20260211" — 最新 (Feb 2026, ~1.5M面)
    #   "v3.0-20250812" — v3.0
    #   "v2.5-20250123" — SDK 默认
    #   "v2.0-20240919" / "v1.4-20240625"
    tripo_model_version: str = "v3.1-20260211"

    # ── 阿里云百炼 DashScope API ──
    # 从 https://bailian.console.aliyun.com 开通 Tripo 模型，获取 API Key
    # 国内直连，无需代理
    dashscope_api_key: str = ""
    # 模型选择:
    #   "Tripo/Tripo-P1.0" — 专业版, ~5K面, 2.5MB, 推荐（桌面宠物最佳平衡）
    #   "Tripo/Tripo-H3.1" — 高精度, ~1.5M面, 42MB（极致细节，但加载慢）
    dashscope_model: str = "Tripo/Tripo-H3.1"
    # 纹理质量: "detailed" (高精度纹理, 推荐) | "standard" (标准)
    dashscope_texture_quality: str = "detailed"
    # 是否生成 PBR 材质（metallic/roughness）
    dashscope_pbr: bool = True

    # ── 任务队列 ──
    redis_url: str = "redis://localhost:6379/0"
    # 开发模式下使用内存队列（无需 Redis）
    use_in_memory_queue: bool = True

    # ── 存储 ──
    # 云端对象存储（后续对接 S3 / MinIO）
    storage_backend: str = "local"  # "local" | "s3"
    s3_endpoint: str = ""
    s3_bucket: str = "laimepet-models"
    s3_access_key: str = ""
    s3_secret_key: str = ""

    # ── 安全 ──
    # API 密钥（用于 Tauri 客户端认证）
    api_key: str = "dev-key-change-in-production"

    # ── 照片质量 ──
    min_photos_required: int = 3  # 演示模式降低门槛（正式为 5）
    min_photo_resolution: tuple[int, int] = (256, 256)
    supported_formats: set[str] = {".jpg", ".jpeg", ".png", ".webp"}

    # ── 预处理 ──
    # 预处理模式:
    #   "fidelity"  — 身份保留模式（默认）：仅缩放+抠图+裁剪，保留原始毛发细节
    #   "enhanced"  — 增强模式：额外降噪+锐化+对比度+饱和度（可能改变外观）
    #   "minimal"   — 最简模式：仅缩放，不做任何处理（给 AI 最原始的输入）
    preprocessing_mode: str = "fidelity"
    # 是否启用多图输入（≥2 张时向前/左/后/右发送，提升 3D 还原度）
    enable_multi_image: bool = True
    # 是否启用背景移除（部分 AI 模型在自然背景上表现更好）
    enable_background_removal: bool = True

    # ── 视角合成（Two-Stage Pipeline Stage 1）──
    # 是否启用 AI 视角合成：将用户照片生成标准化四视图（前/后/左/右）
    # 开启后大幅提升 3D 模型还原度（"像不像"问题）
    enable_view_synthesis: bool = False
    # Provider: "nano_banana"（Nano Banana 2 via Replicate, 推荐）|
    #           "dashscope"（Wan2.7 多参考图）| "replicate"（Zero123++）
    view_synthesis_provider: str = "nano_banana"
    # 输出视图尺寸（像素）
    view_synthesis_size: int = 1024
    # Wan2.7 网格输出尺寸
    view_synthesis_grid_size: str = "2048*2048"
    # DashScope 图像模型
    dashscope_vision_model: str = "qwen-vl-max"
    dashscope_image_model: str = "wan2.7-image-pro"
    # Wanx T2I 模型（备选）
    dashscope_t2i_model: str = "wanx2.1-t2i-turbo"
    # Replicate Zero123 模型
    replicate_zero123_model: str = "jd7h/zero123plusplus"

    # ── OpenAI API（已弃用：用户通过 Codex CLI 使用 AI 辅助编码）──
    # openai_api_key: str = ""
    # openai_model: str = "gpt-4o"
    # openai_code_model: str = "o4-mini"
    # openai_base_url: str = "https://api.openai.com/v1"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug(cls, value: Any) -> Any:
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "prod", "production"}:
                return False
            if normalized in {"dev", "development"}:
                return True
        return value


settings = Settings()
