import { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import type { RealismTier } from '@/types';
import { computeRealismConfig, createToonGradient } from '../shaders/toon';

interface RealismShaderState {
  /** 当前应用的写实度等级 */
  currentTier: RealismTier;
  /** 轮廓线网格（仅在 toon/hybrid 时存在） */
  outlineMeshes: THREE.Mesh[];
}

/**
 * 写实度着色器 Hook。
 *
 * 根据写实度值 (0-100) 遍历场景中所有网格，应用对应的材质方案：
 * - toon (0-30): MeshToonMaterial + 轮廓线
 * - hybrid (31-70): 混合 PBR 粗糙度 + 渐隐轮廓线
 * - pbr (71-100): 还原原始 PBR 材质
 *
 * 原始材质备份在 mesh.userData._originalMaterial 中，切换回 pbr 时还原。
 *
 * @param scene - 要处理的 Three.js 场景
 * @param realism - 0-100 写实度值
 * @param performanceTier - 性能等级（low 时跳过 toon 着色）
 */
export function useRealismShader(
  scene: THREE.Group | THREE.Object3D | null,
  realism: number,
  performanceTier: 'low' | 'medium' | 'high' = 'medium',
): void {
  const config = useMemo(() => computeRealismConfig(realism), [realism]);

  // 持久化状态（避免每次渲染重建）
  const stateRef = useRef<RealismShaderState>({
    currentTier: 'pbr',
    outlineMeshes: [],
  });

  // 渐变贴图缓存
  const gradientRef = useRef<THREE.Texture | null>(null);

  useEffect(() => {
    if (!scene) return;

    // 低性能模式下跳过 toon 着色
    const effectiveTier: RealismTier =
      performanceTier === 'low' && config.tier === 'toon' ? 'hybrid' : config.tier;

    const state = stateRef.current;

    // Tier 未变化时跳过（除非是 hybrid 的 blendFactor 变化）
    if (effectiveTier === state.currentTier && effectiveTier !== 'hybrid') {
      return;
    }

    // ── 清理旧的轮廓线 ──
    for (const outlineMesh of state.outlineMeshes) {
      outlineMesh.geometry.dispose();
      (outlineMesh.material as THREE.Material).dispose();
      outlineMesh.parent?.remove(outlineMesh);
    }
    state.outlineMeshes = [];

    // ── 确保渐变贴图存在 ──
    if (!gradientRef.current) {
      gradientRef.current = createToonGradient(config.toonSteps);
    }

    // ── 遍历场景应用材质 ──
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const mesh = child;
      const originalMat = mesh.userData._originalMaterial as
        | THREE.Material
        | undefined;

      switch (effectiveTier) {
        case 'toon':
          applyToonMaterial(mesh, originalMat, gradientRef.current!, state);
          break;

        case 'hybrid':
          applyHybridMaterial(
            mesh,
            originalMat,
            gradientRef.current!,
            config.blendFactor,
            config.outlineThickness,
            state,
          );
          break;

        case 'pbr':
          applyPBRMaterial(mesh, originalMat, state);
          break;
      }
    });

    state.currentTier = effectiveTier;

    // 清理
    return () => {
      // 在 scene 变化或卸载时不做深度清理，避免闪烁
      // 材质由 Three.js dispose 管理
    };
  }, [scene, config, performanceTier]);
}

// ── 材质应用函数 ──

/**
 * Toon 等级：替换为 MeshToonMaterial + 轮廓线
 */
function applyToonMaterial(
  mesh: THREE.Mesh,
  originalMat: THREE.Material | undefined,
  gradientMap: THREE.Texture,
  state: RealismShaderState,
) {
  // 备份原始材质
  if (!originalMat) {
    mesh.userData._originalMaterial = mesh.material;
  }
  const source = (originalMat ?? mesh.material) as THREE.MeshStandardMaterial;

  // 如果已经是 toon 材质则跳过
  if (mesh.material instanceof THREE.MeshToonMaterial) return;

  const toonMat = new THREE.MeshToonMaterial({
    color: source instanceof THREE.MeshStandardMaterial ? source.color : new THREE.Color(0xffffff),
    map: (source as THREE.MeshStandardMaterial).map ?? null,
    alphaMap: source.alphaMap ?? null,
    transparent: source.transparent,
    opacity: source.opacity,
    side: source.side,
    gradientMap,
  });

  mesh.material = toonMat;

  // 添加轮廓线（倒置外壳法）
  addOutlineMesh(mesh, 0.02, state);
}

/**
 * Hybrid 等级：保持原始材质但调整粗糙度，渐隐轮廓线
 */
function applyHybridMaterial(
  mesh: THREE.Mesh,
  originalMat: THREE.Material | undefined,
  _gradientMap: THREE.Texture,
  blendFactor: number,
  outlineThickness: number,
  state: RealismShaderState,
) {
  // 恢复原始材质（如果之前被替换过）
  if (originalMat && mesh.material !== originalMat) {
    if (Array.isArray(mesh.material)) {
      // 对多材质网格，逐个还原
      mesh.material = mesh.material.map((_, i) =>
        Array.isArray(originalMat) ? originalMat[i] ?? originalMat[0] : originalMat,
      );
    } else {
      mesh.material = originalMat;
    }
  }

  // 调整粗糙度（toon 端更粗糙 → PBR 端原始值）
  if (mesh.material instanceof THREE.MeshStandardMaterial) {
    const origRoughness =
      mesh.userData._originalRoughness ??
      mesh.material.roughness;
    if (mesh.userData._originalRoughness === undefined) {
      mesh.userData._originalRoughness = origRoughness;
    }
    mesh.material.roughness = THREE.MathUtils.lerp(0.85, origRoughness, blendFactor);
  }

  // 根据 blendFactor 决定是否添加轮廓线
  if (outlineThickness > 0.001) {
    addOutlineMesh(mesh, outlineThickness, state);
  }
}

/**
 * PBR 等级：还原原始材质，移除轮廓线
 */
function applyPBRMaterial(
  mesh: THREE.Mesh,
  originalMat: THREE.Material | undefined,
  _state: RealismShaderState,
) {
  if (originalMat && mesh.material !== originalMat) {
    mesh.material = originalMat;
  }

  // 还原粗糙度
  if (
    mesh.material instanceof THREE.MeshStandardMaterial &&
    mesh.userData._originalRoughness !== undefined
  ) {
    mesh.material.roughness = mesh.userData._originalRoughness;
  }
}

/**
 * 添加倒置外壳轮廓线。
 *
 * 使用 BackSide 渲染 + 轻微法线方向缩放，创建卡通轮廓线效果。
 */
function addOutlineMesh(
  mesh: THREE.Mesh,
  thickness: number,
  state: RealismShaderState,
) {
  const outlineGeom = mesh.geometry.clone();
  const outlineMat = new THREE.MeshBasicMaterial({
    color: 0x2a2522,
    side: THREE.BackSide,
    transparent: true,
    opacity: thickness / 0.02, // 厚度越小越透明
    depthTest: true,
    depthWrite: false,
  });

  const outline = new THREE.Mesh(outlineGeom, outlineMat);
  outline.scale.setScalar(1 + thickness);
  outline.name = `outline_${mesh.name || mesh.id}`;
  outline.raycast = () => {}; // 禁用射线检测（轮廓线不可交互）

  mesh.add(outline);
  state.outlineMeshes.push(outline);
}
