import { Html } from '@react-three/drei'
import { useProgress } from '@react-three/drei'

export function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div style={{
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '14px',
        textAlign: 'center',
        background: 'rgba(0,0,0,0.6)',
        padding: '20px 30px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.2)',
      }}>
        <div style={{ marginBottom: 8, opacity: 0.8 }}>Mafia 67D</div>
        <div style={{
          width: '150px',
          height: '4px',
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: '#4ade80',
            transition: 'width 0.2s',
          }} />
        </div>
        <div style={{ marginTop: 8, fontSize: '12px', opacity: 0.6 }}>{progress.toFixed(0)}%</div>
      </div>
    </Html>
  )
}