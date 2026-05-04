# TECHNICAL SPECIFICATION
## AI-Driven Resonance & Structural Health Monitoring Simulator

---

## 1. SYSTEM OVERVIEW

### 1.1 Purpose
A real-time digital twin demonstrating structural resonance, earthquake response, and AI-based adaptive vibration control.

### 1.2 Key Innovation
- First-of-its-kind ECG-style continuous monitoring for buildings
- Real-time adaptive TMD control using AI
- Educational-grade physics accuracy with professional visualization

### 1.3 Target Users
- Engineering students (undergraduate/graduate)
- Researchers in structural dynamics
- Smart infrastructure developers
- Educational institutions

---

## 2. ARCHITECTURE

### 2.1 System Components

```
┌──────────────────────────────────────────┐
│         PRESENTATION LAYER               │
│  (React + Three.js + Chart.js)           │
│  - 3D Visualization                      │
│  - Real-time Charts                      │
│  - Interactive Controls                  │
└──────────────────────────────────────────┘
                    ↕ WebSocket
┌──────────────────────────────────────────┐
│         APPLICATION LAYER                │
│  (FastAPI)                               │
│  - WebSocket Management                  │
│  - Command Processing                    │
│  - State Broadcasting                    │
└──────────────────────────────────────────┘
                    ↕
┌──────────────────────────────────────────┐
│         BUSINESS LOGIC LAYER             │
│  - Simulation Engine                     │
│  - Physics Solver (Newmark-β)            │
│  - Signal Processing (FFT, ECG)          │
│  - AI Controller (Adaptive Learning)     │
└──────────────────────────────────────────┘
                    ↕
┌──────────────────────────────────────────┐
│         DATA LAYER                       │
│  - Building State                        │
│  - Time-series Data                      │
│  - Health Metrics                        │
│  - Control Parameters                    │
└──────────────────────────────────────────┘
```

### 2.2 Communication Protocol

**WebSocket Message Format:**
```json
{
  "command": "string",
  "value": "any",
  "building_id": "optional_string"
}
```

**Data Stream Format:**
```json
{
  "time": "float",
  "buildings": "array",
  "oscillator": "object",
  "fft": "object",
  "ecg": "object",
  "ai": "object",
  "metrics": "object"
}
```

---

## 3. PHYSICS ENGINE

### 3.1 Governing Equations

**Multi-DOF Equation of Motion:**
```
M·ẍ + C·ẋ + K·x = F(t)
```

Where:
- M: Mass matrix (N × N diagonal)
- C: Damping matrix (Rayleigh: C = αM + βK)
- K: Stiffness matrix (N × N tri-diagonal)
- x: Displacement vector
- F(t): External force vector

### 3.2 Numerical Integration

**Newmark-β Method:**
- Parameters: β = 0.25, γ = 0.5 (average acceleration)
- Unconditionally stable
- Second-order accurate

**Update Equations:**
```
K_eff = K + (γ/(β·Δt))C + (1/(β·Δt²))M
F_eff = F + M·[x/(β·Δt²) + ẋ/(β·Δt) + (1/(2β)-1)ẍ]
         + C·[(γ/(β·Δt))x + (γ/β-1)ẋ + (Δt/2)(γ/β-1)ẍ]
x_new = K_eff⁻¹ · F_eff
```

### 3.3 Damage Modeling

**Stiffness Degradation:**
```
K(t) = K₀ · (1 - D)
```
- D: Damage ratio (0 ≤ D ≤ 0.2)
- Results in natural frequency shift: ω(t) = ω₀√(1-D)

---

## 4. STRUCTURAL MODELS

### 4.1 Building Specifications

| Building | Natural Freq | Mass/Floor | Stiffness | Damping Ratio |
|----------|-------------|------------|-----------|---------------|
| A        | 1.5 Hz      | 100,000 kg | Calculated| 2%            |
| B        | 2.0 Hz      | 100,000 kg | Calculated| 2%            |
| C        | 2.5 Hz      | 100,000 kg | Calculated| 2%            |

