
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Clone, Environment, OrbitControls, Stars, useGLTF, useTexture } from '@react-three/drei'
import styled, { createGlobalStyle } from 'styled-components'
import * as THREE from 'three'
import { create } from 'zustand'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'

const mafiaModelUrl = '/models/maf/scene.gltf'
const townModelUrl = '/models/town/scene.gltf'
const lampModelUrl = '/models/lamp/scene.gltf'
const treeModelUrl = '/models/tree/scene.gltf'

const PLAYER_COUNT = 10
const PLAYER_RING_RADIUS = 9
const ROLE_OPTIONS = ['civilian', 'mafia', 'sheriff', 'doctor']

const ROLE_SET = [
  'mafia',
  'mafia',
  'sheriff',
  'doctor',
  'civilian',
  'civilian',
  'civilian',
  'civilian',
  'civilian',
  'civilian',
]

const PHASE_TEXT = {
  night: 'Ночь',
  day: 'День',
  ended: 'Игра завершена',
}

function buildPlayers() {
  return Array.from({ length: PLAYER_COUNT }, (_, id) => ({
    id,
    role: 'civilian',
    alive: true,
  }))
}

function evaluateWinner(players) {
  const alive = players.filter((player) => player.alive)
  const mafiaCount = alive.filter((player) => player.role === 'mafia').length
  const civilianCount = alive.length - mafiaCount

  if (mafiaCount === 0) {
    return 'Мирные жители победили'
  }

  if (mafiaCount >= civilianCount) {
    return 'Мафия победила'
  }

  return null
}

const ROLE_COLOR = {
  mafia: '#8f3f40',
  sheriff: '#3f618f',
  doctor: '#3f8f6a',
  civilian: '#7c7f8a',
}

const useGameStore = create((set, get) => ({
  phase: 'day',
  round: 1,
  players: buildPlayers(),
  winner: null,
  log: ['Игра началась. Город просыпается.'],

  resetGame: () => {
    set({
      phase: 'night',
      round: 1,
      players: buildPlayers(),
      winner: null,
      log: ['Новая партия началась. Город засыпает.'],
    })
  },

  applyClassicRoles: () => {
    const randomized = [...ROLE_SET]
    for (let i = randomized.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
        ;[randomized[i], randomized[j]] = [randomized[j], randomized[i]]
    }

    const { players, log } = get()
    const updatedPlayers = players.map((player) => ({ ...player, role: randomized[player.id] }))
    set({ players: updatedPlayers, winner: null, log: [...log, 'Ведущий назначил роли по шаблону 2/1/1/6.'] })
  },

  setPhase: (phase) => {
    const { log } = get()
    set({ phase, winner: phase === 'ended' ? get().winner : null, log: [...log, `Фаза изменена вручную: ${PHASE_TEXT[phase]}.`] })
  },

  setRound: (round) => {
    const safeRound = Number.isFinite(round) ? Math.max(1, Math.floor(round)) : 1
    set({ round: safeRound })
  },

  setPlayerRole: (playerId, role) => {
    const { players, log } = get()
    const updatedPlayers = players.map((player) => {
      if (player.id === playerId) {
        return { ...player, role }
      }
      return player
    })
    set({ players: updatedPlayers, winner: null, log: [...log, `Игроку ${playerId + 1} назначена роль ${role}.`] })
  },

  setPlayerAlive: (playerId, alive) => {
    const { players } = get()
    const updatedPlayers = players.map((player) => {
      if (player.id === playerId) {
        return { ...player, alive }
      }
      return player
    })
    const winnerState = evaluateWinner(updatedPlayers)
    set({ players: updatedPlayers, winner: winnerState, phase: winnerState ? 'ended' : get().phase })
  },

  runNightManual: ({ targetId, saved, sheriffCheckId }) => {
    const { phase, players, winner, round, log } = get()
    if (phase !== 'night' || winner) {
      return { canAnimate: false, error: 'Нельзя провести ночь в текущей фазе.' }
    }

    const target = players.find((player) => player.id === targetId)
    if (!target || !target.alive) {
      return { canAnimate: false, error: 'Выберите живую цель для ночи.' }
    }

    const sheriffCheck =
      sheriffCheckId === '' || sheriffCheckId === null || sheriffCheckId === undefined
        ? null
        : players.find((player) => player.id === sheriffCheckId && player.alive)

    const updatedPlayers = players.map((player) => {
      if (!saved && player.id === targetId) {
        return { ...player, alive: false }
      }
      return player
    })

    const lines = [`Раунд ${round}. Ночью мафия выбрала Игрока ${targetId + 1}.`]
    if (saved) {
      lines.push(`Доктор спас Игрока ${targetId + 1}. Выстрел сорван.`)
    } else {
      lines.push(`Игрок ${targetId + 1} выбыл после ночного выстрела.`)
    }

    if (sheriffCheck) {
      const verdict = sheriffCheck.role === 'mafia' ? 'мафия' : 'не мафия'
      lines.push(`Шериф проверил Игрока ${sheriffCheck.id + 1}: ${verdict}.`)
    }

    const winnerState = evaluateWinner(updatedPlayers)

    set({
      players: updatedPlayers,
      phase: winnerState ? 'ended' : 'day',
      winner: winnerState,
      log: [...log, ...lines, winnerState ? `Итог: ${winnerState}.` : 'Город просыпается и обсуждает.'],
    })

    return {
      canAnimate: !saved,
      targetId,
    }
  },

  runDayVoteManual: (targetId) => {
    const { phase, players, log, round, winner } = get()
    if (phase !== 'day' || winner) {
      return
    }

    const votedOut = players.find((player) => player.id === targetId)
    if (!votedOut || !votedOut.alive) {
      return
    }

    const updatedPlayers = players.map((player) => {
      if (player.id === votedOut.id) {
        return { ...player, alive: false }
      }
      return player
    })

    const winnerState = evaluateWinner(updatedPlayers)

    set({
      players: updatedPlayers,
      phase: winnerState ? 'ended' : 'night',
      round: winnerState ? round : round + 1,
      winner: winnerState,
      log: [
        ...log,
        `Днем город проголосовал против Игрока ${votedOut.id + 1}.`,
        winnerState ? `Итог: ${winnerState}.` : 'Город засыпает. Начинается следующая ночь.',
      ],
    })
  },

  addLogLine: (line) => {
    const { log } = get()
    if (!line.trim()) {
      return
    }
    set({ log: [...log, line.trim()] })
  },
}))

