import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

const PATH_NORMAL_SCALE = new THREE.Vector2(0.35, 0.35)

function prepareTiledTexture(texture, repeatX, repeatY, colorTexture = false) {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeatX, repeatY)
  if (colorTexture) {
    texture.colorSpace = THREE.SRGBColorSpace
  }
  texture.needsUpdate = true
}

function ParkGround() {
  const textures = useTexture({
    cobbleMap: '/textures/cobblestone_floor_09_1k/textures/cobblestone_floor_09_diff_1k.jpg',
    cobbleNormal: '/textures/cobblestone_floor_09_1k/textures/cobblestone_floor_09_nor_gl_1k.jpg',
    cobbleRoughness: '/textures/cobblestone_floor_09_1k/textures/cobblestone_floor_09_arm_1k.jpg',
  })

  useMemo(() => {
    prepareTiledTexture(textures.cobbleMap, 5, 5, true)
    // prepareTiledTexture(textures.cobbleNormal, 5, 5)
    prepareTiledTexture(textures.cobbleRoughness, 5, 5)
  }, [textures])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.02, 0]}>
        <ringGeometry args={[7.2, 15.25, 96]} />
        <meshStandardMaterial
          color="#c8c0b3"
          map={textures.cobbleMap}
          normalMap={textures.cobbleNormal}
          roughnessMap={textures.cobbleRoughness}
          normalScale={PATH_NORMAL_SCALE}
          roughness={0.95}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.024, 0]}>
        <circleGeometry args={[7.02, 64]} />
        <meshStandardMaterial color="black" roughness={0.98} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.026, 0]}>
        <circleGeometry args={[4.9, 64]} />
        <meshStandardMaterial
          color="#c8c0b3"
          map={textures.cobbleMap}
          normalMap={textures.cobbleNormal}
          roughnessMap={textures.cobbleRoughness}
          normalScale={PATH_NORMAL_SCALE}
          roughness={0.95}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.028, 0]}>
        <ringGeometry args={[6.95, 7.22, 96]} />
        <meshStandardMaterial color="#6a6c66" roughness={0.9} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.028, 0]}>
        <ringGeometry args={[15.15, 15.45, 96]} />
        <meshStandardMaterial color="#6a6c66" roughness={0.9} />
      </mesh>
    </group>
  )
}

export function ParkZone() {
  return (
    <group>
      <ParkGround />
    </group>
  )
}
