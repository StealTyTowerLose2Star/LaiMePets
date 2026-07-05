# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path
from shutil import copy2

from PyInstaller.utils.hooks import collect_data_files, collect_submodules


block_cipher = None

service_dir = Path(SPECPATH).resolve()
repo_root = service_dir.parent
tauri_binaries_dir = repo_root / "src-tauri" / "binaries"
pyinstaller_work_dir = service_dir / "build" / "pyinstaller"
sidecar_stem = "laimepet-ai-sidecar"
sidecar_name = f"{sidecar_stem}-x86_64-pc-windows-gnu"
msvc_sidecar_name = f"{sidecar_stem}-x86_64-pc-windows-msvc.exe"
tauri_binaries_dir.mkdir(parents=True, exist_ok=True)
pyinstaller_work_dir.mkdir(parents=True, exist_ok=True)

try:
    from PyInstaller import config as pyinstaller_config
    pyinstaller_config.CONF["distpath"] = str(tauri_binaries_dir)
    pyinstaller_config.CONF["workpath"] = str(pyinstaller_work_dir)
except Exception:
    pass


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


hiddenimports = [
    "aiofiles",
    "anyio",
    "click",
    "fastapi",
    "fastapi.middleware.cors",
    "fastapi.responses",
    "h11",
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
    "replicate",
    "scipy",
    "skimage",
    "starlette",
    "tqdm",
    "trimesh",
    "trimesh.creation",
    "trimesh.exchange.export",
    "trimesh.exchange.gltf",
    "trimesh.transformations",
    "uvicorn",
    "uvicorn.lifespan.on",
    "uvicorn.loops.auto",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.server",
]

# DashScope is called through HTTPS/curl in services/services/inference.py, not
# through the dashscope Python SDK.
hiddenimports += optional_collect_submodules("uvicorn")
hiddenimports += optional_collect_submodules("rembg")
hiddenimports += optional_collect_submodules("trimesh")

datas = []
datas += optional_collect_data_files("rembg")
datas += optional_collect_data_files("PIL")
datas += optional_collect_data_files("trimesh")

excludes = [
    "node_modules",
    ".venv",
    "tests",
    "accelerate",
    "diffusers",
    "tkinter",
    "matplotlib",
    "IPython",
    "jupyter",
    "tensorflow",
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
    hiddenimports=sorted(set(hiddenimports)),
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
    name=sidecar_name,
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

gnu_sidecar_path = tauri_binaries_dir / f"{sidecar_name}.exe"
msvc_sidecar_path = tauri_binaries_dir / msvc_sidecar_name
if gnu_sidecar_path.exists():
    copy2(gnu_sidecar_path, msvc_sidecar_path)
