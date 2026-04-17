import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { memo, useRef } from 'react'
import * as THREE from 'three'

const CARD_WIDTH = 340
const VIDEO_HEIGHT = 192
const LABEL_HEIGHT = 34
const CARD_HEIGHT = VIDEO_HEIGHT + LABEL_HEIGHT
const SAFE_MARGIN_X = 12
const SAFE_MARGIN_TOP = 6
const HEAD_SCREEN_GAP = 14
const HEAD_CLEARANCE = 8
const HEAD_OFFSET = new THREE.Vector3(0, 3.26, 0.05)

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function WebcamOverlayBase({ players, positions, showWebcams }) {
  const { camera, size } = useThree()
  const cardRefs = useRef(new Map())
  const stemRefs = useRef(new Map())
  const layoutStateRef = useRef(new Map())
  const worldPointRef = useRef(new THREE.Vector3())
  const cameraToPointRef = useRef(new THREE.Vector3())
  const projectedPointRef = useRef(new THREE.Vector3())
  const cameraForwardRef = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const forward = camera.getWorldDirection(cameraForwardRef.current)
    const worldPoint = worldPointRef.current
    const cameraToPoint = cameraToPointRef.current
    const projected = projectedPointRef.current
    const activeIds = new Set()
    const visibleItems = []

    if (showWebcams) {
      for (let index = 0; index < positions.length; index += 1) {
        const player = players[index]
        if (!player?.alive) {
          continue
        }

        const position = positions[index]
        worldPoint.set(position[0], position[1], position[2]).add(HEAD_OFFSET)
        cameraToPoint.copy(worldPoint).sub(camera.position)

        if (cameraToPoint.dot(forward) <= 0.2) {
          continue
        }

        projected.copy(worldPoint).project(camera)
        if (projected.z < -1 || projected.z > 1) {
          continue
        }

        const anchorX = (projected.x * 0.5 + 0.5) * size.width
        const anchorY = (-projected.y * 0.5 + 0.5) * size.height
        const distance = camera.position.distanceTo(worldPoint)

        visibleItems.push({
          id: player.id,
          anchorX,
          anchorY,
          distance,
        })
      }
    }

    let minCameraDistance = Infinity
    let maxCameraDistance = 0
    for (const item of visibleItems) {
      minCameraDistance = Math.min(minCameraDistance, item.distance)
      maxCameraDistance = Math.max(maxCameraDistance, item.distance)
    }
    const cameraDistanceRange = Math.max(maxCameraDistance - minCameraDistance, 0.001)

    let minAnchorSpacing = Infinity
    for (let index = 0; index < visibleItems.length; index += 1) {
      const current = visibleItems[index]
      for (let compareIndex = index + 1; compareIndex < visibleItems.length; compareIndex += 1) {
        const other = visibleItems[compareIndex]
        const dx = current.anchorX - other.anchorX
        const dy = current.anchorY - other.anchorY
        const spacing = Math.sqrt(dx * dx + dy * dy)
        minAnchorSpacing = Math.min(minAnchorSpacing, spacing)
      }
    }

    for (let index = 0; index < visibleItems.length; index += 1) {
      const current = visibleItems[index]
      let nearestSpacing = Infinity
      for (let compareIndex = 0; compareIndex < visibleItems.length; compareIndex += 1) {
        if (index === compareIndex) {
          continue
        }

        const other = visibleItems[compareIndex]
        const dx = current.anchorX - other.anchorX
        const dy = current.anchorY - other.anchorY
        const spacing = Math.sqrt(dx * dx + dy * dy)
        nearestSpacing = Math.min(nearestSpacing, spacing)
      }
      current.nearestSpacing = Number.isFinite(nearestSpacing) ? nearestSpacing : 360
    }

    const targetById = new Map()
    for (const item of visibleItems) {
      const viewportScale = clamp(size.width / 1600, 0.92, 1.02)
      const depthT = clamp((item.distance - minCameraDistance) / cameraDistanceRange, 0, 1)
      const depthScale = THREE.MathUtils.lerp(1.04, 0.86, Math.pow(depthT, 0.9))
      const verticalScale = THREE.MathUtils.lerp(0.94, 1.04, clamp(item.anchorY / size.height, 0, 1))
      const localSpacingScale = clamp(item.nearestSpacing / 320, 0.72, 1.07)
      const globalDensityScale = Number.isFinite(minAnchorSpacing)
        ? clamp(minAnchorSpacing / 320, 0.84, 1)
        : 1
      const targetScale = clamp(
        viewportScale * depthScale * verticalScale * localSpacingScale * globalDensityScale,
        0.72,
        1.04,
      )
      const width = CARD_WIDTH * targetScale
      const height = CARD_HEIGHT * targetScale
      const maxY = item.anchorY - height - HEAD_CLEARANCE
      const targetX = clamp(item.anchorX - width * 0.5, SAFE_MARGIN_X, size.width - width - SAFE_MARGIN_X)
      const targetY = clamp(item.anchorY - height - HEAD_SCREEN_GAP, SAFE_MARGIN_TOP, maxY)

      targetById.set(item.id, {
        ...item,
        scale: targetScale,
        targetX,
        targetY,
      })
    }

    for (const player of players) {
      if (!player) {
        continue
      }

      const target = targetById.get(player.id)
      const cardNode = cardRefs.current.get(player.id)
      const stemNode = stemRefs.current.get(player.id)
      if (!cardNode || !stemNode) {
        continue
      }

      const previous = layoutStateRef.current.get(player.id) ?? {
        x: size.width * 0.5 - CARD_WIDTH * 0.5,
        y: size.height * 0.4 - CARD_HEIGHT,
        scale: 0.9,
        opacity: 0,
      }

      const nextState = {
        x: THREE.MathUtils.damp(previous.x, target?.targetX ?? previous.x, 13, delta),
        y: THREE.MathUtils.damp(previous.y, target?.targetY ?? previous.y, 13, delta),
        scale: THREE.MathUtils.damp(previous.scale, target?.scale ?? previous.scale, 12, delta),
        opacity: THREE.MathUtils.damp(previous.opacity, target ? 1 : 0, target ? 11 : 16, delta),
      }
      layoutStateRef.current.set(player.id, nextState)

      cardNode.style.transform = `translate3d(${nextState.x}px, ${nextState.y}px, 0) scale(${nextState.scale})`
      cardNode.style.opacity = String(nextState.opacity)
      cardNode.style.visibility = nextState.opacity < 0.03 ? 'hidden' : 'visible'
      cardNode.style.zIndex = String(target ? Math.round(1800 - target.distance * 20) : 0)

      if (!target) {
        stemNode.style.opacity = '0'
        continue
      }

      activeIds.add(player.id)

      const scaledWidth = CARD_WIDTH * nextState.scale
      const scaledHeight = CARD_HEIGHT * nextState.scale
      const cardCenterX = nextState.x + scaledWidth * 0.5
      const cardBottomY = nextState.y + scaledHeight - 8 * nextState.scale
      const deltaX = target.anchorX - cardCenterX
      const deltaY = target.anchorY - cardBottomY
      const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      const angle = Math.atan2(deltaY, deltaX)

      stemNode.style.width = `${length / Math.max(nextState.scale, 0.001)}px`
      stemNode.style.opacity = String(Math.min(nextState.opacity * 0.95, length > 10 ? 1 : 0))
      stemNode.style.transform = `translate3d(${CARD_WIDTH * 0.5}px, ${CARD_HEIGHT - 5}px, 0) rotate(${angle}rad)`
    }

    for (const [playerId, state] of layoutStateRef.current.entries()) {
      if (activeIds.has(playerId)) {
        continue
      }

      if (state.opacity < 0.01) {
        const cardNode = cardRefs.current.get(playerId)
        const stemNode = stemRefs.current.get(playerId)
        if (cardNode) {
          cardNode.style.visibility = 'hidden'
        }
        if (stemNode) {
          stemNode.style.opacity = '0'
        }
      }
    }
  })

  if (!showWebcams) {
    return null
  }

  return (
    <Html
      fullscreen
      style={{ pointerEvents: 'none' }}
      zIndexRange={[14, 0]}
    >
      <div className="webcam-overlay-layer">
        {players.map((player) => {
          if (!player) {
            return null
          }

          const webcamSrc = (player.webcamUrl || '').trim()

          return (
            <div
              key={player.id}
              ref={(node) => {
                if (node) {
                  cardRefs.current.set(player.id, node)
                } else {
                  cardRefs.current.delete(player.id)
                }
              }}
              className="webcam-floating-card"
            >
              <div
                ref={(node) => {
                  if (node) {
                    stemRefs.current.set(player.id, node)
                  } else {
                    stemRefs.current.delete(player.id)
                  }
                }}
                className="webcam-floating-stem"
              />

              <div className="webcam-floating-video">
                {webcamSrc ? (
                  <iframe
                    src={webcamSrc}
                    title={`Player ${player.number} webcam`}
                    width={CARD_WIDTH}
                    height={VIDEO_HEIGHT}
                    loading="lazy"
                    allow="camera; microphone; autoplay; fullscreen"
                  />
                ) : (
                  <div className="webcam-floating-placeholder">
                    Webcam URL не задан
                  </div>
                )}
              </div>

              <div className="webcam-floating-label">
                №{player.number}{player.name ? ` ${player.name}` : ''}
              </div>
            </div>
          )
        })}
      </div>
    </Html>
  )
}

export const WebcamOverlay = memo(WebcamOverlayBase)
