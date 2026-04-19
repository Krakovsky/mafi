import { memo, Suspense, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import {
  Cloud,
  Environment,
  Html,
  OrbitControls,
  Stars,
  useFBX,
  useGLTF,
  useTexture,
} from '@react-three/drei'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import * as THREE from 'three'
import {
  lampModelUrl,
  PLAYER_COUNT,
  PLAYER_RING_RADIUS,
  townModelUrl,
  treeModelUrl,
} from '../game/model/constants'
import { useGameStore } from '../game/model/gameStore'
import { ALL_ANIM_URLS } from '../game/model/animRegistry'
import { useAnimStore } from '../game/model/animStore'
import { AnimationLibrary } from './entities/AnimationLibrary'
import { Assassin } from './entities/Assassin'
import { DeathAnimation } from './entities/DeathAnimation'
import { Dino } from './entities/Dino'
import { IdleRotationManager } from './entities/IdleRotationManager'
import { PlayerActor } from './entities/PlayerActor'
import { ParkZone } from './environment/ParkZone'
import { StreetLamp } from './environment/StreetLamp'
import { TownBackdrop } from './environment/TownBackdrop'
import { TreeRing } from './environment/TreeRing'
import { PostProcessingEffects } from './PostProcessingEffects'
import { DayNightTransition } from './DayNightTransition'
import { CameraTransitionController } from './CameraTransitionController'

const UP_AXIS = new THREE.Vector3(0, 1, 0)

function easeInOutCubic(t) {
  if (t < 0.5) {
    return 4 * t * t * t
  }
  return 1 - Math.pow(-2 * t + 2, 3) / 2
}

function SceneLoadedStarter({ isAdmin }) {
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    if (isAdmin) {
      useAnimStore.getState().startAnimations()
    }
  }, [isAdmin])

  return null
}

function Loader() {
  return (
    <Html center>
      <div
        style={{
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: '14px',
          textAlign: 'center',
          background: 'rgba(0,0,0,0.6)',
          padding: '20px 30px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.2)',
        }}
      >
        <div style={{ marginBottom: 8, opacity: 0.8 }}>Загрузка...</div>
        <div
          style={{
            width: '150px',
            height: '4px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div style={{ width: '0%', height: '100%', background: '#4ade80' }} />
        </div>
      </div>
    </Html>
  )
}

function PanoramicBackground({ dayBlendRef }) {
  const meshRef = useRef(null)
  const [texture, setTexture] = useState(null)

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    loader.load(
      '/background_image.jpg',
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        setTexture(tex)
      },
      undefined,
      () => setTexture(null)
    )
  }, [])

  useFrame(() => {
    const dayBlend = dayBlendRef.current
    if (meshRef.current) {
      meshRef.current.material.opacity = THREE.MathUtils.lerp(0.3, 0.5, dayBlend)
    }
  })

  if (!texture) {
    return (
      <mesh ref={meshRef} rotation={[0, Math.PI, 0]} renderOrder={-1000}>
        <sphereGeometry args={[350, 64, 64]} />
        <shaderMaterial
          side={THREE.BackSide}
          transparent
          opacity={0.6}
          fog={false}
          depthWrite={false}
          depthTest={true}
          uniforms={{
            dayBlend: { value: 0 },
            dayTop: { value: new THREE.Color('#4a6b8a') },
            dayBottom: { value: new THREE.Color('#6a8a9a') },
            nightTop: { value: new THREE.Color('#0a0f1a') },
            nightBottom: { value: new THREE.Color('#1a1f2e') },
          }}
          vertexShader={`
            varying vec3 vWorldPosition;
            void main() {
              vec4 wp = modelMatrix * vec4(position, 1.0);
              vWorldPosition = wp.xyz;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform float dayBlend;
            uniform vec3 dayTop, dayBottom, nightTop, nightBottom;
            varying vec3 vWorldPosition;
            void main() {
              float h = normalize(vWorldPosition).y;
              vec3 dc = mix(dayBottom, dayTop, max(h, 0.0) * 0.7);
              vec3 nc = mix(nightBottom, nightTop, max(h, 0.0) * 0.7);
              gl_FragColor = vec4(mix(nc, dc, dayBlend) * 0.7, 1.0);
            }
          `}
        />
      </mesh>
    )
  }

  return (
    <mesh ref={meshRef} rotation={[0, Math.PI, 0]} renderOrder={-1000}>
      <sphereGeometry args={[400, 64, 64]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        transparent
        opacity={0.5}
        fog={false}
        depthWrite={false}
        depthTest={true}
        toneMapped={false}
      />
    </mesh>
  )
}

