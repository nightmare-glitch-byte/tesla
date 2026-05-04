import React, { useRef, useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler
} from 'chart.js'
import './ECGMonitor.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler)

// ── same constants as ThreeScene ─────────────────────────────────────────────
const NATURAL_FREQS = { A: 1.5, B: 2.0, C: 2.5 }
const BASE_AMP      = 0.36
const DAMPING_MULT  = { off: 1.0, passive: 0.42, adaptive: 0.18 }
const EQ_MULT       = 1.7
const RESONANCE_BW  = 0.32
const BLD_COLORS    = { A: '#3b82f6', B: '#06b6d4', C: '#10b981' }

function resFactor(oscFreq, natFreq) {
  const d = oscFreq - natFreq
  return 1.0 / (1.0 + (d / RESONANCE_BW) ** 2)
}

// ── generate one sample ─────────────────────────────────────────────────────
function sampleDisplacement(t, { id, oscFreq, oscActive, earthquakeActive, dampingMode, damage }) {
  const natFreq = NATURAL_FREQS[id] || 2.0
  const dampM   = DAMPING_MULT[dampingMode] ?? 1.0
  const dmgM    = 1.0 + (damage / 100) * 0.5

  if (earthquakeActive) {
    const amp = BASE_AMP * EQ_MULT * dampM * dmgM
    const f0  = natFreq
    const f1  = natFreq * 0.78 + 0.1
    const f2  = natFreq * 1.25 - 0.05
    return  amp        * Math.sin(2 * Math.PI * f0 * t)
          + amp * 0.50 * Math.sin(2 * Math.PI * f1 * t + 1.3)
          + amp * 0.30 * Math.sin(2 * Math.PI * f2 * t + 2.7)
  }

  if (oscActive) {
    const res = resFactor(oscFreq, natFreq)
    const amp = BASE_AMP * res * dampM * dmgM
    return amp * Math.sin(2 * Math.PI * oscFreq * t)
  }

  return 0
}

// ── component ───────────────────────────────────────────────────────────────
export default function ECGMonitor({ simulationData, selectedBuilding, earthquakeActive, oscFreq, oscActive, dampingMode }) {
  // rolling time ref shared across renders
  const tRef      = useRef(0)
  const lastRef   = useRef(performance.now())

  // buffer: 200 points spanning ~4 seconds
  const POINTS    = 200
  const DURATION  = 4.0                        // seconds shown
  const dt        = DURATION / POINTS          // time per sample

  const [buffer, setBuffer] = useState(() => Array(POINTS).fill(0))

  // damage for the selected building - must be reactive
  const building = simulationData?.buildings?.find(b => b.id === selectedBuilding)
  const damage   = building?.damage || 0

  // Reset time when building changes so waveform restarts cleanly
  const prevBuildingRef = useRef(selectedBuilding)
  useEffect(() => {
    if (prevBuildingRef.current !== selectedBuilding) {
      tRef.current = 0
      lastRef.current = performance.now()
      prevBuildingRef.current = selectedBuilding
    }
  }, [selectedBuilding])

  useEffect(() => {
    let animId
    function tick() {
      const now  = performance.now()
      const elap = (now - lastRef.current) / 1000   // seconds since last frame
      lastRef.current = now
      tRef.current += elap

      // Get current damage value fresh each frame
      const currentDamage = simulationData?.buildings?.find(b => b.id === selectedBuilding)?.damage || 0

      // build the full buffer by sampling backward in time
      const buf = new Array(POINTS)
      for (let i = 0; i < POINTS; i++) {
        const sampleT = tRef.current - (POINTS - 1 - i) * dt
        buf[i] = sampleDisplacement(sampleT, {
          id: selectedBuilding,
          oscFreq,
          oscActive,
          earthquakeActive,
          dampingMode,
          damage: currentDamage
        })
      }
      setBuffer(buf)
      animId = requestAnimationFrame(tick)
    }
    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [selectedBuilding, oscFreq, oscActive, earthquakeActive, dampingMode, simulationData])

  // ── derive state badge ──
  const currentDamage = building?.damage || 0
  const state         = earthquakeActive ? 'earthquake' : currentDamage > 5 ? 'damaged' : 'normal'
  const stateColor    = state === 'earthquake' ? '#f59e0b' : state === 'damaged' ? '#ef4444' : '#10b981'
  const lineColor     = BLD_COLORS[selectedBuilding] || '#3b82f6'

  // ── labels: just evenly spaced time strings ──
  const labels = Array.from({ length: POINTS }, (_, i) => {
    const sec = (i * dt).toFixed(1)
    // only show every 40th label to avoid clutter
    return i % 40 === 0 ? sec : ''
  })

  const chartData = {
    labels,
    datasets: [{
      label: 'Displacement',
      data: buffer,
      borderColor: lineColor,
      backgroundColor: `${lineColor}14`,
      borderWidth: 1.8,
      fill: true,
      tension: 0.3,
      pointRadius: 0
    }]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: {
        display: true,
        grid: { color: '#1e293b' },
        ticks: { color: '#64748b', font: { size: 9 }, maxTicksLimit: 8 }
      },
      y: {
        display: true,
        grid: { color: '#1e293b' },
        ticks: { color: '#64748b', font: { size: 9 } },
        // fixed symmetric range so the wave fills the chart nicely
        min: -0.85,
        max:  0.85
      }
    }
  }

  return (
    <div className="card ecg-card">
      <div className="card-header">
        <h3 className="card-title">📈 ECG – Building {selectedBuilding}</h3>
        <div className="header-badges">
          <div className="building-indicator" style={{ backgroundColor: lineColor }}>
            {selectedBuilding}
          </div>
          <div className={`state-badge state-${state}`}>{state.toUpperCase()}</div>
          {currentDamage > 0 && <div className="damage-badge">DMG {currentDamage.toFixed(0)}%</div>}
        </div>
      </div>
      <div className="card-content ecg-chart-container">
        <Line data={chartData} options={options} />
      </div>
    </div>
  )
}
