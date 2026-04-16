import { memo, Suspense, useRef } from 'react'
import { Html } from '@react-three/drei'
import { ROLE_COLOR } from '../../game/model/constants'
import { useGameStore } from '../../game/model/gameStore'
import { PlayerFallback } from './PlayerFallback'
import { PlayerModel } from './PlayerModel'

const VIEWPORT_W = 420 * 1.4
const VIEWPORT_H = 236 * 1.4
const headOffsetX = 0
const headOffsetY = 3.26
const headOffsetZ = 0.05

const playerSelector = (id) => (state) => state.players[id]

function PlayerActorBase({ playerId, position, showWebcams, webcamVisible = true }) {
  const selectorRef = useRef(playerSelector(playerId))
  const player = useGameStore(selectorRef.current)

  if (!player) return null

  const tint = ROLE_COLOR[player.role]
  const [x, y, z] = position
  const facing = Math.atan2(-x, -z)
  const webcamSrc = (player.webcamUrl || '').trim()

  return (
    <>
      <group name={`player-actor-${player.id}`} position={[x, y, z]} rotation={[0, facing, 0]}>
        <group position={[0, 0.06, 0]}>
          <Suspense fallback={<PlayerFallback tint={tint} alive={player.alive} />}>
            <PlayerModel tint={tint} alive={player.alive} />
          </Suspense>
        </group>
      </group>

      {showWebcams ? (
        <Html
          position={[x + headOffsetX, y + headOffsetY, z + headOffsetZ]}
          center
          distanceFactor={5}
          style={{
            pointerEvents: webcamVisible ? 'auto' : 'none',
            width: VIEWPORT_W,
            borderRadius: 10,
            overflow: 'hidden',
            opacity: webcamVisible ? 1 : 0,
            visibility: webcamVisible ? 'visible' : 'hidden',
            display: webcamVisible ? 'block' : 'none',
            transition: 'opacity 220ms ease',
            contain: 'layout paint style',
            willChange: 'opacity, transform',
          }}
          transform={false}
          occlude={false}
        >
          <div className="webcam-container" style={{ width: VIEWPORT_W }}>
            {webcamSrc ? (
              <iframe
                src={webcamSrc}
                title={`Player ${player.number} webcam`}
                width={VIEWPORT_W}
                height={VIEWPORT_H}
                loading="lazy"
                allow="camera; microphone; autoplay; fullscreen"
                style={{ border: 'none', borderRadius: '10px 10px 0 0', background: '#1a1a1a', display: 'block' }}
              />
            ) : (
              <div
                style={{
                  width: VIEWPORT_W,
                  height: VIEWPORT_H,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '10px 10px 0 0',
                  background: 'linear-gradient(160deg, #1a1f2e 0%, #0f131d 100%)',
                  color: '#9aa6be',
                  fontSize: 17,
                  letterSpacing: 0.3,
                }}
              >
                Webcam URL не задан
              </div>
            )}
            <div className="webcam-label" style={{
              width: VIEWPORT_W,
              padding: '5px 8px',
              background: 'rgba(0, 0, 0, 0.8)',
              color: '#fff',
              fontSize: 18,
              fontWeight: 500,
              textAlign: 'center',
              borderRadius: '0 0 10px 10px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}>
              №{player.number}{player.name ? ` ${player.name}` : ''}
            </div>
          </div>
        </Html>
      ) : null}
    </>
  )
}

export const PlayerActor = memo(PlayerActorBase, (prev, next) => {
  return (
    prev.playerId === next.playerId &&
    prev.position === next.position &&
    prev.showWebcams === next.showWebcams &&
    prev.webcamVisible === next.webcamVisible
  )
})
