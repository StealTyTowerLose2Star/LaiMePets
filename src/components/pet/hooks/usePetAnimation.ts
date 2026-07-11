import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import type { AnimationClip, AnimationAction } from 'three';
import type { PetBehavior } from '@/types';
import { useProceduralAnimation } from './useProceduralAnimation';

// ── 动画片段名称 → 行为映射 ──

/**
 * 根据动画片段名称模糊匹配对应的 PetBehavior。
 * 支持英文和中文命名约定。
 */
const BEHAVIOR_CLIP_PATTERNS: [PetBehavior, RegExp[]][] = [
  ['idle', [/^idle/i, /breath/i, /stand/i, /静止/i, /待机/i]],
  ['walking', [/walk/i, /run/i, /move/i, /行走/i, /跑步/i, /移动/i]],
  ['lying_down', [/lie/i, /lay/i, /sleep/i, /rest/i, /sit/i, /趴/i, /睡/i, /坐/i, /躺/i]],
  ['stretching', [/stretch/i, /reach/i, /伸/i, /懒腰/i]],
  ['yawning', [/yawn/i, /打哈欠/i, /哈欠/i]],
  ['licking', [/lick/i, /groom/i, /舔/i, /梳毛/i]],
  ['chasing_tail', [/tail/i, /chase/i, /spin/i, /尾巴/i, /追/i, /转圈/i]],
  ['looking_outside', [/look/i, /window/i, /watch/i, /看/i, /窗外/i, /观望/i]],
  ['scratching', [/scratch/i, /抓/i, /挠/i]],
];

function matchClipToBehavior(clipName: string): PetBehavior {
  for (const [behavior, patterns] of BEHAVIOR_CLIP_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(clipName)) {
        return behavior;
      }
    }
  }
  return 'idle'; // 安全默认值
}

function buildClipMap(clips: AnimationClip[]): Map<PetBehavior, string> {
  const map = new Map<PetBehavior, string>();
  for (const clip of clips) {
    const behavior = matchClipToBehavior(clip.name);
    // 优先保留第一个匹配（避免重复覆盖）
    if (!map.has(behavior)) {
      map.set(behavior, clip.name);
    }
  }
  return map;
}

// ── 公共接口 ──

export interface PetAnimationResult {
  /** 当前活跃的动画 Action（骨骼动画时有效） */
  currentAction: AnimationAction | null;
  /** 当前是否使用骨骼动画（false 时使用程序化动画） */
  isUsingSkeletal: boolean;
  /** 当前正在动画的行为 */
  currentBehavior: PetBehavior;
  /** 动画片段数量 */
  clipCount: number;
  /** 所有动画片段名称 */
  clipNames: string[];
}

/**
 * 宠物动画编排 Hook。
 *
 * - 如果 GLB 包含动画片段 → 使用 useAnimations（骨骼动画）
 * - 如果 GLB 无动画 → 回退到 useProceduralAnimation（程序化正弦动画）
 * - 支持行为切换时的交叉淡入淡出过渡
 *
 * @param gltfResult - useGLTF 的返回值（{ scene, animations }），null 表示未加载
 * @param behavior - 当前宠物行为
 * @param groupRef - 模型的 Group ref（用于程序化动画）
 */
export function usePetAnimation(
  gltfResult: { scene: THREE.Group; animations: THREE.AnimationClip[] } | null,
  behavior: PetBehavior,
  groupRef: React.RefObject<THREE.Group | null>,
): PetAnimationResult {
  const animations = gltfResult?.animations;
  const clipNames = animations?.map((c) => c.name).filter(Boolean) ?? [];

  // 使用 drei 的 useAnimations（仅当有动画时）
  const { actions, mixer } = useAnimations(animations ?? [], gltfResult?.scene);

  // 构建片段→行为映射
  const clipMap = useMemo(() => buildClipMap(animations ?? []), [animations]);

  // 追踪当前活跃的 action 用于交叉淡入淡出
  const currentActionRef = useRef<AnimationAction | null>(null);
  const currentBehaviorRef = useRef<PetBehavior>(behavior);

  // 是否有骨骼动画可用
  const hasSkeletalAnimations = (animations?.length ?? 0) > 0 && Object.keys(actions).length > 0;

  // ── 程序化动画回退 ──
  useProceduralAnimation(groupRef, behavior, {
    enabled: !hasSkeletalAnimations,
  });

  // ── 骨骼动画驱动 ──
  useEffect(() => {
    if (!hasSkeletalAnimations || !mixer) return;

    const targetClipName = clipMap.get(behavior);
    if (!targetClipName || !actions[targetClipName]) {
      // 无匹配片段 → 使用第一个可用片段
      const fallbackName = Object.keys(actions)[0];
      if (fallbackName && actions[fallbackName]) {
        playClip(actions[fallbackName], currentActionRef);
        currentBehaviorRef.current = matchClipToBehavior(fallbackName);
        return;
      }
      return;
    }

    // 避免重复播放相同片段
    if (currentBehaviorRef.current === behavior && currentActionRef.current?.isRunning()) {
      return;
    }

    const action = actions[targetClipName];
    if (action) {
      playClip(action, currentActionRef);
      currentBehaviorRef.current = behavior;
    }
  }, [behavior, hasSkeletalAnimations, actions, mixer, clipMap]);

  // ── 每帧更新 Mixer ──
  useFrame((_state, delta) => {
    if (mixer && hasSkeletalAnimations) {
      mixer.update(Math.min(delta, 0.1)); // 防止大 delta 跳帧
    }
  });

  return {
    currentAction: currentActionRef.current,
    isUsingSkeletal: hasSkeletalAnimations,
    currentBehavior: currentBehaviorRef.current,
    clipCount: animations?.length ?? 0,
    clipNames,
  };
}

/**
 * 播放动画片段，支持交叉淡入淡出。
 */
function playClip(
  action: AnimationAction,
  currentRef: React.MutableRefObject<AnimationAction | null>,
) {
  const prev = currentRef.current;

  if (prev && prev !== action && prev.isRunning()) {
    // 交叉淡入淡出：300ms
    prev.crossFadeTo(action, 0.3, true);
  } else {
    action.reset().fadeIn(0.3).play();
  }

  currentRef.current = action;
}
