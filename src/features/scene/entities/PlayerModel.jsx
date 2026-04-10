import { useMemo } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { mafiaModelUrl } from '../../game/model/constants'

export function PlayerModel({ tint, alive }) {
  const gltf = useGLTF(mafiaModelUrl)
  const textures = useTexture({
    mat2: '/models/maf/textures/mat_2_baseColor.png',
    mat3: '/models/maf/textures/mat_3_baseColor.png',
    mat4: '/models/maf/textures/mat_4_baseColor.png',
    mat5: '/models/maf/textures/mat_5_baseColor.png',
    mat6: '/models/maf/textures/mat_6_baseColor.png',
  })

  const { object, scale } = useMemo(() => {
    Object.values(textures).forEach((texture) => {
      if (!texture) {
        return
      }
      texture.flipY = false
      texture.colorSpace = THREE.SRGBColorSpace
      texture.needsUpdate = true
    })

    const texturePool = [textures.mat2, textures.mat3, textures.mat4, textures.mat5, textures.mat6].filter(Boolean)

    const pickTexture = (materialName, materialIndex) => {
      const normalizedName = String(materialName || '').toLowerCase()
      const match = normalizedName.match(/mat[_\s]?([2-6])/)
      if (match) {
        const exact = textures[`mat${match[1]}`]
        if (exact) {
          return exact
        }
      }
      return texturePool[materialIndex % texturePool.length] || null
    }

    const cloned = skeletonClone(gltf.scene)
    const box = new THREE.Box3().setFromObject(cloned)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)

    const maxAxis = Math.max(size.x, size.y, size.z) || 1
    const normalizedScale = 0.034 / maxAxis

    cloned.position.x -= center.x
    cloned.position.y -= box.min.y
    cloned.position.z -= center.z

    let meshIndex = 0
    cloned.traverse((node) => {
      if (!node.isMesh || !node.material) {
        return
      }

      const applyMap = (material, materialIndex) => {
        if (!material) {
          return
        }

        const mapToUse = pickTexture(material.name, materialIndex)

        if ('color' in material && material.color?.set) {
          material.color.set('#ffffff')
        }
        material.map = mapToUse
        material.emissiveMap = null
        material.metalnessMap = null
        material.roughnessMap = null
        material.normalMap = null
        material.aoMap = null
        material.alphaMap = null
        material.side = THREE.FrontSide

        if ('metalness' in material && typeof material.metalness === 'number') {
          material.metalness = Math.min(material.metalness, 0.2)
        }

        if ('roughness' in material && typeof material.roughness === 'number') {
          material.roughness = Math.max(material.roughness, 0.62)
        }

        if ('transparent' in material) {
          material.transparent = false
        }

        if ('opacity' in material && typeof material.opacity === 'number') {
          material.opacity = 1
        }

        material.needsUpdate = true
      }

      if (Array.isArray(node.material)) {
        node.material.forEach((material, materialIndex) => applyMap(material, materialIndex + meshIndex))
      } else {
        applyMap(node.material, meshIndex)
      }

      node.castShadow = true
      node.receiveShadow = true
      meshIndex += 1
    })

    return { object: cloned, scale: normalizedScale }
  }, [gltf.scene, textures])

  return (
    <group scale={alive ? scale : scale * 0.96}>
      <primitive object={object} />
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={alive ? 0.24 : 0.08} />
      </mesh>
    </group>
  )
}
