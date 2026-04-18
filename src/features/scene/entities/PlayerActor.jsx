import { memo, Suspense, useMemo, useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ROLE_COLOR } from '../../game/model/constants'
import { useGameStore } from '../../game/model/gameStore'
import { PlayerFallback } from './PlayerFallback'
import { PlayerModel } from './PlayerModel'

const VIEWPORT_W = 420 * 1.4
const VIEWPORT_H = 236 * 1.4
const headOffsetX = 0
const headOffsetY = 3.26
const headOffsetZ = 0.05
const WEBCAM_NEAR_DISTANCE = 16
const WEBCAM_FAR_DISTANCE = 56
const WEBCAM_MIN_SCALE = 1
const WEBCAM_MAX_SCALE = 1.5

const playerSelector = (id) => (state) => state.players[id]

function PlayerActorBase({ playerId, position, showWebcams }) {
  const selectorRef = useRef(playerSelector(playerId))
  const player = useGameStore(selectorRef.current)
  const isSpeechFocused = useGameStore((state) => state.speechFocusPlayerId === playerId)
  const isRoleRevealFocused = useGameStore((state) => state.roleRevealActive && state.roleRevealIndex === playerId)
  const { camera } = useThree()

  if (!player) return null

  const tint = ROLE_COLOR[player.role]
  const [x, y, z] = position
  const facing = Math.atan2(-x, -z)
  const webcamSrc = (player.webcamUrl || '').trim()
  const webcamVisible = Boolean(player.alive)
  const isFocusedPlayer = isSpeechFocused || isRoleRevealFocused
  const webcamSizeMultiplier = isFocusedPlayer ? 0.6 : 1
  const viewportW = VIEWPORT_W * webcamSizeMultiplier
  const viewportH = VIEWPORT_H * webcamSizeMultiplier

  const webcamAnchor = useMemo(() => [x + headOffsetX, y + headOffsetY, z + headOffsetZ], [x, y, z])
  const webcamAnchorVector = useMemo(() => new THREE.Vector3(webcamAnchor[0], webcamAnchor[1], webcamAnchor[2]), [webcamAnchor])
  const webcamScaleRef = useRef(WEBCAM_MIN_SCALE)
  const webcamContainerRef = useRef(null)

  useFrame((_, delta) => {
    if (!showWebcams || !webcamContainerRef.current) {
      return
    }

    const cameraDistance = camera.position.distanceTo(webcamAnchorVector)
    const normalizedDistance = THREE.MathUtils.clamp(
      (cameraDistance - WEBCAM_NEAR_DISTANCE) / (WEBCAM_FAR_DISTANCE - WEBCAM_NEAR_DISTANCE),
      0,
      1,
    )
    const easedDistance = Math.pow(normalizedDistance, 0.6)
    const targetScale = THREE.MathUtils.lerp(WEBCAM_MIN_SCALE, WEBCAM_MAX_SCALE, easedDistance)
    const nextScale = THREE.MathUtils.damp(webcamScaleRef.current, targetScale, 8, delta)

    if (Math.abs(nextScale - webcamScaleRef.current) < 0.001) {
      return
    }

    webcamScaleRef.current = nextScale
    webcamContainerRef.current.style.transform = `scale(${nextScale})`
  })

  return (
    <>
      <group name={`player-actor-${player.id}`} position={[x, y, z]} rotation={[0, facing, 0]}>
        <group position={[0, 0.06, 0]}>
          <Suspense fallback={<PlayerFallback tint={tint} alive={player.alive} />}>
            <PlayerModel tint={tint} alive={player.alive} playerId={playerId} />
          </Suspense>
        </group>
      </group>

      {showWebcams ? (
        <Html
          position={webcamAnchor}
          center
          distanceFactor={5}
          style={{
            pointerEvents: 'none',
            width: viewportW,
            overflow: 'visible',
            transition: 'opacity 220ms ease',
            willChange: 'opacity, transform',
          }}
          transform={false}
          occlude={false}
        >
          <div
            ref={webcamContainerRef}
            className="webcam-container"
            style={{
              width: viewportW,
              transform: `scale(${WEBCAM_MIN_SCALE})`,
              transformOrigin: 'center bottom',
              willChange: 'transform',
              overflow: 'visible',
            }}
          >
            <div
              style={{
                width: viewportW,
                opacity: webcamVisible ? 1 : 0,
                transition: 'opacity 220ms ease',
              }}
            >
              {webcamSrc ? (
                <iframe
                  src={webcamSrc}
                  title={`Player ${player.number} webcam`}
                  width={viewportW}
                  height={viewportH}
                  loading="lazy"
                  allow="camera; microphone; autoplay; fullscreen"
                  style={{ border: 'none', borderRadius: '10px 10px 0 0', background: '#1a1a1a', display: 'block' }}
                />
              ) : (
                <div
                  style={{
                    width: viewportW,
                    height: viewportH,
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
            </div>
            <div className="webcam-label" style={{
              width: viewportW,
              padding: '5px 8px',
              background: 'rgba(0, 0, 0, 0.8)',
              color: '#fff',
              opacity: 1,
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
    prev.showWebcams === next.showWebcams
  )
})
