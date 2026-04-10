import { Link } from 'react-router-dom'
import { PHASE_TEXT } from '../features/game/model/constants'
import { useGameStore } from '../features/game/model/gameStore'
import { useRealtimeSync } from '../features/game/realtime/useRealtimeSync'
import { MafiaScene } from '../features/scene/MafiaScene'
import '../styles/layout.css'
import '../styles/client-overlay.css'

export default function ClientPage() {
  const { players, phase, round, winner, log } = useGameStore()

  useRealtimeSync(false)

  return (
    <main className="app-shell client-mode">
      <section className="scene-wrap">
        <MafiaScene players={players} phase={phase} assassination={null} showWebcams />
      </section>

      <section className="client-overlay">
        <h1 className="client-title">Mafia: Client View</h1>
        <p>Раунд: {round}</p>
        <p>Фаза: {PHASE_TEXT[phase]}</p>
        <p>Живых игроков: {players.filter((player) => player.alive).length}</p>
        {winner ? <p className="client-winner">{winner}</p> : null}

        <h2>Последние события</h2>
        <ul>
          {log.slice(-6).map((entry, index) => (
            <li key={`${index}-${entry}`}>{entry}</li>
          ))}
        </ul>
      </section>

      <Link className="route-switch" to="/admin">
        Перейти в админку
      </Link>
    </main>
  )
}
