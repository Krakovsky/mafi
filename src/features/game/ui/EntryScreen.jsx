import { useEffect, useState } from 'react'
import { useGameStore } from '../model/gameStore'
import '../../../styles/entry-screen.css'

const SMOKE_ZONE_WIDTH = 340
const SMOKE_ZONE_HEIGHT = 400
const SMOKE_ZONE_RIGHT = 15
const SMOKE_ZONE_BOTTOM = 22
const SMOKE_SOURCE_X = 22
const SMOKE_SOURCE_Y = 84

const SMOKE_WISPS = [
  { delay: '0s', duration: '4.2s', drift: '-34px', rise: '-300px', straight: '-100px', midScale: '0.9', endScale: '1.7', widthEnd: '170px', heightEnd: '82px' },
  { delay: '0.8s', duration: '4.7s', drift: '-18px', rise: '-330px', straight: '-102px', midScale: '0.95', endScale: '1.85', widthEnd: '176px', heightEnd: '86px' },
  { delay: '1.5s', duration: '4.0s', drift: '-44px', rise: '-285px', straight: '-98px', midScale: '0.86', endScale: '1.6', widthEnd: '164px', heightEnd: '80px' },
  { delay: '2.2s', duration: '5.0s', drift: '-12px', rise: '-350px', straight: '-105px', midScale: '1', endScale: '2', widthEnd: '182px', heightEnd: '88px' },
  { delay: '2.9s', duration: '4.4s', drift: '-38px', rise: '-312px', straight: '-100px', midScale: '0.92', endScale: '1.75', widthEnd: '174px', heightEnd: '84px' },
  { delay: '3.5s', duration: '4.1s', drift: '-26px', rise: '-292px', straight: '-96px', midScale: '0.88', endScale: '1.65', widthEnd: '168px', heightEnd: '82px' },
]

export function EntryScreen() {
  const gameStarted = useGameStore((state) => state.gameStarted)
  const gameStartedEventId = useGameStore((state) => state.gameStartedEventId)
  const [sliding, setSliding] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (!gameStarted) return
    setSliding(true)
    const timer = setTimeout(() => setHidden(true), 5000)
    return () => clearTimeout(timer)
  }, [gameStartedEventId, gameStarted])

  if (hidden) return null

  return (
    <div className={`entry-screen${sliding ? ' entry-screen--sliding' : ''}`}>
      <div className="entry-screen__content">
        <img src="/entry.jpg" alt="" className="entry-screen__img" />
        <div
          className="entry-screen__smoke-region"
          style={{
            width: `${SMOKE_ZONE_WIDTH}px`,
            height: `${SMOKE_ZONE_HEIGHT}px`,
            right: `${SMOKE_ZONE_RIGHT}%`,
            bottom: `${SMOKE_ZONE_BOTTOM}%`,
            transform: 'rotate(14deg)',
          }}
        >
          <svg className="entry-screen__smoke-filter" aria-hidden="true" focusable="false">
            <filter id="entry-smoke-warp" x="-40%" y="-40%" width="180%" height="180%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.009 0.03"
                numOctaves="2"
                seed="8"
                result="noise"
              >
                <animate attributeName="baseFrequency" dur="9s" values="0.009 0.03;0.015 0.05;0.009 0.03" repeatCount="indefinite" />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="26" xChannelSelector="R" yChannelSelector="G">
                <animate attributeName="scale" dur="6s" values="18;30;18" repeatCount="indefinite" />
              </feDisplacementMap>
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </svg>

          <div
            className="entry-screen__smoke"
            style={{
              '--smoke-x': `${SMOKE_SOURCE_X}%`,
              '--smoke-y': `${SMOKE_SOURCE_Y}%`,
            }}
          >
            {SMOKE_WISPS.map((wisp, index) => (
              <span
                key={`wisp-${index}`}
                className="entry-screen__smoke-wisp"
                style={{
                  '--wisp-delay': wisp.delay,
                  '--wisp-duration': wisp.duration,
                  '--wisp-drift': wisp.drift,
                  '--wisp-rise': wisp.rise,
                  '--wisp-straight': wisp.straight,
                  '--wisp-mid-scale': wisp.midScale,
                  '--wisp-end-scale': wisp.endScale,
                  '--wisp-width-end': wisp.widthEnd,
                  '--wisp-height-end': wisp.heightEnd,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
