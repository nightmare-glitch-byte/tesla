#!/bin/bash

# Tesla Resonance Simulator - Fix Installation Script
# This script copies the fixed files to your original project

echo "=================================="
echo "Tesla Simulator - Installing Fixes"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -d "frontend/src/components" ]; then
    echo "❌ Error: Please run this script from the tesla project root directory"
    exit 1
fi

echo "📋 Creating backup of original files..."
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR/frontend/src/components"

# Backup original files
cp frontend/src/App.jsx "$BACKUP_DIR/frontend/src/" 2>/dev/null
cp frontend/src/components/ThreeScene.jsx "$BACKUP_DIR/frontend/src/components/" 2>/dev/null
cp frontend/src/components/ECGMonitor.jsx "$BACKUP_DIR/frontend/src/components/" 2>/dev/null
cp frontend/src/components/ECGMonitor.css "$BACKUP_DIR/frontend/src/components/" 2>/dev/null
cp frontend/src/components/DashboardComponents.jsx "$BACKUP_DIR/frontend/src/components/" 2>/dev/null

echo "✅ Backup created in: $BACKUP_DIR"
echo ""

echo "📦 Installing fixed files..."

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
FIXED_DIR="$SCRIPT_DIR/tesla-fixed"

# Check if fixed files exist
if [ ! -d "$FIXED_DIR" ]; then
    echo "❌ Error: Fixed files directory not found at: $FIXED_DIR"
    echo "Please ensure tesla-fixed directory is in the same location as this script"
    exit 1
fi

# Copy fixed files
cp "$FIXED_DIR/frontend/src/App.jsx" frontend/src/
cp "$FIXED_DIR/frontend/src/components/ThreeScene.jsx" frontend/src/components/
cp "$FIXED_DIR/frontend/src/components/ECGMonitor.jsx" frontend/src/components/
cp "$FIXED_DIR/frontend/src/components/ECGMonitor.css" frontend/src/components/
cp "$FIXED_DIR/frontend/src/components/DashboardComponents.jsx" frontend/src/components/

echo "✅ Fixed files installed successfully!"
echo ""

echo "=================================="
echo "Installation Complete!"
echo "=================================="
echo ""
echo "📝 Changes applied:"
echo "   • Buildings now vibrate left-right (not rotate)"
echo "   • Damping modes work correctly (no windmill rotation)"
echo "   • Building selection works in graphs"
echo "   • Tesla Oscillator pulsates correctly"
echo "   • Dampers move properly"
echo ""
echo "🚀 Next steps:"
echo "   1. Make sure backend is running: cd backend && python main.py"
echo "   2. Start/restart frontend: cd frontend && npm run dev"
echo "   3. Open http://localhost:5173 in your browser"
echo ""
echo "📚 Read FIXES_APPLIED.md for detailed information"
echo ""
echo "⚠️  Original files backed up in: $BACKUP_DIR"
echo ""
