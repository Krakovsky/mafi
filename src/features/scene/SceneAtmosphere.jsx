import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Cloud, Environment, Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../game/model/gameStore'

function PanoramicBackground({ dayBlendRef }) {
  const meshRef = useRef(null)
  const [texture, setTexture] = useState(null)
  
  useEffect(() => {
    const loader = new THREE.TextureLoader()
    loader.load('/background_image.jpg', 
      (tex) => { tex.colorSpace = THREE.SRGBColorSpace; setTexture(tex) },
      undefined,
      () => setTexture(null)
    )
  }, [])
  
  useFrame(() => {
    const dayBlend = dayBlendRef.current
    if (meshRef.current) meshRef.current.material.opacity = THREE.MathUtils.lerp(0.3, 0.5, dayBlend)
  })

  if (!texture) {
    return (
      <mesh ref={meshRef} rotation={[0, Math.PI, 0]} renderOrder={-1000}>
        <sphereGeometry args={[300, 64, 64]} />
        <shaderMaterial side={THREE.BackSide} transparent opacity={0.6} fog={false} depthWrite={false} depthTest={true}
          uniforms={{
            dayBlend: { value: 0 },
            dayTop: { value: new THREE.Color('#4a6b8a') }, dayBottom: { value: new THREE.Color('#6a8a9a') },
            nightTop: { value: new THREE.Color('#0a0f1a') }, nightBottom: { value: new THREE.Color('#1a1f2e') },
          }}
          vertexShader={`varying vec3 vWorldPosition; void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorldPosition = wp.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
          fragmentShader={`uniform float dayBlend; uniform vec3 dayTop, dayBottom, nightTop, nightBottom; varying vec3 vWorldPosition; void main() { float h = normalize(vWorldPosition).y; vec3 dc = mix(dayBottom, dayTop, max(h, 0.0) * 0.7); vec3 nc = mix(nightBottom, nightTop, max(h, 0.0) * 0.7); gl_FragColor = vec4(mix(nc, dc, dayBlend) * 0.7, 1.0); }`}
        />
      </mesh>
    )
  }

  return (
    <mesh ref={meshRef} rotation={[0, Math.PI, 0]} renderOrder={-1000}>
      <sphereGeometry args={[300, 64, 64]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} transparent opacity={0.5} fog={false} depthWrite={false} depthTest={true} toneMapped={false} />
    </mesh>
  )
}

function AtmosphericGlow({ dayBlendRef }) {
  const glowRef = useRef(null)
  useFrame((state) => {
    const dayBlend = dayBlendRef.current
    if (glowRef.current) {
      const baseOpacity = THREE.MathUtils.lerp(0.05, 0.15, dayBlend)
      glowRef.current.material.opacity = baseOpacity * (0.5 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1)
    }
  })
  return (
    <mesh ref={glowRef} renderOrder={-999}>
      <sphereGeometry args={[301, 32, 32]} />
      <shaderMaterial side={THREE.BackSide} transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} depthTest={true}
        uniforms={{
          dayBlend: { value: 0 },
          glowColor: { value: new THREE.Color('#ff8844') },
          nightGlowColor: { value: new THREE.Color('#3355aa') },
        }}
        vertexShader={`varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
        fragmentShader={`uniform float dayBlend; uniform vec3 glowColor, nightGlowColor; varying vec3 vNormal; void main() { float intensity = pow(0.65 - dot(vNormal, vec3(0,0,1.0)), 3.0); vec3 finalGlow = mix(nightGlowColor, glowColor, dayBlend); gl_FragColor = vec4(finalGlow * intensity * 0.5, 1.0); }`}
      />
    </mesh>
  )
}

function DistantCity() {
  const buildingCount = 80
  const buildings = useMemo(() => {
    return Array.from({ length: buildingCount }, (_, i) => {
      const startAngle = -Math.PI / 3, endAngle = Math.PI / 3
      const angle = startAngle + (i / buildingCount) * (endAngle - startAngle)
      const radius = 150 + Math.random() * 50, height = 15 + Math.random() * 50
      const width = 4 + Math.random() * 10, depth = 4 + Math.random() * 8
      return {
        position: [Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius],
        scale: [width, height, depth],
        rotation: [0, -angle + Math.PI / 2, 0]
      }
    })
  }, [])
  return (
    <group renderOrder={-100}>
      {buildings.map((b, i) => (
        <mesh key={i} {...b}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#0f1419" transparent opacity={0.6} fog={true} depthWrite={false} />
        </mesh>
      ))}
      {buildings.filter((_, i) => i % 4 === 0).map((b, i) => (
        <pointLight key={`l-${i}`} position={[b.position[0], b.position[1] * 0.6, b.position[2]]} intensity={0.2} color="#ffaa44" distance={25} decay={2} />
      ))}
    </group>
  )
}

function FloatingParticles() {
  const particlesRef = useRef(null); const speedsRef = useRef(null); const count = 200
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3), spd = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2, radius = 40 + Math.random() * 80
      pos[i * 3] = Math.cos(angle) * radius; pos[i * 3 + 1] = 2 + Math.random() * 20; pos[i * 3 + 2] = Math.sin(angle) * radius
      spd[i] = 0.2 + Math.random() * 0.5
    }
    speedsRef.current = spd; return pos
  }, [])
  useFrame((state) => {
    if (particlesRef.current && speedsRef.current) {
      const arr = particlesRef.current.geometry.attributes.position.array
      for (let i = 0; i < count; i++) {
        arr[i * 3 + 1] += Math.sin(state.clock.elapsedTime * speedsRef.current[i] + i) * 0.02
        if (arr[i * 3 + 1] > 25) arr[i * 3 + 1] = 2
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.02
    }
  })
  return (
    <points ref={particlesRef} renderOrder={500}>
      <bufferGeometry><bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} /></bufferGeometry>
      <pointsMaterial size={0.4} color="#ffcc44" transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  )
}

