import { create } from 'zustand'
import { IDLE_POOL_IDS } from './animRegistry'
import { PLAYER_COUNT } from './constants'

function pickRandomIdleId(exclude) {
  const pool = exclude ? IDLE_POOL_IDS.filter((id) => id !== exclude) : IDLE_POOL_IDS
  if (pool.length === 0) return IDLE_POOL_IDS[0]
  return pool[Math.floor(Math.random() * pool.length)]
}

function generateIdleAssignments() {
  const assignments = {}
  for (let i = 0; i < PLAYER_COUNT; i++) {
    assignments[i] = pickRandomIdleId()
  }
  return assignments
}

export const useAnimStore = create((set, get) => ({
  animationsActive: false,
  playbackSpeed: 1,
  playerOverrides: {},

  idleRotationEnabled: true,
  idleRotationMinSec: 8,
  idleRotationMaxSec: 22,
  idleAssignments: {},
  pendingIdleSwitch: {},

  availableClips: [],
  animClipsMap: {},

  startAnimations: () => {
    const { idleAssignments } = get()
    if (Object.keys(idleAssignments).length > 0) {
      set({ animationsActive: true })
      return
    }
    set({
      animationsActive: true,
      idleAssignments: generateIdleAssignments(),
    })
  },

  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),

  setPlayerOverride: (playerId, clipId) => {
    const { playerOverrides, pendingIdleSwitch } = get()
    const nextPending = { ...pendingIdleSwitch }
    delete nextPending[playerId]
    set({
      playerOverrides: { ...playerOverrides, [playerId]: clipId },
      pendingIdleSwitch: nextPending,
    })
  },

  clearPlayerOverride: (playerId) => {
    const { playerOverrides } = get()
    const next = { ...playerOverrides }
    delete next[playerId]
    set({ playerOverrides: next })
  },

  resetAllOverrides: () => set({ playerOverrides: {} }),

  setIdleRotationEnabled: (idleRotationEnabled) => {
    if (!idleRotationEnabled) {
      set({ idleRotationEnabled, pendingIdleSwitch: {} })
    } else {
      set({ idleRotationEnabled })
    }
  },

  setIdleRotationMinSec: (idleRotationMinSec) => set({ idleRotationMinSec }),
  setIdleRotationMaxSec: (idleRotationMaxSec) => set({ idleRotationMaxSec }),

  markPendingSwitch: (playerId) => {
    const { pendingIdleSwitch } = get()
    if (pendingIdleSwitch[playerId]) return
    set({ pendingIdleSwitch: { ...pendingIdleSwitch, [playerId]: true } })
  },

  assignNewIdle: (playerId) => {
    const { idleAssignments, pendingIdleSwitch } = get()
    const currentIdle = idleAssignments[playerId]
    const newIdle = pickRandomIdleId(currentIdle)
    const nextPending = { ...pendingIdleSwitch }
    delete nextPending[playerId]
    set({
      idleAssignments: { ...idleAssignments, [playerId]: newIdle },
      pendingIdleSwitch: nextPending,
    })
  },

  applyAnimSync: (sync) => {
    if (!sync || typeof sync !== 'object') return

    const patch = {}
    if (typeof sync.animationsActive === 'boolean') {
      patch.animationsActive = sync.animationsActive
    }
    if (sync.idleAssignments && typeof sync.idleAssignments === 'object') {
      const current = get().idleAssignments
      const incoming = sync.idleAssignments
      const changed = Object.keys(incoming).length !== Object.keys(current).length ||
        Object.entries(incoming).some(([k, v]) => current[k] !== v)
      if (changed) {
        patch.idleAssignments = { ...incoming }
      }
    }
    if (sync.playerOverrides && typeof sync.playerOverrides === 'object') {
      const current = get().playerOverrides
      const incoming = sync.playerOverrides
      const changed = Object.keys(incoming).length !== Object.keys(current).length ||
        Object.entries(incoming).some(([k, v]) => current[k] !== v)
      if (changed) {
        patch.playerOverrides = { ...incoming }
      }
    }
    if (typeof sync.playbackSpeed === 'number' && sync.playbackSpeed !== get().playbackSpeed) {
      patch.playbackSpeed = sync.playbackSpeed
    }

    if (Object.keys(patch).length > 0) {
      set(patch)
    }
  },

  setAvailableClips: (availableClips) => set({ availableClips }),
  setAnimClipsMap: (animClipsMap) => set({ animClipsMap }),
}))