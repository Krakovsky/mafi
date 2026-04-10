import { create } from 'zustand'
import { PHASE_TEXT, PLAYER_COUNT, ROLE_SET } from './constants'

function buildPlayers() {
  return Array.from({ length: PLAYER_COUNT }, (_, id) => ({
    id,
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
  winner: null,
  log: ['Игра началась. Город просыпается.'],

  resetGame: () => {
    set({
      phase: 'night',
      round: 1,
      players: buildPlayers(),
      winner: null,
      log: ['Новая партия началась. Город засыпает.'],
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
    const { log } = get()
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
    const { players } = get()
    const updatedPlayers = players.map((player) => (player.id === playerId ? { ...player, alive } : player))
    const winnerState = evaluateWinner(updatedPlayers)
    set({ players: updatedPlayers, winner: winnerState, phase: winnerState ? 'ended' : get().phase })
  },

  runNightManual: ({ targetId, saved, sheriffCheckId }) => {
    const { phase, players, winner, round, log } = get()
    if (phase !== 'night' || winner) {
      return { canAnimate: false, error: 'Нельзя провести ночь в текущей фазе.' }
    }

    const target = players.find((player) => player.id === targetId)
    if (!target || !target.alive) {
      return { canAnimate: false, error: 'Выберите живую цель для ночи.' }
    }

    const sheriffCheck =
      sheriffCheckId === '' || sheriffCheckId === null || sheriffCheckId === undefined
        ? null
        : players.find((player) => player.id === sheriffCheckId && player.alive)

    const updatedPlayers = players.map((player) => {
      if (!saved && player.id === targetId) {
        return { ...player, alive: false }
      }
      return player
    })

    const lines = [`Раунд ${round}. Ночью мафия выбрала Игрока ${targetId + 1}.`]
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
      players: updatedPlayers,
      phase: winnerState ? 'ended' : 'day',
      winner: winnerState,
      log: [...log, ...lines, winnerState ? `Итог: ${winnerState}.` : 'Город просыпается и обсуждает.'],
    })

    return {
      canAnimate: !saved,
      targetId,
    }
  },

  runDayVoteManual: (targetId) => {
    const { phase, players, log, round, winner } = get()
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

  applyExternalState: (snapshot) => {
    if (!snapshot || !Array.isArray(snapshot.players)) {
      return
    }

    set({
      phase: snapshot.phase,
      round: snapshot.round,
      players: snapshot.players,
      winner: snapshot.winner,
      log: Array.isArray(snapshot.log) ? snapshot.log : [],
    })
  },

  exportSnapshot: () => {
    const { phase, round, players, winner, log } = get()
    return { phase, round, players, winner, log }
  },
}))