function PlayerModel({ tint, alive }) {
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

function useNormalizedModel(model, targetSize) {
  const tuneMaterial = (material) => {
    if (!material) {
      return
    }

    if (material.map) {
      material.map.colorSpace = THREE.SRGBColorSpace
      material.map.needsUpdate = true
    }

    if (material.emissiveMap) {
      material.emissiveMap.colorSpace = THREE.SRGBColorSpace
      material.emissiveMap.needsUpdate = true
    }

    if ('metalness' in material && typeof material.metalness === 'number') {
      material.metalness = Math.min(material.metalness, 0.35)
    }

    if ('roughness' in material && typeof material.roughness === 'number') {
      material.roughness = Math.max(material.roughness, 0.55)
    }

    material.needsUpdate = true
  }

  return useMemo(() => {
    const cloned = model.clone(true)
    const box = new THREE.Box3().setFromObject(cloned)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)

    const maxAxis = Math.max(size.x, size.y, size.z) || 1
    const scale = targetSize / maxAxis

    cloned.position.x -= center.x
    cloned.position.y -= box.min.y
    cloned.position.z -= center.z
    cloned.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true
        node.receiveShadow = true

        if (Array.isArray(node.material)) {
          node.material.forEach((material) => tuneMaterial(material))
        } else {
          tuneMaterial(node.material)
        }
      }
    })

    return { object: cloned, scale }
  }, [model, targetSize])
}

function TownBackdrop() {
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

  return <Clone object={object} position={[0, -0.2, -38]} scale={scale * 4} />
}

