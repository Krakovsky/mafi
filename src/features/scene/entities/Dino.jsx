import { useGLTF } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { dinoModelUrl } from '../../game/model/constants'

export function Dino() {
  const groupRef = useRef()
  const mixerRef = useRef()
  const { scene, animations } = useGLTF(dinoModelUrl)

  useEffect(() => {
    if (animations.length > 0) {
      const mixer = new THREE.AnimationMixer(scene)
      mixerRef.current = mixer

      animations.forEach((clip) => {
        const action = mixer.clipAction(clip)
        action.play()
      })
    }
  }, [scene, animations])

  useFrame((_, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta)
    }
  })

  return (
    <group ref={groupRef} position={[-4, 0, -32]} scale={2.2}>
      <primitive object={scene} />
    </group>
  )
}