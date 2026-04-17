import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { useGameStore } from '../game/model/gameStore'

export function PostProcessingEffects() {
  const phase = useGameStore((state) => state.phase)
  const isNight = phase === 'night'

  return (
    <EffectComposer multisampling={4}>
      <Bloom
        intensity={isNight ? 1.5 : 0.15}
        luminanceThreshold={0.9}
        luminanceSmoothing={0.1}
        mipmapBlur
        radius={0.5}
        levels={isNight ? 8 : 6}
      />
      <Vignette offset={0.4} darkness={isNight ? 0.7 : 0.35} eskil={false} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}