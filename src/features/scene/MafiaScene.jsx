import { memo, Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Cloud, Environment, OrbitControls, Stars, useFBX, useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import {
  dinoModelUrl,
  lampModelUrl,
  PLAYER_COUNT,
  PLAYER_RING_RADIUS,
  townModelUrl,
  treeModelUrl,
} from '../game/model/constants'
import { useGameStore } from '../game/model/gameStore'
import { Assassin } from './entities/Assassin'
import { DeathAnimation } from './entities/DeathAnimation'
import { Dino } from './entities/Dino'
import { PlayerActor } from './entities/PlayerActor'
import { ParkZone } from './environment/ParkZone'
import { StreetLamp } from './environment/StreetLamp'
import { TownBackdrop } from './environment/TownBackdrop'
import { TreeRing } from './environment/TreeRing'

const UP_AXIS = new THREE.Vector3(0, 1, 0)

function easeInOutCubic(t) {
  if (t < 0.5) {
    return 4 * t * t * t
  }
  return 1 - Math.pow(-2 * t + 2, 3) / 2
}

function ProceduralGround() {
  const textures = useTexture({
    map: '/textures/asphalt_pit_lane_1k/textures/asphalt_pit_lane_diff_1k.jpg',
    normalMap: '/textures/asphalt_pit_lane_1k/textures/asphalt_pit_lane_nor_gl_1k.jpg',
    roughnessMap: '/textures/asphalt_pit_lane_1k/textures/asphalt_pit_lane_arm_1k.jpg',
  })

  textures.map.wrapS = textures.map.wrapT = THREE.RepeatWrapping
  textures.normalMap.wrapS = textures.normalMap.wrapT = THREE.RepeatWrapping
  textures.roughnessMap.wrapS = textures.roughnessMap.wrapT = THREE.RepeatWrapping

  const repeat = 8
  textures.map.repeat.set(repeat, repeat)
  textures.normalMap.repeat.set(repeat, repeat)
  textures.roughnessMap.repeat.set(repeat, repeat)

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
      <circleGeometry args={[45, 64]} />
      <meshStandardMaterial
        map={textures.map}
        normalMap={textures.normalMap}
        roughnessMap={textures.roughnessMap}
        normalScale={new THREE.Vector2(0.8, 0.8)}
        roughness={0.9}
      />
    </mesh>
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

function SceneAtmosphere() {
  const phaseRef = useRef(useGameStore.getState().phase)
  const dayBlendRef = useRef(phaseRef.current === 'day' ? 1 : 0)

  const daySky = useMemo(() => new THREE.Color('#87ceeb'), [])
  const nightSky = useMemo(() => new THREE.Color('#0a1628'), [])
  const skyColor = useMemo(() => new THREE.Color('#0a1628'), [])
  const dayAmbient = useMemo(() => new THREE.Color('#ffffff'), [])
  const nightAmbient = useMemo(() => new THREE.Color('#6070a0'), [])
  const dayHemi = useMemo(() => new THREE.Color('#c4d4ff'), [])
  const nightHemi = useMemo(() => new THREE.Color('#5060a0'), [])
  const daySun = useMemo(() => new THREE.Color('#ffeedd'), [])
  const nightSun = useMemo(() => new THREE.Color('#8899bb'), [])

  const tmpAmbient = useRef(new THREE.Color())
  const tmpHemi = useRef(new THREE.Color())
  const tmpSun = useRef(new THREE.Color())

  const ambientLightRef = useRef(null)
  const hemisphereLightRef = useRef(null)
  const directionalLightRef = useRef(null)
  const starsRef = useRef(null)
  const cloudRef = useRef(null)

  useFrame((state, delta) => {
    phaseRef.current = useGameStore.getState().phase
    const targetDayBlend = phaseRef.current === 'day' ? 1 : 0
    dayBlendRef.current = THREE.MathUtils.damp(dayBlendRef.current, targetDayBlend, 3.2, delta)
    const dayBlend = dayBlendRef.current

    skyColor.copy(nightSky).lerp(daySky, dayBlend)
    state.scene.background = skyColor
    if (state.scene.fog) {
      state.scene.fog.color.copy(skyColor)
    }

    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = THREE.MathUtils.lerp(0.3, 0.7, dayBlend)
      ambientLightRef.current.color.copy(tmpAmbient.current.copy(nightAmbient).lerp(dayAmbient, dayBlend))
    }

    if (hemisphereLightRef.current) {
      hemisphereLightRef.current.intensity = THREE.MathUtils.lerp(0.4, 0.8, dayBlend)
      hemisphereLightRef.current.color.copy(tmpHemi.current.copy(nightHemi).lerp(dayHemi, dayBlend))
    }

    if (directionalLightRef.current) {
      directionalLightRef.current.intensity = THREE.MathUtils.lerp(0.2, 1.2, dayBlend)
      directionalLightRef.current.color.copy(tmpSun.current.copy(nightSun).lerp(daySun, dayBlend))
    }

    if (starsRef.current) {
      starsRef.current.visible = dayBlend < 0.92
    }

    if (cloudRef.current) {
      cloudRef.current.visible = dayBlend > 0.08
    }
  })

  return (
    <>
      <color attach="background" args={['#08111b']} />
      <fog attach="fog" args={['#08111b', 20, 125]} />

      <Stars ref={starsRef} radius={80} depth={35} count={1600} factor={3} saturation={0.15} fade />

      <ambientLight ref={ambientLightRef} intensity={0.4} color="#b0bbd8" />
      <hemisphereLight ref={hemisphereLightRef} intensity={0.5} color="#c4d4ff" groundColor="#3a4a5a" />
      <directionalLight position={[8, 5, 10]} intensity={0.3} color="#8ec8ff" />

      <directionalLight
        ref={directionalLightRef}
        castShadow
        intensity={1.2}
        color="#ffe4c4"
        position={[-8, 12, -10]}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
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

      <SunMoonCelestials dayBlendRef={dayBlendRef} />

      <Cloud ref={cloudRef} opacity={0.4} speed={0.2} width={40} depth={1.5} segments={20} position={[0, 15, -25]} />
    </>
  )
}

function SpeechCameraDirector({ playerSlots, controlsRef }) {
  const { camera } = useThree()
  const snapshotRef = useRef(null)
  const transitionRef = useRef(null)
  const activeFocusIdRef = useRef(null)
  const handledEventIdRef = useRef(-1)
  const speechFocusPlayerIdRef = useRef(null)
  const speechFocusEventIdRef = useRef(0)

  const headRef = useRef(new THREE.Vector3())
  const forwardRef = useRef(new THREE.Vector3())
  const desiredPositionRef = useRef(new THREE.Vector3())
  const desiredTargetRef = useRef(new THREE.Vector3())

  const resolveFocusPose = (focusPlayerId, outPosition, outTarget) => {
    const safeFocusId = Number(focusPlayerId)
    if (!Number.isInteger(safeFocusId)) {
      return null
    }

    const slot = playerSlots.get(safeFocusId)
    if (!slot) {
      return null
    }

    const { position, facing } = slot
    const base = headRef.current.set(position[0], 0, position[2])
    const forward = forwardRef.current.set(0, 0, 1).applyAxisAngle(UP_AXIS, facing).normalize()

    outPosition.copy(base).addScaledVector(forward, 1).addScaledVector(UP_AXIS, 1.8)
    outTarget.copy(base).addScaledVector(UP_AXIS, 2)

    return {
      fov: 18,
      focusId: safeFocusId,
    }
  }

  const beginTransition = (controls, destination, durationSec) => {
    transitionRef.current = {
      elapsed: 0,
      duration: durationSec,
      startPosition: camera.position.clone(),
      startTarget: controls.target.clone(),
      startFov: camera.fov,
      endPosition: destination.position.clone(),
      endTarget: destination.target.clone(),
      endFov: destination.fov,
    }
  }

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls) {
      return
    }

    const state = useGameStore.getState()
    speechFocusPlayerIdRef.current = state.speechFocusPlayerId
    speechFocusEventIdRef.current = state.speechFocusEventId
    const speechFocusPlayerId = speechFocusPlayerIdRef.current
    const speechFocusEventId = speechFocusEventIdRef.current

    if (speechFocusEventId !== handledEventIdRef.current) {
      handledEventIdRef.current = speechFocusEventId

      const hasFocus = speechFocusPlayerId !== null && speechFocusPlayerId !== undefined

      if (hasFocus) {
        if (!snapshotRef.current) {
          snapshotRef.current = {
            position: camera.position.clone(),
            target: controls.target.clone(),
            fov: camera.fov,
          }
        }

        const focusPose = resolveFocusPose(speechFocusPlayerId, desiredPositionRef.current, desiredTargetRef.current)
        if (focusPose) {
          activeFocusIdRef.current = focusPose.focusId
          beginTransition(
            controls,
            {
              position: desiredPositionRef.current,
              target: desiredTargetRef.current,
              fov: focusPose.fov,
            },
            1.6,
          )
        }
      } else {
        activeFocusIdRef.current = null
        if (snapshotRef.current) {
          beginTransition(controls, snapshotRef.current, 1.25)
          snapshotRef.current = null
        }
      }
    }

    const transition = transitionRef.current
    if (transition) {
      transition.elapsed += delta
      const linearT = Math.min(transition.elapsed / transition.duration, 1)
      const t = easeInOutCubic(linearT)

      camera.position.lerpVectors(transition.startPosition, transition.endPosition, t)
      controls.target.lerpVectors(transition.startTarget, transition.endTarget, t)
      const nextFov = THREE.MathUtils.lerp(transition.startFov, transition.endFov, t)
      const fovChanged = Math.abs(nextFov - camera.fov) > 0.001
      camera.fov = nextFov

      controls.enabled = false
      if (fovChanged) {
        camera.updateProjectionMatrix()
      }
      controls.update()

      if (linearT >= 1) {
        transitionRef.current = null
      }
      return
    }

    if (activeFocusIdRef.current !== null) {
      const focusPose = resolveFocusPose(activeFocusIdRef.current, desiredPositionRef.current, desiredTargetRef.current)
      if (!focusPose) {
        return
      }

      const stickiness = 1 - Math.exp(-delta * 7)
      camera.position.lerp(desiredPositionRef.current, stickiness)
      controls.target.lerp(desiredTargetRef.current, stickiness)

      const nextFov = THREE.MathUtils.lerp(camera.fov, focusPose.fov, stickiness)
      const fovChanged = Math.abs(nextFov - camera.fov) > 0.001
      camera.fov = nextFov

      controls.enabled = false
      if (fovChanged) {
        camera.updateProjectionMatrix()
      }
      controls.update()
      return
    }

    controls.enabled = true
    controls.update()
  })

  return null
}



