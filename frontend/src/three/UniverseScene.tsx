import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { AdditiveBlending, type Group } from 'three'

function CalibrationRig({ active }: { active: boolean }) {
  const rig = useRef<Group>(null)

  useFrame((state, delta) => {
    if (!rig.current) return
    if (active) {
      rig.current.rotation.y += delta * 0.12
      rig.current.rotation.x = Math.sin(state.clock.elapsedTime / 9) * 0.06
    }
  })

  return (
    <group ref={rig}>
      {/* Lit observation core so the mesh reads as volume, not a flat wireframe */}
      <mesh>
        <icosahedronGeometry args={[1.5, 2]} />
        <meshStandardMaterial
          color="#071322"
          emissive="#0b3a52"
          emissiveIntensity={0.55}
          metalness={0.55}
          roughness={0.42}
          flatShading
        />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[1.57, 2]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.16} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[1.74, 1]} />
        <meshBasicMaterial color="#8b7cf6" wireframe transparent opacity={0.05} />
      </mesh>

      {/* Halo disc for depth behind the core */}
      <mesh position={[0, 0, -1.4]}>
        <circleGeometry args={[3.6, 64]} />
        <meshBasicMaterial
          color="#0e7490"
          transparent
          opacity={0.12}
          blending={AdditiveBlending}
          depthWrite={false}
        />
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

      {/* Wide survey ring */}
      <mesh rotation={[Math.PI / 1.9, -0.62, -0.22]}>
        <torusGeometry args={[3.25, 0.0035, 8, 170]} />
        <meshBasicMaterial color="#3f6dff" transparent opacity={0.22} />
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
          <group key={index} position={[Math.cos(angle) * 2.45, Math.sin(angle) * 2.45, 0]}>
            <mesh>
              <sphereGeometry args={[0.026, 12, 12]} />
              <meshBasicMaterial color="#67e8f9" transparent opacity={0.9} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.075, 12, 12]} />
              <meshBasicMaterial
                color="#22d3ee"
                transparent
                opacity={0.16}
                blending={AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          </group>
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
      <ambientLight intensity={0.5} />
      <pointLight position={[4, 3, 5]} intensity={36} color="#22d3ee" distance={18} />
      <pointLight position={[-5, -3, 2]} intensity={28} color="#8b7cf6" distance={18} />
      <directionalLight position={[0, 5, 7]} intensity={0.7} color="#e8eefb" />
      <Stars radius={18} depth={32} count={900} factor={3} saturation={0} fade speed={reducedMotion ? 0 : 0.35} />
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