**Floors**: 10 per building (10 DOF)
**Floor Height**: 3m (0.3 units in 3D)
**Total Height**: 30m

### 4.2 Tuned Mass Damper

**Parameters:**
- Mass ratio: 2% of building mass
- Tuning ratio: 0.98 (slightly detuned)
- Damping ratio: 10%

**Passive Mode:**
- Fixed frequency = Building's original natural frequency

**Adaptive Mode:**
- Real-time frequency tracking
- Continuous retuning
- AI-controlled parameters

---

## 5. EXCITATION MODELS

### 5.1 Tesla Oscillator

**Harmonic Excitation:**
```
F(t) = A·sin(2πf·t)
```
- Amplitude: A = 50,000 N
- Frequency: f = 0.5 to 3.5 Hz (adjustable)
- Applied to: Ground floor of all buildings

### 5.2 Earthquake Model

**Multi-Frequency Ground Motion:**
```
a(t) = E(t) · Σ[Aᵢ·sin(2πfᵢ·t + φᵢ)]
```
- Frequencies: [0.5, 1.0, 1.5, 2.0, 2.5, 3.0] Hz
- Amplitudes: [0.3, 0.5, 1.0, 0.8, 0.6, 0.4] (normalized)
- Peak acceleration: 2.0 m/s²

**Envelope Function E(t):**
- Ramp-up: t < 2s → E(t) = 1 - exp(-3t/2)
- Sustain: 2s ≤ t ≤ 6s → E(t) = 1.0
- Decay: t > 6s → E(t) = exp(-2(t-6)/4)

---

## 6. SIGNAL PROCESSING

### 6.1 FFT Analysis

**Fast Fourier Transform:**
- Window: Hanning (reduces spectral leakage)
- Resolution: Dependent on time window
- Frequency range: 0-5 Hz (structural range)
- Output: Magnitude spectrum, dominant peak

### 6.2 ECG Monitoring

**Time-Domain Analysis:**
- Sampling rate: 100 Hz
- Buffer size: 500 samples (~5 seconds)
- Metrics: RMS, peak displacement, correlation

**Health Assessment:**
- Baseline learning (first 100 samples)
- Anomaly detection via correlation
- State classification: Normal / Earthquake / Damaged

### 6.3 Frequency Shift Detection

**Damage Indicator:**
```
Frequency Shift % = [(f₀ - f_current) / f₀] × 100
```
- Threshold: 5% for damage alert
- Progressive tracking
- Real-time visualization

---

## 7. AI CONTROL SYSTEM

### 7.1 Closed-Loop Architecture

**Six-Phase Control Loop:**

1. **SENSE**: Monitor structural response
   - FFT dominant frequency
   - Displacement amplitude
   - Energy metrics

2. **LEARN**: Update frequency estimate
   - Exponential moving average
   - Adaptation rate: 0.05
   - Confidence building

3. **PREDICT**: Estimate optimal frequency
   - Optimal = Learned × 0.98
   - Consider damage state
   - Smooth transitions

4. **ACT**: Generate control commands
   - Retune TMD frequency
   - Adjust damping ratio
   - Activate/deactivate

5. **VERIFY**: Assess performance
   - Energy dissipation
   - Displacement reduction
   - Performance history

6. **IMPROVE**: Adjust strategy
   - Adaptive learning rate
   - Performance-based tuning
   - Long-term optimization

### 7.2 Learning Algorithm

**Frequency Estimation:**
```
f_learned(t+1) = (1-α)·f_learned(t) + α·f_measured(t)
```
- α: Adaptation rate (0.05 default)
- Adjusted based on performance

**Confidence Growth:**
```
confidence(t+1) = min(confidence(t) + 0.01, 1.0)
```

---

## 8. VISUALIZATION

