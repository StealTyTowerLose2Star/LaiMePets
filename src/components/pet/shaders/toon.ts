import * as THREE from 'three';

/**
 * 创建程序化 toon 渐变贴图。
 *
 * 生成一个 N 级灰度的 1D 渐变纹理，用于 MeshToonMaterial 的 gradientMap。
 * 步数越少 → 卡通感越强（色块分明）。
 * 步数越多 → 接近平滑着色。
 *
 * @param steps - 渐变级数（默认 3，典型值：2-5）
 * @returns 可用于 MeshToonMaterial.gradientMap 的纹理
 */
export function createToonGradient(steps: number = 3): THREE.Texture {
  const size = 64; // 1D 纹理的宽度
  const data = new Uint8Array(size * 4); // RGBA

  for (let i = 0; i < size; i++) {
    const t = i / (size - 1);
    // 量化到离散级数
    const quantized = Math.round(t * (steps - 1)) / (steps - 1);
    const value = Math.round(quantized * 255);

    const offset = i * 4;
    data[offset] = value;     // R
    data[offset + 1] = value; // G
    data[offset + 2] = value; // B
    data[offset + 3] = 255;   // A
  }

  const texture = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;

  return texture;
}

/**
 * 计算写实度配置。
 *
 * @param realism - 0-100 写实度值
 * @returns RealismConfig
 */
export interface RealismConfig {
  tier: 'toon' | 'hybrid' | 'pbr';
  blendFactor: number;
  outlineThickness: number;
  toonSteps: number;
}

export function computeRealismConfig(realism: number): RealismConfig {
  const clamped = Math.max(0, Math.min(100, realism));

  if (clamped <= 30) {
    return {
      tier: 'toon',
      blendFactor: 0,
      outlineThickness: 0.02,
      toonSteps: 3,
    };
  }

  if (clamped <= 70) {
    const t = (clamped - 30) / 40; // 0 at 30, 1 at 70
    return {
      tier: 'hybrid',
      blendFactor: t,
      outlineThickness: 0.02 * (1 - t),
      toonSteps: Math.round(3 + t * 5), // 3 → 8 steps
    };
  }

  return {
    tier: 'pbr',
    blendFactor: 1,
    outlineThickness: 0,
    toonSteps: 10,
  };
}

/**
 * 简化版 toon 着色：将 MeshStandardMaterial 转换为 MeshToonMaterial。
 *
 * 保留原始贴图（map）、颜色等属性，仅改变着色模型。
 *
 * @param original - 原始 MeshStandardMaterial
 * @param gradientMap - toon 渐变贴图
 * @returns 新的 MeshToonMaterial
 */
export function materialToToon(
  original: THREE.MeshStandardMaterial,
  gradientMap: THREE.Texture,
): THREE.MeshToonMaterial {
  const toon = new THREE.MeshToonMaterial({
    color: original.color,
    map: original.map,
    alphaMap: original.alphaMap,
    transparent: original.transparent,
    opacity: original.opacity,
    side: original.side,
    gradientMap,
  });

  return toon;
}
