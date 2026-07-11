import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';
import type { PetBehavior } from '@/types';

interface ProceduralAnimationOptions {
  /** 动画幅度倍率，默认 1.0 */
  amplitude?: number;
  /** 动画速度倍率，默认 1.0 */
  speed?: number;
  /** 是否启用动画（false 时跳过所有更新） */
  enabled?: boolean;
}

/** 子部件 refs，用于更精细的动画控制 */
export interface SubPartRefs {
  head?: React.RefObject<Group | null>;
  tail?: React.RefObject<Mesh | null>;
  leftEar?: React.RefObject<Mesh | null>;
  rightEar?: React.RefObject<Mesh | null>;
}

/**
 * 简单的确定性噪声函数（用于自然微动）
 * 基于正弦波组合模拟 Perlin 噪声的低频分量
 */
function microNoise(t: number, seed: number = 0): number {
  return (
    Math.sin(t * 0.7 + seed) * 0.6 +
    Math.sin(t * 1.3 + seed * 1.7) * 0.3 +
    Math.sin(t * 2.1 + seed * 2.9) * 0.1
  );
}

/**
 * 程序化动画 Hook — 骨骼动画的回退方案。
 *
 * 通过 useFrame 对任意 Group 施加基于正弦波的行为动画。
 * 支持子部件 refs（head/tail/ears）实现更精细的动作。
 * 适用于：
 * - PlaceholderPet（程序化几何体猫）
 * - 无骨骼/动画片段的已加载 GLB 模型
 *
 * @param groupRef - 目标模型的 Group ref
 * @param behavior - 当前行为状态
 * @param options - 可选配置
 * @param subParts - 可选的子部件 refs（head, tail, leftEar, rightEar）
 */
export function useProceduralAnimation(
  groupRef: React.RefObject<Group | null>,
  behavior: PetBehavior,
  options: ProceduralAnimationOptions = {},
  subParts?: SubPartRefs,
) {
  const { amplitude = 1.0, speed = 1.0, enabled = true } = options;

  const prevBehaviorRef = useRef<PetBehavior>(behavior);
  const transitionRef = useRef(1.0); // 0→1 过渡进度

  // 目标姿态（用于 lerp 过渡）
  const targetPose = useRef({
    px: 0, py: 0, pz: 0,
    rx: 0, ry: 0, rz: 0,
    sx: 1, sy: 1, sz: 1,
  });
  const currentPose = useRef({
    px: 0, py: 0, pz: 0,
    rx: 0, ry: 0, rz: 0,
    sx: 1, sy: 1, sz: 1,
  });

  useFrame((state) => {
    const group = groupRef.current;
    if (!group || !enabled) return;

    const t = state.clock.getElapsedTime() * speed;
    const dt = Math.min(state.clock.getDelta(), 0.1);
    const a = amplitude;

    // 行为切换：重置过渡
    if (prevBehaviorRef.current !== behavior) {
      transitionRef.current = 0;
      prevBehaviorRef.current = behavior;
    }
    // 平滑过渡进度 0→1（~330ms）
    if (transitionRef.current < 1) {
      transitionRef.current = Math.min(1, transitionRef.current + dt * 3);
    }
    const blend = transitionRef.current;

    // ── 计算目标姿态 ──
    const tp = { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1 };

    switch (behavior) {
      case 'idle': {
        // 呼吸式上下浮动 + 微动
        tp.py = Math.sin(t * 1.5) * 0.05 * a;
        tp.rz = Math.sin(t * 0.7) * 0.03 * a;
        // 随机微动（基于时间的确定性变化）
        const noise = microNoise(t, 1) * 0.02 * a;
        tp.py += noise;
        tp.rx = microNoise(t, 2) * 0.015 * a;
        break;
      }
      case 'walking': {
        tp.py = Math.abs(Math.sin(t * 3)) * 0.12 * a;
        tp.rz = Math.sin(t * 2) * 0.08 * a;
        tp.rx = 0.05 * a;
        break;
      }
      case 'lying_down': {
        tp.py = -0.3 * a;
        tp.rx = 0.3 * a;
        const breatheScale = 1 + Math.sin(t * 0.5) * 0.02 * a;
        tp.sx = breatheScale;
        tp.sy = breatheScale;
        tp.sz = breatheScale;
        break;
      }
      case 'stretching': {
        const stretch = Math.sin(t * 2) * 0.1 + 0.1;
        const stretchScale = 1 + stretch * 0.3 * a;
        tp.sx = stretchScale;
        tp.sy = stretchScale;
        tp.sz = stretchScale;
        tp.py = stretch * 0.5 * a;
        break;
      }
      case 'yawning': {
        tp.py = (Math.sin(t * 1.5) * 0.08 + 0.05) * a;
        tp.rx = Math.sin(t * 1.5) * 0.15 * a;
        break;
      }
      case 'licking': {
        tp.rz = Math.sin(t * 3) * 0.1 * a;
        tp.py = Math.sin(t * 2) * 0.03 * a;
        break;
      }
      case 'chasing_tail': {
        tp.ry = t * 1.5 * a;
        tp.py = Math.sin(t * 3) * 0.05 * a;
        break;
      }
      case 'looking_outside': {
        tp.rx = 0.2 * a;
        tp.py = 0.05 * a;
        tp.pz = -0.1 * a;
        break;
      }
      case 'scratching': {
        tp.py = Math.sin(t * 6) * 0.04 * a;
        tp.rz = Math.sin(t * 5) * 0.05 * a;
        break;
      }
    }

    targetPose.current = tp;

    // ── Lerp 平滑过渡到目标姿态（避免跳变）──
    const lerp = (from: number, to: number, factor: number) =>
      from + (to - from) * factor;
    const lerpFactor = 1 - Math.exp(-8 * dt); // 帧率无关的平滑
    const cp = currentPose.current;
    cp.px = lerp(cp.px, tp.px, lerpFactor);
    cp.py = lerp(cp.py, tp.py, lerpFactor);
    cp.pz = lerp(cp.pz, tp.pz, lerpFactor);
    cp.rx = lerp(cp.rx, tp.rx, lerpFactor);
    cp.ry = lerp(cp.ry, tp.ry, lerpFactor);
    cp.rz = lerp(cp.rz, tp.rz, lerpFactor);
    cp.sx = lerp(cp.sx, tp.sx, lerpFactor);
    cp.sy = lerp(cp.sy, tp.sy, lerpFactor);
    cp.sz = lerp(cp.sz, tp.sz, lerpFactor);

    // 应用过渡混合（行为切换时淡入）
    const b = blend;
    group.position.set(cp.px * b, cp.py * b, cp.pz * b);
    group.rotation.set(cp.rx * b, cp.ry * b, cp.rz * b);
    group.scale.set(
      1 + (cp.sx - 1) * b,
      1 + (cp.sy - 1) * b,
      1 + (cp.sz - 1) * b,
    );

    // ── 子部件动画（独立于身体动画）──
    if (subParts) {
      animateSubParts(subParts, behavior, t, dt, a, b);
    }
  });
}

