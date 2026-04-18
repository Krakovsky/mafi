import { useEffect } from 'react'
import { useAnimStore } from '../model/animStore'
import { useGameStore } from '../model/gameStore'

export function useAnimSync(isAdmin) {
  useEffect(() => {
    if (isAdmin) {
      const unsubAnim = useAnimStore.subscribe((state, prevState) => {
        if (state.idleAssignments !== prevState.idleAssignments ||
            state.animationsActive !== prevState.animationsActive ||
            state.playerOverrides !== prevState.playerOverrides) {
          const gameStore = useGameStore.getState()
          gameStore.setAnimIdleAssignments(state.idleAssignments)
          gameStore.setAnimActive(state.animationsActive)
          gameStore.setAnimOverrides(state.playerOverrides)
        }
      })

      useGameStore.getState().setAnimIdleAssignments(useAnimStore.getState().idleAssignments)
      useGameStore.getState().setAnimActive(useAnimStore.getState().animationsActive)
      useGameStore.getState().setAnimOverrides(useAnimStore.getState().playerOverrides)

      return unsubAnim
    }

    const unsubGame = useGameStore.subscribe((state, prevState) => {
      const animChanged = state.animActive !== prevState.animActive ||
        state.animIdleAssignments !== prevState.animIdleAssignments ||
        state.animOverrides !== prevState.animOverrides

      if (animChanged) {
        useAnimStore.getState().applyAnimSync({
          animationsActive: state.animActive,
          idleAssignments: state.animIdleAssignments,
          playerOverrides: state.animOverrides,
        })
      }
    })

    useAnimStore.getState().applyAnimSync({
      animationsActive: useGameStore.getState().animActive,
      idleAssignments: useGameStore.getState().animIdleAssignments,
      playerOverrides: useGameStore.getState().animOverrides,
    })

    return unsubGame
  }, [isAdmin])
}