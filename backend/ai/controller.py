"""
AI-Based Adaptive Controller
Closed-loop control: Sense → Learn → Predict → Act → Verify → Improve
"""
import numpy as np
from typing import Dict


class AdaptiveController:
    """
    AI controller for adaptive TMD system
    Continuously learns and adjusts damper parameters
    """
    
    def __init__(self):
        # Control state machine
        self.phase = "idle"  # idle, sense, learn, predict, act, verify
        self.phases = ["sense", "learn", "predict", "act", "verify", "improve"]
        self.phase_idx = 0
        
        # Learning parameters
        self.learned_frequency = None
        self.confidence = 0.0
        self.adaptation_rate = 0.05
        
        # Control history
        self.performance_history = []
        self.frequency_history = []
        
        # Update counter for phase cycling
        self.update_counter = 0
        self.phase_duration = 10  # frames per phase
    
    def update(
        self,
        building_state: Dict,
        damper_state: Dict,
        fft_data: Dict,
        ecg_state: Dict
    ) -> Dict:
        """
        Main control loop - called every simulation step
        Returns control actions for damper
        """
        # Cycle through phases for visualization
        self.update_counter += 1
        if self.update_counter >= self.phase_duration:
            self.phase_idx = (self.phase_idx + 1) % len(self.phases)
            self.phase = self.phases[self.phase_idx]
            self.update_counter = 0
        
        # Extract features
        dominant_freq = fft_data.get("dominant_freq", 0)
        displacement = building_state.get("max_displacement", 0)
        damage = building_state.get("damage", 0)
        
        # SENSE: Monitor structural response
        sensed_data = {
            "frequency": dominant_freq,
            "amplitude": displacement,
            "damage": damage
        }
        
        # LEARN: Update frequency estimate
        if dominant_freq > 0.1:  # Valid signal
            if self.learned_frequency is None:
                self.learned_frequency = dominant_freq
            else:
                # Exponential moving average
                self.learned_frequency = (
                    (1 - self.adaptation_rate) * self.learned_frequency +
                    self.adaptation_rate * dominant_freq
                )
            
            # Build confidence over time
            self.confidence = min(self.confidence + 0.01, 1.0)
        
        # PREDICT: Estimate optimal damper frequency
        if self.learned_frequency is not None:
            # Optimal TMD tuning slightly below structural frequency
            optimal_freq = self.learned_frequency * 0.98
        else:
            optimal_freq = building_state.get("natural_freq", 2.0)
        
        # ACT: Generate control commands
        control_commands = {
            "retune_frequency": float(optimal_freq),
            "damping_ratio": 0.1,  # Fixed for now
            "activate": True
        }
        
        # VERIFY: Assess performance
        energy_dissipated = damper_state.get("energy_dissipated", 0)
        self.performance_history.append(energy_dissipated)
        if len(self.performance_history) > 100:
            self.performance_history.pop(0)
        
        # IMPROVE: Adjust strategy based on performance
        if len(self.performance_history) > 50:
            recent_performance = np.mean(self.performance_history[-50:])
            if recent_performance < 0.1:  # Low performance
                self.adaptation_rate = min(self.adaptation_rate * 1.1, 0.2)
            else:
                self.adaptation_rate = max(self.adaptation_rate * 0.95, 0.01)
        
        return {
            "phase": self.phase,
            "learned_freq": float(self.learned_frequency or 0),
            "optimal_freq": float(optimal_freq),
            "confidence": float(self.confidence),
            "commands": control_commands,
            "performance": float(np.mean(self.performance_history) if self.performance_history else 0)
        }
    
    def reset(self):
        """Reset controller state"""
        self.learned_frequency = None
        self.confidence = 0.0
        self.phase = "idle"
        self.phase_idx = 0
        self.performance_history = []
        self.frequency_history = []


class ReinforcementLearningAgent:
    """
    Optional: RL-based controller for advanced scenarios
    Can be trained to optimize multiple objectives
    """
    
    def __init__(self):
        self.q_table = {}  # State-action values
        self.learning_rate = 0.1
        self.discount_factor = 0.95
        self.epsilon = 0.1  # Exploration rate
    
    def select_action(self, state: tuple) -> float:
        """
        Select damper frequency based on current state
        Uses epsilon-greedy policy
        """
        if np.random.random() < self.epsilon:
            # Explore: random action
            return np.random.uniform(0.5, 3.5)
        else:
            # Exploit: best known action
            if state in self.q_table:
                return max(self.q_table[state].items(), key=lambda x: x[1])[0]
            else:
                return 2.0  # Default
    
    def update(self, state: tuple, action: float, reward: float, next_state: tuple):
        """
        Q-learning update
        Q(s,a) ← Q(s,a) + α[r + γ max Q(s',a') - Q(s,a)]
        """
        if state not in self.q_table:
            self.q_table[state] = {}
        
        current_q = self.q_table[state].get(action, 0)
        
        if next_state in self.q_table and self.q_table[next_state]:
            max_next_q = max(self.q_table[next_state].values())
        else:
            max_next_q = 0
        
        new_q = current_q + self.learning_rate * (
            reward + self.discount_factor * max_next_q - current_q
        )
        
        self.q_table[state][action] = new_q