function StreetLamp() {
  const gltf = useGLTF(lampModelUrl)
  const textures = useTexture({
    color: '/models/lamp/textures/DefaultMaterial_baseColor.jpeg',
    mr: '/models/lamp/textures/DefaultMaterial_metallicRoughness.png',
    normal: '/models/lamp/textures/DefaultMaterial_normal.png',
  })

  const { object, scale } = useMemo(() => {
    textures.color.flipY = false
    textures.mr.flipY = false
    textures.normal.flipY = false
    textures.color.colorSpace = THREE.SRGBColorSpace
    textures.color.needsUpdate = true
    textures.mr.needsUpdate = true
    textures.normal.needsUpdate = true

    const cloned = gltf.scene.clone(true)
    const box = new THREE.Box3().setFromObject(cloned)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    const localScale = 6 / (Math.max(size.x, size.y, size.z) || 1)

    cloned.position.x -= center.x
    cloned.position.y -= box.min.y
    cloned.position.z -= center.z

    cloned.traverse((node) => {
      if (!node.isMesh || !node.material) {
        return
      }
      const material = node.material
      material.map = textures.color
      material.metalnessMap = textures.mr
      material.roughnessMap = textures.mr
      material.normalMap = textures.normal
      material.needsUpdate = true
      node.castShadow = true
      node.receiveShadow = true
    })

    return { object: cloned, scale: localScale }
  }, [gltf.scene, textures])

  return (
    <group position={[12.6, 0, 7.4]} rotation={[0, -0.75, 0]}>
      <Clone object={object} scale={scale} />
      <pointLight position={[0, 5.2, 0]} intensity={0.72} distance={18} decay={1.85} color="#ffe4af" />
    </group>
  )
}

function TreeRing() {
  const gltf = useGLTF(treeModelUrl)
  const textures = useTexture({
    leaf: '/models/tree/textures/Leaf_diffuse.png',
    bark: '/models/tree/textures/Bark_diffuse.png',
  })
  const { object, scale } = useMemo(() => {
    textures.leaf.flipY = false
    textures.bark.flipY = false
    textures.leaf.colorSpace = THREE.SRGBColorSpace
    textures.bark.colorSpace = THREE.SRGBColorSpace
    textures.leaf.needsUpdate = true
    textures.bark.needsUpdate = true

    const cloned = gltf.scene.clone(true)
    const box = new THREE.Box3().setFromObject(cloned)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    const localScale = 7.8 / (Math.max(size.x, size.y, size.z) || 1)

    cloned.position.x -= center.x
    cloned.position.y -= box.min.y
    cloned.position.z -= center.z

    cloned.traverse((node) => {
      if (!node.isMesh || !node.material) {
        return
      }

      const material = node.material
      if (material.name === 'Leaf') {
        material.map = textures.leaf
        material.transparent = true
        material.alphaTest = 0.42
        material.depthWrite = false
      } else {
        material.map = textures.bark
      }
      material.needsUpdate = true
      node.castShadow = true
      node.receiveShadow = true
    })

    return { object: cloned, scale: localScale }
  }, [gltf.scene, textures])

  const positions = useMemo(() => {
    return Array.from({ length: 10 }, (_, index) => {
      const angle = (index / 10) * Math.PI * 2
      return {
        x: Math.cos(angle) * 25,
        z: Math.sin(angle) * 25,
        rot: -angle + Math.PI,
      }
    })
  }, [])

  return (
    <group>
      {positions.map((item, index) => (
        <Clone
          key={`tree-${index}`}
          object={object}
          position={[item.x, 0, item.z]}
          rotation={[0, item.rot, 0]}
          scale={scale * (0.88 + (index % 3) * 0.08)}
        />
      ))}
    </group>
  )
}

function PlayerFallback({ tint, alive }) {
  return (
    <group>
      <mesh position={[0, 1.1, 0]} castShadow>
        <capsuleGeometry args={[0.36, 0.9, 8, 16]} />
        <meshStandardMaterial color={alive ? '#c6cad4' : '#4b4f57'} roughness={0.35} metalness={0.08} />
      </mesh>
      <mesh position={[0, 2.1, 0]} castShadow>
        <sphereGeometry args={[0.26, 20, 20]} />
        <meshStandardMaterial color={alive ? '#dedfe4' : '#595d66'} roughness={0.4} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[0.65, 0.65, 0.06, 32]} />
        <meshStandardMaterial color={tint} opacity={alive ? 0.75 : 0.3} transparent />
      </mesh>
    </group>
  )
}

