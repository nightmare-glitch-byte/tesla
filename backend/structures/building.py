"""
Multi-Degree-of-Freedom Building Model
Implements M*x'' + C*x' + K*x = F(t)
"""
import numpy as np
from typing import Tuple, List


class Building:
    """
    Represents a multi-story building as a lumped-mass system
    Each floor is a degree of freedom with mass, stiffness, and damping
    """
    
    def __init__(
        self,
        building_id: str,
        natural_frequency: float,
        num_floors: int = 10,
        floor_mass: float = 100000.0,  # kg
        base_stiffness: float = 1e8,  # N/m
        damping_ratio: float = 0.02
    ):
        self.id = building_id
        self.num_floors = num_floors
        self.natural_frequency = natural_frequency
        self.floor_mass = floor_mass
        self.base_stiffness = base_stiffness
        self.damping_ratio = damping_ratio
        
        # State vectors
        self.displacement = np.zeros(num_floors)  # x
        self.velocity = np.zeros(num_floors)      # x'
        self.acceleration = np.zeros(num_floors)  # x''
        
        # Build system matrices
        self.M = self._build_mass_matrix()
        self.K = self._build_stiffness_matrix()
        self.C = self._build_damping_matrix()
        
        # Damage state
        self.damage_factor = 0.0  # 0 = healthy, 1 = completely damaged
        self.K_original = self.K.copy()
        
        # Health monitoring
        self.current_frequency = natural_frequency
        self.health_score = 100.0
        self.baseline_signature = None
        
        # History for ECG-style monitoring
        self.displacement_history = []
        self.time_history = []
        self.max_displacement = 0.0
        
    def _build_mass_matrix(self) -> np.ndarray:
        """Create diagonal mass matrix"""
        return np.diag([self.floor_mass] * self.num_floors)
    
    def _build_stiffness_matrix(self) -> np.ndarray:
        """
        Create stiffness matrix for multi-story building
        Calibrated to match desired natural frequency
        """
        # Adjust stiffness to match natural frequency
        # ω = sqrt(k/m) for single DOF
        # For multi-DOF, scale appropriately
        k = self.base_stiffness * (2 * np.pi * self.natural_frequency) ** 2 / (9.81 * self.num_floors)
        
        K = np.zeros((self.num_floors, self.num_floors))
        for i in range(self.num_floors):
            K[i, i] = 2 * k
            if i > 0:
                K[i, i-1] = -k
                K[i-1, i] = -k
        K[0, 0] = k  # Ground floor
        
        return K
    
    def _build_damping_matrix(self) -> np.ndarray:
        """
        Rayleigh damping: C = α*M + β*K
        Calibrated to damping ratio
        """
        # Modal damping
        omega = 2 * np.pi * self.natural_frequency
        alpha = 2 * self.damping_ratio * omega
        beta = 2 * self.damping_ratio / omega
        
        return alpha * self.M + beta * self.K
    
    def apply_damage(self, damage_percent: float):
        """
        Apply stiffness degradation to simulate structural damage
        damage_percent: 0-100
        """
        self.damage_factor = np.clip(damage_percent / 100.0, 0, 0.99)
        
        # Reduce stiffness
        self.K = self.K_original * (1 - self.damage_factor)
        
        # Update natural frequency (decreases with damage)
        self.current_frequency = self.natural_frequency * np.sqrt(1 - self.damage_factor)
        
        # Update health score
        self.health_score = 100 * (1 - self.damage_factor)
    
    def get_state(self) -> dict:
        """Return current state for visualization"""
        return {
            "id": self.id,
            "natural_freq": self.natural_frequency,
            "current_freq": float(self.current_frequency),
            "displacement": self.displacement.tolist(),
            "max_displacement": float(np.max(np.abs(self.displacement))),
            "velocity": self.velocity.tolist(),
            "acceleration": self.acceleration.tolist(),
            "damage": float(self.damage_factor * 100),
            "health": float(self.health_score),
            "energy": float(self.compute_energy())
        }
    
    def compute_energy(self) -> float:
        """Compute total mechanical energy"""
        # Kinetic energy: 0.5 * v^T * M * v
        KE = 0.5 * self.velocity.T @ self.M @ self.velocity
        
        # Potential energy: 0.5 * x^T * K * x
        PE = 0.5 * self.displacement.T @ self.K @ self.displacement
        
        return KE + PE
    
    def get_top_floor_displacement(self) -> float:
        """Return displacement of top floor (most visible)"""
        return float(self.displacement[-1])
    
    def update_history(self, time: float):
        """Store displacement history for ECG visualization"""
        self.time_history.append(time)
        self.displacement_history.append(self.get_top_floor_displacement())
        
        # Keep last 500 points (~8 seconds at 60 FPS)
        if len(self.displacement_history) > 500:
            self.time_history.pop(0)
            self.displacement_history.pop(0)
        
        # Track maximum
        current_max = np.max(np.abs(self.displacement))
        if current_max > self.max_displacement:
            self.max_displacement = current_maxw    

 