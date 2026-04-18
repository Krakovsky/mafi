import { useEffect, useMemo, useRef } from 'react'
import { useFBX, useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { useAnimStore } from '../../game/model/animStore'

const ANIM_FBX_URL = '/models/maf/anim.fbx'
const BASE_IDLE_CLIP_ID = 'idle-base'
const CROSSFADE_SEC = 0.4

export function PlayerModel({ tint, alive, playerId }) {
  const fbx = useFBX(ANIM_FBX_URL)
  const textures = useTexture({
    mat2: '/models/maf/textures/mat_2_baseColor.png',
    mat3: '/models/maf/textures/mat_3_baseColor.png',
    mat4: '/models/maf/textures/mat_4_baseColor.png',
    mat5: '/models/maf/textures/mat_5_baseColor.png',
    mat6: '/models/maf/textures/mat_6_baseColor.png',
  })

  const textureMap = useMemo(() => {
    return {
      mat2: textures.mat2,
      mat3: textures.mat3,
      mat4: textures.mat4,
      mat5: textures.mat5,
      mat6: textures.mat6,
    }
  }, [textures.mat2, textures.mat3, textures.mat4, textures.mat5, textures.mat6])

  const { cloned, normalizedScale } = useMemo(() => {
    Object.values(textureMap).forEach((texture) => {
      if (!texture) {
        return
      }
      texture.flipY = false
      texture.colorSpace = THREE.SRGBColorSpace
      texture.needsUpdate = true
    })

    const texturePool = [textureMap.mat2, textureMap.mat3, textureMap.mat4, textureMap.mat5, textureMap.mat6].filter(Boolean)

    const pickTexture = (materialName, materialIndex) => {
      const normalizedName = String(materialName || '').toLowerCase()
      const match = normalizedName.match(/mat[_\s]?([2-6])/)
      if (match) {
        const exact = textureMap[`mat${match[1]}`]
        if (exact) {
          return exact
        }
      }
      return texturePool[materialIndex % texturePool.length] || null
    }

    const c = skeletonClone(fbx)

    const box = new THREE.Box3().setFromObject(c)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)

    const maxAxis = Math.max(size.x, size.y, size.z) || 1
    const scale = 2.2 / maxAxis

    c.position.set(-center.x, -box.min.y, -center.z)

    let meshIndex = 0
    c.traverse((node) => {
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

    return { cloned: c, normalizedScale: scale }
  }, [fbx, textureMap])

  const baseClips = useMemo(() => {
    return fbx.animations.map((c) => {
      const renamed = c.clone()
      renamed.name = BASE_IDLE_CLIP_ID
      return renamed
    })
  }, [fbx.animations])

  const clipsRef = useRef({})
  const registeredRef = useRef(new Set())
  const baseRegisteredRef = useRef(false)

  const animClipsMap = useAnimStore((s) => s.animClipsMap)

  useEffect(() => {
    if (!baseRegisteredRef.current) {
      for (const c of baseClips) {
        if (!registeredRef.current.has(c.name)) {
          registeredRef.current.add(c.name)
          clipsRef.current[c.name] = c
        }
      }
      baseRegisteredRef.current = true
    }
  }, [baseClips])

  useEffect(() => {
    for (const [id, clip] of Object.entries(animClipsMap)) {
      if (!registeredRef.current.has(id)) {
        registeredRef.current.add(id)
        clipsRef.current[id] = clip.clone()
      }
    }
  }, [animClipsMap])

  const mixer = useMemo(() => new THREE.AnimationMixer(cloned), [cloned])

  useFrame((_, delta) => {
    mixer.update(delta)
  })

  const playerOverride = useAnimStore((s) => s.playerOverrides[playerId])
  const idleAssignment = useAnimStore((s) => s.idleAssignments[playerId])
  const animationsActive = useAnimStore((s) => s.animationsActive)
  const playbackSpeed = useAnimStore((s) => s.playbackSpeed)

  const currentClipId = animationsActive
    ? (playerOverride || idleAssignment || BASE_IDLE_CLIP_ID)
    : null
  const currentActionRef = useRef(null)
  const prevClipIdRef = useRef(null)

  useEffect(() => {
    mixer.timeScale = playbackSpeed
  }, [mixer, playbackSpeed])

  useEffect(() => {
    const clipId = currentClipId

    if (!clipId) {
      const prevAction = currentActionRef.current
      if (prevAction) {
        prevAction.fadeOut(0.3)
        currentActionRef.current = null
        prevClipIdRef.current = null
      }
      return
    }

    const clip = clipsRef.current[clipId]
    const fallbackClip = clipsRef.current[BASE_IDLE_CLIP_ID]

    const clipToUse = clip || fallbackClip
    if (!clipToUse) return

    const newAction = mixer.clipAction(clipToUse, cloned)

    if (prevClipIdRef.current === clipId && currentActionRef.current) {
      return
    }

    const prevAction = currentActionRef.current

    if (prevAction && prevAction !== newAction) {
      prevAction.fadeOut(CROSSFADE_SEC)
      newAction.reset().fadeIn(CROSSFADE_SEC).play()
    } else if (!prevAction) {
      newAction.reset().fadeIn(0.3).play()
    }

    currentActionRef.current = newAction
    prevClipIdRef.current = clipId
  }, [mixer, cloned, currentClipId])

  useEffect(() => {
    if (!mixer) return

    const onLoop = () => {
      const animState = useAnimStore.getState()
      if (!animState.animationsActive) return
      if (!animState.idleRotationEnabled) return
      if (animState.playerOverrides[playerId]) return
      if (!animState.pendingIdleSwitch[playerId]) return

      animState.assignNewIdle(playerId)
    }

    mixer.addEventListener('loop', onLoop)
    return () => mixer.removeEventListener('loop', onLoop)
  }, [mixer, playerId])

  useEffect(() => {
    return () => {
      mixer.stopAllAction()
    }
  }, [mixer])

  return (
    <group scale={alive ? normalizedScale : normalizedScale * 0.96}>
      <primitive object={cloned} />
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={alive ? 0.24 : 0.08} />
      </mesh>
    </group>
  )
}