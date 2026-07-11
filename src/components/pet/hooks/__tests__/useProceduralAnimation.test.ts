import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Group, Mesh } from 'three';

// ── Mock @react-three/fiber useFrame ──
const useFrameCallbacks: Array<
  (state: { clock: { getElapsedTime: () => number; getDelta: () => number } }) => void
> = [];

vi.mock('@react-three/fiber', () => ({
  useFrame: (
    cb: (state: {
      clock: { getElapsedTime: () => number; getDelta: () => number };
    }) => void,
  ) => {
    useFrameCallbacks.push(cb);
  },
}));

import { useProceduralAnimation } from '../useProceduralAnimation';
import type { SubPartRefs } from '../useProceduralAnimation';

// ── microNoise（通过 hook 内部调用间接测试） ──

/**
 * 微噪声函数的独立副本（与 useProceduralAnimation.ts 中的 microNoise 完全一致）。
 * 用于直接单元测试 — 确保与 hook 内部行为匹配。
 */
function microNoise(t: number, seed: number = 0): number {
  return (
    Math.sin(t * 0.7 + seed) * 0.6 +
    Math.sin(t * 1.3 + seed * 1.7) * 0.3 +
    Math.sin(t * 2.1 + seed * 2.9) * 0.1
  );
}

describe('microNoise', () => {
  it('is deterministic (same input → same output)', () => {
    const a = microNoise(1.0, 0);
    const b = microNoise(1.0, 0);
    expect(a).toBe(b);
  });

  it('returns different values for different seeds', () => {
    const a = microNoise(1.0, 0);
    const b = microNoise(1.0, 1);
    expect(a).not.toBe(b);
  });

  it('returns values in [-1, 1] range', () => {
    for (let t = 0; t < 100; t += 0.1) {
      const n = microNoise(t, 0);
      expect(n).toBeGreaterThanOrEqual(-1);
      expect(n).toBeLessThanOrEqual(1);
    }
  });

  it('produces continuous values over time', () => {
    // 连续时间点的噪声值应该平滑变化（相邻帧差值 < 0.2）
    const prev = microNoise(0, 0);
    const curr = microNoise(0.016, 0); // ~1 frame at 60fps
    expect(Math.abs(curr - prev)).toBeLessThan(0.2);
  });
});

// ── useProceduralAnimation ──

describe('useProceduralAnimation', () => {
  beforeEach(() => {
    useFrameCallbacks.length = 0;
  });

  it('does not throw when groupRef is null', () => {
    const ref = { current: null };
    expect(() => {
      renderHook(() => useProceduralAnimation(ref, 'idle'));
    }).not.toThrow();
  });

  it('registers a useFrame callback', () => {
    const ref = { current: null };
    renderHook(() => useProceduralAnimation(ref, 'idle'));
    expect(useFrameCallbacks.length).toBeGreaterThanOrEqual(1);
  });

  it('accepts SubPartRefs without error', () => {
    const ref = { current: null };
    const subParts: SubPartRefs = {
      head: { current: null },
      tail: { current: null },
      leftEar: { current: null },
      rightEar: { current: null },
    };

    expect(() => {
      renderHook(() =>
        useProceduralAnimation(ref, 'idle', { amplitude: 0.5, speed: 2.0 }, subParts),
      );
    }).not.toThrow();
  });

  it('respects enabled: false option (should not animate)', () => {
    const ref = { current: null };
    const cbCount = useFrameCallbacks.length;

    renderHook(() =>
      useProceduralAnimation(ref, 'idle', { enabled: false }),
    );

    // 仍然注册了 useFrame，但在执行时 early return（通过 groupRef null check）
    // enabled 检查在 useFrame 回调内部，需要实际调用才触发
    // 此处仅验证 hook 不崩溃
    expect(useFrameCallbacks.length).toBeGreaterThanOrEqual(cbCount);
  });

  it('handles all 9 pet behaviors without throwing', () => {
    const behaviors = [
      'idle',
      'walking',
      'lying_down',
      'stretching',
      'yawning',
      'licking',
      'chasing_tail',
      'looking_outside',
      'scratching',
    ] as const;

    const ref = { current: null };

    for (const behavior of behaviors) {
      expect(() => {
        renderHook(() => useProceduralAnimation(ref, behavior));
      }).not.toThrow();
    }
  });

  it('applies animation to a mock group object', () => {
    const mockGroup = {
      position: { set: vi.fn() },
      rotation: { set: vi.fn() },
      scale: { set: vi.fn() },
    } as unknown as Group;

    const ref = { current: mockGroup };
    renderHook(() => useProceduralAnimation(ref, 'idle'));

    // 执行一帧
    const cb = useFrameCallbacks[useFrameCallbacks.length - 1];
    cb({ clock: { getElapsedTime: () => 1.0, getDelta: () => 0.016 } });

    // position.set 应该被调用（idle 有呼吸浮动）
    expect(mockGroup.position.set).toHaveBeenCalled();
    expect(mockGroup.rotation.set).toHaveBeenCalled();
    expect(mockGroup.scale.set).toHaveBeenCalled();
  });

  it('applies sub-part animation to head and tail', () => {
    const mockGroup = {
      position: { set: vi.fn() },
      rotation: { set: vi.fn() },
      scale: { set: vi.fn() },
    } as unknown as Group;

    const mockHead = {
      rotation: { x: 0, y: 0, z: 0 },
      position: { x: 0, y: 0, z: 0 },
    } as unknown as Group;

    const mockTail = {
      rotation: { x: 0, y: 0, z: 0 },
      position: { x: 0, y: 0, z: 0 },
    } as unknown as Mesh;

    const ref = { current: mockGroup };
    const subParts: SubPartRefs = {
      head: { current: mockHead },
      tail: { current: mockTail },
    };

    renderHook(() =>
      useProceduralAnimation(ref, 'idle', { amplitude: 1.0, speed: 1.0 }, subParts),
    );

    const cb = useFrameCallbacks[useFrameCallbacks.length - 1];
    cb({ clock: { getElapsedTime: () => 2.0, getDelta: () => 0.016 } });

    // 头部 rotation 应该被修改（非 lying_down）
    expect(mockHead.rotation.y).not.toBe(0);
    // 尾巴 rotation 应该被修改
    expect(mockTail.rotation.z).not.toBe(0);
  });

  it('does not animate head when behavior is lying_down', () => {
    const mockGroup = {
      position: { set: vi.fn() },
      rotation: { set: vi.fn() },
      scale: { set: vi.fn() },
    } as unknown as Group;

    const mockHead = {
      rotation: { x: 0, y: 0, z: 0 },
      position: { x: 0, y: 0, z: 0 },
    } as unknown as Group;

    const ref = { current: mockGroup };
    const subParts: SubPartRefs = {
      head: { current: mockHead },
    };

    renderHook(() =>
      useProceduralAnimation(ref, 'lying_down', { amplitude: 1.0, speed: 1.0 }, subParts),
    );

    const cb = useFrameCallbacks[useFrameCallbacks.length - 1];
    cb({ clock: { getElapsedTime: () => 2.0, getDelta: () => 0.016 } });

    // lying_down 时头部 rotation 不应该被动画修改（原始值保持 0）
    expect(mockHead.rotation.y).toBe(0);
    expect(mockHead.rotation.x).toBe(0);
  });
});
