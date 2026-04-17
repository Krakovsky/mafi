import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Cloud, Environment, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../game/model/gameStore'

export function SceneAtmosphere({ dayBlendRef }) {
  const phaseRef = useRef(useGameStore.getState().phase)

  const daySky = useRef(new THREE.Color('#87ceeb'))
  const nightSky = useRef(new THREE.Color('#0a1628'))
  const skyColor = useRef(new THREE.Color('#0a1628'))
  const dayAmbient = useRef(new THREE.Color('#ffffff'))
  const nightAmbient = useRef(new THREE.Color('#6070a0'))
  const dayHemi = useRef(new THREE.Color('#c4d4ff'))
  const nightHemi = useRef(new THREE.Color('#5060a0'))
  const daySun = useRef(new THREE.Color('#ffeedd'))
  const nightSun = useRef(new THREE.Color('#8899bb'))

  const tmpAmbient = useRef(new THREE.Color())
  const tmpHemi = useRef(new THREE.Color())
  const tmpSun = useRef(new THREE.Color())

  const ambientLightRef = useRef(null)
  const hemisphereLightRef = useRef(null)
  const directionalLightRef = useRef(null)
  const starsRef = useRef(null)
  const cloudRef = useRef(null)
  const groundMistRef = useRef(null)

  useFrame((state, delta) => {
    phaseRef.current = useGameStore.getState().phase
    const targetDayBlend = phaseRef.current === 'night' ? 0 : 1
    dayBlendRef.current = THREE.MathUtils.damp(dayBlendRef.current, targetDayBlend, 3.2, delta)
    const dayBlend = dayBlendRef.current

    skyColor.current.copy(nightSky.current).lerp(daySky.current, dayBlend)
    state.scene.background = skyColor.current
    if (state.scene.fog) {
      state.scene.fog.color.copy(skyColor.current)
    }

    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = THREE.MathUtils.lerp(0.3, 0.7, dayBlend)
      ambientLightRef.current.color.copy(tmpAmbient.current.copy(nightAmbient.current).lerp(dayAmbient.current, dayBlend))
    }

    if (hemisphereLightRef.current) {
      hemisphereLightRef.current.intensity = THREE.MathUtils.lerp(0.4, 0.8, dayBlend)
      hemisphereLightRef.current.color.copy(tmpHemi.current.copy(nightHemi.current).lerp(dayHemi.current, dayBlend))
    }

    if (directionalLightRef.current) {
      directionalLightRef.current.intensity = THREE.MathUtils.lerp(0.2, 1.2, dayBlend)
      directionalLightRef.current.color.copy(tmpSun.current.copy(nightSun.current).lerp(daySun.current, dayBlend))
    }

    if (starsRef.current) {
      starsRef.current.visible = dayBlend < 0.92
    }

    if (cloudRef.current) {
      cloudRef.current.visible = dayBlend > 0.08
    }

    if (groundMistRef.current) {
      const mistVisible = phaseRef.current === 'night'
      groundMistRef.current.visible = mistVisible
    }
  })

  return (
    <>
      <color attach="background" args={['#08111b']} />
      <fog attach="fog" args={['#08111b', 20, 140]} />

      <Stars ref={starsRef} radius={100} depth={50} count={3000} factor={4} saturation={0.3} fade speed={0.5} />

      <ambientLight ref={ambientLightRef} intensity={0.4} color="#b0bbd8" />
      <hemisphereLight ref={hemisphereLightRef} intensity={0.6} color="#c4d4ff" groundColor="#2a3a4a" />

      <directionalLight
        ref={directionalLightRef}
        castShadow
        intensity={1.5}
        color="#ffe4c4"
        position={[-8, 12, -10]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0001}
        shadow-normalBias={0.02}
        shadow-radius={4}
      />

      <pointLight position={[15, 8, 15]} intensity={0.4} color="#ffcc88" distance={40} decay={2} />
      <pointLight position={[-15, 8, 15]} intensity={0.4} color="#ffcc88" distance={40} decay={2} />

      <Environment preset="sunset" background={false} />

      <SunMoonCelestials dayBlendRef={dayBlendRef} />

      <Cloud ref={cloudRef} opacity={0.4} speed={0.2} width={40} depth={1.5} segments={20} position={[0, 15, -25]} />

      <mesh ref={groundMistRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]} visible={false}>
        <planeGeometry args={[80, 80]} />
        <meshBasicMaterial color="#1a2a4a" transparent opacity={0.3} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

function SunMoonCelestials({ dayBlendRef }) {
  const sunMeshRef = useRef(null)
  const sunLightRef = useRef(null)
  const moonMeshRef = useRef(null)
  const moonLightRef = useRef(null)

  useFrame(() => {
    const dayBlend = dayBlendRef.current

    if (sunMeshRef.current) {
      sunMeshRef.current.visible = dayBlend > 0.05
      sunMeshRef.current.material.opacity = dayBlend
    }
    if (sunLightRef.current) {
      sunLightRef.current.intensity = dayBlend * 300
    }
    if (moonMeshRef.current) {
      moonMeshRef.current.visible = dayBlend < 0.95
      moonMeshRef.current.material.opacity = 1 - dayBlend
    }
    if (moonLightRef.current) {
      moonLightRef.current.intensity = (1 - dayBlend) * 150
    }
  })

  return (
    <>
      <mesh ref={sunMeshRef} position={[-25, 20, -70]}>
        <sphereGeometry args={[3, 32, 32]} />
        <meshBasicMaterial color="#ffee66" transparent />
      </mesh>
      <pointLight ref={sunLightRef} color="#ffaa33" intensity={0} distance={100} decay={1} position={[-25, 20, -70]} />

      <mesh ref={moonMeshRef} position={[30, 22, -65]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#ccddff" transparent />
      </mesh>
      <pointLight ref={moonLightRef} color="#6688ff" intensity={0} distance={80} decay={1.5} position={[30, 22, -65]} />
    </>
  )
}