import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { Group } from 'three'

function CalibrationRig({ active }: { active: boolean }) {
  const rig = useRef<Group>(null)

  useFrame((_, delta) => {
    if (!active || !rig.current) return
    rig.current.rotation.y += delta * 0.12
    rig.current.rotation.x = Math.sin(performance.now() / 9000) * 0.06
  })

  return (
    <group ref={rig}>
      {/* Observation sphere */}
      <mesh>
        <icosahedronGeometry args={[1.55, 2]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.16} />
      </mesh>

      {/* Equatorial lens ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.45, 0.007, 8, 140]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.5} />
      </mesh>

      {/* Inclined orbital ring */}
      <mesh rotation={[Math.PI / 2.35, 0.42, 0.15]}>
        <torusGeometry args={[2.9, 0.005, 8, 160]} />
        <meshBasicMaterial color="#8b7cf6" transparent opacity={0.38} />
      </mesh>

      {/* Secondary meridian */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[2.45, 0.004, 8, 140]} />
        <meshBasicMaterial color="#8b7cf6" transparent opacity={0.18} />
      </mesh>

      {/* Aperture markers, positioned from geometry only (not data) */}
      {Array.from({ length: 6 }).map((_, index) => {
        const angle = (index / 6) * Math.PI * 2
        return (
          <mesh key={index} position={[Math.cos(angle) * 2.45, Math.sin(angle) * 2.45, 0]}>
            <sphereGeometry args={[0.022, 12, 12]} />
            <meshBasicMaterial color="#67e8f9" transparent opacity={0.85} />
          </mesh>
        )
      })}
    </group>
  )
}

export function UniverseScene({ autoRotate, reducedMotion }: { autoRotate: boolean; reducedMotion: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.8]}
      camera={{ position: [0, 1.4, 6.4], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      aria-label="Standby three-dimensional observatory calibration view"
      role="img"
    >
      <ambientLight intensity={0.6} />
      <CalibrationRig active={autoRotate && !reducedMotion} />
      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={4.2}
        maxDistance={9}
        autoRotate={autoRotate && !reducedMotion}
        autoRotateSpeed={0.35}
        dampingFactor={0.06}
        enableDamping
      />
    </Canvas>
  )
}
