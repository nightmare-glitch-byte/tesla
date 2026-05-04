"""
Excitation Models
- Tesla Oscillator: Controllable harmonic excitation
- Earthquake: Realistic multi-frequency ground motion
"""
import numpy as np


class TeslaOscillator:
    """
    Controllable harmonic excitation source
    Simulates resonance testing device
    """
    
    def __init__(self, initial_frequency: float = 1.5):
        self.frequency = initial_frequency  # Hz
        self.amplitude = 50000.0  # N (force amplitude)
        self.active = True
        self.phase = 0.0
    
    def set_frequency(self, frequency: float):
        """Adjust oscillator frequency (0.5 - 3.5 Hz)"""
        self.frequency = np.clip(frequency, 0.5, 3.5)
    
    def get_force(self, time: float) -> float:
        """Generate sinusoidal force at current frequency"""
        if not self.active:
            return 0.0
        
        omega = 2 * np.pi * self.frequency
        return self.amplitude * np.sin(omega * time + self.phase)
    
    def get_state(self) -> dict:
        """Return oscillator state for visualization"""
        return {
            "frequency": float(self.frequency),
            "amplitude": float(self.amplitude),
            "active": self.active,
            "phase": float(self.phase % (2 * np.pi))
        }


class EarthquakeModel:
    """
    Realistic earthquake ground motion model
    Multi-frequency content with amplitude envelope
    """
    
    def __init__(self):
        self.active = False
        self.start_time = 0.0
        self.duration = 10.0  # seconds
        self.peak_acceleration = 2.0  # m/s²
        
        # Frequency content (Hz)
        self.frequencies = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0]
        self.amplitudes = [0.3, 0.5, 1.0, 0.8, 0.6, 0.4]
        
    def trigger(self, current_time: float):
        """Start earthquake event"""
        self.active = True
        self.start_time = current_time
    
    def get_acceleration(self, time: float) -> float:
        """
        Generate realistic ground acceleration
        Uses envelope function and multiple frequency components
        """
        if not self.active:
            return 0.0
        
        elapsed = time - self.start_time
        
        # Check if earthquake finished
        if elapsed > self.duration:
            self.active = False
            return 0.0
        
        # Amplitude envelope (ramp up, sustain, decay)
        envelope = self._envelope(elapsed)
        
        # Multi-frequency ground motion
        acceleration = 0.0
        for freq, amp in zip(self.frequencies, self.amplitudes):
            omega = 2 * np.pi * freq
            # Add random phase for realism
            phase = np.random.random() * 2 * np.pi if elapsed == 0 else 0
            acceleration += amp * np.sin(omega * elapsed + phase)
        
        # Apply envelope and scale
        return self.peak_acceleration * envelope * acceleration / len(self.frequencies)
    
    def _envelope(self, t: float) -> float:
        """
        Realistic amplitude envelope
        Ramp up (0-2s), sustain (2-6s), decay (6-10s)
        """
        if t < 2.0:
            # Exponential ramp up
            return (1 - np.exp(-3 * t / 2.0))
        elif t < 6.0:
            # Full intensity
            return 1.0
        else:
            # Exponential decay
            return np.exp(-2 * (t - 6.0) / 4.0)
    
    def get_state(self) -> dict:
        """Return earthquake state"""
        return {
            "active": self.active,
            "elapsed": float(0 if not self.active else (self.start_time)),
            "duration": self.duration
        }
