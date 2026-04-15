import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGameStore } from '../features/game/model/gameStore'
import { useRealtimeSync } from '../features/game/realtime/useRealtimeSync'
import { AdminControlPanel } from '../features/game/ui/AdminControlPanel'
import { MafiaScene } from '../features/scene/MafiaScene'
import '../styles/layout.css'

export default function AdminPage() {
  const [assassination, setAssassination] = useState(null)
  const players = useGameStore((state) => state.players)

  useRealtimeSync(true)

  return (
    <main className="app-shell admin-mode">
      <section className="scene-wrap">
        <MafiaScene
          players={players}
          assassination={assassination}
          showWebcams
        />
      </section>

      <AdminControlPanel onAssassinationChange={setAssassination} />

      <Link className="route-switch" to="/">
        Клиентский экран
      </Link>
    </main>
  )
}
