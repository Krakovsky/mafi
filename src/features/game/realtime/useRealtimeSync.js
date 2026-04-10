import { useEffect } from 'react'
import { io } from 'socket.io-client'
import { useGameStore } from '../model/gameStore'

let socketRef = null

function getSocket() {
  const socketUrl = import.meta.env.VITE_SOCKET_URL
  if (!socketUrl) {
    return null
  }

  if (!socketRef) {
    socketRef = io(socketUrl, {
      transports: ['websocket'],
      withCredentials: true,
    })
  }

  return socketRef
}

function createClientId() {
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}`
}

export function useRealtimeSync(isAdmin) {
  useEffect(() => {
    const socket = getSocket()
    if (!socket) {
      return undefined
    }

    const clientId = createClientId()
    const store = useGameStore

    const onServerState = (payload) => {
      if (!payload || payload.sourceClientId === clientId) {
        return
      }

      store.getState().applyExternalState(payload.state)
    }

    socket.on('mafia:state', onServerState)

    if (isAdmin) {
      socket.emit('mafia:state', {
        sourceClientId: clientId,
        state: store.getState().exportSnapshot(),
      })
    }

    const unsubscribe = store.subscribe((state) => {
      if (!isAdmin) {
        return
      }

      socket.emit('mafia:state', {
        sourceClientId: clientId,
        state: {
          phase: state.phase,
          round: state.round,
          players: state.players,
          winner: state.winner,
          log: state.log,
        },
      })
    })

    return () => {
      unsubscribe()
      socket.off('mafia:state', onServerState)
    }
  }, [isAdmin])
}
