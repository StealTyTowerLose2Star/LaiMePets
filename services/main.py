"""LaiMePet AI Service — FastAPI 入口"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routes.api import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动/关闭时的操作"""
    # 启动时创建必要目录
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.output_dir.mkdir(parents=True, exist_ok=True)
    print(f"[LaiMePet AI] 启动完成 — 模型: {settings.ai_model}, 设备: {settings.ai_device}")
    print(f"  上传目录: {settings.upload_dir.absolute()}")
    print(f"  输出目录: {settings.output_dir.absolute()}")
    yield
    # 关闭时清理（按需）


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="LaiMePet 宠物形象生成 AI 服务 — 照片上传 → AI 推理 → 3D 模型输出",
    lifespan=lifespan,
)

# CORS — 允许 Tauri webview 和本地开发
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:1420",   # Vite dev server
        "http://localhost:5173",
        "tauri://localhost",        # Tauri webview
        "https://tauri.localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
async def root():
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
    }


# ── 直接启动 ──
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
