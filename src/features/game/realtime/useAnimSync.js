import { useEffect } from 'react'
import { useAnimStore } from '../model/animStore'
import { useGameStore } from '../model/gameStore'

export function useAnimSync(isAdmin) {
  useEffect(() => {
    if (isAdmin) {
      const unsubAnim = useAnimStore.subscribe((state, prevState) => {
        if (state.idleAssignments !== prevState.idleAssignments ||
            state.animationsActive !== prevState.animationsActive ||
            state.playerOverrides !== prevState.playerOverrides ||
            state.playbackSpeed !== prevState.playbackSpeed) {
          const gameStore = useGameStore.getState()
          gameStore.setAnimIdleAssignments(state.idleAssignments)
          gameStore.setAnimActive(state.animationsActive)
          gameStore.setAnimOverrides(state.playerOverrides)
          gameStore.setAnimPlaybackSpeed(state.playbackSpeed)
        }
      })

      useGameStore.getState().setAnimIdleAssignments(useAnimStore.getState().idleAssignments)
      useGameStore.getState().setAnimActive(useAnimStore.getState().animationsActive)
      useGameStore.getState().setAnimOverrides(useAnimStore.getState().playerOverrides)
      useGameStore.getState().setAnimPlaybackSpeed(useAnimStore.getState().playbackSpeed)

      return unsubAnim
    }

    const unsubGame = useGameStore.subscribe((state, prevState) => {
      const animChanged = state.animActive !== prevState.animActive ||
        state.animIdleAssignments !== prevState.animIdleAssignments ||
        state.animOverrides !== prevState.animOverrides ||
        state.animPlaybackSpeed !== prevState.animPlaybackSpeed

      if (animChanged) {
        useAnimStore.getState().applyAnimSync({
          animationsActive: state.animActive,
          idleAssignments: state.animIdleAssignments,
          playerOverrides: state.animOverrides,
          playbackSpeed: state.animPlaybackSpeed,
        })
      }
    })

    useAnimStore.getState().applyAnimSync({
      animationsActive: useGameStore.getState().animActive,
      idleAssignments: useGameStore.getState().animIdleAssignments,
      playerOverrides: useGameStore.getState().animOverrides,
      playbackSpeed: useGameStore.getState().animPlaybackSpeed,
    })

    return unsubGame
  }, [isAdmin])
}