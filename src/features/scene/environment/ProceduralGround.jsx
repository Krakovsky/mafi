import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

export function ProceduralGround() {
  const textures = useTexture({
    map: '/textures/asphalt_pit_lane_1k/textures/asphalt_pit_lane_diff_1k.jpg',
    normalMap: '/textures/asphalt_pit_lane_1k/textures/asphalt_pit_lane_nor_gl_1k.jpg',
    roughnessMap: '/textures/asphalt_pit_lane_1k/textures/asphalt_pit_lane_arm_1k.jpg',
  })

  const map = textures.map.clone()
  const normalMap = textures.normalMap.clone()
  const roughnessMap = textures.roughnessMap.clone()

  map.wrapS = map.wrapT = THREE.RepeatWrapping
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping

  const repeat = 8
  map.repeat.set(repeat, repeat)
  normalMap.repeat.set(repeat, repeat)
  roughnessMap.repeat.set(repeat, repeat)

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
      <circleGeometry args={[45, 64]} />
      <meshStandardMaterial
        map={map}
        normalMap={normalMap}
        roughnessMap={roughnessMap}
        normalScale={new THREE.Vector2(0.8, 0.8)}
        roughness={0.9}
      />
    </mesh>
  )
}