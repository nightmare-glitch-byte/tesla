import React from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const BLD_BG   = { A: 'rgba(59,130,246,0.55)', B: 'rgba(6,182,212,0.55)', C: 'rgba(16,185,129,0.55)' }
const BLD_LINE = { A: '#3b82f6',               B: '#06b6d4',               C: '#10b981' }

// ─── FFT Panel ────────────────────────────────────────────────────────────────
export function FFTPanel({ simulationData, selectedBuilding }) {
  if (!simulationData || !simulationData.fft) {
    return (
      <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="card-header"><h3 className="card-title">🔬 Frequency Analysis (FFT)</h3></div>
        <div className="card-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <p className="text-secondary">Waiting for FFT data…</p>
        </div>
      </div>
    )
  }

  const id      = selectedBuilding || 'A'
  const fftData = simulationData.fft[id] || { frequencies: [], magnitudes: [] }
  
  // If no data yet, show waiting message
  if (!fftData.frequencies || fftData.frequencies.length === 0) {
    return (
      <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="card-header">
          <h3 className="card-title">🔬 FFT – Building {id}</h3>
          <span className="mono text-sm" style={{ color: BLD_LINE[id] }}>Building up data…</span>
        </div>
        <div className="card-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <p className="text-secondary">Collecting samples for FFT analysis…</p>
        </div>
      </div>
    )
  }

  const labels = fftData.frequencies.map(f => (typeof f === 'number' ? f.toFixed(2) : String(f)))

  const data = {
    labels,
    datasets: [{
      label: 'Magnitude',
      data: fftData.magnitudes,
      backgroundColor: BLD_BG[id]  || BLD_BG.A,
      borderColor:     BLD_LINE[id] || BLD_LINE.A,
      borderWidth: 1
    }]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: {
      x: {
        display: true,
        title: { display: true, text: 'Frequency (Hz)', color: '#64748b' },
        grid: { color: '#1e293b' },
        ticks: { color: '#64748b', maxTicksLimit: 10 }
      },
      y: {
        display: true,
        title: { display: true, text: 'Magnitude', color: '#64748b' },
        grid: { color: '#1e293b' },
        ticks: { color: '#64748b' }
      }
    }
  }

  const domFreq = fftData.dominant_freq || 0

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <h3 className="card-title">🔬 FFT – Building {id}</h3>
        <span className="mono text-sm" style={{ color: BLD_LINE[id] }}>
          Peak: {domFreq.toFixed(2)} Hz
        </span>
      </div>
      <div className="card-content" style={{ flex: 1, minHeight: 0 }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  )
}

