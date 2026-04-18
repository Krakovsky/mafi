import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimStore } from '../../game/model/animStore'
import { useGameStore } from '../../game/model/gameStore'

export function IdleRotationManager() {
  const timersRef = useRef({})

  useFrame((_, delta) => {
    const state = useAnimStore.getState()
    if (!state.animationsActive || !state.idleRotationEnabled) {
      timersRef.current = {}
      return
    }

    const { idleRotationMinSec, idleRotationMaxSec } = state
    const players = useGameStore.getState().players

    for (let i = 0; i < players.length; i++) {
      if (!players[i].alive) continue
      if (state.playerOverrides[i]) continue
      if (state.pendingIdleSwitch[i]) continue

      if (timersRef.current[i] === undefined) {
        timersRef.current[i] = randomDuration(idleRotationMinSec, idleRotationMaxSec)
      }

      timersRef.current[i] -= delta

      if (timersRef.current[i] <= 0) {
        state.markPendingSwitch(i)
        delete timersRef.current[i]
      }
    }
  })

  return null
}

function randomDuration(min, max) {
  return min + Math.random() * (max - min)
}