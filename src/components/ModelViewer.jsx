import { Component, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bounds, Html, OrbitControls, useBounds, useGLTF, useProgress } from '@react-three/drei'
import GLTFModel from './GLTFModel'

if (typeof useGLTF.setDecoderPath === 'function') {
  useGLTF.setDecoderPath('/draco/')
}

function LoadingSpinner() {
  const { progress } = useProgress()

  return (
    <Html center>
      <div className="flex flex-col items-center justify-center font-mono text-[#0f0] tracking-[0.2em] whitespace-nowrap bg-black/80 border border-[#0f0] p-4 shadow-[0_0_15px_#0f0]">
        <p className="animate-pulse">
          &gt; DECRYPTING_ASSETS_ [{Math.round(progress)}%] <span className="cursor-blink">|</span>
        </p>
      </div>
    </Html>
  )
}

function FallbackMessage() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-[#ff003c] font-mono tracking-widest border border-[#ff003c] bg-black shadow-[0_0_20px_#ff003c_inset]" role="alert">
      <p className="glitch-text" data-text="ERROR: 404">ERROR: 404</p>
      <p className="mt-2 text-sm">&gt; ASSET_NOT_FOUND</p>
    </div>
  )
}

function modelPathCandidates(path) {
  if (typeof path !== 'string' || path.length === 0) return []
  if (!path.startsWith('/models/verified/')) return [path]

  const fallbackPath = path.replace('/models/verified/', '/models/unverified/')
  return fallbackPath === path ? [path] : [path, fallbackPath]
}

function FitCamera({ resetToken }) {
  const bounds = useBounds()

  useEffect(() => {
    bounds.refresh().clip().fit()
  }, [bounds, resetToken])

  return null
}

function pad(n) {
  return Math.abs(n).toFixed(3).padStart(7, '0')
}

function sign(n) {
  return n < 0 ? '-' : '+'
}

/* Writes camera data directly to a DOM element via ref -- no React re-renders */
function CameraTracker({ domRef, wireframe }) {
  const { camera } = useThree()
  const frameCount = useRef(0)

  useFrame(() => {
    frameCount.current += 1
    if (frameCount.current % 6 !== 0) return
    const el = domRef.current
    if (!el) return

    const x = camera.position.x
    const y = camera.position.y
    const z = camera.position.z
    const dist = camera.position.length()

    el.textContent =
      `CAM_X: ${sign(x)}${pad(x)}\n` +
      `CAM_Y: ${sign(y)}${pad(y)}\n` +
      `CAM_Z: ${sign(z)}${pad(z)}\n` +
      `DIST:  ${dist.toFixed(2)}\n` +
      `MODE:  ${wireframe ? 'WIREFRAME' : 'TEXTURED'}\n` +
      `STATUS: ONLINE`
  })

  return null
}

function Scene({ model, modelPath, resetToken, autoRotate, wireframe, camHudRef, onSceneReady }) {
  return (
    <>
      <color attach="background" args={[wireframe ? '#000300' : '#1a1a1a']} />

      {!wireframe && (
        <>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} />
          <directionalLight position={[-5, 3, -5]} intensity={0.4} />
        </>
      )}

      <CameraTracker domRef={camHudRef} wireframe={wireframe} />

      <Bounds fit clip observe margin={1.2}>
        <FitCamera resetToken={resetToken} />
        <GLTFModel
          path={modelPath}
          scale={model.scale}
          position={model.position}
          rotation={model.rotation}
          wireframe={wireframe}
          onSceneReady={onSceneReady}
        />
      </Bounds>

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.1}
        rotateSpeed={0.8}
        autoRotate={autoRotate}
        autoRotateSpeed={2.5}
        minDistance={1.8}
        maxDistance={12}
      />
    </>
  )
}

class ModelErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }

    return this.props.children
  }
}

/* Counts geometry stats from loaded model */
function useModelStats(modelPath) {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    setStats(null)
  }, [modelPath])

  const onSceneReady = useCallback((scene) => {
    let triangles = 0
    let vertices = 0
    let meshes = 0

    scene.traverse((object) => {
      if (object.isMesh) {
        meshes += 1
        const geo = object.geometry
        if (geo) {
          if (geo.index) {
            triangles += geo.index.count / 3
          } else if (geo.attributes.position) {
            triangles += geo.attributes.position.count / 3
          }
          if (geo.attributes.position) {
            vertices += geo.attributes.position.count
          }
        }
      }
    })

    setStats({ triangles: Math.round(triangles), vertices, meshes })
  }, [])

  return { stats, onSceneReady }
}

