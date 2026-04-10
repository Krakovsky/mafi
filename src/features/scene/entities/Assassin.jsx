export function Assassin({ targetPosition, progress }) {
  const start = [-15, 0, targetPosition[2] - 2.5]
  const end = [targetPosition[0] - 1.4, 0, targetPosition[2] + 0.25]

  const x = start[0] + (end[0] - start[0]) * progress
  const z = start[2] + (end[2] - start[2]) * progress
  const facing = Math.atan2(targetPosition[0] - x, targetPosition[2] - z)

  return (
    <group position={[x, 0, z]} rotation={[0, facing, 0]}>
      <mesh position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.34, 20, 20]} />
        <meshStandardMaterial color="#c5c7cd" />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <capsuleGeometry args={[0.3, 0.82, 8, 16]} />
        <meshStandardMaterial color="#4a5566" />
      </mesh>
      <mesh position={[0.34, 0.62, 0.18]} rotation={[0, 0.25, 0]}>
        <boxGeometry args={[0.34, 0.1, 0.1]} />
        <meshStandardMaterial color="#111318" />
      </mesh>

      {progress > 0.78 ? (
        <mesh position={[0.58, 0.62, 0.3]}>
          <sphereGeometry args={[0.16, 18, 18]} />
          <meshStandardMaterial color="#ff9e2e" emissive="#ff9e2e" emissiveIntensity={2} />
        </mesh>
      ) : null}
    </group>
  )
}
