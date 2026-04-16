import { useEffect, useMemo, useRef } from 'react'
import { useAnimations, useFBX } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'

const DYING_FBX_URL = '/models/maf/dying.fbx'

export function DeathAnimation({ deathEventRef, positions }) {
  const source = useFBX(DYING_FBX_URL)
  const groupRef = useRef(null)
  const lastEventIdRef = useRef(0)
  const hiddenPlayerRef = useRef(null)
  const { scene } = useThree()

  const model = useMemo(() => {
    const cloned = skeletonClone(source)

    const box = new THREE.Box3().setFromObject(cloned)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)

    const maxAxis = Math.max(size.x, size.y, size.z) || 1
    const scale = 2.2 / maxAxis

    cloned.position.set(-center.x, -box.min.y, -center.z)

    cloned.traverse((node) => {
      if (!node.isMesh || !node.material) {
        return
      }

      const materials = Array.isArray(node.material) ? node.material : [node.material]
      materials.forEach((mat) => {
        if (mat) {
          mat.side = THREE.FrontSide
          mat.needsUpdate = true
        }
      })

      node.castShadow = true
      node.receiveShadow = true
    })

    return { object: cloned, scale }
  }, [source])

  const { actions, mixer } = useAnimations(source.animations, groupRef)

  useEffect(() => {
    const names = Object.keys(actions)
    if (!names.length) {
      return
    }

    const action = actions[names[0]]
    if (!action) {
      return
    }

    action.setLoop(THREE.LoopOnce, 1)
    action.clampWhenFinished = true
    action.play()
    mixer.update(0)
    action.stop()
  }, [actions, mixer])

  useFrame(() => {
    const group = groupRef.current
    if (!group) {
      return
    }

    const ev = deathEventRef.current
    if (!ev || ev.eventId === lastEventIdRef.current) {
      return
    }

    const { targetId, eventId } = ev
    if (!Number.isInteger(targetId)) {
      return
    }

    lastEventIdRef.current = eventId

    if (hiddenPlayerRef.current !== null) {
      const prevGroup = scene.getObjectByName(`player-actor-${hiddenPlayerRef.current}`)
      if (prevGroup) {
        prevGroup.visible = true
      }
    }

    const victimGroup = scene.getObjectByName(`player-actor-${targetId}`)
    if (victimGroup) {
      victimGroup.visible = false
    }
    hiddenPlayerRef.current = targetId

    const pos = positions[targetId]
    if (pos) {
      group.position.set(pos[0], pos[1], pos[2])
      group.rotation.set(0, Math.atan2(-pos[0], -pos[2]), 0)
    }
    group.visible = true

    const names = Object.keys(actions)
    if (names.length) {
      const action = actions[names[0]]
      if (action) {
        action.reset()
        action.setLoop(THREE.LoopOnce, 1)
        action.clampWhenFinished = true
        action.enabled = true
        action.timeScale = 1
        action.play()
      }
    }
  })

  return (
    <group ref={groupRef} visible={false} scale={model.scale}>
      <primitive object={model.object} />
    </group>
  )
}
