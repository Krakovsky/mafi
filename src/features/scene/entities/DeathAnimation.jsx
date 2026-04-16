import { useEffect, useMemo, useRef, useState } from 'react'
import { useAnimations, useFBX } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { useGameStore } from '../../game/model/gameStore'

const DYING_FBX_URL = '/models/maf/dying.fbx'

function buildDeathModel(source) {
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
}

function DeathCorpse({ source, event }) {
  const groupRef = useRef(null)
  const model = useMemo(() => buildDeathModel(source), [source])
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

    action.reset()
    action.setLoop(THREE.LoopOnce, 1)
    action.clampWhenFinished = true
    action.enabled = true
    action.timeScale = 1
    action.play()
  }, [actions])

  useFrame((_, delta) => {
    if (mixer) {
      mixer.update(delta)
    }
  })

  return (
    <group
      ref={groupRef}
      position={event.position}
      rotation={[0, event.rotationY, 0]}
      scale={model.scale}
    >
      <primitive object={model.object} />
    </group>
  )
}

export function DeathAnimation({ deathEventRef, positions }) {
  const source = useFBX(DYING_FBX_URL)
  const players = useGameStore((state) => state.players)
  const [events, setEvents] = useState([])
  const lastEventIdRef = useRef(0)
  const hiddenPlayersRef = useRef(new Set())
  const { scene } = useThree()

  useEffect(() => {
    return () => {
      hiddenPlayersRef.current.forEach((playerId) => {
        const group = scene.getObjectByName(`player-actor-${playerId}`)
        if (group) {
          group.visible = true
        }
      })
      hiddenPlayersRef.current.clear()
    }
  }, [scene])

  useEffect(() => {
    const everyoneAlive = players.length > 0 && players.every((player) => player.alive)
    if (!everyoneAlive) {
      return
    }

    hiddenPlayersRef.current.forEach((playerId) => {
      const group = scene.getObjectByName(`player-actor-${playerId}`)
      if (group) {
        group.visible = true
      }
    })
    hiddenPlayersRef.current.clear()
    setEvents([])
    lastEventIdRef.current = 0
  }, [players, scene])

  useFrame(() => {
    const ev = deathEventRef.current
    if (!ev || ev.eventId === lastEventIdRef.current) {
      return
    }

    const { targetId, eventId } = ev
    if (!Number.isInteger(targetId)) {
      return
    }

    lastEventIdRef.current = eventId

    const victimGroup = scene.getObjectByName(`player-actor-${targetId}`)
    if (victimGroup) {
      victimGroup.visible = false
      hiddenPlayersRef.current.add(targetId)
    }

    const pos = positions[targetId]
    if (!pos) {
      return
    }

    setEvents((prev) => {
      if (prev.some((item) => item.eventId === eventId)) {
        return prev
      }
      return [
        ...prev,
        {
          eventId,
          position: [pos[0], pos[1], pos[2]],
          rotationY: Math.atan2(-pos[0], -pos[2]),
        },
      ]
    })
  })

  return (
    <>
      {events.map((event) => (
        <DeathCorpse key={event.eventId} source={source} event={event} />
      ))}
    </>
  )
}
