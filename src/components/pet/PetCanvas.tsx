import { Suspense, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { Environment } from './Environment';
import { PlaceholderPet } from './PlaceholderPet';
import type { PetBehavior, PerformanceTier } from '@/types';

interface PetCanvasProps {
  behavior?: PetBehavior;
  realism?: number;
  performanceMode?: PerformanceTier;
  interactive?: boolean;
  onPetClick?: () => void;
}

/**
 * 宠物 3D 画布
 *
 * 核心渲染组件，承载 Three.js 场景。
 * - 支持性能分级（low/medium/high 对应不同的像素比和阴影质量）
 * - 可交互模式（orbit controls + 点击检测）
 * - Suspense 处理模型加载
 */
export function PetCanvas({
  behavior = 'idle',
  realism = 50,
  performanceMode = 'medium',
  interactive = true,
  onPetClick: _onPetClick,
}: PetCanvasProps) {
  const [isLoading, setIsLoading] = useState(true);

  const handleCreated = useCallback(() => {
    setIsLoading(false);
  }, []);

  const dpr = performanceMode === 'high' ? 2 : performanceMode === 'medium' ? 1.5 : 1;
  const shadows = performanceMode !== 'low';

  return (
    <div className="relative h-full w-full">
      {/* 加载状态 */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-300 border-t-brand-500" />
            <span className="text-caption text-neutral-400">加载 3D 场景中...</span>
          </div>
        </div>
      )}

      <Canvas
        camera={{
          position: [0, 0.5, 4],
          fov: 45,
          near: 0.1,
          far: 20,
        }}
        dpr={dpr}
        shadows={shadows}
        gl={{
          alpha: true,
          antialias: performanceMode !== 'low',
          powerPreference: 'high-performance',
        }}
        onCreated={handleCreated}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          {/* 环境灯光 */}
          <Environment />

          {/* 接触阴影（底部柔和的影子）*/}
          <ContactShadows
            position={[0, -1.35, 0]}
            opacity={0.4}
            scale={4}
            blur={2.5}
            far={4}
          />

          {/* 占位宠物 */}
          <PlaceholderPet behavior={behavior} realism={realism} />

          {/* 轨道控制（仅交互模式）*/}
          {interactive && (
            <OrbitControls
              enablePan={false}
              enableZoom={true}
              minDistance={2}
              maxDistance={6}
              maxPolarAngle={Math.PI / 2 + 0.3}
              minPolarAngle={Math.PI / 4}
              autoRotate
              autoRotateSpeed={0.3}
            />
          )}
        </Suspense>
      </Canvas>

      {/* 性能模式标签（开发时可见）*/}
      {import.meta.env.DEV && (
        <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-caption text-white/60">
          {performanceMode} · {dpr}x · FPS
        </div>
      )}
    </div>
  );
}
