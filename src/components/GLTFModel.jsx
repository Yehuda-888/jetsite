import { useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

const hackerMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  wireframe: true,
  transparent: true,
  opacity: 0.9,
})

function GLTFModel({ path, scale = 1, position = [0, 0, 0], rotation = [0, 0, 0], wireframe = true, onSceneReady }) {
  const gltf = useGLTF(path)
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene])
  const originalMaterials = useRef(new Map())

  // Store original materials on first render and report stats
  useEffect(() => {
    const stored = originalMaterials.current
    scene.traverse((object) => {
      if (object.isMesh && !stored.has(object.uuid)) {
        stored.set(object.uuid, object.material)
      }
    })
    if (onSceneReady) {
      onSceneReady(scene)
    }
  }, [scene, onSceneReady])

  // Switch between wireframe and original materials
  useEffect(() => {
    const stored = originalMaterials.current

    scene.traverse((object) => {
      if (object.isMesh) {
        if (wireframe) {
          object.material = hackerMaterial
          object.castShadow = false
          object.receiveShadow = false
        } else {
          const original = stored.get(object.uuid)
          if (original) {
            object.material = original
          }
          object.castShadow = true
          object.receiveShadow = true
        }
      }
    })
  }, [scene, wireframe])

  return <primitive object={scene} scale={scale} position={position} rotation={rotation} />
}

export default GLTFModel