function AtmosphericGlow({ dayBlendRef }) {
  const glowRef = useRef(null)

  useFrame((state) => {
    const dayBlend = dayBlendRef.current
    if (glowRef.current) {
      const baseOpacity = THREE.MathUtils.lerp(0.05, 0.15, dayBlend)
      glowRef.current.material.opacity =
        baseOpacity * (0.5 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1)
    }
  })

  return (
    <mesh ref={glowRef} renderOrder={-999}>
      <sphereGeometry args={[401, 32, 32]} />
      <shaderMaterial
        side={THREE.BackSide}
        transparent
        opacity={0.1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        depthTest={true}
        uniforms={{
          dayBlend: { value: 0 },
          glowColor: { value: new THREE.Color('#ff8844') },
          nightGlowColor: { value: new THREE.Color('#3355aa') },
        }}
        vertexShader={`
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float dayBlend;
          uniform vec3 glowColor, nightGlowColor;
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.65 - dot(vNormal, vec3(0,0,1.0)), 3.0);
            vec3 finalGlow = mix(nightGlowColor, glowColor, dayBlend);
            gl_FragColor = vec4(finalGlow * intensity * 0.5, 1.0);
          }
        `}
      />
    </mesh>
  )
}

function DistantCity() {
  const buildingCount = 80

  const buildings = useMemo(() => {
    return Array.from({ length: buildingCount }, (_, i) => {
      const startAngle = -Math.PI / 3
      const endAngle = Math.PI / 3
      const angle = startAngle + (i / buildingCount) * (endAngle - startAngle)
      const radius = 200 + Math.random() * 80
      const height = 15 + Math.random() * 50
      const width = 4 + Math.random() * 10
      const depth = 4 + Math.random() * 8

      return {
        position: [
          Math.cos(angle) * radius,
          height / 2,
          Math.sin(angle) * radius,
        ],
        scale: [width, height, depth],
        rotation: [0, -angle + Math.PI / 2, 0],
      }
    })
  }, [])

  return (
    <group renderOrder={-100}>
      {buildings.map((b, i) => (
        <mesh key={i} {...b}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color="#0f1419"
            transparent
            opacity={0.6}
            fog={true}
            depthWrite={false}
          />
        </mesh>
      ))}
      {buildings.filter((_, i) => i % 4 === 0).map((b, i) => (
        <pointLight
          key={`l-${i}`}
          position={[b.position[0], b.position[1] * 0.6, b.position[2]]}
          intensity={0.2}
          color="#ffaa44"
          distance={25}
          decay={2}
        />
      ))}
    </group>
  )
}

function FloatingParticles() {
  const particlesRef = useRef(null)
  const speedsRef = useRef(null)
  const count = 200

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const spd = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 50 + Math.random() * 100
      pos[i * 3] = Math.cos(angle) * radius
      pos[i * 3 + 1] = 2 + Math.random() * 20
      pos[i * 3 + 2] = Math.sin(angle) * radius
      spd[i] = 0.2 + Math.random() * 0.5
    }

    speedsRef.current = spd
    return pos
  }, [])

  useFrame((state) => {
    if (particlesRef.current && speedsRef.current) {
      const arr = particlesRef.current.geometry.attributes.position.array
      for (let i = 0; i < count; i++) {
        arr[i * 3 + 1] +=
          Math.sin(state.clock.elapsedTime * speedsRef.current[i] + i) * 0.02
        if (arr[i * 3 + 1] > 25) arr[i * 3 + 1] = 2
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.02
    }
  })

  return (
    <points ref={particlesRef} renderOrder={500}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.4}
        color="#ffcc44"
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

function MagicOrbs() {
  const orbsRef = useRef([])

  const orbs = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const startAngle = -Math.PI / 3
        const endAngle = Math.PI / 3
        const angle = startAngle + (i / 6) * (endAngle - startAngle)
        const radius = 70 + Math.random() * 50

        return {
          position: [
            Math.cos(angle) * radius,
            3 + Math.random() * 10,
            Math.sin(angle) * radius,
          ],
          scale: 1 + Math.random() * 2,
          color: i % 2 === 0 ? '#ff6644' : '#4488ff',
          speed: 0.3 + Math.random() * 0.4,
          offset: Math.random() * 100,
        }
      }),
    []
  )

  useFrame((state) => {
    orbsRef.current.forEach((orb, i) => {
      if (orb) {
        const d = orbs[i]
        orb.position.y =
          d.position[1] + Math.sin(state.clock.elapsedTime * d.speed + d.offset) * 2
        const s = 1 + Math.sin(state.clock.elapsedTime * 0.5 + d.offset) * 0.3
        orb.scale.set(s, s, s)
      }
    })
  })

  return (
    <group>
      {orbs.map((o, i) => (
        <mesh
          key={i}
          ref={(el) => (orbsRef.current[i] = el)}
          position={o.position}
          renderOrder={600}
        >
          <sphereGeometry args={[o.scale, 16, 16]} />
          <meshBasicMaterial
            color={o.color}
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

function ProceduralGround() {
  const textures = useTexture({
    map: '/textures/asphalt_pit_lane_1k/textures/asphalt_pit_lane_diff_1k.jpg',
    normalMap:
      '/textures/asphalt_pit_lane_1k/textures/asphalt_pit_lane_nor_gl_1k.jpg',
    roughnessMap:
      '/textures/asphalt_pit_lane_1k/textures/asphalt_pit_lane_arm_1k.jpg',
  })

  textures.map.wrapS = textures.map.wrapT = THREE.RepeatWrapping
  textures.normalMap.wrapS = textures.normalMap.wrapT = THREE.RepeatWrapping
  textures.roughnessMap.wrapS =
    textures.roughnessMap.wrapT = THREE.RepeatWrapping

  const repeat = 20
  textures.map.repeat.set(repeat, repeat)
  textures.normalMap.repeat.set(repeat, repeat)
  textures.roughnessMap.repeat.set(repeat, repeat)

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      position={[0, -0.01, 0]}
    >
      <circleGeometry args={[100, 128]} />
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
      sunMeshRef.current.material.opacity = dayBlend * 0.7
    }
    if (sunLightRef.current) {
      sunLightRef.current.intensity = dayBlend * 200
    }
    if (moonMeshRef.current) {
      moonMeshRef.current.visible = dayBlend < 0.95
      moonMeshRef.current.material.opacity = (1 - dayBlend) * 0.7
    }
    if (moonLightRef.current) {
      moonLightRef.current.intensity = (1 - dayBlend) * 80
    }
  })

  return (
    <>
      <mesh ref={sunMeshRef} position={[-25, 20, -70]}>
        <sphereGeometry args={[3, 32, 32]} />
        <meshBasicMaterial color="#ffee66" transparent opacity={0.7} />
      </mesh>
      <pointLight
        ref={sunLightRef}
        color="#ffaa33"
        intensity={0}
        distance={100}
        decay={1}
        position={[-25, 20, -70]}
      />

      <mesh ref={moonMeshRef} position={[30, 22, -65]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#ccddff" transparent opacity={0.7} />
      </mesh>
      <pointLight
        ref={moonLightRef}
        color="#6688ff"
        intensity={0}
        distance={80}
        decay={1.5}
        position={[30, 22, -65]}
      />
    </>
  )
}

function SceneAtmosphere({ dayBlendRef }) {
  const phaseRef = useRef(useGameStore.getState().phase)

  const daySky = useMemo(() => new THREE.Color('#4a6b8a'), [])
  const nightSky = useMemo(() => new THREE.Color('#0a0f1a'), [])
  const skyColor = useMemo(() => new THREE.Color('#0a0f1a'), [])
  const dayAmbient = useMemo(() => new THREE.Color('#aaaaaa'), [])
  const nightAmbient = useMemo(() => new THREE.Color('#405070'), [])
  const dayHemi = useMemo(() => new THREE.Color('#a4b4d4'), [])
  const nightHemi = useMemo(() => new THREE.Color('#405080'), [])
  const daySun = useMemo(() => new THREE.Color('#ddccbb'), [])
  const nightSun = useMemo(() => new THREE.Color('#667799'), [])

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
    dayBlendRef.current = THREE.MathUtils.damp(
      dayBlendRef.current,
      targetDayBlend,
      3.2,
      delta
    )
    const dayBlend = dayBlendRef.current

    skyColor.copy(nightSky).lerp(daySky, dayBlend)
    state.scene.background = skyColor
    if (state.scene.fog) {
      state.scene.fog.color.copy(skyColor)
    }

    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = THREE.MathUtils.lerp(0.2, 0.5, dayBlend)
      ambientLightRef.current.color.copy(
        tmpAmbient.current.copy(nightAmbient).lerp(dayAmbient, dayBlend)
      )
    }

    if (hemisphereLightRef.current) {
      hemisphereLightRef.current.intensity = THREE.MathUtils.lerp(0.3, 0.6, dayBlend)
      hemisphereLightRef.current.color.copy(
        tmpHemi.current.copy(nightHemi).lerp(dayHemi, dayBlend)
      )
    }

    if (directionalLightRef.current) {
      directionalLightRef.current.intensity = THREE.MathUtils.lerp(0.15, 0.9, dayBlend)
      directionalLightRef.current.color.copy(
        tmpSun.current.copy(nightSun).lerp(daySun, dayBlend)
      )
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
      <fog attach="fog" args={['#08111b', 60, 250]} />

      <Stars
        ref={starsRef}
        radius={100}
        depth={50}
        count={3000}
        factor={4}
        saturation={0.3}
        fade
        speed={0.5}
      />

      <ambientLight ref={ambientLightRef} intensity={0.3} color="#909bb8" />
      <hemisphereLight
        ref={hemisphereLightRef}
        intensity={0.5}
        color="#a4b4d4"
        groundColor="#2a3a4a"
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
        shadow-camera-far={100}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0001}
        shadow-normalBias={0.02}
        shadow-radius={4}
      />

      <pointLight
        position={[15, 8, 15]}
        intensity={0.3}
        color="#ffcc88"
        distance={40}
        decay={2}
      />
      <pointLight
        position={[-15, 8, 15]}
        intensity={0.3}
        color="#ffcc88"
        distance={40}
        decay={2}
      />

      <PanoramicBackground dayBlendRef={dayBlendRef} />
      <AtmosphericGlow dayBlendRef={dayBlendRef} />
      <DistantCity />
      <FloatingParticles />
      <MagicOrbs />

      <SunMoonCelestials dayBlendRef={dayBlendRef} />
      <Cloud
        ref={cloudRef}
        opacity={0.3}
        speed={0.2}
        width={40}
        depth={1.5}
        segments={20}
        position={[0, 15, -25]}
      />
      <mesh
        ref={groundMistRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.1, 0]}
        visible={false}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial
          color="#1a2a4a"
          transparent
          opacity={0.2}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  )
}

