import { memo, Suspense, useRef } from 'react'
import { ROLE_COLOR } from '../../game/model/constants'
import { useGameStore } from '../../game/model/gameStore'
import { PlayerFallback } from './PlayerFallback'
import { PlayerModel } from './PlayerModel'

const playerSelector = (id) => (state) => state.players[id]

function PlayerActorBase({ playerId, position }) {
  const selectorRef = useRef(playerSelector(playerId))
  const player = useGameStore(selectorRef.current)

  if (!player) return null

  const tint = ROLE_COLOR[player.role]
  const [x, y, z] = position
  const facing = Math.atan2(-x, -z)

  return (
    <group name={`player-actor-${player.id}`} position={[x, y, z]} rotation={[0, facing, 0]}>
      <group position={[0, 0.06, 0]}>
        <Suspense fallback={<PlayerFallback tint={tint} alive={player.alive} />}>
          <PlayerModel tint={tint} alive={player.alive} />
        </Suspense>
      </group>
    </group>
  )
}

export const PlayerActor = memo(PlayerActorBase, (prev, next) => {
  return (
    prev.playerId === next.playerId &&
    prev.position === next.position
  )
})
