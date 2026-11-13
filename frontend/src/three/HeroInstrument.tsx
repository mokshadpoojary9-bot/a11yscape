import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Group, Mesh, Points } from 'three'

/**
 * Decorative calibration instrument for the overview hero.
 *
 * It visualises the instrument itself — a wireframe observation core inside
 * orbital rings and a dust field — not any scan result. It is hidden from
 * assistive technology, and stops animating when reduced motion is requested.
 */

function DustField({ active }: { active: boolean }) {
  const points = useRef<Points>(null)

  const positions = useMemo(() => {
    const count = 320
    const array = new Float32Array(count * 3)
    for (let index = 0; index < count; index += 1) {
      const radius = 2.35 + Math.random() * 2.1
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      array[index * 3] = radius * Math.sin(phi) * Math.cos(theta)
      array[index * 3 + 1] = radius * Math.cos(phi) * 0.62
      array[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
    }
    return array
  }, [])

  useFrame((_, delta) => {
    if (!active || !points.current) return
    points.current.rotation.y += delta * 0.018
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#67e8f9"
        size={0.021}
        sizeAttenuation
        transparent
        opacity={0.55}
        depthWrite={false}
      />
    </points>
  )
}

function ApertureRing({
  radius,
  tilt,
  color,
  opacity,
  speed,
  active,
  markers = 0,
}: {
  radius: number
  tilt: [number, number, number]
  color: string
  opacity: number
  speed: number
  active: boolean
  markers?: number
}) {
  const ring = useRef<Group>(null)

  useFrame((_, delta) => {
    if (!active || !ring.current) return
    ring.current.rotation.z += delta * speed
  })

  return (
    <group ref={ring} rotation={tilt}>
      <mesh>
        <torusGeometry args={[radius, 0.0055, 8, 190]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
      {Array.from({ length: markers }).map((_, index) => {
        const angle = (index / markers) * Math.PI * 2
        return (
          <mesh key={index} position={[Math.cos(angle) * radius, Math.sin(angle) * radius, 0]}>
            <sphereGeometry args={[0.024, 10, 10]} />
            <meshBasicMaterial color="#a5f3fc" transparent opacity={0.75} />
          </mesh>
        )
      })}
    </group>
  )
}

function InstrumentRig({ reducedMotion }: { reducedMotion: boolean }) {
  const rig = useRef<Group>(null)
  const tilt = useRef<Group>(null)
  const sweep = useRef<Mesh>(null)
  const active = !reducedMotion

  useFrame((state, delta) => {
    if (rig.current && active) {
      rig.current.rotation.y += delta * 0.085
      rig.current.rotation.x = Math.sin(state.clock.elapsedTime / 9) * 0.05
    }
    if (sweep.current && active) {
      sweep.current.rotation.z += delta * 0.42
    }
    if (tilt.current) {
      const targetY = active ? state.pointer.x * 0.16 + 0.1 : 0.1
      const targetX = active ? state.pointer.y * -0.1 + 0.22 : 0.22
      tilt.current.rotation.y += (targetY - tilt.current.rotation.y) * 0.035
      tilt.current.rotation.x += (targetX - tilt.current.rotation.x) * 0.035
    }
  })

  return (
    <group ref={tilt}>
      <ambientLight intensity={0.65} />
      <pointLight position={[3.4, 2.4, 4]} intensity={28} color="#22d3ee" distance={14} />
      <pointLight position={[-4, -2.6, 2.4]} intensity={22} color="#8b7cf6" distance={14} />
      <directionalLight position={[0, 4, 6]} intensity={0.8} color="#e8eefb" />

      <group ref={rig}>
        {/* Observation core */}
        <mesh>
          <icosahedronGeometry args={[1.08, 1]} />
          <meshStandardMaterial
            color="#0a1626"
            emissive="#0e7490"
            emissiveIntensity={0.42}
            metalness={0.72}
            roughness={0.26}
            flatShading
          />
        </mesh>
        <mesh>
          <icosahedronGeometry args={[1.21, 1]} />
          <meshBasicMaterial color="#67e8f9" wireframe transparent opacity={0.18} />
        </mesh>
        <mesh>
          <icosahedronGeometry args={[0.16, 2]} />
          <meshBasicMaterial color="#cffafe" transparent opacity={0.9} />
        </mesh>

        <ApertureRing
          radius={1.82}
          tilt={[Math.PI / 2, 0, 0]}
          color="#22d3ee"
          opacity={0.5}
          speed={0.1}
          active={active}
          markers={4}
        />
        <ApertureRing
          radius={2.18}
          tilt={[Math.PI / 2.5, 0.34, 0.12]}
          color="#8b7cf6"
          opacity={0.4}
          speed={-0.07}
          active={active}
          markers={3}
        />
        <ApertureRing
          radius={2.55}
          tilt={[Math.PI / 2.05, -0.5, -0.2]}
          color="#3f6dff"
          opacity={0.28}
          speed={0.05}
          active={active}
        />

        {/* Equatorial meridian */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[1.82, 0.0035, 8, 170]} />
          <meshBasicMaterial color="#8b7cf6" transparent opacity={0.2} />
        </mesh>

        {/* Sweeping aperture arm */}
        <mesh ref={sweep} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.66, 1.7, 64, 1, 0, Math.PI / 3.4]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.16} side={2} />
        </mesh>

        <DustField active={active} />
      </group>
    </group>
  )
}

export function HeroInstrument({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <Canvas
      aria-hidden="true"
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 5.9], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      frameloop={reducedMotion ? 'demand' : 'always'}
    >
      <InstrumentRig reducedMotion={reducedMotion} />
    </Canvas>
  )
}
