import { useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { lampModelUrl } from '../../game/model/constants'
import { useGameStore } from '../../game/model/gameStore'

function LampLightCone({ position }) {
  const coneRef = useRef()

  useFrame((state, delta) => {
    if (coneRef.current) {
      const phase = useGameStore.getState().phase
      const targetOpacity = phase === 'night' ? 0.08 : 0
      coneRef.current.material.opacity = THREE.MathUtils.damp(coneRef.current.material.opacity, targetOpacity, 4, delta)
    }
  })

  return (
    <mesh ref={coneRef} position={[position[0], position[1] - 2, position[2]]}>
      <coneGeometry args={[3, 4, 16, 1, true]} />
      <meshBasicMaterial color="#ffcc88" transparent opacity={0} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  )
}

function LampPost({ position, rotation }) {
  const lightRef = useRef(null)
  const { scene } = useGLTF(lampModelUrl)

  useFrame((state, delta) => {
    if (lightRef.current) {
      const phase = useGameStore.getState().phase
      const target = phase === 'night' ? 100 : 0
      lightRef.current.intensity = THREE.MathUtils.damp(lightRef.current.intensity, target, 4, delta)
    }
  })

  return (
    <group position={position} rotation={rotation}>
      <primitive object={scene.clone()} scale={0.015} position={[0, 0.2, 0]} />
      <pointLight ref={lightRef} position={[0, 5.2, 0]} intensity={0} distance={20} decay={2} color="#ffaa44" />
      <LampLightCone position={[0, 5.2, 0]} />
    </group>
  )
}

export function StreetLamp() {
  return (
    <>
      <LampPost position={[12.6, 0, 7.4]} rotation={[0, -0.75, 0]} />
      <LampPost position={[-12.6, 0, 7.4]} rotation={[0, 0.75, 0]} />
      <LampPost position={[12.6, 0, -7.4]} rotation={[0, -2.39, 0]} />
      <LampPost position={[-12.6, 0, -7.4]} rotation={[0, 2.39, 0]} />
    </>
  )
}