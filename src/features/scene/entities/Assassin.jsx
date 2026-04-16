import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export function Assassin({ assassinationRef, positions }) {
  const groupRef = useRef(null)
  const muzzleRef = useRef(null)

  useFrame(() => {
    const group = groupRef.current
    if (!group) return

    const data = assassinationRef.current
    if (!data || data.targetId === null || data.targetId === undefined) {
      group.visible = false
      return
    }

    const targetPosition = positions[data.targetId]
    if (!targetPosition) {
      group.visible = false
      return
    }

    const progress = data.progress
    group.visible = true

    const startX = -15
    const startZ = targetPosition[2] - 2.5
    const endX = targetPosition[0] - 1.4
    const endZ = targetPosition[2] + 0.25

    const x = startX + (endX - startX) * progress
    const z = startZ + (endZ - startZ) * progress
    const facing = Math.atan2(targetPosition[0] - x, targetPosition[2] - z)

    group.position.set(x, 0, z)
    group.rotation.set(0, facing, 0)

    if (muzzleRef.current) {
      muzzleRef.current.visible = progress > 0.78
    }
  })

  return (
    <group ref={groupRef} visible={false}>
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
      <mesh ref={muzzleRef} position={[0.58, 0.62, 0.3]} visible={false}>
        <sphereGeometry args={[0.16, 18, 18]} />
        <meshStandardMaterial color="#ff9e2e" emissive="#ff9e2e" emissiveIntensity={2} />
      </mesh>
    </group>
  )
}
