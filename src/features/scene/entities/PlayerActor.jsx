import { memo, Suspense } from 'react'
import { Html } from '@react-three/drei'
import { ROLE_COLOR } from '../../game/model/constants'
import { PlayerFallback } from './PlayerFallback'
import { PlayerModel } from './PlayerModel'

const VIEWPORT_W = 420 * 1.4
const VIEWPORT_H = 236 * 1.4
const headOffsetX = 0
const headOffsetY = 3.26
const headOffsetZ = 0.05

function PlayerActorBase({ player, position, focused, showWebcams, webcamVisible = true }) {
  const tint = ROLE_COLOR[player.role]
  const [x, y, z] = position
  const facing = Math.atan2(-x, -z)
  const webcamSrc = (player.webcamUrl || '').trim()

  return (
    <>
      <group position={[x, y, z]} rotation={[0, facing, 0]}>
        <mesh position={[0, 0.03, 0]} receiveShadow>
          <cylinderGeometry args={[0.98, 0.98, 0.05, 40]} />
          <meshStandardMaterial
            color={focused ? '#f2b36e' : tint}
            emissive={focused ? '#f2b36e' : tint}
            emissiveIntensity={focused ? 0.38 : 0.14}
            opacity={player.alive ? 0.8 : 0.3}
            transparent
          />
        </mesh>

        <group position={[0, 0.06, 0]}>
          <Suspense fallback={<PlayerFallback tint={tint} alive={player.alive} />}>
            <PlayerModel tint={tint} alive={player.alive} />
          </Suspense>
        </group>

        {!player.alive ? (
          <mesh position={[0, 2.8, 0]}>
            <boxGeometry args={[0.1, 1.2, 0.1]} />
            <meshStandardMaterial color="#bd3d3d" />
          </mesh>
        ) : null}
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
    prev.player === next.player &&
    prev.position === next.position &&
    prev.focused === next.focused &&
    prev.showWebcams === next.showWebcams &&
    prev.webcamVisible === next.webcamVisible
  )
})
