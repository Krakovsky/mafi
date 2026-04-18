import { useEffect, useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { ALL_ANIM_ENTRIES, ALL_ANIM_URLS } from '../../game/model/animRegistry'
import { useAnimStore } from '../../game/model/animStore'

export function AnimationLibrary() {
  const fbxs = useLoader(FBXLoader, ALL_ANIM_URLS)

  const processed = useMemo(() => {
    const urlToIndex = new Map()
    ALL_ANIM_URLS.forEach((url, i) => {
      urlToIndex.set(url, i)
    })

    const clipsMap = {}
    const entries = []

    ALL_ANIM_ENTRIES.forEach((entry) => {
      const idx = urlToIndex.get(entry.url)
      const fbx = fbxs[idx]
      if (!fbx || !fbx.animations || fbx.animations.length === 0) {
        return
      }

      const sourceClip = fbx.animations[0]
      const clip = sourceClip.clone()
      clip.name = entry.id
      clipsMap[entry.id] = clip
      entries.push({ id: entry.id, label: entry.label, category: entry.category })
    })

    return { clipsMap, entries }
  }, [fbxs])

  useEffect(() => {
    useAnimStore.getState().setAnimClipsMap(processed.clipsMap)
    useAnimStore.getState().setAvailableClips(processed.entries)
  }, [processed])

  return null
}