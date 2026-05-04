"""
Tuned Mass Damper (TMD) System
Supports passive (fixed frequency) and adaptive (AI-controlled) modes
"""
import numpy as np


class TunedMassDamper:
    """
    Tuned Mass Damper for vibration control
    Oscillates in counter-phase to building motion
    """
    
    def __init__(
        self,
        building,
        mass_ratio: float = 0.02,  # TMD mass / building mass
        tuning_frequency: float = None,
        damping_ratio: float = 0.1
    ):
        self.building = building
        self.mass_ratio = mass_ratio
        
        # TMD properties
        self.mass = mass_ratio * building.floor_mass
        self.tuning_frequency = tuning_frequency or building.natural_frequency
        self.damping_ratio = damping_ratio
        
        # Derived parameters
        self.omega = 2 * np.pi * self.tuning_frequency
        self.stiffness = self.mass * self.omega ** 2
        self.damping = 2 * damping_ratio * np.sqrt(self.mass * self.stiffness)
        
        # State
        self.displacement = 0.0
        self.velocity = 0.0
        self.acceleration = 0.0
        
        # Control mode
        self.mode = "off"  # "off", "passive", "adaptive"
        self.active = False
        
    def retune(self, new_frequency: float, new_damping: float = None):
        """
        Adaptive retuning - AI controller calls this
        Smoothly adjusts frequency to match current structural state
        """
        self.tuning_frequency = new_frequency
        self.omega = 2 * np.pi * new_frequency
        self.stiffness = self.mass * self.omega ** 2
        
        if new_damping is not None:
            self.damping_ratio = new_damping
            self.damping = 2 * new_damping * np.sqrt(self.mass * self.stiffness)
    
    def compute_force(self, building_displacement: float) -> float:
        """
        Compute damper force acting on building
        F = -k*(x_damper - x_building) - c*(v_damper - v_building)
        """
        if not self.active:
            return 0.0
        
        # Relative motion
        relative_disp = self.displacement - building_displacement
        relative_vel = self.velocity
        
        # Damper force (negative = opposes motion)
        force = -self.stiffness * relative_disp - self.damping * relative_vel
        
        return force
    
    def update(self, dt: float, building_acceleration: float):
        """
        Update damper state using Newmark integration
        Equation: m*x'' + c*x' + k*x = -m*a_building
        """
        if not self.active:
            return
        
        # External force from building motion
        force = -self.mass * building_acceleration
        
        # Newmark-β parameters
        beta = 0.25
        gamma = 0.5
        
        # Effective stiffness and damping
        k_eff = self.stiffness + gamma / (beta * dt) * self.damping + 1.0 / (beta * dt**2) * self.mass
        
        # Effective force
        f_eff = (force 
                + self.damping * (self.velocity + (1 - gamma) * dt * self.acceleration)
                + self.mass * (self.velocity / (beta * dt) + (1 - 2*beta) / (2*beta) * self.acceleration))
        
        # New acceleration
        a_new = f_eff / (self.mass + gamma * self.damping * dt / beta + self.stiffness * dt**2 / (2*beta))
        
        # Update velocity and displacement
        self.acceleration = a_new
        self.velocity += dt * ((1 - gamma) * self.acceleration + gamma * a_new)
        self.displacement += dt * self.velocity + dt**2 / 2 * ((1 - 2*beta) * self.acceleration + 2*beta * a_new)
    
    def set_mode(self, mode: str):
        """Set damping mode: 'off', 'passive', 'adaptive'"""
        self.mode = mode
        self.active = mode in ["passive", "adaptive"]
        
        if mode == "passive":
            # Fixed tuning to building's original natural frequency
            self.retune(self.building.natural_frequency)
        
        # Adaptive mode tuning is handled by AI controller
    
    def get_state(self) -> dict:
        """Return state for visualization"""
        return {
            "mode": self.mode,
            "active": self.active,
            "displacement": float(self.displacement),
            "velocity": float(self.velocity),
            "tuning_freq": float(self.tuning_frequency),
            "damping_ratio": float(self.damping_ratio),
            "energy_dissipated": float(abs(self.damping * self.velocity ** 2))
        }
