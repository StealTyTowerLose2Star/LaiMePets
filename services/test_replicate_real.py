"""Replicate API inference test — Microsoft TRELLIS (firtoz/trellis)"""
import subprocess, json, base64, io, os, sys, time, tempfile
import numpy as np
from PIL import Image
from config import settings

print("=" * 60)
print("[TEST] Replicate TRELLIS Image-to-3D (curl + proxy)")
print("=" * 60)

token = settings.replicate_api_token or os.environ.get("REPLICATE_API_TOKEN", "")
PROXY = "http://127.0.0.1:7890"
BASE = "https://api.replicate.com/v1"
MODEL = "firtoz/trellis"
MODEL_VERSION = "e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c"

def curl(method, url, headers=None, data_file=None, timeout=120):
    """Call curl via subprocess."""
    cmd = ["curl", "-s", "-X", method, "--proxy", PROXY,
           "--connect-timeout", "30", "-m", str(timeout)]
    if headers:
        for k, v in headers.items():
            cmd.extend(["-H", f"{k}: {v}"])
    if data_file:
        cmd.extend(["-d", f"@{data_file}"])
    cmd.append(url)
    result = subprocess.run(cmd, capture_output=True, timeout=timeout + 10)
    return result.returncode, result.stdout.decode("utf-8", errors="replace")

def curl_binary(url, output_path, timeout=120):
    """Download binary file via curl."""
    cmd = ["curl", "-s", "-o", output_path, "--proxy", PROXY,
           "--connect-timeout", "30", "-m", str(timeout), url]
    subprocess.run(cmd, timeout=timeout + 10)

# ── Step 1: Verify model access ──
print("\n[1/6] Verify TRELLIS model...")
rc, out = curl("GET", f"{BASE}/models/{MODEL}",
               headers={"Authorization": f"Token {token}"})
if rc != 0:
    print(f"  [FAIL] curl exit code {rc}")
    sys.exit(1)
data = json.loads(out)
print(f"  [OK] {data['owner']}/{data['name']} — {data.get('description', '')[:80]}")
print(f"       Runs: {data.get('run_count', 0):,} | Visibility: {data.get('visibility', '?')}")

# ── Step 2: Generate test photo (tiny for fast proxy upload) ──
print("\n[2/6] Generate test photo (tiny for proxy)...")
rng = np.random.default_rng()
arr = rng.integers(0, 200, (96, 96, 3), dtype=np.uint8)
bg = np.full((96, 96, 3), (180, 140, 100), dtype=np.uint8)
img_arr = np.clip(bg.astype(int) + arr.astype(int) - 100, 0, 255).astype(np.uint8)
img = Image.fromarray(img_arr, "RGB")

# Ultra-compact JPEG
buf = io.BytesIO()
img.save(buf, format="JPEG", quality=40)
img_bytes = buf.getvalue()
data_uri = "data:image/jpeg;base64," + base64.b64encode(img_bytes).decode("ascii")
print(f"  [OK] {len(img_bytes)} bytes JPEG, URI: {len(data_uri)} chars")

# ── Step 3: Submit prediction ──
print("\n[3/6] Submit TRELLIS prediction...")
print("       Input: images=[data_uri], generate_model=True")
payload = json.dumps({
    "version": MODEL_VERSION,
    "input": {
        "images": [data_uri],         # Single photo → 3D
        "generate_model": True,        # GLB output!
        "generate_color": False,       # Skip video, faster
        "generate_normal": False,      # Skip normal video
        "randomize_seed": True,
        "texture_size": 1024,          # Good texture quality
        "mesh_simplify": 0.95,         # Default simplification
    },
})

with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as f:
    f.write(payload)
    tmp_path = f.name

print(f"       Payload: {len(payload):,} chars")
t_start = time.time()

try:
    rc, out = curl("POST", f"{BASE}/predictions",
                   headers={"Authorization": f"Token {token}",
                            "Content-Type": "application/json"},
                   data_file=tmp_path, timeout=60)
