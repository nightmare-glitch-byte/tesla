"""
Main Simulation Engine
Orchestrates physics, AI control, and data streaming
"""
import numpy as np
from typing import Dict, List

from structures.building import Building
from structures.damper import TunedMassDamper
from simulation.integrator import NewmarkIntegrator
from simulation.excitation import TeslaOscillator, EarthquakeModel
from signal_processing.processing import SignalProcessor, ECGMonitor
from ai.controller import AdaptiveController


class SimulationEngine:
    """
    Central simulation engine
    Manages time stepping, physics solving, and data collection
    """
    
    def __init__(self, time_step: float = 0.01, fps: int = 60):
        self.dt = time_step
        self.fps = fps
        self.time = 0.0
        self.running = True
        
        # Frame counter for FPS control
        self.frame_counter = 0
        self.physics_steps_per_frame = int(1.0 / (fps * time_step))
        
        # Create three buildings with different natural frequencies
        self.buildings = {
            "A": Building("A", natural_frequency=1.5, num_floors=10),
            "B": Building("B", natural_frequency=2.0, num_floors=10),
            "C": Building("C", natural_frequency=2.5, num_floors=10)
        }
        
        # Create dampers for each building
        self.dampers = {
            "A": TunedMassDamper(self.buildings["A"]),
            "B": TunedMassDamper(self.buildings["B"]),
            "C": TunedMassDamper(self.buildings["C"])
        }
        
        # Excitation sources
        self.tesla_oscillator = TeslaOscillator(initial_frequency=1.5)
        self.earthquake = EarthquakeModel()
        
        # Numerical integrator
        self.integrator = NewmarkIntegrator()
        
        # Signal processing and health monitoring
        self.signal_processor = SignalProcessor(sampling_rate=1.0/time_step)
        self.ecg_monitors = {
            building_id: ECGMonitor() for building_id in self.buildings
        }
        
        # AI controllers (one per building for demonstration)
        self.ai_controllers = {
            building_id: AdaptiveController() for building_id in self.buildings
        }
        
        # Current damping mode
        self.damping_mode = "off"  # off, passive, adaptive
        
    def step(self) -> Dict:
        """
        Advance simulation by one frame (may include multiple physics steps)
        Returns state dict for frontend
        """
        if not self.running:
            return self._get_state()
        
        # Perform multiple physics steps per frame for accuracy
        for _ in range(self.physics_steps_per_frame):
            self._physics_step()
            self.time += self.dt
        
        self.frame_counter += 1
        
        # Return state for visualization
        return self._get_state()
    
    def _physics_step(self):
        """Single physics time step for all buildings"""
        
        # Get excitation forces
        tesla_force = self.tesla_oscillator.get_force(self.time)
        earthquake_accel = self.earthquake.get_acceleration(self.time)
        
        # Update each building
        for building_id, building in self.buildings.items():
            damper = self.dampers[building_id]
            
            # Total external force
            # Tesla oscillator acts on ground floor
            F_external = np.zeros(building.num_floors)
            F_external[0] = tesla_force
            
            # Earthquake acts as ground acceleration (inertial force)
            if earthquake_accel != 0:
                F_external += -building.M @ np.ones(building.num_floors) * earthquake_accel
            
            # Add damper force to top floor (where TMD is located)
            if damper.active:
                top_floor_disp = building.displacement[-1]
                top_floor_vel = building.velocity[-1]
                damper_force = damper.compute_force(top_floor_disp)
                F_external[-1] += damper_force
                
                # Update damper state
                damper.update(self.dt, building.acceleration[-1])
            
            # Integrate equations of motion: M*x'' + C*x' + K*x = F
            x_new, v_new, a_new = self.integrator.step(
                building.M,
                building.C,
                building.K,
                F_external,
                building.displacement,
                building.velocity,
                building.acceleration,
                self.dt
            )
            
            # Update building state
            building.displacement = x_new
            building.velocity = v_new
            building.acceleration = a_new
            
            # Update history for ECG
            building.update_history(self.time)
    
    def _get_state(self) -> Dict:
        """Collect and package all state data for frontend"""
        
        buildings_state = []
        fft_data_all = {}
        ecg_data_all = {}
        ai_state_all = {}
        
        for building_id, building in self.buildings.items():
            # Get building state
            building_data = building.get_state()
            
            # Compute FFT
            if len(building.displacement_history) > 32:
                fft_data = self.signal_processor.compute_fft(
                    np.array(building.displacement_history)
                )
            else:
                fft_data = {"frequencies": [], "magnitudes": [], "dominant_freq": 0, "dominant_magnitude": 0}
            
            # ECG monitoring
            ecg_monitor = self.ecg_monitors[building_id]
            ecg_monitor.update_baseline(
                building.displacement_history,
                fft_data["dominant_freq"]
            )
            
            ecg_state = ecg_monitor.assess_state(
                building.displacement_history,
                fft_data["dominant_freq"],
                self.earthquake.active,
                building.damage_factor * 100
            )
            
            # AI control
            damper = self.dampers[building_id]
            ai_controller = self.ai_controllers[building_id]
            
            if self.damping_mode == "adaptive" and damper.active:
                ai_output = ai_controller.update(
                    building_data,
                    damper.get_state(),
                    fft_data,
                    ecg_state
                )
                
                # Apply AI control commands
                commands = ai_output["commands"]
                if commands["activate"]:
                    damper.retune(
                        commands["retune_frequency"],
                        commands["damping_ratio"]
                    )
            else:
                ai_output = {
                    "phase": "idle",
                    "learned_freq": 0,
                    "optimal_freq": 0,
                    "confidence": 0,
                    "commands": {},
                    "performance": 0
                }
            
            # Combine all data
            building_data.update({
                "damper": damper.get_state(),
                "ecg": {
                    "time": building.time_history[-100:] if len(building.time_history) > 100 else building.time_history,
                    "displacement": building.displacement_history[-100:] if len(building.displacement_history) > 100 else building.displacement_history,
                    "state": ecg_state
                }
            })
            
            buildings_state.append(building_data)
            fft_data_all[building_id] = fft_data
            ecg_data_all[building_id] = ecg_state
            ai_state_all[building_id] = ai_output
        
        # Metrics for comparison
        metrics = self._compute_metrics()
        
        return {
            "time": float(self.time),
            "buildings": buildings_state,
            "oscillator": self.tesla_oscillator.get_state(),
            "earthquake_active": self.earthquake.active,
            "fft": fft_data_all,
            "ecg": ecg_data_all,
            "ai": ai_state_all,
            "metrics": metrics,
            "damping_mode": self.damping_mode
        }
    
    def _compute_metrics(self) -> Dict:
        """Compute performance metrics across all buildings"""
        total_energy = sum(b.compute_energy() for b in self.buildings.values())
        max_displacement = max(b.max_displacement for b in self.buildings.values())
        
        # Energy dissipation by dampers
        energy_dissipated = sum(
            d.get_state()["energy_dissipated"] 
            for d in self.dampers.values() 
            if d.active
        )
        
        return {
            "total_energy": float(total_energy),
            "max_displacement": float(max_displacement),
            "energy_dissipated": float(energy_dissipated),
            "damping_effectiveness": float(energy_dissipated / (total_energy + 1e-6))
        }
    
    # Control methods called from WebSocket
    
    def set_oscillator_frequency(self, frequency: float):
        """Adjust Tesla oscillator frequency"""
        self.tesla_oscillator.set_frequency(frequency)
    
    def set_damage(self, building_id: str, damage_percent: float):
        """Apply damage to a building"""
        if building_id in self.buildings:
            self.buildings[building_id].apply_damage(damage_percent)
    
    async def trigger_earthquake(self):
        """Start earthquake event"""
        self.earthquake.trigger(self.time)
    
    def set_damping_mode(self, mode: str):
        """Set damping mode for all dampers"""
        self.damping_mode = mode
        for damper in self.dampers.values():
            damper.set_mode(mode)
    
    def pause(self):
        """Pause simulation"""
        self.running = False
    
    def resume(self):
        """Resume simulation"""
        self.running = True
    
    def reset(self):
        """Reset entire simulation"""
        self.time = 0.0
        self.frame_counter = 0
        
        # Reset buildings
        for building in self.buildings.values():
            building.displacement = np.zeros(building.num_floors)
            building.velocity = np.zeros(building.num_floors)
            building.acceleration = np.zeros(building.num_floors)
            building.damage_factor = 0.0
            building.displacement_history = []
            building.time_history = []
            building.max_displacement = 0.0
        
        # Reset dampers
        for damper in self.dampers.values():
            damper.displacement = 0.0
            damper.velocity = 0.0
            damper.acceleration = 0.0
        
        # Reset AI controllers
        for controller in self.ai_controllers.values():
            controller.reset()
        
        # Reset excitation
        self.earthquake.active = False
        self.tesla_oscillator.phase = 0.0
