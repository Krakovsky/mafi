import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, OrbitControls, Stars, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import {
  lampModelUrl,
  mafiaModelUrl,
  PLAYER_COUNT,
  PLAYER_RING_RADIUS,
  townModelUrl,
  treeModelUrl,
} from '../game/model/constants'
import { Assassin } from './entities/Assassin'
import { PlayerActor } from './entities/PlayerActor'
import { StreetLamp } from './environment/StreetLamp'
import { TownBackdrop } from './environment/TownBackdrop'
import { TreeRing } from './environment/TreeRing'

function SceneAtmosphere({ phase }) {
  const blendRef = useRef(phase === 'day' ? 1 : 0)
  const sunProgressRef = useRef(0.08)
  const moonProgressRef = useRef(0.58)
  const ambientLightRef = useRef(null)
  const hemisphereLightRef = useRef(null)
  const directionalLightRef = useRef(null)
  const sunRef = useRef(null)
  const moonRef = useRef(null)
  const groundRef = useRef(null)
  const daySky = useMemo(() => new THREE.Color('#b4c2d2'), [])
  const nightSky = useMemo(() => new THREE.Color('#08111b'), [])
  const skyColor = useMemo(() => new THREE.Color('#08111b'), [])

  useFrame((state, delta) => {
    const target = phase === 'day' ? 1 : 0
    blendRef.current = THREE.MathUtils.lerp(blendRef.current, target, Math.min(delta * 0.55, 1))

    sunProgressRef.current = (sunProgressRef.current + delta * 0.03) % 1
    moonProgressRef.current = (moonProgressRef.current + delta * 0.03) % 1

    const dayBlend = blendRef.current
    const nightBlend = 1 - dayBlend

    skyColor.copy(nightSky).lerp(daySky, dayBlend)
    state.scene.background = skyColor
    if (state.scene.fog) {
      state.scene.fog.color.copy(skyColor)
    }

    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = 0.32 + dayBlend * 0.54
      ambientLightRef.current.color.set(dayBlend > 0.5 ? '#f5f5f2' : '#b0bbd8')
    }

    if (hemisphereLightRef.current) {
      hemisphereLightRef.current.intensity = 0.26 + dayBlend * 0.34
      hemisphereLightRef.current.color.set(dayBlend > 0.5 ? '#f4f8ff' : '#9cb2d4')
    }

    if (directionalLightRef.current) {
      directionalLightRef.current.intensity = 0.48 + dayBlend * 0.67
      directionalLightRef.current.color.set(dayBlend > 0.5 ? '#fff6e2' : '#c2d0f8')
      directionalLightRef.current.position.set(
        THREE.MathUtils.lerp(-8, 11, dayBlend),
        THREE.MathUtils.lerp(12, 18, dayBlend),
        THREE.MathUtils.lerp(-10, 8, dayBlend),
      )
    }

    const sunX = 24 - sunProgressRef.current * 48
    const sunY = 2 - sunProgressRef.current * 10
    if (sunRef.current) {
      sunRef.current.position.set(sunX, sunY, -30)
      sunRef.current.material.emissiveIntensity = 0.08 + dayBlend * 0.68
      sunRef.current.material.opacity = 0.1 + dayBlend * 0.9
    }

    const moonX = 24 - moonProgressRef.current * 48
    const moonY = 2 - moonProgressRef.current * 10
    if (moonRef.current) {
      moonRef.current.position.set(moonX, moonY, -30)
      moonRef.current.material.emissiveIntensity = 0.08 + nightBlend * 0.56
      moonRef.current.material.opacity = 0.1 + nightBlend * 0.9
    }

    if (groundRef.current) {
      groundRef.current.color.set(dayBlend > 0.5 ? '#657167' : '#1f2928')
    }
  })

  return (
    <>
      <color attach="background" args={['#08111b']} />
      <fog attach="fog" args={['#08111b', 20, 125]} />

      <Stars radius={80} depth={35} count={1600} factor={3} saturation={0.15} fade />

      <ambientLight ref={ambientLightRef} intensity={0.32} color="#b0bbd8" />
      <hemisphereLight
        ref={hemisphereLightRef}
        intensity={0.26}
        color="#9cb2d4"
        groundColor="#31404d"
      />

      <directionalLight
        ref={directionalLightRef}
        castShadow
        intensity={0.48}
        color="#c2d0f8"
        position={[-8, 12, -10]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <Environment preset="city" />

      <mesh ref={sunRef} position={[20, 2, -30]}>
        <sphereGeometry args={[1.65, 32, 32]} />
        <meshStandardMaterial
          color="#ffd95e"
          emissive="#ffbf3d"
          emissiveIntensity={0.08}
          transparent
          opacity={0.1}
        />
      </mesh>

      <mesh ref={moonRef} position={[20, 2, -30]}>
        <sphereGeometry args={[1.42, 32, 32]} />
        <meshStandardMaterial
          color="#cfd5ff"
          emissive="#a4b0ff"
          emissiveIntensity={0.08}
          transparent
          opacity={0.1}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[16, 80]} />
        <meshStandardMaterial ref={groundRef} color="#1f2928" roughness={0.95} />
      </mesh>
    </>
  )
}

export function MafiaScene({ players, phase, assassination, showWebcams = true }) {
  const positions = useMemo(() => {
    return players.map((_, index) => {
      const angle = (index / PLAYER_COUNT) * Math.PI * 2
      return [Math.cos(angle) * PLAYER_RING_RADIUS, 0, Math.sin(angle) * PLAYER_RING_RADIUS]
    })
  }, [players])

  const targetPosition = assassination ? positions[assassination.targetId] : null

  return (
    <Canvas style={{ width: '100%', height: '100%' }} shadows camera={{ position: [0, 11, 34], fov: 42 }}>
      <SceneAtmosphere phase={phase} />

      <Suspense fallback={null}>
        <TownBackdrop />
        <StreetLamp />
        <TreeRing />
      </Suspense>

      {players.map((player) => (
        <PlayerActor
          key={player.id}
          player={player}
          position={positions[player.id]}
          focused={assassination?.targetId === player.id}
          showWebcams={showWebcams}
        />
      ))}

      {assassination && targetPosition ? <Assassin targetPosition={targetPosition} progress={assassination.progress} /> : null}

      <OrbitControls target={[0, 1.8, 0]} minDistance={18} maxDistance={75} minPolarAngle={0.35} maxPolarAngle={1.34} />
    </Canvas>
  )
}

useGLTF.preload(mafiaModelUrl)
useGLTF.preload(townModelUrl)
useGLTF.preload(lampModelUrl)
useGLTF.preload(treeModelUrl)
