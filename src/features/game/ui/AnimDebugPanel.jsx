import { useAnimDebugStore } from '../model/animDebugStore'
import { useGameStore } from '../model/gameStore'
import '../../../styles/anim-debug-panel.css'

export function AnimDebugPanel() {
  const enabled = useAnimDebugStore((state) => state.enabled)
  const setEnabled = useAnimDebugStore((state) => state.setEnabled)
  const playbackSpeed = useAnimDebugStore((state) => state.playbackSpeed)
  const setPlaybackSpeed = useAnimDebugStore((state) => state.setPlaybackSpeed)
  const playerClips = useAnimDebugStore((state) => state.playerClips)
  const setPlayerClip = useAnimDebugStore((state) => state.setPlayerClip)
  const clearPlayerClip = useAnimDebugStore((state) => state.clearPlayerClip)
  const resetAllClips = useAnimDebugStore((state) => state.resetAllClips)
  const availableClips = useAnimDebugStore((state) => state.availableClips)
  const players = useGameStore((state) => state.players)

  return (
    <aside className="anim-debug-panel">
      <div className="anim-debug-header">
        <h2 className="anim-debug-title">Тест анимаций</h2>
        <label className="anim-debug-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span>{enabled ? 'Вкл' : 'Выкл'}</span>
        </label>
      </div>

      {enabled && (
        <>
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

          {availableClips.length === 0 && (
            <div className="anim-debug-empty">
              Загрузка анимаций...
            </div>
          )}

          {availableClips.length > 0 && (
            <div className="anim-debug-players">
              <div className="anim-debug-clips-info">
                <span className="field-label">Доступные клипы:</span>
                <div className="anim-debug-clip-tags">
                  {availableClips.map((clip) => (
                    <span key={clip.name} className="anim-debug-clip-tag" title={clip.sourceUrl}>
                      {clip.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="anim-debug-player-list">
                {players.map((player) => (
                  <div key={player.id} className="anim-debug-player-row">
                    <span className="anim-debug-player-label">
                      {player.number}
                    </span>
                    <select
                      className="anim-debug-select"
                      value={playerClips[player.id] || ''}
                      onChange={(e) => {
                        if (e.target.value === '') {
                          clearPlayerClip(player.id)
                        } else {
                          setPlayerClip(player.id, e.target.value)
                        }
                      }}
                    >
                      <option value="">— idle —</option>
                      {availableClips.map((clip) => (
                        <option key={clip.name} value={clip.name}>
                          {clip.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <button
                className="btn ghost anim-debug-reset"
                onClick={resetAllClips}
              >
                Сбросить все
              </button>
            </div>
          )}
        </>
      )}
    </aside>
  )
}