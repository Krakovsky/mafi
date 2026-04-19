import { useRef, useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useGameStore } from '../game/model/gameStore'

export function DayNightTransition({ onTransitionStart, onTransitionEnd }) {
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('idle') 
  const [dayNumber, setDayNumber] = useState(1)
  const [transitionType, setTransitionType] = useState(null) 
  
  const audioRef = useRef(null)
  const holdTimerRef = useRef(null)
  const animationRef = useRef(null)
  const prevPhaseRef = useRef(useGameStore.getState().phase)
  const isMounted = useRef(false)
  
  const sounds = useMemo(() => ({
    'day-to-night': '/sounds/day_to_night.mp3',
    'night-to-day': '/sounds/night_to_day.mp3',
  }), [])

  useEffect(() => {
    const unsubscribe = useGameStore.subscribe((state) => {
      if (!isMounted.current) return
      
      const currentPhase = state.phase
      const newDayNumber = state.dayNumber || 1
      
      if (currentPhase !== prevPhaseRef.current && currentPhase !== 'loading') {
        const type = prevPhaseRef.current === 'night' ? 'night-to-day' : 'day-to-night'
        
        setDayNumber(newDayNumber)
        setTransitionType(type)
        setPhase('fading-in')
        setVisible(true)
        setProgress(0)
        
        onTransitionStart?.(type)
        
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
        }
        const audio = new Audio(sounds[type])
        audio.volume = 0.6
        audio.play().catch(() => {}) 
        audioRef.current = audio
        
        prevPhaseRef.current = currentPhase
      }
    })
    
    return () => unsubscribe()
  }, [sounds, onTransitionStart])

  useEffect(() => {
    if (!isMounted.current || phase === 'idle') return
    
    let lastTime = performance.now()
    
    const animate = (currentTime) => {
      if (!isMounted.current) return
      
      const delta = (currentTime - lastTime) / 1000
      lastTime = currentTime
      
      if (phase === 'fading-in') {
        setProgress(p => {
          const next = Math.min(p + delta / 1.5, 1)
          if (next >= 1) {
            setPhase('holding')
            holdTimerRef.current = setTimeout(() => {
              if (isMounted.current) setPhase('fading-out')
            }, 3500)
          }
          return next
        })
      }
      
      if (phase === 'fading-out') {
        setProgress(p => {
          const next = Math.max(p - delta / 1.5, 0)
          if (next <= 0) {
            setPhase('idle')
            setVisible(false)
            onTransitionEnd?.()
            if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
            return 0
          }
          return next
        })
      }
      
      if (phase !== 'idle' && isMounted.current) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }
    
    animationRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
    }
  }, [phase, onTransitionEnd])

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
      if (audioRef.current) audioRef.current.pause()
    }
  }, [])

  if (!visible) return null

  const lineScale = progress
  const textOpacity = Math.min(1, progress * 2) 
  const textScale = 0.8 + progress * 0.2 
  const smokeOpacity = progress * 0.3 

  return createPortal(
    <>
      <audio ref={audioRef} preload="auto" />
      
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent', 
        backdropFilter: 'blur(18px)', 
        WebkitBackdropFilter: 'blur(18px)',
      }}>
        <SmokeCSS opacity={smokeOpacity} progress={progress} />

        <div style={{
          position: 'absolute',
          left: '8%',
          right: '8%',
          top: '50%',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4) 30%, #ffffff 50%, rgba(255,255,255,0.4) 70%, transparent)',
          transform: `scaleX(${lineScale})`,
          transformOrigin: 'center',
          boxShadow: '0 0 30px rgba(255,255,255,0.8), 0 0 60px rgba(200,220,255,0.4)',
          opacity: textOpacity,
          transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
          borderRadius: '1px',
        }} />

        <div style={{
          position: 'relative',
          width: '260px',
          height: '260px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.92)', 
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.9) inset, 0 0 40px rgba(180,200,255,0.3)',
          transform: `scale(${textScale})`,
          opacity: textOpacity,
          transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s ease',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.9) 47%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.9) 53%, transparent 60%)',
            transform: `rotate(${45 + progress * 30}deg) translateX(${-50 + progress * 100}%)`,
            opacity: 0.7,
            pointerEvents: 'none',
          }} />
          
          <div style={{
            position: 'absolute',
            inset: '8px',
            borderRadius: '18px',
            border: '1px solid rgba(200,210,230,0.6)',
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.03)',
            pointerEvents: 'none',
          }} />

          <div style={{ textAlign: 'center', zIndex: 1 }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#5a6b8a',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '8px',
              opacity: 0.85,
            }}>
              {transitionType === 'night-to-day' ? 'Наступает' : 'Наступает'}
            </div>
            
            <div style={{
              fontSize: '56px',
              fontWeight: 900,
              background: 'linear-gradient(180deg, #1a1a2e 0%, #3a4a6e 50%, #1a1a2e 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1,
              textShadow: '0 2px 6px rgba(0,0,0,0.15)',
              letterSpacing: '-2px',
            }}>
              ДЕНЬ {dayNumber}
            </div>
            
            <div style={{
              fontSize: '11px',
              color: '#7a8aa9',
              marginTop: '12px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              opacity: 0.7,
            }}>
              {transitionType === 'night-to-day' ? '☀️ Рассвет' : '🌙 Закат'}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes smoke-drift {
          0%, 100% { transform: translateX(0) scale(1); }
          25% { transform: translateX(-1.5%) scale(1.01); }
          75% { transform: translateX(1.5%) scale(0.99); }
        }
      `}</style>
    </>,
    document.body 
  )
}

function SmokeCSS({ opacity, progress }) {
  return (
    <>
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: `radial-gradient(ellipse at 50% 70%, rgba(200,210,230,${opacity * 0.5}) 0%, transparent 70%)`,
        animation: `smoke-drift ${10 + progress * 5}s ease-in-out infinite`,
        filter: 'blur(12px)',
        opacity: 0.8,
      }} />
    </>
  )
}