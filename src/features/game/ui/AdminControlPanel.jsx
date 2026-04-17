import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PHASE_TEXT, ROLE_OPTIONS } from '../model/constants'
import { useGameStore } from '../model/gameStore'
import '../../../styles/admin-panel.css'

function PlayerCard({ player, onUpdate }) {
  const [editData, setEditData] = useState({
    number: player.number,
    name: player.name,
    role: player.role,
    webcamUrl: player.webcamUrl,
  })
  const [isExpanded, setIsExpanded] = useState(false)

  const isDirty =
    editData.number !== player.number ||
    editData.name !== player.name ||
    editData.role !== player.role ||
    editData.webcamUrl !== player.webcamUrl

  const handleSave = () => {
    onUpdate(player.id, editData)
  }

  const handleReset = () => {
    setEditData({
      number: player.number,
      name: player.name,
      role: player.role,
      webcamUrl: player.webcamUrl,
    })
  }

  return (
    <div className="player-card">
      <div className="player-card-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="player-label">
          №{player.number} {player.name || `Игрок ${player.id + 1}`}
        </span>
        <span className="player-role-badge" data-role={player.role}>
          {player.role}
        </span>
        <span className={`player-status ${player.alive ? 'alive' : 'dead'}`}>
          {player.alive ? 'Жив' : 'Выбыл'}
        </span>
        <span className="expand-icon">{isExpanded ? '▲' : '▼'}</span>
      </div>
      {isExpanded && (
        <div className="player-card-body">
          <label className="field-label">Номер</label>
          <input
            className="field-input"
            type="number"
            min="1"
            value={editData.number}
            onChange={(event) => setEditData({ ...editData, number: Number(event.target.value) })}
          />
          <label className="field-label">Имя</label>
          <input
            className="field-input"
            type="text"
            value={editData.name}
            onChange={(event) => setEditData({ ...editData, name: event.target.value })}
            placeholder="Введите имя"
          />
          <label className="field-label">Роль</label>
          <select
            className="field-input"
            value={editData.role}
            onChange={(event) => setEditData({ ...editData, role: event.target.value })}
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <label className="field-label">URL веб-камеры</label>
          <input
            className="field-input"
            type="text"
            value={editData.webcamUrl}
            onChange={(event) => setEditData({ ...editData, webcamUrl: event.target.value })}
            placeholder="URL веб-камеры"
          />
          <div className="button-row">
            <button type="button" className="btn action" onClick={handleSave} disabled={!isDirty}>
              Сохранить
            </button>
            {isDirty && (
              <button type="button" className="btn ghost" onClick={handleReset}>
                Отмена
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function WebcamRow({ player, onUpdate }) {
  const [editUrl, setEditUrl] = useState(player.webcamUrl)

  const isDirty = editUrl !== player.webcamUrl

  return (
    <div className="player-row webcam-row">
      <span className="player-label">№{player.number} {player.name || `Игрок ${player.id + 1}`}</span>
      <input
        className="field-input webcam-url-input"
        type="text"
        value={editUrl}
        onChange={(event) => setEditUrl(event.target.value)}
        placeholder="URL веб-камеры"
      />
      <button
        type="button"
        className="btn action btn-small"
        disabled={!isDirty}
        onClick={() => onUpdate(player.id, { webcamUrl: editUrl })}
      >
        ✓
      </button>
    </div>
  )
}

export function AdminControlPanel({ assassinationRef }) {
  const phase = useGameStore((state) => state.phase)
  const round = useGameStore((state) => state.round)
  const players = useGameStore((state) => state.players)
  const winner = useGameStore((state) => state.winner)
  const log = useGameStore((state) => state.log)
  const resetGame = useGameStore((state) => state.resetGame)
  const applyClassicRoles = useGameStore((state) => state.applyClassicRoles)
  const setPhase = useGameStore((state) => state.setPhase)
  const setRound = useGameStore((state) => state.setRound)
  const setPlayerRole = useGameStore((state) => state.setPlayerRole)
  const setPlayerName = useGameStore((state) => state.setPlayerName)
  const setPlayerNumber = useGameStore((state) => state.setPlayerNumber)
  const setPlayerWebcamUrl = useGameStore((state) => state.setPlayerWebcamUrl)
  const speechFocusPlayerId = useGameStore((state) => state.speechFocusPlayerId)
  const setSpeechFocusPlayerId = useGameStore((state) => state.setSpeechFocusPlayerId)
  const runNightManual = useGameStore((state) => state.runNightManual)
  const runDayVoteManual = useGameStore((state) => state.runDayVoteManual)
  const addLogLine = useGameStore((state) => state.addLogLine)

  const [nightTargetId, setNightTargetId] = useState('')
  const [doctorSaved, setDoctorSaved] = useState(false)
  const [sheriffCheckId, setSheriffCheckId] = useState('')
  const [dayVoteTargetId, setDayVoteTargetId] = useState('')
  const [speechTargetId, setSpeechTargetId] = useState('')
  const [manualLine, setManualLine] = useState('')
  const [showPlayers, setShowPlayers] = useState(false)
  const [showWebcams, setShowWebcams] = useState(false)
  const frameRef = useRef(null)
  const timeoutRef = useRef(null)

  const handlePlayerUpdate = useCallback(
    (playerId, data) => {
      if (data.number !== undefined) setPlayerNumber(playerId, data.number)
      if (data.name !== undefined) setPlayerName(playerId, data.name)
      if (data.role !== undefined) setPlayerRole(playerId, data.role)
      if (data.webcamUrl !== undefined) setPlayerWebcamUrl(playerId, data.webcamUrl)
    },
    [setPlayerNumber, setPlayerName, setPlayerRole, setPlayerWebcamUrl]
  )

  const aliveCount = players.filter((player) => player.alive).length
  const aliveMafia = players.filter((player) => player.alive && player.role === 'mafia').length

  const alivePlayers = useMemo(() => players.filter((player) => player.alive), [players])
  const effectiveNightTargetId = alivePlayers.some((player) => player.id === Number(nightTargetId)) ? nightTargetId : ''
  const effectiveDayVoteTargetId = alivePlayers.some((player) => player.id === Number(dayVoteTargetId)) ? dayVoteTargetId : ''
  const effectiveSheriffCheckId = alivePlayers.some((player) => player.id === Number(sheriffCheckId)) ? sheriffCheckId : ''
  const effectiveSpeechTargetId = alivePlayers.some((player) => player.id === Number(speechTargetId)) ? speechTargetId : ''

  useEffect(() => {
    if (speechFocusPlayerId === null || speechFocusPlayerId === undefined) {
      setSpeechTargetId('')
      return
    }

    setSpeechTargetId(String(speechFocusPlayerId))
  }, [speechFocusPlayerId])

  const handleNight = useCallback(() => {
    if (phase !== 'night') {
      return
    }

    const targetId = Number(effectiveNightTargetId)
    if (!Number.isInteger(targetId)) {
      return
    }

    const sheriffId = effectiveSheriffCheckId === '' ? null : Number(effectiveSheriffCheckId)
    const result = runNightManual({ targetId, saved: doctorSaved, sheriffCheckId: sheriffId })

    if (!result || result.error) {
      return
    }
    setNightTargetId('')
    setDoctorSaved(false)
    setSheriffCheckId('')
    assassinationRef.current = null
  }, [doctorSaved, effectiveNightTargetId, effectiveSheriffCheckId, assassinationRef, phase, runNightManual])

  const handleDayVote = useCallback(() => {
    if (phase !== 'day') {
      return
    }

    const targetId = Number(effectiveDayVoteTargetId)
    if (!Number.isInteger(targetId)) {
      return
    }

    runDayVoteManual(targetId)
    setDayVoteTargetId('')
  }, [effectiveDayVoteTargetId, phase, runDayVoteManual])

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <section className="admin-panel">
      <h1 className="admin-title">Mafia: Host Console</h1>

      <div className="admin-meta">
        <span>Раунд {round}</span>
        <span>Фаза: {PHASE_TEXT[phase]}</span>
        <span>В игре: {aliveCount}</span>
        <span>Мафия в игре: {aliveMafia}</span>
      </div>

      {winner ? <p className="winner-box">{winner}</p> : null}

      <h2 className="section-title">Управление фазой</h2>
      <div className="button-row">
        <button type="button" className="btn ghost" onClick={() => setPhase('night')}>
          Ночь
        </button>
        <button type="button" className="btn ghost" onClick={() => setPhase('day')}>
          День
        </button>
        <button type="button" className="btn ghost" onClick={() => setPhase('ended')}>
          Завершить
        </button>
      </div>

      <label className="field-label" htmlFor="round-input">Раунд</label>
      <input
        className="field-input"
        id="round-input"
        type="number"
        min="1"
        value={round}
        onChange={(event) => setRound(Number(event.target.value))}
      />

      <h2 className="section-title">Ночь (ручной ввод)</h2>
      <label className="field-label" htmlFor="night-target">Кого мафия убивает</label>
      <select
        className="field-input"
        id="night-target"
        value={effectiveNightTargetId}
        onChange={(event) => setNightTargetId(event.target.value)}
      >
        <option value="">Выберите цель</option>
        {alivePlayers.map((player) => (
          <option key={`night-${player.id}`} value={player.id}>
            Игрок {player.id + 1} ({player.role})
          </option>
        ))}
      </select>

      <div className="checkbox-row">
        <input
          id="doctor-saved"
          type="checkbox"
          checked={doctorSaved}
          onChange={(event) => setDoctorSaved(event.target.checked)}
        />
        <label htmlFor="doctor-saved">Доктор спас цель</label>
      </div>

      <label className="field-label" htmlFor="sheriff-check">Проверка комиссара</label>
      <select
        className="field-input"
        id="sheriff-check"
        value={effectiveSheriffCheckId}
        onChange={(event) => setSheriffCheckId(event.target.value)}
      >
        <option value="">Без проверки</option>
        {alivePlayers.map((player) => (
          <option key={`check-${player.id}`} value={player.id}>
            Игрок {player.id + 1}
          </option>
        ))}
      </select>

      <div className="button-row">
        <button type="button" className="btn action" onClick={handleNight} disabled={phase !== 'night' || Boolean(winner)}>
          Применить ночь
        </button>
      </div>

      <h2 className="section-title">День (ручное голосование)</h2>
      <label className="field-label" htmlFor="day-vote">Кого выводит голосование</label>
      <select
        className="field-input"
        id="day-vote"
        value={effectiveDayVoteTargetId}
        onChange={(event) => setDayVoteTargetId(event.target.value)}
      >
        <option value="">Выберите игрока</option>
        {alivePlayers.map((player) => (
          <option key={`vote-${player.id}`} value={player.id}>
            Игрок {player.id + 1} ({player.role})
          </option>
        ))}
      </select>

      <div className="button-row">
        <button type="button" className="btn action" onClick={handleDayVote} disabled={phase !== 'day' || Boolean(winner)}>
          Применить голосование
        </button>
        <button type="button" className="btn ghost" onClick={applyClassicRoles}>
          Авто роли 2/1/1/6
        </button>
        <button type="button" className="btn ghost" onClick={resetGame}>
          Новая партия
        </button>
      </div>

      <h2 className="section-title">Спич-фокус камеры</h2>
      <label className="field-label" htmlFor="speech-target">Игрок для спича</label>
      <select
        className="field-input"
        id="speech-target"
        value={effectiveSpeechTargetId}
        onChange={(event) => setSpeechTargetId(event.target.value)}
      >
        <option value="">Выберите игрока</option>
        {alivePlayers.map((player) => (
          <option key={`speech-${player.id}`} value={player.id}>
            №{player.number} {player.name || `Игрок ${player.id + 1}`}
          </option>
        ))}
      </select>

      <div className="button-row">
        {speechFocusPlayerId !== null && speechFocusPlayerId !== undefined && alivePlayers.length > 1 && (
          <>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                const currentIndex = alivePlayers.findIndex((p) => p.id === speechFocusPlayerId)
                const prevIndex = (currentIndex - 1 + alivePlayers.length) % alivePlayers.length
                setSpeechFocusPlayerId(alivePlayers[prevIndex].id)
              }}
            >
              ◀ Пред
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                const currentIndex = alivePlayers.findIndex((p) => p.id === speechFocusPlayerId)
                const nextIndex = (currentIndex + 1) % alivePlayers.length
                setSpeechFocusPlayerId(alivePlayers[nextIndex].id)
              }}
            >
              След ▶
            </button>
          </>
        )}
        <button
          type="button"
          className="btn action"
          disabled={!effectiveSpeechTargetId}
          onClick={() => setSpeechFocusPlayerId(Number(effectiveSpeechTargetId))}
        >
          Фокус на спикере
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            setSpeechFocusPlayerId(null)
            setSpeechTargetId('')
          }}
        >
          Сбросить фокус
        </button>
      </div>

      <h2 className="section-title collapsible" onClick={() => setShowPlayers(!showPlayers)}>
        Игроки и роли {showPlayers ? '▲' : '▼'}
      </h2>
      {showPlayers && (
        <div className="players-list">
          {players.map((player) => (
            <PlayerCard key={`admin-${player.id}`} player={player} onUpdate={handlePlayerUpdate} />
          ))}
        </div>
      )}

      <h2 className="section-title collapsible" onClick={() => setShowWebcams(!showWebcams)}>
        Веб-камеры {showWebcams ? '▲' : '▼'}
      </h2>
      {showWebcams && (
        <div className="players-list">
          {players.map((player) => (
            <WebcamRow key={`webcam-${player.id}`} player={player} onUpdate={handlePlayerUpdate} />
          ))}
        </div>
      )}

      <h2 className="section-title">Ручной лог</h2>
      <input
        className="field-input"
        type="text"
        value={manualLine}
        onChange={(event) => setManualLine(event.target.value)}
        placeholder="Добавить заметку ведущего"
      />
      <div className="button-row">
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            addLogLine(manualLine)
            setManualLine('')
          }}
        >
          Добавить в лог
        </button>
      </div>

      <h2 className="section-title">События</h2>
      <ul className="log-list">
        {log.slice(-8).map((entry, index) => (
          <li key={`${index}-${entry}`}>{entry}</li>
        ))}
      </ul>
    </section>
  )
}
