import React, { useState, useEffect, useRef } from 'react'
import ThreeScene from './components/ThreeScene'
import ControlPanel from './components/ControlPanel'
import ECGMonitor from './components/ECGMonitor'
import { FFTPanel, HealthDashboard, AIStatusPanel, MetricsPanel } from './components/DashboardComponents'
import './App.css'

function App() {
  // ── connection ──
  const [connected, setConnected]           = useState(false)
  const [simulationData, setSimulationData] = useState(null)
  const ws = useRef(null)

  // ── control state ──
  const [frequency,        setFrequency]        = useState(1.5)
  const [oscActive,        setOscActive]        = useState(true)
  const [dampingMode,      setDampingMode]      = useState('off')
  const [earthquakeActive, setEarthquakeActive] = useState(false)
  const [selectedBuilding, setSelectedBuilding] = useState('A')

  // ── WebSocket ──
  useEffect(() => {
    const connectWebSocket = () => {
      const socket = new WebSocket('ws://localhost:8000/ws')

      socket.onopen = () => {
        console.log('✓ Connected to simulation backend')
        setConnected(true)
      }

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        setSimulationData(data)

        // backend can end earthquake on its own (10s duration) → sync toggle off
        if (data.earthquake_active === false && earthquakeActive) {
          setEarthquakeActive(false)
          setOscActive(true)
          // tell backend oscillator is back on
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ command: 'set_oscillator_active', value: true }))
          }
        }
      }

      socket.onerror = (error) => console.error('WebSocket error:', error)

      socket.onclose = () => {
        console.log('✗ Disconnected from backend')
        setConnected(false)
        setTimeout(connectWebSocket, 3000)
      }

      ws.current = socket
    }

    connectWebSocket()
    return () => { if (ws.current) ws.current.close() }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── send helper ──
  const sendCommand = (command, value, buildingId = null) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const payload = { command, value }
      if (buildingId) payload.building_id = buildingId
      ws.current.send(JSON.stringify(payload))
    }
  }

  // ── render ──
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="title-section">
            <h1 className="gradient-text">AI-Driven Resonance Simulator</h1>
            <p className="subtitle">Structural Health Monitoring &amp; Adaptive Control</p>
          </div>
          <div className="status-indicator">
            <div className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
            <span className="mono">{connected ? 'LIVE' : 'CONNECTING…'}</span>
          </div>
        </div>
      </header>

      <div className="main-layout">
        {/* Left – Controls */}
        <aside className="sidebar sidebar-left">
          <ControlPanel
            sendCommand={sendCommand}
            frequency={frequency}
            onFrequencyChange={setFrequency}
            oscActive={oscActive}
            onOscActiveChange={setOscActive}
            dampingMode={dampingMode}
            onDampingMode={setDampingMode}
            earthquakeActive={earthquakeActive}
            onEarthquakeToggle={setEarthquakeActive}
          />
        </aside>

        {/* Center – 3D + graphs */}
        <main className="main-content">
          <div className="visualization-container">
            {simulationData ? (
              <ThreeScene
                data={simulationData}
                oscFreq={frequency}
                oscActive={oscActive}
                dampingMode={dampingMode}
                earthquakeActive={earthquakeActive}
                selectedBuilding={selectedBuilding}
                onBuildingSelect={setSelectedBuilding}
              />
            ) : null}

            {!connected && (
              <div className="connecting-overlay">
                <div className="spinner" />
                <p>Connecting to simulation engine…</p>
              </div>
            )}
          </div>

          {/* Bottom – ECG + FFT */}
          <div className="monitoring-panel">
            <div className="monitoring-grid">
              <ECGMonitor
                simulationData={simulationData}
                selectedBuilding={selectedBuilding}
                earthquakeActive={earthquakeActive}
                oscFreq={frequency}
                oscActive={oscActive}
                dampingMode={dampingMode}
              />
              <FFTPanel
                simulationData={simulationData}
                selectedBuilding={selectedBuilding}
              />
            </div>
          </div>
        </main>

        {/* Right – Health / AI / Metrics */}
        <aside className="sidebar sidebar-right">
          <HealthDashboard simulationData={simulationData} />
          <AIStatusPanel   simulationData={simulationData} />
          <MetricsPanel
            simulationData={simulationData}
            oscFreq={frequency}
            oscActive={oscActive}
            dampingMode={dampingMode}
            earthquakeActive={earthquakeActive}
          />
        </aside>
      </div>
    </div>
  )
}

export default App
