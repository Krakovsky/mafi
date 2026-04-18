import { useEffect, useMemo } from 'react'
import { useFBX } from '@react-three/drei'
import { useAnimDebugStore } from '../../game/model/animDebugStore'

function renameClip(clip, prefix) {
  const renamed = clip.clone()
  renamed.name = `${prefix}::${clip.name}`
  return renamed
}

export function AnimationLibrary() {
  const testFbx = useFBX('/models/maf/test-bones-animation.fbx')
  const dyingFbx = useFBX('/models/maf/dying.fbx')

  const allEntries = useMemo(() => {
    const entries = []
    testFbx.animations.forEach((clip) => {
      const renamed = renameClip(clip, 'Тест')
      entries.push({ name: renamed.name, sourceLabel: 'Тест', clip: renamed })
    })
    dyingFbx.animations.forEach((clip) => {
      const renamed = renameClip(clip, 'Смерть')
      entries.push({ name: renamed.name, sourceLabel: 'Смерть', clip: renamed })
    })
    return entries
  }, [testFbx, dyingFbx])

  useEffect(() => {
    useAnimDebugStore.getState().setAvailableClips(
      allEntries.map((e) => ({ name: e.name, sourceLabel: e.sourceLabel })),
    )
    useAnimDebugStore.getState().setAnimClips(allEntries.map((e) => e.clip))
  }, [allEntries])

  return null
}