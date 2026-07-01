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
    # 模型类型: "triposr" | "instantmesh" | "mock"
    ai_model: str = "mock"  # 开发模式，部署 GPU 服务器后改为 "triposr"
    # 设备: "cuda" | "cpu"
    ai_device: str = "cpu"
    # 是否允许 CPU 推理（很慢但可降级）
    allow_cpu_fallback: bool = True
    # 生成超时（秒）
    generation_timeout: int = 600

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