function MagicOrbs() {
  const orbsRef = useRef([])
  const orbs = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const startAngle = -Math.PI / 3, endAngle = Math.PI / 3
    const angle = startAngle + (i / 6) * (endAngle - startAngle), radius = 60 + Math.random() * 40
    return {
      position: [Math.cos(angle) * radius, 3 + Math.random() * 10, Math.sin(angle) * radius],
      scale: 1 + Math.random() * 2, color: i % 2 === 0 ? '#ff6644' : '#4488ff',
      speed: 0.3 + Math.random() * 0.4, offset: Math.random() * 100
    }
  }), [])
  useFrame((state) => {
    orbsRef.current.forEach((orb, i) => {
      if (orb) {
        const d = orbs[i]; orb.position.y = d.position[1] + Math.sin(state.clock.elapsedTime * d.speed + d.offset) * 2
        const s = 1 + Math.sin(state.clock.elapsedTime * 0.5 + d.offset) * 0.3; orb.scale.set(s, s, s)
      }
    })
  })
  return (
    <group>
      {orbs.map((o, i) => (
        <mesh key={i} ref={el => orbsRef.current[i] = el} position={o.position} renderOrder={600}>
          <sphereGeometry args={[o.scale, 16, 16]} />
          <meshBasicMaterial color={o.color} transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function SunMoonCelestials({ dayBlendRef }) {
  const sunMeshRef = useRef(null); const sunLightRef = useRef(null)
  const moonMeshRef = useRef(null); const moonLightRef = useRef(null)
  useFrame(() => {
    const dayBlend = dayBlendRef.current
    if (sunMeshRef.current) { sunMeshRef.current.visible = dayBlend > 0.05; sunMeshRef.current.material.opacity = dayBlend * 0.7 }
    if (sunLightRef.current) sunLightRef.current.intensity = dayBlend * 200
    if (moonMeshRef.current) { moonMeshRef.current.visible = dayBlend < 0.95; moonMeshRef.current.material.opacity = (1 - dayBlend) * 0.7 }
    if (moonLightRef.current) moonLightRef.current.intensity = (1 - dayBlend) * 80
  })
  return (
    <>
      <mesh ref={sunMeshRef} position={[-25, 20, -70]}><sphereGeometry args={[3, 32, 32]} /><meshBasicMaterial color="#ffee66" transparent opacity={0.7} /></mesh>
      <pointLight ref={sunLightRef} color="#ffaa33" intensity={0} distance={100} decay={1} position={[-25, 20, -70]} />
      <mesh ref={moonMeshRef} position={[30, 22, -65]}><sphereGeometry args={[2, 32, 32]} /><meshBasicMaterial color="#ccddff" transparent opacity={0.7} /></mesh>
      <pointLight ref={moonLightRef} color="#6688ff" intensity={0} distance={80} decay={1.5} position={[30, 22, -65]} />
    </>
  )
}

export function SceneAtmosphere({ dayBlendRef }) {
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
  const tmpAmbient = useRef(new THREE.Color()), tmpHemi = useRef(new THREE.Color()), tmpSun = useRef(new THREE.Color())
  const ambientLightRef = useRef(null), hemisphereLightRef = useRef(null), directionalLightRef = useRef(null)
  const starsRef = useRef(null), cloudRef = useRef(null), groundMistRef = useRef(null)

  useFrame((state, delta) => {
    phaseRef.current = useGameStore.getState().phase
    const targetDayBlend = phaseRef.current === 'night' ? 0 : 1
    dayBlendRef.current = THREE.MathUtils.damp(dayBlendRef.current, targetDayBlend, 3.2, delta)
    const dayBlend = dayBlendRef.current
    skyColor.copy(nightSky).lerp(daySky, dayBlend)
    state.scene.background = skyColor
    if (state.scene.fog) state.scene.fog.color.copy(skyColor)
    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = THREE.MathUtils.lerp(0.2, 0.5, dayBlend)
      ambientLightRef.current.color.copy(tmpAmbient.current.copy(nightAmbient).lerp(dayAmbient, dayBlend))
    }
    if (hemisphereLightRef.current) {
      hemisphereLightRef.current.intensity = THREE.MathUtils.lerp(0.3, 0.6, dayBlend)
      hemisphereLightRef.current.color.copy(tmpHemi.current.copy(nightHemi).lerp(dayHemi, dayBlend))
    }
    if (directionalLightRef.current) {
      directionalLightRef.current.intensity = THREE.MathUtils.lerp(0.15, 0.9, dayBlend)
      directionalLightRef.current.color.copy(tmpSun.current.copy(nightSun).lerp(daySun, dayBlend))
    }
    if (starsRef.current) starsRef.current.visible = dayBlend < 0.92
    if (cloudRef.current) cloudRef.current.visible = dayBlend > 0.08
    if (groundMistRef.current) groundMistRef.current.visible = phaseRef.current === 'night'
  })

  return (
    <>
      <color attach="background" args={['#08111b']} />
      <fog attach="fog" args={['#08111b', 50, 200]} />
      <Stars ref={starsRef} radius={100} depth={50} count={3000} factor={4} saturation={0.3} fade speed={0.5} />
      <ambientLight ref={ambientLightRef} intensity={0.3} color="#909bb8" />
      <hemisphereLight ref={hemisphereLightRef} intensity={0.5} color="#a4b4d4" groundColor="#2a3a4a" />
      <directionalLight ref={directionalLightRef} castShadow intensity={1.2} color="#ffe4c4" position={[-8,12,-10]} shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-near={0.5} shadow-camera-far={100} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30} shadow-bias={-0.0001} shadow-normalBias={0.02} shadow-radius={4} />
      <pointLight position={[15,8,15]} intensity={0.3} color="#ffcc88" distance={40} decay={2} />
      <pointLight position={[-15,8,15]} intensity={0.3} color="#ffcc88" distance={40} decay={2} />
      
      <PanoramicBackground dayBlendRef={dayBlendRef} />
      <AtmosphericGlow dayBlendRef={dayBlendRef} />
      <DistantCity />
      <FloatingParticles />
      <MagicOrbs />
      
      <SunMoonCelestials dayBlendRef={dayBlendRef} />
      <Cloud ref={cloudRef} opacity={0.3} speed={0.2} width={40} depth={1.5} segments={20} position={[0,15,-25]} />
      <mesh ref={groundMistRef} rotation={[-Math.PI/2,0,0]} position={[0,0.1,0]} visible={false}><planeGeometry args={[80,80]} /><meshBasicMaterial color="#1a2a4a" transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    </>
  )
}