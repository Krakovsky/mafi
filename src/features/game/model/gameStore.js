import { create } from 'zustand'
import { PHASE_TEXT, PLAYER_COUNT, ROLE_SET } from './constants'

function buildPlayers() {
  return Array.from({ length: PLAYER_COUNT }, (_, id) => ({
    id,
    name: '',
    number: id + 1,
    webcamUrl: '',
    role: 'civilian',
    alive: true,
  }))
}

function evaluateWinner(players) {
  const alive = players.filter((player) => player.alive)
  const mafiaCount = alive.filter((player) => player.role === 'mafia').length
  const civilianCount = alive.length - mafiaCount

  if (mafiaCount === 0) {
    return 'Мирные жители победили'
  }

  if (mafiaCount >= civilianCount) {
    return 'Мафия победила'
  }

  return null
}

export const useGameStore = create((set, get) => ({
  phase: 'day',
  round: 1,
  players: buildPlayers(),
  pendingNightResult: null,
  speechFocusPlayerId: null,
  speechFocusEventId: 0,
  roleRevealActive: false,
  roleRevealIndex: 0,
  roleRevealCardRevealed: false,
  roleRevealEventId: 0,
  winner: null,
  gameStarted: false,
  gameStartedEventId: 0,
  log: ['Игра началась. Город просыпается.'],
  animActive: false,
  animIdleAssignments: {},
  animOverrides: {},
  animPlaybackSpeed: 1,

  resetGame: () => {
    set({
      phase: 'night',
      round: 1,
      players: buildPlayers(),
      pendingNightResult: null,
      speechFocusPlayerId: null,
      speechFocusEventId: 0,
      roleRevealActive: false,
      roleRevealIndex: 0,
      roleRevealCardRevealed: false,
      roleRevealEventId: 0,
      winner: null,
      gameStarted: false,
      gameStartedEventId: 0,
      log: ['Новая партия началась. Город засыпает.'],
      animActive: false,
      animIdleAssignments: {},
      animOverrides: {},
      animPlaybackSpeed: 1,
    })
  },

  setSpeechFocusPlayerId: (playerId) => {
    const { players, speechFocusEventId } = get()
    if (playerId === null || playerId === undefined || playerId === '') {
      set({ speechFocusPlayerId: null, speechFocusEventId: speechFocusEventId + 1 })
      return
    }

    const numericPlayerId = Number(playerId)
    const target = players.find((player) => player.id === numericPlayerId && player.alive)
    set({
      speechFocusPlayerId: target ? numericPlayerId : null,
      speechFocusEventId: speechFocusEventId + 1,
    })
  },

  startGame: () => {
    const { gameStartedEventId } = get()
    set({ gameStarted: true, gameStartedEventId: gameStartedEventId + 1 })
  },

  startRoleRevealSequence: () => {
    const { phase, roleRevealEventId } = get()
    if (phase !== 'night') return
    set({
      roleRevealActive: true,
      roleRevealIndex: 0,
      roleRevealCardRevealed: false,
      roleRevealEventId: roleRevealEventId + 1,
    })
  },

  revealCurrentCard: () => {
    set({ roleRevealCardRevealed: true })
  },

  setRevealPlayerRole: (role) => {
    const { roleRevealIndex, players } = get()
    const player = players[roleRevealIndex]
    if (!player) return
    if (player.role === role) return
    const updatedPlayers = players.map((p) => (p.id === player.id ? { ...p, role } : p))
    set({ players: updatedPlayers })
  },

  nextRoleReveal: () => {
    const { roleRevealIndex, roleRevealEventId, players } = get()
    const nextIndex = roleRevealIndex + 1
    if (nextIndex >= players.length) return
    set({
      roleRevealIndex: nextIndex,
      roleRevealCardRevealed: false,
      roleRevealEventId: roleRevealEventId + 1,
    })
  },

  endRoleRevealSequence: () => {
    const { roleRevealEventId } = get()
    set({
      roleRevealActive: false,
      roleRevealIndex: 0,
      roleRevealCardRevealed: false,
      roleRevealEventId: roleRevealEventId + 1,
    })
  },

  applyClassicRoles: () => {
    const randomized = [...ROLE_SET]
    for (let i = randomized.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[randomized[i], randomized[j]] = [randomized[j], randomized[i]]
    }

    const { players, log } = get()
    const updatedPlayers = players.map((player) => ({ ...player, role: randomized[player.id] }))
    set({ players: updatedPlayers, winner: null, log: [...log, 'Ведущий назначил роли по шаблону 2/1/1/6.'] })
  },

  setPhase: (phase) => {
    const {
      log,
      players,
      pendingNightResult,
      speechFocusPlayerId,
      round,
      winner,
    } = get()

    if (phase === 'day' && pendingNightResult && !winner) {
      const { targetId, saved, sheriffCheckId } = pendingNightResult
      const updatedPlayers = players.map((player) => {
        if (!saved && player.id === targetId) {
          return { ...player, alive: false }
        }
        return player
      })

      const sheriffCheck =
        sheriffCheckId === '' || sheriffCheckId === null || sheriffCheckId === undefined
          ? null
          : updatedPlayers.find((player) => player.id === sheriffCheckId)

      const lines = []
      if (saved) {
        lines.push(`Доктор спас Игрока ${targetId + 1}. Выстрел сорван.`)
      } else {
        lines.push(`Игрок ${targetId + 1} выбыл после ночного выстрела.`)
      }

      if (sheriffCheck) {
        const verdict = sheriffCheck.role === 'mafia' ? 'мафия' : 'не мафия'
        lines.push(`Шериф проверил Игрока ${sheriffCheck.id + 1}: ${verdict}.`)
      }

      const winnerState = evaluateWinner(updatedPlayers)

      set({
        phase: winnerState ? 'ended' : 'day',
        players: updatedPlayers,
        pendingNightResult: null,
        speechFocusPlayerId: updatedPlayers.some((player) => player.id === speechFocusPlayerId && player.alive)
          ? speechFocusPlayerId
          : null,
        winner: winnerState,
        log: [
          ...log,
          `Фаза изменена вручную: ${PHASE_TEXT.day}.`,
          ...lines,
          winnerState ? `Итог: ${winnerState}.` : 'Город просыпается и обсуждает.',
        ],
      })
      return
    }

    set({ phase, winner: phase === 'ended' ? get().winner : null, log: [...log, `Фаза изменена вручную: ${PHASE_TEXT[phase]}.`] })
  },

  setRound: (round) => {
    const safeRound = Number.isFinite(round) ? Math.max(1, Math.floor(round)) : 1
    set({ round: safeRound })
  },

  setPlayerRole: (playerId, role) => {
    const { players, log } = get()
    const updatedPlayers = players.map((player) => (player.id === playerId ? { ...player, role } : player))
    set({ players: updatedPlayers, winner: null, log: [...log, `Игроку ${playerId + 1} назначена роль ${role}.`] })
  },

  setPlayerAlive: (playerId, alive) => {
    const { players, speechFocusPlayerId, log } = get()
    const updatedPlayers = players.map((player) => (player.id === playerId ? { ...player, alive } : player))
    const winnerState = evaluateWinner(updatedPlayers)
    const focusedStillAlive = updatedPlayers.some((player) => player.id === speechFocusPlayerId && player.alive)
    const player = players.find((p) => p.id === playerId)
    const logLine = alive
      ? `Игрок ${playerId + 1} возвращён в игру.`
      : `Игрок ${playerId + 1}${player && player.name ? ` (${player.name})` : ''} выбыл из игры.`
    set({
      players: updatedPlayers,
      speechFocusPlayerId: focusedStillAlive ? speechFocusPlayerId : null,
      winner: winnerState,
      phase: winnerState ? 'ended' : get().phase,
      log: [...log, logLine],
    })
  },

  setPlayerName: (playerId, name) => {
    const { players, log } = get()
    const player = players.find((p) => p.id === playerId)
    const updatedPlayers = players.map((player) => (player.id === playerId ? { ...player, name } : player))
    set({
      players: updatedPlayers,
      log: [...log, `Игроку ${playerId + 1}${player && player.name ? ` (${player.name})` : ''} задано имя: ${name}`],
    })
  },

  setPlayerNumber: (playerId, number) => {
    const { players, log } = get()
    const safeNumber = Number.isFinite(number) ? Math.max(1, Math.floor(number)) : 1
    const player = players.find((p) => p.id === playerId)
    const updatedPlayers = players.map((player) => (player.id === playerId ? { ...player, number: safeNumber } : player))
    set({
      players: updatedPlayers,
      log: [...log, `Игроку ${playerId + 1}${player && player.name ? ` (${player.name})` : ''} изменён номер на ${safeNumber}`],
    })
  },

  setPlayerWebcamUrl: (playerId, webcamUrl) => {
    const { players, log } = get()
    const player = players.find((p) => p.id === playerId)
    const updatedPlayers = players.map((player) => (player.id === playerId ? { ...player, webcamUrl } : player))
    set({
      players: updatedPlayers,
      log: [...log, `Игроку ${playerId + 1}${player && player.name ? ` (${player.name})` : ''} установлен URL веб-камеры: ${webcamUrl}`],
    })
  },

  runNightManual: ({ targetId, saved, sheriffCheckId }) => {
    const { phase, players, speechFocusPlayerId, winner, round, log } = get()
    if (phase !== 'night' || winner) {
      return { canAnimate: false, error: 'Нельзя провести ночь в текущей фазе.' }
    }

    const target = players.find((player) => player.id === targetId)
    if (!target || !target.alive) {
      return { canAnimate: false, error: 'Выберите живую цель для ночи.' }
    }

    set({
      pendingNightResult: {
        targetId,
        saved,
        sheriffCheckId: sheriffCheckId ?? null,
        round,
      },
      speechFocusPlayerId,
      phase: 'night',
      winner,
      log: [...log, `Раунд ${round}. Ночью мафия выбрала Игрока ${targetId + 1}. Ожидание наступления дня.`],
    })

    return {
      canAnimate: false,
      targetId,
    }
  },

  runDayVoteManual: (targetId) => {
    const { phase, players, speechFocusPlayerId, log, round, winner } = get()
    if (phase !== 'day' || winner) {
      return
    }

    const votedOut = players.find((player) => player.id === targetId)
    if (!votedOut || !votedOut.alive) {
      return
    }

    const updatedPlayers = players.map((player) => (player.id === votedOut.id ? { ...player, alive: false } : player))
    const winnerState = evaluateWinner(updatedPlayers)

    set({
      players: updatedPlayers,
      speechFocusPlayerId: updatedPlayers.some((player) => player.id === speechFocusPlayerId && player.alive)
        ? speechFocusPlayerId
        : null,
      phase: winnerState ? 'ended' : 'night',
      round: winnerState ? round : round + 1,
      winner: winnerState,
      log: [
        ...log,
        `Днем город проголосовал против Игрока ${votedOut.id + 1}.`,
        winnerState ? `Итог: ${winnerState}.` : 'Город засыпает. Начинается следующая ночь.',
      ],
    })
  },

  addLogLine: (line) => {
    const { log } = get()
    if (!line.trim()) {
      return
    }
    set({ log: [...log, line.trim()] })
  },

  setAnimActive: (animActive) => set({ animActive }),

  setAnimIdleAssignments: (animIdleAssignments) => set({ animIdleAssignments }),
  setAnimOverrides: (animOverrides) => set({ animOverrides }),
  setAnimPlaybackSpeed: (animPlaybackSpeed) => set({ animPlaybackSpeed }),

  applyExternalState: (snapshot) => {
    if (!snapshot || !Array.isArray(snapshot.players)) {
      return
    }

    const current = get()
    const patch = {}
    let hasChanges = false

    if (snapshot.phase !== current.phase) { patch.phase = snapshot.phase; hasChanges = true }
    if (snapshot.round !== current.round) { patch.round = snapshot.round; hasChanges = true }
    if ((snapshot.pendingNightResult ?? null) !== (current.pendingNightResult ?? null)) { patch.pendingNightResult = snapshot.pendingNightResult ?? null; hasChanges = true }
    if ((snapshot.speechFocusPlayerId ?? null) !== current.speechFocusPlayerId) { patch.speechFocusPlayerId = snapshot.speechFocusPlayerId ?? null; hasChanges = true }
    if ((snapshot.speechFocusEventId ?? 0) !== current.speechFocusEventId) { patch.speechFocusEventId = snapshot.speechFocusEventId ?? 0; hasChanges = true }
    if ((snapshot.roleRevealActive ?? false) !== current.roleRevealActive) { patch.roleRevealActive = snapshot.roleRevealActive ?? false; hasChanges = true }
    if ((snapshot.roleRevealIndex ?? 0) !== current.roleRevealIndex) { patch.roleRevealIndex = snapshot.roleRevealIndex ?? 0; hasChanges = true }
    if ((snapshot.roleRevealCardRevealed ?? false) !== current.roleRevealCardRevealed) { patch.roleRevealCardRevealed = snapshot.roleRevealCardRevealed ?? false; hasChanges = true }
    if ((snapshot.roleRevealEventId ?? 0) !== current.roleRevealEventId) { patch.roleRevealEventId = snapshot.roleRevealEventId ?? 0; hasChanges = true }
    if (snapshot.winner !== current.winner) { patch.winner = snapshot.winner; hasChanges = true }
    if ((snapshot.gameStarted ?? false) !== current.gameStarted) { patch.gameStarted = snapshot.gameStarted ?? false; hasChanges = true }
    if ((snapshot.gameStartedEventId ?? 0) !== current.gameStartedEventId) { patch.gameStartedEventId = snapshot.gameStartedEventId ?? 0; hasChanges = true }
    if ((snapshot.animActive ?? false) !== current.animActive) { patch.animActive = snapshot.animActive ?? false; hasChanges = true }
    {
      const incomingAnim = snapshot.animIdleAssignments ?? {}
      const currentAnim = current.animIdleAssignments ?? {}
      if (JSON.stringify(incomingAnim) !== JSON.stringify(currentAnim)) {
        patch.animIdleAssignments = incomingAnim
        hasChanges = true
      }
    }
    {
      const incomingOvr = snapshot.animOverrides ?? {}
      const currentOvr = current.animOverrides ?? {}
      if (JSON.stringify(incomingOvr) !== JSON.stringify(currentOvr)) {
        patch.animOverrides = incomingOvr
        hasChanges = true
      }
    }
    if ((snapshot.animPlaybackSpeed ?? 1) !== current.animPlaybackSpeed) { patch.animPlaybackSpeed = snapshot.animPlaybackSpeed ?? 1; hasChanges = true }

    const incomingLog = Array.isArray(snapshot.log) ? snapshot.log : []
    if (incomingLog.length !== current.log.length || incomingLog[incomingLog.length - 1] !== current.log[current.log.length - 1]) {
      patch.log = incomingLog
      hasChanges = true
    }

    const playersChanged = snapshot.players.length !== current.players.length ||
      snapshot.players.some((p, i) => {
        const c = current.players[i]
        return !c || p.id !== c.id || p.alive !== c.alive || p.role !== c.role ||
          p.name !== c.name || p.number !== c.number || p.webcamUrl !== c.webcamUrl
      })
    if (playersChanged) {
      patch.players = snapshot.players.map((p, i) => {
        const c = current.players[i]
        if (c && p.id === c.id && p.alive === c.alive && p.role === c.role &&
            p.name === c.name && p.number === c.number && p.webcamUrl === c.webcamUrl) {
          return c
        }
        return p
      })
      hasChanges = true
    }

    if (hasChanges) {
      set(patch)
    }
  },

  exportSnapshot: () => {
    const { phase, round, players, pendingNightResult, speechFocusPlayerId, speechFocusEventId, roleRevealActive, roleRevealIndex, roleRevealCardRevealed, roleRevealEventId, winner, gameStarted, gameStartedEventId, log, animActive, animIdleAssignments, animOverrides, animPlaybackSpeed } = get()
    return { phase, round, players, pendingNightResult, speechFocusPlayerId, speechFocusEventId, roleRevealActive, roleRevealIndex, roleRevealCardRevealed, roleRevealEventId, winner, gameStarted, gameStartedEventId, log, animActive, animIdleAssignments, animOverrides, animPlaybackSpeed }
  },
}))
