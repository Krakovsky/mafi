import { useMemo } from 'react'
import { Clone, useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { treeModelUrl } from '../../game/model/constants'

export function TreeRing() {
  const gltf = useGLTF(treeModelUrl)
  const textures = useTexture({
    leaf: '/models/tree/textures/Leaf_diffuse.png',
    bark: '/models/tree/textures/Bark_diffuse.png',
  })

  const { object, scale } = useMemo(() => {
    textures.leaf.flipY = false
    textures.bark.flipY = false
    textures.leaf.colorSpace = THREE.SRGBColorSpace
    textures.bark.colorSpace = THREE.SRGBColorSpace
    textures.leaf.needsUpdate = true
    textures.bark.needsUpdate = true

    const cloned = gltf.scene.clone(true)
    const box = new THREE.Box3().setFromObject(cloned)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    const localScale = 7.8 / (Math.max(size.x, size.y, size.z) || 1)

    cloned.position.x -= center.x
    cloned.position.y -= box.min.y
    cloned.position.z -= center.z

    cloned.traverse((node) => {
      if (!node.isMesh || !node.material) {
        return
      }

      const material = node.material
      if (material.name === 'Leaf') {
        material.map = textures.leaf
        material.transparent = true
        material.alphaTest = 0.42
        material.depthWrite = false
      } else {
        material.map = textures.bark
      }
      material.needsUpdate = true
      node.castShadow = true
      node.receiveShadow = true
    })

    return { object: cloned, scale: localScale }
  }, [gltf.scene, textures])

  const positions = useMemo(() => {
    return Array.from({ length: 10 }, (_, index) => {
      const angle = (index / 10) * Math.PI * 2
      return {
        x: Math.cos(angle) * 25,
        z: Math.sin(angle) * 25,
        rot: -angle + Math.PI,
      }
    })
  }, [])

  return (
    <group>
      {positions.map((item, index) => (
        <Clone
          key={`tree-${index}`}
          object={object}
          position={[item.x, 0, item.z]}
          rotation={[0, item.rot, 0]}
          scale={scale * (0.88 + (index % 3) * 0.08)}
        />
      ))}
    </group>
  )
}