function Player({ player, position, focused }) {
  const tint = ROLE_COLOR[player.role]
  const [x, y, z] = position
  const facing = Math.atan2(-x, -z)

  return (
    <group position={[x, y, z]} rotation={[0, facing, 0]}>
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <cylinderGeometry args={[0.98, 0.98, 0.05, 40]} />
        <meshStandardMaterial
          color={focused ? '#f2b36e' : tint}
          emissive={focused ? '#f2b36e' : tint}
          emissiveIntensity={focused ? 0.38 : 0.14}
          opacity={player.alive ? 0.8 : 0.3}
          transparent
        />
      </mesh>

      <group position={[0, 0.06, 0]}>
        <Suspense fallback={<PlayerFallback tint={tint} alive={player.alive} />}>
          <PlayerModel tint={tint} alive={player.alive} />
        </Suspense>
      </group>

      {!player.alive ? (
        <mesh position={[0, 2.8, 0]}>
          <boxGeometry args={[0.1, 1.2, 0.1]} />
          <meshStandardMaterial color="#bd3d3d" />
        </mesh>
      ) : null}
    </group>
  )
}

function Assassin({ targetPosition, progress }) {
  const start = [-15, 0, targetPosition[2] - 2.5]
  const end = [targetPosition[0] - 1.4, 0, targetPosition[2] + 0.25]

  const x = start[0] + (end[0] - start[0]) * progress
  const z = start[2] + (end[2] - start[2]) * progress
  const facing = Math.atan2(targetPosition[0] - x, targetPosition[2] - z)

  return (
    <group position={[x, 0, z]} rotation={[0, facing, 0]}>
      <mesh position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.34, 20, 20]} />
        <meshStandardMaterial color="#c5c7cd" />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <capsuleGeometry args={[0.3, 0.82, 8, 16]} />
        <meshStandardMaterial color="#4a5566" />
      </mesh>
      <mesh position={[0.34, 0.62, 0.18]} rotation={[0, 0.25, 0]}>
        <boxGeometry args={[0.34, 0.1, 0.1]} />
        <meshStandardMaterial color="#111318" />
      </mesh>

      {progress > 0.78 ? (
        <mesh position={[0.58, 0.62, 0.3]}>
          <sphereGeometry args={[0.16, 18, 18]} />
          <meshStandardMaterial color="#ff9e2e" emissive="#ff9e2e" emissiveIntensity={2} />
        </mesh>
      ) : null}
    </group>
  )
}

function MafiaScene({ players, phase, assassination }) {
  const positions = useMemo(() => {
    return players.map((_, index) => {
      const angle = (index / PLAYER_COUNT) * Math.PI * 2
      return [Math.cos(angle) * PLAYER_RING_RADIUS, 0, Math.sin(angle) * PLAYER_RING_RADIUS]
    })
  }, [players])

  const targetPosition = assassination ? positions[assassination.targetId] : null
  const isDay = phase === 'day'

  return (
    <Canvas style={{ width: '100%', height: '100%' }} shadows camera={{ position: [0, 11, 34], fov: 42 }}>
      <color attach="background" args={[isDay ? '#b4c2d2' : '#08111b']} />
      <fog attach="fog" args={[isDay ? '#b4c2d2' : '#08111b', 20, 125]} />

      {!isDay ? <Stars radius={80} depth={35} count={1600} factor={3} saturation={0.15} fade /> : null}

      <ambientLight intensity={isDay ? 0.86 : 0.3} color={isDay ? '#f5f5f2' : '#b0bbd8'} />
      <hemisphereLight intensity={isDay ? 0.6 : 0.28} color={isDay ? '#f4f8ff' : '#9cb2d4'} groundColor="#31404d" />
      <directionalLight
        castShadow
        intensity={isDay ? 1.15 : 0.52}
        color={isDay ? '#fff6e2' : '#c2d0f8'}
        position={isDay ? [11, 18, 8] : [-8, 12, -10]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <Environment preset={isDay ? 'city' : 'night'} />

      <mesh position={isDay ? [12, 13, -30] : [-12, 11, -30]}>
        <sphereGeometry args={[1.65, 32, 32]} />
        <meshStandardMaterial
          color={isDay ? '#ffd95e' : '#cfd5ff'}
          emissive={isDay ? '#ffbf3d' : '#a4b0ff'}
          emissiveIntensity={isDay ? 0.7 : 0.45}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[16, 80]} />
        <meshStandardMaterial color={isDay ? '#657167' : '#1f2928'} roughness={0.95} />
      </mesh>

      <Suspense fallback={null}>
        <TownBackdrop />
        <StreetLamp />
        <TreeRing />
      </Suspense>


      {players.map((player) => (
        <Player
          key={player.id}
          player={player}
          position={positions[player.id]}
          focused={assassination?.targetId === player.id}
        />
      ))}

      {assassination && targetPosition ? (
        <Assassin targetPosition={targetPosition} progress={assassination.progress} />
      ) : null}

      <OrbitControls
        target={[0, 1.8, 0]}
        minDistance={18}
        maxDistance={75}
        minPolarAngle={0.35}
        maxPolarAngle={1.34}
      />

    </Canvas>
  )
}

