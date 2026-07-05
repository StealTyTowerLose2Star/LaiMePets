"""LaiMePet AI Service — FastAPI 入口"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routes.api import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动/关闭时的操作"""
    import asyncio

    # 启动时创建必要目录
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.output_dir.mkdir(parents=True, exist_ok=True)
    print(f"[LaiMePet AI] 启动完成 — 模型: {settings.ai_model}, 设备: {settings.ai_device}")
    print(f"  上传目录: {settings.upload_dir.absolute()}")
    print(f"  输出目录: {settings.output_dir.absolute()}")

    # 启动超时任务清理协程
    stop_cleanup = asyncio.Event()

    async def _cleanup_loop():
        from services.inference import cleanup_stale_tasks
        while not stop_cleanup.is_set():
            try:
                await asyncio.sleep(30)  # 每 30 秒检查一次
                await cleanup_stale_tasks()
            except Exception as e:
                print(f"[LaiMePet] 清理协程异常: {e}")

    cleanup_task = asyncio.create_task(_cleanup_loop())

    yield

    # 关闭时停止清理协程
    stop_cleanup.set()
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass


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

    # 直接传递 app 对象而非字符串 "main:app"。
    # PyInstaller 冻结环境中不存在名为 "main" 的模块
    # （入口脚本被冻结为 __main__），必须避免 uvicorn 通过 import 加载。
    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
