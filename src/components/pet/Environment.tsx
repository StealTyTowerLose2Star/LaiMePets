/**
 * 3D 场景环境：灯光 + 地面 + 氛围
 * 设计参考：温暖的室内光照，配合品牌暖色调
 */
export function Environment() {
  return (
    <group>
      {/* 环境光 — 基础亮度 */}
      <ambientLight intensity={0.6} color="#fff8f0" />

      {/* 主方向光 — 模拟窗户自然光 */}
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.2}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />

      {/* 补光 — 暖色调，减少暗部 */}
      <pointLight
        position={[-3, 2, 3]}
        intensity={0.8}
        color="#f59e5b"
        distance={10}
      />

      {/* 底部反射光 — 模拟桌面散射 */}
      <pointLight
        position={[0, -1, 2]}
        intensity={0.4}
        color="#ffe4c4"
        distance={8}
      />

      {/* 地面阴影接收面（透明）*/}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.5, 0]}
        receiveShadow
      >
        <planeGeometry args={[10, 10]} />
        <shadowMaterial transparent opacity={0.15} />
      </mesh>
    </group>
  );
}
