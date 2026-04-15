import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, OrbitControls, Stars, useGLTF, GradientTexture, Cloud } from '@react-three/drei'
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

function ProceduralGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
      <circleGeometry args={[45, 64]} />
      <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
    </mesh>
  )
}

function SceneAtmosphere({ phase }) {
  const isDay = phase === 'day'
  const daySky = useMemo(() => new THREE.Color('#87ceeb'), [])
  const nightSky = useMemo(() => new THREE.Color('#0a1628'), [])
  const skyColor = useMemo(() => new THREE.Color('#0a1628'), [])
  const ambientLightRef = useRef(null)
  const hemisphereLightRef = useRef(null)
  const directionalLightRef = useRef(null)
  const starsRef = useRef(null)
  const cloudRef = useRef(null)

  useFrame((state) => {
    skyColor.copy(nightSky).lerp(daySky, isDay ? 1 : 0)
    state.scene.background = skyColor
    if (state.scene.fog) {
      state.scene.fog.color.copy(skyColor)
    }

    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = isDay ? 0.7 : 0.3
      ambientLightRef.current.color.set(isDay ? '#ffffff' : '#6070a0')
    }
    if (hemisphereLightRef.current) {
      hemisphereLightRef.current.intensity = isDay ? 0.8 : 0.4
      hemisphereLightRef.current.color.set(isDay ? '#c4d4ff' : '#5060a0')
    }
    if (directionalLightRef.current) {
      directionalLightRef.current.intensity = isDay ? 1.2 : 0.2
      directionalLightRef.current.color.set(isDay ? '#ffeedd' : '#8899bb')
    }

    if (starsRef.current) {
      starsRef.current.visible = !isDay
    }
    if (cloudRef.current) {
      cloudRef.current.visible = isDay
    }
  })

  return (
    <>
      <color attach="background" args={['#08111b']} />
      <fog attach="fog" args={['#08111b', 20, 125]} />

      <Stars ref={starsRef} radius={80} depth={35} count={1600} factor={3} saturation={0.15} fade />

      <ambientLight ref={ambientLightRef} intensity={0.4} color="#b0bbd8" />
      <hemisphereLight
        ref={hemisphereLightRef}
        intensity={0.5}
        color="#c4d4ff"
        groundColor="#3a4a5a"
      />
      <directionalLight
        position={[8, 5, 10]}
        intensity={0.3}
        color="#8ec8ff"
      />

      <directionalLight
        ref={directionalLightRef}
        castShadow
        intensity={1.2}
        color="#ffe4c4"
        position={[-8, 12, -10]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0001}
        shadow-normalBias={0.02}
        shadow-radius={2}
      />

      <Environment preset="sunset" background={false} />

      {phase === 'day' && (
        <>
          <mesh position={[-25, 20, -70]}>
            <sphereGeometry args={[3, 32, 32]} />
            <meshBasicMaterial color="#ffee66" />
          </mesh>
          <pointLight color="#ffaa33" intensity={300} distance={100} decay={1} position={[-25, 20, -70]} />
        </>
      )}

      {phase === 'night' && (
        <>
          <mesh position={[30, 22, -65]}>
            <sphereGeometry args={[2, 32, 32]} />
            <meshBasicMaterial color="#ccddff" />
          </mesh>
          <pointLight color="#6688ff" intensity={150} distance={80} decay={1.5} position={[30, 22, -65]} />
        </>
      )}

      <Cloud ref={cloudRef} opacity={0.4} speed={0.2} width={40} depth={1.5} segments={20} position={[0, 15, -25]} />
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
      <ProceduralGround />

      <Suspense fallback={null}>
        <TownBackdrop />
        <StreetLamp phase={phase} />
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