function App() {
  const {
    phase,
    round,
    players,
    winner,
    log,
    resetGame,
    applyClassicRoles,
    setPhase,
    setRound,
    setPlayerRole,
    setPlayerAlive,
    runNightManual,
    runDayVoteManual,
    addLogLine,
  } = useGameStore()
  const [assassination, setAssassination] = useState(null)
  const [nightTargetId, setNightTargetId] = useState('')
  const [doctorSaved, setDoctorSaved] = useState(false)
  const [sheriffCheckId, setSheriffCheckId] = useState('')
  const [dayVoteTargetId, setDayVoteTargetId] = useState('')
  const [manualLine, setManualLine] = useState('')
  const frameRef = useRef(null)
  const timeoutRef = useRef(null)

  const aliveCount = players.filter((player) => player.alive).length
  const aliveMafia = players.filter((player) => player.alive && player.role === 'mafia').length

  const alivePlayers = useMemo(() => players.filter((player) => player.alive), [players])
  const effectiveNightTargetId = alivePlayers.some((player) => player.id === Number(nightTargetId))
    ? nightTargetId
    : ''
  const effectiveDayVoteTargetId = alivePlayers.some((player) => player.id === Number(dayVoteTargetId))
    ? dayVoteTargetId
    : ''
  const effectiveSheriffCheckId = alivePlayers.some((player) => player.id === Number(sheriffCheckId))
    ? sheriffCheckId
    : ''

  const handleNight = useCallback(() => {
    if (phase !== 'night') {
      return
    }

    const targetId = Number(effectiveNightTargetId)
    if (!Number.isInteger(targetId)) {
      return
    }

    const sheriffId = effectiveSheriffCheckId === '' ? null : Number(effectiveSheriffCheckId)
    const result = runNightManual({ targetId, saved: doctorSaved, sheriffCheckId: sheriffId })

    if (!result || result.error) {
      return
    }

    if (!result.canAnimate) {
      setNightTargetId('')
      setDoctorSaved(false)
      setSheriffCheckId('')
      return
    }

    const duration = 2500
    const startedAt = performance.now()

    const animate = (currentTime) => {
      const progress = Math.min((currentTime - startedAt) / duration, 1)
      setAssassination({ targetId: result.targetId, progress })

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        timeoutRef.current = window.setTimeout(() => {
          setAssassination(null)
          setNightTargetId('')
          setDoctorSaved(false)
          setSheriffCheckId('')
        }, 260)
      }
    }

    frameRef.current = requestAnimationFrame(animate)
  }, [doctorSaved, effectiveNightTargetId, effectiveSheriffCheckId, phase, runNightManual])

  const handleDayVote = useCallback(() => {
    if (phase !== 'day') {
      return
    }

    const targetId = Number(effectiveDayVoteTargetId)
    if (!Number.isInteger(targetId)) {
      return
    }

    runDayVoteManual(targetId)
    setDayVoteTargetId('')
  }, [effectiveDayVoteTargetId, phase, runDayVoteManual])

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <Shell>
      <GlobalStyle />

      <SceneWrap>
        <MafiaScene players={players} phase={phase} assassination={assassination} />
      </SceneWrap>

      <Panel>
        <Title>Mafia: Host Console</Title>
        <MetaLine>
          <span>Раунд {round}</span>
          <span>Фаза: {PHASE_TEXT[phase]}</span>
          <span>В игре: {aliveCount}</span>
          <span>Мафия в игре: {aliveMafia}</span>
        </MetaLine>

        {winner ? <Winner>{winner}</Winner> : null}

        <SectionTitle>Управление фазой</SectionTitle>
        <Buttons>
          <GhostButton type="button" onClick={() => setPhase('night')}>
            Ночь
          </GhostButton>
          <GhostButton type="button" onClick={() => setPhase('day')}>
            День
          </GhostButton>
          <GhostButton type="button" onClick={() => setPhase('ended')}>
            Завершить
          </GhostButton>
        </Buttons>

        <FieldLabel htmlFor="round-input">Раунд</FieldLabel>
        <Input
          id="round-input"
          type="number"
          min="1"
          value={round}
          onChange={(event) => setRound(Number(event.target.value))}
        />

        <SectionTitle>Ночь (ручной ввод)</SectionTitle>
        <FieldLabel htmlFor="night-target">Кого мафия убивает</FieldLabel>
        <Select
          id="night-target"
          value={effectiveNightTargetId}
          onChange={(event) => setNightTargetId(event.target.value)}
        >
          <option value="">Выберите цель</option>
          {alivePlayers.map((player) => (
            <option key={`night-${player.id}`} value={player.id}>
              Игрок {player.id + 1} ({player.role})
            </option>
          ))}
        </Select>

        <CheckboxRow>
          <input
            id="doctor-saved"
            type="checkbox"
            checked={doctorSaved}
            onChange={(event) => setDoctorSaved(event.target.checked)}
          />
          <label htmlFor="doctor-saved">Доктор спас цель</label>
        </CheckboxRow>

        <FieldLabel htmlFor="sheriff-check">Проверка комиссара</FieldLabel>
        <Select
          id="sheriff-check"
          value={effectiveSheriffCheckId}
          onChange={(event) => setSheriffCheckId(event.target.value)}
        >
          <option value="">Без проверки</option>
          {alivePlayers.map((player) => (
            <option key={`check-${player.id}`} value={player.id}>
              Игрок {player.id + 1}
            </option>
          ))}
        </Select>

        <Buttons>
          <ActionButton type="button" onClick={handleNight} disabled={phase !== 'night' || Boolean(winner)}>
            Применить ночь
          </ActionButton>
        </Buttons>

        <SectionTitle>День (ручное голосование)</SectionTitle>
        <FieldLabel htmlFor="day-vote">Кого выводит голосование</FieldLabel>
        <Select
          id="day-vote"
          value={effectiveDayVoteTargetId}
          onChange={(event) => setDayVoteTargetId(event.target.value)}
        >
          <option value="">Выберите игрока</option>
          {alivePlayers.map((player) => (
            <option key={`vote-${player.id}`} value={player.id}>
              Игрок {player.id + 1} ({player.role})
            </option>
          ))}
        </Select>

        <Buttons>
          <ActionButton type="button" onClick={handleDayVote} disabled={phase !== 'day' || Boolean(winner)}>
            Применить голосование
          </ActionButton>

          <GhostButton type="button" onClick={applyClassicRoles}>
            Авто роли 2/1/1/6
          </GhostButton>

          <GhostButton type="button" onClick={resetGame}>
            Новая партия
          </GhostButton>
        </Buttons>

        <SectionTitle>Игроки и роли</SectionTitle>
        <PlayerList>
          {players.map((player) => (
            <PlayerRow key={`admin-${player.id}`}>
              <PlayerLabel>Игрок {player.id + 1}</PlayerLabel>
              <Select value={player.role} onChange={(event) => setPlayerRole(player.id, event.target.value)}>
                {ROLE_OPTIONS.map((role) => (
                  <option key={`${player.id}-${role}`} value={role}>
                    {role}
                  </option>
                ))}
              </Select>
              <GhostButton type="button" onClick={() => setPlayerAlive(player.id, !player.alive)}>
                {player.alive ? 'Жив' : 'Выбыл'}
              </GhostButton>
            </PlayerRow>
          ))}
        </PlayerList>

        <SectionTitle>Ручной лог</SectionTitle>
        <Input
          type="text"
          value={manualLine}
          onChange={(event) => setManualLine(event.target.value)}
          placeholder="Добавить заметку ведущего"
        />
        <Buttons>
          <GhostButton
            type="button"
            onClick={() => {
              addLogLine(manualLine)
              setManualLine('')
            }}
          >
            Добавить в лог
          </GhostButton>
        </Buttons>

        <LogTitle>События</LogTitle>
        <LogList>
          {log.slice(-8).map((entry, index) => (
            <li key={`${index}-${entry}`}>{entry}</li>
          ))}
        </LogList>
      </Panel>
    </Shell>
  )
}

