import { useRef } from 'react'
import { useRealtimeSync } from '../features/game/realtime/useRealtimeSync'
import { useAnimSync } from '../features/game/realtime/useAnimSync'
import { EntryScreen } from '../features/game/ui/EntryScreen'
import { RoleRevealCard } from '../features/game/ui/RoleRevealCard'
import { MafiaScene } from '../features/scene/MafiaScene'
import '../styles/layout.css'

export default function ClientPage() {
  const assassinationRef = useRef(null)

  useRealtimeSync(false)
  useAnimSync(false)

  return (
    <main className="app-shell client-mode">
      <section className="scene-wrap">
        <MafiaScene
          assassinationRef={assassinationRef}
          showWebcams
          isAdmin={false}
        />
      </section>
      <RoleRevealCard isAdmin={false} />
      <EntryScreen />


    </main>
  )
}
