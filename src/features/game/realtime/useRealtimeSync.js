import { useEffect } from 'react'
import { io } from 'socket.io-client'
import { useGameStore } from '../model/gameStore'

let socketRef = null
const CHANNEL_NAME = 'mafia:state'

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

function pickState(state) {
  return {
    phase: state.phase,
    round: state.round,
    players: state.players,
    speechFocusPlayerId: state.speechFocusPlayerId,
    speechFocusEventId: state.speechFocusEventId,
    winner: state.winner,
    log: state.log,
  }
}

export function useRealtimeSync(isAdmin) {
  useEffect(() => {
    const socket = getSocket()
    const canUseBroadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window
    const channel = !socket && canUseBroadcast ? new window.BroadcastChannel(CHANNEL_NAME) : null

    if (!socket && !channel) {
      return undefined
    }

    const clientId = createClientId()
    const store = useGameStore
    let isApplyingExternalState = false

    let pendingPayload = null
    let applyQueued = false

    const flushPendingState = () => {
      applyQueued = false
      const stateToApply = pendingPayload
      pendingPayload = null
      if (!stateToApply) return
      isApplyingExternalState = true
      store.getState().applyExternalState(stateToApply)
      isApplyingExternalState = false
    }

    const applyStateFromPayload = (payload) => {
      if (!payload || payload.sourceClientId === clientId || !payload.state) {
        return
      }

      if (payload.targetClientId && payload.targetClientId !== clientId) {
        return
      }

      pendingPayload = payload.state
      if (!applyQueued) {
        applyQueued = true
        requestAnimationFrame(flushPendingState)
      }
    }

    const emitState = (targetClientId = null) => {
      if (!isAdmin) {
        return
      }

      const payload = {
        sourceClientId: clientId,
        targetClientId,
        state: store.getState().exportSnapshot(),
      }

      if (socket) {
        socket.emit('mafia:state', payload)
        return
      }

      if (channel) {
        channel.postMessage({ type: 'mafia:state', ...payload })
      }
    }

    let unsubscribe = () => {}
    let emitScheduled = false

    const scheduleEmit = () => {
      if (emitScheduled) return
      emitScheduled = true
      requestAnimationFrame(() => {
        emitScheduled = false
        if (!isAdmin || isApplyingExternalState) return
        emitState()
      })
    }

    if (socket) {
      const onServerState = (payload) => {
        applyStateFromPayload(payload)
      }

      socket.on('mafia:state', onServerState)

      if (isAdmin) {
        emitState()
      }

      unsubscribe = store.subscribe(() => {
        if (!isAdmin || isApplyingExternalState) {
          return
        }
        scheduleEmit()
      })

      return () => {
        unsubscribe()
        socket.off('mafia:state', onServerState)
      }
    }

    const onChannelMessage = (event) => {
      const payload = event?.data
      if (!payload || typeof payload !== 'object') {
        return
      }

      if (payload.type === 'mafia:state') {
        applyStateFromPayload(payload)
        return
      }

      if (payload.type === 'mafia:request-state' && isAdmin) {
        emitState(payload.sourceClientId ?? null)
      }
    }

    channel.addEventListener('message', onChannelMessage)

    if (isAdmin) {
      emitState()
    } else {
      channel.postMessage({
        type: 'mafia:request-state',
        sourceClientId: clientId,
      })
    }

    unsubscribe = store.subscribe(() => {
      if (!isAdmin || isApplyingExternalState) {
        return
      }
      scheduleEmit()
    })

    return () => {
      unsubscribe()
      channel.removeEventListener('message', onChannelMessage)
      channel.close()
    }
  }, [isAdmin])
}
