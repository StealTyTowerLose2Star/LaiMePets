"""Meshy.ai Image-to-3D test — 国内直连，免费 200 credits/月"""
import io, os, sys, time, base64, json
import numpy as np
from PIL import Image
import urllib.request, urllib.error

from config import settings

print("=" * 60)
print("[TEST] Meshy.ai Image-to-3D (direct connection)")
print("=" * 60)

# Step 1: Verify API key
print("\n[1/5] Verify API Key...")
api_key = settings.meshy_api_key or os.environ.get("MESHY_API_KEY", "")
if not api_key:
    print("  [FAIL] MESHY_API_KEY not set")
    print("  1. Sign up at https://meshy.ai")
    print("  2. Settings -> API -> Create API Key")
    print("  3. Add to services/.env: MESHY_API_KEY=msy_xxx")
    sys.exit(1)
print(f"  [OK] Key loaded: {api_key[:10]}...{api_key[-4:]}")

API_BASE = "https://api.meshy.ai/openapi/v1"
HEADERS = {"Authorization": f"Bearer {api_key}"}

def api_request(method, path, payload=None):
    """Call Meshy API."""
    url = f"{API_BASE}{path}"
    data = json.dumps(payload).encode("utf-8") if payload else None
    req = urllib.request.Request(url, data=data, headers={
        **HEADERS,
        "Content-Type": "application/json",
    }, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code}: {body[:300]}")

# Step 2: Verify account
print("\n[2/5] Verify Meshy account...")
try:
    # Meshy doesn't have a simple /account endpoint, test with a list call
    tasks = api_request("GET", "/image-to-3d?page_size=1")
    print(f"  [OK] API connected, {tasks.get('total', '?')} previous tasks")
except Exception as e:
    print(f"  [FAIL] {e}")
    sys.exit(1)

# Step 3: Generate test photo
print("\n[3/5] Generate test photo...")
rng = np.random.default_rng()
arr = rng.integers(0, 200, (320, 320, 3), dtype=np.uint8)
bg = np.full((320, 320, 3), (180, 140, 100), dtype=np.uint8)
img_arr = np.clip(bg.astype(int) + arr.astype(int) - 100, 0, 255).astype(np.uint8)
img = Image.fromarray(img_arr, "RGB")

# JPEG for data URI
img_buf = io.BytesIO()
img.save(img_buf, format="JPEG", quality=85)
img_bytes = img_buf.getvalue()
data_uri = "data:image/jpeg;base64," + base64.b64encode(img_bytes).decode("ascii")
print(f"  [OK] {len(img_bytes)//1024} KB JPEG, URI: {len(data_uri):,} chars")

# Step 4: Create Image-to-3D task
print("\n[4/5] Create Meshy Image-to-3D task...")
print("  Model: meshy-6 (latest), PBR + remesh")
t_start = time.time()

try:
    result = api_request("POST", "/image-to-3d", {
        "image_url": data_uri,
        "ai_model": "latest",          # Meshy 6
        "enable_pbr": True,            # PBR textures
        "should_remesh": True,         # Clean topology
        "target_polycount": 50000,     # Good detail
        "target_formats": ["glb"],     # Only GLB
        "should_texture": True,
    })
    task_id = result["result"]
    print(f"  [OK] Task ID: {task_id}")
except Exception as e:
    print(f"  [FAIL] {e}")
    sys.exit(1)

# Step 5: Poll for completion
print("\n[5/5] Poll for completion...")
for i in range(150):  # Max 150 * 2s = 300s
    time.sleep(2)
    task = api_request("GET", f"/image-to-3d/{task_id}")
    status = task.get("status", "UNKNOWN")
    progress = task.get("progress", 0)
    if i % 5 == 0:
        elapsed = time.time() - t_start
        print(f"  [{elapsed:.0f}s] {progress}% {status}")
    if status in ("SUCCEEDED", "FAILED", "EXPIRED"):
        break

elapsed = time.time() - t_start
print(f"  Final: {status} ({elapsed:.0f}s)")

if status != "SUCCEEDED":
    print(f"  [FAIL] {task.get('error_message', task.get('message', 'unknown'))}")
    sys.exit(1)

credits = task.get("consumed_credits", "?")
print(f"  [OK] Consumed {credits} credits")

# Download GLB
print("\n--- Download ---")
model_urls = task.get("model_urls", {})
glb_url = model_urls.get("glb")
if not glb_url:
    print(f"  [FAIL] No GLB URL. Available: {list(model_urls.keys())}")
    sys.exit(1)

print(f"  URL: {glb_url[:100]}...")

import httpx
with httpx.Client(timeout=120, follow_redirects=True) as client:
    resp = client.get(glb_url)
    resp.raise_for_status()
    glb_data = resp.content

print(f"  [OK] Downloaded: {len(glb_data):,} bytes")

# Validate
magic = int.from_bytes(glb_data[:4], "little")
version = int.from_bytes(glb_data[4:8], "little")
valid = magic == 0x46546C67
print(f"  GLB: 0x{magic:08x} ({'VALID' if valid else 'WARN'}), v{version}")

# Save
with open("test_meshy_output.glb", "wb") as f:
    f.write(glb_data)
print(f"  [OK] Saved: test_meshy_output.glb")

# Also save texture URLs if any
texture_urls = task.get("texture_urls", {})
if texture_urls:
    print(f"\n  PBR Textures available:")
    for name, url in texture_urls.items():
        print(f"    {name}: {url[:80]}...")

print(f"\n{'='*60}")
print("[DONE] Meshy.ai Image-to-3D test PASSED!")
print(f"       Time: {elapsed:.0f}s | Credits: {credits}")
print(f"       Size: {len(glb_data):,} bytes | {'Valid GLB' if valid else 'Check'}")
print(f"{'='*60}")
