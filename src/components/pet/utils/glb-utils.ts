import * as THREE from 'three';
import type { GlbMetadata } from '@/types';

/**
 * 从 Three.js 场景中提取 GLB 模型元数据。
 *
 * 遍历场景中的所有网格，统计顶点、三角面、材质等信息。
 */
export function extractMetadataFromScene(
  scene: THREE.Group | THREE.Object3D,
  animations: THREE.AnimationClip[],
  fileSizeBytes?: number,
): GlbMetadata {
  let vertexCount = 0;
  let triangleCount = 0;
  const materialUuids = new Set<string>();
  let meshCount = 0;

  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      meshCount++;
      const geom = child.geometry;
      if (geom.index) {
        vertexCount += geom.attributes.position.count;
        triangleCount += geom.index.count / 3;
      } else {
        vertexCount += geom.attributes.position.count;
        triangleCount += geom.attributes.position.count / 3;
      }

      const mat = child.material;
      if (Array.isArray(mat)) {
        for (const m of mat) {
          materialUuids.add(m.uuid);
        }
      } else {
        materialUuids.add(mat.uuid);
      }
    }
  });

  // 骨骼检测：遍历所有蒙皮网格
  let hasSkeleton = false;
  scene.traverse((child) => {
    if (child instanceof THREE.SkinnedMesh && child.skeleton) {
      hasSkeleton = true;
    }
  });

  // 包围盒
  const bbox = new THREE.Box3().setFromObject(scene);
  const min = bbox.min.toArray() as [number, number, number];
  const max = bbox.max.toArray() as [number, number, number];

  const clipNames = animations.map((c) => c.name).filter(Boolean);

  return {
    fileSizeBytes: fileSizeBytes ?? 0,
    vertexCount: Math.round(vertexCount),
    triangleCount: Math.round(triangleCount),
    meshCount,
    materialCount: materialUuids.size,
    animationClipCount: animations.length,
    animationClipNames: clipNames,
    hasSkeleton,
    boundingBox: { min, max },
  };
}

/**
 * 将字节数格式化为人类可读的字符串。
 */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(2)} MB`;
}

/**
 * 格式化顶点/面数为人类可读的字符串。
 */
export function formatCount(n: number): string {
  if (n <= 0) return '—';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}