function DeferredDeathTrigger({ dayBlendRef, queuedDeathTargetRef, deathEventRef }) {
  useFrame(() => {
    const targetId = queuedDeathTargetRef.current
    if (!Number.isInteger(targetId)) return

    const phase = useGameStore.getState().phase
    if (phase === 'night') return
    if (dayBlendRef.current < 0.995) return

    queuedDeathTargetRef.current = null
    deathEventRef.current = {
      eventId: deathEventRef.current.eventId + 1,
      targetId,
    }
  })
  return null
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
    if (!Number.isInteger(safeFocusId)) return null

    const slot = playerSlots.get(safeFocusId)
    if (!slot) return null

    const { position, facing } = slot
    const base = headRef.current.set(position[0], 0, position[2])
    const forward = forwardRef.current
      .set(0, 0, 1)
      .applyAxisAngle(UP_AXIS, facing)
      .normalize()

    outPosition.copy(base).addScaledVector(forward, 1).addScaledVector(UP_AXIS, 1.8)
    outTarget.copy(base).addScaledVector(UP_AXIS, 2)

    return { fov: 18, focusId: safeFocusId }
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
    if (!controls) return

    const state = useGameStore.getState()
    if (state.roleRevealActive) {
      transitionRef.current = null
      activeFocusIdRef.current = null
      snapshotRef.current = null
      return
    }

    speechFocusPlayerIdRef.current = state.speechFocusPlayerId
    speechFocusEventIdRef.current = state.speechFocusEventId
    const speechFocusPlayerId = speechFocusPlayerIdRef.current
    const speechFocusEventId = speechFocusEventIdRef.current

    if (speechFocusEventId !== handledEventIdRef.current) {
      handledEventIdRef.current = speechFocusEventId

      const hasFocus =
        speechFocusPlayerId !== null && speechFocusPlayerId !== undefined

      if (hasFocus) {
        if (!snapshotRef.current) {
          snapshotRef.current = {
            position: camera.position.clone(),
            target: controls.target.clone(),
            fov: camera.fov,
          }
        }

        const focusPose = resolveFocusPose(
          speechFocusPlayerId,
          desiredPositionRef.current,
          desiredTargetRef.current
        )
        if (focusPose) {
          activeFocusIdRef.current = focusPose.focusId
          beginTransition(
            controls,
            {
              position: desiredPositionRef.current,
              target: desiredTargetRef.current,
              fov: focusPose.fov,
            },
            1.6
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

      camera.position.lerpVectors(
        transition.startPosition,
        transition.endPosition,
        t
      )
      controls.target.lerpVectors(
        transition.startTarget,
        transition.endTarget,
        t
      )
      const nextFov = THREE.MathUtils.lerp(
        transition.startFov,
        transition.endFov,
        t
      )
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
      const focusPose = resolveFocusPose(
        activeFocusIdRef.current,
        desiredPositionRef.current,
        desiredTargetRef.current
      )
      if (!focusPose) return

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

function RoleRevealCameraDirector({ playerSlots, controlsRef }) {
  const { camera } = useThree()
  const snapshotRef = useRef(null)
  const transitionRef = useRef(null)
  const activeFocusIdRef = useRef(null)
  const prevRevealActiveRef = useRef(false)
  const prevRevealIndexRef = useRef(0)
  const originalDistanceLimitsRef = useRef(null)

  const headRef = useRef(new THREE.Vector3())
  const forwardRef = useRef(new THREE.Vector3())
  const desiredPositionRef = useRef(new THREE.Vector3())
  const desiredTargetRef = useRef(new THREE.Vector3())

  const resolveRevealPose = (playerIndex, outPosition, outTarget) => {
    const slot = playerSlots.get(playerIndex)
    if (!slot) return null

    const { position, facing } = slot
    const base = headRef.current.set(position[0], 0, position[2])
    const forward = forwardRef.current
      .set(0, 0, 1)
      .applyAxisAngle(UP_AXIS, facing)
      .normalize()

    outPosition
      .copy(base)
      .addScaledVector(forward, 4)
      .addScaledVector(UP_AXIS, 2.7)
    outTarget.copy(base).addScaledVector(UP_AXIS, 2.7)

    return { fov: 36, focusId: playerIndex }
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

  const restoreControlsMode = (controls) => {
    controls.enabled = true
    if (originalDistanceLimitsRef.current) {
      controls.minDistance = originalDistanceLimitsRef.current.minDistance
      controls.maxDistance = originalDistanceLimitsRef.current.maxDistance
      controls.minPolarAngle =
        originalDistanceLimitsRef.current.minPolarAngle
      controls.maxPolarAngle =
        originalDistanceLimitsRef.current.maxPolarAngle
    }
  }

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls) return

    if (!originalDistanceLimitsRef.current) {
      originalDistanceLimitsRef.current = {
        minDistance: controls.minDistance,
        maxDistance: controls.maxDistance,
        minPolarAngle: controls.minPolarAngle,
        maxPolarAngle: controls.maxPolarAngle,
      }
    }

    const state = useGameStore.getState()
    const { roleRevealActive, roleRevealIndex } = state
    const startedReveal = roleRevealActive && !prevRevealActiveRef.current
    const endedReveal = !roleRevealActive && prevRevealActiveRef.current
    const changedIndex =
      roleRevealActive && prevRevealIndexRef.current !== roleRevealIndex

    if (startedReveal || changedIndex) {
      if (!snapshotRef.current) {
        snapshotRef.current = {
          position: camera.position.clone(),
          target: controls.target.clone(),
          fov: camera.fov,
        }
      }

      const pose = resolveRevealPose(
        roleRevealIndex,
        desiredPositionRef.current,
        desiredTargetRef.current
      )
      if (pose) {
        activeFocusIdRef.current = pose.focusId
        beginTransition(
          controls,
          {
            position: desiredPositionRef.current,
            target: desiredTargetRef.current,
            fov: pose.fov,
          },
          changedIndex ? 1.35 : 1.2
        )
      }
    }

    if (endedReveal) {
      activeFocusIdRef.current = null
      if (snapshotRef.current) {
        beginTransition(controls, snapshotRef.current, 1.35)
        snapshotRef.current = null
      }
    }

    prevRevealActiveRef.current = roleRevealActive
    prevRevealIndexRef.current = roleRevealIndex

    const transition = transitionRef.current
    if (transition) {
      transition.elapsed += delta
      const linearT = Math.min(transition.elapsed / transition.duration, 1)
      const t = easeInOutCubic(linearT)

      const lerpedTarget = desiredTargetRef.current.lerpVectors(
        transition.startTarget,
        transition.endTarget,
        t
      )
      camera.position.lerpVectors(
        transition.startPosition,
        transition.endPosition,
        t
      )
      const nextFov = THREE.MathUtils.lerp(
        transition.startFov,
        transition.endFov,
        t
      )
      if (Math.abs(nextFov - camera.fov) > 0.001) {
        camera.fov = nextFov
        camera.updateProjectionMatrix()
      }
      camera.lookAt(lerpedTarget)
      controls.target.copy(lerpedTarget)
      controls.enabled = false

      if (linearT >= 1) transitionRef.current = null
      return
    }

    if (activeFocusIdRef.current !== null) {
      const pose = resolveRevealPose(
        activeFocusIdRef.current,
        desiredPositionRef.current,
        desiredTargetRef.current
      )
      if (!pose) return

      camera.position.copy(desiredPositionRef.current)
      camera.lookAt(desiredTargetRef.current)
      controls.target.copy(desiredTargetRef.current)
      if (Math.abs(pose.fov - camera.fov) > 0.001) {
        camera.fov = pose.fov
        camera.updateProjectionMatrix()
      }
      controls.enabled = false
      return
    }

    restoreControlsMode(controls)
  })

  return null
}

function MafiaSceneInner({ assassinationRef, showWebcams = true, isAdmin = false }) {
  const controlsRef = useRef(null)
  const deathEventRef = useRef({ eventId: 0, targetId: null })
  const pendingNightKillRef = useRef(null)
  const queuedDeathTargetRef = useRef(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const dayBlendRef = useRef(useGameStore.getState().phase === 'night' ? 0 : 1)

  useEffect(() => {
    const store = useGameStore
    const unsubscribe = store.subscribe((state, prevState) => {
      const nextLog = Array.isArray(state.log) ? state.log : []
      const prevLog = Array.isArray(prevState?.log) ? prevState.log : []

      if (nextLog.length <= prevLog.length) return

      for (let index = prevLog.length; index < nextLog.length; index += 1) {
        const line = String(nextLog[index] || '')

        const selectedMatch = line.match(/Ночью мафия выбрала Игрока\s+(\d+)\./)
        if (selectedMatch) {
          pendingNightKillRef.current = Number(selectedMatch[1]) - 1
          continue
        }

        if (
          line.includes('выбыл после ночного выстрела') &&
          Number.isInteger(pendingNightKillRef.current)
        ) {
          const targetId = pendingNightKillRef.current
          pendingNightKillRef.current = null
          queuedDeathTargetRef.current = targetId
        }
      }
    })
    return () => unsubscribe()
  }, [])

  const positions = useMemo(() => {
    return Array.from({ length: PLAYER_COUNT }, (_, index) => {
      const angle = (index / PLAYER_COUNT) * Math.PI * 2
      return [
        Math.cos(angle) * PLAYER_RING_RADIUS,
        0,
        Math.sin(angle) * PLAYER_RING_RADIUS,
      ]
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

  const handleTransitionStart = useCallback(() => setIsTransitioning(true), [])
  const handleTransitionEnd = useCallback(() => setIsTransitioning(false), [])

  return (
    <>
      <DayNightTransition
        onTransitionStart={handleTransitionStart}
        onTransitionEnd={handleTransitionEnd}
      />

      <Canvas
        style={{ width: '100%', height: '100%' }}
        shadows="basic"
        dpr={[1, 1.25]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        camera={{ position: [0, 11, 34], fov: 42 }}
      >
        <CameraTransitionController isTransitioning={isTransitioning} />

        <SceneAtmosphere dayBlendRef={dayBlendRef} />
        <PostProcessingEffects />
        <DeferredDeathTrigger
          dayBlendRef={dayBlendRef}
          queuedDeathTargetRef={queuedDeathTargetRef}
          deathEventRef={deathEventRef}
        />
        <SpeechCameraDirector
          playerSlots={playerSlots}
          controlsRef={controlsRef}
        />
        <RoleRevealCameraDirector
          playerSlots={playerSlots}
          controlsRef={controlsRef}
        />
        <ProceduralGround />

        <Suspense fallback={<Loader />}>
          <SceneLoadedStarter isAdmin={isAdmin} />
          <AnimationLibrary />
          <ParkZone />
          <TownBackdrop />
          <StreetLamp />
          <TreeRing />
        </Suspense>

        <IdleRotationManager />

        {positions.map((pos, index) => (
          <PlayerActor
            key={index}
            playerId={index}
            position={pos}
            showWebcams={showWebcams}
          />
        ))}

        <Assassin
          assassinationRef={assassinationRef}
          positions={positions}
        />
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

ALL_ANIM_URLS.forEach((url) => {
  useFBX.preload(url)
  useLoader.preload(FBXLoader, url)
})
useGLTF.preload(townModelUrl)
useGLTF.preload(lampModelUrl)
useGLTF.preload(treeModelUrl)