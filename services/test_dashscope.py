"""阿里云百炼 DashScope — Tripo 图转3D 测试（国内直连）"""
import io, os, sys, time, base64, json
import numpy as np
from PIL import Image
import urllib.request, urllib.error

from config import settings

print("=" * 60)
print("[TEST] DashScope Tripo Image-to-3D (direct, no proxy)")
print("=" * 60)

api_key = settings.dashscope_api_key or os.environ.get("DASHSCOPE_API_KEY", "")
if not api_key:
    print("[FAIL] DASHSCOPE_API_KEY not set")
    print()
    print("How to get one:")
    print("  1. https://bailian.console.aliyun.com")
    print("  2. Search 'Tripo' in model market, click 开通")
    print("  3. Get API Key from console (format: sk-xxx)")
    print("  4. Add to services/.env: DASHSCOPE_API_KEY=sk-xxx")
    sys.exit(1)
print(f"[OK] Key: {api_key[:10]}...{api_key[-4:]}")

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
print("\n[2/4] Create 3D generation task...")
t_start = time.time()

payload = json.dumps({
    "model": "Tripo/Tripo-P1.0",
    "input": {"image": data_uri},
    "parameters": {
        "texture_quality": "standard",
        "pbr": True,
    },
}).encode("utf-8")

req = urllib.request.Request(
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/3d-generation",
    data=payload,
    headers={
        "Authorization": f"Bearer {api_key}",
        "X-DashScope-Async": "enable",
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

output = result.get("output", {})
task_id = output.get("task_id")
if not task_id:
    print(f"  [FAIL] No task_id: {json.dumps(result, indent=2)[:400]}")
    sys.exit(1)
print(f"  [OK] Task ID: {task_id}")
print(f"       Status: {output.get('task_status')}")

# ── Step 3: Poll ──
print("\n[3/4] Poll for completion...")
for i in range(120):  # Max 120 * 3s = 360s
    time.sleep(3)
    req = urllib.request.Request(
        f"https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}",
        headers={"Authorization": f"Bearer {api_key}"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        task = json.loads(resp.read().decode("utf-8"))

    out = task.get("output", {})
    status = out.get("task_status", "UNKNOWN")
    elapsed = time.time() - t_start

    if i % 4 == 0:
        print(f"  [{elapsed:.0f}s] {status}")

    if status in ("SUCCEEDED", "FAILED", "CANCELED", "UNKNOWN"):
        break

print(f"  Final: {status} ({time.time()-t_start:.0f}s)")

if status != "SUCCEEDED":
    msg = out.get("message", task.get("message", "unknown"))
    code = task.get("code", "")
    print(f"  [FAIL] {code}: {msg}")
    if "credit" in str(msg).lower() or "quota" in str(msg).lower():
        print(f"  [INFO] May need to activate free quota at https://bailian.console.aliyun.com")
    sys.exit(1)

# ── Step 4: Download model ──
print("\n[4/4] Download model...")
results = out.get("results", [])
if not results:
    print(f"  [FAIL] No results in output")
    sys.exit(1)

r = results[0]
model_url = r.get("pbr_model_url") or r.get("base_model_url")
if not model_url:
    print(f"  [FAIL] No model URL. Keys: {list(r.keys())}")
    sys.exit(1)

print(f"  URL: {model_url[:100]}...")

# Download (HTTPS, China CDN)
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

with open("test_dashscope_output.glb", "wb") as f:
    f.write(glb_data)
print(f"  [OK] Saved: test_dashscope_output.glb")

print(f"\n{'='*60}")
print("[DONE] DashScope Tripo test PASSED!")
print(f"       Time: {time.time()-t_start:.0f}s")
print(f"       Model: {len(glb_data):,} bytes ({'Valid GLB' if valid else 'Non-standard'})")
print(f"{'='*60}")