function MafiaSceneInner({
  assassinationRef,
  showWebcams = true,
}) {
  const controlsRef = useRef(null)
  const deathEventRef = useRef({ eventId: 0, targetId: null })
  const pendingNightKillRef = useRef(null)

  useEffect(() => {
    const store = useGameStore

    const unsubscribe = store.subscribe((state, prevState) => {
      const nextLog = Array.isArray(state.log) ? state.log : []
      const prevLog = Array.isArray(prevState?.log) ? prevState.log : []

      if (nextLog.length <= prevLog.length) {
        return
      }

      for (let index = prevLog.length; index < nextLog.length; index += 1) {
        const line = String(nextLog[index] || '')

        const selectedMatch = line.match(/Ночью мафия выбрала Игрока\s+(\d+)\./)
        if (selectedMatch) {
          pendingNightKillRef.current = Number(selectedMatch[1]) - 1
          continue
        }

        if (line.includes('выбыл после ночного выстрела') && Number.isInteger(pendingNightKillRef.current)) {
          const targetId = pendingNightKillRef.current
          pendingNightKillRef.current = null
          deathEventRef.current = {
            eventId: deathEventRef.current.eventId + 1,
            targetId,
          }
        }
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const positions = useMemo(() => {
    return Array.from({ length: PLAYER_COUNT }, (_, index) => {
      const angle = (index / PLAYER_COUNT) * Math.PI * 2
      return [Math.cos(angle) * PLAYER_RING_RADIUS, 0, Math.sin(angle) * PLAYER_RING_RADIUS]
    })
  }, [])

  const playerSlots = useMemo(() => {
    const slots = new Map()
    for (let index = 0; index < PLAYER_COUNT; index++) {
      const position = positions[index]
      const [x, , z] = position
      slots.set(index, {
        position,
        facing: Math.atan2(-x, -z),
      })
    }
    return slots
  }, [positions])


  return (
    <>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        shadows="basic"
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 11, 34], fov: 42 }}
      >
        <SceneAtmosphere />
        <SpeechCameraDirector
          playerSlots={playerSlots}
          controlsRef={controlsRef}
        />
        <ProceduralGround />

        <Suspense fallback={null}>
          <ParkZone />
          <TownBackdrop />
          <StreetLamp />
          <TreeRing />
          <Dino position={[5, 0, -25]} />
        </Suspense>

        {positions.map((pos, index) => (
          <PlayerActor
            key={index}
            playerId={index}
            position={pos}
            showWebcams={showWebcams}
            webcamVisible
          />
        ))}

        <Assassin assassinationRef={assassinationRef} positions={positions} />
        <DeathAnimation
          deathEventRef={deathEventRef}
          positions={positions}
        />

        <OrbitControls
          ref={controlsRef}
          target={[0, 1.8, 0]}
          minDistance={18}
          maxDistance={75}
          minPolarAngle={0.35}
          maxPolarAngle={1.34}
        />
      </Canvas>

    </>
  )
}

export const MafiaScene = memo(MafiaSceneInner)

useFBX.preload('/models/maf/anim.fbx')
useFBX.preload('/models/maf/dying.fbx')
useGLTF.preload(townModelUrl)
useGLTF.preload(lampModelUrl)
useGLTF.preload(treeModelUrl)
useGLTF.preload(dinoModelUrl)
