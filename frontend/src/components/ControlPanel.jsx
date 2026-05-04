import React from 'react'
import './ControlPanel.css'

export default function ControlPanel({
  sendCommand,
  simulationData,
  frequency, onFrequencyChange,
  oscActive, onOscActiveChange,
  dampingMode, onDampingMode,
  earthquakeActive, onEarthquakeToggle
}) {
  // Get damage values from backend (source of truth)
  const buildings = simulationData?.buildings || []
  const damageA = buildings.find(b => b.id === 'A')?.damage || 0
  const damageB = buildings.find(b => b.id === 'B')?.damage || 0
  const damageC = buildings.find(b => b.id === 'C')?.damage || 0

  // ── Oscillator toggle ──
  const handleOscToggle = () => {
    const next = !oscActive
    onOscActiveChange(next)
    sendCommand('set_oscillator_active', next)
  }

  // ── Frequency slider (only visible when oscillator is on) ──
  const handleFrequencyChange = (e) => {
    const value = parseFloat(e.target.value)
    onFrequencyChange(value)
    sendCommand('set_frequency', value)
  }

  // ── Earthquake toggle ──
  const handleEarthquakeToggle = () => {
    const next = !earthquakeActive
    onEarthquakeToggle(next)

    if (next) {
      // starting earthquake → stop oscillator
      sendCommand('trigger_earthquake')
      if (oscActive) {
        onOscActiveChange(false)
        sendCommand('set_oscillator_active', false)
      }
    } else {
      // stopping earthquake → restore oscillator
      sendCommand('stop_earthquake')
      onOscActiveChange(true)
      sendCommand('set_oscillator_active', true)
    }
  }

  // ── Damage ──
  const handleDamageChange = (buildingId, value) => {
    const damage = parseFloat(value)
    sendCommand('set_damage', damage, buildingId)
  }

  // ── Damping mode ──
  const handleDampingMode = (mode) => {
    onDampingMode(mode)
    sendCommand('set_damping_mode', mode)
  }

  // ── Reset ──
  const handleReset = () => {
    sendCommand('reset')
    onFrequencyChange(1.5)
    onOscActiveChange(true)
    sendCommand('set_oscillator_active', true)
    onDampingMode('off')
    if (earthquakeActive) onEarthquakeToggle(false)
  }

  const naturalFreqs = { A: 1.5, B: 2.0, C: 2.5 }
  const damageValues = { A: damageA, B: damageB, C: damageC }

  return (
    <div className="control-panel">

      {/* ── Tesla Oscillator ON/OFF + Frequency ── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Tesla Oscillator</h3>
          {/* ON / OFF pill toggle */}
          <div className="osc-toggle-wrap">
            <button
              className={`osc-pill ${oscActive && !earthquakeActive ? 'osc-on' : 'osc-off'}`}
              onClick={handleOscToggle}
              disabled={earthquakeActive}
            >
              {oscActive && !earthquakeActive ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div className="card-content">
          {/* frequency slider */}
          <div className="slider-container" style={{ opacity: (oscActive && !earthquakeActive) ? 1 : 0.35 }}>
            <div className="slider-label">
              <span>Frequency</span>
              <span className="slider-value">{frequency.toFixed(2)} Hz</span>
            </div>
            <input
              type="range" min="0.5" max="3.5" step="0.05"
              value={frequency}
              onChange={handleFrequencyChange}
              className="slider"
              disabled={!oscActive || earthquakeActive}
            />
            {/* resonance hint */}
            <div className="resonance-hint">
              {oscActive && !earthquakeActive && Math.abs(frequency - 1.5) < 0.15 && <span style={{ color: '#3b82f6' }}>● Building A at resonance</span>}
              {oscActive && !earthquakeActive && Math.abs(frequency - 2.0) < 0.15 && <span style={{ color: '#06b6d4' }}>● Building B at resonance</span>}
              {oscActive && !earthquakeActive && Math.abs(frequency - 2.5) < 0.15 && <span style={{ color: '#10b981' }}>● Building C at resonance</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Earthquake Toggle ── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Seismic Event</h3>
          {earthquakeActive && <span className="earthquake-badge">ACTIVE</span>}
        </div>
        <div className="card-content">
          <button
            onClick={handleEarthquakeToggle}
            className={`btn earthquake-toggle ${earthquakeActive ? 'earthquake-on' : 'earthquake-off'}`}
            style={{ width: '100%' }}
          >
            {earthquakeActive ? '🌍 Stop Earthquake' : '🌍 Start Earthquake'}
          </button>
        </div>
      </div>

      {/* ── Damping Mode ── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Damping Control</h3>
        </div>
        <div className="card-content">
          <div className="mode-buttons">
            <button className={`btn ${dampingMode === 'off' ? 'btn-primary' : ''}`} onClick={() => handleDampingMode('off')}>
              No Damper  <span className="mode-sub">(max vibration)</span>
            </button>
            <button className={`btn ${dampingMode === 'passive' ? 'btn-primary' : ''}`} onClick={() => handleDampingMode('passive')}>
              Passive TMD  <span className="mode-sub">(less vibration)</span>
            </button>
            <button className={`btn ${dampingMode === 'adaptive' ? 'btn-primary' : ''}`} onClick={() => handleDampingMode('adaptive')}>
              Adaptive AI  <span className="mode-sub">(least vibration)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Damage Sliders ── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Structural Damage</h3>
        </div>
        <div className="card-content">
          {['A', 'B', 'C'].map((id) => {
            const val = damageValues[id]
            const color = id === 'A' ? '#3b82f6' : id === 'B' ? '#06b6d4' : '#10b981'
            return (
              <div className="slider-container" key={id}>
                <div className="slider-label">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
                    Building {id}
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>({naturalFreqs[id]} Hz)</span>
                  </span>
                  <span className="slider-value">{val.toFixed(0)}%</span>
                </div>
                <input
                  type="range" min="0" max="80" step="1"
                  value={val}
                  onChange={(e) => handleDamageChange(id, e.target.value)}
                  className="slider"
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Reset ── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">System Controls</h3>
        </div>
        <div className="card-content">
          <button onClick={handleReset} className="btn" style={{ width: '100%' }}>
            🔄 Reset Simulation
          </button>
        </div>
      </div>
    </div>
  )
}
