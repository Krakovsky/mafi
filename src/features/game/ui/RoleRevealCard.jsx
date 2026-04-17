import { useMemo } from 'react'
import { ROLE_COLOR, ROLE_IMAGE, ROLE_LABEL, ROLE_OPTIONS, ROLE_SET } from '../model/constants'
import { useGameStore } from '../model/gameStore'
import '../../../styles/role-reveal.css'

function useRoleStats(players) {
  return useMemo(() => {
    const used = { mafia: 0, sheriff: 0, doctor: 0, civilian: 0 }
    for (const p of players) {
      if (used[p.role] !== undefined) used[p.role] += 1
    }
    const limits = {}
    for (const r of ROLE_SET) {
      limits[r] = (limits[r] || 0) + 1
    }
    return { used, limits }
  }, [players])
}

export function RoleRevealCard({ isAdmin = false }) {
  const roleRevealActive = useGameStore((s) => s.roleRevealActive)
  const roleRevealIndex = useGameStore((s) => s.roleRevealIndex)
  const roleRevealCardRevealed = useGameStore((s) => s.roleRevealCardRevealed)
  const players = useGameStore((s) => s.players)
  const revealCurrentCard = useGameStore((s) => s.revealCurrentCard)
  const setRevealPlayerRole = useGameStore((s) => s.setRevealPlayerRole)
  const nextRoleReveal = useGameStore((s) => s.nextRoleReveal)
  const endRoleRevealSequence = useGameStore((s) => s.endRoleRevealSequence)

  const { used, limits } = useRoleStats(players)

  if (!roleRevealActive) return null

  const player = players[roleRevealIndex]
  if (!player) return null

  const role = player.role
  const color = ROLE_COLOR[role] || '#7c7f8a'
  const label = ROLE_LABEL[role] || role
  const image = ROLE_IMAGE[role] || ''
  const isLast = roleRevealIndex >= players.length - 1

  const handleCardClick = () => {
    if (isAdmin && !roleRevealCardRevealed) {
      revealCurrentCard()
    }
  }

  return (
    <div className="role-reveal-overlay">
      <div className="role-reveal-player-label">
        №{player.number}{player.name ? ` ${player.name}` : ''}
      </div>

      {isAdmin && !roleRevealCardRevealed && (
        <div className="role-reveal-role-picker">
          <label className="role-reveal-picker-label">Роль:</label>
          <select
            className="role-reveal-select"
            value={role}
            onChange={(e) => setRevealPlayerRole(e.target.value)}
          >
            {ROLE_OPTIONS.map((r) => {
              const lbl = ROLE_LABEL[r] || r
              const remaining = (limits[r] || 0) - (used[r] || 0) + (role === r ? 1 : 0)
              return (
                <option key={r} value={r} disabled={remaining <= 0 && role !== r}>
                  {lbl} ({remaining > 0 ? remaining : 0})
                </option>
              )
            })}
          </select>
        </div>
      )}

      <div
        className={`role-card ${roleRevealCardRevealed ? 'role-card--revealed' : ''}`}
        onClick={handleCardClick}
        style={{ cursor: isAdmin && !roleRevealCardRevealed ? 'pointer' : 'default' }}
      >
        <div className="role-card__inner">
          <div className="role-card__front">
            <div className="role-card__pattern">
              <div className="role-card__question">?</div>
            </div>
            {isAdmin && !roleRevealCardRevealed && (
              <div className="role-card__hint">Нажмите чтобы открыть</div>
            )}
          </div>
          <div className="role-card__back" style={{ '--role-color': color }}>
            {image && (
              <img className="role-card__image" src={image} alt={label} />
            )}
          </div>
        </div>
      </div>

      {isAdmin && roleRevealCardRevealed && (
        <div className="role-reveal-controls">
          {!isLast ? (
            <button
              type="button"
              className="role-reveal-btn"
              onClick={nextRoleReveal}
            >
              Дальше роль ▶
            </button>
          ) : (
            <button
              type="button"
              className="role-reveal-btn role-reveal-btn--finish"
              onClick={endRoleRevealSequence}
            >
              Завершить выдачу
            </button>
          )}
        </div>
      )}
    </div>
  )
}
