#!/bin/bash

echo "════════════════════════════════════════════════════════════════"
echo "  AI-Driven Resonance & Structural Health Monitoring Simulator"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.9 or higher."
    exit 1
fi

# Check if Node is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi

echo "✓ Python and Node.js detected"
echo ""

# Start backend in background
echo "🚀 Starting backend server..."
cd backend
python3 main.py &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
echo "   Backend running on: http://localhost:8000"
cd ..

# Wait for backend to initialize
sleep 3

# Start frontend in background
echo ""
echo "🎨 Starting frontend server..."
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "   Installing frontend dependencies..."
    npm install
fi

npm run dev &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"
echo "   Frontend running on: http://localhost:3000"
cd ..

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ Simulation is running!"
echo ""
echo "   🌐 Open browser: http://localhost:3000"
echo "   📊 Backend API: http://localhost:8000"
echo ""
echo "   Press Ctrl+C to stop all servers"
echo "════════════════════════════════════════════════════════════════"

# Trap Ctrl+C to kill both processes
trap "kill $BACKEND_PID $FRONTEND_PID; echo ''; echo '✓ Simulation stopped'; exit" INT

# Wait for both processes
wait