/**
 * 子部件独立动画（头部、尾巴、耳朵）。
 * 这些动画叠加在身体动画之上，实现更自然的复合运动。
 */
function animateSubParts(
  parts: SubPartRefs,
  behavior: PetBehavior,
  t: number,
  _dt: number,
  a: number,
  blend: number,
) {
  // ── 头部 ──
  if (parts.head?.current && behavior !== 'lying_down') {
    parts.head.current.rotation.y = Math.sin(t * 0.8) * 0.15 * a * blend;
    parts.head.current.rotation.x = Math.sin(t * 0.6) * 0.08 * a * blend;
  }

  // ── 尾巴 ──
  if (parts.tail?.current) {
    switch (behavior) {
      case 'idle':
        parts.tail.current.rotation.z = Math.sin(t * 2) * 0.3 * a * blend;
        parts.tail.current.rotation.x = Math.sin(t * 1.5) * 0.15 * a * blend;
        break;
      case 'walking':
        parts.tail.current.rotation.z = Math.sin(t * 4) * 0.5 * a * blend;
        break;
      case 'stretching':
        parts.tail.current.rotation.z = Math.sin(t * 1.5) * 0.4 * a * blend;
        break;
      default:
        // 其他行为也保持轻微尾巴摆动
        parts.tail.current.rotation.z = Math.sin(t * 2) * 0.2 * a * blend;
        parts.tail.current.rotation.x = Math.sin(t * 1.2) * 0.1 * a * blend;
    }
  }

  // ── 耳朵 ──
  if (parts.leftEar?.current) {
    const earTwitch = Math.sin(t * 3) * 0.05 * a * blend;
    // 偶尔快速抖动（模拟真实耳朵）
    const microTwitch = (Math.sin(t * 7.3 + 1.5) > 0.92) ? Math.sin(t * 12) * 0.08 : 0;
    parts.leftEar.current.rotation.x = earTwitch + microTwitch;
  }
  if (parts.rightEar?.current) {
    const earTwitch = Math.sin(t * 3) * 0.05 * a * blend;
    const microTwitch = (Math.sin(t * 7.3 + 1.5) > 0.92) ? Math.sin(t * 12) * 0.08 : 0;
    parts.rightEar.current.rotation.x = -earTwitch - microTwitch;
  }
}
