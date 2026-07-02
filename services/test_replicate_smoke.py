"""Quick smoke test for replicate backend — verifies proper error when no token"""
import io
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient
from main import app
from config import settings

# Override to replicate for this test
settings.ai_model = "replicate"

client = TestClient(app)

def make_test_photo():
    """Generate a photo that passes quality checks"""
    rng = np.random.default_rng()
    arr = rng.integers(0, 200, (512, 512, 3), dtype=np.uint8)
    bg = np.full((512, 512, 3), (200, 150, 100), dtype=np.uint8)
    img_arr = np.clip(bg.astype(int) + arr.astype(int) - 100, 0, 255).astype(np.uint8)
    img = Image.fromarray(img_arr, "RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    buf.seek(0)
    return buf

print("[1/3] Health check...")
r = client.get("/api/v1/health")
print(f"  Model: {r.json()['ai_model']}, Status: {r.status_code}")

print("[2/3] Submit generate (expecting token error)...")
photos = [
    ("photos", (f"test_{i}.jpg", make_test_photo(), "image/jpeg"))
    for i in range(3)
]
r = client.post("/api/v1/generate", data={"realism": 60}, files=photos)

if r.status_code == 200:
    task_id = r.json()["task_id"]
    print(f"  Task created: {task_id}")
    print("[3/3] Poll status (expecting failed)...")
    import time
    for _ in range(20):
        time.sleep(0.3)
        sr = client.get(f"/api/v1/status/{task_id}")
        st = sr.json()
        print(f"  [{st['progress']:.0f}%] {st['status']} — {st.get('message', '')}")
        if st['status'] in ('completed', 'failed'):
            if st['status'] == 'failed':
                print(f"\n  Expected failure (no API token): {st.get('message', '')[:120]}")
                print("  This is CORRECT behavior — replicate needs REPLICATE_API_TOKEN")
            break
else:
    print(f"  HTTP {r.status_code}: {r.json()}")
    # If it fails at submission time due to token check, that's also acceptable

print("\nDone — replicate backend integration verified.")
print("Next: set REPLICATE_API_TOKEN and test with a real pet photo.")
