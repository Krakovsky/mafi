import { useRef } from 'react'
import { useRealtimeSync } from '../features/game/realtime/useRealtimeSync'
import { MafiaScene } from '../features/scene/MafiaScene'
import '../styles/layout.css'

export default function ClientPage() {
  const assassinationRef = useRef(null)

  useRealtimeSync(false)

  return (
    <main className="app-shell client-mode">
      <section className="scene-wrap">
        <MafiaScene
          assassinationRef={assassinationRef}
          showWebcams
        />
      </section>


    </main>
  )
}