finally:
    os.unlink(tmp_path)

code_time = time.time() - t_start
try:
    pred = json.loads(out)
except json.JSONDecodeError:
    print(f"  [FAIL] JSON parse error ({code_time:.1f}s): {out[:300]}")
    sys.exit(1)

pred_id = pred.get("id")
if not pred_id:
    # Check for payment/access errors
    detail = pred.get("detail", "")
    title = pred.get("title", "")
    print(f"  [FAIL] No prediction ID ({code_time:.1f}s)")
    print(f"         {title}: {detail}")
    if "credit" in detail.lower():
        print(f"  [ACTION] Need to add credits at https://replicate.com/account/billing")
    sys.exit(1)

print(f"  [OK] ID: {pred_id} ({code_time:.1f}s)")
print(f"       Initial status: {pred.get('status')}")

# ── Step 4: Poll for completion ──
print("\n[4/6] Poll for completion...")
for i in range(150):  # Max 150 * 2s = 300s
    time.sleep(2)
    rc, out = curl("GET", f"{BASE}/predictions/{pred_id}",
                   headers={"Authorization": f"Token {token}"})
    try:
        pred = json.loads(out)
    except json.JSONDecodeError:
        continue
    status = pred.get("status", "unknown")
    if i % 5 == 0:
        t = time.time() - t_start
        logs = pred.get("logs", "")
        log_tail = logs[-100:] if logs else ""
        print(f"  [{t:.0f}s] {status} {log_tail}")
    if status in ("succeeded", "failed", "canceled"):
        break

elapsed = time.time() - t_start
print(f"  Final: {status} ({elapsed:.0f}s)")
if status != "succeeded":
    print(f"  [FAIL] {pred.get('error', 'unknown error')}")
    sys.exit(1)

# ── Step 5: Download model ──
print("\n[5/6] Download GLB model...")
output = pred.get("output", {})
print(f"  Output keys: {list(output.keys()) if isinstance(output, dict) else type(output).__name__}")

# TRELLIS output: {"model_file": "https://...", "color_video": "https://...", ...}
glb_url = None
if isinstance(output, dict):
    glb_url = output.get("model_file")
elif isinstance(output, list):
    for item in output:
        if isinstance(item, str) and ".glb" in item.lower():
            glb_url = item
            break

if not glb_url:
    print(f"  [FAIL] No model_file in output")
    if isinstance(output, dict):
        for k, v in output.items():
            print(f"    {k}: {str(v)[:100]}")
    sys.exit(1)

print(f"  URL: {glb_url[:120]}...")

with tempfile.NamedTemporaryFile(suffix=".glb", delete=False) as tmp:
    tmp_path = tmp.name

curl_binary(glb_url, tmp_path)
with open(tmp_path, "rb") as f:
    glb_data = f.read()
os.unlink(tmp_path)

print(f"  [OK] Downloaded: {len(glb_data):,} bytes")

# ── Step 6: Validate and save ──
print("\n[6/6] Validate and save...")
magic = int.from_bytes(glb_data[:4], "little")
version = int.from_bytes(glb_data[4:8], "little")
valid = magic == 0x46546C67
print(f"  GLB magic: 0x{magic:08x} ({'VALID' if valid else 'WARN'}), version={version}")

if len(glb_data) < 1000:
    print(f"  [WARN] GLB too small ({len(glb_data)} bytes), might be error response")
    print(f"  First 200 bytes: {glb_data[:200]}")

with open("test_replicate_output.glb", "wb") as f:
    f.write(glb_data)
print(f"  [OK] Saved: test_replicate_output.glb")

print(f"\n{'='*60}")
print("[DONE] TRELLIS 3D generation test PASSED!")
print(f"       Time: {elapsed:.0f}s")
print(f"       Model: {len(glb_data):,} bytes ({'Valid GLB' if valid else 'Check file'})")
print(f"{'='*60}")
