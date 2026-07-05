import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { PetBehavior } from '@/types';

interface ProceduralAnimationOptions {
  /** 动画幅度倍率，默认 1.0 */
  amplitude?: number;
  /** 动画速度倍率，默认 1.0 */
  speed?: number;
  /** 是否启用动画（false 时跳过所有更新） */
  enabled?: boolean;
}

/**
 * 程序化动画 Hook — 骨骼动画的回退方案。
 *
 * 通过 useFrame 对任意 Group 施加基于正弦波的行为动画。
 * 适用于：
 * - PlaceholderPet（程序化几何体猫）
 * - 无骨骼/动画片段的已加载 GLB 模型
 *
 * @param groupRef - 目标模型的 Group ref
 * @param behavior - 当前行为状态
 * @param options - 可选配置
 */
export function useProceduralAnimation(
  groupRef: React.RefObject<Group | null>,
  behavior: PetBehavior,
  options: ProceduralAnimationOptions = {},
) {
  const { amplitude = 1.0, speed = 1.0, enabled = true } = options;

  // 存储上一个行为用于过渡
  const prevBehaviorRef = useRef<PetBehavior>(behavior);
  const transitionRef = useRef(1.0); // 0→1 过渡进度

  useFrame((state) => {
    const group = groupRef.current;
    if (!group || !enabled) return;

    const t = state.clock.getElapsedTime() * speed;
    const a = amplitude;

    // 行为切换时的过渡
    if (prevBehaviorRef.current !== behavior) {
      transitionRef.current = 0;
      prevBehaviorRef.current = behavior;
    }
    if (transitionRef.current < 1) {
      transitionRef.current = Math.min(1, transitionRef.current + state.clock.getDelta() * 3);
    }
    const blend = transitionRef.current; // 0→1 过渡系数

    // 重置变换
    group.position.set(0, 0, 0);
    group.rotation.set(0, 0, 0);
    group.scale.setScalar(1);

    switch (behavior) {
      case 'idle':
        // 呼吸式上下浮动
        group.position.y = Math.sin(t * 1.5) * 0.05 * a;
        // 微小身体摇摆
        group.rotation.z = Math.sin(t * 0.7) * 0.03 * a;
        break;

      case 'walking':
        // 明显上下弹动
        group.position.y = Math.abs(Math.sin(t * 3)) * 0.12 * a;
        // 身体左右摇摆
        group.rotation.z = Math.sin(t * 2) * 0.08 * a;
        // 略微前倾
        group.rotation.x = 0.05 * a;
        break;

      case 'lying_down':
        // 趴下姿态
        group.position.y = -0.3 * a;
        group.rotation.x = 0.3 * a;
        group.scale.setScalar(1 + Math.sin(t * 0.5) * 0.02 * a);
        break;

      case 'stretching':
        {
          const stretch = Math.sin(t * 2) * 0.1 + 0.1;
          group.scale.setScalar(1 + stretch * 0.3 * a);
          group.position.y = stretch * 0.5 * a;
        }
        break;

      case 'yawning':
        // 仰头张嘴（模型伸高 + 头部后仰）
        group.position.y = (Math.sin(t * 1.5) * 0.08 + 0.05) * a;
        group.rotation.x = Math.sin(t * 1.5) * 0.15 * a;
        break;

      case 'licking':
        // 快速左右小幅度转头
        group.rotation.z = Math.sin(t * 3) * 0.1 * a;
        group.position.y = Math.sin(t * 2) * 0.03 * a;
        break;

      case 'chasing_tail':
        // 原地旋转追尾巴
        group.rotation.y = t * 1.5 * a;
        group.position.y = Math.sin(t * 3) * 0.05 * a;
        break;

      case 'looking_outside':
        // 前倾 + 仰头（看向窗外）
        group.rotation.x = 0.2 * a;
        group.position.y = 0.05 * a;
        group.position.z = -0.1 * a;
        break;

      case 'scratching':
        // 快速小幅抖动
        group.position.y = Math.sin(t * 6) * 0.04 * a;
        group.rotation.z = Math.sin(t * 5) * 0.05 * a;
        break;
    }

    // 应用过渡混合（新行为渐变生效）
    if (blend < 1) {
      group.position.x *= blend;
      group.position.y *= blend;
      group.position.z *= blend;
      group.rotation.x *= blend;
      group.rotation.y *= blend;
      group.rotation.z *= blend;
    }
  });
}
