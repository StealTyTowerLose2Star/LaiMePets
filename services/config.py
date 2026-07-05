"""LaiMePet AI Service — 配置管理"""

from pathlib import Path
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
    ai_model: str = "dashscope"
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
    tripo_texture_quality: str = "high"
    # 面数上限（0 = 自动）
    tripo_face_limit: int = 50000
    # 自动缩放
    tripo_auto_scale: bool = True

    # ── 阿里云百炼 DashScope API ──
    # 从 https://bailian.console.aliyun.com 开通 Tripo 模型，获取 API Key
    # 国内直连，无需代理
    dashscope_api_key: str = ""
    # 模型: "Tripo/Tripo-H3.1" (高精度, 2M面) | "Tripo/Tripo-P1.0" (专业, 2万面, 更快)
    dashscope_model: str = "Tripo/Tripo-P1.0"
    # 纹理质量: "standard" | "detailed"
    dashscope_texture_quality: str = "standard"
    # 是否生成 PBR 材质
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

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