const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600;700&family=Space+Mono:wght@400;700&display=swap');

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    height: 100vh;
    overflow: hidden;
    font-family: 'Manrope', 'Segoe UI', sans-serif;
    background:
      radial-gradient(circle at 14% 22%, rgba(255, 255, 255, 0.06), transparent 42%),
      radial-gradient(circle at 82% 68%, rgba(153, 170, 191, 0.14), transparent 46%),
      #0f151b;
    color: #e8ebef;
  }
`

const Shell = styled.main`
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
`

const SceneWrap = styled.section`
  position: absolute;
  inset: 0;
`

const Panel = styled.section`
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 12;
  width: min(360px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  overflow: auto;
  backdrop-filter: blur(7px);
  background: linear-gradient(165deg, rgba(13, 18, 24, 0.86), rgba(24, 31, 38, 0.9));
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;

  @media (max-width: 760px) {
    top: auto;
    bottom: 12px;
    left: 12px;
    width: calc(100vw - 24px);
    max-height: 52vh;
    padding: 18px;
  }
`

const Title = styled.h1`
  margin: 0;
  font-size: clamp(1.45rem, 1.2rem + 0.7vw, 1.95rem);
  letter-spacing: 0.02em;
`

const MetaLine = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(120px, 1fr));
  gap: 8px;
  color: #d8dde6;
  font-size: 0.92rem;

  span {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 8px 10px;
  }
`

const Buttons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 2px;
`

const SectionTitle = styled.h2`
  margin: 4px 0 0;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #c6cfda;
`

const FieldLabel = styled.label`
  font-size: 0.82rem;
  color: #c9d2dc;
`

const Input = styled.input`
  border: 1px solid rgba(214, 222, 233, 0.22);
  border-radius: 10px;
  background: rgba(7, 10, 15, 0.35);
  color: #eef2f6;
  padding: 9px 10px;
  font-size: 0.88rem;
`

const Select = styled.select`
  border: 1px solid rgba(214, 222, 233, 0.22);
  border-radius: 10px;
  background: rgba(7, 10, 15, 0.35);
  color: #eef2f6;
  padding: 9px 10px;
  font-size: 0.88rem;
`

const CheckboxRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.86rem;
  color: #d9e2ec;
`

const PlayerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const PlayerRow = styled.div`
  display: grid;
  grid-template-columns: 90px 1fr auto;
  gap: 8px;
  align-items: center;
`

const PlayerLabel = styled.span`
  font-size: 0.83rem;
  color: #dbe4ed;
`

const ActionButton = styled.button`
  border: none;
  border-radius: 12px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #8d9aa8, #6f7b8a);
  color: #f4f6f8;
  font-family: 'Space Mono', monospace;
  font-size: 0.83rem;
  letter-spacing: 0.03em;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`

const GhostButton = styled(ActionButton)`
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
`

const Winner = styled.p`
  margin: 0;
  border-radius: 10px;
  padding: 10px 12px;
  font-weight: 700;
  color: #f4f7dc;
  background: linear-gradient(90deg, rgba(133, 151, 107, 0.25), rgba(110, 130, 91, 0.22));
`

const LogTitle = styled.h2`
  margin: 10px 0 0;
  font-size: 1.05rem;
`

const LogList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;

  li {
    border-left: 2px solid rgba(162, 176, 191, 0.85);
    border-radius: 4px;
    padding: 7px 0 7px 10px;
    background: rgba(255, 255, 255, 0.04);
    font-size: 0.91rem;
    line-height: 1.3;
  }
`

useGLTF.preload(mafiaModelUrl)
useGLTF.preload(townModelUrl)
useGLTF.preload(lampModelUrl)
useGLTF.preload(treeModelUrl)

export default App
