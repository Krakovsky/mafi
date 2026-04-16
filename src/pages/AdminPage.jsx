import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useRealtimeSync } from '../features/game/realtime/useRealtimeSync'
import { AdminControlPanel } from '../features/game/ui/AdminControlPanel'
import { MafiaScene } from '../features/scene/MafiaScene'
import '../styles/layout.css'

export default function AdminPage() {
  const assassinationRef = useRef(null)

  useRealtimeSync(true)

  return (
    <main className="app-shell admin-mode">
      <section className="scene-wrap">
        <MafiaScene
          assassinationRef={assassinationRef}
          showWebcams
        />
      </section>

      <AdminControlPanel assassinationRef={assassinationRef} />

      <Link className="route-switch" to="/">
        Клиентский экран
      </Link>
    </main>
  )
}
