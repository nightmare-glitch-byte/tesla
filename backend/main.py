"""
AI-Driven Resonance & Structural Health Monitoring Simulator
Main FastAPI Application with WebSocket Support
"""
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List
import json
import numpy as np

from simulation.engine import SimulationEngine
from structures.building import Building
from ai.controller import AdaptiveController
from signal_processing.processing import SignalProcessor, ECGMonitor

app = FastAPI(title="Resonance Simulator API")

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global simulation state
simulation_engine = None
active_connections: List[WebSocket] = []


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """Broadcast state to all connected clients"""
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error broadcasting: {e}")


manager = ConnectionManager()


@app.get("/")
async def root():
    return {
        "message": "AI-Driven Resonance Simulator API",
        "version": "1.0.0",
        "endpoints": {
            "websocket": "/ws",
            "health": "/health"
        }
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "simulation_running": simulation_engine is not None}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time simulation data streaming
    Handles bidirectional communication between frontend and backend
    """
    await manager.connect(websocket)
    
    global simulation_engine
    
    # Initialize simulation engine
    simulation_engine = SimulationEngine(
        time_step=0.01,
        fps=60
    )
    
    print("✓ WebSocket connected - Starting simulation")
    
    try:
        # Start simulation loop
        simulation_task = asyncio.create_task(simulation_loop(websocket))
        
        # Listen for control commands from frontend
        async for message in websocket.iter_text():
            try:
                data = json.loads(message)
                command = data.get("command")
                
                if command == "set_frequency":
                    frequency = data.get("value")
                    simulation_engine.set_oscillator_frequency(frequency)

                elif command == "set_oscillator_active":
                    active = data.get("value", True)
                    simulation_engine.tesla_oscillator.active = bool(active)
                    
                elif command == "set_damage":
                    damage = data.get("value")
                    building_id = data.get("building_id", "A")
                    simulation_engine.set_damage(building_id, damage)
                    
                elif command == "trigger_earthquake":
                    await simulation_engine.trigger_earthquake()

                elif command == "stop_earthquake":
                    simulation_engine.earthquake.active = False
                    
                elif command == "set_damping_mode":
                    mode = data.get("value")
                    simulation_engine.set_damping_mode(mode)
                    
                elif command == "pause":
                    simulation_engine.pause()
                    
                elif command == "resume":
                    simulation_engine.resume()
                    
                elif command == "reset":
                    simulation_engine.reset()
                    
            except json.JSONDecodeError:
                print(f"Invalid JSON received: {message}")
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("✗ WebSocket disconnected")
        if simulation_task:
            simulation_task.cancel()


async def simulation_loop(websocket: WebSocket):
    """
    Main simulation loop - runs physics, AI control, and health monitoring
    Streams state to frontend at 60 FPS
    """
    frame_time = 1.0 / 60.0  # 60 FPS
    
    while True:
        try:
            # Advance simulation by one time step
            state = simulation_engine.step()
            
            # Prepare data payload for frontend
            payload = {
                "time": state["time"],
                "buildings": state["buildings"],
                "oscillator": state["oscillator"],
                "fft": state["fft"],
                "ecg": state["ecg"],
                "ai": state["ai"],
                "metrics": state["metrics"],
                "earthquake_active": state["earthquake_active"],
                "damping_mode": state["damping_mode"]
            }
            
            # Send to frontend
            await websocket.send_json(payload)
            
            # Maintain 60 FPS
            await asyncio.sleep(frame_time)
            
        except Exception as e:
            print(f"Simulation error: {e}")
            break


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
