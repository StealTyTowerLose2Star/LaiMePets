"""Inspect generated GLB model structure"""
import json
import trimesh

# Load the latest generated GLB
scene = trimesh.load("outputs/483241eb/model.glb")
print("=== GLB Model Structure ===")

if hasattr(scene, 'geometry'):
    total_verts = 0
    total_faces = 0
    for name, geom in scene.geometry.items():
        if hasattr(geom, 'vertices'):
            nv = len(geom.vertices)
            nf = len(geom.faces)
            total_verts += nv
            total_faces += nf
            print(f"  {name}: {nv} vertices, {nf} faces")
    print(f"  Total: {total_verts} vertices, {total_faces} faces")
elif hasattr(scene, 'vertices'):
    print(f"  Single mesh: {len(scene.vertices)} vertices, {len(scene.faces)} faces")

print(f"\n  Geometries in scene: {len(scene.geometry) if hasattr(scene, 'geometry') else 1}")

# Read metadata
with open("outputs/483241eb/meta.json", encoding="utf-8") as f:
    meta = json.load(f)
print(f"  Metadata: {json.dumps(meta, indent=2, ensure_ascii=False)}")

# Check if bones/skeleton exists
if hasattr(scene, 'graph'):
    print(f"\n  Scene graph nodes: {len(scene.graph.nodes)}")
