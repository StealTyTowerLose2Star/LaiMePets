import { useRef } from 'react';
import type { Mesh, Group } from 'three';
import type { PetBehavior } from '@/types';
import { computeRealismConfig } from './shaders/toon';
import { useProceduralAnimation } from './hooks/useProceduralAnimation';
import type { SubPartRefs } from './hooks/useProceduralAnimation';

interface PlaceholderPetProps {
  behavior?: PetBehavior;
  realism?: number; // 0-100, 影响材质和形状细节
}

/**
 * 占位宠物模型 — 用基础几何体构建一只可爱的小猫。
 *
 * 当真实 GLB 模型不可用时显示，具有程序化呼吸/尾巴/头部动画。
 * 根据 realism 参数调整材质外观（toon / PBR）。
 *
 * 动画由 useProceduralAnimation 驱动，支持所有 9 种行为
 * 及子部件独立动画（头部、尾巴、耳朵）。
 */
export function PlaceholderPet({
  behavior = 'idle',
  realism = 50,
}: PlaceholderPetProps) {
  const groupRef = useRef<Group>(null);
  const tailRef = useRef<Mesh>(null);
  const headRef = useRef<Group>(null);
  const leftEarRef = useRef<Mesh>(null);
  const rightEarRef = useRef<Mesh>(null);

  // 子部件 refs map（传给 useProceduralAnimation）
  const subParts: SubPartRefs = {
    head: headRef,
    tail: tailRef,
    leftEar: leftEarRef,
    rightEar: rightEarRef,
  };

  // 统一程序化动画（替代原有的内联 useFrame 动画代码）
  useProceduralAnimation(groupRef, behavior, { amplitude: 1.0, speed: 1.0 }, subParts);

  // 根据写实度决定材质配置
  const config = computeRealismConfig(realism);
  const isToon = config.tier === 'toon';
  const toonRoughness = 0.05;
  const pbrRoughness = 0.5;

  // 材质参数
  const bodyColor = '#f5a623';
  const bodyDarkColor = '#e8951a';

  return (
    <group ref={groupRef} position={[0, 0.2, 0]}>
      {/* ═══ 身体 ═══ */}
      <mesh position={[0, -0.1, 0]} castShadow>
        <capsuleGeometry args={[0.5, 0.6, 8, 16]} />
        <meshStandardMaterial
          color={bodyColor}
          roughness={isToon ? toonRoughness : pbrRoughness}
          metalness={0.05}
        />
      </mesh>

      {/* ═══ 头部 ═══ */}
      <group ref={headRef} position={[0, 0.55, 0.2]}>
        {/* 脸 */}
        <mesh castShadow>
          <sphereGeometry args={[0.38, 24, 24]} />
          <meshStandardMaterial
            color={bodyColor}
            roughness={isToon ? toonRoughness : pbrRoughness - 0.1}
            metalness={0.05}
          />
        </mesh>

        {/* 左耳 */}
        <mesh
          ref={leftEarRef}
          position={[-0.2, 0.32, 0]}
          rotation={[0, 0, -0.2]}
          castShadow
        >
          <coneGeometry args={[0.12, 0.22, 8]} />
          <meshStandardMaterial
            color={bodyColor}
            roughness={isToon ? toonRoughness : pbrRoughness - 0.1}
            metalness={0.05}
          />
        </mesh>
        {/* 左耳内部 */}
        <mesh position={[-0.2, 0.3, 0.02]} rotation={[0, 0, -0.2]}>
          <coneGeometry args={[0.07, 0.14, 8]} />
          <meshStandardMaterial
            color="#ffb8c6"
            roughness={toonRoughness}
            metalness={0}
          />
        </mesh>

        {/* 右耳 */}
        <mesh
          ref={rightEarRef}
          position={[0.2, 0.32, 0]}
          rotation={[0, 0, 0.2]}
          castShadow
        >
          <coneGeometry args={[0.12, 0.22, 8]} />
          <meshStandardMaterial
            color={bodyColor}
            roughness={isToon ? toonRoughness : pbrRoughness - 0.1}
            metalness={0.05}
          />
        </mesh>
        {/* 右耳内部 */}
        <mesh position={[0.2, 0.3, 0.02]} rotation={[0, 0, 0.2]}>
          <coneGeometry args={[0.07, 0.14, 8]} />
          <meshStandardMaterial
            color="#ffb8c6"
            roughness={toonRoughness}
            metalness={0}
          />
        </mesh>

        {/* 眼睛 — 左 */}
        <mesh position={[-0.13, 0.05, 0.32]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color="#ffffff" roughness={0.1} />
        </mesh>
        <mesh position={[-0.13, 0.04, 0.36]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#2d1b0e" roughness={0.1} />
        </mesh>

        {/* 眼睛 — 右 */}
        <mesh position={[0.13, 0.05, 0.32]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color="#ffffff" roughness={0.1} />
        </mesh>
        <mesh position={[0.13, 0.04, 0.36]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#2d1b0e" roughness={0.1} />
        </mesh>

        {/* 鼻子 */}
        <mesh position={[0, -0.04, 0.36]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.04, 0.05, 8]} />
          <meshStandardMaterial color="#ff9090" roughness={0.2} />
        </mesh>

        {/* 嘴巴 */}
        <mesh position={[-0.03, -0.09, 0.35]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.03, 0.015, 0.01]} />
          <meshStandardMaterial color="#8b5a3c" roughness={0.3} />
        </mesh>
        <mesh position={[0.03, -0.09, 0.35]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.03, 0.015, 0.01]} />
          <meshStandardMaterial color="#8b5a3c" roughness={0.3} />
        </mesh>
      </group>

      {/* ═══ 尾巴 ═══ */}
      <mesh
        ref={tailRef}
        position={[0, -0.2, -0.5]}
        rotation={[0.3, 0, 0.3]}
        castShadow
      >
        <capsuleGeometry args={[0.06, 0.5, 6, 12]} />
        <meshStandardMaterial
          color={bodyDarkColor}
          roughness={isToon ? toonRoughness : pbrRoughness}
          metalness={0.05}
        />
      </mesh>

      {/* ═══ 四条腿 ═══ */}
      <Leg
        position={[-0.2, -0.55, 0.15]}
        isToon={isToon}
        toonR={toonRoughness}
        pbrR={pbrRoughness}
        color={bodyDarkColor}
      />
      <Leg
        position={[0.2, -0.55, 0.15]}
        isToon={isToon}
        toonR={toonRoughness}
        pbrR={pbrRoughness}
        color={bodyDarkColor}
      />
      <Leg
        position={[-0.2, -0.55, -0.2]}
        isToon={isToon}
        toonR={toonRoughness}
        pbrR={pbrRoughness}
        color={bodyDarkColor}
      />
      <Leg
        position={[0.2, -0.55, -0.2]}
        isToon={isToon}
        toonR={toonRoughness}
        pbrR={pbrRoughness}
        color={bodyDarkColor}
      />
    </group>
  );
}

/** 腿组件 */
function Leg({
  position,
  isToon,
  toonR,
  pbrR,
  color,
}: {
  position: [number, number, number];
  isToon: boolean;
  toonR: number;
  pbrR: number;
  color: string;
}) {
  return (
    <mesh position={position} castShadow>
      <capsuleGeometry args={[0.08, 0.3, 6, 8]} />
      <meshStandardMaterial
        color={color}
        roughness={isToon ? toonR : pbrR}
        metalness={0.05}
      />
    </mesh>
  );
}
