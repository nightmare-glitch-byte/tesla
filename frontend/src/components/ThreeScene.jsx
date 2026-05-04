import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei'

// ─── Constants ───────────────────────────────────────────────────────────────
const NATURAL_FREQS      = { A: 1.5, B: 2.0, C: 2.5 }
const BASE_AMP           = 0.36
const DAMPING_MULT       = { off: 1.0, passive: 0.42, adaptive: 0.18 }
const EQ_MULT            = 1.7
const RESONANCE_BW       = 0.32
const MAX_SWAY           = 0.70

// Lorentzian resonance peak
function resFactor(oscFreq, natFreq) {
  const d = oscFreq - natFreq
  return 1.0 / (1.0 + (d / RESONANCE_BW) ** 2)
}

// ─── Building ────────────────────────────────────────────────────────────────
function Building({ id, baseX, oscFreq, oscActive, dampingMode, earthquakeActive, damage, onClick, isSelected }) {
  const groupRef = useRef()
  const t        = useRef(0)
  const natFreq  = NATURAL_FREQS[id] || 2.0
  const numFloors = 10
  const floorH    = 0.3

  useFrame((_, delta) => {
    if (!groupRef.current) return
    t.current += delta

    let x = 0

    if (earthquakeActive) {
      // ── EARTHQUAKE MODE ──────────────────────────────────────────────────
      // Each building shakes at its OWN natural frequency (+ two neighbours)
      // so every building resonates during an earthquake.
      const dampM = DAMPING_MULT[dampingMode] ?? 1.0
      const dmgM  = 1.0 + (damage / 100) * 0.5
      const amp   = BASE_AMP * EQ_MULT * dampM * dmgM

      const f0 = natFreq                         // primary  – exact resonance
      const f1 = natFreq * 0.78 + 0.1            // lower neighbour
      const f2 = natFreq * 1.25 - 0.05           // upper neighbour

      x  =  amp        * Math.sin(2 * Math.PI * f0 * t.current)
      x += amp * 0.50  * Math.sin(2 * Math.PI * f1 * t.current + 1.3)
      x += amp * 0.30  * Math.sin(2 * Math.PI * f2 * t.current + 2.7)

    } else if (oscActive) {
      // ── OSCILLATOR MODE ─────────────────────────────────────────────────
      const res   = resFactor(oscFreq, natFreq)
      const dampM = DAMPING_MULT[dampingMode] ?? 1.0
      const dmgM  = 1.0 + (damage / 100) * 0.5
      const amp   = BASE_AMP * res * dampM * dmgM

      x = amp * Math.sin(2 * Math.PI * oscFreq * t.current)
    }
    // else: both off → x stays 0, building is still

    x = Math.max(-MAX_SWAY, Math.min(MAX_SWAY, x))
    groupRef.current.position.x = baseX + x
  })

  const color   = id === 'A' ? '#3b82f6' : id === 'B' ? '#06b6d4' : '#10b981'
  const opacity = 1.0 - (damage / 100) * 0.5

  return (
    <group
      ref={groupRef}
      position={[baseX, 0, 0]}
      onClick={(e) => { e.stopPropagation(); onClick && onClick(id) }}
      onPointerOver={() => { document.body.style.cursor = 'pointer' }}
      onPointerOut  ={() => { document.body.style.cursor = 'auto'   }}
    >
      <mesh position={[0, floorH * numFloors / 2, 0]}>
        <boxGeometry args={[0.8, floorH * numFloors, 0.8]} />
        <meshStandardMaterial
          color={color} transparent opacity={opacity}
          roughness={0.3} metalness={0.7}
          emissive={color} emissiveIntensity={isSelected ? 0.55 : 0.2}
        />
      </mesh>

      {Array.from({ length: numFloors }).map((_, i) => (
        <mesh key={i} position={[0, floorH * (i + 0.5), 0]}>
          <boxGeometry args={[0.85, 0.02, 0.85]} />
          <meshStandardMaterial color="#1a1f2e" />
        </mesh>
      ))}

      <mesh position={[0, floorH * numFloors + 0.3, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {isSelected && (
        <mesh position={[0, floorH * numFloors / 2, 0]}>
          <boxGeometry args={[0.95, floorH * numFloors + 0.1, 0.95]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.22} wireframe />
        </mesh>
      )}

      {damage > 5 && (
        <mesh position={[0, floorH * numFloors / 2, 0]}>
          <boxGeometry args={[0.82, floorH * numFloors, 0.82]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.28 + (damage / 100) * 0.18} wireframe />
        </mesh>
      )}
    </group>
  )
}

// ─── Tuned Mass Damper ────────────────────────────────────────────────────────
function TunedMassDamper({ baseX, oscFreq, oscActive, dampingMode, earthquakeActive, active, buildingId }) {
  const groupRef = useRef()
  const t        = useRef(0)
  const natFreq  = NATURAL_FREQS[buildingId] || 2.0

  useFrame((_, delta) => {
    if (!groupRef.current || !active) return
    t.current += delta

    const dampM = DAMPING_MULT[dampingMode] ?? 1.0
    let x = 0

    if (earthquakeActive) {
      const amp = BASE_AMP * 0.32 * EQ_MULT * dampM
      x = -amp * Math.sin(2 * Math.PI * natFreq * t.current)   // counter-phase at own nat freq
    } else if (oscActive) {
      const amp = BASE_AMP * 0.32 * dampM
      x = -amp * Math.sin(2 * Math.PI * oscFreq * t.current)   // counter-phase at osc freq
    }

    groupRef.current.position.x = baseX + Math.max(-MAX_SWAY, Math.min(MAX_SWAY, x))
  })

  if (!active) return null

  return (
    <group ref={groupRef} position={[baseX, 3.2, 0]}>
      <mesh>
        <cylinderGeometry args={[0.15, 0.15, 0.3, 16]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.2} metalness={0.9} emissive="#f59e0b" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <mesh position={[-0.2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
    </group>
  )
}

// ─── Tesla Oscillator ────────────────────────────────────────────────────────
function TeslaOscillator({ frequency, oscActive, earthquakeActive }) {
  const groupRef    = useRef()
  const cylinderRef = useRef()
  const t           = useRef(0)

  // visual "on" = oscActive AND NOT earthquakeActive
  const visuallyOn = oscActive && !earthquakeActive

  useFrame((_, delta) => {
    if (!groupRef.current || !cylinderRef.current) return
    t.current += delta

    if (visuallyOn) {
      groupRef.current.rotation.y = t.current * frequency * 1.2
      const pulse = 1.0 + Math.sin(t.current * frequency * 2 * Math.PI) * 0.12
      cylinderRef.current.scale.set(pulse, 1, pulse)
    } else {
      // slow down to rest
      groupRef.current.rotation.y *= 0.95
      cylinderRef.current.scale.set(1, 1, 1)
    }
  })

  return (
    <group ref={groupRef} position={[0, 0.5, 4]}>
      <mesh ref={cylinderRef}>
        <cylinderGeometry args={[0.3, 0.3, 1, 8]} />
        <meshStandardMaterial
          color="#8b5cf6" emissive="#8b5cf6"
          emissiveIntensity={visuallyOn ? 1.2 : 0.15}
          roughness={0.3} metalness={0.8}
        />
      </mesh>
      <pointLight color="#8b5cf6" intensity={visuallyOn ? 2.5 : 0.3} distance={6} />
      <mesh position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color={visuallyOn ? '#8b5cf6' : '#3b2a5e'} />
      </mesh>
    </group>
  )
}

// ─── Ground ──────────────────────────────────────────────────────────────────
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[20, 20, 20, 20]} />
      <meshStandardMaterial color="#0a0e1a" wireframe opacity={0.3} transparent />
    </mesh>
  )
}

// ─── Scene ───────────────────────────────────────────────────────────────────
function Scene({ data, oscFreq, oscActive, dampingMode, earthquakeActive, selectedBuilding, onBuildingSelect }) {
  if (!data || !data.buildings) return null

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#3b82f6" />

      <PerspectiveCamera makeDefault position={[8, 6, 8]} fov={50} />
      <OrbitControls enablePan enableZoom enableRotate maxPolarAngle={Math.PI / 2} />

      {data.buildings.map((building, i) => {
        const baseX    = i * 2 - 2
        const dmgVal   = building.damage || 0
        const isActive = dampingMode === 'passive' || dampingMode === 'adaptive'

        return (
          <React.Fragment key={building.id}>
            <Building
              id={building.id}
              baseX={baseX}
              oscFreq={oscFreq}
              oscActive={oscActive}
              dampingMode={dampingMode}
              earthquakeActive={earthquakeActive}
              damage={dmgVal}
              onClick={onBuildingSelect}
              isSelected={selectedBuilding === building.id}
            />
            <TunedMassDamper
              baseX={baseX}
              oscFreq={oscFreq}
              oscActive={oscActive}
              dampingMode={dampingMode}
              earthquakeActive={earthquakeActive}
              active={isActive}
              buildingId={building.id}
            />
          </React.Fragment>
        )
      })}

      <TeslaOscillator frequency={oscFreq} oscActive={oscActive} earthquakeActive={earthquakeActive} />
      <Ground />
      <Environment preset="night" />
    </>
  )
}

// ─── Export ──────────────────────────────────────────────────────────────────
export default function ThreeScene({ data, oscFreq, oscActive, dampingMode, earthquakeActive, selectedBuilding, onBuildingSelect }) {
  return (
    <Canvas shadows gl={{ antialias: true, alpha: false }} style={{ width: '100%', height: '100%', background: '#0a0e1a' }}>
      <Scene
        data={data}
        oscFreq={oscFreq}
        oscActive={oscActive}
        dampingMode={dampingMode}
        earthquakeActive={earthquakeActive}
        selectedBuilding={selectedBuilding}
        onBuildingSelect={onBuildingSelect}
      />
    </Canvas>
  )
}
