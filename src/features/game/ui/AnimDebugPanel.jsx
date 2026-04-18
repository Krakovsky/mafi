import { useAnimStore } from '../model/animStore'
import { ANIM_CATEGORIES, ANIM_REGISTRY, getLabelForId } from '../model/animRegistry'
import { useGameStore } from '../model/gameStore'
import '../../../styles/anim-debug-panel.css'

export function AnimDebugPanel() {
  const animationsActive = useAnimStore((s) => s.animationsActive)
  const startAnimations = useAnimStore((s) => s.startAnimations)
  const playbackSpeed = useAnimStore((s) => s.playbackSpeed)
  const setPlaybackSpeed = useAnimStore((s) => s.setPlaybackSpeed)
  const playerOverrides = useAnimStore((s) => s.playerOverrides)
  const setPlayerOverride = useAnimStore((s) => s.setPlayerOverride)
  const clearPlayerOverride = useAnimStore((s) => s.clearPlayerOverride)
  const resetAllOverrides = useAnimStore((s) => s.resetAllOverrides)
  const idleRotationEnabled = useAnimStore((s) => s.idleRotationEnabled)
  const setIdleRotationEnabled = useAnimStore((s) => s.setIdleRotationEnabled)
  const idleRotationMinSec = useAnimStore((s) => s.idleRotationMinSec)
  const idleRotationMaxSec = useAnimStore((s) => s.idleRotationMaxSec)
  const setIdleRotationMinSec = useAnimStore((s) => s.setIdleRotationMinSec)
  const setIdleRotationMaxSec = useAnimStore((s) => s.setIdleRotationMaxSec)
  const idleAssignments = useAnimStore((s) => s.idleAssignments)
  const players = useGameStore((s) => s.players)

  return (
    <aside className="anim-debug-panel">
      <div className="anim-debug-header">
        <h2 className="anim-debug-title">Анимации</h2>
      </div>

      {!animationsActive && (
        <button
          className="btn action anim-debug-start"
          onClick={startAnimations}
        >
          Запустить анимации
        </button>
      )}

      {animationsActive && (
        <>
          <div className="anim-debug-active-row">
            <span className="anim-debug-active-dot" />
            <span>Анимации работают</span>
          </div>

          <div className="anim-debug-speed">
            <label className="field-label">
              Скорость: {playbackSpeed.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className="anim-debug-slider"
            />
          </div>

          <div className="anim-debug-rotation">
            <label className="anim-debug-toggle anim-debug-toggle-row">
              <input
                type="checkbox"
                checked={idleRotationEnabled}
                onChange={(e) => setIdleRotationEnabled(e.target.checked)}
              />
              <span>Ротация idle</span>
            </label>
            {idleRotationEnabled && (
              <div className="anim-debug-speed">
                <label className="field-label">
                  Мин: {idleRotationMinSec}с
                </label>
                <input
                  type="range"
                  min="4"
                  max="30"
                  step="1"
                  value={idleRotationMinSec}
                  onChange={(e) => setIdleRotationMinSec(parseInt(e.target.value, 10))}
                  className="anim-debug-slider"
                />
                <label className="field-label">
                  Макс: {idleRotationMaxSec}с
                </label>
                <input
                  type="range"
                  min="4"
                  max="60"
                  step="1"
                  value={idleRotationMaxSec}
                  onChange={(e) => setIdleRotationMaxSec(parseInt(e.target.value, 10))}
                  className="anim-debug-slider"
                />
              </div>
            )}
          </div>

          <div className="anim-debug-player-list">
            {players.map((player) => {
              const override = playerOverrides[player.id]
              const idle = idleAssignments[player.id]
              const currentLabel = override ? getLabelForId(override) : (idle ? getLabelForId(idle) : '—')
              return (
                <div key={player.id} className="anim-debug-player-row">
                  <span className="anim-debug-player-label">
                    {player.number}
                  </span>
                  <select
                    className="anim-debug-select"
                    value={override || ''}
                    onChange={(e) => {
                      if (e.target.value === '') {
                        clearPlayerOverride(player.id)
                      } else {
                        setPlayerOverride(player.id, e.target.value)
                      }
                    }}
                  >
                    <option value="">— {currentLabel} —</option>
                    {Object.entries(ANIM_CATEGORIES).map(([catKey, catLabel]) => (
                      <optgroup key={catKey} label={catLabel}>
                        {ANIM_REGISTRY[catKey].map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>

          <button
            className="btn ghost anim-debug-reset"
            onClick={resetAllOverrides}
          >
            Сбросить все
          </button>
        </>
      )}
    </aside>
  )
}