// ─── Health Dashboard ────────────────────────────────────────────────────────
export function HealthDashboard({ simulationData }) {
  if (!simulationData || !simulationData.buildings) {
    return (
      <div className="card">
        <div className="card-header"><h3 className="card-title">🏥 Structural Health</h3></div>
        <div className="card-content"><p className="text-secondary">No health data</p></div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header"><h3 className="card-title">🏥 Structural Health</h3></div>
      <div className="card-content">
        {simulationData.buildings.map((building) => {
          const health   = building.health || 100
          const color    = BLD_LINE[building.id] || '#3b82f6'
          const barColor = health > 90 ? '#10b981' : health > 70 ? '#f59e0b' : '#ef4444'

          return (
            <div key={building.id} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '0.875rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
                  Building {building.id}
                </span>
                <span className="mono" style={{ color: barColor, fontWeight: 600 }}>
                  {health.toFixed(0)}%
                </span>
              </div>

              <div style={{ width: '100%', height: 8, background: '#1a1f2e', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${health}%`, height: '100%', background: barColor, transition: 'width 0.3s ease' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.75rem', color: '#64748b' }}>
                <span>Natural: {building.natural_freq?.toFixed(2)} Hz</span>
                <span>Current: {building.current_freq?.toFixed(2)} Hz</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── AI Status Panel ─────────────────────────────────────────────────────────
export function AIStatusPanel({ simulationData }) {
  if (!simulationData || !simulationData.ai) {
    return (
      <div className="card">
        <div className="card-header"><h3 className="card-title">🤖 AI Control System</h3></div>
        <div className="card-content"><p className="text-secondary">AI system idle</p></div>
      </div>
    )
  }

  const aiA          = simulationData.ai.A || {}
  const phases       = ['sense', 'learn', 'predict', 'act', 'verify', 'improve']
  const currentPhase = aiA.phase || 'idle'
  const mode         = simulationData.damping_mode || 'off'

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">🤖 AI Control System</h3>
        <span className="mono text-xs" style={{ color: mode === 'adaptive' ? '#10b981' : '#64748b' }}>
          {mode.toUpperCase()}
        </span>
      </div>
      <div className="card-content">
        <div style={{ marginBottom: 16 }}>
          <div className="text-xs text-secondary" style={{ marginBottom: 8 }}>Control Loop</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {phases.map(phase => (
              <div key={phase} style={{
                padding: '4px 8px', borderRadius: 4, fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                background: phase === currentPhase ? '#06b6d4' : '#1a1f2e',
                color:      phase === currentPhase ? '#0a0e1a' : '#64748b',
                fontWeight: phase === currentPhase ? 600 : 400,
                border:    `1px solid ${phase === currentPhase ? '#06b6d4' : '#1e293b'}`,
                transition: 'all 0.3s ease'
              }}>
                {phase.toUpperCase()}
              </div>
            ))}
          </div>
        </div>

        {mode === 'adaptive' && (
          <>
            {[
              ['Learned Freq', `${(aiA.learned_freq || 0).toFixed(2)} Hz`, '#06b6d4'],
              ['Optimal Freq', `${(aiA.optimal_freq || 0).toFixed(2)} Hz`, '#06b6d4'],
              ['Confidence',   `${((aiA.confidence || 0) * 100).toFixed(0)}%`, '#10b981']
            ].map(([label, val, col]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #1e293b' }}>
                <span className="text-sm text-secondary">{label}</span>
                <span className="mono text-sm" style={{ color: col }}>{val}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Metrics Panel (fully client-side, meaningful values) ────────────────────
export function MetricsPanel({ simulationData, oscFreq, oscActive, dampingMode, earthquakeActive }) {
  const time = simulationData?.time || 0

  // ── Max Displacement ── derived from visual amplitude (same math as 3D)
  // We take the largest amplitude across A/B/C given current settings.
  const NATURAL_FREQS = { A: 1.5, B: 2.0, C: 2.5 }
  const BASE_AMP      = 0.36
  const DAMPING_MULT  = { off: 1.0, passive: 0.42, adaptive: 0.18 }
  const EQ_MULT       = 1.7
  const RESONANCE_BW  = 0.32

  let maxDisp = 0
  const buildings = simulationData?.buildings || []
  buildings.forEach(b => {
    const natFreq = NATURAL_FREQS[b.id] || 2.0
    const dampM   = DAMPING_MULT[dampingMode] ?? 1.0
    const dmgM    = 1.0 + ((b.damage || 0) / 100) * 0.5
    let amp = 0
    if (earthquakeActive) {
      amp = BASE_AMP * EQ_MULT * dampM * dmgM
    } else if (oscActive) {
      const d   = oscFreq - natFreq
      const res = 1.0 / (1.0 + (d / RESONANCE_BW) ** 2)
      amp = BASE_AMP * res * dampM * dmgM
    }
    if (amp > maxDisp) maxDisp = amp
  })

  // ── Damping Effectiveness ── meaningful: 0 when off, ~58% passive, ~82% adaptive
  const DAMP_EFF = { off: 0, passive: 58, adaptive: 82 }
  const dampEff  = DAMP_EFF[dampingMode] ?? 0

  // ── Active Frequency ── what's actually driving the system
  let activeFreqLabel = '—'
  if (earthquakeActive) {
    activeFreqLabel = '1.5 / 2.0 / 2.5 Hz'   // all building freqs simultaneously
  } else if (oscActive) {
    activeFreqLabel = `${oscFreq.toFixed(2)} Hz`
  }

  // ── Mode status
  let modeLabel = 'Idle'
  let modeColor = '#64748b'
  if (earthquakeActive)      { modeLabel = 'Earthquake'; modeColor = '#ef4444' }
  else if (oscActive)        { modeLabel = 'Oscillating'; modeColor = '#06b6d4' }

  // ── Rows ──
  const rows = [
    ['Simulation Time',       `${time.toFixed(1)} s`,                    null],
    ['Mode',                  modeLabel,                                 modeColor],
    ['Active Frequency',      activeFreqLabel,                           '#f59e0b'],
    ['Max Displacement',      `${(maxDisp * 100).toFixed(1)} cm`,        '#f59e0b'],
    ['Damping Effectiveness', dampEff > 0 ? `${dampEff}%` : 'Off',      dampEff > 0 ? '#06b6d4' : '#64748b'],
  ]

  return (
    <div className="card">
      <div className="card-header"><h3 className="card-title">📊 Performance Metrics</h3></div>
      <div className="card-content">
        {rows.map(([label, val, col], i) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: i > 0 ? '1px solid #1e293b' : 'none' }}>
            <span className="text-sm text-secondary">{label}</span>
            <span className="mono text-sm" style={col ? { color: col } : {}}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
