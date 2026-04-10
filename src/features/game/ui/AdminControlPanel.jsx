import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PHASE_TEXT, ROLE_OPTIONS } from '../model/constants'
import { useGameStore } from '../model/gameStore'
import '../../../styles/admin-panel.css'

export function AdminControlPanel({ onAssassinationChange }) {
  const {
    phase,
    round,
    players,
    winner,
    log,
    resetGame,
    applyClassicRoles,
    setPhase,
    setRound,
    setPlayerRole,
    setPlayerAlive,
    runNightManual,
    runDayVoteManual,
    addLogLine,
  } = useGameStore()

  const [nightTargetId, setNightTargetId] = useState('')
  const [doctorSaved, setDoctorSaved] = useState(false)
  const [sheriffCheckId, setSheriffCheckId] = useState('')
  const [dayVoteTargetId, setDayVoteTargetId] = useState('')
  const [manualLine, setManualLine] = useState('')
  const frameRef = useRef(null)
  const timeoutRef = useRef(null)

  const aliveCount = players.filter((player) => player.alive).length
  const aliveMafia = players.filter((player) => player.alive && player.role === 'mafia').length

  const alivePlayers = useMemo(() => players.filter((player) => player.alive), [players])
  const effectiveNightTargetId = alivePlayers.some((player) => player.id === Number(nightTargetId)) ? nightTargetId : ''
  const effectiveDayVoteTargetId = alivePlayers.some((player) => player.id === Number(dayVoteTargetId)) ? dayVoteTargetId : ''
  const effectiveSheriffCheckId = alivePlayers.some((player) => player.id === Number(sheriffCheckId)) ? sheriffCheckId : ''

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

    if (!result.canAnimate) {
      setNightTargetId('')
      setDoctorSaved(false)
      setSheriffCheckId('')
      onAssassinationChange(null)
      return
    }

    const duration = 2500
    const startedAt = performance.now()

    const animate = (currentTime) => {
      const progress = Math.min((currentTime - startedAt) / duration, 1)
      onAssassinationChange({ targetId: result.targetId, progress })

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        timeoutRef.current = window.setTimeout(() => {
          onAssassinationChange(null)
          setNightTargetId('')
          setDoctorSaved(false)
          setSheriffCheckId('')
        }, 260)
      }
    }

    frameRef.current = requestAnimationFrame(animate)
  }, [doctorSaved, effectiveNightTargetId, effectiveSheriffCheckId, onAssassinationChange, phase, runNightManual])

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

      <h2 className="section-title">Игроки и роли</h2>
      <div className="players-list">
        {players.map((player) => (
          <div className="player-row" key={`admin-${player.id}`}>
            <span className="player-label">Игрок {player.id + 1}</span>
            <select className="field-input" value={player.role} onChange={(event) => setPlayerRole(player.id, event.target.value)}>
              {ROLE_OPTIONS.map((role) => (
                <option key={`${player.id}-${role}`} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <button type="button" className="btn ghost" onClick={() => setPlayerAlive(player.id, !player.alive)}>
              {player.alive ? 'Жив' : 'Выбыл'}
            </button>
          </div>
        ))}
      </div>

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
