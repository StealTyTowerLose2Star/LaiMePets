"""API 路由 — 形象生成服务"""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from config import settings
from models.schemas import (
    ErrorResponse,
    GenerateRequest,
    HealthResponse,
    PetModelInfo,
    TaskStatusResponse,
    TaskResponse,
)
from services.inference import (
    create_task,
    get_task,
    get_gpu_info,
    run_inference_async,
)
from services.preprocessing import (
    batch_validate,
    preprocess_photo,
)
from services.storage import (
    get_model_data,
    list_pets,
    save_upload,
    save_preprocessed,
)

router = APIRouter(prefix="/api/v1", tags=["generation"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """服务健康检查 + GPU 状态 + 云模型信息"""
    gpu = get_gpu_info()
    cloud_model = ""
    generation_mode = "cloud" if settings.ai_model in ("dashscope", "tripo", "meshy", "replicate") else "local"
    if settings.ai_model == "dashscope":
        cloud_model = settings.dashscope_model
    elif settings.ai_model == "tripo":
        cloud_model = "Tripo AI"
    elif settings.ai_model == "meshy":
        cloud_model = settings.meshy_model
    elif settings.ai_model == "replicate":
        cloud_model = settings.replicate_model
    return HealthResponse(
        version=settings.app_version,
        ai_model=settings.ai_model,
        ai_device=settings.ai_device,
        gpu_available=gpu["gpu_available"],
        cloud_model=cloud_model,
        generation_mode=generation_mode,
    )


@router.post("/generate", response_model=TaskResponse)
async def generate_pet(
    background_tasks: BackgroundTasks,
    realism: int = Form(default=50, ge=0, le=100),
    pet_name: str = Form(default="", max_length=20),
    photos: list[UploadFile] = File(...),
):
    """
    上传宠物照片，启动 3D 模型生成任务。

    - **photos**: 3-50 张宠物照片（JPG/PNG/WEBP）
    - **realism**: 写实度 0-100（0=Q版, 100=写实）
    - **pet_name**: 宠物名称（可选）
    """
    # 1. 验证上传数量
    if len(photos) < settings.min_photos_required:
        raise HTTPException(
            status_code=400,
            detail=f"至少需要 {settings.min_photos_required} 张照片，当前 {len(photos)} 张",
        )
    if len(photos) > 50:
        raise HTTPException(
            status_code=400,
            detail=f"最多支持 50 张照片，当前 {len(photos)} 张",
        )

    # 2. 读取并验证每张照片
    photo_data: list[tuple[str, bytes]] = []
    for photo in photos:
        data = await photo.read()
        if photo.filename is None:
            raise HTTPException(status_code=400, detail="文件名为空")
        photo_data.append((photo.filename, data))

    validation = batch_validate(photo_data)
    if not validation["sufficient"]:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "照片质量不足",
                "results": validation["results"],
                "message": validation["message"],
            },
        )

    # 3. 创建任务
    task_id = create_task()

    # 4. 预处理并保存照片
    preprocessed = []
    for filename, data in photo_data:
        await save_upload(task_id, filename, data)
        pp_data = preprocess_photo(data)
        await save_preprocessed(task_id, filename, pp_data)
        preprocessed.append(pp_data)

    # 5. 启动异步推理（使用 BackgroundTasks，兼容 TestClient 和 uvicorn）
    background_tasks.add_task(
        run_inference_async, task_id, preprocessed, realism
    )

    return TaskResponse(
        task_id=task_id,
        status="pending",
        message=f"已接收 {len(preprocessed)} 张照片，开始生成…",
        estimated_seconds=120,
    )


@router.get("/status/{task_id}", response_model=TaskStatusResponse)
async def get_generation_status(task_id: str):
    """查询生成任务进度"""
    task = get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")

    return TaskStatusResponse(
        task_id=task["task_id"],
        status=task["status"],
        progress=task["progress"],
        current_step=task["current_step"],
        message=task.get("message", ""),
        estimated_seconds=task.get("estimated_seconds", 0),
        created_at=task["created_at"],
        updated_at=task["updated_at"],
        result=task.get("result"),
    )


@router.get("/model/{pet_id}")
async def download_model(pet_id: str):
    """下载生成的 3D 模型（GLB 格式）"""
    model_data = await get_model_data(pet_id)
    if model_data is None:
        raise HTTPException(status_code=404, detail=f"宠物 {pet_id} 的模型不存在")

    from fastapi.responses import Response
    return Response(
        content=model_data,
        media_type="model/gltf-binary",
        headers={
            "Content-Disposition": f"attachment; filename={pet_id}.glb",
            "Content-Length": str(len(model_data)),
        },
    )


@router.get("/model/{pet_id}/thumbnail")
async def get_model_thumbnail(pet_id: str):
    """获取模型缩略图"""
    thumb_path = settings.output_dir / pet_id / "thumbnail.png"
    if not thumb_path.exists():
        raise HTTPException(status_code=404, detail="缩略图不存在")
    return FileResponse(thumb_path, media_type="image/png")


@router.get("/pets", response_model=list[PetModelInfo])
async def list_generated_pets():
    """列出所有已生成的宠物"""
    pets = await list_pets()
    result = []
    for p in pets:
        created_at = p.get("created_at", "")
        if not created_at:
            continue  # 跳过不完整的记录（无 meta.json）
        result.append(PetModelInfo(
            pet_id=p["pet_id"],
            pet_name=p["pet_name"],
            model_size_bytes=p["model_size_bytes"],
            thumbnail_url=f"/api/v1/model/{p['pet_id']}/thumbnail",
            model_url=f"/api/v1/model/{p['pet_id']}",
            created_at=created_at,
        ))
    return result
