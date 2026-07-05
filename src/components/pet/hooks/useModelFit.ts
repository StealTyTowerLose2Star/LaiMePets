import { useMemo } from 'react';
import * as THREE from 'three';

interface ModelFitResult {
  /** 应用于模型的缩放系数 */
  scale: number;
  /** 模型的包围盒 */
  boundingBox: THREE.Box3 | null;
  /** 重置到原点的偏移量 */
  center: [number, number, number];
}

const DEFAULT_TARGET_HEIGHT = 1.6; // 世界单位，约占视口 40%（相机 z=4，fov=45）
const MAX_SCALE = 10;
const MIN_EXTENT = 0.1; // 退化包围盒的最小范围

/**
 * 自动缩放 GLB 模型以适配视口。
 *
 * 计算加载场景的包围盒，缩放模型使其高度接近 targetHeight，
 * 并将模型居中到原点。
 *
 * @param scene  - 已加载的 Three.js 场景（或 null）
 * @param options.targetHeight - 目标高度（世界单位），默认 1.6
 * @returns 缩放系数、包围盒和居中偏移
 */
export function useModelFit(
  scene: THREE.Group | THREE.Object3D | null,
  options?: { targetHeight?: number },
): ModelFitResult {
  const targetHeight = options?.targetHeight ?? DEFAULT_TARGET_HEIGHT;

  return useMemo(() => {
    if (!scene) {
      return { scale: 1, boundingBox: null, center: [0, 0, 0] };
    }

    // 计算世界空间包围盒
    const bbox = new THREE.Box3().setFromObject(scene);

    // 检查退化包围盒（空场景或极小范围）
    const size = new THREE.Vector3();
    bbox.getSize(size);

    if (size.x < MIN_EXTENT && size.y < MIN_EXTENT && size.z < MIN_EXTENT) {
      console.warn(
        `[useModelFit] 模型包围盒极小 (${size.x.toFixed(4)}, ${size.y.toFixed(4)}, ${size.z.toFixed(4)})，使用默认缩放 1.0`,
      );
      return { scale: 1, boundingBox: bbox, center: [0, 0, 0] };
    }

    // 计算缩放比例（以高度为基准）
    let scale = targetHeight / Math.max(size.y, MIN_EXTENT);

    // 限制极端缩放
    if (scale > MAX_SCALE) {
      console.warn(
        `[useModelFit] 模型极小，缩放系数 ${scale.toFixed(1)}x 已限制为 ${MAX_SCALE}x`,
      );
      scale = MAX_SCALE;
    }

    // 计算居中偏移
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    if (import.meta.env.DEV) {
      console.debug(
        `[useModelFit] bbox=${size.x.toFixed(2)}×${size.y.toFixed(2)}×${size.z.toFixed(2)}, ` +
        `scale=${scale.toFixed(2)}x, center=(${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`,
      );
    }

    return {
      scale,
      boundingBox: bbox,
      center: [-center.x, -center.y, -center.z] as [number, number, number],
    };
  }, [scene, targetHeight]);
}
