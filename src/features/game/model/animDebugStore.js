import { create } from 'zustand'

export const ANIM_DEBUG_FILES = [
  { label: 'Тест анимация', url: '/models/maf/test-bones-animation.fbx' },
  { label: 'Смерть', url: '/models/maf/dying.fbx' },
  { label: 'Основной idle', url: '/models/maf/anim.fbx' },
]

export const useAnimDebugStore = create((set, get) => ({
  enabled: false,
  playbackSpeed: 1,
  playerClips: {},
  availableClips: [],
  animClips: [],

  setEnabled: (enabled) => set({ enabled }),

  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),

  setPlayerClip: (playerId, clipName) => {
    const { playerClips } = get()
    set({ playerClips: { ...playerClips, [playerId]: clipName } })
  },

  clearPlayerClip: (playerId) => {
    const playerClips = { ...get().playerClips }
    delete playerClips[playerId]
    set({ playerClips })
  },

  resetAllClips: () => set({ playerClips: {} }),

  setAvailableClips: (availableClips) => set({ availableClips }),

  setAnimClips: (animClips) => set({ animClips }),
}))