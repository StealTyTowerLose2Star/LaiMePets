import { Suspense, useState, useCallback, useRef, Component } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Environment } from './Environment';
import { PlaceholderPet } from './PlaceholderPet';
import { useModelFit } from './hooks/useModelFit';
import { usePetAnimation } from './hooks/usePetAnimation';
import { useRealismShader } from './hooks/useRealismShader';
import type { PetBehavior, PerformanceTier } from '@/types';

interface PetCanvasProps {
  behavior?: PetBehavior;
  realism?: number;
  performanceMode?: PerformanceTier;
  interactive?: boolean;
  /** 真实 3D 模型 URL（GLB 格式），未提供时使用 PlaceholderPet */
  modelPath?: string;
  onPetClick?: () => void;
}

// ── 带动画的 GLB 模型 ──

interface AnimatedGlbModelProps {
  url: string;
  behavior: PetBehavior;
  realism: number;
  performanceMode: PerformanceTier;
}

function AnimatedGlbModel({
  url,
  behavior,
  realism,
  performanceMode,
}: AnimatedGlbModelProps) {
  const gltf = useGLTF(url);
  const { scene } = gltf;
  const groupRef = useRef<THREE.Group>(null);

  // 自动缩放以适配视口
  const { scale, center } = useModelFit(scene);

  // 写实度着色器
  useRealismShader(scene, realism, performanceMode);

  // 动画（骨骼优先，回退到程序化）
  usePetAnimation(gltf, behavior, groupRef);

  return (
    <group ref={groupRef}>
      <primitive
        object={scene}
        scale={scale}
        position={[center[0] * scale, center[1] * scale, center[2] * scale]}
      />
    </group>
  );
}

// ── R3F 错误边界（模型加载失败时降级到 PlaceholderPet）──

interface ErrorBoundaryState {
  hasError: boolean;
}

class GLErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[PetCanvas] GLB load error:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * 宠物 3D 画布
 *
 * 核心渲染组件，承载 Three.js 场景。
 * - 真实模型加载中 → 显示 PlaceholderPet（Suspense fallback）
 * - 真实模型加载失败 → 降级到 PlaceholderPet（ErrorBoundary）
 * - 无 modelPath → 显示 PlaceholderPet
 * - 支持骨骼动画（自动检测）→ 回退到程序化动画
 * - 支持写实度着色器（toon/hybrid/PBR）
 * - 支持性能分级（low/medium/high）
 */
export function PetCanvas({
  behavior = 'idle',
  realism = 50,
  performanceMode = 'medium',
  interactive = true,
  modelPath,
  onPetClick: _onPetClick,
}: PetCanvasProps) {
  const [isLoading, setIsLoading] = useState(true);

  const handleCreated = useCallback(() => {
    setIsLoading(false);
  }, []);

  const dpr = performanceMode === 'high' ? 2 : performanceMode === 'medium' ? 1.5 : 1;
  const shadows = performanceMode !== 'low';

  // 模型内容
  const placeholder = <PlaceholderPet behavior={behavior} realism={realism} />;

  const modelContent = modelPath ? (
    <GLErrorBoundary fallback={placeholder}>
      <Suspense fallback={placeholder}>
        <AnimatedGlbModel
          url={modelPath}
          behavior={behavior}
          realism={realism}
          performanceMode={performanceMode}
        />
      </Suspense>
    </GLErrorBoundary>
  ) : (
    placeholder
  );

  return (
    <div className="relative h-full w-full">
      {/* HTML 加载指示器（Canvas 初始化前） */}
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
        {/* 环境灯光 */}
        <Environment />

        {/* 接触阴影（底部柔和的影子） */}
        <ContactShadows
          position={[0, -1.35, 0]}
          opacity={0.4}
          scale={4}
          blur={2.5}
          far={4}
        />

        {/* 模型内容（真实 GLB 或 PlaceholderPet） */}
        {modelContent}

        {/* 轨道控制（仅交互模式） */}
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
      </Canvas>
    </div>
  );
}
