import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, Group } from 'three';
import type { PetBehavior } from '@/types';
import { computeRealismConfig } from './shaders/toon';

interface PlaceholderPetProps {
  behavior?: PetBehavior;
  realism?: number; // 0-100, 影响材质和形状细节
}

/**
 * 占位宠物模型 — 用基础几何体构建一只可爱的小猫。
 *
 * 当真实 GLB 模型不可用时显示，具有程序化呼吸/尾巴/头部动画。
 * 根据 realism 参数调整材质外观（toon / PBR）。
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

  // 根据写实度决定材质配置
  const config = computeRealismConfig(realism);
  const isToon = config.tier === 'toon';
  const toonRoughness = 0.05;
  const pbrRoughness = 0.5;

  // 材质参数
  const bodyColor = '#f5a623';
  const bodyDarkColor = '#e8951a';

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const group = groupRef.current;
    const tail = tailRef.current;
    const head = headRef.current;

    if (!group || !tail) return;

    // ── 空闲呼吸动画 ──
    if (behavior === 'idle') {
      group.position.y = Math.sin(t * 1.5) * 0.05;
      tail.rotation.z = Math.sin(t * 2) * 0.3;
      tail.rotation.x = Math.sin(t * 1.5) * 0.15;
    }

    // ── 走动动画 ──
    if (behavior === 'walking') {
      group.position.y = Math.abs(Math.sin(t * 3)) * 0.1;
      tail.rotation.z = Math.sin(t * 4) * 0.5;
    }

    // ── 趴下动画 ──
    if (behavior === 'lying_down') {
      group.position.y = -0.3;
      group.rotation.x = Math.sin(t * 0.5) * 0.05;
    }

    // ── 伸懒腰 ──
    if (behavior === 'stretching') {
      const stretch = Math.sin(t * 2) * 0.1 + 0.1;
      group.scale.setScalar(1 + stretch * 0.3);
      group.position.y = stretch * 0.5;
    }

    // ── 打哈欠 ──
    if (behavior === 'yawning') {
      group.position.y = Math.sin(t * 1.5) * 0.08 + 0.05;
      group.rotation.x = Math.sin(t * 1.5) * 0.15;
    }

    // ── 舔毛 ──
    if (behavior === 'licking') {
      group.rotation.z = Math.sin(t * 3) * 0.1;
    }

    // ── 追尾巴 ──
    if (behavior === 'chasing_tail') {
      group.rotation.y = t * 1.5;
    }

    // ── 看窗外 ──
    if (behavior === 'looking_outside') {
      group.rotation.x = 0.2;
      group.position.y = 0.05;
      group.position.z = -0.1;
    }

    // ── 抓挠 ──
    if (behavior === 'scratching') {
      group.position.y = Math.sin(t * 6) * 0.04;
      group.rotation.z = Math.sin(t * 5) * 0.05;
    }

    // ── 头部轻微转动（大部分行为都适用）──
    if (head && behavior !== 'lying_down') {
      head.rotation.y = Math.sin(t * 0.8) * 0.15;
      head.rotation.x = Math.sin(t * 0.6) * 0.08;
    }

    // ── 耳朵动画 ──
    if (leftEarRef.current && rightEarRef.current) {
      const earTwitch = Math.sin(t * 3) * 0.05;
      leftEarRef.current.rotation.x = earTwitch;
      rightEarRef.current.rotation.x = -earTwitch;
    }
  });

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
