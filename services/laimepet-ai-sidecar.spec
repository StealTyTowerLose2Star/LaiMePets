# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path

from PyInstaller.utils.hooks import collect_data_files, collect_submodules


block_cipher = None
service_dir = Path(SPECPATH).resolve()


def optional_collect_submodules(package: str) -> list[str]:
    try:
        return collect_submodules(package)
    except Exception:
        return []


def optional_collect_data_files(package: str) -> list[tuple[str, str]]:
    try:
        return collect_data_files(package)
    except Exception:
        return []


hiddenimports = {
    "aiofiles",
    "fastapi",
    "fastapi.middleware.cors",
    "fastapi.responses",
    "fastapi.staticfiles",
    "httpx",
    "multipart",
    "numpy",
    "PIL",
    "PIL.Image",
    "PIL.ImageEnhance",
    "PIL.ImageFilter",
    "pydantic",
    "pydantic_core",
    "pydantic_core._pydantic_core",
    "pydantic_settings",
    "rembg",
    "rembg.bg",
    "starlette",
    "trimesh",
    "trimesh.creation",
    "trimesh.exchange.export",
    "trimesh.exchange.gltf",
    "trimesh.transformations",
    "tripo3d",
    "uvicorn",
    "uvicorn.lifespan.on",
    "uvicorn.loops.auto",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.server",
}

for package in ("uvicorn", "rembg", "trimesh", "tripo3d", "replicate"):
    hiddenimports.update(optional_collect_submodules(package))

datas = []
for package in ("rembg", "PIL", "trimesh", "tripo3d"):
    datas += optional_collect_data_files(package)

# Do not bundle .env. API keys should be supplied by the environment or user config.
excludes = [
    "accelerate",
    "celery",
    "diffusers",
    "IPython",
    "jupyter",
    "matplotlib",
    "node_modules",
    "opencv_python_headless",
    "redis",
    "tensorflow",
    "tests",
    "tkinter",
    "torch",
    "torchaudio",
    "torchvision",
    "transformers",
]

a = Analysis(
    ["main.py"],
    pathex=[str(service_dir)],
    binaries=[],
    datas=datas,
    hiddenimports=sorted(hiddenimports),
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excludes,
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="laimepet-ai-sidecar",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
