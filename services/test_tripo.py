"""Tripo AI Image-to-3D test — 免费 300 credits/月，国内直连"""
import io, os, sys, time, base64, json
import numpy as np
from PIL import Image
import urllib.request, urllib.error

from config import settings

print("=" * 60)
print("[TEST] Tripo AI Image-to-3D (free tier, direct access)")
print("=" * 60)

api_key = settings.tripo_api_key or os.environ.get("TRIPO_API_KEY", "")
if not api_key:
    print("[FAIL] TRIPO_API_KEY not set")
    sys.exit(1)
print(f"[OK] Key: {api_key[:10]}...{api_key[-4:]}")

API_BASE = "https://api.tripo3d.ai/v2/openapi"

# ── Step 1: Generate test photo ──
print("\n[1/4] Generate test photo...")
rng = np.random.default_rng()
arr = rng.integers(0, 200, (320, 320, 3), dtype=np.uint8)
bg = np.full((320, 320, 3), (180, 140, 100), dtype=np.uint8)
img_arr = np.clip(bg.astype(int) + arr.astype(int) - 100, 0, 255).astype(np.uint8)
img = Image.fromarray(img_arr, "RGB")

buf = io.BytesIO()
img.save(buf, format="JPEG", quality=85)
data_uri = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
print(f"  [OK] {buf.tell()//1024} KB JPEG")

# ── Step 2: Create task ──
print("\n[2/4] Create image_to_model task...")
t_start = time.time()

payload = json.dumps({
    "type": "image_to_model",
    "image": data_uri,
    "texture_quality": "high",
    "face_limit": 50000,
    "auto_scale": True,
}).encode("utf-8")

req = urllib.request.Request(
    f"{API_BASE}/task",
    data=payload,
    headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    },
)
try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    body = e.read().decode("utf-8", errors="replace")
    print(f"  [FAIL] HTTP {e.code}: {body[:400]}")
    sys.exit(1)

task_id = result.get("data", {}).get("task_id")
if not task_id:
    print(f"  [FAIL] No task_id: {json.dumps(result, indent=2)[:400]}")
    sys.exit(1)
print(f"  [OK] Task ID: {task_id}")

# ── Step 3: Poll ──
print("\n[3/4] Poll for completion...")
for i in range(60):  # Max 60 * 3s = 180s
    time.sleep(3)
    req = urllib.request.Request(
        f"{API_BASE}/task/{task_id}",
        headers={"Authorization": f"Bearer {api_key}"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        task = json.loads(resp.read().decode("utf-8"))

    data = task.get("data", {})
    status = data.get("status", "running")
    progress = data.get("progress", 0)
    elapsed = time.time() - t_start

    if i % 3 == 0:  # Every ~9s
        print(f"  [{elapsed:.0f}s] {progress}% {status}")

    if status in ("success", "failed", "cancelled", "error"):
        break

print(f"  Final: {status} ({time.time()-t_start:.0f}s)")

if status != "success":
    err = task.get("data", {}).get("error", task.get("message", "unknown"))
    print(f"  [FAIL] {err}")
    sys.exit(1)

# ── Step 4: Download model ──
print("\n[4/4] Download model...")
output = data.get("output", {})
print(f"  Output keys: {list(output.keys())}")

model_url = output.get("model") or output.get("glb") or output.get("pbr_model")
if not model_url:
    # Try to find any URL
    for k, v in output.items():
        if isinstance(v, str) and v.startswith("http"):
            model_url = v
            print(f"  Found URL in '{k}'")
            break

if not model_url:
    print(f"  [FAIL] No model URL. Output: {json.dumps(output, indent=2)[:500]}")
    sys.exit(1)

print(f"  URL: {str(model_url)[:120]}...")

# Download
import httpx
with httpx.Client(timeout=120, follow_redirects=True) as client:
    resp = client.get(model_url)
    resp.raise_for_status()
    glb_data = resp.content

print(f"  [OK] {len(glb_data):,} bytes")

# Validate
magic = int.from_bytes(glb_data[:4], "little")
version = int.from_bytes(glb_data[4:8], "little")
valid = magic == 0x46546C67
print(f"  GLB: 0x{magic:08x} ({'VALID' if valid else 'WARN'}), v{version}")

with open("test_tripo_output.glb", "wb") as f:
    f.write(glb_data)
print(f"  [OK] Saved: test_tripo_output.glb")

print(f"\n{'='*60}")
print("[DONE] Tripo AI test PASSED!")
print(f"       Time: {time.time()-t_start:.0f}s")
print(f"       Model: {len(glb_data):,} bytes ({'Valid GLB' if valid else 'Non-standard'})")
print(f"{'='*60}")
