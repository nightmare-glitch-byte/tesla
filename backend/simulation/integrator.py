"""
Newmark-β Time Integration Method
Unconditionally stable numerical solver for structural dynamics
"""
import numpy as np
from typing import Tuple


class NewmarkIntegrator:
    """
    Newmark-β method for solving M*x'' + C*x' + K*x = F(t)
    Parameters: β = 0.25, γ = 0.5 (average acceleration method)
    """
    
    def __init__(self, beta: float = 0.25, gamma: float = 0.5):
        self.beta = beta
        self.gamma = gamma
    
    def step(
        self,
        M: np.ndarray,
        C: np.ndarray,
        K: np.ndarray,
        F: np.ndarray,
        x: np.ndarray,
        v: np.ndarray,
        a: np.ndarray,
        dt: float
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Perform one time step
        
        Args:
            M: Mass matrix
            C: Damping matrix
            K: Stiffness matrix
            F: Force vector
            x: Displacement at time t
            v: Velocity at time t
            a: Acceleration at time t
            dt: Time step
        
        Returns:
            x_new, v_new, a_new at time t + dt
        """
        # Effective stiffness matrix
        K_eff = K + self.gamma / (self.beta * dt) * C + 1.0 / (self.beta * dt**2) * M
        
        # Effective force vector
        F_eff = (F 
                + M @ (x / (self.beta * dt**2) + v / (self.beta * dt) + (0.5 / self.beta - 1) * a)
                + C @ (self.gamma / (self.beta * dt) * x + (self.gamma / self.beta - 1) * v 
                      + dt * (self.gamma / (2 * self.beta) - 1) * a))
        
        # Solve for new displacement
        x_new = np.linalg.solve(K_eff, F_eff)
        
        # Update velocity
        v_new = (self.gamma / (self.beta * dt)) * (x_new - x) + (1 - self.gamma / self.beta) * v \
                + dt * (1 - self.gamma / (2 * self.beta)) * a
        
        # Update acceleration
        a_new = (1.0 / (self.beta * dt**2)) * (x_new - x) - (1.0 / (self.beta * dt)) * v \
                - (0.5 / self.beta - 1) * a
        
        return x_new, v_new, a_new
