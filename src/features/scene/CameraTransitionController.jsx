import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export function CameraTransitionController({ isTransitioning, onTransitionStart, onTransitionEnd }) {
  const { camera } = useThree()
  const controlsRef = useRef(null)
  const originalStateRef = useRef(null)
  const transitionDataRef = useRef(null)

  useEffect(() => {
    const findControls = (obj) => {
      if (obj.userData?.controls) return obj.userData.controls
      if (obj.parent) return findControls(obj.parent)
      return null
    }
    controlsRef.current = findControls(camera)
  }, [camera])

  useEffect(() => {
    if (isTransitioning && !transitionDataRef.current) {
      const controls = controlsRef.current
      
      if (controls && camera) {
        originalStateRef.current = {
          position: camera.position.clone(),
          target: controls.target.clone(),
          fov: camera.fov,
        }
        
        controls.enabled = false
        
        transitionDataRef.current = {
          targetPosition: new THREE.Vector3(0, 25, 0),
          targetLookAt: new THREE.Vector3(0, 0, 0),
          targetFov: 35,
          startTime: performance.now(),
          duration: 800,
        }
        
        onTransitionStart?.()
      }
    }
  }, [isTransitioning, camera, onTransitionStart])

  useFrame(() => {
    if (!transitionDataRef.current) return
    
    const { targetPosition, targetLookAt, targetFov, startTime, duration } = transitionDataRef.current
    const controls = controlsRef.current
    
    if (!controls) return
    
    const elapsed = performance.now() - startTime
    const t = Math.min(elapsed / duration, 1)
    const easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t 
    
    camera.position.lerpVectors(originalStateRef.current.position, targetPosition, easeT)
    controls.target.lerpVectors(originalStateRef.current.target, targetLookAt, easeT)
    camera.fov = THREE.MathUtils.lerp(originalStateRef.current.fov, targetFov, easeT)
    camera.updateProjectionMatrix()
    
    if (t >= 1) {
      transitionDataRef.current = null
    }
  })

  useEffect(() => {
    if (!isTransitioning && transitionDataRef.current === null && originalStateRef.current) {
      const controls = controlsRef.current
      
      if (controls && camera) {
        camera.position.copy(originalStateRef.current.position)
        controls.target.copy(originalStateRef.current.target)
        camera.fov = originalStateRef.current.fov
        camera.updateProjectionMatrix()
        controls.enabled = true
        
        originalStateRef.current = null
        onTransitionEnd?.()
      }
    }
  }, [isTransitioning, camera, onTransitionEnd])

  return null
}