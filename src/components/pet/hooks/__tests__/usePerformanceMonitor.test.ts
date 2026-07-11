import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Mock @react-three/fiber useFrame ──
const useFrameCallbacks: Array<(state: { clock: { getElapsedTime: () => number; getDelta: () => number } }) => void> = [];

vi.mock('@react-three/fiber', () => ({
  useFrame: (cb: (state: { clock: { getElapsedTime: () => number; getDelta: () => number } }) => void) => {
    useFrameCallbacks.push(cb);
  },
}));

import { usePerformanceMonitor, detectPerformanceTier } from '../usePerformanceMonitor';

// ── Helpers ──

/** 创建模拟 WebGL 上下文 */
function createMockGL(renderer: string | null): WebGL2RenderingContext {
  const extensions: Record<string, unknown> = {};
  const params: Record<number, unknown> = {};

  if (renderer !== null) {
    extensions['WEBGL_debug_renderer_info'] = {
      UNMASKED_RENDERER_WEBGL: 0x9246,
    };
    params[0x9246] = renderer;
  }

  return {
    getExtension: (name: string) => extensions[name] ?? null,
    getParameter: (pname: number) => params[pname] ?? null,
  } as unknown as WebGL2RenderingContext;
}

// ── detectPerformanceTier ──

describe('detectPerformanceTier', () => {
  it('returns "medium" for Intel UHD Graphics', () => {
    const gl = createMockGL('Intel(R) UHD Graphics 620');
    expect(detectPerformanceTier(gl)).toBe('medium');
  });

  it('returns "medium" for Intel HD Graphics', () => {
    const gl = createMockGL('Intel(R) HD Graphics 530');
    expect(detectPerformanceTier(gl)).toBe('medium');
  });

  it('returns "medium" for AMD Radeon Graphics (integrated)', () => {
    const gl = createMockGL('AMD Radeon(TM) Graphics');
    expect(detectPerformanceTier(gl)).toBe('medium');
  });

  it('returns "medium" for ARM Mali GPU', () => {
    const gl = createMockGL('Mali-G78');
    expect(detectPerformanceTier(gl)).toBe('medium');
  });

  it('returns "medium" for Qualcomm Adreno GPU', () => {
    const gl = createMockGL('Adreno 650');
    expect(detectPerformanceTier(gl)).toBe('medium');
  });

  it('returns "high" for dedicated NVIDIA GPU', () => {
    const gl = createMockGL('NVIDIA GeForce RTX 4060');
    expect(detectPerformanceTier(gl)).toBe('high');
  });

  it('returns "high" for dedicated AMD Radeon RX GPU', () => {
    const gl = createMockGL('AMD Radeon RX 7900 XTX');
    expect(detectPerformanceTier(gl)).toBe('high');
  });

  it('returns "high" when WEBGL_debug_renderer_info extension is unavailable', () => {
    const gl = createMockGL(null); // extension not available
    expect(detectPerformanceTier(gl)).toBe('high');
  });

  it('returns "medium" when getExtension throws (safety fallback)', () => {
    const gl = {
      getExtension: () => { throw new Error('WebGL not available'); },
    } as unknown as WebGL2RenderingContext;
    expect(detectPerformanceTier(gl)).toBe('medium');
  });

  it('is case-insensitive for renderer string matching', () => {
    const gl = createMockGL('intel iris xe graphics');
    expect(detectPerformanceTier(gl)).toBe('medium');
  });
});

// ── usePerformanceMonitor ──

describe('usePerformanceMonitor', () => {
  beforeEach(() => {
    useFrameCallbacks.length = 0;
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial tier', () => {
    const { result } = renderHook(() => usePerformanceMonitor('high'));
    expect(result.current.tier).toBe('high');
  });

  it('defaults to "medium" when no initial tier is provided', () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    expect(result.current.tier).toBe('medium');
  });

  it('registers a useFrame callback', () => {
    renderHook(() => usePerformanceMonitor());
    expect(useFrameCallbacks.length).toBeGreaterThanOrEqual(1);
  });

  it('maintains tier when FPS is within acceptable range', () => {
    const { result } = renderHook(() => usePerformanceMonitor('medium'));

    // 模拟 60fps 持续 2 秒（~120 帧）
    const cb = useFrameCallbacks[useFrameCallbacks.length - 1];
    let elapsed = 0;
    for (let i = 0; i < 120; i++) {
      elapsed += 1 / 60;
      cb({ clock: { getElapsedTime: () => elapsed, getDelta: () => 1 / 60 } });
    }

    // 推进 2 秒触发评估
    act(() => { vi.advanceTimersByTime(2000); });

    expect(result.current.tier).toBe('medium');
  });

  it('downgrades from "high" to "medium" after sustained low FPS', () => {
    const { result } = renderHook(() => usePerformanceMonitor('high'));

    const cb = useFrameCallbacks[useFrameCallbacks.length - 1];
    let elapsed = 0;

    // 先正常运行一小段（建立帧率缓冲区）
    for (let i = 0; i < 60; i++) {
      elapsed += 1 / 15; // 15fps
      cb({ clock: { getElapsedTime: () => elapsed, getDelta: () => 1 / 15 } });
    }

    // 触发 15 次评估（每 2s 一次），累计 lowFpsCounter >= 15
    for (let e = 0; e < 15; e++) {
      act(() => { vi.advanceTimersByTime(2000); });
      // 在间隔期间继续喂帧（保持 15fps）
      for (let i = 0; i < 30; i++) {
        elapsed += 1 / 15;
        cb({ clock: { getElapsedTime: () => elapsed, getDelta: () => 1 / 15 } });
      }
    }

    expect(result.current.tier).toBe('medium');
  });

  it('upgrades from "low" to "medium" after sustained high FPS', () => {
    const { result } = renderHook(() => usePerformanceMonitor('low'));

    const cb = useFrameCallbacks[useFrameCallbacks.length - 1];
    let elapsed = 0;

    // 60fps 持续运行
    for (let i = 0; i < 60; i++) {
      elapsed += 1 / 60;
      cb({ clock: { getElapsedTime: () => elapsed, getDelta: () => 1 / 60 } });
    }

    // 触发 30 次评估（每 2s 一次），累计 highFpsCounter >= 30
    for (let e = 0; e < 30; e++) {
      act(() => { vi.advanceTimersByTime(2000); });
      for (let i = 0; i < 30; i++) {
        elapsed += 1 / 60;
        cb({ clock: { getElapsedTime: () => elapsed, getDelta: () => 1 / 60 } });
      }
    }

    expect(result.current.tier).toBe('medium');
  });

  it('exposes setTier for manual override', () => {
    const { result } = renderHook(() => usePerformanceMonitor('medium'));

    act(() => {
      result.current.setTier('low');
    });

    expect(result.current.tier).toBe('low');
  });
});
