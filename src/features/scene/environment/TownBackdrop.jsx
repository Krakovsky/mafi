import { useMemo } from 'react'
import { Clone, useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { townModelUrl } from '../../game/model/constants'

export function TownBackdrop() {
  const gltf = useGLTF(townModelUrl)
  const textures = useTexture({
    b1Color: '/models/town/textures/BACKGROUND_BUILDINGS_1_baseColor.png',
    b1MR: '/models/town/textures/BACKGROUND_BUILDINGS_1_metallicRoughness.png',
    b1Em: '/models/town/textures/BACKGROUND_BUILDINGS_1_emissive.png',
    b2Color: '/models/town/textures/BACKGROUND_BUILDING_2_baseColor.png',
    b2MR: '/models/town/textures/BACKGROUND_BUILDING_2_metallicRoughness.png',
    b2Em: '/models/town/textures/BACKGROUND_BUILDING_2_emissive.png',
    flareColor: '/models/town/textures/Flare_baseColor.png',
    flareEm: '/models/town/textures/Flare_emissive.png',
    redFlareColor: '/models/town/textures/RED_FLARE_baseColor.png',
    redFlareEm: '/models/town/textures/RED_FLARE_emissive.png',
  })

  const { object, scale } = useMemo(() => {
    const preparedTextures = Object.values(textures)
    preparedTextures.forEach((texture, index) => {
      if (!texture) {
        return
      }
      texture.flipY = false
      const isColor = index === 0 || index === 2 || index === 3 || index === 5 || index === 6 || index === 7 || index === 8 || index === 9
      if (isColor) {
        texture.colorSpace = THREE.SRGBColorSpace
      }
      texture.needsUpdate = true
    })

    const cloned = gltf.scene.clone(true)
    const box = new THREE.Box3().setFromObject(cloned)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    const localScale = 18 / (Math.max(size.x, size.y, size.z) || 1)

    cloned.position.x -= center.x
    cloned.position.y -= box.min.y
    cloned.position.z -= center.z

    cloned.traverse((node) => {
      if (!node.isMesh || !node.material) {
        return
      }

      const material = node.material
      if (material.name === 'BACKGROUND_BUILDINGS_1') {
        material.map = textures.b1Color
        material.metalnessMap = textures.b1MR
        material.roughnessMap = textures.b1MR
        material.emissiveMap = textures.b1Em
        material.emissive = new THREE.Color('#ffffff')
        material.emissiveIntensity = 1.2
      } else if (material.name === 'BACKGROUND_BUILDING_2') {
        material.map = textures.b2Color
        material.metalnessMap = textures.b2MR
        material.roughnessMap = textures.b2MR
        material.emissiveMap = textures.b2Em
        material.emissive = new THREE.Color('#ffffff')
        material.emissiveIntensity = 1.25
      } else if (material.name === 'Flare') {
        material.map = textures.flareColor
        material.emissiveMap = textures.flareEm
        material.emissive = new THREE.Color('#ffffff')
        material.emissiveIntensity = 1.4
        material.transparent = true
        material.depthWrite = false
      } else if (material.name === 'RED_FLARE') {
        material.map = textures.redFlareColor
        material.emissiveMap = textures.redFlareEm
        material.emissive = new THREE.Color('#ffffff')
        material.emissiveIntensity = 1.6
        material.transparent = true
        material.depthWrite = false
      }

      material.needsUpdate = true
      node.castShadow = true
      node.receiveShadow = true
    })

    return { object: cloned, scale: localScale }
  }, [gltf.scene, textures])

  return <Clone object={object} position={[0, -0.1, -38]} scale={scale * 4} />
}
