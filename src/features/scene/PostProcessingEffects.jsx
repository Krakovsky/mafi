import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, ChromaticAberration, ToneMapping } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { useGameStore } from '../game/model/gameStore'

export function PostProcessingEffects() {
  const bloomRef = useRef()
  const vignetteRef = useRef()
  const chromaticRef = useRef()
  const intensityRef = useRef(1.2)
  const chromaticOffsetRef = useRef(new THREE.Vector2(0.0005, 0.0005))

  useFrame((state, delta) => {
    const phase = useGameStore.getState().phase

    if (bloomRef.current) {
      const targetIntensity = phase === 'night' ? 1.5 : 0.15
      intensityRef.current = THREE.MathUtils.damp(intensityRef.current, targetIntensity, 4, delta)
      bloomRef.current.intensity = intensityRef.current
    }

    if (vignetteRef.current) {
      const targetDarkness = phase === 'night' ? 0.7 : 0.35
      vignetteRef.current.darkness = THREE.MathUtils.damp(vignetteRef.current.darkness, targetDarkness, 4, delta)
    }

    if (chromaticRef.current) {
      const targetOffset = phase === 'night' ? 0.0001 : 0.0003
      chromaticOffsetRef.current.set(
        THREE.MathUtils.damp(chromaticOffsetRef.current.x, targetOffset, 3, delta),
        THREE.MathUtils.damp(chromaticOffsetRef.current.y, targetOffset, 3, delta)
      )
      chromaticRef.current.offset = chromaticOffsetRef.current
    }
  })

  return (
    <EffectComposer multisampling={4}>
      <Bloom
        ref={bloomRef}
        intensity={0.15}
        luminanceThreshold={0.9}
        luminanceSmoothing={0.1}
        mipmapBlur
        radius={0.5}
        levels={6}
      />
      <ChromaticAberration
        ref={chromaticRef}
        offset={[0.0005, 0.0005]}
        blendFunction={BlendFunction.NORMAL}
      />
      <Vignette ref={vignetteRef} offset={0.4} darkness={0.5} eskil={false} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}