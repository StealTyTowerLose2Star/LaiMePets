import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import type { PerformanceTier } from '@/types';

/** FPS 阈值：连续低于此值 N 帧后触发降级 */
const FPS_LOW_THRESHOLD = 20;
const FPS_MEDIUM_THRESHOLD = 40;
/** 需要连续低于阈值多少帧才触发切换（防止瞬时波动） */
const SUSTAINED_FRAMES = 30;

/**
 * 性能监控 Hook。
 *
 * - 持续跟踪帧率
 * - 当 FPS 持续低于阈值时自动降级
 * - 当 FPS 恢复后逐步升回
 * - 初始 tier 可手动指定，也支持 'auto'（从 renderer 信息推断）
 */
export function usePerformanceMonitor(initialTier: PerformanceTier = 'medium') {
  const [tier, setTier] = useState<PerformanceTier>(initialTier);

  // 帧时间滚动缓冲区（最近 60 帧）
  const frameTimes = useRef<number[]>([]);
  const lastTime = useRef<number>(0);
  const lowFpsCounter = useRef(0);
  const highFpsCounter = useRef(0);

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    if (lastTime.current > 0) {
      const delta = now - lastTime.current;
      frameTimes.current.push(delta);
      // 保留最近 60 帧
      if (frameTimes.current.length > 60) {
        frameTimes.current.shift();
      }
    }
    lastTime.current = now;
  });

  // 每 2 秒评估一次性能
  useEffect(() => {
    const interval = setInterval(() => {
      const times = frameTimes.current;
      if (times.length < 10) return; // 还没足够样本

      const avgFps = times.length / times.reduce((a, b) => a + b, 0);

      if (avgFps < FPS_LOW_THRESHOLD) {
        lowFpsCounter.current++;
        highFpsCounter.current = 0;
      } else if (avgFps > FPS_MEDIUM_THRESHOLD) {
        highFpsCounter.current++;
        lowFpsCounter.current = 0;
      } else {
        lowFpsCounter.current = 0;
        highFpsCounter.current = 0;
      }

      setTier((current) => {
        // 降级：持续低帧率
        if (lowFpsCounter.current >= SUSTAINED_FRAMES / 2) {
          lowFpsCounter.current = 0;
          if (current === 'high') return 'medium';
          if (current === 'medium') return 'low';
        }
        // 升级：持续高帧率
        if (highFpsCounter.current >= SUSTAINED_FRAMES) {
          highFpsCounter.current = 0;
          if (current === 'low') return 'medium';
          if (current === 'medium') return 'high';
        }
        return current;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return { tier, setTier };
}

/**
 * 通过 WebGL renderer 信息推断初始性能等级。
 * 在 Canvas onCreated 回调中使用。
 */
export function detectPerformanceTier(gl: WebGL2RenderingContext | WebGLRenderingContext): PerformanceTier {
  try {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      // 移除括号内的文本（如 ™、(TM)、(R)），避免干扰关键词匹配
      const raw = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
      const renderer = raw.replace(/\([^)]*\)/g, '').replace(/™/g, '').replace(/\s+/g, ' ').trim();
      // 集显关键词
      const isIntegrated =
        renderer.includes('intel') ||
        renderer.includes('uhd') ||
        renderer.includes('hd graphics') ||
        renderer.includes('radeon graphics') ||
        renderer.includes('mali') ||
        renderer.includes('adreno');
      if (isIntegrated) return 'medium';
    }
    return 'high'; // 默认假设有独立 GPU
  } catch {
    return 'medium';
  }
}
