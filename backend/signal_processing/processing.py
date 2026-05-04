"""
Signal Processing Module
- FFT for frequency analysis
- ECG-style time-domain monitoring
- Feature extraction for health monitoring
"""
import numpy as np
from scipy import signal
from typing import Dict, List, Tuple


class SignalProcessor:
    """
    Processes vibration signals for health monitoring
    Analogous to ECG processing for buildings
    """
    
    def __init__(self, sampling_rate: float = 100.0):
        self.sampling_rate = sampling_rate
        self.window_size = 512  # FFT window
    
    def compute_fft(self, time_series: np.ndarray) -> Dict:
        """
        Compute Fast Fourier Transform
        Returns frequency spectrum and dominant peak
        """
        if len(time_series) < 32:
            return {
                "frequencies": [],
                "magnitudes": [],
                "dominant_freq": 0.0,
                "dominant_magnitude": 0.0
            }
        
        # Apply Hanning window to reduce spectral leakage
        window = np.hanning(len(time_series))
        windowed = time_series * window
        
        # Compute FFT
        fft_result = np.fft.rfft(windowed)
        frequencies = np.fft.rfftfreq(len(windowed), 1.0 / self.sampling_rate)
        magnitudes = np.abs(fft_result)
        
        # Normalize
        magnitudes = magnitudes / len(time_series)
        
        # Find dominant frequency (exclude DC component)
        if len(magnitudes) > 1:
            dominant_idx = np.argmax(magnitudes[1:]) + 1
            dominant_freq = frequencies[dominant_idx]
            dominant_mag = magnitudes[dominant_idx]
        else:
            dominant_freq = 0.0
            dominant_mag = 0.0
        
        # Limit to 0-5 Hz range (structural frequencies)
        mask = frequencies <= 5.0
        
        return {
            "frequencies": frequencies[mask].tolist(),
            "magnitudes": magnitudes[mask].tolist(),
            "dominant_freq": float(dominant_freq),
            "dominant_magnitude": float(dominant_mag)
        }
    
    def compute_rms(self, time_series: np.ndarray) -> float:
        """Root Mean Square - energy metric"""
        if len(time_series) == 0:
            return 0.0
        return float(np.sqrt(np.mean(time_series ** 2)))
    
    def compute_peak(self, time_series: np.ndarray) -> float:
        """Peak absolute value"""
        if len(time_series) == 0:
            return 0.0
        return float(np.max(np.abs(time_series)))
    
    def detect_frequency_shift(
        self, 
        baseline_freq: float, 
        current_freq: float,
        threshold: float = 0.05  # 5% shift
    ) -> Tuple[bool, float]:
        """
        Detect if natural frequency has shifted significantly
        Indicates structural damage
        """
        if baseline_freq == 0:
            return False, 0.0
        
        shift_ratio = abs(current_freq - baseline_freq) / baseline_freq
        is_shifted = shift_ratio > threshold
        
        return is_shifted, float(shift_ratio)
    
    def compute_correlation(self, signal1: np.ndarray, signal2: np.ndarray) -> float:
        """
        Compute normalized cross-correlation
        Used for baseline comparison
        """
        if len(signal1) == 0 or len(signal2) == 0:
            return 0.0
        
        # Ensure same length
        min_len = min(len(signal1), len(signal2))
        signal1 = signal1[-min_len:]
        signal2 = signal2[-min_len:]
        
        # Normalize
        s1_norm = (signal1 - np.mean(signal1)) / (np.std(signal1) + 1e-10)
        s2_norm = (signal2 - np.mean(signal2)) / (np.std(signal2) + 1e-10)
        
        # Correlation
        corr = np.correlate(s1_norm, s2_norm, mode='valid')[0] / len(s1_norm)
        
        return float(corr)


class ECGMonitor:
    """
    ECG-style continuous monitoring for structural vibrations
    Maintains baseline and detects anomalies
    """
    
    def __init__(self):
        self.baseline_established = False
        self.baseline_signature = None
        self.baseline_frequency = 0.0
        self.history_length = 500
        
        # States
        self.current_state = "normal"  # normal, earthquake, damaged
        
    def update_baseline(self, displacement_history: List[float], dominant_freq: float):
        """Learn healthy vibration signature"""
        if not self.baseline_established and len(displacement_history) > 100:
            self.baseline_signature = np.array(displacement_history[-100:])
            self.baseline_frequency = dominant_freq
            self.baseline_established = True
    
    def assess_state(
        self,
        displacement_history: List[float],
        current_freq: float,
        earthquake_active: bool,
        damage_level: float
    ) -> Dict:
        """
        Determine structural state and health score
        """
        # State determination
        if earthquake_active:
            self.current_state = "earthquake"
        elif damage_level > 5:
            self.current_state = "damaged"
        else:
            self.current_state = "normal"
        
        # Health score
        health_score = 100 * (1 - damage_level / 100)
        
        # Frequency shift detection
        freq_shift = 0.0
        if self.baseline_established and self.baseline_frequency > 0:
            freq_shift = (self.baseline_frequency - current_freq) / self.baseline_frequency
        
        return {
            "state": self.current_state,
            "health_score": float(health_score),
            "freq_shift_percent": float(freq_shift * 100),
            "baseline_established": self.baseline_established
        }