export default function ModelViewer({ model }) {
  const [resetToken, setResetToken] = useState(0)
  const [autoRotate, setAutoRotate] = useState(true)
  const [wireframe, setWireframe] = useState(true)
  const [availability, setAvailability] = useState(model ? 'checking' : 'missing')
  const [resolvedPath, setResolvedPath] = useState(model?.path || null)
  const camHudRef = useRef(null)
  const { stats, onSceneReady } = useModelStats(resolvedPath)

  useEffect(() => {
    let active = true

    const verify = async () => {
      if (!model?.path) {
        setAvailability('missing')
        setResolvedPath(null)
        return
      }

      setAvailability('checking')

      const candidates = modelPathCandidates(model.path)
      for (const candidate of candidates) {
        try {
          const response = await fetch(candidate, { method: 'HEAD' })
          if (!active) return

          if (response.ok || response.status === 405) {
            setResolvedPath(candidate)
            setAvailability('ready')
            return
          }
        } catch {
          if (!active) return
        }
      }

      if (!active) return
      setResolvedPath(model.path)
      setAvailability('missing')
    }

    verify()

    return () => {
      active = false
    }
  }, [model])

  if (!model) {
    return <FallbackMessage />
  }

  if (availability === 'checking' || !resolvedPath) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-[#0f0] font-mono tracking-widest border border-[#0f0] bg-black shadow-[0_0_20px_#0f0_inset]" role="status">
        <p className="animate-pulse">&gt; VERIFYING_MODEL_PATH</p>
      </div>
    )
  }

  if (availability === 'missing') {
    return <FallbackMessage />
  }

  return (
    <div className="w-full h-full relative group font-mono border-2 border-[#0f0] terminal-border">
      {/* SCANLINE OVERLAY */}
      {wireframe && (
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,255,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.1)_1px,transparent_1px)] bg-[size:10px_10px] z-[5] opacity-30 mix-blend-screen"></div>
      )}

      {/* HUD Toolbar - high z-index, pointer-events-auto on each button */}
      <div className="absolute top-2 right-2 z-[30] flex flex-col gap-1">
        <button
          type="button"
          className="bg-black text-[#0f0] border border-[#0f0] text-xs px-2 py-1 glitch-hover uppercase text-left cursor-pointer"
          onClick={() => setAutoRotate((v) => !v)}
        >
          {autoRotate ? '[ STOP_ROTATION ]' : '[ INIT_ROTATION ]'}
        </button>
        <button
          type="button"
          className="bg-black text-[#0f0] border border-[#0f0] text-xs px-2 py-1 glitch-hover uppercase text-left cursor-pointer"
          onClick={() => setWireframe((v) => !v)}
        >
          {wireframe ? '[ RENDER_TEXTURED ]' : '[ RENDER_WIREFRAME ]'}
        </button>
        <button
          type="button"
          className="bg-black text-[#0f0] border border-[#0f0] text-xs px-2 py-1 glitch-hover uppercase text-left cursor-pointer"
          onClick={() => setResetToken((c) => c + 1)}
        >
          [ RECALIBRATE_VIEW ]
        </button>
      </div>

      {/* Live Camera Coordinates HUD - written to directly by CameraTracker, no re-renders */}
      <pre
        ref={camHudRef}
        className="absolute bottom-2 left-2 pointer-events-none z-[30] text-[#0f0] text-[10px] leading-tight bg-black/90 border border-[#0f0] px-2 py-1 font-mono whitespace-pre"
      >
{`CAM_X: +000.000
CAM_Y: +000.000
CAM_Z: +000.000
DIST:  0.00
MODE:  WIREFRAME
STATUS: ONLINE`}
      </pre>

      {/* Live Model Stats HUD */}
      <div className="absolute bottom-2 right-2 pointer-events-none z-[30] text-[#0f0] text-[10px] leading-tight bg-black/90 border border-[#0f0] px-2 py-1 font-mono whitespace-pre">
        {stats ? (
          <>
            TRIS:    {stats.triangles.toLocaleString()}{'\n'}
            VERTS:   {stats.vertices.toLocaleString()}{'\n'}
            MESHES:  {stats.meshes}{'\n'}
            GEO: <span className="text-[#0f0]">LOADED</span>
          </>
        ) : (
          <>
            TRIS:    ---{'\n'}
            VERTS:   ---{'\n'}
            MESHES:  ---{'\n'}
            GEO: <span className="animate-pulse">PARSING</span>
          </>
        )}
      </div>

      {/* Canvas sits behind all HUD elements */}
      <ModelErrorBoundary resetKey={`${resolvedPath}-${resetToken}`} fallback={<FallbackMessage />}>
        <Canvas
          className="w-full h-full cursor-crosshair"
          style={{ position: 'absolute', inset: 0, zIndex: 1 }}
          camera={{ position: [3.1, 1.7, 4], fov: 36 }}
          dpr={[1, 1]}
        >
          <Suspense fallback={<LoadingSpinner />}>
            <Scene
              model={model}
              modelPath={resolvedPath}
              resetToken={resetToken}
              autoRotate={autoRotate}
              wireframe={wireframe}
              camHudRef={camHudRef}
              onSceneReady={onSceneReady}
            />
          </Suspense>
        </Canvas>
      </ModelErrorBoundary>
    </div>
  )
}
