import { useMemo, useRef } from 'react'
import { Clone, useGLTF, useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { lampModelUrl } from '../../game/model/constants'
import { useGameStore } from '../../game/model/gameStore'

function LampPost({ position, rotation }) {
  const lightRef = useRef(null)

  useFrame(() => {
    if (lightRef.current) {
      const phase = useGameStore.getState().phase
      const target = phase === 'night' ? 100 : 0
      lightRef.current.intensity += (target - lightRef.current.intensity) * 0.05
    }
  })

  const gltf = useGLTF(lampModelUrl)
  const textures = useTexture({
    color: '/models/lamp/textures/DefaultMaterial_baseColor.jpeg',
    mr: '/models/lamp/textures/DefaultMaterial_metallicRoughness.png',
    normal: '/models/lamp/textures/DefaultMaterial_normal.png',
  })

  const { object, scale } = useMemo(() => {
    textures.color.flipY = false
    textures.mr.flipY = false
    textures.normal.flipY = false
    textures.color.colorSpace = THREE.SRGBColorSpace
    textures.color.needsUpdate = true
    textures.mr.needsUpdate = true
    textures.normal.needsUpdate = true

    const cloned = gltf.scene.clone(true)
    const box = new THREE.Box3().setFromObject(cloned)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    const localScale = 6 / (Math.max(size.x, size.y, size.z) || 1)

    cloned.position.x -= center.x
    cloned.position.y -= box.min.y
    cloned.position.z -= center.z

    cloned.traverse((node) => {
      if (!node.isMesh || !node.material) {
        return
      }
      const material = node.material
      material.map = textures.color
      material.metalnessMap = textures.mr
      material.roughnessMap = textures.mr
      material.normalMap = textures.normal
      material.needsUpdate = true
      node.castShadow = true
      node.receiveShadow = true
    })

    return { object: cloned, scale: localScale }
  }, [gltf.scene, textures])

  return (
    <group position={position} rotation={rotation}>
      <Clone object={object} scale={scale} />
      <pointLight ref={lightRef} position={[0, 5.2, 0]} intensity={0} distance={20} decay={2} color="#ffaa44" />
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
