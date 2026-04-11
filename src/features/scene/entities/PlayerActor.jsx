import { Suspense } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { PLAYER_RING_RADIUS, ROLE_COLOR } from '../../game/model/constants'
import { PlayerFallback } from './PlayerFallback'
import { PlayerModel } from './PlayerModel'

export function PlayerActor({ player, position, focused, showWebcams }) {
  const tint = ROLE_COLOR[player.role]
  const [x, y, z] = position
  const facing = Math.atan2(-x, -z)

  const cameraYOffset = 3.1 + player.id * 0.12
  const cameraRadiusOffset = 0.5
  const cameraX = x * (1 + cameraRadiusOffset / PLAYER_RING_RADIUS)
  const cameraZ = z * (1 + cameraRadiusOffset / PLAYER_RING_RADIUS)

  const viewerCameraX = 0
  const viewerCameraZ = 34
  const distanceToViewer = Math.hypot(cameraX - viewerCameraX, cameraZ - viewerCameraZ)
  const minDistance = 22
  const maxDistance = 44
  const distanceProgress = THREE.MathUtils.clamp((distanceToViewer - minDistance) / (maxDistance - minDistance), 0, 1)
  const webcamScale = 1.1 + distanceProgress * 0.75
  const webcamWidth = Math.round(470 * webcamScale)
  const webcamHeight = Math.round(268 * webcamScale)

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
          position={[cameraX, cameraYOffset, cameraZ]}
          center
          distanceFactor={7.5}
          zIndexRange={[100, 0]}
          style={{
            pointerEvents: 'auto',
            width: webcamWidth,
            borderRadius: 12,
            overflow: 'hidden',
          }}
          transform={false}
          occlude
        >
          <div className="webcam-container" style={{ width: webcamWidth }}>
            <iframe
              src={player.webcamUrl || 'https://vdo.ninja/?view=Wjik7HN?autostart=true&autohide=true&camera=true&microphone=false&allowfullscreen=true'}
              title={`Player ${player.number} webcam`}
              width={webcamWidth}
              height={webcamHeight}
              allow="camera; autostart; autohide; microphone; fullscreen"
              style={{ border: 'none', borderRadius: '12px 12px 0 0', background: '#222', display: 'block' }}
            />
            <div className="webcam-label" style={{
              width: webcamWidth,
              padding: '6px 10px',
              background: 'rgba(0, 0, 0, 0.75)',
              color: '#fff',
              fontSize: 24,
              fontWeight: 500,
              textAlign: 'center',
              borderRadius: '0 0 12px 12px',
            }}>
              №{player.number}{player.name ? ` ${player.name}` : ''}
            </div>
          </div>
        </Html>
      ) : null}
    </>
  )
}
