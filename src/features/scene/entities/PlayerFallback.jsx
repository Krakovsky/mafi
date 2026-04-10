export function PlayerFallback({ tint, alive }) {
  return (
    <group>
      <mesh position={[0, 1.1, 0]} castShadow>
        <capsuleGeometry args={[0.36, 0.9, 8, 16]} />
        <meshStandardMaterial color={alive ? '#c6cad4' : '#4b4f57'} roughness={0.35} metalness={0.08} />
      </mesh>
      <mesh position={[0, 2.1, 0]} castShadow>
        <sphereGeometry args={[0.26, 20, 20]} />
        <meshStandardMaterial color={alive ? '#dedfe4' : '#595d66'} roughness={0.4} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[0.65, 0.65, 0.06, 32]} />
        <meshStandardMaterial color={tint} opacity={alive ? 0.75 : 0.3} transparent />
      </mesh>
    </group>
  )
}
