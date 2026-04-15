import { Suspense } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { PLAYER_COUNT, PLAYER_RING_RADIUS, ROLE_COLOR } from '../../game/model/constants'
import { PlayerFallback } from './PlayerFallback'
import { PlayerModel } from './PlayerModel'

export function PlayerActor({ player, position, focused, showWebcams }) {
  const tint = ROLE_COLOR[player.role]
  const [x, y, z] = position
  const facing = Math.atan2(-x, -z)

  const VIEWPORT_W = 420*1.4
  const VIEWPORT_H = 236*1.4

  const headOffsetX = 0
  const headOffsetY = 2.55
  const headOffsetZ = 0.05

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
            pointerEvents: 'auto',
            width: VIEWPORT_W,
            borderRadius: 10,
            overflow: 'hidden',
          }}
          transform={false}
          occlude={false}
        >
          <div className="webcam-container" style={{ width: VIEWPORT_W }}>
            <iframe
              src={player.webcamUrl || 'https://vdo.ninja/?view=Wjik7HN?autostart=true&autohide=true&camera=true&microphone=false&allowfullscreen=true'}
              title={`Player ${player.number} webcam`}
              width={VIEWPORT_W}
              height={VIEWPORT_H}
              allow="camera; autostart; autohide; microphone; fullscreen"
              style={{ border: 'none', borderRadius: '10px 10px 0 0', background: '#1a1a1a', display: 'block' }}
            />
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