### 8.1 3D Scene (Three.js)

**Buildings:**
- Box geometry with floor divisions
- Color-coded by natural frequency
- Real-time rotation based on displacement
- Damage overlay (red wireframe)

**Dampers:**
- Cylinder geometry on top floor
- Counter-phase motion animation
- Active/inactive states
- Visual spring connections

**Tesla Oscillator:**
- Rotating central core
- Pulsing glow effect
- Frequency-based animation

**Environment:**
- Grid ground plane
- Directional lighting
- Ambient lighting
- Point lights at key locations

### 8.2 Charts (Chart.js)

**ECG Monitor:**
- Line chart
- Real-time streaming
- Color-coded by state
- Auto-scaling

**FFT Panel:**
- Bar chart
- Frequency spectrum
- Peak highlighting
- 0-5 Hz range

---

## 9. PERFORMANCE SPECIFICATIONS

### 9.1 Simulation Parameters

- Time step: 0.01 s (100 Hz physics)
- Visualization: 60 FPS
- Physics steps per frame: Variable (maintains accuracy)
- WebSocket rate: 60 Hz

### 9.2 Computational Efficiency

- Matrix operations: NumPy optimized
- FFT: SciPy implementation
- 3D rendering: WebGL hardware acceleration
- Data transfer: JSON compression

---

## 10. TESTING & VALIDATION

### 10.1 Physics Validation

1. **Free Vibration Test**
   - Compare with analytical solution
   - Verify natural frequencies
   - Check damping decay

2. **Forced Vibration Test**
   - Resonance peak at natural frequency
   - Correct amplitude magnification
   - Phase relationships

3. **Damage Response**
   - Frequency shift matches theory
   - Stiffness reduction accurate
   - Health metrics consistent

### 10.2 Control System Validation

1. **Passive TMD**
   - Optimal tuning verification
   - Energy dissipation metrics
   - Comparison with literature

2. **Adaptive TMD**
   - Convergence speed
   - Tracking accuracy
   - Performance under damage

---

## 11. DEPLOYMENT

### 11.1 System Requirements

**Backend:**
- CPU: Multi-core recommended
- RAM: 2GB minimum
- OS: Linux/Mac/Windows

**Frontend:**
- Modern browser (Chrome, Firefox, Safari)
- WebGL support
- 1080p display recommended

### 11.2 Scalability

**Current:**
- 3 buildings
- 10 DOF each
- Real-time capable

**Future Potential:**
- 100+ buildings
- Variable DOF
- Cloud deployment
- Distributed computing

---

## 12. EXTENSIONS & FUTURE WORK

### 12.1 Planned Features

1. **Hardware Integration**
   - Real sensor data input
   - Physical shake table interface
   - IoT device connectivity

2. **Advanced AI**
   - Deep reinforcement learning
   - Transfer learning
   - Multi-objective optimization

3. **Multi-Building Networks**
   - City-scale simulation
   - Building interactions
   - Coupled dynamics

4. **Enhanced Visualization**
   - VR/AR support
   - Mobile interface
   - Collaborative features

### 12.2 Research Directions

- Optimal TMD placement
- Multi-TMD coordination
- Nonlinear dynamics
- Soil-structure interaction
- Wind excitation modeling

---

## 13. REFERENCES

### 13.1 Theory
- Clough, R. W., & Penzien, J. (1993). Dynamics of Structures
- Den Hartog, J. P. (1956). Mechanical Vibrations
- Newmark, N. M. (1959). A Method of Computation for Structural Dynamics

### 13.2 Applications
- Farrar, C. R., & Worden, K. (2007). Structural Health Monitoring
- Spencer, B. F., & Nagarajaiah, S. (2003). State of the Art of Structural Control
- Lynch, J. P. (2007). An Overview of Wireless Structural Health Monitoring

---

**Document Version**: 1.0
**Last Updated**: January 2026
**Author**: Engineering Research Team
